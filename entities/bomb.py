from __future__ import annotations
from dataclasses import dataclass
from common_types import GridCoords, PlayerInfo, EntityType, SoundType, UpdateResultInfo
from helpers.event import DestroyEvent, UpdateResult


@dataclass
class Bomb:
    _row: int
    _col: int
    _full_timer: int
    _range: int
    _owner: PlayerInfo

    _current_timer: int = 0
    _triggered: bool = False  
    _expired: bool = False

    @property
    def row(self) -> int:
        return self._row

    @property
    def col(self) -> int:
        return self._col

    @property
    def entity_type(self) -> EntityType:
        return EntityType.BOMB

    @property
    def is_expired(self) -> bool:
        return self._expired

    @property
    def current_timer(self) -> int:
        return self._current_timer

    @property
    def owner(self) -> PlayerInfo:
        return self._owner
    @property
    def power(self) -> int:
        return self._range
    @property
    def explosion_range(self) -> int: 
        return self._range
    
    @property
    def should_detonate(self) -> bool:
        # one is for being caught in explosion, other is fuse running out
        return self._triggered or self.current_timer >= self._full_timer


    def update(self, dt: int) -> UpdateResultInfo:
        result = UpdateResult()

        if self._expired:
            return result

        self._current_timer += dt
        if self._triggered:
            result.add_event(DestroyEvent(self))
            result.add_sound(SoundType.EXPLOSION)
            self._expired = True

        if not self._triggered and self._current_timer >= self._full_timer:
            self._triggered = True
            result.add_event(DestroyEvent(self))
            result.add_sound(SoundType.EXPLOSION)
            self._expired = True

        return result

    def on_explosion_hit(self) -> None:
        if self._expired:
            return

        self._triggered = True
        self._current_timer = self._full_timer

    def get_affected_cells(self) -> list[GridCoords]:
        """
        !!!
        Right now it just returns yung range ng cells affected, not taking into account yung soft blocks and hard blocks blocking shit,
        kailangan ng world dependency pa ung actual affected areas.
        """
        cells: list[GridCoords] = [(self._row, self._col)]

        for d in range(1, self._range + 1):
            cells.append((self._row - d, self._col))  #north
            cells.append((self._row + d, self._col))  #south
            cells.append((self._row, self._col - d))  #west
            cells.append((self._row, self._col + d))  #east

        return cells

class BombFactory:
    @classmethod
    def make(cls, row: int, col: int, full_timer: int, range: int, owner: PlayerInfo,) -> Bomb:
        return Bomb(row, col,full_timer, range, owner)
