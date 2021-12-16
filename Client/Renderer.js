import Camera_t from './PopEngine/Camera.js'
import {Distance3,Lerp3,MatrixInverse4x4,CreateIdentityMatrix,CreateTranslationMatrix,CreateTranslationScaleMatrix} from './PopEngine/Math.js'
import AssetManager from './PopEngine/AssetManager.js'
import {CreateCubeGeometry} from './PopEngine/CommonGeometry.js'
import {CoordToXy} from './Map.js'

const ClearColour = [0,0,0];



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

		const MapCubeGeoAttribs = ['LocalPosition','LocalUv'];	//	need to remove the need for this!
		this.CubeGeo = AssetManager.RegisterAssetAsyncFetchFunction('Cube01', CreateCube01TriangleBuffer);
		this.MapCubeShader = AssetManager.RegisterShaderAssetFilename(MapCubeFrag_Filename,MapCubeVert_Filename,null,MapCubeGeoAttribs);
	}
	
	CreateCamera(Game,RenderView)
	{
		const Camera = new Camera_t();

		//	position camera looking at center of map
		//	and far enough out to see it all
		const MapMinMax = Game.Map.GetMinMax();
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
			if (Button == 'Left')	Camera.OnCameraOrbit(x, y, 0, FirstDown);
			if (Button == 'Right')	Camera.OnCameraPanLocal(-x, y, 0, FirstDown);
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
	
	GetCubeRenderCommand(PushCommand,RenderContext,Position,CameraUniforms,GeoAsset,Colour,Scale3=[1,1,1])
	{
		const Uniforms = Object.assign( {}, CameraUniforms );
		
		Uniforms.Colour = Colour;
		Uniforms.LocalToWorldTransform = CreateTranslationScaleMatrix( Position, Scale3 );
		
		const Geo = AssetManager.GetAsset(GeoAsset,RenderContext);
		const Shader = AssetManager.GetAsset(this.MapCubeShader,RenderContext);
		
		PushCommand('Draw',Geo,Shader,Uniforms);
	}

	GetCellRenderCommands(Cell,Coord,CameraUniforms,PushCommand,RenderContext)
	{
		const Colour = Cell.Colour;
		const ScaleY = Cell.Height;
		const GeoAsset = this.CubeGeo;
				
		const Coordxy = CoordToXy( Coord );
		const Position = this.MapPositionToWorldPosition( Coordxy );

		this.GetCubeRenderCommand( PushCommand, RenderContext, Position, CameraUniforms, GeoAsset, Colour, [1,ScaleY,1] );
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
		//	render characters
		//	render laser pointer
		for ( let Coord in this.Game.Map.Cells )
		{
			const Cell = this.Game.Map.Cells[Coord];
			if ( !Cell )
				continue;
			this.GetCellRenderCommands( Cell, Coord, CameraUniforms, PushCommand, RenderContext );
		}
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
};
