'use client'

import {useCallback,useEffect,useMemo,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'

type LiveStatus={configured:boolean;isLive:boolean;videoId?:string;title?:string;liveHeadline?:string;liveSubtext?:string;error?:string}
type Recording={videoId:string;title:string;thumbnail?:string;publishedAt?:string;team?:string;month?:string;year?:number;roundNumber?:number;roundText?:string;season?:string}
type ArchiveResponse={configured:boolean;recordings:Recording[];filters:{teams:string[];seasons:string[];months:string[];rounds:number[]};error?:string}

export default function LivePage(){
  const [status,setStatus]=useState<LiveStatus|null>(null)
  const [archive,setArchive]=useState<ArchiveResponse|null>(null)
  const [team,setTeam]=useState('all'),[season,setSeason]=useState('all'),[month,setMonth]=useState('all'),[round,setRound]=useState('all')

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
  const hasFilters=team!=='all'||season!=='all'||month!=='all'||round!=='all'
  function clearFilters(){setTeam('all');setSeason('all');setMonth('all');setRound('all')}

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
        <div className="recorded-section-head-v1265"><div><h2>Round Archive</h2><p>Find a recorded round by team, season, month, or round.</p></div>{hasFilters&&<button onClick={clearFilters}>Clear</button>}</div>
        <div className="recorded-filters-v1265">
          <label>Team<select value={team} onChange={e=>setTeam(e.target.value)}><option value="all">All Teams</option>{archive?.filters.teams.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Season<select value={season} onChange={e=>setSeason(e.target.value)}><option value="all">All Seasons</option>{archive?.filters.seasons.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Month<select value={month} onChange={e=>setMonth(e.target.value)}><option value="all">All Months</option>{archive?.filters.months.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Round<select value={round} onChange={e=>setRound(e.target.value)}><option value="all">All Rounds</option>{archive?.filters.rounds.map(x=><option key={x} value={String(x)}>Round {x}</option>)}</select></label>
        </div>

        {!archive&&<div className="recorded-empty-v1265">Loading recorded rounds…</div>}
        {archive?.error&&<div className="recorded-empty-v1265">{archive.error}</div>}
        {archive&&!archive.error&&filtered.length===0&&<div className="recorded-empty-v1265">{hasFilters?'No recorded rounds match those filters.':'No recorded rounds have been identified yet.'}</div>}
        <div className="recorded-grid-v1265">
          {filtered.map(video=><article className="recorded-card-v1265" key={video.videoId}>
            <div className="recorded-video-v1265"><iframe src={`https://www.youtube.com/embed/${encodeURIComponent(video.videoId)}?playsinline=1&rel=0`} title={`${video.team||'Recorded round'} ${video.roundText||''}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
            <div className="recorded-card-copy-v1265"><strong>{video.team||video.title}</strong><span>{video.roundText||video.title}</span>{video.season&&<small>Season {video.season}</small>}</div>
          </article>)}
        </div>
      </section>
    </div>
  </PlayerPage>
}
