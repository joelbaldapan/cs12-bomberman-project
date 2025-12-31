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
import { Array } from "effect";

export const updateExplosion = (
  ent: Explosion,
  dt: number
): [Explosion, UpdateResult] => {
  let result = UpdateResult.make({ events: [], sounds: [], animations: [] });
  if (ent.isExpired) {
    return [Explosion.make({ ...ent }), result];
  }
  if (ent.currentTimer >= ent.fullTimer) {
    result = {
      ...result,
      events: Array.append(result.events, RemoveEvent.make({ entity: ent })),
      sounds: [],
      animations: [],
    };
  }
  return [
    Explosion.make({
      ...ent,
      isExpired: ent.currentTimer >= ent.fullTimer,
      currentTimer: ent.currentTimer + 1,
    }),
    result,
  ];
};

export const onExplosionHitExplosion = (ent: Explosion): Explosion => Explosion.make({...ent})
