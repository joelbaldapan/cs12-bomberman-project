"""
implementation for:
- get_manhattan
- is_in_danger
"""

from common_types import GridCoords


def get_manhattan(a: GridCoords, b: GridCoords) -> int:
    return abs(a[0] - b[0]) + abs(a[1] - b[1])