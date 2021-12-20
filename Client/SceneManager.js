//	handle actors
export default class SceneManager_t
{
	constructor(TileMap)
	{
		this.Actors = {};
	}

	GetSprites()
	{
		const Sprites = [];
		
		function ActorToSprite(Actor)
		{
			return Actor;
		}
		const Sprties = Object.values(this.Actors).map( ActorToSprite );
		
		return Sprites;
	}

}
