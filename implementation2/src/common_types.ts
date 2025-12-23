import { Schema as S } from "effect"

// common_types py -> ts

// types

export const EntityType = S.Literal(
  "explosion",
  "bomb",
  "block",
  "player",
  "powerup"
);
export type EntityType = S.Schema.Type<typeof EntityType>;

export const SoundType = S.Literal("explosion", "powerup_get");
export type SoundType = S.Schema.Type<typeof SoundType>;

export const Direction = S.Literal("north", "south", "east", "west");
export type Direction = S.Schema.Type<typeof Direction>;

export const DirectionVectors = {
  north: [-1, 0],
  south: [1, 0],
  east: [0, 1],
  west: [0, -1],
} as const;

export const ExplosionOrientation = S.Literal("center", "vertical", "horizontal");
export type ExplosionOrientation = S.Schema.Type<typeof ExplosionOrientation>;

export const GridCoords = S.Tuple(S.Number, S.Number);
export type GridCoords = S.Schema.Type<typeof GridCoords>;

// updates and events

export interface EventInfo {
    execute(world: WorldInfo): void;
}

export interface UpdateResultInfo {
    readonly events: EventInfo[];
    readonly sounds: SoundType[];
    addEvent(cmd: EventInfo): void;
    addSound(cmd: SoundType): void;
}

// wawrld

export interface WorldInfo {
    readonly entities: Set<EntityInfo>;
    addEntity(entity: EntityInfo): void;
    removeEntity(entity: EntityInfo): void;
    getEntityAt(i: number, j: number): EntityInfo | null;
    getAllType(entityType: EntityType): Set<EntityInfo>;
    isCellBlocking(row: number, col: number): boolean;
}

export type Board = (EntityInfo | null)[][];

const BaseEntity = S.Struct({
    row: S.Number,
    col: S.Number,
    isExpired: S.Boolean,
})

// entities

export const Explosion = S.Struct({
  ...BaseEntity.fields,
  entityType: S.Literal("explosion"),
  currentTimer: S.Number,
});


export const Bomb = S.Struct({
  ...BaseEntity.fields,
  entityType: S.Literal("bomb"),
  currentTimer: S.Number,
  power: S.Number,
  shouldDetonate: S.Boolean,
  explosionRange: S.Number,
});

export const Block = S.Struct({
  ...BaseEntity.fields,
  entityType: S.Literal("block"),
  isHard: S.Boolean,
});

export const Player = S.Struct({
  ...BaseEntity.fields,
  entityType: S.Literal("player"),
  x: S.Number,
  y: S.Number,
  width: S.Number,
  height: S.Number,
  hitboxX: S.Number,
  hitboxY: S.Number,
  speed: S.Number,
});

export const Powerup = S.Struct({
  ...BaseEntity.fields,
  entityType: S.Literal("powerup"),
});

export type ExplosionInfo = S.Schema.Type<typeof Explosion>;
export type BombInfo = S.Schema.Type<typeof Bomb>;
export type BlockInfo = S.Schema.Type<typeof Block>;
export type PlayerInfo = S.Schema.Type<typeof Player>;
export type PowerupInfo = S.Schema.Type<typeof Powerup>;

export const Entity = S.Union(
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup
);

export type EntityInfo =
  | ExplosionInfo
  | BombInfo
  | BlockInfo
  | PlayerInfo
  | PowerupInfo;

// non-entities

export interface BotAIInfo {
    getVisibleDistance(): Set<GridCoords>;
    getShortestPath(goal: GridCoords): GridCoords[];
    getNextInput(): Direction | null;   
}
