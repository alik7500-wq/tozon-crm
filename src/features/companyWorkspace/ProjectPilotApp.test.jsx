import React from 'react';
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
const state=vi.hoisted(()=>({user:null,isLoading:false,logout:vi.fn()}));
vi.mock('../auth/AuthContext',()=>({useAuth:()=>state,AuthProvider:({children})=>children}));
vi.mock('../settings/CompanyProjectsTab',()=>({CompanyProjectsTab:()=> <p>Project registry only</p>}));
vi.mock('./ProjectWorkspacePage',()=>({default:()=>{const [firstActor]=React.useState(state.user.id);return <><p>Scoped project only</p><span data-testid="workspace-actor">{firstActor}</span></>;}}));
import ProjectPilotApp,{PilotHome} from './ProjectPilotApp';
beforeEach(()=>{state.user=null;state.isLoading=false;});afterEach(cleanup);
it('never renders a test build against the current non-test host',()=>{render(<ProjectPilotApp/>);expect(screen.getByRole('alert')).toHaveTextContent('отдельном тестовом сайте');});
it('remounts all local workspace input when the signed-in actor changes',async()=>{
 state.user={id:10,role:'MANAGER',permissions:['company.project-only']};const r=render(<MemoryRouter><PilotHome/></MemoryRouter>);expect(await screen.findByTestId('workspace-actor')).toHaveTextContent('10');
 state.user={...state.user,id:20};r.rerender(<MemoryRouter><PilotHome/></MemoryRouter>);expect(screen.getByTestId('workspace-actor')).toHaveTextContent('20');
});
it('renders only the project workspace for a scoped identity even with an ADMIN label',async()=>{state.user={role:'ADMIN',permissions:['company.project-only']};render(<MemoryRouter><PilotHome/></MemoryRouter>);expect(await screen.findByText('Scoped project only')).toBeVisible();expect(screen.queryByText('Project registry only')).not.toBeInTheDocument();});
it('renders the registry for a company admin but denies an incomplete permission matrix',()=>{state.user={role:'ADMIN',permissions:['access.v2','settings.view']};const {unmount}=render(<MemoryRouter><PilotHome/></MemoryRouter>);expect(screen.getByRole('alert')).toBeVisible();unmount();state.user={role:'ADMIN',permissions:[]};render(<MemoryRouter><PilotHome/></MemoryRouter>);expect(screen.getByText('Project registry only')).toBeVisible();});
