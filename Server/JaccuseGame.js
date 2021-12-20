import Pop from '../Client/PopEngine/PopEngine.js'
import PromiseQueue from '../Client/PopEngine/PromiseQueue.js'
import {GetArrayRandomElement} from '../Client/PopEngine/PopApi.js'

export default 'Server Module';

const Soup_GreenSafe = 'g';
const Soup_GreenPoison = 'G';
const Soup_RedSafe = 'r';
const Soup_RedPoison = 'R';
const PlayerCount = 8;

function GetPoisoinedSoupType(Soup)
{
	switch ( Soup )
	{
	case Soup_GreenSafe:
	case Soup_GreenPoison:
		return Soup_GreenPoison;

	case Soup_RedSafe:
	case Soup_RedPoison:
		return Soup_RedPoison;
	}
	throw `GetPoisoinedSoupType(${Soup}) is not a soup type`;
}



export class ServerRoom
{
	constructor()
	{
		this.PlayerMessageAsyncCallbacks = {};	//	[Player]
		this.PlayerNames = [];
		
		this.FirstPlayerConnected = Pop.CreatePromise();
	}
	
	//	this could be wait-for-min-players and server game could repeatedly call...
	async WaitForFirstPlayer()
	{
		return this.FirstPlayerConnected;
	}
	
	AddPlayer(Player,OnMessage)
	{
		if ( this.PlayerMessageAsyncCallbacks.hasOwnProperty(Player) )
			throw `Player ${Player} already exists`;
		this.PlayerNames.push(Player);
		this.PlayerMessageAsyncCallbacks[Player] = OnMessage;
		this.FirstPlayerConnected.Resolve();
	}
	
	async SendPlayerMessageAndWaitForReply(Command,Player,Data)
	{
		//	currently Player is an index, but in the game server it should probbaly be using player idents
		Player = this.PlayerNames[Player];
		
		if ( !this.PlayerMessageAsyncCallbacks.hasOwnProperty(Player) )
			throw `No such player ${Player} in room`;
		
		const ReplyPromise = Pop.CreatePromise();
		
		const Message = {};
		Message[Command] = Data;
		const Reply = await this.PlayerMessageAsyncCallbacks[Player](Message);
		
		return Reply;
	}
	
	//	gr: this doesnt really need to wait
	SendToAllPlayers(Thing,ThingData)
	{
		const Message = {};
		Message[Thing] = ThingData;
		
		const Waits = [];
		for ( let Player in this.PlayerMessageAsyncCallbacks )
		{
			const Callback = this.PlayerMessageAsyncCallbacks[Player];
			try
			{
				//	shouldn't really have to wait?
				const Promise = Callback(Message);
				Waits.push(Promise);
			}
			catch(e)
			{
				Pop.Warning(`Error sending message to player(${Player}); ${e}`);
			}
		}
		//	gr: this doesn't need to wait?
		//await Promise.all(Waits);
	}
	
}


//	this is the actual rules, logic & state of the game
//	eventually will move to a server
//	should really have a class inbetween to bridge/emulate communication?
export class GameServer
{
	constructor(Room)
	{
		this.Room = Room;
		
		//	setup state
		this.State = this.CreateInitialState();

		this.OnGameFinishedPromise = this.GameThread();
		this.ClientReceiverCallbacks = [];	//	array of callbacks that get action/state updates - websocket emulator
	}
	
	CreateInitialState()
	{
		const State = {};

		//	there are N players, each has a placecard, and will have a meal placed at their placecard
		//	todo: king's soup (has no placecard)
		//	todo: randomise seating plan
		State.Placecards = [0,1,2,3,4,5,6,7];
		//	todo: player alive state. If a player is dead, their placecard wont move
		State.PlayerAlive = [true,true,true,true,true,true,true,true];
		//	course1
		//	todo: keep poisoned secret from client
		State.Soups = [];

		return State;
	}
	
	async WaitForGameFinish()
	{
		return this.OnGameFinishedPromise;
	}
	
	
	OnStateChanged()
	{
		const State = Object.assign({},this.State);
		this.Room.SendToAllPlayers('State',State); 
	}
	
	OnAction(Action)
	{
		if ( typeof Action == typeof '' )
		{
			const ActionType = Action;
			Action = {};
			Action[ActionType] = ActionType;
		}
		this.OnStateChanged();
		this.Room.SendToAllPlayers('Action',Action); 
	}
	
	
	SwapPlaceCards(PlayerA,PlayerB)
	{
		//	error if players are out
		const Placecards = this.State.Placecards;
		const IndexA = Placecards.indexOf(PlayerA);
		const IndexB = Placecards.indexOf(PlayerB);
		
		if ( IndexA < 0 )
			throw `SwapPlaceCards(PlayerA=${PlayerA}) not in alive players list`;
		if ( IndexB < 0 )
			throw `SwapPlaceCards(PlayerB=${PlayerB}) not in alive players list`;
		
		if ( PlayerA == PlayerB )
			throw `Cannot swap place cards of same player`;
		
		//	swap
		Placecards[IndexA] = PlayerB;
		Placecards[IndexB] = PlayerA;
	}
	
	PoisonSoup(SoupIndex)
	{
		if ( SoupIndex < 0 || SoupIndex >= this.State.Soups.length )
			throw `PoisonSoup(SoupIndex=${SoupIndex}) out of bounds (${this.State.Soups.length})`;
		let Soup = this.State.Soups[SoupIndex];
		Soup = GetPoisoinedSoupType(Soup);
		this.State.Soups[SoupIndex] = Soup;
	}
	
