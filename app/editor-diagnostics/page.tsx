'use client'
import {useState} from 'react'
import {RichTextEditor} from '@/components/RichTextEditor'

export default function EditorDiagnostics(){
 const [value,setValue]=useState('')
 const [results,setResults]=useState<string[]>([])
 function run(){
  const root=document.querySelector('.rich-tiptap-v1237 .tiptap') as HTMLElement|null
  if(!root){setResults(['Editor not ready']);return}
  const p=root.querySelector('p') as HTMLElement|null
  const font=p?getComputedStyle(p).fontWeight:'missing paragraph'
  const html=root.innerHTML
  const hasBold=!!root.querySelector('strong,b')
  const isBoldButton=document.querySelector('.rich-toolbar-v1237 button[title="Bold"]')?.getAttribute('aria-pressed')
  setResults([ 'Paragraph computed weight: '+font,'Bold markup: '+hasBold,'Bold toolbar active: '+isBoldButton,'HTML: '+html ])
 }
 return <main style={{maxWidth:600,margin:'32px auto',padding:20}}>
  <h1>Message editor diagnostics — preview only</h1>
  <p>Type a sentence, tap between words, select a word, then inspect the results.</p>
  <RichTextEditor value={value} onChange={setValue}/>
  <button type="button" onClick={run} style={{marginTop:16,padding:12,border:'1px solid #aaa'}}>Inspect formatting</button>
  <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{results.join('\n')}</pre>
  <details><summary>Saved HTML</summary><pre style={{whiteSpace:'pre-wrap'}}>{value}</pre></details>
 </main>
}