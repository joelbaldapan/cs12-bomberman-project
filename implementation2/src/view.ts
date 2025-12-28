import {
  type CanvasElement,
  canvasView,
  OutlinedRectangle,
  SolidRectangle,
  Text,
  CanvasImage,
} from "cs12251-mvu/src/canvas";
import { Array, HashMap, pipe, Struct } from "effect";
import { Model } from "./model";
import type { Msg } from "./msg";


export function renderScreenAndSound(
  model: Model,
  screenWidth: number,
  screenHeight: number,
): CanvasElement[] {
  // to implement
}

// to implement settings blah blah
export const view = canvasView<Model, Msg>(
  settings.game.screen.width,
  settings.game.screen.height,
  settings.game.fps,
  "gameScreen",
  (model) =>
    renderScreenAndSound(
      model,
      settings.game.screen.width,
      settings.game.screen.height,
    ),
);