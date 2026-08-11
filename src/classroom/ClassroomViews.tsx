import { useMemo, useState, type FormEvent } from 'react'
import { deleteCreation, loadCreations, loadEvaluations, saveEvaluation, type ExperienceEvaluation, type SavedCreation } from '../game/storage'

type GalleryProps = { onBack: () => void; onOpen: (creation: SavedCreation, enterHouse: boolean) => void }

export function CreationsGallery({ onBack, onOpen }: GalleryProps) {
  const [creations, setCreations] = useState(loadCreations)
  function remove(creation: SavedCreation) {
    if (!window.confirm(`Excluir “${creation.name}”?`)) return
    if (deleteCreation(creation.id)) setCreations((items) => items.filter((item) => item.id !== creation.id))
  }
  return <ClassroomPage eyebrow="VERSÃO DE SALA 1.0" title="Minhas criações" onBack={onBack}>
    {creations.length === 0
      ? <div className="empty-state"><p>Você ainda não salvou nenhuma criação.</p><button className="primary-action" type="button" onClick={onBack}>Começar a criar</button></div>
      : <div className="creation-list">{creations.map((creation) => <article className="creation-card" key={creation.id}>
          <CompositionPreview creation={creation} />
          <div className="creation-card-info"><h2>{creation.name}</h2><time dateTime={creation.savedAt}>{formatDate(creation.savedAt)}</time><span>{creation.pieces.length} {creation.pieces.length === 1 ? 'peça' : 'peças'}</span></div>
          <div className="creation-actions"><button type="button" onClick={() => onOpen(creation, false)}>ABRIR</button><button type="button" onClick={() => onOpen(creation, true)}>ENTRAR NA CASA</button><button className="danger-action" type="button" onClick={() => remove(creation)}>EXCLUIR</button></div>
        </article>)}</div>}
  </ClassroomPage>
}

function CompositionPreview({ creation }: { creation: SavedCreation }) {
  return <div className="creation-preview" aria-hidden="true">{creation.pieces.map((piece) => <span key={piece.id} className={`color-${piece.color}`} style={{ gridColumn: `${piece.column + 1} / span ${piece.width}`, gridRow: `${piece.row + 1} / span ${piece.height}` }} />)}</div>
}

const threeAnswers = ['Sim', 'Mais ou menos', 'Não'] as const
const easeAnswers = ['Muito fácil', 'Fácil', 'Difícil'] as const
const favoriteAnswers = ['Montar', 'Casa 3D', 'Entrar na casa', 'Cores e formas'] as const
type EvaluationDraft = Omit<ExperienceEvaluation, 'id' | 'submittedAt'>
const initialEvaluation: EvaluationDraft = { compositionEase: 'Fácil', pieceMovement: 'Sim', houseEnjoyment: 'Sim', immersionEnjoyment: 'Sim', mobileSpeed: 'Sim', favoritePart: 'Montar', suggestion: '' }

export function EvaluationView({ onBack }: { onBack: () => void }) {
  const [answers, setAnswers] = useState(initialEvaluation)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)
  function submit(event: FormEvent) {
    event.preventDefault()
    const ok = saveEvaluation({ ...answers, suggestion: answers.suggestion.trim().slice(0, 280) })
    setSaved(ok); setError(!ok)
  }
  if (saved) return <ClassroomPage eyebrow="OBRIGADO!" title="Avaliação salva" onBack={onBack}><div className="empty-state"><p>Sua experiência vai ajudar a melhorar o projeto.</p><button className="primary-action" type="button" onClick={onBack}>Voltar ao projeto</button></div></ClassroomPage>
  return <ClassroomPage eyebrow="VERSÃO DE SALA 1.0" title="Avaliar experiência" onBack={onBack}>
    <form className="evaluation-form" onSubmit={submit}>
      <Question number={1} legend="Foi fácil montar sua composição?" options={easeAnswers} value={answers.compositionEase} onChange={(value) => setAnswers({ ...answers, compositionEase: value })} />
      <Question number={2} legend="Foi fácil movimentar as peças?" options={threeAnswers} value={answers.pieceMovement} onChange={(value) => setAnswers({ ...answers, pieceMovement: value })} />
      <Question number={3} legend="Você gostou de transformar sua composição em uma casa?" options={threeAnswers} value={answers.houseEnjoyment} onChange={(value) => setAnswers({ ...answers, houseEnjoyment: value })} />
      <Question number={4} legend="Você gostou de entrar dentro da sua criação?" options={threeAnswers} value={answers.immersionEnjoyment} onChange={(value) => setAnswers({ ...answers, immersionEnjoyment: value })} />
      <Question number={5} legend="O jogo ficou rápido no seu celular?" options={threeAnswers} value={answers.mobileSpeed} onChange={(value) => setAnswers({ ...answers, mobileSpeed: value })} />
      <Question number={6} legend="Qual parte você mais gostou?" options={favoriteAnswers} value={answers.favoritePart} onChange={(value) => setAnswers({ ...answers, favoritePart: value })} />
      <label className="text-question"><strong>7. O que você mudaria?</strong><span>Opcional — não escreva seu nome.</span><textarea maxLength={280} rows={3} value={answers.suggestion} onChange={(event) => setAnswers({ ...answers, suggestion: event.target.value })} /></label>
      {error && <p className="form-error" role="alert">Não foi possível salvar neste dispositivo.</p>}
      <button className="submit-evaluation" type="submit">ENVIAR AVALIAÇÃO</button>
    </form>
  </ClassroomPage>
}

