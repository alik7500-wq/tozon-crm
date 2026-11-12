import React from 'react';
import {Settings2} from 'lucide-react';
import ProjectShell from './ProjectShell';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {AuthProvider,useAuth} from '../auth/AuthContext';
import {LoginPage} from '../auth/LoginPage';
import {CompanyProjectsTab} from '../settings/CompanyProjectsTab';
const ProjectWorkspacePage=React.lazy(()=>import('./ProjectWorkspacePage'));
const ORIGIN='https://tozon-crm-commercial-test.onrender.com';
const API='https://tozon-crm-commercial-test-api.onrender.com';
export function PilotHome(){
 const {user,isLoading,logout}=useAuth();
 if(isLoading)return <p role="status" className="p-8">Проверяем тестовую учётную запись…</p>;
 if(!user)return <Navigate to="/login" replace/>;
 if(user.permissions?.includes('company.project-only'))return <React.Suspense fallback={<p role="status">Загрузка рабочего пространства…</p>}><ProjectWorkspacePage/></React.Suspense>;
 const p=user.permissions||[];
 if(user.role!=='ADMIN'||(p.includes('access.v2')&&!['settings.view','settings.manage','users.view','users.manage'].every(r=>p.includes(r))))return <p role="alert" className="p-8">Для настройки тестовых проектов нужен администратор компании.</p>;
 return <ProjectShell user={user} logout={logout} groups={[{label:'Управление компанией',items:[{id:'settings',label:'Проекты и доступы',icon:Settings2}]}]} current="settings"><div><h1 className="text-2xl font-extrabold">Настройки компании</h1><p className="mt-2 text-sm text-slate-500">Проекты, директора, партнёры и доступы сотрудников в тестовой среде.</p></div><CompanyProjectsTab/></ProjectShell>;
}
export default function ProjectPilotApp(){
 // A test build must never fall back to the production API or run on its domain.
 if(window.location.origin!==ORIGIN||![API,API+'/api'].includes(import.meta.env.VITE_API_URL))return <p role="alert" className="p-8">Пилот разрешён только на отдельном тестовом сайте с тестовым API.</p>;
 return <AuthProvider><BrowserRouter><Routes><Route path="/login" element={<LoginPage/>}/><Route path="*" element={<PilotHome/>}/></Routes></BrowserRouter></AuthProvider>;
}
