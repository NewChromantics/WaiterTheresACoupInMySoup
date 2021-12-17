import Pop from './PopEngine/PopEngine.js'
import Renderer from './Renderer.js'
import PromiseQueue from './PopEngine/PromiseQueue.js'
import {GetArrayRandomElement} from './PopEngine/PopApi.js'

import {ServerRoom,GameServer} from '../Server/JaccuseGame.js'


export default class GameClient
{
	constructor(RenderView,RenderContext)
	{
		this.GameMessageQueue = new PromiseQueue(`GameMessageQueue`);
	
		this.Room = new ServerRoom();
		this.Server = new GameServer(this.Room);
		this.Room.AddPlayer('Player1', this.OnServerMessage.bind(this) );
		
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


