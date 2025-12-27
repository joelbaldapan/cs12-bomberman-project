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
    def on_enter(self, bot: BotContextInfo, world: WorldInfo, entity: PlayerInfo) -> None: ...
    
    def on_tick(self, bot: BotContextInfo, world: WorldInfo, entity: PlayerInfo) -> None: ...
    
    def decide_action(self, bot: BotContextInfo, world: WorldInfo, entity: PlayerInfo) -> ActionInfo | None: ...



class PathfindingPolicy(Protocol):
    def get_goal(self) -> GridCoords | None: ...

class DangerPolicy(Protocol):
    def is_in_danger(self) -> bool: ...

# temporary
class AttackPolicy1:
    def __init__(self, reachable_only: bool, max_distance: int): ...
    def get_goal(self) -> GridCoords | None: ...
class AttackPolicy2:
    # def __init__(self, reachable_only: bool, max_distance: int): ...
    def get_goal(self) -> GridCoords | None: ...
class PowerupPolicy1:
    def get_goal(self) -> GridCoords | None: ...
class PowerupPolicy2:
    def get_goal(self) -> GridCoords | None: ...


class BombOnlyDangerPolicy:
    def is_in_danger(self) -> bool: ...

class ExplosionPredictionDangerPolicy:
    def is_in_danger(self) -> bool: ...

# temporary

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



# bot configs
# need to make protocol?

class BotType(StrEnum):
    HOSTILE = auto()
    CAREFUL = auto()
    GREEDY = auto()


class BotConfigFactory():
    @classmethod
    def create_bot_config(cls, bot_type: BotType) -> BotConfig:
        match bot_type:
            case BotType.HOSTILE:
                return BotConfig(
                    # Reevaluation
                    reeval_interval=0.5,
                    reeval_chance=0.25,

                    # Danger sensing
                    danger_radius=0,  # only current cell
                    danger_check_type=BombOnlyDangerPolicy(),

                    # Attack
                    attack_policy=AttackPolicy2(),
                    attack_range_trigger=2,
                    attack_search_radius=0,  # unused by policy 2

                    # Powerups
                    powerup_policy=PowerupPolicy2(),
                    powerup_chance=0.20,
                )

            case BotType.CAREFUL:
                return BotConfig(
                    # Reevaluation
                    reeval_interval=0.25,
                    reeval_chance=1.0,

                    # Danger sensing
                    danger_radius=4,
                    danger_check_type=ExplosionPredictionDangerPolicy(),

                    # Attack
                    attack_policy=AttackPolicy1(
                        reachable_only=True,
                        max_distance=3,
                    ),
                    attack_range_trigger=4,
                    attack_search_radius=3,

                    # Powerups
                    powerup_policy=PowerupPolicy2(),
                    powerup_chance=1.0,
                )

            case BotType.GREEDY:
                return BotConfig(
                    # Reevaluation
                    reeval_interval=1.0,
                    reeval_chance=1.0,

                    # Danger sensing
                    danger_radius=2,
                    danger_check_type=ExplosionPredictionDangerPolicy(),

                    # Attack
                    attack_policy=AttackPolicy1(
                        reachable_only=True,
                        max_distance=6,
                    ),
                    attack_range_trigger=3,
                    attack_search_radius=6,

                    # Powerups
                    powerup_policy=PowerupPolicy1(),
                    powerup_chance=1.0,
                )

            case _:
                raise ValueError(f"Unknown bot type: {bot_type}")



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

@dataclass
class BotConfig:
    # Reevaluation Settings
    reeval_interval: float  # Seconds
    reeval_chance: float    # 0.0 to 1.0 (percent/100)
    
    # Danger Sensing
    danger_radius: int      # 'D'
    danger_check_type: DangerPolicy  # 'bomb_only' (Hostile) or 'prediction' (Careful/Greedy)
    
    # Policies
    attack_policy: PathfindingPolicy
    attack_range_trigger: int # 'R' (Plant bomb if enemy within this distance)
    attack_search_radius: int # 'A' (For Policy 1: check players within this dist)
    
    powerup_policy: PathfindingPolicy
    powerup_chance: float   # 0.0 to 1.0 (Chance to use Policy 2)
