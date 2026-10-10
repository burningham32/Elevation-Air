import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,defaults,newJob,recommend,num,migrateJob,migrateSettings} from '../src/calculations.js';
const setup=()=>{const j=newJob();j.levels=[{name:'Main',sqft:1500},{name:'Upstairs',sqft:500}];j.atticSqft=1500;return j;};
test('two levels size the whole house independently of the attic footprint',()=>{
 const c=calculate(setup(),defaults);assert.equal(c.house,2000);assert.equal(c.nfa,1440);assert.equal(c.intakeNeeded,720);assert.equal(c.exhaustNeeded,720);assert.equal(c.whfTarget,5000);assert.equal(c.whole.id,'t55');assert.equal(c.atticTarget,1050);assert.equal(c.atticFan.id,'gable');
});
test('1:300 requires explicit confirmation and changes passive ventilation only',()=>{
 const j=setup();j.ratio=300;assert.equal(calculate(j,defaults).ratio,150);j.qualified300=true;const c=calculate(j,defaults);assert.equal(c.nfa,720);assert.equal(c.whfTarget,5000);
});
test('recommendation never silently undersizes beyond the available catalog',()=>{
 const j=setup();j.levels[0].sqft=10000;const c=calculate(j,defaults);assert.equal(c.whole,null);assert.ok(c.warnings.some(w=>w.includes('No whole house fan')));
});
test('override below target is flagged',()=>{
 const j=setup();j.wholeModel='t48';j.levels[0].sqft=2500;const c=calculate(j,defaults);assert.equal(c.whole.id,'t48');assert.ok(c.warnings.some(w=>w.includes('below the airflow target')));
});
test('price honors included scope and discount, ignores legacy tax, and stays nonnegative',()=>{
 const j=setup();const s=structuredClone(defaults);s.catalog.find(m=>m.id==='t55').price=2900;s.catalog.find(m=>m.id==='gable').price=900;s.catalog.find(m=>m.id==='gable').cfm=1945;s.taxRate=8;j.discount=200;j.additionalWork=[{description:'Electrical',price:300}];let c=calculate(j,s);assert.equal(c.subtotal,4100);assert.ok(!('tax' in c));assert.equal(c.total,3900);j.includeAttic=false;c=calculate(j,s);assert.equal(c.subtotal,3200);j.discount=10000;c=calculate(j,s);assert.equal(c.total,0);
});
test('missing measurements and prices remain explicit instead of valid zero estimates',()=>{
 const c=calculate(newJob(),defaults);assert.equal(c.whole,null);assert.equal(c.atticFan.id,'gable');assert.ok(c.warnings.some(w=>w.includes('square footage')));assert.ok(c.warnings.some(w=>w.includes('attic square footage')));const c2=calculate(setup(),defaults);assert.ok(c2.warnings.some(w=>w.includes('rated CFM')));assert.ok(c2.warnings.some(w=>w.includes('confirmation')));
});
test('invalid and negative quantities do not produce NaN or negative prices',()=>{
 assert.equal(num('garbage'),0);assert.equal(num(-12),0);assert.equal(num(Infinity),0);const j=setup();j.exhaustVents=[{type:'ridge',count:20,nfa:18}];assert.equal(calculate(j,defaults).existingExhaust,360);assert.equal(recommend(defaults.catalog,'whole',0),null);
});

test('multiple exhaust types sum rated NFA, including fractional ridge length',()=>{
 const j=setup();j.exhaustVents=[{type:'ridge',count:20.5,nfa:18},{type:'box / static',count:4,nfa:50},{type:'gable',count:2,nfa:72}];
 const c=calculate(j,defaults);assert.equal(c.existingExhaust,713);assert.equal(c.exhaustUnknown,0);assert.deepEqual(c.exhaustBreakdown.map(v=>v.total),[369,200,144]);assert.equal(c.nfaSqft,10);
});
test('unknown exhaust rows remain partial and none does not contribute',()=>{
 const j=setup();j.exhaustVents=[{type:'ridge',count:20,nfa:18},{type:'gable',count:2,nfa:''},{type:'none',count:'',nfa:''}];const c=calculate(j,defaults);assert.equal(c.existingExhaust,360);assert.equal(c.exhaustUnknown,1);
});
test('legacy inspections preserve their single vent during migration',()=>{
 const j=setup();delete j.exhaustVents;j.exhaustType='gable';j.exhaustCount=2;j.exhaustNfa=144;
 const m=migrateJob(j);assert.deepEqual(m.exhaustVents,[{type:'gable',count:2,nfa:144}]);assert.equal(calculate(m,defaults).existingExhaust,288);assert.deepEqual(migrateJob(m).exhaustVents,m.exhaustVents);
});

