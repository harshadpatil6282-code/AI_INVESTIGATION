import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Route, Routes, useNavigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { create } from 'zustand'
import './styles.css'

type Suspect = {
  id: string
  name: string
  role: string
  summary: string
  personality: string
  background: string
  relationship: string
  interrogation: string
}

type EvidenceItem = {
  id: string
  type: string
  title: string
  time: string
  source: string
  integrity: string
  tags: string[]
  people: string[]
  location: string
  copy: string
  note: string
  score: number
}

type Theory = { title: string; explanation: string; strength: string }
type TimelineEvent = { time: string; title: string; note: string }

type InvestigationCase = {
  id: string
  title: string
  scene: string
  summary: string
  genre: string
  difficulty: string
  fictionalNotice: string
  culpritId: string
  motive: string
  suspects: Suspect[]
  evidence: EvidenceItem[]
  theories: Theory[]
  timeline: TimelineEvent[]
  hints: string[]
}

type Store = { marked: string[]; toggle: (name: string) => void }

const STORAGE_KEY = 'ai-mystery-room-active-case'
const defaultSeed = 'A renowned archivist collapses during a private gallery opening after a rare map disappears from the locked archive room.'

const useCase = create<Store>((set) => ({
  marked: [],
  toggle: (name) =>
    set((state) => ({
      marked: state.marked.includes(name) ? state.marked.filter((entry) => entry !== name) : [...state.marked, name],
    })),
}))

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function buildCaseFromSeed(seedText: string, difficulty: string, genre: string): InvestigationCase {
  const cleaned = seedText.trim() || defaultSeed
  const words = cleaned.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)
  const anchor = words.slice(0, 3).join(' ') || 'midnight ledger'
  const title = `${anchor.split(' ').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Investigation`

  const suspects: Suspect[] = [
    { id: 'suspect-1', name: 'Evelyn Cross', role: 'Museum curator', summary: 'She controls access to the archive and keeps the guest ledger orderly.', personality: 'Measured and precise.', background: 'Worked for fifteen years in the gallery and inherited the archive trust network after a family dispute.', relationship: 'Former mentor to the victim after a bitter succession argument.', interrogation: 'She says the archive door was locked before the event, but her timeline is not precise enough to survive cross-checking.' },
    { id: 'suspect-2', name: 'Marcus Vale', role: 'Restoration specialist', summary: 'He knows how to open sealed cabinets and is expert with old mechanisms.', personality: 'Quiet, meticulous, and fiercely proud of his craftsmanship.', background: 'Previously employed by the foundation to restore archive cabinets and still keeps spare brass keys from old repairs.', relationship: 'Claimed a professional rivalry with the victim over a damaged restoration contract.', interrogation: 'He insists the lockwork was too delicate for a hurried theft, yet he keeps circling the same timeline gap at 21:47.' },
    { id: 'suspect-3', name: 'Nadia Brooks', role: 'Investigative journalist', summary: 'She was chasing a story on the victim’s last donation and had access to private records.', personality: 'Sharp, confrontational, and fluent in manipulation.', background: 'Has a reputation for exposing power and pressure through anonymous leaks.', relationship: 'The victim threatened to expose a hidden sale connected to the foundation and Nadia had been pressing for comment.', interrogation: 'She says she was asking questions in the foyer, but her phone chronology places her near the archive at the exact time of the missing map.' },
    { id: 'suspect-4', name: 'Dorian Holt', role: 'Private security lead', summary: 'He controlled patrol routes and the visitor badge system after the event resumed.', personality: 'Professional to a fault and deeply private.', background: 'Served in asset protection for a city archive before joining the museum.', relationship: 'He was one of the few with access to both the archive and the maintenance stairwell after the alarm failed.', interrogation: 'He maintains the badge log was secure, yet he left his own override record unlogged after the final power fluctuation.' },
  ]

  const culpritId = 'suspect-2'
  const culpritName = suspects.find((suspect) => suspect.id === culpritId)?.name ?? 'Marcus Vale'
  const motive = 'Marcus needed a final payment on a restoration debt and believed the archive map would unlock a hidden inheritance claim connected to the victim’s donations.'

  const evidence: EvidenceItem[] = [
    { id: 'E-01', type: 'WHATSAPP · CHAT LOG', title: 'Message thread: private channel', time: '21:34', source: 'Victim handset', integrity: 'Verified', tags: ['chat', 'digital', 'timing'], people: ['Victim', culpritName, 'Nadia Brooks'], location: 'Archive corridor', copy: 'A short message chain shows the victim warning someone not to touch the map case. The final message contains an explicit threat tied to a debt ledger.', note: 'The wording is unguarded and suggests the victim was facing a financial or reputational collapse before the incident.', score: 92 },
    { id: 'E-02', type: 'CCTV · 4 FRAMES', title: 'Archive camera: west stairwell', time: '21:47', source: 'Security archive', integrity: 'Hash verified', tags: ['video', 'timeline', 'stairwell'], people: [culpritName], location: 'West stairwell', copy: 'Four frames expose a figure moving against the expected foot traffic pattern. The figure carries a wrapped object and avoids the central camera coverage.', note: 'This is the strongest physical lead. The movement does not match the museum’s public route and places a suspect near the locked archive door.', score: 94 },
    { id: 'E-03', type: 'FORENSICS', title: 'Brass dust and resin trace', time: '22:03', source: 'Archive lock', integrity: 'Sealed', tags: ['physical', 'trace', 'forensics'], people: [culpritName, 'Evelyn Cross'], location: 'Archive room', copy: 'A thin layer of brass filings and restoration resin confirms the use of a specialist tool set, not a generic crowbar or ordinary key.', note: 'The residue pattern corresponds to conservator-grade repair work used in restoration shops and only a few people in the building had access to it.', score: 91 },
    { id: 'E-04', type: 'CALL LOG', title: 'Call ledger, 21:39–21:56', time: '21:56', source: 'Victim phone metadata', integrity: 'Verified', tags: ['call log', 'metadata', 'timeline'], people: [culpritName, 'Dorian Holt'], location: 'Museum lobby', copy: 'A brief sequence of calls and dropped connections matches the same small window in which the archive is recorded as active.', note: 'The contact pattern reveals a coordinated attempt to stall or steer attention away from the archive at the exact moment the map was removed.', score: 88 },
    { id: 'E-05', type: 'PHOTO · CRIME SCENE', title: 'Archive desk close-up', time: '22:11', source: 'Scene photograph', integrity: 'Evidence kit', tags: ['image', 'photo', 'scene'], people: ['Victim', culpritName], location: 'Archive desk', copy: 'The image captures scorched dust and a disturbed writing tray. A small stain trails toward the service passage, suggesting a hasty move after the theft.', note: 'The placement of the photograph suggests a rushed handoff, not a panic-driven escape route.', score: 85 },
    { id: 'E-06', type: 'DOCUMENT', title: 'Foundation ledger excerpt', time: '20:18', source: 'Foundation archive', integrity: 'Recorded', tags: ['document', 'financial', 'record'], people: ['Victim', culpritName], location: 'Foundation office', copy: 'A ledger page shows a pending restoration payment matched against a mysterious claimant tied to a private inheritance route.', note: 'The victim’s notes indicate a private transfer was being prepared to conceal an unsigned settlement, which fits a motive built around debt and leverage.', score: 83 },
    { id: 'E-07', type: 'WITNESS STATEMENT', title: 'Witness interview: service hall', time: '22:14', source: 'Witness intake', integrity: 'Unverified', tags: ['witness', 'statement', 'contradiction'], people: ['Dorian Holt', 'Evelyn Cross'], location: 'Service hall', copy: 'A witness says they heard a metallic click and the hiss of a quick cabinet closure before the alarm returned to normal.', note: 'The testimony is useful, but it is also the kind of detail that can be intentionally repeated by someone with a story to protect.', score: 72 },
    { id: 'E-08', type: 'HIDDEN CLUE', title: 'Map case margin note', time: '21:52', source: 'Archive evidence tray', integrity: 'Protected', tags: ['hidden', 'clue', 'annotation'], people: [culpritName], location: 'Map case drawer', copy: 'A handwritten annotation in the margin of an old exhibit card reads: “If the past is sealed, do not trust the repairman with a key.”', note: 'This clue is genuine fiction for play and should only be used as a lead, not a rule of evidence.', score: 90 },
  ]

  const timeline: TimelineEvent[] = [
    { time: '20:15', title: 'Doors open to guests', note: 'The event begins and private access to the archive is restricted to staff and invited patrons.' },
    { time: '21:34', title: 'Private warning sent', note: 'The victim sends a message about the archive map and warns a contact not to handle it without supervision.' },
    { time: '21:47', title: 'Archive signal loss', note: 'The archive system briefly drops off-grid, matching the intervention route later identified in the CCTV frames.' },
    { time: '21:56', title: 'Call interruption pattern', note: 'A short burst of calls and failed connections overlaps with the object movement near the stairwell.' },
    { time: '22:11', title: 'Scene discovered', note: 'The map is missing and the victim is found in distress at the archive desk, forcing a full lock-down.' },
  ]

  const theories: Theory[] = [
    { title: 'The debt-linked theft', explanation: 'The victim discovered a hidden financial scheme and the culprit moved to silence a threat before the ledger surfaced.', strength: 'High confidence' },
    { title: 'The professional deflection', explanation: 'A different suspect used procedural confusion to redirect investigation toward a public-facing narrative and away from the archive route.', strength: 'Medium confidence' },
    { title: 'The inherited secret', explanation: 'The map and the donor records were connected to a private inheritance claim, which made the archive itself the real target.', strength: 'Emerging theory' },
  ]

  return {
    id: slugify(title) + '-' + Date.now(),
    title,
    scene: 'Museum archive wing, 22:13',
    summary: cleaned,
    genre,
    difficulty,
    fictionalNotice: 'This investigation file is a fictional simulation created for narrative play and training. It is not a genuine police record or forensic result.',
    culpritId,
    motive,
    suspects,
    evidence,
    theories,
    timeline,
    hints: [
      'The archive route and the west stairwell are the only places that explain the timing drift.',
      'A specialist tool leaves a distinctive brass trace and drifts away from the public-facing story.',
      'The strongest contradiction is between the call log and the official access record.',
    ],
  }
}

