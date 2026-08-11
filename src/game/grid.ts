export const GRID_COLUMNS = 8
export const GRID_ROWS = 8

export type PieceSize = '1x1' | '1x2' | '2x1' | '2x2'
export type PieceColor = 'red' | 'blue' | 'yellow' | 'white' | 'gray' | 'black'

export type GridCell = { column: number; row: number }

export type CompositionPiece = GridCell & {
  id: number
  width: number
  height: number
  color: PieceColor
}

export const PIECE_SIZES: Record<PieceSize, { width: number; height: number; label: string }> = {
  '1x1': { width: 1, height: 1, label: '1 × 1' },
  '1x2': { width: 1, height: 2, label: '1 × 2' },
  '2x1': { width: 2, height: 1, label: '2 × 1' },
  '2x2': { width: 2, height: 2, label: '2 × 2' },
}

export const COLOR_OPTIONS: Array<{ id: PieceColor; label: string }> = [
  { id: 'red', label: 'Vermelho' }, { id: 'blue', label: 'Azul' },
  { id: 'yellow', label: 'Amarelo' }, { id: 'white', label: 'Branco' },
  { id: 'gray', label: 'Cinza' }, { id: 'black', label: 'Preto' },
]

export function canPlacePiece(
  cell: GridCell,
  size: PieceSize,
  pieces: CompositionPiece[],
  ignoredPieceId?: number,
): boolean {
  const { width, height } = PIECE_SIZES[size]
  if (cell.column < 0 || cell.row < 0 || cell.column + width > GRID_COLUMNS || cell.row + height > GRID_ROWS) return false

  return !pieces.some((piece) => piece.id !== ignoredPieceId && (
    cell.column < piece.column + piece.width
    && cell.column + width > piece.column
    && cell.row < piece.row + piece.height
    && cell.row + height > piece.row
  ))
}
