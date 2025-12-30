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
  Effect,
  DeathSound,
  DeathAnimation,
  AnimationCmd,
  PixelMode,
} from "../model";
import { tickEffect } from "./powerup";
import { Array } from "effect";

export const updatePlayer = (
  ent: Player,
  dt: number
): [Player, UpdateResult] => {
  let result = UpdateResult.make({ events: [], sounds: [], animations: [] });
  const tickedEffects = ent.effects.map((e) => tickEffect(dt, e));
  const remainingEffects = tickedEffects.filter(
    (e) => e.timeRemaining == null || e.timeRemaining > 0
  );
  if (!ent.isAlive) {
    let animation = AnimationCmd.make({
      type: DeathAnimation.make(),
      mode: PixelMode.make(),
      a: ent.x,
      b: ent.y,
      durationFrames: 60,
      id: ent.id,
      powerupType: null,
    });
    result = {
      ...result,
      sounds: Array.append(result.sounds, DeathSound.make()),
      animations: Array.append(result.animations, animation),
    };
    return [
      Player.make({ ...ent, effects: remainingEffects, isExpired: true }),
      result,
    ];
  }
  return [Player.make({ ...ent, effects: remainingEffects }), result];
};
