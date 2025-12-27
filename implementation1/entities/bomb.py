from __future__ import annotations
from dataclasses import dataclass
from common_types import BombInfo, GridCoords, PlayerInfo, EntityType, SoundType, UpdateResultInfo, WorldInfo, Direction
from helpers.event import RemoveEvent, UpdateResult, SpawnEvent
from explosion import ExplosionFactory, ExplosionOrientation


@dataclass(eq=False)
class Bomb:
    def __init__(self, row: int, col: int, timer: int, range: int, owner: PlayerInfo):
        self._row: int = row
        self._col: int = col
        self._full_timer: int = timer
        self._range: int = range
        self._owner: PlayerInfo = owner
        self._current_timer: int = 0 
        self._expired: bool = False
        self.move_away_ids: set[int] = set()

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
    def explosion_range(self) -> int: 
        return self._range
    
    @property
    def should_detonate(self) -> bool:
        return self.current_timer >= self._full_timer
    
    @property
    def explosion_duration(self) -> int:
        return self._full_timer//3


    def update(self, dt: int) -> UpdateResultInfo:
        result = UpdateResult()
        if self._expired:
            return result
        self._current_timer += dt
        if self.should_detonate and not self._expired:
            result.add_event(RemoveEvent(self))
            result.add_sound(SoundType.EXPLOSION)
            self._expired = True
            self.owner.remove_bomb(self)
        return result

    def on_explosion_hit(self) -> None:
        if self._expired:
            return
        self._current_timer = self._full_timer

    def get_affected_cells(self, world: WorldInfo)-> list[GridCoords]:
        row, col = self.row, self.col
        rng = self.explosion_range
        
        cells: list[GridCoords] = []
        cells.append((row, col))

        def project(dr: int, dc: int):
            r, c = row, col
            
            for _ in range(rng):
                r += dr
                c += dc
                if not world.in_bounds(r, c):
                    break
                entity = world.get_entity_at(r, c)
                if entity is None:
                    cells.append((r, c))
                    continue
                else:
                    return

        project(-1, 0)
        project(1, 0)
        project(0, -1)
        project(0, 1)
        return cells
    
    def create_explosions(self, world: WorldInfo, result: UpdateResultInfo):
            row, col = self.row, self.col
            rng = self.explosion_range
            center_explosion = ExplosionFactory.make(row,col, ExplosionOrientation.CENTER, self.explosion_duration ,None)
            result.add_event(SpawnEvent(center_explosion))
    
            def propagate(dr: int, dc: int, direction: Direction):
                cells: list[tuple[int, int]] = [] # pang check if last cell of explosion lang
    
                r, c = row, col
    
                for _ in range(rng):
                    r += dr
                    c += dc
                    if not world.in_bounds(r, c):
                        break
                    entity = world.get_entity_at(r, c)
                    if entity is None:
                        cells.append((r, c))
                        continue
                    else:
                        entity.on_explosion_hit()
                        break
                
                for i, (er, ec) in enumerate(cells):
                    # if last, basically different sprite 4 directions
                    is_last = (i == len(cells) - 1)
    
                    # orientation depends on direction axis
                    if direction in (Direction.NORTH, Direction.SOUTH):
                        orient = ExplosionOrientation.VERTICAL
                    else:
                        orient = ExplosionOrientation.HORIZONTAL
    
                    terminal = direction if is_last else None
    
                    result.add_event(SpawnEvent(ExplosionFactory.make(er, ec, orient, self.explosion_duration,terminal)))
    
            propagate(-1, 0, Direction.NORTH)
            propagate(1, 0, Direction.SOUTH)
            propagate(0, -1, Direction.WEST)
            propagate(0, 1, Direction.EAST)

class BombFactory:
    @classmethod
    def make(cls, row: int, col: int, full_timer: int, range: int, owner: PlayerInfo,) -> BombInfo:
        return Bomb(row, col,full_timer, range, owner)
