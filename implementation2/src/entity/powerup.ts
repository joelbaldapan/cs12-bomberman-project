import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult,
  PowerupEffect,
  RemoveEvent,
  SoundType,
  PowerupSound
} from "../model";
import { Array, Option, pipe } from "effect";

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
  return [Player.make({...player, effects: Array.append(player.effects, ent.effect)}), result]
}


export const tickPowerupEffect = (dt: number, effect: PowerupEffect): PowerupEffect => {
  return pipe(
  effect.timeRemaining,
  Option.match({
    onSome: (value) => ({
    ...effect,
    timeRemaining: Option.some(value - dt),
  }),
    onNone: () => effect
  })
);
}

