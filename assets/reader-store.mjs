const DB='newsroom-private-reader-v1';
let dbPromise;
function openDB(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore('episodes',{keyPath:'episode'});
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>{dbPromise=null;reject(req.error);};
  });
  return dbPromise;
}
export async function readEpisode(id){
  const db=await openDB();return new Promise((resolve,reject)=>{
    const req=db.transaction('episodes','readonly').objectStore('episodes').get(id);
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
  });
}
export async function writeEpisode(record){
  const db=await openDB();return new Promise((resolve,reject)=>{
    const tx=db.transaction('episodes','readwrite');tx.objectStore('episodes').put(record);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });
}
