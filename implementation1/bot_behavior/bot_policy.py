
from common_types import GridCoords, PlayerInfo, WorldInfo


# TEMPORARY; TO IMPLEMENT!
class AttackPolicy1:
    def __init__(self, reachable_only: bool, max_distance: int): ...
    def get_goal(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> GridCoords | None:
        ...
    def get_path(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> list[GridCoords]:
        ...
class AttackPolicy2:
    # def __init__(self, reachable_only: bool, max_distance: int): ...
    def get_goal(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> GridCoords | None:
        ...
    def get_path(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> list[GridCoords]:
        ...

class PowerupPolicy1:
    def get_goal(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> GridCoords | None:
        ...
    def get_path(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> list[GridCoords]:
        ...
class PowerupPolicy2:
    def get_goal(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> GridCoords | None:
        ...
    def get_path(
        self, world: WorldInfo, bot: PlayerInfo, max_distance: int | None, reachable_only: bool
    ) -> list[GridCoords]:
        ...


class BombOnlyDangerPolicy:
    def is_in_danger(self, world: WorldInfo, bot: PlayerInfo, radius: int) -> bool:
        ...

class ExplosionPredictionDangerPolicy:
    def is_in_danger(self, world: WorldInfo, bot: PlayerInfo, radius: int) -> bool:
        ...
# TEMPORARY; TO IMPLEMENT!