import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import './styles.css'

// ── Types ────────────────────────────────────────────────────────────
type User = { id: string; displayName: string; email?: string; isGuest?: boolean }
type PublicSuspect = { id: string; name: string; age?: number | string; role?: string; relationToVictim?: string; publicStatement?: string; portraitAssetId?: string }
type EvidenceItem = { id: string; type?: string; title?: string; description?: string; inWorldTimestamp?: string; payload?: any; unlockOrder?: number; source?: string; location?: string }
type CaseDoc = { id: string; title?: string; briefing?: string; status?: string; difficulty?: string; genre?: string; publicSuspects?: PublicSuspect[]; evidenceIds?: string[] }
type JobStatus = { status?: string; stage?: string; progressPercent?: number; error?: string }
type Notes = { text: string; pinnedEvidenceIds: string[]; suspectMarks: Record<string, 'suspect' | 'cleared' | 'unknown'> }

// ── API ──────────────────────────────────────────────────────────────
const API_CANDIDATES = ['http://localhost:5003/api/v1', 'http://localhost:5004/api/v1', 'http://localhost:5000/api/v1']
let _resolvedBase: string | null = null

async function getApiBase(): Promise<string> {
  if (_resolvedBase) return _resolvedBase
  for (const base of API_CANDIDATES) {
    try {
      const r = await fetch(base.replace('/api/v1', '/health'), { signal: AbortSignal.timeout(1500) })
      if (r.ok) { _resolvedBase = base; return base }
    } catch { /* try next */ }
  }
  _resolvedBase = API_CANDIDATES[0]
  return _resolvedBase
}

function getToken() { return localStorage.getItem('mystery-token') ?? '' }
function setToken(t: string) { t ? localStorage.setItem('mystery-token', t) : localStorage.removeItem('mystery-token') }

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const base = await getApiBase()
  const token = getToken()
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers ?? {}) },
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new Error(data?.error?.message ?? `Request failed (${res.status})`)
  return data as T
}

// ── Evidence helpers ─────────────────────────────────────────────────
const EV_ICONS: Record<string, string> = { chat: '💬', image: '🖼️', cctv: '📹', document: '📄', log: '📋' }
const EV_TAG: Record<string, string> = { chat: 'tag-chat', image: 'tag-image', cctv: 'tag-cctv', document: 'tag-document', log: 'tag-log' }

function initials(name: string) { return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase() }

