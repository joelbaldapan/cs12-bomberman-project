import {
  BotInternalState,
  BotMemory,
  BotBehavior,
  WanderState,
  EscapeState,
  GetPowerupState,
  AttackState,
  HostileBot,
  CarefulBot,
  GreedyBot,
  Model,
  World,
  Player,
  GridCoords,
  Direction,
  Bomb,
  Explosion,
  BotType,
  BombOnlyDangerPolicy,
  AttackPolicy2,
  PowerupPolicy2,
  ExplosionPredictionDangerPolicy,
  AttackPolicy1,
  PowerupPolicy1,
  BotUpdateResult,
  BotConfig,
  IdleAction,
} from "../model";
import { HashSet, Match, Option } from "effect";

import * as Policies from "./helpers/policies";
import * as StateLogic from "./helpers/state";
import { getAllType } from "../helpers/world";

// FACTORY AND INIT
export const createBotConfig = (botType: BotType): BotConfig => {
  return Match.value(botType).pipe(
    Match.tag("Hostile Bot", (bot) => ({
      botType: bot,
      reevalInterval: 0.5,
      reevalChance: 0.25,
      dangerRadius: 0,
      dangerPolicy: BombOnlyDangerPolicy.make({}),
      attackPolicy: AttackPolicy2.make({}),
      attackRangeTrigger: 2,
      attackSearchRadius: 0,
      powerupPolicy: PowerupPolicy2.make({}),
      powerupChance: 0.2,
    })),

    Match.tag("Careful Bot", (bot) => ({
      botType: bot,
      reevalInterval: 0.25,
      reevalChance: 1.0,
      dangerRadius: 4,
      dangerPolicy: ExplosionPredictionDangerPolicy.make({}),
      attackPolicy: AttackPolicy1.make({ maxDistance: 3 }),
      attackRangeTrigger: 4,
      attackSearchRadius: 3,
      powerupPolicy: PowerupPolicy2.make({}),
      powerupChance: 1.0,
    })),

    Match.tag("Greedy Bot", (bot) => ({
      botType: bot,
      reevalInterval: 1.0,
      reevalChance: 1.0,
      dangerRadius: 2,
      dangerPolicy: ExplosionPredictionDangerPolicy.make({}),
      attackPolicy: AttackPolicy1.make({ maxDistance: 6 }),
      attackRangeTrigger: 3,
      attackSearchRadius: 6,
      powerupPolicy: PowerupPolicy1.make({}),
      powerupChance: 1.0,
    })),

    Match.exhaustive
  );
};

