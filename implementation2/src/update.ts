import { Model } from "./model";
import { Msg } from "./msg";
import { Array, HashMap, pipe, Match } from "effect";

export const update = (msg: Msg, model: Model) =>
  Match.value(msg).pipe(
    Match.tag("Canvas.MsgTick", () => model),
    Match.tag("Canvas.MsgKeyDown", ({ key }): Model => {
      return model;
    }),
    Match.tag("Canvas.MsgMouseDown", () => model),
    Match.exhaustive,
  );
