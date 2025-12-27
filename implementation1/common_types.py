from __future__ import annotations
from dataclasses import dataclass
from typing import Protocol, TypeVar, runtime_checkable
from enum import Enum, StrEnum, auto


# new types for readabilityy

class ModelState(Enum):
    TRANSITION = auto()
    COUNTDOWN = auto()
    PLAYING = auto()
    END_DELAY = auto()

class ResultType(Enum):
    WIN = auto()
    DRAW = auto()

class DrawType(Enum):
    TIME = auto()
    DEATH = auto() 

@dataclass(frozen=True)
class RoundResult:
    outcome: ResultType
    winner_id: int | None = None
    draw_type: DrawType | None = None

    match_over: bool = False
    overall_winner_id: int | None = None
    @staticmethod
    def round_win(winner_id: int) -> RoundResult:
        return RoundResult(outcome=ResultType.WIN, winner_id=winner_id)

    @staticmethod
    def round_draw(type: DrawType) -> RoundResult:
        return RoundResult(outcome=ResultType.DRAW, draw_type=type)

    def game_over(self, overall_winner_id: int | None) -> RoundResult:
        return RoundResult(outcome=self.outcome, winner_id=self.winner_id, draw_type=self.draw_type, match_over=True, overall_winner_id=overall_winner_id,)

class EntityType(StrEnum):
    EXPLOSION = auto()
    BOMB = auto()
    BLOCK = auto()
    PLAYER = auto()
    POWERUP = auto()

class SoundType(Enum):
    EXPLOSION = auto()
    POWERUP_GET = auto()
    DEATH = auto()
    # ... to add

class AnimationType(Enum):
    DEATH = auto()
    SOFT_BREAK = auto()
    POWERUP_BREAK = auto()

class CoordMode(Enum):
    CELL = auto()
    PIXEL = auto()

class PowerUpType(Enum):
    FIRE = auto()
    BOMB = auto()
    SPEED = auto()

@dataclass(frozen=True)
class AnimationCmd:
    type: AnimationType
    mode: CoordMode
    a: float|int # x if pixel, row if grid
    b: float|int # y if pixel, col if grid
    duration_frames: int
    id: int|None
    powerup_type: PowerUpType|None

class Direction(Enum):
    NORTH = (-1, 0)
    SOUTH = (1, 0)
    EAST = (0, 1)
    WEST = (0, -1)


class ExplosionOrientation(Enum):
    CENTER = auto() # cross type sprite or smthing
    VERTICAL = auto() # vertical
    HORIZONTAL = auto() # horizontal


# Updates and Events

class EventInfo(Protocol):
    def execute(self, world: WorldInfo) -> None: ...

class UpdateResultInfo(Protocol):
    @property
    def events(self) -> list[EventInfo]: ...
    @property
    def sounds(self) -> list[SoundType]: ...
    @property
    def animations(self) -> list[AnimationCmd]: ...
    def add_event(self, cmd: EventInfo): ...
    def add_sound(self, cmd: SoundType): ...
    def add_animation(self, cmd: AnimationCmd): ...

# The World

class WorldInfo(Protocol):
    @property
    def rows(self) -> int: ...
    @property
    def cols(self) -> int: ...
    @property
    def entities(self) -> set[EntityInfo]: ...
    @property
    def board(self) -> Board: ...
    def add_entity(self, entity: EntityInfo) -> None: ...
    def remove_entity(self, entity: EntityInfo) -> None: ...
    def get_entity_at(self, i: int, j: int) -> EntityInfo | None: ...
    def get_all_type(self, entity_type: type[T]) -> set[T]: ...
    def is_cell_blocking(self, row: int, col: int, player_id: int) -> bool: ...
    def in_bounds(self, i: int, j: int) -> bool: ...
    def clear(self) -> None: ...
    
class EntityInfo(Protocol):
    @property
    def row(self) -> int: ...
    @property
    def col(self) -> int: ...
    @property
    def is_expired(self) -> bool: ...
    @property
    def entity_type(self) -> EntityType: ...
    def on_explosion_hit(self) -> None: ...
    def update(self, dt: int) -> UpdateResultInfo: ...

# note: inaassume lang neto that we have only one entity per grid
T = TypeVar("T", bound=EntityInfo)
type Board = list[list[EntityInfo | None]]
type GridCoords = tuple[int, int]

# ENTITIES:

