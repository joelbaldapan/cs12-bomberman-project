import {
  Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult,
  RemoveEvent,
} from "../model";

export const updateBlock = (ent: Block, dt: number): [Block, UpdateResult] => {
  let result = UpdateResult.make({ events: [], sounds: [], animations: [] });

  if (ent.isExpired) {
    result = {
      ...result,
      events: [...result.events, RemoveEvent.make({ entity: ent })],
    };
  }

  return [ent, result];
};

export const onExplosionHitBlock = (ent: Block): Block => ent.isHard ? Block.make({...ent}) : Block.make({...ent, isExpired: true})
