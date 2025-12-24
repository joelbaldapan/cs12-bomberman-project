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
    EXPLOSION_MIDDLE_1 = SpriteCoords(32, 32, 16, 16, 1)
    EXPLOSION_MIDDLE_2 = SpriteCoords(128, 32, 16, 16, 1)
    EXPLOSION_MIDDLE_3 = SpriteCoords(32, 128, 16, 16, 1)
    EXPLOSION_MIDDLE_4 = SpriteCoords(128, 128, 16, 16, 1)

    EXPLOSION_NORTH_END_1 = SpriteCoords(32, 0, 16, 16, 1)
    EXPLOSION_NORTH_END_2 = SpriteCoords(128, 0, 16, 16, 1)
    EXPLOSION_NORTH_END_3 = SpriteCoords(32, 96, 16, 16, 1)
    EXPLOSION_NORTH_END_4 = SpriteCoords(128, 96, 16, 16, 1)

    EXPLOSION_NORTH_SEGMENT_1 = SpriteCoords(32, 16, 16, 16, 1)    
    EXPLOSION_NORTH_SEGMENT_2 = SpriteCoords(128, 16, 16, 16, 1) 
    EXPLOSION_NORTH_SEGMENT_3 = SpriteCoords(32, 112, 16, 16, 1) 
    EXPLOSION_NORTH_SEGMENT_4 = SpriteCoords(128, 112, 16, 16, 1) 

    EXPLOSION_SOUTH_END_1 = SpriteCoords(32, 64, 16, 16, 1)
    EXPLOSION_SOUTH_END_2 = SpriteCoords(128, 64, 16, 16, 1)
    EXPLOSION_SOUTH_END_3 = SpriteCoords(32, 160, 16, 16, 1)
    EXPLOSION_SOUTH_END_4 = SpriteCoords(128, 160, 16, 16, 1)

    EXPLOSION_SOUTH_SEGMENT_1 = SpriteCoords(32, 48, 16, 16, 1)    
    EXPLOSION_SOUTH_SEGMENT_2 = SpriteCoords(128, 48, 16, 16, 1) 
    EXPLOSION_SOUTH_SEGMENT_3 = SpriteCoords(32, 144, 16, 16, 1) 
    EXPLOSION_SOUTH_SEGMENT_4 = SpriteCoords(128, 144, 16, 16, 1) 

    EXPLOSION_WEST_END_1 = SpriteCoords(0, 32, 16, 16, 1)
    EXPLOSION_WEST_END_2 = SpriteCoords(96, 32, 16, 16, 1)
    EXPLOSION_WEST_END_3 = SpriteCoords(0, 128, 16, 16, 1)
    EXPLOSION_WEST_END_4 = SpriteCoords(96, 128, 16, 16, 1)

    EXPLOSION_WEST_SEGMENT_1 = SpriteCoords(16, 32, 16, 16, 1)    
    EXPLOSION_WEST_SEGMENT_2 = SpriteCoords(112, 32, 16, 16, 1) 
    EXPLOSION_WEST_SEGMENT_3 = SpriteCoords(16, 128, 16, 16, 1) 
    EXPLOSION_WEST_SEGMENT_4 = SpriteCoords(112, 128, 16, 16, 1) 

    EXPLOSION_EAST_END_1 = SpriteCoords(64, 32, 16, 16, 1)
    EXPLOSION_EAST_END_2 = SpriteCoords(160, 32, 16, 16, 1)
    EXPLOSION_EAST_END_3 = SpriteCoords(64, 128, 16, 16, 1)
    EXPLOSION_EAST_END_4 = SpriteCoords(160, 128, 16, 16, 1)

    EXPLOSION_EAST_SEGMENT_1 = SpriteCoords(48, 32, 16, 16, 1)    
    EXPLOSION_EAST_SEGMENT_2 = SpriteCoords(144, 32, 16, 16, 1) 
    EXPLOSION_EAST_SEGMENT_3 = SpriteCoords(48, 128, 16, 16, 1) 
    EXPLOSION_EAST_SEGMENT_4 = SpriteCoords(144, 128, 16, 16, 1) 

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

    P1_NORTH = SpriteCoords(16, 80, 16, 24)
    P1_WALK_NORTH_1 = SpriteCoords(32, 80, 16, 24)
    P1_WALK_NORTH_2 = SpriteCoords(0, 80, 16, 24)

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

    P2_NORTH = SpriteCoords(64, 80, 16, 24)
    P2_WALK_NORTH_1 = SpriteCoords(80, 80, 16, 24)
    P2_WALK_NORTH_2 = SpriteCoords(48, 80, 16, 24)

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

    P3_NORTH = SpriteCoords(112, 80, 16, 24)
    P3_WALK_NORTH_1 = SpriteCoords(128, 80, 16, 24)
    P3_WALK_NORTH_2 = SpriteCoords(96, 80, 16, 24)

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

    P4_NORTH = SpriteCoords(160, 80, 16, 24)
    P4_WALK_NORTH_1 = SpriteCoords(176, 80, 16, 24)
    P4_WALK_NORTH_2 = SpriteCoords(144, 80, 16, 24)

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