function Question<T extends string>({ number, legend, options, value, onChange }: { number: number; legend: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return <fieldset className="evaluation-question"><legend>{number}. {legend}</legend><div>{options.map((option) => <label key={option}><input type="radio" name={`question-${number}`} checked={value === option} onChange={() => onChange(option)} /><span>{option}</span></label>)}</div></fieldset>
}

export function ResultsView({ onBack }: { onBack: () => void }) {
  const evaluations = useMemo(loadEvaluations, [])
  const questions: Array<[string, keyof Pick<ExperienceEvaluation, 'compositionEase' | 'pieceMovement' | 'houseEnjoyment' | 'immersionEnjoyment' | 'mobileSpeed' | 'favoritePart'>]> = [
    ['Facilidade para montar', 'compositionEase'], ['Movimentação das peças', 'pieceMovement'], ['Transformação em casa', 'houseEnjoyment'], ['Entrada na criação', 'immersionEnjoyment'], ['Rapidez no celular', 'mobileSpeed'], ['Parte favorita', 'favoritePart'],
  ]
  function exportResults() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), version: 'Sala 1.0', evaluations }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = `mondrian3d-resultados-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url)
  }
  return <ClassroomPage eyebrow="ÁREA DO PROFESSOR" title="Resultados do teste" onBack={onBack}>
    <div className="results-summary"><strong>{evaluations.length}</strong><span>{evaluations.length === 1 ? 'avaliação salva' : 'avaliações salvas'} neste dispositivo</span></div>
    {evaluations.length > 0 && <>
      <div className="results-list">{questions.map(([label, key]) => <section key={key}><h2>{label}</h2>{countAnswers(evaluations, key).map(([answer, count]) => <div className="result-row" key={answer}><span>{answer}</span><strong>{count}</strong></div>)}</section>)}</div>
      <section className="comments"><h2>Comentários</h2>{evaluations.filter((item) => item.suggestion).map((item) => <p key={item.id}>{item.suggestion}</p>)}{evaluations.every((item) => !item.suggestion) && <p>Nenhum comentário escrito.</p>}</section>
      <button className="export-action" type="button" onClick={exportResults}>EXPORTAR RESULTADOS (JSON)</button>
    </>}
  </ClassroomPage>
}

function countAnswers(evaluations: ExperienceEvaluation[], key: keyof ExperienceEvaluation) {
  const counts = new Map<string, number>()
  evaluations.forEach((item) => { const answer = String(item[key]); counts.set(answer, (counts.get(answer) ?? 0) + 1) })
  return [...counts.entries()]
}

function ClassroomPage({ eyebrow, title, onBack, children }: { eyebrow: string; title: string; onBack: () => void; children: React.ReactNode }) {
  return <main className="classroom-page"><header><button className="back-action" type="button" onClick={onBack}>← Voltar</button><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></header>{children}<footer>MONDRIAN3D · Versão de Sala 1.0</footer></main>
}

function formatDate(value: string) {
  try { return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) }
  catch { return value }
}
