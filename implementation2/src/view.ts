import {
  type CanvasElement,
  canvasView,
  OutlinedRectangle,
  SolidRectangle,
  Text,
  CanvasImage,
} from "cs12251-mvu/src/canvas";
import { Array, HashMap, Match, pipe, Option } from "effect";
import { Assets, createSpriteForEntity, updateAnimationFrame } from "./spritemap";
import { Model, SoundType, Entity, Player, AnimationCmd, AnimationType, CoordMode, PowerUpType, BotInternalState } from "./model";
import type { Msg } from "./msg";


//  BOARD / CONSTANTS


const TILE_SIZE = 16;
const ROWS = 15;
const COLS = 13;
const SCREEN_WIDTH = TILE_SIZE * ROWS;
const SCREEN_HEIGHT = TILE_SIZE * COLS;
const FPS = 60;
const BACKGROUND_COLOR = "#70C6A9"; 


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

// ANIMATIONS; initial implementation lang huhums

// animation tracking
type ActiveAnimation = {
  cmd: AnimationCmd;
  frameCounter: number;
};

let activeAnimations: ActiveAnimation[] = [];

export const processAnimations = (vfxBuffer: AnimationCmd[]): void => {
  for (const cmd of vfxBuffer) {
    activeAnimations.push({
      cmd,
      frameCounter: 0,
    });
  }

    activeAnimations = activeAnimations
    .map((anim) => ({
      ...anim,
      frameCounter: anim.frameCounter + 1,
    }))
    .filter((anim) => {
      const maxFrames = getAnimationMaxFrames(anim.cmd);
      return anim.frameCounter < maxFrames;
    });
};

const getAnimationMaxFrames = (cmd: AnimationCmd): number => {
  return Match.value(cmd.type).pipe(
    Match.tag("Death Animation", () => 48),
    Match.tag("Soft Break Animation", () => 15),
    Match.tag("PowerupBreak Animation", () => 15),
    Match.exhaustive
  );
};

// rendering animations
const renderAnimations = (model: Model): CanvasElement[] => {
  const elements: CanvasElement[] = [];

  for (const anim of activeAnimations) {
    const { cmd, frameCounter } = anim;

    Match.value(cmd.type).pipe(
      Match.tag("Death Animation", () => {
        const sprite = renderDeathAnimation(cmd, frameCounter, model.tileSize);
        if (sprite) elements.push(sprite);
      }),
      Match.tag("Soft Break Animation", () => {
        const sprite = renderSoftBreakAnimation(
          cmd,
          frameCounter,
          model.tileSize
        );
        if (sprite) elements.push(sprite);
      }),
      Match.tag("PowerupBreak Animation", () => {
        const sprite = renderPowerupBreakAnimation(
          cmd,
          frameCounter,
          model.tileSize
        );
        if (sprite) elements.push(sprite);
      }),
      Match.exhaustive
    );
  }

  return elements;
};

const renderDeathAnimation = (
  cmd: AnimationCmd,
  frameCounter: number,
  tileSize: number
): CanvasElement | null => {
  if (Option.isNone(cmd.id)) return null;

  const playerId = Option.getOrThrow(cmd.id);
  const spriteFrame = Math.min(Math.floor(frameCounter / 8), 5);

  const [x, y] = Match.value(cmd.mode).pipe(
    Match.tag("Pixel Mode", () => [cmd.a, cmd.b]),
    Match.tag("Cell Mode", () => [cmd.b * tileSize, cmd.a * tileSize]),
    Match.exhaustive
  );

  const spritePath = Assets.path(
    Assets.factory.playerDeath(playerId, spriteFrame)
  );

  return CanvasImage.make({
    x: x,
    y: y - 8,
    src: spritePath,
  });
};

const renderSoftBreakAnimation = (
  cmd: AnimationCmd,
  frameCounter: number,
  tileSize: number
): CanvasElement | null => {
  const spriteFrame = Math.min(Math.floor(frameCounter / 3), 4);

  const [x, y] = Match.value(cmd.mode).pipe(
    Match.tag("Pixel Mode", () => [cmd.a, cmd.b]),
    Match.tag("Cell Mode", () => [cmd.b * tileSize, cmd.a * tileSize]),
    Match.exhaustive
  );

  const spritePath = Assets.path(Assets.factory.softBlockBreak(spriteFrame));

  return CanvasImage.make({
    x: x,
    y: y,
    src: spritePath,
  });
};

