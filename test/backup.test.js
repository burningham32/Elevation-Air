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
