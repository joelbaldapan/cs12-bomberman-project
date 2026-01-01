import { Schema as S, Match, pipe, Option } from "effect";
import {
  Player,
  Block,
  Bomb,
  Explosion,
  Direction,
  PowerUpType,
  ExplosionOrientation,
  Entity,
  Powerup,
} from "./model";

export type SpriteParts = typeof SpriteParts.Type;

export const SpriteParts = S.Union(
  // blocks
  S.TaggedStruct("BlockSprite", {
    name: S.String,
  }),
  // on hit w explosion animation
  S.TaggedStruct("SoftBlockBreakSprite", {
    frame: S.Int,
  }),
  // bomb animation
  S.TaggedStruct("BombSprite", {
    frame: S.Int,
  }),
  // explosion
  S.TaggedStruct("ExplosionSprite", {
    shape: S.String, // "middle", "segment", "end"
    direction: S.Option(S.String), // "north", "south", "east", "west"
    frame: S.Int,
  }),
  // powerups
  S.TaggedStruct("PowerupSprite", {
    type: S.String,
    frame: S.Int,
  }),
  // player
  S.TaggedStruct("PlayerSprite", {
    playerId: S.Int,
    direction: S.String,
    isMoving: S.Option(S.Boolean),
    walkFrame: S.Option(S.Int),
  }),
  // player death animation
  S.TaggedStruct("PlayerDeathSprite", {
    playerId: S.Int,
    frame: S.Int,
  })
);

const [
  BlockSprite,
  SoftBlockBreakSprite,
  BombSprite,
  ExplosionSprite,
  PowerupSprite,
  PlayerSprite,
  PlayerDeathSprite,
] = SpriteParts.members;

export type BlockSprite = typeof BlockSprite.Type;
export type SoftBlockBreakSprite = typeof SoftBlockBreakSprite.Type;
export type BombSprite = typeof BombSprite.Type;
export type ExplosionSprite = typeof ExplosionSprite.Type;
export type PowerupSprite = typeof PowerupSprite.Type;
export type PlayerSprite = typeof PlayerSprite.Type;
export type PlayerDeathSprite = typeof PlayerDeathSprite.Type;

// Helper to map 0-based IDs to folder names (p1, p2...)
const getPlayerFolder = (id: number) => `p${id + 1}`;

export const Assets = {
  orig: "/assets/images/sprites/",
  path: (part: SpriteParts | string): string => {
    if (typeof part === "string") {
      return `${Assets.orig}${part}.png`;
    }
    return pipe(
      part,
      Match.value,
      Match.tag("BlockSprite", (sprite: BlockSprite) => {
        // example: assets/images/blocks/hard_block.png
        return `${Assets.orig}blocks/${sprite.name}_block.png`;
      }),
      Match.tag("SoftBlockBreakSprite", (sprite: SoftBlockBreakSprite) => {
        // example:  assets/images/blocks/soft_on_hit_2.png
        const frameNum = Math.min(sprite.frame, 4) + 1;
        return `${Assets.orig}blocks/soft_on_hit_${frameNum}.png`;
      }),
      Match.tag("BombSprite", (sprite: BombSprite) => {
        // example:  assets/images/bombs/bomb_frame_1.png
        const frameNum = (sprite.frame % 3) + 1;
        return `${Assets.orig}bombs/bomb_frame_${frameNum}.png`;
      }),
      Match.tag("ExplosionSprite", (sprite: ExplosionSprite) => {
        // example: explosion_north_end_1.png or explosion_middle_1.png
        const frameNum = (sprite.frame % 4) + 1;

        if (sprite.shape === "middle") {
          return `${Assets.orig}explosions/explosion_middle_${frameNum}.png`;
        }

        // If not middle, we need direction (e.g., "north") + shape ("end" or "segment")
        const dir = Option.getOrElse(sprite.direction, () => "north"); // fallback
        return `${Assets.orig}explosions/explosion_${dir}_${sprite.shape}_${frameNum}.png`;
      }),
      Match.tag("PowerupSprite", (sprite: PowerupSprite) => {
        // example: assets/images/powerups/powerup_fire.png (No animation in tree)
        return `${Assets.orig}powerups/powerup_${sprite.type}.png`;
        // IMPORTANT: UNCOMMENT BELOW IF MAY ANIMATION NA TAYO:
        // IMPORTANT: UNCOMMENT BELOW IF MAY ANIMATION NA TAYO:
        // IMPORTANT: UNCOMMENT BELOW IF MAY ANIMATION NA TAYO:
        // const frameNum = (sprite.frame % 2) + 1;
        // return `${Assets.orig}powerups/powerup_${sprite.type}_${frameNum}.png`;
      }),
      Match.tag("PlayerSprite", (sprite: PlayerSprite) => {
        // example: assets/images/players/p1/walk_north_1.png
        const folder = getPlayerFolder(sprite.playerId);
        const isMoving = Option.getOrElse(sprite.isMoving, () => false);
        const walkFrame = Option.getOrElse(sprite.walkFrame, () => 0);

        if (isMoving) {
          const walkFrameNum = (walkFrame % 2) + 1;
          return `${Assets.orig}players/${folder}/walk_${sprite.direction}_${walkFrameNum}.png`;
        } else {
          return `${Assets.orig}players/${folder}/${sprite.direction}.png`;
        }
      }),
      Match.tag("PlayerDeathSprite", (sprite: PlayerDeathSprite) => {
        const folder = getPlayerFolder(sprite.playerId);
        const frameNum = Math.min(sprite.frame, 5) + 1;
        return `${Assets.orig}players/${folder}/death_${frameNum}.png`;
      }),
      Match.exhaustive
    );
  },
  factory: {
    block: (name: string): BlockSprite => BlockSprite.make({ name }), // name should be "hard" or "soft"

    softBlockBreak: (frame: number): SoftBlockBreakSprite =>
      SoftBlockBreakSprite.make({ frame }),

    bomb: (frame: number): BombSprite => BombSprite.make({ frame }),

    explosion: (
      shape: string,
      direction: string | null,
      frame: number
    ): ExplosionSprite =>
      ExplosionSprite.make({
        shape,
        direction: Option.fromNullable(direction),
        frame,
      }),

    powerup: (type: string, frame: number): PowerupSprite =>
      PowerupSprite.make({ type, frame }),

    player: (playerId: number, direction: string): PlayerSprite =>
      PlayerSprite.make({
        playerId,
        direction,
        isMoving: Option.none(),
        walkFrame: Option.none(),
      }),

    playerWalk: (
      playerId: number,
      direction: string,
      walkFrame: number
    ): PlayerSprite =>
      PlayerSprite.make({
        playerId,
        direction,
        isMoving: Option.some(true),
        walkFrame: Option.some(walkFrame),
      }),

    playerDeath: (playerId: number, frame: number): PlayerDeathSprite =>
      PlayerDeathSprite.make({ playerId, frame }),
  },
};