const renderPowerupBreakAnimation = (
  cmd: AnimationCmd,
  frameCounter: number,
  tileSize: number
): CanvasElement | null => {
  if (Option.isNone(cmd.powerupType)) return null;

  const powerupType = Option.getOrThrow(cmd.powerupType);
  const spriteFrame = Math.min(Math.floor(frameCounter / 3), 4);

  const [x, y] = Match.value(cmd.mode).pipe(
    Match.tag("Pixel Mode", () => [cmd.a, cmd.b]),
    Match.tag("Cell Mode", () => [cmd.b * tileSize, cmd.a * tileSize]),
    Match.exhaustive
  );

  // blinking effect (placeholder lang)
  if (spriteFrame < 3 && frameCounter % 4 < 2) {
    const typeStr = Match.value(powerupType).pipe(
      Match.tag("Fire Powerup", () => "fire"),
      Match.tag("Bomb Powerup", () => "bomb"),
      Match.tag("Speed Powerup", () => "speed"),
      Match.exhaustive
    );

    const spritePath = Assets.path(Assets.factory.powerup(typeStr, 0));

    return CanvasImage.make({
      x: x,
      y: y,
      src: spritePath,
    });
  }

  return null;
};


// helper

const hasAnimationAtCell = (row: number, col: number, animType: string): boolean => {
  return activeAnimations.some((anim) => {
    const { cmd } = anim;
    if (cmd.type._tag !== animType) return false;

    return Match.value(cmd.mode).pipe(
      Match.tag("Cell Mode", () => cmd.a === row && cmd.b === col),
      Match.tag("Pixel Mode", () => false),
      Match.exhaustive
    );
  });
};

const hasPlayerDeathAnimation = (playerId: number): boolean => {
  return activeAnimations.some((anim) => {
    const { cmd } = anim;
    if (cmd.type._tag !== "Death Animation") return false;
    
    return Option.match(cmd.id, {
      onSome: (id) => id === playerId,
      onNone: () => false,
    });
  });
};


export function renderGame(
  model: Model,
  screenWidth: number,
  screenHeight: number
): CanvasElement[] {
  const elements: CanvasElement[] = [];

  // update animation frame counter 
  updateAnimationFrame(); // update also

  // process sfx and vfx
  // playSfxBuffer(model.sfxBuffer);
  // processAnimations(model.vfxBuffer);   put sa update

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

  // render grid entities
  HashMap.forEach(model.world.entities, (entity) => {
    if (entity._tag === "Player") return;

    // skip blocks with soft break animation
    if (entity._tag === "Block" && !entity.isHard) {
      if (hasAnimationAtCell(entity.row, entity.col, "Soft Break Animation")) {
        return;
      }
    }

    // skip powerups with break animation
    if (entity._tag === "Powerup") {
      if (hasAnimationAtCell(entity.row, entity.col, "PowerupBreak Animation")) {
        return;
      }
    }

    const spriteParts = createSpriteForEntity(entity);
    if (spriteParts) {
      const spritePath = Assets.path(spriteParts);
      const x = entity.col * model.tileSize;
      const y = entity.row * model.tileSize;

      // Simple culling
      if (
        x >= -model.tileSize &&
        x <= screenWidth &&
        y >= -model.tileSize &&
        y <= screenHeight
      ) {
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

  // render players
  for (const player of model.players) {
    if (hasPlayerDeathAnimation(player.player_id)) {
      continue;
    }

    const HEAD_OFFSET = 8;
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

  // render animations
  elements.push(...renderAnimations(model));

  return elements;
}

export const view = canvasView<Model, Msg>(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  FPS,
  "gameScreen",
  (model) => renderGame(model, SCREEN_WIDTH, SCREEN_HEIGHT)
);