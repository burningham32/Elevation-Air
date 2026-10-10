const text=v=>typeof v==='string' && v.length<=100000;
const quantity=v=>(typeof v==='string'||typeof v==='number') && Number.isFinite(Number(v)) && Number(v)>=0;
const id=v=>typeof v==='string' && /^[A-Za-z0-9-]{1,100}$/.test(v);
const strings=(o,keys)=>keys.every(k=>text(o[k]));
export function validateBackup(data){
  const fail=()=>{throw new Error('Invalid Elevation Air backup');};
  if(!data||data.version!==1||!Array.isArray(data.jobs)||!data.jobs.length||data.jobs.length>1000||!data.settings||!Array.isArray(data.settings.catalog)||data.settings.catalog.length>200)fail();
  const s=data.settings;
  if(!strings(s,['businessName','businessPhone','businessEmail','license']) || !['whfRate','atticRate','dischargeRate','taxRate','validDays','intakePrice','exhaustPrice'].every(k=>quantity(s[k])))fail();
  const modelIds=new Set(),jobIds=new Set();
  for(const m of s.catalog){
    if(!m||!id(m.id)||modelIds.has(m.id)||!text(m.name)||!['whole','attic','garage'].includes(m.kind)||!['trident','stealth','gable','roof','solar','garage'].includes(m.series)||!quantity(m.cfm)||!quantity(m.price)||typeof m.sample!=='boolean')fail();
    modelIds.add(m.id);
  }
  for(const j of data.jobs){
    if(!j||!id(j.id)||jobIds.has(j.id)||!strings(j,['name','address','phone','email','inspector','date','created','updated','notes','extraLabel','wholeModel','atticModel','garageModel']))fail();
    if(!['trident','stealth'].includes(j.wholeSeries)||!['gable','roof','solar'].includes(j.atticStyle)||!['adequate','inadequate'].includes(j.intake))fail();
    if(j.ceilingType!==undefined&&!['standard','vaulted'].includes(j.ceilingType))fail();
    if(Array.isArray(j.exhaustVents)) {
      if(j.exhaustVents.length>50)fail();
      for(const v of j.exhaustVents)if(!v||!text(v.type)||!quantity(v.count)||!quantity(v.nfa))fail();
    } else if(j.exhaustVents!==undefined||!text(j.exhaustType)||!quantity(j.exhaustCount)||!quantity(j.exhaustNfa))fail();
    if(![150,300].includes(Number(j.ratio))||!['qualified300','includeWhole','includeAttic','includeGarage','includeIntake','includeExhaust'].every(k=>typeof j[k]==='boolean'))fail();
    if(!['atticSqft','intakeNfa','discount','extraPrice'].every(k=>quantity(j[k]))||!Array.isArray(j.levels)||!j.levels.length||j.levels.length>20||!Array.isArray(j.photos)||j.photos.length>24)fail();
    for(const l of j.levels)if(!l||!text(l.name)||!quantity(l.sqft)||!quantity(l.height))fail();
    for(const p of j.photos)if(!p||!text(p.caption)||typeof p.data!=='string'||p.data.length>6000000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.data))fail();
    jobIds.add(j.id);
  }
  return true;
}
