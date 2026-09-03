'use client'

import { useEffect, useMemo, useState } from 'react'
import { PlayerPage } from '@/components/PlayerMobileChrome'
import { supabase } from '@/lib/supabase'

type MonthRow = {
  id: string
  month_start: string
  course_name?: string | null
  bonus_hole_1: number | null
  bonus_hole_2: number | null
  bonus_birdie_value: number | null
}

type ExistingState = { kind: 'submission' | 'official'; status: string; id?: string } | null

type BaseCtx = {
  userId: string
  teamId: string
  teamName: string
  players: string[]
  months: MonthRow[]
}

const stablefordPoints = (score: number, par: number) => {
  const d = score - par
  return d <= -3 ? 5 : d === -2 ? 4 : d === -1 ? 3 : d === 0 ? 2 : d === 1 ? 1 : 0
}

const scoreName = (score: number | null, par: number | null) => {
  if (!score || !par) return '—'
  const d = score - par
  if (d <= -3) return 'Albatross'
  if (d === -2) return 'Eagle'
  if (d === -1) return 'Birdie'
  if (d === 0) return 'Par'
  if (d === 1) return 'Bogey'
  if (d === 2) return 'Double Bogey'
  return `+${d}`
}

const monthLabel = (m: MonthRow) => new Date(`${m.month_start}T12:00:00`).toLocaleString('en-US', { month: 'long', year: 'numeric' })

function defaultRound(months: MonthRow[]) {
  const now = new Date()
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  let monthIndex = months.findIndex(m => String(m.month_start).startsWith(key))
  if (monthIndex < 0) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    monthIndex = months.findIndex(m => new Date(`${m.month_start}T12:00:00`).getTime() >= today)
    if (monthIndex < 0) monthIndex = Math.max(0, months.length - 1)
  }
  const selected = months[monthIndex]
  const isCurrentMonth = selected && String(selected.month_start).startsWith(key)
  const week = isCurrentMonth ? Math.min(4, Math.max(1, Math.ceil(now.getDate() / 7))) : 1
  return { monthId: selected?.id || '', week }
}

