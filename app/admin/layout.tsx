import type {Metadata} from 'next'

export const metadata:Metadata={manifest:'/admin-manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'Golf Sim Admin'}}

export default function AdminLayout({children}:{children:React.ReactNode}){return children}
