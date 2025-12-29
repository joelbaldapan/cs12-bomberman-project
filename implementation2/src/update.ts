import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
  World
  // add others if needed
} from "./model";
import { Msg } from "./msg";
import { Array, HashMap, pipe, Match } from "effect";

/*
idea:
  TRANSLATE ALL `update()` methods per Python entity,
  And create separate helper functions in typescript that does the same exact thing 
    which returns a new Struct of the updated entity
*/

/*
  NAMING CONVENTION FOR HELPER FUNCTIONS:
    export const update<ENTITY> = ()
*/

// example:
export const updateBomb = (ent: Bomb, dt: number): Bomb => {
  return ent
}

// to consider: what if we make a separate `entity/` directory
// containing the logic for all updating of entitites

export const update = (msg: Msg, model: Model) =>
  Match.value(msg).pipe(
    Match.tag("Canvas.MsgTick", () => {
      // pseudocode:
      //   get all bombs in model: then do updateBomb for all
      //   get all explosions in model: then do updateExpolsion for all
      //   ...
      //   get all <entity> in model: then do update<entity> for all
      // ^ for all of these updates, update their entries in Model
      // then, after allat... return the new Model

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
        world: World.make({
          ...model.world,
          entities: newEntities
        })
      })

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