function readCaseFromStorage(): InvestigationCase {
  if (typeof window === 'undefined') return buildCaseFromSeed(defaultSeed, 'Medium', 'Classic whodunit')
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const fallback = buildCaseFromSeed(defaultSeed, 'Medium', 'Classic whodunit')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }

  try { return JSON.parse(raw) as InvestigationCase } catch {
    const fallback = buildCaseFromSeed(defaultSeed, 'Medium', 'Classic whodunit')
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    return fallback
  }
}

function saveCaseToStorage(next: InvestigationCase) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function Header() {
  return (
    <header>
      <Link to="/" className="brand"><span>◆</span> THE MYSTERY ROOM</Link>
      <nav>
        <Link to="/">CASE FILES</Link>
        <Link to="/new">NEW INVESTIGATION</Link>
        <button aria-label="Profile" className="profile">H</button>
      </nav>
    </header>
  )
}

function Landing() {
  return (
    <main className="landing">
      <section className="hero">
        <p className="eyebrow">A PRIVATE INVESTIGATION SERVICE</p>
        <h1>Every silence<br /><i>leaves a trace.</i></h1>
        <p className="lede">Enter an intelligence room where every witness, call log, object, and contradiction can be challenged. Build a fictional case from raw narrative and investigate it as the lead detective.</p>
        <Link className="brass-button" to="/new">Open a case <b>→</b></Link>
        <div className="case-meta"><span>◉ LIVE CASEWORK</span><span>EST. 2026</span><span>FICTIONAL SIMULATION</span></div>
      </section>
      <aside className="hero-dossier">
        <div className="dossier-head">CONFIDENTIAL <span>CASE FILE</span></div>
        <div className="scene"><div className="lamp" /><div className="scene-caption">THE ARCHIVE<br />ROOM, 22:13</div></div>
        <div className="dossier-foot"><span>STATUS</span><strong>ACTIVE</strong><span className="dot" /></div>
      </aside>
    </main>
  )
}

