/* The globe is an original WebGL 1 scene using the Earth textures supplied with
   this project. Place markers are approximate navigational pins, not GPS data. */
(() => {
  "use strict";
  const RAD=Math.PI/180, TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const centroids={
    Kenya:[-.02,37.9],Uganda:[1.4,32.3],Rwanda:[-1.95,29.9],Tanzania:[-6.3,35.1],Malawi:[-13.3,34.3],Zambia:[-13.1,27.8],Zimbabwe:[-19,29.2],Botswana:[-22.3,24.7],Namibia:[-22.5,17],"South Africa":[-29,24],
    Mexico:[23.6,-102.6],Belize:[17.2,-88.7],Guatemala:[15.7,-90.2],"El Salvador":[13.7,-89.2],Honduras:[14.7,-86.3],Nicaragua:[12.9,-85.2],"Costa Rica":[9.8,-84],Panama:[8.5,-80],Colombia:[4.6,-74],Brazil:[-10,-52],Paraguay:[-23.4,-58.4],Uruguay:[-32.5,-55.8],Argentina:[-38.4,-63.6],Chile:[-33.4,-70.7],Bolivia:[-16.3,-64.7],Peru:[-9.2,-75],
    Sweden:[62,15],Finland:[64,26],Estonia:[59,25],Latvia:[57,25],Lithuania:[55,24],Poland:[52,19],Czechia:[49.8,15.5],Slovakia:[48.7,19.5],Moldova:[47,28.5],Romania:[46,25],Hungary:[47,19],Slovenia:[46.1,14.8],Croatia:[45.1,15.2],"Bosnia and Herzegovina":[44.2,17.7],Montenegro:[42.7,19.3],Serbia:[44,21],Kosovo:[42.6,21],"North Macedonia":[41.6,21.7],Albania:[41,20],Greece:[39,23.7],Cyprus:[35,33],Bulgaria:[42.7,25.5],
    Turkey:[39,35],Azerbaijan:[40.3,47.6],Georgia:[42,43.5],Armenia:[40.2,44.5],
    Indonesia:[-2.5,118],Brunei:[4.5,114.7],Singapore:[1.3,103.8],Malaysia:[4,102],Thailand:[15,101],Myanmar:[21,96],Cambodia:[12.5,105],Vietnam:[16,107.5],Laos:[18,103.7],Philippines:[13,122],
    Taiwan:[23.7,121],"Hong Kong":[22.3,114.2],China:[35,104],
    Kazakhstan:[48,67],Kyrgyzstan:[41.2,74.7],Tajikistan:[38.8,71],Uzbekistan:[41.4,64.6],Turkmenistan:[39,59]
  };
  const regionCenters={Africa:[-4,24],"The Americas":[-9,-70],Europe:[49,15],Caucasus:[41,43],"Southeast Asia":[9,108],"East Asia":[33,111],"Silk Road":[42,68]};
  const cityCoords={Yerevan:[40.18,44.5],Tbilisi:[41.72,44.78],Baku:[40.41,49.87],Cappadocia:[38.64,34.83],Beijing:[39.9,116.4],Shanghai:[31.23,121.47],"Hong Kong":[22.32,114.17],Taipei:[25.03,121.56],Nairobi:[-1.29,36.82],"Cape Town":[-33.92,18.42],"Mexico City":[19.43,-99.13],"São Paulo":[-23.55,-46.63],"Rio de Janeiro":[-22.91,-43.2],Stockholm:[59.33,18.06],Istanbul:[41.01,28.98],Bangkok:[13.76,100.5],Singapore:[1.29,103.85],Samarkand:[39.65,66.97],Almaty:[43.22,76.85]};
  const hash=str=>{let n=2166136261;for(const c of str)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
  const coords=p=>{
    if(cityCoords[p.city])return cityCoords[p.city];
    const [lat,lon]=centroids[p.country]||regionCenters[p.region]||[0,0],h=hash(p.id);
    return [clamp(lat+(((h&1023)/1023)-.5)*3,-80,80),lon+((((h>>>10)&1023)/1023)-.5)*4];
  };
  function solarPosition(date){
    const year=date.getUTCFullYear(),day=Math.floor((date-Date.UTC(year,0,1))/86400000)+1;
    const minutes=date.getUTCHours()*60+date.getUTCMinutes()+date.getUTCSeconds()/60;
    const g=TAU/365*(day-1+(minutes/60-12)/24);
    const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
    const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
    let lon=(720-minutes-eq)/4;lon=((lon+180)%360+360)%360-180;
    return [decl/RAD,lon];
  }
  const vector=(lat,lon)=>[Math.cos(lat*RAD)*Math.sin(lon*RAD),Math.sin(lat*RAD),Math.cos(lat*RAD)*Math.cos(lon*RAD)];
  const vertex=`attribute vec3 aPosition; attribute vec2 aUv; uniform vec2 uAngles; uniform float uAspect; uniform float uDistance; varying vec2 vUv; varying vec3 vGeo; varying vec3 vView;
    void main(){float cy=cos(uAngles.x),sy=sin(uAngles.x),cp=cos(uAngles.y),sp=sin(uAngles.y);vec3 r=vec3(aPosition.x*cy+aPosition.z*sy,aPosition.y,-aPosition.x*sy+aPosition.z*cy);r=vec3(r.x,r.y*cp-r.z*sp,r.y*sp+r.z*cp);float d=uDistance-r.z;gl_Position=vec4(2.0*r.x/uAspect,2.0*r.y,(1.004*d-.2004),d);vUv=aUv;vGeo=aPosition;vView=r;}`;
  const fragment=`precision mediump float; varying vec2 vUv; varying vec3 vGeo; varying vec3 vView; uniform sampler2D uDay;uniform sampler2D uNight;uniform sampler2D uClouds;uniform vec3 uSun;uniform float uTime;
    void main(){float light=dot(normalize(vGeo),uSun);float daylight=smoothstep(-.13,.22,light);vec3 day=texture2D(uDay,vUv).rgb;float cloud=texture2D(uClouds,vUv).r;float lights=texture2D(uNight,vUv).r;float rim=pow(1.0-max(0.0,vView.z),3.0);float shimmer=.72+.28*sin(uTime*.85+vGeo.y*11.0);vec3 base=day*(.10+max(light,0.0)*.94);base=mix(base,vec3(.87,.92,1.0),cloud*.17*daylight);vec3 night=day*.065+vec3(1.0,.50,.15)*lights*(.88+.12*shimmer);vec3 color=mix(night,base,daylight)+vec3(.17,.53,.65)*rim*.38*shimmer;gl_FragColor=vec4(color,1.0);}`;
  function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||"Globe shader failed");return s;}
  function makeProgram(gl){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vertex));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,fragment));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p)||"Globe program failed");return p;}
  function sphere(){const data=[];const point=(lat,lon)=>[...vector(lat,lon),(lon+180)/360,(lat+90)/180];for(let row=0;row<48;row++){const lat0=-90+row*180/48,lat1=-90+(row+1)*180/48;for(let col=0;col<96;col++){const lon0=-180+col*360/96,lon1=-180+(col+1)*360/96;const a=point(lat0,lon0),b=point(lat0,lon1),c=point(lat1,lon1),d=point(lat1,lon0);data.push(...a,...b,...c,...a,...c,...d);}}return new Float32Array(data);}
  class SunflowerGlobe {
    constructor(canvas,markers,options={}){
      this.canvas=canvas;this.markers=markers;this.options=options;this.active=false;this.country=null;this.yaw=-44.5*RAD;this.pitch=31*RAD;this.distance=3.25;this.drag=new Map();this.hit=[];this.last=0;this.dirty=true;this.driftYaw=0;this.driftPitch=0;
      this.gl=canvas.getContext("webgl",{alpha:true,antialias:true,preserveDrawingBuffer:false});if(!this.gl)throw new Error("WebGL is unavailable");
      const gl=this.gl;this.program=makeProgram(gl);this.buffer=gl.createBuffer();const verts=sphere();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);this.count=verts.length/5;
      this.aPos=gl.getAttribLocation(this.program,"aPosition");this.aUv=gl.getAttribLocation(this.program,"aUv");this.uAngles=gl.getUniformLocation(this.program,"uAngles");this.uAspect=gl.getUniformLocation(this.program,"uAspect");this.uDistance=gl.getUniformLocation(this.program,"uDistance");this.uSun=gl.getUniformLocation(this.program,"uSun");this.uTime=gl.getUniformLocation(this.program,"uTime");
      const dayFile=(gl.getParameter?.(gl.MAX_TEXTURE_SIZE)||4096)<4096?"earth-day-mobile.webp":"earth-day.webp";
      for(const [i,file] of [dayFile,"earth-night.webp","earth-clouds.webp"].entries()){
        const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([i===0?95:0,i===0?139:0,i===0?165:0,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        const img=new Image();img.onload=()=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);this.dirty=true;};img.src=`./assets/${file}`;
        gl.useProgram(this.program);gl.uniform1i(gl.getUniformLocation(this.program,["uDay","uNight","uClouds"][i]),i);
      }
      this.install();requestAnimationFrame(t=>this.frame(t));
    }
    install(){const c=this.canvas;
      c.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;this.driftYaw=0;this.driftPitch=0;this.drag.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false});c.setPointerCapture(e.pointerId);this.options.onGesture?.();});
      c.addEventListener("pointermove",e=>{const p=this.drag.get(e.pointerId);if(!p)return;const others=[...this.drag.values()].filter(v=>v!==p);
        if(others.length){const o=others[0],old=Math.hypot(p.x-o.x,p.y-o.y),next=Math.hypot(e.clientX-o.x,e.clientY-o.y);if(old>12&&next>12)this.zoom(old/next);p.moved=true;o.moved=true;}
        else{const dx=e.clientX-p.x,dy=e.clientY-p.y;this.yaw+=dx*.006;this.pitch+=dy*.006;this.pitch=(this.pitch+Math.PI*3)%TAU-Math.PI;this.driftYaw=clamp(dx*.018,-1.4,1.4);this.driftPitch=clamp(dy*.012,-1,1);if(Math.hypot(e.clientX-p.startX,e.clientY-p.startY)>7)p.moved=true;}
        p.x=e.clientX;p.y=e.clientY;this.dirty=true;
      });
      const release=e=>{const p=this.drag.get(e.pointerId);if(!p)return;this.drag.delete(e.pointerId);if(!p.moved&&e.type==="pointerup")this.pick(e.clientX,e.clientY);};
      c.addEventListener("pointerup",release);c.addEventListener("pointercancel",release);
      c.addEventListener("wheel",e=>{e.preventDefault();this.zoom(Math.exp(clamp(e.deltaY,-250,250)*.0012));},{passive:false});
      c.addEventListener("webglcontextlost",e=>{e.preventDefault();this.active=false;this.options.onFailure?.();});
      window.addEventListener("resize",()=>this.dirty=true);
    }
    setActive(active){this.active=active;this.last=0;this.dirty=true;}
    setCountry(country){this.country=country;this.dirty=true;}
    refresh(){this.dirty=true;}
    zoom(factor){this.distance=clamp(this.distance*factor,1.12,6);this.dirty=true;}
    focus(lat,lon){this.yaw=-lon*RAD;this.pitch=lat*RAD;this.driftYaw=0;this.driftPitch=0;this.dirty=true;}
    project(lat,lon,w,h){const p=vector(lat,lon),cy=Math.cos(this.yaw),sy=Math.sin(this.yaw),cp=Math.cos(this.pitch),sp=Math.sin(this.pitch);
      const x=p[0]*cy+p[2]*sy,z=-p[0]*sy+p[2]*cy,y=p[1]*cp-z*sp,front=p[1]*sp+z*cp;
      if(front<.09)return null;const scale=h/(this.distance-front);
      return {x:w/2+x*scale,y:h/2-y*scale,front};
    }
    pick(x,y){const r=this.canvas.getBoundingClientRect(),px=x-r.left,py=y-r.top;let best=null;
      for(const p of this.hit){const d=Math.hypot(p.x-px,p.y-py);if(d<22&&(!best||d<best.d))best={...p,d};}
      if(best){if(this.country)this.options.onCity?.(best.place.id);else this.options.onCountry?.(best.country);}
    }
    drawMarkers(w,h,ratio){const canvas=this.markers,ctx=canvas.getContext("2d");if(!ctx)return;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);this.hit=[];
      const places=this.options.getPlaces?.()||[],visited=this.options.getVisited?.()||{};
      const marks=this.country?places.filter(p=>p.country===this.country).map(p=>({place:p,coords:coords(p),label:p.city,visited:!!visited[p.id]})):
        [...new Set(places.map(p=>p.country))].map(country=>{const group=places.filter(p=>p.country===country),p=group[0];return {country,coords:centroids[country]||regionCenters[p.region]||[0,0],label:country,visited:group.some(v=>visited[v.id])};});
      for(const mark of marks){const pos=this.project(...mark.coords,w,h);if(!pos||pos.x<8||pos.x>w-8||pos.y<8||pos.y>h-8)continue;
        const radius=mark.visited?5:3.5;ctx.beginPath();ctx.arc(pos.x,pos.y,radius+7,0,TAU);ctx.fillStyle=mark.visited?"#ffba6170":"#82eef253";ctx.fill();ctx.beginPath();ctx.arc(pos.x,pos.y,radius,0,TAU);ctx.fillStyle=mark.visited?"#ffcf75":"#baf5f0";ctx.fill();ctx.strokeStyle="#f7f1d9";ctx.lineWidth=1;ctx.stroke();
        if(this.country||mark.visited){ctx.font="600 11px system-ui";ctx.textAlign=pos.x>w*.65?"right":"left";ctx.fillStyle="#fff2dc";ctx.shadowColor="#051324";ctx.shadowBlur=8;ctx.fillText(mark.label,pos.x+(pos.x>w*.65?-13:13),pos.y-9);ctx.shadowBlur=0;}
        this.hit.push({...mark,...pos});
      }
    }
    frame(now){const dt=Math.min(.05,(now-(this.last||now))/1000);this.last=now;
      if(this.active){if(!this.drag.size&&!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches){this.yaw+=dt*(.012+this.driftYaw);this.pitch+=dt*this.driftPitch;const damping=Math.exp(-dt*2.8);this.driftYaw*=damping;this.driftPitch*=damping;this.dirty=true;}
        if(this.dirty||now-(this.lastClock||0)>15000){this.draw();this.lastClock=now;this.dirty=false;}}
      requestAnimationFrame(t=>this.frame(t));
    }
    draw(){const gl=this.gl,r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;const ratio=Math.min(window.devicePixelRatio||1,1.5),w=Math.round(r.width*ratio),h=Math.round(r.height*ratio);if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(this.program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.enableVertexAttribArray(this.aPos);gl.enableVertexAttribArray(this.aUv);gl.vertexAttribPointer(this.aPos,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(this.aUv,2,gl.FLOAT,false,20,12);gl.uniform2f(this.uAngles,this.yaw,this.pitch);gl.uniform1f(this.uAspect,w/h);gl.uniform1f(this.uDistance,this.distance);gl.uniform1f(this.uTime,Date.now()/1000);gl.uniform3fv(this.uSun,vector(...solarPosition(new Date())));gl.drawArrays(gl.TRIANGLES,0,this.count);this.drawMarkers(r.width,r.height,ratio);
    }
  }
  window.SunflowerGlobe=SunflowerGlobe;
  window.SunflowerGlobeMath={solarPosition,vector,coords,centroids};
})();
