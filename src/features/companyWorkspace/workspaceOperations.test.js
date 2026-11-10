import {describe,it,expect,vi,beforeEach} from 'vitest';
import {api} from '../../api/client';
import {initialOperation,loadOperationLookups,prepareOperation} from './workspaceOperations';
import {discountRuleKey} from '../pricing/pricingCalculator';
vi.mock('../../api/client',()=>({api:{get:vi.fn()}}));
beforeEach(()=>vi.clearAllMocks());
describe('scoped operation requests',()=>{
 it('loads all pages of each own-project selector and forwards cancellation',async()=>{
  const signal=new AbortController().signal;
  api.get.mockImplementation((path,{params})=>Promise.resolve({data:path.endsWith('/units')&&!params.after?{records:[{id:1}],has_more:true}:{records:[{id:2}],has_more:false}}));
  const result=await loadOperationLookups('plaza','DEAL_DRAFT',signal);
  expect(result.units.map(x=>x.id)).toEqual([1,2]);expect(api.get).toHaveBeenCalledTimes(3);
  expect(api.get.mock.calls.every(([path,opts])=>path.startsWith('/project-workspace/plaza/options/')&&opts.signal===signal)).toBe(true);
 });
 it('fails closed on a broken pagination cursor',async()=>{
  api.get.mockResolvedValue({data:{records:[],has_more:true}});await expect(loadOperationLookups('plaza','DEAL_DRAFT')).rejects.toThrow('полный справочник');
 });
 it('sends original somoni and historical rate without accepting an invented USD amount',()=>{
  const f={...initialOperation(),deal_id:'1',cash_desk_id:'cash',currency:'TJS',amount:'924',exchange_rate:'9.24'};
  expect(prepareOperation('PAYMENT',f,{deals:[{id:1,status:'SIGNED'}],cash_desks:[{id:'cash'}]},'retry')).toMatchObject({request_id:'retry',payload:{amount_minor:92400,exchange_rate:9.24,currency:'TJS',deal_id:1}});
  expect(()=>prepareOperation('PAYMENT',{...f,deal_id:'2'},{deals:[{id:1,status:'SIGNED'}],cash_desks:[{id:'cash'}]},'x')).toThrow('подписанный договор');
 });
 it('preserves exact offers with the same deposit percentage and different terms',()=>{
  const rules=[{payment_percent:0,price_per_m2:640,discount_percent:8.57,months:36},{payment_percent:0,price_per_m2:700,discount_percent:0,months:40}];
  const lookups={deals:[{id:1,updated_at:'draft-version',unit:{unit_kind:'APARTMENT',area_m2_x100:6000,price_per_m2_minor:70000,project_id:4}}],schemes:[{id:'scheme',project_id:4,updated_at:'scheme-version',rules}]};
  for(const rule of rules){
   const f={...initialOperation(),deal_id:'1',scheme_id:'scheme',rule_key:discountRuleKey(rule),months:String(rule.months)};
   const command=prepareOperation('SIGN_DEAL',f,lookups,'request');
   expect(command.payload).toEqual({deal_id:1,expected_updated_at:'draft-version',scheme_id:'scheme',scheme_updated_at:'scheme-version',rule_key:discountRuleKey(rule),down_payment_minor:0,installment_months:rule.months});
  }
  expect(()=>prepareOperation('SIGN_DEAL',{...initialOperation(),deal_id:'1',scheme_id:'foreign'},lookups,'x')).toThrow('актуальный оффер');
 });
 it('does not allow foreign warehouses or transfers to the same warehouse',()=>{
  const f={...initialOperation(),kind:'TRANSFER',basis:'Test',warehouse_id:'own',destination_id:'foreign',lines:[{material_id:'material',quantity:'1'}]};
  const options={warehouses:[{id:'own'}],materials:[{id:'material'}]};
  expect(()=>prepareOperation('STOCK_POST',f,options,'x')).toThrow('склад назначения');
  expect(()=>prepareOperation('STOCK_POST',{...f,destination_id:'own'},options,'x')).toThrow('другой склад');
 });
});
