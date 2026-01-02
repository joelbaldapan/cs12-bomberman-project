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
import { isCellBlocking } from "../helpers/world";

const TILE_SIZE = 16;
const HITBOX_WIDTH = 16;
const HITBOX_HEIGHT = 16;
const HITBOX_OFFSET_Y = 8;
const SNAP_TOLERANCE = 6;


const canMoveTo = (world: World, id: number, x: number, y: number): boolean => {
  const hbX1 = x;
  const hbY1 = y + HITBOX_OFFSET_Y;
  const hbX2 = hbX1 + HITBOX_WIDTH - 1;
  const hbY2 = hbY1 + HITBOX_HEIGHT - 1;

  const corners: [number, number][] = [
    [hbX1, hbY1],
    [hbX2, hbY1],
    [hbX1, hbY2],
    [hbX2, hbY2],
  ];

  for (const [px, py] of corners) {
    const r = Math.floor(py / TILE_SIZE);
    const c = Math.floor(px / TILE_SIZE);
    if (isCellBlocking(world, r, c, id)) {
      return false;
    }
  }
  return true;
};


const snapAxis = (
  x: number,
  y: number,
  vx: number,
  vy: number,
  currentRow: number,
  currentCol: number
): [number, number] => {
  let newX = x;
  let newY = y;

  const cellX = currentCol * TILE_SIZE;
  const cellY = currentRow * TILE_SIZE;

  if (vy !== 0) {
    const targetCX = cellX + TILE_SIZE / 2;
    const currentCX = x + HITBOX_WIDTH / 2;
    
    if (Math.abs(currentCX - targetCX) <= SNAP_TOLERANCE) {
      newX = targetCX - HITBOX_WIDTH / 2;
    }
  }

  else if (vx !== 0) {
    const targetCY = cellY + TILE_SIZE / 2;
    const currentCY = (y + HITBOX_OFFSET_Y) + HITBOX_HEIGHT / 2;
    
    if (Math.abs(currentCY - targetCY) <= SNAP_TOLERANCE) {
       newY = targetCY - HITBOX_HEIGHT / 2 - HITBOX_OFFSET_Y;
    }
  }

  return [newX, newY];
};

const calculateMovement = (player: Player, world: World, dt: number): [number, number] => {
    if (player.vx === 0 && player.vy === 0) {
        return [player.x, player.y];
    }

    const curRow = getPlayerRow(player);
    const curCol = getPlayerCol(player);

    let targetX = player.x + player.vx * dt;
    let targetY = player.y + player.vy * dt;

    [targetX, targetY] = snapAxis(targetX, targetY, player.vx, player.vy, curRow, curCol);

    if (canMoveTo(world, player.player_id, targetX, targetY)) {
        return [targetX, targetY];
    }

    const cellX = curCol * TILE_SIZE;
    const cellY = curRow * TILE_SIZE;
    
    let clampedX = player.x;
    let clampedY = player.y;
    let attemptedClamp = false;

    // East
    if (player.vx > 0) {
        const limitX = (cellX + TILE_SIZE) - HITBOX_WIDTH;
        if (limitX > player.x) {
            clampedX = limitX;
            attemptedClamp = true;
        }
    }
    // West
    else if (player.vx < 0) {
        const limitX = cellX;
        if (limitX < player.x) {
            clampedX = limitX;
            attemptedClamp = true;
        }
    }
    // South
    else if (player.vy > 0) {
        const limitY = (cellY + TILE_SIZE) - HITBOX_HEIGHT - HITBOX_OFFSET_Y;
        if (limitY > player.y) {
            clampedY = limitY;
            attemptedClamp = true;
        }
    }
    // North
    else if (player.vy < 0) {
        const limitY = cellY - HITBOX_OFFSET_Y;
        if (limitY < player.y) {
            clampedY = limitY;
            attemptedClamp = true;
        }
    }

    if (attemptedClamp && canMoveTo(world, player.player_id, clampedX, clampedY)) {
        return [clampedX, clampedY];
    }

    return [player.x, player.y];
}


export const updatePlayer = (
  ent: Player,
  world: World,
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
      durationFrames: (1/dt)*2,
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

  // Handle Movement
  const [nextX, nextY] = calculateMovement(ent, world, 1);
  const centerX = nextX + HITBOX_WIDTH / 2;
  const centerY = nextY + HITBOX_OFFSET_Y + HITBOX_HEIGHT / 2;

  const newRow = Math.floor(centerY / TILE_SIZE);
  const newCol = Math.floor(centerX / TILE_SIZE);
  return [
      Player.make({ 
          ...ent, 
          x: nextX, 
          y: nextY, 
          row: newRow,
          col: newCol,
          effects: remainingEffects 
      }), 
      result
  ];
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

export const getPlayerById = (players: HashSet.HashSet<Player>, id: number): Player | null =>Option.getOrNull(Array.findFirst(players, p => p.player_id === id));
// need this for pathfinding
export const getOverlappingCells = (bot: Player): GridCoords[] => {
  const x1 = hitboxX(bot);
  const y1 = hitboxY(bot);
  
  const x2 = x1 + TILE_SIZE - 1;
  const y2 = y1 + TILE_SIZE - 1;

  const corners = [
    [x1, y1], 
    [x2, y1],
    [x1, y2], 
    [x2, y2], 
  ];

  let result: GridCoords[] = [];
  const seen = new Set<string>();

  for (const [px, py] of corners) {
    const cell = pixelToCell(px, py);

    if (cell) {

      const key = `${cell[0]},${cell[1]}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        result = Array.append(result,cell);
      }
    }
  }

  return result;
}

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
