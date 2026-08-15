import { useState } from 'react'
import type { CompositionPiece } from '../game/grid'
import { HouseScene } from './HouseScene'
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, findFurniturePosition, furnitureDefinition, isFurniturePlacementValid, type FurnitureCategory, type FurnitureItem } from './furnitureCatalog'

type HouseViewProps = { pieces: CompositionPiece[]; onBack: () => void; onSave: (name: string) => boolean; onEvaluate: () => void; startImmersive?: boolean }

export function HouseView({ pieces, onBack, onSave, onEvaluate, startImmersive = false }: HouseViewProps) {
  const [resetToken, setResetToken] = useState(0)
  const [zoomRequest, setZoomRequest] = useState({ id: 0, amount: 0 })
  const [nudgeRequest, setNudgeRequest] = useState({ id: 0, screenX: 0, screenZ: 0 })
  const [immersive, setImmersive] = useState(startImmersive)
  const [insideView, setInsideView] = useState(false)
  const [plantView, setPlantView] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [furnitureCategory, setFurnitureCategory] = useState<FurnitureCategory>('Sala')
  const [furniture, setFurniture] = useState<FurnitureItem[]>([])
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<number | null>(null)
  const [showDemoFurniture, setShowDemoFurniture] = useState(true)
  const [confirmStartOver, setConfirmStartOver] = useState(false)
  const [furnitureNotice, setFurnitureNotice] = useState('Agora você é o arquiteto. Organize os espaços da Casa Mondrian.')
  const [showSave, setShowSave] = useState(false)
  const [creationName, setCreationName] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const zoom = (amount: number) => setZoomRequest((current) => ({ id: current.id + 1, amount }))
  const nudge = (screenX: number, screenZ: number) => setNudgeRequest((current) => ({ id: current.id + 1, screenX, screenZ }))
  const selectedFurniture = furniture.find((item) => item.id === selectedFurnitureId) ?? null

  function addFurniture(type: string) {
    const position = findFurniturePosition(type, furniture)
    if (!position) { setFurnitureNotice('Não há uma área livre para este móvel. Mova ou exclua outro item e tente novamente.'); return }
    const item: FurnitureItem = { id: Date.now() + furniture.length, type, ...position, rotation: 0 }
    setFurniture((current) => [...current, item]); setSelectedFurnitureId(item.id); setFurnitureNotice(`${furnitureDefinition(type)?.name ?? 'Móvel'} adicionado. Arraste para posicionar.`)
  }

  function updateFurniture(id: number, changes: Partial<FurnitureItem>) {
    setFurniture((current) => current.map((item) => item.id === id ? { ...item, ...changes } : item))
  }

  function rotateFurniture() {
    if (!selectedFurniture) return
    const rotated = { ...selectedFurniture, rotation: selectedFurniture.rotation + Math.PI / 2 }
    if (!isFurniturePlacementValid(rotated, furniture)) { setFurnitureNotice('Não há espaço para girar o móvel nesta posição.'); return }
    updateFurniture(rotated.id, { rotation: rotated.rotation }); setFurnitureNotice('Móvel girado 90 graus.')
  }

  function duplicateFurniture() {
    if (!selectedFurniture) return
    const position = findFurniturePosition(selectedFurniture.type, furniture, selectedFurniture.rotation)
    if (!position) { setFurnitureNotice('Não há uma área livre para duplicar este móvel.'); return }
    const copy = { ...selectedFurniture, id: Date.now() + furniture.length, ...position }
    setFurniture((current) => [...current, copy]); setSelectedFurnitureId(copy.id); setFurnitureNotice('Móvel duplicado.')
  }

  function deleteFurniture() {
    if (selectedFurnitureId === null) return
    setFurniture((current) => current.filter((item) => item.id !== selectedFurnitureId)); setSelectedFurnitureId(null); setFurnitureNotice('Móvel excluído.')
  }

  function startFromZero() {
    setShowDemoFurniture(false); setFurniture([]); setSelectedFurnitureId(null); setConfirmStartOver(false); setFurnitureNotice('Agora você é o arquiteto. Escolha os móveis e organize os espaços da Casa Mondrian.')
  }

  function restoreFurnishedHouse() {
    setShowDemoFurniture(true); setFurniture([]); setSelectedFurnitureId(null); setFurnitureNotice('Casa demonstrativa mobiliada restaurada nas posições originais.')
  }

  return <main className={`house-page${immersive ? ' is-immersive' : ''}`}>
    {!immersive && <header className="house-header">
      <button type="button" className="back-action" onClick={onBack}>← Voltar para composição</button>
      <p className="eyebrow">SUA CASA 3D</p>
      <h1>Da composição<br />para o espaço</h1>
    </header>}
    <section className="house-stage" aria-labelledby="house-message-title">
      <div className="house-message"><h2 id="house-message-title">{immersive ? 'Você está dentro da sua criação.' : 'Você transformou sua composição em uma casa.'}</h2><p>{immersive ? 'Caminhe entre formas, linhas e cores. Arraste sobre a imagem para olhar ao redor.' : 'Observe como formas, cores e espaços podem construir uma ideia de arquitetura.'}</p></div>
      <HouseScene pieces={pieces} resetToken={resetToken} zoomRequest={zoomRequest} nudgeRequest={nudgeRequest} immersive={immersive} insideView={insideView} plantView={plantView} showDemoFurniture={showDemoFurniture} furniture={furniture} selectedFurnitureId={selectedFurnitureId} onSelectFurniture={setSelectedFurnitureId} onMoveFurniture={(id, x, z) => updateFurniture(id, { x, z })} />
      {!immersive && <div className="scene-controls" aria-label="Controles da casa 3D"><button type="button" onClick={() => zoom(-.8)} aria-label="Aproximar">＋ Aproximar</button><button type="button" onClick={() => zoom(.8)} aria-label="Afastar">－ Afastar</button><button type="button" onClick={() => { setPlantView(false); setResetToken((value) => value + 1) }}>↺ Visão inicial</button><button type="button" className={`inside-view-action${insideView ? ' is-active' : ''}`} aria-pressed={insideView} onClick={() => { setPlantView(false); setInsideView((value) => !value) }}>⌂ {insideView ? 'Ver com teto' : 'Ver por dentro'}</button>{insideView && <button type="button" className={`plant-view-action${plantView ? ' is-active' : ''}`} aria-pressed={plantView} onClick={() => setPlantView((value) => !value)}>{plantView ? '↙ Voltar ao 3D' : '▣ Vista de planta'}</button>}</div>}
      {plantView && <section className={`furniture-library${libraryOpen ? ' is-open' : ''}`} aria-label="Biblioteca de mobiliário">
        <button type="button" className="library-toggle" aria-expanded={libraryOpen} onClick={() => setLibraryOpen((value) => !value)}>▦ {libraryOpen ? 'Fechar biblioteca' : 'Biblioteca'}</button>
        <div className="furniture-mode-actions"><button type="button" onClick={() => setConfirmStartOver(true)}>⌂ Começar do zero</button><button type="button" onClick={restoreFurnishedHouse}>↺ Restaurar casa mobiliada</button></div>
        {libraryOpen && <div className="library-panel">
          <div className="library-heading"><div><strong>Biblioteca de mobiliário</strong><span>Escolha um item para inserir na planta.</span></div><button type="button" aria-label="Fechar biblioteca" onClick={() => setLibraryOpen(false)}>×</button></div>
          <div className="furniture-categories" role="tablist" aria-label="Categorias">{FURNITURE_CATEGORIES.map((category) => <button type="button" role="tab" aria-selected={furnitureCategory === category} className={furnitureCategory === category ? 'is-active' : ''} key={category} onClick={() => setFurnitureCategory(category)}>{category}</button>)}</div>
          <div className="furniture-items">{FURNITURE_CATALOG.filter((item) => item.category === furnitureCategory).map((item) => <button type="button" key={item.type} onClick={() => addFurniture(item.type)}><span aria-hidden="true">{item.icon}</span>{item.name}</button>)}</div>
        </div>}
        <p className="furniture-notice" role="status">{furnitureNotice}</p>
        {selectedFurniture && <div className="selected-furniture-controls"><p>Selecionado: <strong>{furnitureDefinition(selectedFurniture.type)?.name ?? 'Móvel'}</strong></p><div className="furniture-dpad" aria-label="Ajuste fino da posição"><button type="button" className="move-up" aria-label="Mover para cima" onClick={() => nudge(0, -.2)}>↑</button><button type="button" className="move-left" aria-label="Mover para esquerda" onClick={() => nudge(-.2, 0)}>←</button><button type="button" className="move-down" aria-label="Mover para baixo" onClick={() => nudge(0, .2)}>↓</button><button type="button" className="move-right" aria-label="Mover para direita" onClick={() => nudge(.2, 0)}>→</button></div></div>}
        <div className="furniture-actions" aria-label="Ações do móvel selecionado"><button type="button" disabled={!selectedFurniture} onClick={rotateFurniture}>↻ Girar 90°</button><button type="button" disabled={!selectedFurniture} onClick={duplicateFurniture}>⧉ Duplicar</button><button type="button" className="delete-furniture" disabled={!selectedFurniture} onClick={deleteFurniture}>⌫ Excluir</button>{furniture.length > 0 && <button type="button" className="clear-furniture" onClick={() => { if (window.confirm('Remover toda a mobília adicionada por você?')) { setFurniture([]); setSelectedFurnitureId(null); setFurnitureNotice('Mobília adicionada removida.') } }}>Limpar mobília adicionada</button>}</div>
      </section>}
      {!immersive && <button type="button" className="enter-house-action" onClick={() => setImmersive(true)}>ENTRAR NA MINHA CRIAÇÃO <span aria-hidden="true">→</span></button>}
      {immersive && <button type="button" className="exit-house-action" onClick={() => setImmersive(false)}>SAIR DA CASA</button>}
      <p className="drag-instruction">{immersive ? 'Computador: WASD ou setas. Celular: botões para caminhar e virar; arraste para olhar.' : plantView ? 'Vista superior fixa. Use Aproximar e Afastar para ajustar a planta.' : 'Arraste a casa para os lados para observá-la.'}</p>
      {!immersive && <div className="classroom-house-actions"><button type="button" onClick={() => { setShowSave(true); setSaveStatus('idle') }}>SALVAR MINHA CRIAÇÃO</button><button type="button" onClick={onEvaluate}>AVALIAR EXPERIÊNCIA</button></div>}
    </section>
    {showSave && <div className="save-dialog-backdrop" role="presentation"><form className="save-dialog" onSubmit={(event) => { event.preventDefault(); const saved = onSave(creationName); setSaveStatus(saved ? 'saved' : 'error'); if (saved) setCreationName('') }}>
      <h2>Dê um nome para sua criação</h2><label><span>Exemplo: Minha Casa Mondrian</span><input autoFocus required maxLength={60} value={creationName} onChange={(event) => setCreationName(event.target.value)} /></label>
      {saveStatus === 'saved' && <p className="save-success" role="status">Criação salva!</p>}{saveStatus === 'error' && <p className="form-error" role="alert">Não foi possível salvar neste dispositivo.</p>}
      <div><button type="button" onClick={() => setShowSave(false)}>FECHAR</button><button type="submit">SALVAR</button></div>
    </form></div>}
    {confirmStartOver && <div className="save-dialog-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) setConfirmStartOver(false) }}><div className="save-dialog start-over-dialog" role="dialog" aria-modal="true" aria-labelledby="start-over-title">
      <h2 id="start-over-title">Deseja deixar a Casa Mondrian vazia para começar sua própria composição?</h2>
      <p>Os móveis demonstrativos e os móveis adicionados por você serão removidos. A arquitetura será preservada.</p>
      <div><button type="button" onClick={() => setConfirmStartOver(false)}>Cancelar</button><button type="button" onClick={startFromZero}>Começar do zero</button></div>
    </div></div>}
  </main>
}
