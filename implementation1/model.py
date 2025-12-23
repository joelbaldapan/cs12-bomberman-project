from __future__ import annotations
from common_types import EventInfo, EntityInfo, ExplosionInfo, Board, PowerupInfo, SoundType, EntityType, WorldInfo, BombInfo, PlayerInfo, BlockInfo, UpdateResultInfo, ExplosionOrientation, Direction
from typing import TypeVar
from helpers.grid_adapter import GridAdapter
from helpers.event import UpdateResult, SpawnEvent
from entities.explosion import Explosion, ExplosionFactory
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

        i, j = entity.row, entity.col
        if not self._in_bounds(i, j):
            return None
        existing = self._board[i][j]
        if existing is not None:
            return None
        self._entities.add(entity)
        self._board[entity.row][entity.col] = entity

        #Might need to add boolean return
        #Issue with overlapping explosion with entities.....

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
    
    def is_cell_blocking(self, row: int, col: int) -> bool:
        
        if not self._in_bounds(row, col):
            return True

        entity = self._board[row][col]
        if entity is None:
            return False
        
        if entity.entity_type in (EntityType.BLOCK, EntityType.BOMB):
            return True

        # explosions and powerups are walkable, player not stored
        return False
    
    def is_walkable(self, row: int, col: int) -> bool:
        return not self.is_cell_blocking(row, col)


class Model:
    def __init__(self, world: WorldInfo, grid: GridAdapter):
        self._world: WorldInfo = world
        self._event_buffer: list[EventInfo] = []
        self._sfx_buffer: list[SoundType] = []
        self._players: list[PlayerInfo] = []
        self._grid: GridAdapter = grid
        self._tile_size: int = 16
        self._timer: int = 60 # in seconds, currently set to 1 minute

    # NOTE: main flow of model is:
    # controller calls: handle player input
    # controller then `update` which does the following:
    # 1. update all entities
    #       - tick down bombs/explosions, have AI decide, etc.
    # 2. create new entities if needed
    # 3. check all `on_explosion` 
    # 4. remove expired entities

    def handle_input(self): ...
        # for player input

    def update(self, dt: int):
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
        
    def _player_overlaps_cell(self, player: PlayerInfo, row: int, col: int) -> bool:
        # bounds in pixels
        cell_x, cell_y, cell_w, cell_h = self._grid.cell_rect(row, col)
        cell_x2 = cell_x + cell_w
        cell_y2 = cell_y + cell_h

        # player bounds in pixels (only bttomw 16x16)
        px1 = player.hitbox_x
        py1 = player.hitbox_y 
        px2 = px1 + self._tile_size   
        py2 = py1 + self._tile_size

        # true if hitbix overlap
        if px2 <= cell_x or px1 >= cell_x2:
            return False
        if py2 <= cell_y or py1 >= cell_y2:
            return False
        return True

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
                # create_explosions(bomb, world, result)
                result = UpdateResult()
                self.create_explosions(entity, self._world, result)

                # event buffer
                self._event_buffer += result.events

    
    def create_explosions(self, bomb: BombInfo, world: WorldInfo, result: UpdateResultInfo):
        row, col = bomb.row, bomb.col
        rng = bomb.explosion_range
        center_explosion = ExplosionFactory.make(row,col, ExplosionOrientation.CENTER,None)
        result.add_event(SpawnEvent(center_explosion))

        def propagate(dr: int, dc: int, direction: Direction):
            cells: list[tuple[int, int]] = [] # pang check if last cell of explosion lang

            r, c = row, col

            for _ in range(rng):
                r += dr
                c += dc

                entity = world.get_entity_at(r, c)
                if isinstance(entity, BlockInfo) or isinstance(entity, BombInfo):
                    entity.on_explosion_hit()
                    break
                cells.append((r, c))
                if entity is None:
                    continue
                if isinstance(entity, PowerupInfo): 
                    # detonate bomb and continue propagation
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

                result.add_event(SpawnEvent(Explosion(er, ec, orient, terminal)))

        propagate(-1, 0, Direction.NORTH)
        propagate(1, 0, Direction.SOUTH)
        propagate(0, -1, Direction.WEST)
        propagate(0, 1, Direction.EAST)

    def _process_events(self):
        for event in self._event_buffer:
            event.execute(self._world)
        self._event_buffer = []

    # def _remove_expired_entities(self):
    #     for entity in self._world.entities:
    #         if entity.is_expired:
    #             self._world.remove_entity(entity)
            
