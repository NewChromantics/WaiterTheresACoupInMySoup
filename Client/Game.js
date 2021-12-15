import Pop from './PopEngine/PopEngine.js'
import Camera_t from './PopEngine/Camera.js'
import {Distance3,Lerp3,MatrixInverse4x4,CreateIdentityMatrix,CreateTranslationMatrix} from './PopEngine/Math.js'
import AssetManager from './PopEngine/AssetManager.js'
import {CreateCubeGeometry} from './PopEngine/CommonGeometry.js'


const ClearColour = [0.2,0.1,0.4];
const MapCellColour = [0.8,0.2,0.3];

async function CreateActorTriangleBuffer(RenderContext)
{
	const Geometry = CreateCubeGeometry( 0.1, 0.9, 0.0, 0.1 );
	const TriangleIndexes = undefined;
	const TriBuffer = await RenderContext.CreateGeometry(Geometry,TriangleIndexes);
	return TriBuffer;
}

async function CreateFloorTileTriangleBuffer(RenderContext)
{
	const Geometry = CreateCubeGeometry( 0.1, 0.9, 0.0, 0.1 );
	const TriangleIndexes = undefined;
	const TriBuffer = await RenderContext.CreateGeometry(Geometry,TriangleIndexes);
	return TriBuffer;
}

const MapCubeFrag_Filename = 'Client/Assets/Colour.frag.glsl';
const MapCubeVert_Filename = 'Client/Assets/Geo.vert.glsl';

//	scene renderer for spy
class Renderer_Spy
{
	constructor(Game,RenderView)
	{
		this.Game = Game;
		this.Camera = this.CreateCamera(Game,RenderView);

		const MapCubeGeoAttribs = ['LocalPosition','LocalUv'];	//	need to remove the need for this!
		this.ActorCubeGeo = AssetManager.RegisterAssetAsyncFetchFunction('ActorCube', CreateActorTriangleBuffer);
		this.MapFloorTileGeo = AssetManager.RegisterAssetAsyncFetchFunction('MapFloorTile', CreateFloorTileTriangleBuffer);
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
		
		const Pitch = -50;
		const Yaw = 0;	//	isometric starting view
		const Zoom = 0.6 * Distance3( MapMinMax.Min, MapMinMax.Max );
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
		const x = xy[0];
		const z = xy[1];
		return [x,y,z];
	}
	
	GetCubeRenderCommand(PushCommand,RenderContext,Coord,CameraUniforms,Colour)
	{
		const Uniforms = Object.assign( {}, CameraUniforms );
		
		const Coordxy = CoordToXy( Coord );
		const Position = this.MapPositionToWorldPosition( Coordxy );
		
		Uniforms.Colour = Colour;
		Uniforms.LocalToWorldTransform = CreateTranslationMatrix( ...Position );
		
		const Geo = AssetManager.GetAsset(this.MapFloorTileGeo,RenderContext);
		const Shader = AssetManager.GetAsset(this.MapCubeShader,RenderContext);
		
		PushCommand('Draw',Geo,Shader,Uniforms);
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
			this.GetCubeRenderCommand( PushCommand, RenderContext, Coord, CameraUniforms, MapCellColour );
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


function GenerateCellMap(MakeCell,Width,Height,Left=0,Top=0)
{
	//	using a coord-key map for future non-square layouts
	//	this also allows negatives
	//	['x,y'] = cell
	const Map = {};
	
	for ( let x=Left;	x<Left+Width;	x++ )
	{
		for ( let y=Top;	y<Top+Height;	y++ )
		{
			const Cell = MakeCell(x,y);
			const Key = XyToCoord(x,y);
			Map[Key] = Cell;
		}
	}
	return Map;
}

function XyToCoord(x,y)
{
	//return [x,y].join(',');
	return `${x},${y}`;
}
	
function CoordToXy(Coord)
{
	return Coord.split(',').map( v => parseInt(v,10) );
}

//	gr: lets try and use this server+client side,
//		maybe this can be the state, so use dumb data
class MapState_t
{
	constructor(Width,Height)
	{
		this.Cells = GenerateCellMap( ()=>{}, Width, Height );
	}
	
	
	
	//	return .Min=[x,y] and .Max of furthest cell coords
	GetMinMax()
	{
		let Min = null;
		let Max = null;
		for ( let Coord in this.Cells )
		{
			const xy = CoordToXy(Coord);
			
			if ( !Min )
				Min = xy.slice();
			if ( !Max )
				Max = xy.slice();
			Min[0] = Math.min( Min[0], xy[0] );
			Min[1] = Math.min( Min[1], xy[1] );
			Max[0] = Math.max( Max[0], xy[0] );
			Max[1] = Math.max( Max[1], xy[1] );
		}
		const MinMax = {};
		MinMax.Min = Min;
		MinMax.Max = Max;
		return MinMax;
	}
}


export default class JaccuseGame
{
	constructor(RenderView,RenderContext)
	{
		//	setup state
		this.Map = new MapState_t( 20, 20 );

		//	setup renderer
		this.Renderer = new Renderer_Spy( this, RenderView );
		
		//	run
		this.OnGameEndPromise = this.GameThread();
		const OnError = this.OnError.bind(this);
		this.RenderThread(RenderContext).then(OnError).catch(OnError);
	}
	
	OnError(Error)
	{
		//this.OnGameEndPromise.reject(Error);
	}
	
	async WaitForEnd()
	{
		return this.OnGameEndPromise;
	}
	
	async RenderThread(RenderContext)
	{
		while ( RenderContext )
		{
			try
			{
				const Commands = await this.Renderer.GetRenderCommands( RenderContext, this );
				await RenderContext.Render(Commands);
			}
			catch(e)
			{
				console.error(e);
				await Pop.Yield(2);
			}
		}
	}
	
	async GameThread()
	{
		//	handle input queue
		//	handle server updates
		await Pop.Yield( 30*1000 );
	}
}


