export const defaults = {
  businessName: 'Elevation Air', businessPhone: '', businessEmail: '', license: '',
  whfRate: 2, atticRate: 0.7, dischargeRate: 750, taxRate: 0, validDays: 30,
  intakePrice: '', exhaustPrice: '',
  catalog: [
    {id:'t48',kind:'whole',series:'trident',name:'QuietCool Trident Pro 4.8',cfm:4800,price:2100,sample:true},
    {id:'t55',kind:'whole',series:'trident',name:'QuietCool Trident Pro 5.5',cfm:5500,price:2250,sample:true},
    {id:'t60',kind:'whole',series:'trident',name:'QuietCool Trident Pro 6.0',cfm:6000,price:2350,sample:true},
    {id:'t70',kind:'whole',series:'trident',name:'QuietCool Trident Pro 7.0',cfm:7000,price:2500,sample:true},
    {id:'s48',kind:'whole',series:'stealth',name:'QuietCool Stealth Pro 4.8',cfm:4800,price:2400,sample:true},
    {id:'s55',kind:'whole',series:'stealth',name:'QuietCool Stealth Pro 5.5',cfm:5500,price:2550,sample:true},
    {id:'s60',kind:'whole',series:'stealth',name:'QuietCool Stealth Pro 6.0',cfm:6000,price:2750,sample:true},
    {id:'s70',kind:'whole',series:'stealth',name:'QuietCool Stealth Pro 7.0',cfm:7000,price:2850,sample:true},
    {id:'gable',kind:'attic',series:'gable',name:'QuietCool AFG SMT ES-3.0',cfm:'',price:700,sample:true},
    {id:'roof',kind:'attic',series:'roof',name:'QuietCool AFR SMT ES-2.0',cfm:'',price:900,sample:true},
    {id:'solar',kind:'attic',series:'solar',name:'QuietCool AFR SLR-40W',cfm:'',price:975,sample:true},
    {id:'garage',kind:'garage',series:'garage',name:'QuietCool Garage Fan',cfm:'',price:900,sample:true},
  ]
};
export const atticApplications = [
  {type:'roof',label:'Roof',modelId:'roof'},
  {type:'gable',label:'Gable',modelId:'gable'},
  {type:'solar',label:'Roof Solar',modelId:'solar'},
];
export function newExhaustVent(type='ridge') {
  return {type,count:'',nfa:({'ridge':18,'box / static':60,'gable':80})[type]??''};
}
export function newJob() {
  return {id:crypto.randomUUID(),created:new Date().toISOString(),updated:new Date().toISOString(),
    name:'',address:'',phone:'',email:'',inspector:'',date:localDate(),
    levels:[{name:'Main level',sqft:''}],ceilingType:'standard',atticSqft:'',ratio:150,qualified300:false,
    intake:'inadequate',intakeNfa:'',exhaustVents:[newExhaustVent()],
    notes:'',photos:[],wholeSeries:'trident',atticStyle:'gable',wholeModel:'auto',atticModel:'auto',garageModel:'none',includeWhole:true,includeAttic:true,includeGarage:false,
    includeIntake:false,includeExhaust:false,discount:0,extraLabel:'',extraPrice:0};
}
function localDate() { const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
export const num = v => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
export function exhaustVents(job) {
  return Array.isArray(job.exhaustVents) ? job.exhaustVents : [{type:job.exhaustType||'ridge',count:job.exhaustCount??'',nfa:job.exhaustNfa??''}];
}
export function migrateJob(job) {
  return {...job,levels:job.levels.map(({height,...level})=>level),ceilingType:job.ceilingType??'standard',exhaustVents:exhaustVents(job).map(v=>({...v}))};
}
export function recommend(catalog,kind,target) {
  if (!target) return null;
  return catalog.filter(m=>m.kind===kind && num(m.cfm)>=target).sort((a,b)=>a.cfm-b.cfm)[0] || null;
}
export function calculate(job,settings) {
  const house = job.levels.reduce((s,l)=>s+num(l.sqft),0);
  const attic = num(job.atticSqft);
  const ratio = Number(job.ratio)===300 && job.qualified300 ? 300 : 150;
  const nfa = Math.ceil(attic*144/ratio);
  const intakeNeeded = Math.ceil(nfa/2), exhaustNeeded = Math.ceil(nfa/2);
  const vents = exhaustVents(job);
  const exhaustBreakdown = vents.map(v=>({...v,known:v.type==='none'||(v.count!==''&&v.nfa!==''),total:v.type==='none'?0:num(v.count)*num(v.nfa)}));
  const existingExhaust = exhaustBreakdown.reduce((sum,v)=>sum+v.total,0);
  const exhaustUnknown = exhaustBreakdown.filter(v=>!v.known).length;
  const nfaSqft=nfa/144;
  const whfRate = job.ceilingType==='vaulted' ? 2.5 : num(settings.whfRate);
  const whfTarget = Math.ceil(house*whfRate);
  const atticTarget = Math.ceil(attic*num(settings.atticRate));
  const candidates = kind => settings.catalog.filter(m=>m.kind===kind && (kind==='whole'?m.series===job.wholeSeries:kind==='attic'?m.series===job.atticStyle:true));
  // An unrated model may be priced as a draft candidate, never certified as sized.
  const resolve = (field,kind,target) => job[field]==='auto' ? recommend(candidates(kind),kind,target) || (target ? candidates(kind).find(m=>!num(m.cfm)) : null) || null : candidates(kind).find(m=>m.id===job[field]) || null;
  const whole = resolve('wholeModel','whole',whfTarget);
  const application = atticApplications.find(a=>a.type===job.atticStyle);
  const atticFan = settings.catalog.find(m=>m.id===application?.modelId && m.kind==='attic' && m.series===job.atticStyle) || null;
  const garage = settings.catalog.find(m=>m.kind==='garage' && m.id===job.garageModel)||null;
  const discharge = whole && num(settings.dischargeRate) ? num(whole.cfm)/num(settings.dischargeRate) : 0;
  const items=[];
  if(job.includeWhole && whole) items.push({label:whole.name,price:num(whole.price),sample:!!whole.sample});
  if(job.includeAttic && atticFan) items.push({label:atticFan.name,price:num(atticFan.price),sample:!!atticFan.sample});
  if(job.includeGarage && garage) items.push({label:garage.name,price:num(garage.price),sample:!!garage.sample});
  if(job.includeIntake) items.push({label:'Intake ventilation improvement allowance',price:num(settings.intakePrice),sample:false});
  if(job.includeExhaust) items.push({label:'Exhaust ventilation improvement allowance',price:num(settings.exhaustPrice),sample:false});
  if(job.extraLabel.trim()) items.push({label:job.extraLabel.trim(),price:num(job.extraPrice),sample:false});
  const subtotal=items.reduce((s,i)=>s+i.price,0), discount=Math.min(num(job.discount),subtotal);
  const tax=(subtotal-discount)*num(settings.taxRate)/100, total=subtotal-discount+tax;
  const warnings=[];
  if(!house || job.levels.some(l=>!num(l.sqft))) warnings.push('Enter square footage for each occupied level.');
  if(!attic) warnings.push('Enter attic square footage to calculate ventilation.');
  if(!whfRate || !num(settings.atticRate) || !num(settings.dischargeRate)) warnings.push('Set positive airflow and attic discharge sizing rules in Settings.');
  if(Number(job.ratio)===300 && !job.qualified300) warnings.push('1:300 conditions are not confirmed; calculations use the conservative 1:150 ratio.');
  if(job.includeWhole && !whole) warnings.push('No whole house fan meets this target. Add suitable equipment or exclude it from the estimate.');
  if(job.includeAttic && !atticFan) warnings.push('The attic fan tied to this application is missing from the catalog. Restore it in Settings or exclude it from the estimate.');
  if(job.includeWhole && whole && num(whole.cfm)<whfTarget) warnings.push('The selected whole house fan is below the airflow target.');
  if(job.includeAttic && atticFan && num(atticFan.cfm) && num(atticFan.cfm)<atticTarget) warnings.push('The selected attic fan is below the airflow target.');
  if(job.includeGarage && !garage) warnings.push('Select a garage fan or remove it from the proposal.');
  if(job.includeWhole && whole && !num(whole.cfm)) warnings.push('Set the selected whole house fan’s rated CFM.');
  if(job.includeAttic && atticFan && !num(atticFan.cfm)) warnings.push('Set the selected attic fan’s rated CFM.');
  if(items.some(i=>i.sample)) warnings.push('QuietCool model specifications need confirmation in Settings before issuing a customer quote.');
  if((job.includeWhole && whole && whole.price==='') || (job.includeAttic && atticFan && atticFan.price==='') || (job.includeGarage && garage && garage.price==='')) warnings.push('Set installed equipment prices in Settings. Blank prices are not customer quotes.');
  if((job.includeIntake && settings.intakePrice==='') || (job.includeExhaust && settings.exhaustPrice==='')) warnings.push('Set prices for the included ventilation improvement allowances in Settings.');
  return {house,attic,ratio,nfa,nfaSqft,intakeNeeded,exhaustNeeded,existingExhaust,exhaustBreakdown,exhaustUnknown,whfRate,whfTarget,atticTarget,whole,atticFan,garage,discharge,items,subtotal,discount,tax,total,warnings};
}