function NewCase() {
  const nav = useNavigate()
  const [difficulty, setDifficulty] = useState('Medium')
  const [genre, setGenre] = useState('Classic whodunit')
  const [seedText, setSeedText] = useState(defaultSeed)

  return (
    <main className="form-page">
      <Link to="/" className="back">← Return to case files</Link>
      <div className="form-heading">
        <p className="eyebrow">COMMISSION A NEW CASE</p>
        <h1>What happened?</h1>
        <p>Give the system a scenario, historical incident, or crime story. It will build a full, fictional case package.</p>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); const generated = buildCaseFromSeed(seedText, difficulty, genre); saveCaseToStorage(generated); nav('/generating') }}>
        <label>Case premise<textarea required value={seedText} onChange={(event) => setSeedText(event.target.value)} /></label>
        <div className="form-row">
          <fieldset>
            <legend>Difficulty</legend>
            <div className="choices">
              {['Easy', 'Medium', 'Hard'].map((value) => (
                <button type="button" onClick={() => setDifficulty(value)} className={difficulty === value ? 'selected' : ''} key={value}>
                  <b>{value}</b>
                  <small>{value === 'Easy' ? 'A clearer trail' : value === 'Medium' ? 'A careful investigation' : 'More shadows, fewer answers'}</small>
                </button>
              ))}
            </div>
          </fieldset>
          <label>Genre<select value={genre} onChange={(event) => setGenre(event.target.value)}>
            <option>Classic whodunit</option>
            <option>Modern noir</option>
            <option>Historical mystery</option>
            <option>Political conspiracy</option>
            <option>Coastal thriller</option>
          </select></label>
        </div>
        <button className="brass-button submit">Build the case <b>→</b></button>
      </form>
    </main>
  )
}

