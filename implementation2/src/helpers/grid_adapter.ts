const ROWS = 13;
const COLS = 15;
const CELL_SIZE = 128;


export const cellToPixel = (
  row: number,
  col: number
): [number, number] => {
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) {
    return [-1, -1];
  }

  return [
    col * CELL_SIZE,
    row * CELL_SIZE,
  ];
};


export const pixelToCell = (
  x: number,
  y: number
): [number, number] | null => {
  if (x < 0 || y < 0) return null;

  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);

  if (col >= COLS || row >= ROWS) return null;

  return [row, col];
};

export const cellRect = (
  row: number,
  col: number
): [number, number, number, number] => {
  const [x, y] = cellToPixel(row, col);
  return [x, y, CELL_SIZE, CELL_SIZE];
};
