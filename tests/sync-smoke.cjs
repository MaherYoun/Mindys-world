/* Two independent devices against a small in-memory REST server.
   Run: node tests/sync-smoke.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../www/cloud.js"), "utf8");
const data = {atlas_fields:new Map(),atlas_diary:new Map(),atlas_custom_places:new Map()};
let online=true, deleted=false;
const response=(value,status=200)=>({ok:status>=200&&status<300,status,text:async()=>value==null?"":JSON.stringify(value)});
async function fetchMock(url,options={}) {
  if(!online)throw new Error("network offline");
  const u=new URL(url),p=u.pathname,method=options.method||"GET",body=options.body?JSON.parse(options.body):{};
  if(p==="/auth/v1/token")return response({access_token:"user-jwt",refresh_token:"refresh",expires_in:3600,user:{id:"user-1",email:"friend@example.com"}});
  if(p==="/auth/v1/logout")return response(null,204);
  if(p==="/rest/v1/rpc/delete_my_account"){assert.equal(options.headers.Authorization,"Bearer user-jwt");deleted=true;Object.values(data).forEach(map=>map.clear());return response(null,204);}
  const table=p.split("/")[3],map=data[table];if(!map)return response({message:"not found"},404);
  assert.equal(options.headers.apikey,"sb_publishable_test");assert.equal(options.headers.Authorization,"Bearer user-jwt");
  if(method==="POST"){assert.equal(body.user_id,"user-1");map.set(`${body.user_id}:${body.id||body.place_id+':'+body.field}`,body);return response(null,201);}
  const rows=[...map.values()].filter(row=>row.user_id===u.searchParams.get("user_id").slice(3));return response(rows.slice(Number(u.searchParams.get("offset")),Number(u.searchParams.get("offset"))+1000));
}
function device() {
  const values=new Map();let latest;
  const context={window:{SUNFLOWER_CONFIG:{url:"https://demo.supabase.co",publishableKey:"sb_publishable_test",siteUrl:"https://game.example/"},addEventListener(){}},document:{visibilityState:"visible",addEventListener(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},fetch:fetchMock,URL,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,Date,JSON,Math,Promise,console};
  vm.createContext(context);vm.runInContext(source,context);
  const client=new context.window.SunflowerCloud({makeEmpty:()=>({version:1,selected:"home",mindy:{skin:1,hair:0,eyes:0,outfit:0,style:"waves",accessory:"flower",build:"balanced"},visited:{},scenes:{},companions:{},diaries:{},customPlaces:[]}),getState:()=>latest||{selected:"home"},canApplyRemote:()=>true,onRemote:next=>{latest=next;}});
  return {client,get latest(){return latest;}};
}
(async()=>{
  const phone=device(),web=device();
  phone.client.enqueue([{kind:"diary",key:"diary:entry-1",id:"entry-1",placeId:"caucasus-armenia-yerevan",title:"Yerevan",body:"First page",date:"2026-09-27T00:00:00.000Z"}]);
  await phone.client.signIn("friend@example.com","pass12345");assert.equal(phone.client.pending.length,0);
  await web.client.signIn("friend@example.com","pass12345");assert.equal(web.latest.diaries["caucasus-armenia-yerevan"][0].body,"First page");
  web.client.enqueue([{kind:"diary",key:"diary:entry-1",id:"entry-1",placeId:"caucasus-armenia-yerevan",title:"Yerevan",body:"Edited from web",date:"2026-09-27T00:00:00.000Z"}]);
  await web.client.sync();await phone.client.sync();assert.equal(phone.latest.diaries["caucasus-armenia-yerevan"][0].body,"Edited from web");
  phone.client.enqueue([{kind:"place",key:"place:custom-mine",id:"custom-mine",city:"My City",country:"My Country",region:"East Asia",deleted:false}]);
  phone.client.enqueue([{kind:"field",key:"field:custom-mine:companion",placeId:"custom-mine",field:"companion",value:{name:"Lumi",skin:2,hair:4,eyes:1,outfit:3}}]);
  await phone.client.sync();await web.client.sync();assert.equal(web.latest.customPlaces[0].city,"My City");assert.equal(web.latest.companions["custom-mine"].name,"Lumi");
  phone.client.enqueue([{kind:"field",key:"field:profile:mindy:companion",placeId:"profile:mindy",field:"companion",value:{skin:4,hair:2,eyes:3,outfit:0,style:"bun",accessory:"flower",build:"strong"}}]);
  await phone.client.sync();await web.client.sync();assert.equal(web.latest.mindy.build,"strong");assert.equal(web.latest.mindy.hair,2);assert.equal(web.latest.companions["profile:mindy"],undefined,"profile data stays separate from companions");
  online=false;phone.client.enqueue([{kind:"field",key:"field:stop:visited",placeId:"stop",field:"visited",value:true}]);await assert.rejects(phone.client.sync());assert.equal(phone.client.pending.length,1);
  online=true;await phone.client.sync();await web.client.sync();assert.equal(web.latest.visited.stop,true);
  const deletionPage=device();
  deletionPage.client.enqueue([{kind:"diary",key:"diary:local-draft",id:"local-draft",placeId:"stop",title:"Private draft",body:"Never uploaded",date:"2026-09-27T00:00:00.000Z"}]);
  await deletionPage.client.signIn("friend@example.com","pass12345",{sync:false});
  assert.equal(data.atlas_diary.size,1,"Deletion page must not upload local drafts on sign-in");
  await deletionPage.client.deleteAccount();assert.equal(deleted,true);assert.equal(data.atlas_diary.size,0);assert.equal(deletionPage.client.signedIn,false);
  console.log("Two-device sync, offline queue and account deletion passed.");
})().catch(error=>{console.error(error);process.exitCode=1;});
