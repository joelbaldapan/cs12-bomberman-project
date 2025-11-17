from common_types import BlockInfo, BombInfo, EntityHandler, EntityInfo, ExplosionInfo, PlayerInfo, Board, PowerupInfo


class WorldBoard:
    def __init__(self, rows: int, cols: int):
        self._board: Board = [
            [None for _ in range(cols)] for _ in range(rows)
        ]
        self._entities: set[EntityInfo] = set()

    def place(self, entity: EntityInfo) -> None:
        self._entities.add(entity)
        i, j = entity.i, entity.j
        self._board[i][j] = entity

    def remove(self, entity: EntityInfo) -> None:
        self._entities.discard(entity)
        i, j = entity.i, entity.j
        self._board[i][j] = None

# TODO: Crate WorldBoard Protocol^^ for DIP compliance

class BombHandler:
    def __init__(self, world: WorldBoard):
        self._world = world
        self._bombs: set[BombInfo] = set()

    def update(self, dt: int):
        # pa-implement lang guyss
        # 1. Tick all bombs
        # 2. Detonate expired bombs
        #       - aka Spawn explosions
        # 3. Remove those that have expired
        ...

    def add(self, entity: BombInfo):
        self._bombs.add(entity)
 
    def get_all(self) -> set[BombInfo]:
        return set(self._bombs)

    def remove(self, entity: BombInfo):
        return self._bombs.discard(entity)


class ExplosionHandler:
    def __init__(self, world: WorldBoard):
        self._world = world
        self._explosions: set[ExplosionInfo] = set()

    def update(self, dt: int):
        # 1. Tick all explosions
        # 2. Remove those that have expired
        ...
    
    def add(self, entity: ExplosionInfo):
        self._explosions.add(entity)
 
    def get_all(self) -> set[ExplosionInfo]:
        return set(self._explosions)

    def remove(self, entity: ExplosionInfo):
        return self._explosions.discard(entity)

# TODO: add other handlers


class Model:
    def __init__(self, world: WorldBoard):
        self._world = world

        self._bombs: EntityHandler[BombInfo] = BombHandler(world)
        self._explosions: EntityHandler[ExplosionInfo] = ExplosionHandler(world)
        self._powerups: EntityHandler[PowerupInfo] = PowerupHandler(world)
        self._blocks: EntityHandler[BlockInfo] = BlockHandler(world)
        self._players: EntityHandler[PlayerInfo] = PlayerHandler(world)

    def handle_input(self): ...

    def update(self, dt: int):
        self._bombs.update(dt)
        self._explosions.update(dt)
        # ...