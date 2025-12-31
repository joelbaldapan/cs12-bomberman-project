from typing import Callable
import pyxel
from common_types import AnimationCmd, AnimationType, CoordMode, ModelState, RoundResult, ResultType, DrawType, EntityInfo, PlayerInfo, BombInfo, BlockInfo, ExplosionInfo, PowerupInfo, PowerUpType, Direction, ExplosionOrientation, SoundType, BotPlayerInfo
from spritemap import SpriteMap, Animation, get_player_sprite, get_player_idle, get_bomb_sprite, get_explosion_sprite, get_soft_block_sprite, get_player_death_sprite, get_powerup_sprite
from entities.block import HardBlock, SoftBlock
from entities.bomb import Bomb
from entities.explosion import Explosion
from entities.powerup import Powerup
from helpers.grid_adapter import GridAdapter

class View:
    # handle all rendering logic based sa state ng world
    def __init__(self, grid: GridAdapter, fps: int, cell_size: int = 16):
        self._grid = grid
        self._cell_size = cell_size
        self._fps = fps
        self._rows = 13
        self._cols = 15
        self._display_width = self._cols * cell_size
        self._display_height = grid.offset_y + self._rows * cell_size

        # load resource file
        pyxel.init(self._display_width, self._display_height, fps=self._fps, quit_key=pyxel.KEY_NONE)
        pyxel.load("view.pyxres")
        pyxel.load("music.pyxres", exclude_images = True, exclude_tilemaps = True)

        self._animation = Animation(fps=self._fps)

        # track player movement for animation
        self._player_positions: dict[int, tuple[float, float]] = {}

        # track active animations
        self._active_animations: list[tuple[AnimationCmd, int]] = []

    @property
    def key(self) -> dict[str, bool]:
        return {"UP": pyxel.btn(pyxel.KEY_UP), 
                "DOWN": pyxel.btn(pyxel.KEY_DOWN),
                "LEFT": pyxel.btn(pyxel.KEY_LEFT),
                "RIGHT": pyxel.btn(pyxel.KEY_RIGHT),
                "SPACEBAR": pyxel.btnp(pyxel.KEY_SPACE),
                "W": pyxel.btn(pyxel.KEY_W),
                "S": pyxel.btn(pyxel.KEY_S),
                "A": pyxel.btn(pyxel.KEY_A),
                "D": pyxel.btn(pyxel.KEY_D),
                "X": pyxel.btnp(pyxel.KEY_X),
                "ESC": pyxel.btnp(pyxel.KEY_ESCAPE)}
    
    def start_animation(self, cmd: AnimationCmd):
        self._active_animations.append((cmd, 0))

    def play_sound(self, sound_type: SoundType):
        match sound_type:
            case SoundType.EXPLOSION:
                pyxel.playm(0)
            case SoundType.POWERUP_GET:
                pyxel.playm(1)
            case SoundType.DEATH:
                pyxel.playm(2)
    
    def draw(self, entities: set[EntityInfo], players: list[PlayerInfo], timer: int, state: ModelState, results: RoundResult|None, countdown: int, scores: dict[int,int], debug_mode: bool):
        pyxel.cls(0)

        if state == ModelState.TRANSITION:
            self._active_animations.clear()
            if results is not None:
                self._draw_result_screen(results, scores)
                return
            
        self._draw_grid()
        self._draw_entities(entities, players)
        self._draw_animations()
        self._draw_ui(timer)
        
        if debug_mode:
            self._draw_debug_info(players)
        
        self._animation.update()
        self._update_animations()

        if state == ModelState.COUNTDOWN:
            self._draw_countdown(countdown)

    def _draw_debug_info(self, players: list[PlayerInfo]):
        for player in players:
            if not isinstance(player, BotPlayerInfo):
                continue
            
            bot = player
            controller = bot.controller
            
            config = controller.config
            memory = controller.memory
            current_state = controller.current_state 

            bot_x = int(bot.hitbox_x + 8)
            bot_y = int(bot.hitbox_y + 8)

            bot_type_text = f"{config.bot_type.value.upper()}"
            state_text = f"{type(current_state).__name__}"
            
            text_x = bot_x - len(bot_type_text) * 2
            text_y = bot_y + 10
            
            pyxel.text(text_x, text_y, bot_type_text, 7)
            pyxel.text(text_x, text_y + 6, state_text, 7)
            
            danger_radius = config.danger_radius
            if danger_radius > 0:
                pyxel.circb(bot_x, bot_y, danger_radius * 16, 8)

            if memory.path:
                path_color = self._get_bot_path_color(bot.id)
                for cell in memory.path:
                    corner_x, corner_y = self._get_path_marker_position(cell, bot.id)
                    pyxel.rect(corner_x, corner_y, 2, 2, path_color)

    def _get_bot_path_color(self, player_id: int) -> int:
        match player_id:
            case 2:
                return 8
            case 3:
                return 8
            case 4:
                return 10  
            case _:
                return 8  

    def _get_path_marker_position(self, cell: tuple[int, int], player_id: int) -> tuple[int, int]:
        row, col = cell
        cell_x, cell_y = self._grid.cell_to_pixel(row, col)
        
        match player_id:
            case 2: # tr
                return (cell_x + 14, cell_y + 0)
            case 3: # bl
                return (cell_x + 0, cell_y + 14)
            case 4: # br
                return (cell_x + 14, cell_y + 14)
            case _: # tl
                return (cell_x + 0, cell_y + 0)

    def draw_game_over(self, message: str):
        pyxel.cls(0)
        
        text_width = len(message) * 4 
        x = (self._display_width - text_width) // 2
        y = self._display_height // 2
        
        pyxel.text(x, y, message, 7)

    def _draw_result_screen(self, result: RoundResult, scores: dict[int,int]):
        pyxel.cls(0)

        center_x = self._display_width // 2
        y_offset = 30

        match result.outcome:
            case ResultType.WIN if result.winner_id is not None:
                result_text = f"Player {result.winner_id} Wins the Round!"
                text_width = len(result_text) * 4
                pyxel.text(center_x - text_width // 2, y_offset, result_text, 11)
            case _:  
                match result.draw_type:
                    case DrawType.TIME:
                        result_text = "Time Out - Draw!"
                    case _:
                        result_text = "Draw!"
                text_width = len(result_text) * 4
                pyxel.text(center_x - text_width // 2, y_offset, result_text, 8)
        
        y_offset += 20
        scores_title = "SCORES"
        title_width = len(scores_title) * 4
        pyxel.text(center_x - title_width // 2, y_offset, scores_title, 7)
        
        y_offset += 15
        
        for player_id in range(1, 5):
            score = scores.get(player_id, 0)
            score_text = f"P{player_id}: {score}"
            text_width = len(score_text) * 4
            pyxel.text(center_x - text_width // 2, y_offset, score_text, 7)
            y_offset += 10
        
        if result.match_over and result.overall_winner_id is not None:
            y_offset += 10
            winner_text = f"Player {result.overall_winner_id} Wins the Match!"
            text_width = len(winner_text) * 4
            pyxel.text(center_x - text_width // 2, y_offset, winner_text, 10)
    
        else:
            y_offset += 15
            instruction = "Press ESC to continue"
            text_width = len(instruction) * 4
            pyxel.text(center_x - text_width // 2, y_offset, instruction, 13)
        
    def _draw_countdown(self, countdown: int):
        seconds_remaining = (countdown + self._fps - 1) // self._fps  # ceiling division
        
        center_x = self._display_width // 2
        center_y = self._display_height // 2
        
        match seconds_remaining:
            case 3:
                text = "Ready"
            case 2:
                text = "Set"
            case 1:
                text = "Go!"
            case _:
                text = str(seconds_remaining)
        
        text_width = len(text) * 4
        text_height = 6

        rect_x = center_x - text_width // 2 - 2
        rect_y = center_y - 2
        rect_width = text_width + 2 * 2
        rect_height = text_height + 2 * 2
        
        pyxel.rect(rect_x, rect_y, rect_width, rect_height, 8)
        pyxel.text(center_x - text_width // 2, center_y, text, 10)

    def _draw_grid(self):
        for row in range(self._rows):
            for col in range(self._cols):
                x, y = self._grid.cell_to_pixel(row, col)
                
                sprite = SpriteMap.WALKABLE_TILE
                pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 0)
    
    def _draw_entities(self, entities: set[EntityInfo], players: list[PlayerInfo]):
        for entity in entities:
            if isinstance(entity, (HardBlock, SoftBlock)):
                if not self._has_animation_at_cell(entity.row, entity.col, AnimationType.SOFT_BREAK):
                    self._draw_block(entity)
        
        for entity in entities:
            if isinstance(entity, Powerup):
                if not self._has_animation_at_cell(entity.row, entity.col, AnimationType.POWERUP_BREAK):
                    self._draw_powerup(entity)

        for entity in entities:
            if isinstance(entity, Bomb):
                self._draw_bomb(entity)

        for entity in entities:
            if isinstance(entity, Explosion):
                self._draw_explosion(entity)

        for entity in players:
            player_id = entity.id
            if not self._has_player_death_animation(player_id):
                self._draw_player(entity)

    # methods for _draw_entities
    def _has_animation_at_cell(self, row: int, col: int, anim_type: AnimationType) -> bool:
        for cmd, _ in self._active_animations:
            if cmd.type == anim_type and cmd.mode == CoordMode.CELL:
                if cmd.a == row and cmd.b == col:
                    return True
        return False
    
    def _has_player_death_animation(self, player_id: int) -> bool:
        for cmd, _ in self._active_animations:
            if cmd.type == AnimationType.DEATH and cmd.id == player_id:
                return True
        return False

    def _update_animations(self):
        updated: list[tuple[AnimationCmd, int]] = []
        for cmd, frame in self._active_animations:
            new_frame = frame + 1
            
            max_frames = self._get_max_frames(cmd)
            
            if new_frame < max_frames:
                updated.append((cmd, new_frame))
        
        self._active_animations = updated
    
    def _get_max_frames(self, cmd: AnimationCmd) -> int:
        if cmd.type == AnimationType.DEATH:
            return 48 
        elif cmd.type == AnimationType.SOFT_BREAK:
            return 15  
        elif cmd.type == AnimationType.POWERUP_BREAK:
            return 15  
        return cmd.duration_frames

    def _draw_animations(self):
        for cmd, frame in self._active_animations:
            if cmd.type == AnimationType.DEATH:
                self._draw_death_animation(cmd, frame)
            elif cmd.type == AnimationType.SOFT_BREAK:
                self._draw_soft_break_animation(cmd, frame)
            elif cmd.type == AnimationType.POWERUP_BREAK:
                self._draw_powerup_break_animation(cmd, frame)

    def _draw_death_animation(self, cmd: AnimationCmd, frame: int):
        if cmd.id is None:
            return

        if cmd.mode == CoordMode.PIXEL:
            x = int(cmd.a)
            y = int(cmd.b)
        else: 
            x, y = self._grid.cell_to_pixel(int(cmd.a), int(cmd.b))
        
        # 8 ticks per frame, 6 frames
        sprite_frame = min(frame // 8, 5)
        sprite = get_player_death_sprite(cmd.id, sprite_frame)
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 11)

    def _draw_soft_break_animation(self, cmd: AnimationCmd, frame: int):
        if cmd.mode == CoordMode.PIXEL:
            x = int(cmd.a)
            y = int(cmd.b)
        else:
            x, y = self._grid.cell_to_pixel(int(cmd.a), int(cmd.b))
        
        # 3 ticks per frame, 5 frames total
        sprite_frame = min(frame // 3, 4)
        sprite = get_soft_block_sprite(sprite_frame)
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 11)

    def _draw_powerup_break_animation(self, cmd: AnimationCmd, frame: int):
        if cmd.powerup_type is None:
            return
            
        if cmd.mode == CoordMode.PIXEL:
            x = int(cmd.a)
            y = int(cmd.b)
        else:
            x, y = self._grid.cell_to_pixel(int(cmd.a), int(cmd.b))
        
        sprite_frame = min(frame // 3, 4)
        
        # get powerup sprite
        match cmd.powerup_type:
            case PowerUpType.FIRE:
                sprite = SpriteMap.POWERUP_FIRE
            case PowerUpType.BOMB:
                sprite = SpriteMap.POWERUP_BOMB
            case PowerUpType.SPEED:
                sprite = SpriteMap.POWERUP_SPEED
            case _:
                sprite = SpriteMap.POWERUP_FIRE
        
        if sprite_frame < 3 and frame % 4 < 2:
            pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 14)

    def _draw_block(self, block: BlockInfo):
        x, y = self._grid.cell_to_pixel(block.row, block.col)
        
        match block.is_hard:
            case True:
                sprite = SpriteMap.HARD_BLOCK
            case False:
                sprite = SpriteMap.SOFT_BLOCK
            
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 11)

    def _draw_bomb(self, bomb: BombInfo):
        x, y = self._grid.cell_to_pixel(bomb.row, bomb.col)
        
        frame = self._animation.get_bomb_frame()
        sprite = get_bomb_sprite(frame)
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 11)

    def _draw_explosion(self, explosion: ExplosionInfo):
        x, y = self._grid.cell_to_pixel(explosion.row, explosion.col)
        
        match (hasattr(explosion, 'orientation'), hasattr(explosion, 'terminal_direction')):
            case (True, True):
                frame = (self._animation.frame // 7) % 4
            
                orientation = getattr(explosion, 'orientation')
                terminal_dir = getattr(explosion, 'terminal_direction')
                is_endpoint = (terminal_dir is not None)
                
                orientation_str = self._orientation_to_str(orientation)
                direction_str = self._direction_to_str(terminal_dir) if terminal_dir else None

                if is_endpoint:
                    orientation_str = "END"
                
                sprite = get_explosion_sprite(orientation_str, direction_str or "", frame)
            case _:
                frame = (self._animation.frame // 7) % 4
                sprite = get_explosion_sprite("CENTER", "", frame)
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 11)

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
        
        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 11)
        
        # draw the player lanbel
        label = f"P{player_id}"
        label_x = x + 4
        label_y = y - 6
        pyxel.text(label_x, label_y, label, 4)
    
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
        x, y = self._grid.cell_to_pixel(powerup.row, powerup.col)
        
        powerup_type = powerup.powerup_type
        frame = (self._animation.frame // 15) % 2 
        
        match powerup_type:
            case PowerUpType.FIRE:
                powerup_str = "FIRE"
            case PowerUpType.BOMB:
                powerup_str = "BOMB"
            case PowerUpType.SPEED:
                powerup_str = "SPEED"
            case _:
                powerup_str = "FIRE" 
        
        sprite = get_powerup_sprite(frame, powerup_str)

        pyxel.blt(x, y, sprite.img, sprite.u, sprite.v, sprite.w, sprite.h, 14)

    def _draw_ui(self, timer: int):
        in_seconds = timer // self._fps
        minutes = in_seconds // 60
        seconds = in_seconds % 60
        timer_text = f"{minutes:02d}:{seconds:02d}"
        
        text_width = len(timer_text) * 4
        text_height = 6 
        text_x = (self._display_width - text_width) // 2
        text_y = 4
        
        block_width = text_width + 3 * 2
        block_height = text_height + 3 * 2
        block_x = text_x - 3
        block_y = text_y - 3
        
        pyxel.rect(block_x, block_y, block_width, block_height, 9)
        pyxel.text(text_x, text_y, timer_text, 7)
        
    def update_animation(self):
        self._animation.update()

    def run(self, update: Callable[..., None], draw: Callable[..., None])-> None:
        pyxel.run(update, draw)