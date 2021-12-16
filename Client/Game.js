import Pop from './PopEngine/PopEngine.js'
import Renderer from './Renderer.js'
import {MapState_t,PremadeMap} from './Map.js'




export default class JaccuseGame
{
	constructor(RenderView,RenderContext)
	{
		//	setup state
		this.Map = new MapState_t( PremadeMap );

		//	setup renderer
		this.Renderer = new Renderer( this, RenderView );
		
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


