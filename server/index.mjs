import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scrypt, timingSafeEqual, createHmac, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const derive = promisify(scrypt);
const transitions = { pending: ['accepted','declined'], accepted: ['enroute','failed'], enroute: ['arrived','failed'], arrived: ['delivered','failed'], delivered: [], failed: [], declined: [] };
class HttpError extends Error { constructor(status,message) { super(message); this.status=status; } }
const fail=(condition,message,status=400)=>{ if(condition) throw new HttpError(status,message); };
const text=(value,name,max=2000,optional=false)=>{ fail(typeof value!=='string' || value.length>max || (!optional && !value.trim()),`Invalid ${name}.`); return value.trim(); };
const phone=v=>String(v||'').replace(/[^\d+]/g,'');
const finite=(v,min,max)=>typeof v==='number' && Number.isFinite(v) && v>=min && v<=max;
const instant=v=>typeof v==='string' && Number.isFinite(Date.parse(v));
const equal=(a,b)=>{ const x=Buffer.from(a),y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y); };
const json=v=>JSON.stringify(v);
const parse=v=>JSON.parse(v);
function image(value) {
  fail(typeof value!=='string' || value.length>5_000_000 || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=\r\n]+$/.test(value),'Invalid image (JPEG/PNG, maximum 3.7 MB).');
  const bytes=Buffer.from(value.split(',')[1],'base64');
  fail(!(bytes[0]===0xff && bytes[1]===0xd8 || bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))),'Invalid image bytes.');
  return value;
}
function coordinates(p) {
  fail(!p || !finite(p.latitude,-90,90) || !finite(p.longitude,-180,180) || !finite(p.timestamp,0,Date.now()+300000),'Invalid GPS point.');
  fail(p.accuracy!=null && !finite(p.accuracy,0,1_000_000),'Invalid GPS accuracy.');
}
function proof(p) {
  fail(!p || typeof p!=='object','Delivery proof is required.');
  text(p.recipient,'recipient',100); image(p.photo); fail(!instant(p.capturedAt),'Invalid proof timestamp.');
  fail(!Array.isArray(p.signature) || p.signature.length>100,'Invalid signature.');
  for (const stroke of p.signature) {
    fail(!Array.isArray(stroke) || stroke.length>2000,'Invalid signature stroke.');
    for (const point of stroke) fail(!finite(point.x,0,340) || !finite(point.y,0,180),'Invalid signature coordinates.');
  }
  fail(!p.signature.some(s=>s.length>=4 && s.reduce((n,p,i)=>i?n+Math.hypot(p.x-s[i-1].x,p.y-s[i-1].y):n,0)>25),'A drawn signature is required.');
  if(p.location) coordinates(p.location); else text(p.locationReason,'GPS exception reason',250);
}
export function createDispatch({ dbPath=process.env.DB_PATH || './data/dispatch.sqlite', jwtSecret=process.env.JWT_SECRET, adminToken=process.env.ADMIN_TOKEN, allowedOrigins=(process.env.CORS_ORIGINS || '').split(',').filter(Boolean), sendPush }={}) {
  fail(!jwtSecret || jwtSecret.length<32,'Set JWT_SECRET to at least 32 random characters.',500);
  fail(!adminToken || adminToken.length<32,'Set ADMIN_TOKEN to at least 32 random characters.',500);
  if(dbPath!==':memory:') mkdirSync(dirname(resolve(dbPath)),{ recursive:true, mode:0o700 });
  const db=new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS drivers(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,phone TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password TEXT NOT NULL,profile TEXT NOT NULL,shift INTEGER NOT NULL DEFAULT 0,location TEXT,push TEXT);
    CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,driver TEXT NOT NULL REFERENCES drivers(id),body TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS mutations(driver TEXT NOT NULL,id TEXT NOT NULL,hash TEXT NOT NULL,PRIMARY KEY(driver,id));
    CREATE TABLE IF NOT EXISTS push_queue(id TEXT PRIMARY KEY,driver TEXT NOT NULL,body TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL);
  `);
  const issue=user=>{ const h=Buffer.from(json({ alg:'HS256',typ:'JWT' })).toString('base64url'); const p=Buffer.from(json({ sub:user.id,iss:'eskort-dispatch',aud:'eskort-driver',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+60*60*24*30 })).toString('base64url'); return `${h}.${p}.${createHmac('sha256',jwtSecret).update(`${h}.${p}`).digest('base64url')}`; };
  function driver(token) {
    try {
      const parts=token.split('.'); fail(parts.length!==3,'Invalid session.',401);
      const [h,p,s]=parts; fail(!equal(s,createHmac('sha256',jwtSecret).update(`${h}.${p}`).digest('base64url')),'Invalid session.',401);
      const header=parse(Buffer.from(h,'base64url').toString()), claims=parse(Buffer.from(p,'base64url').toString());
      fail(header.alg!=='HS256' || claims.iss!=='eskort-dispatch' || claims.aud!=='eskort-driver' || !Number.isFinite(claims.exp) || claims.exp<=Date.now()/1000,'Session expired.',401);
      const d=db.prepare('SELECT * FROM drivers WHERE id=?').get(claims.sub); fail(!d,'Invalid session.',401); return d;
    } catch { throw new HttpError(401,'Session expired. Sign in again.'); }
  }
  function transaction(work) { db.exec('BEGIN IMMEDIATE'); try { const result=work(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } }
  const enqueue=(driverId,orderId,title)=>db.prepare('INSERT INTO push_queue VALUES(?,?,?,?,?)').run(randomUUID(),driverId,json({ title,body:'Open your delivery feed for details.',data:{ orderId },channelId:'deliveries',sound:'default' }),0,Date.now());
  let pushing=false;
  async function pushTick() {
    if(pushing) return; pushing=true;
    try {
      for(const task of db.prepare('SELECT * FROM push_queue WHERE next_at<=? LIMIT 20').all(Date.now())) {
        const d=db.prepare('SELECT push FROM drivers WHERE id=?').get(task.driver);
        if(!d?.push) { db.prepare('DELETE FROM push_queue WHERE id=?').run(task.id); continue; }
        try {
          const message={ to:d.push,...parse(task.body) };
          const result=sendPush ? await sendPush(message) : await fetch('https://exp.host/--/api/v2/push/send',{ method:'POST',headers:{ 'Content-Type':'application/json',...(process.env.EXPO_ACCESS_TOKEN?{ Authorization:`Bearer ${process.env.EXPO_ACCESS_TOKEN}` }:{}) },body:json(message),signal:AbortSignal.timeout(15000) }).then(async r=>{ if(!r.ok) throw new Error('Push transport error'); return r.json(); });
          const ticket=Array.isArray(result.data)?result.data[0]:result.data;
          if(ticket?.status==='error') {
            if(ticket.details?.error==='DeviceNotRegistered') { db.prepare('UPDATE drivers SET push=NULL WHERE id=?').run(task.driver); db.prepare('DELETE FROM push_queue WHERE id=?').run(task.id); continue; }
            throw new Error('Push rejected');
          }
          if(ticket?.status!=='ok') throw new Error('No push ticket');
          db.prepare('DELETE FROM push_queue WHERE id=?').run(task.id);
        } catch { db.prepare('UPDATE push_queue SET attempts=attempts+1,next_at=? WHERE id=?').run(Date.now()+Math.min(3600000,30000*2**Math.min(task.attempts,7)),task.id); }
      }
    } finally { pushing=false; }
  }
  const rates=new Map();
  async function handler(req,res) {
    const origin=req.headers.origin;
    const headers={ 'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',...(allowedOrigins.includes(origin)?{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS'}:{}) };
    const send=(status,value)=>{ res.writeHead(status,headers); res.end(json(value)); };
    try {
      if(req.method==='OPTIONS') { send(204,null); return; }
      const url=new URL(req.url,'http://localhost'), path=url.pathname;
      if(path==='/health') { send(200,{ ok:true }); return; }
      let body={};
      if(['POST','PATCH'].includes(req.method)) {
        let size=0; const chunks=[];
        for await(const chunk of req) { size+=chunk.length; fail(size>6_000_000,'Request too large.',413); chunks.push(chunk); }
        try { body=parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw new HttpError(400,'Invalid JSON.'); }
        fail(!body || Array.isArray(body) || typeof body!=='object','Expected JSON object.');
      }
      if(path.startsWith('/api/auth/') && req.method==='POST') {
        const ip=req.socket.remoteAddress, now=Date.now(), rate=rates.get(ip);
        if(!rate || rate.until<now) rates.set(ip,{count:1,until:now+60000}); else { rate.count++; fail(rate.count>20,'Too many attempts. Try again in a minute.',429); }
        if(rates.size>10000) for(const [key,value] of rates) if(value.until<now) rates.delete(key);
        const identifier=text(body.identifier,'email or phone',254).toLowerCase();
        text(body.password,'password',256);
        const password=body.password;
        let d;
        if(path==='/api/auth/register') {
          fail(password.length<10,'Password must contain at least 10 characters.');
          fail(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier),'Enter a valid email.');
          const name=text(body.name,'name',100), mobile=phone(body.phone);
          fail(!/^\+?\d{8,15}$/.test(mobile),'Enter a valid mobile number.');
          fail(db.prepare('SELECT id FROM drivers WHERE email=? OR phone=?').get(identifier,mobile),'An account already uses those details.',409);
          const salt=randomBytes(16).toString('hex'), hash=(await derive(password,salt,64)).toString('hex'), id=randomUUID();
          const user={id,name,email:identifier,phone:mobile,vehicle:''};
          try { db.prepare('INSERT INTO drivers(id,email,phone,salt,password,profile) VALUES(?,?,?,?,?,?)').run(id,identifier,mobile,salt,hash,json(user)); } catch { throw new HttpError(409,'An account already uses those details.'); }
          d=db.prepare('SELECT * FROM drivers WHERE id=?').get(id);
        } else if(path==='/api/auth/login') {
          d=db.prepare('SELECT * FROM drivers WHERE email=? OR phone=?').get(identifier,phone(identifier));
          const hash=await derive(password,d?.salt || 'unregistered-account-constant',64);
          fail(!d || !equal(hash.toString('hex'),d.password),'Email/phone or password is incorrect.',401);
        } else throw new HttpError(404,'Not found.');
        const user=parse(d.profile); send(200,{user,token:issue(user)}); return;
      }
      const token=(req.headers.authorization || '').replace(/^Bearer /,'');
      if(path.startsWith('/api/admin/')) {
        fail(!equal(token,adminToken),'Admin authorization required.',401);
        if(path==='/api/admin/drivers' && req.method==='GET') { send(200,{drivers:db.prepare('SELECT profile,shift,location FROM drivers').all().map(d=>({...parse(d.profile),onShift:!!d.shift,location:d.location?parse(d.location):null}))}); return; }
        if(path==='/api/admin/orders' && req.method==='GET') { send(200,{orders:db.prepare('SELECT driver,body FROM orders').all().map(o=>({...parse(o.body),driverId:o.driver}))}); return; }
        if(path==='/api/admin/orders' && req.method==='POST') {
          const driverId=text(body.driverId,'driver ID',100); fail(!db.prepare('SELECT id FROM drivers WHERE id=?').get(driverId),'Driver not found.',404);
          const now=new Date().toISOString(), o={id:randomUUID(),status:'pending',notes:[],createdAt:now,updatedAt:now};
          for(const key of ['reference','customer','address','suburb','store','windowStart','windowEnd']) o[key]=text(body[key],key,300);
          for(const key of ['phone','email','storePhone','storeEmail','instructions','dispatchNotes']) o[key]=text(body[key] ?? '',key,2000,true);
          fail(!instant(o.windowStart) || !instant(o.windowEnd) || Date.parse(o.windowStart)>Date.parse(o.windowEnd),'Invalid delivery window.');
          fail(!finite(body.latitude,-90,90) || !finite(body.longitude,-180,180),'Invalid destination coordinates.');
          fail(!Number.isInteger(body.packages) || body.packages<1 || body.packages>1000,'Invalid package count.');
          if(body.eta != null) { fail(!instant(body.eta),'Invalid ETA.'); o.eta=body.eta; }
          Object.assign(o,{latitude:body.latitude,longitude:body.longitude,packages:body.packages});
          transaction(()=>{ db.prepare('INSERT INTO orders VALUES(?,?,?)').run(o.id,driverId,json(o)); enqueue(driverId,o.id,'New delivery assigned'); });
          send(201,{order:o}); void pushTick(); return;
        }
        const match=path.match(/^\/api\/admin\/orders\/([a-f0-9-]+)$/);
        if(match && req.method==='PATCH') {
          const record=db.prepare('SELECT * FROM orders WHERE id=?').get(match[1]); fail(!record,'Delivery not found.',404); const o=parse(record.body);
          for(const key of ['instructions','dispatchNotes']) if(body[key]!==undefined) o[key]=text(body[key],key,2000,true);
          if(body.eta !== undefined) { fail(body.eta !== null && !instant(body.eta),'Invalid ETA.'); if(body.eta===null) delete o.eta; else o.eta=body.eta; }
          o.updatedAt=new Date().toISOString();
          transaction(()=>{ db.prepare('UPDATE orders SET body=? WHERE id=?').run(json(o),o.id); enqueue(record.driver,o.id,body.escalation===true?'Delivery needs attention':'Delivery instructions updated'); });
          send(200,{order:o}); void pushTick(); return;
        }
        throw new HttpError(404,'Not found.');
      }
      const d=driver(token);
      if(path==='/api/snapshot' && req.method==='GET') { send(200,{profile:parse(d.profile),orders:db.prepare('SELECT body FROM orders WHERE driver=?').all(d.id).map(o=>parse(o.body))}); return; }
      if(path==='/api/mutations' && req.method==='POST') {
        const id=text(body.id,'mutation ID',100), hash=createHash('sha256').update(json(body)).digest('hex');
        fail(!instant(body.createdAt),'Invalid mutation timestamp.');
        const result=transaction(()=>{
          const prior=db.prepare('SELECT hash FROM mutations WHERE driver=? AND id=?').get(d.id,id);
          if(prior) { fail(prior.hash!==hash,'Mutation ID reused with different data.',409); return {ok:true,duplicate:true}; }
          const p=body.payload; fail(!p || typeof p!=='object','Invalid mutation payload.');
          if(body.kind==='status' || body.kind==='note') {
            const record=db.prepare('SELECT * FROM orders WHERE id=? AND driver=?').get(body.orderId || '',d.id); fail(!record,'Delivery not found.',404);
            const o=parse(record.body);
            if(body.kind==='note') o.notes.push({ id,text:text(p.text,'note',2000),createdAt:body.createdAt });
            else {
              fail(!transitions[o.status]?.includes(p.status),'Delivery state conflict. Contact dispatch with the order reference.',409);
              if(['failed','declined'].includes(p.status)) o.reason=text(p.reason,'reason',1500);
              if(p.status==='delivered') { proof(p.proof); o.proof=p.proof; }
              o.status=p.status;
              if(['delivered','failed','declined'].includes(o.status)) o.completedAt=body.createdAt;
            }
            o.updatedAt=new Date().toISOString(); db.prepare('UPDATE orders SET body=? WHERE id=?').run(json(o),o.id);
          } else if(body.kind==='profile') {
            const profile=parse(d.profile);
            for(const key of ['name','vehicle']) if(p[key]!==undefined) profile[key]=text(p[key],key,100,key==='vehicle');
            if(p.phone!==undefined) { profile.phone=phone(p.phone); fail(!/^\+?\d{8,15}$/.test(profile.phone),'Invalid mobile number.'); fail(db.prepare('SELECT id FROM drivers WHERE phone=? AND id<>?').get(profile.phone,d.id),'Mobile number already in use.',409); }
            if(p.avatar!==undefined) profile.avatar=image(p.avatar);
            db.prepare('UPDATE drivers SET profile=?,phone=? WHERE id=?').run(json(profile),profile.phone,d.id);
          } else if(body.kind==='shift') {
            fail(typeof p.active!=='boolean','Invalid shift state.'); db.prepare('UPDATE drivers SET shift=?,location=CASE WHEN ?=0 THEN NULL ELSE location END WHERE id=?').run(p.active?1:0,p.active?1:0,d.id);
          } else throw new HttpError(400,'Unknown mutation kind.');
          db.prepare('INSERT INTO mutations VALUES(?,?,?)').run(d.id,id,hash); return {ok:true};
        });
        send(200,result); return;
      }
      if(path==='/api/location' && req.method==='POST') {
        coordinates(body); fail(!d.shift,'No active shift.',409);
        if(!d.location || parse(d.location).timestamp<=body.timestamp) db.prepare('UPDATE drivers SET location=? WHERE id=?').run(json(body),d.id);
        send(200,{ok:true}); return;
      }
      if(path==='/api/push-token' && req.method==='POST') {
        fail(body.token!==null && (typeof body.token!=='string' || !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(body.token)),'Invalid push token.');
        transaction(()=>{ if(body.token) db.prepare('UPDATE drivers SET push=NULL WHERE push=?').run(body.token); db.prepare('UPDATE drivers SET push=? WHERE id=?').run(body.token,d.id); });
        send(200,{ok:true}); return;
      }
      throw new HttpError(404,'Not found.');
    } catch(e) { send(e.status || 500,{ error:e.status ? e.message : 'Dispatch could not process the request.' }); }
  }
  const server=http.createServer(handler);
  const interval=setInterval(()=>{ void pushTick(); },30000); interval.unref();
  server.on('close',()=>{ clearInterval(interval); db.close(); });
  return { server, db, pushTick };
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  const {server}=createDispatch();
  server.listen(Number(process.env.PORT || 4040),process.env.HOST || '127.0.0.1',()=>console.log(`Eskort dispatch listening on port ${process.env.PORT || 4040}`));
}
