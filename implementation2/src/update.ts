import { updateBot } from "./bot_behavior/bot";
import { updateBlock } from "./entity/block";
import { createExplosions, shouldDetonate, updateBomb } from "./entity/bomb";
import { updateExplosion } from "./entity/explosion";
import {
  addBomb,
  getPlayerById,
  getPlayerCol,
  getPlayerRow,
  hitboxX,
  hitboxY,
  onExplosionHitPlayer,
  playerMaxBombs,
  playerRange,
  removeBomb,
  updatePlayer,
} from "./entity/player";
import { onPickup, updatePowerup } from "./entity/powerup";
import { CONTROLS, isHeld } from "./helpers/controls";
import {
  choicePowerups,
  makeBomb,
  makeHardBlock,
  makePlayer,
  makeSoftBlock,
} from "./helpers/factories";
import { generateId } from "./helpers/id_gen";
import {
  generateSoftBlockCoords,
  getPlayerStartCoords,
} from "./helpers/init_world_gen";
import {
  addEntity,
  getAllByTag,
  getAllType,
  getEntityAt,
  removeEntity,
} from "./helpers/world";
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
  RemoveEvent,
  SpawnEvent,
  ExplosionSound,
  EventType,
  SoundType,
  AnimationCmd,
  RoundResult,
  DrawResult,
  TimeResult,
  DeathResult,
  EndDelayModel,
  TransitionModel,
  InputState,
  EastDirection,
  NorthDirection,
  SouthDirection,
  WestDirection,
  SoftBreakAnimation,
  DeathAnimation,
  CellMode,
  GridCoords,
  CountdownModel,
  PlayingModel,
  DrawType,
  WinResult,
  BotAction,
  // add others if needed
} from "./model";
import { Msg } from "./msg";
import { Array, HashMap, pipe, Match, HashSet, Option } from "effect";

const _refresh_players_cache = (world: World): HashSet.HashSet<Player> =>
  HashSet.fromIterable(getAllByTag(world, "Player"));

function _update_timers(model: Model): Model {
  const dt = 1;
  return Match.value(model.state).pipe(
    Match.tag("Transition Model", () => {
      return { ...model };
    }),
    Match.tag("Countdown Model", () => {
      if (model.roundStartTimer <= 0) {
        return { ...model, state: PlayingModel.make() };
      }
      return { ...model, roundStartTimer: model.roundStartTimer - dt };
    }),
    Match.tag("Playing Model", () => {
      return { ...model, timer: model.timer - dt };
    }),
    Match.tag("EndDelay Model", () => {
      const nextTimer = model.winCountdown - 1;

      if (model.winCountdown <= 0) {
        if (model.tempWinner !== -1) {
          return _finalize_round(
            model,
            Option.some(model.tempWinner),
            Option.none()
          );
        } else {
          if (model.timer <= 0) {
            return _finalize_round(
              model,
              Option.none(),
              Option.some(TimeResult.make({}))
            );
          } else {
            return _finalize_round(
              model,
              Option.none(),
              Option.some(DeathResult.make({}))
            );
          }
        }
      }
      return { ...model, winCountdown: nextTimer };
    }),
    Match.exhaustive
  );
}

function _clear_sfx_buffer(model: Model): Model {
  return Model.make({
    ...model,
    sfxBuffer: Array.empty(),
  });
}

