import { Schema as S } from "effect";
import { boolean } from "effect/FastCheck";

// FOR CONSISTENCY:
//    ADD ALL TYPES UP IN THE FILE

export type BotType = typeof BotType.Type;
export type ModelState = typeof ModelState.Type;
export type ResultType = typeof ResultType.Type;
export type DrawType = typeof DrawType.Type;
export type PowerUpType = typeof PowerUpType.Type;
export type SoundType = typeof SoundType.Type;
export type AnimationType = typeof AnimationType.Type;
export type EventType = typeof EventType.Type;
export type UpdateResult = typeof UpdateResult.Type;

export type CoordMode = typeof CoordMode.Type;
export type RoundResult = typeof RoundResult.Type;
export type AnimationCmd = typeof AnimationCmd.Type;
export type Effect = typeof Effect.Type
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

export type IdGenerator = typeof makeIdGenerator

export type Model = typeof Model.Type;
export type initModel = typeof initModel;

// ^^ TYPES
// ^^ TYPES
// ^^ TYPES


// BotType
export const BotType = S.Union(
  S.TaggedStruct("Hostile Bot", {}),
  S.TaggedStruct("Careful Bot", {}),
  S.TaggedStruct("Greedy Bot", {})
);
export const [HostileBot, CarefulBot, GreedyBot] = BotType.members;
export type HostileBot = typeof HostileBot.Type;
export type CarefulBot = typeof CarefulBot.Type;
export type GreedyBot = typeof GreedyBot.Type;

// ModelState
export const ModelState = S.Union(
  S.TaggedStruct("Transition Model", {}),
  S.TaggedStruct("Countdown Model", {}),
  S.TaggedStruct("Playing Model", {}),
  S.TaggedStruct("EndDelay Model", {})
);
export const [TransitionModel, CountdownModel, PlayingModel, EndDelayModel] = ModelState.members;
export type TransitionModel = typeof TransitionModel.Type;
export type CountdownModel = typeof CountdownModel.Type;
export type PlayingModel = typeof PlayingModel.Type;
export type EndDelayModel = typeof EndDelayModel.Type;

// ResultType
export const ResultType = S.Union(
  S.TaggedStruct("Win Result", {}),
  S.TaggedStruct("Draw Result", {})
);
export const [WinResult, DrawResult] = ResultType.members;
export type WinResult = typeof WinResult.Type;
export type DrawResult = typeof DrawResult.Type;

// DrawType
export const DrawType = S.Union(
  S.TaggedStruct("Time Result", {}),
  S.TaggedStruct("Death Result", {})
);
export const [TimeResult, DeathResult] = DrawType.members;
export type TimeResult = typeof TimeResult.Type;
export type DeathResult = typeof DeathResult.Type;


// Sounds
export const SoundType = S.Union(
  S.TaggedStruct("Explosion Sound", {}),
  S.TaggedStruct("PowerupGet Sound", {}),
  S.TaggedStruct("Death Sound", {})
);
export const [ExplosionSound, PowerupSound, DeathSound] = SoundType.members;
export type ExplosionSound = typeof ExplosionSound.Type;
export type PowerupSound = typeof PowerupSound.Type;
export type DeathSound = typeof DeathSound.Type;

// Animations
export const AnimationType = S.Union(
  S.TaggedStruct("Death Animation", {}),
  S.TaggedStruct("Soft Break Animation", {}),
  S.TaggedStruct("PowerupBreak Animation", {})
);
export const [DeathAnimation, SoftBreakAnimation, PowerupBreakAnimation] = AnimationType.members;
export type DeathAnimation = typeof DeathAnimation.Type;
export type SoftBreakAnimation = typeof SoftBreakAnimation.Type;
export type PowerupBreakAnimation = typeof PowerupBreakAnimation.Type;

// Coordinates
export const CoordMode = S.Union(
  S.TaggedStruct("Cell Mode", {}),
  S.TaggedStruct("Pixel Mode", {})
);
export const [CellMode, PixelMode] = CoordMode.members;
export type CellMode = typeof CellMode.Type;
export type PixelMode = typeof PixelMode.Type;

// Power-ups
export const Effect = S.Struct({
  timeRemaining: S.NullOr(S.Number),
  speedDelta: S.Number,
  bombsDelta: S.Number,
  rangeDelta: S.Number,
});

export const PowerUpType = S.Union(
  S.TaggedStruct("Fire Powerup", {effect: Effect}),
  S.TaggedStruct("Bomb Powerup", {effect: Effect}),
  S.TaggedStruct("Speed Powerup", {effect: Effect})
);
export const [FirePowerup, BombPowerup, SpeedPowerup] = PowerUpType.members;
export type FirePowerup = typeof FirePowerup.Type;
export type BombPowerup = typeof BombPowerup.Type;
export type SpeedPowerup = typeof SpeedPowerup.Type;

// Explosion Orientations
export const ExplosionOrientation = S.Union(
  S.TaggedStruct("Center Explosion", {}),
  S.TaggedStruct("Vertical Explosion", {}),
  S.TaggedStruct("Horizontal Explosion", {})
);
export const [CenterExplosion, VerticalExplosion, HorizontalExplosion] = ExplosionOrientation.members;
export type CenterExplosion = typeof CenterExplosion.Type;
export type VerticalExplosion = typeof VerticalExplosion.Type;
export type HorizontalExplosion = typeof HorizontalExplosion.Type;

// Directions
export const Direction = S.Union(
  S.TaggedStruct("North Direction", { dr: S.Literal(-1), dc: S.Literal(0) }),
  S.TaggedStruct("South Direction", { dr: S.Literal(1),  dc: S.Literal(0) }),
  S.TaggedStruct("East Direction",  { dr: S.Literal(0),  dc: S.Literal(1) }),
  S.TaggedStruct("West Direction",  { dr: S.Literal(0),  dc: S.Literal(-1) })
);
export const [NorthDirection, SouthDirection, EastDirection, WestDirection] = Direction.members;
export type NorthDirection = typeof NorthDirection.Type;
export type SouthDirection = typeof SouthDirection.Type;
export type EastDirection = typeof EastDirection.Type;
export type WestDirection = typeof WestDirection.Type;




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


// entities

export const EntityFields = {
  row: S.Int,
  col: S.Int,
  id: S.Int,
  isExpired: S.Boolean,
};
export const Explosion = S.TaggedStruct("Explosion", {
  ...EntityFields,
  currentTimer: S.Int,
  fullTimer: S.Int,
  orientation: ExplosionOrientation
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
  effects: S.Array(Effect),
  isAlive: S.Boolean,
  activeBombs: S.Array(S.Int)
});
export const Bomb = S.TaggedStruct("Bomb", {
  ...EntityFields,
  moveAwayIds: S.Array(S.Int),
  currentTimer: S.Int,
  fuse: S.Int, 
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

export const makeIdGenerator = (start: number = 0) => {
  let count = start;

  return (): number => {
    count++;
    return count;
  };
};

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


