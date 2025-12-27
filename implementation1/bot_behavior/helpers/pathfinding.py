"""
implementation for:
- get_shortest_path
- get_direction_from
- find_powerup_target
    - calls corresponding Policy class
- find_enemy_target
    - calls corresponding Policy class

"""


from common_types import BlockInfo, BombInfo, GridCoords, WorldInfo
from entities.block import HardBlock


def get_shortest_path(
    world: WorldInfo,
    start: GridCoords,
    target: GridCoords,
    traverse_soft_blocks: bool
) -> list[GridCoords]:
    board = world.board
    rows = len(board)
    cols = len(board[0])
    
    def is_walkable(r: int, c: int) -> bool:
        cell = board[r][c]
        if cell is None: return True

        if isinstance(cell, HardBlock): return False
        if isinstance(cell, BombInfo): return False 
        
        if traverse_soft_blocks:
            # In Reachable mode, Soft Blocks are obstacles
            if isinstance(cell, BlockInfo): return False
            
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

    return path
