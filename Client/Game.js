import Pop from './PopEngine/PopEngine.js'
import Renderer from './Renderer.js'
import {MapState_t,PremadeMap} from './Map.js'


//	this is the actual rules, logic & state of the game
//	eventually will move to a server
//	should really have a class inbetween to bridge/emulate communication?
class GameServer
{
	constructor()
	{
		//	setup state
		this.State = {};
		this.State.Map = new MapState_t( PremadeMap );

		this.OnFirstPlayerPromise = Pop.CreatePromise();
		this.OnGameFinishedPromise = this.GameThread();
		this.ClientReceiverCallbacks = [];	//	array of callbacks that get action/state updates - websocket emulator
	}
	
	AddClientReciver(Callback)
	{
		this.ClientReceiverCallbacks.push(Callback);
		this.OnFirstPlayerPromise.Resolve();
	}
	
	async WaitForGameFinish()
	{
		return this.OnGameFinishedPromise;
	}
	
	SendMessage(Message)
	{
		Message.State = Object.assign({},this.State);
		function SendState(Callback)
		{
			Callback(Message);
		}
		this.ClientReceiverCallbacks.forEach( SendState ); 
	}
	
	OnStateChanged()
	{
		//	notify clients of new state/events/actions
		const Message = {};
		this.SendMessage(Message);
	}
	
	OnAction(Action)
	{
		//	notify clients of new state/events/actions
		const Message = {};
		Message.Action = Action;
		this.SendMessage(Message);
	}
	
	async GameThread()
	{
		await this.OnFirstPlayerPromise;
		//	intro
		this.OnAction('Intro');
		//	place players
		this.OnAction('PlayersSeated');
		//	round 1
		this.OnAction('PreSoup');
			//	kitchen prepares soup
			//	players move around
			//	timer countdown
			//	sit players down
			//	resolve deaths
		//	round 2
			//	kitchen prepares dinner
			//	players move around
			//	timer countdown
			//	sit players down
			//	resolve death
		//	game results
		//	outro
	}
}


export default class GameClient
{
	constructor(RenderView,RenderContext)
	{
		this.Server = new GameServer();
		this.Server.AddClientReciver( this.OnServerMessage.bind(this) );
		
		this.State = {};
		this.OnInitialStatePromise = Pop.CreatePromise();

		//	run
		this.OnGameEndPromise = this.GameThread(RenderView);
		const OnError = this.OnError.bind(this);
		this.RenderThread(RenderContext).then(OnError).catch(OnError);
	}
	
	get Map()
	{
		return this.State.Map;
	}
	
	OnServerMessage(Message)
	{
		//	update state
		this.State = Message.State;
		this.OnInitialStatePromise.Resolve();
		
		//	handle action
		if ( Message.Action )
			console.log(`Action ${Message.Action}`);
	}
	
	OnError(Error)
	{
		//this.OnGameEndPromise.reject(Error);
	}
	
	async WaitForEnd()
	{
		return this.OnGameEndPromise;
	}
	
	async GetRenderCommands(RenderContext)
	{
		if ( !this.Renderer )
		{
			const Clear = ['SetRenderTarget',null,[0.5,0,0]];
			return [Clear];
		}
		
		return this.Renderer.GetRenderCommands( RenderContext, this );
	}
	
	async RenderThread(RenderContext)
	{
		while ( RenderContext )
		{
			try
			{
				const Commands = await this.GetRenderCommands(RenderContext);
				await RenderContext.Render(Commands);
			}
			catch(e)
			{
				console.error(e);
				await Pop.Yield(200);
			}
		}
	}
	
	async GameThread(RenderView)
	{
		//	renderer is dependent on map atm, so wait for initial state
		await this.OnInitialStatePromise;
		this.Renderer = new Renderer( this, RenderView );

		//	

		//	handle input queue
		//	handle server updates
		await Pop.Yield( 30*1000 );
	}
}


