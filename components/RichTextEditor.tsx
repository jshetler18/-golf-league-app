'use client'

import {useEffect,useRef} from 'react'
import {EditorContent,useEditor} from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

type Props={value:string;onChange:(value:string)=>void;placeholder?:string}

export function RichTextEditor({value,onChange,placeholder='Start typing…'}:Props){
  const latest=useRef(value)
  const editor=useEditor({
    extensions:[StarterKit],
    content:value||'',
    immediatelyRender:false,
    editorProps:{attributes:{class:'rich-edit-area-v1237', 'aria-label':'Message'}},
    onUpdate:({editor})=>{
      const html=normalizeRichText(editor.getHTML())
      latest.current=html
      onChange(html)
    },
  })
  useEffect(()=>{
    if(!editor||value===latest.current)return
    // Do not reset the editor on keystrokes or while the user is moving the caret.
    if(editor.isFocused)return
    editor.commands.setContent(value||'',{emitUpdate:false})
    latest.current=value
  },[editor,value])
  function link(){
    if(!editor)return
    const previous=editor.getAttributes('link').href||''
    const url=window.prompt('Enter a web address (https://…)',previous)?.trim()
    if(url===undefined)return
    if(!url){editor.chain().focus().unsetLink().run();return}
    if(!/^https?:\/\//i.test(url)&&!/^mailto:/i.test(url)){window.alert('Enter a full https:// web address.');return}
    editor.chain().focus().extendMarkRange('link').setLink({href:url}).run()
  }
  return <div className="rich-editor-v1237">
    <div className="rich-toolbar-v1237" role="toolbar" aria-label="Formatting tools">
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().toggleBold().run()} aria-pressed={editor?.isActive('bold')||false} title="Bold"><strong>B</strong></button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().toggleItalic().run()} aria-pressed={editor?.isActive('italic')||false} title="Italic"><em>I</em></button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().toggleUnderline().run()} aria-pressed={editor?.isActive('underline')||false} title="Underline"><u>U</u></button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().toggleHeading({level:3}).run()} title="Heading">Heading</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().toggleBulletList().run()} title="Bulleted list">• List</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().toggleOrderedList().run()} title="Numbered list">1. List</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={link} title="Add link">Link</button>
      <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>editor?.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting">Clear</button>
    </div>
    <div className="rich-tiptap-v1237" data-placeholder={placeholder}><EditorContent editor={editor}/></div>
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
  return value.replace(/&amp;nbsp;/gi,' ').replace(/&nbsp;/gi,' ').replace(/\u00a0/g,' ')
}

function escapeHtml(value:string){return value.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}

export function RichTextDisplay({value,className=''}:{value:string;className?:string}){
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{if(ref.current)ref.current.innerHTML=sanitizeRichText(value)},[value])
  return <div ref={ref} className={`rich-display-v1237 ${className}`} />
}
