from dataclasses import dataclass

@dataclass
class SpriteCoords:
    u: int
    v: int
    w: int
    h: int
    img: int = 0

class SpriteMap:
    TILE_SIZE = 16
    WALKABLE_TILE = SpriteCoords(0, 0, 16, 16)
    HARD_BLOCK = SpriteCoords(16, 0, 16, 16)
    SOFT_BLOCK = SpriteCoords(32, 0, 16, 16)

    # on hit with explosion animation
    SOFT_ON_HIT_2 = SpriteCoords(48, 0, 16, 16)
    SOFT_ON_HIT_3 = SpriteCoords(64, 0, 16, 16)
    SOFT_ON_HIT_4 = SpriteCoords(80, 0, 16, 16)
    SOFT_ON_HIT_5 = SpriteCoords(96, 0, 16, 16)

    # bomb animation
    BOMB_FRAME_1 = SpriteCoords(0, 16, 16, 16)
    BOMB_FRAME_2 = SpriteCoords(16, 16, 16, 16)
    BOMB_FRAME_3 = SpriteCoords(32, 16, 16, 16)

    # explosion
    ...

    # powerups
    POWERUP_BOMB = SpriteCoords(48, 16, 16, 16)
    POWERUP_FIRE = SpriteCoords(64, 16, 16, 16)
    POWERUP_SPEED = SpriteCoords(80, 16, 16, 16)
    POWERUP_RAINBOW = SpriteCoords(112, 16, 16, 16)
    POWERUP_VEST = SpriteCoords(96, 16, 16, 16)

    # p1
    P1_SOUTH = SpriteCoords(16, 32, 16, 24)
    P1_WALK_SOUTH_1 = SpriteCoords(32, 32, 16, 24)
    P1_WALK_SOUTH_2 = SpriteCoords(0, 32, 16, 24)

    P1_NORTH = (16, 80, 16, 24)
    P1_WALK_NORTH_1 = (32, 80, 16, 24)
    P1_WALK_NORTH_2 = (0, 80, 16, 24)

    P1_EAST = SpriteCoords(16, 56, 16, 24)
    P1_WALK_EAST_1 = SpriteCoords(32, 56, 16, 24)
    P1_WALK_EAST_2 = SpriteCoords(0, 56, 16, 24)

    P1_WEST = SpriteCoords(16, 104, 16, 24)
    P1_WALK_WEST_1 = SpriteCoords(32, 104, 16, 24)
    P1_WALK_WEST_2 = SpriteCoords(0, 104, 16, 24)

    P1_DEATH_1 = SpriteCoords(0, 128, 16, 24)
    P1_DEATH_2 = SpriteCoords(16, 128, 16, 24)
    P1_DEATH_3 = SpriteCoords(32, 128, 16, 24)
    P1_DEATH_4 = SpriteCoords(48, 128, 16, 24)
    P1_DEATH_5 = SpriteCoords(64, 128, 16, 24)
    P1_DEATH_6 = SpriteCoords(80, 128, 16, 24)

    # p2
    P2_SOUTH = SpriteCoords(64, 32, 16, 24)
    P2_WALK_SOUTH_1 = SpriteCoords(80, 32, 16, 24)
    P2_WALK_SOUTH_2 = SpriteCoords(48, 32, 16, 24)

    P2_NORTH = (64, 80, 16, 24)
    P2_WALK_NORTH_1 = (80, 80, 16, 24)
    P2_WALK_NORTH_2 = (48, 80, 16, 24)

    P2_EAST = SpriteCoords(64, 56, 16, 24)
    P2_WALK_EAST_1 = SpriteCoords(80, 56, 16, 24)
    P2_WALK_EAST_2 = SpriteCoords(48, 56, 16, 24)

    P2_WEST = SpriteCoords(64, 104, 16, 24)
    P2_WALK_WEST_1 = SpriteCoords(80, 104, 16, 24)
    P2_WALK_WEST_2 = SpriteCoords(48, 104, 16, 24)

    P2_DEATH_1 = SpriteCoords(0, 152, 16, 24)
    P2_DEATH_2 = SpriteCoords(16, 152, 16, 24)
    P2_DEATH_3 = SpriteCoords(32, 152, 16, 24)
    P2_DEATH_4 = SpriteCoords(48, 152, 16, 24)
    P2_DEATH_5 = SpriteCoords(64, 152, 16, 24)
    P2_DEATH_6 = SpriteCoords(80, 152, 16, 24)

    # p3
    P3_SOUTH = SpriteCoords(112, 32, 16, 24)
    P3_WALK_SOUTH_1 = SpriteCoords(128, 32, 16, 24)
    P3_WALK_SOUTH_2 = SpriteCoords(96, 32, 16, 24)

    P3_NORTH = (112, 80, 16, 24)
    P3_WALK_NORTH_1 = (128, 80, 16, 24)
    P3_WALK_NORTH_2 = (96, 80, 16, 24)

    P3_EAST = SpriteCoords(112, 56, 16, 24)
    P3_WALK_EAST_1 = SpriteCoords(128, 56, 16, 24)
    P3_WALK_EAST_2 = SpriteCoords(96, 56, 16, 24)

    P3_WEST = SpriteCoords(112, 104, 16, 24)
    P3_WALK_WEST_1 = SpriteCoords(128, 104, 16, 24)
    P3_WALK_WEST_2 = SpriteCoords(96, 104, 16, 24)

    P3_DEATH_1 = SpriteCoords(0, 176, 16, 24)
    P3_DEATH_2 = SpriteCoords(16, 176, 16, 24)
    P3_DEATH_3 = SpriteCoords(32, 176, 16, 24)
    P3_DEATH_4 = SpriteCoords(48, 176, 16, 24)
    P3_DEATH_5 = SpriteCoords(64, 176, 16, 24)
    P3_DEATH_6 = SpriteCoords(80, 176, 16, 24)

    # p4
    P4_SOUTH = SpriteCoords(160, 32, 16, 24)
    P4_WALK_SOUTH_1 = SpriteCoords(176, 32, 16, 24)
    P4_WALK_SOUTH_2 = SpriteCoords(144, 32, 16, 24)

    P4_NORTH = (160, 80, 16, 24)
    P4_WALK_NORTH_1 = (176, 80, 16, 24)
    P4_WALK_NORTH_2 = (144, 80, 16, 24)

    P4_EAST = SpriteCoords(160, 56, 16, 24)
    P4_WALK_EAST_1 = SpriteCoords(176, 56, 16, 24)
    P4_WALK_EAST_2 = SpriteCoords(144, 56, 16, 24)

    P4_WEST = SpriteCoords(160, 104, 16, 24)
    P4_WALK_WEST_1 = SpriteCoords(176, 104, 16, 24)
    P4_WALK_WEST_2 = SpriteCoords(144, 104, 16, 24)

    P4_DEATH_1 = SpriteCoords(0, 200, 16, 24)
    P4_DEATH_2 = SpriteCoords(16, 200, 16, 24)
    P4_DEATH_3 = SpriteCoords(32, 200, 16, 24)
    P4_DEATH_4 = SpriteCoords(48, 200, 16, 24)
    P4_DEATH_5 = SpriteCoords(64, 200, 16, 24)
    P4_DEATH_6 = SpriteCoords(80, 200, 16, 24)


