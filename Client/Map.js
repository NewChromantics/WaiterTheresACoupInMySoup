
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
const MapKing = 'K';

const Player1 = '1';
const Player2 = '2';
const Player3 = '3';
const Player4 = '4';
const Player5 = '5';
const Player6 = '6';
const Player7 = '7';
const Player8 = '8';

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
MapCellAttributes[MapKing]			= CellAttribs( 255, 180, 18, PersonHeight );
MapCellAttributes[Player1]		= CellAttribs( 245, 32, 118, PersonHeight );
MapCellAttributes[Player2]		= CellAttribs( 245, 118, 32, PersonHeight );
MapCellAttributes[Player3]		= CellAttribs( 32, 245, 118, PersonHeight );
MapCellAttributes[Player4]		= CellAttribs( 32, 118, 245, PersonHeight );
MapCellAttributes[Player5]		= CellAttribs( 118, 32, 245, PersonHeight );
MapCellAttributes[Player6]		= CellAttribs( 118, 245, 32, PersonHeight );
MapCellAttributes[Player7]		= CellAttribs( 118, 118, 245, PersonHeight );
MapCellAttributes[Player8]		= CellAttribs( 245, 118, 118, PersonHeight );

export const PremadeMap = 
[
"____________W_____________________________W             ",
"____________W_____________________________W             ",
"__________________________________________W             ",
"__________________________________________W             ",
"____________W______1_2_3_4_K_5_6_7_8______W             ",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W             ",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W.............",
"____________W_____TPTPTPTPTTTPTPTPTPT_____W.............",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W.............",
"            W_____________________________W.............",
"            W______________________________.............",
"            W______________________________.............",
"            W_____________________________W.............",
];



export function GenerateCellMap(MakeCell,Width,Height,Left=0,Top=0)
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

export function XyToCoord(x,y)
{
	//return [x,y].join(',');
	return `${x},${y}`;
}
	
export function CoordToXy(Coord)
{
	return Coord.split(',').map( v => parseInt(v,10) );
}

//	gr: lets try and use this server+client side,
//		maybe this can be the state, so use dumb data
export class MapState_t
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

