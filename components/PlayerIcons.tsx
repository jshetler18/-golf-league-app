import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  viewBox: '0 0 64 64',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})


export function ReserveIcon(props: IconProps){
  return <svg {...base(props)}><rect x="10" y="14" width="44" height="40" rx="4"/><path d="M10 25h44M21 8v12M43 8v12"/><path d="M32 31v16M24 39h16"/></svg>
}

export function CalendarIcon(props: IconProps){
  return <svg {...base(props)}><rect x="10" y="14" width="44" height="40" rx="4"/><path d="M10 25h44M21 8v12M43 8v12"/><circle cx="21" cy="35" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="35" r="2" fill="currentColor" stroke="none"/><circle cx="43" cy="35" r="2" fill="currentColor" stroke="none"/><circle cx="21" cy="45" r="2" fill="currentColor" stroke="none"/><circle cx="32" cy="45" r="2" fill="currentColor" stroke="none"/><circle cx="43" cy="45" r="2" fill="currentColor" stroke="none"/></svg>
}

export function StandingsIcon(props: IconProps){
  return <svg {...base(props)}><rect x="11" y="38" width="9" height="16" rx="2" fill="currentColor" stroke="none"/><rect x="27" y="27" width="9" height="27" rx="2" fill="currentColor" stroke="none"/><rect x="43" y="15" width="9" height="39" rx="2" fill="currentColor" stroke="none"/></svg>
}

export function TrophyIcon(props: IconProps){
  return <svg {...base(props)}><path d="M21 12h22v11c0 10-5 17-11 20-6-3-11-10-11-20V12Z"/><path d="M21 18H12c0 9 4 15 12 16M43 18h9c0 9-4 15-12 16M32 43v8M22 54h20"/><path d="m32 20 3 6 7 .8-5 4.8 1.5 6.9L32 35l-6.5 3.5L27 31.6l-5-4.8 7-.8 3-6Z" fill="currentColor" stroke="none"/></svg>
}

export function MatchPlayIcon(props: IconProps){
  return <svg {...base(props)}><circle cx="15" cy="20" r="7"/><circle cx="49" cy="20" r="7"/><path d="M4 51c1-12 5-18 11-18s10 6 11 18M60 51c-1-12-5-18-11-18s-10 6-11 18"/></svg>
}

export function MessagesIcon(props: IconProps){
  return <svg {...base(props)}><path d="M9 13h46v31H31L18 54v-10H9V13Z" fill="currentColor" stroke="none"/><circle cx="21" cy="29" r="3" fill="white" stroke="none"/><circle cx="32" cy="29" r="3" fill="white" stroke="none"/><circle cx="43" cy="29" r="3" fill="white" stroke="none"/></svg>
}

export function ChatIcon(props: IconProps){
  return <svg {...base(props)}><path d="M8 12h33v24H22L12 44v-8H8V12Z"/><path d="M29 29h27v19H45l-9 7v-7h-7V29Z"/><circle cx="18" cy="24" r="2" fill="currentColor" stroke="none"/><circle cx="27" cy="24" r="2" fill="currentColor" stroke="none"/><circle cx="40" cy="38" r="2" fill="currentColor" stroke="none"/><circle cx="48" cy="38" r="2" fill="currentColor" stroke="none"/></svg>
}

export function FlagIcon(props: IconProps){
  return <svg {...base(props)}><path d="M18 56V9"/><path d="M20 10h29l-7 10 7 10H20Z" fill="currentColor" stroke="none"/><path d="M9 56h20"/></svg>
}

export function TeamsIcon(props: IconProps){
  return <svg {...base(props)}><circle cx="23" cy="22" r="9" fill="currentColor" stroke="none"/><circle cx="43" cy="24" r="8" fill="currentColor" stroke="none"/><path d="M8 52c0-11 6-17 15-17s15 6 15 17H8Z" fill="currentColor" stroke="none"/><path d="M36 52c0-9 4-14 11-14 7 0 11 5 11 14H36Z" fill="currentColor" stroke="none"/></svg>
}



export function LiveIcon(props: IconProps){
  return <svg {...base(props)}><rect x="9" y="14" width="46" height="36" rx="6"/><path d="m27 24 14 8-14 8Z" fill="currentColor" stroke="none"/><path d="M17 8h30"/></svg>
}

export function HistoryIcon(props: IconProps){
  return <svg {...base(props)}><path d="M14 10h31a5 5 0 0 1 5 5v39H19a5 5 0 0 1-5-5V10Z"/><path d="M14 45h31a5 5 0 0 1 5 5"/><circle cx="31" cy="28" r="10"/><path d="M31 22v7l5 3"/></svg>
}

export function RulesIcon(props: IconProps){
  return <svg {...base(props)}><path d="M15 8h25l10 10v38H15V8Z" fill="currentColor" stroke="none"/><path d="M40 8v12h10" stroke="white"/><path d="M23 29h19M23 38h19M23 47h14" stroke="white" strokeWidth="3.5"/></svg>
}


export function SubmitScoreIcon(props: IconProps){
  return <svg {...base(props)}><path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h5M8 16h3"/><path d="m14 15 1.5 1.5L19 13"/></svg>
}

export function HomeIcon(props: IconProps){
  return <svg {...base(props)}><path d="M8 30 32 9l24 21"/><path d="M14 28v25h14V39h8v14h14V28" fill="currentColor" stroke="none"/></svg>
}
