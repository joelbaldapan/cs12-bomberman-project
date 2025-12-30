import { Schema as S } from "effect";

// FOR CONSISTENCY:
//    ADD ALL TYPES UP IN THE FILE

export type BotType = typeof BotType.Type;
export type ModelState = typeof ModelState.Type;
export type ResultType = typeof ResultType.Type;
export type DrawType = typeof DrawType.Type;
export type EntityType = typeof EntityType.Type;
export type PowerUpType = typeof PowerUpType.Type;
export type SoundType = typeof SoundType.Type;
export type AnimationType = typeof AnimationType.Type;
export type EventType = typeof EventType.Type;
export type UpdateResult = typeof UpdateResult.Type;

export type CoordMode = typeof CoordMode.Type;
export type RoundResult = typeof RoundResult.Type;
export type AnimationCmd = typeof AnimationCmd.Type;
export type Direction = typeof Direction.Type;
export type ExplosionOrientation = typeof ExplosionOrientation.Type;

export type Entity = typeof Entity.Type;
export type Explosion = typeof Explosion.Type;
export type Bomb = typeof Bomb.Type;
export type Block = typeof Block.Type;
export type Player = typeof Player.Type;
export type Powerup = typeof Powerup.Type;

export type GridCoords = typeof GridCoords.Type;
export type World = typeof World.Type;
export type Board = typeof Board.Type;

export type Model = typeof Model.Type;
export type initModel = typeof initModel;

// ^^ TYPES
// ^^ TYPES
// ^^ TYPES



export const BotType = S.Union(
  S.TaggedStruct("Hostile", {}),
  S.TaggedStruct("Careful", {}),
  S.TaggedStruct("Greedy", {})
);

export const ModelState = S.Union(
  S.TaggedStruct("Transition", {}),
  S.TaggedStruct("Countdown", {}),
  S.TaggedStruct("Playing", {}),
  S.TaggedStruct("End_Delay", {})
);

export const ResultType = S.Union(
  S.TaggedStruct("Win", {}),
  S.TaggedStruct("Draw", {})
);

export const DrawType = S.Union(
  S.TaggedStruct("Time", {}),
  S.TaggedStruct("Death", {})
);

export const EntityType = S.Union(
  S.TaggedStruct("Explosion", {}),
  S.TaggedStruct("Bomb", {}),
  S.TaggedStruct("Block", {}),
  S.TaggedStruct("Player", {}),
  S.TaggedStruct("Powerup", {})
);

export const SoundType = S.Union(
  S.TaggedStruct("Explosion", {}),
  S.TaggedStruct("Powerup_Get", {}),
  S.TaggedStruct("Death", {})
);

export const [ExplosionSound, PowerupSound, DeathSound] = SoundType.members

export const AnimationType = S.Union(
  S.TaggedStruct("Death", {}),
  S.TaggedStruct("Soft_Break", {}),
  S.TaggedStruct("Powerup_Break", {})
);

export const CoordMode = S.Union(
  S.TaggedStruct("Cell", {}),
  S.TaggedStruct("Pixel", {})
);

export const PowerUpType = S.Union(
  S.TaggedStruct("Fire", {}),
  S.TaggedStruct("Bomb", {}),
  S.TaggedStruct("Speed", {})
);

export const ExplosionOrientation = S.Union(
  S.TaggedStruct("Center", {}),
  S.TaggedStruct("Vertical", {}),
  S.TaggedStruct("Horizontal", {})
);

export const Direction = S.Union(
  S.TaggedStruct("North", { dr: S.Literal(-1), dc: S.Literal(0) }),
  S.TaggedStruct("South", { dr: S.Literal(1),  dc: S.Literal(0) }),
  S.TaggedStruct("East",  { dr: S.Literal(0),  dc: S.Literal(1) }),
  S.TaggedStruct("West",  { dr: S.Literal(0),  dc: S.Literal(-1) })
);




export const RoundResult = S.Struct({
  outcome: ResultType,
  winnerId: S.NullOr(S.Number),
  drawType: S.NullOr(DrawType),
  matchOver: S.Boolean,
  overallWinnerId: S.NullOr(S.Number)
});

export const AnimationCmd = S.Struct({
  type: AnimationType,
  mode: CoordMode,
  a: S.Number,
  b: S.Number,
  durationFrames: S.Number,
  id: S.NullOr(S.Number),
  powerupType: S.NullOr(PowerUpType)
});

export const EventType = S.Union(
  S.TaggedStruct("Spawn", {entity: Entity}),
  S.TaggedStruct("Remove", {entity: Entity})
);

