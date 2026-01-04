import { updateBot } from "../bot_behavior/bot";
import { updateBlock } from "../entity/block";
import { updateBomb, shouldDetonate, createExplosions } from "../entity/bomb";
import { updateExplosion } from "../entity/explosion";
import {
  updatePlayer,
  removeBomb,
  getOverlappingCells,
  onExplosionHitPlayer,
  getPlayerById,
  isOverlapping,
  playerMaxBombs,
  getPlayerRow,
  getPlayerCol,
  playerRange,
  addBomb,
} from "../entity/player";
import { updatePowerup, onPickup } from "../entity/powerup";
import {
  World,
  Player,
  BotAction,
  Model,
  EventType,
  SoundType,
  AnimationCmd,
  UpdateResult,
  Bomb,
  Entity,
  Block,
  SoftBreakAnimation,
  CellMode,
  SpawnEvent,
  GridCoords,
  Powerup,
  EndDelayModel,
  AnimationType,
  ActiveAnimation,
  DrawType,
  RoundResult,
  WinResult,
  DrawResult,
  TransitionModel,
  BotInternalState,
  BotMemory,
  CountdownModel,
} from "../model";
import {
  choicePowerups,
  makeBomb,
  makeHardBlock,
  makeSoftBlock,
  makePlayer,
} from "./factories";
import {
  generateSoftBlockCoords,
  getPlayerStartCoords,
} from "./init_world_gen";
import {
  getAllByTag,
  getAllType,
  addEntity,
  removeEntity,
  getEntityAt,
} from "./world";
import { Array, HashMap, pipe, Match, HashSet, Option } from "effect";

/*
This file contains all helper functions for `update()` to function.
*/

export const refreshPlayersCache = (world: World): HashSet.HashSet<Player> =>
  HashSet.fromIterable(getAllByTag(world, "Player"));

export function applyBotMovement(player: Player, action: BotAction): Player {
  return Match.value(action).pipe(
    Match.tag("Move Action", ({ direction }) => {
      return Match.value(direction).pipe(
        Match.tag("North Direction", () =>
          Player.make({
            ...player,
            vx: 0,
            vy: -player.speed,
            directionFacing: direction,
          })
        ),
        Match.tag("South Direction", () =>
          Player.make({
            ...player,
            vx: 0,
            vy: player.speed,
            directionFacing: direction,
          })
        ),
        Match.tag("East Direction", () =>
          Player.make({
            ...player,
            vx: player.speed,
            vy: 0,
            directionFacing: direction,
          })
        ),
        Match.tag("West Direction", () =>
          Player.make({
            ...player,
            vx: -player.speed,
            vy: 0,
            directionFacing: direction,
          })
        ),
        Match.exhaustive
      );
    }),
    Match.tag("Idle Action", () => Player.make({ ...player, vx: 0, vy: 0 })),
    Match.tag("Place Bomb Action", () =>
      Player.make({ ...player, vx: 0, vy: 0 })
    ),
    Match.exhaustive
  );
}

export function updateBots(model: Model, dt: number): Model {
  if (
    model.state._tag !== "Playing Model" &&
    model.state._tag !== "EndDelay Model"
  ) {
    return model;
  }

  let currentModel = model;
  let nextBotInternals = currentModel.botInternals;
  let nextEntities = currentModel.world.entities;

  for (const [botId, internalState] of model.botInternals) {
    const playerOption = HashMap.get(nextEntities, botId);

    if (Option.isNone(playerOption) || playerOption.value._tag !== "Player")
      continue;
    const player = playerOption.value;
    if (player.isExpired || !player.isAlive) continue;

    // run LOGIC
    const { nextState, action } = updateBot(
      internalState,
      currentModel.world,
      player,
      dt
    );

    // update INTERNALS
    nextBotInternals = HashMap.set(nextBotInternals, botId, nextState);

    // update BOT
    const movedPlayer = applyBotMovement(player, action);
    nextEntities = HashMap.set(nextEntities, botId, movedPlayer);

    // if we place bomb:
    if (action._tag === "Place Bomb Action") {
      const tempModel = {
        ...currentModel,
        world: { ...currentModel.world, entities: nextEntities },
        botInternals: nextBotInternals,
      };

      const modelAfterBomb = trySpawnBomb(tempModel, botId);

      currentModel = modelAfterBomb;
      nextBotInternals = currentModel.botInternals;
      nextEntities = currentModel.world.entities;
    }
  }

  return {
    ...currentModel,
    world: {
      ...currentModel.world,
      entities: nextEntities,
    },
    botInternals: nextBotInternals,
  };
}

