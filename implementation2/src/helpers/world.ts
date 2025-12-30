import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult
} from "../model";
import { Schema as S, Array, HashMap, pipe, Match, HashSet } from "effect";


export const addEntity = (
  world: World,
  entity: Entity,
): World => {
  const { row, col, id } = entity

  if (!inBounds(world, row, col)) return world
  if (world.board[row][col] !== null) return world

  const newBoard = world.board.map((r, i) =>
    i === row
      ? r.map((cell, j) => (j === col ? entity : cell))
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
                  j === col ? null : cell,
                )
              : r,
          )
        : world.board,
  }
}


export const getAllType = <A extends Entity>(
  world: World, 
  schema: S.Schema<A>
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
): Entity | null =>
  inBounds(world, row, col)
    ? world.board[row][col]
    : null


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

