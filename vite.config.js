import {defineConfig} from 'vite';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
export default defineConfig(({command})=>({
  base:process.env.VITE_BASE_PATH||'/',
  plugins:[{name:'offline-precache',apply:'build',closeBundle(){
    const files=readdirSync('dist/assets').map(f=>'assets/'+f);
    const source=readFileSync('public/sw.js','utf8');
    writeFileSync(path.join('dist','sw.js'),source.replace('const PRECACHE = [];','const PRECACHE = '+JSON.stringify(files)+';'));
  }}]
}));
