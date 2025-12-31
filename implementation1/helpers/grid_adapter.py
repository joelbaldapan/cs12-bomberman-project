from dataclasses import dataclass
from typing import Optional

@dataclass
class GridAdapter:
    offset_x: int # starting x (top-left) ng pag draw ng grid, including ung hard block outline
    offset_y: int # as above but y
    rows = 13
    cols = 15
    cell_size: int = 16
    

    def cell_to_pixel(self, row: int, col: int) -> tuple[int, int]:
        if not (0 <= row < self.rows and 0 <= col < self.cols):
            return (-1, -1) # placeholder for out of bounds

        x = self.offset_x + col * self.cell_size
        y = self.offset_y + row * self.cell_size
        return x, y

    
    def pixel_to_cell(self, x: int, y: int) -> Optional[tuple[int, int]]:
        rel_x = x - self.offset_x
        rel_y = y - self.offset_y

        
        if rel_x < 0 or rel_y < 0:
            return None

        col = rel_x // self.cell_size
        row = rel_y // self.cell_size

        if col >= self.cols or row >= self.rows:
            return None

        return int(row), int(col)

    def cell_rect(self, row: int, col: int) -> tuple[int, int, int, int]:
        x, y = self.cell_to_pixel(row, col)
        return x, y, self.cell_size, self.cell_size

    def contains_pixel(self, x: int, y: int) -> bool:
        return self.pixel_to_cell(x, y) is not None