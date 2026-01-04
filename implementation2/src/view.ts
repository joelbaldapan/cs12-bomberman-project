import {
  type CanvasElement,
  canvasView,
  OutlinedRectangle,
  SolidRectangle,
  Text,
  CanvasImage,
  OutlinedCircle,
  SolidCircle,
} from "cs12251-mvu/src/canvas";
import { Array, HashMap, Match, pipe, Option } from "effect";
import { Assets, createSpriteForEntity, updateAnimationFrame } from "./spritemap";
import { Model, SoundType, Entity, Player, AnimationCmd, AnimationType, CoordMode, PowerUpType, BotInternalState, ActiveAnimation } from "./model";
import type { Msg } from "./msg";


// TILES AND CONSTANTS
const TILE_SIZE = 128; 
const ROWS = 15;
const COLS = 13;
const SCREEN_WIDTH = TILE_SIZE * ROWS;
const SCREEN_HEIGHT = TILE_SIZE * COLS;
const FPS = 60;
const BACKGROUND_COLOR = "#70C6A9"; 

const FONT_SMALL = Math.floor(TILE_SIZE * 0.25);
const FONT_MEDIUM = Math.floor(TILE_SIZE * 0.5);
const FONT_LARGE = Math.floor(TILE_SIZE * 2);
const HALF_TILE = TILE_SIZE / 2;
const QUARTER_TILE = TILE_SIZE / 4;


// SOUNDS; since MVU canvas framework doesnt have sounds 

