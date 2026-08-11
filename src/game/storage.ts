import type { CompositionPiece, PieceColor } from './grid'

const STORAGE_KEY = 'construindo-com-mondrian:composition:v1'
const CREATIONS_KEY = 'mondrian3d:classroom:creations:v1'
const EVALUATIONS_KEY = 'mondrian3d:classroom:evaluations:v1'
const validColors: PieceColor[] = ['red', 'blue', 'yellow', 'white', 'gray', 'black']

export function isValidPiece(value: unknown): value is CompositionPiece {
  if (typeof value !== 'object' || value === null) return false
  const piece = value as Partial<CompositionPiece>
  return typeof piece.id === 'number'
    && typeof piece.column === 'number'
    && typeof piece.row === 'number'
    && (piece.width === 1 || piece.width === 2)
    && (piece.height === 1 || piece.height === 2)
    && validColors.includes(piece.color as PieceColor)
}

export type SavedCreation = {
  id: string
  name: string
  pieces: CompositionPiece[]
  savedAt: string
  version: 1
}

export type ExperienceEvaluation = {
  id: string
  submittedAt: string
  compositionEase: 'Muito fácil' | 'Fácil' | 'Difícil'
  pieceMovement: 'Sim' | 'Mais ou menos' | 'Não'
  houseEnjoyment: 'Sim' | 'Mais ou menos' | 'Não'
  immersionEnjoyment: 'Sim' | 'Mais ou menos' | 'Não'
  mobileSpeed: 'Sim' | 'Mais ou menos' | 'Não'
  favoritePart: 'Montar' | 'Casa 3D' | 'Entrar na casa' | 'Cores e formas'
  suggestion: string
}

export function saveComposition(pieces: CompositionPiece[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pieces }))
    return true
  } catch {
    return false
  }
}

export function loadComposition(): CompositionPiece[] | null {
  try {
    const savedValue = localStorage.getItem(STORAGE_KEY)
    if (!savedValue) return null
    const data: unknown = JSON.parse(savedValue)
    if (typeof data !== 'object' || data === null || !Array.isArray((data as { pieces?: unknown }).pieces)) return null
    const pieces = (data as { pieces: unknown[] }).pieces
    return pieces.every(isValidPiece) ? pieces : null
  } catch {
    return null
  }
}

function localId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function loadCreations(): SavedCreation[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(CREATIONS_KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is SavedCreation => {
      if (typeof item !== 'object' || item === null) return false
      const creation = item as Partial<SavedCreation>
      return typeof creation.id === 'string' && typeof creation.name === 'string'
        && typeof creation.savedAt === 'string' && creation.version === 1
        && Array.isArray(creation.pieces) && creation.pieces.every(isValidPiece)
    })
  } catch { return [] }
}

export function saveCreation(name: string, pieces: CompositionPiece[]): SavedCreation | null {
  const cleanName = name.trim().slice(0, 60)
  if (!cleanName) return null
  const creation: SavedCreation = { id: localId('creation'), name: cleanName, pieces: pieces.map((piece) => ({ ...piece })), savedAt: new Date().toISOString(), version: 1 }
  try {
    localStorage.setItem(CREATIONS_KEY, JSON.stringify([creation, ...loadCreations()]))
    return creation
  } catch { return null }
}

export function deleteCreation(id: string): boolean {
  try { localStorage.setItem(CREATIONS_KEY, JSON.stringify(loadCreations().filter((item) => item.id !== id))); return true }
  catch { return false }
}

export function loadEvaluations(): ExperienceEvaluation[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(EVALUATIONS_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is ExperienceEvaluation => typeof item === 'object' && item !== null && typeof (item as ExperienceEvaluation).id === 'string') : []
  } catch { return [] }
}

export function saveEvaluation(evaluation: Omit<ExperienceEvaluation, 'id' | 'submittedAt'>): boolean {
  try {
    const item: ExperienceEvaluation = { ...evaluation, id: localId('evaluation'), submittedAt: new Date().toISOString() }
    localStorage.setItem(EVALUATIONS_KEY, JSON.stringify([...loadEvaluations(), item]))
    return true
  } catch { return false }
}
