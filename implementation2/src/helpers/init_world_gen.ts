import { Array, pipe } from "effect";
import { GridCoords } from "../model"; 

export const getSpacedBlockCoords = (): GridCoords[] => {
  const rows = [2, 4, 6, 8, 10];
  const cols = [2, 4, 6, 8, 10, 12];
  
  return pipe(
    rows,
    Array.flatMap((r) => 
      Array.map(cols, (c): GridCoords => [r, c])
    )
  );
};

export const getBorderBlockCoords = (rows: number, cols: number): GridCoords[] => {
  const topBottom = pipe(
    Array.range(0, cols - 1),
    Array.flatMap((c): GridCoords[] => [
      [0, c],
      [rows - 1, c],
    ])
  );

  const leftRight = pipe(
    Array.range(1, rows - 2),
    Array.flatMap((r): GridCoords[] => [
      [r, 0],
      [r, cols - 1],
    ])
  );

  return [...topBottom, ...leftRight];
};

export const getProtectedCoords = (rows: number, cols: number): GridCoords[] => {
  const coords: GridCoords[] = [
    // Top-Left (P1)
    [1, 1], [2, 1], [1, 2],
    
    // Bottom-Right (P2)
    [rows - 2, cols - 2], [rows - 3, cols - 2], [rows - 2, cols - 3],
    
    // Bottom-Left (P3)
    [rows - 2, 1], [rows - 3, 1], [rows - 2, 2],
    
    // Top-Right (P4)
    [1, cols - 2], [2, cols - 2], [1, cols - 3],
  ];
  return coords;
};