from collections import deque
import random
from common_types import  Action, ActionInfo, BotMemoryInfo, PlayerAction, BlockInfo, BombInfo, Direction, EntityType, GridCoords, PlayerInfo, WorldInfo
from entities.block import HardBlock

def get_manhattan(a: GridCoords, b: GridCoords) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

def get_shortest_path(
    world: WorldInfo,
    start: GridCoords,
    target: GridCoords,
    ignore_soft_blocks: bool
) -> list[GridCoords]:
    board = world.board
    rows = len(board)
    cols = len(board[0])

    def is_walkable(r: int, c: int) -> bool:
        if (r, c) == start or (r, c) == target:
            return True

        cell = board[r][c]
        if cell is None:
            return True

        if isinstance(cell, HardBlock):
            return False
        if isinstance(cell, BombInfo):
            return False

        if not ignore_soft_blocks:
            if isinstance(cell, BlockInfo):
                return False

        return True

    def in_bounds(r: int, c: int) -> bool:
        return 0 <= r < rows and 0 <= c < cols

    # Create an empty set of unvisited cells
    unvisited: set[GridCoords] = set()

    # Assign the distance +∞+∞ for all cells; assign 00 for the starting cell
    dist: dict[GridCoords, float] = {
        (r, c): float('inf')
        for r in range(rows)
        for c in range(cols)
    }
    dist[start] = 0.0

    # Assign the "source cell" of each cell to be nothing
    source: dict[GridCoords, GridCoords | None] = {
        (r, c): None
        for r in range(rows)
        for c in range(cols)
    }

    # Add the starting cell to the set of unvisited cells
    unvisited.add(start)

    # While the set of unvisited cells is nonempty:
    while unvisited:

        # Remove the cell in the set with the smallest assigned distance (the current cell)
        current = min(unvisited, key=lambda cell: dist[cell])
        unvisited.remove(current)

        # Mark the current cell as visited
        # (implicitly done by not re-adding it to unvisited)

        # If the current cell is the target cell, terminate the algorithm
        if current == target:
            break

        r, c = current

        # For each unvisited, walkable neighboring cell of the current cell:
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = r + dr, c + dc

            if not in_bounds(nr, nc):
                continue
            if not is_walkable(nr, nc):
                continue
            if (nr, nc) not in dist:
                continue

            neighbor = (nr, nc)

            # Let CC be the assigned distance of the current cell
            CC = dist[current]

            # Let SS be the assigned distance of the neighboring cell
            SS = dist[neighbor]

            # If C+1C+1 is less than SS, then:
            if CC + 1 < SS:

                # Update the assigned distance of the neighboring cell to C+1C+1
                dist[neighbor] = CC + 1

                # Set the "source cell" of the neighboring cell to the current cell
                source[neighbor] = current

                # Add the selected cell to the set of unvisited cells
                unvisited.add(neighbor)

    path: list[GridCoords] = []
    cur: GridCoords | None = target
    while cur is not None:
        path.append(cur)
        cur = source[cur]
    path.reverse()

    if dist[target] == float('inf'):
        return []  # unreachable

    return path


def get_random_floor_cell(world: WorldInfo) -> GridCoords:
    for _ in range(100):
        r = random.randint(0, world.rows - 1)
        c = random.randint(0, world.cols - 1)

        # "Choose a random goal cell (must not contain a hard block)"
        if not world.is_cell_blocking(r, c, -1):
            return (r, c)

    return (1, 1)


def get_reachable_safe_cell(world: WorldInfo, bot: PlayerInfo, danger_zones: set[GridCoords]) -> GridCoords | None:
    queue = deque([(bot.row, bot.col)])
    visited = {(bot.row, bot.col)}
    candidates: list[GridCoords] = []

    MAX_STEPS = 200
    steps = 0

    while queue and steps < MAX_STEPS:
        curr = queue.popleft()
        steps += 1

        if curr not in danger_zones:
            candidates.append(curr)

        for d in Direction:
            nr, nc = curr[0] + d.value[0], curr[1] + d.value[1]

            if not world.in_bounds(nr, nc):
                continue
            if (nr, nc) in visited:
                continue

            if world.is_cell_blocking(nr, nc, bot.id):
                continue

            ent = world.get_entity_at(nr, nc)
            if ent and ent.entity_type in danger_zones:
                continue

            visited.add((nr, nc))
            queue.append((nr, nc))

    if candidates:
        return random.choice(candidates)

    return None


def _get_direction(start: GridCoords, end: GridCoords) -> Direction | None:
    dr = end[0] - start[0]
    dc = end[1] - start[1]
    for d in Direction:
        if d.value == (dr, dc):
            return d
    return None