// ── Header ───────────────────────────────────────────────────────────
function Header({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  return (
    <header className="app-header">
      <Link to="/" className="app-brand">
        <span className="dot" />
        MYSTERY<span style={{ color: 'var(--accent)', marginLeft: 6 }}>ROOM</span>
      </Link>
      <nav className="app-nav">
        <Link to="/">Case Files</Link>
        <Link to="/new">New Investigation</Link>
      </nav>
      {user ? (
        <button className="profile-btn" onClick={onLogout} title={`Log out (${user.displayName})`}>
          {user.displayName[0]?.toUpperCase()}
        </button>
      ) : (
        <div style={{ width: 34 }} />
      )}
    </header>
  )
}

// ── Landing Page (Auth) ───────────────────────────────────────────────
function LandingPage({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('detective@ashford.local')
  const [password, setPassword] = useState('detective123')
  const [displayName, setDisplayName] = useState('Detective Winters')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const ep = mode === 'login' ? '/auth/login' : '/auth/register'
      const body = mode === 'login' ? { email, password } : { email, password, displayName }
      const r = await apiFetch<{ token: string; user: User }>(ep, { method: 'POST', body: JSON.stringify(body) })
      setToken(r.token); onLoggedIn(r.user); navigate('/new')
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  const guestLogin = async () => {
    setLoading(true); setError('')
    try {
      const r = await apiFetch<{ token: string; user: User }>('/auth/guest', { method: 'POST' })
      setToken(r.token); onLoggedIn(r.user); navigate('/new')
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <main className="landing">
      <section className="hero">
        <p className="hero-eyebrow">AI-Powered Investigation Platform</p>
        <h1>Follow the trail.<br /><em>Uncover the truth.</em></h1>
        <p className="hero-lede">
          Choose a scenario, study AI-generated evidence — WhatsApp chats, CCTV footage, documents
          — interrogate suspects, then file your accusation. The hidden solution measures your verdict.
        </p>
        <button className="btn-primary" onClick={() => navigate('/new')} style={{ width: 'fit-content' }}>
          Open Case File →
        </button>
        <div className="hero-meta">
          <span>● LIVE CASEWORK</span>
          <span>AI-DRIVEN EVIDENCE</span>
          <span>SECURE BACKEND</span>
        </div>
      </section>

      <aside className="auth-card">
        <p className="auth-head">Confidential Case Access · Detective Login</p>
        <div className="auth-scene">
          <div className="lamp">🔍</div>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <div className="tab-row">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
            <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Register</button>
          </div>
          {mode === 'register' && (
            <label className="field">Display Name<input value={displayName} onChange={e => setDisplayName(e.target.value)} required /></label>
          )}
          <label className="field">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
          <label className="field">Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Working…' : mode === 'login' ? 'Enter the Office' : 'Create Account'}
          </button>
          <button className="btn-secondary" type="button" onClick={guestLogin} disabled={loading}>
            Continue as Guest Detective
          </button>
        </form>
      </aside>
    </main>
  )
}

// ── New Case Page ─────────────────────────────────────────────────────
const GENRES = ['Classic Whodunit', 'Modern Noir', 'Historical Mystery', 'Office Thriller', 'Hotel Heist', 'College Campus']
const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', desc: 'Clear trail — 4 suspects, all evidence visible' },
  { id: 'medium', label: 'Medium', desc: 'Careful investigation — 5 suspects, progressive unlock' },
  { id: 'hard', label: 'Hard', desc: 'More shadows, fewer answers — 6 suspects, cross-reference required' },
]

function NewCasePage({ user }: { user: User | null }) {
  const navigate = useNavigate()
  const [seedText, setSeedText] = useState('A renowned archivist collapses during a private gallery opening after a rare atlas vanishes from the restricted archive room.')
  const [difficulty, setDifficulty] = useState('medium')
  const [genre, setGenre] = useState('Classic Whodunit')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!user) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('')
    try {
      const r = await apiFetch<{ caseId: string }>('/cases', {
        method: 'POST',
        body: JSON.stringify({ seedText, difficulty, genre }),
      })
      navigate(`/generating/${r.caseId}`)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <main className="new-case-page">
      <Link to="/" className="page-back">← Return to Case Files</Link>
      <div className="page-heading">
        <p className="eyebrow">Commission a New Case</p>
        <h1>What happened?</h1>
        <p>Give us the first thread. The system will generate a coherent mystery, evidence trail, and hidden solution.</p>
      </div>
      <form className="case-form" onSubmit={submit}>
        <div className="form-field">
          <label className="form-label">Case Premise ({seedText.length}/1000)</label>
          <textarea
            value={seedText}
            onChange={e => setSeedText(e.target.value)}
            placeholder="Describe the first scene… (20–1000 characters)"
            required minLength={20} maxLength={1000}
          />
        </div>
        <div>
          <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Difficulty</label>
          <div className="difficulty-grid">
            {DIFFICULTIES.map(d => (
              <button key={d.id} type="button" className={`diff-btn ${difficulty === d.id ? 'selected' : ''}`} onClick={() => setDifficulty(d.id)}>
                <span className="diff-label">{d.label}</span>
                <span className="diff-desc">{d.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Genre</label>
          <div className="genre-grid">
            {GENRES.map(g => (
              <button key={g} type="button" className={`genre-chip ${genre === g ? 'selected' : ''}`} onClick={() => setGenre(g)}>{g}</button>
            ))}
          </div>
        </div>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn-primary" type="submit" disabled={loading} style={{ width: 'fit-content' }}>
          {loading ? 'Building Case…' : 'Build the Case →'}
        </button>
      </form>
    </main>
  )
}

// ── Generating Page ───────────────────────────────────────────────────
const STAGES = [
  'Establishing the scene',
  'Interviewing persons of interest',
  'Placing evidence into the record',
  'Testing alibis for inconsistencies',
  'Sealing the final case file',
]

function GeneratingPage() {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobStatus>({ status: 'running', stage: 'Building the hidden truth', progressPercent: 5 })
  const tries = useRef(0)

  useEffect(() => {
    if (!caseId) return
    const poll = async () => {
      try {
        const r = await apiFetch<JobStatus>(`/cases/${caseId}/status`)
        setJob(r)
        tries.current = 0
        if (r.status === 'ready' || (r.progressPercent ?? 0) >= 100) {
          navigate(`/case/${caseId}`)
        }
      } catch { tries.current++ }
    }
    poll()
    const iv = setInterval(() => {
      if (tries.current > 10) return
      poll()
    }, 1800)
    const timeout = setTimeout(() => clearInterval(iv), 600000)
    return () => { clearInterval(iv); clearTimeout(timeout) }
  }, [caseId, navigate])

  const pct = job.progressPercent ?? 5
  const stageIdx = Math.min(STAGES.length - 1, Math.floor((pct / 100) * STAGES.length))

  return (
    <main className="gen-page">
      <p className="eyebrow">Case File In Preparation</p>
      <h1>Assembling the<br /><em>evidence room.</em></h1>
      <p className="gen-subtitle">The AI is generating a unique mystery with suspects, evidence, and a hidden solution.</p>
      <div className="stage-list">
        {STAGES.map((s, i) => (
          <div key={s} className={`stage-item ${i < stageIdx ? 'done' : i === stageIdx ? 'active' : ''}`}>
            <div className="stage-num">{i < stageIdx ? '✓' : String(i + 1).padStart(2, '0')}</div>
            <div className="stage-text">
              <strong>{s}</strong>
              <small>{i === stageIdx ? (job.stage ?? 'Working…') : i < stageIdx ? 'Filed and cross-referenced' : ''}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="gen-bar" style={{ marginTop: 24, width: '100%' }}>
        <div className="gen-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      {job.status === 'failed' && (
        <div className="gen-error">
          Generation failed: {job.error ?? 'Unknown error'}
          <br />
          <button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => navigate('/new')}>Try Again</button>
        </div>
      )}
    </main>
  )
}

// ── Evidence Viewer ───────────────────────────────────────────────────
function ChatViewer({ payload }: { payload: any }) {
  if (!payload?.messages?.length) return <div className="empty-state"><div className="empty-icon">💬</div>No messages found</div>
  const participants: { name: string }[] = payload.participants ?? []
  const me = participants[0]?.name ?? ''
  return (
    <div className="chat-viewer">
      <div className="chat-header">
        <div className="s-avatar">{participants[1] ? initials(participants[1].name) : '?'}</div>
        <div>
          <div className="chat-header-name">{participants.map((p: any) => p.name).join(', ')}</div>
          <div className="chat-header-status">● Online</div>
        </div>
      </div>
      <div className="chat-messages">
        {payload.messages.map((m: any, i: number) => (
          <div key={i} className={`chat-bubble ${m.sender === me ? 'me' : 'other'}`}>
            {m.sender !== me && <small style={{ fontSize: 10, color: 'var(--muted)', display: 'block', marginBottom: 3 }}>{m.sender}</small>}
            {m.deleted ? <em style={{ opacity: .5 }}>This message was deleted</em> : m.text}
            <span className="ts">{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CctvViewer({ payload, title }: { payload: any; title?: string }) {
  const frames: any[] = payload?.frames ?? []
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const ivRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (playing && frames.length > 1) {
      ivRef.current = setInterval(() => setFrameIdx(p => (p + 1) % frames.length), 1500)
    } else { ivRef.current && clearInterval(ivRef.current) }
    return () => { ivRef.current && clearInterval(ivRef.current) }
  }, [playing, frames.length])

  const frame = frames[frameIdx]
  return (
    <div className="cctv-viewer">
      <div className="cctv-screen" style={{ minHeight: 220 }}>
        <div className="cctv-overlay" />
        <div className="cctv-label">{payload?.cameraName ?? title ?? 'CCTV CAM-01'}</div>
        <div className="cctv-ts">{frame?.timestamp ?? new Date().toISOString().slice(0, 16).replace('T', ' ')}</div>
        <div className="cctv-art">📹</div>
      </div>
      {frames.length > 0 && (
        <div className="cctv-controls">
          <button onClick={() => setPlaying(p => !p)}>{playing ? '⏸ Pause' : '▶ Play'}</button>
          <button onClick={() => setFrameIdx(p => Math.max(0, p - 1))}>◀ Prev</button>
          <button onClick={() => setFrameIdx(p => Math.min(frames.length - 1, p + 1))}>Next ▶</button>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>Frame {frameIdx + 1} / {frames.length}</span>
        </div>
      )}
      {frame?.caption && <div className="cctv-caption">{frame.caption}</div>}
    </div>
  )
}

function DocViewer({ payload, type }: { payload: any; type?: string }) {
  const rows: [string, string][] = payload?.rows ?? Object.entries(payload ?? {}).filter(([k]) => typeof payload[k] !== 'object')
  return (
    <div className="doc-viewer">
      <div className="doc-header">{type === 'log' ? '📋 Access Log' : '📄 Document Record'} — Evidence File</div>
      <div className="doc-body">
        {rows.length > 0 ? rows.map(([k, v], i) => (
          <div key={i} className="doc-row">
            <span className="doc-key">{k}</span>
            <span>{String(v)}</span>
          </div>
        )) : <div style={{ color: 'var(--muted)' }}>{payload?.content ?? JSON.stringify(payload, null, 2)}</div>}
      </div>
    </div>
  )
}

function EvidenceViewer({ item }: { item: EvidenceItem }) {
  return (
    <div>
      <div className="ev-detail-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span className={`tag ${EV_TAG[item.type ?? ''] ?? 'tag-document'}`}>
            {EV_ICONS[item.type ?? ''] ?? '📄'} {item.type ?? 'Record'}
          </span>
        </div>
        <h3>{item.title ?? 'Evidence Item'}</h3>
        <p>{item.description}</p>
      </div>
      <div className="ev-detail-meta">
        <div className="meta-cell"><span>Timestamp</span><strong>{item.inWorldTimestamp ?? 'Unknown'}</strong></div>
        <div className="meta-cell"><span>Type</span><strong>{item.type?.toUpperCase() ?? 'RECORD'}</strong></div>
        <div className="meta-cell"><span>Status</span><strong style={{ color: 'var(--green)' }}>Logged</strong></div>
      </div>
      {item.type === 'chat' && <ChatViewer payload={item.payload} />}
      {item.type === 'cctv' && <CctvViewer payload={item.payload} title={item.title} />}
      {(item.type === 'document' || item.type === 'log') && <DocViewer payload={item.payload} type={item.type} />}
      {item.type === 'image' && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ background: 'var(--bg2)', padding: 40, display: 'grid', placeItems: 'center', fontSize: 64 }}>🖼️</div>
          {item.payload?.ocrText && (
            <div className="doc-body"><strong style={{ color: 'var(--muted)', fontSize: 10, letterSpacing: '.1em' }}>OCR TRANSCRIPT</strong><div style={{ marginTop: 8 }}>{item.payload.ocrText}</div></div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Case Workspace ────────────────────────────────────────────────────
type WsTab = 'overview' | 'evidence' | 'suspects' | 'timeline' | 'notes'

function CaseWorkspace({ user }: { user: User | null }) {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [overview, setOverview] = useState<CaseDoc | null>(null)
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [suspects, setSuspects] = useState<PublicSuspect[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [notes, setNotes] = useState<Notes>({ text: '', pinnedEvidenceIds: [], suspectMarks: {} })
  const [tab, setTab] = useState<WsTab>('overview')
  const [selectedEvId, setSelectedEvId] = useState('')
  const [selectedSuspect, setSelectedSuspect] = useState<PublicSuspect | null>(null)
  const [hint, setHint] = useState<string>('')
  const [hintsUsed, setHintsUsed] = useState(0)
  const [viewedIds, setViewedIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!user) return <Navigate to="/" replace />

  useEffect(() => {
    if (!caseId) return
    Promise.all([
      apiFetch<CaseDoc>(`/cases/${caseId}/overview`),
      apiFetch<EvidenceItem[]>(`/cases/${caseId}/evidence`),
      apiFetch<PublicSuspect[]>(`/cases/${caseId}/suspects`),
      apiFetch<any>(`/cases/${caseId}/timeline`),
      apiFetch<any>(`/cases/${caseId}/notes`),
    ]).then(([ov, ev, sus, tl, n]) => {
      setOverview(ov)
      setEvidence(ev)
      setSuspects(sus)
      setTimeline(tl?.timeline ?? [])
      setNotes({ text: n?.notes?.text ?? '', pinnedEvidenceIds: n?.notes?.pinnedEvidenceIds ?? [], suspectMarks: n?.notes?.suspectMarks ?? {} })
      setSelectedEvId(ev[0]?.id ?? '')
      setSuspects(sus); setSelectedSuspect(sus[0] ?? null)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [caseId])

  // Autosave notes
  useEffect(() => {
    if (!caseId) return
    saveTimer.current && clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try { setSaving(true); await apiFetch(`/cases/${caseId}/autosave`, { method: 'POST', body: JSON.stringify(notes) }) }
      catch { }
      finally { setSaving(false) }
    }, 800)
  }, [notes, caseId])

  const fetchHint = async () => {
    if (!caseId) return
    try {
      const r = await apiFetch<{ hint?: string; text?: string }>(`/cases/${caseId}/hint`, { method: 'POST', headers: { 'x-hints-used': String(hintsUsed) } })
      setHint(r.hint ?? r.text ?? 'No more hints available.')
      setHintsUsed(h => h + 1)
    } catch (err) { setHint((err as Error).message) }
  }

  const maxHints = overview?.difficulty === 'easy' ? 3 : overview?.difficulty === 'medium' ? 2 : 1
  const selectedEvidence = evidence.find(e => e.id === selectedEvId)

  const handleEvSelect = (id: string) => {
    setSelectedEvId(id)
    setViewedIds(s => new Set([...s, id]))
    setTab('evidence')
  }

  // Mobile tab switch also shows left content
  const tabs: { id: WsTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🗂️' },
    { id: 'evidence', label: 'Evidence', icon: '🔍' },
    { id: 'suspects', label: 'Suspects', icon: '👤' },
    { id: 'timeline', label: 'Timeline', icon: '⏱️' },
    { id: 'notes', label: 'Notes', icon: '📝' },
  ]

  if (loading) return <div className="loading-center"><div className="spinner" /><span>Loading case file…</span></div>
  if (!overview) return <div className="loading-center"><div className="spinner" /><span>Case not found</span></div>

  return (
    <div className="workspace">
      {/* Top bar */}
      <div className="ws-bar">
        <span className="ws-title">📁 {overview.title ?? 'Loading…'}</span>
        <div className="ws-tabs" style={{ display: 'flex' }}>
          {tabs.map(t => (
            <button key={t.id} className={`ws-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <button className="btn-danger" onClick={() => navigate(`/case/${caseId}/verdict`)}>
          ⚖️ Accuse
        </button>
      </div>

      <div className="ws-body">
        {/* ── LEFT RAIL (desktop) ── */}
        <aside className="ws-left">
          <div className="ws-left-scroll">
            <div className="rail-section">
              <div className="rail-label">Case Info</div>
              <div className="case-info-card">
                <div className="info-row"><span>Status</span><span className={`badge ${overview.status === 'ready' || overview.status === 'generating' ? 'badge-blue' : 'badge-green'}`}>{(overview.status ?? 'ready').toUpperCase()}</span></div>
                <div className="info-row"><span>Difficulty</span><span className="badge badge-gold">{(overview.difficulty ?? 'medium').toUpperCase()}</span></div>
                <div className="info-row"><span>Suspects</span><strong>{suspects.length}</strong></div>
                <div className="info-row"><span>Evidence</span><strong>{evidence.length} items</strong></div>
                {overview.briefing && <p className="brief-text">{overview.briefing.slice(0, 180)}{overview.briefing.length > 180 ? '…' : ''}</p>}
              </div>
            </div>

            <div className="rail-section">
              <div className="rail-label">Suspects</div>
              <div className="suspect-mini">
                {suspects.map(s => (
                  <div key={s.id} className={`suspect-mini-item ${selectedSuspect?.id === s.id ? 'selected' : ''}`} onClick={() => { setSelectedSuspect(s); setTab('suspects') }}>
                    <div className="s-avatar">{initials(s.name)}</div>
                    <div>
                      <span className="s-name">{s.name}</span>
                      <span className="s-role">{s.role ?? 'Person of interest'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rail-section">
              <div className="rail-label">Hint System ({maxHints - hintsUsed} remaining)</div>
              <div className="hint-box">
                <div className="hint-header">
                  <span>💡 Investigator Hint</span>
                  <small>−75 pts each</small>
                </div>
                {hint
                  ? <p className="hint-text">{hint}</p>
                  : <p className="hint-empty">Request a hint to narrow your investigation.</p>
                }
                <button className="btn-secondary" style={{ marginTop: 10, width: '100%', fontSize: 11 }} disabled={hintsUsed >= maxHints} onClick={fetchHint}>
                  {hintsUsed >= maxHints ? 'No hints remaining' : 'Request Hint'}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── CENTER ── */}
        <section className="ws-center">
          <div className="ws-center-scroll">
            {tab === 'overview' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Status', value: overview.status ?? 'Ready', color: 'var(--green)' },
                    { label: 'Difficulty', value: overview.difficulty ?? 'Medium' },
                    { label: 'Suspects', value: String(suspects.length) },
                    { label: 'Evidence', value: String(evidence.length) + ' items' },
                  ].map(c => (
                    <div key={c.label} className="panel-card">
                      <div style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8 }}>{c.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: c.color ?? 'var(--text)' }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <div className="panel-card" style={{ marginBottom: 12 }}>
                  <div className="section-header"><h4>Case Briefing</h4></div>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--muted)' }}>{overview.briefing ?? 'Investigation is underway. Review the evidence locker and suspect profiles.'}</p>
                </div>
                <div className="panel-card">
                  <div className="section-header"><h4>Investigation Leads</h4></div>
                  {['Cross-reference suspect alibis with the recorded timeline before making a final accusation.',
                    'Compare the public narrative to the evidence chain and record any contradictions.',
                    'Treat the hidden solution as fixed — test the strongest public theory.'].map(lead => (
                    <div key={lead} style={{ padding: '10px 0', borderBottom: '1px solid var(--border2)', fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>{lead}</div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'evidence' && (
              <div>
                <div className="section-header">
                  <h4>Evidence Locker — {evidence.length} Items</h4>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{viewedIds.size} viewed</span>
                </div>
                <div className="ev-grid">
                  {evidence.map(item => (
                    <button key={item.id} className={`ev-card ${selectedEvId === item.id ? 'active' : ''}`} onClick={() => handleEvSelect(item.id)}>
                      <div className="ev-type">
                        <span className="ev-type-icon">{EV_ICONS[item.type ?? ''] ?? '📄'}</span>
                        <span className={`tag ${EV_TAG[item.type ?? ''] ?? ''}`}>{item.type ?? 'record'}</span>
                        {!viewedIds.has(item.id) && <span className="badge badge-blue" style={{ fontSize: 9 }}>NEW</span>}
                      </div>
                      <span className="ev-title">{item.title ?? item.id}</span>
                      <span className="ev-desc">{item.description}</span>
                      {item.inWorldTimestamp && <div className="ev-time">{item.inWorldTimestamp}</div>}
                    </button>
                  ))}
                </div>
                {selectedEvidence && (
                  <div className="ev-detail" style={{ marginTop: 16 }}>
                    <EvidenceViewer item={selectedEvidence} />
                  </div>
                )}
                {evidence.length === 0 && <div className="empty-state"><div className="empty-icon">🔍</div>No evidence collected yet</div>}
              </div>
            )}

            {tab === 'suspects' && (
              <div>
                <div className="section-header"><h4>Suspects — {suspects.length} Persons of Interest</h4></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
                  {suspects.map(s => (
                    <div key={s.id} className={`suspect-card ${selectedSuspect?.id === s.id ? 'active' : ''}`} onClick={() => setSelectedSuspect(s)} style={{ cursor: 'pointer' }}>
                      <div className="suspect-card-header">
                        <div className="suspect-avatar-lg">{initials(s.name)}</div>
                        <div>
                          <div className="suspect-card-name">{s.name}</div>
                          <div className="suspect-card-role">{s.role ?? 'Person of interest'}</div>
                          {s.age && <div style={{ fontSize: 11, color: 'var(--muted)' }}>Age {s.age}</div>}
                        </div>
                      </div>
                      <div className="suspect-detail-grid">
                        {s.relationToVictim && <div className="sd-row"><span>Relation</span><strong>{s.relationToVictim}</strong></div>}
                        {s.publicStatement && <div className="sd-row"><span>Statement</span><strong>{s.publicStatement}</strong></div>}
                      </div>
                      <div className="suspect-marks-row">
                        {(['suspect', 'cleared', 'unknown'] as const).map(mark => (
                          <button key={mark} className={`sm-btn ${notes.suspectMarks[s.id] === mark ? `active-${mark}` : ''}`}
                            onClick={e => { e.stopPropagation(); setNotes(n => ({ ...n, suspectMarks: { ...n.suspectMarks, [s.id]: mark } })) }}>
                            {mark === 'suspect' ? '🔴' : mark === 'cleared' ? '✅' : '❓'} {mark}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'timeline' && (
              <div>
                <div className="section-header"><h4>Investigation Timeline</h4></div>
                {timeline.length > 0 ? (
                  <div className="timeline-list">
                    {timeline.map((ev: any, i: number) => (
                      <div key={i} className="tl-item">
                        <div className="tl-time">{ev.time ? new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ev.timestamp ?? '--:--'}</div>
                        <div className="tl-line" />
                        <div className="tl-card">
                          <strong>{ev.title ?? ev.action ?? 'Event'}</strong>
                          <p>{ev.detail ?? ev.description ?? ev.caption ?? ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><div className="empty-icon">⏱️</div>No timeline events yet</div>
                )}
              </div>
            )}

            {tab === 'notes' && (
              <div className="notes-section">
                <div className="section-header"><h4>Case Notebook</h4><span style={{ fontSize: 11, color: 'var(--muted)' }}>{saving ? 'Saving…' : 'Auto-saved'}</span></div>
                <div className="notes-editor">
                  <textarea
                    placeholder="Record your observations, contradictions, and theories here…"
                    value={notes.text}
                    onChange={e => setNotes(n => ({ ...n, text: e.target.value }))}
                  />
                </div>
                <button className="btn-secondary" style={{ width: 'fit-content' }} onClick={async () => {
                  await apiFetch(`/cases/${caseId}/notes`, { method: 'PUT', body: JSON.stringify(notes) })
                }}>
                  💾 Save Notes
                </button>
                <div className="divider" />
                <div className="pinned-label">Pin Evidence to this Note ({notes.pinnedEvidenceIds.length} linked)</div>
                <div className="pin-list">
                  {evidence.map(item => {
                    const pinned = notes.pinnedEvidenceIds.includes(item.id)
                    return (
                      <button key={item.id} className={`pin-item ${pinned ? 'pinned' : ''}`}
                        onClick={() => setNotes(n => ({ ...n, pinnedEvidenceIds: pinned ? n.pinnedEvidenceIds.filter(x => x !== item.id) : [...n.pinnedEvidenceIds, item.id] }))}>
                        {EV_ICONS[item.type ?? ''] ?? '📄'} {item.title ?? item.id}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Accusation bar */}
          <div className="accuse-btn-bar">
            <span className="ev-viewed-count">📁 {viewedIds.size} / {evidence.length} items reviewed</span>
            <button className="btn-danger" onClick={() => navigate(`/case/${caseId}/verdict`)} disabled={viewedIds.size < 1}>
              ⚖️ Make Accusation
            </button>
          </div>
        </section>

        {/* ── RIGHT RAIL (desktop) ── */}
        <aside className="ws-right">
          <div className="ws-right-scroll">
            {selectedSuspect && (
              <div className="suspect-card">
                <div className="rail-label" style={{ marginBottom: 10 }}>Active Suspect</div>
                <div className="suspect-card-header">
                  <div className="suspect-avatar-lg">{initials(selectedSuspect.name)}</div>
                  <div>
                    <div className="suspect-card-name">{selectedSuspect.name}</div>
                    <div className="suspect-card-role">{selectedSuspect.role}</div>
                  </div>
                </div>
                <div className="suspect-detail-grid">
                  {selectedSuspect.age && <div className="sd-row"><span>Age</span><strong>{selectedSuspect.age}</strong></div>}
                  {selectedSuspect.relationToVictim && <div className="sd-row"><span>Relation to Victim</span><strong>{selectedSuspect.relationToVictim}</strong></div>}
                  {selectedSuspect.publicStatement && <div className="sd-row"><span>Public Statement</span><strong style={{ fontSize: 11, lineHeight: 1.6, fontWeight: 400 }}>{selectedSuspect.publicStatement}</strong></div>}
                </div>
                <div className="suspect-marks-row">
                  {(['suspect', 'cleared', 'unknown'] as const).map(mark => (
                    <button key={mark} className={`sm-btn ${notes.suspectMarks[selectedSuspect.id] === mark ? `active-${mark}` : ''}`}
                      onClick={() => setNotes(n => ({ ...n, suspectMarks: { ...n.suspectMarks, [selectedSuspect.id]: mark } }))}>
                      {mark === 'suspect' ? '🔴' : mark === 'cleared' ? '✅' : '❓'} {mark}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="panel-card">
              <div className="rail-label" style={{ marginBottom: 10 }}>Quick Notes</div>
              <textarea className="notes-editor" style={{ width: '100%', minHeight: 100, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)', fontSize: 12, resize: 'vertical' }}
                placeholder="Quick observations…"
                value={notes.text}
                onChange={e => setNotes(n => ({ ...n, text: e.target.value }))}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{saving ? 'Autosaving…' : 'Saved'}</div>
            </div>

            <div className="panel-card">
              <div className="rail-label" style={{ marginBottom: 10 }}>Hint System</div>
              <div className="hint-box">
                <div className="hint-header">
                  <span>💡 Hint</span><small>{maxHints - hintsUsed}/{maxHints} left</small>
                </div>
                {hint ? <p className="hint-text">{hint}</p> : <p className="hint-empty">No hint requested yet. Each hint costs 75 points.</p>}
                <button className="btn-secondary" style={{ marginTop: 10, width: '100%', fontSize: 11 }} disabled={hintsUsed >= maxHints} onClick={fetchHint}>
                  Request Hint
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile tab bar */}
      <div className="mobile-tab-bar">
        <nav>
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              <span className="tab-icon">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

// ── Verdict Page ──────────────────────────────────────────────────────
function VerdictPage({ user }: { user: User | null }) {
  const { caseId } = useParams()
  const navigate = useNavigate()
  const [suspects, setSuspects] = useState<PublicSuspect[]>([])
  const [picked, setPicked] = useState('')
  const [reason, setReason] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  if (!user) return <Navigate to="/" replace />

  useEffect(() => {
    if (!caseId) return
    apiFetch<PublicSuspect[]>(`/cases/${caseId}/suspects`).then(setSuspects).catch(() => setError('Could not load suspects.'))
  }, [caseId])

  const fileAccusation = async () => {
    if (!caseId || !picked) return
    setLoading(true); setError('')
    try {
      const r = await apiFetch<any>(`/cases/${caseId}/accusation`, { method: 'POST', body: JSON.stringify({ suspectId: picked, reasoning: reason }) })
      setResult(r)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  return (
    <main className="verdict-page">
      <Link to={`/case/${caseId}`} className="page-back">← Back to Evidence</Link>
      <div className="verdict-card">
        <p className="eyebrow">Final Accusation</p>
        {!result ? (
          <>
            <h1>Put a name<br />on the record.</h1>
            <p style={{ color: 'var(--muted)', lineHeight: 1.7, marginBottom: 20 }}>
              You get one accusation. Once filed, the hidden solution is checked against your verdict. This action is final.
            </p>
            <div className="accuse-grid">
              {suspects.map(s => (
                <button key={s.id} className={`accuse-option ${picked === s.id ? 'picked' : ''}`} onClick={() => setPicked(s.id)}>
                  <div className="s-avatar">{initials(s.name)}</div>
                  <div>
                    <strong>{s.name}</strong>
                    <small>{s.role ?? 'Person of interest'}</small>
                  </div>
                </button>
              ))}
            </div>
            <div className="verdict-reasoning">
              <label className="form-label">Your Reasoning (optional — up to +250 bonus points)</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain the evidence that supports your accusation…" />
            </div>
            {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
            {!confirmed ? (
              <button className="btn-primary" disabled={!picked} onClick={() => setConfirmed(true)}>
                Review Accusation →
              </button>
            ) : (
              <div style={{ display: 'grid', gap: 12, padding: 16, borderRadius: 12, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)' }}>
                <p style={{ color: '#fca5a5', fontSize: 14, lineHeight: 1.6 }}>
                  ⚠️ You are about to accuse <strong>{suspects.find(s => s.id === picked)?.name}</strong>. This is final and cannot be changed.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn-danger" onClick={fileAccusation} disabled={loading}>{loading ? 'Filing…' : 'Confirm Accusation'}</button>
                  <button className="btn-ghost" onClick={() => setConfirmed(false)}>Cancel</button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="result-section">
            <div className={`result-verdict ${result.isCorrect ? 'correct' : 'wrong'}`}>
              <div style={{ fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', marginBottom: 10, color: result.isCorrect ? 'var(--green)' : 'var(--red)' }}>
                {result.isCorrect ? '✅ CASE CLOSED' : '❌ INCORRECT ACCUSATION'}
              </div>
              <h2>{result.isCorrect ? 'Correct.' : 'Not quite.'}</h2>
              <p>{result.isCorrect ? 'Your accusation aligned with the fixed solution.' : 'The evidence board points elsewhere.'}</p>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12, color: 'var(--gold)' }}>Score: {result.score}</div>
            </div>
            {result.solution && (
              <div className="solution-grid">
                {[
                  { label: 'Culprit', value: result.solution.culpritName ?? result.solution.culpritId },
                  { label: 'Motive', value: result.solution.motive },
                  { label: 'Method', value: result.solution.method },
                  { label: 'Summary', value: result.solution.summary },
                ].filter(r => r.value).map(row => (
                  <div key={row.label} className="sol-card">
                    <span>{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn-primary" onClick={() => navigate('/new')}>🔍 New Investigation</button>
              <button className="btn-secondary" onClick={() => navigate('/')}>Case Files</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

// ── App ───────────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState<User | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)

  useEffect(() => {
    const token = getToken()
    if (!token) { setAuthLoaded(true); return }
    apiFetch<{ id: string; displayName: string; email?: string; isGuest?: boolean }>('/auth/me')
      .then(me => setUser({ id: me.id, displayName: me.displayName, email: me.email, isGuest: me.isGuest }))
      .catch(() => setToken(''))
      .finally(() => setAuthLoaded(true))
  }, [])

  const logout = () => { setToken(''); setUser(null) }

  if (!authLoaded) return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <>
      <Header user={user} onLogout={logout} />
      <Routes>
        <Route path="/" element={<LandingPage onLoggedIn={setUser} />} />
        <Route path="/new" element={<NewCasePage user={user} />} />
        <Route path="/generating/:caseId" element={<GeneratingPage />} />
        <Route path="/case/:caseId" element={<CaseWorkspace user={user} />} />
        <Route path="/case/:caseId/verdict" element={<VerdictPage user={user} />} />
      </Routes>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
