import { getUnitKind } from '../../utils/unitKind';
export const discountRuleKey = rule => JSON.stringify([Number(rule.payment_percent), rule.price_per_m2 == null || rule.price_per_m2 === '' ? null : Number(rule.price_per_m2), Number(rule.discount_percent || 0), Number(rule.months)]);
export const businessDate = () => new Date(Date.now() + 5*3600000).toISOString().slice(0,10);
export function applicableSchemes(schemes, unit, today=businessDate()) {
 const project=unit?.project_id || unit?.floors?.sections?.buildings?.projects?.id || unit?.floors?.sections?.buildings?.project_id;
 return getUnitKind(unit)==='APARTMENT' ? schemes.filter(s=>s.is_active && String(s.project_id)===String(project) && (!s.starts_on||s.starts_on<=today) && (!s.ends_on||s.ends_on>=today)) : [];
}
export function tierPrice(unit, rule) {
 const area=Number(unit?.area_m2_x100), price=Number(unit?.price_per_m2_minor);
 const base=Math.round(area*price/100);
 const final=rule?.price_per_m2!=null ? Math.round(area*Math.round(Number(rule.price_per_m2)*100)/100) : base-Math.round(base*Number(rule?.discount_percent||0)/100);
 if(!Number.isSafeInteger(base)||base<=0||!Number.isSafeInteger(final)||final<=0||final>base)return null;
 return {base_minor:base,total_minor:final,discount_minor:base-final,minimum_minor:Math.round(final*Number(rule?.payment_percent||0)/100),price_per_m2:final/area,rule,rule_key:rule?discountRuleKey(rule):null};
}
export function calculatePricing(unit, scheme, selection={mode:'tier',value:0,months:''}) {
 const input=Number(String(selection.value??'').replace(',','.'));
 if(!Number.isFinite(input)||input<0 || (selection.mode!=='amount'&&input>100))return {error:'Укажите корректный первоначальный взнос'};
 const tiers=(scheme?.rules||[]).map(rule=>tierPrice(unit,rule)).filter(Boolean).sort((a,b)=>a.rule.payment_percent-b.rule.payment_percent);
 if(scheme && !tiers.length)return {error:'В схеме нет условий с корректной ценой для этой квартиры'};
 const amount=Math.round(input*100);
 let tier;
 if(selection.mode==='tier')tier=tiers.find(t=>Number(t.rule.payment_percent)===input&&(!selection.rule_key||t.rule_key===selection.rule_key));
 else {
  const qualifying=tiers.filter(t=>selection.mode==='amount'?amount>=t.minimum_minor:input>=Number(t.rule.payment_percent));
  const highest=qualifying.at(-1)?.rule.payment_percent;
  const offers=qualifying.filter(t=>Number(t.rule.payment_percent)===Number(highest));
  tier=offers.find(t=>t.rule_key===selection.rule_key)||offers[0];
 }
 if(scheme&&!tier)return {error:'Взнос ниже минимального условия выбранной схемы'};
 tier ||= tierPrice(unit,null);
 if(!tier)return {error:'В карточке квартиры не задана корректная базовая цена'};
 let down=selection.mode==='amount'?Math.min(amount,tier.total_minor):Math.round(tier.total_minor*input/100);
 const full=down===tier.total_minor;
 const maxMonths=Number(tier.rule?.months || (full?0:120));
 const months=full?0:Number(selection.months===''||selection.months==null?(tier.rule?.months||12):selection.months);
 if(!full&&(!Number.isInteger(months)||months<1||months>maxMonths))return {error:`Срок рассрочки должен быть от 1 до ${maxMonths} месяцев`};
 return {unit_id:unit.id,unit_price_per_m2_minor:Number(unit.price_per_m2_minor),area_m2_x100:Number(unit.area_m2_x100),...tier,scheme_id:scheme?.id||null,scheme_updated_at:scheme?.updated_at||null,scheme_name:scheme?.name||null,rule_payment_percent:tier.rule?.payment_percent??null,down_payment_minor:down,remaining_minor:tier.total_minor-down,actual_percent:down/tier.total_minor*100,months,max_months:maxMonths,payment_type:full?'FULL':'INSTALLMENT',monthly_minor:months?Math.ceil((tier.total_minor-down)/months):0,excess_minor:selection.mode==='amount'?Math.max(0,amount-tier.total_minor):0,selection:{...selection,rule_key:tier.rule_key}};
}
export function verifyPricingQuote(unit,schemes,quote) {
 if(!quote||Number(quote.unit_id)!==Number(unit?.id))return null;
 if(Number(quote.unit_price_per_m2_minor)!==Number(unit.price_per_m2_minor)||Number(quote.area_m2_x100)!==Number(unit.area_m2_x100))throw new Error('Базовая цена квартиры изменилась. Проверьте условия заново.');
 const scheme=applicableSchemes(schemes,unit).find(s=>s.id===quote.scheme_id);
 if(quote.scheme_id&&(!scheme||scheme.updated_at!==quote.scheme_updated_at))throw new Error('Схема скидок изменилась или недоступна. Проверьте условия заново.');
 const result=calculatePricing(unit,scheme,quote.selection);
 if(result.error)throw new Error(result.error);
 return {...result,scheme};
}
