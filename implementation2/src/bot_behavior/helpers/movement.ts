import { isOverlapping } from "../../entity/player";
import {
  World,
  Player,
  GridCoords,
  Direction,
  BotMemory,
  BotAction,
  IdleAction,
  PlaceBombAction,
  MoveAction,
  NorthDirection,
  SouthDirection,
  EastDirection,
  WestDirection,
} from "../../model";

const TILE_SIZE = 16;
const HALF_TILE = 8;
const STANDARD_TOL = 6.0;
const STRICT_TOL = 4.0;
const STEER_TOL = 2.0;

type MoveResult = {
  action: BotAction;
  memory: BotMemory;
};

// Helpers for Direction
const getDir = (from: GridCoords, to: GridCoords): Direction | null => {
  const dr = to[0] - from[0];
  const dc = to[1] - from[1];
  if (dr === -1 && dc === 0) return NorthDirection.make({ dr: -1, dc: 0 });
  if (dr === 1 && dc === 0) return SouthDirection.make({ dr: 1, dc: 0 });
  if (dc === -1 && dr === 0) return WestDirection.make({ dr: 0, dc: -1 });
  if (dc === 1 && dr === 0) return EastDirection.make({ dr: 0, dc: 1 });
  return null;
};


// main movement!
export const followPathAction = (
  memory: BotMemory,
  world: World,
  entity: Player,
  allowBombing: boolean
): MoveResult => {
  if (memory.path.length === 0) return { action: IdleAction.make({}), memory };

  // STRICT MODE DELEGATION
  if (memory.isStrictMovement) {
    return followActionStrict(memory, world, entity, allowBombing);
  }

  const currCell: GridCoords = [entity.row, entity.col];
  let nextCell = memory.path[0];
  let currentPath = [...memory.path];

  // 1 - PLANT BOMB CHECK
  if (currCell[0] === nextCell[0] && currCell[1] === nextCell[1]) {
    if (currentPath.length > 1) {
      const futureCell = currentPath[1];
      const blockAtFuture = world.board[futureCell[0]][futureCell[1]];

      if (blockAtFuture && blockAtFuture._tag === "Block") {
        if (allowBombing) {
          const cellAtFeet = world.board[currCell[0]][currCell[1]];
          if (!cellAtFeet || cellAtFeet._tag !== "Bomb") {
            return { action: PlaceBombAction.make({}), memory };
          }
        }
      }
    }
  }

  // 2 -  CENTERING LOGIC
  if (currCell[0] === nextCell[0] && currCell[1] === nextCell[1]) {
    const centerPxX = nextCell[1] * TILE_SIZE + HALF_TILE;
    const centerPxY = nextCell[0] * TILE_SIZE + HALF_TILE;

    const botPxX = entity.x + HALF_TILE;
    const botPxY = entity.y + HALF_TILE;

    const distX = Math.abs(centerPxX - botPxX);
    const distY = Math.abs(centerPxY - botPxY);

    // Check strict transition
    const willEnterStrict = currentPath.length === 2;
    const currentTol = willEnterStrict ? STRICT_TOL : STANDARD_TOL;

    if (distX <= currentTol && distY <= currentTol) {
      // Centered! Pop current node.
      const popped = currentPath.shift()!;

      // Detect Strict entry
      if (currentPath.length === 1) {
        const strictPath = [popped, ...currentPath];
        return followActionStrict(
          { ...memory, path: strictPath, isStrictMovement: true },
          world,
          entity,
          allowBombing
        );
      }

      if (currentPath.length === 0) {
        return { action: IdleAction.make({}), memory: { ...memory, path: [] } };
      }

      nextCell = currentPath[0];
      // Fall through to steering with new target
    } else {
      // Still centering
      const dx = centerPxX - botPxX;
      const dy = centerPxY - botPxY;

      if (Math.abs(dx) > Math.abs(dy)) {
        const dir: Direction =
          dx > 0
            ? EastDirection.make({ dr: 0, dc: 1 })
            : WestDirection.make({ dr: 0, dc: -1 });
        return { action: MoveAction.make({ direction: dir }), memory };
      } else {
        const dir: Direction =
          dy > 0
            ? SouthDirection.make({ dr: 1, dc: 0 })
            : NorthDirection.make({ dr: -1, dc: 0 });
        return { action: MoveAction.make({ direction: dir }), memory };
      }
    }
  }

  // 3 - BLOCKED CHECK
  const cellNext = world.board[nextCell[0]][nextCell[1]];
  if (cellNext && (cellNext._tag === "Block" || cellNext._tag === "Bomb")) {
    if (allowBombing && cellNext._tag === "Block") {
      const cellAtFeet = world.board[currCell[0]][currCell[1]];
      if (!cellAtFeet || cellAtFeet._tag !== "Bomb") {
        return { action: PlaceBombAction.make({}), memory };
      }
    }
    return { action: IdleAction.make({}), memory };
  }

  // 4 - STEERING / PATH FOLLOWING
  const targetPxX = nextCell[1] * TILE_SIZE + HALF_TILE;
  const targetPxY = nextCell[0] * TILE_SIZE + HALF_TILE;
  const botPxX = entity.x + HALF_TILE;
  const botPxY = entity.y + HALF_TILE;

  const dx = targetPxX - botPxX;
  const dy = targetPxY - botPxY;

  const gridDir = getDir(currCell, nextCell);

  if (!gridDir) {
    if (Math.abs(dx) > Math.abs(dy)) {
      const dir: Direction =
        dx > 0
          ? EastDirection.make({ dr: 0, dc: 1 })
          : WestDirection.make({ dr: 0, dc: -1 });
      return {
        action: MoveAction.make({ direction: dir }),
        memory: { ...memory, path: currentPath },
      };
    } else {
      const dir: Direction =
        dy > 0
          ? SouthDirection.make({ dr: 1, dc: 0 })
          : NorthDirection.make({ dr: -1, dc: 0 });
      return {
        action: MoveAction.make({ direction: dir }),
        memory: { ...memory, path: currentPath },
      };
    }
  }

  // Steering logic (Correcting alignment)
  if (gridDir._tag === "East Direction" || gridDir._tag === "West Direction") {
    if (Math.abs(dy) > STEER_TOL) {
      const dir: Direction =
        dy > 0
          ? SouthDirection.make({ dr: 1, dc: 0 })
          : NorthDirection.make({ dr: -1, dc: 0 });
      return {
        action: MoveAction.make({ direction: dir }),
        memory: { ...memory, path: currentPath },
      };
    }
    return {
      action: MoveAction.make({ direction: gridDir }),
      memory: { ...memory, path: currentPath },
    };
  } else {
    // Vertical
    if (Math.abs(dx) > STEER_TOL) {
      const dir: Direction =
        dx > 0
          ? EastDirection.make({ dr: 0, dc: 1 })
          : WestDirection.make({ dr: 0, dc: -1 });
      return {
        action: MoveAction.make({ direction: dir }),
        memory: { ...memory, path: currentPath },
      };
    }
    return {
      action: MoveAction.make({ direction: gridDir }),
      memory: { ...memory, path: currentPath },
    };
  }
};


