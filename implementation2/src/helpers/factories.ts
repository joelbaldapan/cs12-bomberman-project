import { HashSet, Match, Option, Array } from "effect";
import {
  Block,
  Bomb,
  Explosion,
  Player,
  Powerup,
  PowerupEffect,
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
    speed: 20.0,

    vx: 0,
    vy: 0,
  });


// Helper


const _makePowerup = (
  row: number,
  col: number,
  type: PowerUpType,
  effect: PowerupEffect
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
const getPowerUpEffect = (powerup: PowerUpType): PowerupEffect =>
  Match.value(powerup).pipe(
    Match.tag("Fire Powerup",  () => PowerupEffect.make({
      timeRemaining: Option.none(),
      speedDelta: 0,
      bombsDelta: 0,
      rangeDelta: 1,
    })),
        Match.tag("Bomb Powerup",  () => PowerupEffect.make({
      timeRemaining: Option.none(),
      speedDelta: 0,
      bombsDelta: 1,
      rangeDelta: 0,
    })),
        Match.tag("Speed Powerup", () => PowerupEffect.make({
      timeRemaining: Option.none(),
      speedDelta: 2,
      bombsDelta: 0,
      rangeDelta: 0,
    })),
    Match.exhaustive
  );

/*
const _makePowerup: (row: number, col: number, type: PowerUpType, effect: PowerupEffect) => PowerUp
*/

export const makeFireUp = (row: number, col: number, fps: number) =>
  _makePowerup(row, col, FirePowerup.make({}), getPowerUpEffect(FirePowerup.make({})));

export const makeBombUp = (row: number, col: number, fps: number) =>
  _makePowerup(row, col, BombPowerup.make({}), getPowerUpEffect(BombPowerup.make({})));

export const makeSpeedUp = (row: number, col: number, fps: number) =>
  _makePowerup(row, col, SpeedPowerup.make({}), getPowerUpEffect(SpeedPowerup.make({})));


export const choicePowerups = [makeFireUp, makeBombUp, makeSpeedUp]