@staticmethod
def get_player_sprite(cls: SpriteMap, player: int, direction: str) -> list[SpriteCoords]:
    if player == 1:
        if direction == "NORTH":
            return [cls.P1_NORTH, cls.P1_WALK_NORTH_1, cls.P1_NORTH, cls.P1_WALK_NORTH_2]
        elif direction == "SOUTH":
            return [cls.P1_SOUTH, cls.P1_WALK_SOUTH_1, cls.P1_SOUTH, cls.P1_WALK_SOUTH_2]
        elif direction == "EAST":
            return [cls.P1_EAST, cls.P1_WALK_EAST_1, cls.P1_EAST, cls.P1_WALK_EAST_2]
        else: # "WEST"
            return [cls.P1_WEST, cls.P1_WALK_WEST_1, cls.P1_WEST, cls.P1_WALK_WEST_2]

    elif player == 2:
        if direction == "NORTH":
            return [cls.P2_NORTH, cls.P2_WALK_NORTH_1, cls.P2_NORTH, cls.P2_WALK_NORTH_2]
        elif direction == "SOUTH":
            return [cls.P2_SOUTH, cls.P2_WALK_SOUTH_1, cls.P2_SOUTH, cls.P2_WALK_SOUTH_2]
        elif direction == "EAST":
            return [cls.P2_EAST, cls.P2_WALK_EAST_1, cls.P2_EAST, cls.P2_WALK_EAST_2]
        else: # "WEST"
            return [cls.P2_WEST, cls.P2_WALK_WEST_1, cls.P2_WEST, cls.P2_WALK_WEST_2]
        
    elif player == 3:
        if direction == "NORTH":
            return [cls.P3_NORTH, cls.P3_WALK_NORTH_1, cls.P3_NORTH, cls.P3_WALK_NORTH_2]
        elif direction == "SOUTH":
            return [cls.P3_SOUTH, cls.P3_WALK_SOUTH_1, cls.P3_SOUTH, cls.P3_WALK_SOUTH_2]
        elif direction == "EAST":
            return [cls.P3_EAST, cls.P3_WALK_EAST_1, cls.P3_EAST, cls.P3_WALK_EAST_2]
        else: # "WEST"
            return [cls.P3_WEST, cls.P3_WALK_WEST_1, cls.P3_WEST, cls.P3_WALK_WEST_2]
    
    else: # player == 4
        if direction == "NORTH":
            return [cls.P4_NORTH, cls.P4_WALK_NORTH_1, cls.P4_NORTH, cls.P4_WALK_NORTH_2]
        elif direction == "SOUTH":
            return [cls.P4_SOUTH, cls.P4_WALK_SOUTH_1, cls.P4_SOUTH, cls.P4_WALK_SOUTH_2]
        elif direction == "EAST":
            return [cls.P4_EAST, cls.P4_WALK_EAST_1, cls.P4_EAST, cls.P4_WALK_EAST_2]
        else: # "WEST"
            return [cls.P4_WEST, cls.P4_WALK_WEST_1, cls.P4_WEST, cls.P4_WALK_WEST_2]

