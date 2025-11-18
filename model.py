from __future__ import annotations
from common_types import EventInfo, EntityInfo, ExplosionInfo, Board, SoundType, WorldInfo
from typing import TypeVar


T = TypeVar("T", bound=EntityInfo)

class World:
    def __init__(self, rows: int, cols: int):
        self._rows = rows
        self._cols = cols
        self._board: Board = [
            [None for _ in range(cols)] for _ in range(rows)
        ]
        self._entities: set[EntityInfo] = set()

    @property
    def entities(self) -> set[EntityInfo]:
        return set(self._entities)

    def add_entity(self, entity: EntityInfo) -> None:
        self._entities.add(entity)
        self._board[entity.row][entity.col] = entity

    def remove_entity(self, entity: EntityInfo) -> None:
        self._entities.discard(entity)
        if self._in_bounds(entity.row, entity.col):
            self._board[entity.row][entity.col] = None

    def get_entity_at(self, i: int, j: int) -> EntityInfo | None:
        if self._in_bounds(i, j):
            return self._board[i][j]
        return None
    
    def get_all_type(self, entity_type: type[T]) -> set[T]:
        return {
            entity for entity in self._entities 
            if isinstance(entity, entity_type)
        }
    
    def _in_bounds(self, i: int, j: int) -> bool:
        return 0 <= i < self._rows and 0 <= j < self._cols

class Model:
    def __init__(self, world: WorldInfo):
        self._world: WorldInfo = world
        self._event_buffer: list[EventInfo] = []
        self._sfx_buffer: list[SoundType] = []

    # NOTE: main flow of model is:
    # controller calls: handle player input
    # controller then `update` which does the following:
    # 1. update all
    #       - tick down bombs/explosions, have AI decide, etc.
    # 2. create new entities if needed
    # 3. check all `on_explosion` 
    # 4. remove expired entities

    def handle_input(self): ...

    def update(self, dt: int):
        self._update(dt)
        self._check_explosions()
        self._process_events()
        self._remove_expired_entities()
        self._process_events()

    def _update(self, dt: int):
        for entity in self._world.entities:
            results = entity.update(dt)
            self._event_buffer += results.events
            self._sfx_buffer += results.sounds

    def _check_explosions(self):
        for explosion in self._world.get_all_type(ExplosionInfo):
            # check if entity is hit. if so, then remove`
            # implement pls
            print(explosion)
            pass

    def _process_events(self):
        for event in self._event_buffer:
            event.execute(self._world)
        self._event_buffer = []

    def _remove_expired_entities(self):
        for entity in self._world.entities:
            if entity.is_expired:
                self._world.remove_entity(entity)
            
