import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

export const runtime='nodejs'

function clients(token:string){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL!
 const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
 const secret=process.env.SUPABASE_SECRET_KEY!
 const auth=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
 const admin=createClient(url,secret,{auth:{persistSession:false}})
 return {auth,admin}
}

async function authorize(req:NextRequest){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
 if(!token)return null
 const {auth,admin}=clients(token)
 const {data:{user}}=await auth.auth.getUser(token)
 if(!user)return null
 const {data:p}=await admin.from('profiles').select('role,status,is_account_approver').eq('id',user.id).maybeSingle()
 if(!p||p.status!=='approved'||(p.role!=='admin'&&!p.is_account_approver))return null
 return {admin,user,isAdmin:p.role==='admin'}
}

export async function GET(req:NextRequest){
 try{
  const access=await authorize(req)
  if(!access)return NextResponse.json({error:'Account approval access required.'},{status:403})
  const {data,error}=await access.admin.from('profiles')
   .select('id,full_name,email,status,created_at')
   .eq('status','pending')
   .order('created_at',{ascending:true})
  if(error)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({rows:data||[],count:(data||[]).length})
 }catch(e:any){return NextResponse.json({error:e?.message||'Unable to load pending accounts.'},{status:500})}
}