test('vaulted ceilings raise whole house airflow and equipment sizing without altering attic requirements',()=>{
 const j=setup();const normal=calculate(j,defaults);j.ceilingType='vaulted';const vaulted=calculate(j,defaults);
 assert.equal(normal.whfTarget,5000);assert.equal(vaulted.whfRate,2.75);assert.equal(vaulted.whfTarget,5500);assert.equal(vaulted.whole.id,'t55');assert.equal(vaulted.nfa,normal.nfa);assert.equal(vaulted.atticTarget,normal.atticTarget);
});

test('legacy ceiling heights cannot affect any calculation and are removed on migration',()=>{
 const j=setup();const expected=calculate(j,defaults);
 for(const height of [0,8,100,'invalid']){
  const legacy={...j,levels:j.levels.map(l=>({...l,height}))};
  assert.deepEqual(calculate(legacy,defaults),expected);
  assert.deepEqual(migrateJob(legacy).levels,j.levels);
 }
 assert.ok(!('volume' in expected));assert.ok(!('ach' in expected));
 assert.ok(!expected.warnings.some(w=>w.includes('ceiling height')));
});

test('multiple additional work items are separately priced and legacy allowances are ignored',()=>{
 const j=setup();j.additionalWork=[{description:'Electrical',price:300},{description:'Attic access',price:150},{description:'',price:''}];
 j.includeIntake=true;j.includeExhaust=true;const s={...defaults,intakePrice:500,exhaustPrice:500};
 const c=calculate(j,s);assert.equal(c.subtotal,3400);assert.deepEqual(c.items.slice(-2).map(i=>[i.label,i.price]),[['Electrical',300],['Attic access',150]]);
 const legacy={...j,extraLabel:'Electrical',extraPrice:300};delete legacy.additionalWork;
 const migrated=migrateJob(legacy);assert.deepEqual(migrated.additionalWork,[{description:'Electrical',price:300}]);assert.equal(calculate(migrated,s).subtotal,3250);assert.ok(!('includeIntake' in migrated));assert.ok(!('extraLabel' in migrated));assert.deepEqual(migrateJob(migrated),migrated);
});

test('recommended work is totaled separately without changing estimate or discount',()=>{
 const j=setup();j.additionalWork=[{description:'Electrical',price:300}];j.discount=100;
 const initial=calculate(j,defaults);j.recommendedWork=[{description:'Insulation upgrade',price:1200},{description:'Air sealing',price:400}];
 const c=calculate(j,{...defaults,taxRate:25});assert.equal(c.total,3150);assert.equal(c.total,initial.total);assert.equal(c.subtotal,initial.subtotal);assert.equal(c.recommendedTotal,1600);assert.equal(c.totalWithRecommended,4750);assert.deepEqual(c.recommendedItems.map(i=>i.label),['Insulation upgrade','Air sealing']);assert.ok(!c.items.some(i=>i.label==='Air sealing'));
 delete j.recommendedWork;assert.deepEqual(migrateJob(j).recommendedWork,[]);
});

test('saved sizing settings adopt the new standard rate while retaining equipment and other rules',()=>{
 const legacy={...structuredClone(defaults),whfRate:2};delete legacy.whfSizingVersion;
 const migrated=migrateSettings(legacy);assert.equal(migrated.whfRate,2.5);assert.deepEqual(migrated.catalog,legacy.catalog);assert.equal(migrated.atticRate,legacy.atticRate);assert.deepEqual(migrateSettings(migrated),migrated);
 const j=setup();assert.equal(calculate(j,migrated).whfTarget,5000);j.ceilingType='vaulted';assert.equal(calculate(j,migrated).whfTarget,5500);
});