export const directionToStr = (direction: Direction): string =>
  pipe(
    direction,
    Match.value,
    Match.tag("North Direction", () => "north"),
    Match.tag("South Direction", () => "south"),
    Match.tag("East Direction", () => "east"),
    Match.tag("West Direction", () => "west"),
    Match.exhaustive
  );

export const powerupToStr = (powerupType: PowerUpType): string =>
  pipe(
    powerupType,
    Match.value,
    Match.tag("Fire Powerup", () => "fire"),
    Match.tag("Bomb Powerup", () => "bomb"),
    Match.tag("Speed Powerup", () => "speed"),
    Match.exhaustive
  );

export const createSpriteForEntity = (entity: Entity): SpriteParts | null => {
  return pipe(
    entity,
    Match.value,
    Match.tag("Player", (player: Player) => {
      // check if dead logic can be added here if Player model tracks it
      // foor now assuming alive:
      const direction = directionToStr(player.directionFacing);
      const isMoving = player.vx !== 0 || player.vy !== 0;
      if (isMoving) {
        const walkFrame = Math.floor(Date.now() / 200) % 2;
        return Assets.factory.playerWalk(
          player.player_id,
          direction,
          walkFrame
        );
      }
      return Assets.factory.player(player.player_id, direction);
    }),
    Match.tag("Bomb", () => {
      const frame = Math.floor(Date.now() / 300) % 3;
      return Assets.factory.bomb(frame);
    }),
    Match.tag("Explosion", (explosion: Explosion) => {
      const frame = Math.min(explosion.currentTimer, 3);

      return pipe(
        explosion.orientation,
        Match.value,
        // CENTER
        Match.tag("Center Explosion", () =>
          Assets.factory.explosion("middle", null, frame)
        ),
        // VERTICAL (North/South)
        Match.tag("Vertical Explosion", () => {
          // Check if it's an end piece
          return pipe(
            explosion.terminalDirection,
            Option.match({
              onNone: () => Assets.factory.explosion("segment", "north", frame),
              onSome: (dir) =>
                Assets.factory.explosion("end", directionToStr(dir), frame),
            })
          );
        }),
        // HORIZONTAL (East/West)
        Match.tag("Horizontal Explosion", () => {
          return pipe(
            explosion.terminalDirection,
            Option.match({
              onNone: () => Assets.factory.explosion("segment", "east", frame),
              onSome: (dir) =>
                Assets.factory.explosion("end", directionToStr(dir), frame),
            })
          );
        }),
        Match.exhaustive
      );
    }),
    Match.tag("Powerup", (powerup: Powerup) => {
      const type = powerupToStr(powerup.powerupType);

      // Calculate frame now (e.g., 2 frames, switching every 200ms)
      // This logic is now "live", waiting for the assets to support it.
      const frame = Math.floor(Date.now() / 200) % 2;

      return Assets.factory.powerup(type, frame);
    }),
    Match.tag("Block", (block: Block) => {
      return Assets.factory.block(block.isHard ? "hard" : "soft");
    }),
    Match.orElse(() => null)
  );
};
