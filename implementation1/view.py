import pyxel
from common_types import WorldInfo, EntityType, PlayerInfo, BombInfo, BlockInfo, ExplosionInfo, PowerupInfo, Direction, ExplosionOrientation # type: ignore
from spritemap import SpriteMap, SpriteCoords, Animation, get_player_sprite, get_player_idle, get_bomb_sprite # type: ignore
from entities.explosion import Explosion
from entities.block import HardBlock, SoftBlock # type: ignore
from entities.bomb import Bomb # type: ignore
from entities.explosion import Explosion
from entities.player import Player # type: ignore

class View:
    # handle all rendering logic based sa state ng world
    def __init__(self, world: WorldInfo, cell_size: int = 16):
        self._world = world
        self._cell_size = cell_size

        self._rows = 13
        self._cols = 15
        self._display_width = self._cols * cell_size
        self._display_height = 20 + self._rows * cell_size # estimate lang for UI, feel free to change!

        #pyxel & load resource file
        pyxel.init(self._display_width, self._display_height, fps=30)

        #setup sprites
        ...

    def draw(self, timer: int = 60):
        pyxel.cls(0)
        self._draw_grid()
        self._draw_entities()
        self._draw_ui(timer)

    def draw_game_over(self, message: str):
        pyxel.cls(0)
        
        text_width = len(message) * 4 
        x = (self._display_width - text_width) // 2
        y = self._display_height // 2
        
        pyxel.text(x, y, message, 7)

    def _draw_grid(self):
        for row in range(self._rows):
            for col in range(self._cols):
                x = col * self._cell_size
                y = row * self._cell_size
                
                sprite = SpriteMap.WALKABLE_TILE
                pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 0)
    
    def _draw_entities(self):
        ...
        # for entity in self._world.entities:
        #     match entity:
        #         case HardBlock() | SoftBlock():
        #             self._draw_block(entity)
        
        # for entity in self._world.entities:
        #     match entity:
        #         case Powerup():
        #             self._draw_powerup(entity)  
  
        # for entity in self._world.entities:
        #     match entity:
        #         case Bomb():
        #             self._draw_bomb(entity)

        # for entity in self._world.entities:
        #     match entity:
        #         case Explosion():
        #             self._draw_explosion(entity) 

        # for entity in self._world.entities:
        #     match entity:
        #         case Player():
        #             self._draw_player(entity)

    # methods for _draw_entities
    def _draw_block(self, block: BlockInfo):
        x = block.col * self._cell_size
        y = block.row * self._cell_size
        
        match block.is_hard:
            case True:
                sprite = SpriteMap.HARD_BLOCK
            case False:
                sprite = SpriteMap.SOFT_BLOCK

        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 0)

    def _draw_bomb(self, bomb: BombInfo):
        # get current animation frame 
        ... 

    def _draw_explosion(self, explosion: ExplosionInfo):
        x = explosion.col * self._cell_size
        y = explosion.row * self._cell_size
        
        if isinstance(explosion, Explosion):
            sprite = self._get_explosion_sprite(explosion.orientation, explosion.terminal_direction)
        else:
            sprite = SpriteMap.EXPLOSION_MIDDLE_1
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, 
                 sprite.w, sprite.h, 0)

    def _get_explosion_sprite(self, orientation: ExplosionOrientation, terminal: Direction | None) -> SpriteCoords:
        match orientation:
            case ExplosionOrientation.CENTER:
                return SpriteMap.EXPLOSION_MIDDLE_1
            
            case ExplosionOrientation.VERTICAL:
                match terminal:
                    case Direction.NORTH:
                        return SpriteMap.EXPLOSION_NORTH_END_1
                    case Direction.SOUTH:
                        return SpriteMap.EXPLOSION_SOUTH_END_1
                    case _:
                        return SpriteMap.EXPLOSION_NORTH_SEGMENT_1
            
            case ExplosionOrientation.HORIZONTAL:
                match terminal:
                    case Direction.WEST:
                        return SpriteMap.EXPLOSION_WEST_END_1
                    case Direction.EAST:
                        return SpriteMap.EXPLOSION_EAST_END_1
                    case _:
                        return SpriteMap.EXPLOSION_WEST_SEGMENT_1

    def _draw_player(self, player: PlayerInfo):
        # 16 x 24, but hitbox is 16 x 16
        ...
    
    def _is_player_moving(self, player: PlayerInfo, player_id: int) -> bool:
        return True # placeholder
    
    def _get_player_sprite(self, player_id: int, direction: Direction, is_moving: bool):
        direction_str = self._direction_to_str(direction) # type: ignore
        
        if is_moving:
            ...
        else:
            # get idle sprite
            ...
    
    def _direction_to_str(self, direction: Direction) -> str:
        match direction:
            case Direction.NORTH:
                return "NORTH"
            case Direction.SOUTH:
                return "SOUTH"
            case Direction.EAST:
                return "EAST"
            case Direction.WEST:
                return "WEST"

    def _draw_powerup(self, powerup: PowerupInfo):
        ...

    def _draw_ui(self, timer: int):
        ...
    