export const updateBot = (
  botState: BotInternalState,
  world: World,
  botEntity: Player,
  dt: number
): BotUpdateResult => {
  //  1 - INITIALIZATION
  let state = botState;
  let memory = state.memory;
  let currentBehavior = state.currentState;

  if (!state.initialized) {
    // Fill initial memory perception
    const bombs = getAllCoords(world, Bomb);
    const explosions = getAllCoords(world, Explosion);

    memory = {
      ...memory,
      lastBombCoords: bombs,
      lastExplosionCoords: explosions,
    };

    // Enter initial state
    const initRes = StateLogic.runOnEnter(
      currentBehavior,
      state.config,
      memory,
      world,
      botEntity
    );
    currentBehavior = initRes.state;
    memory = initRes.memory;

    state = { ...state, initialized: true };
  }

  // 2 - update PERCEPTION
  const currentBombs = getAllCoords(world, Bomb);
  const currentExplosions = getAllCoords(world, Explosion);
  let shouldForceReeval = false;

  const explosionDiff = HashSet.difference(
    memory.lastExplosionCoords,
    currentExplosions
  );
  if (HashSet.size(explosionDiff) > 0) {
    shouldForceReeval = true;
  }
  const newBombs = HashSet.difference(currentBombs, memory.lastBombCoords);
  if (HashSet.size(newBombs) > 0) {
    for (const b of newBombs) {
      const dist = Math.max(
        Math.abs(botEntity.row - b[0]),
        Math.abs(botEntity.col - b[1])
      );
      if (dist <= 5) {
        shouldForceReeval = true;
        break;
      }
    }
  }

  memory = {
    ...memory,
    lastBombCoords: currentBombs,
    lastExplosionCoords: currentExplosions,
  };

  // 3 - tick timer
  let timerTrigger = false;
  const newTimer = memory.reevalTimer + dt;

  if (newTimer >= state.config.reevalInterval) {
    memory = { ...memory, reevalTimer: 0 };
    if (Math.random() <= state.config.reevalChance) {
      timerTrigger = true;
    }
  } else {
    memory = { ...memory, reevalTimer: newTimer };
  }

  // 4 - check danger
  const isInDanger = Policies.isInDanger(
    state.config.dangerPolicy,
    world,
    botEntity,
    state.config.dangerRadius
  );

  console.log(`CURR BEV ${currentBehavior._tag}`)
  if (isInDanger) {
    if (currentBehavior._tag !== "Escape State") {
      const res = transitionTo(
        EscapeState.make({ leftDanger: false }),
        state.config,
        memory,
        world,
        botEntity
      );
      currentBehavior = res.state;
      memory = res.memory;
    }
  }

  // 5 - reevaluate if we should
  if (timerTrigger || shouldForceReeval) {
    const res = performGlobalReevaluation(
      state.config,
      memory,
      currentBehavior,
      world,
      botEntity
    );
    currentBehavior = res.state;
    memory = res.memory;
  }

  // 6 - Tick the STATE
  const tickRes = StateLogic.runOnTick(
    currentBehavior,
    state.config,
    memory,
    world,
    botEntity
  );

  if (tickRes.nextState) {
      // Hard transition
      const res = transitionTo(
        tickRes.nextState,
        state.config,
        tickRes.memory,
        world,
        botEntity
      );
      currentBehavior = res.state;
      memory = res.memory;
  } else {
    memory = tickRes.memory;
  }

  // 7 - decide ACTION
  const decision = StateLogic.decideAction(
    currentBehavior,
    state.config,
    memory,
    world,
    botEntity
  );
  memory = decision.memory;

  return {
    nextState: {
      ...state,
      currentState: currentBehavior,
      memory: memory,
    },
    action: decision.action,
  };
};

// Helper to transition states (clean memory -> on_enter)
const transitionTo = (
  newState: BotBehavior,
  config: BotConfig,
  memory: BotMemory,
  world: World,
  bot: Player
) => {
  // Clean memory
  const freshMem = BotMemory.make({
    ...memory,
    path: [],
    goal: Option.none(),
    isStrictMovement: false,
    reevalTimer: 0
  });

  return StateLogic.runOnEnter(newState, config, freshMem, world, bot);
};

const performGlobalReevaluation = (
  config: BotConfig,
  memory: BotMemory,
  currentState: BotBehavior,
  world: World,
  bot: Player
) => {
  // 1 - Danger Check
  if (
    Policies.isInDanger(config.dangerPolicy, world, bot, config.dangerRadius)
  ) {
    if (currentState._tag !== "Escape State") {
      return transitionTo(
        EscapeState.make({ leftDanger: false }),
        config,
        memory,
        world,
        bot
      );
    }
    return { state: currentState, memory };
  }

  // 2 - Powerup Check
  if (Math.random() <= config.powerupChance) {
    const target = Policies.getPowerupGoal(config.powerupPolicy, world, bot);

    if (target) {
      if (
        currentState._tag === "Get Powerup State" &&
        isSameCoord(currentState.target, target)
      ) {
        return { state: currentState, memory };
      }
      return transitionTo(
        GetPowerupState.make({ target: target }),
        config,
        memory,
        world,
        bot
      );
    }
  }

  // 3 - Attack Check
  const attackTarget = Policies.getAttackGoal(config.attackPolicy, world, bot);
  if (attackTarget) {
    return transitionTo(
      AttackState.make({ target: attackTarget }),
      config,
      memory,
      world,
      bot
    );
  }

  // 4 - Default -> Wander
  if (currentState._tag !== "Wander State") {
    return transitionTo(WanderState.make({}), config, memory, world, bot);
  }

  return { state: currentState, memory };
};

// Helpers
const getAllCoords = (world: World, type: any): HashSet.HashSet<GridCoords> => {
  const entities = getAllType(world, type);
  let set = HashSet.empty<GridCoords>();
  for (const e of entities) {
    set = HashSet.add(set, [e.row, e.col]);
  }
  return set;
};

const isSameCoord = (a: GridCoords, b: GridCoords) =>
  a[0] === b[0] && a[1] === b[1];
