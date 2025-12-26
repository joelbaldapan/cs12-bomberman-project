from __future__ import annotations
from dataclasses import dataclass
from common_types import EffectInfo, EntityType, PowerupInfo, SoundType, UpdateResultInfo, PlayerInfo
from helpers.event import RemoveEvent, UpdateResult


@dataclass(eq=False)
class Powerup: 
    def __init__(self, row: int, col: int, duration: int|None):
        self._row: int = row
        self._col: int = col
        self._expired: bool = False
        self._effect: EffectInfo = EffectFactory.make(duration, 0, 0, 0)
    @property
    def row(self) -> int:
        return self._row
    @property
    def col(self) -> int:
        return self._col
    @property
    def entity_type(self) -> EntityType:
        return EntityType.POWERUP
    @property
    def is_expired(self) -> bool:
        return self._expired
    
    @property
    def effect(self) -> EffectInfo:
        return self._effect
    
    def on_explosion_hit(self) -> None:
        self._expired = True
        return
    
    def on_pickup(self, player: PlayerInfo) -> UpdateResultInfo:
        result = UpdateResult()
        player.add_effect(self.effect)
        result.add_event(RemoveEvent(self))
        result.add_sound(SoundType.POWERUP_GET)
        return result

    
    def update(self, dt: int) -> UpdateResultInfo:
        result = UpdateResult()
        if self._expired:
            result.add_event(RemoveEvent(self))
        return result

@dataclass(eq=False)
class FireUp(Powerup):
    def __init__(self, row: int, col: int, duration: int | None):
        super().__init__(row, col, duration)
        self._effect: EffectInfo = EffectFactory.make(duration, 0, 0, 1)

@dataclass(eq=False)
class BombUp(Powerup):
    def __init__(self, row: int, col: int, duration: int | None):
        super().__init__(row, col, duration)
        self._effect: EffectInfo = EffectFactory.make(duration, 0, 1, 0)
@dataclass(eq=False)
class SpeedUp(Powerup):
    def __init__(self, row: int, col: int, duration: int | None):
        super().__init__(row, col, duration)
        self._effect: EffectInfo = EffectFactory.make(duration, 0.2, 0, 0)

@dataclass(eq=False)
class Effect:
    time_remaining: int|None
    speed_delta: float
    bombs_delta: int
    range_delta: int

    def tick(self, dt: int) -> None:
        if self.time_remaining is None:
            return
        self.time_remaining -= dt



class PowerupFactory():
    @classmethod
    def make_fire(cls, row: int, col: int, duration: None|int) -> PowerupInfo:
        return FireUp(row, col, duration)
    @classmethod
    def make_bomb(cls, row: int, col: int, duration: None|int) -> PowerupInfo:
        return BombUp(row, col, duration)
    @classmethod
    def make_speed(cls, row: int, col: int, duration: None|int) -> PowerupInfo:
        return SpeedUp(row, col, duration)


class EffectFactory():
    @classmethod
    def make(cls, duration: None|int, speed: float, bombs: int, range: int) -> EffectInfo:
        return Effect(duration, speed, bombs, range)