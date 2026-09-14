'use client'
import {useAdminGuard,AdminDenied} from './admin-shared'

export default function AdminPage(){
  const guard=useAdminGuard()
  if(!guard.ready || !guard.admin)return <AdminDenied {...guard}/>
  return <div className="admin-dashboard-landing-v13134" aria-label="League administration home" />
}
