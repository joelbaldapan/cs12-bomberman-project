from __future__ import annotations
from typing import TypeVar
from copy import deepcopy
from random import choice, shuffle, randint
from common_types import (
    AnimationCmd, AnimationType, BlockInfo, ConfigInfo, CoordMode, DrawType,
    EventInfo, EntityInfo, ExplosionInfo, Board, GridCoords, ModelState,
    PowerupInfo, PowerupSpawner, RoundResult, SoundType, EntityType,
    WorldInfo, BombInfo, PlayerInfo
)
from helpers.grid_adapter import GridAdapter
from helpers.event import RemoveEvent, SpawnEvent, UpdateResult
from entities.bomb import BombFactory
from entities.block import BlockFactory
from entities.player import PlayerFactory

T = TypeVar("T", bound=EntityInfo)


class World:
    def __init__(self, rows: int, cols: int):
        self._rows = rows
        self._cols = cols
        self._board: Board = [
            [None for _ in range(cols)] for _ in range(rows)
        ]
        self._entities: set[EntityInfo] = set()
        self._players: set[PlayerInfo] = set()

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
    def players(self) -> set[PlayerInfo]:
        return set(self._players)

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

    def register_player(self, player: PlayerInfo) -> None:
        self._players.add(player)

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

        return entity.entity_type == EntityType.BLOCK

    def is_walkable(self, row: int, col: int, player_id: int) -> bool:
        return not self.is_cell_blocking(row, col, player_id)

    def clear(self) -> None:
        self._board = [[None for _ in range(self.cols)]
                       for _ in range(self.rows)]
        self._entities = set()


class MapGenerator:
    """Handler for resetting the grid and placing blocks"""

    def __init__(self, rows: int, cols: int, config: ConfigInfo):
        self._rows = rows
        self._cols = cols
        self._config = config

        self._spaced_block_coords: list[GridCoords] = [
            (r, c) for r in (2, 4, 6, 8, 10) for c in (2, 4, 6, 8, 10, 12)
        ]
        self._border_block_coords: list[GridCoords] = (
            [(0, c) for c in range(self._cols)] +
            [(self._rows - 1, c) for c in range(self._cols)] +
            [(r, 0) for r in range(1, self._rows - 1)] +
            [(r, self._cols - 1) for r in range(1, self._rows - 1)]
        )
        self._protected_coords: list[GridCoords] = [
            (1, 1), (2, 1), (1, 2), (1, 13), (2, 13), (1, 12),
            (11, 1), (10, 1), (11, 2), (11, 13), (10, 13), (11, 12)
        ]

    def generate(self, world: WorldInfo) -> None:
        world.clear()

        # Hard Blocks
        hard_blocks = self._spaced_block_coords + self._border_block_coords
        for (r, c) in hard_blocks:
            world.add_entity(BlockFactory.make_hard(r, c))

        # Soft Blocks
        soft_spawnable: list[tuple[int, int]] = []
        for r in range(1, self._rows - 1):
            for c in range(1, self._cols - 1):
                if (r, c) in self._protected_coords:
                    continue
                if world.get_entity_at(r, c) is not None:
                    continue
                soft_spawnable.append((r, c))

        shuffle(soft_spawnable)

        k = self._config.soft_block_spawn_chance
        placed = 0

        # random chance
        for (r, c) in soft_spawnable:
            if randint(1, 100) <= k:
                world.add_entity(BlockFactory.make_soft(r, c))
                placed += 1

        # make sure we have minimum of 10
        if placed < 10:
            for (r, c) in soft_spawnable:
                if placed >= 10:
                    break
                if world.get_entity_at(r, c) is None:
                    world.add_entity(BlockFactory.make_soft(r, c))
                    placed += 1


class PhysicsEngine:
    """Handler for hitbox overlaps and pass-through mechanics"""

    def __init__(self, grid: GridAdapter, tile_size: int = 16):
        self._grid = grid
        self._tile_size = tile_size

    def check_player_overlap(self, player: PlayerInfo, row: int, col: int) -> bool:
        """Checks if a player's physical hitbox overlaps a grid cell"""
        # Cell bounds
        cell_x, cell_y, cell_w, cell_h = self._grid.cell_rect(row, col)
        cell_x2 = cell_x + cell_w
        cell_y2 = cell_y + cell_h

        # Player bounds (bottom 16x16)
        px1 = player.hitbox_x
        py1 = player.hitbox_y
        px2 = px1 + self._tile_size
        py2 = py1 + self._tile_size

        if px2 <= cell_x or px1 >= cell_x2:
            return False
        if py2 <= cell_y or py1 >= cell_y2:
            return False
        return True

    def resolve_bomb_passthrough(self, world: WorldInfo, players: list[PlayerInfo]) -> None:
        """Removes players from a bomb's `move_away_ids` if they have stepped off it"""
        bombs = world.get_all_type(BombInfo)
        for bomb in bombs:
            if not bomb.move_away_ids:
                continue

            to_remove: set[int] = set()
            for pid in bomb.move_away_ids:
                player = next((p for p in players if p.id == pid), None)

                # If player is gone OR no longer overlapping, remove them from the list
                if player is None or not self.check_player_overlap(player, bomb.row, bomb.col):
                    to_remove.add(pid)

            bomb.move_away_ids.difference_update(to_remove)


