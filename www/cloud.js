/* Small browser client for Supabase Auth and PostgREST. No build dependency. */
(() => {
  "use strict";
  const AUTH_KEY = "sunflower-auth-v1", PENDING_KEY = "sunflower-pending-v1";
  const cfg = window.SUNFLOWER_CONFIG || {};
  const configured = /^https:\/\//.test(cfg.url || "") && !/YOUR_|example/i.test(cfg.url) &&
    !!cfg.publishableKey && !/YOUR_|example/i.test(cfg.publishableKey);
  const origin = configured ? cfg.url.replace(/\/$/, "") : "";
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const errText = (json, status) => json?.error_description || json?.msg || json?.message || json?.error || `Request failed (${status}).`;

  class AtlasCloud {
    constructor(callbacks = {}) {
      this.callbacks = callbacks;
      this.session = read(AUTH_KEY, null);
      this.pending = Array.isArray(read(PENDING_KEY, [])) ? read(PENDING_KEY, []) : [];
      this.refreshPromise = null;
      this.syncPromise = null;
      this.timer = null;
      this.poll = null;
    }
    get configured() { return configured; }
    get signedIn() { return !!this.session?.user?.id; }
    get email() { return this.session?.user?.email || ""; }
    report(message) { this.callbacks.onStatus?.(message); }
    authChanged() { this.callbacks.onAuth?.(this.signedIn, this.email); }
    persistSession(json) {
      if (!json?.access_token || !json?.refresh_token || !json?.user?.id) throw new Error("The sign-in response was incomplete.");
      this.session = {access_token:json.access_token,refresh_token:json.refresh_token,user:{id:json.user.id,email:json.user.email},expires_at:Date.now()+(Number(json.expires_in)||3600)*1000};
      write(AUTH_KEY,this.session);this.authChanged();
    }
    async request(path, options={}) {
      if (!configured) throw new Error("Cloud sync has not been configured yet.");
      const {method="GET",body,token,headers={}}=options;
      const response=await fetch(origin+path,{method,headers:{apikey:cfg.publishableKey,...(token?{Authorization:`Bearer ${token}`}:{ }),...(body!==undefined?{"Content-Type":"application/json"}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
      const raw=await response.text();let json={};try{json=raw?JSON.parse(raw):{};}catch{json={message:raw.slice(0,240)}}
      if (!response.ok) throw new Error(errText(json,response.status));
      return json;
    }
    async refresh() {
      if(!this.session?.refresh_token) throw new Error("Please sign in again.");
      if(this.refreshPromise)return this.refreshPromise;
      this.refreshPromise=this.request("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:{refresh_token:this.session.refresh_token}}).then(json=>{this.persistSession(json);return this.session.access_token;}).catch(error=>{if(/refresh.token|invalid.grant|session.not.found/i.test(error.message)){this.session=null;localStorage.removeItem(AUTH_KEY);this.authChanged();}throw error;}).finally(()=>{this.refreshPromise=null;});
      return this.refreshPromise;
    }
    async accessToken() {if(!this.signedIn)throw new Error("Sign in to sync.");if(Date.now()>this.session.expires_at-60000)return this.refresh();return this.session.access_token;}
    async authed(path,options={}) {const token=await this.accessToken();try{return await this.request(path,{...options,token});}catch(e){if(/jwt|token.*expir|unauthorized/i.test(e.message)){const fresh=await this.refresh();return this.request(path,{...options,token:fresh});}throw e;}}
    async signUp(email,password){const url=cfg.siteUrl&&!/YOUR_/i.test(cfg.siteUrl)?`?redirect_to=${encodeURIComponent(new URL("index.html",cfg.siteUrl).href)}`:"";const result=await this.request("/auth/v1/signup"+url,{method:"POST",body:{email,password}});if(result.access_token)this.persistSession(result);return result;}
    async signIn(email,password,{sync=true}={}){const result=await this.request("/auth/v1/token?grant_type=password",{method:"POST",body:{email,password}});this.persistSession(result);if(sync)try{await this.sync();}catch(e){this.report("Signed in · changes waiting for connection");}return result;}
    async recover(email){const redirect=cfg.siteUrl&&!/YOUR_/i.test(cfg.siteUrl)?`?redirect_to=${encodeURIComponent(new URL("reset.html",cfg.siteUrl).href)}`:"";await this.request("/auth/v1/recover"+redirect,{method:"POST",body:{email}});}
    async resetPassword(accessToken,password){return this.request("/auth/v1/user",{method:"PUT",body:{password},token:accessToken});}
    async signOut(){if(this.signedIn&&this.pending.length){await this.sync();if(this.pending.length)throw new Error("Some changes are waiting to sync. Connect to the internet or export a backup first.");}try{if(this.signedIn)await this.authed("/auth/v1/logout",{method:"POST"});}catch{}this.clearSession();this.callbacks.onClear?.();}
    clearSession(){this.session=null;localStorage.removeItem(AUTH_KEY);this.pending=[];write(PENDING_KEY,[]);this.authChanged();this.report(configured?"On this device":"Cloud setup needed");}
    async deleteAccount(){if(!this.signedIn)throw new Error("Sign in first.");await this.authed("/rest/v1/rpc/delete_my_account",{method:"POST",body:{}});this.clearSession();this.callbacks.onClear?.();}
    enqueue(ops){if(!ops?.length)return;for(const op of ops){const next={...op,nonce:`${Date.now()}-${Math.random()}`};this.pending=this.pending.filter(old=>old.key!==op.key);this.pending.push(next);}write(PENDING_KEY,this.pending);this.report(this.signedIn?"Changes waiting to sync":"Saved on this device · sign in to sync");if(this.signedIn){clearTimeout(this.timer);this.timer=setTimeout(()=>this.sync().catch(()=>{}),650);}}
    async upload(op){const uid=this.session.user.id;
      if(op.kind==="field")return this.authed("/rest/v1/atlas_fields?on_conflict=user_id,place_id,field",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:{user_id:uid,place_id:op.placeId,field:op.field,value:op.value}});
      if(op.kind==="diary")return this.authed("/rest/v1/atlas_diary?on_conflict=user_id,id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:{user_id:uid,id:op.id,place_id:op.placeId,title:op.deleted?"":op.title,body:op.deleted?"":op.body,entry_date:op.date||new Date().toISOString(),deleted:!!op.deleted}});
      if(op.kind==="place")return this.authed("/rest/v1/atlas_custom_places?on_conflict=user_id,id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},body:{user_id:uid,id:op.id,city:op.deleted?"":op.city,country:op.deleted?"":op.country,region:op.region||"The Americas",deleted:!!op.deleted}});
    }
    async flush(){while(this.signedIn&&this.pending.length){const op=this.pending[0];await this.upload(op);if(this.pending[0]?.nonce===op.nonce)this.pending.shift();write(PENDING_KEY,this.pending);}}
    async rows(table,columns){const uid=this.session.user.id;let offset=0,all=[];while(true){const rows=await this.authed(`/rest/v1/${table}?user_id=eq.${encodeURIComponent(uid)}&select=${encodeURIComponent(columns)}&limit=1000&offset=${offset}`);if(!Array.isArray(rows))throw new Error("Unexpected sync response.");all.push(...rows);if(rows.length<1000)break;offset+=1000;}return all;}
    async pull(){if(this.pending.length||!this.callbacks.makeEmpty?.()||this.callbacks.canApplyRemote?.()===false)return;const [fields,diaries,custom]=await Promise.all([this.rows("atlas_fields","place_id,field,value"),this.rows("atlas_diary","id,place_id,title,body,entry_date,deleted"),this.rows("atlas_custom_places","id,city,country,region,deleted")]);if(this.pending.length||this.callbacks.canApplyRemote?.()===false)return;const next=this.callbacks.makeEmpty();next.selected=this.callbacks.getState?.().selected||next.selected;
      for(const r of fields){if(typeof r.place_id!=="string")continue;switch(r.field){case"visited":next.visited[r.place_id]=r.value===true;break;case"choice":(next.scenes[r.place_id]??={found:[false,false,false],choice:null}).choice=Number.isInteger(r.value)?r.value:null;break;case"companion":if(r.place_id==="profile:mindy")next.mindy=r.value;else next.companions[r.place_id]=r.value;break;default:if(/^petal_[012]$/.test(r.field))(next.scenes[r.place_id]??={found:[false,false,false],choice:null}).found[Number(r.field.at(-1))]=r.value===true;}}
      for(const r of diaries)if(!r.deleted){(next.diaries[r.place_id]??=[]).push({id:r.id,title:r.title||"",body:r.body||"",date:r.entry_date||new Date().toISOString()});}
      for(const entries of Object.values(next.diaries))entries.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
      next.customPlaces=custom.filter(r=>!r.deleted).map(r=>({id:r.id,city:r.city,country:r.country,region:r.region}));this.callbacks.onRemote?.(next);
    }
    async sync(){if(!this.signedIn)return;if(this.syncPromise)return this.syncPromise;this.syncPromise=(async()=>{this.report("Syncing…");try{await this.flush();await this.pull();this.report(this.pending.length?"Changes waiting to sync":"Synced across devices");}catch(e){this.report("Offline changes saved · will retry");throw e;}finally{this.syncPromise=null;}})();return this.syncPromise;}
    async init(){this.authChanged();this.report(configured?(this.signedIn?"Connecting…":"Saved on this device · sign in to sync"):"Cloud setup needed");if(this.signedIn)try{await this.sync();}catch{}this.poll=setInterval(()=>{if(this.signedIn&&document.visibilityState!=="hidden")this.sync().catch(()=>{});},20000);window.addEventListener("online",()=>this.sync().catch(()=>{}));document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")this.sync().catch(()=>{});});}
  }
  window.SunflowerCloud=AtlasCloud;
})();
