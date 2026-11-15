import {randomBytes} from 'node:crypto';

export function buildVersionPlugin(){
 const id=randomBytes(16).toString('hex');
 return {
  name:'crm-build-version',apply:'build',
  transformIndexHtml(){return [{tag:'meta',attrs:{name:'crm-build-id',content:id},injectTo:'head'}];},
  generateBundle(){this.emitFile({type:'asset',fileName:'crm-version.json',source:JSON.stringify({schema:1,id})});},
 };
}