@runtime_checkable
class ExplosionInfo(Protocol):
    @property
    def row(self) -> int: ...
    @property
    def col(self) -> int: ...

    _full_timer: int # PRIVATE: we store the full duration of an explosion to last
    
    @property
    def current_timer(self) -> int: ...

    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...
    def update(self, dt: int) -> UpdateResultInfo: ...

@runtime_checkable
class BombInfo(Protocol):
    move_away_ids: set[int]
    @property
    def row(self) -> int: ...
    @property
    def col(self) -> int: ...

    _fuse: int # PRIVATE: we store the full countdown till the bomb explodes

    @property
    def current_timer(self) -> int: ...
    @property
    def owner(self) -> PlayerInfo: ...

    @property
    def should_detonate(self) -> bool: ...
    def get_affected_cells(self, world: WorldInfo) -> list[GridCoords]: ...
    # ^^^ for explosion calculation and danger sensing para sa mga enemies
    
    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...
    def update(self, dt: int) -> UpdateResultInfo: ...
    @property
    def explosion_range(self) -> int: ...
    def create_explosions(self, world: WorldInfo, result: UpdateResultInfo): ...


@runtime_checkable
class BlockInfo(Protocol):
    @property
    def row(self) -> int: ...
    @property
    def col(self) -> int: ...

    # note, create two subclasses for BlockInfo
    #   1. Hard (should have `pass` under `on_explosion_hit`)
    #   2. Soft
    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...
    def update(self, dt: int) -> UpdateResultInfo: ...
    @property
    def is_hard(self)-> bool: ...

@runtime_checkable
class PlayerInfo(Protocol):
    @property
    def row(self) -> int: ...
    @property
    def col(self) -> int: ...
    @property
    def id(self) -> int:...
    
    # need to store x and y, but idk if this violates LSP? ;-; what's an alternative..
    @property
    def x(self) -> float: ...
    @property
    def y(self) -> float: ...
    @property
    def width(self) -> int: ...
    @property
    def height(self) -> int: ...
    @property
    def hitbox_x(self) -> float: ...
    @property
    def hitbox_y(self) -> float: ...
    @property
    def speed(self) -> float: ...
    @property
    def direction_facing(self) -> Direction: ...
    @property
    def active_bombs(self) -> int: ...
    @property
    def range(self) -> int: ...
    @property
    def max_bombs(self) -> int: ...

    def handle_input(self, inputs: dict[str, bool]) -> int: ...
    def move(self, direction: Direction) -> int: ...
    def decide_move(self) -> Direction: ... # for AI
    def remove_bomb(self, bomb: BombInfo): ...
    def add_bomb(self, bomb: BombInfo): ...
    def remove_effect(self, effect: EffectInfo): ...
    def add_effect(self, effect: EffectInfo): ...
    def reset_for_new_round(self) -> None: ...

    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...
    def update(self, dt: int) -> UpdateResultInfo: ...

@runtime_checkable
class PowerupInfo(Protocol): # to implement pahelp lang hehe
    @property
    def row(self) -> int: ...
    @property
    def col(self) -> int: ...
    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    @property
    def powerup_type(self) -> PowerUpType: ...
    def on_explosion_hit(self) -> None: ...
    def update(self, dt: int) -> UpdateResultInfo: ...
    def on_pickup(self, player: PlayerInfo) -> UpdateResultInfo: ...

class PowerupSpawner(Protocol):
    @staticmethod
    def make(row: int, col: int) -> PowerupInfo: ...

@runtime_checkable
class EffectInfo(Protocol):
    time_remaining: int|None
    speed_delta: float
    bombs_delta: int
    range_delta: int
    def tick(self, dt: int) -> None: ...

# NON-ENTITIES:

class BotAIInfo(Protocol):
    # methods that will be useful for the AI's decision making
    def get_visible_distance(self) -> set[GridCoords]: ... # manhattan distance
    def get_shortest_path(self, goal: GridCoords) -> tuple[GridCoords]: ... # dijkstras algo
    def get_next_input(self) -> Direction | None: ...

class ConfigInfo(Protocol):
    @property
    def soft_block_spawn_chance(self) -> int: ...
    @property
    def powerup_spawn_chance(self) -> int: ...
    @property
    def timer_seconds(self) -> int: ...
    @property
    def num_human_players(self) -> int: ...
    @property
    def bot_types(self) -> list[str] | None: ...
    @property
    def rounds_to_win(self) -> int: ...

