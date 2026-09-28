(() => {
  "use strict";
  const DATA = window.SUNFLOWER_DATA;
  const KEY = "sunflower-atlas-v1";
  const defaultId = "caucasus-armenia-yerevan";
  const $ = id => document.getElementById(id);
  const palettes = {
    skin: [["Warm ivory","#f0cfb2"],["Honey","#d99b70"],["Golden brown","#b8734c"],["Deep brown","#80503e"],["Dark brown","#51352e"]],
    hair: [["Midnight","#2b2534"],["Chestnut","#694137"],["Copper","#ad6345"],["Golden","#bf915f"],["Silver","#b9adb0"],["Plum","#5d415c"]],
    eyes: [["Brown","#493632"],["Hazel","#786040"],["Green","#477065"],["Blue","#506e90"],["Gray","#6c7380"]],
    outfit: [["Sunset orange","#d87948"],["Sage","#628475"],["Indigo","#596587"],["Berry","#925e79"],["Gold","#ba8f4e"]]
  };
  const traits = { steady:"Steady & kind", curious:"Curious & clever", bold:"Bold & warm", playful:"Playful & thoughtful" };
  const themeByRegion = {Africa:"terraces","The Americas":"coast",Europe:"rooftops",Caucasus:"mountain","Southeast Asia":"lanterns","East Asia":"rooftops","Silk Road":"mountain"};
  const points = [{x:23,y:67},{x:54,y:47},{x:78,y:72}];
  const safeString = (x,max=120) => typeof x === "string" ? x.slice(0,max) : "";
  const isObject = x => x && typeof x === "object" && !Array.isArray(x);
  const uid = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const defaultMindy = () => ({skin:1,hair:0,eyes:0,outfit:0,style:"waves",accessory:"flower",build:"balanced"});
  const appearanceKeys = ["skin","hair","eyes","outfit","style","accessory","build"];
  function cleanAppearance(input){const base=defaultMindy(),c=isObject(input)?input:{};for(const key of ["skin","hair","eyes","outfit"]){const n=Number(c[key]);base[key]=Number.isInteger(n)&&n>=0&&n<palettes[key].length?n:base[key];}for(const [key,options] of Object.entries({style:["waves","short","bun","long"],accessory:["none","scarf","glasses","flower"],build:["slim","balanced","strong"]}))if(options.includes(c[key]))base[key]=c[key];return base;}
  const initial = () => ({version:1,selected:defaultId,mindy:defaultMindy(),visited:{},scenes:{},companions:{},diaries:{},customPlaces:[]});
  function validate(input) {
    if (!isObject(input) || input.version !== 1) throw new Error("This isn't a backup from Mindy's World.");
    const clean = initial();
    clean.selected = safeString(input.selected,130) || defaultId;
    clean.mindy=cleanAppearance(input.mindy);
    if (isObject(input.visited)) for (const [key,value] of Object.entries(input.visited).slice(0,1000)) if (value === true) clean.visited[safeString(key,130)] = true;
    if (isObject(input.scenes)) for (const [key,value] of Object.entries(input.scenes).slice(0,1000)) if (isObject(value)) clean.scenes[safeString(key,130)] = {found:Array.isArray(value.found)?[0,1,2].map(i=>value.found[i]===true):[false,false,false],choice:Number.isInteger(value.choice)&&value.choice>=0&&value.choice<3?value.choice:null};
    if (isObject(input.companions)) for (const [key,c] of Object.entries(input.companions).slice(0,1000)) if (isObject(c)) clean.companions[safeString(key,130)] = {name:safeString(c.name,24)||"Sol",trait:traits[c.trait]?c.trait:"steady",skin:Math.max(0,Math.min(4,Number(c.skin)||0)),hair:Math.max(0,Math.min(5,Number(c.hair)||0)),eyes:Math.max(0,Math.min(4,Number(c.eyes)||0)),outfit:Math.max(0,Math.min(4,Number(c.outfit)||0)),style:["waves","short","bun","long"].includes(c.style)?c.style:"waves",accessory:["none","scarf","glasses","flower"].includes(c.accessory)?c.accessory:"none"};
    if (Array.isArray(input.customPlaces)) clean.customPlaces = input.customPlaces.slice(0,200).filter(isObject).map(p=>({id:safeString(p.id,130),city:safeString(p.city,48),country:safeString(p.country,48),region:DATA.regions.includes(p.region)?p.region:"The Americas"})).filter(p=>p.id.startsWith("custom-")&&p.city&&p.country);
    if (isObject(input.diaries)) for (const [key,entries] of Object.entries(input.diaries).slice(0,1000)) if (Array.isArray(entries)) clean.diaries[safeString(key,130)] = entries.slice(0,300).filter(isObject).map(e=>({id:safeString(e.id,80)||uid(),title:safeString(e.title,100),body:safeString(e.body,20000),date:safeString(e.date,40)}));
    return clean;
  }
  function load() { try { const raw=localStorage.getItem(KEY); return raw?validate(JSON.parse(raw)):initial(); } catch { return initial(); } }
  let state = load();
  let snapshot = JSON.parse(JSON.stringify(state));
  let cloud, world, globe;
  function diffState(before, after) {
    const ops=[];const put=(kind,key,data)=>ops.push({kind,key,...data});
    for(const id of new Set([...Object.keys(before.visited||{}),...Object.keys(after.visited||{})]))
      if(!!before.visited[id]!==!!after.visited[id])put("field",`field:${id}:visited`,{placeId:id,field:"visited",value:!!after.visited[id]});
    for(const id of new Set([...Object.keys(before.scenes||{}),...Object.keys(after.scenes||{})])){
      const a=before.scenes[id]||{},b=after.scenes[id]||{};
      for(let i=0;i<3;i++)if(!!a.found?.[i]!==!!b.found?.[i])put("field",`field:${id}:petal_${i}`,{placeId:id,field:`petal_${i}`,value:!!b.found?.[i]});
      if((a.choice??null)!==(b.choice??null))put("field",`field:${id}:choice`,{placeId:id,field:"choice",value:b.choice??null});
    }
    for(const id of new Set([...Object.keys(before.companions||{}),...Object.keys(after.companions||{})]))
      if(JSON.stringify(before.companions[id]??null)!==JSON.stringify(after.companions[id]??null))put("field",`field:${id}:companion`,{placeId:id,field:"companion",value:after.companions[id]??null});
    if(JSON.stringify(before.mindy)!==JSON.stringify(after.mindy))put("field","field:profile:mindy:companion",{placeId:"profile:mindy",field:"companion",value:after.mindy});
    const oldEntries=Object.entries(before.diaries||{}).flatMap(([placeId,entries])=>entries.map(e=>({placeId,...e}))),newEntries=Object.entries(after.diaries||{}).flatMap(([placeId,entries])=>entries.map(e=>({placeId,...e}))),oldMap=new Map(oldEntries.map(e=>[e.id,e])),newMap=new Map(newEntries.map(e=>[e.id,e]));
    for(const id of new Set([...oldMap.keys(),...newMap.keys()])){const a=oldMap.get(id),b=newMap.get(id);if(JSON.stringify(a??null)!==JSON.stringify(b??null))put("diary",`diary:${id}`,{id,placeId:(b||a).placeId,title:b?.title||"",body:b?.body||"",date:b?.date||a?.date,deleted:!b});}
    const oldPlaces=new Map((before.customPlaces||[]).map(p=>[p.id,p])),newPlaces=new Map((after.customPlaces||[]).map(p=>[p.id,p]));
    for(const id of new Set([...oldPlaces.keys(),...newPlaces.keys()])){const a=oldPlaces.get(id),b=newPlaces.get(id);if(JSON.stringify(a??null)!==JSON.stringify(b??null))put("place",`place:${id}`,{id,city:b?.city||"",country:b?.country||"",region:(b||a).region,deleted:!b});}
    return ops;
  }
  let activeRegion = "Caucasus", searchTerm = "", activeEntryId = null, toastTimer, globeCountry=null, globeQuery="";
  const places = () => [...DATA.places,...state.customPlaces];
  const place = () => places().find(p=>p.id===state.selected) || DATA.places.find(p=>p.id===defaultId);
  const sceneState = () => state.scenes[place().id] || (state.scenes[place().id]={found:[false,false,false],choice:null});
  const story = () => DATA.stories[place().city] || {
    scene:themeByRegion[place().region]||"mountain",
    title:`A little light in ${place().city}`,
    intro:`A guild lantern has lost three sunflower petals somewhere in ${place().city}. Find them in the scene, then choose where your companion and the light will go next.`,
    choices:[["Explore a new path","You choose a direction and discover a detail you did not expect."],["Walk together","Your companion notices something lovely just around the corner."],["Take a quiet moment","You pause. The lantern stays beside you until you are ready."]],
    prompt:`What would you want to remember about ${place().city}?`
  };
  function save() { try { localStorage.setItem(KEY,JSON.stringify(state));const ops=diffState(snapshot,state);snapshot=JSON.parse(JSON.stringify(state));cloud?.enqueue(ops);if(!ops.length && !cloud?.signedIn) $("saveIndicator").textContent="Saved on this device"; } catch { $("saveIndicator").textContent="Storage full — export backup"; toast("Storage is full. Please export a backup."); } }
  function toast(message) { const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2700); }
  function showDialog(id) { const el=$(id); if (!el.open) el.showModal(); }
  function hideMobile() { $("atlasPanel").classList.remove("open"); document.querySelector(".memory-panel").classList.remove("mobile-open"); setMobileActive("mobileStory"); }
  function setMobileActive(id) { document.querySelectorAll(".mobile-nav button").forEach(b=>b.classList.toggle("active",b.id===id)); }
  function populateOptions() { for (const key of Object.keys(palettes)) for(const id of ["characterForm","mindyForm"]){const select=$(id).elements[key];select.innerHTML="";palettes[key].forEach(([label],index)=>select.add(new Option(label,String(index))));} DATA.regions.forEach(region=>$("addRegion").add(new Option(region,region))); }
  function renderFilters() { const root=$("regionFilters"); root.replaceChildren(); DATA.regions.forEach(region=>{const button=document.createElement("button");button.type="button";button.textContent=region;button.className=region===activeRegion?"active":"";button.setAttribute("aria-pressed",String(region===activeRegion));button.addEventListener("click",()=>{activeRegion=region;renderFilters();renderPlaceList();});root.append(button);}); }
  function renderPlaceList() {
    const list=$("placeList");list.replaceChildren();let lastCountry="";
    const selected=places().filter(p=>(searchTerm ? `${p.city} ${p.country} ${p.region}`.toLocaleLowerCase().includes(searchTerm) : p.region===activeRegion));
    if(!selected.length){const empty=document.createElement("p");empty.className="list-empty";empty.textContent="No places found. Add one below.";list.append(empty);return;}
    selected.forEach(p=>{
      if(p.country!==lastCountry){const h=document.createElement("div");h.className="country-label";h.textContent=searchTerm?`${p.country} · ${p.region}`:p.country;list.append(h);lastCountry=p.country;}
      const b=document.createElement("button");b.type="button";b.className=`place-item${p.id===state.selected?" active":""}${state.visited[p.id]?" visited":""}`;b.setAttribute("aria-current",p.id===state.selected?"location":"false");
      const dot=document.createElement("span");dot.className="place-dot";dot.setAttribute("aria-hidden","true");const label=document.createElement("span");label.className="place-label";label.textContent=p.city;const arrow=document.createElement("span");arrow.className="place-arrow";arrow.textContent=p.id===state.selected?"›":"";b.append(dot,label,arrow);b.addEventListener("click",()=>selectPlace(p.id));list.append(b);
    });
  }
  function renderScene() {
    const p=place(), s=sceneState(), chapter=story();
    world?.setPetals(s.found);
    $("scene").dataset.scene=chapter.scene;
    $("sceneRegion").textContent=`${p.country.toUpperCase()} / ${p.region.toUpperCase()}`;
    $("sceneCity").textContent=p.city;
    $("sceneSubtitle").textContent=world?"A guild city to explore":"A place in your story";
    $("chapterTrail").textContent=`${p.region.toUpperCase()} / ${p.country.toUpperCase()}`;
    $("chapterCount").textContent=`${places().indexOf(p)+1} / ${places().length} PLACES`;
    $("storyNumber").textContent=String(places().indexOf(p)+1).padStart(2,"0");
    $("visitedButton").textContent=state.visited[p.id]?"✓ Visited":"Mark visited";
    $("visitedButton").setAttribute("aria-pressed",String(!!state.visited[p.id]));
    const layer=$("petalLayer");layer.replaceChildren();points.forEach((pt,i)=>{
      if(s.found[i])return;const b=document.createElement("button");b.className="petal";b.type="button";b.textContent="✦";b.style.left=`${pt.x}%`;b.style.top=`${pt.y}%`;b.setAttribute("aria-label",`Collect sunflower petal ${i+1}`);
      b.addEventListener("click",()=>{b.classList.add("found");collectPetal(i);});layer.append(b);
    });
    const found=s.found.filter(Boolean).length;
    $("sceneProgress").textContent=found<3?`${found} / 3 SUN PETALS FOUND`:"✦ THE LANTERN IS LIT";
  }
  function collectPetal(i){const s=sceneState();if(s.found[i])return;s.found[i]=true;save();renderScene();renderStory();toast(s.found.every(Boolean)?"The guild lantern is lit. Choose your chapter below.":"A sun petal joined your lantern.");}
  function renderStory(){
    const ch=story(),s=sceneState(),found=s.found.filter(Boolean).length, choices=$("storyChoices");choices.replaceChildren();$("storyTitle").textContent=ch.title;
    if(found<3){$("storyText").textContent=ch.intro;return;}
    if(s.choice===null){$("storyText").textContent="The lantern lights up. What shall your guild do with this moment?";}
    else {$("storyText").textContent=ch.choices[s.choice][1];}
    ch.choices.forEach(([label],i)=>{const b=document.createElement("button");b.className=`choice-button${s.choice===i?" selected":""}`;b.textContent=label;b.type="button";b.addEventListener("click",()=>{s.choice=i;save();renderStory();});choices.append(b);});
    if(s.choice!==null){const diary=document.createElement("button");diary.className="choice-button";diary.textContent="Write this memory ↗";diary.addEventListener("click",()=>openDiary(true));choices.append(diary);}
  }
  function defaultCompanion(id){const seed=[...id].reduce((a,c)=>a+c.charCodeAt(0),0);return {name:["Sol","Mika","Ari","Nori","Lumi","Ren"][seed%6],trait:["steady","curious","bold","playful"][seed%4],skin:seed%5,hair:Math.floor(seed/5)%6,eyes:Math.floor(seed/7)%5,outfit:Math.floor(seed/11)%5,style:["waves","short","bun","long"][seed%4],accessory:"none"};}
  function companion(){return state.companions[place().id] || defaultCompanion(place().id);}
  function avatar(c){
    const skin=palettes.skin[c.skin]?.[1]||palettes.skin[0][1],hair=palettes.hair[c.hair]?.[1]||palettes.hair[0][1],eyes=palettes.eyes[c.eyes]?.[1]||palettes.eyes[0][1],outfit=palettes.outfit[c.outfit]?.[1]||palettes.outfit[0][1];
    const backHair=c.style==="short"?"":`<path d="M56 121 C36 77 45 27 100 25 C150 23 160 78 144 154 L125 151 L115 103 L82 107 L75 155 L58 153 Z" fill="${hair}"/>`;
    const topHair=c.style==="short"?`<path d="M55 81 Q42 25 102 28 Q155 25 147 82 Q130 49 102 55 Q80 43 55 81Z" fill="${hair}"/>`:
      c.style==="bun"?`<circle cx="103" cy="28" r="24" fill="${hair}"/><path d="M51 78 Q43 31 97 32 Q152 28 150 80 Q134 56 106 55 Q78 45 51 78Z" fill="${hair}"/>`:
      c.style==="waves"?`<path d="M49 80 Q40 30 95 29 Q143 21 154 78 Q139 69 129 53 Q99 67 72 53 Q67 71 49 80Z" fill="${hair}"/>`:
      `<path d="M53 79 Q42 30 98 27 Q151 27 149 78 Q119 63 108 52 Q80 70 53 79Z" fill="${hair}"/>`;
    const extras=c.accessory==="glasses"?`<g fill="none" stroke="#e9d5ad" stroke-width="3"><circle cx="84" cy="92" r="14"/><circle cx="117" cy="92" r="14"/><path d="M98 90 L103 90 M70 88 L62 85 M131 88 L139 85"/></g>`:
      c.accessory==="flower"?`<g transform="translate(141 59)"><circle r="5" fill="#774b32"/><g fill="#f5bd54"><ellipse cy="-10" ry="7" rx="4"/><ellipse cy="10" ry="7" rx="4"/><ellipse cx="-10" ry="4" rx="7"/><ellipse cx="10" ry="4" rx="7"/></g><circle r="4" fill="#754331"/></g>`:
      c.accessory==="scarf"?`<path d="M77 152 Q102 167 124 152 L129 169 Q103 189 74 167Z" fill="#f7cf83"/><path d="M117 162 L130 194 L119 197 L104 171Z" fill="#e8aa73"/>`:"";
    const shoulder=c.build==="strong"?23:c.build==="slim"?38:30;
    return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Illustrated character"><ellipse cx="100" cy="229" rx="70" ry="10" fill="#1b182b55"/><path d="M${shoulder} 238 Q33 176 78 160 L122 160 Q169 174 ${200-shoulder} 238Z" fill="${outfit}"/><path d="M82 154 L80 172 Q100 184 120 172 L118 154Z" fill="${skin}"/>${backHair}<ellipse cx="57" cy="98" rx="8" ry="15" fill="${skin}"/><ellipse cx="143" cy="98" rx="8" ry="15" fill="${skin}"/><ellipse cx="100" cy="93" rx="45" ry="59" fill="${skin}"/>${topHair}<path d="M74 81 Q83 76 93 81 M108 81 Q118 76 127 81" fill="none" stroke="${hair}" stroke-width="3" stroke-linecap="round"/><ellipse cx="85" cy="94" rx="4.4" ry="5.4" fill="${eyes}"/><ellipse cx="117" cy="94" rx="4.4" ry="5.4" fill="${eyes}"/><circle cx="86" cy="92" r="1.4" fill="white"/><circle cx="118" cy="92" r="1.4" fill="white"/><ellipse cx="73" cy="111" rx="8" ry="4" fill="#dd77765b"/><ellipse cx="128" cy="111" rx="8" ry="4" fill="#dd77765b"/><path d="M95 119 Q102 124 109 119" fill="none" stroke="#8d4e4b" stroke-width="2" stroke-linecap="round"/>${extras}<path d="M82 164 Q102 177 118 164" fill="none" stroke="#fff0dc7a" stroke-width="3"/></svg>`;
  }
  function renderMindy(){world?.setPlayerAppearance(state.mindy);$("mindyAvatar").innerHTML=avatar(state.mindy);$("mindyLook").textContent=`${palettes.hair[state.mindy.hair][0]} hair · ${palettes.outfit[state.mindy.outfit][0]}`;}
  function openMindy(){const form=$("mindyForm");for(const key of appearanceKeys)form.elements[key].value=String(state.mindy[key]);renderMindyPreview();showDialog("mindyDialog");}
  function renderMindyPreview(){const form=$("mindyForm").elements,c=Object.fromEntries(appearanceKeys.map(key=>[key,form[key].value]));$("mindyCharacterPreview").innerHTML=avatar(c);}
  function renderCompanion(){const c=companion();world?.setCompanion(c);$("avatarPreview").innerHTML=avatar(c);$("companionName").textContent=c.name;$("companionTrait").textContent=traits[c.trait];const birthday=new Date();$("guildNote").textContent=birthday.getMonth()===1&&birthday.getDate()===14?"The guild saved a sunlit seat for you today. Happy birthday. ✺":"“You can take your time. The world is still here.”";}
  function openCompanion(){const c=companion(),form=$("characterForm");$("characterPlace").textContent=`${place().city}, ${place().country}`;for(const key of ["name","trait","skin","hair","eyes","outfit","style","accessory"])form.elements[key].value=String(c[key]);renderCharacterPreview();showDialog("companionDialog");}
  function renderCharacterPreview(){const f=$("characterForm").elements,c=Object.fromEntries(["name","trait","skin","hair","eyes","outfit","style","accessory"].map(k=>[k,f[k].value]));$("characterPreview").innerHTML=avatar(c);$("characterPreviewName").textContent=c.name.trim()||"Your new friend";}
  function renderDiaryTeaser(){const entries=state.diaries[place().id]||[],last=entries.at(-1);$("diaryExcerpt").textContent=last?(last.body||last.title||"A blank page, waiting for a memory.").slice(0,105):"No pages for this place yet. What would you remember?";}
  function entryArray(){return state.diaries[place().id]||(state.diaries[place().id]=[]);}
  function openDiary(create=false){activeEntryId=null;$("diaryPlace").textContent=place().city;showDialog("diaryDialog");if(create) newEntry();else{activeEntryId=entryArray().at(-1)?.id||null;renderDiary();}}
  function newEntry(){const e={id:uid(),title:"",body:"",date:new Date().toISOString()};entryArray().push(e);activeEntryId=e.id;save();renderDiary();$("entryTitle")?.focus();}
  function renderDiary(){
    const list=$("entryList");list.replaceChildren();const entries=entryArray();entries.forEach(e=>{const b=document.createElement("button");b.className=`entry-list-item${activeEntryId===e.id?" active":""}`;const strong=document.createElement("strong");strong.textContent=e.title||"Untitled page";const small=document.createElement("small");small.textContent=displayDate(e.date);b.append(strong,small);b.addEventListener("click",()=>{activeEntryId=e.id;renderDiary();});list.append(b);});
    const editor=$("entryEditor");editor.replaceChildren();const active=entries.find(e=>e.id===activeEntryId);if(!active){const empty=document.createElement("div");empty.className="empty-entry";empty.textContent="Choose a page or start a new one.";editor.append(empty);return;}
    const title=document.createElement("input");title.id="entryTitle";title.type="text";title.maxLength=100;title.placeholder="Give this page a title";title.value=active.title;title.setAttribute("aria-label","Diary page title");
    const body=document.createElement("textarea");body.id="entryBody";body.maxLength=20000;body.placeholder=`${story().prompt}\n\nOr write whatever you want to keep...`;body.value=active.body;body.setAttribute("aria-label","Diary page text");
    const footer=document.createElement("div");footer.className="editor-footer";const date=document.createElement("span");date.textContent=`${displayDate(active.date)} · Saved on this device`;const remove=document.createElement("button");remove.className="delete-button";remove.textContent="Delete page";remove.addEventListener("click",()=>{if(!confirm("Delete this diary page?"))return;const index=entries.findIndex(e=>e.id===active.id);if(index>=0)entries.splice(index,1);activeEntryId=entries.at(-1)?.id||null;save();renderDiary();renderDiaryTeaser();});footer.append(date,remove);
    const update=()=>{active.title=title.value;active.body=body.value;save();renderDiaryTeaser();const item=list.children[entries.indexOf(active)];if(item)item.querySelector("strong").textContent=active.title||"Untitled page";};title.addEventListener("input",update);body.addEventListener("input",update);editor.append(title,body,footer);
  }
  let whatIfMode="release";
  const groundIds=["groundSee","groundHear","groundFeel"];
  function showWhatIfStage(stage){for(const id of ["whatIfName","whatIfGround","whatIfChoice","whatIfAction","whatIfResult"])$(id).hidden=id!==stage;$("lanternArt").dataset.stage=stage==="whatIfResult"?"result":stage;$("whatIfStageLabel").textContent=({whatIfName:"A THOUGHT",whatIfGround:"THREE SUN PETALS",whatIfChoice:"A CHOICE",whatIfAction:"ONE SMALL STEP",whatIfResult:"A LIGHT TO KEEP"})[stage];}
  function openWhatIf(){$("whatIfThought").value="";$("whatIfStepInput").value="";whatIfMode="release";for(const id of groundIds)$(id).setAttribute("aria-pressed","false");$("whatIfGroundNext").disabled=true;showWhatIfStage("whatIfName");showDialog("whatIfDialog");$("whatIfThought").focus();}
  function finishWhatIf(mode){whatIfMode=mode;const step=$("whatIfStepInput").value.trim();$("whatIfResultText").textContent=mode==="step"?(step?`One possible step: ${step}. You do not have to solve the rest today.`:"You can choose a small step later. The rest does not need an answer right now."):"You let a thought rest for this moment. Uncertainty can be here without deciding your whole story.";$("whatIfDiary").hidden=$("gameLayout").hidden;showWhatIfStage("whatIfResult");}
  function keepWhatIf(){if($("gameLayout").hidden)return;const thought=$("whatIfThought").value.trim(),step=$("whatIfStepInput").value.trim(),body=[thought?`A thought I noticed: ${thought}`:"",whatIfMode==="step"?(step?`One small step: ${step}`:"I can choose a small step later."):"I let this thought rest for now."].filter(Boolean).join("\n\n");entryArray().push({id:uid(),title:"A moment by the What-If Lantern",body,date:new Date().toISOString()});save();renderDiaryTeaser();$("whatIfDialog").close();openDiary();}
  function displayDate(value){const d=new Date(value);return isNaN(d)?"Undated":d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});}
  function selectPlace(id){if(!places().some(p=>p.id===id))return;state.selected=id;activeRegion=place().region;activeEntryId=null;save();enterCity();renderAll();hideMobile();window.scrollTo({top:0,behavior:"smooth"});}
  function renderAll(){if(!$("gameLayout").hidden)world?.load(place());renderFilters();renderPlaceList();renderScene();renderStory();renderMindy();renderCompanion();renderDiaryTeaser();renderGlobePanel();globe?.refresh();if($("worldMapDialog").open)renderMap();if($("journeyDialog").open)renderJourney();}
  function showGlobe(){hideMobile();$("gameLayout").hidden=true;$("globeScreen").hidden=false;document.documentElement.classList.add("globe-active");world?.setActive(false);globe?.setActive(true);renderGlobePanel();globe?.refresh();window.scrollTo({top:0,behavior:"smooth"});}
  function enterCity(){$("globeScreen").hidden=true;$("gameLayout").hidden=false;document.documentElement.classList.remove("globe-active");globe?.setActive(false);world?.load(place());world?.setActive(true);startMusic();}
  function chooseCountry(country){globeCountry=country;globeQuery="";$("globeSearch").value="";globe?.setCountry(country);const p=places().find(v=>v.country===country);const center=window.SunflowerGlobeMath.centroids[country]||window.SunflowerGlobeMath.coords(p);globe?.focus(...center);renderGlobePanel();startMusic();}
  function renderGlobePanel(){const countries=$("globeCountryList"),cities=$("globeCityList"),q=globeQuery;countries.replaceChildren();cities.replaceChildren();$("globeAllCountries").hidden=!globeCountry;$("globeDrawerTitle").textContent=globeCountry||"Choose a country";$("globeDrawerCaption").textContent=globeCountry?"Choose a city to enter its walkable guild world.":"Turn the Earth or choose from your journey below.";countries.hidden=!!globeCountry;cities.hidden=!globeCountry;
    if(globeCountry){const found=places().filter(p=>p.country===globeCountry&&(!q||p.city.toLocaleLowerCase().includes(q)));for(const p of found){const b=document.createElement("button"),dot=document.createElement("span"),name=document.createElement("span"),side=document.createElement("small");b.className=`globe-place${state.visited[p.id]?" visited":""}`;dot.className="globe-dot";name.textContent=p.city;side.textContent=state.visited[p.id]?"Visited":"Enter →";b.append(dot,name,side);b.addEventListener("click",()=>selectPlace(p.id));cities.append(b);}if(!found.length){const el=document.createElement("p");el.className="list-empty";el.textContent="No cities match. Add a place below.";cities.append(el);}}
    else{const names=[...new Set(places().map(p=>p.country))].filter(name=>!q||name.toLocaleLowerCase().includes(q)||places().some(p=>p.country===name&&p.city.toLocaleLowerCase().includes(q)));for(const country of names){const group=places().filter(p=>p.country===country),b=document.createElement("button"),dot=document.createElement("span"),name=document.createElement("span"),side=document.createElement("small"),visited=group.filter(p=>state.visited[p.id]).length;b.className=`globe-place${visited?" visited":""}`;dot.className="globe-dot";name.textContent=country;side.textContent=visited?`${visited} visited`:`${group.length} ${group.length===1?"city":"cities"}`;b.append(dot,name,side);b.addEventListener("click",()=>chooseCountry(country));countries.append(b);}if(!names.length){const el=document.createElement("p");el.className="list-empty";el.textContent="No countries match. Add one below.";countries.append(el);}}
  }
  const MUSIC_KEY="sunflower-music-v1";
  let musicEnabled=false;
  try{musicEnabled=localStorage.getItem(MUSIC_KEY)!=="off";}catch{musicEnabled=true;}
  function updateMusicButton(){const b=$("soundButton");b.textContent=musicEnabled?"♫ Music on":"♫ Music off";b.setAttribute("aria-pressed",String(musicEnabled));b.setAttribute("aria-label",musicEnabled?"Turn music off":"Turn music on");}
  function startMusic(){if(!musicEnabled)return;$("adventureMusic").volume=.25;const played=$("adventureMusic").play();played?.catch?.(()=>{});}
  function toggleMusic(){musicEnabled=!musicEnabled;try{localStorage.setItem(MUSIC_KEY,musicEnabled?"on":"off");}catch{}if(musicEnabled)startMusic();else $("adventureMusic").pause();updateMusicButton();}
  function updateGlobeClock(){const now=new Date();$("globeClock").textContent=`${now.toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})} · Sunlight follows your device clock`;globe?.refresh();}
  function globeUnavailable(){document.documentElement.classList.add("globe-static");$("globeCanvas").hidden=true;$("globeMarkers").hidden=true;$("globeFallback").hidden=false;}
  function exportBackup(){const json=JSON.stringify(state,null,2),blob=new Blob([json],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mindys-world-backup.json";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);toast("Backup downloaded.");}
  function addPlace(){const form=$("addPlaceForm");form.reset();form.elements.region.value=activeRegion;showDialog("addPlaceDialog");}
  let mapRegion="All",mapQuery="",mapNodes=[],mapDragEndedAt=0;
  const mapView={zoom:1,panX:0,panY:0},mapPointers=new Map();
  function mapPosition(p){const [lat,lon]=window.SunflowerGlobeMath.coords(p);return [(lon+180)/360,(90-lat)/180];}
  const mapVisible=()=>places().filter(p=>(mapRegion==="All"||p.region===mapRegion)&&(!mapQuery||`${p.city} ${p.country} ${p.region}`.toLocaleLowerCase().includes(mapQuery)));
  function mapFrame(w,h){const width=Math.min(w,h*2)*mapView.zoom,height=width/2;mapView.panX=Math.max(-Math.max(0,(width-w)/2),Math.min(Math.max(0,(width-w)/2),mapView.panX));mapView.panY=Math.max(-Math.max(0,(height-h)/2),Math.min(Math.max(0,(height-h)/2),mapView.panY));return {x:(w-width)/2+mapView.panX,y:(h-height)/2+mapView.panY,width,height};}
  function mapZoom(factor,x,y){const r=$("atlasMapCanvas").getBoundingClientRect();if(!r.width||!r.height)return;const before=mapFrame(r.width,r.height),atX=x??r.width/2,atY=y??r.height/2,nx=(atX-before.x)/before.width,ny=(atY-before.y)/before.height;mapView.zoom=Math.max(1,Math.min(8,mapView.zoom*factor));const newWidth=Math.min(r.width,r.height*2)*mapView.zoom,newHeight=newWidth/2;mapView.panX=atX-nx*newWidth-(r.width-newWidth)/2;mapView.panY=atY-ny*newHeight-(r.height-newHeight)/2;drawMap();}
  function drawMap(){const canvas=$("atlasMapCanvas"),rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);const ctx=canvas.getContext("2d"),w=rect.width,h=rect.height;ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);const background=ctx.createLinearGradient(0,0,w,h);background.addColorStop(0,"#173550");background.addColorStop(1,"#071727");ctx.fillStyle=background;ctx.fillRect(0,0,w,h);
    const frame=mapFrame(w,h),{x:offsetX,y:offsetY,width:mapWidth,height:mapHeight}=frame,image=$("earthMapImage");if(image.complete&&image.naturalWidth)ctx.drawImage(image,offsetX,offsetY,mapWidth,mapHeight);
    ctx.strokeStyle="#baf4e627";ctx.lineWidth=1;for(let lon=-120;lon<=120;lon+=60){const x=offsetX+(lon+180)/360*mapWidth;ctx.beginPath();ctx.moveTo(x,Math.max(0,offsetY));ctx.lineTo(x,Math.min(h,offsetY+mapHeight));ctx.stroke();}for(let lat=-60;lat<=60;lat+=30){const y=offsetY+(90-lat)/180*mapHeight;ctx.beginPath();ctx.moveTo(Math.max(0,offsetX),y);ctx.lineTo(Math.min(w,offsetX+mapWidth),y);ctx.stroke();}
    const visible=mapVisible(),firstByCountry=new Set();mapNodes=visible.filter(p=>{if(mapView.zoom>=1.55||p.id===state.selected||state.visited[p.id]||!firstByCountry.has(p.country)){firstByCountry.add(p.country);return true;}return false;}).map(p=>{const [x,y]=mapPosition(p);return {p,x:offsetX+x*mapWidth,y:offsetY+y*mapHeight};}).filter(n=>n.x>=0&&n.x<=w&&n.y>=0&&n.y<=h);
    for(const node of mapNodes){const current=node.p.id===state.selected,visited=!!state.visited[node.p.id],r=current?6:visited?4:3.3;
      const glow=ctx.createRadialGradient(node.x,node.y,0,node.x,node.y,current?23:visited?17:13);glow.addColorStop(0,current?"#ffe7a5dd":visited?"#ffb86fbb":"#86f5e69c");glow.addColorStop(1,"#57e5db00");ctx.fillStyle=glow;ctx.beginPath();ctx.arc(node.x,node.y,current?23:visited?17:13,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(node.x,node.y,r,0,Math.PI*2);ctx.fillStyle=current?"#fff2bd":visited?"#ffc276":"#b7fff2";ctx.fill();ctx.strokeStyle="#d6ffff";ctx.lineWidth=1;ctx.stroke();
      if(current||mapView.zoom>2.8&&visited){ctx.strokeStyle="#fff6c8";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(node.x,node.y,r+6,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#fff4df";ctx.shadowColor="#071626";ctx.shadowBlur=8;ctx.font="700 12px system-ui";ctx.textAlign=node.x>w*.7?"right":"left";ctx.fillText(node.p.city,node.x+(node.x>w*.7?-16:16),node.y-13);ctx.shadowBlur=0;}
    }
  }
  function renderMap(){const regions=$("mapRegions");regions.replaceChildren();for(const name of ["All",...DATA.regions]){const b=document.createElement("button");b.type="button";b.textContent=name;b.className=mapRegion===name?"active":"";b.setAttribute("aria-pressed",String(mapRegion===name));b.addEventListener("click",()=>{mapRegion=name;renderMap();});regions.append(b);}
    const list=$("mapPlaceList");list.replaceChildren();for(const p of mapVisible()){const b=document.createElement("button"),label=document.createElement("span"),side=document.createElement("small");b.type="button";b.className=`map-place-item${p.id===state.selected?" current":""}`;label.textContent=p.city;side.textContent=state.visited[p.id]?"● Visited":p.country;side.className=state.visited[p.id]?"map-visited":"";b.append(label,side);b.addEventListener("click",()=>travelTo(p.id));list.append(b);}if(!list.children.length){const empty=document.createElement("p");empty.className="list-empty";empty.textContent="No places match. Add your own stop below.";list.append(empty);}drawMap();}
  function showMap(){hideMobile();showDialog("worldMapDialog");renderMap();}
  function renderJourney(){const visited=places().filter(p=>state.visited[p.id]),cards=$("journeyCards");cards.replaceChildren();$("journeySummary").textContent=visited.length?`${visited.length} ${visited.length===1?"place":"places"} marked visited · ${Object.values(state.diaries).reduce((n,pages)=>n+pages.length,0)} diary pages`:`Your journey is yours to mark, one place at a time.`;
    const shown=visited.length?visited:[place()];for(const p of shown){const button=document.createElement("button"),title=document.createElement("strong"),location=document.createElement("small"),detail=document.createElement("span"),pages=state.diaries[p.id]?.length||0;button.className="journey-card";button.type="button";title.textContent=p.city;location.textContent=`${p.country} · ${p.region}`;detail.textContent=state.visited[p.id]?`${pages} ${pages===1?"diary page":"diary pages"} · revisit →`:`Here now · mark this place visited when you wish`;button.append(title,location,detail);button.addEventListener("click",()=>{$("journeyDialog").close();selectPlace(p.id);});cards.append(button);}
  }
  function showJourney(){renderJourney();showDialog("journeyDialog");}
  function travelTo(id){$("worldMapDialog").close();selectPlace(id);toast(`Welcome to ${place().city}.`);}
  let authMode="signin";
  function updateAuthUI(signed,email){$("cloudButton").textContent=signed?"Account":"Sync";$("accountStatus").textContent=signed?`Signed in as ${email}`:"Playing on this device";$("accountButton").textContent=signed?"Sign out":"Sign in to sync";$("syncNowButton").hidden=!signed;$("deleteAccountButton").hidden=!signed;}
  function openAuth(){authMode="signin";$("authTitle").textContent="Sign in to sync";$("authSubmit").textContent="Sign in →";$("authSwitch").textContent="Create an account";$("authMessage").textContent=cloud.configured?"":"The app owner needs to configure cloud sync first.";showDialog("authDialog");}
  function setAuthBusy(busy){$("authSubmit").disabled=busy;$("authSwitch").disabled=busy;}
  function wire(){
    $("pauseButton").addEventListener("click",openWhatIf);$("whatIfBegin").addEventListener("click",()=>showWhatIfStage("whatIfGround"));
    for(const id of groundIds)$(id).addEventListener("click",()=>{$(id).setAttribute("aria-pressed","true");$("whatIfGroundNext").disabled=!groundIds.every(key=>$(key).getAttribute("aria-pressed")==="true");});
    $("whatIfGroundNext").addEventListener("click",()=>{if(!$("whatIfGroundNext").disabled)showWhatIfStage("whatIfChoice");});
    $("whatIfSmall").addEventListener("click",()=>showWhatIfStage("whatIfAction"));$("whatIfRelease").addEventListener("click",()=>finishWhatIf("release"));$("whatIfLight").addEventListener("click",()=>finishWhatIf("step"));$("whatIfAgain").addEventListener("click",openWhatIf);$("whatIfDiary").addEventListener("click",keepWhatIf);
    $("worldMapButton").addEventListener("click",showGlobe);$("backToGlobe").addEventListener("click",showGlobe);
    $("globeZoomIn").addEventListener("click",()=>globe?.zoom(.70));$("globeZoomOut").addEventListener("click",()=>globe?.zoom(1.4));
    $("soundButton").addEventListener("click",toggleMusic);
    $("globeAllCountries").addEventListener("click",()=>{globeCountry=null;globeQuery="";$("globeSearch").value="";globe?.setCountry(null);renderGlobePanel();});
    $("globeSearch").addEventListener("input",e=>{globeQuery=e.target.value.trim().toLocaleLowerCase();renderGlobePanel();});
    $("globeAddPlace").addEventListener("click",addPlace);$("routeIndexButton").addEventListener("click",showMap);
    $("worldInteract").addEventListener("click",()=>world?.interact());
    $("mapSearch").addEventListener("input",e=>{mapQuery=e.target.value.trim().toLocaleLowerCase();renderMap();});
    $("mapAddPlace").addEventListener("click",()=>{$("worldMapDialog").close();addPlace();});
    $("journeyButton").addEventListener("click",showJourney);$("journeyMapButton").addEventListener("click",()=>{$("journeyDialog").close();showMap();});
    const mapCanvas=$("atlasMapCanvas");mapCanvas.addEventListener("click",e=>{if(Date.now()-mapDragEndedAt<220)return;const r=e.currentTarget.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;const nearest=mapNodes.map(n=>({...n,d:Math.hypot(n.x-x,n.y-y)})).sort((a,b)=>a.d-b.d)[0];if(nearest?.d<17)travelTo(nearest.p.id);});
    mapCanvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;mapPointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});mapCanvas.setPointerCapture(e.pointerId);});
    mapCanvas.addEventListener("pointermove",e=>{const p=mapPointers.get(e.pointerId);if(!p)return;const other=[...mapPointers.values()].find(v=>v!==p);if(other){const old=Math.hypot(p.x-other.x,p.y-other.y),next=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(old>12&&next>12){const rect=mapCanvas.getBoundingClientRect();mapZoom(next/old,(e.clientX+other.x)/2-rect.left,(e.clientY+other.y)/2-rect.top);}p.moved=true;other.moved=true;}else{mapView.panX+=e.clientX-p.x;mapView.panY+=e.clientY-p.y;if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>6)p.moved=true;drawMap();}p.x=e.clientX;p.y=e.clientY;});
    const releaseMap=e=>{const p=mapPointers.get(e.pointerId);if(p?.moved)mapDragEndedAt=Date.now();mapPointers.delete(e.pointerId);};mapCanvas.addEventListener("pointerup",releaseMap);mapCanvas.addEventListener("pointercancel",releaseMap);
    mapCanvas.addEventListener("wheel",e=>{e.preventDefault();const rect=mapCanvas.getBoundingClientRect();mapZoom(Math.exp(-Math.max(-220,Math.min(220,e.deltaY))*.0016),e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
    $("mapZoomIn").addEventListener("click",()=>mapZoom(1.5));$("mapZoomOut").addEventListener("click",()=>mapZoom(1/1.5));$("mapReset").addEventListener("click",()=>{mapView.zoom=1;mapView.panX=0;mapView.panY=0;drawMap();});$("earthMapImage").addEventListener("load",()=>{if($("worldMapDialog").open)drawMap();});
    window.addEventListener("resize",()=>{if($("worldMapDialog").open)drawMap();});
    $("placeSearch").addEventListener("input",e=>{searchTerm=e.target.value.trim().toLocaleLowerCase();renderPlaceList();});
    $("visitedButton").addEventListener("click",()=>{const id=place().id;state.visited[id]=!state.visited[id];save();renderScene();renderPlaceList();renderGlobePanel();globe?.refresh();});
    $("editCompanion").addEventListener("click",openCompanion);$("openDiary").addEventListener("click",()=>openDiary());
    $("editMindy").addEventListener("click",openMindy);$("mindyForm").addEventListener("input",renderMindyPreview);
    $("mindyForm").addEventListener("submit",e=>{e.preventDefault();const f=e.currentTarget.elements;state.mindy=cleanAppearance(Object.fromEntries(appearanceKeys.map(key=>[key,f[key].value])));save();renderMindy();$("mindyDialog").close();toast("Mindy's look is ready for every city.");});
    $("characterForm").addEventListener("input",renderCharacterPreview);
    $("characterForm").addEventListener("submit",e=>{e.preventDefault();const f=e.currentTarget.elements;state.companions[place().id]={name:f.name.value.trim().slice(0,24)||"Sol",trait:f.trait.value,skin:Number(f.skin.value),hair:Number(f.hair.value),eyes:Number(f.eyes.value),outfit:Number(f.outfit.value),style:f.style.value,accessory:f.accessory.value};save();renderCompanion();$("companionDialog").close();toast("Your companion is ready.");});
    $("newEntryButton").addEventListener("click",newEntry);
    $("settingsButton").addEventListener("click",()=>showDialog("settingsDialog"));$("exportButton").addEventListener("click",exportBackup);
    $("cloudButton").addEventListener("click",()=>cloud.signedIn?showDialog("settingsDialog"):openAuth());
    $("accountButton").addEventListener("click",async()=>{if(!cloud.signedIn){$("settingsDialog").close();openAuth();return;}try{await cloud.signOut();$("settingsDialog").close();toast("Signed out on this device.");}catch(e){toast(e.message);}});
    $("syncNowButton").addEventListener("click",async()=>{try{await cloud.sync();toast("Your journey is up to date.");}catch{toast("Still offline. Your changes are saved here.");}});
    $("deleteAccountButton").addEventListener("click",async()=>{if(prompt("This permanently deletes your account and its synced diary, companions and progress. Type DELETE to continue.")!=="DELETE")return;try{await cloud.deleteAccount();$("settingsDialog").close();toast("Account and cloud data deleted.");}catch(e){toast(e.message);}});
    $("authSwitch").addEventListener("click",()=>{authMode=authMode==="signin"?"signup":"signin";$("authTitle").textContent=authMode==="signin"?"Sign in to sync":"Create your account";$("authSubmit").textContent=authMode==="signin"?"Sign in →":"Create account →";$("authSwitch").textContent=authMode==="signin"?"Create an account":"I already have an account";$("authMessage").textContent="";$("authForm").elements.password.autocomplete=authMode==="signin"?"current-password":"new-password";});
    $("authForm").addEventListener("submit",async e=>{e.preventDefault();const email=e.currentTarget.elements.email.value.trim(),password=e.currentTarget.elements.password.value;setAuthBusy(true);$("authMessage").textContent="Connecting…";try{if(authMode==="signup"){await cloud.signUp(email,password);if(cloud.signedIn){await cloud.sync();$("authDialog").close();toast("Your journey is now syncing.");}else $("authMessage").textContent="Check your email to confirm your account, then return and sign in here.";}else{await cloud.signIn(email,password);$("authDialog").close();toast("Signed in. Your journey is syncing.");}}catch(error){$("authMessage").textContent=error.message;}finally{setAuthBusy(false);}});
    $("forgotButton").addEventListener("click",async()=>{const email=$("authForm").elements.email.value.trim();if(!email){$("authMessage").textContent="Enter your email above first.";return;}try{await cloud.recover(email);$("authMessage").textContent="If an account exists, a reset link is on its way. Open it in a browser, then sign in here.";}catch(error){$("authMessage").textContent=error.message;}});
    $("importFile").addEventListener("change",async e=>{const file=e.target.files?.[0];e.target.value="";if(!file)return;if(file.size>3_000_000){toast("That backup is too large.");return;}try{const restored=validate(JSON.parse(await file.text()));if(!confirm("Replace the current diary, companions and progress with this backup? Export your current data first if you want to keep it."))return;state=restored;activeRegion=place().region;searchTerm="";$("placeSearch").value="";save();renderAll();$("settingsDialog").close();toast("Backup restored.");}catch(err){toast(err.message||"Could not read this backup.");}});
    $("addPlaceButton").addEventListener("click",addPlace);$("settingsAddPlace").addEventListener("click",()=>{$("settingsDialog").close();addPlace();});
    $("addPlaceForm").addEventListener("submit",e=>{e.preventDefault();const f=e.currentTarget.elements,p={id:`custom-${uid()}`,city:f.city.value.trim().slice(0,48),country:f.country.value.trim().slice(0,48),region:f.region.value};if(!p.city||!p.country)return;state.customPlaces.push(p);$("addPlaceDialog").close();selectPlace(p.id);toast("A new place was added.");});
    $("howButton").addEventListener("click",()=>showDialog("helpDialog"));
    document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
    $("openAtlas").addEventListener("click",()=>{$("atlasPanel").classList.add("open");setMobileActive("mobileAtlas");});$("mobileAtlas").addEventListener("click",showGlobe);$("closeAtlas").addEventListener("click",hideMobile);
    $("mobileStory").addEventListener("click",hideMobile);$("mobileCompanion").addEventListener("click",()=>{$("atlasPanel").classList.remove("open");document.querySelector(".memory-panel").classList.add("mobile-open");setMobileActive("mobileCompanion");});$("mobileDiary").addEventListener("click",()=>{hideMobile();openDiary();});
  }
  cloud=new window.SunflowerCloud({
    makeEmpty:initial,getState:()=>state,
    canApplyRemote:()=>!$("diaryDialog").open&&!$("companionDialog").open&&!$("mindyDialog").open&&!$("addPlaceDialog").open&&!$("whatIfDialog").open,
    onRemote:remote=>{state=validate(remote);if(!places().some(p=>p.id===state.selected))state.selected=defaultId;activeRegion=place().region;snapshot=JSON.parse(JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(state));renderAll();},
    onStatus:message=>{$("saveIndicator").textContent=message;},onAuth:updateAuthUI,
    onClear:()=>{state=initial();snapshot=JSON.parse(JSON.stringify(state));localStorage.setItem(KEY,JSON.stringify(state));activeRegion="Caucasus";renderAll();}
  });
  try{
    world=new window.SunflowerWorld($("worldCanvas"),{
      getPetals:()=>sceneState().found,
      blockControls:()=>$("gameLayout").hidden||["authDialog","settingsDialog","addPlaceDialog","diaryDialog","companionDialog","mindyDialog","helpDialog","worldMapDialog","whatIfDialog","journeyDialog"].some(id=>$(id).open)||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||""),
      onCollect:collectPetal,
      onAction:type=>{if(type==="map")showMap();else if(type==="gallery")showJourney();else if(type==="diary")openDiary();else if(type==="companion")openCompanion();else if(type==="story")$("storyTitle").scrollIntoView({behavior:"smooth",block:"center"});},
      onHint:(label,available)=>{const b=$("worldInteract");b.textContent=label;b.hidden=!available;}
    });
    document.documentElement.classList.add("world-ready");
  }catch(error){console.warn("3D world unavailable; story scene remains playable.",error);}
  try{globe=new window.SunflowerGlobe($("globeCanvas"),$("globeMarkers"),{getPlaces:places,getVisited:()=>state.visited,onCountry:chooseCountry,onCity:selectPlace,onGesture:startMusic,onFailure:globeUnavailable});}catch(error){console.warn("3D globe unavailable; country list remains playable.",error);globeUnavailable();}
  if(!localStorage.getItem("sunflower-migrated-v1")){cloud.enqueue(diffState(initial(),state));localStorage.setItem("sunflower-migrated-v1","1");}
  populateOptions();wire();updateMusicButton();updateGlobeClock();setInterval(updateGlobeClock,30000);if(!places().some(p=>p.id===state.selected))state.selected=defaultId;activeRegion=place().region;world?.setActive(false);globe?.setActive(true);document.documentElement.classList.add("globe-active");renderAll();cloud.init();
  if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js").catch(()=>{});
})();
