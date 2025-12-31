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
  RemoveEvent,
  SoundType,
  PowerupSound
} from "../model";
import { Array } from "effect";

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

export const onExplosionHitPowerup = (ent: Powerup): Powerup => Powerup.make({...ent, isExpired: true})

export const onPickup = (ent: Powerup, player: Player): [Player, UpdateResult] => {
  let result = UpdateResult.make({events: Array.append(Array.empty(), RemoveEvent.make({entity: ent})), sounds: Array.append(Array.empty(), PowerupSound.make()), animations: []})
  return [Player.make({...player, effects: Array.append(player.effects, ent.powerupType.effect)}), result]
}


export const tickEffect = (dt: number, effect: Effect): Effect => {
  if (effect.timeRemaining == null) return effect
  return {
    ...effect,
    timeRemaining: effect.timeRemaining - dt,
  }
}

