import {NextResponse} from 'next/server'
import {getVapidPublicKey} from '@/lib/vapid'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export function GET(){
 try{return NextResponse.json({publicKey:getVapidPublicKey()},{headers:{'Cache-Control':'no-store'}})}
 catch{return NextResponse.json({error:'Push unavailable'},{status:503})}
}
