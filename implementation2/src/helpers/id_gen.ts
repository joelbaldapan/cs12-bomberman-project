export const generateId = (row: number, col: number): number => {
  return (row + 1) * 100 + col
};