export function updateEntities(model: Model, dt: number): Model {
  // const dt = 1 / model.fps;

  let newEntities = model.world.entities;

  // since the game is in a very unoptimized state,
  // our group decided to opt out of using Effect Array for this part:
  //  since pushing to a JS array is O(1), while spreading [...] is O(N)
  const newEvents: EventType[] = [...model.eventBuffer];
  const newSfx: SoundType[] = [...model.sfxBuffer];
  const newVfx: AnimationCmd[] = [...model.vfxBuffer];

  let newPlayers = HashSet.empty<Player>();

  for (const [id, ent] of model.world.entities) {
    if (ent._tag === "Block" && ent.isHard) {
      continue;
    }
    const [updatedEntity, updateResult] = Match.value(ent).pipe(
      Match.tag("Explosion", (e) => updateExplosion(e, dt)),
      Match.tag("Bomb", (e) => updateBomb(e, dt)),
      Match.tag("Block", (e) => updateBlock(e, dt)),
      Match.tag("Player", (e) => updatePlayer(e, model.world, dt)),
      Match.tag("Powerup", (e) => updatePowerup(e, dt)),
      Match.exhaustive
    );

    if (updatedEntity !== ent) {
      newEntities = HashMap.set(newEntities, id, updatedEntity);
    }

    if (updateResult.events.length > 0) newEvents.push(...updateResult.events);
    if (updateResult.sounds.length > 0) newSfx.push(...updateResult.sounds);
    if (updateResult.animations.length > 0)
      newVfx.push(...updateResult.animations);

    if (updatedEntity._tag === "Player") {
      newPlayers = HashSet.add(newPlayers, updatedEntity);
    }
  }

  return Model.make({
    ...model,
    world: World.make({ ...model.world, entities: newEntities }),
    players: newPlayers,
    eventBuffer: newEvents,
    sfxBuffer: newSfx,
    vfxBuffer: newVfx,
  });
}
export function detonateBombs(model: Model): Model {
  let newWorld = World.make({ ...model.world });
  let result = UpdateResult.make({ events: [], sounds: [], animations: [] });

  const explodingBombs: Bomb[] = Array.filter(
    getAllType(model.world, Bomb),
    (entity) => entity._tag === "Bomb" && shouldDetonate(entity)
  );

  for (const bomb of explodingBombs) {
    let explosionResult: UpdateResult;
    [newWorld, explosionResult] = createExplosions(bomb, newWorld);

    result = {
      ...result,
      events: Array.appendAll(result.events, explosionResult.events),
      sounds: Array.appendAll(result.sounds, explosionResult.sounds),
      animations: Array.appendAll(
        result.animations,
        explosionResult.animations
      ),
    };

    const ownerOption = HashMap.get(newWorld.entities, bomb.owner);

    if (Option.isSome(ownerOption) && ownerOption.value._tag === "Player") {
      const owner = ownerOption.value;
      const updatedOwner = removeBomb(owner, bomb);
      newWorld = addEntity(newWorld, updatedOwner);
    }
  }
  const expiredBlocks: Entity[] = Array.filter(
    getAllType(newWorld, Block),
    (e) => e.isExpired
  );
  for (const entity of expiredBlocks) {
    newWorld = removeEntity(newWorld, entity);

    result = {
      ...result,
      animations: Array.append(
        result.animations,
        AnimationCmd.make({
          type: SoftBreakAnimation.make(),
          mode: CellMode.make({}),
          a: entity.row,
          b: entity.col,
          durationFrames: model.fps * 1,
          id: Option.some(entity.id),
          powerupType: Option.none(),
        })
      ),
    };
    if (Math.random() * 100 <= model.config.powerupSpawnChance) {
      const pw =
        choicePowerups[Math.floor(Math.random() * choicePowerups.length)];
      result = {
        ...result,
        events: Array.append(
          result.events,
          SpawnEvent.make({ entity: pw(entity.row, entity.col, model.fps) })
        ),
      };
    }
  }
  const newEvents = [...model.eventBuffer, ...result.events];
  const newSfx = [...model.sfxBuffer, ...result.sounds];
  const newVfx = [...model.vfxBuffer, ...result.animations];

  const newPlayers = refreshPlayersCache(newWorld);

  return {
    ...model,
    world: newWorld,
    players: newPlayers,
    eventBuffer: newEvents,
    sfxBuffer: newSfx,
    vfxBuffer: newVfx,
  };
}

