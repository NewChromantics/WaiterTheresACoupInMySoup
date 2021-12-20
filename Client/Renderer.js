import Camera_t from './PopEngine/Camera.js'
import {Distance3,Lerp3,MatrixInverse4x4,CreateIdentityMatrix,CreateTranslationMatrix,CreateTranslationScaleMatrix} from './PopEngine/Math.js'
import AssetManager from './PopEngine/AssetManager.js'
import {CreateCubeGeometry} from './PopEngine/CommonGeometry.js'
import {CoordToXy} from './TileMap.js'
import {CreatePromise} from './PopEngine/PopWebApiCore.js'
import SpriteManager_t from './SpriteManager.js'
import Pop from './PopEngine/PopEngine.js'

const ClearColour = [0,0,0];

//	todo: need bigger tolerance for phones?
const MinimumDragPx = 10;


async function CreateCube01TriangleBuffer(RenderContext)
{
	const Geometry = CreateCubeGeometry( 0.0, 1.0 );
	const TriangleIndexes = undefined;
	const TriBuffer = await RenderContext.CreateGeometry(Geometry,TriangleIndexes);
	return TriBuffer;
}

const MapCubeFrag_Filename = 'Client/Assets/Colour.frag.glsl';
const MapCubeVert_Filename = 'Client/Assets/Geo.vert.glsl';

//	scene renderer for spy
export default class Renderer
{
	constructor(Game,RenderView)
	{
		this.Game = Game;
		this.Camera = this.CreateCamera(Game,RenderView);
		this.SpriteManager = new SpriteManager_t();

		const MapCubeGeoAttribs = ['LocalPosition','LocalUv'];	//	need to remove the need for this!
		this.CubeGeo = AssetManager.RegisterAssetAsyncFetchFunction('Cube01', CreateCube01TriangleBuffer);
		this.MapCubeShader = AssetManager.RegisterShaderAssetFilename(MapCubeFrag_Filename,MapCubeVert_Filename,null,MapCubeGeoAttribs);
		
		this.QueuedInputRays = [];
	}
	
	async WaitForMoveSelection(Actions)
	{
		const MoveDialog = document.querySelector(`#MoveDialog`);
		if ( !MoveDialog )
			throw `Missing temp #MoveDialog element`;
		
		const ActionsJson = JSON.stringify(Actions);
		MoveDialog.setAttribute('actions',ActionsJson);
		
		const OnActionPromise = CreatePromise();
		MoveDialog.onselection = OnActionPromise.Resolve;
		
		MoveDialog.style.visibility = 'visible';
		const Action = await OnActionPromise;
		MoveDialog.style.visibility = 'hidden';
		
		const Reply = {};
		Reply.Action = Action[0];
		Reply.ActionArguments = Action.slice(1);
		
		return Reply;
	}

	
	CreateCamera(Game,RenderView)
	{
		const Camera = new Camera_t();

		//	position camera looking at center of map
		//	and far enough out to see it all
		const MapMinMax = Game.Map.GetMinMax(true);
		MapMinMax.Min = this.MapPositionToWorldPosition( MapMinMax.Min );
		MapMinMax.Max = this.MapPositionToWorldPosition( MapMinMax.Max );
		Camera.LookAt = Lerp3( MapMinMax.Min, MapMinMax.Max, 0.5 );
		
		const Pitch = -70;
		const Yaw = 0;	//	isometric starting view
		const Zoom = 0.5 * Distance3( MapMinMax.Min, MapMinMax.Max );
		Camera.SetOrbit( Pitch, Yaw, 0, Zoom );
		
		//	bind camera controls
		//	todo: will need a heirachy thing for input I think, this worked well
		//		in ... another project so this may change later
		function MoveCamera (x, y, Button, FirstDown) 
		{
			//	return true to capture input
			if (Button == 'Left')	
			{
				Camera.OnCameraOrbit(x, y, 0, FirstDown);
			}
			if (Button == 'Right')	
			{
				Camera.OnCameraPanLocal(-x, y, 0, FirstDown);
			}
		}
		const Window = RenderView;
		Window.OnMouseDown = function(x,y,Button)
		{
			MoveCamera( x,y,Button,true );
		}

		Window.OnMouseMove = function(x,y,Button)
		{
			MoveCamera( x,y,Button,false );
		}
		
		const OnSceneClick = this.OnSceneClick.bind(this);
		Window.OnMouseUp = function(x,y,Button)
		{
			if ( Button == 'Left' )
			{
				//	check if we moved the mouse enough to count as a drag
				//	gr: note order is changed in camera, shouldn't use those internal vars
				const Deltax = Math.abs( Camera.Last_OrbitPos[0] - y );
				const Deltay = Math.abs( Camera.Last_OrbitPos[1] - x );
				const Delta = Math.max( Deltax, Deltay );
				if ( Delta < MinimumDragPx )
					OnSceneClick( x, y, Window.GetScreenRect() );
			}
		}

		Window.OnMouseScroll = function(x,y,Button,Delta)
		{
			let Fly = Delta[1] * 50;
			//Fly *= Params.ScrollFlySpeed;
			Camera.OnCameraPanLocal( 0, 0, 0, true );
			Camera.OnCameraPanLocal( 0, 0, Fly, false );
		}
	
		
		return Camera;
	}
	