function _handle_input_for_players(model: Model): Model {
  const { inputState } = model;

  const nextEntities = pipe(
    model.world.entities,
    HashMap.map((entity) =>
      pipe(
        entity,
        Match.value,
        Match.tag("Player", (player) => {
          const controls = CONTROLS[player.player_id];
          if (!controls) return player;

          const right = isHeld(inputState, controls.right);
          const left = isHeld(inputState, controls.left);
          const down = isHeld(inputState, controls.down);
          const up = isHeld(inputState, controls.up);

          let dx = (right ? 1 : 0) - (left ? 1 : 0);
          let dy = (down ? 1 : 0) - (up ? 1 : 0);

          if (dx !== 0 && dy !== 0) {
            dy = 0;
          }
          let newDirection = player.directionFacing;

          if (dx > 0) newDirection = EastDirection.make({ dr: 0, dc: 1 });
          else if (dx < 0) newDirection = WestDirection.make({ dr: 0, dc: -1 });
          else if (dy > 0) newDirection = SouthDirection.make({ dr: 1, dc: 0 });
          else if (dy < 0)
            newDirection = NorthDirection.make({ dr: -1, dc: 0 });

          return Player.make({
            ...player,
            vx: dx * player.speed,
            vy: dy * player.speed,
            directionFacing: newDirection,
          });
        }),
        Match.orElse((other) => other)
      )
    )
  );

  return {
    ...model,
    world: World.make({
      ...model.world,
      entities: nextEntities,
    }),
  };
}

function _apply_bot_movement(player: Player, action: BotAction): Player {
  return Match.value(action).pipe(
    Match.tag("Move Action", ({ direction }) => {
      return Match.value(direction).pipe(
        Match.tag("North Direction", () => Player.make({ ...player, vx: 0, vy: -player.speed, directionFacing: direction })),
        Match.tag("South Direction", () => Player.make({ ...player, vx: 0, vy: player.speed, directionFacing: direction })),
        Match.tag("East Direction", () => Player.make({ ...player, vx: player.speed, vy: 0, directionFacing: direction })),
        Match.tag("West Direction", () => Player.make({ ...player, vx: -player.speed, vy: 0, directionFacing: direction })),
        Match.exhaustive
      );
    }),
    Match.tag("Idle Action", () => Player.make({ ...player, vx: 0, vy: 0 })),
    Match.tag("Place Bomb Action", () => Player.make({ ...player, vx: 0, vy: 0 })), 
    Match.exhaustive
  );
}

function _update_bots(model: Model): Model {
  if (model.state._tag !== "Playing Model" && model.state._tag !== "EndDelay Model") {
    return model;
  }

  let currentModel = model;
  let nextBotInternals = currentModel.botInternals;
  let nextEntities = currentModel.world.entities;

  for (const [botId, internalState] of model.botInternals) {
    const playerOption = HashMap.get(nextEntities, botId);
    
    if (Option.isNone(playerOption) || playerOption.value._tag !== "Player") continue;
    const player = playerOption.value;
    if (player.isExpired || !player.isAlive) continue;

    // run LOGIC
    const { nextState, action } = updateBot(
      internalState,
      currentModel.world, 
      player,
      1 / model.fps       
    );
    console.log(action._tag)

    // update INTERNALS
    nextBotInternals = HashMap.set(nextBotInternals, botId, nextState);

    // update BOT
    const movedPlayer = _apply_bot_movement(player, action);
    nextEntities = HashMap.set(nextEntities, botId, movedPlayer);

    // if we place bomb:
    if (action._tag === "Place Bomb Action") {
      const tempModel = {
        ...currentModel,
        world: { ...currentModel.world, entities: nextEntities },
        botInternals: nextBotInternals
      };

      const modelAfterBomb = _trySpawnBomb(tempModel, botId);

      currentModel = modelAfterBomb;
      nextBotInternals = currentModel.botInternals;
      nextEntities = currentModel.world.entities;
    }
  }

  return {
    ...currentModel,
    world: {
      ...currentModel.world,
      entities: nextEntities
    },
    botInternals: nextBotInternals
  };
}

