
export const PremadeMap = 
[
"____________W_____________________________W             ",
"____________W_____________________________W             ",
"__________________________________________W             ",
"__________________________________________W             ",
"____________W_____________________________W             ",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W             ",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W.............",
"____________W_____TPTPTPTPTTTPTPTPTPT_____W.............",
"____________W_____TTTTTTTTTTTTTTTTTTT_____W.............",
"            W_____________________________W.............",
"            W______________________________.............",
"            W______________________________.............",
"            W_____________________________W.............",
];


export const PremadeMapWidth = PremadeMap[0].length;
export const PremadeMapHeight = PremadeMap.length;

function IsFloor(Cell)
{
	switch(Cell)
	{
		case '_':
		case '.':
			return true;
			
		default:
			return false;
	}
}

//	gr: this is supposed to be abstract from the sprite (see sprite manager)
//		but... is there much point?
export function GetCellAttributes(x,y)
{
	const Row = PremadeMap[y];

	const Cell = {};
	Cell.Type = Row ? Row[x] : null;
	if ( !Cell.Type )
		return;
	if ( Cell.Type == ' ' )
		return;
	
	Cell.Obstructed = !IsFloor(Cell.Type);
	return Cell;
}

