import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useDiscountSchemes } from './useDiscountSchemes';
import { ApartmentPricingView } from './ApartmentPricingView';

export function ApartmentPricingCalculator(props) {
 const {unit,currency='USD'}=props;
 const [reload,setReload]=useState(0);
 const {schemes,loading,error}=useDiscountSchemes(unit.id,reload);
 const [exchange,setExchange]=useState({loading:currency==='USD',rate:null,stale:false,updatedAt:null});
 useEffect(()=>{
  if(currency!=='USD')return;
  let active=true;
  api.get('/finance/rates/eskhata').then(response=>{
   if(!active)return;
   const data=response.data || response;
   const rate=Number(data.sellRate);
   setExchange({loading:false,rate:data.available!==false&&Number.isFinite(rate)&&rate>0?rate:null,stale:!!data.isStale,updatedAt:data.updatedAt||null});
  }).catch(()=>{if(active)setExchange({loading:false,rate:null,stale:false,updatedAt:null})});
  return()=>{active=false};
 },[currency]);
 return <ApartmentPricingView {...props} schemes={schemes} loading={loading} error={error} onReload={()=>setReload(n=>n+1)} exchange={exchange}/>;
}