class RoundManager:
    """Handler for timers, states, and determining win/loss"""

    def __init__(self, fps: int, config: ConfigInfo):
        self._fps = fps
        self._config = config

        # State
        self._state: ModelState = ModelState.COUNTDOWN
        self._timer: float = 0
        self._scores: dict[int, int] = {}

        # Results
        self._round_result: RoundResult | None = None
        self._match_winner_id: int | None = None

        # Internal Timers
        self._round_start_timer: int = 0
        self._win_countdown: int = 0

    @property
    def round_result(self) -> RoundResult | None:
        return self._round_result

    @property
    def timer_seconds(self) -> float:
        return self._timer

    @property
    def round_start_timer(self) -> int:
        return self._round_start_timer

    @property
    def scores(self) -> dict[int, int]:
        return self._scores

    @property
    def state(self) -> ModelState:
        return self._state

    @property
    def match_winner_id(self) -> int | None:
        return self._match_winner_id

    def start_new_round(self):
        self._state = ModelState.COUNTDOWN
        self._round_result = None
        self._match_winner = None

        self._round_start_timer = 3 * self._fps
        self._timer = self._config.timer_seconds * self._fps
        self._win_countdown = self._fps

    def check_round_end(self, alive_players: list[PlayerInfo]) -> bool:
        if self._state == ModelState.TRANSITION:
            return True

        if self._timer <= 0:
            self._finalize_round(DrawType.TIME, [])
            return True

        if len(alive_players) <= 1:
            if self._state != ModelState.END_DELAY:
                self._state = ModelState.END_DELAY
                self._win_countdown = self._fps
            elif self._win_countdown <= 0:
                if len(alive_players) == 0:
                    self._finalize_round(DrawType.DEATH, [])
                    return True
                self._finalize_round(None, alive_players)
                return True

        return False

    def update_timers(self, dt: int) -> None:
        if self._state == ModelState.COUNTDOWN:
            self._round_start_timer -= dt
            if self._round_start_timer <= 0:
                self._state = ModelState.PLAYING

        elif self._state == ModelState.PLAYING:
            self._timer -= dt

        elif self._state == ModelState.END_DELAY:
            self._win_countdown -= dt

    def _finalize_round(self, draw_type: DrawType | None, alive: list[PlayerInfo]):
        self._state = ModelState.TRANSITION

        if draw_type is not None or len(alive) != 1:
            dtype = draw_type if draw_type else DrawType.DEATH
            self._round_result = RoundResult.round_draw(dtype)
            return

        winner_id = alive[0].id
        self._scores[winner_id] = self._scores.get(winner_id, 0) + 1
        self._round_result = RoundResult.round_win(winner_id)

        if self._scores[winner_id] >= self._config.rounds_to_win:
            self._round_result = self._round_result.game_over(winner_id)
            self._match_winner_id = winner_id

    def reset(self):
        self._state = ModelState.COUNTDOWN
        self._timer = self._config.timer_seconds * self._fps
        self._round_start_timer = 3 * self._fps
        self._end_delay_timer = self._fps