function Generating() {
  const nav = useNavigate()
  const [step, setStep] = useState(2)

  useEffect(() => {
    let index = 2
    const timer = window.setInterval(() => {
      index += 1
      setStep(index)
      if (index >= 6) {
        window.clearInterval(timer)
        window.setTimeout(() => nav('/case'), 650)
      }
    }, 700)
    return () => window.clearInterval(timer)
  }, [nav])

  const phases = ['Reading the scenario', 'Creating suspects and motives', 'Building physical and digital evidence', 'Mapping contradictions and theories', 'Sealing the fictional case file']

  return (
    <main className="generating">
      <p className="eyebrow">CASE FILE IN PREPARATION</p>
      <h1>Assembling the<br /><i>evidence room.</i></h1>
      <div className="timeline">
        {phases.map((phase, index) => (
          <div className={index < step ? 'done' : index === step ? 'active' : ''} key={phase}>
            <span>{index < step ? '✓' : String(index + 1).padStart(2, '0')}</span>
            <p>{phase}<small>{index === step ? 'Working from the record.' : index < step ? 'Filed and cross-referenced.' : ''}</small></p>
          </div>
        ))}
      </div>
    </main>
  )
}

function ToolSummary({ caseData }: { caseData: InvestigationCase }) {
  const cards = [
    { label: 'Suspects', value: String(caseData.suspects.length), nuance: 'All under review' },
    { label: 'Evidence', value: String(caseData.evidence.length), nuance: 'Recorded and filed' },
    { label: 'Timeline', value: String(caseData.timeline.length), nuance: 'Cross-referenced events' },
    { label: 'Theories', value: String(caseData.theories.length), nuance: 'Competing hypotheses' },
  ]

  return (
    <div className="overview-grid">
      {cards.map((card) => (
        <article key={card.label} className="metric-card"><span>{card.label}</span><strong>{card.value}</strong><small>{card.nuance}</small></article>
      ))}
      <article className="lead-card wide">
        <div className="section-title small-title"><span>Priority leads</span><small>ACTIVE</small></div>
        <ul>{caseData.theories.map((theory) => <li key={theory.title}>{theory.title}</li>)}</ul>
      </article>
    </div>
  )
}

