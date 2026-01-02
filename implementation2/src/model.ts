import { Schema as S, HashMap, HashSet, Array, Option } from "effect";
import * as settings from "../settings.json";
import { makeHardBlock, makeSoftBlock, makePlayer } from "./helpers/factories";
import {
  getSpacedBlockCoords,
  getBorderBlockCoords,
  getProtectedCoords,
  generateSoftBlockCoords,
} from "./helpers/init_world_gen";

// FOR CONSISTENCY:
//    ADD ALL TYPES UP IN THE FILE

/*
TODO: add all types up here
TODO: add all types up here
TODO: add all types up here
TODO: add all types up here
*/

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
export type Effect = typeof Effect.Type;
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

export type GameConfig = typeof GameConfig.Type;

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
export const [TransitionModel, CountdownModel, PlayingModel, EndDelayModel] =
  ModelState.members;
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
export const [DeathAnimation, SoftBreakAnimation, PowerupBreakAnimation] =
  AnimationType.members;
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
  timeRemaining: S.Option(S.Number),
  speedDelta: S.Number,
  bombsDelta: S.Number,
  rangeDelta: S.Number,
});

export const PowerUpType = S.Union(
  S.TaggedStruct("Fire Powerup", {}),
  S.TaggedStruct("Bomb Powerup", {}),
  S.TaggedStruct("Speed Powerup", {})
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
export const [CenterExplosion, VerticalExplosion, HorizontalExplosion] =
  ExplosionOrientation.members;
export type CenterExplosion = typeof CenterExplosion.Type;
export type VerticalExplosion = typeof VerticalExplosion.Type;
export type HorizontalExplosion = typeof HorizontalExplosion.Type;

// Directions
export const Direction = S.Union(
  S.TaggedStruct("North Direction", { dr: S.Literal(-1), dc: S.Literal(0) }),
  S.TaggedStruct("South Direction", { dr: S.Literal(1), dc: S.Literal(0) }),
  S.TaggedStruct("East Direction", { dr: S.Literal(0), dc: S.Literal(1) }),
  S.TaggedStruct("West Direction", { dr: S.Literal(0), dc: S.Literal(-1) })
);
export const [NorthDirection, SouthDirection, EastDirection, WestDirection] =
  Direction.members;
export type NorthDirection = typeof NorthDirection.Type;
export type SouthDirection = typeof SouthDirection.Type;
export type EastDirection = typeof EastDirection.Type;
export type WestDirection = typeof WestDirection.Type;

export const RoundResult = S.Struct({
  outcome: ResultType,
  winnerId: S.Option(S.Number),
  drawType: S.Option(DrawType),
  matchOver: S.Boolean,
  overallWinnerId: S.Option(S.Number),
});

export const AnimationCmd = S.Struct({
  type: AnimationType,
  mode: CoordMode,
  a: S.Number,
  b: S.Number,
  durationFrames: S.Number,
  id: S.Option(S.Number),
  powerupType: S.Option(PowerUpType),
});

// entities

export const EntityFields = {
  row: S.Int,
  col: S.Int,
  id: S.Int,
  isExpired: S.Boolean
};
export const Explosion = S.TaggedStruct("Explosion", {
  ...EntityFields,
  currentTimer: S.Int,
  fullTimer: S.Int,
  orientation: ExplosionOrientation,
  terminalDirection: S.Option(Direction),
});
export const Player = S.TaggedStruct("Player", {
  ...EntityFields,
  player_id: S.Int,
  x: S.Int,
  y: S.Int,
  width: S.Int,
  height: S.Int,

  speed: S.Int,
  directionFacing: Direction,
  effects: S.Array(Effect),
  isAlive: S.Boolean,
  activeBombs: S.Array(S.Int),

  vx: S.Int,
  vy: S.Int,
});
export const Bomb = S.TaggedStruct("Bomb", {
  ...EntityFields,
  moveAwayIds: S.Array(S.Int),
  currentTimer: S.Int,
  fuse: S.Int,
  explosionRange: S.Int,
  owner: S.Int,
});
export const Block = S.TaggedStruct("Block", {
  ...EntityFields,
  isHard: S.Boolean,
});
export const Powerup = S.TaggedStruct("Powerup", {
  ...EntityFields,
  powerupType: PowerUpType,
  effect: Effect,
});
export const Entity = S.Union(Explosion, Bomb, Block, Player, Powerup);
export const [
  ExplosionMember,
  BombMember,
  BlockMember,
  PlayerMember,
  PowerupMember,
] = Entity.members;

export const GridCoords = S.Tuple(S.Int, S.Int);
export const Board = S.Array(S.Array(S.Option(Entity)));
export const World = S.Struct({
  rows: S.Int,
  cols: S.Int,

  entities: S.HashMap({
    key: S.Int,
    value: Entity,
  }),
  board: Board,
});

export const GameConfig = S.Struct({
  softBlockSpawnChance: S.Number,
  powerupSpawnChance: S.Number,
  timerSeconds: S.Number,
  numHumanPlayers: S.Number,
  botTypes: S.Array(BotType),
  roundsToWin: S.Number,
});

export const EventType = S.Union(
  S.TaggedStruct("Spawn", { entity: Entity }),
  S.TaggedStruct("Remove", { entity: Entity })
);

export const [SpawnEvent, RemoveEvent] = EventType.members;

export const UpdateResult = S.Struct({
  events: S.Array(EventType),
  sounds: S.Array(SoundType),
  animations: S.Array(AnimationCmd),
});

// POLICIES

// Danger Policies
export const DangerPolicyType = S.Union(
  S.TaggedStruct("Bomb Only Danger Policy", {}),
  S.TaggedStruct("Explosion Prediction Danger Policy", {})
);
export const [BombOnlyDangerPolicy, ExplosionPredictionDangerPolicy] =
  DangerPolicyType.members;
export type BombOnlyDangerPolicy = typeof BombOnlyDangerPolicy.Type;
export type ExplosionPredictionDangerPolicy =
  typeof ExplosionPredictionDangerPolicy.Type;

// Attack Policies
export const AttackPolicyType = S.Union(
  S.TaggedStruct("Attack Policy 1", { maxDistance: S.Number }),
  S.TaggedStruct("Attack Policy 2", {})
);
export const [AttackPolicy1, AttackPolicy2] = AttackPolicyType.members;
export type AttackPolicy1 = typeof AttackPolicy1.Type;
export type AttackPolicy2 = typeof AttackPolicy2.Type;

// Powerup Policies
export const PowerupPolicyType = S.Union(
  S.TaggedStruct("Powerup Policy 1", {}),
  S.TaggedStruct("Powerup Policy 2", {})
);
export const [PowerupPolicy1, PowerupPolicy2] = PowerupPolicyType.members;
export type PowerupPolicy1 = typeof PowerupPolicy1.Type;
export type PowerupPolicy2 = typeof PowerupPolicy2.Type;

// CONFIGURATION

export const BotGameConfig = S.Struct({
  botType: BotType,

  reevalInterval: S.Number,
  reevalChance: S.Number,

  dangerRadius: S.Number,
  dangerPolicy: DangerPolicyType,

  attackRangeTrigger: S.Number,
  attackSearchRadius: S.Number,
  attackPolicy: AttackPolicyType,

  powerupChance: S.Number,
  powerupPolicy: PowerupPolicyType,
});
export type BotGameConfig = typeof BotGameConfig.Type;

// STATE MACHINE STATES

export const BotBehavior = S.Union(
  S.TaggedStruct("Wander State", {}),
  S.TaggedStruct("Escape State", { leftDanger: S.Boolean }),
  S.TaggedStruct("Get Powerup State", { target: GridCoords }),
  S.TaggedStruct("Attack State", { target: GridCoords })
);
export const [WanderState, EscapeState, GetPowerupState, AttackState] =
  BotBehavior.members;
export type BotBehavior = typeof BotBehavior.Type;
export type WanderState = typeof WanderState.Type;
export type EscapeState = typeof EscapeState.Type;
export type GetPowerupState = typeof GetPowerupState.Type;
export type AttackState = typeof AttackState.Type;

// MEMORY

export const BotMemory = S.Struct({
  reevalTimer: S.Number,

  // Navigation
  path: S.Array(GridCoords),
  goal: S.Option(GridCoords),
  isStrictMovement: S.Boolean,

  // Perception
  lastBombCoords: S.HashSet(GridCoords),
  lastExplosionCoords: S.HashSet(GridCoords),
});
export type BotMemory = typeof BotMemory.Type;

// THE CONTAINER

export const BotInternalState = S.Struct({
  initialized: S.Boolean,
  config: BotGameConfig,
  memory: BotMemory,
  currentState: BotBehavior,
});
export type BotInternalState = typeof BotInternalState.Type;

export const BotAction = S.Union(
  S.TaggedStruct("Idle Action", {}),
  S.TaggedStruct("Place Bomb Action", {}),
  S.TaggedStruct("Move Action", { direction: Direction })
);

export const [IdleAction, PlaceBombAction, MoveAction] = BotAction.members;

export type BotAction = typeof BotAction.Type;
export type IdleAction = typeof IdleAction.Type;
export type PlaceBombAction = typeof PlaceBombAction.Type;
export type MoveAction = typeof MoveAction.Type;

export type BotUpdateResult = {
  nextState: BotInternalState;
  action: BotAction;
};

export const InputState = S.HashMap({ key: S.String, value: S.Int });
export type InputState = typeof InputState.Type;

// MODEL

export const Model = S.Struct({
  world: World,
  config: GameConfig,

  eventBuffer: S.Array(EventType),
  sfxBuffer: S.Array(SoundType),
  vfxBuffer: S.Array(AnimationCmd),

  players: S.HashSet(Player),

  tileSize: S.Number,

  timer: S.Number,
  winCountdown: S.Number,
  fps: S.Number,

  draw: S.Boolean,

  inputState: InputState,
  debugMode: S.Boolean,

  scores: S.HashMap({ key: S.Number, value: S.Number }),

  roundsToWin: S.Number,
  tempWinner: S.Number,

  state: ModelState,

  roundResult: S.Option(RoundResult),
  winner: S.Option(Player),

  spacedBlockCoords: S.Array(GridCoords),
  borderBlockCoords: S.Array(GridCoords),
  protectedCoords: S.Array(GridCoords),

  botInternals: S.HashMap({ key: S.Int, value: BotInternalState }),
});

export const initModel = (
  rows: number,
  cols: number,
  fps: number,
  config: GameConfig
): Model => {
  const spacedCoords = getSpacedBlockCoords();
  const borderCoords = getBorderBlockCoords(rows, cols);
  const protectedCoords = getProtectedCoords(rows, cols);

  // Hard blocks
  let entities = HashMap.empty<number, Entity>();
  const hardBlocks = [...spacedCoords, ...borderCoords];

  hardBlocks.forEach(([r, c]) => {
    const block = makeHardBlock(r, c);
    entities = HashMap.set(entities, block.id, block);
  });

  // Soft blocks
  const softBlockCoords = generateSoftBlockCoords(
    rows,
    cols,
    hardBlocks,
    protectedCoords,
    config
  );

  softBlockCoords.forEach(([r, c]) => {
    const block = makeSoftBlock(r, c);
    entities = HashMap.set(entities, block.id, block);
  });

  // Players
  const playerStartCoords: GridCoords[] = [
    [1, 1], // P1: Top-Left
    [rows - 2, cols - 2], // P2: Bottom-Right
    [rows - 2, 1], // P3: Bottom-Left
    [1, cols - 2], // P4: Top-Right
  ];

  let players = HashSet.empty<Player>();

  for (let i = 0; i < config.numHumanPlayers; i++) {
    const startCoord = playerStartCoords[i];

    if (!startCoord) continue;

    const [r, c] = startCoord;
    const p = makePlayer(i, r, c, 16, fps);

    players = HashSet.add(players, p);
    entities = HashMap.set(entities, p.id, p);
  }

  // SYNC TO WORLD
  const entityList = Array.fromIterable(HashMap.values(entities));
  const boardEntities = Array.filter(entityList, (e) => e._tag !== "Player");
  const board = Array.makeBy(rows, (r) =>
    Array.makeBy(cols, (c) =>
      Array.findFirst(boardEntities, (e) => e.row === r && e.col === c)
    )
  );

  return Model.make({
    world: World.make({ rows, cols, entities, board }),
    config,
    state: CountdownModel.make({}),
    eventBuffer: [],
    sfxBuffer: [],
    vfxBuffer: [],
    players,
    botInternals: HashMap.empty(),
    fps,
    tileSize: 16,
    timer: config.timerSeconds * fps,
    winCountdown: fps,
    roundsToWin: config.roundsToWin,
    draw: false,
    inputState: HashMap.empty(),
    debugMode: false,
    scores: HashMap.empty(),
    tempWinner: -1,
    roundResult: Option.none(),
    winner: Option.none(),
    spacedBlockCoords: spacedCoords,
    borderBlockCoords: borderCoords,
    protectedCoords: protectedCoords,
  });
};
