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
import { Model, SoundType, Entity, Player, AnimationCmd, AnimationType, CoordMode, PowerUpType, BotInternalState, ActiveAnimation } from "./model";
import type { Msg } from "./msg";


// board / constants


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

export const playSfxBuffer = (sfxBuffer: readonly SoundType[]): void => {
  for (const sound of sfxBuffer) {
    playSound(sound);
  }
};

// animation rendering

const renderAnimations = (model: Model): CanvasElement[] => {
  const elements: CanvasElement[] = [];

  for (const anim of model.activeAnimations) {
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

  const totalSpriteFrames = 6;
  const framesPerSpriteFrame = 8;
  
  let spriteFrame = Math.floor(frameCounter / framesPerSpriteFrame);
  spriteFrame = Math.min(spriteFrame, totalSpriteFrames - 1);

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

// helpers
const hasAnimationAtCell = (
  activeAnimations: readonly ActiveAnimation[],
  row: number, 
  col: number, 
  animType: string
): boolean => {
  return activeAnimations.some((anim) => {
    if (anim.cmd.type._tag !== animType) return false;

    return Match.value(anim.cmd.mode).pipe(
      Match.tag("Cell Mode", () => anim.cmd.a === row && anim.cmd.b === col),
      Match.orElse(() => false)
    );
  });
};

const hasPlayerDeathAnimation = (
  activeAnimations: readonly ActiveAnimation[],
  playerId: number
): boolean => {
  return activeAnimations.some((anim) => {
    if (anim.cmd.type._tag !== "Death Animation") return false;
    
    return Option.match(anim.cmd.id, {
      onSome: (id) => id === playerId,
      onNone: () => false,
    });
  });
};

// ui

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

// debug mode

const renderDebugInfo = (model: Model): CanvasElement[] => {
  if (!model.debugMode) return [];

  const elements: CanvasElement[] = [];

  // render debug info for each bot player
  for (const player of model.players) {
    // check if this player is a bot
    const botInternalOption = HashMap.get(model.botInternals, player.id);
    if (Option.isNone(botInternalOption)) continue; // not a bot

    const botInternal = Option.getOrThrow(botInternalOption);
    const config = botInternal.config;
    const memory = botInternal.memory;
    const currentState = botInternal.currentState;

    const botCenterX = player.x + 8;
    const botCenterY = player.y + 8;

    const botTypeText = Match.value(config.botType).pipe(
      Match.tag("Hostile Bot", () => "HOSTILE"),
      Match.tag("Careful Bot", () => "CAREFUL"),
      Match.tag("Greedy Bot", () => "GREEDY"),
      Match.exhaustive
    );

    elements.push(
      Text.make({
        x: botCenterX - botTypeText.length * 2 + 13,
        y: botCenterY + 23,
        text: botTypeText,
        color: "#FFFFFF",
        fontSize: 8,
      })
    );

    const stateText = Match.value(currentState).pipe(
      Match.tag("Wander State", () => "Wander"),
      Match.tag("Escape State", () => "Escape"),
      Match.tag("Get Powerup State", () => "GetPowerup"),
      Match.tag("Attack State", () => "Attack"),
      Match.exhaustive
    );

    elements.push(
      Text.make({
        x: botCenterX - stateText.length * 2 + 12,
        y: botCenterY + 30,
        text: stateText,
        color: "#FFFF00",
        fontSize: 8,
      })
    );

    if (config.dangerRadius > 0) {
      const radiusPixels = config.dangerRadius * TILE_SIZE;
      
      const steps = 32;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const nextAngle = ((i + 1) / steps) * Math.PI * 2;
        
        const x1 = botCenterX + Math.cos(angle) * radiusPixels;
        const y1 = botCenterY + Math.sin(angle) * radiusPixels;
        const x2 = botCenterX + Math.cos(nextAngle) * radiusPixels;
        const y2 = botCenterY + Math.sin(nextAngle) * radiusPixels;
        
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        elements.push(
          SolidRectangle.make({
            x: x1,
            y: y1,
            width: Math.max(length, 1),
            height: 2,
            color: "#FF000080",
          })
        );
      }
    }

    const pathColor = getPathColorForBot(player.id);
    
    for (const [row, col] of memory.path) {
      const [markerX, markerY] = getPathMarkerPosition([row, col], player.id);
      
      elements.push(
        SolidRectangle.make({
          x: markerX,
          y: markerY,
          width: 3,
          height: 3,
          color: pathColor,
        })
      );
    }

    if (Option.isSome(memory.goal)) {
      const [goalRow, goalCol] = Option.getOrThrow(memory.goal);
      const goalX = goalCol * TILE_SIZE + TILE_SIZE / 2 - 4;
      const goalY = goalRow * TILE_SIZE + TILE_SIZE / 2 - 4;
      
      elements.push(
        SolidRectangle.make({
          x: goalX,
          y: goalY,
          width: 8,
          height: 2,
          color: pathColor,
        })
      );
      elements.push(
        SolidRectangle.make({
          x: goalX + 3,
          y: goalY - 3,
          width: 2,
          height: 8,
          color: pathColor,
        })
      );
    }
  }

  return elements;
};

// get path color for each bot 
const getPathColorForBot = (playerId: number): string => {
  switch (playerId) {
    case 0: return "#ffffffff"; // no need (player)
    case 1: return "#FF8800FF"; // p2
    case 2: return "#8800FFFF"; // p3
    case 3: return "#00FFFFFF"; // p4
    default: return "#FFFFFFFF";
  }
};

// get marker position for path cells 
const getPathMarkerPosition = (
  cell: readonly [number, number], 
  playerId: number
): [number, number] => {
  const [row, col] = cell;
  const cellX = col * TILE_SIZE;
  const cellY = row * TILE_SIZE;
  
  switch (playerId) {
    case 0: 
      return [cellX + 1, cellY + 1];
    case 1: 
      return [cellX + TILE_SIZE - 4, cellY + 1];
    case 2: 
      return [cellX + 1, cellY + TILE_SIZE - 4];
    case 3: 
      return [cellX + TILE_SIZE - 4, cellY + TILE_SIZE - 4];
    default:
      return [cellX + 1, cellY + 1];
  }
};

// countdown

const renderCountdown = (model: Model): CanvasElement[] => {
  if (model.state._tag !== "Countdown Model") return [];

  const secondsRemaining = Math.ceil(model.roundStartTimer / model.fps);

  const text =
    secondsRemaining === 3
      ? "Ready"
      : secondsRemaining === 2
      ? "Set"
      : secondsRemaining === 1
      ? "Go!"
      : "";

  if (!text) return [];

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

// result screen

const renderResultScreen = (model: Model): CanvasElement[] => {
  if (Option.isNone(model.roundResult)) return [];

  const result = Option.getOrThrow(model.roundResult);
  const elements: CanvasElement[] = [];

  const centerX = SCREEN_WIDTH / 2;
  let yOffset = 30;

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

  updateAnimationFrame();
  playSfxBuffer(model.sfxBuffer);

  elements.push(
    SolidRectangle.make({
      x: 0,
      y: 0,
      width: screenWidth,
      height: screenHeight,
      color: BACKGROUND_COLOR,
    })
  );

  if (model.state._tag === "Transition Model") {
    elements.push(...renderResultScreen(model));
    return elements;
  }

  HashMap.forEach(model.world.entities, (entity) => {
    if (entity._tag === "Player") return;

    if (entity._tag === "Block" && !entity.isHard) {
      if (hasAnimationAtCell(model.activeAnimations, entity.row, entity.col, "Soft Break Animation")) {
        return;
      }
    }

    if (entity._tag === "Powerup") {
      if (hasAnimationAtCell(model.activeAnimations, entity.row, entity.col, "PowerupBreak Animation")) {
        return;
      }
    }

    const spriteParts = createSpriteForEntity(entity);
    if (spriteParts) {
      const spritePath = Assets.path(spriteParts);
      const x = entity.col * model.tileSize;
      const y = entity.row * model.tileSize;

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

  for (const player of model.players) {
    if (!player.isAlive || hasPlayerDeathAnimation(model.activeAnimations, player.player_id)) {
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

  elements.push(...renderAnimations(model));
  elements.push(...renderUI(model));
  elements.push(...renderCountdown(model));
  elements.push(...renderDebugInfo(model))

  return elements;
}

export const view = canvasView<Model, Msg>(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  FPS,
  "gameScreen",
  (model) => renderGame(model, SCREEN_WIDTH, SCREEN_HEIGHT)
);