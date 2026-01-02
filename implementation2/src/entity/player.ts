import { HashSet } from "effect"
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
  GridCoords,
} from "../model";
import { tickEffect } from "./powerup";
import { Array , Option} from "effect";
import { pixelToCell } from "../helpers/grid_adapter";

export const updatePlayer = (
  ent: Player,
  dt: number
): [Player, UpdateResult] => {
  let result = UpdateResult.make({ events: [], sounds: [], animations: [] });
  const tickedEffects = ent.effects.map((e) => tickEffect(dt, e));
  const remainingEffects = tickedEffects.filter((e) =>
    Option.getOrElse(e.timeRemaining, () => 1) > 0
  );
  if (!ent.isAlive) {
    let animation = AnimationCmd.make({
      type: DeathAnimation.make(),
      mode: PixelMode.make(),
      a: ent.x,
      b: ent.y,
      durationFrames: 60, //not sure about this yet,
      id: Option.some(ent.id),
      powerupType: Option.none(),
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

export const onExplosionHitPlayer = (player: Player): Player => {
  if (!player.isAlive) {
    return Player.make({...player})
  }
  return Player.make({...player, isAlive: false})
}


export const playerSpeed = (player: Player): number => Array.reduce(player.effects, player.speed, (acc, effect) => acc + effect.speedDelta)

export const playerRange = (player: Player): number => Array.reduce(player.effects, 1, (acc, effect) => acc + effect.rangeDelta)

export const playerMaxBombs = (player: Player): number => Array.reduce(player.effects, 1, (acc, effect) => acc + effect.bombsDelta)

export const addBomb = (player: Player, bomb: Bomb): Player => Player.make({...player, activeBombs: Array.append(player.activeBombs, bomb.id)})


export const removeBomb = (player: Player, bomb: Bomb): Player => Player.make({...player, activeBombs: Array.filter(player.activeBombs, (id) => id !== bomb.id)})

export const hitboxX = (player: Player): number => player.x

export const hitboxY = (player: Player): number => player.y + 8

export const getPlayerById = (players: HashSet.HashSet<Player>, id: number): Player | null =>Option.getOrNull(Array.findFirst(players, p => p.id === id));
// need this for pathfinding
export const getOverlappingCells = (bot: Player): GridCoords[] => {
  /*
    TO IMPELEMENT
    TO IMPELEMENT
    TO IMPELEMENT
    */
  return [[bot.row, bot.col]];
}; //pls implement thx

export const isOverlapping = (player: Player, cell: GridCoords): boolean => {
    const TILE_SIZE = 16

    const pCX = player.x + (player.width / 2);
    const pCY = player.y + (player.height / 2);
    const cLeft = cell[1] * TILE_SIZE;
    const cTop = cell[0] * TILE_SIZE;
    
    return (pCX >= cLeft && pCX < cLeft + TILE_SIZE && 
            pCY >= cTop && pCY < cTop + TILE_SIZE);
};
export const getPlayerRow = (player: Player): number => {
  const cx = hitboxX(player) + 16 / 2;
  const cy = hitboxY(player) + 16 / 2;

  const res = pixelToCell(Math.floor(cx), Math.floor(cy));

  if (res) {
    return res[0];
  } else {
    return -1;
  }
};

export const getPlayerCol = (player: Player): number => {
  const cx = hitboxX(player) + 16 / 2;
  const cy = hitboxY(player) + 16 / 2;

  const res = pixelToCell(Math.floor(cx), Math.floor(cy));

  if (res) {
    return res[1];
  } else {
    return -1;
  }
};
