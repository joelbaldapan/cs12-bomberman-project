import {
  BotBehavior,
  BotConfig,
  BotMemory,
  World,
  Player,
  GridCoords,
  Direction,
  BotAction,
  PlaceBombAction,
  WanderState,
} from "../../model";
import {
  getRandomFloorCell,
  getReachableSafeCell,
  getShortestPath,
} from "./pathfinding";
import { followPathAction } from "./movement";
import { getManhattan, getAllDangerZones } from "./policies";
import { HashSet, Match } from "effect";
import { isCellBlocking } from "../../helpers/world";

// ON ENTER

export const runOnEnter = (
  state: BotBehavior,
  config: BotConfig,
  memory: BotMemory,
  world: World,
  bot: Player
): { state: BotBehavior; memory: BotMemory } => {
  
  const resetMem = (m: BotMemory) => ({ ...m, path: [], goal: null });

  return Match.value(state).pipe(

    Match.tag("Wander State", (currentState) => {
      const goal = getRandomFloorCell(world);
      const path = getShortestPath(world, [bot.row, bot.col], goal, true); // ignoreSoft=True
      
      return { 
        state: currentState, 
        memory: { ...memory, goal, path } 
      };
    }),

    Match.tag("Escape State", (currentState) => {
      const newState = { ...currentState, leftDanger: false };
      const dangerousCells = getAllDangerZones(config.dangerPolicy, world);
      const goal = getReachableSafeCell(world, bot, dangerousCells);

      if (goal) {
        const path = getShortestPath(world, [bot.row, bot.col], goal, false); // ignoreSoft=False
        return { 
          state: newState, 
          memory: { ...memory, goal, path } 
        };
      }
      
      return { 
        state: newState, 
        memory: resetMem(memory) 
      };
    }),

    Match.tag("Get Powerup State", (currentState) => {
      // ignoreSoft depends on policy type
      const ignoreSoft = config.powerupPolicy._tag === "Powerup Policy 1";
      const path = getShortestPath(
        world,
        [bot.row, bot.col],
        currentState.target,
        ignoreSoft
      );
      
      return { 
        state: currentState, 
        memory: { ...memory, goal: currentState.target, path } 
      };
    }),

    Match.tag("Attack State", (currentState) => {
      // ignoreSoft depends on policy type
      const ignoreSoft = config.attackPolicy._tag === "Attack Policy 2";
      const path = getShortestPath(
        world,
        [bot.row, bot.col],
        currentState.target,
        ignoreSoft
      );
      
      return { 
        state: currentState, 
        memory: { ...memory, goal: currentState.target, path } 
      };
    }),

    Match.exhaustive
  );
};

// ON TICK

export const runOnTick = (
  state: BotBehavior,
  config: BotConfig,
  memory: BotMemory,
  world: World,
  bot: Player
): { nextState: BotBehavior | null; memory: BotMemory } => {
  
  const atGoal = (goal: GridCoords | null) =>
    !!(goal && bot.row === goal[0] && bot.col === goal[1]);

  return Match.value(state).pipe(

    Match.tag("Wander State", () => {
      if (atGoal(memory.goal)) {
        return { nextState: WanderState.make({}), memory };
      }
      if (memory.path.length === 0 && !atGoal(memory.goal)) {
        return { nextState: WanderState.make({}), memory };
      }
      return { nextState: null, memory };
    }),

    Match.tag("Escape State", (currentState) => {
      if (memory.path.length === 0) {
        const reset = runOnEnter(currentState, config, memory, world, bot);
        return { nextState: null, memory: reset.memory };
      }

      const dangerZones = getAllDangerZones(config.dangerPolicy, world);
      const inDanger = HashSet.has(dangerZones, `${bot.row},${bot.col}`);
      
      const newState = {
        ...currentState,
        leftDanger: !inDanger ? true : currentState.leftDanger,
      };

      if (inDanger) {
        return { nextState: null, memory }; // Still in danger, keep running
      }

      if (newState.leftDanger) {
        // If we left danger, ensure path doesn't lead back into it
        const pathDanger = memory.path.some((p) =>
          HashSet.has(dangerZones, `${p[0]},${p[1]}`)
        );
        if (pathDanger) {
          const reset = runOnEnter(newState, config, memory, world, bot);
          return { nextState: null, memory: reset.memory };
        }
      }

      if (atGoal(memory.goal)) {
        if (!memory.isStrictMovement) {
          return { nextState: WanderState.make({}), memory };
        }
      }

      if (!memory.goal) {
        return { nextState: WanderState.make({}), memory };
      }

      // Update state if flag changed
      if (newState.leftDanger !== currentState.leftDanger) {
        return { nextState: newState, memory };
      }

      return { nextState: null, memory };
    }),

    Match.tag("Get Powerup State", () => {
      if (atGoal(memory.goal)) {
        return { nextState: WanderState.make({}), memory };
      }
      return { nextState: null, memory };
    }),

    Match.tag("Attack State", () => {
      if (atGoal(memory.goal)) {
        return { nextState: WanderState.make({}), memory };
      }
      return { nextState: null, memory };
    }),

    Match.exhaustive
  );
};

// DECIDE ACTION

export const decideAction = (
  state: BotBehavior,
  config: BotConfig,
  memory: BotMemory,
  world: World,
  bot: Player
): { action: BotAction, memory: BotMemory } => {

  return Match.value(state).pipe(
    
    Match.tag("Wander State", () => 
      followPathAction(memory, world, bot, true)
    ),

    Match.tag("Escape State", () => 
      followPathAction(memory, world, bot, false)
    ),

    Match.tag("Get Powerup State", () => {
      const allowBomb = config.powerupPolicy._tag !== "Powerup Policy 2";
      return followPathAction(memory, world, bot, allowBomb);
    }),

    Match.tag("Attack State", () => {
      if (memory.goal) {
        const dist = getManhattan([bot.row, bot.col], memory.goal);
        
        if (dist <= config.attackRangeTrigger) {
          const cellAtFeet = world.board[bot.row][bot.col];
          const hasBomb = isCellBlocking(world, bot.row, bot.col, -1) && 
                          cellAtFeet?._tag === "Bomb";

          if (!hasBomb) {
            return { 
              action: PlaceBombAction.make({}), 
              memory 
            };
          }
        }
      }
      return followPathAction(memory, world, bot, true);
    }),

    Match.exhaustive
  );
};