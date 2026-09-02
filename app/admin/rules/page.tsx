'use client'
import RulesEditor from '../rules-editor'
import {AdminDenied,AdminFrame,useAdminGuard} from '../admin-shared'
export default function AdminRules(){const guard=useAdminGuard();if(!guard.ready || !guard.admin)return <AdminDenied {...guard}/>;return <AdminFrame title="Rules" description="Edit and format the Rules page players see in the app."><RulesEditor/></AdminFrame>}
