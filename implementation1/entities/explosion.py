from __future__ import annotations
from dataclasses import dataclass
from common_types import EntityType, Direction, ExplosionInfo, UpdateResultInfo, ExplosionOrientation
from helpers.event import UpdateResult, RemoveEvent



@dataclass(eq=False)
class Explosion:
    _row: int
    _col: int
    orientation: ExplosionOrientation
    _full_timer: int
    terminal_direction: Direction | None = None

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
    def full_timer(self) -> int:
        return self._full_timer
    @property
    def entity_type(self) -> EntityType:
        return EntityType.EXPLOSION

    @property
    def is_expired(self) -> bool:
        return self._expired
    

    def on_explosion_hit(self) -> None:
        return None

    def update(self, dt: int) -> UpdateResultInfo:
        results: UpdateResultInfo = UpdateResult()
        self._current_timer += dt
        if self._current_timer >= self._full_timer:
            self._expired = True
            results.add_event(RemoveEvent(self))

        return results

class ExplosionFactory:

    @classmethod
    def make(cls, r: int, c: int, orientation: ExplosionOrientation, full_timer:int, direction: Direction|None)-> ExplosionInfo:
        return Explosion(r, c, orientation, full_timer, direction)