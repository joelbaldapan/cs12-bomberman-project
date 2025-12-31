import { boolean } from "effect/FastCheck";
import { generateId } from "../helpers/id_gen";
import { addEntity, getEntityAt, inBounds, removeEntity } from "../helpers/world";
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
  GridCoords,
  ExplosionOrientation,
  Direction,
  CenterExplosion,
  RemoveEvent,
  ExplosionSound,
  SpawnEvent,
  VerticalExplosion,
  HorizontalExplosion,
  BombMember,
} from "../model";
import { Array, Match } from "effect";
import { onExplosionHitBlock } from "./block";
import { onExplosionHitPowerup } from "./powerup";
import { onExplosionHitExplosion } from "./explosion";
import { onExplosionHitPlayer } from "./player";

export const updateBomb = (ent: Bomb, dt: number): [Bomb, UpdateResult] => {
  let result = UpdateResult.make({ events: [], sounds: [], animations: [] });
  if (ent.isExpired) {
    return [Bomb.make({ ...ent }), result];
  }
  if (ent.currentTimer >= ent.fuse) {
    result = {
      ...result,
      events: Array.append(result.events, RemoveEvent.make({ entity: ent })),
      sounds: Array.append(result.sounds, ExplosionSound.make()),
      animations: [],
    };
  }
  return [
    Bomb.make({ ...ent, isExpired: ent.currentTimer >= ent.fuse, currentTimer: ent.currentTimer + dt }),
    result,
  ];
};

export const getAffectedCells = (bomb: Bomb, world: World): GridCoords[] => {
  const { row, col } = bomb;
  const rng = bomb.explosionRange;

  const cells: GridCoords[] = [];
  cells.push([row, col]);

  const project = (dr: number, dc: number) => {
    let r = row;
    let c = col;

    for (let i = 0; i < rng; i++) {
      r += dr;
      c += dc;

      if (!inBounds(world, r, c)) break;

      const entity = getEntityAt(world, r, c);

      if (!entity) {
        cells.push([r, c]);
        continue;
      } else {
        if (entity._tag === "Powerup") {
          cells.push([r, c]);
        }
        return;
      }
    }
  };

  project(-1, 0);
  project(1, 0);
  project(0, -1);
  project(0, 1);

  return cells;
};

export const createExplosions = (bomb: Bomb, world: World): [World, UpdateResult] => {
  const { row, col } = bomb;
  const rng = bomb.explosionRange;
  const duration = explosionDuration(bomb);
  let newWorld = World.make({...world})

  const centerExplosion = Explosion.make({
    id: generateId(row, col),
    row: row,
    col: col,
    isExpired: false,
    currentTimer: 0,
    fullTimer: duration,
    orientation: CenterExplosion.make({}),
  });

  let result = UpdateResult.make({
    events: Array.empty(),
    sounds: Array.empty(),
    animations: Array.empty(),
  });

  result = UpdateResult.make({
    ...result,
    events: Array.append(
      result.events,
      SpawnEvent.make({ entity: centerExplosion })
    ),
  });

  const propagate = (dr: number, dc: number) => {
    const hitCells: GridCoords[] = [];
    let r = row;
    let c = col;

    for (let i = 0; i < rng; i++) {
      r += dr;
      c += dc;
      if (!inBounds(world, r, c)) break;

      const entity = getEntityAt(world, r, c);
      if (!entity) {
        hitCells.push([r, c]);
        continue;
      } else {
        Match.value(entity).pipe(
          Match.tag("Powerup", (e) => {
            hitCells.push([r, c]);
            newWorld = removeEntity(newWorld, entity)
          }),
          Match.tag("Block", (e) => {
            newWorld = addEntity(newWorld,onExplosionHitBlock(e))
          }),
          Match.tag("Bomb", (e) => {
            newWorld = addEntity(newWorld,onExplosionHitBomb(e))
          }),
          Match.tag("Explosion", (e) => {
            newWorld = addEntity(newWorld,onExplosionHitExplosion(e))
          }),
          Match.tag("Player", (e) => {
            newWorld = addEntity(newWorld,onExplosionHitPlayer(e))
          }),
          Match.exhaustive
        )
        break;
      }
    }

    hitCells.forEach((cell, index) => {
      const [er, ec] = cell;
      const isLast = index === hitCells.length - 1;

      const isVertical = dr !== 0; // dr != 0 means vertical
      const orient: ExplosionOrientation = isVertical
        ? VerticalExplosion.make({})
        : HorizontalExplosion.make({});

      const explosionPart = Explosion.make({
        id: generateId(er, ec),
        row: er,
        col: ec,
        isExpired: false,
        currentTimer: 0,
        fullTimer: duration,
        orientation: orient,
      });

      result = UpdateResult.make({
        ...result,
        events: Array.append(
          result.events,
          SpawnEvent.make({ entity: explosionPart })
        ),
      });
    });
  };

  // propagate in all four directions
  propagate(-1, 0);
  propagate(1, 0);
  propagate(0, -1);
  propagate(0, 1);

  return [newWorld, result];
};

export const shouldDetonate = (ent: Bomb) => ent.currentTimer >= ent.fuse

export const explosionDuration = (ent: Bomb) => ent.fuse/3

export const onExplosionHitBomb = (ent: Bomb): Bomb => {
  if (ent.isExpired) {
    return Bomb.make({...ent})
  }
  return Bomb.make({...ent, currentTimer: ent.fuse})
}
