import React from 'react';
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
 return <main className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-7xl space-y-6"><header className="flex items-center justify-between gap-4"><div><h1 className="text-xl font-bold">TOZON CRM · пилот проектов</h1><p className="text-sm text-slate-600">Отдельная тестовая база. Внешние рассылки не подключены.</p></div><button type="button" className="rounded-lg border bg-white px-4 py-2" onClick={logout}>Выйти</button></header><CompanyProjectsTab/></div></main>;
}
export default function ProjectPilotApp(){
 // A test build must never fall back to the production API or run on its domain.
 if(window.location.origin!==ORIGIN||![API,API+'/api'].includes(import.meta.env.VITE_API_URL))return <p role="alert" className="p-8">Пилот разрешён только на отдельном тестовом сайте с тестовым API.</p>;
 return <AuthProvider><BrowserRouter><Routes><Route path="/login" element={<LoginPage/>}/><Route path="*" element={<PilotHome/>}/></Routes></BrowserRouter></AuthProvider>;
}
