import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World,
  UpdateResult,
  RemoveEvent
  // add others if needed
} from "./model";
import { Msg } from "./msg";
import { Array, HashMap, pipe, Match } from "effect";

function _update_entities(model: Model): Model {
  let newEntities = model.world.entities

  // Loop over each entity by its ID
  for (const [id, ent] of model.world.entities) {
    newEntities = Match.value(ent).pipe(
      Match.tag("Explosion", (e) =>
        HashMap.modify(newEntities, id, (_) => {
          // run updateExplosion on e which returns Explosion.make({...e})
          return Explosion.make({...e}) // remove this when implemented na
        }),
      ),
      Match.tag("Bomb", (e) =>
        HashMap.modify(newEntities, id, (_) => {
          // run updateBomb on e which returns Bomb.make({...e})
          return Bomb.make({...e}) // remove this when implemented na

        }),
      ),
      Match.tag("Block", (e) =>
        HashMap.modify(newEntities, id, (_) => {
          return Block.make({...e}) // remove this when implemented na
        }),
      ),
      Match.tag("Player", (e) =>
        HashMap.modify(newEntities, id, (_) => {
          return Player.make({...e}) // remove this when implemented na
          
        }),
      ),
      Match.tag("Powerup", (e) =>
        HashMap.modify(newEntities, id, (_) => {
          return Powerup.make({...e}) // remove this when implemented na
        }),
      ),
      Match.exhaustive,
    )
  }

  // Return a new world object with updated HashMap
  return Model.make({
    ...model,
    world: World.make({
      ...model.world,
      entities: newEntities
    })
  })
}
function _detonate_bombs(model: Model): Model {return model /* implement */ }
function _process_events(model: Model) : Model {return model /* implement */ }
function _check_explosion_powerup_collision(model: Model): Model {return model /* implement */ }
function _remove_expired_entities(model: Model): Model {return model /* implement */ }
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
        _remove_expired_entities,
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

const updateBlock = (dt: number, ent: Block): { entity: Block; result: UpdateResult } => {
  let result = UpdateResult.make({events: [], sounds: [], animations: []})
  
    if (ent.isExpired) {
      result = {
        ...result,
        events: [
          ...result.events,
          RemoveEvent.make({entity: ent})
        ]
      }
    }
  
    return {
      entity: ent,
      result
    }
}