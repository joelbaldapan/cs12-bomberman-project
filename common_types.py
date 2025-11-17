from __future__ import annotations
from typing import Protocol, TypeVar
from enum import Enum, StrEnum, auto


# new types for readabilityy

class EntityType(StrEnum):
    EXPLOSION = auto()
    BOMB = auto()
    BLOCK = auto()
    PLAYER = auto()
    POWERUP = auto()

GridCoords = tuple[int, int]

class Direction(Enum):
    NORTH = (-1, 0)
    SOUTH = (1, 0)
    EAST = (0, 1)
    WEST = (0, -1)


# IMPORTANT: Note that ALL `entities` have the follow methods:
# - this will be important for OCP purposes
# - aka, we can do stuff like:
#       for all entity in entities:
#           if entity is in an explosion:
#               then, run entity.on_explosion_hit
#               ^^ (since all entities have this, we are 100% certain
#                   this doesn't cause an error!)

class EntityInfo(Protocol):
    @property
    def i(self) -> int: ...
    @property
    def j(self) -> int: ...
    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...


# ENTITIES:


class ExplosionInfo(Protocol):
    _full_timer: int # PRIVATE: we store the full duration of an explosion to last
    @property
    def i(self) -> int: ...
    @property
    def j(self) -> int: ...
    
    @property
    def current_timer(self) -> int: ...

    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...
    def tick(self): ...


class BombInfo(Protocol):
    _full_timer: int # PRIVATE: we store the full countdown till the bomb explodes
    @property
    def i(self) -> int: ...
    @property
    def j(self) -> int: ...

    @property
    def current_timer(self) -> int: ...
    @property
    def power(self) -> int: ...
    @property
    def owner(self) -> PlayerInfo: ...
    def get_affected_cells(self) -> list[GridCoords]: ...
    # ^^^ for explosion calculation and danger sensing para sa mga enemies
    
    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...
    def tick(self): ...


class BlockInfo(Protocol):
    # note, create two subclasses for BlockInfo
    #   1. Hard (should have `pass` under `on_explosion_hit`)
    #   2. Soft
    @property
    def i(self) -> int: ...
    @property
    def j(self) -> int: ...
    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...


class PlayerInfo(Protocol):
    @property
    def i(self) -> int: ...
    @property
    def j(self) -> int: ...

    @property
    def x(self) -> int: ...
    @property
    def y(self) -> int: ...
    @property
    def width(self) -> int: ...
    @property
    def height(self) -> int: ...

    @property
    def speed(self) -> float: ...
    def move(self, direction: Direction) -> int: ...
    def decide_move(self) -> Direction: ... # for AI
    def set_speed(self, ds: int): ...
    
    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...


class PowerupInfo(Protocol):
    ... # to implement pahelp lang hehe
    @property
    def i(self) -> int: ...
    @property
    def j(self) -> int: ...

    @property
    def entity_type(self) -> EntityType: ...
    @property
    def is_expired(self) -> bool: ...
    def on_explosion_hit(self) -> None: ...


# NON-ENTITIES:

# note: inaassume lang neto that we have only one entity per grid
Board = list[list[EntityInfo | None]]

class BotAIInfo(Protocol):
    # methods that will be useful for the AI's decision making
    def get_visible_distance(self) -> set[GridCoords]: ... # manhattan distance
    def get_shortest_path(self, goal: GridCoords) -> tuple[GridCoords]: ... # dijkstras algo
    def get_next_input(self) -> Direction | None: ...

# from LE1 ;-; ganito pala ung implementation nya huhu
T = TypeVar("T", bound=EntityInfo)

class EntityHandler(Protocol[T]):
    def update(self, dt: int): ...
    def add(self, entity: T): ...
    def get_all(self) -> set[T]: ...
    def remove(self, entity: T): ...


