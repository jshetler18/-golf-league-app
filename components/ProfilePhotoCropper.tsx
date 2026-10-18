'use client';
import {useEffect,useRef,useState} from 'react';

type Props={file:File;onCancel:()=>void;onApply:(blob:Blob)=>Promise<void>;busy:boolean};
const SIZE=280;
export default function ProfilePhotoCropper({file,onCancel,onApply,busy}:Props){
 const [url,setUrl]=useState('');
 const [imageSize,setImageSize]=useState({width:1,height:1});
 const [zoom,setZoom]=useState(1);
 const [position,setPosition]=useState({x:0,y:0});
 const [error,setError]=useState('');
 const imageRef=useRef<HTMLImageElement|null>(null);
 const startRef=useRef<{x:number;y:number;px:number;py:number}|null>(null);
 useEffect(()=>{
  const next=URL.createObjectURL(file);
  setUrl(next);setZoom(1);setPosition({x:0,y:0});setError('');
  return()=>URL.revokeObjectURL(next);
 },[file]);
 const baseScale=Math.max(SIZE/imageSize.width,SIZE/imageSize.height);
 const imageWidth=imageSize.width*baseScale*zoom;
 const imageHeight=imageSize.height*baseScale*zoom;
 const clamp=(p:{x:number;y:number},w=imageWidth,h=imageHeight)=>({
   x:Math.max((SIZE-w)/2,Math.min((w-SIZE)/2,p.x)),
   y:Math.max((SIZE-h)/2,Math.min((h-SIZE)/2,p.y))
 });
 function pointerDown(e:React.PointerEvent<HTMLDivElement>){
  if(busy)return;
  e.currentTarget.setPointerCapture(e.pointerId);
  startRef.current={x:e.clientX,y:e.clientY,px:position.x,py:position.y};
 }
 function pointerMove(e:React.PointerEvent<HTMLDivElement>){
  if(!startRef.current||busy)return;
  const origin=startRef.current;
  setPosition(clamp({x:origin.px+e.clientX-origin.x,y:origin.py+e.clientY-origin.y}));
 }
 function pointerEnd(){startRef.current=null}
 function changeZoom(value:number){
  const w=imageSize.width*baseScale*value;
  const h=imageSize.height*baseScale*value;
  setZoom(value);setPosition(p=>clamp(p,w,h));
 }
 async function apply(){
  const img=imageRef.current;
  if(!img||!img.complete||!img.naturalWidth){setError('Photo is still loading. Please try again.');return}
  const canvas=document.createElement('canvas');
  canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');
  if(!ctx){setError('Your browser could not process this photo.');return}
  const scale=512/SIZE;
  const x=(SIZE-imageWidth)/2+position.x;
  const y=(SIZE-imageHeight)/2+position.y;
  ctx.fillStyle='#fff';ctx.fillRect(0,0,512,512);
  ctx.drawImage(img,x*scale,y*scale,imageWidth*scale,imageHeight*scale);
  const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.9));
  if(!blob){setError('Could not save the adjusted photo.');return}
  setError('');
  await onApply(blob);
 }
 return <div className="volunteer-crop-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget&&!busy)onCancel()}}>
  <section className="volunteer-crop-dialog" role="dialog" aria-modal="true" aria-label="Adjust profile photo">
   <h2>Position Your Profile Photo</h2>
   <p>Drag the picture to center your face. Use the zoom slider to adjust the size.</p>
   <div className="volunteer-crop-view" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
    {url&&<img ref={imageRef} src={url} alt="Photo to adjust" draggable={false} onLoad={e=>{
      setImageSize({width:e.currentTarget.naturalWidth,height:e.currentTarget.naturalHeight});
      setPosition({x:0,y:0});
    }} style={{width:imageWidth,height:imageHeight,left:(SIZE-imageWidth)/2+position.x,top:(SIZE-imageHeight)/2+position.y}}/>}
   </div>
   <label className="volunteer-crop-zoom">Zoom <input type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>changeZoom(Number(e.target.value))} disabled={busy}/></label>
   {error&&<p className="alert" role="alert">{error}</p>}
   <div className="volunteer-crop-actions">
    <button type="button" onClick={()=>void apply()} disabled={busy}>{busy?'Saving Photo…':'Use This Photo'}</button>
    <button type="button" className="secondary" onClick={onCancel} disabled={busy}>Cancel</button>
   </div>
  </section>
 </div>;
}
