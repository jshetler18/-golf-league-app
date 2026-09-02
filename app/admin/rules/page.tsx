'use client'
import RulesEditor from '../rules-editor'
import {AdminDenied,AdminFrame,useAdminGuard} from '../admin-shared'
export default function AdminRules(){const guard=useAdminGuard();const denied=<AdminDenied {...guard}/>;if(denied)return denied;return <AdminFrame title="Rules" description="Edit and format the Rules page players see in the app."><RulesEditor/></AdminFrame>}
