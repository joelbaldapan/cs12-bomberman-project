import {Schema as S, Match, pipe} from "effect";
import {
  Player, 
  Block,
  Bomb,
  Explosion, 
  Direction,
  PowerUpType,
  ExplosionOrientation 
} from "/model"; 
import { Powerup } from "./model";

export type SpriteParts = typeof SpriteParts.Type
const SpriteParts = S.Union(
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
        direction: S.Optional(S.String),
        orientation: S.String,
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
        isMoving: S.Optional(S.Boolean),
        walkFrame: S.Optional(S.Int),
    }),

    // player death animation
    S.TaggedStruct("PlayerDeathSprite", {
        playerId: S.Int,
        frame: S.Int,
    }),
)

const [
    BlockSprite, SoftBlockBreakSprite, BombSprite, ExplosionSprite, PowerupSprite, PlayerSprite, PlayerDeathSprite
] = SpriteParts.members;

export type BlockSprite = typeof BlockSprite.Type;
export type SoftBlockBreakSprite = typeof SoftBlockBreakSprite.Type;
export type BombSprite = typeof BombSprite.Type;
export type ExplosionSprite = typeof ExplosionSprite.Type;
export type PowerupSprite = typeof PowerupSprite.Type;
export type PlayerSprite = typeof PlayerSprite.Type;
export type PlayerDeathSprite = typeof PlayerDeathSprite.Type;

export const Assets = {
    orig: "/assets/sprites/",
    path: (part: SpriteParts | string): string => {
        if (typeof part === 'string') {
            return `${Assets.orig}${part}.png`;
        }
        return pipe(
            part,
            Match.tag("BlockSprite", (sprite: BlockSprite) => {
                return `${Assets.orig}${sprite.name}.png`;
            }),
            Match.tag("SoftBlockBreakSprite", (sprite: SoftBlockBreakSprite) => {
                const frameNum = Math.min(sprite.frame, 4) + 1; // need i-adjust para hindi zero based yung naming, 4 frames
                return `${Assets.orig}soft_on_hit_${frameNum}.png`;
            }),
            Match.tag("BombSprite", (sprite: BombSprite) => {
                const frameNum = (sprite.frame % 3) + 1; // 3 frames
                return `${Assets.orig}bomb_frame_${frameNum}.png`;
            }),
            Match.tag("ExplosionSprite", (sprite: ExplosionSprite) => {
                const dir = sprite.direction ? `-${sprite.direction}` : "";
                const frameNum = (sprite.frame % 4) + 1; // 4 frames
                return `${Assets.orig}explosion_${dir}_${sprite.orientation}_${frameNum}.png`;
            }),
            Match.tag("PowerupSprite", (sprite: PowerupSprite) => {
                const frameNum = (sprite.frame % 2) + 1; // 2 frames
                return `${Assets.orig}powerup_${sprite.type}_${frameNum}.png`;
            }),
            Match.tag("PlayerSprite", (sprite: PlayerSprite) => {
                const walkFrame = sprite.walkFrame ?? 0;
                if (sprite.isMoving) {
                        const walkFrameNum = (walkFrame % 2) + 1; // 2 frames; walking
                        return `${Assets.orig}${sprite.playerId}/walk_${sprite.direction}_${walkFrameNum}.png`;
                    } else {
                        return `${Assets.orig}${sprite.playerId}/${sprite.direction}.png`; // idle
                    }
            }),
                Match.tag("PlayerDeathSprite", (sprite: PlayerDeathSprite) => {
                    const frameNum = Math.min(sprite.frame, 5) + 1; // 6 frames for death animation
                    return `${Assets.orig}${sprite.playerId}/death_${frameNum}.png`;
                }),
                Match.exhaustive
            );
        },
        factory: {
            block: (name: string): BlockSprite  =>
                BlockSprite.make({name}),

            softBlockBreak: (frame: number): SoftBlockBreakSprite => 
                SoftBlockBreakSprite.make({frame}),

            bomb: (frame: number): BombSprite => 
                BombSprite.make({frame}),

            explosion: (
                direction: string | null, 
                orientation: string, 
                frame: number
            ): ExplosionSprite => 
                ExplosionSprite.make({direction, orientation, frame}),
            
            powerup: (type: string, frame: number): PowerupSprite => 
                PowerupSprite.make({type, frame}),

            player: (playerId: number, direction: string): PlayerSprite => 
                PlayerSprite.make({playerId, direction}),
            
            playerWalk: (
                playerId: number, 
                direction: string, 
                walkFrame: number
            ): PlayerSprite => 
                PlayerSprite.make({ 
                    playerId, 
                    direction, 
                    isMoving: true, 
                    walkFrame 
                }),
            // no need for idle kasi isa lang e
            playerDeath: (playerId: number, frame: number): PlayerDeathSprite => 
                PlayerDeathSprite.make({playerId, frame}),
        },
}

export const directionToStr = (direction: Direction): string => 
    pipe(
        direction,
        Match.tag("North Direction", () => "north"),
        Match.tag("South Direction", () => "south"),
        Match.tag("East Direction", () => "east"),
        Match.tag("West Direction", () => "west"),
        Match.exhaustive
    );

export const powerupToStr = (powerupType: PowerUpType): string =>
    pipe(
        powerupType,
        Match.tag("Fire Powerup", () => "fire"),
        Match.tag("Bomb Powerup", () => "bomb"),
        Match.tag("Speed Powerup", () => "speed"),
        Match.exhaustive
    );

export const explosionOryeToStr = (orientation: ExplosionOrientation): string =>
    pipe(
        orientation,
        Match.tag("Center Explosion", () => "center"),
        Match.tag("Vertical Explosion", () => "vertical"),
        Match.tag("Horizontal Explosion", () => "horizontal"),
        Match.exhaustive
    );

export const createSpriteForEntity = (entity: any): SpriteParts | null => {
  return pipe(
    entity,
    Match.tag("Player", (player: Player) => {
      const direction = directionToStr(player.directionFacing);
      const isMoving = player.vx !== 0 || player.vy !== 0;
      if (isMoving) {
        const walkFrame = Math.floor(Date.now() / 200) % 2; // Walk animation
        return Assets.factory.playerWalk(player.player_id, direction, walkFrame);
      }
      return Assets.factory.player(player.player_id, direction);
    }),
    Match.tag("Bomb", () => {
      const frame = Math.floor(Date.now() / 300) % 3; // Bomb animation
      return Assets.factory.bomb(frame);
    }),
    Match.tag("Explosion", (explosion: Explosion) => {
      const orientation = explosionOryeToStr(explosion.orientation);
      const frame = Math.min(explosion.currentTimer, 3); // Based on timer
      return Assets.factory.explosion(null, orientation, frame);
    }),
    Match.tag("Powerup", (powerup: Powerup) => {
      const type = powerupToStr(powerup.powerupType);
      const frame = Math.floor(Date.now() / 500) % 2; // Flashing effect
      return Assets.factory.powerup(type, frame);
    }),
    Match.tag("Block", (block: Block) => {
      return Assets.factory.block(block.isHard ? "hard" : "soft");
    }),
    Match.orElse(() => null)
  );
};