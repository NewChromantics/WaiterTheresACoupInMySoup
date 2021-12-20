

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
			if ( !Cell )
				continue;
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
export default class TileMap
{
	constructor(MapWidth,MapHeight,GetCellAttributes,TileSize=1)
	{
		//	todo: layers. Currently everything is flat, no height, only at render time
		//		this TileMap class will want to access sprite manager to get heights of tiles (for collision)
		//		we also want an external thing for cell occupation... (same thing?)
		this.Cells = GenerateCellMap( GetCellAttributes, MapWidth, MapHeight );
		this.TileSize = TileSize;
	}
	
	//	return .Min=[x,y] and .Max of furthest cell coords
	GetMinMax(ScaleToTileSize=false)
	{
		let Min = null;
		let Max = null;
		let xscale = ScaleToTileSize ? this.TileSize : 1;
		let yscale = ScaleToTileSize ? this.TileSize : 1;
		
		for ( let Coord in this.Cells )
		{
			const xy = CoordToXy(Coord);
			xy[0] *= xscale;
			xy[1] *= yscale;
			
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
	
	GetSprites()
	{
		function CellToSprite(Coord)
		{
			const Cell = this.Cells[Coord];
			const xy = CoordToXy(Coord);
			const Sprite = {};
			Sprite.x = xy[0] * this.TileSize;
			Sprite.y = xy[1] * this.TileSize;
			Sprite.w = this.TileSize;	//	these should be from/dictated by sprite asset manager in the renderer, not here?
			Sprite.h = this.TileSize;	//	these should be from/dictated by sprite asset manager in the renderer, not here?
			Sprite.Sprite = Cell.Type;
			
			return Sprite;
		}
		
		const Sprites = Object.keys( this.Cells ).map( CellToSprite.bind(this) );
		
		return Sprites;
	}
	
	GetEmptyCells()
	{
		const EmptyPositions = [];
		
		for ( let Coord in this.Cells )
		{
			const Cell = this.Cells[Coord];
			if ( Cell.Obstructed )
				continue;
			const xy = CoordToXy(Coord);
			EmptyPositions.push(xy);
		}
		return EmptyPositions;
	}
}

