import { Model } from "./model";
import { Msg } from "./msg";
import { Array, HashMap, pipe, Match } from "effect";

/*
idea:
  TRANSLATE ALL `update()` methods per Python entity,
  And create separate helper functions in typescript that does the same exact thing 
    which returns a new Struct of the updated entity
*/

export const update = (msg: Msg, model: Model) =>
  Match.value(msg).pipe(
    Match.tag("Canvas.MsgTick", () => model),
    Match.tag("Canvas.MsgKeyDown", ({ key }): Model => {
      return model;
    }),
    Match.tag("Canvas.MsgMouseDown", () => model),
    Match.exhaustive,
  );
