import Pop from './PopEngine/PopEngine.js'
import Renderer from './Renderer.js'
import PromiseQueue from './PopEngine/PromiseQueue.js'
import {GetArrayRandomElement} from './PopEngine/PopApi.js'
import {PremadeMapWidth,PremadeMapHeight,GetCellAttributes} from './JaccuseMap.js'
import TileMap_t from './TileMap.js'
import SceneManager_t from './SceneManager.js'

import {ServerRoom,GameServer} from '../Server/JaccuseGame.js'


export default class GameClient
{
	constructor(RenderView,RenderContext)
	{
		this.GameMessageQueue = new PromiseQueue(`GameMessageQueue`);
	
		this.Map = new TileMap_t( PremadeMapWidth, PremadeMapHeight, GetCellAttributes );
		this.Scene = new SceneManager_t( this.Map );

		for ( let i=1;	i<10;	i++ )
			this.Scene.AllocateActorInSpace(`Player${i}`,`${i}`);

		this.Room = new ServerRoom();
		this.Server = new GameServer(this.Room);
		this.Room.AddPlayer('Player1', this.OnServerMessage.bind(this) );
		
		this.State = {};
		this.OnInitialStatePromise = Pop.CreatePromise();

		//	run
		this.OnGameEndPromise = this.GameThread(RenderView);
		this.UpdateThread();
		const OnError = this.OnError.bind(this);
		this.RenderThread(RenderContext).then(OnError).catch(OnError);
	}
	
	OnNewState(NewState)
	{
		this.State = NewState;
		this.OnInitialStatePromise.Resolve();
	}
	
	async OnServerMessage(Message)
	{
		//	put in message queue for client to handle
		const ReplyPromise = Pop.CreatePromise();
		function OnReply(Reply)
		{
			ReplyPromise.Resolve(Reply);
		}
		this.GameMessageQueue.Push([Message,OnReply]);
		
		const Reply = await ReplyPromise;
		return Reply;
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
	
	async OnAction(Message)
	{
		console.log(`OnAction(${Message.Action.Debug})`,Object.keys(Message.Action));
		//await Pop.Yield(2*1000);
	}
	
	async HandleMove(Message)
	{
		const Reply = await this.Renderer.WaitForMoveSelection(Message.Move.Actions);
		return Reply;
	}
	
	get PlayerActorName()
	{
		return 'Player1';
	}
	
	ProcessInput(SceneHit)
	{
		//	todo: let user draw a path with a drag
		if ( SceneHit.Tile )
		{
			//	get an unobscured path to this tile pos from our location
			const PlayerActor = this.Scene.GetActor(this.PlayerActorName);
			const Start = PlayerActor.xy;
			const End = SceneHit.xy;
			function IsObscured(x,y)	{	return false;	}	//	todo: check actor isn't in the way - do we want to recalc this though?
			const Path = this.Map.GetPath( Start, End );
			//	failed to get a route... tell path to be the end and it'll reclaculate
			if ( !Path )
				Path = [End.slice()];
			PlayerActor.AutoPath = Path;
		}
		else
		{
			Pop.Debug(`Process non-tile input`,SceneHit);
		}
	}
	
	UpdateActors()
	{
		//	move any actors who have a path
		function UpdateActor(Actor,ActorName)
		{
			if ( Actor.AutoPath )
			{
				//	walk path
				const NextPos = Actor.AutoPath.shift();
				if ( NextPos )
				{
					Actor.xy = NextPos.slice();
					Actor.xy[0] *= this.Map.TileSize;
					Actor.xy[1] *= this.Map.TileSize;
				
					if ( Actor.AutoPath.length==0 )
						Actor.AutoPath = null;
				}
			}
		}
		this.Scene.ForEachActor( UpdateActor.bind(this) );
	}
	
	async UpdateThread(RenderView)
	{
		await this.OnInitialStatePromise;
		
		//	
		while ( true )
		{
			//	process all inputs
			const SceneHits = this.Renderer.PopInputs();
			SceneHits.forEach( this.ProcessInput.bind(this) );

			//	move all actors
			this.UpdateActors();
			
			//	wait for next tick
			await Pop.Yield( 1000/15 );
		}
		
	}
	
	async GameThread(RenderView)
	{
		//	renderer is dependent on map atm, so wait for initial state
		function CreateRenderer()
		{
			this.Renderer = new Renderer( this, RenderView );
		}
		this.OnInitialStatePromise.then(CreateRenderer.bind(this));

		//	
		while ( true )
		{
			const [Message,OnReply] = await this.GameMessageQueue.WaitForNext();
			Pop.Debug(`Got message`,Message);
			
			if ( Message.State )
			{
				this.OnNewState(Message.State);
			}

			if ( Message.Action )
			{
				const Reply = await this.OnAction(Message);
				OnReply(Reply);
			}
			else if ( Message.Move )
			{
				const Reply = await this.HandleMove(Message);
				OnReply(Reply);
			}
			else
			{
				//	should wait for at least a frame?
				OnReply();
			}
		}
	}
}


