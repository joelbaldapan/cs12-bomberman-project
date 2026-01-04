from __future__ import annotations
from dataclasses import dataclass
from common_types import EffectInfo, EntityType, PowerUpType, PowerupInfo, PowerupSpawner, SoundType, UpdateResultInfo, PlayerInfo
from helpers.event import RemoveEvent, UpdateResult

@dataclass(eq=False)
class Powerup: 
    def __init__(self, row: int, col: int, fps: int):
        self._row: int = row
        self._col: int = col
        self._expired: bool = False
        self._effect: EffectInfo = EffectFactory.make(None, 0, 0, 0)
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
    
    @property
    def powerup_type(self) -> PowerUpType:
        return PowerUpType.FIRE
    
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
    def __init__(self, row: int, col: int, fps: int):
        super().__init__(row, col, fps)
        self._effect: EffectInfo = EffectFactory.make(None, 0, 0, 1)
    @property
    def powerup_type(self) -> PowerUpType:
        return PowerUpType.FIRE

@dataclass(eq=False)
class BombUp(Powerup):
    def __init__(self, row: int, col: int, fps: int):
        super().__init__(row, col, fps)
        self._effect: EffectInfo = EffectFactory.make(None, 0, 1, 0)
    @property
    def powerup_type(self) -> PowerUpType:
        return PowerUpType.BOMB
    
@dataclass(eq=False)
class SpeedUp(Powerup):
    def __init__(self, row: int, col: int, fps: int):
        super().__init__(row, col, fps)
        self._effect: EffectInfo = EffectFactory.make(None, 0.2, 0, 0)
    @property
    def powerup_type(self) -> PowerUpType:
        return PowerUpType.SPEED

@dataclass(eq=False)
class Rainbow(Powerup):
    def __init__(self, row: int, col: int, fps: int):
        super().__init__(row, col, fps)
        self._effect: EffectInfo = EffectFactory.make(10*fps, 0.6, 3, 3)
    @property
    def powerup_type(self) -> PowerUpType:
        return PowerUpType.RAINBOW

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

class FireUpFactory():
    @staticmethod
    def make(row: int, col: int, fps: int) -> PowerupInfo:
        return FireUp(row, col, fps)

class BombUpFactory():
    @staticmethod
    def make(row: int, col: int, fps: int) -> PowerupInfo:
        return BombUp(row, col, fps)

class SpeedUpFactory():
    @staticmethod
    def make(row: int, col: int, fps: int) -> PowerupInfo:
        return SpeedUp(row, col, fps)

class RainbowFactory():
    @staticmethod
    def make(row: int, col: int, fps: int) -> PowerupInfo:
        return Rainbow(row, col, fps)

Powerup_Factories: tuple[PowerupSpawner, *tuple[PowerupSpawner,...]] = (FireUpFactory, BombUpFactory, SpeedUpFactory, RainbowFactory)

class EffectFactory():
    @classmethod
    def make(cls, duration: None|int, speed: float, bombs: int, range: int) -> EffectInfo:
        return Effect(duration, speed, bombs, range)