export function processEvents(model: Model): Model {
  let newWorld = model.world;

  Array.map(model.eventBuffer, (event) => {
    Match.value(event).pipe(
      Match.tag("Spawn", ({ entity }) => {
        newWorld = addEntity(newWorld, entity);
      }),
      Match.tag("Remove", ({ entity }) => {
        newWorld = removeEntity(newWorld, entity);
      })
    );
  });

  return Model.make({
    ...model,
    world: newWorld,
    eventBuffer: Array.empty(),
  });
}

export function checkExplosionPowerupCollision(model: Model): Model {
  let newWorld = model.world;
  let results = UpdateResult.make({
    events: Array.empty(),
    sounds: Array.empty(),
    animations: Array.empty(),
  });
  let picked: GridCoords[] = [];

  const currentPlayers = Array.filter(
    Array.fromIterable(getAllType(newWorld, Player)),
    (player) => player.isAlive
  );

  for (const player of currentPlayers) {
    if (player.isExpired) continue;

    const overlappingCells = getOverlappingCells(player);

    for (const [r, c] of overlappingCells) {
      const entity = getEntityAt(newWorld, r, c);
      const position: GridCoords = [r, c];

      if (!entity) continue;

      if (entity._tag === "Explosion") {
        if (player.isAlive) {
          const deadPlayer = onExplosionHitPlayer(player);
          newWorld = addEntity(newWorld, deadPlayer);
          break;
        }
      } else if (entity._tag === "Powerup") {
        const p = entity as Powerup;
        if (Array.contains(picked, position)) {
          continue;
        }
        if (!p.isExpired) {
          const [newPlayer, result] = onPickup(p, player);

          newWorld = addEntity(newWorld, newPlayer);
          results = {
            ...results,
            events: Array.appendAll(results.events, result.events),
            sounds: Array.appendAll(results.sounds, result.sounds),
            animations: Array.appendAll(results.animations, result.animations),
          };
        }
      }
    }
  }

  const newPlayers = refreshPlayersCache(newWorld);

  return {
    ...model,
    world: newWorld,
    players: newPlayers,
    eventBuffer: Array.appendAll(model.eventBuffer, results.events),
    sfxBuffer: Array.appendAll(model.sfxBuffer, results.sounds),
    vfxBuffer: Array.appendAll(model.vfxBuffer, results.animations),
  };
}

export function resolveBombPassthrough(model: Model): Model {
  let newWorld = model.world;

  const bombs = getAllByTag(model.world, "Bomb") as Bomb[];

  for (const bomb of bombs) {
    if (bomb.moveAwayIds.length === 0) continue;

    const nextMoveAwayIds = bomb.moveAwayIds.filter((pid) => {
      const player = getPlayerById(model.players, pid);

      if (!player || !player.isAlive) return false;

      return isOverlapping(player, [bomb.row, bomb.col]);
    });

    if (nextMoveAwayIds.length !== bomb.moveAwayIds.length) {
      const updatedBomb = Bomb.make({
        ...bomb,
        moveAwayIds: nextMoveAwayIds,
      });

      newWorld = addEntity(newWorld, updatedBomb);
    }
  }
  return {
    ...model,
    world: newWorld,
  };
}