@staticmethod
def get_player_idle(cls: SpriteMap, player: int, direction: str) -> SpriteCoords:
    if player == 1:
        if direction == "NORTH":
            return cls.P1_NORTH
        elif direction == "SOUTH":
            return cls.P1_SOUTH
        elif direction == "EAST":
            return cls.P1_EAST
        else: # "WEST"
            return cls.P1_WEST
    elif player == 2:
        if direction == "NORTH":
            return cls.P2_NORTH
        elif direction == "SOUTH":
            return cls.P2_SOUTH
        elif direction == "EAST":
            return cls.P2_EAST
        else: # "WEST"
            return cls.P2_WEST    
    elif player == 3:
        if direction == "NORTH":
            return cls.P3_NORTH
        elif direction == "SOUTH":
            return cls.P3_SOUTH
        elif direction == "EAST":
            return cls.P3_EAST
        else: # "WEST"
            return cls.P3_WEST    
    else: # player == 4
        if direction == "NORTH":
            return cls.P4_NORTH
        elif direction == "SOUTH":
            return cls.P4_SOUTH
        elif direction == "EAST":
            return cls.P4_EAST
        else: # "WEST"
            return cls.P4_WEST

@staticmethod
def get_player_death_sprite(cls: SpriteMap, player: int, frame: int) -> SpriteCoords: 
    frame = 0 # to be implemented later, hindi ko pa maisip/may ganaps pa kami hehe
    death_sprite_loop: list[SpriteCoords] = []

    if player == 1:
        death_sprite_loop = [cls.P1_DEATH_1, cls.P1_DEATH_2, cls.P1_DEATH_3,cls.P1_DEATH_4, cls.P1_DEATH_5, cls. P1_DEATH_6]
    elif player == 2:
        death_sprite_loop =  [cls.P2_DEATH_1, cls.P2_DEATH_2, cls.P2_DEATH_3,cls.P2_DEATH_4, cls.P2_DEATH_5, cls. P2_DEATH_6]
    elif player == 3:
        death_sprite_loop = [cls.P3_DEATH_1, cls.P3_DEATH_2, cls.P3_DEATH_3,cls.P3_DEATH_4, cls.P3_DEATH_5, cls. P3_DEATH_6]
    else: # player == 4
        death_sprite_loop = [cls.P4_DEATH_1, cls.P4_DEATH_2, cls.P4_DEATH_3,cls.P4_DEATH_4, cls.P4_DEATH_5, cls. P4_DEATH_6]

    return death_sprite_loop[frame]
@staticmethod
def get_bomb_sprite(cls: SpriteMap, frame: int) -> SpriteCoords: 
    frame = frame % 3 # needed in order to cycle the 3 animations
    if frame == 0:
        return cls.BOMB_FRAME_1
    elif frame == 1:
        return cls.BOMB_FRAME_2
    else: # frame == 2
        return cls.BOMB_FRAME_3

@staticmethod
def get_explosion_sprite(cls: SpriteMap, orientation: str, direction: str, frames: int  ) -> SpriteCoords: # 15 frames between animation change; 15 * 4 = 60 =2 seconds
    if orientation == "CENTER":
        return ...
    elif orientation == "VERTICAL":
        return ...
    else: # orientation == "HORIZONTAL"
        return ...
@staticmethod
def get_soft_block_sprite(cls: SpriteMap, frame: int) -> SpriteCoords:
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

    