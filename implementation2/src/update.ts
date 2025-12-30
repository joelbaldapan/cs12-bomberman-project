import { updateBomb } from "./entity/Bomb";
import { updateExplosion } from "./entity/Explosion";
import { updatePlayer } from "./entity/Player";
import { updatePowerup } from "./entity/Powerup";
import { addEntity, removeEntity } from "./helpers/world";
import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult,
  RemoveEvent,
  ExplosionSound,
  EventType,
  SoundType,
  AnimationCmd,
  // add others if needed
} from "./model";
import { Msg } from "./msg";
import { Array, HashMap, pipe, Match } from "effect";

function _update_entities(model: Model): Model {
  const dt = 1/model.fps

  let newWorld = model.world;
  let newEvents = model.eventBuffer;
  let newSfx = model.sfxBuffer;
  let newVfx = model.vfxBuffer;

  for (const [id, ent] of model.world.entities) {
    const {updatedEntity, updateResult} = Match.value(ent).pipe(
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

  // Return a new model with updated entities and buffers
  return Model.make({
    ...model,
    world: newWorld,
    eventBuffer: newEvents,
    sfxBuffer: newSfx,
    vfxBuffer: newVfx
  });
}

function _detonate_bombs(model: Model): Model {return model /* implement */ }
function _process_events(model: Model) : Model {
  const newWorld = model.world;

  Array.map(model.eventBuffer, (event) => {
    Match.value(event).pipe(
      Match.tag("Spawn", ({entity}) => addEntity(newWorld, entity)),
      Match.tag("Remove", ({entity}) => removeEntity(newWorld, entity)),
    )})

  return Model.make({
    ...model,
    world: newWorld,
    eventBuffer: Array.empty()
  })
}
function _check_explosion_powerup_collision(model: Model): Model {return model /* implement */ }
function _check_round_end_conditions(model: Model): Model {return model /* implement */ }

export const update = (msg: Msg, model: Model) =>
  Match.value(msg).pipe(
    Match.tag("Canvas.MsgTick", () => {
      pipe(
        model,
        _update_entities,
        _detonate_bombs,
        _process_events ,
        _check_explosion_powerup_collision,
        _process_events,
        _check_round_end_conditions,
      )
    }),
    Match.tag("Canvas.MsgKeyDown", ({ key }): Model => {
      // Handle pressing of Keyboard
      return model;
    }),
    Match.tag("Canvas.MsgMouseDown", () => {
      // Handle pressing of Mouse
      return model;
    }),
    Match.exhaustive,
  );
