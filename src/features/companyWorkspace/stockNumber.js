// Preserve Postgres numeric precision; no money arithmetic in the browser.
export function stockNumber(value,money=false){
 const match=String(value??'').match(/^(-?)(\d+)(?:\.(\d+))?$/);if(!match)return '—';
 const integer=match[2].replace(/\B(?=(\d{3})+(?!\d))/g,' '),fraction=money?(match[3]||'').padEnd(2,'0'):(match[3]||'').replace(/0+$/,'');
 return `${match[1]}${integer}${fraction?','+fraction:''}`;
}
