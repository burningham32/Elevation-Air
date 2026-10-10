import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,newJob,recommend,num} from '../src/calculations.js';
const setup=()=>{const j=newJob();j.levels=[{name:'Main',sqft:1500,height:8},{name:'Upstairs',sqft:500,height:9}];j.atticSqft=1500;return j;};
test('two levels size the whole house independently of the attic footprint',()=>{
 const c=calculate(setup(),defaults);assert.equal(c.house,2000);assert.equal(c.volume,16500);assert.equal(c.nfa,1440);assert.equal(c.intakeNeeded,720);assert.equal(c.exhaustNeeded,720);assert.equal(c.whfTarget,4000);assert.equal(c.whole.id,'t48');assert.equal(c.atticTarget,1050);assert.equal(c.atticFan.id,'gable');assert.ok(Math.abs(c.ach-4800*60/16500)<0.001);
});
test('1:300 requires explicit confirmation and changes passive ventilation only',()=>{
 const j=setup();j.ratio=300;assert.equal(calculate(j,defaults).ratio,150);j.qualified300=true;const c=calculate(j,defaults);assert.equal(c.nfa,720);assert.equal(c.whfTarget,4000);
});
test('recommendation never silently undersizes beyond the available catalog',()=>{
 const j=setup();j.levels[0].sqft=10000;const c=calculate(j,defaults);assert.equal(c.whole,null);assert.equal(c.ach,null);assert.ok(c.warnings.some(w=>w.includes('No whole house fan')));
});
test('override below target is flagged and uses actual selected airflow for ACH',()=>{
 const j=setup();j.wholeModel='t48';j.levels[0].sqft=2500;const c=calculate(j,defaults);assert.equal(c.whole.id,'t48');assert.ok(c.warnings.some(w=>w.includes('below the airflow target')));assert.equal(c.ach,4800*60/24500);
});
test('price honors included scope, discount, tax, and nonnegative total',()=>{
 const j=setup();const s=structuredClone(defaults);s.catalog.find(m=>m.id==='t48').price=2900;s.catalog.find(m=>m.id==='gable').price=900;s.catalog.find(m=>m.id==='gable').cfm=1945;s.taxRate=8;j.discount=200;j.extraLabel='Electrical';j.extraPrice=300;let c=calculate(j,s);assert.equal(c.subtotal,4100);assert.equal(c.tax,312);assert.equal(c.total,4212);j.includeAttic=false;c=calculate(j,s);assert.equal(c.subtotal,3200);j.discount=10000;c=calculate(j,s);assert.equal(c.total,0);
});
test('missing measurements and prices remain explicit instead of valid zero estimates',()=>{
 const c=calculate(newJob(),defaults);assert.equal(c.whole,null);assert.equal(c.atticFan,null);assert.equal(c.ach,null);assert.ok(c.warnings.some(w=>w.includes('square footage')));assert.ok(c.warnings.some(w=>w.includes('attic square footage')));const c2=calculate(setup(),defaults);assert.ok(c2.warnings.some(w=>w.includes('rated CFM')));assert.ok(c2.warnings.some(w=>w.includes('confirmation')));
});
test('invalid and negative quantities do not produce NaN or negative prices',()=>{
 assert.equal(num('garbage'),0);assert.equal(num(-12),0);assert.equal(num(Infinity),0);const j=setup();j.exhaustCount=20;j.exhaustNfa=18;assert.equal(calculate(j,defaults).existingExhaust,360);assert.equal(recommend(defaults.catalog,'whole',0),null);
});
