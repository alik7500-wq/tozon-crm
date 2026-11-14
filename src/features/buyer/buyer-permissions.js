export function canIssueBuyerQr(user,deal){
  if(!user?.is_active||deal?.status!=='SIGNED')return false;
  const p=user.permissions||[];
  const write=p.includes('access.v2')?['deals','contracts'].some(k=>p.includes(`${k}.view`)&&p.includes(`${k}.manage`)):['ADMIN','DIRECTOR','SALES_MANAGER'].includes(user.role);
  return write&&(['ADMIN','DIRECTOR'].includes(user.role)||String(user.id)===String(deal.responsible_user_id));
}
