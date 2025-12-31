import {Schema as S} from "effect";

type SpriteParts = typeof SpriteParts.Type
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
        orientation: S.String,
        direction: S.Optional(S.String),
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
)

const [
    PlayerSprite, PlayerDeathSprite, BombSprite, SoftBlockBreakSprite, ExplosionSprite, PowerupSprite, StaticSprite
] = SpriteParts.members;


export const Assets = {
    orig: "/assets/sprites/",
    sprite_type: ...,// takes in type from spriteparts using match or soemthing,
}




