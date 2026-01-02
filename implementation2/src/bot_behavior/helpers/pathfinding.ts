import { isCellBlocking } from "../../helpers/world";
import { World, GridCoords, Entity, Block, Bomb, Player } from "../../model";
import { HashSet, Option } from "effect";

export const getManhattan = (a: GridCoords, b: GridCoords): number => {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
};

export const isWalkable = (
  world: World,
  r: number,
  c: number,
  ignoreSoftBlocks: boolean
): boolean => {
  if (r < 0 || c < 0 || r >= world.rows || c >= world.cols) return false;

  const cellOpt = world.board[r][c];
  const cell = Option.getOrNull(cellOpt);

  // 3. Collision Logic
  if (cell) {
    if (cell._tag === "Block") {
      if (cell.isHard) return false;
      if (!ignoreSoftBlocks) return false;
    }
    if (cell._tag === "Bomb") return false;
  }

  return true;
};

export const getShortestPath = (
  world: World,
  start: GridCoords,
  target: GridCoords,
  ignoreSoftBlocks: boolean
): GridCoords[] => {
  const rows = world.rows;
  const cols = world.cols;

  const inBounds = (r: number, c: number): boolean => {
    return 0 <= r && r < rows && 0 <= c && c < cols;
  };

  // Create an empty set of unvisited cells
  const unvisited = new Set<string>();

  // Assign the distance +∞+∞ for all cells; assign 00 for the starting cell
  const dist = new Map<string, number>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      dist.set(toKey(r, c), Infinity);
    }
  }
  dist.set(toKey(start[0], start[1]), 0.0);

  // Assign the "source cell" of each cell to be nothing
  const source = new Map<string, string | null>();
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      source.set(toKey(r, c), null);
    }
  }

  // Add the starting cell to the set of unvisited cells
  unvisited.add(toKey(start[0], start[1]));

  // While the set of unvisited cells is nonempty:
  while (unvisited.size > 0) {
    // Remove the cell in the set with the smallest assigned distance (the current cell)
    let currentKey: string | null = null;
    let minVal = Infinity;
    for (const key of unvisited) {
      const d = dist.get(key)!;
      if (d < minVal) {
        minVal = d;
        currentKey = key;
      }
    }

    // Fallback if unvisited has items but logic fails to pick one
    if (!currentKey) {
      currentKey = unvisited.values().next().value;
    }

    unvisited.delete(currentKey!);
    const current = fromKey(currentKey!);

    // Mark the current cell as visited
    // (implicitly done by not re-adding it to unvisited)

    // If the current cell is the target cell, terminate the algorithm
    if (current[0] === target[0] && current[1] === target[1]) {
      break;
    }

    const [r, c] = current;

    // For each unvisited, walkable neighboring cell of the current cell:
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;

      if (!inBounds(nr, nc)) {
        continue;
      }
      if (!isWalkable(world, nr, nc, ignoreSoftBlocks)) {
        continue;
      }
      if (!dist.has(toKey(nr, nc))) {
        continue;
      }

      const neighborKey = toKey(nr, nc);

      // Let CC be the assigned distance of the current cell
      const CC = dist.get(currentKey!)!;

      // Let SS be the assigned distance of the neighboring cell
      const SS = dist.get(neighborKey)!;

      // If C+1C+1 is less than SS, then:
      if (CC + 1 < SS) {
        // Update the assigned distance of the neighboring cell to C+1C+1
        dist.set(neighborKey, CC + 1);

        // Set the "source cell" of the neighboring cell to the current cell
        source.set(neighborKey, currentKey!);

        // Add the selected cell to the set of unvisited cells
        unvisited.add(neighborKey);
      }
    }
  }

  const path: GridCoords[] = [];
  let curKey: string | null = toKey(target[0], target[1]);
  while (curKey !== null) {
    path.push(fromKey(curKey));
    curKey = source.get(curKey) ?? null;
  }
  path.reverse();

  if (dist.get(toKey(target[0], target[1])) === Infinity) {
    return []; // unreachable
  }

  return path;
};

// Constants
const MAX_SAFE_STEPS = 200;

export const getRandomFloorCell = (world: World): GridCoords => {
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(Math.random() * world.rows);
    const c = Math.floor(Math.random() * world.cols);

    // "Choose a random goal cell (must not contain a hard block)"
    if (!isCellBlocking(world, r, c, -1)) {
      return [r, c];
    }
  }
  return [1, 1];
};

export const getReachableSafeCell = (
  world: World,
  bot: Player,
  dangerZones: HashSet.HashSet<string>
): GridCoords | null => {
  const queue: GridCoords[] = [[bot.row, bot.col]];
  const visited = new Set<string>();
  visited.add(`${bot.row},${bot.col}`);

  const candidates: GridCoords[] = [];
  let steps = 0;

  while (queue.length > 0 && steps < MAX_SAFE_STEPS) {
    const curr = queue.shift()!;
    steps++;

    const key = `${curr[0]},${curr[1]}`;
    if (!HashSet.has(dangerZones, key)) {
      candidates.push(curr);
    }

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of dirs) {
      const nr = curr[0] + dr;
      const nc = curr[1] + dc;
      const nKey = `${nr},${nc}`;

      if (nr < 0 || nr >= world.rows || nc < 0 || nc >= world.cols) continue;
      if (visited.has(nKey)) continue;

      if (isCellBlocking(world, nr, nc, bot.player_id)) {
        continue;
      }

      // Check if entity is technically a danger zone itself
      // if (HashSet.has(dangerZones, nKey)) {
      //   continue;
      // }

      visited.add(nKey);
      queue.push([nr, nc]);
    }
  }

  if (candidates.length > 0) {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  return null;
};

// helpers
const toKey = (r: number, c: number) => `${r},${c}`;
const fromKey = (key: string): GridCoords => {
  const [r, c] = key.split(",").map(Number);
  return [r, c];
};
