import pyxel
from common_types import WorldInfo, EntityType, PlayerInfo, BombInfo, BlockInfo, ExplosionInfo, PowerupInfo, Direction, ExplosionOrientation # type: ignore
from spritemap import SpriteMap, Animation, get_player_sprite, get_player_idle, get_bomb_sprite, get_explosion_sprite, get_soft_block_sprite, get_player_death_sprite # type: ignore
from entities.block import HardBlock, SoftBlock
from entities.bomb import Bomb # type: ignore
from entities.explosion import Explosion
from entities.player import Player
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
        pyxel.load("view.pyxres")

        self._animation = Animation(fps=30)

        # track player movement for animation
        self._player_positions: dict[int, tuple[float, float]] = {}

    def draw(self, timer: int = 60):
        pyxel.cls(0)
        self._draw_grid()
        self._draw_entities()
        self._draw_ui(timer)
        self._animation.update()

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
        for entity in self._world.entities:
            if isinstance(entity, (HardBlock, SoftBlock)):
                self._draw_block(entity)
        
        # for entity in self._world.entities:
        #     if entity.entity_type == EntityType.POWERUP:
        #         self._draw_powerup(entity)
  
        # for entity in self._world.entities:
        #     if isinstance(entity, Bomb):
        #         self._draw_bomb(entity)

        for entity in self._world.entities:
            if isinstance(entity, Explosion):
                self._draw_explosion(entity)

        for entity in self._world.entities:
            if isinstance(entity, Player):
                self._draw_player(entity)

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
        x = bomb.col * self._cell_size
        y = bomb.row * self._cell_size
        
        frame = self._animation.get_bomb_frame()
        sprite = get_bomb_sprite(frame)
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 0)

    def _draw_explosion(self, explosion: ExplosionInfo): # still not sure about this one, please help DUHAHDAHA
        x = explosion.col * self._cell_size
        y = explosion.row * self._cell_size
        
        match (hasattr(explosion, 'orientation'), hasattr(explosion, 'terminal_direction')):
            case (True, True):
                frame = min(self._animation.frame // 7, 3)
            
                orientation = getattr(explosion, 'orientation')
                terminal_dir = getattr(explosion, 'terminal_direction')
                
                orientation_str = self._orientation_to_str(orientation)
                direction_str = self._direction_to_str(terminal_dir) if terminal_dir else None
                
                sprite = get_explosion_sprite(orientation_str, direction_str or "", frame)
            case _:
                sprite = SpriteMap.EXPLOSION_MIDDLE_1
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 0)

    def _orientation_to_str(self, orientation: ExplosionOrientation) -> str:
        match orientation:
            case ExplosionOrientation.CENTER:
                return "CENTER"
            case ExplosionOrientation.VERTICAL:
                return "VERTICAL"
            case ExplosionOrientation.HORIZONTAL:
                return "HORIZONTAL"
            case _:
                return "CENTER"

    def _draw_player(self, player: PlayerInfo):
        # 16 x 24, but hitbox is 16 x 16
        x = int(player.x)
        y = int(player.y)
        
        player_id = getattr(player, '_id', 1)
        is_moving = self._is_player_moving(player, player_id)
        direction = player.direction_facing
        
        sprite = self._get_player_sprite(player_id, direction, is_moving)
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 0)
        
        # draw the player lanbel
        label = f"P{player_id}"
        label_x = x + 4
        label_y = y - 6
        pyxel.text(label_x, label_y, label, 7)
    
    def _is_player_moving(self, player: PlayerInfo, player_id: int) -> bool:
        current_pos = (player.x, player.y)
        
        match player_id in self._player_positions:
            case False:
                self._player_positions[player_id] = current_pos
                return False
            case True:
                prev_pos = self._player_positions[player_id]
                is_moving = current_pos != prev_pos
                self._player_positions[player_id] = current_pos
                return is_moving
    
    def _get_player_sprite(self, player_id: int, direction: Direction, is_moving: bool):
        direction_str = self._direction_to_str(direction)
        
        match is_moving:
            case True:
                # animation frame
                frame = self._animation.get_walk_frame()
                sprites = get_player_sprite(player_id, direction_str)
                return sprites[frame]
            case False:
                # idle sprite
                return get_player_idle(player_id, direction_str)
    
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
        minutes = timer // 60
        seconds = timer % 60
        timer_text = f"{minutes:02d}:{seconds:02d}"
        
        # adjust the timer wherever HDUAHWDAH
        text_x = (self._display_width - len(timer_text) * 4) // 2
        text_y = 4
        
        pyxel.text(text_x, text_y, timer_text, 7)
        
    def update_animation(self):
        self._animation.update()