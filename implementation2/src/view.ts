import {
  type CanvasElement,
  canvasView,
  OutlinedRectangle,
  SolidRectangle,
  Text,
  CanvasImage,
} from "cs12251-mvu/src/canvas";
import { Array, HashMap, Match, pipe, Struct } from "effect";
import { Assets, createSpriteForEntity } from "./spritemap";
import { Model, SoundType, Entity } from "./model";
import type { Msg } from "./msg";
import * as settings from "../settings.json";

// FOR SOUNDS:
export const soundToPath = (sound: SoundType): string =>
  Match.value(sound).pipe(
    Match.tag("Explosion Sound", () => "/assets/sounds/explosion.mp3"),
    Match.tag("PowerupGet Sound", () => "/assets/sounds/powerup.mp3"),
    Match.tag("Death Sound", () => "/assets/sounds/death.mp3"),
    Match.exhaustive,
  )

export const playSound = (sound: SoundType): void => {
  const audio = new Audio(soundToPath(sound))
  audio.currentTime = 0
  audio.play()
}

export const playSfxBuffer = (sfxBuffer: SoundType[]): void => {
  for (const sound of sfxBuffer) {
    playSound(sound)
  }
}

const SCREEN_WIDTH = 1
const SCREEN_HEIGHT = 1
const FPS = 1

// we display sprites like this (example):
// Where `en` = entity
// CanvasImage.make({
//   x: en.x,
//   y: en.y, 
//   src: "assets/sprites/<entity>.png"
// }),

export function renderScreenAndSound(
  model: Model,
  screenWidth: number,
  screenHeight: number,
): CanvasElement[] {
  const elements: CanvasElement[] = [];
  // background
  elements.push(SolidRectangle.make({ 
    x: 0, y: 0,
    width: screenWidth,
    height: screenHeight,
    color: "#2C3E50"
  }));
  
  // all entities
  HashMap.forEach(model.world.entities, (entity: Entity, id: number) => {
    const sprite = createSpriteForEntity(entity);
    if (sprite) {
      const spritePath = Assets.path(sprite);
      
      // grid -> pixel
      const pixelX = entity.col * model.tileSize;
      const pixelY = entity.row * model.tileSize;
      
      elements.push(CanvasImage.make({
        x: pixelX,
        y: pixelY,
        src: spritePath,
        width: model.tileSize,
        height: model.tileSize
      }));
    }
  });
  
  // player rendering
  for (const player of model.players) {
    const sprite = createSpriteForEntity(player);
    if (sprite) {
      const spritePath = Assets.path(sprite);
      
      elements.push(CanvasImage.make({
        x: player.x,
        y: player.y,
        src: spritePath,
        width: player.width,
        height: player.height
      }));
    }
  }

  // TODO: UI
  
  return elements;
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