	async WaitForPreDinnerPlayerMove(Player,SendMoveAndWait,OnAction)
	{
		function SwapPlaceCards(PlayerA,PlayerB)
		{
			PlayerA = parseInt(PlayerA);
			PlayerB = parseInt(PlayerB);
			this.SwapPlaceCards(PlayerA,PlayerB);
			
			const ActionRender = {};
			ActionRender.Debug = `SwapPlaceCards(${PlayerA},${PlayerB})`;
			ActionRender.SwapPlaceCards = [PlayerA,PlayerB];
			OnAction(ActionRender);
		}
		
		function PoisonSoup(SoupIndex)
		{
			this.PoisonSoup(SoupIndex);
			
			const ActionRender = {};
			ActionRender.Debug = `FakePoisonSoup(${SoupIndex})`;
			ActionRender.TouchSoupIndex = SoupIndex;
			OnAction(ActionRender);
		}
		
		function FakePoisonSoup(SoupIndex)
		{
			const ActionRender = {};
			ActionRender.Debug = `FakePoisonSoup(${SoupIndex})`;
			ActionRender.TouchSoupIndex = SoupIndex;
			OnAction(ActionRender);
		}
		
		while(true)
		{
			//	make a list of moves the player can make
			const Move = {};
			Move.Player = Player;
			Move.Actions = {};
		
			//	todo: reduce to active players
			const PlayerIndexes = [0,1,2,3,4,5,6,7];
			Move.Actions.SwapPlacecards = {}
			Move.Actions.SwapPlacecards.Lambda = SwapPlaceCards.bind(this);
			Move.Actions.SwapPlacecards.Arguments = [PlayerIndexes,PlayerIndexes];

			//	todo: reduce to number of soups (number of players)
			const SoupIndexes = [0,1,2,3,4,5,6,7];
			Move.Actions.PoisonSoup = {}
			Move.Actions.PoisonSoup.Lambda = PoisonSoup.bind(this);
			Move.Actions.PoisonSoup.Arguments = [SoupIndexes];
		
			Move.Actions.FakePoisonSoup = {}
			Move.Actions.FakePoisonSoup.Lambda = FakePoisonSoup.bind(this);
			Move.Actions.FakePoisonSoup.Arguments = [SoupIndexes];
		
			//	if this throws, player cannot complete move (eg. disconnected)
			//	so replace with a fake move
			let Reply;
			try
			{
				Reply = await SendMoveAndWait(Player,Move);
			}
			catch(e)
			{
				Pop.Warning(`WaitForPreDinnerPlayerMove(${Player}) Send move error, sending fake; ${e}`);
				Reply = {};
				Reply.Action = 'FakePoisonSoup';
				Reply.ActionArguments = [GetArrayRandomElement(SoupIndexes)];
			}

			//	execute reply
			try
			{
				Pop.Debug(`Executing reply; Reply=${JSON.stringify(Reply)}`);
				//	gr: add arguments if missing
				Reply.ActionArguments = Reply.ActionArguments || [];
				const MoveActionName = Reply.Action;
				const Lambda = Move.Actions[MoveActionName].Lambda;
				const Result = Lambda(...Reply.ActionArguments);
				Pop.Debug(`Move lambda result=${Result}`);
				return Result;
			}
			catch(e)	//	error with lambda
			{
				//	error executing the move lambda, so illegal move
				//	try again by resending request
				//	notify user with extra meta
				Pop.Debug(`Last move error; ${e} trying again`);
				const Error = {};
				Error.Player = Player;
				Error.BadMove = `${e}`;	//	catch typeerrors etc as strings otherwise they show as {}
				OnAction(Error);
				continue;
			}
		}
	}
	
	//	this is normal a functor from lobby class to send out websocket messages etc
	async SendMoveAndWait(Player,Move)
	{
		const Reply = await this.Room.SendPlayerMessageAndWaitForReply( 'Move', Player, Move );
		return Reply;
	}
	
	async GameThread()
	{
		await this.Room.WaitForFirstPlayer();
		//	intro
		this.OnAction('Intro');
		
		//	setup first course
		this.State.Soups = [Soup_GreenSafe,Soup_RedSafe,Soup_GreenSafe,Soup_RedSafe,Soup_GreenSafe,Soup_RedSafe,Soup_GreenSafe,Soup_RedSafe];
		
		//	gr: first implementation; like board game moves, so each player is offered an action
		const MovesPerRound = 3;
		for ( let m=0;	m<MovesPerRound;	m++ )
		{
			for ( let p=0;	p<PlayerCount;	p++ )
			{
				const SendMoveAndWait = this.SendMoveAndWait.bind(this);
				const OnAction = this.OnAction.bind(this);
				await this.WaitForPreDinnerPlayerMove( p, SendMoveAndWait, OnAction );
			}
		}
		
		//	todo: don't serve main course to dead player
		
		//	now execute soup
		for ( let s=0;	s<this.State.Placecards.length;	s++ )
		{
			let Player = this.State.Placecards[s];
			let Soup = this.State.Soups[s];
			let IsPoisoned = IsPoisonedSoup(Soup);
			if ( !IsPoisoned )
				continue;
			State.PlayerAlive[Player] = false;
			this.OnAction('PlayerPoisoned',Player);
		}
		
		//	game results
		this.OnAction('GameFinished',Player);
		//	outro
	}
}

