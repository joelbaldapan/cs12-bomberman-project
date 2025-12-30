import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult
} from "../model";

export const updatePowerup = (ent: Powerup, dt: number): [Powerup, UpdateResult] => {
  return Powerup.make({ /* implement */ })
}
