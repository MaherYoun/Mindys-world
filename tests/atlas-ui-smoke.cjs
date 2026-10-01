/* Game integration without a GPU: the globe fallback, Earth map travel and adding a
   place must keep working even if a device cannot create a WebGL context. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const root=path.join(__dirname,"../www"),html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const nodes=new Map();
class Element {
  constructor(id=""){this.id=id;this.children=[];this.handlers={};this.attributes={};this.dataset={};this.style={};this.className="";this.textContent="";this.value="";this.open=false;this.hidden=false;this.disabled=false;this.classList={add(){},remove(){},toggle(){}};}
  addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
  dispatch(type,extra={}){for(const fn of this.handlers[type]||[])fn({preventDefault(){},target:this,currentTarget:this,...extra});}
  click(){this.dispatch("click");}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(key,value){this.attributes[key]=String(value);} getAttribute(key){return this.attributes[key]??null;} add(option){this.children.push(option);} focus(){} reset(){} remove(){} scrollIntoView(){} setPointerCapture(){}
  showModal(){this.open=true;} close(){this.open=false;} querySelector(){return new Element();} play(){this.plays=(this.plays||0)+1;return Promise.resolve();} pause(){this.pauses=(this.pauses||0)+1;}
  getBoundingClientRect(){return {left:0,top:0,width:700,height:420};}
}
for(const id of ids)nodes.set(id,new Element(id));
nodes.get("gameLayout").hidden=true;nodes.get("globeFallback").hidden=true;
for(const id of ["characterForm","mindyForm","addPlaceForm","authForm"]){const fields=id==="characterForm"?["name","trait","skin","hair","eyes","outfit","style","accessory"]:id==="mindyForm"?["skin","hair","eyes","outfit","style","accessory","build"]:id==="addPlaceForm"?["city","country","region"]:["email","password"];nodes.get(id).elements=Object.fromEntries(fields.map(f=>[f,new Element(f)]));}
const fake2d={setTransform(){},clearRect(){},createLinearGradient(){return {addColorStop(){}};},createRadialGradient(){return {addColorStop(){}};},fillRect(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},fill(){},stroke(){},arc(){},fillText(){},drawImage(_,x,y,w,h){this.lastImage={x,y,w,h};}};
nodes.get("worldCanvas").getContext=()=>null;
nodes.get("globeCanvas").getContext=()=>null;
nodes.get("atlasMapCanvas").getContext=()=>fake2d;
nodes.get("earthMapImage").complete=true;nodes.get("earthMapImage").naturalWidth=2048;
const values=new Map(),ctx={window:{addEventListener(){},scrollTo(){}},document:{documentElement:new Element(),getElementById:id=>nodes.get(id),querySelector:q=>q===".memory-panel"?new Element():new Element(),querySelectorAll:()=>[],createElement:()=>new Element(),activeElement:null,addEventListener(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},Option:class{constructor(label,value){this.textContent=label;this.value=value;}},navigator:{},location:{protocol:"file:"},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,URL,Date,Math,JSON,Promise,console:{log:console.log,warn(){}},crypto:{randomUUID:()=>"entry-test"},confirm:()=>true,prompt:()=>"DELETE"};
ctx.window.window=ctx.window;vm.createContext(ctx);
for(const name of ["data.js","world3d.js","globe.js","cloud.js","app.js"])vm.runInContext(fs.readFileSync(path.join(root,name),"utf8"),ctx,{filename:name});
assert.equal(nodes.get("sceneCity").textContent,"Yerevan");
assert.equal(nodes.get("globeScreen").hidden,false);assert.equal(nodes.get("gameLayout").hidden,true);
assert.equal(nodes.get("globeFallback").hidden,false);
assert(html.includes('id="earthMapImage" src="./assets/earth-game-map.webp"'));
assert(html.includes('href="./icons/sunflower-emoji.svg"'));
assert(html.includes("MINDY'S WORLD"));
nodes.get("pauseButton").click();assert.equal(nodes.get("whatIfDialog").open,true);
nodes.get("whatIfThought").value="What if I am falling behind?";nodes.get("whatIfBegin").click();assert.equal(nodes.get("whatIfGround").hidden,false);
nodes.get("groundSee").click();nodes.get("groundHear").click();assert.equal(nodes.get("whatIfGroundNext").disabled,true);
nodes.get("groundFeel").click();assert.equal(nodes.get("whatIfGroundNext").disabled,false);
nodes.get("whatIfGroundNext").click();nodes.get("whatIfRelease").click();assert.equal(nodes.get("whatIfResult").hidden,false);
assert.equal(nodes.get("whatIfDiary").hidden,true,"the globe does not silently save a thought to a city");
assert.equal(values.has("sunflower-atlas-v1"),false,"the lantern does not save private text until asked");
nodes.get("whatIfDialog").close();
assert(nodes.get("globeCountryList").children.length>60);
nodes.get("globeSearch").value="beijing";nodes.get("globeSearch").dispatch("input");assert.equal(nodes.get("globeCountryList").children.length,1);
nodes.get("globeCountryList").children[0].click();assert.equal(nodes.get("globeDrawerTitle").textContent,"China");
nodes.get("globeCityList").children.find(b=>b.children[1]?.textContent==="Beijing").click();assert.equal(nodes.get("sceneCity").textContent,"Beijing");assert.equal(nodes.get("gameLayout").hidden,false);
nodes.get("editMindy").click();assert.equal(nodes.get("mindyDialog").open,true);const mindy=nodes.get("mindyForm");mindy.elements.skin.value="4";mindy.elements.hair.value="2";mindy.elements.eyes.value="3";mindy.elements.outfit.value="4";mindy.elements.style.value="bun";mindy.elements.accessory.value="glasses";mindy.elements.build.value="strong";mindy.dispatch("input");assert(nodes.get("mindyCharacterPreview").innerHTML.includes("#506e90"));mindy.dispatch("submit");assert.equal(nodes.get("mindyDialog").open,false);assert.equal(JSON.parse(values.get("sunflower-atlas-v1")).mindy.build,"strong");assert(nodes.get("mindyLook").textContent.includes("Copper hair"));
nodes.get("pauseButton").click();nodes.get("whatIfThought").value="Maybe I made the wrong choice";nodes.get("whatIfBegin").click();for(const id of ["groundSee","groundHear","groundFeel"])nodes.get(id).click();nodes.get("whatIfGroundNext").click();nodes.get("whatIfSmall").click();nodes.get("whatIfStepInput").value="Call a friend";nodes.get("whatIfLight").click();assert.equal(nodes.get("whatIfDiary").hidden,false);
const beforeSave=JSON.parse(values.get("sunflower-atlas-v1"));assert.equal(Object.keys(beforeSave.diaries).length,0);
nodes.get("whatIfDiary").click();const afterSave=JSON.parse(values.get("sunflower-atlas-v1"));assert.equal(afterSave.diaries["east-asia-china-beijing"][0].body,"A thought I noticed: Maybe I made the wrong choice\n\nOne small step: Call a friend");nodes.get("diaryDialog").close();
assert(nodes.get("adventureMusic").plays>0);nodes.get("soundButton").click();assert(nodes.get("adventureMusic").pauses>0);
nodes.get("backToGlobe").click();assert.equal(nodes.get("gameLayout").hidden,true);
nodes.get("routeIndexButton").click();assert.equal(nodes.get("worldMapDialog").open,true);assert.equal(nodes.get("mapPlaceList").children.length,178);
assert.equal(fake2d.lastImage.w,700,"the game map fills its board");
nodes.get("mapSearch").value="beijing";nodes.get("mapSearch").dispatch("input");assert.equal(nodes.get("mapPlaceList").children.length,1);
const [lat,lon]=ctx.window.SunflowerGlobeMath.coords({id:"east-asia-china-beijing",city:"Beijing",country:"China",region:"East Asia"});
nodes.get("atlasMapCanvas").dispatch("click",{clientX:(lon+180)/360*700,clientY:35+(90-lat)/180*350});assert.equal(nodes.get("sceneCity").textContent,"Beijing");assert.equal(nodes.get("worldMapDialog").open,false);
nodes.get("visitedButton").click();nodes.get("journeyButton").click();assert.equal(nodes.get("journeyDialog").open,true);assert.equal(nodes.get("journeyCards").children.length,1);assert(nodes.get("journeySummary").textContent.includes("1 place"));
nodes.get("journeyMapButton").click();assert.equal(nodes.get("journeyDialog").open,false);assert.equal(nodes.get("worldMapDialog").open,true);
nodes.get("mapZoomIn").click();assert(fake2d.lastImage.w>700,"the map can zoom in");
const panStart=fake2d.lastImage.x;nodes.get("atlasMapCanvas").dispatch("pointerdown",{pointerType:"mouse",button:0,pointerId:1,clientX:300,clientY:200});nodes.get("atlasMapCanvas").dispatch("pointermove",{pointerId:1,clientX:340,clientY:200});nodes.get("atlasMapCanvas").dispatch("pointerup",{pointerId:1,clientX:340,clientY:200});assert(fake2d.lastImage.x>panStart,"drag pans the enlarged map");
nodes.get("mapReset").click();assert.equal(fake2d.lastImage.w,700);nodes.get("worldMapDialog").close();
nodes.get("worldMapButton").click();assert.equal(nodes.get("gameLayout").hidden,true);nodes.get("globeAddPlace").click();
const form=nodes.get("addPlaceForm");form.elements.city.value="My City";form.elements.country.value="My Country";form.elements.region.value="East Asia";form.dispatch("submit");
assert.equal(nodes.get("sceneCity").textContent,"My City");
const saved=JSON.parse(values.get("sunflower-atlas-v1"));assert.equal(saved.customPlaces.length,1);assert.equal(saved.mindy.hair,2,"Mindy's look persists after traveling");
console.log("Globe entry, Mindy appearance, zoomable map, journey gallery, lantern diary, music and WebGL fallback passed.");