function _update_entities(model: Model): Model {
  const dt = 1 / model.fps;

  let newWorld = model.world;
  let newEvents = model.eventBuffer;
  let newSfx = model.sfxBuffer;
  let newVfx = model.vfxBuffer;

  for (const [id, ent] of model.world.entities) {
    const [updatedEntity, updateResult] = Match.value(ent).pipe(
      Match.tag("Explosion", (e) => updateExplosion(e, dt)),
      Match.tag("Bomb", (e) => updateBomb(e, dt)),
      Match.tag("Block", (e) => updateBlock(e, dt)),
      Match.tag("Player", (e) => updatePlayer(e, newWorld, dt)),
      Match.tag("Powerup", (e) => updatePowerup(e, dt)),
      Match.exhaustive
    );
    if (updatedEntity !== ent) {
      newWorld = addEntity(newWorld, updatedEntity);
    }

    newEvents = [...newEvents, ...updateResult.events];
    newSfx = [...newSfx, ...updateResult.sounds];
    newVfx = [...newVfx, ...updateResult.animations];
  }

  const nextPlayers = _refresh_players_cache(newWorld);
  // Return a new model with updated entities and buffers
  return Model.make({
    ...model,
    world: newWorld,
    players: nextPlayers,
    eventBuffer: newEvents,
    sfxBuffer: newSfx,
    vfxBuffer: newVfx,
  });
}

function _detonate_bombs(model: Model): Model {
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
          SpawnEvent.make({ entity: pw(entity.row, entity.col) })
        ),
      };
    }
  }
  const newEvents = [...model.eventBuffer, ...result.events];
  const newSfx = [...model.sfxBuffer, ...result.sounds];
  const newVfx = [...model.vfxBuffer, ...result.animations];

  const newPlayers = _refresh_players_cache(newWorld);

  return {
    ...model,
    world: newWorld,
    players: newPlayers,
    eventBuffer: newEvents,
    sfxBuffer: newSfx,
    vfxBuffer: newVfx,
  };
}

