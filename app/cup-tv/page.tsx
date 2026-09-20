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

type Matchup = {
  id: string
  league_month_id: string
  team_high_id: string
  team_low_id: string
  winner_team_id: string | null
  high_points_awarded: number | null
  low_points_awarded: number | null
}

const MONTH_ORDER = [11, 12, 1, 2, 3, 4]
const MONTH_LABELS = ['NOV', 'DEC', 'JAN', 'FEB', 'MAR', 'APR']

export default function CupTV() {
  const [teams, setTeams] = useState<Team[]>([])
  const [months, setMonths] = useState<Month[]>([])
  const [matchups, setMatchups] = useState<Matchup[]>([])

  const load = async () => {
    const { data: season } = await supabase
      .from('seasons')
      .select('id')
      .eq('is_active', true)
      .eq('is_closed', false)
      .limit(1)
      .maybeSingle()

    if (!season) return

    const [{ data: teamData }, { data: monthData }] = await Promise.all([
      supabase
        .from('teams')
        .select('id,name')
        .eq('season_id', season.id)
        .order('name'),
      supabase
        .from('league_months')
        .select('id,month_start')
        .eq('season_id', season.id)
        .order('month_start')
    ])

    const activeMonths = (monthData || []) as Month[]
    const monthIds = activeMonths.map(m => m.id)

    let matchupData: Matchup[] = []

    if (monthIds.length > 0) {
      const { data } = await supabase
        .from('week4_matchups')
        .select(
          'id,league_month_id,team_high_id,team_low_id,winner_team_id,high_points_awarded,low_points_awarded'
        )
        .in('league_month_id', monthIds)

      matchupData = (data || []) as Matchup[]
    }

    setTeams((teamData || []) as Team[])
    setMonths(activeMonths)
    setMatchups(matchupData)
  }

  useEffect(() => {
    load()

    const channel = supabase
      .channel('cup-tv-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'week4_matchups'
        },
        () => load()
      )
      .subscribe()

    const refreshTimer = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        navigator.onLine
      ) {
        load()
      }
    }, 60000)

    const recover = () => load()

    window.addEventListener('online', recover)
    document.addEventListener('visibilitychange', recover)

    return () => {
      supabase.removeChannel(channel)
      window.clearInterval(refreshTimer)
      window.removeEventListener('online', recover)
      document.removeEventListener('visibilitychange', recover)
    }
  }, [])

  const orderedMonths = useMemo(() => {
    return [...months].sort((a, b) => {
      const aMonth = new Date(a.month_start + 'T12:00:00').getMonth() + 1
      const bMonth = new Date(b.month_start + 'T12:00:00').getMonth() + 1

      return (
        MONTH_ORDER.indexOf(aMonth) -
        MONTH_ORDER.indexOf(bMonth)
      )
    })
  }, [months])

  const rows = useMemo(() => {
    return teams
      .map(team => {
        const monthly = orderedMonths.map(month => {
          return matchups
            .filter(m => m.league_month_id === month.id)
            .reduce((total, matchup) => {
              if (matchup.team_high_id === team.id) {
                return total + Number(matchup.high_points_awarded || 0)
              }

              if (matchup.team_low_id === team.id) {
                return total + Number(matchup.low_points_awarded || 0)
              }

              return total
            }, 0)
        })

        while (monthly.length < 6) {
          monthly.push(0)
        }

        const sixMonths = monthly.slice(0, 6)
        const total = sixMonths.reduce((sum, points) => sum + points, 0)

        return {
          team,
          monthly: sixMonths,
          total
        }
      })
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total
        return a.team.name.localeCompare(b.team.name)
      })
      .map((row, index) => ({
        ...row,
        rank: index + 1
      }))
  }, [teams, orderedMonths, matchups])

  return (
    <main
      className="tv-approved"
      style={{
        height: '100vh',
        minHeight: 0,
        overflow: 'hidden',
        padding: '10px 18px',
        boxSizing: 'border-box'
      }}
    >
      <header className="tv-approved-header">
        <div className="tv-approved-logo">
          <img
            src="/tom-krise-logo.png"
            alt="Tom Krise 19th Hole Golf Simulator"
          />
        </div>

        <div className="tv-approved-titles">
          <div className="tv-approved-league">
            TOM KRISE 19TH HOLE GOLF LEAGUE
          </div>
          <h1>CUP STANDINGS</h1>
        </div>

        <div className="tv-approved-divider" />

        <div className="tv-approved-meta">
          <div className="tv-approved-month">
            SEASON STANDINGS
          </div>
          <div className="tv-approved-week">
            CUP POINTS
          </div>
        </div>
      </header>

      <section
        className="tv-approved-table"
        style={{
          display: 'grid',
          gridTemplateRows: 'auto repeat(10, minmax(0, 1fr))',
          height: 'calc(100vh - 125px)',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >
        <div
          className="tv-approved-row tv-approved-head"
          style={{
            gridTemplateColumns:
              '70px 2fr repeat(6, minmax(70px, 1fr)) 1.15fr'
          }}
        >
          <span>RANK</span>
          <span>TEAM</span>

          {MONTH_LABELS.map(month => (
            <span key={month}>{month}</span>
          ))}

          <span>TOTAL</span>
        </div>

        {rows.slice(0, 10).map(row => (
          <div
            className="tv-approved-row"
            key={row.team.id}
            style={{
              gridTemplateColumns:
                '70px 2fr repeat(6, minmax(70px, 1fr)) 1.15fr'
            }}
          >
            <span className="tv-approved-rank">
              {row.rank}
            </span>

            <span className="tv-approved-team">
              {row.team.name.toUpperCase()}
            </span>

            {row.monthly.map((points, index) => (
              <span key={MONTH_LABELS[index]}>
                {points > 0
                  ? Number(points).toLocaleString()
                  : '—'}
              </span>
            ))}

            <span style={{ fontWeight: 800 }}>
              {Number(row.total).toLocaleString()}
            </span>
          </div>
        ))}
      </section>
    </main>
  )
}