export const [SpawnEvent, RemoveEvent] = EventType.members

export const UpdateResult = S.Struct({
  events: S.Array(EventType),
  sounds: S.Array(SoundType),
  animations: S.Array(AnimationCmd),
});

export const Effect = S.Struct({
  timeRemaining: S.NullOr(S.Number),
  speedDelta: S.Number,
  bombsDelta: S.Number,
  rangeDelta: S.Number,
});


// entities

export const EntityFields = {
  row: S.Int,
  col: S.Int,
  id: S.Int,
  entityType: EntityType,
  isExpired: S.Boolean,
};
export const Explosion = S.TaggedStruct("Explosion", {
  ...EntityFields,
  currentTimer: S.Int,
});
export const Player = S.TaggedStruct("Player", {
  ...EntityFields,
  player_id: S.Int,
  x: S.Int,
  y: S.Int,
  width: S.Int,
  height: S.Int,

  hitboxX: S.Int,
  hitboxY: S.Int,
  speed: S.Int,
  directionFacing: Direction,
  activeBombs: S.Int,
  range: S.Int,
  maxBombs: S.Int,
});
export const Bomb = S.TaggedStruct("Bomb", {
  ...EntityFields,
  moveAwayIds: S.Array(S.Int),
  currentTimer: S.Int,
  fuse: S.Int, 
  owner: Player,
  shouldDetonate: S.Boolean,
  explosionRange: S.Int,
});
export const Block = S.TaggedStruct("Block", {
  ...EntityFields,
  isHard: S.Boolean,
});
export const Powerup = S.TaggedStruct("Powerup", {
  ...EntityFields,
  powerupType: PowerUpType,
});
export const Entity = S.Union(
  Explosion,
  Bomb,
  Block,
  Player,
  Powerup
);
export const [ExplosionMember, BombMember, BlockMember, PlayerMember, PowerupMember] = Entity.members;


export const GridCoords = S.Tuple(S.Int, S.Int);
export const Board = S.Array(S.Array(S.NullOr(Entity)));
export const World = S.Struct({
  rows: S.Int,
  cols: S.Int,

  entities: S.HashMap({
    key: S.Int,
    value: Entity,
  }),
  board: Board,

});


export const PowerupSpawner = S.Struct({});
export const Config = S.Struct({
  softBlockSpawnChance: S.Number,
  powerupSpawnChance: S.Number,
  timerSeconds: S.Number,
  numHumanPlayers: S.Number,
  botTypes: S.Array(BotType),
  roundsToWin: S.Number,
});


// MODEL

export const Model = S.Struct({
  world: World,
  config: Config,

  eventBuffer: S.Array(EventType),
  sfxBuffer: S.Array(SoundType),
  vfxBuffer: S.Array(AnimationCmd),

  players: S.Set(Player),

  tileSize: S.Number,

  timer: S.Number,
  winCountdown: S.Number,
  fps: S.Number,

  draw: S.Boolean,
  debug: S.Boolean,

  scores: S.Struct({ key: S.Number, value: S.Number }),

  roundsToWin: S.Number,
  tempWinner: S.Number,

  state: ModelState,

  roundResult: S.NullOr(RoundResult),
  winner: S.NullOr(Player),

  spacedBlockCoords: S.Array(GridCoords),
  borderBlockCoords: S.Array(GridCoords),
  protectedCoords: S.Array(GridCoords),
});

export const initModel = () => ({
  // add the others pls

  spacedBlockCoords: [
    [2, 2], [2, 4], [2, 6], [2, 8], [2, 10], [2, 12],
    [4, 2], [4, 4], [4, 6], [4, 8], [4, 10], [4, 12],
    [6, 2], [6, 4], [6, 6], [6, 8], [6, 10], [6, 12],
    [8, 2], [8, 4], [8, 6], [8, 8], [8, 10], [8, 12],
    [10, 2], [10, 4], [10, 6], [10, 8], [10, 10], [10, 12],
  ],

  borderBlockCoords: [
    ...Array.from({ length: world.cols }, (_, c) => [0, c]),
    ...Array.from({ length: world.cols }, (_, c) => [world.rows - 1, c]),
    ...Array.from({ length: world.rows - 2 }, (_, r) => [r + 1, 0]),
    ...Array.from({ length: world.rows - 2 }, (_, r) => [r + 1, world.cols - 1]),
  ],

  protectedCoords: [
    [1, 1], [2, 1], [1, 2],
    [1, 13], [2, 13], [1, 12],
    [11, 1], [10, 1], [11, 2],
    [11, 13], [10, 13], [11, 12],
  ],
});


