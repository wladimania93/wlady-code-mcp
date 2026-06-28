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
#proj-wrap{
  padding:8px 12px 6px;flex-shrink:0;
  border-bottom:1px solid rgba(50,70,110,0.15)
}
select{
  width:100%;background:#0a0f1c;color:#b8ccdf;
  border:1px solid rgba(50,70,110,0.35);padding:6px 8px;
  font-size:11px;font-family:inherit;outline:none;border-radius:3px
}
select:focus{border-color:rgba(74,158,255,0.55)}
.psub{color:#2e3f58;font-size:10px;min-height:14px;padding-top:3px}
.psec{display:flex;flex-direction:column;gap:6px;flex-shrink:0}
.plabel{
  font-size:9px;letter-spacing:.14em;color:#243144;
  text-transform:uppercase;padding-bottom:2px
}
/* ── Tab bar ── */
#tab-bar{
  display:flex;border-bottom:1px solid rgba(50,70,110,0.20);
  flex-shrink:0
}
.tab-btn{
  flex:1;background:none;border:none;
  border-bottom:2px solid transparent;
  color:#2e3f58;font-size:10px;font-family:inherit;
  padding:7px 4px;cursor:pointer;
  transition:color .12s,border-color .12s;letter-spacing:.04em
}
.tab-btn:hover{color:#5a7a9a}
.tab-btn.active{color:#4a9eff;border-bottom-color:#4a9eff}
/* ── File tree tab ── */
#tab-files{
  display:flex;flex-direction:column;flex:1;overflow:hidden
}
.ft-search-wrap{
  padding:7px 12px 4px;flex-shrink:0;position:relative
}
.ft-search-ico{
  position:absolute;left:19px;top:50%;transform:translateY(-50%);
  font-size:10px;color:#2e3f58;pointer-events:none
}
#ft-search{
  width:100%;background:#0a0f1c;color:#b8ccdf;
  border:1px solid rgba(50,70,110,0.35);
  padding:5px 8px 5px 24px;
  font-size:10px;font-family:inherit;outline:none;border-radius:3px
}
#ft-search:focus{border-color:rgba(74,158,255,0.45)}
#file-tree{
  flex:1;overflow-y:auto;padding:0 0 4px
}
#file-tree::-webkit-scrollbar{width:3px}
#file-tree::-webkit-scrollbar-thumb{background:rgba(50,70,110,0.3);border-radius:2px}
.ft-item{
  display:flex;align-items:center;gap:5px;
  width:100%;background:none;border:none;
  color:#3d5570;font-size:10px;font-family:inherit;
  padding:2.5px 8px;cursor:pointer;text-align:left;
  transition:background .10s,color .10s;
  white-space:nowrap;overflow:hidden
}
.ft-item:hover{background:rgba(74,158,255,0.06);color:#7a9ab8}
.ft-item.ft-sel{background:rgba(74,158,255,0.10);color:#c4d4ec}
.ft-item.ft-dir{color:#2d4055}
.ft-item.ft-dir:hover{color:#4a6a88}
.ft-arr{width:10px;flex-shrink:0;font-size:8px;color:#253444}
.ft-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0}
.ft-name{overflow:hidden;text-overflow:ellipsis;flex:1}
/* ── Symbol section ── */
#sym-section{
  border-top:1px solid rgba(50,70,110,0.20);
  padding:6px 0 4px;flex-shrink:0;
  display:none;flex-direction:column;max-height:42%
}
#sym-hd{
  display:flex;align-items:center;justify-content:space-between;
  padding:0 12px 4px;cursor:pointer;flex-shrink:0
}
#sym-fname{
  font-size:9px;letter-spacing:.10em;
  color:#2e4060;text-transform:uppercase;
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1
}
#sym-toggle{font-size:9px;color:#1d2c3f;flex-shrink:0;padding-left:4px}
#sym-list{
  display:flex;flex-direction:column;overflow-y:auto;
  gap:1px;padding:0 6px
}
#sym-list::-webkit-scrollbar{width:3px}
#sym-list::-webkit-scrollbar-thumb{background:rgba(50,70,110,0.3);border-radius:2px}
.sym-item{
  display:flex;align-items:center;gap:5px;
  background:none;border:none;width:100%;
  padding:3px 6px;font-size:10px;font-family:inherit;
  cursor:pointer;text-align:left;
  border-radius:3px;transition:background .10s;overflow:hidden
}
.sym-item:hover{background:rgba(74,158,255,0.08)}
.sym-icon{font-size:9px;font-weight:700;flex-shrink:0;width:12px;text-align:center}
.sym-name{color:#5a7a95;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sym-line{color:#1d2c3f;font-size:9px;flex-shrink:0}
/* ── Filters tab ── */
#tab-filters{
  display:none;flex-direction:column;flex:1;
  overflow-y:auto;padding:10px 12px;gap:14px
}
#tab-filters::-webkit-scrollbar{width:3px}
#tab-filters::-webkit-scrollbar-thumb{background:rgba(50,70,110,0.3);border-radius:2px}
.lang-chips{display:flex;flex-wrap:wrap;gap:4px}
.lang-chip{
  display:inline-flex;align-items:center;gap:3px;
  background:rgba(50,70,110,0.15);
  border:1px solid rgba(50,70,110,0.30);
  border-radius:3px;color:#4a6888;
  font-size:9px;font-family:inherit;
  padding:3px 7px;cursor:pointer;
  transition:opacity .12s,border-color .12s
}
.lang-chip:hover{border-color:rgba(74,158,255,0.40)}
.lang-chip.off{opacity:0.28}
.depth-btns{display:flex;gap:4px;flex-wrap:wrap}
.depth-btn{
  background:rgba(50,70,110,0.12);
  border:1px solid rgba(50,70,110,0.28);
  border-radius:3px;color:#2e4060;
  font-size:9px;font-family:inherit;
  padding:4px 9px;cursor:pointer;
  transition:background .12s,border-color .12s,color .12s
}
.depth-btn:hover{background:rgba(74,158,255,0.10);color:#5a7a9a}
.depth-btn.active{background:rgba(74,158,255,0.14);border-color:rgba(74,158,255,0.40);color:#4a9eff}
/* ── Modules tab ── */
#tab-modules{
  display:none;flex-direction:column;flex:1;
  overflow-y:auto;padding:10px 12px;gap:12px
}
#tab-modules::-webkit-scrollbar{width:3px}
#tab-modules::-webkit-scrollbar-thumb{background:rgba(50,70,110,0.3);border-radius:2px}
/* Community list styles (keep from original) */
#legend-list{display:flex;flex-direction:column;gap:2px}
.li{
  display:flex;align-items:flex-start;gap:8px;
  padding:4px 6px;border-radius:4px;cursor:pointer;
  transition:background .12s;border:1px solid transparent
}
.li:hover{background:rgba(74,158,255,0.06)}
.li.active{background:rgba(74,158,255,0.10);border-color:rgba(74,158,255,0.22)}
.ld{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:3px}
.ln{color:#4a6080;font-size:10px;flex:1;line-height:1.4}
.lc{color:#1d2c3f;font-size:9px}
#comm-filters{display:flex;flex-direction:column;gap:5px;margin-bottom:5px}
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
  flex:1;background:#0a0f1c;color:#4a6080;
  border:1px solid rgba(50,70,110,0.28);padding:4px 5px;
  font-size:9px;font-family:inherit;outline:none;border-radius:3px
}
select.cfs:focus{border-color:rgba(74,158,255,0.40)}
.tree-empty{font-size:10px;color:#2e3f58;padding:4px 2px}
.tg{margin-bottom:2px}
.tg-hd{
  display:flex;align-items:center;gap:6px;
  padding:4px 4px;border-radius:4px;cursor:pointer;
  transition:background .12s;user-select:none
}
.tg-hd:hover{background:rgba(74,158,255,0.06)}
.tg-arr{font-size:8px;color:#2e3f58;width:10px;flex-shrink:0;transition:transform .18s;display:inline-block}
.tg-arr.open{transform:rotate(90deg)}
.tg-lbl{font-size:10px;font-weight:600;color:#2e4560;flex:1;letter-spacing:.04em}
.tg-cnt{font-size:9px;color:#1d2c3f}
.tg-body{padding-left:14px;display:flex;flex-direction:column;gap:1px;overflow:hidden}
.tg-body.closed{display:none}
/* Hotspots */
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
/* Entry points */
#entry-list{display:flex;flex-direction:column;gap:2px}
.ep-item{
  display:flex;align-items:center;gap:6px;
  background:none;border:none;width:100%;
  padding:3px 4px;font-size:10px;font-family:inherit;
  cursor:pointer;text-align:left;
  border-radius:3px;transition:background .10s;overflow:hidden
}
.ep-item:hover{background:rgba(0,180,120,0.07)}
.ep-icon{font-size:9px;font-weight:700;flex-shrink:0;width:12px;text-align:center}
.ep-name{color:#2a9e70;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ep-file{color:#1d2c3f;font-size:9px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;max-width:90px}
/* Stellar legend */
#stellar-legend{display:flex;flex-direction:column;gap:3px}
.sl{display:flex;align-items:center;gap:7px}
.slc{width:6px;height:6px;border-radius:50%;flex-shrink:0}
.slt{font-size:9px;color:#2e4050;flex:1}
.sld{font-size:9px;color:#1d2c3f}
.hint{
  color:#1d2c3f;font-size:10px;line-height:1.85;
  padding:8px 0;margin-top:auto;
  border-top:1px solid rgba(50,70,110,0.13)
}
/* ── Status bar ── */
#statusbar{
  position:fixed;left:0;right:0;bottom:0;height:24px;
  background:rgba(5,8,18,0.90);
  border-top:1px solid rgba(50,70,110,0.18);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 14px;font-size:9.5px;color:#2e3f58;
  z-index:8;backdrop-filter:blur(6px);pointer-events:none
}
#sb-left{color:#2e4a70;letter-spacing:.06em}
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
  padding:5px 14px;border-bottom:1px solid rgba(50,70,110,0.14);
  font-size:9px;color:#2e3f58;flex-shrink:0;word-break:break-all
}
#cp-body{flex:1;overflow:auto}
#cp-body::-webkit-scrollbar{width:4px}
#cp-body::-webkit-scrollbar-thumb{background:rgba(50,70,110,0.35);border-radius:2px}
#cp-lines{padding:10px 0;min-width:max-content}
.cp-line{
  display:flex;align-items:baseline;min-height:1em;
  line-height:1.65;padding:0 14px 0 0;
  font-size:11.5px;
  font-family:ui-monospace,'Cascadia Code',Consolas,monospace;
  white-space:pre
}
.cp-line.cp-hl{background:rgba(0,200,255,0.07);border-left:2px solid rgba(0,200,255,0.45)}
.cp-line:not(.cp-hl){border-left:2px solid transparent}
.cp-ln{
  width:44px;min-width:44px;color:#1a2a38;
  text-align:right;padding-right:14px;
  user-select:none;font-size:10px;flex-shrink:0
}
.cp-line.cp-hl .cp-ln{color:rgba(0,200,255,0.35)}
.cp-lc{flex:1;tab-size:2}
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
.ttp{color:#1d2c3f;font-size:9px;margin-top:4px;word-break:break-all}
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
  <div id="proj-wrap">
    <select id="project-select"><option value="">&#8212; Selecciona proyecto &#8212;</option></select>
    <div class="psub" id="proj-stats"></div>
  </div>
  <div id="tab-bar">
    <button id="btn-files" class="tab-btn active">Archivos</button>
    <button id="btn-filters" class="tab-btn">Filtros</button>
    <button id="btn-modules" class="tab-btn">M&#243;dulos</button>
  </div>
  <!-- Tab: Archivos -->
  <div id="tab-files">
    <div class="ft-search-wrap">
      <span class="ft-search-ico">&#9906;</span>
      <input type="text" id="ft-search" placeholder="Buscar archivo...">
    </div>
    <div id="file-tree"></div>
    <div id="sym-section">
      <div id="sym-hd">
        <span id="sym-fname"></span>
        <span id="sym-toggle">&#9660;</span>
      </div>
      <div id="sym-list"></div>
    </div>
  </div>
  <!-- Tab: Filtros -->
  <div id="tab-filters">
    <div class="psec">
      <div class="plabel">Lenguajes visibles</div>
      <div id="lang-filter" class="lang-chips"></div>
    </div>
    <div class="psec">
      <div class="plabel">Profundidad desde nodo</div>
      <div id="depth-filter" class="depth-btns">
        <button class="depth-btn active" data-depth="">Todo</button>
        <button class="depth-btn" data-depth="1">1 hop</button>
        <button class="depth-btn" data-depth="2">2 hops</button>
        <button class="depth-btn" data-depth="3">3 hops</button>
      </div>
    </div>
  </div>
  <!-- Tab: Módulos -->
  <div id="tab-modules">
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
          <select class="cfs" id="comm-minf" title="Filtrar por tama&#241;o">
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
      <div class="plabel">Entradas detectadas</div>
      <div id="entry-list"></div>
    </div>
    <div class="psec">
      <div class="plabel">Tipo estelar</div>
      <div id="stellar-legend"></div>
    </div>
    <div class="hint">Arrastra &#8594; rotar<br>Rueda &#8594; zoom<br>Clic &#8594; seleccionar<br>Doble clic nodo &#8594; c&#243;digo<br>Clic comunidad &#8594; resaltar<br>Clic s&#237;mbolo &#8594; ir a l&#237;nea</div>
  </div>
</div>
<div id="cpanel">
  <div id="cp-hd">
    <span id="cp-title"></span>
    <span id="cp-lang"></span>
    <a id="cp-vsc" href="#" target="_blank">&#128196; Abrir en VS Code</a>
    <span id="cp-close" title="Cerrar (Esc)">&#x2715;</span>
  </div>
  <div id="cp-meta"></div>
  <div id="cp-body"><div id="cp-lines"></div></div>
</div>
<div id="tt">
  <div class="ttn" id="tt-name"></div>
  <div class="ttc" id="tt-comm"></div>
  <div class="ttf" id="tt-fi"></div>
  <div class="ttp" id="tt-path"></div>
</div>
<div id="statusbar">
  <span id="sb-left">&#9679; WLADY_CODE</span>
  <span id="sb-mid"></span>
  <span id="sb-right"></span>
</div>
<script>
var CV=document.getElementById('c'),ctx=CV.getContext('2d');
var PW=240;
var W,H,GW;
function resize(){W=CV.width=window.innerWidth;H=CV.height=window.innerHeight;GW=W-PW;}
window.addEventListener('resize',resize);resize();

/* ── Stellar spectral color system ── */
var STELLAR=[
  {min:50,color:'#55aaff',rgb:[85,170,255]},
  {min:26,color:'#aaccff',rgb:[170,204,255]},
  {min:13,color:'#eef2ff',rgb:[238,242,255]},
  {min:7, color:'#ffe640',rgb:[255,230,64]},
  {min:4, color:'#ffaa18',rgb:[255,170,24]},
  {min:2, color:'#ff6010',rgb:[255,96,16]},
  {min:0, color:'#ff2e20',rgb:[255,46,32]},
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

/* ── Community palette ── */
var CP=[
  '#00e8aa','#3399ff','#cc44ff','#22ee66','#ffcc00',
  '#ff7700','#ff1155','#ff44dd','#00ddff','#ffaa00',
  '#9966ff','#00ffcc','#ff5522','#88ff22','#44bbff',
  '#bb66ff','#ff2299','#11ddcc','#ffee11','#7799bb'
];
var CH=CP.map(function(c){
  return[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
});

/* ── Language dot colors for file tree ── */
var LANG_COLORS={
  typescript:'#4a9eff',javascript:'#ffcc00',python:'#22dd66',
  java:'#ff7722',go:'#00ccff',rust:'#ff6633',
  csharp:'#aa66ff',cpp:'#ff4466',php:'#9966ff',ruby:'#ff2244',
  swift:'#ff8833',dart:'#44ccdd',html:'#ee6644',
  css:'#4488ff',scss:'#ff66aa',json:'#99bb44',
  yaml:'#88aacc',sql:'#ffbb33',bash:'#88cc44',shell:'#88cc44',
  unknown:'#2a3d52'
};

/* ── Symbol metadata ── */
var SYM_ICONS={
  'function':'F','class':'C','method':'M','interface':'I',
  'variable':'V','type':'T','enum':'E','other':'\xB7'
};
var SYM_COLORS={
  'function':'#4a9eff','class':'#cc44ff','method':'#22ee66','interface':'#00ddff',
  'variable':'#ffcc00','type':'#ff7700','enum':'#ff44dd','other':'#4a6080'
};

/* ── Global state ── */
var nodes=[],edges=[],stars=[],commNames={};
var allComms=[];
var commTreeOpen={};
var currentProjectRoot='';
var currentProjectId='';
var rotX=0.28,rotY=0.42,zoom=1.3;
var autoRot=true,isDrag=false,didDrag=false,lastMX=0,lastMY=0;
var hovered=null,selected=null,selectedComm=-1,frame=0,simLeft=0,projMap={};

/* ── New state for GitNexus-inspired features ── */
var fileTree=[];
var expandedDirs={};
var ftSearchVal='';
var hiddenLangs={};
var depthFilter=0;
var _hopCache=null,_hopCacheId=null,_hopCacheDepth=0;
var loadedSymbols=[];
var symSectionOpen=true;
var entryPoints=[];
var currentTab='files';

/* ── Star field ── */
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

/* ── Hop-set BFS for depth filter ── */
function computeHopSet(nodeId,hops){
  var result=new Set([nodeId]);
  for(var h=0;h<hops;h++){
    var added=false;
    for(var ei=0;ei<edges.length;ei++){
      var e=edges[ei];
      if(!e.a||!e.b)continue;
      if(result.has(e.a.id)&&!result.has(e.b.id)){result.add(e.b.id);added=true;}
      if(result.has(e.b.id)&&!result.has(e.a.id)){result.add(e.a.id);added=true;}
    }
    if(!added)break;
  }
  return result;
}

/* ── Render loop ── */
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

  ctx.fillStyle='#06090f';
  ctx.fillRect(0,0,W,H);

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

  /* ── Active-set with depth filter support ── */
  var hasSel=selected||selectedComm>=0;
  var activeIds=null;
  if(hasSel){
    if(selected&&depthFilter>0){
      if(_hopCacheId!==selected.n.id||_hopCacheDepth!==depthFilter){
        _hopCache=computeHopSet(selected.n.id,depthFilter);
        _hopCacheId=selected.n.id;_hopCacheDepth=depthFilter;
      }
      activeIds=_hopCache;
    } else {
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
  }

  /* ── EDGES — two-pass additive ── */
  ctx.globalCompositeOperation='lighter';
  var eGlow=[],eCore=[];
  for(var ei=0;ei<edges.length;ei++){
    var ea=edges[ei];
    if(!ea.a||!ea.b)continue;
    var pa=projMap[ea.a.id],pb=projMap[ea.b.id];
    if(!pa||!pb)continue;
    /* Skip edges where both endpoints are hidden by language filter */
    if(hiddenLangs[ea.a.language||'unknown']&&hiddenLangs[ea.b.language||'unknown'])continue;
    var isAct;
    if(!hasSel){isAct=true;}
    else if(selected){isAct=activeIds.has(ea.a.id)&&activeIds.has(ea.b.id);}
    else{isAct=activeIds.has(ea.a.id)||activeIds.has(ea.b.id);}
    var sameCom=(ea.a.community===ea.b.community);
    var ci=ea.a.community%CH.length;
    var gA,cA;
    if(!hasSel){gA=sameCom?0.10:0.028;cA=sameCom?0.26:0.07;}
    else if(isAct){gA=0.30;cA=0.80;}
    else{gA=0.006;cA=0.014;}
    eGlow.push({pa:pa,pb:pb,ci:ci,a:gA});
    eCore.push({pa:pa,pb:pb,ci:ci,a:cA});
  }
  ctx.lineWidth=3.0;
  for(var gi=0;gi<eGlow.length;gi++){
    var eg=eGlow[gi],rg=CH[eg.ci];
    ctx.strokeStyle='rgba('+rg[0]+','+rg[1]+','+rg[2]+','+eg.a+')';
    ctx.beginPath();ctx.moveTo(eg.pa.px,eg.pa.py);ctx.lineTo(eg.pb.px,eg.pb.py);ctx.stroke();
  }
  ctx.lineWidth=0.70;
  for(var ki=0;ki<eCore.length;ki++){
    var ek=eCore[ki],rk=CH[ek.ci];
    ctx.strokeStyle='rgba('+rk[0]+','+rk[1]+','+rk[2]+','+ek.a+')';
    ctx.beginPath();ctx.moveTo(ek.pa.px,ek.pa.py);ctx.lineTo(ek.pb.px,ek.pb.py);ctx.stroke();
  }

  /* ── NODES — back to front ── */
  proj.sort(function(a,b){return a.pz-b.pz;});

  for(var pi=0;pi<proj.length;pi++){
    var p=proj[pi],n=p.n,px=p.px,py=p.py,s=p.s;
    if(px<PW-40||px>W+40||py<-40||py>H+40)continue;

    /* Language filter — dim and skip (keep selected node visible) */
    if(hiddenLangs[n.language||'unknown']&&(!selected||n.id!==selected.n.id)){
      ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=0.04;
      ctx.fillStyle='#334';
      ctx.beginPath();ctx.arc(px,py,r||2,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      continue;
    }

    var isNodeAct=!hasSel||activeIds.has(n.id);
    var conns=n.fanIn+n.fanOut;
    var baseR=Math.max(2.2,Math.log(conns+1)*3+1.5);
    var r=baseR*Math.max(0.22,s);
    var hot=conns>=13,warm=conns>=4;
    var rgb2=n.rgb;

    if(!isNodeAct){
      ctx.globalCompositeOperation='source-over';
      ctx.globalAlpha=0.07;
      ctx.fillStyle=n.color;
      ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=1;
      continue;
    }

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

    ctx.globalCompositeOperation='source-over';
    ctx.fillStyle=hot?'rgba(240,248,255,0.95)':n.color;
    ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();

    if(r>3){
      ctx.fillStyle='rgba(255,255,255,0.42)';
      ctx.beginPath();ctx.arc(px-r*.26,py-r*.22,r*.27,0,Math.PI*2);ctx.fill();
    }

    if(warm){
      ctx.globalAlpha=0.17+pulse*0.28;
      ctx.strokeStyle=hot?'rgba(180,210,255,1)':n.color;
      ctx.lineWidth=hot?1.6:0.9;
      ctx.beginPath();ctx.arc(px,py,r+2+pulse*5,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;ctx.lineWidth=0.85;
    }

    var showLabel=hasSel?(s>0.30):(hot&&s>0.52);
    if(showLabel){
      var fs=Math.min(11,Math.max(8,9*s));
      ctx.font=fs+'px ui-monospace,monospace';
      ctx.fillStyle='rgba(190,215,255,'+Math.min(0.85,0.22+s*0.80)+')';
      ctx.fillText(n.label,px+r+4,py+3.5);
    }

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

  ctx.restore();
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
      '<span style="color:'+col+'">'+(commNames[best.n.community]||'community '+best.n.community)+'</span>';
    document.getElementById('tt-fi').textContent=
      'fan-in: '+best.n.fanIn+' \xB7 fan-out: '+best.n.fanOut+' \xB7 '+best.n.language;
    document.getElementById('tt-path').textContent=best.n.path;
  } else {
    tt.style.display='none';
  }
}

/* ── Community tree ── */
function commItemEl(c){
  var col=CP[c.id%CP.length];
  var div=document.createElement('div');div.className='li';
  if(selectedComm===c.id)div.classList.add('active');
  div.innerHTML=
    '<div class="ld" style="background:'+col+'"></div>'+
    '<div class="ln">'+c.name+'<br><span class="lc">'+c.count+' archivos</span></div>';
  div.addEventListener('click',function(){
    selected=null;
    document.querySelectorAll('.li,.hs').forEach(function(x){x.classList.remove('active');});
    if(selectedComm===c.id){selectedComm=-1;}
    else{selectedComm=c.id;div.classList.add('active');}
    hideSymbolSection();
  });
  return div;
}

function renderCommList(){
  var search=(document.getElementById('comm-search')||{value:''}).value.toLowerCase();
  var sort=(document.getElementById('comm-sort')||{value:'id'}).value;
  var minF=parseInt((document.getElementById('comm-minf')||{value:'0'}).value)||0;
  var filtered=allComms.filter(function(c){
    return c.count>=minF&&(!search||c.name.toLowerCase().indexOf(search)>=0);
  });
  if(sort==='name')filtered.sort(function(a,b){return a.name.localeCompare(b.name);});
  else if(sort==='count-desc')filtered.sort(function(a,b){return b.count-a.count;});
  else if(sort==='count-asc')filtered.sort(function(a,b){return a.count-b.count;});
  var ll=document.getElementById('legend-list');ll.innerHTML='';
  if(!filtered.length){
    var em=document.createElement('div');em.className='tree-empty';
    em.textContent='Sin resultados';ll.appendChild(em);return;
  }
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
    if(items.length===1){ll.appendChild(commItemEl(items[0]));return;}
    if(commTreeOpen[prefix]===undefined)commTreeOpen[prefix]=true;
    var grp=document.createElement('div');grp.className='tg';
    var hd=document.createElement('div');hd.className='tg-hd';
    var arr=document.createElement('span');arr.className='tg-arr'+(commTreeOpen[prefix]?' open':'');
    arr.textContent='▶';
    var lbl=document.createElement('span');lbl.className='tg-lbl';lbl.textContent=prefix;
    var cnt=document.createElement('span');cnt.className='tg-cnt';cnt.textContent=items.length+' grupos';
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

/* ── Tab system ── */
function setTab(tab){
  currentTab=tab;
  ['files','filters','modules'].forEach(function(t){
    var el=document.getElementById('tab-'+t);
    var btn=document.getElementById('btn-'+t);
    if(el)el.style.display=(t===tab)?'flex':'none';
    if(btn)btn.classList.toggle('active',t===tab);
  });
}

/* ── File tree ── */
function buildFileTree(nodeList){
  fileTree=[];
  var pathMap={};
  var sorted=nodeList.slice().sort(function(a,b){return a.path.localeCompare(b.path);});
  sorted.forEach(function(node){
    var parts=node.path.replace(/\\\\/g,'/').split('/');
    var cur=fileTree;
    var curPath='';
    parts.forEach(function(part,idx){
      curPath=curPath?curPath+'/'+part:part;
      var isFile=(idx===parts.length-1);
      if(!pathMap[curPath]){
        var item={
          name:part,path:curPath,
          type:isFile?'file':'dir',
          node:isFile?node:null,
          children:[]
        };
        pathMap[curPath]=item;
        cur.push(item);
      }
      cur=pathMap[curPath].children;
    });
  });
}

function renderFileTree(){
  var container=document.getElementById('file-tree');
  if(!container)return;
  container.innerHTML='';
  var searchLo=ftSearchVal.toLowerCase();

  function matchSearch(item){
    if(!searchLo)return true;
    if(item.name.toLowerCase().indexOf(searchLo)>=0)return true;
    if(item.type==='dir')return item.children.some(matchSearch);
    return false;
  }

  function renderItem(item,depth){
    if(searchLo&&!matchSearch(item))return null;

    if(item.type==='dir'){
      if(expandedDirs[item.path]===undefined)expandedDirs[item.path]=(depth<2);
      var isOpen=expandedDirs[item.path];
      var btn=document.createElement('button');
      btn.className='ft-item ft-dir';
      btn.style.paddingLeft=(8+depth*12)+'px';
      btn.innerHTML='<span class="ft-arr">'+(isOpen?'▾':'▸')+'</span>'+
        '<span class="ft-name">'+item.name+'/</span>';
      btn.addEventListener('click',function(){
        expandedDirs[item.path]=!expandedDirs[item.path];
        renderFileTree();
      });
      var wrap=document.createElement('div');
      wrap.appendChild(btn);
      if(isOpen||searchLo){
        item.children.forEach(function(child){
          var el=renderItem(child,depth+1);
          if(el)wrap.appendChild(el);
        });
      }
      return wrap;
    } else {
      var btn2=document.createElement('button');
      btn2.className='ft-item'+(selected&&item.node&&selected.n.id===item.node.id?' ft-sel':'');
      btn2.style.paddingLeft=(8+depth*12)+'px';
      var langColor=LANG_COLORS[item.node?item.node.language:''||'unknown']||'#2a3d52';
      btn2.innerHTML='<span class="ft-dot" style="background:'+langColor+'"></span>'+
        '<span class="ft-name">'+item.name+'</span>';
      (function(nd){
        btn2.addEventListener('click',function(){
          if(!nd)return;
          var proj=projMap[nd.id];
          if(proj){selected=proj;selectedComm=-1;}
          document.querySelectorAll('.li,.hs').forEach(function(x){x.classList.remove('active');});
          loadSymbols(currentProjectId,nd.path,nd);
          renderFileTree();
        });
      })(item.node);
      return btn2;
    }
  }

  fileTree.forEach(function(item){
    var el=renderItem(item,0);
    if(el)container.appendChild(el);
  });
}

/* ── Symbol section ── */
function hideSymbolSection(){
  var ss=document.getElementById('sym-section');
  if(ss)ss.style.display='none';
  loadedSymbols=[];
}

async function loadSymbols(projectId,relPath,fileNode){
  if(!projectId||!relPath){hideSymbolSection();return;}
  var sec=document.getElementById('sym-section');
  var fname=document.getElementById('sym-fname');
  var list=document.getElementById('sym-list');
  if(!sec)return;
  sec.style.display='flex';
  if(fname)fname.textContent=(relPath.split('/').pop()||relPath)+' …';
  if(list)list.innerHTML='';
  try{
    var res=await fetch('/api/symbols?projectId='+encodeURIComponent(projectId)+'&relPath='+encodeURIComponent(relPath));
    loadedSymbols=await res.json();
    if(!Array.isArray(loadedSymbols))loadedSymbols=[];
  }catch(e){loadedSymbols=[];}
  renderSymbolSection(relPath,fileNode);
}

function renderSymbolSection(relPath,fileNode){
  var sec=document.getElementById('sym-section');
  var list=document.getElementById('sym-list');
  var fname=document.getElementById('sym-fname');
  if(!sec||!list)return;
  var basename=relPath.split('/').pop()||relPath;
  if(fname)fname.textContent=basename+' ('+loadedSymbols.length+')';
  if(!symSectionOpen){
    list.style.display='none';
    var tog=document.getElementById('sym-toggle');
    if(tog)tog.textContent='▶';
    return;
  }
  list.style.display='flex';
  list.innerHTML='';
  if(loadedSymbols.length===0){
    var em=document.createElement('div');em.className='tree-empty';
    em.textContent='Sin s\xEDmbolos detectados';list.appendChild(em);return;
  }
  loadedSymbols.forEach(function(sym){
    var btn=document.createElement('button');
    btn.className='sym-item';
    var icon=SYM_ICONS[sym.kind]||SYM_ICONS.other;
    var color=SYM_COLORS[sym.kind]||SYM_COLORS.other;
    btn.innerHTML=
      '<span class="sym-icon" style="color:'+color+'">'+icon+'</span>'+
      '<span class="sym-name">'+sym.name+'</span>'+
      '<span class="sym-line">:'+sym.start_line+'</span>';
    (function(s,fn){
      btn.addEventListener('click',function(){
        if(fn)openCodePanelAtLine(fn,s.start_line,s.end_line,s.name,s.kind);
      });
    })(sym,fileNode);
    list.appendChild(btn);
  });
}

/* ── Language filter ── */
function buildLangFilter(){
  var langCount={};
  nodes.forEach(function(n){var l=n.language||'unknown';langCount[l]=(langCount[l]||0)+1;});
  var container=document.getElementById('lang-filter');
  if(!container)return;
  container.innerHTML='';
  Object.keys(langCount).sort().forEach(function(lang){
    var btn=document.createElement('button');
    var isOff=hiddenLangs[lang];
    btn.className='lang-chip'+(isOff?' off':'');
    var dot='<span style="background:'+(LANG_COLORS[lang]||'#3a5070')+
      ';border-radius:50%;display:inline-block;width:5px;height:5px;margin-right:3px;vertical-align:middle"></span>';
    btn.innerHTML=dot+lang+' <span style="color:#1d2c3f">('+langCount[lang]+')</span>';
    (function(l){
      btn.addEventListener('click',function(){
        hiddenLangs[l]=!hiddenLangs[l];
        btn.className='lang-chip'+(hiddenLangs[l]?' off':'');
      });
    })(lang);
    container.appendChild(btn);
  });
}

/* ── Depth filter ── */
function setDepthFilter(depth){
  depthFilter=depth;
  _hopCache=null;_hopCacheId=null;_hopCacheDepth=0;
  document.querySelectorAll('.depth-btn').forEach(function(btn){
    var d=btn.dataset.depth===''?0:parseInt(btn.dataset.depth)||0;
    btn.classList.toggle('active',d===depth);
  });
}

/* ── Entry points ── */
async function loadEntryPoints(projectId){
  if(!projectId)return;
  try{
    var res=await fetch('/api/entry-points?projectId='+encodeURIComponent(projectId));
    var data=await res.json();
    entryPoints=Array.isArray(data)?data:[];
  }catch(e){entryPoints=[];}
  renderEntryPoints();
}

function renderEntryPoints(){
  var container=document.getElementById('entry-list');
  if(!container)return;
  container.innerHTML='';
  if(entryPoints.length===0){
    var em=document.createElement('div');em.className='tree-empty';
    em.textContent='No se detectaron puntos de entrada';
    container.appendChild(em);return;
  }
  entryPoints.forEach(function(ep){
    var btn=document.createElement('button');
    btn.className='ep-item';
    var icon=SYM_ICONS[ep.kind]||SYM_ICONS.other;
    var color=SYM_COLORS[ep.kind]||SYM_COLORS.other;
    btn.innerHTML=
      '<span class="ep-icon" style="color:'+color+'">'+icon+'</span>'+
      '<span class="ep-name">'+ep.name+'</span>'+
      '<span class="ep-file">'+(ep.relPath.split('/').pop()||ep.relPath)+'</span>';
    (function(e){
      btn.addEventListener('click',function(){
        var node=nodes.find(function(n){return n.path===e.relPath;});
        if(node)openCodePanelAtLine(node,e.startLine,null,e.name,e.kind);
      });
    })(ep);
    container.appendChild(btn);
  });
}

/* ── Status bar ── */
function updateStatusBar(nodeCount,edgeCount,projName){
  var left=document.getElementById('sb-left');
  var right=document.getElementById('sb-right');
  if(left)left.textContent='● '+(projName||'WLADY_CODE');
  if(right&&nodeCount!=null)right.textContent=nodeCount+' nodos \xB7 '+edgeCount+' aristas';
}

/* ── Load graph ── */
async function loadGraph(projectId,projectRoot,projName){
  currentProjectId=projectId||'';
  currentProjectRoot=projectRoot||'';
  document.getElementById('loading').textContent='Cargando grafo…';
  document.getElementById('loading').style.display='block';
  nodes=[];edges=[];projMap={};hovered=null;selected=null;selectedComm=-1;
  hiddenLangs={};depthFilter=0;fileTree=[];loadedSymbols=[];
  _hopCache=null;_hopCacheId=null;_hopCacheDepth=0;
  hideSymbolSection();
  closeCodePanel();
  /* Reset depth buttons */
  document.querySelectorAll('.depth-btn').forEach(function(btn){
    btn.classList.toggle('active',btn.dataset.depth==='');
  });
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

    /* Attach language to edge endpoints for filter check */
    edges.forEach(function(e){
      if(e.a)e.a.language=e.a.language||'unknown';
      if(e.b)e.b.language=e.b.language||'unknown';
    });

    for(var i=0;i<270;i++)simStep(Math.max(0.2,1-i/310));
    simLeft=90;

    allComms=Object.keys(commDirs).map(Number)
      .sort(function(a,b){return a-b;})
      .map(function(c){return{id:c,name:commNames[c],count:commDirs[c]};});
    renderCommList();

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
            document.querySelectorAll('.li,.hs').forEach(function(x){x.classList.remove('active');});
            if(selected&&selected.n.id===nodeId){clearSelection();}
            else{
              selected=proj;selectedComm=-1;el.classList.add('active');
              loadSymbols(currentProjectId,proj.n.path,proj.n);
              renderFileTree();
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

    /* File tree */
    buildFileTree(nodes);
    var ftsEl=document.getElementById('ft-search');
    if(ftsEl){ftsEl.value='';ftsEl.oninput=function(){ftSearchVal=ftsEl.value;renderFileTree();};}
    renderFileTree();

    /* Language filter */
    buildLangFilter();

    /* Entry points (async — don't block) */
    loadEntryPoints(projectId);

    /* Status bar */
    updateStatusBar(nodes.length,edges.length,projName||projectId);

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
        projects[0].fileCount+' archivos \xB7 '+projects[0].symbolCount+' s\xEDmbolos';
      await loadGraph(projects[0].id,projects[0].path,projects[0].name);
    } else {
      document.getElementById('loading').style.display='none';
    }
    sel.addEventListener('change',async function(){
      if(!sel.value)return;
      var p=projects.find(function(x){return x.id===sel.value;});
      if(p)document.getElementById('proj-stats').textContent=
        p.fileCount+' archivos \xB7 '+p.symbolCount+' s\xEDmbolos';
      await loadGraph(sel.value,p?p.path:'',p?p.name:'');
    });
  }catch(err){
    document.getElementById('loading').textContent='No se pudo conectar al servidor: '+err.message;
  }
}

function clearSelection(){
  selected=null;selectedComm=-1;
  document.querySelectorAll('.li,.hs').forEach(function(el){el.classList.remove('active');});
  hideSymbolSection();
  renderFileTree();
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
    else{
      selected=hit;selectedComm=-1;
      document.querySelectorAll('.li,.hs').forEach(function(el){el.classList.remove('active');});
      loadSymbols(currentProjectId,hit.n.path,hit.n);
      renderFileTree();
    }
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
  if(hit){openCodePanelAtLine(hit.n,0,0,null,null);}
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

function prismLang(lang){return LANG_MAP[(lang||'').toLowerCase()]||'';}

async function openCodePanelAtLine(n,startLine,endLine,symName,symKind){
  cpanel.style.display='flex';
  var titleText=n.label;
  if(symName)titleText=n.label+' › '+symName;
  document.getElementById('cp-title').textContent=titleText;
  document.getElementById('cp-lang').textContent=n.language;
  var metaText=n.path;
  if(symKind&&startLine)metaText+='  \xB7  '+symKind+'  \xB7  L'+startLine;
  document.getElementById('cp-meta').textContent=metaText;
  var linesDiv=document.getElementById('cp-lines');
  linesDiv.innerHTML='<div style="color:#2e3f58;padding:14px;font-size:11px">Cargando…</div>';
  try{
    var res=await fetch('/api/file?projectId='+encodeURIComponent(currentProjectId)+'&relPath='+encodeURIComponent(n.path));
    var data=await res.json();
    if(data.error)throw new Error(data.error);
    var bs=String.fromCharCode(92);
    var vsPath=data.absPath.split(bs).join('/');
    document.getElementById('cp-vsc').href='vscode://file/'+vsPath;
    var lang=prismLang(n.language);
    var lines=data.content.split('\\n');
    var hl1=startLine||0,hl2=endLine||hl1;
    var html='';
    for(var li=0;li<lines.length;li++){
      var lineNum=li+1;
      var lineText=lines[li];
      var isHl=hl1>0&&lineNum>=hl1&&lineNum<=hl2;
      var rendered=lineText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      if(typeof Prism!=='undefined'&&lang&&Prism.languages[lang]){
        try{rendered=Prism.highlight(lineText,Prism.languages[lang],lang);}catch(e2){}
      }
      html+='<div class="cp-line'+(isHl?' cp-hl':'')+'">'+
        '<span class="cp-ln">'+lineNum+'</span>'+
        '<span class="cp-lc">'+rendered+'</span>'+
        '</div>';
    }
    linesDiv.innerHTML=html;
    if(hl1>0){
      var lineH=19.5;
      var cpBody=document.getElementById('cp-body');
      cpBody.scrollTop=Math.max(0,(hl1-6))*lineH;
    }
  }catch(err){
    linesDiv.innerHTML='<div style="color:#ff4466;padding:14px;font-size:11px">Error: '+err.message+'</div>';
  }
}

/* ── Tab wiring ── */
document.getElementById('btn-files').addEventListener('click',function(){setTab('files');});
document.getElementById('btn-filters').addEventListener('click',function(){setTab('filters');});
document.getElementById('btn-modules').addEventListener('click',function(){setTab('modules');});

/* ── Depth filter wiring ── */
document.querySelectorAll('.depth-btn').forEach(function(btn){
  btn.addEventListener('click',function(){
    var d=btn.dataset.depth===''?0:parseInt(btn.dataset.depth)||0;
    setDepthFilter(d);
  });
});

/* ── Symbol section toggle ── */
document.getElementById('sym-hd').addEventListener('click',function(){
  symSectionOpen=!symSectionOpen;
  var list=document.getElementById('sym-list');
  var tog=document.getElementById('sym-toggle');
  if(list)list.style.display=symSectionOpen?'flex':'none';
  if(tog)tog.textContent=symSectionOpen?'▼':'▶';
});

init();render();
</script>
<!-- Prism core + dependency chain in correct order -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-clike.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-typescript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-kotlin.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-c.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-cpp.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-markup-templating.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-php.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-scss.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-go.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-rust.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-yaml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-ruby.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-swift.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-dart.min.js"></script>
</body>
</html>`;
}
