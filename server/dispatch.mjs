import { readFile } from 'node:fs/promises';
const [action,file]=process.argv.slice(2);
const base=process.env.DISPATCH_URL || 'http://127.0.0.1:4040';
if(!process.env.ADMIN_TOKEN) throw new Error('Set ADMIN_TOKEN in the environment.');
const paths={drivers:'/api/admin/drivers',orders:'/api/admin/orders',assign:'/api/admin/orders'};
if(!paths[action]) throw new Error('Usage: node --env-file=.env dispatch.mjs drivers|orders|assign [order.json]');
const response=await fetch(base+paths[action],{
  method:action==='assign'?'POST':'GET',
  headers:{Authorization:`Bearer ${process.env.ADMIN_TOKEN}`,'Content-Type':'application/json'},
  ...(action==='assign'?{body:await readFile(file,'utf8')}:{})
});
const result=await response.json();
if(!response.ok) throw new Error(result.error);
console.log(JSON.stringify(result,null,2));
