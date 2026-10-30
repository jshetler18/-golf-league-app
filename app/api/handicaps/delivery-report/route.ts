import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'
export const runtime='nodejs'
export async function GET(req:NextRequest){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
 if(!token)return NextResponse.json({error:'Sign in required'},{status:401})
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,secret=process.env.SUPABASE_SECRET_KEY!
 const auth=createClient(url,pub,{auth:{persistSession:false}})
 const {data:{user}}=await auth.auth.getUser(token)
 if(!user)return NextResponse.json({error:'Invalid session'},{status:401})
 const admin=createClient(url,secret,{auth:{persistSession:false}})
 const {data:profile}=await admin.from('profiles').select('role,status').eq('id',user.id).maybeSingle()
 if(profile?.role!=='admin'||profile.status!=='approved')return NextResponse.json({error:'Admin only'},{status:403})
 const monthId=req.nextUrl.searchParams.get('monthId')
 if(!monthId)return NextResponse.json({error:'Month required'},{status:400})
 const {data,error}=await admin.from('handicap_notification_reports').select('published_at,status,eligible_users,subscribed_users,devices,accepted,failed,missing_keys,publisher_registered,publisher_accepted,publisher_failed,completed_at,error').eq('league_month_id',monthId).order('published_at',{ascending:false}).limit(1).maybeSingle()
 if(error)return NextResponse.json({error:error.message},{status:500})
 return NextResponse.json({report:data})
}