class Model:
    """
    Note: The main flow of model is:
        controller calls: handle player input
        controller then calls `update()`, which does the following:
            1.) Update timers
            2.) Update entities
            3.) Collisions
            4.) Win conditions
    """

    def __init__(self, world: WorldInfo, grid: GridAdapter, fps: int, config: ConfigInfo, powerups: tuple[PowerupSpawner, ...]):
        self._world = world
        self._config = config
        self._fps = fps
        self._grid = grid

        self._map_gen = MapGenerator(world.rows, world.cols, config)
        self._physics = PhysicsEngine(grid)
        self._round_mgr = RoundManager(fps, config)

        self._powerups = powerups

        self._event_buffer: list[EventInfo] = []
        self._sfx_buffer: list[SoundType] = []
        self._vfx_buffer: list[AnimationCmd] = []
        self._players: set[PlayerInfo] = set()
        self._debug: bool = False

        self._add_players()
        self._start_new_round()

    @property
    def fps(self) -> int:
        return self._fps

    @property
    def timer(self) -> int:
        return int(self._round_mgr.timer_seconds)

    @property
    def world(self) -> WorldInfo:
        return self._world

    @property
    def transition_screen(self) -> bool:
        return self._round_mgr.state == ModelState.TRANSITION

    @property
    def state(self) -> ModelState:
        return self._round_mgr.state

    @property
    def debug_mode(self) -> bool:
        return self._debug

    @property
    def countdown_frames(self) -> int:
        return self._round_mgr.round_start_timer

    @property
    def scores(self) -> dict[int, int]:
        return dict(self._round_mgr.scores)

    @property
    def round_result(self):
        return self._round_mgr.round_result

    @property
    def players(self) -> list[PlayerInfo]:
        return list(self._players)

    @property
    def alive_players(self) -> list[PlayerInfo]:
        return [p for p in self._players if not p.is_expired]

    @property
    def is_game_over(self):
        return self._round_mgr.match_winner_id is not None

    def update(self, dt: int):
        # 1 - Update timers
        self._round_mgr.update_timers(dt)
        if self.state in {ModelState.TRANSITION, ModelState.COUNTDOWN}:
            return

        # 2 - Update entities
        self._update_entities(dt)
        self._detonate_bombs()
        self._process_events()

        # 3 - Collisions
        self._check_collisions()
        self._physics.resolve_bomb_passthrough(
            self._world, list(self._players))
        self._process_events()

        # 4 - Win conditions
        self._round_mgr.check_round_end(self.alive_players)

    def handle_input(self, inputs: dict[str, bool]):
        if inputs["ESC"]:
            if self.state == ModelState.TRANSITION and not self.is_game_over:
                self._start_new_round()
                return
            elif self.state in (ModelState.PLAYING, ModelState.END_DELAY):
                self._debug = not self._debug
                return

        if self.state not in (ModelState.PLAYING, ModelState.END_DELAY):
            return

        reserved_cells: set[GridCoords] = set()
        spawned_bombs: list[BombInfo] = []

        for player in self._players:
            if player.is_expired:
                continue
            if not player.handle_input(inputs):
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

            new_bomb = BombFactory.make(
                row, col, 3*self.fps, player.range, player)
            player.add_bomb(new_bomb)
            spawned_bombs.append(new_bomb)
            reserved_cells.add((row, col))

        for bomb in spawned_bombs:
            overlapping_ids = {
                p.id for p in self._players
                if self._physics.check_player_overlap(p, bomb.row, bomb.col)
            }
            bomb.move_away_ids = overlapping_ids
            self._event_buffer.append(SpawnEvent(bomb))

    def pop_sfx(self) -> list[SoundType]:
        out = self._sfx_buffer[:]
        self._sfx_buffer = []
        return out

    def pop_vfx(self) -> list[AnimationCmd]:
        out = self._vfx_buffer[:]
        self._vfx_buffer = []
        return out

    # Private Helper functions below

    def _start_new_round(self) -> None:
        self._map_gen.generate(self._world)
        self._round_mgr.start_new_round()
        for p in self._players:
            p.reset_for_new_round()

    def _add_players(self) -> None:
        current_id = 1
        for _ in range(self._config.num_human_players):
            player = PlayerFactory.make(
                0, 0, self._world, self._grid, current_id, self._fps, None)
            self._players.add(player)
            self._world.register_player(player)
            current_id += 1
        for bot_enum in self._config.bot_types:
            if current_id > 4:
                break
            player = PlayerFactory.make(
                0, 0, self._world, self._grid, current_id, self._fps, bot_type=bot_enum)
            self._players.add(player)
            self._world.register_player(player)
            current_id += 1

    def _player_by_id(self, id: int) -> PlayerInfo | None:
        for player in self._players:
            if player.id == id:
                return player
        return None

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

    def _detonate_bombs(self) -> None:
        bombs: list[BombInfo] = [b for b in self._world.entities if isinstance(
            b, BombInfo) and b.should_detonate]
        for bomb in bombs:
            result = UpdateResult()
            bomb.create_explosions(self._world, result)
            self._event_buffer += result.events
        expired = [entity for entity in self._world.entities if entity.is_expired]
        for entity in expired:
            self._event_buffer.append(RemoveEvent(entity))
            if isinstance(entity, BlockInfo):
                self._powerup_spawn(entity.row, entity.col)
                self._vfx_buffer.append(AnimationCmd(
                    AnimationType.SOFT_BREAK, CoordMode.CELL, entity.row, entity.col, self.fps, None, None))
            if isinstance(entity, PowerupInfo):
                self._vfx_buffer.append(AnimationCmd(
                    AnimationType.POWERUP_BREAK, CoordMode.CELL, entity.row, entity.col, self.fps, None, entity.powerup_type))

    def _check_collisions(self):
        explosions = self._world.get_all_type(ExplosionInfo)
        powerups = self._world.get_all_type(PowerupInfo)
        picked: set[GridCoords] = set()

        for player in self._players:
            if player.is_expired:
                continue
            for explosion in explosions:
                if self._physics.check_player_overlap(player, explosion.row, explosion.col):
                    player.on_explosion_hit()
                    break
            for powerup in powerups:
                if powerup.is_expired:
                    continue
                pos = (powerup.row, powerup.col)
                if pos in picked:
                    continue
                if self._physics.check_player_overlap(player, powerup.row, powerup.col):
                    result = powerup.on_pickup(player)
                    self._event_buffer += result.events
                    self._sfx_buffer += result.sounds
                    picked.add(pos)
                    break

    def _powerup_spawn(self, row: int, col: int) -> None:
        k = self._config.powerup_spawn_chance
        if randint(1, 100) <= k:
            pu: PowerupSpawner = choice(self._powerups)
            self._event_buffer.append(SpawnEvent(pu.make(row, col, self.fps)))

    def _process_events(self):
        for event in self._event_buffer:
            event.execute(self._world)
        self._event_buffer = []