import { HashSet, Option } from "effect";
import {
  Block,
  Bomb,
  Explosion,
  Player,
  Powerup,
  Effect,
  ExplosionOrientation,
  SouthDirection,
  BombPowerup,
  FirePowerup,
  SpeedPowerup,
  PowerUpType,
  BotType,
  BotInternalState,
  WanderState,
} from "../model";
import { generateId } from "./id_gen";

/* 
Convention:
  export const `make{Entity}`
*/

// BLOCK FACTORY

export const makeHardBlock = (row: number, col: number) =>
  Block.make({
    id: generateId(row, col),
    row,
    col,
    isExpired: false,
    isHard: true,
  });

export const makeSoftBlock = (row: number, col: number) =>
  Block.make({
    id: generateId(row, col),
    row,
    col,
    isExpired: false,
    isHard: false,
  });


// BOMB FACTORY

export const makeBomb = (
  row: number,
  col: number,
  fuse: number,
  range: number,
  ownerId: number
) =>
  Bomb.make({
    id: generateId(row, col),
    row,
    col,
    isExpired: false,
    fuse,
    currentTimer: 0,
    explosionRange: range,
    owner: ownerId,
    moveAwayIds: [ownerId],
  });


// EXPLOSION FACTORY

export const makeExplosion = (
  row: number,
  col: number,
  orientation: ExplosionOrientation,
  fullTimer: number
) =>
  Explosion.make({
    id: generateId(row, col),
    row,
    col,
    isExpired: false,
    orientation,
    fullTimer,
    currentTimer: 0,
    terminalDirection: Option.none(),
  });


// PLAYER FACTORY

export const makePlayer = (
  playerId: number,
  row: number,
  col: number,
  tileSize: number,
  fps: number
) =>
  Player.make({
    id: playerId,
    player_id: playerId,
    row,
    col,
    x: col * tileSize,
    y: row * tileSize - tileSize/2,
    width: tileSize,
    height: tileSize,
    directionFacing: SouthDirection.make({ dr: 1, dc: 0 }),
    isAlive: true,
    isExpired: false,
    activeBombs: [],
    effects: [],
    speed: 10.0,

    vx: 0,
    vy: 0,
  });

// POWERUP FACTORY

// Helper to avoid repetition
const _makePowerup = (
  row: number,
  col: number,
  type: PowerUpType,
  effect: Effect
) =>
  Powerup.make({
    id: generateId(row, col),
    row,
    col,
    isExpired: false,
    powerupType: type,
    effect,
  });


// EFFECT FACTORY

export const makeEffect = (
  duration: Option.Option<number>,
  speedDelta: number,
  bombsDelta: number,
  rangeDelta: number
) =>
  Effect.make({
    timeRemaining: duration,
    speedDelta,
    bombsDelta,
    rangeDelta,
  });


export const makeFireUp = (row: number, col: number, fps: number) =>
  _makePowerup(row, col, FirePowerup.make({}), makeEffect(Option.none(), 0, 0, 1));

export const makeBombUp = (row: number, col: number, fps: number) =>
  _makePowerup(row, col, BombPowerup.make({}), makeEffect(Option.none(), 0, 1, 0));

export const makeSpeedUp = (row: number, col: number, fps: number) =>
  _makePowerup(row, col, SpeedPowerup.make({}), makeEffect(Option.none(), 2, 0, 0));

export const choicePowerups = [makeFireUp, makeBombUp, makeSpeedUp]
