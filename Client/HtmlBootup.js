import Pop from './PopEngine/PopEngine.js'
import Game_t from './Game.js'

export async function GameThread(RenderView,RenderContext)
{
	//	startup ui
	//	connect to server
	//	get server connection
	//	make game instance with server
	const Game = new Game_t(RenderView,RenderContext);
	//	wait for game to finish
	await Game.WaitForEnd();
	//	show end of game UI
}

export default async function Bootup(Canvas)
{
	//	create renderer
	const Window = null;
	const RenderView = new Pop.Gui.RenderView(Window,Canvas);
	const RenderContext = new Pop.Sokol.Context(RenderView);
	
	while ( true )
	{
		try
		{
			await GameThread(RenderView,RenderContext);
		}
		catch(e)
		{
			console.error(e);
		}
		await Pop.Yield(1*2000);	//	throttle cpu
	}
}