// strict movement (if nasa last cell na)
const followActionStrict = (
  memory: BotMemory,
  world: World,
  entity: Player,
  allowBombing: boolean
): MoveResult => {
  // Need at least From -> To
  if (memory.path.length < 2) {
    return { action: IdleAction.make({}), memory };
  }

  const prevCell = memory.path[0];
  const goalCell = memory.path[1];

  // 1 - Check for Block at Goal (Bomb logic)
  const cellAtGoal = world.board[goalCell[0]][goalCell[1]];
  if (cellAtGoal && cellAtGoal._tag === "Block") {
    if (allowBombing) {
      const cellAtFeet = world.board[entity.row][entity.col];
      const standingOnBomb = cellAtFeet && cellAtFeet._tag === "Bomb";
      if (!standingOnBomb) {
        return { action: PlaceBombAction.make({}), memory };
      }
    }
    return { action: IdleAction.make({}), memory };
  }

  // 2 - Move
  const moveDir = getDir(prevCell, goalCell);
  const isTouchingPrev = isOverlapping(entity, prevCell);

  if (!isTouchingPrev) {
    // We've successfully left the previous cell
    const newPath = memory.path.slice(2);

    return {
      action: IdleAction.make({}),
      memory: { ...memory, path: newPath, isStrictMovement: false },
    };
  }

  if (moveDir) {
    return { action: MoveAction.make({ direction: moveDir }), memory };
  }
  return { action: IdleAction.make({}), memory };
};