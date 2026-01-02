import { Array, HashMap, HashSet, pipe, Option } from "effect";
import { BotInternalState, BotType, Entity, GameConfig, GridCoords, WanderState } from "../model"; 
import { makeSoftBlock } from "./factories";
import { createBotConfig } from "../bot_behavior/bot";

export const getSpacedBlockCoords = (): GridCoords[] => {
  const rows = [2, 4, 6, 8, 10];
  const cols = [2, 4, 6, 8, 10, 12];
  
  return pipe(
    rows,
    Array.flatMap((r) => 
      Array.map(cols, (c): GridCoords => [r, c])
    )
  );
};

export const getBorderBlockCoords = (rows: number, cols: number): GridCoords[] => {
  const topBottom = pipe(
    Array.range(0, cols - 1),
    Array.flatMap((c): GridCoords[] => [
      [0, c],
      [rows - 1, c],
    ])
  );

  const leftRight = pipe(
    Array.range(1, rows - 2),
    Array.flatMap((r): GridCoords[] => [
      [r, 0],
      [r, cols - 1],
    ])
  );

  return [...topBottom, ...leftRight];
};

export const getProtectedCoords = (rows: number, cols: number): GridCoords[] => {
  const coords: GridCoords[] = [
    // Top-Left (P1)
    [1, 1], [2, 1], [1, 2],

    // Top-Right (P2)
    [1, cols - 2], [2, cols - 2], [1, cols - 3],

    // Bottom-Left (P3)
    [rows - 2, 1], [rows - 3, 1], [rows - 2, 2],

    // Bottom-Right (P4)
    [rows - 2, cols - 2], [rows - 3, cols - 2], [rows - 2, cols - 3],

  ];
  return coords;
};

export const getPlayerStartCoords = (rows: number, cols: number): GridCoords[] => {
  return [
    [1, 1],                 // P1: Top-Left
    [1, cols - 2],          // P2: Top-Right
    [rows - 2, 1],          // P3: Bottom-Left
    [rows - 2, cols - 2],   // P4: Bottom-Right
  ];
};
export const generateSoftBlockCoords = (
  rows: number,
  cols: number,
  hardBlocks: GridCoords[],
  protectedCoords: GridCoords[],
  config: GameConfig
): GridCoords[] => {

  const hardSet = HashSet.fromIterable(
    hardBlocks.map(([r, c]) => `${r},${c}`)
  );
  const protectedSet = HashSet.fromIterable(
    protectedCoords.map(([r, c]) => `${r},${c}`)
  );

  const softSpawnable = Array.flatMap(Array.range(1, rows - 2), (r) =>
    Array.filterMap(Array.range(1, cols - 2), (c) => {
      const key = `${r},${c}`;
      
      if (HashSet.has(protectedSet, key) || HashSet.has(hardSet, key)) {
        return Option.none();
      }
      return Option.some([r, c] as GridCoords);
    })
  );

  const shuffled = [...softSpawnable];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const finalSelection: GridCoords[] = [];
  let selectedSet = HashSet.empty<string>();
  let placedCount = 0;

  for (const [r, c] of shuffled) {
    if (Math.random() * 100 <= config.softBlockSpawnChance) {
      finalSelection.push([r, c]);
      selectedSet = HashSet.add(selectedSet, `${r},${c}`);
      placedCount++;
    }
  }

  if (placedCount < 10) {
    for (const [r, c] of shuffled) {
      if (placedCount >= 10) break;

      const key = `${r},${c}`;
      if (!HashSet.has(selectedSet, key)) {
        finalSelection.push([r, c]);
        placedCount++;
      }
    }
  }

  return finalSelection;
};




// BOTS

export const initBotState = (botType: BotType): BotInternalState => ({
  initialized: false,
  config: createBotConfig(botType),
  currentState: WanderState.make({}),
  memory: {
    reevalTimer: 0,
    path: [],
    goal: Option.none(),
    isStrictMovement: false,
    lastBombCoords: HashSet.empty(),
    lastExplosionCoords: HashSet.empty(),
  },
});