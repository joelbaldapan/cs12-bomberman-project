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
  audio.volume = 0.5;
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
        const sprite = renderSoftBreakAnimation(cmd, frameCounter, model.tileSize);
        if (sprite) elements.push(sprite);
      }),
      Match.tag("PowerupBreak Animation", () => {
        const sprite = renderPowerupBreakAnimation(cmd, frameCounter, model.tileSize);
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

  const spritePath = Assets.path(Assets.factory.playerDeath(playerId, spriteFrame));

  return CanvasImage.make({
    x: x,
    y: y,
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

// ui timer

const renderUI = (model: Model): CanvasElement[] => {
  const elements: CanvasElement[] = [];

  const timerSeconds = Math.floor(model.timer / model.fps);
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timerText = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  const textWidth = timerText.length * 4;
  const textHeight = 6;
  const textX = (SCREEN_WIDTH - textWidth) / 2;
  const textY = 4;

  elements.push(
    SolidRectangle.make({
      x: textX - 3,
      y: textY - 2,
      width: textWidth + 6,
      height: textHeight + 5,
      color: "#000000ff",
    })
  );

  elements.push(
    Text.make({
      x: textX + 10,
      y: textY + 6.5,
      text: timerText,
      color: "#ffe600ff",
      fontSize: 8,
    })
  );

  return elements;
};

// countdown

const renderCountdown = (model: Model): CanvasElement[] => {
  if (model.state._tag !== "Countdown Model") return [];

  const secondsRemaining = 3;

  const text =
    secondsRemaining === 3
      ? "Ready"
      : secondsRemaining === 2
      ? "Set"
      : secondsRemaining === 1
      ? "Go!"
      : String(secondsRemaining);

  const textWidth = text.length * 4;
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;

  return [
    SolidRectangle.make({
      x: centerX - textWidth / 2 - 4,
      y: centerY - 4,
      width: textWidth + 16,
      height: 14,
      color: "#000000",
    }),
    Text.make({
      x: centerX - textWidth / 2 + 14,
      y: centerY + 8,
      text: text,
      color: "#ffe600ff",
      fontSize: 12,
    }),
  ];
};


// result screen rendering

const renderResultScreen = (model: Model): CanvasElement[] => {
  if (Option.isNone(model.roundResult)) return [];

  const result = Option.getOrThrow(model.roundResult);
  const elements: CanvasElement[] = [];

  const centerX = SCREEN_WIDTH / 2;
  let yOffset = 30;

  // results
  const resultText = Match.value(result.outcome).pipe(
    Match.tag("Win Result", () => {
      const winnerId = Option.getOrElse(result.winnerId, () => -1);
      return `Player ${winnerId + 1} Wins the Round!`;
    }),
    Match.tag("Draw Result", () => {
      return Option.match(result.drawType, {
        onSome: (drawType) =>
          Match.value(drawType).pipe(
            Match.tag("Time Result", () => "Time Out - Draw!"),
            Match.tag("Death Result", () => "Draw!"),
            Match.exhaustive
          ),
        onNone: () => "Draw!",
      });
    }),
    Match.exhaustive
  );

  const resultColor = Match.value(result.outcome).pipe(
    Match.tag("Win Result", () => "#00FF00"),
    Match.tag("Draw Result", () => "#FFFF00"),
    Match.exhaustive
  );

  elements.push(
    Text.make({
      x: centerX - (resultText.length * 4) / 2 + 50,
      y: yOffset,
      text: resultText,
      color: resultColor,
      fontSize: 12,
    })
  );

  yOffset += 20;

  // scores
  const scoresTitle = "SCORES";
  elements.push(
    Text.make({
      x: centerX - (scoresTitle.length * 4) / 2 + 10,
      y: yOffset,
      text: scoresTitle,
      color: "#FFFFFF",
      fontSize: 10,
    })
  );

  yOffset += 15;

  // individual scores
  for (let playerId = 0; playerId < 4; playerId++) {
    const score = HashMap.get(model.scores, playerId);
    const scoreValue = Option.getOrElse(score, () => 0);
    const scoreText = `P${playerId + 1}: ${scoreValue}`;

    elements.push(
      Text.make({
        x: centerX - (scoreText.length * 4) / 2 + 10,
        y: yOffset,
        text: scoreText,
        color: "#FFFFFF",
        fontSize: 8,
      })
    );

    yOffset += 10;
  }

  // match over
  if (result.matchOver && Option.isSome(result.overallWinnerId)) {
    yOffset += 10;
    const winnerId = Option.getOrThrow(result.overallWinnerId);
    const winnerText = `Player ${winnerId + 1} Wins the Match!`;

    elements.push(
      Text.make({
        x: centerX - (winnerText.length * 4) / 2,
        y: yOffset,
        text: winnerText,
        color: "#FFD700",
        fontSize: 12,
      })
    );
  } else {
    yOffset += 15;
    const instruction = "Press ESC to continue";

    elements.push(
      Text.make({
        x: centerX - (instruction.length * 4) / 2 + 40,
        y: yOffset,
        text: instruction,
        color: "#ffffffff",
        fontSize: 8,
      })
    );
  }

  return elements;
};

// main game render

export function renderGame(
  model: Model,
  screenWidth: number,
  screenHeight: number
): CanvasElement[] {
  const elements: CanvasElement[] = [];

  // update animation
  updateAnimationFrame();

  // TODO: handled sa update
  // playSfxBuffer(model.sfxBuffer);
  // processAnimations(model.vfxBuffer);

  //bg
  elements.push(
    SolidRectangle.make({
      x: 0,
      y: 0,
      width: screenWidth,
      height: screenHeight,
      color: BACKGROUND_COLOR,
    })
  );

  // transition screen
  if (model.state._tag === "Transition Model") {
    elements.push(...renderResultScreen(model));
    return elements;
  }

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

      // simple culling
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

  // render players (16x24 sprites, hitbox is bottom 16x16)
  for (const player of model.players) {
    // skip if death animation is playing
    if (hasPlayerDeathAnimation(player.player_id)) {
      continue;
    }

    const spriteParts = createSpriteForEntity(player);

    if (spriteParts) {
      const spritePath = Assets.path(spriteParts);
      elements.push(
        CanvasImage.make({
          x: player.x,
          y: player.y,
          src: spritePath,
        })
      );

      // player label (P1, P2, etc.)
      const label = `P${player.player_id + 1}`;
      elements.push(
        Text.make({
          x: player.x + 7,
          y: player.y - 4,
          text: label,
          color: "#FF0000",
          fontSize: 8,
        })
      );
    }
  }

  // render animations (on top of entities)
  elements.push(...renderAnimations(model));

  // render UI
  elements.push(...renderUI(model));

  // render countdown
  elements.push(...renderCountdown(model));

  return elements;
}

export const view = canvasView<Model, Msg>(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  FPS,
  "gameScreen",
  (model) => renderGame(model, SCREEN_WIDTH, SCREEN_HEIGHT)
);