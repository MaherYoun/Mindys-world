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
    Turkey:[39,35],Ukraine:[49,31],Azerbaijan:[40.3,47.6],Georgia:[42,43.5],Armenia:[40.2,44.5],
    Indonesia:[-2.5,118],Brunei:[4.5,114.7],Singapore:[1.3,103.8],Malaysia:[4,102],Thailand:[15,101],Myanmar:[21,96],Cambodia:[12.5,105],Vietnam:[16,107.5],Laos:[18,103.7],Philippines:[13,122],
    Taiwan:[23.7,121],"Hong Kong":[22.3,114.2],China:[35,104],
    Kazakhstan:[48,67],Kyrgyzstan:[41.2,74.7],Tajikistan:[38.8,71],Uzbekistan:[41.4,64.6],Turkmenistan:[39,59]
  };
  const regionCenters={Africa:[-4,24],"The Americas":[-9,-70],Europe:[49,15],Caucasus:[41,43],"Southeast Asia":[9,108],"East Asia":[33,111],"Silk Road":[42,68]};
  const cityCoords={"Nairobi":[-1.29,36.82],"Uganda":[0.35,32.58],"Rwanda":[-1.95,30.06],"Tanzania":[-3.37,36.68],"Zanzibar":[-6.16,39.19],"Malawi":[-13.96,33.79],"Zambia":[-17.85,25.85],"Zimbabwe":[-17.93,25.84],"Botswana":[-19.98,23.42],"Namibia":[-22.56,17.08],"Cape Town":[-33.92,18.42],"Mexico City":[19.43,-99.13],"Oaxaca":[17.07,-96.73],"Playa del Carmen":[20.63,-87.08],"Belize":[17.5,-88.2],"Antigua":[14.56,-90.73],"Lake Atitlán":[14.69,-91.2],"Tikal":[17.22,-89.62],"Santa Ana":[13.99,-89.56],"San Salvador":[13.69,-89.22],"Copán":[14.84,-89.14],"Nicaragua":[11.93,-85.96],"San José":[9.93,-84.08],"Puerto Viejo":[9.66,-82.75],"Bocas del Toro":[9.34,-82.24],"Panama City":[8.98,-79.52],"Cartagena":[10.39,-75.48],"Medellín":[6.24,-75.58],"Bogotá":[4.71,-74.07],"Manaus":[-3.12,-60.02],"Salvador":[-12.97,-38.5],"São Paulo":[-23.55,-46.63],"Iguaçu Falls":[-25.69,-54.44],"Rio de Janeiro":[-22.91,-43.2],"Ciudad del Este":[-25.51,-54.61],"Montevideo":[-34.9,-56.16],"Colonia del Sacramento":[-34.47,-57.84],"Buenos Aires":[-34.6,-58.38],"Santiago":[-33.45,-70.67],"Valparaíso":[-33.05,-71.62],"San Pedro de Atacama":[-22.91,-68.2],"Patagonia":[-50.94,-73.41],"Uyuni":[-20.46,-66.83],"La Paz":[-16.5,-68.15],"Cusco":[-13.53,-71.97],"Arequipa":[-16.41,-71.54],"Huacachina":[-14.09,-75.76],"Paracas":[-13.83,-76.25],"Lima":[-12.05,-77.04],"Stockholm":[59.33,18.06],"Helsinki":[60.17,24.94],"Tallinn":[59.44,24.75],"Riga":[56.95,24.11],"Vilnius":[54.69,25.28],"Trakai":[54.64,24.93],"Warsaw":[52.23,21.01],"Kraków":[50.06,19.94],"Prague":[50.08,14.43],"Bratislava":[48.15,17.11],"Poprad":[49.06,20.3],"Košice":[48.72,21.26],"Lviv":[49.84,24.03],"Kyiv":[50.45,30.52],"Chișinău":[47.01,28.86],"Bucharest":[44.43,26.1],"Sibiu":[45.79,24.15],"Sighișoara":[46.22,24.79],"Cluj-Napoca":[46.77,23.6],"Budapest":[47.5,19.04],"Pécs":[46.07,18.23],"Ljubljana":[46.06,14.51],"Bled":[46.37,14.11],"Lake Bohinj":[46.28,13.89],"Soča Valley":[46.18,13.73],"Piran":[45.53,13.57],"Zagreb":[45.81,15.98],"Split":[43.51,16.44],"Dubrovnik":[42.65,18.09],"Korčula":[42.96,17.14],"Mostar":[43.34,17.81],"Sarajevo":[43.86,18.41],"Kotor":[42.42,18.77],"Budva":[42.29,18.84],"Belgrade":[44.79,20.45],"Pristina":[42.66,21.17],"Skopje":[41.99,21.43],"Tirana":[41.33,19.82],"Athens":[37.98,23.73],"Santorini":[36.39,25.46],"Crete":[35.34,25.14],"Larnaca":[34.92,33.62],"Nicosia":[35.19,33.38],"Paphos":[34.77,32.42],"Sofia":[42.7,23.32],"Plovdiv":[42.14,24.75],"Istanbul":[41.01,28.98],"Izmir":[38.42,27.14],"Selçuk":[37.95,27.37],"Pamukkale":[37.92,29.12],"Antalya":[36.9,30.71],"Cappadocia":[38.64,34.83],"Baku":[40.41,49.87],"Sheki":[41.19,47.17],"Tbilisi":[41.72,44.78],"Kazbegi":[42.66,44.64],"Yerevan":[40.18,44.5],"Dilijan":[40.74,44.86],"Tatev":[39.38,46.25],"Jakarta":[-6.2,106.85],"Yogyakarta":[-7.8,110.36],"Malang":[-7.98,112.63],"Uluwatu":[-8.83,115.09],"Ubud":[-8.51,115.26],"Munduk":[-8.27,115.07],"Bandar Seri Begawan":[4.9,114.94],"Singapore":[1.29,103.85],"Kuala Lumpur":[3.14,101.69],"Cameron Highlands":[4.47,101.38],"Penang":[5.41,100.33],"Bangkok":[13.76,100.5],"Chiang Mai":[18.79,98.98],"Yangon":[16.87,96.2],"Mandalay":[21.96,96.09],"Siem Reap":[13.36,103.86],"Phnom Penh":[11.56,104.93],"Ho Chi Minh City":[10.82,106.63],"Hoi An":[15.88,108.33],"Da Nang":[16.05,108.2],"Hanoi":[21.03,105.85],"Vientiane":[17.97,102.63],"Vang Vieng":[18.92,102.45],"Luang Prabang":[19.89,102.13],"Boracay":[11.97,121.92],"Palawan":[10.17,118.98],"Cebu":[10.32,123.89],"Manila":[14.6,120.98],"Taipei":[25.03,121.56],"Jiufen":[25.11,121.84],"Hualien":[23.99,121.6],"Kaohsiung":[22.63,120.3],"Tainan":[22.99,120.21],"Alishan":[23.51,120.8],"Sun Moon Lake":[23.86,120.92],"Hong Kong":[22.32,114.17],"Shenzhen":[22.54,114.06],"Guangzhou":[23.13,113.26],"Beijing":[39.9,116.4],"Datong":[40.08,113.3],"Pingyao":[37.2,112.18],"Shanghai":[31.23,121.47],"Suzhou":[31.3,120.59],"Hangzhou":[30.27,120.16],"Huangshan":[30.13,118.17],"Guilin":[25.27,110.29],"Yangshuo":[24.78,110.49],"Chengdu":[30.57,104.07],"Leshan":[29.55,103.77],"Lijiang":[26.86,100.23],"Dali":[25.61,100.27],"Kunming":[25.04,102.71],"Xi'an":[34.34,108.94],"Xining":[36.62,101.78],"Turpan":[42.95,89.19],"Ürümqi":[43.83,87.62],"Kashgar":[39.47,75.99],"Almaty":[43.24,76.89],"Astana":[51.17,71.45],"Bishkek":[42.87,74.59],"Osh":[40.51,72.8],"Issyk-Kul":[42.49,78.4],"Khorog":[37.49,71.55],"Dushanbe":[38.56,68.79],"Samarkand":[39.65,66.97],"Bukhara":[39.77,64.42],"Khiva":[41.38,60.36],"Tashkent":[41.3,69.24],"Ashgabat":[37.96,58.33],"Darvaza":[40.25,58.44]};
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
