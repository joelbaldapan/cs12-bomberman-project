from __future__ import annotations
from dataclasses import dataclass
from bot_behavior.bot_policy import AttackPolicy1, AttackPolicy2, BombOnlyDangerPolicy, ExplosionPredictionDangerPolicy, PowerupPolicy1, PowerupPolicy2
from common_types import PlayerInfo, WorldInfo, GridCoords
from .bot_types import BotConfigInfo, BotMemoryInfo, BotControllerInfo, BotState, BotType, ActionInfo, Action, DangerPolicy, PathfindingPolicy, PlayerAction
from .bot_state import WanderState, EscapeState, GetPowerupState
import random


class BotMemory():
    """Memory for the bot."""
    def __init__(self, config: BotConfigInfo):
        self._config = config
        self._reeval_timer: float = 0.0

        # Navigation Memory
        self._path: list[GridCoords] = []
        self._goal: GridCoords | None = None

        # Debug Data (Feature 4b)
        self._debug_danger_cells: set[GridCoords] = set()

    @property
    def config(self) -> BotConfigInfo:
        return self._config

    @property
    def reeval_timer(self) -> float:
        return self._reeval_timer

    def set_reeval_timer(self, value: float) -> None:
        self._reeval_timer = value

    @property
    def path(self) -> list[GridCoords]:
        return self._path

    def set_path(self, path: list[GridCoords]) -> None:
        self._path = path

    @property
    def goal(self) -> GridCoords | None:
        return self._goal

    def set_goal(self, goal: GridCoords | None) -> None:
        self._goal = goal

    @property
    def debug_danger_cells(self) -> set[GridCoords]:
        return self._debug_danger_cells

    def set_debug_danger_cells(self, cells: set[GridCoords]) -> None:
        self._debug_danger_cells = cells

    def tick_reeval(self, dt: float) -> bool:
        """Advance the reevaluation timer. Return `True` if reevaluation should occur."""
        self._reeval_timer += dt

        if self._reeval_timer >= self._config.reeval_interval:
            self._reeval_timer = 0.0
            return random.random() <= self._config.reeval_chance

        return False


class BotController:
    def __init__(self, bot_context: BotMemoryInfo):
        self.context = bot_context
        self.current_state: BotState = WanderState()
        self._initialized = False

    def update(self, dt: float, host_entity: PlayerInfo, world: WorldInfo) -> None:
        """
        Call this every frame/tick before decide_action.
        """
        if not self._initialized:
            self.current_state.on_enter(self.context, world, host_entity)
            self._initialized = True

        # 1 - tick the state
        self.current_state.on_tick(self.context, world, host_entity)

        # 2 - tick the reevaluation timer
        if self.context.tick_reeval(dt):
            # to implement
            # perform_global_reevaluation(self, world, host_entity)
            ...
            
        # 3 - check if we should transition; e.g. Escape/Powerup success
        # To improve (temporary for now)
        if isinstance(self.current_state, (EscapeState, GetPowerupState)):
            if self.context.goal and (host_entity.row, host_entity.col) == self.context.goal:
                self.transition_to(WanderState(), world, host_entity)

    def decide_action(self, host_entity: PlayerInfo, world: WorldInfo) -> ActionInfo:
        action = self.current_state.decide_action(self.context, world, host_entity)
        if action is None:
            return Action(action_type=PlayerAction.IDLE)
        return action

    def transition_to(self, new_state: BotState, world: WorldInfo, entity: PlayerInfo):
        self.current_state = new_state
        self.context.set_path([])
        self.context.set_goal(None)
        self.current_state.on_enter(self.context, world, entity)



class BotFactory:
    @classmethod
    def make(cls, bot_type: BotType) -> BotControllerInfo:
        config = cls.create_bot_config(bot_type)
        context = BotMemory(config)
        controller = BotController(context)
        return controller
    
    @classmethod
    def create_bot_config(cls, bot_type: BotType) -> BotConfigInfo:
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


@dataclass(frozen=True)
class BotConfig:
    # Reevaluation Settings
    reeval_interval: float  # Seconds
    reeval_chance: float    # 0.0 to 1.0 (percent/100)
    
    # Danger Sensing
    danger_radius: int      # 'D'
    danger_check_type: DangerPolicy
    
    # Policies
    attack_policy: PathfindingPolicy
    attack_range_trigger: int # 'R' (Plant bomb if enemy within this distance)
    attack_search_radius: int # 'A' (For Policy 1: check players within this dist)
    
    powerup_policy: PathfindingPolicy
    powerup_chance: float   # 0.0 to 1.0 (Chance to use Policy 2)
