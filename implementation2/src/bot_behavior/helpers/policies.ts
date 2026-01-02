import { getAffectedCells } from "../../entity/bomb";
import { getOverlappingCells } from "../../entity/player";
import { getAllType } from "../../helpers/world";
import {
  World,
  Player,
  Bomb,
  Explosion,
  Powerup,
  GridCoords,
  Entity,
  Block,
  BotConfig,
  BotMemory,
  AttackPolicy1,
  AttackPolicy2,
  PowerupPolicy1,
  PowerupPolicy2,
  BombOnlyDangerPolicy,
  ExplosionPredictionDangerPolicy,
} from "../../model";
import { getShortestPath } from "./pathfinding";
import { HashSet, HashMap, Option } from "effect";

export const getManhattan = (a: GridCoords, b: GridCoords): number => {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
};

// DANGER POLICIES

export const getAllDangerZones = (
  policy: BotConfig["dangerPolicy"],
  world: World
): HashSet.HashSet<string> => {
  let dangerCells = HashSet.empty<string>();
  const add = (r: number, c: number) => {
    dangerCells = HashSet.add(dangerCells, `${r},${c}`);
  };

  if (policy._tag === "Bomb Only Danger Policy") {
    // 1 - Existing Bombs
    const bombs = getAllType(world, Bomb);
    for (const b of bombs) add(b.row, b.col);

    // 2 - Existing Explosions
    const explosions = getAllType(world, Explosion);
    for (const e of explosions) add(e.row, e.col);
  } else if (policy._tag === "Explosion Prediction Danger Policy") {
    // 1 - Existing Explosions
    const explosions = getAllType(world, Explosion);
    for (const e of explosions) add(e.row, e.col);

    // 2 - Bombs AND their predicted blasts
    const bombs = getAllType(world, Bomb);
    for (const b of bombs) {
      add(b.row, b.col);
      const affected = getAffectedCells(b, world);
      for (const [r, c] of affected) add(r, c);
    }
  }

  return dangerCells;
};

export const isInDanger = (
  policy: BotConfig["dangerPolicy"],
  world: World,
  bot: Player,
  radius: number
): boolean => {
  const overlapPos = getOverlappingCells(bot);
  const botPos: GridCoords = [bot.row, bot.col];
  const dangerZones = getAllDangerZones(policy, world);

  // Check overlap
  const isTouchingDanger = overlapPos.some(([r, c]) =>
    HashSet.has(dangerZones, `${r},${c}`)
  );

  if (isTouchingDanger) return true;

  if (radius === 0) return false;

  // Check radius
  for (let r = bot.row - radius; r <= bot.row + radius; r++) {
    for (let c = bot.col - radius; c <= bot.col + radius; c++) {
      if (r < 0 || r >= world.rows || c < 0 || c >= world.cols) continue;

      if (getManhattan(botPos, [r, c]) <= radius) {
        if (HashSet.has(dangerZones, `${r},${c}`)) {
          return true;
        }
      }
    }
  }
  return false;
};

// ATTACK POLICIES

export const getAttackGoal = (
  policy: BotConfig["attackPolicy"],
  world: World,
  bot: Player
): GridCoords | null => {
  const players = Array.from(getAllType(world, Player));
  const opponents = players.filter(
    (p) => p.player_id !== bot.player_id && p.isAlive
  );

  if (policy._tag === "Attack Policy 1") {
    const candidates: { pos: GridCoords; len: number }[] = [];

    for (const opponent of opponents) {
      const targetPos: GridCoords = [opponent.row, opponent.col];

      const dist = getManhattan([bot.row, bot.col], targetPos);
      if (dist > policy.maxDistance) continue;

      const path = getShortestPath(world, [bot.row, bot.col], targetPos, false);

      if (path.length > 0 || dist <= 1) {
        if (path.length > 0)
          candidates.push({ pos: targetPos, len: path.length });
      }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => a.len - b.len);
    return candidates[0].pos;
  }

  if (policy._tag === "Attack Policy 2") {
    if (opponents.length === 0) return null;

    const shuffled = [...opponents].sort(() => Math.random() - 0.5);

    for (const target of shuffled) {
      const targetPos: GridCoords = [target.row, target.col];
      const path = getShortestPath(world, [bot.row, bot.col], targetPos, true);

      if (path.length > 0) return targetPos;
    }
    return null;
  }

  return null;
};

// POWERUP POLICIES

export const getPowerupGoal = (
  policy: BotConfig["powerupPolicy"],
  world: World,
  bot: Player
): GridCoords | null => {
  // Convert to Array for sorting/indexing
  const powerups = Array.from(getAllType(world, Powerup));
  if (powerups.length === 0) return null;

  const start: GridCoords = [bot.row, bot.col];

  if (policy._tag === "Powerup Policy 1") {
    powerups.sort(
      (a, b) =>
        getManhattan(start, [a.row, a.col]) -
        getManhattan(start, [b.row, b.col])
    );
    const target = powerups[0];
    return [target.row, target.col];
  }

  if (policy._tag === "Powerup Policy 2") {
    const searchRadius = 4;
    const candidates: GridCoords[] = [];

    for (const p of powerups) {
      const pPos: GridCoords = [p.row, p.col];

      if (getManhattan(start, pPos) > searchRadius) continue;

      const path = getShortestPath(world, start, pPos, false);
      if (path.length > 0) candidates.push(pPos);
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  return null;
};
