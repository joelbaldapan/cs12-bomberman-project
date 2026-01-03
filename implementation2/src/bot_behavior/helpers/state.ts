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
  EscapeState,
} from "../../model";
import {
  getRandomFloorCell,
  getReachableSafeCell,
  getShortestPath,
} from "./pathfinding";
import { followPathAction } from "./movement";
import { getManhattan, getAllDangerZones } from "./policies";
import { HashSet, Match, Option } from "effect";
import { isCellBlocking } from "../../helpers/world";
import { getOverlappingCells } from "../../entity/player";

// ON ENTER

export const runOnEnter = (
  state: BotBehavior,
  config: BotConfig,
  memory: BotMemory,
  world: World,
  bot: Player
): { state: BotBehavior; memory: BotMemory } => {
  
  const resetMem = (m: BotMemory) => BotMemory.make({ ...m, path: [], goal: Option.none() });

  return Match.value(state).pipe(
    Match.tag("Wander State", (currentState) => {
      const goal = getRandomFloorCell(world);
      const path = getShortestPath(world, [bot.row, bot.col], goal, true); // ignoreSoft=True
      
      return { 
        state: currentState, 
        memory: BotMemory.make({
          ...memory,
          goal: Option.some(goal),
          path: path
        }) 
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
          memory: BotMemory.make({
            ...memory,
            goal: Option.some(goal),
            path: path
          }) 
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
        memory: BotMemory.make({
          ...memory, goal: Option.some(currentState.target), path 
        }) 
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
        memory: BotMemory.make({
          ...memory, goal: Option.some(currentState.target), path 
        })  
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
  
  const atGoal = (goalOpt: Option.Option<GridCoords>) => {
    if (Option.isNone(goalOpt)) return false;
    const [gr, gc] = goalOpt.value;
    const overlapping = getOverlappingCells(bot)
    return overlapping.some(([r, c]) => r === gr && c === gc);
  };
  console.log(`Goal? ${atGoal(memory.goal)}`)
  console.log(`Goal? ${memory.goal}`)

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
        console.log("LENGTH 0")
        console.log("LENGTH 0")
        console.log("LENGTH 0")
        console.log("LENGTH 0")
        console.log("LENGTH 0")
        console.log("LENGTH 0")
        console.log("LENGTH 0")
        const reset = runOnEnter(currentState, config, memory, world, bot);
        return { nextState: null, memory: reset.memory };
      }

      const dangerZones = getAllDangerZones(config.dangerPolicy, world);
      const overlapping = getOverlappingCells(bot); 

      const inDanger = overlapping.some(([r, c]) => 
        HashSet.has(dangerZones, `${r},${c}`)
    );
      console.log(inDanger)
      
      const newState = EscapeState.make({
        ...currentState,
        leftDanger: !inDanger ? true : currentState.leftDanger,
      });
      
      if (newState.leftDanger) {
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

      // reached goal
      if (Option.isNone(memory.goal)) {
        return { nextState: WanderState.make({}), memory };
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
): { action: BotAction; memory: BotMemory } => {
  console.log(`State: ${state._tag}`)
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
      if (Option.isSome(memory.goal)) {
        const target = memory.goal.value;
        const dist = getManhattan([bot.row, bot.col], target);

        if (dist <= config.attackRangeTrigger) {
          const cellAtFeetOpt = world.board[bot.row][bot.col];
          
          let standingOnBomb = false;
          
          if (Option.isSome(cellAtFeetOpt)) {
             const entity = cellAtFeetOpt.value;
             if (entity._tag === "Bomb") {
                 standingOnBomb = true;
             }
          }

          if (!standingOnBomb) {
            return {
              action: PlaceBombAction.make({}),
              memory,
            };
          }
        }
      }
      return followPathAction(memory, world, bot, true);
    }),

    Match.exhaustive
  );
};