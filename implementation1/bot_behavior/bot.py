from __future__ import annotations
from copy import deepcopy
from dataclasses import dataclass
from bot_behavior.bot_policy import AttackPolicy1, AttackPolicy2, BombOnlyDangerPolicy, ExplosionPredictionDangerPolicy, PowerupPolicy1, PowerupPolicy2
from common_types import BotConfigInfo, BotControllerInfo, BotMemoryInfo, BotPlayerInfo, BotState, ActionInfo, Action, PlayerAction, BombInfo, ExplosionInfo, WorldInfo, GridCoords, BotType
from .bot_state import AttackState, EscapeState, GetPowerupState, WanderState
import random


class BotController:
    def __init__(self, bot_config: BotConfigInfo):
        self._config = bot_config
        self._memory = BotMemory()
        self._current_state: BotState = WanderState()
        self._initialized = False
        self._last_bomb_count = 0
        self._last_explosion_count = 0

    @property
    def config(self) -> BotConfigInfo:
        return deepcopy(self._config)
    
    @property
    def memory(self) -> BotMemoryInfo:
        return deepcopy(self._memory)

    @property
    def current_state(self) -> BotState:
        return self._current_state

    def _initialize(self, dt: float, host_entity: BotPlayerInfo, world: WorldInfo):
            self._current_state.on_enter(self._config, self._memory, world, host_entity)
            self._initialized = True
            self._last_bomb_coords = {(b.row, b.col)
                                      for b in world.get_all_type(BombInfo)}
            self._last_explosion_coords = {
                (e.row, e.col) for e in world.get_all_type(ExplosionInfo)}
            
    def update(self, dt: float, host_entity: BotPlayerInfo, world: WorldInfo) -> None:
        # Init state on first frame
        if not self._initialized:
            self._initialize(dt, host_entity, world)

        should_force_reeval = False

        current_bomb_coords = {
            (b.row, b.col) for b in world.get_all_type(BombInfo)
        }
        current_explosion_coords = {
            (e.row, e.col) for e in world.get_all_type(ExplosionInfo)
        }

        should_force_reeval = False

        if self._memory.last_explosion_coords - current_explosion_coords:
            should_force_reeval = True

        new_bombs = current_bomb_coords - self._memory.last_bomb_coords
        for (r, c) in new_bombs:
            dist = max(abs(host_entity.col - c), abs(host_entity.row - r))
            if dist <= 5:
                should_force_reeval = True
                break

        self._memory.set_last_bomb_coords(current_bomb_coords)
        self._memory.set_last_explosion_coords(current_explosion_coords)


        timer_trigger = self._memory.tick_reeval(dt, self._config.reeval_interval, self._config.reeval_chance)
        is_in_danger = self._config.danger_check_type.is_in_danger(
            world, host_entity, self._config.danger_radius
        )

        # Check if danger!
        if is_in_danger:
            if not isinstance(self._current_state, EscapeState):
                self.transition_to(EscapeState(), world, host_entity)

        if timer_trigger or should_force_reeval or is_in_danger:
            self._perform_global_reevaluation(world, host_entity)

        if self._current_state:
            next_state = self._current_state.on_tick(self._config, self._memory, world, host_entity)
            if next_state:
                self.transition_to(next_state, world, host_entity)

    def decide_action(self, host_entity: BotPlayerInfo, world: WorldInfo) -> ActionInfo:
        action = self._current_state.decide_action(self._config, self._memory, world, host_entity)
        if action is None:
            return Action(action_type=PlayerAction.IDLE)
        return action

    def transition_to(self, new_state: BotState, world: WorldInfo, entity: BotPlayerInfo):
        # Clean up _memory before switching
        self._memory.set_path([])
        self._memory.set_goal(None)
        self._memory.set_strict_movement(False)

        self._current_state = new_state
        self._current_state.on_enter(self._config, self._memory, world, entity)

    def _perform_global_reevaluation(self, world: WorldInfo, bot: BotPlayerInfo):
        # 1 - Danger
        if self._config.danger_check_type.is_in_danger(world, bot, self._config.danger_radius):
            if not isinstance(self._current_state, EscapeState):
                self.transition_to(EscapeState(), world, bot)
            return

        # 2 - Powerup Check
        if random.random() <= self._config.powerup_chance:
            target = self._config.powerup_policy.get_goal(world, bot)
            path = self._config.powerup_policy.get_path(world, bot, self._memory)
            if target and path:
                if isinstance(self._current_state, GetPowerupState):
                    if self._memory.goal == target:
                        return

                self.transition_to(GetPowerupState(target), world, bot)
                return

        # 3 - Attack Check
        target_attack_pos = self._config.attack_policy.get_goal(world, bot)
        if target_attack_pos:
            self.transition_to(AttackState(target_attack_pos), world, bot)
            return

        # 4 - Default -> Wander
        if not isinstance(self._current_state, WanderState):
            self.transition_to(WanderState(), world, bot)


