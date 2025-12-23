from __future__ import annotations
from enum import Enum, auto
from common_types import PlayerInfo, WorldInfo, EntityInfo, Direction
from dataclasses import dataclass
from typing import Protocol


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

"""
WanderState:
- on_enter: pick random goal + path
- decide_action: if next cell soft block and no bomb -> PLANT_BOMB else MOVE

EscapeState:
- on_enter: choose escape goal not dangerous
- decide_action: move along path or switch to WANDER if reached

AttackState:
- on_enter: depends on attack policy
- decide_action: follow path/update dynamic policies, plant bombs per rules

GetPowerupState:
- similar to WANDER but goal is powerup cell.
"""

class BotState(Protocol):
    def decide_action(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> ActionInfo:
        ...

    def on_enter(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...

    def on_tick(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...


class EscapeState:
    def decide_action(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> ActionInfo:
        ...

    def on_enter(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...

    def on_tick(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...


class WanderState:
    def decide_action(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> ActionInfo:
        ...

    def on_enter(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...

    def on_tick(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...


class GetPowerupState:
    def decide_action(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> ActionInfo:
        ...

    def on_enter(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...

    def on_tick(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...


class AttackState:
    def decide_action(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> ActionInfo:
        ...

    def on_enter(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...

    def on_tick(self, bot: PlayerInfo, world: WorldInfo, entity: EntityInfo) -> None:
        ...

