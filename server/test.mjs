import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createDispatch } from './index.mjs';
const secret='test-secret-'.repeat(6), admin='test-admin-'.repeat(6);
test('authenticated delivery lifecycle, ownership, durable idempotency and push',async t=>{
  const dir=mkdtempSync(join(tmpdir(),'eskort-dispatch-'));
  const path=join(dir,'test.sqlite');
  const sent=[];
  const start=async()=>{const a=createDispatch({dbPath:path,jwtSecret:secret,adminToken:admin,sendPush:async m=>{sent.push(m);return {data:{status:'ok',id:randomUUID()}};}});a.server.listen(0,'127.0.0.1');await once(a.server,'listening');return a;};
  let app=await start();
  t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));rmSync(dir,{recursive:true,force:true});});
  const call=async(path,token,body,method)=>{const r=await fetch(`http://127.0.0.1:${app.server.address().port}${path}`,{method:method || (body?'POST':'GET'),headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,...await r.json()};};
  const register=async(n)=>call('/api/auth/register',null,{identifier:`driver${n}@example.com`,name:`Driver ${n}`,phone:`+2782000000${n}`,password:'a-long-test-password'});
  const a=await register(1), b=await register(2);
  assert.equal(a.status,200);assert.equal(b.status,200);
  await t.test('email and phone login, forged JWT and admin boundary',async()=>{
    assert.equal((await call('/api/auth/login',null,{identifier:'+27820000001',password:'a-long-test-password'})).status,200);
    assert.equal((await call('/api/auth/login',null,{identifier:'driver1@example.com',password:'wrong'})).status,401);
    assert.equal((await call('/api/snapshot',a.token.slice(0,-8)+'abcdefgh')).status,401);
    assert.equal((await call('/api/admin/drivers',a.token)).status,401);
    assert.equal((await call('/api/snapshot')).status,401);
  });
  const created=await call('/api/admin/orders',admin,{driverId:a.user.id,reference:'ESK-TEST',customer:'Test Customer',address:'12 4th Avenue',suburb:'Parkhurst',store:'Test Store',windowStart:new Date().toISOString(),windowEnd:new Date(Date.now()+7200000).toISOString(),latitude:-26.14,longitude:28.02,packages:3});
  assert.equal(created.status,201);
  const orderId=created.order.id;
  const mutation=(kind,payload,id=randomUUID())=>({id,kind,orderId,payload,createdAt:new Date().toISOString()});
  await t.test('drivers can only read and modify their own assignments',async()=>{
    assert.equal((await call('/api/snapshot',b.token)).orders.length,0);
    assert.equal((await call('/api/mutations',b.token,mutation('status',{status:'accepted'}))).status,404);
    assert.equal((await call('/api/snapshot',a.token)).orders.length,1);
  });
  const accept=mutation('status',{status:'accepted'});
  await t.test('transitions, validation and idempotency',async()=>{
    assert.equal((await call('/api/mutations',a.token,mutation('status',{status:'delivered'}))).status,409);
    assert.equal((await call('/api/mutations',a.token,mutation('status',{status:'declined'}))).status,400);
    assert.equal((await call('/api/mutations',a.token,accept)).status,200);
    assert.equal((await call('/api/mutations',a.token,accept)).duplicate,true);
    assert.equal((await call('/api/mutations',a.token,{...accept,payload:{status:'failed',reason:'Vehicle'}})).status,409);
    assert.equal((await call('/api/mutations',a.token,mutation('status',{status:'enroute'}))).status,200);
    assert.equal((await call('/api/mutations',a.token,mutation('status',{status:'arrived'}))).status,200);
    assert.equal((await call('/api/mutations',a.token,mutation('status',{status:'delivered',proof:{}}))).status,400);
  });
  const proof={recipient:'Test Recipient',photo:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB9kAAAAASUVORK5CYII=',signature:[[{x:10,y:40},{x:30,y:60},{x:70,y:20},{x:95,y:50}]],location:null,locationReason:'No GPS indoors',capturedAt:new Date().toISOString()};
  const deliver=mutation('status',{status:'delivered',proof});
  await t.test('proof, notes and persistence across dispatch restart',async()=>{
    assert.equal((await call('/api/mutations',a.token,deliver)).status,200);
    const note=mutation('note',{text:'Handed to reception.'});
    assert.equal((await call('/api/mutations',a.token,note)).status,200);
    assert.equal((await call('/api/mutations',a.token,note)).duplicate,true);
    await new Promise(resolve=>app.server.close(resolve));app=await start();
    assert.equal((await call('/api/mutations',a.token,deliver)).duplicate,true);
    const snapshot=await call('/api/snapshot',a.token);
    assert.equal(snapshot.orders[0].status,'delivered');assert.equal(snapshot.orders[0].notes.length,1);assert.deepEqual(snapshot.orders[0].proof,proof);
  });
  await t.test('shift-bound GPS and monotonic location updates',async()=>{
    const p={latitude:-26.14,longitude:28.02,accuracy:40,timestamp:Date.now()};
    assert.equal((await call('/api/location',a.token,p)).status,409);
    assert.equal((await call('/api/mutations',a.token,mutation('shift',{active:true}))).status,200);
    assert.equal((await call('/api/location',a.token,p)).status,200);
    assert.equal((await call('/api/location',a.token,{...p,latitude:-20,timestamp:p.timestamp-10000})).status,200);
    assert.equal((await call('/api/admin/drivers',admin)).drivers.find(d=>d.id===a.user.id).location.latitude,p.latitude);
    assert.equal((await call('/api/location',a.token,{...p,latitude:100})).status,400);
    assert.equal((await call('/api/mutations',a.token,mutation('shift',{active:false}))).status,200);
    assert.equal((await call('/api/admin/drivers',admin)).drivers.find(d=>d.id===a.user.id).location,null);
  });
  await t.test('profile cannot escalate privileges or change account identity',async()=>{
    const result=await call('/api/mutations',a.token,mutation('profile',{name:'Updated Driver',id:b.user.id,role:'admin'}));
    assert.equal(result.status,200);
    const snap=await call('/api/snapshot',a.token);assert.equal(snap.profile.name,'Updated Driver');assert.equal(snap.profile.id,a.user.id);assert.equal(snap.profile.role,undefined);
  });
  await t.test('dispatch ETA is validated and reaches the driver snapshot',async()=>{
    assert.equal((await call(`/api/admin/orders/${orderId}`,admin,{eta:'invalid'},'PATCH')).status,400);
    const eta=new Date(Date.now()+600000).toISOString();
    assert.equal((await call(`/api/admin/orders/${orderId}`,admin,{eta},'PATCH')).status,200);
    assert.equal((await call('/api/snapshot',a.token)).orders[0].eta,eta);
  });
  await t.test('profile phone edits enforce uniqueness and update login',async()=>{
    assert.equal((await call('/api/mutations',a.token,mutation('profile',{phone:b.user.phone}))).status,409);
    assert.equal((await call('/api/mutations',a.token,mutation('profile',{phone:'+27829999999'}))).status,200);
    assert.equal((await call('/api/auth/login',null,{identifier:'+27829999999',password:'a-long-test-password'})).status,200);
  });
  await t.test('instruction/escalation notifications are queued and sent',async()=>{
    assert.equal((await call('/api/push-token',a.token,{token:'ExpoPushToken[testtoken]'})).status,200);
    assert.equal((await call(`/api/admin/orders/${orderId}`,admin,{instructions:'Use the side door.',escalation:true},'PATCH')).status,200);
    await app.pushTick();
    assert.ok(sent.some(m=>m.data.orderId===orderId && m.title==='Delivery needs attention'));
  });
});
