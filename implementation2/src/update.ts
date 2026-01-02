import { updateBlock } from "./entity/block";
import { createExplosions, shouldDetonate, updateBomb } from "./entity/bomb";
import { updateExplosion } from "./entity/explosion";
import { getPlayerById, hitboxX, hitboxY, onExplosionHitPlayer, removeBomb, updatePlayer } from "./entity/player";
import { onPickup, updatePowerup } from "./entity/powerup";
import { CONTROLS, isHeld, KEY_TIME_LIMIT } from "./helpers/controls";
import { choicePowerups } from "./helpers/factories";
import { addEntity, getAllType, removeEntity } from "./helpers/world";
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
  CellMode,
  GridCoords
  // add others if needed
} from "./model";
import { Msg } from "./msg";
import { Array, HashMap, pipe, Match, HashSet, Option } from "effect";

function _clear_sfx_buffer(model: Model): Model {
  return Model.make({
    ...model,
    sfxBuffer: Array.empty(),
  });
}

const _decay_inputs = (model: Model): Model => {
  const nextInputState = pipe(
    model.inputState,
    HashMap.map((time_left) => time_left - 1),
    HashMap.filter((time_left) => time_left > 0)
  );
  return { ...model, inputState: nextInputState };
};

function _handle_input_for_players(model: Model): Model {
  const { inputState } = model;

  const nextEntities = pipe(
    model.world.entities,
    HashMap.map((entity) =>
      pipe(
        entity,
        Match.value,
        Match.tag("Player", (player) => {
          // Get controls based on player_id
          const controls = CONTROLS[player.player_id];
          if (!controls) return player;

          // get direction
          const dx =
            (isHeld(inputState, controls.right) ? 1 : 0) -
            (isHeld(inputState, controls.left) ? 1 : 0);
          const dy =
            (isHeld(inputState, controls.down) ? 1 : 0) -
            (isHeld(inputState, controls.up) ? 1 : 0);

          // new facing direction
          const newDirection =
            dx > 0
              ? EastDirection.make({ dr: 0, dc: 1 })
              : dx < 0
              ? WestDirection.make({ dr: 0, dc: -1 })
              : dy > 0
              ? SouthDirection.make({ dr: 1, dc: 0 })
              : dy < 0
              ? NorthDirection.make({ dr: -1, dc: 0 })
              : player.directionFacing;

          // Update player
          return {
            ...player,
            vx: dx * player.speed,
            vy: dy * player.speed,
            directionFacing: newDirection,
          };
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

function _update_entities(model: Model): Model {
  const dt = 1 / model.fps;

  let newWorld = model.world;
  let newEvents = model.eventBuffer;
  let newSfx = model.sfxBuffer;
  let newVfx = model.vfxBuffer;
  let newPlayers = model.players;

  for (const [id, ent] of model.world.entities) {
    const [updatedEntity, updateResult] = Match.value(ent).pipe(
      Match.tag("Explosion", (e) => updateExplosion(e, dt)),
      Match.tag("Bomb", (e) => updateBomb(e, dt)),
      Match.tag("Block", (e) => updateBlock(e, dt)),
      Match.tag("Player", (e) => updatePlayer(e, dt)),
      Match.tag("Powerup", (e) => updatePowerup(e, dt)),
      Match.exhaustive
    );

    newWorld = addEntity(newWorld, updatedEntity);
    newEvents = [...newEvents, ...updateResult.events];
    newSfx = [...newSfx, ...updateResult.sounds];
    newVfx = [...newVfx, ...updateResult.animations];
  }
  let nextPlayers = model.players;
  for (const player of model.players) {
    const [updatedPlayer, updateResult] = updatePlayer(player, dt);
    nextPlayers = HashSet.remove(nextPlayers, player);
    nextPlayers = HashSet.add(nextPlayers, updatedPlayer);

    newEvents = [...newEvents, ...updateResult.events];
    newSfx = [...newSfx, ...updateResult.sounds];
    newVfx = [...newVfx, ...updateResult.animations];
  }
  // Return a new model with updated entities and buffers
  return Model.make({
    ...model,
    world: newWorld,
    players: newPlayers,
    eventBuffer: newEvents,
    sfxBuffer: newSfx,
    vfxBuffer: newVfx,
  });
}

function _detonate_bombs(model: Model): Model {
  let newWorld = World.make({ ...model.world });
  let result = UpdateResult.make({
    events: Array.empty(),
    sounds: Array.empty(),
    animations: Array.empty(),
  });
  let newPlayers = model.players;
  const explodingBombs: Bomb[] = Array.filter(
    getAllType(model.world, Bomb),
    (entity) => entity._tag === "Bomb" && shouldDetonate(entity)
  );
  let explosionResult = UpdateResult.make({
    events: Array.empty(),
    sounds: Array.empty(),
    animations: Array.empty(),
  });
  for (const bomb of explodingBombs) {
      [newWorld, explosionResult] = createExplosions(bomb, newWorld);
      
      // Update buffers
      result = {
        ...result,
        events: Array.appendAll(result.events, explosionResult.events),
        sounds: Array.appendAll(result.sounds, explosionResult.sounds),
        animations: Array.appendAll(result.animations, explosionResult.animations),
      };
      let owner: Player = getPlayerById(newPlayers, bomb.owner)!;
      newPlayers = HashSet.remove(newPlayers, owner);
      const updatedOwner = removeBomb(owner, bomb);
      newPlayers = HashSet.add(newPlayers, updatedOwner);
    }
  const expiredBlocks: Entity[] = Array.filter(
    getAllType(newWorld, Block),
    (e) => e.isExpired
  );
  for (const entity of expiredBlocks) {
    newWorld = removeEntity(newWorld, entity)

    result = {...result, animations: Array.append(result.animations,
                  AnimationCmd.make({
                        type: SoftBreakAnimation.make(),
                        mode: CellMode.make({}),
                        a: entity.row,
                        b: entity.col,
                        durationFrames: 60, //not sure about this yet,
                        id: Option.some(entity.id),
                        powerupType: Option.none(),
                      })
                )}
    if (Math.random() * 100 < model.config.powerupSpawnChance) {
      const pw = choicePowerups[Math.floor(Math.random() * choicePowerups.length)]
      result = {...result,
        events: Array.append(result.events, SpawnEvent.make({entity: pw(entity.row, entity.col)}))
       }
    }
  };
  const newEvents = [...model.eventBuffer, ...result.events];
  const newSfx = [...model.sfxBuffer, ...result.sounds];
  const newVfx = [...model.vfxBuffer, ...result.animations];

  return {...model,
    world: newWorld,
    players: newPlayers,
    eventBuffer: newEvents,
    sfxBuffer: newSfx,
    vfxBuffer: newVfx,
  }; /* implement */
}

function _process_events(model: Model): Model {
  let newWorld = model.world;

  Array.map(model.eventBuffer, (event) => {
    Match.value(event).pipe(
      Match.tag("Spawn", ({ entity }) => {newWorld = addEntity(newWorld, entity)}),
      Match.tag("Remove", ({ entity }) => {newWorld = removeEntity(newWorld, entity)})
    );
  });

  return Model.make({
    ...model,
    world: newWorld,
    eventBuffer: Array.empty(),
  });
}

function _checkPlayerOverlap(player: Player, row: number, col: number): boolean {
  const cellX1 = col * 16;
  const cellY1 = row * 16;
  const cellX2 = cellX1 + 16;
  const cellY2 = cellY1 + 16;

  // Player bounds (bottom 16x16)
  const px1 = hitboxX(player);
  const py1 = hitboxY(player);
  const px2 = px1 + 16;
  const py2 = py1 + 16;

  // AABB overlap test
  if (px2 <= cellX1 || px1 >= cellX2) return false;
  if (py2 <= cellY1 || py1 >= cellY2) return false;

  return true;
}

function _check_explosion_powerup_collision(model: Model): Model {
  const explosions = Array.filter([...model.world.entities], (ent) => ent[1]._tag === "Explosion")
  const powerups = Array.filter([...model.world.entities], (ent) => ent[1]._tag === "Powerup")
  let picked: GridCoords[] = []
  let newPlayers = model.players
  let newWorld = model.world
  let results = UpdateResult.make({
    events: Array.empty(),
    sounds: Array.empty(),
    animations: Array.empty(),
  });
  for (const player of model.players) {
    if (player.isExpired) continue;
    for (const explosion of explosions) {
      if (_checkPlayerOverlap(player, explosion[1].row, explosion[1].col)) {
      newPlayers = HashSet.remove(newPlayers, player);
      const updatedPlayer = onExplosionHitPlayer(player)
      newPlayers = HashSet.add(newPlayers, updatedPlayer);
      break
      }
    }
    for (const powerup of powerups) {
      if (powerup[1].isExpired) {
        continue
      }
      let position: GridCoords = [powerup[1].row, powerup[1].col]
      if (Array.contains(picked, position)) {
        continue
      }
      if (_checkPlayerOverlap(player, powerup[1].row, powerup[1].col)) {
        const p = powerup[1] as Powerup
        const [newPlayer, result] = onPickup(p, player)
        newPlayers = HashSet.remove(newPlayers, player);
        newPlayers = HashSet.add(newPlayers, newPlayer);
        results = {...results, events: Array.appendAll(results.events, result.events), 
          sounds: Array.appendAll(results.sounds, result.sounds),
          animations: Array.appendAll(results.animations, result.animations)}
        picked = Array.append(picked, position)
        break
      }
    }
  }

  return {...model, world: newWorld, players: newPlayers, 
    eventBuffer: Array.appendAll(model.eventBuffer,results.events),
  sfxBuffer: Array.appendAll(model.sfxBuffer, results.sounds),
  vfxBuffer: Array.appendAll(model.vfxBuffer, results.animations)
}; /* implement */
}

function _check_round_end_conditions(model: Model): Model {
  // 1. If already transitioning, return early (no change)
  if (model.state._tag === "Transition Model") {
    return model;
  }

  // 2. Timer ran out -> Draw (Time)
  if (model.timer <= 0) {
    const timeDrawResult: RoundResult = {
      outcome: DrawResult.make({}),
      winnerId: Option.none(),
      drawType: Option.some(TimeResult.make({})),
      matchOver: false,
      overallWinnerId: Option.none(),
    };

    /*
    TODO: IMPLEMENT _enter_transition()
    TODO: IMPLEMENT _enter_transition()
    TODO: IMPLEMENT _enter_transition()
    */
    return {
      ...model,
      roundResult: Option.some(timeDrawResult),
      state: TransitionModel.make({}),
    };
  }

  // TODO: IMPLEMENT _alive_players
  const getAlive = (model: Model): Player[] => {
    let alive_players: Player[] = []
    for (const player of model.players) {
      if (player.isAlive) {
        alive_players = Array.append(alive_players, player)
      }
    }
    return alive_players
  };
  const alive = getAlive(model)

  // 3. All dead -> Draw (Death)
  if (alive.length === 0) {
    const deathDrawResult: RoundResult = {
      outcome: DrawResult.make({}),
      winnerId: Option.none(),
      drawType: Option.some(DeathResult.make({})),
      matchOver: false,
      overallWinnerId: Option.none(),
    };

    /*
    TODO: IMPLEMENT _enter_transition()
    TODO: IMPLEMENT _enter_transition()
    TODO: IMPLEMENT _enter_transition()
    */
    return {
      ...model,
      roundResult: Option.some(deathDrawResult),
      state: TransitionModel.make({}),
    };
  }

  // 4. One survivor -> Enter End Delay
  if (alive.length === 1 && model.state._tag !== "EndDelay Model") {
    return {
      ...model,
      tempWinner: alive[0].player_id,
      state: EndDelayModel.make({}),
      winCountdown: model.fps,
    };
  }

  // No conditions met, return model as is
  return model;
}

function _trySpawnBomb(model: Model, player_id_to_place: number): Model {
  return model; // TO IMPLEMENT. add logic for spawning bombs here
}

export const update = (msg: Msg, model: Model) =>
  Match.value(msg).pipe(
    Match.tag("Canvas.MsgTick", () => {
      return pipe(
        model,
        _clear_sfx_buffer,
        _decay_inputs,
        _handle_input_for_players, // to implement: for updating player positions sana
        _update_entities,
        _detonate_bombs,
        _process_events,
        _check_explosion_powerup_collision,
        _process_events,
        _check_round_end_conditions
      );
    }),
    Match.tag("Canvas.MsgKeyDown", ({ key }) => {
      // Pressing Key
      const nextInputState = HashMap.set(model.inputState, key, KEY_TIME_LIMIT);
      let nextModel = { ...model, inputState: nextInputState };

      // Handle BOMB PLACEMENT
      // TO IMPLEMENT. add logic for spawning bombs here
      // TO IMPLEMENT. add logic for spawning bombs here
      // TO IMPLEMENT. add logic for spawning bombs here
      if (CONTROLS[0].bomb.includes(key)) {
        nextModel = _trySpawnBomb(nextModel, 0); // player 1
      }
      // Check P2 Controls
      if (CONTROLS[1].bomb.includes(key)) {
        nextModel = _trySpawnBomb(nextModel, 1); // player 2
      }

      // Toggle DEBUG Mode
      if (key === "Escape") {
        return { ...nextModel, debugMode: !nextModel.debugMode };
      }

      return nextModel;
    }),
    Match.tag("Canvas.MsgMouseDown", () => {
      // Handle pressing of Mouse
      return model;
    }),
    Match.exhaustive
  );
