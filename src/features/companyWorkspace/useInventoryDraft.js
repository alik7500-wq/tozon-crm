import {useCallback,useMemo,useState} from 'react';

const initial=project=>({project,complexId:'',view:'board',filters:{status:'',kind:'',rooms:'',search:''},selectedId:null,pricingQuote:null,rateInput:''});

// Only local user input lives here. Inventory, prices, schemes and permissions
// always come from a new authorized read before the draft can be displayed.
export default function useInventoryDraft(project,external,onChange){
 const fallback=useMemo(()=>initial(project),[project]);
 const [local,setLocal]=useState(fallback);
 const state=onChange?(external?.project===project?external:fallback):(local.project===project?local:fallback);
 const update=useCallback(patch=>{
  const apply=previous=>{
   const current=previous?.project===project?previous:initial(project);
   return {...current,...(typeof patch==='function'?patch(current):patch)};
  };
  if(onChange)onChange(apply);else setLocal(apply);
 },[project,onChange]);
 return [state,update];
}
