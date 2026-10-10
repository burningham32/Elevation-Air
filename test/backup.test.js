import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,newJob} from '../src/calculations.js';
import {validateBackup} from '../src/backup.js';
const backup=()=>({version:1,settings:structuredClone(defaults),jobs:[newJob()]});
test('current backup including blank airflow values can be restored',()=>assert.equal(validateBackup(backup()),true));
test('script-bearing sizing settings and remote photo URLs cannot be imported',()=>{
 const b=backup();b.settings.whfRate='<img src=x onerror=alert(1)>';assert.throws(()=>validateBackup(b));
 const p=backup();p.jobs[0].photos=[{caption:'Test',data:'https://tracking.example/photo.png'}];assert.throws(()=>validateBackup(p));
});
test('malformed records and duplicate inspection IDs do not corrupt saved inspections',()=>{
 const b=backup();b.jobs[0].levels=null;assert.throws(()=>validateBackup(b));const d=backup();d.jobs.push(structuredClone(d.jobs[0]));assert.throws(()=>validateBackup(d));
});

test('both legacy single-vent and multiple-vent backups remain importable',()=>{
 const legacy=backup();delete legacy.jobs[0].exhaustVents;Object.assign(legacy.jobs[0],{exhaustType:'ridge',exhaustCount:20,exhaustNfa:18});assert.equal(validateBackup(legacy),true);
 const multi=backup();multi.jobs[0].exhaustVents.push({type:'box / static',count:3,nfa:50});assert.equal(validateBackup(multi),true);
 multi.jobs[0].exhaustVents[1].nfa='not a number';assert.throws(()=>validateBackup(multi));
});
