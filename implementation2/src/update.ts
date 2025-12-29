import { Model,
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup,
  Entity,
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

      // TODO: add a loop which updates all entities inside world.entitites
      Match.value(ent).pipe(
        Match.tag("Explosion", (ent) => ent),
        Match.tag("Bomb", (ent) => ent),
        Match.tag("Block", (ent) => ent),
        Match.tag("Player", (ent) => ent),
        Match.tag("Powerup", (ent) => ent),
        Match.exhaustive
      )

      return model;
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
