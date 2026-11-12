// A lead or reservation alone is not an existing customer.
export const isSignedBuyerDeal = deal => deal.status === 'SIGNED';
export function signedBuyerLeads(leads, deals) {
  const ids = new Set(deals.filter(isSignedBuyerDeal).filter(d => d.lead_id != null).map(d => String(d.lead_id)));
  return leads.filter(lead => ids.has(String(lead.id)));
}
