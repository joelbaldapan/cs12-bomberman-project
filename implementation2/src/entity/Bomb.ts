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

export const updateBomb = (ent: Bomb, dt: number): [Bomb, UpdateResult] => {
  return Bomb.make({ /* implement */ })
}
