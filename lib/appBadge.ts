export async function syncAppBadge(count:number){
  const safe=Math.max(0,Math.floor(Number(count)||0))
  try{
    if('setAppBadge' in navigator && typeof (navigator as any).setAppBadge==='function'){
      if(safe>0) await (navigator as any).setAppBadge(safe)
      else if('clearAppBadge' in navigator) await (navigator as any).clearAppBadge()
    }
  }catch{}
  try{
    const registration=await navigator.serviceWorker?.ready
    registration?.active?.postMessage({type:'SET_MESSAGE_BADGE',count:safe})
  }catch{}
}