function EvidenceGrid({ caseData, onFocus }: { caseData: InvestigationCase; onFocus: (entry: EvidenceItem) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')

  const filtered = useMemo(
    () => caseData.evidence.filter((item) => (filter === 'ALL' || item.type.startsWith(filter)) && `${item.id} ${item.title} ${item.type} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())),
    [caseData.evidence, filter, query],
  )

  return (
    <div className="tool-content evidence-grid">
      <div className="tool-controls">
        <label className="search"><span>⌕</span><input aria-label="Search evidence" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search evidence, tags, identifiers" /></label>
        <select aria-label="Filter evidence type" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="ALL">All records</option><option value="WHATSAPP">Chat logs</option><option value="CCTV">CCTV</option><option value="FORENSICS">Forensics</option><option value="DOCUMENT">Documents</option><option value="PHOTO">Photos</option><option value="CALL">Call logs</option>
        </select>
      </div>
      <div className="evidence-table">
        <div className="table-row table-label"><span>RECORD</span><span>CLASSIFICATION</span><span>ACQUIRED</span><span>INTEGRITY</span></div>
        {filtered.map((item) => (
          <button className="table-row" key={item.id} onClick={() => onFocus(item)}>
            <span><b>{item.id}</b><small>{item.title}</small></span>
            <span className="tag">{item.type.split(' ·')[0]}</span>
            <span>{item.time}</span>
            <span>{item.integrity}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function TimelinePanel({ caseData }: { caseData: InvestigationCase }) {
  return (
    <div className="tool-content timeline-panel">
      {caseData.timeline.map((entry) => (
        <div className="timeline-entry" key={`${entry.time}-${entry.title}`}>
          <span className="time-stamp">{entry.time}</span>
          <div className="timeline-line" />
          <div className="timeline-card"><strong>{entry.title}</strong><p>{entry.note}</p></div>
        </div>
      ))}
    </div>
  )
}

function RelationshipPanel({ caseData, onFocus }: { caseData: InvestigationCase; onFocus: (entry: EvidenceItem) => void }) {
  const nodes = [
    ...caseData.suspects.map((suspect, index) => ({ type: 'person', name: suspect.name, x: 18 + (index * 18) % 62, y: 18 + (index % 3) * 22 })),
    { type: 'location', name: 'Archive room', x: 72, y: 70 },
    { type: 'location', name: 'Service stair', x: 32, y: 74 },
    ...caseData.evidence.slice(0, 3).map((item, index) => ({ type: 'evidence', name: item.id, x: 48 + index * 10, y: 54 + index * 13 })),
  ]

  return (
    <div className="tool-content link-analysis">
      <div className="link-canvas" aria-label="Relationship map of people, locations and evidence">
        {nodes.map((node) => (
          <button key={node.name} className={`node ${node.type}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} onClick={() => { const item = caseData.evidence.find((entry) => entry.id === node.name); if (item) onFocus(item) }}>
            <small>{node.type}</small>{node.name}
          </button>
        ))}
        <span className="connector c1" /><span className="connector c2" /><span className="connector c3" /><span className="connector c4" />
      </div>
      <aside className="link-key">
        <b>{nodes.length} entities</b>
        <p>Relationship strength reflects shared source, location, or reference. Links are active leads, not conclusions.</p>
        <span><i className="key person" /> Person</span>
        <span><i className="key location" /> Location</span>
        <span><i className="key evidence" /> Evidence</span>
      </aside>
    </div>
  )
}

function Ledger({ caseData }: { caseData: InvestigationCase }) {
  return (
    <div className="tool-content ledger">
      <p className="ledger-intro">Each entry remains read-only after logging. Integrity states describe handling of the visible case record.</p>
      {caseData.evidence.map((item) => (
        <div className="ledger-entry" key={item.id}>
          <span className="ledger-time">{item.time}<small>LOCAL</small></span>
          <span className="ledger-line" />
          <div><b>{item.id} · {item.title}</b><p>Collected from {item.source}; logged by Investigator H.<em className={item.integrity.toLowerCase().replace(/\s+/g, '-')}>● {item.integrity}</em></p></div>
        </div>
      ))}
    </div>
  )
}

