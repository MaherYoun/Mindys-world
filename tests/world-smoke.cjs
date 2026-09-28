/* Procedural world generation, third-person movement and shrine interaction.
   The GL object here checks the render path without needing a GPU in CI. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../www/world3d.js"),"utf8");
const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,DYNAMIC_DRAW:7,TRIANGLES:8,FLOAT:9,COLOR_BUFFER_BIT:10,DEPTH_BUFFER_BIT:11,DEPTH_TEST:12,LEQUAL:13,POINTS:14,BLEND:15,SRC_ALPHA:16,ONE:17,
  createShader:()=>({}),shaderSource(){},compileShader(){},getShaderParameter:()=>true,createProgram:()=>({}),attachShader(){},linkProgram(){},getProgramParameter:()=>true,
  createBuffer:()=>({}),getAttribLocation:()=>0,getUniformLocation:()=>({}),bindBuffer(){},bufferData(_,data){assert(data instanceof Float32Array);},viewport(){},clearColor(){},clear(){},enable(){},disable(){},blendFunc(){},depthMask(){},depthFunc(){},useProgram(){},enableVertexAttribArray(){},uniformMatrix4fv(_,__,m){assert.equal(m.length,16);},uniform3fv(){},vertexAttribPointer(){},drawArrays(_,__,count){assert(count>0);this.draws++;},draws:0};
const listeners={},windowListeners={};
const el=()=>({style:{},addEventListener(event,handler){listeners[event]=handler;},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})});
const canvas={...el(),width:0,height:0,getContext:type=>type==="webgl"?gl:null};
const pad=el(),knob=el(),run={handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},setPointerCapture(){}};
const context={window:{devicePixelRatio:1,addEventListener(type,fn){(windowListeners[type]??=[]).push(fn);}},document:{getElementById:id=>({movePad:pad,moveKnob:knob,runButton:run,localMiniMap:null})[id]||null},Math,Float32Array,ResizeObserver:class{observe(){}},requestAnimationFrame(){}};
vm.createContext(context);vm.runInContext(source,context);
const collected=[];let action;
const World=context.window.SunflowerWorld;
const world=new World(canvas,{getPetals:()=>[false,false,false],onCollect:i=>collected.push(i),onAction:type=>action=type,onHint(){},blockControls:()=>false});
world.load({id:"caucasus-armenia-yerevan",region:"Caucasus"});assert(world.worldCount>2000);
assert(world.worldCount>25000,"arrival scene includes the flower borders and orange grove");
world.frame(1000);assert(gl.draws>=2);
const meshA={vertices:[],limb(...args){this.vertices.push(...args.flat().filter(v=>typeof v==="number"));},box(){},cone(){},cylinder(){},sphere(){},gem(){}};
world.character(meshA,0,0,0,{},true,0,1);const idleLeg=meshA.vertices.slice();meshA.vertices=[];world.character(meshA,0,0,0,{},true,Math.PI/2,1);assert.notDeepEqual(meshA.vertices,idleLeg,"walking legs change geometry with phase");
const faces={spheres:[],limb(){},box(){},cone(){},cylinder(){},sphere(...args){this.spheres.push(args);},gem(){}};
world.character(faces,0,0,0,{},true,0,0,0);const forwardEye=faces.spheres.find(s=>s[4]==="#493632");faces.spheres=[];
world.character(faces,0,0,Math.PI/2,{},true,0,0,Math.PI/2);const turnedEye=faces.spheres.find(s=>s[4]==="#493632");assert(turnedEye[0]>forwardEye[0]+.3&&turnedEye[2]<forwardEye[2],"facial features turn with body");
world.setPlayerAppearance({skin:4,hair:2,eyes:3,outfit:4,style:"bun",accessory:"flower",build:"strong"});assert.equal(world.playerAppearance.skin,4);
faces.spheres=[];world.character(faces,0,0,0,world.playerAppearance,true,0,0,0);assert(faces.spheres.some(s=>s[4]==="#506e90"),"Mindy's selected eye color reaches the 3D character");
world.keys.add("KeyW");world.move(.1);const walking=world.player.z+14;world.player.z=-14;world.keys.add("KeyA");world.move(.1);const running=world.player.z+14;assert(running>walking*1.5,"hold A and move to run");world.keys.clear();world.keys.add("KeyA");assert.equal(world.move(.1),false,"A alone does not move the player");world.keys.clear();
const sendKey=(type,key,code)=>windowListeners[type].forEach(fn=>fn({key,code,repeat:false,preventDefault(){}}));sendKey("keydown","a","KeyQ");assert(world.keys.has("KeyA"),"AZERTY A label runs even if its physical code is KeyQ");sendKey("keydown","q","KeyA");assert(world.keys.has("KeyQ"),"printed Q strafes left");sendKey("keyup","a","KeyQ");sendKey("keyup","q","KeyA");assert.equal(world.keys.size,0);
const before=world.player.z;world.keys.add("KeyW");world.frame(1100);assert(world.player.z>before);world.keys.clear();
world.player.heading=Math.PI/2;world.player.headHeading=0;world.frame(1116);assert(world.player.headHeading>0&&world.player.headHeading<Math.PI/2,"head smoothly follows a turn");
world.setActive(false);const stopped=world.player.z;world.keys.add("KeyW");world.frame(1150);assert.equal(world.player.z,stopped);world.setActive(true);
world.player.x=-5;world.player.z=-4;world.frame(1200);assert.equal(world.near.type,"petal");world.interact();assert.deepEqual(collected,[0]);assert.equal(world.found[0],true);
world.player.x=13.6;world.player.z=6.1;world.frame(1300);world.interact();assert.equal(action,"map");
world.player.x=10;world.player.z=-8.8;world.frame(1320);world.interact();assert.equal(action,"gallery");
run.handlers.pointerdown({pointerId:1,preventDefault(){}});assert.equal(world.sprinting,true);run.handlers.pointerup({pointerId:1});assert.equal(world.sprinting,false);
world.load({id:"east-asia-china-beijing",region:"East Asia"});assert.equal(world.player.z,-14);assert(world.worldCount>2000);
world.setPetals([true,true,true]);world.frame(1400);
console.log("3D world generation, movement, rendering and interactions passed.");
