import {
  type CanvasElement,
  canvasView,
  OutlinedRectangle,
  SolidRectangle,
  Text,
  CanvasImage,
} from "cs12251-mvu/src/canvas";
import { Array, HashMap, Match, pipe, Option } from "effect";
import { Assets, createSpriteForEntity } from "./spritemap";
import { Model, SoundType, Entity, Player } from "./model";
import type { Msg } from "./msg";


// SOUNDS; since MVU canvas framework doesnt have sounds 

export const soundToPath = (sound: SoundType): string =>
  Match.value(sound).pipe(
    Match.tag("Explosion Sound", () => "/assets/sounds/explosion.mp3"),
    Match.tag("PowerupGet Sound", () => "/assets/sounds/powerup.mp3"),
    Match.tag("Death Sound", () => "/assets/sounds/death.mp3"),
    Match.exhaustive
  );

export const playSound = (sound: SoundType): void => {
  const audio = new Audio(soundToPath(sound));
  audio.currentTime = 0;
  audio.play();
};

export const playSfxBuffer = (sfxBuffer: SoundType[]): void => {
  for (const sound of sfxBuffer) {
    playSound(sound);
  }
};


//  BOARD


const TILE_SIZE = 16;
const ROWS = 15;
const COLS = 13;
const SCREEN_WIDTH = TILE_SIZE * ROWS;
const SCREEN_HEIGHT = TILE_SIZE * COLS;
const FPS = 60;
const BACKGROUND_COLOR = "#70C6A9"; 

export function renderGame(
  model: Model,
  screenWidth: number,
  screenHeight: number
): CanvasElement[] {
  const elements: CanvasElement[] = [];

  // bg
  elements.push(
    SolidRectangle.make({
      x: 0,
      y: 0,
      width: screenWidth,
      height: screenHeight,
      color: BACKGROUND_COLOR,
    })
  );

  // grid entities
  HashMap.forEach(model.world.entities, (entity) => {
    const spriteParts = createSpriteForEntity(entity);

    if (spriteParts && entity._tag != "Player") {
      const spritePath = Assets.path(spriteParts);
      
      const x = entity.col * model.tileSize;
      const y = entity.row * model.tileSize;

      // Simple culling
      if (x >= -model.tileSize && x <= screenWidth && y >= -model.tileSize && y <= screenHeight) {
        elements.push(
          CanvasImage.make({
            x: x,
            y: y,
            src: spritePath,
          })
        );
      }
    }
  });

  // players
  for (const player of model.players) {
    const HEAD_OFFSET = 8
    const spriteParts = createSpriteForEntity(player);

    if (spriteParts) {
      const spritePath = Assets.path(spriteParts);
      elements.push(
        CanvasImage.make({
          x: player.x,
          y: player.y - HEAD_OFFSET,
          src: spritePath,
        })
      );
    }
  }

  return elements;
}

export const view = canvasView<Model, Msg>(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  FPS,
  "gameScreen",
  (model) => renderGame(model, SCREEN_WIDTH, SCREEN_HEIGHT)
);