export function checkRoundEndConditions(model: Model): Model {
  if (model.state._tag === "Transition Model") return model;

  const alive = Array.filter(
    getAllType(model.world, Player),
    (player) => player.isAlive
  );

  if (model.timer <= 0) {
    if (model.state._tag !== "EndDelay Model" || model.tempWinner !== -1) {
      return {
        ...model,
        state: EndDelayModel.make({}),
        tempWinner: -1,
        winCountdown: 0,
      };
    }
    return model;
  }

  if (alive.length === 0) {
    if (model.state._tag !== "EndDelay Model" || model.tempWinner !== -1) {
      return {
        ...model,
        state: EndDelayModel.make({}),
        tempWinner: -1,
        winCountdown:
          model.state._tag === "EndDelay Model"
            ? model.winCountdown
            : model.fps,
      };
    }
    return model;
  }

  if (alive.length === 1 && model.state._tag !== "EndDelay Model") {
    return {
      ...model,
      tempWinner: alive[0].player_id,
      state: EndDelayModel.make({}),
      winCountdown: model.fps,
    };
  }

  return model;
}

export function getAnimationMaxFrames(animType: AnimationType): number {
  return Match.value(animType).pipe(
    Match.tag("Death Animation", () => 48),
    Match.tag("Soft Break Animation", () => 15),
    Match.tag("PowerupBreak Animation", () => 15),
    Match.exhaustive
  );
}

export function processNewAnimations(model: Model): Model {
  if (model.vfxBuffer.length === 0) {
    return model;
  }

  const newAnimations = model.vfxBuffer.map((cmd) =>
    ActiveAnimation.make({
      cmd,
      frameCounter: 0,
      startFrame: model.globalFrameCount,
    })
  );

  return Model.make({
    ...model,
    activeAnimations: [...model.activeAnimations, ...newAnimations],
    vfxBuffer: [],
  });
}

export function updateAnimations(model: Model): Model {
  const updatedAnimations = model.activeAnimations
    .map((anim) =>
      ActiveAnimation.make({
        ...anim,
        frameCounter: anim.frameCounter + 1,
      })
    )
    .filter((anim) => {
      const maxFrames = getAnimationMaxFrames(anim.cmd.type);
      return anim.frameCounter < maxFrames;
    });

  return Model.make({
    ...model,
    activeAnimations: updatedAnimations,
    globalFrameCount: model.globalFrameCount + 1,
  });
}

export function trySpawnBomb(model: Model, player_id_to_place: number): Model {
  const playerOption = Array.findFirst(
    Array.fromIterable(HashMap.values(model.world.entities)),
    (e): e is Player =>
      e._tag === "Player" && e.player_id === player_id_to_place
  );
  if (Option.isNone(playerOption)) return model;
  const player = playerOption.value;

  if (!player.isAlive) return model;

  const currentBombs = player.activeBombs.length;
  const maxBombs = playerMaxBombs(player);

  if (currentBombs >= maxBombs) {
    return model;
  }

  const r = getPlayerRow(player);
  const c = getPlayerCol(player);

  if (r === -1 || c === -1) return model;

  const existingEntity = getEntityAt(model.world, r, c);

  if (existingEntity !== null) {
    return model;
  }
  const fuseDuration = 3 * model.fps;

  const activePlayers = getAllByTag(model.world, "Player");

  const overlappingIds: number[] = [];
  for (const p of activePlayers) {
    if (isOverlapping(p, [r, c])) {
      overlappingIds.push(p.player_id);
    }
  }

  let newBomb = makeBomb(r, c, fuseDuration, playerRange(player), player.id);
  newBomb = { ...newBomb, moveAwayIds: overlappingIds };

  let newWorld = addEntity(model.world, newBomb);

  const updatedPlayer = addBomb(player, newBomb);

  newWorld = addEntity(newWorld, updatedPlayer);

  const nextEvents = Array.append(
    model.eventBuffer,
    SpawnEvent.make({ entity: newBomb })
  );

  return {
    ...model,
    world: newWorld,
    players: refreshPlayersCache(newWorld),
    eventBuffer: nextEvents,
  };
}

