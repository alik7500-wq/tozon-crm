import {copyFileSync,mkdirSync} from 'node:fs';
// Render static hosting can serve /buyer without changing existing SPA rewrite rules.
const directory=new URL('../dist/buyer/',import.meta.url);
mkdirSync(directory,{recursive:true});
copyFileSync(new URL('../dist/index.html',import.meta.url),new URL('index.html',directory));
