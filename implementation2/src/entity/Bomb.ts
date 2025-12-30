import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult,
  RemoveEvent,
  ExplosionSound
} from "../model";
import { Array } from "effect";

export const updateBomb = (ent: Bomb, dt: number): [Bomb, UpdateResult] => {
  let result = UpdateResult.make({events: [], sounds: [], animations: []})
  if (ent.isExpired) {
    return [Bomb.make({...ent}), 
    result]
  
  }
  if (ent.currentTimer >= ent.fuse) {
    result = {...result, events: Array.append(result.events, RemoveEvent.make({entity: ent})), sounds: Array.append(result.sounds, ExplosionSound.make()), animations: []}
  }
  return [Bomb.make({...ent, isExpired: true, currentTimer: ent.currentTimer + dt}),
result]
}
