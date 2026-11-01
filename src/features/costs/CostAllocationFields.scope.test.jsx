import React from 'react';
import {it,expect,afterEach,vi}from'vitest';
import {render,screen,cleanup}from'@testing-library/react';
import {CostAllocationFields}from'./CostAllocationFields';
afterEach(cleanup);
it.each(['DIRECT','SHARED'])('keeps V/G out of AB allocation controls in %s mode',mode=>{
 const blocks=[{id:3,project_id:3,name:'Блок Б'},{id:4,project_id:3,name:'Блок А'},{id:6,project_id:4,name:'Блок В'},{id:7,project_id:4,name:'Блок Г'}];
 const props={value:{mode,building_ids:[],reason:''},blocks,onChange:vi.fn()};
 const {rerender}=render(<CostAllocationFields {...props}/>);
 expect(screen.queryByText(/Блок В/)).toBeNull();expect(screen.queryByText(/Блок Г/)).toBeNull();expect(screen.getByText(/Блок А/)).toBeTruthy();
 rerender(<CostAllocationFields {...props} accountingScope="VG"/>);
 expect(screen.queryByText(/Блок А/)).toBeNull();expect(screen.queryByText(/Блок Б/)).toBeNull();expect(screen.getByText(/Блок В/)).toBeTruthy();
});
