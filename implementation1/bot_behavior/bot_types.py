from __future__ import annotations
from enum import Enum, auto, StrEnum
from common_types import Direction, GridCoords, WorldInfo, PlayerInfo
from dataclasses import dataclass
from typing import Protocol


class WalkMode(StrEnum):
    SIMPLE = auto()    # Can traverse Soft Blocks (will plant bombs kung kailangan)
    REACHABLE = auto() # Cannot traverse Soft Blocks (strict path)


class PlayerAction(Enum):
    MOVE = auto()
    PLANT_BOMB = auto()
    IDLE = auto()

@dataclass(frozen=True)
class Action:
    action_type: PlayerAction
    move_direction: Direction | None = None

class ActionInfo(Protocol):
    @property
    def action_type(self) -> PlayerAction: ...
    @property
    def move_direction(self) -> Direction | None: ...



class BotState(Protocol):
    def on_enter(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> None: ...
    
    def on_tick(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> None: ...
    
    def decide_action(self, bot: BotMemoryInfo, world: WorldInfo, entity: PlayerInfo) -> ActionInfo | None: ...



class PathfindingPolicy(Protocol):
    def get_goal(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> GridCoords | None:
        ...
    def get_path(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> list[GridCoords]:
        ...


class DangerPolicy(Protocol):
    def is_in_danger(self, world: WorldInfo, bot: PlayerInfo, radius: int) -> bool:
        ...



class BotMemoryInfo(Protocol):
    @property
    def config(self) -> BotConfigInfo: ...
    
    @property
    def reeval_timer(self) -> float: ...
    def set_reeval_timer(self, value: float) -> None: ...
    
    @property
    def path(self) -> list[GridCoords]: ...
    def set_path(self, path: list[GridCoords]) -> None: ...
    
    @property
    def goal(self) -> GridCoords | None: ...
    def set_goal(self, goal: GridCoords | None) -> None: ...
    
    @property
    def debug_danger_cells(self) -> set[GridCoords]: ...
    def set_debug_danger_cells(self, cells: set[GridCoords]) -> None: ...

    def tick_reeval(self, dt: float) -> bool: ...

class BotControllerInfo(Protocol):
    def update(self, dt: float, host_entity: PlayerInfo, world: WorldInfo) -> None: ...
    def decide_action(self, host_entity: PlayerInfo, world: WorldInfo) -> ActionInfo: ...
    def transition_to(self, new_state: BotState, world: WorldInfo, entity: PlayerInfo): ...

# bot configs
# need to make protocol?

class BotType(StrEnum):
    HOSTILE = auto()
    CAREFUL = auto()
    GREEDY = auto()


class BotConfigInfo(Protocol):
    @property
    def reeval_interval(self) -> float: ...
    
    @property
    def reeval_chance(self) -> float: ...
    
    @property
    def danger_radius(self) -> int: ...
    
    @property
    def danger_check_type(self) -> DangerPolicy: ...
    
    @property
    def attack_policy(self) -> PathfindingPolicy: ...
    
    @property
    def attack_range_trigger(self) -> int: ...
    
    @property
    def attack_search_radius(self) -> int: ...
    
    @property
    def powerup_policy(self) -> PathfindingPolicy: ...
    
    @property
    def powerup_chance(self) -> float: ...

