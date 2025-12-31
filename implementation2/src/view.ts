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
import * as settings from "../settings.json";


const SCREEN_WIDTH = 1
const SCREEN_HEIGHT = 1
const FPS = 1

// we display sprites like this (example):
// Where `en` = entity
// CanvasImage.make({
//   x: en.x,
//   y: en.y, 
//   src: asserts.images.<name of entity>
// }),

export function renderScreenAndSound(
  model: Model,
  screenWidth: number,
  screenHeight: number,
): CanvasElement[] {
  // to implement
}

// to implement settings blah blah
export const view = canvasView<Model, Msg>(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  FPS,
  "gameScreen",
  (model) =>
    renderScreenAndSound(
      model,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
    ),
);