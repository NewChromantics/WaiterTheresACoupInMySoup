

function CellAttribs(Red,Green,Blue,Height)
{
	const Attribs = {};
	Attribs.Colour = [Red,Green,Blue].map( x=>x/255 );
	Attribs.Height = Height;
	return Attribs;
}

const Invalid = null;

//	these would be loaded
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
export const MapCellAttributes = {};
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

MapCellAttributes[Invalid]		= CellAttribs( 255, 0, 255, FloorHeight );

export default class SpriteManager
{
	//	sprite -> assets
	GetUniforms(Sprite)
	{
		const Uniforms = {};
		
		//	asset name
		let AssetName = Sprite.Sprite;
		if ( !MapCellAttributes.hasOwnProperty(AssetName) )
			AssetName = Invalid;
			
		const Attrib = MapCellAttributes[AssetName];
		
		//	here we'd get width, height, graphic, uv etc from sprite sheets
		Uniforms.Colour = Attrib.Colour;
		Uniforms.ScaleY = Attrib.Height;
		
		return Uniforms;
	}
}