export default function SubmitScore() {
  const [base, setBase] = useState<BaseCtx | null>(null)
  const [monthId, setMonthId] = useState('')
  const [week, setWeek] = useState(1)
  const [changeRound, setChangeRound] = useState(false)
  const [handicap, setHandicap] = useState(0)
  const [existing, setExisting] = useState<ExistingState>(null)
  const [scores, setScores] = useState<(number | null)[]>(Array(18).fill(null))
  const [pars, setPars] = useState<(number | null)[]>(Array(18).fill(null))
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [reading, setReading] = useState(false)
  const [processingPercent, setProcessingPercent] = useState(0)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!(window as any).Tesseract && !document.querySelector('script[data-score-ocr]')) {
      const sc = document.createElement('script')
      sc.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@6/dist/tesseract.min.js'
      sc.async = true
      sc.dataset.scoreOcr = '1'
      document.head.appendChild(sc)
    }

    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('player_id,status').eq('id', user.id).single()
      if (!profile?.player_id) {
        setMsg('Your account must be linked to a league player before submitting a score.')
        return
      }
      const { data: player } = await supabase.from('players').select('team_id,teams(name)').eq('id', profile.player_id).single()
      const teamId = player?.team_id
      if (!teamId) return
      const { data: season } = await supabase.from('seasons').select('id').eq('is_active', true).eq('is_closed', false).maybeSingle()
      if (!season) return
      const [{ data: months }, { data: roster }] = await Promise.all([
        supabase.from('league_months').select('id,month_start,course_name,bonus_hole_1,bonus_hole_2,bonus_birdie_value').eq('season_id', season.id).order('month_start'),
        supabase.from('players').select('full_name').eq('team_id', teamId).eq('is_active', true).order('full_name'),
      ])
      const monthRows = (months || []) as MonthRow[]
      if (!monthRows.length) {
        setMsg('The league schedule has not been set up yet.')
        return
      }
      const d = defaultRound(monthRows)
      setBase({ userId: user.id, teamId, teamName: (player as any)?.teams?.name || 'My Team', players: (roster || []).map((x: any) => x.full_name), months: monthRows })
      setMonthId(d.monthId)
      setWeek(d.week)
    })()
  }, [])

  const month = base?.months.find(m => m.id === monthId) || null
  const bonusHoles = month ? [Number(month.bonus_hole_1), Number(month.bonus_hole_2)].filter(h => h >= 1 && h <= 18) : []
  const includedHoles = useMemo(() => Array.from(new Set([...Array.from({ length: 10 }, (_, i) => i + 1), ...bonusHoles])), [monthId, month?.bonus_hole_1, month?.bonus_hole_2])
  const bonusValue = Number(month?.bonus_birdie_value || 0.1)

  useEffect(() => {
    if (!base || !monthId) return
    let cancelled = false
    ;(async () => {
      setExisting(null)
      const [{ data: subs }, { data: weekly }, { data: h }] = await Promise.all([
        supabase.from('round_score_submissions').select('id,status').eq('league_month_id', monthId).eq('team_id', base.teamId).eq('week_number', week).neq('status', 'rejected').order('created_at', { ascending: false }).limit(1),
        supabase.from('weekly_scores').select('status').eq('league_month_id', monthId).eq('team_id', base.teamId).eq('week_number', week).limit(1),
        supabase.from('monthly_team_handicaps').select('handicap_points').eq('league_month_id', monthId).eq('team_id', base.teamId).maybeSingle(),
      ])
      if (cancelled) return
      setHandicap(Number(h?.handicap_points || 0))
      if (weekly?.length) setExisting({ kind: 'official', status: weekly[0].status || 'approved' })
      else if (subs?.length) setExisting({ kind: 'submission', status: subs[0].status, id: subs[0].id })
    })()
    return () => { cancelled = true }
  }, [base, monthId, week])

  const sf = useMemo(() => scores.slice(0, 10).map((s, i) => s && pars[i] ? stablefordPoints(s, pars[i]!) : 0), [scores, pars])
  const raw = sf.reduce<number>((a, b) => a + b, 0)
  const bonusBirdies = bonusHoles.filter(h => scores[h - 1] && pars[h - 1] && scores[h - 1] === pars[h - 1]! - 1).length
  const bonus = bonusBirdies * bonusValue
  const official = raw + bonus + handicap

  async function choose(f: File) {
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setReading(true)
    setProcessingPercent(1)
    setMsg('Processing scorecard…')
    try {
      const T = (window as any).Tesseract
      if (!T) throw new Error('OCR is still loading')
      const r = await T.recognize(f, 'eng', {
        logger: (m: any) => {
          if (typeof m?.progress === 'number') setProcessingPercent(Math.max(1, Math.min(99, Math.round(m.progress * 100))))
        },
      })
      setProcessingPercent(99)
      const lines = String(r?.data?.text || '').split(/\n/).map((x: string) => x.trim()).filter(Boolean)
      const numberLines: number[][] = lines.map((line: string) => (line.match(/\b(?:[1-9]|1\d|2\d)\b/g) || []).map(Number)).filter((a: number[]) => a.length >= 10)
      if (numberLines.length) {
        const parLine = numberLines.find((a: number[]) => a.slice(0, 10).every((n: number) => n >= 3 && n <= 5))
        const scoreLine = numberLines.find((a: number[]) => a !== parLine && a.slice(0, 10).every((n: number) => n >= 1 && n <= 12))
        if (parLine) setPars(Array.from({ length: 18 }, (_, i) => parLine[i] ?? null))
        if (scoreLine) setScores(Array.from({ length: 18 }, (_, i) => scoreLine[i] ?? null))
        setMsg('Automatic reading complete. Please check every score before submitting.')
      } else {
        setMsg('I could not confidently read the grid. Please enter the scores below; the photo will still be attached.')
      }
      setProcessingPercent(100)
    } catch {
      setMsg('Automatic reading was not confident enough. Please enter the scores below.')
      setProcessingPercent(100)
    } finally {
      setTimeout(() => setReading(false), 250)
    }
  }

  async function submit() {
    if (!base || !month || !file) return
    if (scores.slice(0, 10).some(x => !x) || pars.slice(0, 10).some(x => !x)) {
      setMsg('Please confirm the scores and pars for holes 1–10.')
      return
    }
    const missingBonus = bonusHoles.some(h => !scores[h - 1] || !pars[h - 1])
    if (missingBonus) {
      setMsg(`Please confirm the scores and pars for bonus holes ${bonusHoles.join(' and ')}.`)
      return
    }
    setSaving(true)
    setMsg('Checking this round…')

    const [{ data: duplicateSubmission }, { data: officialScore }] = await Promise.all([
      supabase.from('round_score_submissions').select('id,status').eq('league_month_id', month.id).eq('team_id', base.teamId).eq('week_number', week).neq('status', 'rejected').limit(1),
      supabase.from('weekly_scores').select('week_number').eq('league_month_id', month.id).eq('team_id', base.teamId).eq('week_number', week).limit(1),
    ])
    if (duplicateSubmission?.length || officialScore?.length) {
      setExisting(officialScore?.length ? { kind: 'official', status: 'approved' } : { kind: 'submission', status: duplicateSubmission![0].status, id: duplicateSubmission![0].id })
      setMsg('A scorecard has already been submitted for this round. A second submission is not allowed.')
      setSaving(false)
      return
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${base.userId}/${month.id}-${base.teamId}-w${week}-${Date.now()}.${ext}`
    const up = await supabase.storage.from('round-scorecards').upload(path, file, { upsert: false })
    if (up.error) {
      setMsg(up.error.message)
      setSaving(false)
      return
    }
    const row = {
      league_month_id: month.id,
      team_id: base.teamId,
      week_number: week,
      submitted_by: base.userId,
      image_path: path,
      hole_scores: scores,
      hole_pars: pars,
      stableford_points: sf,
      raw_stableford: raw,
      bonus_birdies: bonusBirdies,
      bonus_points: bonus,
      handicap_points: handicap,
      official_total: official,
      status: 'pending',
    }
    const { data: inserted, error } = await supabase.from('round_score_submissions').insert(row).select('id,status').single()
    if (error) {
      await supabase.storage.from('round-scorecards').remove([path])
      setMsg(error.code === '23505' ? 'A scorecard has already been submitted for this round. A second submission is not allowed.' : error.message)
    } else {
      setExisting({ kind: 'submission', status: inserted.status, id: inserted.id })
      setMsg('Scorecard submitted. It is now awaiting admin approval.')
    }
    setSaving(false)
  }

  if (!base || !month) return <PlayerPage title="Submit Score"><div className="simple-mobile-page"><h1>Submit Score</h1><p>{msg || 'Loading your round…'}</p></div></PlayerPage>

  const roundText = `${monthLabel(month)} · Week ${week}`
  const blocked = !!existing

  return <PlayerPage title="Submit Score"><div className="simple-mobile-page submit-score-page">
    <h1>Submit Score</h1>
    <div className="card">
      <h2>{base.teamName}</h2>
      <p><strong>{roundText}</strong></p>
      {!changeRound ? <button type="button" className="text-link-button" onClick={() => setChangeRound(true)}>Change Round</button> : <div className="round-picker">
        <label className="field">League Month<select value={monthId} onChange={e => { setMonthId(e.target.value); setFile(null); setPreview(''); setScores(Array(18).fill(null)); setPars(Array(18).fill(null)) }}>{base.months.map(m => <option key={m.id} value={m.id}>{monthLabel(m)}</option>)}</select></label>
        <label className="field">Week<select value={week} onChange={e => { setWeek(Number(e.target.value)); setFile(null); setPreview(''); setScores(Array(18).fill(null)); setPars(Array(18).fill(null)) }}>{[1, 2, 3, 4].map(w => <option key={w} value={w}>Week {w}</option>)}</select></label>
        <button type="button" className="text-link-button" onClick={() => setChangeRound(false)}>Done</button>
      </div>}

      {blocked ? <div className="round-submission-status">
        <h3>{existing?.kind === 'official' || existing?.status === 'approved' ? 'Round Complete ✓' : 'Awaiting Admin Approval'}</h3>
        <p>{existing?.kind === 'official' || existing?.status === 'approved' ? 'This round already has an official score. Another scorecard cannot be submitted for the same round.' : 'A scorecard has already been submitted for this round. Another submission is not allowed while it is awaiting admin approval.'}</p>
        {existing?.id && <a className="btn secondary" href={`/rounds/${existing.id}`}>View Scorecard</a>}
      </div> : <>
        <p className="muted">Take a clear photo of the final GSPro scorecard. The app will read it automatically, then you confirm the numbers.</p>
        <div className="score-photo-actions">
          <label className="btn score-photo-btn">Take Scorecard Photo<input hidden type="file" accept="image/*" capture="environment" onChange={e => e.target.files?.[0] && choose(e.target.files[0])} /></label>
          <label className="btn secondary score-photo-btn">Choose from Photos<input hidden type="file" accept="image/*" onChange={e => e.target.files?.[0] && choose(e.target.files[0])} /></label>
        </div>
      </>}
    </div>

    {reading && <div className="score-processing-card card" role="status" aria-live="polite">
      <h2>Processing Scorecard</h2>
      <div className="score-processing-percent">{processingPercent}%</div>
      <div className="score-processing-track"><span style={{ width: `${processingPercent}%` }} /></div>
      <p className="muted">Reading the GSPro scorecard and calculating the round…</p>
    </div>}

    {!reading && preview && !blocked && <div className="card"><img className="score-preview" src={preview} alt="Scorecard preview" />{msg && <p className="message">{msg}</p>}</div>}

    {!reading && file && !blocked && <div className="card">
      <h2>Verify Scores</h2>
      <p className="muted">Only the 10 scoring holes and this month's two bonus holes are shown. Correct any strokes the automatic reader missed before submitting.</p>
      <div className="score-entry-grid score-entry-grid-v1280">
        <b>Hole</b><b>Par</b><b>Strokes</b><b>Score</b><b>Pts</b>
        {includedHoles.map(h => {
          const i = h - 1
          const isMain = h <= 10
          const isBonus = bonusHoles.includes(h)
          const isBonusBirdie = isBonus && !!scores[i] && !!pars[i] && scores[i] === pars[i]! - 1
          return <div className="score-entry-row score-entry-row-v1280" key={h}>
            <span>{h}{isBonus ? ' ★' : ''}</span>
            <input inputMode="numeric" value={pars[i] ?? ''} onChange={e => setPars(v => v.map((x, j) => j === i ? (e.target.value ? Number(e.target.value) : null) : x))} />
            <input inputMode="numeric" value={scores[i] ?? ''} onChange={e => setScores(v => v.map((x, j) => j === i ? (e.target.value ? Number(e.target.value) : null) : x))} />
            <strong className="score-result-name">{scoreName(scores[i], pars[i])}</strong>
            <strong>{isMain && scores[i] && pars[i] ? stablefordPoints(scores[i]!, pars[i]!) : isBonusBirdie ? `+${bonusValue}` : '—'}</strong>
          </div>
        })}
      </div>
      <div className="round-calc">
        <p>Raw Stableford <b>{raw}</b></p>
        <p>Bonus Birdies <b>{bonusBirdies} (+{bonus.toFixed(1)})</b></p>
        <p>Monthly Handicap <b>{handicap >= 0 ? '+' : ''}{handicap.toFixed(1)}</b></p>
        <p className="official">Calculated Round Score <b>{official.toFixed(1)}</b></p>
      </div>
      <button className="btn" disabled={saving || reading} onClick={submit}>{saving ? 'Submitting…' : '✓ Scores Are Correct — Submit'}</button>
      {msg && <p className="message">{msg}</p>}
    </div>}
  </div></PlayerPage>
}
