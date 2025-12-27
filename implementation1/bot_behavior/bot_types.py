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


class BotType(StrEnum):
    HOSTILE = auto()
    CAREFUL = auto()
    GREEDY = auto()



class BotState(Protocol):
    def on_enter(self, bot: BotContextInfo, world: WorldInfo, entity: PlayerInfo) -> None: ...
    
    def on_tick(self, bot: BotContextInfo, world: WorldInfo, entity: PlayerInfo) -> None: ...
    
    def decide_action(self, bot: BotContextInfo, world: WorldInfo, entity: PlayerInfo) -> ActionInfo | None: ...


class BotContextInfo(Protocol):
    @property
    def config(self) -> BotConfig: ...
    
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
    def target_entity_id(self) -> int | None: ...
    def set_target_entity_id(self, entity_id: int | None) -> None: ...
    
    @property
    def debug_danger_cells(self) -> set[GridCoords]: ...
    def set_debug_danger_cells(self, cells: set[GridCoords]) -> None: ...

# TODO:
#   Add Policy for GetPowerup State
#   Add Policy for Attack State

# bot configs
# need to make protocol soon

@dataclass
class BotConfig:
    # Reevaluation Settings
    reeval_interval: float  # Seconds
    reeval_chance: float    # 0.0 to 1.0 (percent/100)
    
    # Danger Sensing
    danger_radius: int      # 'D'
    danger_check_type: str  # 'bomb_only' (Hostile) or 'prediction' (Careful/Greedy)
    
    # Policies
    attack_policy: int        # 1 or 2
    attack_range_trigger: int # 'R' (Plant bomb if enemy within this distance)
    attack_search_radius: int # 'A' (For Policy 1: check players within this dist)
    
    powerup_policy: int     # 1 or 2
    powerup_chance: float   # 0.0 to 1.0 (Chance to use Policy 2)
