import { Schema as S } from "effect";

// FOR CONSISTENCY:
//    ADD ALL TYPES UP IN THE FILE

export type Direction = typeof Direction.Type;
export type ExplosionOrientation = typeof ExplosionOrientation.Type;
export type GridCoords = S.Schema.Type<typeof GridCoords>;
export type Sound = typeof Sound.Type;
export type Event = S.Schema.Type<typeof Event>;
export type UpdateResult = S.Schema.Type<typeof UpdateResult>;
export type Entity = typeof Entity.Type;
export type Explosion = typeof Explosion.Type;
export type Bomb = typeof Bomb.Type;
export type Block = typeof Block.Type;
export type Player = typeof Player.Type;
export type Powerup = typeof Powerup.Type;
export type World = S.Schema.Type<typeof World>;
export type Board = S.Schema.Type<typeof Board>;
export type Model = typeof Model.Type;
export type initModel = typeof initModel.Type;

// ^^ TYPES
// ^^ TYPES
// ^^ TYPES

// types

export const Direction = S.Union(
  S.TaggedStruct("north", {}),
  S.TaggedStruct("south", {}),
  S.TaggedStruct("east", {}),
  S.TaggedStruct("west", {})
);
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


export const [Center, Vertical, Horizontal] = ExplosionOrientation.members;

export const GridCoords = S.Tuple(S.Number, S.Number);


export const Sound = S.Union(
  S.TaggedStruct("Explosion", {}),
  S.TaggedStruct("PowerupGet", {})
);

export const [ExplosionSound, PowerupGetSound] = Sound.members;

// updates and events

export const Event = S.Struct({
// ...
});


export const UpdateResult = S.Struct({
  events: S.Array(Event),
  sounds: S.Array(Sound),
});

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
export const [Explosion, Bomb, Block, Player, Powerup] = Entity.members;

// wawld

export const World = S.Struct({
  entities: S.Array(Entity),
});
export const Board = S.Array(S.Array(S.NullOr(Entity)));


// model

export const Model = S.Struct({
});

export const initModel = S.Struct({
});