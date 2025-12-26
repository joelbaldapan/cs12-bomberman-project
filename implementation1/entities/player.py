from dataclasses import dataclass
from typing import Optional
from common_types import BombInfo, WorldInfo, Direction, EntityType, UpdateResultInfo
from helpers.event import UpdateResult
from helpers.grid_adapter import GridAdapter


@dataclass
class Player():
    def __init__(self, x: float, y: float, world: WorldInfo, grid: GridAdapter, id: int):
        self._x: float = x
        self._y: float = y
        self._world: WorldInfo = world
        self._grid: GridAdapter = grid
        self._id: int = id
        self._speed: float = 2.0
        self._expired: bool = False
        self._alive: bool = True
        self._active_bombs: set[BombInfo] = set()
        self.direction_facing: Direction = Direction.SOUTH
        self._snap_tolerance: int = 2  
        self._hitbox_width = 16
        self._hitbox_height = 16
        self._sprite_width = 16
        self._sprite_height = 24
        self._hitbox_offset_y = self._sprite_height - self._hitbox_height

    @property
    def entity_type(self) -> EntityType:
        return EntityType.PLAYER

    @property
    def is_expired(self) -> bool:
        return self._expired

    @property
    def x(self) -> float:
        return self._x

    @property
    def y(self) -> float:
        return self._y
    
    @property
    def id(self) -> int:
        return self._id

    @property
    def width(self) -> int:
        return self._sprite_width

    @property
    def height(self) -> int:
        return self._sprite_height

    @property
    def speed(self) -> float:
        return self._speed

    @property
    def hitbox_x(self) -> float:
        return self._x

    @property
    def hitbox_y(self) -> float:
        return self._y + self._hitbox_offset_y  # bottom 16x16, like the video (head is non hitbox)

    @property
    def row(self) -> int:
        cx = self.hitbox_x + self._hitbox_width / 2
        cy = self.hitbox_y + self._hitbox_height / 2
        res = self._grid.pixel_to_cell(int(cx), int(cy))
        if res is not None:
            return res[0]
        else:
            return -1

    @property
    def col(self) -> int:
        cx = self.hitbox_x + self._hitbox_width / 2
        cy = self.hitbox_y + self._hitbox_height / 2
        res = self._grid.pixel_to_cell(int(cx), int(cy))
        if res is not None:
            return res[1]
        else:
            return -1

    def set_speed(self, ds: int) -> None:
        self._speed = max(0.0, self._speed + ds)

    def _snap_axis(self, new_x: float, new_y: float, direction: Direction) -> tuple[float, float]:

        #This is for sliding around sa grid, masyado rigid kasi ung pixel perfect
        
        if direction in (Direction.NORTH, Direction.SOUTH):
            cur_row, cur_col = self.row, self.col
            cell_x, cell_y, w, h = self._grid.cell_rect(cur_row, cur_col)
            target_cx = cell_x + w / 2
            new_hb_cx = new_x + self._hitbox_width / 2
            if abs(new_hb_cx - target_cx) <= self._snap_tolerance:
                new_x = target_cx - self._hitbox_width / 2
        
        elif direction in (Direction.WEST, Direction.EAST):
            cur_row, cur_col = self.row, self.col
            cell_x, cell_y, w, h = self._grid.cell_rect(cur_row, cur_col)
            target_cy = cell_y + h / 2
            new_hb_cy = (new_y + self._hitbox_offset_y) + self._hitbox_height / 2 # bottom 16x16
            if abs(new_hb_cy - target_cy) <= self._snap_tolerance:
                new_y = (target_cy - self._hitbox_height / 2) - self._hitbox_offset_y

        return new_x, new_y

    def _can_move_to(self, new_x: float, new_y: float) -> bool:
        hb_x1 = new_x
        hb_y1 = new_y + self._hitbox_offset_y
        hb_x2 = hb_x1 + self._hitbox_width - 1
        hb_y2 = hb_y1 + self._hitbox_height - 1

        corners = [(hb_x1, hb_y1),(hb_x2, hb_y1),(hb_x1, hb_y2),(hb_x2, hb_y2),]

        for px, py in corners:
            res = self._grid.pixel_to_cell(int(px), int(py))
            if res:
                row, col = res
                if self._world.is_cell_blocking(row, col, self.id):
                    return False
            else:
                return False

        return True

    def move(self, direction: Direction) -> int:
        if not self._alive:
            return 0

        dx = dy = 0.0
        if direction == Direction.NORTH:
            dy = -self._speed
        elif direction == Direction.SOUTH:
            dy = self._speed
        elif direction == Direction.WEST:
            dx = -self._speed
        elif direction == Direction.EAST:
            dx = self._speed

        new_x = self._x + dx
        new_y = self._y + dy

        new_x, new_y = self._snap_axis(new_x, new_y, direction)

        if self._can_move_to(new_x, new_y):
            self._x = new_x
            self._y = new_y
            return 1

        return 0

    def handle_input(self, inputs: dict[str, bool]) -> None:
        direction: Optional[Direction] = None

        if inputs.get("UP"):
            direction = Direction.NORTH
        elif inputs.get("DOWN"):
            direction = Direction.SOUTH
        elif inputs.get("LEFT"):
            direction = Direction.WEST
        elif inputs.get("RIGHT"):
            direction = Direction.EAST

        if direction is not None:
            self.direction_facing = direction # kung saan naka harap ung player
            self.move(direction)


    def decide_move(self) -> Direction:
        return Direction.NORTH

    def remove(self, bomb: BombInfo) -> None:
        try:
            self._active_bombs.remove(bomb)
        except ValueError:
            pass

    def add(self, bomb: BombInfo) -> None:
        self._active_bombs.add(bomb)

    def on_explosion_hit(self) -> None:
        if not self._alive:
            return
        self._alive = False
        self._expired = True

    def update(self, dt: int) -> UpdateResultInfo:
        return UpdateResult()


class PlayerFactory:

    @classmethod
    def make(cls, x: float, y: float, world: WorldInfo, grid: GridAdapter, id: int) -> Player:
        return Player(x, y, world, grid, id)