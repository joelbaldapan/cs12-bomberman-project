from __future__ import annotations
from dataclasses import dataclass
from common_types import EntityType, Direction, UpdateResultInfo, ExplosionOrientation
from helpers.event import UpdateResult, RemoveEvent



@dataclass
class Explosion:
    _row: int
    _col: int
    orientation: ExplosionOrientation
    terminal_direction: Direction | None = None

    # how long this explosion lasts, in seconds OR frames (imo mas better frames since discrete)
    _full_timer: int = 1 #multiplied by frames

    # state
    _current_timer: int = 0
    _expired: bool = False

    @property
    def row(self) -> int:
        return self._row

    @property
    def col(self) -> int:
        return self._col
    
    @property
    def current_timer(self) -> int:
        return self._current_timer

    @property
    def entity_type(self) -> EntityType:
        return EntityType.EXPLOSION

    @property
    def is_expired(self) -> bool:
        return self._expired
    

    def on_explosion_hit(self) -> None:
        return None

    def update(self, dt: int) -> UpdateResultInfo:
        """
        advance the explosion timer.

        suggest q gawin pass the frames or something para integer lang lahat
        """
        results: UpdateResultInfo = UpdateResult()
        self._current_timer += dt
        if self._current_timer >= self._full_timer:
            self._expired = True
            results.add_event(RemoveEvent(self))

        return results

class ExplosionFactory:

    @classmethod
    def make(cls, r: int, c: int, orientation: ExplosionOrientation, direction: Direction|None)-> Explosion:
        return Explosion(r, c, orientation, direction)