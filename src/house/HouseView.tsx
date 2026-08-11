import { useState } from 'react'
import type { CompositionPiece } from '../game/grid'
import { HouseScene } from './HouseScene'

type HouseViewProps = { pieces: CompositionPiece[]; onBack: () => void; onSave: (name: string) => boolean; onEvaluate: () => void; startImmersive?: boolean }

export function HouseView({ pieces, onBack, onSave, onEvaluate, startImmersive = false }: HouseViewProps) {
  const [resetToken, setResetToken] = useState(0)
  const [zoomRequest, setZoomRequest] = useState({ id: 0, amount: 0 })
  const [immersive, setImmersive] = useState(startImmersive)
  const [showSave, setShowSave] = useState(false)
  const [creationName, setCreationName] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const zoom = (amount: number) => setZoomRequest((current) => ({ id: current.id + 1, amount }))

  return <main className={`house-page${immersive ? ' is-immersive' : ''}`}>
    {!immersive && <header className="house-header">
      <button type="button" className="back-action" onClick={onBack}>← Voltar para composição</button>
      <p className="eyebrow">SUA CASA 3D</p>
      <h1>Da composição<br />para o espaço</h1>
    </header>}
    <section className="house-stage" aria-labelledby="house-message-title">
      <div className="house-message"><h2 id="house-message-title">{immersive ? 'Você está dentro da sua criação.' : 'Você transformou sua composição em uma casa.'}</h2><p>{immersive ? 'Caminhe entre formas, linhas e cores. Arraste sobre a imagem para olhar ao redor.' : 'Observe como formas, cores e espaços podem construir uma ideia de arquitetura.'}</p></div>
      <HouseScene pieces={pieces} resetToken={resetToken} zoomRequest={zoomRequest} immersive={immersive} />
      {!immersive && <div className="scene-controls" aria-label="Controles da casa 3D"><button type="button" onClick={() => zoom(-.8)} aria-label="Aproximar">＋ Aproximar</button><button type="button" onClick={() => zoom(.8)} aria-label="Afastar">－ Afastar</button><button type="button" onClick={() => setResetToken((value) => value + 1)}>↺ Visão inicial</button></div>}
      {!immersive && <button type="button" className="enter-house-action" onClick={() => setImmersive(true)}>ENTRAR NA MINHA CRIAÇÃO <span aria-hidden="true">→</span></button>}
      {immersive && <button type="button" className="exit-house-action" onClick={() => setImmersive(false)}>SAIR DA CASA</button>}
      <p className="drag-instruction">{immersive ? 'Computador: WASD ou setas. Celular: botões para caminhar e virar; arraste para olhar.' : 'Arraste a casa para os lados para observá-la.'}</p>
      {!immersive && <div className="classroom-house-actions"><button type="button" onClick={() => { setShowSave(true); setSaveStatus('idle') }}>SALVAR MINHA CRIAÇÃO</button><button type="button" onClick={onEvaluate}>AVALIAR EXPERIÊNCIA</button></div>}
    </section>
    {showSave && <div className="save-dialog-backdrop" role="presentation"><form className="save-dialog" onSubmit={(event) => { event.preventDefault(); const saved = onSave(creationName); setSaveStatus(saved ? 'saved' : 'error'); if (saved) setCreationName('') }}>
      <h2>Dê um nome para sua criação</h2><label><span>Exemplo: Minha Casa Mondrian</span><input autoFocus required maxLength={60} value={creationName} onChange={(event) => setCreationName(event.target.value)} /></label>
      {saveStatus === 'saved' && <p className="save-success" role="status">Criação salva!</p>}{saveStatus === 'error' && <p className="form-error" role="alert">Não foi possível salvar neste dispositivo.</p>}
      <div><button type="button" onClick={() => setShowSave(false)}>FECHAR</button><button type="submit">SALVAR</button></div>
    </form></div>}
  </main>
}