@dataclass
class BotMemory():
    """Memory for the bot."""

    def __init__(self):
        self._reeval_timer: float = 0.0

        # Navigation Memory
        self._path: list[GridCoords] = []
        self._goal: GridCoords | None = None
        self._is_strict_movement: bool = False

        # Perception _memory
        self._last_bomb_coords: set[GridCoords] = set()
        self._last_explosion_coords: set[GridCoords] = set()

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
    def is_strict_movement(self) -> bool:
        return self._is_strict_movement

    def set_strict_movement(self, value: bool) -> None:
        self._is_strict_movement = value

    @property
    def goal(self) -> GridCoords | None:
        return self._goal

    def set_goal(self, goal: GridCoords | None) -> None:
        self._goal = goal

    @property
    def last_bomb_coords(self) -> set[GridCoords]:
        return self._last_bomb_coords
    
    def set_last_bomb_coords(self, coords: set[GridCoords]) -> None:
        self._last_bomb_coords = coords

    @property
    def last_explosion_coords(self) -> set[GridCoords]:
        return self._last_explosion_coords

    def set_last_explosion_coords(self, coords: set[GridCoords]) -> None:
        self._last_explosion_coords = coords

    def tick_reeval(self, dt: float, reeval_interval: float, reeval_chance: float) -> bool:
        """Advance the reevaluation timer. Return `True` if reevaluation should occur."""
        self._reeval_timer += dt

        if self._reeval_timer >= reeval_interval:
            self._reeval_timer = 0.0
            return random.random() <= reeval_chance

        return False



@dataclass(frozen=True)
class HostileBotConfig:
    bot_type = BotType.HOSTILE

    reeval_interval = 0.5
    reeval_chance = 0.25

    danger_radius = 0
    danger_check_type = BombOnlyDangerPolicy()

    attack_policy = AttackPolicy2()
    attack_range_trigger = 2
    attack_search_radius = 0

    powerup_policy = PowerupPolicy2()
    powerup_chance = 0.20

@dataclass(frozen=True)
class CarefulBotConfig:
    bot_type = BotType.CAREFUL

    reeval_interval = 0.25
    reeval_chance = 1.0

    danger_radius = 4
    danger_check_type = ExplosionPredictionDangerPolicy()

    attack_policy = AttackPolicy1(max_distance=3)
    attack_range_trigger = 4
    attack_search_radius = 3

    powerup_policy = PowerupPolicy2()
    powerup_chance = 1.0


@dataclass(frozen=True)
class GreedyBotConfig:
    bot_type = BotType.GREEDY

    reeval_interval = 1.0
    reeval_chance = 1.0

    danger_radius = 2
    danger_check_type = ExplosionPredictionDangerPolicy()

    attack_policy = AttackPolicy1(max_distance=6)
    attack_range_trigger = 3
    attack_search_radius = 6

    powerup_policy = PowerupPolicy1()
    powerup_chance = 1.0


class BotFactory:
    @classmethod
    def make(cls, bot_type: BotType) -> BotControllerInfo:
        config = cls.create_bot_config(bot_type)
        return BotController(config)

    @classmethod
    def create_bot_config(cls, bot_type: BotType) -> BotConfigInfo:
        match bot_type:
            case BotType.HOSTILE:
                return HostileBotConfig()
            case BotType.CAREFUL:
                return CarefulBotConfig()
            case BotType.GREEDY:
                return GreedyBotConfig()
            case _:
                raise ValueError(f"Unknown bot type: {bot_type}")
