export async function currentPushKey():Promise<Uint8Array>{
 const response=await fetch('/api/push/public-key',{cache:'no-store'})
 if(!response.ok)throw new Error('Push configuration is unavailable.')
 const {publicKey}=await response.json()
 const b64=(publicKey+'='.repeat((4-publicKey.length%4)%4)).replace(/-/g,'+').replace(/_/g,'/')
 return Uint8Array.from(atob(b64),c=>c.charCodeAt(0))
}
export async function ensurePushSubscription(reg:ServiceWorkerRegistration):Promise<PushSubscription>{
 const key=await currentPushKey()
 let sub=await reg.pushManager.getSubscription()
 if(sub){
  const old=sub.options.applicationServerKey
  const bytes=old?new Uint8Array(old):null
  if(!bytes||bytes.length!==key.length||bytes.some((v,i)=>v!==key[i])){
   await sub.unsubscribe()
   sub=null
  }
 }
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(key)})
 return sub
}
