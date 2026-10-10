const open = () => new Promise((resolve,reject)=>{
  const r=indexedDB.open('elevation-air',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('data');
  r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
});
export async function read(key) {
  const db=await open();
  try {return await new Promise((resolve,reject)=>{const r=db.transaction('data').objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});} finally {db.close();}
}
export async function write(key,value) {
  const db=await open();
  try {await new Promise((resolve,reject)=>{const t=db.transaction('data','readwrite');t.objectStore('data').put(value,key);t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});} finally {db.close();}
}
