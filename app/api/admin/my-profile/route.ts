import {NextRequest,NextResponse} from 'next/server'
import {createClient} from '@supabase/supabase-js'

export async function PATCH(req:NextRequest){
  try{
    const token=(req.headers.get('authorization')||'').replace(/^Bearer /,'')
    if(!token)return NextResponse.json({error:'Not signed in.'},{status:401})
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL!
    const pub=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const secret=process.env.SUPABASE_SECRET_KEY!
    const authClient=createClient(url,pub,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false}})
    const {data:{user}}=await authClient.auth.getUser(token)
    if(!user)return NextResponse.json({error:'Invalid sign-in.'},{status:401})
    const {data:profile}=await authClient.from('profiles').select('role,status').eq('id',user.id).maybeSingle()
    if(profile?.role!=='admin'||profile?.status!=='approved')return NextResponse.json({error:'Administrator access required.'},{status:403})

    const body=await req.json()
    const email=String(body?.email||'').trim().toLowerCase()
    const password=body?.password?String(body.password):''
    if(!email||!email.includes('@'))return NextResponse.json({error:'Enter a valid username / email.'},{status:400})
    if(password&&password.length<6)return NextResponse.json({error:'Password must be at least 6 characters.'},{status:400})

    const admin=createClient(url,secret,{auth:{persistSession:false}})
    const attrs:any={email,email_confirm:true}
    if(password)attrs.password=password
    const {error:updateError}=await admin.auth.admin.updateUserById(user.id,attrs)
    if(updateError)return NextResponse.json({error:updateError.message},{status:400})
    const {error:profileError}=await admin.from('profiles').update({email}).eq('id',user.id)
    if(profileError)return NextResponse.json({error:profileError.message},{status:400})
    return NextResponse.json({ok:true,email})
  }catch(e:any){
    return NextResponse.json({error:e?.message||'Unable to update administrator login.'},{status:500})
  }
}
