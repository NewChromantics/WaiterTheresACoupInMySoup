import {GetArrayRandomElement} from './PopEngine/PopApi.js'


class Actor_t
{
	constructor(x,y,Sprite)
	{
		this.xy = [x,y];
		this.w = 1;
		this.h = 1;
		
		this.Sprite = Sprite;
	}
	
	get x()	{	return this.xy[0];	}
	get y()	{	return this.xy[1];	}
}


//	handle actors
export default class SceneManager_t
{
	constructor(TileMap)
	{
		this.Actors = {};
		this.Map = TileMap;
	}

	GetSprites()
	{
		function ActorToSprite(Actor)
		{
			return Actor;
		}
		const Sprites = Object.values(this.Actors).map( ActorToSprite );
		
		return Sprites;
	}

	GetEmptyCells()
	{
		const Actors = Object.values(this.Actors);
		function HasActorInPosition(xy)
		{
			for ( let Actor of Actors )
			{
				if ( Actor.x != xy[0] )
					continue;
				if ( Actor.y != xy[1] )
					continue;
				return true;
			}
			return false;
		}
		function HasNoActorInPosition(xy)
		{
			return !HasActorInPosition(xy);
		}
		
		let EmptyCells = this.Map.GetEmptyTiles();
		EmptyCells = EmptyCells.filter( HasNoActorInPosition );
		return EmptyCells;
	}

	AllocateActorInSpace(Name,Sprite='null')
	{
		const EmptyCells = this.GetEmptyCells();
		if ( !EmptyCells.length )
			throw `No space for new actor`;
		const xy = GetArrayRandomElement( EmptyCells );
		return this.AllocateActor( Name, ...xy, Sprite );
	}

	AllocateActor(Name,x,y,Sprite)
	{
		if ( this.Actors.hasOwnProperty(Name) )
			throw `Actor ${Name} already allocated`;
			
		const Actor = new Actor_t( x, y, Sprite );
		this.Actors[Name] = Actor;
		return Actor;
	}

	ForEachActor(Callback)
	{
		for ( let ActorName in this.Actors )
		{
			const Actor = this.Actors[ActorName];
			Callback( Actor, ActorName );
		}
	}
	
	GetActor(Name)
	{
		return this.Actors[Name];
	}
	
}