export function finalizeRound(
  model: Model,
  winnerId: Option.Option<number>,
  drawType: Option.Option<DrawType>
): Model {
  let nextScores = model.scores;
  if (Option.isSome(winnerId)) {
    const wId = winnerId.value;
    const currentScore = Option.getOrElse(
      HashMap.get(model.scores, wId),
      () => 0
    );
    nextScores = HashMap.set(model.scores, wId, currentScore + 1);
  }

  let matchOver = false;
  let overallWinner = Option.none<number>();

  if (Option.isSome(winnerId)) {
    const wId = winnerId.value;
    const newScore = Option.getOrElse(HashMap.get(nextScores, wId), () => 0);
    if (newScore >= model.roundsToWin) {
      matchOver = true;
      overallWinner = winnerId;
    }
  }

  const roundResult = RoundResult.make({
    outcome: Option.isSome(winnerId) ? WinResult.make({}) : DrawResult.make({}),
    winnerId: winnerId,
    drawType: drawType,
    matchOver: matchOver,
    overallWinnerId: overallWinner,
  });

  return {
    ...model,
    scores: nextScores,
    roundResult: Option.some(roundResult),
    state: TransitionModel.make({}),
    eventBuffer: Array.empty(), // Clear buffers
  };
}

export function startNewRound(model: Model): Model {
  let newEntities = HashMap.empty<number, Entity>();

  const hardBlocks = [...model.spacedBlockCoords, ...model.borderBlockCoords];
  hardBlocks.forEach(([r, c]) => {
    const block = makeHardBlock(r, c);
    newEntities = HashMap.set(newEntities, block.id, block);
  });

  const softBlockCoords = generateSoftBlockCoords(
    model.world.rows,
    model.world.cols,
    hardBlocks,
    [...model.protectedCoords],
    model.config
  );
  softBlockCoords.forEach(([r, c]) => {
    const block = makeSoftBlock(r, c);
    newEntities = HashMap.set(newEntities, block.id, block);
  });

  const { rows, cols } = model.world;
  const startCoords = getPlayerStartCoords(rows, cols);
  let newPlayers = HashSet.empty<Player>();

  for (const p of model.players) {
    const start = startCoords[p.player_id];
    if (!start) continue;
    const newP = makePlayer(p.player_id, start[0], start[1], 128, model.fps);

    newPlayers = HashSet.add(newPlayers, newP);
    newEntities = HashMap.set(newEntities, newP.id, newP);
  }

  const entityList = Array.fromIterable(HashMap.values(newEntities));
  const boardEntities = Array.filter(entityList, (e) => e._tag !== "Player");

  const newBoard = Array.makeBy(model.world.rows, (r) =>
    Array.makeBy(model.world.cols, (c) =>
      Array.findFirst(boardEntities, (e) => e.row === r && e.col === c)
    )
  );

  const newBotInternals = HashMap.map(model.botInternals, (state) =>
    BotInternalState.make({
      ...state,
      memory: BotMemory.make({
        ...state.memory,
        path: Array.empty(),
        goal: Option.none(),
        isStrictMovement: false,
      }),
    })
  );

  return {
    ...model,
    world: World.make({
      rows: model.world.rows,
      cols: model.world.cols,
      entities: newEntities,
      board: newBoard,
    }),
    players: newPlayers,
    state: CountdownModel.make({}),
    roundStartTimer: 3 * model.fps,
    timer: model.config.timerSeconds * model.fps,
    winCountdown: model.fps,
    eventBuffer: [],
    sfxBuffer: [],
    vfxBuffer: [],
    activeAnimations: [],
    globalFrameCount: 0,
    tempWinner: -1,
    roundResult: Option.none(),
    botInternals: newBotInternals,
    debugMode: false,
  };
}
