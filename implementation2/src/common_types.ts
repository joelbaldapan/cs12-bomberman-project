import { Schema as S } from "effect";

// common_types py -> ts

// types

export const Direction = S.Union(
  S.TaggedStruct("north", {}),
  S.TaggedStruct("south", {}),
  S.TaggedStruct("east", {}),
  S.TaggedStruct("west", {})
);
export type Direction = typeof Direction.Type;
export const [North, South, East, West] = Direction.members;

export const DirectionVectors = {
  north: [-1, 0],
  south: [1, 0],
  east: [0, 1],
  west: [0, -1],
} as const;

export const ExplosionOrientation = S.Union(
  S.TaggedStruct("center", {}),
  S.TaggedStruct("vertical", {}),
  S.TaggedStruct("horizontal", {})
);

export type ExplosionOrientation = typeof ExplosionOrientation.Type;
export const [Center, Vertical, Horizontal] = ExplosionOrientation.members;

export const GridCoords = S.Tuple(S.Number, S.Number);
export type GridCoords = S.Schema.Type<typeof GridCoords>;

export const Sound = S.Union(
  S.TaggedStruct("Explosion", {}),
  S.TaggedStruct("PowerupGet", {})
);

export type Sound = typeof Sound.Type;
export const [ExplosionSound, PowerupGetSound] = Sound.members;

// updates and events

export const EventInfo = S.Struct({
// ...
});
export type EventInfo = S.Schema.Type<typeof EventInfo>;

export const UpdateResultInfo = S.Struct({
  events: S.Array(EventInfo),
  sounds: S.Array(Sound),
});

export type UpdateResultInfo = S.Schema.Type<typeof UpdateResultInfo>;


// entities

const base = {
  row: S.Number,
  col: S.Number,
  isExpired: S.Boolean,
}

export const Entity = S.Union(
  S.TaggedStruct("explosion", {
    ...base,
    currentTimer: S.Number,
  }),
  S.TaggedStruct("bomb", {
    ...base,
    currentTimer: S.Number,
    power: S.Number,
    shouldDetonate: S.Boolean,
    explosionRange: S.Number,
  }),
  S.TaggedStruct("block", {
    ...base,
    isHard: S.Boolean,
  }),
  S.TaggedStruct("player", {
    ...base,
    x: S.Number,
    y: S.Number,
    width: S.Number,
    height: S.Number,
    hitboxX: S.Number,
    hitboxY: S.Number,
    speed: S.Number,
  }),
  S.TaggedStruct("powerup", {
    ...base,
  })
);

export type EntityInfo = typeof Entity.Type;
export const [Explosion, Bomb, Block, Player, Powerup] = Entity.members;

export type ExplosionInfo = typeof Explosion.Type;
export type BombInfo = typeof Bomb.Type;
export type BlockInfo = typeof Block.Type;
export type PlayerInfo = typeof Player.Type;
export type PowerupInfo = typeof Powerup.Type;

// wawld

export const WorldInfo = S.Struct({
  entities: S.Array(Entity),
});
export type WorldInfo = S.Schema.Type<typeof WorldInfo>;

export const Board = S.Array(S.Array(S.NullOr(Entity)));
export type Board = S.Schema.Type<typeof Board>;

// non-entity

export const BotAIInfo = S.Struct({
// ...
});
export type BotAIInfo = S.Schema.Type<typeof BotAIInfo>;