export const soundToPath = (sound: SoundType): string =>
  Match.value(sound).pipe(
    Match.tag("Explosion Sound", () => "sounds/explosion.mp3"),
    Match.tag("PowerupGet Sound", () => "sounds/powerup.mp3"),
    Match.tag("Death Sound", () => "sounds/death.mp3"),
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


// bgm

let currentBGM: HTMLAudioElement | null = null;

export const playBGM = (bgmPath: string, loop: boolean = true, volume: number = 1): void => {
  if (currentBGM) {
    currentBGM.pause();
    currentBGM.currentTime = 0;
  }

  currentBGM = new Audio(bgmPath);
  currentBGM.volume = volume;
  currentBGM.loop = loop;
  currentBGM.play().catch(err => {
    console.warn("BGM playback failed:", err);
  });
};

export const stopBGM = (): void => {
  if (currentBGM) {
    currentBGM.pause();
    currentBGM.currentTime = 0;
    currentBGM = null;
  }
};

export const pauseBGM = (): void => {
  if (currentBGM) {
    currentBGM.pause();
  }
};

export const resumeBGM = (): void => {
  if (currentBGM) {
    currentBGM.play().catch(err => {
      console.warn("BGM resume failed:", err);
    });
  }
};

let lastGameState: string | null = null;

export const updateBGM = (model: Model): void => {
  const currentState = model.state._tag;

  if (currentState === lastGameState) return;
  lastGameState = currentState;

  if (currentState === "Countdown Model") {
    playBGM("/sounds/stage_start.mp3", false, 1);
    
    if (currentBGM) {
      currentBGM.onended = () => {
        playBGM("/sounds/battle_bgm.mp3", true, 0.7);
      };
    }
  } else if (currentState === "Playing Model") {
    if (!currentBGM || currentBGM.paused) {
      playBGM("/sounds/battle_bgm.mp3", true, 0.7);
    }
  } else if (currentState === "Transition Model") {
    stopBGM();
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

  const charWidthEstimate = FONT_MEDIUM * 0.6; 
  const textWidth = timerText.length * charWidthEstimate;
  const textHeight = FONT_MEDIUM;
  
  const textX = (SCREEN_WIDTH - textWidth) / 2;
  const textY = TILE_SIZE * 0.1; // Small top padding

  elements.push(
    SolidRectangle.make({
      x: textX - TILE_SIZE * 0.1,
      y: textY - TILE_SIZE * 0.05,
      width: textWidth + TILE_SIZE * 0.2,
      height: textHeight + TILE_SIZE * 0.1,
      color: "#000000ff",
    })
  );

  elements.push(
    Text.make({
      x: textX + TILE_SIZE * 0.75, 
      y: textY + textHeight * 0.8,
      text: timerText,
      color: "#ffe600ff",
      fontSize: FONT_MEDIUM,
        font: "RetroPixel"

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
    // check if alive
    if (!player.isAlive) continue;
    // check if this player is a bot
    const botInternalOption = HashMap.get(model.botInternals, player.id);
    if (Option.isNone(botInternalOption)) continue; // not a bot

    const botInternal = Option.getOrThrow(botInternalOption);
    const config = botInternal.config;
    const memory = botInternal.memory;
    const currentState = botInternal.currentState;

    const botCenterX = player.x + HALF_TILE;
    const botCenterY = player.y + HALF_TILE;

    const botTypeText = Match.value(config.botType).pipe(
      Match.tag("Hostile Bot", () => "HOSTILE"),
      Match.tag("Careful Bot", () => "CAREFUL"),
      Match.tag("Greedy Bot", () => "GREEDY"),
      Match.exhaustive
    );

    elements.push(
      Text.make({
        x: player.x + HALF_TILE,
        y: player.y + TILE_SIZE * 1.5 + 16,
        text: botTypeText,
        color: "#FFFFFF",
        fontSize: FONT_MEDIUM,
        font: "RetroPixel"

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
        x: player.x + HALF_TILE,
        y: player.y + TILE_SIZE * 1.5 + FONT_MEDIUM,
        text: stateText,
        color: "#FFFF00",
        fontSize: FONT_MEDIUM,
        font: "RetroPixel"

      })
    );

    if (config.dangerRadius > 0) {
      const radiusPixels = config.dangerRadius * TILE_SIZE;
        elements.push(
          SolidCircle.make({
            x: botCenterX,
            y: botCenterY,
            radius: radiusPixels,
            color: "#ff000020",
          })
        );
      }
    

    const pathColor = getPathColorForBot(player.id);
    
    const MARKER_SIZE = TILE_SIZE * 0.15;

    for (const [row, col] of memory.path) {
      const [markerX, markerY] = getPathMarkerPosition([row, col], player.id);
      
      elements.push(
        SolidRectangle.make({
          x: markerX,
          y: markerY,
          width: MARKER_SIZE,
          height: MARKER_SIZE,
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
    case 1: return "#326cc3ff"; // p2
    case 2: return "#d62929ff"; // p3
    case 3: return "#eaed48ff"; // p4
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
  
  const OFFSET_NEAR = TILE_SIZE * 0.1;
  const OFFSET_FAR = TILE_SIZE * 0.8;

  switch (playerId) {
    case 0: 
      return [cellX + OFFSET_NEAR, cellY + OFFSET_NEAR];
    case 1: 
      return [cellX + OFFSET_FAR, cellY + OFFSET_NEAR];
    case 2: 
      return [cellX + OFFSET_NEAR, cellY + OFFSET_FAR];
    case 3: 
      return [cellX + OFFSET_FAR, cellY + OFFSET_FAR];
    default:
      return [cellX + OFFSET_NEAR, cellY + OFFSET_NEAR];
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

  const charWidth = FONT_LARGE * 0.6;
  const textWidth = text.length * charWidth;
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;

  return [
    SolidRectangle.make({
      x: centerX - textWidth / 2 - 20,
      y: centerY - FONT_LARGE,
      width: textWidth + 40,
      height: FONT_LARGE * 1.5,
      color: "#000000",
    }),
    Text.make({
      x: centerX,
      y: centerY + FONT_LARGE * 0.1,
      text: text,
      color: "#ffe600ff",
      fontSize: FONT_LARGE,
      font: "RetroPixel"
    }),
  ];
};

// click to start

const renderClickToStart = (model: Model): CanvasElement[] => {
  const elements: CanvasElement[] = [];
  
  const centerX = SCREEN_WIDTH / 2;
  const centerY = SCREEN_HEIGHT / 2;
  
  const titleText = "BOMBERMAN";
  const titleCharWidth = FONT_LARGE * 0.6;
  const titleTextWidth = titleText.length * titleCharWidth;
  
  elements.push(
    Text.make({
      x: centerX - titleTextWidth * 0.0008,
      y: centerY - FONT_LARGE * 0.5,
      text: titleText,
      color: "#ff3b3bff",
      fontSize: FONT_LARGE,
      font: "RetroPixel"
    })
  );
  
  const instructionText = "Click to Start!";
  const instructionCharWidth = FONT_MEDIUM * 0.08;
  const instructionTextWidth = instructionText.length * instructionCharWidth;
  
  const blinkRate = Math.floor(model.globalFrameCount / 30) % 2;
  const textColor = blinkRate === 0 ? "#ffe81eff" : "#FFFFFF";
  
  elements.push(
    Text.make({
      x: centerX - instructionTextWidth * 0.08,
      y: centerY,
      text: instructionText,
      color: textColor,
      fontSize: FONT_LARGE * 0.5,
      font: "RetroPixel"
    })
  );
  
  const subText = "This is required to load all BGM and SFX!";
  const subCharWidth = FONT_SMALL * 0.08;
  const subTextWidth = subText.length * subCharWidth;
  
  elements.push(
    Text.make({
      x: centerX - subTextWidth * 0.08,
      y: centerY + FONT_MEDIUM * 1.5,
      text: subText,
      color: "#191919ff",
      fontSize: FONT_SMALL * 2,
      font: "RetroPixel"
    })
  );

  return elements;
};

// result screen

const renderResultScreen = (model: Model): CanvasElement[] => {
  if (Option.isNone(model.roundResult)) return [];

  const result = Option.getOrThrow(model.roundResult);
  const elements: CanvasElement[] = [];

  const centerX = SCREEN_WIDTH / 2;
  let yOffset = SCREEN_HEIGHT * 0.15; // Proportional offset

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
    Match.tag("Win Result", () => "#2d690aff"),
    Match.tag("Draw Result", () => "#FFFF00"),
    Match.exhaustive
  );

  const charWidth = FONT_MEDIUM * 0.5;

  Match.value(result.outcome).pipe(
    Match.tag("Win Result", () => {
      elements.push(
        Text.make({
          x: centerX - (resultText.length * charWidth) * 0.008,
          y: yOffset,
          text: resultText,
          color: resultColor,
          fontSize: FONT_LARGE * 0.5,
          font: "RetroPixel"
        })
      );
    }),
  Match.tag("Draw Result", () => { 
    elements.push(
      Text.make({
        x: centerX - (resultText.length * charWidth) * 0.03,
        y: yOffset,
        text: resultText,
        color: resultColor,
        fontSize: FONT_LARGE,
        font: "RetroPixel"
      })
    );
  }),
  Match.exhaustive
);


  yOffset += FONT_MEDIUM * 2;

  const scoresTitle = "SCORES";
  elements.push(
    Text.make({
      x: centerX - (scoresTitle.length * charWidth) * 0.07,
      y: yOffset * 1.1,
      text: scoresTitle,
      color: "#af041bff",
      fontSize: FONT_LARGE * 0.5,
      font: "RetroPixel"
    })
  );

  yOffset += FONT_MEDIUM * 1.5;

  const allPlayerIds = Array.fromIterable(HashMap.keys(model.scores));
  const totalPlayers = model.config.numHumanPlayers + model.config.botTypes.length;
  
  for (let playerId = 0; playerId < totalPlayers; playerId++) {
    const score = HashMap.get(model.scores, playerId);
    const scoreValue = Option.getOrElse(score, () => 0);
    const scoreText = `P${playerId + 1}: ${scoreValue}`;

    elements.push(
      Text.make({
        x: centerX - (scoreText.length * charWidth) * 0.08,
        y: yOffset * 1.2,
        text: scoreText,
        color: "#FFFFFF",
        fontSize: FONT_MEDIUM * 2,
        font: "RetroPixel"
      })
    );

    yOffset += FONT_SMALL * 3;
  }

  if (result.matchOver && Option.isSome(result.overallWinnerId)) {
    yOffset += FONT_MEDIUM;
    const winnerId = Option.getOrThrow(result.overallWinnerId);
    const winnerText = `Player ${winnerId + 1} Wins the Match!`;

    elements.push(
      Text.make({
        x: centerX - 30,
        y: yOffset,
        text: winnerText,
        color: "#FFD700",
        fontSize: FONT_LARGE,
        font: "RetroPixel"
      })
    );
  } else {
    yOffset += FONT_MEDIUM;
    const instruction = "Press ESC to continue";

    elements.push(
      Text.make({
        x: centerX - (instruction.length * charWidth) * 0.008,
        y: yOffset * 1.2,
        text: instruction,
        color: "#fff700d1",
        fontSize: FONT_MEDIUM * 2,
        font: "RetroPixel"
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
  updateBGM(model);

  elements.push(
    SolidRectangle.make({
      x: 0,
      y: 0,
      width: screenWidth,
      height: screenHeight,
      color: BACKGROUND_COLOR,
    })
  );

  // Show click to start screen if game hasn't started
  if (!model.startedGame) {
    elements.push(...renderClickToStart(model));
    return elements;
  }

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
      const x = entity.col * TILE_SIZE;
      const y = entity.row * TILE_SIZE;

      if (
        x >= -TILE_SIZE &&
        x <= screenWidth &&
        y >= -TILE_SIZE &&
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
          x: player.x + TILE_SIZE * 0.5,
          y: player.y - TILE_SIZE * 0.1,
          text: label,
          color: "#ffffffff",
          fontSize: FONT_SMALL * 2,
          font: "RetroPixel"
        })
      );
    }
  }

  elements.push(...renderAnimations(model));
  elements.push(...renderUI(model));
  elements.push(...renderCountdown(model));
  elements.push(...renderDebugInfo(model));

  return elements;
}

export const view = canvasView<Model, Msg>(
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  FPS,
  "gameScreen",
  (model) => renderGame(model, SCREEN_WIDTH, SCREEN_HEIGHT)
);