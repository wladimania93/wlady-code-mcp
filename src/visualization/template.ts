export function getVisualizationHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>WLADY_CODE — Graph UI</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
<style>.token.comment,.token.prolog,.token.doctype,.token.cdata{color:#5a7a8a}</style>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{background:#06090f;overflow:hidden;font-family:ui-monospace,'Cascadia Code',Consolas,monospace}
#c{position:absolute;top:0;left:0;cursor:grab}
#c:active{cursor:grabbing}
#panel{
  position:fixed;left:0;top:0;bottom:0;width:240px;
  background:rgba(7,11,22,0.92);
  border-right:1px solid rgba(50,70,110,0.20);
  display:flex;flex-direction:column;
  color:#7a8fa8;font-size:11px;
  backdrop-filter:blur(10px);
  z-index:5
}
#ph{
  display:flex;align-items:center;gap:9px;
  padding:0 16px;height:48px;flex-shrink:0;
  border-bottom:1px solid rgba(50,70,110,0.18)
}
.phd{width:7px;height:7px;border-radius:50%;background:#4a9eff;flex-shrink:0}
.pht{font-size:13px;font-weight:600;color:#c4d4ec;letter-spacing:.04em}
#pb{
  padding:14px;
  display:flex;flex-direction:column;gap:14px;
  flex:1;overflow-y:auto
}
#pb::-webkit-scrollbar{width:3px}
#pb::-webkit-scrollbar-thumb{background:rgba(50,70,110,0.3);border-radius:2px}
select{
  width:100%;background:#0a0f1c;color:#b8ccdf;
  border:1px solid rgba(50,70,110,0.35);padding:6px 8px;
  font-size:11px;font-family:inherit;outline:none;border-radius:3px
}
select:focus{border-color:rgba(74,158,255,0.55)}
.psub{color:#2e3f58;font-size:10px;min-height:14px;padding-top:3px}
.psec{display:flex;flex-direction:column;gap:6px}
.plabel{
  font-size:9px;letter-spacing:.14em;color:#243144;
  text-transform:uppercase;padding-bottom:2px
}
#legend-list{display:flex;flex-direction:column;gap:2px}
.li{
  display:flex;align-items:flex-start;gap:8px;
  padding:4px 6px;border-radius:4px;cursor:pointer;
  transition:background .12s;border:1px solid transparent
}
.li:hover{background:rgba(74,158,255,0.06)}
.li.active{
  background:rgba(74,158,255,0.10);
  border-color:rgba(74,158,255,0.22)
}
.ld{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:3px}
.ln{color:#5a6e88;font-size:10px;flex:1;line-height:1.4}
.lc{color:#243144;font-size:9px}
/* ── Community tree & filters ── */
#comm-filters{display:flex;flex-direction:column;gap:5px;margin-bottom:7px}
.csearch-wrap{position:relative}
#comm-search{
  width:100%;background:#0a0f1c;color:#b8ccdf;
  border:1px solid rgba(50,70,110,0.35);padding:5px 8px 5px 24px;
  font-size:10px;font-family:inherit;outline:none;border-radius:3px
}
#comm-search:focus{border-color:rgba(74,158,255,0.45)}
.csearch-ico{
  position:absolute;left:7px;top:50%;transform:translateY(-50%);
  font-size:10px;color:#2e3f58;pointer-events:none
}
.cfilter-row{display:flex;gap:4px}
select.cfs{
  flex:1;background:#0a0f1c;color:#5a6e88;
  border:1px solid rgba(50,70,110,0.28);padding:4px 5px;
  font-size:9px;font-family:inherit;outline:none;border-radius:3px
}
select.cfs:focus{border-color:rgba(74,158,255,0.40)}
.tree-empty{font-size:10px;color:#2e3f58;padding:6px 2px}
.tg{margin-bottom:2px}
.tg-hd{
  display:flex;align-items:center;gap:6px;
  padding:4px 4px;border-radius:4px;cursor:pointer;
  transition:background .12s;user-select:none
}
.tg-hd:hover{background:rgba(74,158,255,0.06)}
.tg-arr{
  font-size:8px;color:#2e3f58;width:10px;flex-shrink:0;
  transition:transform .18s;display:inline-block
}
.tg-arr.open{transform:rotate(90deg)}
.tg-lbl{font-size:10px;font-weight:600;color:#3a5070;flex:1;letter-spacing:.04em}
.tg-cnt{font-size:9px;color:#243144}
.tg-body{padding-left:14px;display:flex;flex-direction:column;gap:1px;overflow:hidden}
.tg-body.closed{display:none}
#stellar-legend{display:flex;flex-direction:column;gap:3px}
.sl{display:flex;align-items:center;gap:7px}
.slc{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.slt{font-size:9px;color:#374860;flex:1}
.sld{font-size:9px;color:#243144}
#hotspot-list{display:flex;flex-direction:column;gap:2px}
.hs{
  display:flex;align-items:center;gap:6px;
  padding:4px 6px;border-radius:4px;cursor:pointer;
  transition:background .12s;border:1px solid transparent
}
.hs:hover{background:rgba(255,160,60,0.07)}
.hs.active{background:rgba(255,160,60,0.12);border-color:rgba(255,160,60,0.25)}
.hsn{font-size:10px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hsc{font-size:9px;padding:1px 5px;background:rgba(255,160,60,.12);color:#ffa060;flex-shrink:0;border-radius:2px}
.hint{
  color:#1d2c3f;font-size:10px;line-height:1.85;
  padding:10px 14px;margin-top:auto;
  border-top:1px solid rgba(50,70,110,0.13)
}
/* ── Code panel ── */
#cpanel{
  position:fixed;right:0;top:0;bottom:0;width:520px;
  background:rgba(5,8,18,0.97);
  border-left:1px solid rgba(74,158,255,0.18);
  display:none;flex-direction:column;
  z-index:20;font-family:ui-monospace,'Cascadia Code',Consolas,monospace
}
#cp-hd{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;border-bottom:1px solid rgba(50,70,110,0.22);
  flex-shrink:0
}
#cp-title{font-size:13px;font-weight:600;color:#c4d4ec;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#cp-lang{font-size:9px;padding:2px 7px;border-radius:10px;background:rgba(74,158,255,0.12);color:#4a9eff;flex-shrink:0}
#cp-vsc{
  font-size:10px;padding:4px 10px;border-radius:3px;
  background:rgba(0,180,120,0.12);color:#00c88a;
  border:1px solid rgba(0,180,120,0.25);text-decoration:none;
  transition:background .12s;flex-shrink:0;white-space:nowrap
}
#cp-vsc:hover{background:rgba(0,180,120,0.22)}
#cp-close{
  font-size:16px;color:#2e3f58;cursor:pointer;flex-shrink:0;
  line-height:1;padding:2px 4px;transition:color .12s
}
#cp-close:hover{color:#c4d4ec}
#cp-meta{
  padding:6px 14px;border-bottom:1px solid rgba(50,70,110,0.14);
  font-size:9px;color:#2e3f58;flex-shrink:0;word-break:break-all
}
#cp-body{flex:1;overflow:auto;padding:14px}
#cp-body::-webkit-scrollbar{width:4px}
#cp-body::-webkit-scrollbar-thumb{background:rgba(50,70,110,0.35);border-radius:2px}
#cp-pre{background:transparent!important;margin:0;padding:0;border:0;border-radius:0}
#cp-code{
  font-size:11.5px!important;line-height:1.65!important;
  font-family:ui-monospace,'Cascadia Code',Consolas,monospace!important;
  white-space:pre;tab-size:2;background:transparent!important
}
#loading{
  position:fixed;top:50%;left:calc(50% + 120px);
  transform:translate(-50%,-50%);
  color:#2e3f58;font-size:12px;pointer-events:none;z-index:4
}
#tt{
  position:fixed;pointer-events:none;display:none;
  background:rgba(5,8,18,0.96);
  border:1px solid rgba(74,158,255,0.22);
  padding:10px 14px;font-size:11px;color:#7a8fa8;
  max-width:270px;z-index:10;border-radius:4px
}
.ttn{font-weight:600;color:#c4d4ec;margin-bottom:4px;font-size:12px;word-break:break-all}
.ttc{font-size:10px;color:#2e3f58;margin-bottom:3px}
.ttf{color:#ffa060;font-size:10px}
.ttp{color:#243144;font-size:9px;margin-top:4px;word-break:break-all}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="loading">Cargando proyectos...</div>
<div id="panel">
  <div id="ph">
    <div class="phd"></div>
    <div class="pht">WLADY_CODE</div>
  </div>
  <div id="pb">
    <div class="psec">
      <div class="plabel">Proyecto</div>
      <select id="project-select"><option value="">— Selecciona —</option></select>
      <div class="psub" id="proj-stats"></div>
    </div>
    <div class="psec">
      <div class="plabel">Comunidades</div>
      <div id="comm-filters">
        <div class="csearch-wrap">
          <span class="csearch-ico">&#9906;</span>
          <input type="text" id="comm-search" placeholder="Buscar comunidad...">
        </div>
        <div class="cfilter-row">
          <select class="cfs" id="comm-sort" title="Ordenar por">
            <option value="id">Orden original</option>
            <option value="name">Nombre A-Z</option>
            <option value="count-desc">Mayor cantidad</option>
            <option value="count-asc">Menor cantidad</option>
          </select>
          <select class="cfs" id="comm-minf" title="Filtrar por tamaño">
            <option value="0">Todos</option>
            <option value="3">&#8805;3 archivos</option>
            <option value="5">&#8805;5 archivos</option>
            <option value="10">&#8805;10 archivos</option>
          </select>
        </div>
      </div>
      <div id="legend-list"></div>
    </div>
    <div class="psec">
      <div class="plabel">Hotspots</div>
      <div id="hotspot-list"></div>
    </div>
    <div class="psec">
      <div class="plabel">Tipo estelar</div>
      <div id="stellar-legend"></div>
    </div>
    <div class="hint">Arrastra → rotar<br>Rueda → zoom<br>Clic → seleccionar nodo<br>Clic comunidad → resaltar<br>Doble clic → reanudar rotación</div>
  </div>
</div>
<div id="cpanel">
  <div id="cp-hd">
    <span id="cp-title"></span>
    <span id="cp-lang"></span>
    <a id="cp-vsc" href="#" target="_blank">&#128196; Abrir en VS Code</a>
    <span id="cp-close" title="Cerrar (Esc)">&#x2715;</span>
  </div>
  <div id="cp-meta" id="cp-path"></div>
  <div id="cp-body"><pre id="cp-pre"><code id="cp-code"></code></pre></div>
</div>
<div id="tt">
  <div class="ttn" id="tt-name"></div>
  <div class="ttc" id="tt-comm"></div>
  <div class="ttf" id="tt-fi"></div>
  <div class="ttp" id="tt-path"></div>
</div>
<script>
var CV=document.getElementById('c'),ctx=CV.getContext('2d');
var PW=240;
var W,H,GW;
function resize(){W=CV.width=window.innerWidth;H=CV.height=window.innerHeight;GW=W-PW;}
window.addEventListener('resize',resize);resize();

/* ── Stellar spectral color system ── */
var STELLAR=[
  {min:50,color:'#55aaff',rgb:[85,170,255]},   // O — Gigante azul eléctrico
  {min:26,color:'#aaccff',rgb:[170,204,255]},  // B — Azul-blanca brillante
  {min:13,color:'#eef2ff',rgb:[238,242,255]},  // A — Blanca pura
  {min:7, color:'#ffe640',rgb:[255,230,64]},   // F — Amarillo intenso
  {min:4, color:'#ffaa18',rgb:[255,170,24]},   // G — Ámbar solar
  {min:2, color:'#ff6010',rgb:[255,96,16]},    // K — Naranja vivo
  {min:0, color:'#ff2e20',rgb:[255,46,32]},    // M — Rojo ardiente
];
var STELLAR_LABELS=[
  'O — Gigante azul','B — Azul-blanca','A — Blanca',
  'F — Amarillo-blanca','G — Amarilla (Sol)','K — Naranja','M — Enana roja'
];
var STELLAR_DESC=['50+','26-50','13-25','7-12','4-6','2-3','0-1'];

function stellarInfo(conns){
  for(var i=0;i<STELLAR.length;i++){if(conns>=STELLAR[i].min)return STELLAR[i];}
  return STELLAR[STELLAR.length-1];
}

/* ── Community palette — vivid, luminous for additive blending ── */
var CP=[
  '#00e8aa','#3399ff','#cc44ff','#22ee66','#ffcc00',
  '#ff7700','#ff1155','#ff44dd','#00ddff','#ffaa00',
  '#9966ff','#00ffcc','#ff5522','#88ff22','#44bbff',
  '#bb66ff','#ff2299','#11ddcc','#ffee11','#7799bb'
];
var CH=CP.map(function(c){
  return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
});

var nodes=[],edges=[],stars=[],commNames={};
var allComms=[]; /* [{id,name,count}] — full community list for filtering */
var commTreeOpen={}; /* prefix -> bool, persists across filter changes */
var currentProjectRoot=''; /* absolute path of loaded project */
var currentProjectId='';   /* id of loaded project */
var rotX=0.28,rotY=0.42,zoom=1.3;
var autoRot=true,isDrag=false,didDrag=false,lastMX=0,lastMY=0;
var hovered=null,selected=null,selectedComm=-1,frame=0,simLeft=0,projMap={};

/* Star field */
for(var _i=0;_i<200;_i++){
  stars.push({
    x:Math.random(),y:Math.random(),
    r:Math.random()*1.0+0.2,
    a:Math.random()*0.22+0.03,
    sc:[Math.random()<0.5?200:220,Math.random()<0.5?220:230,255]
  });
}

function fibSphere(n,r){
  if(n<=1)return[[0,0,0]];
  var pts=[],phi=Math.PI*(Math.sqrt(5)-1);
  for(var i=0;i<n;i++){
    var y=1-(i/(n-1))*2,rad=Math.sqrt(1-y*y),t=phi*i;
    pts.push([rad*Math.cos(t)*r,y*r,rad*Math.sin(t)*r]);
  }
  return pts;
}

function simStep(alpha){
  var i,j,a,b,dx,dy,dz,d2,inv,fx,fy,fz,f,d;
  for(i=0;i<nodes.length;i++){nodes[i].fx=0;nodes[i].fy=0;nodes[i].fz=0;}
  for(i=0;i<nodes.length;i++){
    a=nodes[i];
    for(j=i+1;j<nodes.length;j++){
      b=nodes[j];dx=b.x-a.x;dy=b.y-a.y;dz=b.z-a.z;
      d2=dx*dx+dy*dy+dz*dz+1;
      if(d2>72000)continue;
      inv=3400/(d2*Math.sqrt(d2));
      fx=inv*dx;fy=inv*dy;fz=inv*dz;
      a.fx-=fx;a.fy-=fy;a.fz-=fz;b.fx+=fx;b.fy+=fy;b.fz+=fz;
    }
  }
  for(i=0;i<edges.length;i++){
    a=edges[i].a;b=edges[i].b;
    if(!a||!b)continue;
    dx=b.x-a.x;dy=b.y-a.y;dz=b.z-a.z;
    d=Math.sqrt(dx*dx+dy*dy+dz*dz)+.01;
    f=(d-38)*0.022*alpha/d;
    a.fx+=f*dx;a.fy+=f*dy;a.fz+=f*dz;
    b.fx-=f*dx;b.fy-=f*dy;b.fz-=f*dz;
  }
  for(i=0;i<nodes.length;i++){
    a=nodes[i];var cc=a.cc;
    a.fx+=(cc[0]-a.x)*0.010*alpha;a.fy+=(cc[1]-a.y)*0.010*alpha;a.fz+=(cc[2]-a.z)*0.010*alpha;
    a.fx-=a.x*0.0010;a.fy-=a.y*0.0010;a.fz-=a.z*0.0010;
    a.vx=(a.vx+a.fx)*0.76;a.vy=(a.vy+a.fy)*0.76;a.vz=(a.vz+a.fz)*0.76;
    a.x+=a.vx;a.y+=a.vy;a.z+=a.vz;
  }
}

function getMat(){
  var cx=Math.cos(rotX),sx=Math.sin(rotX),cy=Math.cos(rotY),sy=Math.sin(rotY);
  return[cy,sx*sy,cx*sy,0,cx,-sx,-sy,sx*cy,cx*cy];
}
function project(n,mat){
  var rx=mat[0]*n.x+mat[1]*n.y+mat[2]*n.z;
  var ry=mat[3]*n.x+mat[4]*n.y+mat[5]*n.z;
  var rz=mat[6]*n.x+mat[7]*n.y+mat[8]*n.z;
  var fov=620*zoom,sc=fov/(fov+rz+280);
  return{px:PW+GW/2+rx*sc,py:H/2+ry*sc,pz:rz,s:sc};
}

function render(){
  if(simLeft>0){simStep(0.25);simLeft--;}
  if(autoRot)rotY+=0.0022;
  var mat=getMat();
  projMap={};
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i],p=project(n,mat);
    projMap[n.id]={n:n,px:p.px,py:p.py,pz:p.pz,s:p.s};
  }
  var proj=Object.values(projMap);
  var pulse=Math.sin(frame*0.04)*0.5+0.5;

  /* Background */
  ctx.fillStyle='#06090f';
  ctx.fillRect(0,0,W,H);

  /* Clip to graph area so nothing bleeds behind the panel */
  ctx.save();
  ctx.beginPath();
  ctx.rect(PW,0,GW,H);
  ctx.clip();

  /* Stars */
  ctx.globalCompositeOperation='source-over';
  for(var si=0;si<stars.length;si++){
    var st=stars[si];
    ctx.globalAlpha=st.a;
    ctx.fillStyle='rgba('+st.sc[0]+','+st.sc[1]+','+st.sc[2]+',1)';
    ctx.beginPath();
    ctx.arc(PW+st.x*GW,st.y*H,st.r,0,Math.PI*2);
    ctx.fill();
  }
  ctx.globalAlpha=1;

  /* Active-set */
  var hasSel=selected||selectedComm>=0;
  var activeIds=null;
  if(hasSel){
    activeIds=new Set();
    if(selected){
      activeIds.add(selected.n.id);
      for(var ei2=0;ei2<edges.length;ei2++){
        var ea2=edges[ei2];if(!ea2.a||!ea2.b)continue;
        if(ea2.a.id===selected.n.id)activeIds.add(ea2.b.id);
        if(ea2.b.id===selected.n.id)activeIds.add(ea2.a.id);
      }
    } else {
      for(var ni2=0;ni2<nodes.length;ni2++){
        if(nodes[ni2].community===selectedComm)activeIds.add(nodes[ni2].id);
      }
    }
  }

  /* ── EDGES — Two-pass additive blending: halo + bright core ── */
  ctx.globalCompositeOperation='lighter';

  /* Pre-classify edges to avoid recomputing inside loops */
  var eGlow=[],eCore=[];
  for(var ei=0;ei<edges.length;ei++){
    var ea=edges[ei];
    if(!ea.a||!ea.b)continue;
    var pa=projMap[ea.a.id],pb=projMap[ea.b.id];
    if(!pa||!pb)continue;
    var isAct;
    if(!hasSel){isAct=true;}
    else if(selected){isAct=activeIds.has(ea.a.id)&&activeIds.has(ea.b.id);}
    else{isAct=activeIds.has(ea.a.id)||activeIds.has(ea.b.id);}
    var sameCom=(ea.a.community===ea.b.community);
    var ci=ea.a.community%CH.length;
    var gA,cA; /* glow alpha, core alpha */
    if(!hasSel){
      gA=sameCom?0.10:0.028; cA=sameCom?0.26:0.07;
    } else if(isAct){
      gA=0.30; cA=0.80;
    } else {
      gA=0.006; cA=0.014;
    }
    eGlow.push({pa:pa,pb:pb,ci:ci,a:gA});
    eCore.push({pa:pa,pb:pb,ci:ci,a:cA});
  }

  /* Pass 1 — Wide glow halo (3px, low alpha accumulates into nebula) */
  ctx.lineWidth=3.0;
  for(var gi=0;gi<eGlow.length;gi++){
    var eg=eGlow[gi],rg=CH[eg.ci];
    ctx.strokeStyle='rgba('+rg[0]+','+rg[1]+','+rg[2]+','+eg.a+')';
    ctx.beginPath();
    ctx.moveTo(eg.pa.px,eg.pa.py);
    ctx.lineTo(eg.pb.px,eg.pb.py);
    ctx.stroke();
  }

  /* Pass 2 — Thin bright core line (0.7px, sharp and vivid) */
  ctx.lineWidth=0.70;
  for(var ki=0;ki<eCore.length;ki++){
    var ek=eCore[ki],rk=CH[ek.ci];
    ctx.strokeStyle='rgba('+rk[0]+','+rk[1]+','+rk[2]+','+ek.a+')';
    ctx.beginPath();
    ctx.moveTo(ek.pa.px,ek.pa.py);
    ctx.lineTo(ek.pb.px,ek.pb.py);
    ctx.stroke();
  }

  /* ── NODES — back to front ── */
  proj.sort(function(a,b){return a.pz-b.pz;});

  for(var pi=0;pi<proj.length;pi++){
    var p=proj[pi],n=p.n,px=p.px,py=p.py,s=p.s;
    if(px<PW-40||px>W+40||py<-40||py>H+40)continue;

    var isNodeAct=!hasSel||activeIds.has(n.id);
    var conns=n.fanIn+n.fanOut;
    var baseR=Math.max(2.2,Math.log(conns+1)*3+1.5);
    var r=baseR*Math.max(0.22,s);
    var hot=conns>=13,warm=conns>=4;
    var rgb2=n.rgb;

    if(!isNodeAct){
      /* Dimmed inactive node — normal blend, very transparent */
      ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=0.07;
      ctx.fillStyle=n.color;
      ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      continue;
    }

    /* Glow corona — additive for bloom-like effect */
    ctx.globalCompositeOperation='lighter';
    var glowR=r*(hot?18:warm?10:5.5);
    var grd=ctx.createRadialGradient(px,py,0,px,py,glowR);
    if(hot){
      grd.addColorStop(0,'rgba(255,255,255,0.55)');
      grd.addColorStop(0.09,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.40)');
      grd.addColorStop(0.38,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.09)');
      grd.addColorStop(1,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0)');
    } else if(warm){
      grd.addColorStop(0,'rgba(255,255,255,0.22)');
      grd.addColorStop(0.16,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.32)');
      grd.addColorStop(0.55,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.06)');
      grd.addColorStop(1,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0)');
    } else {
      grd.addColorStop(0,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.28)');
      grd.addColorStop(0.45,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0.05)');
      grd.addColorStop(1,'rgba('+rgb2[0]+','+rgb2[1]+','+rgb2[2]+',0)');
    }
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.arc(px,py,glowR,0,Math.PI*2);ctx.fill();

    /* Core dot — solid, source-over */
    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=hot?'rgba(240,248,255,0.95)':n.color;
    ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();

    /* Specular highlight */
    if(r>3){
      ctx.fillStyle='rgba(255,255,255,0.42)';
      ctx.beginPath();ctx.arc(px-r*.26,py-r*.22,r*.27,0,Math.PI*2);ctx.fill();
    }

    /* Pulsing ring for warm/hot nodes */
    if(warm){
      ctx.globalAlpha=0.17+pulse*0.28;
      ctx.strokeStyle=hot?'rgba(180,210,255,1)':n.color;
      ctx.lineWidth=hot?1.6:0.9;
      ctx.beginPath();ctx.arc(px,py,r+2+pulse*5,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;ctx.lineWidth=0.85;
    }

    /* Label */
    var showLabel=hasSel?(s>0.30):(hot&&s>0.52);
    if(showLabel){
      var fs=Math.min(11,Math.max(8,9*s));
      ctx.font=fs+'px ui-monospace,monospace';
      ctx.fillStyle='rgba(190,215,255,'+Math.min(0.85,0.22+s*0.80)+')';
      ctx.fillText(n.label,px+r+4,py+3.5);
    }

    /* Selection ring */
    if(selected&&n.id===selected.n.id){
      ctx.strokeStyle='rgba(190,215,255,0.92)';
      ctx.lineWidth=1.6;
      ctx.beginPath();ctx.arc(px,py,r+5+pulse*4,0,Math.PI*2);ctx.stroke();
      ctx.lineWidth=0.85;
    }
  }

  /* Hover ring */
  ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=1;
  if(hovered&&(!selected||hovered.n.id!==selected.n.id)){
    var hp=hovered,hConns=hp.n.fanIn+hp.n.fanOut;
    var hR=Math.max(2.2,Math.log(hConns+1)*3+1.5)*Math.max(0.22,hp.s);
    ctx.strokeStyle='rgba(150,185,255,0.60)';
    ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(hp.px,hp.py,hR+5,0,Math.PI*2);ctx.stroke();
  }

  ctx.restore(); /* end clip */

  frame++;
  requestAnimationFrame(render);
}

function updateHover(mx,my){
  if(mx<PW){
    hovered=null;
    document.getElementById('tt').style.display='none';
    return;
  }
  var best=null,bestD=22;
  var vals=Object.values(projMap);
  for(var i=0;i<vals.length;i++){
    var p=vals[i];
    var conns=p.n.fanIn+p.n.fanOut;
    var r=Math.max(2.2,Math.log(conns+1)*3+1.5)*Math.max(0.22,p.s)+8;
    var d=Math.hypot(mx-p.px,my-p.py);
    if(d<r&&d<bestD){bestD=d;best=p;}
  }
  hovered=best;
  var tt=document.getElementById('tt');
  if(best){
    tt.style.display='block';
    tt.style.left=Math.min(best.px+16,W-278)+'px';
    tt.style.top=Math.max(10,best.py-44)+'px';
    document.getElementById('tt-name').textContent=best.n.label;
    var col=CP[best.n.community%CP.length];
    document.getElementById('tt-comm').innerHTML=
      '<span style="color:'+col+'">'+
      (commNames[best.n.community]||'community '+best.n.community)+'</span>';
    document.getElementById('tt-fi').textContent=
      'fan-in: '+best.n.fanIn+' · fan-out: '+best.n.fanOut+' · '+best.n.language;
    document.getElementById('tt-path').textContent=best.n.path;
  } else {
    tt.style.display='none';
  }
}

/* ── Community tree rendering ── */
function commItemEl(c){
  var col=CP[c.id%CP.length];
  var div=document.createElement('div');div.className='li';
  if(selectedComm===c.id)div.classList.add('active');
  div.innerHTML=
    '<div class="ld" style="background:'+col+'"></div>'+
    '<div class="ln">'+c.name+
    '<br><span class="lc">'+c.count+' archivos</span></div>';
  div.addEventListener('click',function(){
    selected=null;
    document.querySelectorAll('.li,.hs').forEach(function(x){x.classList.remove('active');});
    if(selectedComm===c.id){selectedComm=-1;}
    else{selectedComm=c.id;div.classList.add('active');}
  });
  return div;
}

function renderCommList(){
  var search=(document.getElementById('comm-search')||{value:''}).value.toLowerCase();
  var sort=(document.getElementById('comm-sort')||{value:'id'}).value;
  var minF=parseInt((document.getElementById('comm-minf')||{value:'0'}).value)||0;

  /* Filter */
  var filtered=allComms.filter(function(c){
    return c.count>=minF&&(!search||c.name.toLowerCase().indexOf(search)>=0);
  });

  /* Sort */
  if(sort==='name')filtered.sort(function(a,b){return a.name.localeCompare(b.name);});
  else if(sort==='count-desc')filtered.sort(function(a,b){return b.count-a.count;});
  else if(sort==='count-asc')filtered.sort(function(a,b){return a.count-b.count;});
  /* 'id' keeps original order */

  var ll=document.getElementById('legend-list');ll.innerHTML='';

  if(!filtered.length){
    var em=document.createElement('div');em.className='tree-empty';
    em.textContent='Sin resultados';ll.appendChild(em);return;
  }

  /* Group by top-level prefix (split on · or /) */
  var groups={},gOrder=[];
  filtered.forEach(function(c){
    var sep=c.name.indexOf('\xB7')>=0?'\xB7':'/';
    var parts=c.name.split(sep);
    var prefix=parts.length>1?parts[0]:'_';
    if(!groups[prefix]){groups[prefix]=[];gOrder.push(prefix);}
    groups[prefix].push(c);
  });

  gOrder.forEach(function(prefix){
    var items=groups[prefix];
    if(items.length===1){
      /* Single item → render flat, no group wrapper */
      ll.appendChild(commItemEl(items[0]));
      return;
    }
    /* Multi-item group → collapsible tree node */
    if(commTreeOpen[prefix]===undefined)commTreeOpen[prefix]=true;
    var grp=document.createElement('div');grp.className='tg';
    var hd=document.createElement('div');hd.className='tg-hd';
    var arr=document.createElement('span');arr.className='tg-arr'+(commTreeOpen[prefix]?' open':'');
    arr.textContent='▶';
    var lbl=document.createElement('span');lbl.className='tg-lbl';lbl.textContent=prefix;
    var cnt=document.createElement('span');cnt.className='tg-cnt';
    cnt.textContent=items.length+' grupos';
    hd.appendChild(arr);hd.appendChild(lbl);hd.appendChild(cnt);
    var body=document.createElement('div');
    body.className='tg-body'+(commTreeOpen[prefix]?'':' closed');
    items.forEach(function(c){body.appendChild(commItemEl(c));});
    hd.addEventListener('click',function(){
      commTreeOpen[prefix]=!commTreeOpen[prefix];
      arr.className='tg-arr'+(commTreeOpen[prefix]?' open':'');
      body.className='tg-body'+(commTreeOpen[prefix]?'':' closed');
    });
    grp.appendChild(hd);grp.appendChild(body);
    ll.appendChild(grp);
  });
}

async function loadGraph(projectId,projectRoot){
  currentProjectId=projectId||'';
  currentProjectRoot=projectRoot||'';
  document.getElementById('loading').textContent='Cargando grafo...';
  document.getElementById('loading').style.display='block';
  nodes=[];edges=[];projMap={};hovered=null;selected=null;selectedComm=-1;closeCodePanel();
  try{
    var res=await fetch('/api/graph?projectId='+projectId);
    var data=await res.json();
    if(data.error)throw new Error(data.error);

    var maxComm=0;
    data.nodes.forEach(function(n){if(n.community>maxComm)maxComm=n.community;});
    var centers=fibSphere(maxComm+1,155);

    commNames={};var commDirs={};
    data.nodes.forEach(function(n){
      commNames[n.community]=n.dir;
      commDirs[n.community]=(commDirs[n.community]||0)+1;
    });

    var nById={};
    nodes=data.nodes.map(function(n){
      var cc=centers[n.community%centers.length];
      var sp=12+Math.random()*10;
      var t=Math.PI*2*Math.random(),p2=Math.acos(2*Math.random()-1);
      var conns=n.fanIn+n.fanOut;
      var si=stellarInfo(conns);
      var nd={
        id:n.id,label:n.label,path:n.path,language:n.language,
        fanIn:n.fanIn,fanOut:n.fanOut,community:n.community,dir:n.dir,
        color:si.color,rgb:si.rgb,
        x:cc[0]+sp*Math.sin(p2)*Math.cos(t),
        y:cc[1]+sp*Math.sin(p2)*Math.sin(t),
        z:cc[2]+sp*Math.cos(p2),
        vx:0,vy:0,vz:0,fx:0,fy:0,fz:0,cc:cc
      };
      nById[n.id]=nd;return nd;
    });

    edges=data.edges.map(function(e){
      return{a:nById[e.from],b:nById[e.to]};
    }).filter(function(e){return e.a&&e.b;});

    for(var i=0;i<270;i++)simStep(Math.max(0.2,1-i/310));
    simLeft=90;

    /* Communities — build allComms and render tree */
    allComms=Object.keys(commDirs).map(Number)
      .sort(function(a,b){return a-b;})
      .map(function(c){return{id:c,name:commNames[c],count:commDirs[c]};});
    renderCommList();

    /* Wire up live filters */
    var csearch=document.getElementById('comm-search');
    var csort=document.getElementById('comm-sort');
    var cminf=document.getElementById('comm-minf');
    if(csearch){csearch.value='';csearch.oninput=renderCommList;}
    if(csort){csort.onchange=renderCommList;}
    if(cminf){cminf.onchange=renderCommList;}

    /* Hotspots */
    var hl=document.getElementById('hotspot-list');hl.innerHTML='';
    data.nodes.filter(function(n){return n.fanIn>0;})
      .sort(function(a,b){return b.fanIn-a.fanIn;}).slice(0,8)
      .forEach(function(n){
        var si=stellarInfo(n.fanIn+n.fanOut);
        var div=document.createElement('div');div.className='hs';
        div.innerHTML=
          '<div class="hsn" style="color:'+si.color+'">'+n.label+'</div>'+
          '<div class="hsc">x'+n.fanIn+'</div>';
        (function(nodeId,el){
          el.addEventListener('click',function(){
            var proj=projMap[nodeId];
            if(!proj)return;
            document.querySelectorAll('.li').forEach(function(x){x.classList.remove('active');});
            document.querySelectorAll('.hs').forEach(function(x){x.classList.remove('active');});
            if(selected&&selected.n.id===nodeId){
              clearSelection();
            } else {
              selected=proj;selectedComm=-1;
              el.classList.add('active');
            }
          });
        })(n.id,div);
        hl.appendChild(div);
      });

    /* Stellar legend */
    var sl=document.getElementById('stellar-legend');sl.innerHTML='';
    STELLAR.forEach(function(s2,idx){
      var div=document.createElement('div');div.className='sl';
      div.innerHTML=
        '<div class="slc" style="background:'+s2.color+'"></div>'+
        '<div class="slt">'+STELLAR_LABELS[idx]+'</div>'+
        '<div class="sld">'+STELLAR_DESC[idx]+'</div>';
      sl.appendChild(div);
    });

    document.getElementById('loading').style.display='none';
  }catch(err){
    document.getElementById('loading').textContent='Error: '+err.message;
  }
}

async function init(){
  try{
    var res=await fetch('/api/projects');
    var data=await res.json();
    if(!res.ok||data.error)throw new Error(data.error||'Error del servidor');
    var projects=data;
    var sel=document.getElementById('project-select');
    projects.forEach(function(p){
      var opt=document.createElement('option');
      opt.value=p.id;
      opt.textContent=p.name+' ('+p.fileCount+' archivos)';
      sel.appendChild(opt);
    });
    if(projects.length===1){
      sel.value=projects[0].id;
      document.getElementById('proj-stats').textContent=
        projects[0].fileCount+' archivos · '+projects[0].symbolCount+' símbolos';
      await loadGraph(projects[0].id,projects[0].path);
    } else {
      document.getElementById('loading').style.display='none';
    }
    sel.addEventListener('change',async function(){
      if(!sel.value)return;
      var p=projects.find(function(x){return x.id===sel.value;});
      if(p)document.getElementById('proj-stats').textContent=
        p.fileCount+' archivos · '+p.symbolCount+' símbolos';
      await loadGraph(sel.value,p?p.path:'');
    });
  }catch(err){
    document.getElementById('loading').textContent='No se pudo conectar al servidor: '+err.message;
  }
}

function clearSelection(){
  selected=null;selectedComm=-1;
  document.querySelectorAll('.li,.hs').forEach(function(el){el.classList.remove('active');});
}
function findNodeAt(mx,my){
  var best=null,bestD=24;
  var vals=Object.values(projMap);
  for(var i=0;i<vals.length;i++){
    var p=vals[i];
    var conns=p.n.fanIn+p.n.fanOut;
    var r=Math.max(2.2,Math.log(conns+1)*3+1.5)*Math.max(0.22,p.s)+9;
    var d=Math.hypot(mx-p.px,my-p.py);
    if(d<r&&d<bestD){bestD=d;best=p;}
  }
  return best;
}

CV.addEventListener('click',function(e){
  if(didDrag)return;
  if(e.clientX<PW)return;
  var hit=findNodeAt(e.clientX,e.clientY);
  if(hit){
    if(selected&&selected.n.id===hit.n.id){clearSelection();}
    else{selected=hit;selectedComm=-1;document.querySelectorAll('.li').forEach(function(el){el.classList.remove('active');});}
  } else {clearSelection();}
});
CV.addEventListener('mousedown',function(e){
  if(e.clientX<PW)return;
  isDrag=true;didDrag=false;autoRot=false;lastMX=e.clientX;lastMY=e.clientY;
});
document.addEventListener('mouseup',function(){isDrag=false;});
CV.addEventListener('mousemove',function(e){
  if(isDrag){
    var dx=e.clientX-lastMX,dy=e.clientY-lastMY;
    if(Math.abs(dx)>3||Math.abs(dy)>3)didDrag=true;
    rotY+=dx*0.006;rotX+=dy*0.006;
    rotX=Math.max(-1.4,Math.min(1.4,rotX));
    lastMX=e.clientX;lastMY=e.clientY;
  }
  updateHover(e.clientX,e.clientY);
});
CV.addEventListener('wheel',function(e){
  zoom*=e.deltaY>0?0.88:1.136;
  zoom=Math.max(0.04,Math.min(30,zoom));
  e.preventDefault();
},{passive:false});
CV.addEventListener('dblclick',function(e){
  if(e.clientX<PW)return;
  var hit=findNodeAt(e.clientX,e.clientY);
  if(hit){openCodePanel(hit.n);}
  else{autoRot=true;}
});

/* ── Code panel ── */
var cpanel=document.getElementById('cpanel');
document.getElementById('cp-close').addEventListener('click',closeCodePanel);
document.addEventListener('keydown',function(e){if(e.key==='Escape')closeCodePanel();});

function closeCodePanel(){cpanel.style.display='none';}

var LANG_MAP={
  typescript:'typescript',javascript:'javascript',
  java:'java',kotlin:'kotlin',
  python:'python',go:'go',rust:'rust',
  css:'css',scss:'scss',html:'markup',xml:'markup',
  json:'json',yaml:'yaml',
  sql:'sql',shell:'bash',bash:'bash',
  cpp:'cpp',c:'c',csharp:'csharp',php:'php',ruby:'ruby',
  swift:'swift',dart:'dart',
  unknown:'plain'
};

function prismLang(lang){return LANG_MAP[(lang||'').toLowerCase()]||'plain';}

async function openCodePanel(n){
  cpanel.style.display='flex';
  document.getElementById('cp-title').textContent=n.label;
  document.getElementById('cp-lang').textContent=n.language;
  document.getElementById('cp-meta').textContent=n.path;
  var codeEl=document.getElementById('cp-code');
  codeEl.textContent='Cargando...';
  codeEl.className='';

  try{
    /* Let the server resolve the absolute path — avoids JS backslash escaping issues */
    var res=await fetch('/api/file?projectId='+encodeURIComponent(currentProjectId)+'&relPath='+encodeURIComponent(n.path));
    var data=await res.json();
    if(data.error)throw new Error(data.error);

    /* VS Code link — server returns absPath; replace backslash (char 92) with / */
    var bs=String.fromCharCode(92);
    var vsPath=data.absPath.split(bs).join('/');
    document.getElementById('cp-vsc').href='vscode://file/'+vsPath;

    var lang=prismLang(n.language);
    codeEl.textContent=data.content;
    codeEl.className='language-'+lang;
    if(typeof Prism!=='undefined')Prism.highlightElement(codeEl);
  }catch(err){
    codeEl.textContent='Error: '+err.message;
    codeEl.className='';
  }
}

init();render();
</script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-kotlin.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-go.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-rust.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-scss.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-dart.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-swift.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-ruby.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-php.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-cpp.min.js"></script>
</body>
</html>`;
}
