'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Team = {
  id: string
  name: string
}

type Month = {
  id: string
  month_start: string
}

type CupPoint = {
  league_month_id: string
  team_id: string
  points: number
  placement: number | null
}

const MONTH_ORDER = [11, 12, 1, 2, 3, 4]
const MONTH_LABELS = ['NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR']

export default function CupTV() {
  const [teams, setTeams] = useState<Team[]>([])
  const [months, setMonths] = useState<Month[]>([])
  const [points, setPoints] = useState<CupPoint[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .eq('is_closed', false)
      .limit(1)
      .maybeSingle()

    if (!season) {
      setLoading(false)
      return
    }

    const [{ data: teamData }, { data: monthData }] = await Promise.all([
      supabase
        .from('teams')
        .select('id,name')
        .eq('season_id', season.id)
        .eq('is_active', true)
        .order('name'),

      supabase
        .from('league_months')
        .select('id,month_start')
        .eq('season_id', season.id),
    ])

    const sortedMonths = ((monthData || []) as Month[]).sort((a, b) => {
      const aMonth = new Date(a.month_start + 'T12:00:00').getMonth() + 1
      const bMonth = new Date(b.month_start + 'T12:00:00').getMonth() + 1

      return MONTH_ORDER.indexOf(aMonth) - MONTH_ORDER.indexOf(bMonth)
    })

    setTeams((teamData || []) as Team[])
    setMonths(sortedMonths)

    const monthIds = sortedMonths.map(m => m.id)

    if (monthIds.length) {
      const { data: cupData } = await supabase
        .from('cup_points')
        .select('league_month_id,team_id,points,placement')
        .in('league_month_id', monthIds)

      setPoints((cupData || []) as CupPoint[])
    } else {
      setPoints([])
    }

    setLoading(false)
  }

  useEffect(() => {
    let alive = true

    const initialLoad = async () => {
      if (alive) await load()
    }

    initialLoad()

    const channel = supabase
      .channel('cup-tv-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cup_points',
        },
        () => load()
      )
      .subscribe()

    // Safety refresh in case the TV briefly loses Wi-Fi.
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        load()
      }
    }, 60000)

    const recover = () => load()

    window.addEventListener('online', recover)
    document.addEventListener('visibilitychange', recover)

    return () => {
      alive = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('online', recover)
      document.removeEventListener('visibilitychange', recover)
      supabase.removeChannel(channel)
    }
  }, [])

  const rows = useMemo(() => {
    return teams
      .map(team => {
        const byMonth = months.map(month => {
          const record = points.find(
            p =>
              p.team_id === team.id &&
              p.league_month_id === month.id
          )

          return record ? Number(record.points) : null
        })

        const total = byMonth.reduce<number>(
          (sum, value) => sum + (value ?? 0),
          0
        )

        return {
          team,
          byMonth,
          total,
        }
      })
      .sort(
        (a, b) =>
          b.total - a.total ||
          a.team.name.localeCompare(b.team.name)
      )
  }, [teams, months, points])

  if (loading) {
    return (
      <main
        style={{
          width: '100vw',
          height: '100vh',
          background: '#001a2d',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '42px',
          fontWeight: 900,
        }}
      >
        LOADING CUP STANDINGS...
      </main>
    )
  }

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        boxSizing: 'border-box',
        background:
          'linear-gradient(180deg, #00172a 0%, #002238 100%)',
        color: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: '0 28px',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          position: 'relative',
          height: '150px',
          width: '100%',
          flexShrink: 0,
        }}
      >
        {/* LOGO */}
        <img
          src="/tom-krise-logo.png"
          alt="Tom Krise 19th Hole Golf Simulator"
          style={{
            position: 'absolute',
            left: '20px',
            top: '8px',
            width: '190px',
            height: '130px',
            objectFit: 'contain',
          }}
        />

        {/* TRUE SCREEN-CENTERED TITLE */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '18px',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            width: '950px',
            maxWidth: '70vw',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              color: '#8fe018',
              fontSize: '34px',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '1px',
            }}
          >
            TOM KRISE 19TH HOLE GOLF LEAGUE
          </div>

          <div
            style={{
              color: '#ffffff',
              fontSize: '62px',
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: '2px',
              marginTop: '10px',
              textShadow: '0 3px 4px rgba(0,0,0,.55)',
            }}
          >
            CUP STANDINGS
          </div>
        </div>
      </header>

      {/* STANDINGS TABLE */}
      <section
        style={{
          height: 'calc(100vh - 150px)',
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: '30px repeat(10, minmax(0, 1fr))',
          border: '1px solid #8fe018',
          borderRadius: '10px 10px 0 0',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {/* COLUMN HEADERS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '82px 320px repeat(6, minmax(100px, 1fr)) 120px',
            background:
              'linear-gradient(180deg, #327d13 0%, #1d5e0d 100%)',
            color: '#ffffff',
            alignItems: 'center',
            fontWeight: 900,
            fontSize: '23px',
            textShadow: '0 2px 2px rgba(0,0,0,.55)',
          }}
        >
          <span style={{ textAlign: 'center' }}>RANK</span>
          <span style={{ textAlign: 'center' }}>TEAM</span>

          {MONTH_LABELS.map(month => (
            <span
              key={month}
              style={{
                textAlign: 'center',
                borderLeft: '1px solid rgba(143,224,24,.4)',
              }}
            >
              {month}
            </span>
          ))}

          <span
            style={{
              textAlign: 'center',
              borderLeft: '1px solid rgba(143,224,24,.4)',
            }}
          >
            TOTAL
          </span>
        </div>

        {/* TEAM ROWS */}
        {rows.slice(0, 10).map((row, index) => (
          <div
            key={row.team.id}
            style={{
              display: 'grid',
              gridTemplateColumns:
                '82px 320px repeat(6, minmax(100px, 1fr)) 120px',
              alignItems: 'center',
              minHeight: 0,
              borderTop: '1px solid rgba(143,224,24,.55)',
              background:
                index % 2 === 0
                  ? 'rgba(0,35,57,.96)'
                  : 'rgba(0,29,48,.96)',
            }}
          >
            {/* RANK */}
            <span
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                fontWeight: 900,
                borderRight: '1px solid rgba(143,224,24,.45)',
              }}
            >
              {index + 1}
            </span>

            {/* TEAM */}
            <span
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                paddingLeft: '34px',
                boxSizing: 'border-box',
                fontSize: '31px',
                fontWeight: 900,
                whiteSpace: 'nowrap',
                borderRight: '1px solid rgba(143,224,24,.45)',
              }}
            >
              {row.team.name.toUpperCase()}
            </span>

            {/* MONTHLY CUP POINTS */}
            {MONTH_LABELS.map((label, monthIndex) => {
              const value = row.byMonth[monthIndex]

              return (
                <span
                  key={label}
                  style={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '30px',
                    fontWeight: 800,
                    borderRight:
                      '1px solid rgba(143,224,24,.45)',
                  }}
                >
                  {value === null
                    ? '—'
                    : value.toLocaleString()}
                </span>
              )
            })}

            {/* TOTAL */}
            <span
              style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '31px',
                fontWeight: 900,
              }}
            >
              {row.total.toLocaleString()}
            </span>
          </div>
        ))}
      </section>
    </main>
  )
}
