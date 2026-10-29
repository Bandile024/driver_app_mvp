const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '../src/core');
const session = { token: 'test', server: 'https://dispatch.example.com', demo: false, user: { id: 'driver-1', name: 'Driver', email: 'driver@example.com', phone: '+27820000001', vehicle: '' } };
function harness({ disk = new Map(), files = new Map(), api } = {}) {
  const modules = new Map();
  const storage = { getItem: async k => disk.get(k) || null, setItem: async (k,v) => { disk.set(k,v); }, removeItem: async k => { disk.delete(k); } };
  class ApiError extends Error { constructor(message,status) { super(message); this.status=status; } }
  const mocks = {
    '@react-native-async-storage/async-storage': storage,
    'expo-secure-store': { getItemAsync:storage.getItem,setItemAsync:storage.setItem,deleteItemAsync:storage.removeItem },
    'react-native': { Platform: { OS:'android' } },
    'expo-crypto': { randomUUID:crypto.randomUUID,CryptoDigestAlgorithm:{ SHA256:'sha256' },digestStringAsync:async (_,s)=>crypto.createHash('sha256').update(s).digest('hex') },
    'expo-file-system/legacy': { documentDirectory:'file:///app/',EncodingType:{Base64:'base64'},makeDirectoryAsync:async()=>{},getInfoAsync:async p=>({exists:files.has(p)}),writeAsStringAsync:async(p,s)=>{files.set(p,s);},readAsStringAsync:async p=>{if(!files.has(p))throw new Error('File missing');return files.get(p);},copyAsync:async({from,to})=>{files.set(to,files.get(from));} },
    './api': { ApiError, api: (...args)=>api(...args) },
  };
  function load(name) {
    const filename=path.resolve(root,name.endsWith('.ts')?name:`${name}.ts`);
    if(modules.has(filename))return modules.get(filename).exports;
    const module={exports:{}};modules.set(filename,module);
    const code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{console,setTimeout,clearTimeout,URL,fetch})(key=>key in mocks?mocks[key]:load(path.relative(root,path.resolve(path.dirname(filename),key))),module,module.exports);
    return module.exports;
  }
  return { load,disk,files,ApiError };
}
const makeOrder = () => ({id:'order-1',reference:'ESK-1',status:'arrived',notes:[],customer:'Recipient',address:'Street',suburb:'Town',packages:1,windowStart:new Date().toISOString(),windowEnd:new Date().toISOString(),latitude:-26,longitude:28});
test('durable proof outbox survives restart and retries exactly once after lost response',async()=>{
  let accepted=false, calls=0, received; const order=makeOrder();
  const photo='data:image/jpeg;base64,/9j/'+ 'A'.repeat(500000);
  const proof={recipient:'Recipient',photo,signature:[[{x:1,y:1},{x:30,y:40},{x:70,y:10},{x:90,y:40}]],capturedAt:new Date().toISOString(),location:null,locationReason:'Indoors'};
  const api=async(_s,p,body)=>{
    if(p==='/api/mutations'){calls++;received=body;if(!accepted){accepted=true;throw new Error('Connection lost after commit');}return {ok:true,duplicate:true};}
    return {orders:[{...order,status:'delivered',proof}],profile:session.user};
  };
  let h=harness({api});let storage=h.load('./storage');
  const local=await storage.persistImage(photo);
  const mutation={id:'mutation-1',orderId:order.id,kind:'status',createdAt:new Date().toISOString(),payload:{status:'delivered',proof:{...proof,photo:local}}};
  await storage.changeState(session,s=>({...s,orders:[{...order,status:'delivered',proof:{...proof,photo:local}}],outbox:[mutation]}));
  await h.load('./sync').synchronize(session);
  assert.equal((await storage.loadState(session)).outbox.length,1);
  h=harness({disk:h.disk,files:h.files,api});storage=h.load('./storage');
  const result=await h.load('./sync').synchronize(session);
  assert.equal(result.state.outbox.length,0);assert.equal(result.state.orders[0].status,'delivered');assert.equal(received.payload.proof.photo,photo);assert.equal(calls,2);
  assert.ok(result.state.orders[0].proof.photo.startsWith('file:///'));
  assert.ok(h.disk.get(storage.stateKey(session)).length<10000,'Large photos must not be embedded in AsyncStorage state');
});
test('concurrent writes do not lose notes; account caches are isolated',async()=>{
  const h=harness();const storage=h.load('./storage');
  await storage.changeState(session,s=>({...s,orders:[makeOrder()]}));
  await Promise.all(Array.from({length:20},(_,i)=>storage.changeState(session,s=>({...s,orders:s.orders.map(o=>({...o,notes:[...o.notes,{id:String(i),text:`Note ${i}`}]}))}))));
  assert.equal((await storage.loadState(session)).orders[0].notes.length,20);
  assert.equal((await storage.loadState({...session,user:{...session.user,id:'driver-2'}})).orders.length,0);
});
test('conflicting order stays queued while new offers and unrelated updates continue',async()=>{
  let h;const sent=[];
  h=harness({api:async(_s,p,m)=>{
    if(p==='/api/mutations'){if(m.orderId==='order-1')throw new h.ApiError('Conflict',409);sent.push(m.id);return {ok:true};}
    return {orders:[{...makeOrder(),status:'accepted'},{...makeOrder(),id:'order-2',status:'pending'}],profile:session.user};
  }});
  const storage=h.load('./storage');
  await storage.changeState(session,s=>({...s,orders:[makeOrder()],outbox:[
    {id:'blocked',kind:'status',orderId:'order-1',payload:{status:'delivered'}},
    {id:'dependent',kind:'note',orderId:'order-1',payload:{text:'Note'}},
    {id:'independent',kind:'shift',payload:{active:false}}
  ]}));
  const r=await h.load('./sync').synchronize(session);
  assert.equal(r.state.outbox.length,2);assert.deepEqual(sent,['independent']);assert.equal(r.newOrders.length,1);assert.equal(r.state.orders[0].status,'arrived');assert.match(r.state.syncError,/Conflict/);
});
test('cannot complete without proof, skip arrival, or decline without reason',()=>{
  const {validateTransition,validSignature}=harness().load('./types');
  assert.throws(()=>validateTransition({...makeOrder(),status:'pending'},'declined'));
  assert.throws(()=>validateTransition({...makeOrder(),status:'accepted'},'delivered'));
  assert.throws(()=>validateTransition(makeOrder(),'delivered'));
  assert.equal(validSignature([[{x:1,y:1},{x:1,y:1},{x:1,y:1},{x:1,y:1}]]),false);
  assert.equal(validSignature([[{x:1,y:1},{x:30,y:40},{x:70,y:10},{x:90,y:40}]]),true);
});
