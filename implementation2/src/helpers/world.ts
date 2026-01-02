import { Model, Entity, World } from "../model";
import { Schema as S, HashMap, Match, HashSet, Option } from "effect";

export const addEntity = (
  world: World,
  entity: Entity,
): World => {
  const { row, col, id } = entity

  if (!inBounds(world, row, col)) return world
  if (entity._tag === "Player") {
    return {
      ...world,
      entities: HashMap.set(world.entities, id, entity)
    }
  }

  const newBoard = world.board.map((r, i) =>
    i === row
      ? r.map((cell, j) => 
          j === col ? Option.some(entity) : cell
        )
      : r,
  )

  return {
    ...world,
    board: newBoard,
    entities: HashMap.set(world.entities, id, entity),
  }
}

export const removeEntity = (
  world: World,
  entity: Entity,
): World => {
  const { row, col, id } = entity
  return {
    ...world,
    entities: HashMap.remove(world.entities, id),
    board:
      inBounds(world, row, col)
        ? world.board.map((r, i) =>
            i === row
              ? r.map((cell, j) =>
                  j === col ? Option.none() : cell,
                )
              : r,
          )
        : world.board,
  }
}

export const getAllType = <A>(
  world: World, 
  schema: S.Schema<A, any>
): HashSet.HashSet<A> => {
  
  const isType = S.is(schema)

  return HashMap.reduce(world.entities, HashSet.empty<A>(), (acc, value) => {
    if (isType(value)) {
      return HashSet.add(acc, value)
    }
    return acc
  })
}

export const inBounds = (
  world: World,
  row: number,
  col: number,
): boolean =>
  row >= 0 &&
  row < world.rows &&
  col >= 0 &&
  col < world.cols

export const getEntityAt = (
  world: World,
  row: number,
  col: number,
): Entity | null => {
  if (!inBounds(world, row, col)) return null;
  return Option.getOrNull(world.board[row][col]);
}

export const isCellBlocking = (
  world: World,
  row: number,
  col: number,
  playerId: number,
): boolean => {
  if (!inBounds(world, row, col)) return true

  const entity = getEntityAt(world, row, col)
  if (entity === null) return false

  return Match.value(entity).pipe(
    Match.tag("Bomb", (bomb) =>
      !bomb.moveAwayIds.includes(playerId),
    ),
    Match.tag("Block", () => true),
    Match.orElse(() => false),
  )
}

export const getAllByTag = (world: World, tag: string): any[] => {
  const result: any[] = [];
  for (const [id, entity] of world.entities) {
    if (entity._tag === tag) {
      result.push(entity);
    }
  }
  return result;
}