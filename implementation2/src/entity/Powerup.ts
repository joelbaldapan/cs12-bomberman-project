import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult,
  Effect,
  RemoveEvent
} from "../model";

export const updatePowerup = (ent: Powerup, dt: number): [Powerup, UpdateResult] => {
  let result = UpdateResult.make({events: [], sounds: [], animations: []})
    
      if (ent.isExpired) {
        result = {
          ...result,
          events: [
            ...result.events,
            RemoveEvent.make({entity: ent})
          ]
        }
      }
    
      return [ent, result ]
}




export const tickEffect = (dt: number, effect: Effect): Effect => {
  if (effect.timeRemaining == null) return effect
  return {
    ...effect,
    timeRemaining: effect.timeRemaining - dt,
  }
}

