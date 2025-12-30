from __future__ import annotations
from common_types import AnimationCmd, AnimationType, BlockInfo, ConfigInfo, CoordMode, DrawType, EventInfo, EntityInfo, ExplosionInfo, Board, GridCoords, ModelState, PowerupInfo, PowerupSpawner, RoundResult, SoundType, EntityType, WorldInfo, BombInfo, PlayerInfo
from typing import TypeVar
from helpers.grid_adapter import GridAdapter
from helpers.event import RemoveEvent, SpawnEvent, UpdateResult
from copy import deepcopy
from entities.bomb import BombFactory
from entities.block import BlockFactory
from entities.powerup import Powerup_Factories
from entities.player import PlayerFactory
from random import choice, shuffle, randint


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
    
    def clear(self) -> None:
        self._board = [[None for _ in range(self.cols)] for _ in range(self.rows)]
        self._entities = set()


class Model:
    def __init__(self, world: WorldInfo, grid: GridAdapter, fps: int, config: ConfigInfo):
        self._world: WorldInfo = world
        self._config: ConfigInfo = config
        self._event_buffer: list[EventInfo] = []
        self._sfx_buffer: list[SoundType] = []
        self._vfx_buffer: list[AnimationCmd] = []
        self._players: set[PlayerInfo] = set()
        self._grid: GridAdapter = grid
        self._tile_size: int = 16
        self._timer: int = self._config.timer_seconds*fps # in seconds, currently set to 1 minute
        self._win_countdown: int = fps # NOTE: 1 second countdown before declaring a player as a winner
        self._fps: int = fps
        self._draw: bool = False
        self._scores: dict[int, int] = {}
        self._rounds_to_win: int = config.rounds_to_win
        self._temp_winner: int = 0
        self._state: ModelState = ModelState.COUNTDOWN
        self._debug: bool = False
        self._round_result: RoundResult|None = None #IMPLEMEEEENT
        self._winner: PlayerInfo|None = None # FINAL WINNER

        # grid helpers
        self._cols: int = self._world.cols
        self._rows: int = self._world.rows
        self._spaced_block_coords: list[GridCoords] = [(r, c)for r in (2, 4, 6, 8, 10) for c in (2, 4, 6, 8, 10, 12)]
        self._border_block_coords: list[GridCoords] =  [(0, c) for c in range(self._cols)] + [(self._rows - 1, c) for c in range(self._cols)] + [(r, 0) for r in range(1, self._rows - 1)] + [(r, self._cols - 1) for r in range(1, self._rows - 1)]
        self._protected_coords: list[GridCoords] =  [(1,1), (2, 1), (1,2), (1, 13), (2, 13), (1, 12), (11, 1), (10, 1), (11, 2), (11, 13), (10, 13), (11, 12)]
    
        # ADD PLAYERS HERE, simply add, no need to place down
        self._add_players()

        self._start_new_round()
    
    # NOTE: main flow of model is:
    # controller calls: handle player input
    # controller then `update` which does the following:
    # 1. update all entities
    #       - tick down bombs/explosions, have AI decide, etc.
    # 2. detonate bombs
    #       - check all `on_explosion` 
    # 3. create new entities if needed
    #       - remove expired entities
    # 4. check player collision on explosions and powerups
    # 5. repeat 3

    @property
    def fps(self)-> int:
        return self._fps
    
    @property
    def timer(self)-> int:
        return self._timer
    
    @property
    def pop_sfx(self) -> list[SoundType]:
        out = self._sfx_buffer[:]
        self._sfx_buffer = []
        return out
    @property
    def pop_vfx(self) -> list[AnimationCmd]:
        out = self._vfx_buffer[:]
        self._vfx_buffer = []
        return out
    @property
    def transition_screen(self) -> bool:
        return self._state == ModelState.TRANSITION
    
    @property
    def state(self) -> ModelState:
        return self._state

    @property
    def debug_mode(self) -> bool:
        return self._debug

    @property
    def countdown_frames(self) -> int:
        return self._round_start_timer

    @property
    def scores(self) -> dict[int, int]:
        return dict(self._scores)

    @property
    def round_result(self):
        return self._round_result

    @property
    def players(self) -> list[PlayerInfo]:
        return list(self._players)
    @property
    def alive_players(self) -> list[PlayerInfo]:
        return [p for p in self._players if not p.is_expired]
    @property
    def is_game_over(self):
        return self._winner is not None
        
    def _add_players(self) -> None:
        current_id = 1
        
        # Add Human Players
        for _ in range(self._config.num_human_players):
            # Pass bot_type=None for humans
            player = PlayerFactory.make(0, 0, self._world, self._grid, current_id, self._fps, None)
            self._players.add(player)
            current_id += 1

        # Add Bot Players
        for bot_enum in self._config.bot_types:
            if current_id > 4: 
                break
            
            player = PlayerFactory.make(
                0, 0, self._world, self._grid, 
                current_id, self._fps, 
                bot_type=bot_enum # Pass the Enum directly
            )
            self._players.add(player)
            current_id += 1
        

    def handle_input(self, inputs: dict[str, bool]):
        if inputs["ESC"]:
            if self._state == ModelState.TRANSITION and not self.is_game_over:
                self._start_new_round()
                return
            elif self._state in (ModelState.PLAYING, ModelState.END_DELAY):
                self._debug = not self._debug
                return

        if self._state not in (ModelState.PLAYING, ModelState.END_DELAY):
            return
        
        events: list[BombInfo] = []
        reserved_cells: set[GridCoords] = set()
        for player in self._players:
            if player.is_expired:
                continue
            plants = player.handle_input(inputs)
            if not plants:
                continue
            if player.active_bombs >= player.max_bombs:
                continue
            row, col = player.row, player.col
            if (row, col) in reserved_cells:
                continue
            if not self._world.in_bounds(row, col):
                continue
            if self._world.get_entity_at(row, col) is not None: 
                continue
            new_bomb: BombInfo = BombFactory.make(row, col, 3*self.fps, player.range, player)
            player.add_bomb(new_bomb)
            events.append(new_bomb)
            reserved_cells.add((row, col))

        for bomb in events:
            bomb.move_away_ids = {p.id for p in self._players if self._player_overlaps_cell(p, bomb.row, bomb.col)}
            self._event_buffer.append(SpawnEvent(bomb))
        # for player input
        # for spawning use current player row and column, spawn there if none, else do nothing
        # after spawning, add bomb.move_away_ids = {p.id for p in players if model._player_overlaps_cell(p, r, c)}

    def update(self, dt: int):
        # controller -> model.handle_inputs
        # TRANSITION
        if self._state == ModelState.TRANSITION:
            return

        # COUNTDOWN
        if self._state == ModelState.COUNTDOWN:
            self._round_start_timer -= dt
            if self._round_start_timer <= 0:
                self._state = ModelState.PLAYING
            return

        # END_DELAY
        if self._state == ModelState.END_DELAY:
            self._win_countdown -= dt
            if self._win_countdown <= 0:
                self._finalize_round()

        # PLAYING:
        self._timer -= dt
        self._update_entities(dt) # update all and enqueue self sounds and removes
        self._detonate_bombs() # detonate, pipeline for explosion and its results, enqueue explosion cells, next frame mag detonate ung hit bombs
        self._process_events()  # add (e.g. new explosions); remove (e.g. timed out explosion/bomb)
        self._check_explosion_powerup_collision() # check collision with player
        self._process_events() # add (e.g. powerup spawned from block); remove (e.g. dead player)
        # self._remove_expired_entities() # remove expired entities in general (idk if this is necessary.)
        self._check_round_end_conditions()

    def _update_entities(self, dt: int):
        for entity in self._world.entities:
            results = entity.update(dt)
            self._event_buffer += results.events
            self._sfx_buffer += results.sounds
        for player in self._players:
            if player.is_expired:
                continue
            result = player.update(dt)
            self._sfx_buffer += result.sounds
            self._vfx_buffer += result.animations
        self._update_bomb_pass_through() # update bomb movement logic after movement

        
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

    def _check_explosion_powerup_collision(self):
        # world matrix collisions with player
        explosions = self._world.get_all_type(ExplosionInfo)
        powerups = self._world.get_all_type(PowerupInfo)
        #collisions with players (16x16 box)
        for player in self._players:
            for explosion in explosions:
                if self._player_overlaps_cell(player, explosion.row, explosion.col):
                    player.on_explosion_hit()
                    # NO enqueues, possible power up
                    break
        picked: set[GridCoords] = set()
        for player in self._players:
            if player.is_expired:
                continue
            for powerup in powerups:
                if powerup.is_expired:
                    continue
                pos = (powerup.row, powerup.col)
                if pos in picked:
                    continue

                if self._player_overlaps_cell(player, powerup.row, powerup.col):
                    result = powerup.on_pickup(player)
                    self._event_buffer += result.events
                    self._sfx_buffer += result.sounds
                    picked.add(pos)
                    break
    
    def _detonate_bombs(self) -> None:
        bombs: list[BombInfo] = [b for b in self._world.entities if isinstance(b, BombInfo) and b.should_detonate]
        for bomb in bombs:
                result = UpdateResult()
                bomb.create_explosions(self._world, result)
                # event buffer
                self._event_buffer += result.events
        expired = [entity for entity in self._world.entities if entity.is_expired]
        for entity in expired:
            self._event_buffer.append(RemoveEvent(entity))
            if isinstance(entity, BlockInfo):
                self._powerup_spawn(entity.row, entity.col)
                self._vfx_buffer.append(AnimationCmd(AnimationType.SOFT_BREAK, CoordMode.CELL, entity.row, entity.col, self.fps, None, None))
            if isinstance(entity, PowerupInfo):
                self._vfx_buffer.append(AnimationCmd(AnimationType.POWERUP_BREAK, CoordMode.CELL, entity.row, entity.col, self.fps, None, entity.powerup_type))
            
    def _player_by_id(self, id: int) -> PlayerInfo|None:
        for player in self._players:
            if player.id == id:
                return player  

    def _alive_players(self) -> list[PlayerInfo]:
        return [p for p in self._players if not p.is_expired]

    def _check_round_end_conditions(self) -> None:
        if self._state == ModelState.TRANSITION:
            return
        # timer ran out, draw
        if self._timer <= 0:
            self._round_result = RoundResult.round_draw(DrawType.TIME)
            self._enter_transition()
            return

        alive = self._alive_players()

        # draw if all dead(checked within 1 second only)
        if len(alive) == 0:
            self._round_result = RoundResult.round_draw(DrawType.DEATH)
            self._enter_transition()
            return

        # begin 1-second end delay, to check if win or draw
        if len(alive) == 1 and self._state != ModelState.END_DELAY:
            self._temp_winner = alive[0].id   
            self._state = ModelState.END_DELAY
            self._win_countdown = self._fps   
            return

    def _finalize_round(self) -> None:
        alive = self._alive_players()

        #  draw
        if len(alive) != 1:
            self._round_result = RoundResult.round_draw(DrawType.DEATH)
            self._enter_transition()
            return

        winner = alive[0].id
        self._scores[winner] = self._scores.get(winner, 0) + 1
        self._round_result = RoundResult.round_win(winner)
        self._enter_transition()
    
    def _enter_transition(self)-> None:
        self._state = ModelState.TRANSITION
        self._debug = False
        for id, score in self._scores.items():
            if score >= self._rounds_to_win and self._round_result is not None:
                self._round_result = self._round_result.game_over(id)
                self._winner = self._player_by_id(id)
    
    def _start_new_round(self) -> None:
        self._transition_screen = False

        # reset world 
        self._reset_world_and_round_entities()

        # reset timers
        self._round_start_timer = 3 * self._fps
        self._timer = self._config.timer_seconds * self._fps
        self._win_countdown = self._fps

        # reset players
        self._reset_players_to_spawn()

        # go into countdown state
        self._state = ModelState.COUNTDOWN
    
    def _reset_world_and_round_entities(self):
        self._world.clear()
        hard_blocks: list[GridCoords] = self._spaced_block_coords + self._border_block_coords
        for (r, c) in hard_blocks:
            self._world.add_entity(BlockFactory.make_hard(r, c))

        soft_spawnable: list[tuple[int, int]] = []
        for r in range(1, self._rows - 1):
            for c in range(1, self._cols - 1):
                if (r, c) in self._protected_coords:
                    continue
                if self._world.get_entity_at(r, c) is not None:
                    continue
                soft_spawnable.append((r, c))

        shuffle(soft_spawnable)

        k = self._config.soft_block_spawn_chance
        placed = 0
        for (r, c) in soft_spawnable:
            if randint(1, 100) <= k:
                self._world.add_entity(BlockFactory.make_soft(r, c))
                placed += 1
        if placed < 10:
            for (r, c) in soft_spawnable:
                if placed >= 10:
                    break
                if self._world.get_entity_at(r, c) is None:
                    self._world.add_entity(BlockFactory.make_soft(r, c))
                    placed += 1

    def _reset_players_to_spawn(self) -> None:
        for p in self._players:
            p.reset_for_new_round()

    def _powerup_spawn(self, row: int, col: int)-> None:
        k: int = self._config.powerup_spawn_chance
        if randint(1, 100) <= k:
            pu: PowerupSpawner = choice(Powerup_Factories)
            self._event_buffer.append(SpawnEvent(pu.make(row, col)))

    def _process_events(self):
        for event in self._event_buffer:
            event.execute(self._world)
        self._event_buffer = []

    # def _remove_expired_entities(self):
    #     for entity in self._world.entities:
    #         if entity.is_expired:
    #             self._world.remove_entity(entity)