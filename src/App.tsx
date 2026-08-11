import { lazy, Suspense, useRef, useState, type PointerEvent } from 'react'
import {
  canPlacePiece, COLOR_OPTIONS, GRID_COLUMNS, GRID_ROWS, PIECE_SIZES,
  type CompositionPiece, type GridCell, type PieceColor, type PieceSize,
} from './game/grid'
import { loadComposition, saveComposition, saveCreation, type SavedCreation } from './game/storage'
import { CreationsGallery, EvaluationView, ResultsView } from './classroom/ClassroomViews'
import './styles/app.css'

const HouseView = lazy(async () => ({ default: (await import('./house/HouseView')).HouseView }))

type DragState = {
  pieceId: number
  offsetColumn: number
  offsetRow: number
  candidate: GridCell
}

const initialHistory: CompositionPiece[][] = [[]]

function App() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [selectedCell, setSelectedCell] = useState<GridCell | null>(null)
  const [selectedSize, setSelectedSize] = useState<PieceSize>('1x1')
  const [selectedColor, setSelectedColor] = useState<PieceColor>('red')
  const [pieces, setPieces] = useState<CompositionPiece[]>([])
  const [selectedPieceId, setSelectedPieceId] = useState<number | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [history, setHistory] = useState<CompositionPiece[][]>(initialHistory)
  const [historyIndex, setHistoryIndex] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [view, setView] = useState<'composition' | 'house' | 'gallery' | 'evaluation' | 'results'>('composition')
  const [startImmersive, setStartImmersive] = useState(false)

  const selectedPiece = pieces.find((piece) => piece.id === selectedPieceId) ?? null
  const draggedPiece = drag ? pieces.find((piece) => piece.id === drag.pieceId) ?? null : null
  const activeSize = PIECE_SIZES[selectedSize]
  const placementIsValid = selectedCell !== null && canPlacePiece(selectedCell, selectedSize, pieces)
  const dragSize = draggedPiece ? sizeFromPiece(draggedPiece) : null
  const dragIsValid = drag !== null && draggedPiece !== null && dragSize !== null
    && canPlacePiece(drag.candidate, dragSize, pieces, draggedPiece.id)

  const defaultFeedback = drag
    ? dragIsValid ? 'Solte para mover a peça.' : 'Esta posição não é válida.'
    : selectedPiece
      ? 'Peça selecionada. Arraste, gire ou apague.'
      : selectedCell === null
        ? 'Toque em uma célula da grade para começar.'
        : placementIsValid
          ? 'Esta posição está livre. Você pode colocar a peça.'
          : 'Esta posição não está disponível. Escolha outra célula.'
  const feedback = notice ?? defaultFeedback
  const feedbackState = notice ? ' is-notice' : drag ? (dragIsValid ? ' is-valid' : ' is-invalid') : selectedPiece ? ' is-selected' : selectedCell ? (placementIsValid ? ' is-valid' : ' is-invalid') : ''

  function showNotice(message: string) {
    setNotice(message)
    window.setTimeout(() => setNotice(null), 2200)
  }

  function commitComposition(nextPieces: CompositionPiece[]) {
    setPieces(nextPieces)
    setHistory((currentHistory) => {
      const nextHistory = [...currentHistory.slice(0, historyIndex + 1), nextPieces]
      setHistoryIndex(nextHistory.length - 1)
      return nextHistory
    })
  }

  function placePiece() {
    if (!selectedCell || !placementIsValid) return
    commitComposition([...pieces, {
      id: Date.now(), column: selectedCell.column, row: selectedCell.row,
      width: activeSize.width, height: activeSize.height, color: selectedColor,
    }])
    setSelectedCell(null)
    showNotice('Peça colocada na grade.')
  }

  function selectCell(cell: GridCell) {
    setSelectedPieceId(null)
    setSelectedCell(cell)
  }

  function getPointerCandidate(event: PointerEvent<HTMLDivElement>, currentDrag: DragState): GridCell | null {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      column: Math.floor((event.clientX - rect.left) / (rect.width / GRID_COLUMNS)) - currentDrag.offsetColumn,
      row: Math.floor((event.clientY - rect.top) / (rect.height / GRID_ROWS)) - currentDrag.offsetRow,
    }
  }

  function startDrag(event: PointerEvent<HTMLDivElement>, piece: CompositionPiece) {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const cellWidth = rect.width / GRID_COLUMNS
    const cellHeight = rect.height / GRID_ROWS
    const offsetColumn = Math.max(0, Math.min(piece.width - 1, Math.floor((event.clientX - rect.left) / cellWidth) - piece.column))
    const offsetRow = Math.max(0, Math.min(piece.height - 1, Math.floor((event.clientY - rect.top) / cellHeight) - piece.row))
    setSelectedPieceId(piece.id)
    setSelectedCell(null)
    setDrag({ pieceId: piece.id, offsetColumn, offsetRow, candidate: { column: piece.column, row: piece.row } })
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const candidate = getPointerCandidate(event, drag)
    if (candidate) setDrag({ ...drag, candidate })
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag || !draggedPiece) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (dragIsValid && (drag.candidate.column !== draggedPiece.column || drag.candidate.row !== draggedPiece.row)) {
      commitComposition(pieces.map((piece) => piece.id === draggedPiece.id ? { ...piece, ...drag.candidate } : piece))
      showNotice('Peça movida.')
    } else if (!dragIsValid) {
      showNotice('A peça voltou para a posição anterior.')
    }
    setDrag(null)
  }

  function rotateSelectedPiece() {
    if (!selectedPiece) return
    const width = selectedPiece.height
    const height = selectedPiece.width
    const rotatedCell = {
      column: Math.min(selectedPiece.column, GRID_COLUMNS - width),
      row: Math.min(selectedPiece.row, GRID_ROWS - height),
    }
    const rotatedSize = sizeFromDimensions(width, height)
    if (!canPlacePiece(rotatedCell, rotatedSize, pieces, selectedPiece.id)) {
      showNotice('Não há espaço para girar esta peça aqui.')
      return
    }
    commitComposition(pieces.map((piece) => piece.id === selectedPiece.id ? { ...piece, ...rotatedCell, width, height } : piece))
    showNotice(width === height ? 'Esta peça já tem a mesma forma ao girar.' : 'Peça girada 90 graus.')
  }

  function deleteSelectedPiece() {
    if (!selectedPiece) return
    commitComposition(pieces.filter((piece) => piece.id !== selectedPiece.id))
    setSelectedPieceId(null)
    showNotice('Peça apagada.')
  }

  function clearComposition() {
    if (pieces.length === 0) return
    commitComposition([])
    setSelectedPieceId(null)
    setSelectedCell(null)
    showNotice('Composição limpa.')
  }

  function undo() {
    if (historyIndex === 0) return
    const nextIndex = historyIndex - 1
    setHistoryIndex(nextIndex)
    setPieces(history[nextIndex])
    setSelectedPieceId(null)
    setSelectedCell(null)
    showNotice('Última ação desfeita.')
  }

  function redo() {
    if (historyIndex >= history.length - 1) return
    const nextIndex = historyIndex + 1
    setHistoryIndex(nextIndex)
    setPieces(history[nextIndex])
    setSelectedPieceId(null)
    setSelectedCell(null)
    showNotice('Ação refeita.')
  }

  function saveCurrentComposition() {
    showNotice(saveComposition(pieces)
      ? 'Composição salva neste dispositivo.'
      : 'Não foi possível salvar neste navegador.')
  }

  function loadSavedComposition() {
    const savedPieces = loadComposition()
    if (!savedPieces) {
      showNotice('Nenhuma composição salva foi encontrada.')
      return
    }
    setPieces(savedPieces)
    setHistory([savedPieces])
    setHistoryIndex(0)
    setSelectedPieceId(null)
    setSelectedCell(null)
    showNotice('Composição carregada.')
  }

  function openCreation(creation: SavedCreation, enterHouse: boolean) {
    const restored = creation.pieces.map((piece) => ({ ...piece }))
    setPieces(restored)
    setHistory([restored])
    setHistoryIndex(0)
    setSelectedPieceId(null)
    setSelectedCell(null)
    setStartImmersive(enterHouse)
    setView(enterHouse ? 'house' : 'composition')
  }

  if (view === 'gallery') return <CreationsGallery onBack={() => setView('composition')} onOpen={openCreation} />
  if (view === 'evaluation') return <EvaluationView onBack={() => setView('house')} />
  if (view === 'results') return <ResultsView onBack={() => setView('composition')} />
  if (view === 'house') return <Suspense fallback={<main className="house-loading">Preparando sua casa...</main>}><HouseView pieces={pieces} startImmersive={startImmersive} onBack={() => { setStartImmersive(false); setView('composition') }} onSave={(name) => saveCreation(name, pieces) !== null} onEvaluate={() => { setStartImmersive(false); setView('evaluation') }} /></Suspense>

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="classroom-nav"><button type="button" onClick={() => setView('gallery')}>MINHAS CRIAÇÕES</button><button type="button" onClick={() => setView('results')}>RESULTADOS DO TESTE</button></div>
        <p className="eyebrow">EXPERIÊNCIA DE ARTE</p>
        <h1>Construindo<br />com Mondrian</h1>
        <p className="intro">Crie, observe e experimente formas, linhas, cores e equilíbrio visual.</p>
        <p className="classroom-message">Esta é uma versão experimental. Sua experiência vai ajudar a melhorar o projeto.</p>
      </header>

      <section className="builder" aria-labelledby="builder-title">
        <div className="builder-heading"><div><p className="step-label">FASE 3</p><h2 id="builder-title">Monte sua composição</h2></div><span className="piece-count">{pieces.length} {pieces.length === 1 ? 'peça' : 'peças'}</span></div>
        <div className="grid-frame">
          <div className="composition-grid" ref={gridRef} role="grid" aria-label="Grade de composição com 8 colunas e 8 linhas">
            {Array.from({ length: GRID_ROWS * GRID_COLUMNS }, (_, index) => {
              const column = index % GRID_COLUMNS; const row = Math.floor(index / GRID_COLUMNS)
              const isSelected = selectedCell?.column === column && selectedCell.row === row
              return <button key={`${column}-${row}`} type="button" className={`grid-cell${isSelected ? ' is-selected' : ''}`} aria-label={`Coluna ${column + 1}, linha ${row + 1}`} aria-pressed={isSelected} onClick={() => selectCell({ column, row })} />
            })}
            {selectedCell && <div className={`placement-preview color-${selectedColor}${placementIsValid ? ' is-valid' : ' is-invalid'}`} style={gridStyle(selectedCell, activeSize.width, activeSize.height)} aria-hidden="true" />}
            {drag && draggedPiece && <div className={`placement-preview drag-preview color-${draggedPiece.color}${dragIsValid ? ' is-valid' : ' is-invalid'}`} style={gridStyle(drag.candidate, draggedPiece.width, draggedPiece.height)} aria-hidden="true" />}
            {pieces.map((piece) => <div key={piece.id} className={`placed-piece color-${piece.color}${selectedPieceId === piece.id ? ' is-selected' : ''}${drag?.pieceId === piece.id ? ' is-dragging' : ''}`} style={gridStyle(piece, piece.width, piece.height)} role="button" tabIndex={0} aria-label={`Peça ${piece.width} por ${piece.height}. Toque para selecionar ou arraste para mover.`} onClick={() => setSelectedPieceId(piece.id)} onPointerDown={(event) => startDrag(event, piece)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} />)}
          </div>
        </div>

        <p className={`placement-feedback${feedbackState}`} role="status"><span aria-hidden="true" />{feedback}</p>
        <div className="controls" aria-label="Controles de criação">
          <fieldset className="control-group"><legend>1. Escolha o formato</legend><div className="size-options">{(Object.keys(PIECE_SIZES) as PieceSize[]).map((size) => <button key={size} type="button" className={`size-option${selectedSize === size ? ' is-active' : ''}`} aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)}><span className={`shape shape-${size}`} aria-hidden="true" />{PIECE_SIZES[size].label}</button>)}</div></fieldset>
          <fieldset className="control-group"><legend>2. Escolha a cor</legend><div className="color-options">{COLOR_OPTIONS.map((color) => <button key={color.id} type="button" className={`color-option color-${color.id}${selectedColor === color.id ? ' is-active' : ''}`} aria-label={`Cor ${color.label}`} aria-pressed={selectedColor === color.id} onClick={() => setSelectedColor(color.id)} />)}</div></fieldset>
          <div className="action-row"><button type="button" className="secondary-action" onClick={clearComposition} disabled={pieces.length === 0}>Limpar composição</button><button type="button" className="primary-action" onClick={placePiece} disabled={!placementIsValid}>Colocar peça <span aria-hidden="true">→</span></button></div>
          <div className="selected-actions"><button type="button" className="secondary-action" onClick={rotateSelectedPiece} disabled={!selectedPiece}>↻ Girar 90°</button><button type="button" className="delete-action" onClick={deleteSelectedPiece} disabled={!selectedPiece}>Apagar peça</button></div>
          <div className="history-actions"><button type="button" className="secondary-action" onClick={undo} disabled={historyIndex === 0}>↶ Desfazer</button><button type="button" className="secondary-action" onClick={redo} disabled={historyIndex >= history.length - 1}>↷ Refazer</button></div>
          <div className="storage-actions"><button type="button" className="secondary-action" onClick={saveCurrentComposition}>Salvar composição</button><button type="button" className="secondary-action" onClick={loadSavedComposition}>Carregar composição</button></div>
          <button type="button" className="next-action build-house-action" onClick={() => { setStartImmersive(false); setView('house') }}>Construir minha casa <span aria-hidden="true">→</span></button>
        </div>
      </section>
      <footer className="app-footer"><span>MONDRIAN3D · Versão de Sala 1.0</span><span className="touch-hint">Feito para toque</span></footer>
    </main>
  )
}

function sizeFromPiece(piece: CompositionPiece): PieceSize {
  return sizeFromDimensions(piece.width, piece.height)
}

function sizeFromDimensions(width: number, height: number): PieceSize {
  return `${width}x${height}` as PieceSize
}

function gridStyle(cell: GridCell, width: number, height: number) {
  return { gridColumn: `${cell.column + 1} / span ${width}`, gridRow: `${cell.row + 1} / span ${height}` }
}

export default App