function _process_events(model: Model): Model {
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

function _checkPlayerOverlap(
  player: Player,
  row: number,
  col: number
): boolean {
  const cellX1 = col * 16;
  const cellY1 = row * 16;
  const cellX2 = cellX1 + 16;
  const cellY2 = cellY1 + 16;

  // Player hitbox (bottom 16x16)
  const px1 = hitboxX(player);
  const py1 = hitboxY(player);
  const px2 = px1 + 16;
  const py2 = py1 + 16;

  if (px2 <= cellX1 || px1 >= cellX2) return false;
  if (py2 <= cellY1 || py1 >= cellY2) return false;

  return true;
}

function _check_explosion_powerup_collision(model: Model): Model {
  const explosions = getAllType(model.world, Explosion);
  const powerups = getAllType(model.world, Powerup);
  let picked: GridCoords[] = [];
  let newWorld = model.world;
  let results = UpdateResult.make({
    events: Array.empty(),
    sounds: Array.empty(),
    animations: Array.empty(),
  });
  const currentPlayers = Array.fromIterable(getAllType(newWorld, Player));
  for (const player of currentPlayers) {
    if (player.isExpired) continue;
    for (const explosion of explosions) {
      if (_checkPlayerOverlap(player, explosion.row, explosion.col)) {
        newWorld = addEntity(newWorld, onExplosionHitPlayer(player));
        // code for death animation most likely goes here
      }
    }
    for (const powerup of powerups) {
      if (powerup.isExpired) {
        continue;
      }
      let position: GridCoords = [powerup.row, powerup.col];
      if (Array.contains(picked, position)) {
        continue;
      }
      if (_checkPlayerOverlap(player, powerup.row, powerup.col)) {
        const p = powerup as Powerup;
        const [newPlayer, result] = onPickup(p, player);
        newWorld = addEntity(newWorld, newPlayer);
        results = {
          ...results,
          events: Array.appendAll(results.events, result.events),
          sounds: Array.appendAll(results.sounds, result.sounds),
          animations: Array.appendAll(results.animations, result.animations),
        };
        picked = Array.append(picked, position);
        break;
      }
    }
  }
  const newPlayers = _refresh_players_cache(newWorld);

  return {
    ...model,
    world: newWorld,
    players: newPlayers,
    eventBuffer: Array.appendAll(model.eventBuffer, results.events),
    sfxBuffer: Array.appendAll(model.sfxBuffer, results.sounds),
    vfxBuffer: Array.appendAll(model.vfxBuffer, results.animations),
  };
}

function _resolve_bomb_passthrough(model: Model): Model {
  let newWorld = model.world;

  const bombs = getAllByTag(model.world, "Bomb") as Bomb[];

  for (const bomb of bombs) {
    if (bomb.moveAwayIds.length === 0) continue;

    const nextMoveAwayIds = bomb.moveAwayIds.filter((pid) => {
      const player = getPlayerById(model.players, pid);

      if (!player || !player.isAlive) return false;

      return _checkPlayerOverlap(player, bomb.row, bomb.col);
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

function _check_round_end_conditions(model: Model): Model {
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

function _trySpawnBomb(model: Model, player_id_to_place: number): Model {
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
  const fuseDuration = 3;

  const activePlayers = getAllByTag(model.world, "Player");

  const overlappingIds: number[] = [];
  for (const p of activePlayers) {
    if (_checkPlayerOverlap(p, r, c)) {
      overlappingIds.push(p.player_id);
    }
  }

  let newBomb = makeBomb(r, c, fuseDuration, playerRange(player), player.id);
  newBomb = { ...newBomb, moveAwayIds: overlappingIds };
  // console.log(overlappingIds)

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
    players: _refresh_players_cache(newWorld),
    eventBuffer: nextEvents,
  };
}

function _finalize_round(
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

function _start_new_round(model: Model): Model {
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
    const newP = makePlayer(p.player_id, start[0], start[1], 16, model.fps);

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
    tempWinner: -1,
    roundResult: Option.none(),
  };
}
function _tick_game(model: Model): Model {
  if (
    model.state._tag === "Transition Model" ||
    model.state._tag === "Countdown Model"
  ) {
    return { ...model };
  }
  return pipe(
    model,
    _update_bots,
    _update_entities,
    _detonate_bombs,
    _process_events,
    _check_explosion_powerup_collision,
    _resolve_bomb_passthrough,
    _process_events,
    _check_round_end_conditions
  );
}

export const update = (msg: Msg, model: Model) =>
  Match.value(msg).pipe(
    Match.tag("Canvas.MsgTick", () => {
      return pipe(
        model,
        _clear_sfx_buffer,
        _handle_input_for_players,
        _update_timers,
        _tick_game
      );
    }),
    Match.tag("Canvas.MsgKeyDown", ({ key }) => {
      const nextInputState = HashSet.add(model.inputState, key);
      let nextModel = { ...model, inputState: nextInputState };

      // Triggers
      if (key === "L" || key === "l") {
        let explosions = getAllType(model.world, Explosion);
        for (const explosion of explosions) {
          console.log(explosion.row, explosion.col);
        }
      }

      if (key === "Escape") {
        if (nextModel.state._tag === "Transition Model") {
          return _start_new_round(nextModel);
        }
        return { ...nextModel, debugMode: !nextModel.debugMode };
      }

      if (
        nextModel.state._tag === "Transition Model" ||
        nextModel.state._tag === "Countdown Model"
      ) {
        return nextModel;
      }

      if (CONTROLS[0].bomb.includes(key))
        nextModel = _trySpawnBomb(nextModel, 0);
      if (CONTROLS[1].bomb.includes(key))
        nextModel = _trySpawnBomb(nextModel, 1);

      return nextModel;
    }),
    Match.tag("Canvas.MsgKeyUp", ({ key }) => {
      const nextInputState = HashSet.remove(model.inputState, key);
      return { ...model, inputState: nextInputState };
    }),
    Match.tag("Canvas.MsgMouseDown", () => {
      return model;
    }),
    Match.tag("Canvas.MsgMouseUp", () => {
      return model;
    }),
    Match.exhaustive
  );
