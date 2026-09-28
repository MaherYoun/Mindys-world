/* An original, dependency-free 3D guild world. WebGL 1 keeps the same bundled
   game usable on the web and inside the iOS/Android packages. */
(() => {
  "use strict";
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const turnTowards = (from,to,t) => from + Math.atan2(Math.sin(to-from),Math.cos(to-from))*t;
  const hex = value => [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255);
  const shade = (color, factor) => color.map(v => clamp(v * factor, 0, 1));
  const themes = {
    Africa: {ground:"#9d785f", grass:"#846a58", path:"#d9aa7c", stone:"#c17d64", roof:"#694965", leaf:"#d99b61", glow:"#ffe08a", water:"#4d93a1"},
    "The Americas": {ground:"#9f826c", grass:"#677865", path:"#d4ae88", stone:"#cc8371", roof:"#6c506d", leaf:"#e9a66e", glow:"#ffd77d", water:"#3f8eac"},
    Europe: {ground:"#637985", grass:"#587978", path:"#b4bbc0", stone:"#9c9cb0", roof:"#505b87", leaf:"#da93aa", glow:"#ffe4a0", water:"#5198b8"},
    Caucasus: {ground:"#66837f", grass:"#468475", path:"#e4bb8c", stone:"#cc9d92", roof:"#554d87", leaf:"#eaa4be", glow:"#ffdb83", water:"#489aab"},
    "Southeast Asia": {ground:"#5c877d", grass:"#4c8273", path:"#b8b6a0", stone:"#8e98a5", roof:"#435e7b", leaf:"#efa3a4", glow:"#ffdd90", water:"#348fa0"},
    "East Asia": {ground:"#638780", grass:"#577f79", path:"#c7b8a8", stone:"#8ca5a6", roof:"#4d607c", leaf:"#e8a4b7", glow:"#ffe49c", water:"#449eab"},
    "Silk Road": {ground:"#a18a77", grass:"#83796f", path:"#d5ba9c", stone:"#aa8d95", roof:"#685878", leaf:"#d7a58d", glow:"#ffe197", water:"#688da8"}
  };
  const hash = text => { let n = 2166136261; for(const c of text) n = Math.imul(n ^ c.charCodeAt(0),16777619); return n >>> 0; };
  const randomFor = text => { let n = hash(text) || 1; return () => {n ^= n << 13;n ^= n >>> 17;n ^= n << 5;return (n >>> 0) / 4294967296;}; };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const norm = a => {const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const multiply = (a,b) => {const o=new Float32Array(16);for(let col=0;col<4;col++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)o[col*4+row]+=a[k*4+row]*b[col*4+k];return o;};
  function cameraMatrix(eye,target,aspect){
    // Keep screen-right aligned with the walking controls when looking north.
    const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross(z,[0,1,0])),y=cross(x,z);
    const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
    const f=1/Math.tan(Math.PI/5.5),near=.1,far=150;
    const projection=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
    return multiply(projection,view);
  }
  class Mesh {
    constructor(){this.vertices=[];}
    tri(a,b,c,color,emissive=false){
      const u=b.map((v,i)=>v-a[i]),v=c.map((q,i)=>q-a[i]),n=norm(cross(u,v));
      const light=emissive?1.25:.72+Math.ceil(Math.max(0,dot(n,norm([-.48,.9,.42])))*3)/3*.38;
      const rgb=shade(typeof color==="string"?hex(color):color,light);
      for(const p of [a,b,c])this.vertices.push(...p,...rgb);
    }
    quad(a,b,c,d,color,glow=false){this.tri(a,b,c,color,glow);this.tri(a,c,d,color,glow);}
    box(x,y,z,w,h,d,color){
      const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,y1=y+h;
      const p=[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1],[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
      for(const [a,b,c,e] of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])this.quad(p[a],p[b],p[c],p[e],color);
    }
    cylinder(x,y,z,r,h,color,n=8){
      for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
        const p=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],P=[p[0],y+h,p[2]],Q=[q[0],y+h,q[2]];
        this.quad(p,q,Q,P,color);this.tri([x,y+h,z],P,Q,color);
      }
    }
    cone(x,y,z,r,h,color,n=8){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;this.tri([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x+Math.cos(b)*r,y,z+Math.sin(b)*r],[x,y+h,z],color);}}
    sphere(x,y,z,r,color,sides=8,rings=4){
      for(let j=0;j<rings;j++){const p0=-Math.PI/2+j*Math.PI/rings,p1=-Math.PI/2+(j+1)*Math.PI/rings;
        for(let i=0;i<sides;i++){const t0=i*TAU/sides,t1=(i+1)*TAU/sides;
          const at=(p,t)=>[x+r*Math.cos(p)*Math.cos(t),y+r*Math.sin(p),z+r*Math.cos(p)*Math.sin(t)];
          this.quad(at(p0,t0),at(p0,t1),at(p1,t1),at(p1,t0),color);
        }
      }
    }
    roof(x,y,z,w,h,d,color){
      const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,top=y+h;
      this.quad([x0,y,z0],[x0,y,z1],[x,top,z1],[x,top,z0],color);
      this.quad([x,top,z0],[x,top,z1],[x1,y,z1],[x1,y,z0],color);
      this.tri([x0,y,z0],[x,top,z0],[x1,y,z0],color);
      this.tri([x1,y,z1],[x,top,z1],[x0,y,z1],color);
    }
    gem(x,y,z,r,h,color){
      for(let i=0;i<6;i++){const a=i*TAU/6,b=(i+1)*TAU/6,A=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],B=[x+Math.cos(b)*r,y,z+Math.sin(b)*r];
        this.tri([x,y+h,z],A,B,color,true);this.tri([x,y-h*.7,z],B,A,color,true);
      }
    }
    ring(x,y,z,outer,inner,color,n=20){for(let i=0;i<n;i++){const a=i*TAU/n,b=(i+1)*TAU/n;
      this.quad([x+Math.cos(a)*outer,y+Math.sin(a)*outer,z],[x+Math.cos(b)*outer,y+Math.sin(b)*outer,z],[x+Math.cos(b)*inner,y+Math.sin(b)*inner,z],[x+Math.cos(a)*inner,y+Math.sin(a)*inner,z],color,true);
    }}
    limb(start,end,r,color){const axis=norm(end.map((v,i)=>v-start[i])),side=norm(cross(axis,Math.abs(axis[2])<.9?[0,0,1]:[0,1,0])),depth=norm(cross(axis,side));const ring=(p,i)=>{const a=i*TAU/6;return p.map((v,j)=>v+r*(Math.cos(a)*side[j]+Math.sin(a)*depth[j]));};for(let i=0;i<6;i++){const j=(i+1)%6;this.quad(ring(start,i),ring(start,j),ring(end,j),ring(end,i),color);}this.tri(start,ring(start,0),ring(start,1),color);this.tri(end,ring(end,1),ring(end,0),color);}
  }
  const vs=`attribute vec3 aPosition; attribute vec3 aColor;
    uniform mat4 uMatrix; uniform vec3 uEye; varying vec3 vColor; varying float vDistance;
    void main(){gl_Position=uMatrix*vec4(aPosition,1.0);vColor=aColor;vDistance=distance(aPosition,uEye);}`;
  const fs=`precision mediump float; varying vec3 vColor; varying float vDistance; uniform vec3 uFog;
    void main(){float fog=clamp((vDistance-32.0)/75.0,0.0,0.72);vec3 c=mix(vColor,uFog,fog);gl_FragColor=vec4(c,1.0);}`;
  const glowVs=`attribute vec3 aPosition; attribute vec3 aColor; attribute float aSize;
    uniform mat4 uMatrix; varying vec3 vColor;
    void main(){vec4 p=uMatrix*vec4(aPosition,1.0);gl_Position=p;gl_PointSize=clamp(aSize*300.0/max(p.w,1.0),3.0,80.0);vColor=aColor;}`;
  const glowFs=`precision mediump float; varying vec3 vColor;
    void main(){float radius=length(gl_PointCoord-vec2(0.5))*2.0;float alpha=(1.0-smoothstep(0.07,1.0,radius))*0.5;gl_FragColor=vec4(vColor,alpha);}`;
  function program(gl,vertex=vs,fragment=fs){
    const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
  }
  class SunflowerWorld {
    constructor(canvas,options={}){
      this.canvas=canvas;this.options=options;this.gl=canvas.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:false});
      if(!this.gl)throw new Error("WebGL is unavailable");
      const gl=this.gl;this.program=program(gl);this.glowProgram=program(gl,glowVs,glowFs);this.buffer=gl.createBuffer();this.dynamicBuffer=gl.createBuffer();this.glowBuffer=gl.createBuffer();this.dynamicGlowBuffer=gl.createBuffer();
      this.position=gl.getAttribLocation(this.program,"aPosition");this.color=gl.getAttribLocation(this.program,"aColor");
      this.matrixUniform=gl.getUniformLocation(this.program,"uMatrix");this.eyeUniform=gl.getUniformLocation(this.program,"uEye");this.fogUniform=gl.getUniformLocation(this.program,"uFog");
      this.glowPosition=gl.getAttribLocation(this.glowProgram,"aPosition");this.glowColor=gl.getAttribLocation(this.glowProgram,"aColor");this.glowSize=gl.getAttribLocation(this.glowProgram,"aSize");this.glowMatrix=gl.getUniformLocation(this.glowProgram,"uMatrix");
      this.keys=new Set();this.joystick={x:0,y:0};this.sprinting=false;this.player={x:0,z:-14,heading:0,headHeading:0};this.friend={x:-1.7,z:-15,heading:0,headHeading:0};this.yaw=0;this.pitch=.4;this.place=null;this.found=[false,false,false];this.companion=null;this.playerAppearance={skin:1,hair:0,eyes:0,outfit:0,style:"waves",accessory:"flower",build:"balanced"};this.near=null;this.last=0;this.lastHint="";this.running=true;this.active=true;this.walkPhase=0;this.walkEnergy=0;this.friendPhase=0;this.friendEnergy=0;
      this.petals=[{x:-5,z:-4},{x:6,z:4},{x:-2,z:11}];this.colliders=[];
      this.installControls();this.resize();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas);
      requestAnimationFrame(t=>this.frame(t));
    }
    installControls(){
      // Letter keys follow the printed label, so A runs on QWERTY and AZERTY.
      const keyOf=e=>({a:"KeyA",q:"KeyQ",w:"KeyW",z:"KeyW",s:"KeyS",d:"KeyD",e:"KeyE",m:"KeyM"})[e.key?.toLowerCase()]||e.code;
      window.addEventListener("keydown",e=>{if(!this.active||this.options.blockControls?.())return;const key=keyOf(e);if(["KeyW","KeyA","KeyQ","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","ShiftLeft","ShiftRight","KeyE","KeyM"].includes(key))e.preventDefault();this.keys.add(key);
        if(e.repeat)return;if(key==="KeyE")this.interact();if(key==="KeyM")this.options.onAction?.("map");});
      window.addEventListener("keyup",e=>this.keys.delete(keyOf(e)));window.addEventListener("blur",()=>{this.keys.clear();this.joystick={x:0,y:0};});
      let dragging=false,lastX=0,lastY=0;
      this.canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;dragging=true;lastX=e.clientX;lastY=e.clientY;this.canvas.setPointerCapture(e.pointerId);});
      this.canvas.addEventListener("pointermove",e=>{if(!dragging)return;this.yaw+=clamp(e.clientX-lastX,-40,40)*.006;this.pitch=clamp(this.pitch+(lastY-e.clientY)*.003,.2,.75);lastX=e.clientX;lastY=e.clientY;});
      this.canvas.addEventListener("pointerup",()=>dragging=false);this.canvas.addEventListener("pointercancel",()=>dragging=false);
      const run=document.getElementById("runButton");if(run){run.addEventListener("pointerdown",e=>{run.setPointerCapture(e.pointerId);this.sprinting=true;e.preventDefault();});const stop=()=>{this.sprinting=false;};run.addEventListener("pointerup",stop);run.addEventListener("pointercancel",stop);window.addEventListener("blur",stop);}
      const pad=document.getElementById("movePad"),knob=document.getElementById("moveKnob");let active=null;
      const update=e=>{const r=pad.getBoundingClientRect(),radius=r.width*.34,dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),scale=Math.max(1,Math.hypot(dx,dy)/radius);this.joystick={x:dx/scale/radius,y:dy/scale/radius};knob.style.transform=`translate(${this.joystick.x*radius}px,${this.joystick.y*radius}px)`;};
      pad.addEventListener("pointerdown",e=>{active=e.pointerId;pad.setPointerCapture(e.pointerId);update(e);e.preventDefault();});
      pad.addEventListener("pointermove",e=>{if(active===e.pointerId)update(e);});
      const release=e=>{if(active!==e.pointerId)return;active=null;this.joystick={x:0,y:0};knob.style.transform="translate(0,0)";};
      pad.addEventListener("pointerup",release);pad.addEventListener("pointercancel",release);
    }
    resize(){const r=this.canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,1.6),w=Math.max(1,Math.round(r.width*ratio)),h=Math.max(1,Math.round(r.height*ratio));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);}}
    setActive(active){this.active=active;this.last=0;if(!active){this.keys.clear();this.joystick={x:0,y:0};this.sprinting=false;this.walkEnergy=0;this.friendEnergy=0;}}
    load(place){if(this.place?.id===place.id)return;this.place=place;this.theme=themes[place.region]||themes.Caucasus;this.rand=randomFor(place.id);this.player={x:0,z:-14,heading:0,headHeading:0};this.friend={x:-1.7,z:-15,heading:0,headHeading:0};this.yaw=0;this.colliders=[];this.build();this.setPetals(this.options.getPetals?.()||[false,false,false]);}
    setPetals(found){this.found=[...found];}
    setCompanion(companion){this.companion=companion;}
    setPlayerAppearance(appearance){this.playerAppearance={...appearance};}
    upload(mesh,buffer,usage){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.vertices),usage);return mesh.vertices.length/6;}
    draw(buffer,count){if(!count)return;const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(this.position,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.color,3,gl.FLOAT,false,24,12);gl.drawArrays(gl.TRIANGLES,0,count);}
    drawGlow(buffer,count){if(!count)return;const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.vertexAttribPointer(this.glowPosition,3,gl.FLOAT,false,28,0);gl.vertexAttribPointer(this.glowColor,3,gl.FLOAT,false,28,12);gl.vertexAttribPointer(this.glowSize,1,gl.FLOAT,false,28,24);gl.drawArrays(gl.POINTS,0,count);}
    flower(m,x,z,r=1){m.cylinder(x,0,z,.055*r,1.3*r,"#4a8974",5);m.gem(x-.17*r,.73*r,z,.18*r,.14*r,"#62ad76");m.gem(x+.18*r,.89*r,z,.18*r,.14*r,"#70bc81");m.sphere(x,1.34*r,z,.26*r,"#634a54",8,2);for(let i=0;i<9;i++){const a=i*TAU/9;m.gem(x+Math.cos(a)*.4*r,1.34*r+Math.sin(a)*.4*r,z,.14*r,.23*r,i%2?"#ffd267":"#f6a351");}}
    orangeTree(m,x,z,size=1){m.cylinder(x,0,z,.22*size,2.5*size,"#624f49",8);m.sphere(x,2.8*size,z,1.25*size,"#467c61",12,5);m.sphere(x-.68*size,2.37*size,z,.77*size,"#57936a",10,4);m.sphere(x+.57*size,3.16*size,z,.72*size,"#5c9d70",10,4);
      for(let i=0;i<9;i++){const a=i*TAU/9,rx=x+Math.cos(a)*(.92+(i%3)*.11)*size,rz=z+Math.sin(a)*.75*size,ry=(2.38+(i%4)*.33)*size;m.sphere(rx,ry,rz,.14*size,i%2?"#ff9d42":"#ffc063",8,3);}
    }
    tree(m,x,z,size,variant=0){m.cylinder(x,0,z,.16*size,2.4*size,"#625c65",6);
      if(variant===1){for(let i=0;i<3;i++)m.cone(x,1.3*size+i*.7*size,z,(1.45-i*.24)*size,1.75*size,i%2?"#6a9e9d":"#74a5a0",7);}else{
        for(let i=0;i<3;i++){const dx=(i-1)*.58*size;m.sphere(x+dx,2.5*size+(i===1?.3:0)*size,z,.86*size,i===1?this.theme.leaf:"#e5adad",8,3);}}
    }
    house(m,x,z,variant=0){const y=0,w=3.2+this.rand()*1.8,h=2.7+this.rand()*1.4,d=3.2+this.rand()*1.3;
      m.box(x,y,z,w,h,d,variant?this.theme.stone:"#b5a0a0");m.box(x,h-.2,z,w+1.1,.16,d+1.1,"#e8b182");m.roof(x,h-.13,z,w+1,1.6,d+1,this.theme.roof);
      for(const side of [-1,1]){m.box(x+side*w*.27,h*.55,z-d/2-.07,.65,.86,.07,"#ffe0a2");m.box(x+side*w*.27,h*.54,z-d/2-.1,.08,.92,.11,"#544e69");m.box(x+side*w*.27,h*.54,z-d/2-.12,.73,.08,.1,"#544e69");}
      m.box(x-.95,0,z-d/2-.08,.7,1.5,.16,"#514c61");m.box(x,h+1.45,z,.18,.24,d+1.2,"#ffe09f");
      this.colliders.push({x,z,r:Math.max(w,d)*.51});
    }
    build(){const m=new Mesh(),t=this.theme,r=this.rand;
      m.box(0,-.32,0,88,.3,88,t.ground);
      // Wide paths and a luminous guild plaza, built as real 3D surfaces.
      m.box(0,-.045,3,7,.06,42,t.path);m.box(0,-.036,12,16,.07,13,t.stone);
      m.cylinder(0,-.016,11.5,7.2,.055,t.path,16);m.cylinder(0,.02,11.5,5.3,.045,"#bdb2af",16);
      for(let i=0;i<20;i++){const z=-16+i*2.1;m.box(0,.002,z,6.4,.016,.11,i%2?"#e9c79e":"#edd2aa");}
      for(const x of [-3.75,3.75]){m.box(x,.005,2,.055,.04,39,t.glow);for(let i=0;i<12;i++)m.gem(x,.24,-15+i*3.1,.10,.17,t.glow);}
      for(let i=0;i<34;i++){const x=(r()-.5)*78,z=(r()-.5)*78;if(Math.abs(x)<8&&z<24&&z>-22)continue;m.box(x,-.014,z,1+r()*1.9,.025,1+r()*1.9,r()>.5?t.grass:t.ground);}
      // Broad irregular stone slabs, flower borders, and a little orange grove
      // turn the arrival path into a place to wander rather than a menu.
      for(let i=0;i<19;i++){const z=-17+i*2.05;m.box(-1.6+(i%3)*1.6,.026,z,1.43,.018,1.6,i%3===0?"#f2d2a4":"#dcb892");}
      for(const side of [-1,1]){for(let i=0;i<19;i++){const z=-16+i*1.75;this.flower(m,side*(4.2+(i%3)*.36),z,.5+(i%4)*.09);}for(const z of [-19,-13,-7]){const x=side*10.4;this.orangeTree(m,x,z,1.05+(z===-13?.15:0));this.colliders.push({x,z,r:1.2});}}
      for(const x of [-8,8])for(const z of [-21,-4]){m.cylinder(x,.008,z,1.15,.025,"#254f56",16);m.cylinder(x,.033,z,.85,.025,"#709a84",16);}
      // Guild hall and its layered roofs.
      m.box(0,0,25,11,6.6,7.7,"#b9a5a5");m.box(0,6.5,25,12.2,.35,8.6,"#5c5e7d");m.roof(0,6.7,25,13.4,3.4,9.4,t.roof);
      m.box(0,9.3,25,4.3,2.7,4.4,"#ac9ba5");m.roof(0,11.85,25,5.5,2.1,5.7,t.roof);
      m.box(0,.04,21.05,2.4,3.9,.12,"#514d67");m.box(0,4.7,20.98,2.8,.25,.21,t.glow);
      for(const x of [-4.5,-3.2,3.2,4.5]){m.box(x,2.5,20.98,.83,1.5,.12,"#ffe2ad");m.box(x,2.48,20.89,.1,1.5,.14,"#67637d");}
      m.box(0,5.25,20.91,1.7,2.4,.15,"#a95970");m.gem(0,6.1,20.77,.4,.55,"#ffe5a2");
      m.ring(0,9.5,20.55,1.13,.94,"#ffe09a");m.gem(0,9.5,20.45,.47,.60,"#f9bd61");
      for(const x of [-6.6,6.6]){m.cylinder(x,0,17.3,.32,3.5,"#665e7c",9);m.gem(x,3.9,17.3,.54,.73,"#ffe2a0");}
      this.colliders.push({x:0,z:25,r:5.0});
      // Arcane transit gate; approaching it opens the atlas.
      for(const x of [11.9,15.3]){m.cylinder(x,0,7.5,.43,4.7,"#665c84",8);m.gem(x,4.9,7.5,.64,.58,t.glow);}
      m.box(13.6,4.1,7.5,4.8,.56,.82,"#5b577c");m.box(13.6,4.8,7.5,5.4,.18,.9,t.glow);
      m.box(13.6,.03,7.5,4.3,.06,3.4,"#688d9f");m.ring(13.6,2.55,7.11,1.48,1.31,"#9be5e1");m.gem(13.6,2.4,7.05,.68,1.25,"#93d5d1");
      // Diary pavilion and companion nook.
      for(const x of [-15.8,-11.3])for(const z of [8.2,12.2])m.cylinder(x,0,z,.17,3.25,"#6b5e72",7);
      m.roof(-13.55,3.3,10.2,6.8,1.4,6.4,t.roof);m.box(-13.55,0,10.1,1.9,1.0,1.25,"#8d7180");m.box(-13.55,1.0,10.1,1.75,.09,1.2,"#ffe1af");
      m.box(-11.5,0,-8.0,3.2,.68,1.05,"#7b6a78");m.box(-11.5,.62,-8.45,3.35,1.15,.24,"#946d80");
      // The journey gallery is a walk-up portal; the visited places are shown
      // in a proper accessible overlay when the player explores it.
      for(const x of [8.5,11.5]){m.cylinder(x,0,-8,.25,3.8,"#556d7b",10);m.gem(x,4.13,-8,.36,.49,"#ffe09a");}
      m.box(10,3.7,-8,3.7,.25,.55,"#619796");m.box(10,2.35,-8,.11,2.1,.1,"#9cdddd");m.ring(10,2.45,-8.2,.92,.78,"#9be7de");m.gem(10,2.45,-8.15,.46,.68,"#ffce7c");
      m.box(10,.012,-9.4,4.3,.04,2.1,"#6d9091");
      // Floating star lamps and holographic route lights make the old guild
      // architecture feel like a future imagined through fantasy art.
      for(const z of [-11,-5,1,7,13])for(const x of [-6.3,6.3]){m.cylinder(x,0,z,.095,2.6,"#5e6581",6);m.gem(x,3.05,z,.35,.52,t.glow);m.ring(x,3.05,z+.1,.6,.56,"#9fdfd9",12);}
      for(const [x,z,y] of [[-17,27,10],[17,29,12],[9,38,15]]){m.gem(x,y,z,1.3,1.8,"#8bc4c2");m.gem(x,y+1.4,z,.4,.72,t.glow);}
      // Fantasy city perimeter and far silhouettes.
      for(let i=0;i<18;i++){const a=i*TAU/18+(.5-r())*.18,dist=22+r()*13,x=Math.sin(a)*dist,z=Math.cos(a)*dist;if(z>18&&Math.abs(x)<8)continue;this.house(m,x,z,i%2);}
      for(let i=0;i<23;i++){const a=r()*TAU,dist=13+r()*21,x=Math.sin(a)*dist,z=Math.cos(a)*dist;if(Math.abs(x)<7&&z>-19&&z<19)continue;if(Math.hypot(x+13.5,z-10)<6||Math.hypot(x-13.6,z-7.5)<6)continue;this.tree(m,x,z,.75+r()*.6,i%4===0?1:0);this.colliders.push({x,z,r:.6});}
      for(let i=0;i<56;i++){const x=(r()-.5)*76,z=(r()-.5)*76;if(Math.abs(x)<5&&z>-18&&z<20)continue;this.flower(m,x,z,.45+r()*.55);}
      for(let i=0;i<9;i++){const a=i*TAU/9,x=Math.sin(a)*70,z=Math.cos(a)*70;m.cone(x,-.1,z,9+r()*5,10+r()*8,i%2?"#7a7891":"#788b99",7);}
      for(let i=0;i<10;i++){const x=(r()-.5)*65,z=(r()-.5)*65;m.gem(x,5+r()*7,z,.26+r()*.25,.6+r()*.3,i%2?t.glow:"#9fdfdf");}
      // Three discoverable flower shrines; their bright petals change with progress.
      for(const p of this.petals){m.cylinder(p.x,0,p.z,.62,.28,"#6f6984",10);m.cylinder(p.x,.29,p.z,.46,.08,t.path,10);for(let i=0;i<7;i++){const a=i*TAU/7;m.gem(p.x+Math.cos(a)*.63,.45,p.z+Math.sin(a)*.63,.17,.3,t.glow);}}
      this.worldCount=this.upload(m,this.buffer,this.gl.STATIC_DRAW);
      const glow=[];const add=(x,y,z,color,size)=>glow.push(x,y,z,...hex(color),size);
      for(const z of [-11,-5,1,7,13])for(const x of [-6.3,6.3])add(x,3.05,z,t.glow,2.2);
      for(const x of [-6.6,6.6])add(x,3.9,17.3,"#ffe7a9",3.4);
      add(13.6,2.55,7.05,"#a7fff2",5.3);add(0,9.5,20.55,"#ffe69b",3.2);add(-13.55,1.1,10.1,"#ffc0a7",2.3);add(10,2.45,-8.15,"#ffd47b",4.2);
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER,this.glowBuffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array(glow),this.gl.STATIC_DRAW);this.glowCount=glow.length/7;
      this.fog=hex(t.ground).map((v,i)=>mix(v,[.6,.57,.65][i],.38));
    }
    character(m,x,z,heading,look={},player=false,phase=0,amount=0,headHeading=heading){
      const skins=["#f0cfb2","#d99b70","#b8734c","#80503e","#51352e"],outfits=["#d87948","#628475","#596587","#925e79","#ba8f4e"],hairs=["#2b2534","#694137","#ad6345","#bf915f","#b9adb0","#5d415c"],eyes=["#493632","#786040","#477065","#506e90","#6c7380"];
      const skin=skins[look.skin]||skins[1],coat=outfits[look.outfit]||outfits[0],hair=hairs[look.hair]||hairs[0],eye=eyes[look.eyes]||eyes[0];
      const scale=player?1:.88,build=look.build==="strong"?1.16:look.build==="slim"?.88:1,bob=Math.abs(Math.sin(phase))*amount*.09;
      const local=(side,height,forward)=>[x+scale*(side*Math.cos(heading)+forward*Math.sin(heading)),height*scale+bob,z+scale*(forward*Math.cos(heading)-side*Math.sin(heading))];
      for(const side of [-1,1]){const swing=Math.sin(phase+(side===1?Math.PI:0))*amount,hip=local(side*.18,.83,0),knee=local(side*.18,.43,swing*.24),ankle=local(side*.18,.11,swing*.4-Math.max(0,-swing)*.10);
        m.limb(hip,knee,.13*scale,side===1?"#313a59":"#3f4767");m.limb(knee,ankle,.115*scale,"#3c4767");m.limb(ankle,local(side*.18,.08,swing*.4+.17),.14*scale,"#252d48");
        const shoulder=local(side*.46*build,1.57,0),elbow=local(side*.52*build,1.13,-swing*.23),hand=local(side*.50*build,.82,-swing*.35);m.limb(shoulder,elbow,.115*scale,coat);m.limb(elbow,hand,.09*scale,skin);
      }
      m.cone(x,.68*scale+bob,z,.58*scale*build,1.28*scale,coat,8);m.cylinder(x,1.72*scale+bob,z,.13*scale,.22*scale,skin,7);
      const head=(side,height,forward)=>[x+scale*(side*Math.cos(headHeading)+forward*Math.sin(headHeading)),height*scale+bob,z+scale*(forward*Math.cos(headHeading)-side*Math.sin(headHeading))];
      m.sphere(x,2.02*scale+bob,z,.36*scale,skin,10,4);
      const crown=head(0,2.29,-.06);m.sphere(...crown,.38*scale,hair,9,3);
      if(look.style!=="short"){const backHair=head(0,2.28,-.16);m.cone(...backHair,.38*scale,look.style==="long"?.72*scale:.44*scale,hair,8);}
      if(look.style==="bun")m.sphere(...head(0,2.48,-.24),.20*scale,hair,8,3);
      // The head follows the body with a small delay. Its facial features and
      // hairline use the head direction so turning is visible from the side.
      for(const side of [-1,1]){m.sphere(...head(side*.12,2.055,.315),.044*scale,eye,7,3);m.sphere(...head(side*.12,2.07,.351),.014*scale,"#fff3dd",6,2);}
      m.sphere(...head(0,1.97,.347),.048*scale,skin,7,3);
      for(const side of [-1,1])m.gem(...head(side*.21,2.245,.21),.12*scale,.18*scale,hair);
      if(!player&&["bun","long","waves"].includes(look.style))m.sphere(...head(0,1.94,-.28),.18*scale,hair,8,3);
      if(look.accessory==="glasses")for(const side of [-1,1])m.sphere(...head(side*.12,2.055,.37),.072*scale,"#e9d5ad",8,3);
      if(look.accessory==="scarf")m.cylinder(x,1.72*scale+bob,z,.29*scale,.16*scale,"#f7cf83",9);
      if(look.accessory==="flower")m.gem(...local(.27*build,1.53,.38),.12*scale,.18*scale,"#ffd673");
      m.box(x,1.02*scale+bob,z-.42*scale,.58*scale,.66*scale,.26*scale,player?"#765e7a":"#625a75");
      // A small guild sash shows the character's heading.
      const fx=Math.sin(heading)*.29*scale,fz=Math.cos(heading)*.29*scale;m.box(x+fx,1.52*scale+bob,z+fz,.33*scale,.1*scale,.1*scale,"#fff0c4");
    }
    nearby(){
      const p=this.player,actions=[];
      this.petals.forEach((v,i)=>{if(!this.found[i])actions.push({x:v.x,z:v.z,type:"petal",index:i,label:`Gather sun petal ${i+1}`});});
      actions.push({x:13.6,z:6.1,type:"map",label:"Open the world map"},{x:10,z:-8.8,type:"gallery",label:"See your journeys"},{x:-13.5,z:7.9,type:"diary",label:"Write in your diary"},{x:-11.5,z:-6.7,type:"companion",label:"Customize your companion"},{x:0,z:18.4,type:"story",label:"Visit the guild hall"});
      return actions.map(a=>({...a,d:Math.hypot(a.x-p.x,a.z-p.z)})).filter(a=>a.d<2.8).sort((a,b)=>a.d-b.d)[0]||null;
    }
    interact(){if(this.options.blockControls?.())return;const near=this.near;if(!near)return;
      if(near.type==="petal"){this.options.onCollect?.(near.index);this.found[near.index]=true;this.near=null;}else this.options.onAction?.(near.type);
    }
    move(dt){if(this.options.blockControls?.())return false;
      const k=this.keys,side=Number(k.has("KeyD")||k.has("ArrowRight"))-Number(k.has("KeyQ")||k.has("ArrowLeft"))+this.joystick.x;
      const forward=Number(k.has("KeyW")||k.has("ArrowUp"))-Number(k.has("KeyS")||k.has("ArrowDown"))-this.joystick.y;
      const length=Math.hypot(side,forward);if(length<.08)return false;const speed=(this.sprinting||k.has("KeyA")||k.has("ShiftLeft")||k.has("ShiftRight")?8.2:5.0)*dt/Math.max(1,length);
      const dx=(side*Math.cos(this.yaw)+forward*Math.sin(this.yaw))*speed,dz=(forward*Math.cos(this.yaw)-side*Math.sin(this.yaw))*speed;
      const clear=(x,z)=>!this.colliders.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+.52);
      let x=clamp(this.player.x+dx,-39,39),z=clamp(this.player.z+dz,-39,39);
      if(clear(x,this.player.z))this.player.x=x;if(clear(this.player.x,z))this.player.z=z;
      this.player.heading=Math.atan2(dx,dz);return true;
    }
    drawRadar(){const canvas=document.getElementById("localMiniMap"),ctx=canvas?.getContext("2d");if(!ctx)return;
      const s=150,c=75,scale=3.7,p=this.player;ctx.clearRect(0,0,s,s);ctx.save();ctx.beginPath();ctx.arc(c,c,67,0,TAU);ctx.clip();
      ctx.fillStyle="#1c3750";ctx.fillRect(0,0,s,s);ctx.strokeStyle="#c7e0ce24";ctx.lineWidth=1;for(let v=-3;v<=3;v++){ctx.beginPath();ctx.moveTo(c+v*22,0);ctx.lineTo(c+v*22,s);ctx.moveTo(0,c+v*22);ctx.lineTo(s,c+v*22);ctx.stroke();}
      const pos=(x,z)=>[c+(x-p.x)*scale,c-(z-p.z)*scale];ctx.strokeStyle="#edd4ab6b";ctx.lineWidth=14;ctx.beginPath();let a=pos(0,-30),b=pos(0,30);ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
      for(const marker of [{x:0,z:18.4,color:"#ffde9a"},{x:13.6,z:6.1,color:"#8fe2df"},{x:10,z:-8.8,color:"#ffc879"},{x:-13.5,z:7.9,color:"#f4adc5"},{x:-11.5,z:-6.7,color:"#dda4f0"},...this.petals.map((v,i)=>({...v,color:this.found[i]?"#758a8e":"#ffbd62"}))]){const [x,y]=pos(marker.x,marker.z);ctx.beginPath();ctx.arc(x,y,marker.color==="#ffbd62"?5:3.5,0,TAU);ctx.fillStyle=marker.color;ctx.fill();}
      ctx.translate(c,c);ctx.rotate(this.player.heading);ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(-6,6);ctx.lineTo(6,6);ctx.closePath();ctx.fillStyle="#fff5db";ctx.fill();ctx.strokeStyle="#5f5069";ctx.lineWidth=2;ctx.stroke();ctx.restore();
      ctx.strokeStyle="#ffdaa186";ctx.lineWidth=2;ctx.beginPath();ctx.arc(c,c,67,0,TAU);ctx.stroke();
    }
    frame(now){if(!this.running)return;const dt=Math.min(.05,(now-(this.last||now))/1000);this.last=now;
      if(!this.active){requestAnimationFrame(t=>this.frame(t));return;}
      const moved=this.move(dt);this.walkEnergy=mix(this.walkEnergy,moved?1:0,Math.min(1,dt*13));if(moved)this.walkPhase+=dt*(this.sprinting||this.keys.has("KeyA")||this.keys.has("ShiftLeft")||this.keys.has("ShiftRight")?12:9);
      this.player.headHeading=turnTowards(this.player.headHeading,this.player.heading,Math.min(1,dt*8));
      const oldFriendX=this.friend.x,oldFriendZ=this.friend.z;
      this.friend.x=mix(this.friend.x,this.player.x-1.5*Math.cos(this.yaw)-.6*Math.sin(this.yaw),Math.min(1,dt*3));
      this.friend.z=mix(this.friend.z,this.player.z+.6*Math.cos(this.yaw)-1.5*Math.sin(this.yaw),Math.min(1,dt*3));
      const friendMoved=Math.hypot(this.friend.x-oldFriendX,this.friend.z-oldFriendZ)>dt*.12;this.friendEnergy=mix(this.friendEnergy,friendMoved?1:0,Math.min(1,dt*10));if(friendMoved){this.friendPhase+=dt*8;this.friend.heading=Math.atan2(this.friend.x-oldFriendX,this.friend.z-oldFriendZ);}this.friend.headHeading=turnTowards(this.friend.headHeading,this.friend.heading,Math.min(1,dt*7));
      if(this.place){this.near=this.nearby();const label=this.near?.label||"Walk to glowing places and explore";
        if(label!==this.lastHint){this.lastHint=label;this.options.onHint?.(label,!!this.near);}
        this.render(now);if(now-(this.lastRadar||0)>100){this.drawRadar();this.lastRadar=now;}
      }
      requestAnimationFrame(t=>this.frame(t));
    }
    render(now){this.resize();const gl=this.gl,p=this.player;
      const eye=[p.x-Math.sin(this.yaw)*7,4.35+this.pitch*1.6,p.z-Math.cos(this.yaw)*7],target=[p.x+Math.sin(this.yaw)*3.4,1.65,p.z+Math.cos(this.yaw)*3.4];
      gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.useProgram(this.program);gl.enableVertexAttribArray(this.position);gl.enableVertexAttribArray(this.color);
      const matrix=cameraMatrix(eye,target,this.canvas.width/this.canvas.height);
      gl.uniformMatrix4fv(this.matrixUniform,false,matrix);gl.uniform3fv(this.eyeUniform,eye);gl.uniform3fv(this.fogUniform,this.fog);
      this.draw(this.buffer,this.worldCount);
      const m=new Mesh();this.character(m,p.x,p.z,p.heading,this.playerAppearance,true,this.walkPhase,this.walkEnergy,p.headHeading);
      this.character(m,this.friend.x,this.friend.z,this.friend.heading,this.companion||{},false,this.friendPhase,this.friendEnergy,this.friend.headHeading);
      this.petals.forEach((q,i)=>{if(this.found[i])return;const bounce=Math.sin(now/360+i*2)*.15;
        m.gem(q.x,1.65+bounce,q.z,.39,.58,i%2?"#ffe4a2":"#ffd36e");
        for(let j=0;j<7;j++){const a=j*TAU/7+now/2100;m.gem(q.x+Math.sin(a)*.8,1.65+bounce+Math.sin(a)*.25,q.z+Math.cos(a)*.8,.08,.14,"#fff1c1");}
      });
      const count=this.upload(m,this.dynamicBuffer,gl.DYNAMIC_DRAW);this.draw(this.dynamicBuffer,count);
      const sparks=[];for(let i=0;i<this.petals.length;i++){if(this.found[i])continue;const q=this.petals[i];sparks.push(q.x,1.65+Math.sin(now/360+i*2)*.15,q.z,1,.83,.43,4.3);}
      gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamicGlowBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(sparks),gl.DYNAMIC_DRAW);
      gl.useProgram(this.glowProgram);gl.uniformMatrix4fv(this.glowMatrix,false,matrix);gl.enableVertexAttribArray(this.glowPosition);gl.enableVertexAttribArray(this.glowColor);gl.enableVertexAttribArray(this.glowSize);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.depthMask(false);
      this.drawGlow(this.glowBuffer,this.glowCount);this.drawGlow(this.dynamicGlowBuffer,sparks.length/7);
      gl.depthMask(true);gl.disable(gl.BLEND);
    }
  }
  window.SunflowerWorld=SunflowerWorld;
  window.SunflowerWorldMath={cameraMatrix,hash};
})();
