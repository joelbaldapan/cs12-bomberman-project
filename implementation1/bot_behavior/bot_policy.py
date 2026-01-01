
import random
from common_types import BotMemoryInfo, BombInfo, ExplosionInfo, GridCoords, BotPlayerInfo, PowerupInfo, WorldInfo
from bot_behavior.helpers.pathfinding import get_shortest_path, get_manhattan

# ATTACK POLICIES


class AttackPolicy1:
    """Attack only reachable enemies within a specific range"""

    def __init__(self, max_distance: int):
        self._max_distance = max_distance

    def can_place_bomb(self) -> bool:
        return True

    def get_goal(self, world: WorldInfo, bot: BotPlayerInfo) -> GridCoords | None:
        players = world.players
        print("a1")
        input(players)
        opponents = [p for p in players if p.id != bot.id]
        candidates: list[tuple[GridCoords, int]] = []

        for opponent in opponents:
            if opponent.id == bot.id:
                continue

            target_pos = (opponent.row, opponent.col)

            # Filter 1 - manhattan dist?
            dist = get_manhattan((bot.row, bot.col), target_pos)
            if dist > self._max_distance:
                continue

            # Filter 2 - reachable? (can't traverse soft blocks)
            path = get_shortest_path(
                world,
                (bot.row, bot.col),
                target_pos,
                ignore_soft_blocks=False
            )

            if path:
                candidates.append((target_pos, len(path)))

        if not candidates:
            return None

        candidates.sort(key=lambda x: x[1])
        return candidates[0][0]

    def get_path(self, world: WorldInfo, bot: BotPlayerInfo, memory: BotMemoryInfo) -> list[GridCoords]:
        if not memory.goal:
            return []

        return get_shortest_path(
            world,
            (bot.row, bot.col),
            memory.goal,
            ignore_soft_blocks=False
        )


class AttackPolicy2:
    """Randomly target any REACHABLE enemy"""

    def can_place_bomb(self) -> bool:
        return True

    def get_goal(self, world: WorldInfo, bot: BotPlayerInfo) -> GridCoords | None:
        players = world.players
        print("a2")
        input(players)
        opponents = [p for p in players if p.id != bot.id]

        if not opponents:
            return None

        random.shuffle(opponents)

        for target in opponents:
            target_pos = (target.row, target.col)
            path = get_shortest_path(
                world,
                (bot.row, bot.col),
                target_pos,
                ignore_soft_blocks=True
            )
            if path:  # Only return if reachable
                return target_pos

        return None

    def get_path(self, world: WorldInfo, bot: BotPlayerInfo, memory: BotMemoryInfo) -> list[GridCoords]:
        if not memory.goal:
            return []

        return get_shortest_path(
            world,
            (bot.row, bot.col),
            memory.goal,
            ignore_soft_blocks=True
        )


# POWERUP POLICIES

class PowerupPolicy1:
    """Target the absolute closest powerup"""

    def can_place_bomb(self) -> bool:
        return True

    def get_goal(self, world: WorldInfo, bot: BotPlayerInfo) -> GridCoords | None:
        powerups = world.get_all_type(PowerupInfo)
        if not powerups:
            return None

        start = (bot.row, bot.col)

        sorted_powerups = sorted(
            powerups,
            key=lambda p: get_manhattan(start, (p.row, p.col))
        )

        target = sorted_powerups[0]
        return (target.row, target.col)

    def get_path(self, world: WorldInfo, bot: BotPlayerInfo, memory: BotMemoryInfo) -> list[GridCoords]:
        if not memory.goal:
            return []

        return get_shortest_path(
            world,
            (bot.row, bot.col),
            memory.goal,
            ignore_soft_blocks=True
        )


class PowerupPolicy2:
    """Target random reachable powerups nearby"""

    def __init__(self):
        self._search_radius = 4

    def can_place_bomb(self) -> bool:
        return False

    def get_goal(self, world: WorldInfo, bot: BotPlayerInfo) -> GridCoords | None:
        powerups = world.get_all_type(PowerupInfo)
        candidates: list[GridCoords] = []
        start = (bot.row, bot.col)

        for p in powerups:
            p_pos = (p.row, p.col)

            # Filter 1 - within 4 cells
            if get_manhattan(start, p_pos) > self._search_radius:
                continue

            # Filter 2 - reachable (No soft blocks)
            path = get_shortest_path(
                world, start, p_pos, ignore_soft_blocks=False)
            if path:
                candidates.append(p_pos)

        if not candidates:
            return None

        return random.choice(candidates)

    def get_path(self, world: WorldInfo, bot: BotPlayerInfo, memory: BotMemoryInfo) -> list[GridCoords]:
        if not memory.goal:
            return []

        return get_shortest_path(
            world,
            (bot.row, bot.col),
            memory.goal,
            ignore_soft_blocks=False
        )


# DANGER POLICIES

class BombOnlyDangerPolicy:
    """Danger only from current bombs/explosions"""

    def is_in_danger(self, world: WorldInfo, bot: BotPlayerInfo, radius: int) -> bool:
        overlap_pos = bot.get_overlapping_cells()
        bot_pos = (bot.row, bot.col)

        danger_zones = self.get_all_danger_zones(world)

        if any(p in danger_zones for p in overlap_pos):
            return True

        if radius == 0:
            return False

        for r in range(bot.row - radius, bot.row + radius + 1):
            for c in range(bot.col - radius, bot.col + radius + 1):
                if not world.in_bounds(r, c):
                    continue

                if get_manhattan(bot_pos, (r, c)) <= radius:
                    if (r, c) in danger_zones:
                        return True
        return False

    def get_all_danger_zones(self, world: WorldInfo) -> set[GridCoords]:
        danger_cells: set[GridCoords] = set()

        # 1 - existing bombs and explosions
        bombs = world.get_all_type(BombInfo)
        for bomb in bombs:
            danger_cells.add((bomb.row, bomb.col))

        explosions = world.get_all_type(ExplosionInfo)
        for exp in explosions:
            danger_cells.add((exp.row, exp.col))

        return danger_cells


class ExplosionPredictionDangerPolicy:
    """Danger ONLY from predicted blasts"""

    def is_in_danger(self, world: WorldInfo, bot: BotPlayerInfo, radius: int) -> bool:
        overlap_pos = bot.get_overlapping_cells()
        bot_pos = (bot.row, bot.col)
        danger_zones = self.get_all_danger_zones(world)

        print(f"danger: {any(p in danger_zones for p in overlap_pos)}")
        if any(p in danger_zones for p in overlap_pos):
            return True

        if radius == 0:
            return False

        for r in range(bot.row - radius, bot.row + radius + 1):
            for c in range(bot.col - radius, bot.col + radius + 1):
                if not (0 <= r < world.rows and 0 <= c < world.cols):
                    continue

                if get_manhattan(bot_pos, (r, c)) <= radius:
                    if (r, c) in danger_zones:
                        return True
        return False

    def get_all_danger_zones(self, world: WorldInfo) -> set[GridCoords]:
        danger_cells: set[GridCoords] = set()

        # 1 - existing explosions
        explosions = world.get_all_type(ExplosionInfo)
        for exp in explosions:
            danger_cells.add((exp.row, exp.col))

        # 2 - bombs and their predicted blasts
        bombs = world.get_all_type(BombInfo)
        for b in bombs:
            # dont include bomb
            danger_cells.add((b.row, b.col))
            danger_cells.update(b.get_affected_cells(world))

        print(danger_cells)

        return danger_cells
