'use client'

import {useCallback,useEffect,useMemo,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'

type LiveStatus={configured:boolean;isLive:boolean;videoId?:string;title?:string;liveHeadline?:string;liveSubtext?:string;error?:string}
type Recording={videoId:string;title:string;thumbnail?:string;publishedAt?:string;duration?:string;team?:string;month?:string;year?:number;roundNumber?:number;roundText?:string;season?:string;rawScore?:number}
type ArchiveResponse={configured:boolean;recordings:Recording[];filters:{teams:string[];seasons:string[];months:string[];rounds:number[]};error?:string}

function durationText(value?:string){
  if(!value)return ''
  const m=value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if(!m)return ''
  const h=Number(m[1]||0),min=Number(m[2]||0),sec=Number(m[3]||0)
  return h?`${h}:${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${min}:${String(sec).padStart(2,'0')}`
}

export default function LivePage(){
  const [status,setStatus]=useState<LiveStatus|null>(null)
  const [archive,setArchive]=useState<ArchiveResponse|null>(null)
  const [team,setTeam]=useState('all'),[season,setSeason]=useState('all'),[month,setMonth]=useState('all'),[round,setRound]=useState('all')
  const [activeVideo,setActiveVideo]=useState<string>('')

  const loadLive=useCallback(async()=>{
    try{const res=await fetch('/api/youtube/live',{cache:'no-store'});setStatus(await res.json())}
    catch{setStatus({configured:true,isLive:false,error:'Unable to check the livestream right now.'})}
  },[])
  const loadArchive=useCallback(async()=>{
    try{const res=await fetch('/api/youtube/recordings');setArchive(await res.json())}
    catch{setArchive({configured:true,recordings:[],filters:{teams:[],seasons:[],months:[],rounds:[]},error:'Unable to load recorded rounds right now.'})}
  },[])

  useEffect(()=>{loadLive();loadArchive();const timer=window.setInterval(loadLive,60000);const visible=()=>{if(document.visibilityState==='visible'){loadLive();loadArchive()}};document.addEventListener('visibilitychange',visible);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)}},[loadLive,loadArchive])

  const filtered=useMemo(()=>{
    const items=(archive?.recordings||[]).filter(x=>x.videoId!==status?.videoId)
    return items.filter(x=>(team==='all'||x.team===team)&&(season==='all'||x.season===season)&&(month==='all'||x.month===month)&&(round==='all'||String(x.roundNumber)===round))
  },[archive,status?.videoId,team,season,month,round])
  const grouped=useMemo(()=>{
    const map=new Map<string,Recording[]>()
    for(const video of filtered){
      const key=video.season||'Other Recordings'
      if(!map.has(key))map.set(key,[])
      map.get(key)!.push(video)
    }
    return [...map.entries()].sort(([a],[b])=>{
      if(a==='Other Recordings')return 1
      if(b==='Other Recordings')return -1
      return b.localeCompare(a)
    })
  },[filtered])
  const hasFilters=team!=='all'||season!=='all'||month!=='all'||round!=='all'
  function clearFilters(){setTeam('all');setSeason('all');setMonth('all');setRound('all');setActiveVideo('')}

  return <PlayerPage title="">
    <div className="simple-mobile-page recorded-page-v1265">
      <div className="live-title-row-v1260"><h1>Recorded Rounds</h1>{status?.isLive&&<span className="live-pulse-badge-v1260"><i/>LIVE</span>}</div>

      {!status&&<section className="card live-offline-card-v1260"><p>Checking the channel…</p></section>}
      {status?.isLive&&status.videoId?<section className="live-player-card-v1260 recorded-live-card-v1265">
        <div className="live-video-wrap-v1260"><iframe src={`https://www.youtube.com/embed/${encodeURIComponent(status.videoId)}?playsinline=1&rel=0`} title={status.title||'Tom’s 19th Hole Live'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
        <div className="live-stream-copy-v1260"><span className="live-pulse-badge-v1260"><i/>LIVE NOW</span><h2>{status.liveHeadline||status.title||'League Round is LIVE!'}</h2>{status.liveSubtext&&status.liveSubtext!=='Tap to watch'&&<p>{status.liveSubtext}</p>}</div>
      </section>:status&&<section className="recorded-offline-v1265">
        <span className="recorded-offline-dot-v1265"/><div><strong>No live broadcasts at this time</strong><small>Past recorded rounds are available below.</small></div>
      </section>}

      <section className="recorded-archive-v1265">
        <div className="recorded-section-head-v1265"><div><h2>Round Archive</h2><p>Find a recorded round by team, season, month, or round.</p></div>{hasFilters&&<button onClick={clearFilters}>Clear Filters</button>}</div>
        <div className="recorded-filters-v1265">
          <label>Team<select value={team} onChange={e=>{setTeam(e.target.value);setActiveVideo('')}}><option value="all">All Teams</option>{archive?.filters.teams.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Season<select value={season} onChange={e=>{setSeason(e.target.value);setActiveVideo('')}}><option value="all">All Seasons</option>{archive?.filters.seasons.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Month<select value={month} onChange={e=>{setMonth(e.target.value);setActiveVideo('')}}><option value="all">All Months</option>{archive?.filters.months.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Round<select value={round} onChange={e=>{setRound(e.target.value);setActiveVideo('')}}><option value="all">All Rounds</option>{archive?.filters.rounds.map(x=><option key={x} value={String(x)}>Round {x}</option>)}</select></label>
        </div>

        {archive&&!archive.error&&<div className="recorded-count-v1267">{filtered.length} recorded round{filtered.length===1?'':'s'} found</div>}
        {!archive&&<div className="recorded-empty-v1265">Loading recorded rounds…</div>}
        {archive?.error&&<div className="recorded-empty-v1265">{archive.error}</div>}
        {archive&&!archive.error&&filtered.length===0&&<div className="recorded-empty-v1265">{hasFilters?'No recorded rounds match those filters.':'No recorded rounds have been identified yet.'}</div>}

        {grouped.map(([seasonName,videos])=><div className="recorded-season-v1267" key={seasonName}>
          <h3>{seasonName==='Other Recordings'?seasonName:`${seasonName} Season`}</h3>
          <div className="recorded-grid-v1265">
            {videos.map(video=><article className="recorded-card-v1265" key={video.videoId}>
              {activeVideo===video.videoId?<div className="recorded-video-v1265 recorded-active-video-v1267"><iframe src={`https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}?playsinline=1&rel=0&autoplay=1`} title={`${video.team||'Recorded round'} ${video.roundText||''}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>:
              <button className="recorded-thumb-v1267" onClick={()=>setActiveVideo(video.videoId)} aria-label={`Play ${video.team||video.title} ${video.roundText||''}`}>
                {video.thumbnail?<img src={video.thumbnail} alt="" loading="lazy"/>:<span className="recorded-thumb-fallback-v1267">Recorded Round</span>}
                {typeof video.rawScore==='number'&&Number.isFinite(video.rawScore)&&<span className="recorded-score-v1267"><small>RAW SCORE</small><strong>{Number.isInteger(video.rawScore)?video.rawScore:video.rawScore.toFixed(1)}</strong></span>}
                <span className="recorded-play-v1267">▶</span>
                {durationText(video.duration)&&<span className="recorded-duration-v1267">{durationText(video.duration)}</span>}
              </button>}
              <div className="recorded-card-copy-v1265"><strong>{video.team||video.title}</strong>{(video.roundText||video.team)&&<span>{video.roundText||video.title}</span>}{video.season&&<small>Season {video.season}</small>}</div>
            </article>)}
          </div>
        </div>)}
        {filtered.some(v=>typeof v.rawScore==='number')&&<div className="recorded-score-note-v1267">Raw Score shown is the official score saved for that team, month, and round. If a recording cannot be matched confidently, no score badge is shown.</div>}
      </section>
    </div>
  </PlayerPage>
}
