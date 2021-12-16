import Pop from './PopEngine/PopEngine.js'
import Camera_t from './PopEngine/Camera.js'
import {Distance3,Lerp3,MatrixInverse4x4,CreateIdentityMatrix,CreateTranslationMatrix,CreateTranslationScaleMatrix} from './PopEngine/Math.js'
import AssetManager from './PopEngine/AssetManager.js'
import {CreateCubeGeometry} from './PopEngine/CommonGeometry.js'


const ClearColour = [0,0,0];

function CellAttribs(Red,Green,Blue,Height)
{
	const Attribs = {};
	Attribs.Colour = [Red,Green,Blue].map( x=>x/255 );
	Attribs.Height = Height;
	return Attribs;
}

const MapWall = 'W';
const MapWoodFloor = '_';
const MapKitchenFloor = '.';
const MapTable = 'T';
const MapTablePlacecard = 'P';
const MapPlayer = 'X';
const MapKing = 'K';

const FloorHeight = 0.1;
const TableHeight = 0.8;
const PersonHeight = 1.5;
const WallHeight = 2.4;
const MapCellAttributes = {};
MapCellAttributes[MapWoodFloor]		= CellAttribs( 141, 93, 15, FloorHeight );
MapCellAttributes[MapKitchenFloor]	= CellAttribs( 214, 210, 203, FloorHeight );
MapCellAttributes[MapTable]			= CellAttribs( 161, 113, 35, TableHeight );
MapCellAttributes[MapTablePlacecard]	= CellAttribs( 250, 250, 250, TableHeight+0.1 );
MapCellAttributes[MapWall]			= CellAttribs( 204, 90, 49, WallHeight );
MapCellAttributes[MapPlayer]		= CellAttribs( 245, 232, 118, PersonHeight );
MapCellAttributes[MapKing]			= CellAttribs( 255, 180, 18, PersonHeight );
const PremadeMap = 
[
"____________W_____________________________W             ",
"____________W_____________________________W             ",
"__________________________________________W             ",
"__________________________________________W             ",
"____________W______X_X_X_X_K_X_X_X_X______W             ",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W             ",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W.............",
"____________W_____TPTPTPTPTTTPTPTPTPT_____W.............",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W.............",
"            W_____________________________W.............",
"            W______________________________.............",
"            W______________________________.............",
"            W_____________________________W.............",
];


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
class Renderer_Spy
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
	constructor(PremadeMap)
	{
		function CreateCell(x,y)
		{
			const Cell = {};
			Cell.Type = PremadeMap[y][x];
			const Attribs = MapCellAttributes[Cell.Type];
			if ( !Attribs )
				return null;
			Object.assign( Cell, MapCellAttributes[Cell.Type] );
			return Cell;
		}
		this.Cells = GenerateCellMap( CreateCell, PremadeMap[0].length, PremadeMap.length );
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
		this.Map = new MapState_t( PremadeMap );

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
				await Pop.Yield(200);
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


