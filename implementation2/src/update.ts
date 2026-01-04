import { Array, HashMap, pipe, Match, HashSet, Option } from "effect";
import { playerSpeed } from "./entity/player";
import {
  Model,
  PlayingModel,
  TimeResult,
  DeathResult,
  EastDirection,
  WestDirection,
  SouthDirection,
  NorthDirection,
  Player,
  World,
  CountdownModel,
} from "./model";
import { Msg } from "./msg";
import {
  finalizeRound,
  updateBots,
  updateEntities,
  detonateBombs,
  processEvents,
  checkExplosionPowerupCollision,
  resolveBombPassthrough,
  checkRoundEndConditions,
  processNewAnimations,
  updateAnimations,
  startNewRound,
  trySpawnBomb,
} from "./helpers/tick_game";
import { CONTROLS, isHeld } from "./helpers/controls";

function updateTimers(model: Model, dt: number): Model {
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
          return finalizeRound(
            model,
            Option.some(model.tempWinner),
            Option.none()
          );
        } else {
          if (model.timer <= 0) {
            return finalizeRound(
              model,
              Option.none(),
              Option.some(TimeResult.make({}))
            );
          } else {
            return finalizeRound(
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

function clearSfxBuffer(model: Model): Model {
  return Model.make({
    ...model,
    sfxBuffer: Array.empty(),
  });
}

function handleInputForPlayers(model: Model): Model {
  const { inputState } = model;

  let nextEntities = model.world.entities;

  for (const player of model.players) {
    const controls = CONTROLS[player.player_id];
    if (!controls) continue;

    const right = isHeld(inputState, controls.right);
    const left = isHeld(inputState, controls.left);
    const down = isHeld(inputState, controls.down);
    const up = isHeld(inputState, controls.up);

    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    let dy = (down ? 1 : 0) - (up ? 1 : 0);

    if (dx !== 0 && dy !== 0) dy = 0;

    if (dx === 0 && dy === 0 && player.vx === 0 && player.vy === 0) continue;

    let newDirection = player.directionFacing;
    if (dx > 0) newDirection = EastDirection.make({ dr: 0, dc: 1 });
    else if (dx < 0) newDirection = WestDirection.make({ dr: 0, dc: -1 });
    else if (dy > 0) newDirection = SouthDirection.make({ dr: 1, dc: 0 });
    else if (dy < 0) newDirection = NorthDirection.make({ dr: -1, dc: 0 });

    const newPlayer = Player.make({
      ...player,
      vx: dx * playerSpeed(player),
      vy: dy * playerSpeed(player),
      directionFacing: newDirection,
    });

    nextEntities = HashMap.set(nextEntities, player.id, newPlayer);
  }

  return {
    ...model,
    world: World.make({
      ...model.world,
      entities: nextEntities,
    }),
  };
}

/*
NOTE: All these helper functions are defined in `tick_game.ts`
*/

function tickGame(model: Model, dt: number): Model {
  if (
    model.state._tag === "Transition Model" ||
    model.state._tag === "Countdown Model"
  ) {
    return model;
  }
  // handle main logic IFF the game is ongoing
  return pipe(
    model,
    (m) => updateBots(m, dt),
    (m) => updateEntities(m, dt),
    detonateBombs,
    processEvents,
    checkExplosionPowerupCollision,
    resolveBombPassthrough,
    processEvents,
    checkRoundEndConditions,
    processNewAnimations,
    updateAnimations
  );
}

export const update = (msg: Msg, model: Model) =>
  Match.value(msg).pipe(
    Match.tag("Canvas.MsgTick", () => {
      const now = Date.now();
      let lastTick = model.lastTick;
      if (now - lastTick > 1000) {
        lastTick = now;
      }
      const elapsedMS = now - lastTick;
      const EXPECTED_FRAME_MS = 1000 / model.fps;

      // Calculate how many frames have passed IRL!
      let dt = Math.floor(elapsedMS / EXPECTED_FRAME_MS);
      const MAX_DT = 9.0;
      dt = Math.min(dt, MAX_DT);
      dt = Math.max(dt, 1);

      const nextModel = pipe(
        model,
        clearSfxBuffer,
        handleInputForPlayers,
        (m) => updateTimers(m, dt),
        (m) => tickGame(m, dt)
      );

      return Model.make({ ...nextModel, lastTick: now });
    }),
    Match.tag("Canvas.MsgKeyDown", ({ key }) => {
      const nextInputState = HashSet.add(model.inputState, key);
      let nextModel = { ...model, inputState: nextInputState };

      if (key === "Escape") {
        if (nextModel.state._tag === "Transition Model") {
          const isMatchOver = Option.getOrElse(
            Option.map(nextModel.roundResult, (r) => r.matchOver),
            () => false
          );

          if (isMatchOver) {
            console.log("GAME OVER");
            return nextModel;
          }

          return startNewRound(nextModel);
        }
        if (nextModel.state._tag === "Countdown Model") {
          return nextModel;
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
        nextModel = trySpawnBomb(nextModel, 0);
      if (CONTROLS[1].bomb.includes(key))
        nextModel = trySpawnBomb(nextModel, 1);

      return nextModel;
    }),
    Match.tag("Canvas.MsgKeyUp", ({ key }) => {
      const nextInputState = HashSet.remove(model.inputState, key);
      return { ...model, inputState: nextInputState };
    }),
    Match.tag("Canvas.MsgMouseDown", () => {
      if (model.startedGame) return model;
      return Model.make({
        ...model,
        startedGame: true,
        state: CountdownModel.make({}),
      });
    }),
    Match.tag("Canvas.MsgMouseUp", () => {
      return model;
    }),
    Match.exhaustive
  );
