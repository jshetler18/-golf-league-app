'use client'

import {useCallback,useEffect,useState} from 'react'
import {PlayerPage} from '@/components/PlayerMobileChrome'

type LiveStatus={configured:boolean;isLive:boolean;videoId?:string;title?:string;startedAt?:string;error?:string}

export default function LivePage(){
  const [status,setStatus]=useState<LiveStatus|null>(null)
  const load=useCallback(async()=>{
    try{
      const res=await fetch('/api/youtube/live',{cache:'no-store'})
      const json=await res.json()
      setStatus(json)
    }catch{
      setStatus({configured:true,isLive:false,error:'Unable to check the livestream right now.'})
    }
  },[])
  useEffect(()=>{load();const timer=window.setInterval(load,60000);const visible=()=>{if(document.visibilityState==='visible')load()};document.addEventListener('visibilitychange',visible);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',visible)}},[load])

  return <PlayerPage title="">
    <div className="simple-mobile-page live-page-v1260">
      <div className="live-title-row-v1260">
        <h1>Live</h1>
        {status?.isLive&&<span className="live-pulse-badge-v1260"><i/>LIVE</span>}
      </div>
      {!status&&<section className="card live-offline-card-v1260"><p>Checking the channel…</p></section>}
      {status?.isLive&&status.videoId?<>
        <section className="live-player-card-v1260">
          <div className="live-video-wrap-v1260"><iframe src={`https://www.youtube.com/embed/${encodeURIComponent(status.videoId)}?playsinline=1&rel=0`} title={status.title||'Tom’s 19th Hole Live'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
          <div className="live-stream-copy-v1260"><span className="live-pulse-badge-v1260"><i/>LIVE NOW</span><h2>{status.title||'Tom’s 19th Hole Live'}</h2></div>
        </section>
      </>:status&&<section className="card live-offline-card-v1260">
        <div className="live-offline-icon-v1260">▶</div>
        <h2>No Live Broadcast Right Now</h2>
        <p>{status.configured===false?'The YouTube live connection is being finished.':'When @Toms19thHole goes live, the stream will appear here automatically.'}</p>
        {status.error&&<small>{status.error}</small>}
      </section>}
    </div>
  </PlayerPage>
}
