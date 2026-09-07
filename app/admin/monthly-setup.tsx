'use client'
import { useEffect,useMemo,useState } from 'react'
import { supabase } from '@/lib/supabase'

type Team={id:string;name:string;captain_player_id:string|null}
type Player={id:string;team_id:string|null;full_name:string;official_tee_color:string|null}
type CourseTee={color:string;yardage:string}
type CourseProfile={
 id:string;course_name:string;course_location:string|null;bonus_hole_1:number|null;bonus_hole_2:number|null;bonus_birdie_value:number;
 elevation_ft:number;stimp_options:string[];gimmie_feet:number;wind:string;greens:string;fairways:string;mulligans:boolean;
 pins_week_1:string;pins_week_2:string;pins_week_3:string;pins_week_4:string
}
type MonthRow={id:string;month_start:string;course_profile_id:string|null}

const months=[['2026-11-01','November'],['2026-12-01','December'],['2027-01-01','January'],['2027-02-01','February'],['2027-03-01','March'],['2027-04-01','April']]
const teeLevels=[
 {key:'turquoise',label:'Forward'},{key:'red',label:'Senior'},{key:'yellow',label:'Middle'},{key:'blue',label:'Back'},{key:'black',label:'Tips'},
]
const teeColors=['Black','Blue','Gold','Green','Orange','Purple','Red','Turquoise','Gray','White','Yellow']
const defaultPins:Record<number,string>={1:'Thursday',2:'Friday',3:'Saturday',4:'Sunday'}
const pinDayOptions=['Thursday','Friday','Saturday','Sunday']
const normalizeOfficial=(color:string|null)=>{const c=(color||'').toLowerCase();if(c==='green')return 'yellow';if(c==='gray')return 'blue';return c}

