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

    const [{ data: teamData }, { data: monthData }] =
      await Promise.all([
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

    const sortedMonths = ((monthData || []) as Month[]).sort(
      (a, b) => {
        const aMonth =
          new Date(
            a.month_start + 'T12:00:00'
          ).getMonth() + 1

        const bMonth =
          new Date(
            b.month_start + 'T12:00:00'
          ).getMonth() + 1

        return (
          MONTH_ORDER.indexOf(aMonth) -
          MONTH_ORDER.indexOf(bMonth)
        )
      }
    )

    setTeams((teamData || []) as Team[])
    setMonths(sortedMonths)

    const monthIds =
      sortedMonths.map(month => month.id)

    if (monthIds.length) {
      const { data: cupData } = await supabase
        .from('cup_points')
        .select(
          'league_month_id,team_id,points,placement'
        )
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
      if (alive) {
        await load()
      }
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

    const refreshTimer =
      window.setInterval(() => {
        if (
          document.visibilityState === 'visible' &&
          navigator.onLine
        ) {
          load()
        }
      }, 60000)

    const recover = () => load()

    window.addEventListener('online', recover)

    document.addEventListener(
      'visibilitychange',
      recover
    )

    return () => {
      alive = false

      window.clearInterval(refreshTimer)

      window.removeEventListener(
        'online',
        recover
      )

      document.removeEventListener(
        'visibilitychange',
        recover
      )

      supabase.removeChannel(channel)
    }
  }, [])

  /*
   * Determine the latest month that has
   * at least one Cup points record.
   */
  const latestMonthIndex = useMemo(() => {
    let latest = -1

    MONTH_ORDER.forEach(
      (monthNumber, index) => {
        const month = months.find(
          m =>
            new Date(
              m.month_start + 'T12:00:00'
            ).getMonth() +
              1 ===
            monthNumber
        )

        if (!month) return

        const hasPoints =
          points.some(
            p =>
              p.league_month_id ===
              month.id
          )

        if (hasPoints) {
          latest = index
        }
      }
    )

    return latest
  }, [months, points])

  /*
   * Check whether EVERY active team has
   * Cup points posted for the latest month.
   *
   * Until this is true, movement stays —.
   */
  const latestMonthComplete =
    useMemo(() => {
      if (
        latestMonthIndex < 0 ||
        teams.length === 0
      ) {
        return false
      }

      const monthNumber =
        MONTH_ORDER[latestMonthIndex]

      const month = months.find(
        m =>
          new Date(
            m.month_start + 'T12:00:00'
          ).getMonth() +
            1 ===
          monthNumber
      )

      if (!month) {
        return false
      }

      return teams.every(team =>
        points.some(
          point =>
            point.team_id === team.id &&
            point.league_month_id ===
              month.id
        )
      )
    }, [
      teams,
      months,
      points,
      latestMonthIndex,
    ])

  /*
   * Build cumulative standings through
   * a particular month.
   */
  const standingsThrough = (
    throughIndex: number
  ) => {
    return teams
      .map(team => {
        let total = 0

        MONTH_ORDER.forEach(
          (monthNumber, index) => {
            if (index > throughIndex) {
              return
            }

            const month = months.find(
              m =>
                new Date(
                  m.month_start +
                    'T12:00:00'
                ).getMonth() +
                  1 ===
                monthNumber
            )

            if (!month) return

            const point = points.find(
              p =>
                p.team_id === team.id &&
                p.league_month_id ===
                  month.id
            )

            if (point) {
              total += Number(point.points)
            }
          }
        )

        return {
          id: team.id,
          name: team.name,
          total,
        }
      })
      .sort(
        (a, b) =>
          b.total - a.total ||
          a.name.localeCompare(b.name)
      )
  }

  /*
   * Competition ranking.
   *
   * Example:
   *
   * 1600 = Rank 1
   * 1600 = Rank 1
   * 1400 = Rank 3
   * 1400 = Rank 3
   * 1000 = Rank 5
   */
  const addRanks = (
    list: {
      id: string
      name: string
      total: number
    }[]
  ) => {
    return list.map(row => {
      const firstIndex =
        list.findIndex(
          other =>
            other.total === row.total
        )

      return {
        ...row,
        rank: firstIndex + 1,
      }
    })
  }

  /*
   * Previous month's cumulative rankings.
   *
   * These are used for the movement
   * indicators once the newest month
   * is complete.
   */
  const previousRanks =
    useMemo(() => {
      const map =
        new Map<string, number>()

      if (latestMonthIndex > 0) {
        addRanks(
          standingsThrough(
            latestMonthIndex - 1
          )
        ).forEach(row => {
          map.set(row.id, row.rank)
        })
      }

      return map
    }, [
      teams,
      months,
      points,
      latestMonthIndex,
    ])

  /*
   * Build the displayed Cup standings.
   */
  const rows = useMemo(() => {
    const displayRows = teams
      .map(team => {
        const byMonth =
          MONTH_ORDER.map(
            monthNumber => {
              const month =
                months.find(
                  m =>
                    new Date(
                      m.month_start +
                        'T12:00:00'
                    ).getMonth() +
                      1 ===
                    monthNumber
                )

              if (!month) return null

              const point =
                points.find(
                  p =>
                    p.team_id ===
                      team.id &&
                    p.league_month_id ===
                      month.id
                )

              return point
                ? Number(point.points)
                : null
            }
          )

        const total =
          byMonth.reduce<number>(
            (sum, value) =>
              sum + (value ?? 0),
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
          a.team.name.localeCompare(
            b.team.name
          )
      )

    return displayRows.map(row => {
      const firstIndex =
        displayRows.findIndex(
          other =>
            other.total === row.total
        )

      const rank =
        firstIndex + 1

      const oldRank =
        previousRanks.get(
          row.team.id
        )

      /*
       * November always shows — because
       * there is no previous Cup month.
       *
       * For December-April, movement only
       * activates once ALL teams have points
       * for the latest month.
       */
      const change =
        latestMonthIndex > 0 &&
        latestMonthComplete &&
        oldRank != null
          ? oldRank - rank
          : 0

      return {
        ...row,
        rank,
        change,
      }
    })
  }, [
    teams,
    months,
    points,
    previousRanks,
    latestMonthIndex,
    latestMonthComplete,
  ])

  if (loading) {
    return (
      <main className="cup-tv-screen">
        <div className="cup-tv-loading">
          LOADING CUP STANDINGS...
        </div>

        <style jsx>{`
          .cup-tv-screen {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            background: #001a2d;
            color: white;
            z-index: 99999;
          }

          .cup-tv-loading {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font: 900 3vw Arial, Helvetica,
              sans-serif;
          }
        `}</style>
      </main>
    )
  }

  return (
    <main className="cup-tv-screen">

      <header className="cup-tv-header">

        <img
          className="cup-tv-logo"
          src="/tom-krise-logo.png"
          alt="Tom Krise 19th Hole Golf Simulator"
        />

        <div className="cup-tv-title">

          <div className="cup-tv-league">
            TOM KRISE 19TH HOLE GOLF LEAGUE
          </div>

          <div className="cup-tv-heading">
            CUP STANDINGS
          </div>

        </div>

      </header>

      <section className="cup-tv-table">

        <div className="cup-tv-row cup-tv-table-head">

          <span>RANK</span>

          <span>TEAM</span>

          {MONTH_LABELS.map(month => (
            <span key={month}>
              {month}
            </span>
          ))}

          <span>TOTAL</span>

        </div>

        {rows
          .slice(0, 10)
          .map(row => (

            <div
              className="cup-tv-row cup-tv-team-row"
              key={row.team.id}
            >

              <span className="cup-tv-rank">
                {row.rank}
              </span>

              <span className="cup-tv-team">
                {row.team.name.toUpperCase()}
              </span>

              {row.byMonth.map(
                (value, monthIndex) => (

                  <span
                    className="cup-tv-points"
                    key={
                      MONTH_LABELS[
                        monthIndex
                      ]
                    }
                  >

                    {value === null
                      ? '—'
                      : value.toLocaleString()}

                  </span>

                )
              )}

              <span className="cup-tv-total">

                <b>
                  {row.total.toLocaleString()}
                </b>

                <i
                  className={
                    row.change > 0
                      ? 'up'
                      : row.change < 0
                      ? 'down'
                      : ''
                  }
                >

                  {row.change > 0
                    ? '▲ ' + row.change
                    : row.change < 0
                    ? '▼ ' +
                      Math.abs(row.change)
                    : '—'}

                </i>

              </span>

            </div>

          ))}

      </section>

      <style jsx>{`
        .cup-tv-screen {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          box-sizing: border-box;
          z-index: 99999;

          background: linear-gradient(
            180deg,
            #00172a 0%,
            #002238 100%
          );

          color: #ffffff;

          font-family:
            Arial,
            Helvetica,
            sans-serif;

          padding: 0 2vw;
        }

        .cup-tv-header {
          position: relative;
          width: 100%;
          height: 17vh;
          min-height: 0;
        }

        .cup-tv-logo {
          position: absolute;
          left: 1.5vw;
          top: 1vh;
          width: 12vw;
          height: 15vh;
          object-fit: contain;
        }

        .cup-tv-title {
          position: absolute;
          left: 50%;
          top: 2.5vh;

          transform:
            translateX(-50%);

          width: 72vw;

          text-align: center;

          white-space: nowrap;
        }

        .cup-tv-league {
          color: #8fe018;

          font-size: 2.15vw;
          line-height: 1;

          font-weight: 900;

          letter-spacing: 0.06vw;
        }

        .cup-tv-heading {
          color: #fff;

          font-size: 4vw;
          line-height: 1;

          font-weight: 900;

          letter-spacing: 0.12vw;

          margin-top: 1vh;

          text-shadow:
            0 0.25vh 0.3vh
            rgba(0, 0, 0, 0.6);
        }

        .cup-tv-table {
          width: 100%;
          height: 83vh;

          min-height: 0;

          display: grid;

          grid-template-rows:
            3.3vh
            repeat(
              10,
              minmax(0, 1fr)
            );

          box-sizing: border-box;

          overflow: hidden;

          border:
            1px solid #8fe018;

          border-radius:
            0.7vw 0.7vw 0 0;
        }

        /*
         * Monthly columns are slightly
         * narrower than before so TOTAL
         * has enough room for both the
         * total and movement indicator.
         *
         * Total = 100%
         */
        .cup-tv-row {
          width: 100%;
          min-width: 0;
          min-height: 0;

          display: grid;

          grid-template-columns:
            5.2%
            20.8%
            repeat(6, 9.4%)
            17.6%;

          box-sizing: border-box;
        }

        .cup-tv-row > span {
          min-width: 0;
          min-height: 0;

          display: flex;

          align-items: center;
          justify-content: center;

          box-sizing: border-box;

          overflow: hidden;
        }

        .cup-tv-table-head {
          align-items: center;

          background:
            linear-gradient(
              180deg,
              #397f13 0%,
              #1c620c 100%
            );

          color: white;

          font-size: 1.35vw;

          font-weight: 900;

          line-height: 1;

          text-shadow:
            0 0.15vh 0.15vh
            rgba(0, 0, 0, 0.6);
        }

        .cup-tv-table-head
          > span + span {
          border-left:
            1px solid
            rgba(
              143,
              224,
              24,
              0.4
            );
        }

        .cup-tv-team-row {
          border-top:
            1px solid
            rgba(
              143,
              224,
              24,
              0.55
            );

          background:
            rgba(
              0,
              31,
              51,
              0.96
            );
        }

        .cup-tv-team-row:nth-child(odd) {
          background:
            rgba(
              0,
              37,
              59,
              0.96
            );
        }

        .cup-tv-team-row
          > span + span {
          border-left:
            1px solid
            rgba(
              143,
              224,
              24,
              0.45
            );
        }

        .cup-tv-rank {
          font-size: 2.45vw;

          font-weight: 900;
        }

        .cup-tv-team {
          justify-content:
            flex-start !important;

          padding-left: 2vw;

          white-space: nowrap;

          text-overflow: clip;

          font-size: 1.85vw;

          font-weight: 900;
        }

        .cup-tv-points {
          font-size: 1.7vw;

          font-weight: 800;

          font-variant-numeric:
            tabular-nums;
        }

        /*
         * Same TOTAL layout as the
         * monthly leaderboard.
         *
         * Total score is toward the
         * center and every movement
         * indicator gets its own
         * aligned area.
         */
        .cup-tv-total {
          display: grid !important;

          grid-template-columns:
            58% 42%;

          align-items: center;

          width: 100%;

          box-sizing: border-box;

          font-size: 1.9vw;

          font-weight: 900;

          font-variant-numeric:
            tabular-nums;
        }

        .cup-tv-total b {
          display: block;

          width: 100%;

          text-align: right;

          padding-right: 6px;

          box-sizing: border-box;

          font-size: 1.9vw;

          font-weight: 900;
        }

        .cup-tv-total i {
          display: block;

          width: 100%;

          text-align: left;

          padding-left: 12px;

          box-sizing: border-box;

          font-size: 1.45vw;

          font-style: normal;

          font-weight: 900;

          white-space: nowrap;
        }

        .cup-tv-total i.up {
          color: #8fe018;
        }

        .cup-tv-total i.down {
          color: #ff5b5b;
        }

        .cup-tv-loading {
          width: 100%;
          height: 100%;

          display: flex;

          align-items: center;
          justify-content: center;

          font-size: 3vw;

          font-weight: 900;
        }

        @media (
          max-aspect-ratio: 16/10
        ) {
          .cup-tv-league {
            font-size: 2vw;
          }

          .cup-tv-heading {
            font-size: 3.7vw;
          }

          .cup-tv-team {
            font-size: 1.7vw;
          }

          .cup-tv-points {
            font-size: 1.6vw;
          }

          .cup-tv-total b {
            font-size: 1.8vw;
          }

          .cup-tv-total i {
            font-size: 1.35vw;
          }
        }
      `}</style>

    </main>
  )
}