# for animations might be able to think of a better implementation for later
@classmethod
def init_sprites(cls): # type: ignore
    ...

@classmethod
def get_player_spite(cls, player: int, direction: str, frame: int) -> SpriteCoords: # type: ignore
    ...

@classmethod
def get_player_death_sprite(cls, player: int, frame: int) -> SpriteCoords: # type: ignore
    ...

@classmethod
def get_bomb_sprite(cls, frame) -> SpriteCoords: # type: ignore
    ...

@classmethod
def get_explosion_sprite(cls, orientation, direction) -> SpriteCoords: # type: ignore
    ...

@classmethod
def get_soft_block_sprite(cls, frame: int) -> SpriteCoords: # type: ignore
    ...

class Animation:
    def __init__(self, fps: int = 30):
        self.fps = fps
        self.frame = 0

    def update(self) -> None:
        self.frame += 1
    
    def get_walk_frame(self) -> int:
        cycle = (self.frame // 5) % 4
        if cycle == 0:
            return 0
        elif cycle == 1:
            return 1
        elif cycle == 2:
            return 2
        else:
            return 1
        
    def get_bomb_frame(self) -> int:
        return (self.frame // 10) % 3
    
    def get_death_frame(self) -> int:
        return min(self.frame // 5, 5) # 5 ticks

    def get_soft_destruction_frame(self) -> int:
        return min(self.frame // 3, 4) # 3ticks

    