export default function MonthlySetup({seasonId,teams,players}:{seasonId:string;teams:Team[];players:Player[]}){
 const [mode,setMode]=useState<'courses'|'months'>('courses')
 const [profiles,setProfiles]=useState<CourseProfile[]>([])
 const [profileId,setProfileId]=useState('')
 const [course,setCourse]=useState('');const [courseLocation,setCourseLocation]=useState('')
 const [b1,setB1]=useState(11);const [b2,setB2]=useState(12);const [bonus,setBonus]=useState(.1)
 const [pins,setPins]=useState<Record<number,string>>({...defaultPins})
 const [elevation,setElevation]=useState(2000);const [gimmie,setGimmie]=useState(5);const [wind,setWind]=useState('None');const [greens,setGreens]=useState('Normal');const [fairways,setFairways]=useState('Normal');const [mulligans,setMulligans]=useState(false)
 const [courseTees,setCourseTees]=useState<Record<string,CourseTee>>({})
 const [monthStart,setMonthStart]=useState(months[0][0]);const [monthId,setMonthId]=useState('');const [assignedProfileId,setAssignedProfileId]=useState('')
 const [handicaps,setHandicaps]=useState<Record<string,string>>({});const [playerTeeLevels,setPlayerTeeLevels]=useState<Record<string,string>>({})
 const [msg,setMsg]=useState('')

 const activePlayers=useMemo(()=>players.filter(p=>p.team_id),[players])
 const playersByTeam=useMemo(()=>teams.map(team=>({team,players:activePlayers.filter(p=>p.team_id===team.id).sort((a,b)=>(a.id===team.captain_player_id?-1:b.id===team.captain_player_id?1:a.full_name.localeCompare(b.full_name)))})).filter(g=>g.players.length),[teams,activePlayers])

 async function loadProfiles(selectId?:string){
   const {data,error}=await supabase.from('course_profiles').select('*').order('course_name')
   if(error){setMsg(error.message);return}
   const list=(data||[]) as CourseProfile[];setProfiles(list)
   if(selectId!==undefined)setProfileId(selectId)
 }
 useEffect(()=>{loadProfiles()},[])

 function resetCourse(){
   setProfileId('');setCourse('');setCourseLocation('');setB1(11);setB2(12);setBonus(.1);setPins({...defaultPins});setElevation(2000);setGimmie(5);setWind('None');setGreens('Normal');setFairways('Normal');setMulligans(false);setCourseTees({});setMsg('')
 }
 async function loadProfile(id:string){
   setProfileId(id);setMsg('')
   if(!id){resetCourse();return}
   const p=profiles.find(x=>x.id===id);if(!p)return
   setCourse(p.course_name);setCourseLocation(p.course_location||'');setB1(p.bonus_hole_1||11);setB2(p.bonus_hole_2||12);setBonus(Number(p.bonus_birdie_value))
   setPins({1:p.pins_week_1||'Thursday',2:p.pins_week_2||'Friday',3:p.pins_week_3||'Saturday',4:p.pins_week_4||'Sunday'})
   setElevation(p.elevation_ft);setGimmie(p.gimmie_feet);setWind(p.wind);setGreens(p.greens);setFairways(p.fairways);setMulligans(p.mulligans)
   const {data:tees}=await supabase.from('course_profile_tee_boxes').select('tee_level,course_tee_color,yardage').eq('course_profile_id',id)
   setCourseTees(Object.fromEntries((tees||[]).map(t=>[t.tee_level,{color:t.course_tee_color,yardage:String(t.yardage)}])))
 }
 async function saveCourse(){
   if(!course.trim()){setMsg('Enter the course name first.');return}
   if(b1===b2){setMsg('Choose two different bonus holes.');return}
   const incomplete=teeLevels.filter(l=>courseTees[l.key]&&(!courseTees[l.key].color.trim()||!courseTees[l.key].yardage))
   if(incomplete.length){setMsg('Each course tee entry needs both a tee color/name and yardage.');return}
   setMsg('Saving course…')
   const payload={course_name:course.trim(),course_location:courseLocation.trim()||null,bonus_hole_1:b1,bonus_hole_2:b2,bonus_birdie_value:bonus,elevation_ft:elevation,stimp_options:['10','11'],gimmie_feet:gimmie,wind,greens,fairways,mulligans,pins_week_1:pins[1],pins_week_2:pins[2],pins_week_3:pins[3],pins_week_4:pins[4],updated_at:new Date().toISOString()}
   let id=profileId
   if(id){
     const {error}=await supabase.from('course_profiles').update(payload).eq('id',id);if(error){setMsg(error.message);return}
   }else{
     const {data,error}=await supabase.from('course_profiles').insert(payload).select('id').single();if(error){setMsg(error.message);return};id=data.id;setProfileId(id)
   }
   const teeRows=teeLevels.filter(l=>courseTees[l.key]?.color.trim()&&courseTees[l.key]?.yardage).map(l=>({course_profile_id:id,tee_level:l.key,course_tee_color:courseTees[l.key].color.trim(),yardage:Number(courseTees[l.key].yardage),updated_at:new Date().toISOString()}))
   if(teeRows.length){const {error}=await supabase.from('course_profile_tee_boxes').upsert(teeRows,{onConflict:'course_profile_id,tee_level'});if(error){setMsg(error.message);return}}
   const used=teeRows.map(r=>r.tee_level);const unused=teeLevels.filter(l=>!used.includes(l.key)).map(l=>l.key)
   if(unused.length)await supabase.from('course_profile_tee_boxes').delete().eq('course_profile_id',id).in('tee_level',unused)
   await loadProfiles(id);setMsg('Course setup saved. You can now assign this course to any league month.')
 }

 async function loadMonth(){
   if(!seasonId)return;setMsg('')
   const {data:m}=await supabase.from('league_months').select('id,month_start,course_profile_id').eq('season_id',seasonId).eq('month_start',monthStart).maybeSingle()
   if(!m){setMonthId('');setAssignedProfileId('');setHandicaps({});setPlayerTeeLevels({});return}
   const x=m as MonthRow;setMonthId(x.id);setAssignedProfileId(x.course_profile_id||'')
   const [{data:h},{data:ct},{data:ta}]=await Promise.all([
     supabase.from('monthly_team_handicaps').select('team_id,handicap_points').eq('league_month_id',x.id),
     supabase.from('course_tee_boxes').select('tee_level,course_tee_color,yardage').eq('league_month_id',x.id),
     supabase.from('tee_assignments').select('player_id,tee_color,yardage').eq('league_month_id',x.id)
   ])
   setHandicaps(Object.fromEntries((h||[]).map(v=>[v.team_id,String(v.handicap_points)])))
   const saved:Record<string,string>={}
   for(const a of (ta||[])){const match=(ct||[]).find(v=>v.course_tee_color.trim().toLowerCase()===String(a.tee_color||'').trim().toLowerCase()&&Number(v.yardage)===Number(a.yardage));if(match)saved[a.player_id]=match.tee_level}
   setPlayerTeeLevels(saved)
 }
 useEffect(()=>{if(mode==='months')loadMonth()},[mode,seasonId,monthStart])

 async function profileTees(id:string){
   const {data}=await supabase.from('course_profile_tee_boxes').select('tee_level,course_tee_color,yardage').eq('course_profile_id',id)
   return data||[]
 }
 async function saveMonth(){
   if(!assignedProfileId){
     if(!monthId){setMsg('This month does not currently have a course assigned.');return}
     setMsg('Removing course from month…')
     const {error}=await supabase.from('league_months').delete().eq('id',monthId)
     if(error){setMsg(`Course assignment was not removed: ${error.message}`);return}
     setMonthId('');setAssignedProfileId('');setHandicaps({});setPlayerTeeLevels({});setMonthTees({})
     setMsg(`${months.find(m=>m[0]===monthStart)?.[1]} is now unassigned. It will no longer appear in Monthly Settings until a course is assigned.`)
     return
   }
   const cp=profiles.find(p=>p.id===assignedProfileId);if(!cp){setMsg('Course setup could not be found.');return}
   setMsg('Assigning course to month…')
   const payload={season_id:seasonId,month_start:monthStart,course_profile_id:cp.id,course_name:cp.course_name,course_location:cp.course_location,bonus_hole_1:cp.bonus_hole_1,bonus_hole_2:cp.bonus_hole_2,bonus_birdie_value:cp.bonus_birdie_value,elevation_ft:cp.elevation_ft,stimp_options:cp.stimp_options,gimmie_feet:cp.gimmie_feet,wind:cp.wind,greens:cp.greens,fairways:cp.fairways,mulligans:cp.mulligans,pins_week_1:cp.pins_week_1,pins_week_2:cp.pins_week_2,pins_week_3:cp.pins_week_3,pins_week_4:cp.pins_week_4,round_pin_days:[cp.pins_week_1,cp.pins_week_2,cp.pins_week_3,cp.pins_week_4]}
   let id=monthId
   if(id){const {error}=await supabase.from('league_months').update(payload).eq('id',id);if(error){setMsg(error.message);return}}
   else{const {data,error}=await supabase.from('league_months').insert(payload).select('id').single();if(error){setMsg(error.message);return};id=data.id;setMonthId(id)}
   const pts=await profileTees(cp.id)
   await supabase.from('course_tee_boxes').delete().eq('league_month_id',id)
   if(pts.length){const {error}=await supabase.from('course_tee_boxes').insert(pts.map(t=>({league_month_id:id,tee_level:t.tee_level,course_tee_color:t.course_tee_color,yardage:t.yardage})));if(error){setMsg(error.message);return}}
   const hs=teams.filter(t=>handicaps[t.id]!==undefined&&handicaps[t.id]!=='NA').map(t=>({league_month_id:id,team_id:t.id,handicap_points:Number(handicaps[t.id])}))
   const na=teams.filter(t=>(handicaps[t.id]??'NA')==='NA').map(t=>t.id)
   if(na.length)await supabase.from('monthly_team_handicaps').delete().eq('league_month_id',id).in('team_id',na)
   if(hs.length){const {error}=await supabase.from('monthly_team_handicaps').upsert(hs,{onConflict:'league_month_id,team_id'});if(error){setMsg(error.message);return}}
   const teeMap=Object.fromEntries(pts.map(t=>[t.tee_level,t]))
   const assignments=activePlayers.map(p=>{const level=playerTeeLevels[p.id]??normalizeOfficial(p.official_tee_color);const tee=teeMap[level];return tee?{league_month_id:id,player_id:p.id,tee_color:tee.course_tee_color,yardage:tee.yardage}:null}).filter(Boolean)
   await supabase.from('tee_assignments').delete().eq('league_month_id',id)
   if(assignments.length){const {error}=await supabase.from('tee_assignments').insert(assignments as any);if(error){setMsg(error.message);return}}
   await loadMonth();setMsg(`${cp.course_name} is assigned to ${months.find(m=>m[0]===monthStart)?.[1]}.`)
 }

 const assignedProfile=profiles.find(p=>p.id===assignedProfileId)
 const [monthTees,setMonthTees]=useState<Record<string,CourseTee>>({})
 useEffect(()=>{(async()=>{if(!assignedProfileId){setMonthTees({});return};const rows=await profileTees(assignedProfileId);setMonthTees(Object.fromEntries(rows.map(t=>[t.tee_level,{color:t.course_tee_color,yardage:String(t.yardage)}])))})()},[assignedProfileId])
 const selectedTeeLevel=(p:Player)=>playerTeeLevels[p.id]??normalizeOfficial(p.official_tee_color)

 return <section>
   <div className="section-title"><div><h2>League Courses &amp; Monthly Setup</h2><p className="muted">Build each course once, then assign it to the month it will be played.</p></div></div>
   <div className="card">
     <div className="admin-course-tabs-v1366">
       <button className={`btn ${mode==='courses'?'primary':''}`} onClick={()=>{setMode('courses');setMsg('')}}>Course Setup</button>
       <button className={`btn ${mode==='months'?'primary':''}`} onClick={()=>{setMode('months');setMsg('')}}>Assign Courses to Months</button>
     </div>

     {mode==='courses'&&<>
       <h3>Course Setup</h3><p className="muted">Set up the course completely without choosing a league month. You can reuse this course in any season or month.</p>
       <div className="form-grid">
         <label className="field">Saved Course<select value={profileId} onChange={e=>loadProfile(e.target.value)}><option value="">+ New Course</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.course_name}{p.course_location?` — ${p.course_location}`:''}</option>)}</select></label>
         <label className="field">Course Name<input value={course} onChange={e=>setCourse(e.target.value)} placeholder="Course name"/></label>
         <label className="field">Course Location<input value={courseLocation} onChange={e=>setCourseLocation(e.target.value)} placeholder="City, State"/></label>
         <label className="field">Bonus Par-3 Hole #1<select value={b1} onChange={e=>setB1(Number(e.target.value))}>{[11,12,13,14,15,16,17,18].map(n=><option key={n}>{n}</option>)}</select></label>
         <label className="field">Bonus Par-3 Hole #2<select value={b2} onChange={e=>setB2(Number(e.target.value))}>{[11,12,13,14,15,16,17,18].map(n=><option key={n}>{n}</option>)}</select></label>
         <label className="field">Bonus Birdie Value<input type="number" step="0.1" value={bonus} onChange={e=>setBonus(Number(e.target.value))}/></label>
       </div>
       <h3>Weekly Pin Settings</h3><div className="form-grid">{[1,2,3,4].map(w=><label className="field" key={w}>Week {w} Pins<select value={pins[w]} onChange={e=>setPins(v=>({...v,[w]:e.target.value}))}>{pinDayOptions.map(day=><option key={day}>{day}</option>)}</select></label>)}</div>
       <h3>Simulator Settings</h3><div className="form-grid">
         <label className="field">Elevation (ft)<input type="number" value={elevation} onChange={e=>setElevation(Number(e.target.value))}/></label>
         <label className="field">Stimp<input value="10 or 11 — team choice" disabled/></label>
         <label className="field">Gimmies (ft)<input type="number" value={gimmie} onChange={e=>setGimmie(Number(e.target.value))}/></label>
         <label className="field">Wind<input value={wind} onChange={e=>setWind(e.target.value)}/></label><label className="field">Greens<input value={greens} onChange={e=>setGreens(e.target.value)}/></label><label className="field">Fairways<input value={fairways} onChange={e=>setFairways(e.target.value)}/></label>
         <label className="field">Mulligans<select value={mulligans?'on':'off'} onChange={e=>setMulligans(e.target.value==='on')}><option value="off">Off</option><option value="on">On</option></select></label>
       </div>
       <h3>Course Tee Boxes &amp; Yardages</h3><p className="muted">Map each league tee level to this course's actual tee color and yardage.</p>
       <div className="course-tee-grid-v1344">{teeLevels.map(l=><div className="course-tee-row-v1344" key={l.key}><strong>{l.label}</strong><label className="field">Course Tee Color<select value={courseTees[l.key]?.color||''} onChange={e=>setCourseTees(v=>({...v,[l.key]:{color:e.target.value,yardage:v[l.key]?.yardage||''}}))}><option value="">Select color</option>{teeColors.map(c=><option key={c}>{c}</option>)}</select></label><label className="field">Yardage<input type="number" value={courseTees[l.key]?.yardage||''} onChange={e=>setCourseTees(v=>({...v,[l.key]:{color:v[l.key]?.color||'',yardage:e.target.value}}))}/></label></div>)}</div>
       <p><button className="btn" onClick={saveCourse}>{profileId?'Save Course Changes':'Save New Course'}</button></p>
     </>}

     {mode==='months'&&<>
       <h3>Assign Courses to Months</h3><p className="muted">Choose a league month, then select one of your fully configured courses. Its course, pin, simulator, and tee settings will be applied automatically.</p>
       <div className="form-grid">
         <label className="field">League Month<select value={monthStart} onChange={e=>setMonthStart(e.target.value)}>{months.map(m=><option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></label>
         <label className="field">Course<select value={assignedProfileId} onChange={e=>{setAssignedProfileId(e.target.value);setPlayerTeeLevels({})}}><option value="">Select course</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.course_name}{p.course_location?` — ${p.course_location}`:''}</option>)}</select></label>
       </div>
       {assignedProfile&&<div className="course-assignment-summary-v1366"><strong>{assignedProfile.course_name}</strong>{assignedProfile.course_location&&<small>{assignedProfile.course_location}</small>}<span>Course settings are ready to apply to {months.find(m=>m[0]===monthStart)?.[1]}.</span></div>}
       <h3>Team Handicaps</h3><p className="muted">Handicaps remain month-specific.</p><div className="form-grid">{teams.map(t=><label className="field" key={t.id}>{t.name}<select value={handicaps[t.id]??'NA'} onChange={e=>setHandicaps(v=>({...v,[t.id]:e.target.value}))}><option value="NA">NA</option>{Array.from({length:11},(_,n)=><option key={n} value={String(n)}>{n}</option>)}</select></label>)}</div>
       <h3>Course Tee Box Key &amp; Yardages</h3><p className="muted">These are the tee boxes and yardages configured for the selected course.</p>
       {assignedProfileId?<div className="course-tee-key-admin-v1367">{teeLevels.filter(l=>monthTees[l.key]?.color&&monthTees[l.key]?.yardage).map(l=>{const tee=monthTees[l.key];return <div className="course-tee-key-row-admin-v1367" key={l.key}><span className="course-tee-key-level-admin-v1367">{l.label}</span><span className="course-tee-key-color-admin-v1367"><span className="course-tee-key-square-admin-v1367" style={{background:tee.color}}/>{tee.color}</span><strong>{Number(tee.yardage).toLocaleString()} yd</strong></div>})}</div>:<p className="muted">Select a course above to view its tee boxes and yardages.</p>}
       <h3>Player Tee Box Assignments</h3><p className="muted">Players default to their Official Tee Box. Override a player here only for this selected month.</p>
       <div className="player-team-groups-v1344">{playersByTeam.map(({team,players:roster})=><section className="player-team-group-v1344" key={team.id}><h4>{team.name}</h4><div className="table-wrap"><table><thead><tr><th>Player</th><th>Monthly Tee Box</th><th>Course Tee</th><th>Yardage</th></tr></thead><tbody>{roster.map(p=>{const level=selectedTeeLevel(p);const tee=monthTees[level];const available=teeLevels.filter(l=>monthTees[l.key]?.color&&monthTees[l.key]?.yardage);return <tr key={p.id}><td>{p.full_name}{p.id===team.captain_player_id&&<span className="captain-mark-v1357"> (C)</span>}</td><td><select value={level||''} onChange={e=>setPlayerTeeLevels(v=>({...v,[p.id]:e.target.value}))}><option value="">Not set</option>{available.map(l=><option key={l.key} value={l.key}>{l.label}</option>)}</select></td><td>{tee?.color||'—'}</td><td>{tee?.yardage?`${Number(tee.yardage).toLocaleString()} yd`:'—'}</td></tr>})}</tbody></table></div></section>)}</div>
       <p><button className="btn" onClick={saveMonth}>{!assignedProfileId&&monthId?'Remove Month Assignment':'Save Month Assignment'}</button></p>
     </>}
     {msg&&<p className="message">{msg}</p>}
   </div>
 </section>
}
