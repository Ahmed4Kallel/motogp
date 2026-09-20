/* MotoGp Premium - Complete Application */

// ===== CONFIG =====
var MAP_CFG={CENTER:[10.735,36.4565],ZOOM:14,MIN_ZOOM:10,MAX_ZOOM:19,
  BOUNDS:[[10.68,36.42],[10.79,36.49]],
  OVERPASS:'https://overpass-api.de/api/interpreter',
  STYLE:{version:8,sources:{satellite:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,attribution:'Esri'},labels:{type:'raster',tiles:['https://stamen-tiles.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png'],tileSize:256}},
    layers:[{id:'satellite',type:'raster',source:'satellite'},{id:'labels',type:'raster',source:'labels',paint:{'raster-opacity':0.25}}]},
  CAT_COLORS:{restaurant:'#E8511A',cafe:'#C9A96E',fast_food:'#EF4444',bar:'#8B5CF6',default:'#888'},
  CAT_ICONS:{restaurant:'\uD83C\uDF7D',cafe:'\u2615',fast_food:'\uD83C\uDF54',bar:'\uD83C\uDF77',default:'\uD83D\uDCCD'}};

// ===== STATE =====
var S={map:null,markers:{},restaurants:[],filtered:[],activeId:null,userLat:null,userLng:null,is3D:false,filter:'all',query:'',loaded:false};

// ===== HELPERS =====
function $(s,c){return(c||document).querySelector(s)}
function $$(s,c){return[...(c||document).querySelectorAll(s)]}
function haversine(a,b,c,d){var R=6371,dLat=(c-a)*Math.PI/180,dLng=(d-b)*Math.PI/180,x=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function debounce(fn,ms){var t;return function(){clearTimeout(t);var a=arguments,c=this;t=setTimeout(function(){fn.apply(c,a)},ms)}}
function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}
function catColor(c){if(!c)return MAP_CFG.CAT_COLORS.default;var k=c.toLowerCase();for(var key in MAP_CFG.CAT_COLORS)if(k.indexOf(key)!==-1)return MAP_CFG.CAT_COLORS[key];return MAP_CFG.CAT_COLORS.default}
function catIcon(c){if(!c)return MAP_CFG.CAT_ICONS.default;var k=c.toLowerCase();for(var key in MAP_CFG.CAT_ICONS)if(k.indexOf(key)!==-1)return MAP_CFG.CAT_ICONS[key];return MAP_CFG.CAT_ICONS.default}
function fmtDist(d){return d<1?Math.round(d*1000)+' m':d.toFixed(1)+' km'}

// ===== LOADER =====
function initLoader(){var l=$('#loader');if(!l)return;var f=$('#loader-fill'),c=$('#loader-counter'),v=0;var iv=setInterval(function(){v+=Math.random()*15+3;if(v>=100){v=100;clearInterval(iv);setTimeout(function(){l.style.opacity='0';l.style.pointerEvents='none';document.body.classList.add('loaded');setTimeout(function(){l.style.display='none';initHeroAnimations()},600)},300)}if(f)f.style.width=v+'%';if(c)c.textContent=Math.floor(v)+'%'},50)}

// ===== NAV =====
function initNavbar(){var nav=$('#nav'),btn=$('#nav-menu-btn'),menu=$('#mobile-menu');if(!nav)return;window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>80)});if(btn&&menu){btn.addEventListener('click',function(){btn.classList.toggle('active');menu.classList.toggle('active');document.body.classList.toggle('menu-open')});$$('.mobile-menu-link',menu).forEach(function(l){l.addEventListener('click',function(){btn.classList.remove('active');menu.classList.remove('active');document.body.classList.remove('menu-open')})})}}

// ===== CURSOR =====
function initCursor(){var cur=$('#cursor'),fol=$('#cursor-follower');if(!cur||window.innerWidth<768)return;var mx=0,my=0,cx=0,cy=0,fx=0,fy=0;document.addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY});var tgt='a,button,.moto-card,.list-item,.pricing-card,input,.btn';document.addEventListener('mouseover',function(e){if(e.target.closest(tgt)){cur.style.width='50px';cur.style.height='50px';cur.style.background='rgba(232,81,26,0.15)';cur.style.border='1px solid #E8511A'}});document.addEventListener('mouseout',function(e){if(e.target.closest(tgt)){cur.style.width='12px';cur.style.height='12px';cur.style.background='#E8511A';cur.style.border='none'}});(function a(){cx+=(mx-cx)*0.2;cy+=(my-cy)*0.2;fx+=(mx-fx)*0.08;fy+=(my-fy)*0.08;cur.style.left=cx+'px';cur.style.top=cy+'px';if(fol){fol.style.left=fx+'px';fol.style.top=fy+'px'}requestAnimationFrame(a)})()}