function StructuredNotes({ caseData, onFocus }: { caseData: InvestigationCase; onFocus: (entry: EvidenceItem) => void }) {
  const [hypothesis, setHypothesis] = useState('The archive route and the unusual brass trace give the strongest physical path to the culprit.')
  const [confidence, setConfidence] = useState(68)
  const [supports, setSupports] = useState<string[]>(['E-02', 'E-03'])

  const toggleSupport = (id: string) => {
    setSupports((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  return (
    <div className="tool-content structured-notes">
      <div className="note-editor">
        <label>WORKING HYPOTHESIS<textarea value={hypothesis} onChange={(event) => setHypothesis(event.target.value)} /></label>
        <label>CONFIDENCE <output>{confidence}%</output><input type="range" min="0" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} /></label>
        <div className="confidence-track"><span style={{ width: `${confidence}%` }} /></div>
      </div>
      <div className="support-picker">
        <p>SUPPORTING EVIDENCE <small>{supports.length} LINKED</small></p>
        {caseData.evidence.map((item) => (
          <button className={supports.includes(item.id) ? 'supported' : ''} onClick={() => toggleSupport(item.id)} key={item.id}><span>{supports.includes(item.id) ? '✓' : '+'}</span><b>{item.id}</b> {item.title}</button>
        ))}
      </div>
      <button className="save-note" onClick={() => { supports.forEach((id) => { const item = caseData.evidence.find((entry) => entry.id === id); if (item) onFocus(item) }) }}>Save working note</button>
    </div>
  )
}

function ClueMatrix({ caseData }: { caseData: InvestigationCase }) {
  const clues = [
    { title: 'Timing drift', value: '+17 min', detail: 'The archive clock and security ledger disagree at the critical route window.', tone: 'priority' },
    { title: 'Access pattern', value: '2 routes', detail: 'Only the west stairwell and archive route explain the sequence of events.', tone: 'info' },
    { title: 'Motive match', value: 'Debt + secrecy', detail: 'The donor records create a financial motive with a private inheritance trail.', tone: 'warning' },
    { title: 'Evidence anomaly', value: 'Override', detail: 'A single security override sits outside the official visitor log and cannot be explained away.', tone: 'alert' },
  ]

  return (
    <div className="clue-tool">
      <div className="tool-head"><div><p className="eyebrow">CLUE MATRIX</p><h2>Quick lead tracker.</h2></div><span className="secure-state">● ACTIVE</span></div>
      <div className="clue-grid">
        {clues.map((clue) => (
          <article className={`clue-card ${clue.tone}`} key={clue.title}><span>{clue.title}</span><strong>{clue.value}</strong><p>{clue.detail}</p></article>
        ))}
      </div>
    </div>
  )
}

function Board() {
  const [caseData] = useState<InvestigationCase>(() => readCaseFromStorage())
  const [selectedId, setSelectedId] = useState<string>('')
  const [tool, setTool] = useState<'overview' | 'evidence' | 'timeline' | 'analysis' | 'notes'>('overview')
  const [hintVisible, setHintVisible] = useState(false)

  const focusEvidence = (entry: EvidenceItem) => {
    setSelectedId(entry.id)
  }

  useEffect(() => {
    setSelectedId(caseData.evidence[0]?.id ?? '')
  }, [caseData])

  const selected = caseData.evidence.find((item) => item.id === selectedId) ?? caseData.evidence[0]
  const tabs = [['overview', 'Overview'], ['evidence', 'Evidence index'], ['timeline', 'Timeline'], ['analysis', 'Link analysis'], ['notes', 'Field notes']] as const

  return (
    <main className="board-shell">
      <aside className="case-rail panel">
        <div className="section-title"><span>Case dossier</span><small>OPEN</small></div>
        <div className="briefing-block">
          <p className="eyebrow">{caseData.title}</p>
          <h2>{caseData.scene}</h2>
          <p>{caseData.summary}</p>
        </div>
        <div className="status-row"><span className="lamp small" /><div><small>CASE STATUS</small><b>INVESTIGATION OPEN</b></div></div>
        <button className="hint" onClick={() => setHintVisible((value) => !value)}>✦ Request a hint <em>{caseData.hints.length} remaining</em></button>
        {hintVisible && <p className="hint-text">{caseData.hints[0]}</p>}
        <div className="suspect-list">{caseData.suspects.map((suspect) => <Suspect key={suspect.id} suspect={suspect} />)}</div>
        <Link to="/verdict" className="accuse primary-action">Make an accusation →</Link>
      </aside>

      <section className="active-case panel">
        <div className="board-header"><div><p className="eyebrow">INVESTIGATION WORKBENCH</p><h3>Professional case review</h3></div><span className="secure-state">● FICTIONAL SIMULATION</span></div>
        <div className="tool-tabs" role="tablist">{tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tool === id} className={tool === id ? 'active' : ''} onClick={() => setTool(id)}>{label}</button>)}</div>
        <div className="tool-panel">
          {tool === 'overview' && <ToolSummary caseData={caseData} />}
          {tool === 'evidence' && <EvidenceGrid caseData={caseData} onFocus={focusEvidence} />}
          {tool === 'timeline' && <TimelinePanel caseData={caseData} />}
          {tool === 'analysis' && <RelationshipPanel caseData={caseData} onFocus={focusEvidence} />}
          {tool === 'notes' && <StructuredNotes caseData={caseData} onFocus={focusEvidence} />}
        </div>
        <ClueMatrix caseData={caseData} />
      </section>

      <aside className="evidence-detail panel">
        <div className="section-title"><span>Evidence viewer</span><small>{selected?.id ?? '—'}</small></div>
        {selected && (
          <article className="viewer">
            <div className={`evidence-art ${selected.type.split(' ')[0].toLowerCase()}`}><span>RESTRICTED</span><b>{selected.type}</b></div>
            <p className="eyebrow">{selected.type} · {selected.time}</p>
            <h3>{selected.title}</h3>
            <p>{selected.copy}</p>
            <div className="metadata"><span>Source <b>{selected.source}</b></span><span>Location <b>{selected.location}</b></span><span className="integrity">● {selected.integrity}</span></div>
            <div className="evidence-analysis"><span>Case confidence</span><strong>{selected.score}%</strong><p>{selected.note}</p></div>
            <button className="pin">✦ Pin to theory</button>
          </article>
        )}
        <div className="locker panel-soft">
          <div className="section-title small-title"><span>Evidence locker</span><small>{caseData.evidence.length} ITEMS</small></div>
          <div className="evidence-list">{caseData.evidence.map((item) => <button className={selected?.id === item.id ? 'evidence selected' : 'evidence'} onClick={() => setSelectedId(item.id)} key={item.id}><span className="filetype">{item.type}</span><strong>{item.title}</strong><small>{item.time}</small></button>)}</div>
        </div>
      </aside>
    </main>
  )
}

