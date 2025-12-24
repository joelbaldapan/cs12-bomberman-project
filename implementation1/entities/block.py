from __future__ import annotations
from dataclasses import dataclass
from common_types import BlockInfo, EntityType, UpdateResultInfo
from helpers.event import UpdateResult


@dataclass
class HardBlock:
    _row: int
    _col: int
    _expired: bool = False

    @property
    def row(self) -> int: 
        return self._row

    @property
    def col(self) -> int: 
        return self._col

    @property
    def entity_type(self) -> EntityType: 
        return EntityType.BLOCK
    
    @property
    def is_hard(self)-> bool:
        return True

    @property
    def is_expired(self) -> bool: 
        return self._expired

    def on_explosion_hit(self) -> None:
        return

    def update(self, dt: int) -> UpdateResultInfo:
        result = UpdateResult()
        return result


@dataclass
class SoftBlock:
    _row: int
    _col: int
    _expired: bool = False

    @property
    def row(self) -> int: 
        return self._row

    @property
    def col(self) -> int: 
        return self._col

    @property
    def entity_type(self) -> EntityType: 
        return EntityType.BLOCK

    @property
    def is_expired(self) -> bool: 
        return self._expired
    
    @property
    def is_hard(self)-> bool:
        return False

    def on_explosion_hit(self) -> None:
        self._expired = True
        return

    def update(self, dt: int) -> UpdateResultInfo:
        result = UpdateResult()
        return result


class BlockFactory:
    @classmethod
    def make_hard(cls, row: int, col: int) -> BlockInfo:
        return HardBlock(row, col)

    @classmethod
    def make_soft(cls, row: int, col: int) -> BlockInfo:
        return SoftBlock(row, col)
