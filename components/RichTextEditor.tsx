'use client'

import {useEffect,useRef} from 'react'

type Props={value:string;onChange:(value:string)=>void;placeholder?:string}

export function RichTextEditor({value,onChange,placeholder='Start typing…'}:Props){
  const ref=useRef<HTMLDivElement>(null)
  const cleanEditorHtml=(html:string)=>normalizeRichText(html)
  useEffect(()=>{if(ref.current&&ref.current.innerHTML!==value)ref.current.innerHTML=value},[value])
  function cmd(command:string,arg?:string){ref.current?.focus();document.execCommand(command,false,arg);onChange(cleanEditorHtml(ref.current?.innerHTML||''))}
  function link(){const url=window.prompt('Enter a web address (https://…)')?.trim();if(url)cmd('createLink',url)}
  return <div className="rich-editor-v1237">
    <div className="rich-toolbar-v1237" role="toolbar" aria-label="Formatting tools">
      <button type="button" onClick={()=>cmd('bold')} title="Bold"><strong>B</strong></button>
      <button type="button" onClick={()=>cmd('italic')} title="Italic"><em>I</em></button>
      <button type="button" onClick={()=>cmd('underline')} title="Underline"><u>U</u></button>
      <button type="button" onClick={()=>cmd('formatBlock','h3')} title="Heading">Heading</button>
      <button type="button" onClick={()=>cmd('insertUnorderedList')} title="Bulleted list">• List</button>
      <button type="button" onClick={()=>cmd('insertOrderedList')} title="Numbered list">1. List</button>
      <button type="button" onClick={link} title="Add link">Link</button>
      <button type="button" onClick={()=>cmd('removeFormat')} title="Clear formatting">Clear</button>
    </div>
    <div ref={ref} className="rich-edit-area-v1237" contentEditable suppressContentEditableWarning data-placeholder={placeholder} onInput={e=>onChange(cleanEditorHtml(e.currentTarget.innerHTML))} onPaste={e=>{e.preventDefault();const text=e.clipboardData.getData('text/plain').replace(/\u00a0/g,' ');document.execCommand('insertText',false,text)}} />
  </div>
}

export function sanitizeRichText(value:string){
  if(typeof window==='undefined')return ''
  value=normalizeRichText(value)
  if(!/[<>]/.test(value))return escapeHtml(value).replace(/\n/g,'<br>')
  const doc=new DOMParser().parseFromString(`<div>${value}</div>`,'text/html')
  const root=doc.body.firstElementChild as HTMLElement|null
  if(!root)return ''
  const allowed=new Set(['DIV','P','BR','STRONG','B','EM','I','U','UL','OL','LI','A','H2','H3','BLOCKQUOTE'])
  const walk=(node:Element)=>{
    Array.from(node.children).forEach(child=>{
      if(!allowed.has(child.tagName)){
        child.replaceWith(...Array.from(child.childNodes));
        return
      }
      Array.from(child.attributes).forEach(attr=>{
        if(child.tagName==='A'&&attr.name==='href'){
          const href=attr.value.trim();if(!/^https?:\/\//i.test(href)&&!/^mailto:/i.test(href))child.removeAttribute('href')
        }else child.removeAttribute(attr.name)
      })
      if(child.tagName==='A'&&child.getAttribute('href')){child.setAttribute('target','_blank');child.setAttribute('rel','noopener noreferrer')}
      walk(child)
    })
  }
  walk(root)
  return root.innerHTML
}

function normalizeRichText(value:string){
  let out=value.replace(/&amp;nbsp;/gi,' ').replace(/&nbsp;/gi,' ').replace(/\u00a0/g,' ')
  // Remove browser-added bold styling that can be carried in from pasted text.
  out=out.replace(/<(b|strong)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi,'$2')
  out=out.replace(/<span[^>]*style=["'][^"']*font-weight\s*:\s*(?:bold|[6-9]00)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,'$1')
  return out
}

function escapeHtml(value:string){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}

export function RichTextDisplay({value,className=''}:{value:string;className?:string}){
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(ref.current)ref.current.innerHTML=sanitizeRichText(value)},[value])
  return <div ref={ref} className={`rich-display-v1237 ${className}`} />
}