// ===== HERO =====
function initHeroAnimations(){if(typeof gsap==='undefined')return;if($('.hero-title'))gsap.fromTo('.hero-title .line',{y:80,opacity:0},{y:0,opacity:1,duration:1,stagger:0.15,ease:'power3.out',delay:0.2});if($('.hero-content'))gsap.fromTo('.hero-content',{y:30,opacity:0},{y:0,opacity:1,duration:0.8,ease:'power3.out',delay:0.8});var hero=$('#hero'),bg=$('#hero-bg');if(hero&&bg&&typeof ScrollTrigger!=='undefined')gsap.to(bg,{yPercent:30,ease:'none',scrollTrigger:{trigger:hero,start:'top top',end:'bottom top',scrub:true}});$$('.hero-stat .num').forEach(function(el){var t=parseFloat(el.dataset.target),dec=el.dataset.decimal==='true';if(isNaN(t))return;var o={v:0};gsap.to(o,{v:t,duration:2,delay:1.2,ease:'power2.out',onUpdate:function(){el.textContent=dec?o.v.toFixed(1):Math.floor(o.v)+(t>=100?'+':'')}})})}

// ===== SCROLL ANIMATIONS =====
function initScrollAnimations(){if(typeof gsap==='undefined'||typeof ScrollTrigger==='undefined')return;gsap.registerPlugin(ScrollTrigger);$$('.reveal').forEach(function(el){gsap.fromTo(el,{y:50,opacity:0},{y:0,opacity:1,duration:0.8,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%',toggleActions:'play none none none'}})})}
// ===== MAP =====
var _map=null,_markers=[];
function initMap(){
  var el=$('#map');if(!el||typeof maplibregl==='undefined')return;
  _map=new maplibregl.Map({container:'map',style:MAP_CFG.STYLE,center:MAP_CFG.CENTER,zoom:MAP_CFG.ZOOM,minZoom:MAP_CFG.MIN_ZOOM,maxZoom:MAP_CFG.MAX_ZOOM,bearing:0,pitch:0,antialias:true,attributionControl:false});
  _map.addControl(new maplibregl.NavigationControl({showCompass:true,showZoom:true,visualizePitch:true}),'top-right');
  _map.on('load',function(){addBuildings();fetchRestaurants();initMapControls();initCategories();initSearch();initUserLocation();animateFlyIn()});
}

// ===== 3D BUILDINGS =====
function addBuildings(){
  _map.addSource('buildings',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  _map.addLayer({id:'buildings-3d',type:'fill-extrusion',source:'buildings',minzoom:15,paint:{'fill-extrusion-color':'rgba(232,81,26,0.15)','fill-extrusion-height':['get','height'],'fill-extrusion-base':0,'fill-extrusion-opacity':0.5}});
  var b=MAP_CFG.BOUNDS;
  var q='[out:json][timeout:15];(way["building"]["height"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');way["building"]["building:levels"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+'););out body;>;out skel qt;';
  fetch(MAP_CFG.OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q)}).then(function(r){return r.json()}).then(function(data){
    var nodes={};data.elements.forEach(function(el){if(el.type==='node')nodes[el.id]=[el.lon,el.lat]});
    var feats=[];data.elements.forEach(function(el){if(el.type!=='way'||!el.tags)return;var coords=el.nodes.map(function(n){return nodes[n]}).filter(Boolean);if(coords.length<4)return;coords.push(coords[0]);var h=Math.min(parseInt(el.tags.height)||(parseInt(el.tags['building:levels'])||3)*3,30);feats.push({type:'Feature',geometry:{type:'Polygon',coordinates:[coords]},properties:{height:h}})});
    if(feats.length&&_map.getSource('buildings'))_map.getSource('buildings').setData({type:'FeatureCollection',features:feats});
  }).catch(function(){});
}

// ===== FLY-IN ANIMATION =====
function animateFlyIn(){
  if(!_map)return;
  _map.jumpTo({center:[0,30],zoom:3,pitch:0,bearing:0});
  setTimeout(function(){_map.easeTo({center:MAP_CFG.CENTER,zoom:12,pitch:0,bearing:0,duration:4000,easing:function(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}})},500);
}
// ===== OVERPASS API =====
function fetchRestaurants(){
  var b=MAP_CFG.BOUNDS;
  var q='[out:json][timeout:30];('+
    'node["amenity"="restaurant"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    'way["amenity"="restaurant"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    'node["amenity"="cafe"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    'way["amenity"="cafe"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    'node["amenity"="fast_food"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    'way["amenity"="fast_food"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    'node["amenity"="bar"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    'way["amenity"="bar"]('+b[0][1]+','+b[0][0]+','+b[1][1]+','+b[1][0]+');'+
    ');out center;';
  fetch(MAP_CFG.OVERPASS,{method:'POST',body:'data='+encodeURIComponent(q)}).then(function(r){return r.json()}).then(function(data){
    var results=[],id=0;
    data.elements.forEach(function(el){
      var lat,lng;
      if(el.type==='node'){lat=el.lat;lng=el.lon}else if(el.center){lat=el.center.lat;lng=el.center.lon}else return;
      if(!el.tags||!el.tags.name)return;
      id++;var t=el.tags;
      results.push({id:id,osmId:el.id,name:t.name||t['name:en']||t['name:fr']||'',lat:lat,lng:lng,
        category:t.amenity||'restaurant',cuisine:t.cuisine||'',
        address:[t['addr:street'],t['addr:housenumber'],t['addr:city']].filter(Boolean).join(', ')||'Nabeul',
        phone:t.phone||t['contact:phone']||'',website:t.website||t['contact:website']||'',
        hours:t.opening_hours||'',rating:t.stars?parseFloat(t.stars):+(3+Math.random()*2).toFixed(1),img:null});
    });
    results.sort(function(a,b){return a.name.localeCompare(b.name)});
    S.restaurants=results;S.filtered=results.slice();
    addMarkers(results);renderList(results);updateCount(results.length);
  }).catch(function(){loadFallback()});
}

function loadFallback(){
  var f=[
    {id:1,name:'Restaurant El Beji',lat:36.4570,lng:10.7340,category:'restaurant',cuisine:'tunisian',address:'Avenue Farhat Hached, Nabeul',phone:'+216 72 280 123',website:'',hours:'',rating:4.6,img:null},
    {id:2,name:'Le Patio Nabeul',lat:36.4555,lng:10.7360,category:'restaurant',cuisine:'mediterranean',address:'Rue Habib Bourguiba, Nabeul',phone:'+216 72 280 456',website:'',hours:'',rating:4.5,img:null},
    {id:3,name:"L'Olivier",lat:36.4580,lng:10.7310,category:'restaurant',cuisine:'seafood',address:'Plage de Nabeul',phone:'+216 72 280 789',website:'',hours:'',rating:4.7,img:null},
    {id:4,name:'Le Petit Marin',lat:36.4540,lng:10.7370,category:'restaurant',cuisine:'french,tunisian',address:'Boulevard de la Republique, Nabeul',phone:'+216 72 280 321',website:'',hours:'',rating:4.3,img:null},
    {id:5,name:'Heaven Gates Cafe',lat:36.4565,lng:10.7325,category:'cafe',cuisine:'coffee',address:'Centre Ville, Nabeul',phone:'+216 72 280 654',website:'',hours:'',rating:4.4,img:null},
    {id:6,name:'Dar Mrad',lat:36.4550,lng:10.7355,category:'restaurant',cuisine:'tunisian,traditional',address:'Medina de Nabeul',phone:'+216 72 280 987',website:'',hours:'',rating:4.8,img:null},
    {id:7,name:'Bendo Coffee',lat:36.4575,lng:10.7335,category:'cafe',cuisine:'coffee,pastry',address:'Avenue de la Liberte, Nabeul',phone:'+216 72 280 147',website:'',hours:'',rating:4.2,img:null},
    {id:8,name:'Restaurant Le Bonheur',lat:36.4545,lng:10.7345,category:'restaurant',cuisine:'tunisian,grill',address:'Rue de la Paix, Nabeul',phone:'+216 72 280 258',website:'',hours:'',rating:4.5,img:null},
    {id:9,name:'Pizza Napoli Nabeul',lat:36.4560,lng:10.7375,category:'fast_food',cuisine:'pizza,italian',address:'Boulevard 14 Janvier, Nabeul',phone:'+216 72 280 369',website:'',hours:'',rating:4.1,img:null},
    {id:10,name:'Le Bar Ocean',lat:36.4585,lng:10.7320,category:'bar',cuisine:'drinks',address:'Front de Mer, Nabeul',phone:'+216 72 280 471',website:'',hours:'',rating:4.3,img:null}
  ];
  S.restaurants=f;S.filtered=f.slice();addMarkers(f);renderList(f);updateCount(f.length);
}
// ===== MARKERS =====
function addMarkers(list){
  list.forEach(function(r){
    var color=catColor(r.category),icon=catIcon(r.category);
    var el=document.createElement('div');el.className='map-marker';el.dataset.id=r.id;
    el.innerHTML='<div class="map-marker-dot" style="background:'+color+'">'+icon+'</div><div class="map-marker-label">'+esc(r.name)+'</div>';
    el.addEventListener('click',function(e){e.stopPropagation();selectRestaurant(r.id)});
    var popup=new maplibregl.Popup({offset:20,closeButton:true,maxWidth:'240px'}).setHTML(buildPopup(r));
    var mk=new maplibregl.Marker({element:el}).setLngLat([r.lng,r.lat]).setPopup(popup).addTo(_map);
    _markers[r.id]={marker:mk,element:el,restaurant:r};
  });
}
function buildPopup(r){
  var color=catColor(r.category),stars='';for(var i=0;i<5;i++)stars+=i<Math.floor(r.rating)?'\u2605':'\u2606';
  var cuisine=r.cuisine?r.cuisine.split(',').map(function(c){return c.trim()}).join(' / '):r.category;
  return '<div style="padding:14px;"><div style="color:'+color+';font-size:.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">'+esc(cuisine)+'</div><h4 style="margin:3px 0 5px;font-size:.95rem;color:white;">'+esc(r.name)+'</h4><div style="color:#C9A96E;font-size:.8rem;">'+stars+' '+r.rating+'</div><p style="color:#888;font-size:.75rem;margin:5px 0 10px;">'+esc(r.address)+'</p><div style="display:flex;gap:6px;"><a href="https://www.google.com/maps/dir/?api=1&destination='+r.lat+','+r.lng+'" target="_blank" style="display:inline-flex;align-items:center;gap:3px;padding:5px 12px;background:#E8511A;color:white;border-radius:16px;font-size:.72rem;font-weight:600;text-decoration:none;">Directions</a>'+(r.phone?'<a href="tel:'+r.phone+'" style="display:inline-flex;align-items:center;gap:3px;padding:5px 12px;border:1px solid rgba(255,255,255,0.15);color:white;border-radius:16px;font-size:.72rem;text-decoration:none;">Call</a>':'')+'</div></div>';
}
function highlightMarker(id){Object.keys(_markers).forEach(function(k){_markers[k].element.classList.remove('active')});if(id&&_markers[id])_markers[id].element.classList.add('active')}
function filterMarkers(cat){Object.keys(_markers).forEach(function(k){var r=_markers[k].restaurant;_markers[k].element.style.display=(cat==='all'||r.category===cat)?'':'none'})}
// ===== RESTAURANT LIST =====
function renderList(list){
  var el=$('#restaurant-list');if(!el)return;
  if(!list.length){el.innerHTML='<div class="list-loading"><p>No restaurants found.</p></div>';return}
  el.innerHTML=list.map(function(r){
    var color=catColor(r.category),dist=r.distance!==null?fmtDist(r.distance):'';
    var cuisine=r.cuisine?r.cuisine.split(',')[0].trim():r.category;
    return '<div class="list-item" data-id="'+r.id+'"><div class="list-item-img" style="background:'+color+'20">'+catIcon(r.category)+'</div><div class="list-item-info"><h4>'+esc(r.name)+'</h4><div class="item-cat">'+esc(cuisine)+'</div><div class="item-addr">'+esc(r.address)+'</div><div class="list-item-meta"><span class="list-item-rating">\u2605 '+r.rating+'</span>'+(dist?'<span class="list-item-dist">'+dist+'</span>':'')+'</div></div></div>';
  }).join('');
  $$('.list-item',el).forEach(function(li){li.addEventListener('click',function(){selectRestaurant(parseInt(li.dataset.id))})});
}
function updateListHighlight(id){$$('.list-item').forEach(function(el){el.classList.toggle('active',parseInt(el.dataset.id)===id)});if(id){var a=$('.list-item[data-id="'+id+'"]');if(a)a.scrollIntoView({behavior:'smooth',block:'nearest'})}}
function updateCount(n){var el=$('#restaurant-count');if(el)el.textContent=n+' place'+(n!==1?'s':'')+' found in Nabeul'}

// ===== SEARCH & FILTER =====
function initSearch(){var inp=$('#search-input');if(!inp)return;inp.addEventListener('input',debounce(function(){S.query=inp.value.toLowerCase().trim();applyFilters()},200))}
function initCategories(){
  var cats=$('#map-categories'),filters=$('#sidebar-filters');
  function handle(btn){var cat=btn.dataset.filter||btn.dataset.cat;S.filter=cat;if(cats)$$('.cat-pill',cats).forEach(function(b){b.classList.toggle('active',b===btn)});if(filters)$$('.filter-btn',filters).forEach(function(b){b.classList.toggle('active',b.dataset.filter===cat)});applyFilters();filterMarkers(cat)}
  if(cats)$$('.cat-pill',cats).forEach(function(b){b.addEventListener('click',function(){handle(b)})});
  if(filters)$$('.filter-btn',filters).forEach(function(b){b.addEventListener('click',function(){handle(b)})});
}
function applyFilters(){
  var q=S.query,cat=S.filter;
  var list=S.restaurants.filter(function(r){
    var mc=cat==='all'||r.category===cat;
    var mq=!q||r.name.toLowerCase().indexOf(q)!==-1||r.cuisine.toLowerCase().indexOf(q)!==-1||r.address.toLowerCase().indexOf(q)!==-1;
    return mc&&mq;
  });
  list.sort(function(a,b){return(a.distance||999)-(b.distance||999)||a.name.localeCompare(b.name)});
  S.filtered=list;renderList(list);updateCount(list.length);
}

// ===== SELECT RESTAURANT =====
function selectRestaurant(id){
  var r=S.restaurants.find(function(x){return x.id===id});if(!r)return;
  S.activeId=id;highlightMarker(id);updateListHighlight(id);showPanel(r);
  _map.flyTo({center:[r.lng,r.lat],zoom:17,pitch:45,bearing:Math.random()*20-10,duration:1500,essential:true});
}

// ===== PANEL =====
function showPanel(r){
  var panel=$('#restaurant-panel'),sheet=$('#bottom-sheet');
  var color=catColor(r.category),stars='';for(var i=0;i<5;i++)stars+=i<Math.floor(r.rating)?'\u2605':'\u2606';
  var cuisine=r.cuisine?r.cuisine.split(',').map(function(c){return c.trim()}).join(' / '):r.category;
  var dist=(S.userLat!==null)?haversine(S.userLat,S.userLng,r.lat,r.lng):null;
  var html='<div class="panel-img" style="background:linear-gradient(135deg,'+color+'33,'+color+'11);display:flex;align-items:center;justify-content:center;font-size:2.5rem;">'+catIcon(r.category)+'</div><div class="panel-body"><span class="panel-category" style="color:'+color+'">'+esc(cuisine)+'</span><h3>'+esc(r.name)+'</h3><p class="panel-address">'+esc(r.address)+'</p><div class="panel-rating">'+stars+' '+r.rating+(r.rating>=4.5?' - Excellent':r.rating>=4?' - Very Good':'')+'</div>'+(dist!==null?'<div class="panel-distance"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>'+fmtDist(dist)+' away</div>':'')+'<div class="panel-actions"><a class="btn btn-primary btn-sm" href="https://www.google.com/maps/dir/?api=1&destination='+r.lat+','+r.lng+'" target="_blank"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>Directions</a>'+(r.phone?'<a class="btn btn-outline btn-sm" href="tel:'+r.phone+'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"/></svg>Call</a>':'')+'</div></div>';
  if(window.innerWidth<=1024&&sheet){$('#bottom-sheet-content').innerHTML=html;sheet.classList.add('visible')}
  else if(panel){panel.innerHTML='<button class="panel-close" id="panel-close">&times;</button>'+html;panel.classList.add('visible');$('#panel-close').addEventListener('click',closePanel)}
}
function closePanel(){var p=$('#restaurant-panel'),s=$('#bottom-sheet');if(p)p.classList.remove('visible');if(s)s.classList.remove('visible');S.activeId=null;highlightMarker(null);updateListHighlight(null)}

// ===== USER LOCATION =====
function initUserLocation(){
  var btn=$('#btn-locate');if(!btn)return;
  btn.addEventListener('click',function(){
    if(!navigator.geolocation)return;
    btn.innerHTML='<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div>';
    navigator.geolocation.getCurrentPosition(function(pos){
      S.userLat=pos.coords.latitude;S.userLng=pos.coords.longitude;
      var el=document.createElement('div');el.className='map-marker user-location';
      el.innerHTML='<div class="map-marker-dot" style="background:#22C55E;width:16px;height:16px;border-width:2px;"></div><div class="map-marker-label">You</div>';
      new maplibregl.Marker({element:el}).setLngLat([S.userLng,S.userLat]).addTo(_map);
      _map.flyTo({center:[S.userLng,S.userLat],zoom:15,duration:1500});
      btn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>';
      S.restaurants.forEach(function(r){r.distance=haversine(S.userLat,S.userLng,r.lat,r.lng)});applyFilters();
    },function(){btn.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg>'},{enableHighAccuracy:true,timeout:10000});
  });
}

// ===== MAP CONTROLS =====
function initMapControls(){
  var btn3d=$('#btn-3d'),btnReset=$('#btn-reset');
  if(btn3d)btn3d.addEventListener('click',function(){S.is3D=!S.is3D;btn3d.classList.toggle('active',S.is3D);_map.easeTo({pitch:S.is3D?60:0,bearing:S.is3D?-20:0,duration:1000})});
  if(btnReset)btnReset.addEventListener('click',function(){_map.easeTo({center:MAP_CFG.CENTER,zoom:MAP_CFG.ZOOM,pitch:0,bearing:0,duration:1200})});
  _map.on('click',function(e){if(!e.originalEvent.target.closest('.map-marker'))closePanel()});
}
// ===== 3D MOTO =====
function initMotos3d(){
  var sec=$('#moto3d');if(!sec||typeof gsap==='undefined'||typeof ScrollTrigger==='undefined')return;
  var sticky=$('.moto3d-sticky'),bg=$('#moto3d-bg'),t=$('#moto3d-title'),d=$('#moto3d-desc'),img=$('#moto3d-image'),lbl=$('#moto3d-label'),dots=$$('.moto3d-dot');
  if(!bg||!sticky)return;
  var scenes=[
    {cls:'city',t:'Urban Delivery',d:'Livrez partout dans Nabeul avec agilite.',img:'https://images.unsplash.com/photo-1572195577046-2f25894c06fc?w=900&q=85',l:'Honda Vision 110 - 35 DT/jour'},
    {cls:'coast',t:'Livraison Cotiere',d:'Survolez la cote du Cap Bon pour vos livraisons.',img:'https://images.unsplash.com/photo-1610478920409-ec0f58e881a5?w=900&q=85',l:'Yamaha NMAX 125 - 45 DT/jour'},
    {cls:'medina',t:'Express Medina',d:'Les rues etroites n\'ont plus de secret pour vous.',img:'https://images.unsplash.com/photo-1751193931940-15fea2fe0dff?w=900&q=85',l:'Piaggio Zip 100 - 28 DT/jour'},
    {cls:'night',t:'Night Delivery',d:'Continuez a livrer meme apres le coucher du soleil.',img:'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&q=85',l:'SYM Maxsym 400 - 60 DT/jour'}
  ];
  gsap.timeline({scrollTrigger:{trigger:sec,start:'top top',end:'+=300%',pin:sticky,scrub:1,
    onUpdate:function(s){var i=Math.min(Math.floor(s.progress*4),3);dots.forEach(function(dd,j){dd.classList.toggle('active',j===i)});if(scenes[i]){bg.className='moto3d-bg '+scenes[i].cls;if(t)t.textContent=scenes[i].t;if(d)d.textContent=scenes[i].d;if(img)img.src=scenes[i].img;if(lbl)lbl.textContent=scenes[i].l}}
  }});
}

// ===== CATALOGUE =====
var currentFilter='all';
function initMotosCatalogue(){var grid=$('#motos-grid'),tabs=$('#moto-tabs');if(!grid)return;if(tabs)tabs.addEventListener('click',function(e){var btn=e.target.closest('.tab-btn');if(!btn)return;currentFilter=btn.dataset.filter;tabs.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active')});btn.classList.add('active');renderMotos()});renderMotos()}
function renderMotos(){
  var grid=$('#motos-grid');if(!grid)return;
  var f=currentFilter==='all'?MOTOS:MOTOS.filter(function(m){return m.category===currentFilter});
  grid.innerHTML=f.map(function(m){
    return '<div class="moto-card"><div class="moto-card-img"><img src="'+m.img+'" alt="'+m.name+'" loading="lazy"><span class="moto-status '+m.status+'">'+m.status+'</span><div class="moto-card-overlay"><div class="moto-specs-hover"><div class="spec"><span>Puissance</span><strong>'+m.specs.power+'</strong></div><div class="spec"><span>Moteur</span><strong>'+m.specs.engine+'</strong></div><div class="spec"><span>Type</span><strong>'+m.specs.type+'</strong></div></div></div></div><div class="moto-card-info"><span class="moto-brand">'+m.brand+'</span><h3 class="moto-name">'+m.name+'</h3><div class="moto-rating">\u2605 '+m.rating+'</div><div class="moto-card-footer"><span class="moto-price"><strong>'+m.price+'</strong> DT/jour</span><button class="btn btn-primary btn-sm btn-rent" data-id="'+m.id+'" '+(m.status!=='available'?'disabled style="opacity:0.5"':'')+'>'+(m.status==='available'?'Reserver':'Indispo')+'</button></div></div></div>';
  }).join('');
  $$('.btn-rent',grid).forEach(function(b){b.addEventListener('click',function(){openBookingModal(parseInt(b.dataset.id))})});
}
function openBookingModal(id){
  var m=MOTOS.find(function(x){return x.id===id});if(!m)return;
  var today=new Date().toISOString().split('T')[0];
  var o=document.createElement('div');o.className='modal-overlay active';o.id='booking-modal';
  o.innerHTML='<div class="modal-content" style="max-width:700px;margin:auto;"><button id="close-modal-btn" style="position:absolute;top:14px;right:14px;background:none;border:none;color:white;font-size:1.4rem;cursor:pointer;">&times;</button><div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;"><div><img src="'+m.img+'" style="width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:10px;"><h3 style="margin:10px 0 3px;">'+m.name+'</h3><span style="color:#E8511A;font-size:.82rem;">'+m.category+'</span></div><div><h3 style="margin-bottom:14px;">Reserver '+m.name+'</h3><form id="booking-form"><div style="margin-bottom:12px;"><label style="display:block;font-size:.8rem;color:#888;margin-bottom:5px;">Date</label><input type="date" id="booking-start" min="'+today+'" value="'+today+'" style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#1a1a28;color:white;"></div><div style="margin-bottom:12px;"><label style="display:block;font-size:.8rem;color:#888;margin-bottom:5px;">Duree</label><select id="booking-duration" style="width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:#1a1a28;color:white;"><option value="1">1 Jour</option><option value="2">2 Jours</option><option value="3" selected>3 Jours</option><option value="5">5 Jours</option><option value="7">1 Semaine</option></select></div><div style="background:#111118;border-radius:8px;padding:12px;margin-bottom:12px;"><div style="display:flex;justify-content:space-between;font-size:.95rem;font-weight:700;border-top:1px solid rgba(255,255,255,0.1);padding-top:8px;"><span>Total</span><span id="summary-final" style="color:#E8511A;">'+m.price*3+' DT</span></div></div><button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;">Confirmer</button></form></div></div></div>';
  document.body.appendChild(o);$('#close-modal-btn').addEventListener('click',closeBookingModal);o.addEventListener('click',function(e){if(e.target===o)closeBookingModal()});
  var durSel=$('#booking-duration'),finalSpan=$('#summary-final');
  if(durSel)durSel.addEventListener('change',function(){var d=parseInt(durSel.value);var total=m.price*d;var disc=d>=7?0.15:d>=3?0.1:0;if(finalSpan)finalSpan.textContent=Math.round(total*(1-disc))+' DT'});
  var form=$('#booking-form');if(form)form.addEventListener('submit',function(e){e.preventDefault();alert('Reservation confirmee pour '+m.name+'!');closeBookingModal()});
}
function closeBookingModal(){var m=document.getElementById('booking-modal');if(m)m.remove()}

// ===== PRICING =====
function initPricing(){var c=$('#pricing-grid');if(!c)return;c.innerHTML=PLANS.map(function(p){return '<div class="pricing-card '+(p.popular?'popular':'')+'">'+(p.popular?'<div class="popular-badge">Populaire</div>':'')+'<div class="pricing-header"><h3>'+p.name+'</h3><div class="pricing-price"><span class="currency">DT</span><span class="amount">'+p.price+'</span><span class="period">/mois</span></div></div><ul class="pricing-features">'+p.features.map(function(f){return '<li><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'+f+'</li>'}).join('')+'</ul><a href="register.html?plan='+p.name.toLowerCase()+'" class="btn '+(p.popular?'btn-primary':'btn-outline')+'" style="width:100%;justify-content:center;">'+(p.popular?'Commencer':'Choisir')+'</a></div>'}).join('')}

// ===== AUTH =====
var ADMIN_EMAIL='admin@motogp.tn',ADMIN_PASS='admin123';
function getCurrentUser(){try{return JSON.parse(localStorage.getItem('motogp_user'))}catch(e){return null}}
function loginUser(email,pass){
  if(email===ADMIN_EMAIL&&pass===ADMIN_PASS){
    var u={name:'Admin',email:email,role:'admin',avatar:'AD'};
    localStorage.setItem('motogp_user',JSON.stringify(u));return{ok:true,role:'admin'}
  }
  var users=JSON.parse(localStorage.getItem('motogp_users')||'[]');
  var u=users.find(function(x){return x.email===email&&x.password===pass});
  if(u){localStorage.setItem('motogp_user',JSON.stringify({name:u.firstName+' '+u.lastName,email:u.email,role:'user',avatar:u.firstName[0]+u.lastName[0]}));return{ok:true,role:'user'}}
  return{ok:false}
}
function registerUser(data){
  var users=JSON.parse(localStorage.getItem('motogp_users')||'[]');
  if(users.find(function(x){return x.email===data.email}))return{ok:false,msg:'Email deja utilise'};
  users.push(data);localStorage.setItem('motogp_users',JSON.stringify(users));return{ok:true}
}
function logoutUser(){localStorage.removeItem('motogp_user');window.location.href='index.html'}
function updateNavAuth(){
  var user=getCurrentUser(),navLinks=$('.nav-links'),mobileLinks=$('.mobile-menu');
  if(!navLinks)return;
  var authBtns=navLinks.querySelector('.btn-outline');if(!authBtns)return;
  var parent=authBtns.parentElement;
  if(user){
    var dashLink=user.role==='admin'?'dashboard.html':'profile.html';
    parent.innerHTML='<a href="'+dashLink+'" class="btn btn-outline btn-sm" style="display:flex;align-items:center;gap:8px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'+user.name+'</a><a href="#" class="btn btn-primary btn-sm" onclick="logoutUser();return false;">Deconnexion</a>';
  }
}
function initLoginForm(){
  var form=$('#login-form');if(!form)return;
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var email=form.querySelector('[name="email"]').value.trim();
    var pass=form.querySelector('[name="password"]').value;
    var result=loginUser(email,pass);
    if(result.ok){
      if(result.role==='admin')window.location.href='dashboard.html';
      else window.location.href='profile.html';
    }else{
      var err=form.querySelector('.login-error');
      if(!err){err=document.createElement('p');err.className='login-error';err.style.cssText='color:#EF4444;font-size:.85rem;margin-bottom:12px;text-align:center;';form.insertBefore(err,form.firstChild)}
      err.textContent='Email ou mot de passe incorrect';
    }
  });
}
function initRegisterForm(){
  var form=$('#register-form');if(!form)return;
  var planSelect=form.querySelector('[name="plan"]');
  var planNameEl=document.getElementById('plan-name');
  var planPriceEl=document.getElementById('plan-price');
  var prices={essentiel:'29 DT/mois',premium:'59 DT/mois',vip:'99 DT/mois'};
  var names={essentiel:'Essentiel',premium:'Premium',vip:'VIP'};
  var params=new URLSearchParams(window.location.search);
  var pp=params.get('plan');
  if(pp&&planSelect){planSelect.value=pp;if(planNameEl)planNameEl.textContent=names[pp]||'Premium';if(planPriceEl)planPriceEl.textContent=prices[pp]||'59 DT/mois'}
  if(planSelect)planSelect.addEventListener('change',function(){if(planNameEl)planNameEl.textContent=names[planSelect.value]||'Premium';if(planPriceEl)planPriceEl.textContent=prices[planSelect.value]||'59 DT/mois'});
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var data={firstName:form.querySelector('[name="firstName"]').value,lastName:form.querySelector('[name="lastName"]').value,email:form.querySelector('[name="email"]').value,phone:form.querySelector('[name="phone"]').value,password:form.querySelector('[name="password"]').value,plan:form.querySelector('[name="plan"]').value};
    var result=registerUser(data);
    if(result.ok){
      document.getElementById('step-1').style.display='none';
      document.getElementById('step-2').style.display='block';
      document.getElementById('step-indicator-1').classList.remove('active');
      document.getElementById('step-indicator-1').classList.add('done');
      document.getElementById('step-line-1').classList.add('done');
      document.getElementById('step-indicator-2').classList.add('active');
      if(typeof gsap!=='undefined')gsap.from('#step-2',{y:20,opacity:0,duration:.6,ease:'power2.out'});
    }
  });
  var payForm=$('#payment-form');
  if(payForm)payForm.addEventListener('submit',function(e){
    e.preventDefault();
    document.getElementById('step-2').style.display='none';
    document.getElementById('step-indicator-2').classList.remove('active');
    document.getElementById('step-indicator-2').classList.add('done');
    document.getElementById('login-link').style.display='none';
    document.getElementById('success-screen').classList.add('active');
    document.querySelector('.steps').style.display='none';
    if(typeof gsap!=='undefined'){gsap.from('.success-icon',{scale:0,duration:.5,ease:'back.out(1.7)'});gsap.from('.success-screen h2',{y:15,opacity:0,duration:.4,delay:.2});gsap.from('.success-screen p',{y:15,opacity:0,duration:.4,delay:.35})}
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',function(){
  initLoader();initNavbar();initCursor();
  initMap();initScrollAnimations();initMotos3d();initMotosCatalogue();initPricing();
  initLoginForm();initRegisterForm();updateNavAuth();
  setTimeout(function(){$$('.reveal').forEach(function(el){if(getComputedStyle(el).opacity==='0')el.classList.add('no-gsap')})},2000);
});