	//	in [x,y] out [x,y,z]
	MapPositionToWorldPosition(xy)
	{
		//	1 unit = 1 metre for now
		const y = 0;
		//	gr: cant quite figure out if the camera is upside down... or we're rendering weirdly
		//		but left->right is backwards
		const x = -xy[0];
		const z = xy[1];
		return [x,y,z];
	}
	
	GetCubeRenderCommand(PushCommand,RenderContext,Position,Scale3,GeoAsset,Uniforms)
	{
		Uniforms.LocalToWorldTransform = CreateTranslationScaleMatrix( Position, Scale3 );
		
		const Geo = AssetManager.GetAsset(GeoAsset,RenderContext);
		const Shader = AssetManager.GetAsset(this.MapCubeShader,RenderContext);
		
		PushCommand('Draw',Geo,Shader,Uniforms);
	}

	GetSpriteRenderCommands(Sprite,CameraUniforms,PushCommand,RenderContext)
	{
		const GeoAsset = this.CubeGeo;

		const Uniforms = this.SpriteManager.GetUniforms( Sprite );
		Object.assign( Uniforms, CameraUniforms );
		
		const Position = this.MapPositionToWorldPosition( [Sprite.x,Sprite.y] );
		const Scale3 = [Sprite.w,Uniforms.ScaleY,Sprite.h];

		this.GetCubeRenderCommand( PushCommand, RenderContext, Position, Scale3, GeoAsset, Uniforms );
	}

	GetSceneRenderCommands(PushCommand,RenderContext)
	{
		const Camera = this.Camera;
		const Viewport = RenderContext.GetScreenRect();
		Viewport[3] /= Viewport[2];
		Viewport[2] /= Viewport[2];
		const CameraUniforms = {};
		CameraUniforms.LocalToWorldTransform = CreateIdentityMatrix();
		CameraUniforms.CameraProjectionTransform = Camera.GetProjectionMatrix(Viewport);
		CameraUniforms.WorldToCameraTransform = Camera.GetWorldToCameraMatrix();
		CameraUniforms.CameraToWorldTransform = MatrixInverse4x4( CameraUniforms.WorldToCameraTransform );

		//	render cells of map
		const TileMapSprites = this.Game.Map.GetSprites();
		//	render characters
		const ActorSprites = this.Game.Scene.GetSprites();

		const Sprites = [];
		Sprites.push( ...ActorSprites );
		Sprites.push( ...TileMapSprites );

		for ( let Sprite of Sprites )
		{
			this.GetSpriteRenderCommands( Sprite, CameraUniforms, PushCommand, RenderContext );
		}
		//	render laser pointer
	}
	
	async GetRenderCommands(RenderContext,Game)
	{
		const Commands = [];
		function PushCommand(Args)
		{
			Commands.push( [...arguments] );
		}
		PushCommand('SetRenderTarget',null,ClearColour);
		
		this.GetSceneRenderCommands( PushCommand, RenderContext );
		
		return Commands;
	}
	
	OnSceneClick(x,y,ScreenRect)
	{
		const u = x / ScreenRect[2];
		const v = y / ScreenRect[3];
		//	gr: should this be passing in viewport, in case that's different?
		const Ray = this.Camera.GetScreenRay( u, v, ScreenRect );
		Pop.Debug(`SceneClick`,Ray);
		this.QueuedInputRays.push( Ray );
	}
	
	WorldRayToSceneHit(Ray)
	{
		return {};
	}
	
	PopInputs()
	{
		//	get all queued up inputs as rays, and where they intersect the scene
		const SceneHits = this.QueuedInputRays.map( this.WorldRayToSceneHit.bind(this) );
		this.QueuedInputRays = [];
		return SceneHits;
	}
};