function Suspect({ suspect }: { suspect: Suspect }) {
  const { marked, toggle } = useCase()
  const isMarked = marked.includes(suspect.name)
  return <button className={`suspect ${isMarked ? 'marked' : ''}`} onClick={() => toggle(suspect.name)}><span className="portrait">{suspect.name.split(' ').map((part) => part[0]).join('')}</span><span><b>{suspect.name}</b><small>{suspect.role} · {suspect.summary}</small></span><i>{isMarked ? '★' : '+'}</i></button>
}

function Verdict() {
  const [caseData] = useState<InvestigationCase>(() => readCaseFromStorage())
  const nav = useNavigate()
  const [choice, setChoice] = useState('')
  const [locked, setLocked] = useState(false)

  const culprit = caseData.suspects.find((suspect) => suspect.id === caseData.culpritId)

  return (
    <main className="verdict">
      <Link to="/case" className="back">← Back to evidence</Link>
      <div className="verdict-card">
        <p className="eyebrow">FINAL ACCUSATION</p>
        <h1>Put a name<br /><i>on the record.</i></h1>
        {!locked ? (
          <>
            <p>You get one accusation. Once filed, the underlying fictional case truth is revealed.</p>
            <div className="accuse-list">{caseData.suspects.map((suspect) => <button onClick={() => setChoice(suspect.id)} className={choice === suspect.id ? 'picked' : ''} key={suspect.id}>{suspect.name}<span>{suspect.role}</span></button>)}</div>
            <button disabled={!choice} className="brass-button" onClick={() => setLocked(true)}>File accusation →</button>
          </>
        ) : (
          <div className="result">
            <span>CASE CLOSED</span>
            <h2>{choice === caseData.culpritId ? 'Correct.' : 'Not quite.'}</h2>
            <p>{culprit ? `${culprit.name} acted with the motive of a hidden debt and inheritance route.` : 'The fictional culprit remains hidden until the case is reviewed.'} {caseData.motive}</p>
            <button className="brass-button" onClick={() => nav('/')}>Return to case files</button>
          </div>
        )}
      </div>
    </main>
  )
}

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/new" element={<NewCase />} />
        <Route path="/generating" element={<Generating />} />
        <Route path="/case" element={<Board />} />
        <Route path="/verdict" element={<Verdict />} />
      </Routes>
    </>
  )
}

const queryClient = new QueryClient()
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
