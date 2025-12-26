from __future__ import annotations
from common_types import EventInfo, EntityInfo, ExplosionInfo, Board, GridCoords, SoundType, EntityType, WorldInfo, BombInfo, PlayerInfo
from typing import TypeVar
from helpers.grid_adapter import GridAdapter
from helpers.event import SpawnEvent, UpdateResult
from copy import deepcopy

from implementation1.entities.bomb import BombFactory

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
    def rows(self) -> int:
        return self._rows

    @property
    def cols(self) -> int:
        return self._cols
    
    @property
    def entities(self) -> set[EntityInfo]:
        return set(self._entities)
    
    @property
    def board(self) -> Board:
        return deepcopy(self._board)

    def add_entity(self, entity: EntityInfo) -> None:

        i, j = entity.row, entity.col
        if not self.in_bounds(i, j):
            return None
        existing = self._board[i][j]
        if existing is not None:
            return None
        self._entities.add(entity)
        self._board[entity.row][entity.col] = entity


    def remove_entity(self, entity: EntityInfo) -> None:
        self._entities.discard(entity)
        if self.in_bounds(entity.row, entity.col):
            self._board[entity.row][entity.col] = None

    def get_entity_at(self, i: int, j: int) -> EntityInfo | None:
        if self.in_bounds(i, j):
            return self._board[i][j]
        return None
    
    def get_all_type(self, entity_type: type[T]) -> set[T]:
        return {
            entity for entity in self._entities 
            if isinstance(entity, entity_type)
        }
    
    def in_bounds(self, i: int, j: int) -> bool:
        return 0 <= i < self._rows and 0 <= j < self._cols
    
    def is_cell_blocking(self, row: int, col: int, player_id: int) -> bool:
        
        if not self.in_bounds(row, col):
            return True

        entity = self.get_entity_at(row, col)
        if entity is None:
            return False
        
        if isinstance(entity, BombInfo):
            return player_id not in entity.move_away_ids
        
        return entity.entity_type == EntityType.BLOCK # explosions and powerups are walkable, player not stored
    
    def is_walkable(self, row: int, col: int, player_id: int) -> bool:
        return not self.is_cell_blocking(row, col, player_id)


class Model:
    def __init__(self, world: WorldInfo, grid: GridAdapter, fps: int):
        self._world: WorldInfo = world
        self._event_buffer: list[EventInfo] = []
        self._sfx_buffer: list[SoundType] = []
        self._players: list[PlayerInfo] = []
        self._grid: GridAdapter = grid
        self._tile_size: int = 16
        self._timer: int = 60*fps # in seconds, currently set to 1 minute
        self._fps: int = fps

    # NOTE: main flow of model is:
    # controller calls: handle player input
    # controller then `update` which does the following:
    # 1. update all entities
    #       - tick down bombs/explosions, have AI decide, etc.
    # 2. create new entities if needed
    # 3. check all `on_explosion` 
    # 4. remove expired entities

    @property
    def fps(self)-> int:
        return self._fps

    def handle_input(self, inputs: dict[str, bool]):
        events: list[BombInfo] = []
        reserved_cells: set[GridCoords] = set()
        for player in self._players:
            plants = player.handle_input(inputs)
            if not plants:
                continue
            if player.active_bombs >= player.max_bombs:
                continue
            row, col = player.row, player.col
            if (row, col) in reserved_cells:
                continue
            if self._world.get_entity_at(row, col) is not None: 
                continue
            new_bomb: BombInfo = BombFactory.make(row, col, 3*self.fps, player.range, player)
            player.add(new_bomb)
            events.append(new_bomb)
            reserved_cells.add((row, col))

        for bomb in events:
            bomb.move_away_ids = {p.id for p in self._players if self._player_overlaps_cell(p, bomb.row, bomb.col)}
            self._event_buffer.append(SpawnEvent(bomb))
        # for player input
        # for spawning use current player row and column, spawn there if none, else do nothing
        # after spawning, add bomb.move_away_ids = {p.id for p in players if model._player_overlaps_cell(p, r, c)}
        ...

    def update(self, dt: int):
        # controller -> model.handle_inputs
        self._update_entities(dt) # update all and enqueue self sounds and removes
        self._detonate_bombs() # detonate, pipeline for explosion and its results, enqueue explosion cells, next frame mag detonate ung hit bombs
        self._process_events()  # add (e.g. new explosions); remove (e.g. timed out explosion/bomb)
        self._check_explosion_collision() # check collision with player
        self._process_events() # add (e.g. powerup spawned from block); remove (e.g. dead player)
        # self._remove_expired_entities() # remove expired entities in general (idk if this is necessary.)

    def _update_entities(self, dt: int):
        for entity in self._world.entities:
            results = entity.update(dt)
            self._event_buffer += results.events
            self._sfx_buffer += results.sounds
        self._update_bomb_pass_through() # update bomb movement logic after movement
        self._timer -= dt
        
    def _player_overlaps_cell(self, player: PlayerInfo, row: int, col: int) -> bool:
        # bounds in pixels
        cell_x, cell_y, cell_w, cell_h = self._grid.cell_rect(row, col)
        cell_x2 = cell_x + cell_w
        cell_y2 = cell_y + cell_h

        # player bounds in pixels (only bottom 16x16)
        px1 = player.hitbox_x
        py1 = player.hitbox_y 
        px2 = px1 + self._tile_size   
        py2 = py1 + self._tile_size

        # true if hitbox overlap
        if px2 <= cell_x or px1 >= cell_x2:
            return False
        if py2 <= cell_y or py1 >= cell_y2:
            return False
        return True
    
    def _update_bomb_pass_through(self) -> None:
        for ent in self._world.entities:
            if isinstance(ent, BombInfo):
                if not ent.move_away_ids: 
                    continue
                to_remove: set[int] = set()
                for pid in ent.move_away_ids:
                    player: PlayerInfo|None = self._player_by_id(pid) 
                    if player is None or not self._player_overlaps_cell(player, ent.row, ent.col):
                        to_remove.add(pid)
                ent.move_away_ids.difference_update(to_remove)

    def _check_explosion_collision(self):
        # world matrix collisions with player
        explosions = self._world.get_all_type(ExplosionInfo)

        #collisions with players (16x16 box)
        for player in self._players:
            for explosion in explosions:
                if self._player_overlaps_cell(player, explosion.row, explosion.col):
                    player.on_explosion_hit()
                    # NO enqueues, possible power up
                    break
    
    def _detonate_bombs(self) -> None:
        for entity in self._world.entities:
            if isinstance(entity, BombInfo) and entity.should_detonate:
                result = UpdateResult()
                entity.create_explosions(self._world, result)
                # event buffer
                self._event_buffer += result.events

    def _player_by_id(self, id: int) -> PlayerInfo|None:
        for player in self._players:
            if player.id == id:
                return player    

    def _process_events(self):
        for event in self._event_buffer:
            event.execute(self._world)
        self._event_buffer = []

    # def _remove_expired_entities(self):
    #     for entity in self._world.entities:
    #         if entity.is_expired:
    #             self._world.remove_entity(entity)
            
Model(World(13, 15), GridAdapter(0, 24), 30) # for world type-checking lang muna