def follow_path_action(
    memory: BotMemoryInfo,
    world: WorldInfo,
    entity: PlayerInfo,
    allow_bombing: bool
) -> ActionInfo:
    if not memory.path:
        return Action(PlayerAction.IDLE)

    # FINAL STEP LOGIC
    # (strictly must be at the center of target cell to avoid hitbox getting bombed)
    if memory.is_strict_movement:
        return _follow_action_strict(memory, world, entity, allow_bombing)

    curr_cell = (entity.row, entity.col)
    next_cell = memory.path[0]

    # PLANT BOMB
    # If our current target is the cell we are standing on, check the NEXT one.
    # If the next one is a block, plant bomb
    if curr_cell == next_cell and len(memory.path) > 1:
        future_cell = memory.path[1]
        block_at_future = world.get_entity_at(future_cell[0], future_cell[1])

        if block_at_future and block_at_future.entity_type == EntityType.BLOCK:
            if allow_bombing:
                # Safety: Don't plant if we are already on a bomb
                curr_ent = world.get_entity_at(curr_cell[0], curr_cell[1])
                if not (curr_ent and curr_ent.entity_type == EntityType.BOMB):
                    return Action(PlayerAction.PLANT_BOMB)

    # CENTERING
    # Standard tolerance for moving between open nodes
    STANDARD_TOL = 6.0
    # Strict tolerance required before entering "Strict Movement" (for final step)
    STRICT_TOL = 4.0

    if curr_cell == next_cell:
        center_px_x = (next_cell[1] * 16) + 8
        center_px_y = (next_cell[0] * 16) + 8
        bot_px_x = entity.hitbox_x + 8
        bot_px_y = entity.hitbox_y + 8

        dist_x = abs(center_px_x - bot_px_x)
        dist_y = abs(center_px_y - bot_px_y)

        # CHECK if we'll be taking the final step soon
        # It is 2 now, will be 1 after pop
        will_enter_strict = (len(memory.path) == 2)
        current_tol = STRICT_TOL if will_enter_strict else STANDARD_TOL

        if dist_x <= current_tol and dist_y <= current_tol:
            # We are centered enough. Done with this node
            popped = memory.path.pop(0)

            # Detect final step
            if len(memory.path) == 1:
                memory.set_path([popped, *memory.path])
                memory.set_strict_movement(True)
                return _follow_action_strict(memory, world, entity, allow_bombing)

            if not memory.path:
                return Action(PlayerAction.IDLE)

            # Update next_cell to the new target
            next_cell = memory.path[0]

        else:
            # Still centering
            dx = center_px_x - bot_px_x
            dy = center_px_y - bot_px_y

            # Make sure bot don't jitter
            if abs(dx) > abs(dy):
                return Action(PlayerAction.MOVE, Direction.EAST if dx > 0 else Direction.WEST)
            else:
                return Action(PlayerAction.MOVE, Direction.SOUTH if dy > 0 else Direction.NORTH)

    # BLOCKED CELL
    # Place bomb if next cell is blocked
    block_at_next = world.get_entity_at(next_cell[0], next_cell[1])
    is_blocked = False

    if block_at_next and block_at_next.entity_type in (EntityType.BLOCK, EntityType.BOMB):
        is_blocked = True

    if is_blocked:
        if allow_bombing and block_at_next and block_at_next.entity_type == EntityType.BLOCK:
            curr_ent = world.get_entity_at(curr_cell[0], curr_cell[1])
            if not (curr_ent and curr_ent.entity_type == EntityType.BOMB):
                return Action(PlayerAction.PLANT_BOMB)
        return Action(PlayerAction.IDLE)

    # CORRECT OVER/UNDERSHOOTS
    # Prevents jittering ang jittery Action decisions
    STEER_TOL = 2.0
    target_px_x = (next_cell[1] * 16) + 8
    target_px_y = (next_cell[0] * 16) + 8
    bot_px_x = entity.hitbox_x + 8
    bot_px_y = entity.hitbox_y + 8

    dx = target_px_x - bot_px_x
    dy = target_px_y - bot_px_y
    grid_dir = _get_direction(curr_cell, next_cell)

    if grid_dir is None:
        if abs(dx) > abs(dy):
            return Action(PlayerAction.MOVE, Direction.EAST if dx > 0 else Direction.WEST)
        else:
            return Action(PlayerAction.MOVE, Direction.SOUTH if dy > 0 else Direction.NORTH)

    if grid_dir in (Direction.EAST, Direction.WEST):
        # vertical
        if abs(dy) > STEER_TOL:
            return Action(PlayerAction.MOVE, Direction.SOUTH if dy > 0 else Direction.NORTH)
        return Action(PlayerAction.MOVE, grid_dir)

    elif grid_dir in (Direction.NORTH, Direction.SOUTH):
        # horizontal
        if abs(dx) > STEER_TOL:
            return Action(PlayerAction.MOVE, Direction.EAST if dx > 0 else Direction.WEST)
        return Action(PlayerAction.MOVE, grid_dir)

    return Action(PlayerAction.IDLE)


def _follow_action_strict(
    memory: BotMemoryInfo,
    world: WorldInfo,
    entity: PlayerInfo,
    allow_bombing: bool
) -> ActionInfo:
    """
    Run when we need to be strict with Movement!
    Example: trying to hide in a safe gap to escape an explosion.
        We need to be strict since the hitbox might graze the explosion!
    """

    if len(memory.path) < 2:
        return Action(PlayerAction.IDLE)

    prev_cell = memory.path[0]
    goal_cell = memory.path[1]

    # BOMB Soft block
    block_at_goal = world.get_entity_at(goal_cell[0], goal_cell[1])
    if block_at_goal and block_at_goal.entity_type == EntityType.BLOCK:
        if allow_bombing:
            # Safety: Do not plant if we are already standing on a bomb
            curr_ent = world.get_entity_at(entity.row, entity.col)
            if not (curr_ent and curr_ent.entity_type == EntityType.BOMB):
                return Action(PlayerAction.PLANT_BOMB)

        return Action(PlayerAction.IDLE)

    # MOVE to next
    move_dir = _get_direction(prev_cell, goal_cell)

    # Check if we're done
    is_touching = prev_cell in entity.get_overlapping_cells()

    if not is_touching:
        # We successfully left the previous cell
        memory.path.pop(0)
        memory.path.pop(0)
        memory.set_strict_movement(False)
        return Action(PlayerAction.IDLE)

    return Action(PlayerAction.MOVE, move_dir)
