import pyxel
from common_types import WorldInfo, EntityType, PlayerInfo, BombInfo, BlockInfo, ExplosionInfo, PowerupInfo

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
        ...

    # I think sprite loading could be handled in a different class what do you guys think ba HAUDHWAUDHA 
    def _setup_sprites(self):
        ...
    
    def _draw_sprite(self, x: float, y: float, sprite: str):
        ...

    def _draw_grid(self):
        for row in range(1, self._rows - 1):
            for col in range(1, self._cols - 1):
                self._draw_sprite(col * self._cell_size, row * self._cell_size, 'walkable')
    
    def _draw_entities(self):
        for entity in self._world.entities:
            entity_type = entity.entity_type
            if entity_type == EntityType.EXPLOSION:
                ...
            elif entity_type == EntityType.BOMB:
                ...
            elif entity_type == EntityType.BLOCK:
                ...
            elif entity_type == EntityType.PLAYER:
                ...
            elif entity_type == EntityType.POWERUP:
                ...
    
    # will be making methods for _draw_entities
    def _draw_block(self, block: BlockInfo):
        ...

    def _draw_bomb(self, bomb: BombInfo):
        ...
    
    def _draw_explosion(self, explosion: ExplosionInfo):
        ...
    
    def _draw_player(self, player: PlayerInfo):
        ...
    
    def _draw_powerup(self, powerup: PowerupInfo):
        ...

    def _draw_ui(self, timer: int):
        ...
    