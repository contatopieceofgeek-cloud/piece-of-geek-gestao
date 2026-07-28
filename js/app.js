/* ===================== STATE ===================== */
let state = { materials: [], products: [], sales: [], orders: [], customers: [], printFailures: [], listings: [], customOrders: [], settings: {} };
let currentTab = 'dashboard';
let currentMonth;
let currentYear = new Date().getFullYear();
let salesFilter = { platform:'', product:'', from:'', to:'' };
let stockTab = 'materiais';

const uid = () => Math.random().toString(36).slice(2,10);
const brl = (n) => (typeof n==='number' && isFinite(n) ? n : 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (n,d=2) => (typeof n==='number' && isFinite(n) ? n : 0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct = (n,d=1) => (isFinite(n)?n:0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+'%';
const monthLabel = (ym) => { const [y,m]=ym.split('-'); return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'long',year:'numeric'}); };
function monthDiff(fromYm, toYm){
  const [y1,m1] = fromYm.split('-').map(Number);
  const [y2,m2] = toYm.split('-').map(Number);
  return (y2-y1)*12 + (m2-m1);
}
function addMonths(ym, delta){
  const [y,m] = ym.split('-').map(Number);
  const d = new Date(y, m-1+delta, 1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
}
const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => localDateStr(new Date());
currentMonth = todayStr().slice(0,7);
const bizName = () => (state.settings.businessName && state.settings.businessName.trim()) || 'Piece of Geek 3D';
const bizLogoSrc = () => state.settings.businessLogo || 'img/logo.png';

/* ===================== SEED DATA ===================== */
function seedData(){
  const materials = [
    {id:uid(),name:'PLA',category:'Filamento',unit:'g',costPerUnit:0.08945,stock:0,lowStock:200,purchasePrice:89.45,purchaseQty:1000,purchaseUnit:'g'},
    {id:uid(),name:'PLA Branco',category:'Filamento',unit:'g',costPerUnit:0.08937,stock:0,lowStock:200,purchasePrice:178.74,purchaseQty:2000,purchaseUnit:'g'},
    {id:uid(),name:'PLA Preto',category:'Filamento',unit:'g',costPerUnit:0.0841,stock:0,lowStock:200,purchasePrice:168.20,purchaseQty:2000,purchaseUnit:'g'},
    {id:uid(),name:'PLA Duo Color',category:'Filamento',unit:'g',costPerUnit:0.12095,stock:0,lowStock:200,purchasePrice:120.95,purchaseQty:1000,purchaseUnit:'g'},
    {id:uid(),name:'Plástico Bolha',category:'Embalagem',unit:'m',costPerUnit:0.5453,stock:0,lowStock:5,purchasePrice:54.53,purchaseQty:100,purchaseUnit:'m',isBubbleWrap:true},
    {id:uid(),name:'Caixa Pequena',category:'Embalagem',unit:'un',costPerUnit:1.4396,stock:0,lowStock:5,purchasePrice:35.99,purchaseQty:25,purchaseUnit:'un',isBox:true},
    {id:uid(),name:'Caixa Média',category:'Embalagem',unit:'un',costPerUnit:1.9112,stock:0,lowStock:5,purchasePrice:47.78,purchaseQty:25,purchaseUnit:'un',isBox:true},
    {id:uid(),name:'Caixa Grande',category:'Embalagem',unit:'un',costPerUnit:4.94,stock:0,lowStock:3,purchasePrice:49.40,purchaseQty:10,purchaseUnit:'un',isBox:true},
  ];
  const machines = [
    {id:uid(),name:'Bambu Lab A1 Mini',price:2279,residual:0,lifeHours:4000,energyCostPerHour:0.0704,powerConsumptionKw:0.1,maintenanceCostPerHour:0.25,installmentValue:108.523809,installmentsTotal:21,startMonth:'2026-07',maintenanceLog:[]},
  ];
  const p = (name,filamentType,weightG,timeH,boxType,practicedPrice) => ({
    id:uid(),name,filaments:[{materialName:filamentType,weightG}],timeH,bubbleWrapM:0.5,boxType,failureMarginPct:0.10,practicedPrice,stock:0,machineId:machines[0].id
  });
  const products = [
    p('Espaço Cafe','PLA',100,3.48,'Caixa Pequena',35),
    p('Porta Cha','PLA',134.65,8.72,'Caixa Pequena',50),
    p('Kit Cantinho do Café','PLA',234.65,12.2,'Caixa Pequena',80),
    p('Cubo Organizado - Suporte de Headset e Celular','PLA',161.66,7.4,'Caixa Pequena',55),
    p('Office Pro Kit','PLA',231.78,7.35,'Caixa Pequena',72),
    p('Kit Escritorio','PLA',393.44,14.75,'Caixa Média',125),
    p('Skullflame - Headphone Holder','PLA Duo Color',125.36,5.7,'Caixa Pequena',55),
    p('Caster Grip - Controller Holder','PLA Duo Color',64.23,7.566667,'Caixa Pequena',30),
    p('Kit Games','PLA Duo Color',189.59,13.266667,'Caixa Média',82),
    p('Flexi Undead Wyvern','PLA Duo Color',78.59,3.93,'Caixa Pequena',36),
    p('Flexi Amphiptere','PLA Duo Color',69.18,3.68,'Caixa Pequena',35),
    p('Kit Dragão Articulado','PLA Duo Color',147.77,7.61,'Caixa Média',65),
    p('Skeleton Ankylosaurus','PLA',36.05,2.12,'Caixa Pequena',20),
    p('Skeleton T-Rex','PLA',26,1.58,'Caixa Pequena',20),
    p('Skeleton Triceratops','PLA',33.33,2,'Caixa Pequena',20),
    p('Skeleton Velociraptor','PLA',24.59,1.58,'Caixa Pequena',20),
    p('Skeleton Parasaurolophus','PLA',47.98,2.78,'Caixa Pequena',20),
    p('Skeleton Stegosaurus','PLA',38.24,2.47,'Caixa Pequena',20),
    p('Kit Dino','PLA',206.19,12.53,'Caixa Média',75),
    p('Helix Fidget','PLA Duo Color',100.72,4.9,'Caixa Pequena',45),
    p('Kit Pintura','PLA',177.29,7.17,'Caixa Pequena',60),
    p('Office Essential Kit','PLA',92.75,3.13,'Caixa Pequena',35),
    p('ROYAL Tray and Container','PLA',123.02,4.87,'Caixa Pequena',45),
  ];
  const settings = {
    businessName:'Piece of Geek 3D',
    businessLogo:null,
    markupMultiplier:2.5,
    energyTariffPerKwh:0.75,
    meiRevenueLimit:81000,
    monthlyGoal:0,
    dasPaid:{},
    dasDueDay:20,
    dasEnabled:false,
    pixKey:'',
    pixMerchantName:'Piece of Geek 3D',
    pixMerchantCity:'Sao Paulo',
    whatsapp:'(11) 99296-5296',
    instagram:'piece.of.geek',
    mlClientId:'',
    mlConnected:false,
    printHoursPerDay:8,
    machines,
    expenses:[
      {id:uid(),name:'Assinatura STLFLIX',value:79.9},
      {id:uid(),name:'Shopee Ads',value:100},
    ],
    taxes:[],
    investments:[],
    platforms:[
      {id:uid(),name:'Mercado Livre',pct:19,fixed:0},
      {id:uid(),name:'Shopee',pct:14,fixed:26,tiers:[
        {max:7.99,pct:50,fixed:0},
        {max:79.99,pct:20,fixed:4},
        {max:99.99,pct:14,fixed:16},
        {max:199.99,pct:14,fixed:20},
        {max:Infinity,pct:14,fixed:26},
      ], freightCapTiers:[
        {max:79.99,cap:20},
        {max:199.99,cap:30},
        {max:Infinity,cap:40},
      ]},
      {id:uid(),name:'Site Próprio',pct:0,fixed:0},
      {id:uid(),name:'Outro',pct:0,fixed:0},
    ],
    reserveGoals:[
      {id:uid(),name:'Recompra de Filamento',goal:150,balance:0,autoMode:'pct_profit',autoPct:0},
      {id:uid(),name:'Fundo de Emergência',goal:30,balance:0,autoMode:'pct_profit',autoPct:0},
      {id:uid(),name:'Fundo Nova Máquina (Depreciação)',goal:0,balance:0,autoMode:'cost_depreciation',autoPct:0},
      {id:uid(),name:'Fundo de Expansão (Lucro Retido)',goal:0,balance:0,autoMode:'pct_profit',autoPct:0},
    ],
    monthlyCloses:{},
    monthlySnapshots:{},
    lastActiveMonth: todayStr().slice(0,7),
    laborHourlyRate:25,
  };
  return { materials, products, sales:[], orders:[], customers:[], printFailures:[], listings:[], settings };
}

/* ===================== STORAGE ===================== */
function migrateMaterials(materials){
  let hasBubbleWrap = materials.some(m=>m.isBubbleWrap);
  materials.forEach(m=>{
    if(m.isBox==null) m.isBox = m.category==='Embalagem' && m.name.startsWith('Caixa');
    if(m.isBubbleWrap==null){
      if(!hasBubbleWrap && m.name==='Plástico Bolha'){ m.isBubbleWrap = true; hasBubbleWrap = true; }
      else m.isBubbleWrap = false;
    }
    if(m.lengthCm==null) m.lengthCm = 0;
    if(m.widthCm==null) m.widthCm = 0;
    if(m.heightCm==null) m.heightCm = 0;
    if(m.isTape==null) m.isTape = false;
    if(m.materialType==null){
      const firstWord = (m.name||'').split(' ')[0];
      m.materialType = MATERIAL_TYPE_PRESETS.includes(firstWord) ? firstWord : '';
    }
    if(m.brand==null) m.brand = '';
    if(m.color==null) m.color = '';
    if(m.colorName==null) m.colorName = '';
    if(m.isDualColor==null) m.isDualColor = false;
    if(m.color2==null) m.color2 = '';
    if(m.colorName2==null) m.colorName2 = '';
    if(m.toolType==null) m.toolType = '';
    if(m.usefulLifeUses==null) m.usefulLifeUses = 0;
  });
  return materials;
}
function migrateProducts(products){
  const defaultMachineId = (state.settings.machines && state.settings.machines[0]) ? state.settings.machines[0].id : null;
  products.forEach(prod=>{
    if(!prod.filaments || !prod.filaments.length){
      prod.filaments = [{ materialName: prod.filamentType || (state.materials.find(m=>m.category==='Filamento')||{}).name || 'PLA', weightG: prod.weightG || 0 }];
    }
    if(!prod.machineId && defaultMachineId) prod.machineId = defaultMachineId;
    if(!prod.laborActions){
      prod.laborActions = prod.laborMinutes ? [{action:'Mão de obra', minutes:prod.laborMinutes}] : [];
      delete prod.laborMinutes;
    }
    if(prod.lengthCm==null) prod.lengthCm = 0;
    if(prod.widthCm==null) prod.widthCm = 0;
    if(prod.heightCm==null) prod.heightCm = 0;
    if(prod.tapeM==null) prod.tapeM = 0;
    if(!prod.toolsUsed) prod.toolsUsed = [];
    if(prod.estimatedFreightMl==null) prod.estimatedFreightMl = 0;
    if(prod.estimatedFreightShopee==null) prod.estimatedFreightShopee = 0;
    if(!prod.modelOrigin) prod.modelOrigin = 'proprio';
    if(prod.modelLicense==null) prod.modelLicense = '';
    if(prod.modelSourceUrl==null) prod.modelSourceUrl = '';
  });
  return products;
}
function migratePrintFailures(list){
  list.forEach(f=>{
    if(!f.outcome) f.outcome = 'failure';
    if(f.qty==null) f.qty = 1;
  });
  return list;
}
function migrateCustomOrders(list){
  list.forEach(o=>{
    if(!o.filaments || !o.filaments.length) o.filaments = [];
    if(!Array.isArray(o.laborActions)) o.laborActions = [];
    if(!Array.isArray(o.toolsUsed)) o.toolsUsed = [];
    if(o.bubbleWrapM==null) o.bubbleWrapM = 0;
    if(o.tapeM==null) o.tapeM = 0;
    if(o.boxType==null) o.boxType = '';
    if(o.failureMarginPct==null) o.failureMarginPct = 0.10;
    if(o.practicedPrice==null) o.practicedPrice = 0;
    if(!o.modelOrigin) o.modelOrigin = 'proprio';
    if(o.modelLicense==null) o.modelLicense = '';
    if(o.modelSourceUrl==null) o.modelSourceUrl = '';
    if(o.modelFileName==null) o.modelFileName = '';
    if(o.orderNumber==null) o.orderNumber = '';
    if(o.orderDate==null) o.orderDate = todayStr();
    if(o.customerId==null) o.customerId = '';
    if(o.qty==null) o.qty = 1;
    if(o.sizeLabel==null) o.sizeLabel = '';
    if(o.pieceText==null) o.pieceText = '';
    if(o.baseColor==null) o.baseColor = '';
    if(o.detailColor==null) o.detailColor = '';
    if(o.finish==null) o.finish = '';
    if(o.deliveryDate==null) o.deliveryDate = '';
    if(o.depositPaid==null) o.depositPaid = 0;
    if(o.approved==null) o.approved = false;
    if(o.approvalDate==null) o.approvalDate = '';
    if(o.approvedBy==null) o.approvedBy = '';
    if(o.printDate==null) o.printDate = '';
    if(o.nozzleTempC==null) o.nozzleTempC = 0;
    if(o.bedTempC==null) o.bedTempC = 0;
    if(o.layerHeightMm==null) o.layerHeightMm = 0;
    if(o.nozzleDiameterMm==null) o.nozzleDiameterMm = 0.4;
    if(o.walls==null) o.walls = 0;
    if(o.infillPct==null) o.infillPct = 0;
    if(o.infillPattern==null) o.infillPattern = '';
    if(o.printSpeedMmS==null) o.printSpeedMmS = 0;
    if(o.orientation==null) o.orientation = '';
    if(!o.supports) o.supports = 'nao';
    if(o.brimRaft==null) o.brimRaft = '';
    if(o.colorChangeLayer==null) o.colorChangeLayer = '';
    if(o.colorChangeHeightMm==null) o.colorChangeHeightMm = '';
    if(o.realWeightG==null) o.realWeightG = 0;
    if(o.realTimeH==null) o.realTimeH = 0;
    if(o.realCost==null) o.realCost = 0;
    if(o.realObservation==null) o.realObservation = '';
    if(o.result==null) o.result = '';
    if(o.failurePctReason==null) o.failurePctReason = '';
    if(o.postProcessingDone==null) o.postProcessingDone = '';
    ['checkTextConferred','checkNoLayerFailure','checkBurrRemoved','checkHoleFree','checkPieceClean','checkPackaged'].forEach(k=>{ if(o[k]==null) o[k] = false; });
    if(!o.createdAt) o.createdAt = new Date().toISOString();
  });
  return list;
}
function migrateSettings(settings){
  if(Array.isArray(settings.platforms)){
    const shopee = settings.platforms.find(p=>p.name==='Shopee');
    if(shopee && !shopee.tiers){
      shopee.tiers = [
        {max:7.99,pct:50,fixed:0},
        {max:79.99,pct:20,fixed:4},
        {max:99.99,pct:14,fixed:16},
        {max:199.99,pct:14,fixed:20},
        {max:Infinity,pct:14,fixed:26},
      ];
    }
    if(shopee && !shopee.freightCapTiers){
      shopee.freightCapTiers = [
        {max:79.99,cap:20},
        {max:199.99,cap:30},
        {max:Infinity,cap:40},
      ];
    }
    // JSON não tem representação pra Infinity — todo save/load vira null aqui,
    // o que quebrava o cálculo/exibição da última faixa. Repara pra Infinity de novo.
    settings.platforms.forEach(plat=>{
      if(Array.isArray(plat.tiers) && plat.tiers.length){
        const last = plat.tiers[plat.tiers.length-1];
        if(last.max==null || !isFinite(last.max)) last.max = Infinity;
      }
      if(Array.isArray(plat.freightCapTiers) && plat.freightCapTiers.length){
        const last = plat.freightCapTiers[plat.freightCapTiers.length-1];
        if(last.max==null || !isFinite(last.max)) last.max = Infinity;
      }
    });
  }
  if(settings.minMarginPct==null) settings.minMarginPct = 25;
  if(settings.businessName==null) settings.businessName = 'Piece of Geek 3D';
  if(settings.businessLogo===undefined) settings.businessLogo = null;
  if(!Array.isArray(settings.expenses)){
    settings.expenses = settings.opExpenses ? [{id:uid(),name:'Despesas operacionais (migrado)',value:settings.opExpenses}] : [];
  }
  if(!Array.isArray(settings.taxes)){
    settings.taxes = settings.meiTax ? [{id:uid(),name:'Imposto MEI (DAS)',value:settings.meiTax}] : [];
  }
  if(Array.isArray(settings.reserveGoals)){
    settings.reserveGoals.forEach(g=>{
      if(!g.autoMode) g.autoMode = (g.name==='Fundo Nova Máquina (Depreciação)') ? 'cost_depreciation' : 'pct_profit';
      if(g.autoPct==null) g.autoPct = 0;
    });
  }
  if(!Array.isArray(settings.machines)){
    if(settings.machine){
      if(!settings.machine.startMonth){
        const elapsedSoFar = Math.max(0, (settings.machine.installmentsTotal||0) - (settings.machine.installmentsRemaining!=null ? settings.machine.installmentsRemaining : settings.machine.installmentsTotal||0));
        settings.machine.startMonth = addMonths(currentMonth, -elapsedSoFar);
      }
      settings.machines = [{ id:uid(), ...settings.machine, energyCostPerHour: settings.machine.energyCostPerHour!=null ? settings.machine.energyCostPerHour : (settings.energyCostPerHour!=null?settings.energyCostPerHour:0.0704) }];
      delete settings.machines[0].installmentsRemaining;
    } else {
      settings.machines = [];
    }
  }
  settings.machines.forEach(m=>{ if(m.energyCostPerHour==null) m.energyCostPerHour = 0.0704; if(m.powerConsumptionKw==null) m.powerConsumptionKw = 0; if(!m.id) m.id = uid(); if(!Array.isArray(m.maintenanceLog)) m.maintenanceLog = []; if(m.maintenanceCostPerHour==null) m.maintenanceCostPerHour = 0.25; });
  if(settings.energyTariffPerKwh==null) settings.energyTariffPerKwh = 0.75;
  if(settings.meiRevenueLimit==null) settings.meiRevenueLimit = 81000;
  if(settings.monthlyGoal==null) settings.monthlyGoal = 0;
  if(!settings.dasPaid) settings.dasPaid = {};
  if(settings.dasDueDay==null) settings.dasDueDay = 20;
  if(settings.dasEnabled==null) settings.dasEnabled = false;
  if(settings.pixKey==null) settings.pixKey = '';
  if(settings.pixMerchantName==null) settings.pixMerchantName = 'Piece of Geek 3D';
  if(settings.pixMerchantCity==null) settings.pixMerchantCity = 'Sao Paulo';
  if(settings.whatsapp==null) settings.whatsapp = '(11) 99296-5296';
  if(settings.instagram==null) settings.instagram = 'piece.of.geek';
  if(settings.mlClientId==null) settings.mlClientId = '';
  if(settings.mlConnected==null) settings.mlConnected = false;
  if(settings.printHoursPerDay==null) settings.printHoursPerDay = 8;
  delete settings.machine;
  delete settings.machineCostPerHour;
  delete settings.energyCostPerHour;
  if(!Array.isArray(settings.investments)) settings.investments = [];
  settings.investments.forEach(inv=>{ if(!inv.paymentType) inv.paymentType = 'avista'; if(!inv.category) inv.category = 'Outros'; });
  if(!settings.monthlyCloses) settings.monthlyCloses = {};
  if(!settings.monthlySnapshots) settings.monthlySnapshots = {};
  if(!settings.lastActiveMonth) settings.lastActiveMonth = todayStr().slice(0,7);
  delete settings.opExpenses;
  delete settings.meiTax;
  delete settings.opExpensesBreakdown;
  return settings;
}
/* Usa window.storage quando disponível (rodando como Artifact dentro do claude.ai).
   Fora daquele ambiente (arquivo aberto direto no navegador), usa IndexedDB —
   limite de armazenamento muito maior que localStorage (centenas de MB, em vez de ~5-10MB).
   localStorage vira só um fallback de emergência caso IndexedDB não esteja disponível. */
const STORAGE_PREFIX = 'pog3d:';
const IDB_NAME = 'piece_of_geek_db';
const IDB_STORE = 'kv';
const hasCloudStorage = () => (typeof window.storage !== 'undefined' && window.storage && typeof window.storage.get === 'function');

let idbPromise = null;
function openIdb(){
  if(idbPromise) return idbPromise;
  idbPromise = new Promise((resolve,reject)=>{
    if(!window.indexedDB){ reject(new Error('sem indexeddb')); return; }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = ()=>{ if(!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
  return idbPromise;
}
async function idbGet(key){
  const db = await openIdb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = ()=>resolve(req.result!==undefined ? req.result : null);
    req.onerror = ()=>reject(req.error);
  });
}
async function idbSet(key, value){
  const db = await openIdb();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = ()=>resolve(true);
    tx.onerror = ()=>reject(tx.error);
  });
}
let idbMigrationDone = false;
async function migrateLocalStorageToIdb(){
  if(idbMigrationDone) return;
  idbMigrationDone = true;
  try{
    const keys = ['materials','products','sales','orders','customers','settings'];
    for(const key of keys){
      const existing = await idbGet(key).catch(()=>null);
      if(existing==null){
        const legacy = localStorage.getItem(STORAGE_PREFIX+key);
        if(legacy!=null) await idbSet(key, legacy).catch(()=>{});
      }
    }
  }catch(e){ /* IndexedDB indisponível — segue usando localStorage normalmente */ }
}

/* ---------- Sincronização entre dispositivos (Supabase, opcional) ---------- */
let sbClient = null;
let syncStatus = { configured:false, email:null };
function getSyncConfig(){
  return { url: localStorage.getItem('pog3d_sb_url')||'', key: localStorage.getItem('pog3d_sb_key')||'' };
}
function setSyncConfig(url,key){ localStorage.setItem('pog3d_sb_url',url); localStorage.setItem('pog3d_sb_key',key); }
function clearSyncConfig(){ localStorage.removeItem('pog3d_sb_url'); localStorage.removeItem('pog3d_sb_key'); sbClient=null; }
function initSupabase(){
  const cfg = getSyncConfig();
  if(!cfg.url || !cfg.key) return null;
  if(!sbClient){
    try{ sbClient = window.supabase.createClient(cfg.url, cfg.key); }catch(e){ return null; }
  }
  return sbClient;
}
async function getSyncUser(){
  const client = initSupabase();
  if(!client) return null;
  try{
    const { data } = await client.auth.getSession();
    return data && data.session ? data.session.user : null;
  }catch(e){ return null; }
}
async function refreshSyncStatus(){
  const cfg = getSyncConfig();
  syncStatus.configured = !!(cfg.url && cfg.key);
  syncStatus.email = syncStatus.configured ? (await getSyncUser())?.email || null : null;
}

/* ---------- Atualização em tempo real entre dispositivos (Supabase Realtime) ----------
   Assina mudanças na tabela app_data pra puxar e re-renderizar automaticamente quando
   outro dispositivo salvar algo, em vez de exigir um F5 manual pra ver o dado novo.
   Precisa da replicação Realtime ligada pra tabela app_data no projeto Supabase
   (ver ALTER PUBLICATION no supabase/schema.sql e no passo a passo de conexão). */
let syncChannel = null;
let lastLocalSaveAt = 0;
let pendingRemoteReload = false;
let remoteRefreshTimer = null;
async function startRealtimeSync(){
  const client = initSupabase();
  if(!client || syncChannel) return;
  const user = await getSyncUser();
  if(!user) return;
  syncChannel = client
    .channel('app_data_changes_'+user.id)
    .on('postgres_changes', { event:'*', schema:'public', table:'app_data', filter:`user_id=eq.${user.id}` }, onRemoteDataChange)
    .subscribe();
}
function stopRealtimeSync(){
  if(syncChannel){ try{ syncChannel.unsubscribe(); }catch(e){} syncChannel = null; }
}
function onRemoteDataChange(){
  if(Date.now() - lastLocalSaveAt < 3000) return; // provavelmente eco do nosso próprio save
  clearTimeout(remoteRefreshTimer);
  remoteRefreshTimer = setTimeout(()=>{
    if(document.getElementById('overlay').classList.contains('show')){
      pendingRemoteReload = true;
      toast('Dados atualizados em outro dispositivo — serão aplicados ao fechar esta janela');
    } else {
      refreshFromRemote();
    }
  }, 800);
}

// Timestamp local de cada chave (guardado ao lado do valor no IndexedDB/localStorage),
// pra comparar com o updated_at do Supabase antes de aceitar o dado remoto — sem isso,
// uma edição feita offline podia ser sobrescrita silenciosamente ao reabrir o app já
// online (o storageGet antigo sempre preferia a nuvem, sem checar qual era mais recente).
async function getLocalWithTimestamp(key){
  try{
    await migrateLocalStorageToIdb();
    const val = await idbGet(key);
    const updatedAt = await idbGet(key+'__updatedAt');
    if(val!=null) return { value: val, updatedAt };
  }catch(e){ /* segue pro fallback localStorage */ }
  return { value: localStorage.getItem(STORAGE_PREFIX+key), updatedAt: localStorage.getItem(STORAGE_PREFIX+key+'__updatedAt') };
}
async function storageGet(key){
  if(hasCloudStorage()){
    try{ const r = await window.storage.get(key); return r ? r.value : null; }catch(e){ return null; }
  }
  const local = await getLocalWithTimestamp(key);
  if(syncStatus.configured && syncStatus.email){
    try{
      const client = initSupabase();
      const user = await getSyncUser();
      if(client && user){
        const { data, error } = await client.from('app_data').select('value,updated_at').eq('user_id',user.id).eq('key',key).maybeSingle();
        if(!error){
          if(!data) return local.value;
          const remoteIsNewer = !local.updatedAt || new Date(data.updated_at) > new Date(local.updatedAt);
          if(remoteIsNewer) return data.value;
          // Local tem uma edição mais recente que a nuvem (ex: feita offline) — usa o
          // local e reenvia pra nuvem em segundo plano, pra não perder essa edição.
          lastLocalSaveAt = Date.now();
          client.from('app_data').upsert(
            { user_id:user.id, key, value:local.value, updated_at:local.updatedAt },
            { onConflict:'user_id,key' }
          ).then(()=>{}).catch(()=>{});
          return local.value;
        }
      }
    }catch(e){ /* sem conexão — cai pro cache local */ }
  }
  return local.value;
}
async function storageSet(key, value){
  if(hasCloudStorage()){
    try{ await window.storage.set(key, value); return true; }catch(e){ /* fall through to local storage as backup */ }
  }
  const nowIso = new Date().toISOString();
  let localOk = false;
  try{ await idbSet(key, value); await idbSet(key+'__updatedAt', nowIso); localOk = true; }
  catch(e){ try{ localStorage.setItem(STORAGE_PREFIX+key, value); localStorage.setItem(STORAGE_PREFIX+key+'__updatedAt', nowIso); localOk = true; }catch(e2){} }
  if(syncStatus.configured && syncStatus.email){
    try{
      const client = initSupabase();
      const user = await getSyncUser();
      if(client && user){
        lastLocalSaveAt = Date.now();
        await client.from('app_data').upsert(
          { user_id:user.id, key, value, updated_at:nowIso },
          { onConflict:'user_id,key' }
        );
      }
    }catch(e){ /* sem conexão agora — fica salvo local, sincroniza no próximo save online */ }
  }
  return localOk;
}

async function applyLoadedState(){
  try{
    const [m,p,s,o,cu,c,pf,li,co] = await Promise.all([
      storageGet('materials'), storageGet('products'), storageGet('sales'), storageGet('orders'), storageGet('customers'), storageGet('settings'), storageGet('printFailures'), storageGet('listings'), storageGet('customOrders'),
    ]);
    if(!m && !p && !s && !o && !cu && !c && !pf && !li && !co){
      state = seedData();
      await saveAll();
    } else {
      const seed = seedData();
      state.materials = m ? JSON.parse(m) : seed.materials;
      migrateMaterials(state.materials);
      state.sales = s ? JSON.parse(s) : [];
      state.orders = o ? JSON.parse(o) : [];
      state.customers = cu ? JSON.parse(cu) : [];
      state.printFailures = pf ? migratePrintFailures(JSON.parse(pf)) : [];
      state.listings = li ? JSON.parse(li) : [];
      state.customOrders = co ? migrateCustomOrders(JSON.parse(co)) : [];
      const parsedSettings = c ? migrateSettings(JSON.parse(c)) : null;
      state.settings = parsedSettings ? Object.assign({}, seed.settings, parsedSettings) : seed.settings;
      if(!state.settings.platforms || !state.settings.platforms.length) state.settings.platforms = seed.settings.platforms;
      state.products = p ? JSON.parse(p) : seed.products;
      migrateProducts(state.products);
      backfillMachineHours();
      snapshotPastMonths();
    }
  }catch(e){
    console.error('storage load error', e);
    state = seedData();
  }
}
async function loadState(){
  await refreshSyncStatus();
  await applyLoadedState();
  render();
  if(!hasCloudStorage()){
    if(syncStatus.email) toast(`Sincronizado como ${syncStatus.email}`);
    else toast('Salvando no navegador (IndexedDB) — evite navegação anônima para não perder dados.');
  }
  if(syncStatus.configured && syncStatus.email) startRealtimeSync();
  checkMlAuthRedirect();
}
// Puxa os dados de novo (sem o toast de primeira carga) quando outro dispositivo
// salva algo — chamado pelo listener do Supabase Realtime, ver startRealtimeSync().
async function refreshFromRemote(){
  await applyLoadedState();
  render();
  toast('Dados atualizados a partir de outro dispositivo');
}
async function saveMaterials(){ const ok = await storageSet('materials', JSON.stringify(state.materials)); if(!ok) toast('Erro ao salvar estoque','err'); }
async function saveProducts(){ const ok = await storageSet('products', JSON.stringify(state.products)); if(!ok) toast('Erro ao salvar produtos','err'); }
async function saveSales(){ const ok = await storageSet('sales', JSON.stringify(state.sales)); if(!ok) toast('Erro ao salvar vendas','err'); }
async function saveOrders(){ const ok = await storageSet('orders', JSON.stringify(state.orders)); if(!ok) toast('Erro ao salvar encomendas','err'); }
async function savePrintFailures(){ const ok = await storageSet('printFailures', JSON.stringify(state.printFailures)); if(!ok) toast('Erro ao salvar falhas de impressão','err'); }
async function saveListings(){ const ok = await storageSet('listings', JSON.stringify(state.listings)); if(!ok) toast('Erro ao salvar anúncios','err'); }
async function saveCustomers(){ const ok = await storageSet('customers', JSON.stringify(state.customers)); if(!ok) toast('Erro ao salvar clientes','err'); }
async function saveCustomOrders(){ const ok = await storageSet('customOrders', JSON.stringify(state.customOrders)); if(!ok) toast('Erro ao salvar personalizados','err'); }
async function saveSettings(){ const ok = await storageSet('settings', JSON.stringify(state.settings)); if(!ok) toast('Erro ao salvar configurações','err'); }
async function saveAll(){ await Promise.all([saveMaterials(),saveProducts(),saveSales(),saveOrders(),saveCustomers(),savePrintFailures(),saveListings(),saveCustomOrders(),saveSettings()]); }

/* ===================== TOAST ===================== */
function toast(msg,type=''){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast'+(type==='err'?' err':'');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=>el.remove(),300); }, 2800);
}

/* ===================== CALC HELPERS ===================== */
function materialByName(name){ return state.materials.find(m=>m.name===name); }
function boxCost(boxType){ const m = materialByName(boxType); return m ? m.costPerUnit : 0; }
function filamentCost(type){ const m = materialByName(type); return m ? m.costPerUnit : 0; }
function bubbleWrapMaterial(){ return state.materials.find(m=>m.isBubbleWrap); }
function bubbleWrapUnitCost(){ const m = bubbleWrapMaterial(); return m ? m.costPerUnit : 0; }
function tapeMaterial(){ return state.materials.find(m=>m.isTape); }
function tapeUnitCost(){ const m = tapeMaterial(); return m ? m.costPerUnit : 0; }
function toolCostPerUse(tool){ return tool ? tool.purchasePrice / (tool.usefulLifeUses||1) : 0; }
function boxFitsDimensions(box, lengthCm, widthCm, heightCm){
  if(!box || !box.lengthCm || !box.widthCm || !box.heightCm) return null;
  const prodDims = [lengthCm, widthCm, heightCm].sort((a,b)=>b-a);
  const boxDims = [box.lengthCm, box.widthCm, box.heightCm].sort((a,b)=>b-a);
  return prodDims[0]<=boxDims[0] && prodDims[1]<=boxDims[1] && prodDims[2]<=boxDims[2];
}
function bestFittingBox(lengthCm, widthCm, heightCm){
  const boxes = state.materials.filter(m=>m.category==='Embalagem' && m.isBox && m.lengthCm>0 && m.widthCm>0 && m.heightCm>0);
  const fitting = boxes.filter(b=>boxFitsDimensions(b, lengthCm, widthCm, heightCm));
  if(!fitting.length) return null;
  fitting.sort((a,b)=>(a.lengthCm*a.widthCm*a.heightCm)-(b.lengthCm*b.widthCm*b.heightCm));
  return fitting[0];
}

function totalWeight(prod){ return (prod.filaments||[]).reduce((a,f)=>a+(f.weightG||0),0); }
function findMachine(machineId){
  const machines = state.settings.machines||[];
  return machines.find(m=>m.id===machineId) || machines[0] || null;
}
function machineDeprCostPerHour(machine){
  if(!machine) return 0;
  const life = machine.lifeHours||1;
  return Math.max(0, (machine.price - (machine.residual||0)) / life);
}
function machineEnergyCostPerHour(machine){
  if(!machine) return 0;
  if(machine.powerConsumptionKw>0) return machine.powerConsumptionKw * (state.settings.energyTariffPerKwh||0);
  return machine.energyCostPerHour||0;
}
function machineMaintenanceCostPerHour(machine){
  if(!machine) return 0;
  return machine.maintenanceCostPerHour!=null ? machine.maintenanceCostPerHour : 0.25;
}
function calcProduct(prod){
  const s = state.settings;
  const machine = findMachine(prod.machineId);
  const materialCost = (prod.filaments||[]).reduce((a,f)=>a+(f.weightG||0)*filamentCost(f.materialName),0);
  const energyCost = prod.timeH * machineEnergyCostPerHour(machine);
  const bCost = boxCost(prod.boxType);
  const bubbleCost = prod.bubbleWrapM * bubbleWrapUnitCost();
  const tapeCost = (prod.tapeM||0) * tapeUnitCost();
  const embalagemCost = bCost + bubbleCost + tapeCost;
  const depreciation = prod.timeH * machineDeprCostPerHour(machine);
  const maintenance = prod.timeH * machineMaintenanceCostPerHour(machine);
  const totalLaborMinutes = (prod.laborActions||[]).reduce((a,x)=>a+(x.minutes||0),0);
  const laborCost = (totalLaborMinutes/60) * (s.laborHourlyRate||0);
  const toolsCost = (prod.toolsUsed||[]).reduce((a,t)=>a+(t.uses||0)*toolCostPerUse(state.materials.find(x=>x.id===t.toolId)),0);
  // Embalagem fica de fora (caixa/bolha não são gastos numa impressão que falha),
  // mas metade da mão de obra entra — setup e a descoberta da falha consomem tempo.
  const failureCost = (materialCost + energyCost + depreciation + laborCost*0.5) * prod.failureMarginPct;
  const totalCost = materialCost + energyCost + embalagemCost + depreciation + maintenance + failureCost + laborCost + toolsCost;
  const defaultMargin = 1 - (1/(s.markupMultiplier||2.5));
  const desiredMargin = prod.desiredMarginPct!=null ? Math.min(0.95,Math.max(0,prod.desiredMarginPct/100)) : defaultMargin;
  const suggestedPrice = desiredMargin < 1 ? totalCost / (1 - desiredMargin) : totalCost * (s.markupMultiplier||2.5);
  const practicedPrice = prod.practicedPrice || suggestedPrice;
  const marginValue = practicedPrice - totalCost;
  const marginPct = practicedPrice > 0 ? (marginValue/practicedPrice)*100 : 0;
  // Se já buscamos a taxa real do ML pra esse produto (ver mlRealFeePct), usa ela
  // em vez da % manual de Configurações — mesma fórmula, só troca de onde vem a taxa.
  const suggestedPriceMl = prod.mlRealFeePct!=null
    ? (suggestedPrice + (prod.estimatedFreightMl||0)) / (1 - Math.min(0.95, prod.mlRealFeePct/100))
    : suggestedPriceForPlatform(suggestedPrice, 'Mercado Livre', prod.estimatedFreightMl||0);
  const suggestedPriceShopee = suggestedPriceForPlatform(suggestedPrice, 'Shopee', prod.estimatedFreightShopee||0);
  const practicedPriceMl = prod.practicedPriceMl || suggestedPriceMl;
  const practicedPriceShopee = prod.practicedPriceShopee || suggestedPriceShopee;
  const suggestedPriceExtra = {}, practicedPriceExtra = {};
  extraListingPlatforms().forEach(plat=>{
    suggestedPriceExtra[plat.id] = suggestedPriceForPlatform(suggestedPrice, plat.name);
    practicedPriceExtra[plat.id] = (prod.practicedPriceExtra||{})[plat.id] || suggestedPriceExtra[plat.id];
  });
  const estimatedShopeeFreightCap = shopeeFreightCap(practicedPriceShopee);
  const mlFeeAmount = prod.mlRealFeePct!=null
    ? practicedPriceMl * Math.min(0.95, prod.mlRealFeePct/100)
    : feeAtPrice('Mercado Livre', practicedPriceMl);
  const shopeeFeeAmount = feeAtPrice('Shopee', practicedPriceShopee);
  const effectiveFreightMl = prod.estimatedFreightMl||0;
  // A Shopee subsidia o frete até o teto da faixa de preço (freightCapTiers) — o
  // vendedor só paga o que passar disso. Sem frete real informado, o custo é 0
  // (assume que o subsídio cobre), não o teto inteiro.
  const shopeeFreightReal = prod.estimatedFreightShopee||0;
  const effectiveFreightShopee = Math.max(0, shopeeFreightReal - (estimatedShopeeFreightCap||0));
  const netReceiptMl = practicedPriceMl - mlFeeAmount - effectiveFreightMl;
  const netReceiptShopee = practicedPriceShopee - shopeeFeeAmount - effectiveFreightShopee;
  const mlFeePct = practicedPriceMl > 0 ? (mlFeeAmount/practicedPriceMl)*100 : 0;
  const shopeeFeePct = practicedPriceShopee > 0 ? (shopeeFeeAmount/practicedPriceShopee)*100 : 0;
  const marginMlValue = netReceiptMl - totalCost;
  const marginShopeeValue = netReceiptShopee - totalCost;
  const marginMlPct = practicedPriceMl > 0 ? (marginMlValue/practicedPriceMl)*100 : 0;
  const marginShopeePct = practicedPriceShopee > 0 ? (marginShopeeValue/practicedPriceShopee)*100 : 0;
  return { materialCost, energyCost, boxCost:bCost, bubbleCost, tapeCost, embalagemCost, depreciation, maintenance, laborCost, totalLaborMinutes, toolsCost, failureCost, totalCost, suggestedPrice, suggestedPriceMl, suggestedPriceShopee, suggestedPriceExtra, practicedPrice, practicedPriceMl, practicedPriceShopee, practicedPriceExtra, estimatedShopeeFreightCap, mlFeeAmount, shopeeFeeAmount, mlFeePct, shopeeFeePct, effectiveFreightMl, effectiveFreightShopee, netReceiptMl, netReceiptShopee, marginValue, marginPct, marginMlValue, marginShopeeValue, marginMlPct, marginShopeePct, desiredMarginPct: desiredMargin*100, machine };
}
// Teto até onde a Shopee subsidia o frete grátis obrigatório (por faixa de
// preço, desde mar/2026). O vendedor só paga o que passar desse teto — ver
// effectiveFreightShopee em calcProduct().
function shopeeFreightCap(price){
  const shopee = (state.settings.platforms||[]).find(p=>p.name==='Shopee');
  if(!shopee || !Array.isArray(shopee.freightCapTiers) || !shopee.freightCapTiers.length) return null;
  const tier = shopee.freightCapTiers.find(t=>price<=t.max) || shopee.freightCapTiers[shopee.freightCapTiers.length-1];
  return tier.cap;
}
// Preço que, depois de descontada a taxa daquela plataforma (fixa ou por
// faixa, ex: Shopee) e o frete que sobra pro vendedor (extraCost — na Shopee,
// só a parte acima do subsídio, recalculada a cada iteração pois o teto
// depende da faixa de preço), ainda rende o "preço sem taxa" de referência —
// resolvido por aproximações sucessivas pra funcionar com taxa em faixas.
function suggestedPriceForPlatform(targetNet, platformName, extraCost=0){
  const plat = (state.settings.platforms||[]).find(pl=>pl.name===platformName);
  if(!plat) return targetNet + extraCost;
  let price = targetNet + extraCost;
  let prev = 0;
  for(let i=0;i<30 && Math.abs(price-prev)>0.005;i++){
    prev = price;
    const fee = plat.tiers ? computeTieredFee(plat.tiers, price).fee : price*(plat.pct/100)+(plat.fixed||0);
    const freight = (platformName==='Shopee' && extraCost>0) ? Math.max(0, extraCost - (shopeeFreightCap(price)||0)) : extraCost;
    price = targetNet + freight + fee;
  }
  return price;
}
function feeAtPrice(platformName, price){
  const plat = (state.settings.platforms||[]).find(pl=>pl.name===platformName);
  if(!plat) return 0;
  return plat.tiers ? computeTieredFee(plat.tiers, price).fee : price*(plat.pct/100)+(plat.fixed||0);
}

function salesInMonth(ym){ return state.sales.filter(s=>s.date && s.date.slice(0,7)===ym); }

function blocoA(ym){
  const sales = salesInMonth(ym);
  const faturamento = sales.reduce((a,s)=>a+s.grossPrice,0);
  const taxas = sales.reduce((a,s)=>a+s.feeTotal,0);
  const receitaLiquida = faturamento - taxas;
  const custoProducao = sales.reduce((a,s)=>a+s.productionCost,0);
  const frete = sales.reduce((a,s)=>a+(s.shippingCost||0),0);
  const snap = (state.settings.monthlySnapshots||{})[ym];
  const expensesSrc = snap ? snap.expenses : state.settings.expenses;
  const taxesSrc = snap ? snap.taxes : state.settings.taxes;
  const despesas = (expensesSrc||[]).reduce((a,e)=>a+(e.value||0),0);
  const lucroBruto = receitaLiquida - custoProducao - frete - despesas;
  const mei = (taxesSrc||[]).reduce((a,t)=>a+(t.value||0),0);
  const lucroOperacional = lucroBruto - mei;
  return { faturamento, taxas, receitaLiquida, custoProducao, frete, despesas, lucroBruto, mei, lucroOperacional, qtdVendas: sales.length };
}
function machineInstallmentStatus(m, ym){
  const start = m.startMonth || ym;
  const diff = monthDiff(start, ym);
  const total = m.installmentsTotal||0;
  const elapsed = Math.max(0, Math.min(total, diff+1));
  const restantes = Math.max(0, total - elapsed);
  const dueThisMonth = total>0 && diff>=0 && diff<total;
  return { machine:m, parcela: m.installmentValue||0, dueAmount: dueThisMonth ? (m.installmentValue||0) : 0, restantes, totalPagar: (m.installmentValue||0)*restantes, dueThisMonth, quitada: total>0 && elapsed>=total, naoConfigurada: total<=0 };
}
function blocoB(ym){
  const machines = state.settings.machines||[];
  const rows = machines.map(m=>machineInstallmentStatus(m, ym));
  const totalDue = rows.reduce((a,r)=>a+r.dueAmount,0);
  const totalPagar = rows.reduce((a,r)=>a+r.totalPagar,0);
  return { rows, totalDue, totalPagar, dueAmount: totalDue };
}
function blocoC(ym){
  const snap = ym ? (state.settings.monthlySnapshots||{})[ym] : null;
  const goals = snap ? snap.reserveGoals : state.settings.reserveGoals;
  return { goals, total: goals.reduce((a,g)=>a+g.goal,0) };
}
function investmentsDueInMonth(ym){
  return (state.settings.investments||[]).reduce((sum,inv)=>sum+investmentDueInMonth(inv,ym),0);
}
function blocoD(ym){
  const a = blocoA(ym), b = blocoB(ym), c = blocoC(ym);
  const investimentosMes = investmentsDueInMonth(ym);
  const caixaLiquido = a.lucroOperacional - b.dueAmount - investimentosMes;
  const proLabore = a.lucroOperacional - b.dueAmount - c.total - investimentosMes;
  return { lucroOperacional:a.lucroOperacional, parcelas:b.dueAmount, reservas:c.total, investimentosMes, caixaLiquido, proLabore };
}

/* Congela despesas/impostos/metas de reserva de meses que já viraram, pra editar
   Configurações não reescrever retroativamente o Caixa/Anual de meses passados. */
function snapshotPastMonths(){
  const currentYm = todayStr().slice(0,7);
  const last = state.settings.lastActiveMonth || currentYm;
  if(!state.settings.monthlySnapshots) state.settings.monthlySnapshots = {};
  let ym = last, changed = false;
  while(ym < currentYm){
    if(!state.settings.monthlySnapshots[ym]){
      state.settings.monthlySnapshots[ym] = {
        expenses: JSON.parse(JSON.stringify(state.settings.expenses||[])),
        taxes: JSON.parse(JSON.stringify(state.settings.taxes||[])),
        reserveGoals: (state.settings.reserveGoals||[]).map(g=>({id:g.id,name:g.name,goal:g.goal})),
      };
      changed = true;
    }
    ym = addMonths(ym,1);
  }
  if(last !== currentYm){ state.settings.lastActiveMonth = currentYm; changed = true; }
  if(changed) saveSettings();
}
function reservesAlreadyFundedThisMonth(ym){
  const already = {};
  salesInMonth(ym).forEach(s=>{
    if(s.reserveAllocations) Object.entries(s.reserveAllocations).forEach(([gid,amt])=>{ already[gid]=(already[gid]||0)+amt; });
  });
  const prevClose = (state.settings.monthlyCloses||{})[ym] || {};
  Object.entries(prevClose).forEach(([gid,amt])=>{ already[gid]=(already[gid]||0)+amt; });
  return already;
}
function previewCloseMonth(ym){
  const a = blocoA(ym), b = blocoB(ym);
  let available = Math.max(0, a.lucroOperacional - b.dueAmount);
  const already = reservesAlreadyFundedThisMonth(ym);
  const plan = [];
  state.settings.reserveGoals.forEach(g=>{
    if(g.autoMode==='cost_depreciation') return;
    const alreadyForGoal = already[g.id]||0;
    const need = Math.max(0, g.goal - alreadyForGoal);
    const toAllocate = Math.min(need, available);
    available -= toAllocate;
    plan.push({ goal:g, alreadyForGoal, need, toAllocate });
  });
  return { plan, leftover: available };
}
function applyCloseMonth(ym){
  const { plan } = previewCloseMonth(ym);
  if(!state.settings.monthlyCloses) state.settings.monthlyCloses = {};
  if(!state.settings.monthlyCloses[ym]) state.settings.monthlyCloses[ym] = {};
  plan.forEach(({goal,toAllocate})=>{
    if(toAllocate>0){
      goal.balance += toAllocate;
      state.settings.monthlyCloses[ym][goal.id] = (state.settings.monthlyCloses[ym][goal.id]||0) + toAllocate;
    }
  });
  saveSettings();
}

function lowStockMaterials(){ return state.materials.filter(m=>m.stock <= m.lowStock); }

/* recipe consumption for 1 unit of a product */
function productRecipe(prod){
  return [
    ...(prod.filaments||[]).map(f=>({ materialName: f.materialName, qty: f.weightG })),
    { materialName: prod.boxType, qty: 1 },
    { materialName: (bubbleWrapMaterial()||{}).name || 'Plástico Bolha', qty: prod.bubbleWrapM },
    { materialName: (tapeMaterial()||{}).name || 'Fita Adesiva', qty: prod.tapeM||0 },
  ];
}

/* ===================== RENDER SHELL ===================== */
function render(){
  document.title = bizName()+' — Gestão';
  const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(appleTitleMeta) appleTitleMeta.setAttribute('content', bizName());
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
    <div class="sidebar" id="sidebar">
      <div class="brand">
        <img class="brand-mark" src="${bizLogoSrc()}" alt="${bizName()}">
        <div class="brand-text">${bizName()}<small>Gestão do negócio</small></div>
      </div>
      <div class="nav">
        ${navItem('dashboard','Dashboard')}
        ${navItem('pedidos','Pedidos')}
        ${navItem('impressao','Fila de Impressão')}
        ${navItem('vendas','Vendas')}
        ${navItem('clientes','Clientes')}
        ${navItem('produtos','Produtos')}
        ${navItem('personalizados','Personalizados')}
        ${navItem('anuncios','Anúncios')}
        ${navItem('estoque','Estoque',lowStockMaterials().length)}
        ${navItem('calculo','Cálculo')}
        ${navItem('caixa','Caixa',dasIsUrgent()?'!':0)}
        ${navItem('anual','Anual')}
        ${navItem('taxas','Taxas')}
        ${navItem('configuracoes','Configurações')}
      </div>
      <div class="sidebar-foot">
        <div class="clock">${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}</div>
        Dados salvos automaticamente neste navegador.
        ${(()=>{ const d = daysSinceLastBackup(); return (state.sales.length>0 && (d===null || d>=30)) ? `<div style="color:var(--amber);margin-top:6px;">${d===null?'Você nunca baixou um backup':'Faz '+d+' dias que você não baixa um backup'} — clique em "Exportar backup" pra ter uma cópia de segurança dos seus dados.</div>` : ''; })()}
        <div style="display:flex;gap:6px;margin-top:10px;">
          <button class="btn ghost sm" style="flex:1;padding:6px;" onclick="exportBackup()">Exportar backup</button>
          <button class="btn ghost sm" style="flex:1;padding:6px;" onclick="document.getElementById('importFile').click()">Importar</button>
        </div>
        <input type="file" id="importFile" accept="application/json" style="display:none" onchange="if(this.files[0]) importBackup(this.files[0]); this.value='';">
        <button class="btn ghost sm" style="width:100%;margin-top:6px;padding:6px;${syncStatus.email?'color:var(--teal);':''}" onclick="openSyncModal()">${syncStatusLabel()}</button>
        <button class="btn ghost sm" style="width:100%;margin-top:6px;padding:6px;" onclick="openOnboardingModal()">Guia rápido</button>
        <button class="btn ghost sm" style="width:100%;margin-top:6px;padding:6px;color:var(--red);" onclick="openResetModal()">Recomeçar do zero</button>
      </div>
    </div>
    <div class="main">
      <div class="topbar">
        <div style="display:flex;align-items:center;gap:10px;">
          <button class="menu-toggle" onclick="toggleSidebar()"><i>☰</i></button>
          <div>
            <h1>${tabTitle()}</h1>
            <p>${tabSubtitle()}</p>
          </div>
        </div>
        <div id="topbarActions"></div>
      </div>
      <div class="content" id="content"></div>
    </div>
  `;
  renderTopbarActions();
  renderContent();
}
const NAV_ICON_PATHS = {
  dashboard: '<rect x="2.5" y="2.5" width="6" height="6" rx="1.3"></rect><rect x="11.5" y="2.5" width="6" height="6" rx="1.3"></rect><rect x="2.5" y="11.5" width="6" height="6" rx="1.3"></rect><rect x="11.5" y="11.5" width="6" height="6" rx="1.3"></rect>',
  pedidos: '<rect x="4" y="3.5" width="12" height="14" rx="2"></rect><path d="M7.5 3.5V2.8a1.3 1.3 0 0 1 1.3-1.3h2.4A1.3 1.3 0 0 1 12.5 2.8v.7"></path><line x1="7" y1="8.5" x2="13" y2="8.5"></line><line x1="7" y1="11.5" x2="13" y2="11.5"></line><line x1="7" y1="14.5" x2="10.5" y2="14.5"></line>',
  impressao: '<path d="M6 7.5V3h8v4.5"></path><rect x="3" y="7.5" width="14" height="6.5" rx="1.5"></rect><rect x="6" y="11.5" width="8" height="5.5" rx="1"></rect>',
  vendas: '<polyline points="3,13 8,8 11.5,11.5 17,5"></polyline><polyline points="12.5,5 17,5 17,9.5"></polyline>',
  clientes: '<circle cx="7" cy="6.5" r="2.7"></circle><path d="M2 17c0-3 2.2-5 5-5s5 2 5 5"></path><circle cx="14.3" cy="7.5" r="2.1"></circle><path d="M13 12.4c2.2.3 3.8 2.1 3.8 4.6"></path>',
  produtos: '<path d="M10 2.5l7 4v7l-7 4-7-4v-7z"></path><polyline points="3,6.5 10,10.5 17,6.5"></polyline><line x1="10" y1="10.5" x2="10" y2="17.5"></line>',
  personalizados: '<rect x="3" y="8.5" width="14" height="8.5" rx="1.2"></rect><rect x="2" y="5.8" width="16" height="3" rx="1"></rect><line x1="10" y1="5.8" x2="10" y2="17"></line><path d="M10 5.8c-1.3-2.8-4.6-2.8-4.6-1c0 1 1.3 1 4.6 1z"></path><path d="M10 5.8c1.3-2.8 4.6-2.8 4.6-1c0 1-1.3 1-4.6 1z"></path>',
  anuncios: '<path d="M10.5 2.5h5A1.5 1.5 0 0 1 17 4v5a1.5 1.5 0 0 1-.44 1.06l-7 7a1.5 1.5 0 0 1-2.12 0l-5-5a1.5 1.5 0 0 1 0-2.12l7-7a1.5 1.5 0 0 1 1.06-.44z"></path><circle cx="13.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"></circle>',
  estoque: '<rect x="2.5" y="3" width="15" height="4" rx="1"></rect><path d="M3.5 7v7a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V7"></path><line x1="8" y1="10.5" x2="12" y2="10.5"></line>',
  calculo: '<rect x="4" y="2.5" width="12" height="15" rx="2"></rect><rect x="6" y="4.5" width="8" height="3" rx="0.5"></rect><line x1="6.5" y1="11" x2="9" y2="11"></line><line x1="11" y1="11" x2="13.5" y2="11"></line><line x1="6.5" y1="14" x2="9" y2="14"></line><line x1="11" y1="14" x2="13.5" y2="14"></line>',
  caixa: '<rect x="2.5" y="5.5" width="15" height="10.5" rx="2"></rect><path d="M13.5 5.5V4A1.5 1.5 0 0 0 12 2.5H6A1.5 1.5 0 0 0 4.5 4v1.5"></path><circle cx="14" cy="11" r="1.1" fill="currentColor" stroke="none"></circle>',
  anual: '<rect x="3" y="4" width="14" height="13" rx="2"></rect><line x1="3" y1="8" x2="17" y2="8"></line><line x1="6.5" y1="2.5" x2="6.5" y2="5.5"></line><line x1="13.5" y1="2.5" x2="13.5" y2="5.5"></line><circle cx="7" cy="11.7" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="10" cy="11.7" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="13" cy="11.7" r="0.9" fill="currentColor" stroke="none"></circle>',
  taxas: '<circle cx="6.5" cy="6.5" r="2.3"></circle><circle cx="13.5" cy="13.5" r="2.3"></circle><line x1="14.5" y1="4.5" x2="5.5" y2="15.5"></line>',
  configuracoes: '<circle cx="10" cy="10" r="2.6"></circle><line x1="10" y1="2.7" x2="10" y2="5.1"></line><line x1="10" y1="14.9" x2="10" y2="17.3"></line><line x1="17.3" y1="10" x2="14.9" y2="10"></line><line x1="5.1" y1="10" x2="2.7" y2="10"></line><line x1="15.16" y1="4.84" x2="13.46" y2="6.54"></line><line x1="6.54" y1="13.46" x2="4.84" y2="15.16"></line><line x1="15.16" y1="15.16" x2="13.46" y2="13.46"></line><line x1="6.54" y1="6.54" x2="4.84" y2="4.84"></line>',
};
function navIcon(key){
  return `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${NAV_ICON_PATHS[key]||''}</svg>`;
}
function navItem(key,label,badge){
  const badgeHtml = badge ? `<span class="nav-badge" title="${badge==='!'?'DAS vencendo/atrasado':'Itens com estoque baixo'}">${badge}</span>` : '';
  return `<div class="nav-item ${currentTab===key?'active':''}" onclick="switchTab('${key}')">${navIcon(key)}${label}${badgeHtml}</div>`;
}
function dasIsUrgent(){
  if(!state.settings.dasEnabled) return false;
  const { paid, diffDays } = dasStatus();
  return !paid && diffDays<=5;
}
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarBackdrop').classList.toggle('show');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop').classList.remove('show');
}
function switchTab(t){
  if(currentTab!==t && (t==='taxas' || t==='configuracoes')){
    const s = state.settings;
    if(t==='taxas'){
      editingPlatforms = JSON.parse(JSON.stringify(s.platforms));
    } else {
      editingExpenses = JSON.parse(JSON.stringify(s.expenses||[]));
      editingTaxes = JSON.parse(JSON.stringify(s.taxes||[]));
      editingMachines = JSON.parse(JSON.stringify(s.machines||[]));
      editingReserveGoals = JSON.parse(JSON.stringify(s.reserveGoals||[]));
      editingBusinessName = s.businessName || '';
      editingBusinessLogo = s.businessLogo || null;
    }
  }
  currentTab=t; closeSidebar(); render();
}
function tabTitle(){
  return {dashboard:'Dashboard',pedidos:'Pedidos',impressao:'Fila de Impressão',vendas:'Vendas',clientes:'Clientes',produtos:'Produtos',personalizados:'Personalizados',anuncios:'Anúncios',estoque:'Estoque',calculo:'Cálculo',caixa:'Caixa',anual:'Anual',taxas:'Taxas',configuracoes:'Configurações'}[currentTab];
}
function tabSubtitle(){
  return {
    dashboard:'Visão geral do seu negócio de impressão 3D',
    pedidos:'Fila de encomendas, da fila de impressão até o envio',
    impressao:'Todas as impressões — sucesso, teste ou falha',
    vendas:'Registro diário de vendas e recebimentos',
    clientes:'Quem compra de você, e quanto',
    produtos:'Calculadora de precificação e catálogo',
    personalizados:'Projetos e encomendas sob medida — sem marketplace, ficha por item',
    anuncios:'Rascunhos de anúncio pra Mercado Livre e Shopee, por produto',
    estoque:'Matéria-prima e produtos prontos',
    calculo:'Como o app calcula depreciação, energia e mão de obra',
    caixa:'Resultado operacional, parcelas e reservas',
    anual:'Resultado do ano, investimentos iniciais e saldo final',
    taxas:'Taxas de plataforma, taxa real do Mercado Livre e margem de precificação',
    configuracoes:'Despesas, impostos, PIX, contato, mão de obra, MEI/metas, impressoras e reservas'
  }[currentTab];
}
function renderTopbarActions(){
  const el = document.getElementById('topbarActions');
  if(currentTab==='pedidos') el.innerHTML = `<button class="btn ghost" onclick="exportOrdersExcel()">Exportar</button> <button class="btn primary" onclick="openOrderModal()">+ Nova encomenda</button>`;
  else if(currentTab==='vendas') el.innerHTML = `<button class="btn ghost" onclick="switchTab('taxas')">Taxas das plataformas</button> <button class="btn ghost" onclick="exportSalesExcel()">Exportar</button> <button class="btn primary" onclick="openSaleModal()">+ Nova venda</button>`;
  else if(currentTab==='clientes') el.innerHTML = `<button class="btn ghost" onclick="exportCustomersExcel()">Exportar</button> <button class="btn primary" onclick="openCustomerModal()">+ Novo cliente</button>`;
  else if(currentTab==='produtos') el.innerHTML = `<button class="btn ghost" onclick="openQuickQuoteModal()">Orçamento rápido</button> <button class="btn ghost" onclick="openKitModal()">Criar kit</button> <button class="btn ghost" onclick="exportCatalogImage()">Catálogo (imagem)</button> <button class="btn ghost" onclick="exportCatalogPDF()">Catálogo (PDF, 1 pág./produto)</button> <button class="btn primary" onclick="openProductModal()">+ Novo produto</button>`;
  else if(currentTab==='personalizados') el.innerHTML = `<button class="btn primary" onclick="openCustomOrderModal()">+ Nova encomenda personalizada</button>`;
  else if(currentTab==='anuncios') el.innerHTML = '';
  else if(currentTab==='estoque') el.innerHTML = stockTab==='materiais' ? `<button class="btn primary" onclick="openMaterialModal()">+ Nova matéria-prima</button>` : `<button class="btn primary" onclick="switchTab('impressao')">Ir pra Fila de Impressão</button>`;
  else if(currentTab==='impressao') el.innerHTML = `<button class="btn primary" onclick="openPrintJobModal()">+ Nova impressão</button>`;
  else if(currentTab==='calculo') el.innerHTML = `<button class="btn primary" onclick="switchTab('configuracoes')">Gerenciar impressoras</button>`;
  else if(currentTab==='anual') el.innerHTML = `<button class="btn ghost" onclick="exportAnnualExcel()">Exportar Excel</button> <button class="btn ghost" onclick="window.print()">Exportar PDF</button> <button class="btn primary" onclick="openInvestmentModal()">+ Adicionar investimento</button>`;
  else if(currentTab==='taxas') el.innerHTML = `<button class="btn primary" onclick="confirmTaxas()">Salvar</button>`;
  else if(currentTab==='configuracoes') el.innerHTML = `<button class="btn primary" onclick="confirmConfiguracoes()">Salvar</button>`;
  else el.innerHTML = '';
}
function renderContent(){
  const c = document.getElementById('content');
  if(currentTab==='dashboard') c.innerHTML = renderDashboard();
  else if(currentTab==='pedidos') c.innerHTML = renderPedidos();
  else if(currentTab==='impressao') c.innerHTML = renderImpressao();
  else if(currentTab==='vendas') c.innerHTML = renderVendas();
  else if(currentTab==='clientes') c.innerHTML = renderClientes();
  else if(currentTab==='produtos') c.innerHTML = renderProdutos();
  else if(currentTab==='personalizados') c.innerHTML = renderPersonalizados();
  else if(currentTab==='anuncios') c.innerHTML = renderAnuncios();
  else if(currentTab==='estoque') c.innerHTML = renderEstoque();
  else if(currentTab==='calculo') c.innerHTML = renderCalculo();
  else if(currentTab==='caixa') c.innerHTML = renderCaixa();
  else if(currentTab==='anual') c.innerHTML = renderAnual();
  else if(currentTab==='taxas') c.innerHTML = renderTaxas();
  else if(currentTab==='configuracoes') c.innerHTML = renderConfiguracoes();
  if(currentTab==='dashboard') setTimeout(drawDashboardCharts,0);
  if(currentTab==='anual') setTimeout(drawAnnualChart,0);
  if(currentTab==='calculo') updateCalculoExample();
  if(currentTab==='taxas') renderPlatformRows();
  if(currentTab==='configuracoes'){
    renderNameValueRows('expenseRows', editingExpenses, 'updateExpenseRow', 'removeExpenseRow');
    renderNameValueRows('taxRows', editingTaxes, 'updateTaxRow', 'removeTaxRow');
    renderMachineRows();
    renderReserveRows();
  }
}

/* ===================== DASHBOARD ===================== */
function pctChange(current, previous){
  if(!previous || previous===0) return null;
  return ((current-previous)/Math.abs(previous))*100;
}
function trendNote(current, previous, label){
  const change = pctChange(current, previous);
  if(change==null) return label;
  const up = change>=0;
  const arrow = up ? '↑' : '↓';
  const color = up ? 'var(--green)' : 'var(--red)';
  return `${label} · <span style="color:${color}">${arrow} ${num(Math.abs(change),0)}% vs mês passado</span>`;
}
function dasStatus(){
  const ym = todayStr().slice(0,7);
  const dueDay = state.settings.dasDueDay || 20;
  const paid = !!state.settings.dasPaid[ym];
  const today = new Date(todayStr()+'T00:00:00');
  const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
  const diffDays = Math.round((dueDate-today)/86400000);
  return { ym, paid, dueDay, diffDays };
}
function toggleDasPaid(ym){
  state.settings.dasPaid[ym] = !state.settings.dasPaid[ym];
  saveSettings();
  toast(state.settings.dasPaid[ym] ? 'DAS marcado como pago' : 'Desmarcado');
  renderContent();
}
function renderDasCard(){
  if(!state.settings.dasEnabled){
    return `<div class="card" style="margin-top:14px;">
      <div class="card-title">DAS do MEI</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="font-size:12.5px;color:var(--text-faint);">Quer que eu lembre você do vencimento mensal do DAS?</span>
        <button class="btn ghost sm" style="margin-left:auto;" onclick="toggleDasEnabled()">Ativar lembrete</button>
      </div>
    </div>`;
  }
  const { ym, paid, dueDay, diffDays } = dasStatus();
  if(paid){
    return `<div class="card" style="margin-top:14px;">
      <div class="card-title">DAS do MEI<span class="sub">${monthLabel(ym)}</span></div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span class="badge ok">Pago este mês ✓</span>
        <button class="btn ghost sm" style="margin-left:auto;" onclick="toggleDasPaid('${ym}')">Desmarcar</button>
        <button class="btn ghost sm" onclick="toggleDasEnabled()">Desativar lembrete</button>
      </div>
    </div>`;
  }
  let status, cls;
  if(diffDays<0){ status = `Atrasado há ${Math.abs(diffDays)} dia(s)`; cls = 'bad'; }
  else if(diffDays===0){ status = 'Vence hoje'; cls = 'warn'; }
  else if(diffDays<=5){ status = `Vence em ${diffDays} dia(s)`; cls = 'warn'; }
  else { status = `Vence dia ${dueDay}`; cls = 'mut'; }
  return `<div class="card" style="margin-top:14px;">
    <div class="card-title">DAS do MEI<span class="sub">pagamento mensal obrigatório</span></div>
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span class="badge ${cls}">${status}</span>
      <span style="font-size:11.5px;color:var(--text-faint);">Guia disponível em gov.br/mei</span>
      <button class="btn ghost sm" style="margin-left:auto;" onclick="toggleDasPaid('${ym}')">Marcar como pago</button>
      <button class="btn ghost sm" onclick="toggleDasEnabled()">Desativar</button>
    </div>
  </div>`;
}
function toggleDasEnabled(){
  state.settings.dasEnabled = !state.settings.dasEnabled;
  saveSettings();
  toast(state.settings.dasEnabled ? 'Lembrete de DAS ativado' : 'Lembrete de DAS desativado');
  renderContent();
}
function renderMonthlyGoalCard(a){
  const goal = state.settings.monthlyGoal||0;
  if(goal<=0){
    return `<div class="card" style="margin-top:14px;">
      <div class="card-title">Meta de faturamento</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
        <span style="font-size:12.5px;color:var(--text-faint);">Nenhuma meta definida ainda.</span>
        <button class="btn primary sm" style="margin-left:auto;" onclick="openGoalModal()">Definir meta</button>
      </div>
    </div>`;
  }
  const pctDone = Math.min(150,(a.faturamento/goal)*100);
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const isCurrentMonth = currentMonth===todayStr().slice(0,7);
  const dayOfMonth = isCurrentMonth ? today.getDate() : lastDay;
  const pctTimeElapsed = (dayOfMonth/lastDay)*100;
  const onPace = pctDone >= pctTimeElapsed - 5;
  const status = a.faturamento>=goal
    ? {cls:'ok', text:'Meta batida! 🎉'}
    : isCurrentMonth
      ? (onPace ? {cls:'ok', text:'No ritmo certo'} : {cls:'warn', text:'Abaixo do ritmo esperado'})
      : {cls:'mut', text:'Mês encerrado'};
  return `<div class="card" style="margin-top:14px;">
    <div class="card-title">Meta de faturamento<span class="sub">${brl(a.faturamento)} de ${brl(goal)}</span></div>
    <div class="progress" style="height:10px;"><div style="width:${pctDone}%;background:${a.faturamento>=goal?'var(--green)':'var(--nozzle)'};"></div></div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
      <span style="font-size:11.5px;color:var(--text-faint);">${pct(Math.min(999,pctDone),0)} da meta${isCurrentMonth?` · dia ${dayOfMonth}/${lastDay} do mês`:''}</span>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge ${status.cls}">${status.text}</span>
        <button class="btn ghost sm" onclick="openGoalModal()">Editar</button>
      </div>
    </div>
  </div>`;
}
function openGoalModal(){
  showModal('Meta de faturamento mensal', `
    <div class="field hint" style="margin-bottom:12px;">Quanto você quer faturar por mês. O Dashboard compara isso com o quanto já faturou e quanto do mês já passou, pra saber se está no ritmo.</div>
    <div class="field"><label>Meta de faturamento (R$)</label><input type="number" id="goalInput" value="${state.settings.monthlyGoal||0}" step="50"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmGoal()">Salvar meta</button>
    </div>
  `);
}
function confirmGoal(){
  const val = parseFloat(document.getElementById('goalInput').value)||0;
  state.settings.monthlyGoal = val;
  saveSettings();
  toast(val>0 ? 'Meta atualizada' : 'Meta removida');
  closeModal(); renderContent();
}
function renderDashboard(){
  const a = blocoA(currentMonth);
  const d = blocoD(currentMonth);
  const prevMonth = addMonths(currentMonth,-1);
  const aPrev = blocoA(prevMonth);
  const dPrev = blocoD(prevMonth);
  const low = lowStockMaterials();
  const recentSales = [...state.sales].sort((x,y)=>y.date.localeCompare(x.date)).slice(0,6);
  return `
    <div class="filter-bar">
      <div class="field"><label>Mês de referência</label><input type="month" value="${currentMonth}" onchange="currentMonth=this.value; renderContent();"></div>
    </div>
    <div class="grid g-4">
      <div class="kpi" style="--accent:var(--nozzle)"><div class="kpi-label">Faturamento bruto</div><div class="kpi-value">${brl(a.faturamento)}</div><div class="kpi-note">${trendNote(a.faturamento, aPrev.faturamento, a.qtdVendas+' venda(s) no mês')}</div></div>
      <div class="kpi" style="--accent:var(--teal)"><div class="kpi-label">Receita líquida</div><div class="kpi-value">${brl(a.receitaLiquida)}</div><div class="kpi-note">${trendNote(a.receitaLiquida, aPrev.receitaLiquida, 'Após taxas de plataforma')}</div></div>
      <div class="kpi" style="--accent:var(--violet)"><div class="kpi-label">Lucro operacional</div><div class="kpi-value ${a.lucroOperacional<0?'neg':'pos'}">${brl(a.lucroOperacional)}</div><div class="kpi-note">${trendNote(a.lucroOperacional, aPrev.lucroOperacional, 'Depois de custos, despesas e MEI')}</div></div>
      <div class="kpi" style="--accent:${d.proLabore<0?'var(--red)':'var(--green)'}"><div class="kpi-label">Pró-labore disponível</div><div class="kpi-value ${d.proLabore<0?'neg':'pos'}">${brl(d.proLabore)}</div><div class="kpi-note">${trendNote(d.proLabore, dPrev.proLabore, 'Depois de parcelas, reservas e investimentos')}</div></div>
    </div>

    <div class="grid g-2" style="margin-top:14px;align-items:stretch;">
      <div class="card">
        <div class="card-title">Faturamento — últimos 6 meses<span class="sub">vendas registradas</span></div>
        <div style="height:220px;"><canvas id="chartTrend"></canvas></div>
      </div>
      <div class="card">
        <div class="card-title">Vendas por plataforma<span class="sub">${monthLabel(currentMonth)}</span></div>
        <div style="height:220px;">${a.qtdVendas? '<canvas id="chartPlatform"></canvas>' : emptyState('Sem vendas registradas neste mês')}</div>
      </div>
    </div>

    ${renderDasCard()}
    ${renderMonthlyGoalCard(a)}

    <div class="grid g-3" style="margin-top:14px;align-items:start;">
      <div class="card">
        <div class="card-title">Estoque de matéria-prima<span class="sub">${low.length} item(ns) em alerta</span></div>
        ${renderLowStockList(low)}
      </div>
      <div class="card">
        <div class="card-title">Vendas recentes<span class="sub" style="cursor:pointer;color:var(--teal)" onclick="switchTab('vendas')">ver todas →</span></div>
        ${recentSales.length ? renderRecentSalesTable(recentSales) : emptyState('Nenhuma venda registrada ainda')}
      </div>
      <div class="card">
        <div class="card-title">Pedidos em aberto<span class="sub" style="cursor:pointer;color:var(--teal)" onclick="switchTab('pedidos')">ver fila →</span></div>
        ${renderOpenOrdersList()}
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <div class="card-title">Top produtos por receita<span class="sub">${monthLabel(currentMonth)}</span></div>
      <div style="height:260px;">${a.qtdVendas? '<canvas id="chartTop"></canvas>' : emptyState('Sem dados de vendas neste mês')}</div>
    </div>

    <div class="card" style="margin-top:14px;">
      <div class="card-title">Rentabilidade real por produto<span class="sub">últimos 90 dias · ordenado por lucro, não por quanto vende</span></div>
      ${renderProfitabilityTable()}
    </div>
  `;
}
function productProfitability(days){
  const cutoff = new Date(todayStr()+'T00:00:00'); cutoff.setDate(cutoff.getDate()-days);
  const cutoffStr = localDateStr(cutoff);
  const byProduct = {};
  state.sales.filter(s=>s.date>=cutoffStr).forEach(s=>{
    if(!byProduct[s.productId]) byProduct[s.productId] = { productId:s.productId, name:s.productName, qty:0, revenue:0, profit:0, hours:0 };
    const p = byProduct[s.productId];
    p.qty += s.qty; p.revenue += s.grossPrice; p.profit += s.profit; p.hours += (s.hoursUsed||0);
  });
  return Object.values(byProduct).map(p=>({
    ...p,
    marginPct: p.revenue>0 ? (p.profit/p.revenue)*100 : 0,
    profitPerHour: p.hours>0 ? p.profit/p.hours : null,
  // Com uma única impressora, hora de máquina é o recurso escasso — ordenar
  // por lucro total colocaria no topo produtos de ticket alto e impressão
  // longa, que são o pior uso da máquina, não o melhor.
  })).sort((a,b)=>{
    if(a.profitPerHour==null && b.profitPerHour==null) return b.profit-a.profit;
    if(a.profitPerHour==null) return 1;
    if(b.profitPerHour==null) return -1;
    return b.profitPerHour-a.profitPerHour;
  });
}
function renderProfitabilityTable(){
  const rows = productProfitability(90).slice(0,10);
  if(!rows.length) return emptyState('Sem vendas nos últimos 90 dias');
  return `<div class="tbl-wrap tbl-responsive"><table>
    <thead><tr><th>Produto</th><th class="right">Qtd</th><th class="right">Receita</th><th class="right">Lucro</th><th class="right">Margem</th><th class="right">Lucro/hora impressora</th></tr></thead>
    <tbody>${rows.map(p=>`<tr>
      <td data-label="Produto">${p.name}</td>
      <td class="right num" data-label="Qtd">${p.qty}</td>
      <td class="right num" data-label="Receita">${brl(p.revenue)}</td>
      <td class="right num" data-label="Lucro" style="color:${p.profit<0?'var(--red)':'var(--green)'}">${brl(p.profit)}</td>
      <td class="right num" data-label="Margem">${pct(p.marginPct)}</td>
      <td class="right num" data-label="Lucro/hora impressora">${p.profitPerHour!=null ? brl(p.profitPerHour)+'/h' : '—'}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}
let quoteFilaments = [];
let quoteLaborActions = [];
function openQuickQuoteModal(){
  const filamentOptions = state.materials.filter(m=>m.category==='Filamento');
  const boxOptions = state.materials.filter(m=>m.category==='Embalagem' && m.isBox);
  const machines = state.settings.machines||[];
  if(filamentOptions.length===0 || boxOptions.length===0){
    toast('Cadastre ao menos um filamento e uma caixa em Estoque antes de fazer um orçamento','err');
    return;
  }
  if(machines.length===0){
    toast('Cadastre ao menos uma impressora antes de fazer um orçamento','err');
    return;
  }
  quoteFilaments = [{materialName:filamentOptions[0].name, weightG:50}];
  quoteLaborActions = [];
  showModal('Orçamento rápido', `
    <div class="field hint" style="margin-bottom:12px;">Calcule um preço na hora, sem precisar cadastrar produto — ótimo pra responder pedido personalizado. Se fizer sentido guardar, dá pra salvar como produto de verdade no final.</div>
    <div class="field"><label>Descrição (opcional, só pra você lembrar)</label><input id="qtDesc" placeholder="Ex: chaveiro personalizado do Zé"></div>
    <div class="field" style="margin-bottom:6px;"><label>Filamentos</label></div>
    <div id="qtFilamentRows"></div>
    <button class="btn ghost sm" onclick="addQuoteFilamentRow()">+ Adicionar filamento</button>
    <div class="row3" style="margin-top:14px;">
      <div class="field"><label>Tempo de impressão (h)</label><input type="number" id="qtTimeH" value="1" step="0.1" oninput="updateQuickQuotePreview()"></div>
      <div class="field"><label>Impressora</label><select id="qtMachine" onchange="updateQuickQuotePreview()">
        ${machines.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>Caixa</label><select id="qtBox" onchange="updateQuickQuotePreview()">
        ${boxOptions.map(b=>`<option value="${b.name}">${b.name}</option>`).join('')}
      </select></div>
    </div>
    <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" id="qtMargin" value="${((1-1/(state.settings.markupMultiplier||2.5))*100).toFixed(0)}" oninput="updateQuickQuotePreview()"></div>
    <div class="field" style="margin-bottom:6px;"><label>Mão de obra (ações e minutos de cada uma)</label></div>
    <div id="qtLaborActionRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addQuoteLaborActionRow()">+ Adicionar ação</button>
    ${laborActionOptionsHtml()}
    <div class="helper-block" id="qtPreview"></div>
    <div class="modal-actions" style="justify-content:space-between;">
      <button class="btn ghost" onclick="closeModal()">Fechar</button>
      <button class="btn primary" onclick="saveQuoteAsProduct()">Salvar como produto</button>
    </div>
  `);
  renderQuoteFilamentRows();
  renderQuoteLaborActionRows();
  updateQuickQuotePreview();
}
function renderQuoteFilamentRows(){
  const el = document.getElementById('qtFilamentRows');
  if(!el) return;
  const filamentOptions = state.materials.filter(m=>m.category==='Filamento');
  el.innerHTML = quoteFilaments.map((f,i)=>`
    <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 28px;gap:8px;align-items:center;margin-bottom:8px;">
      <select style="min-width:0;" onchange="quoteFilaments[${i}].materialName=this.value; updateQuickQuotePreview();">
        ${filamentOptions.map(fo=>`<option value="${fo.name}" ${f.materialName===fo.name?'selected':''}>${fo.name}</option>`).join('')}
      </select>
      <input type="number" step="0.01" value="${f.weightG}" placeholder="peso (g)" style="min-width:0;" oninput="quoteFilaments[${i}].weightG=parseFloat(this.value)||0; updateQuickQuotePreview();">
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="removeQuoteFilamentRow(${i})">×</button>
    </div>
  `).join('');
}
function addQuoteFilamentRow(){
  const first = (state.materials.find(m=>m.category==='Filamento')||{}).name||'PLA';
  quoteFilaments.push({materialName:first, weightG:0});
  renderQuoteFilamentRows();
  updateQuickQuotePreview();
}
function removeQuoteFilamentRow(i){
  if(quoteFilaments.length<=1){ toast('Precisa de ao menos um filamento','err'); return; }
  quoteFilaments.splice(i,1);
  renderQuoteFilamentRows();
  updateQuickQuotePreview();
}
function renderQuoteLaborActionRows(){
  const el = document.getElementById('qtLaborActionRows');
  if(!el) return;
  el.innerHTML = quoteLaborActions.map((a,i)=>`
    <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 28px;gap:8px;align-items:center;margin-bottom:8px;">
      <input list="laborActionOptions" value="${a.action}" placeholder="Ação (ex: Lixar)" style="min-width:0;" oninput="quoteLaborActions[${i}].action=this.value; updateQuickQuotePreview();">
      <input type="number" step="1" value="${a.minutes}" placeholder="minutos" style="min-width:0;" oninput="quoteLaborActions[${i}].minutes=parseFloat(this.value)||0; updateQuickQuotePreview();">
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="removeQuoteLaborActionRow(${i})">×</button>
    </div>
  `).join('');
}
function addQuoteLaborActionRow(){
  quoteLaborActions.push({action:'', minutes:0});
  renderQuoteLaborActionRows();
  updateQuickQuotePreview();
}
function removeQuoteLaborActionRow(i){
  quoteLaborActions.splice(i,1);
  renderQuoteLaborActionRows();
  updateQuickQuotePreview();
}
function buildQuoteDraft(){
  return {
    name: document.getElementById('qtDesc').value.trim() || 'Orçamento sem nome',
    filaments: quoteFilaments,
    timeH: parseFloat(document.getElementById('qtTimeH').value)||0,
    bubbleWrapM: 0,
    boxType: document.getElementById('qtBox').value,
    failureMarginPct: 0.10,
    laborActions: quoteLaborActions,
    machineId: document.getElementById('qtMachine').value,
    desiredMarginPct: parseFloat(document.getElementById('qtMargin').value)||0,
    practicedPrice: 0,
    stock: 0,
  };
}
function updateQuickQuotePreview(){
  const draft = buildQuoteDraft();
  const c = calcProduct(draft);
  document.getElementById('qtPreview').innerHTML = `
    <div class="calc-line"><span>Peso total</span><span>${num(totalWeight(draft),0)}g</span></div>
    <div class="calc-line"><span>Custo material</span><span>${brl(c.materialCost)}</span></div>
    <div class="calc-line"><span>Custo energia</span><span>${brl(c.energyCost)}</span></div>
    <div class="calc-line"><span>Embalagem</span><span>${brl(c.embalagemCost)}</span></div>
    <div class="calc-line"><span>Depreciação</span><span>${brl(c.depreciation)}</span></div>
    <div class="calc-line"><span>Mão de obra</span><span>${brl(c.laborCost)}</span></div>
    <div class="calc-line"><span>Margem de falha</span><span>${brl(c.failureCost)}</span></div>
    <div class="calc-line total"><span>Custo total</span><span>${brl(c.totalCost)}</span></div>
    <div class="calc-line total"><span>Preço sugerido — venda própria (margem ${num(draft.desiredMarginPct,0)}%)</span><span style="color:var(--green)">${brl(c.suggestedPrice)}</span></div>
    <div class="calc-line" style="color:var(--text-faint);"><span>↳ Mercado Livre (já com a taxa)</span><span>${brl(c.suggestedPriceMl)}</span></div>
    <div class="calc-line" style="color:var(--text-faint);"><span>↳ Shopee (já com a taxa)</span><span>${brl(c.suggestedPriceShopee)}</span></div>
    ${c.estimatedShopeeFreightCap!=null ? `<div class="calc-line" style="color:var(--text-faint);"><span>↳ Shopee — custo estimado de frete (teto do cupom)</span><span>${brl(c.estimatedShopeeFreightCap)}</span></div>` : ''}
    ${extraListingPlatforms().map(plat=>`<div class="calc-line" style="color:var(--text-faint);"><span>↳ ${plat.name} (já com a taxa)</span><span>${brl(c.suggestedPriceExtra[plat.id])}</span></div>`).join('')}
  `;
}
function saveQuoteAsProduct(){
  const draft = buildQuoteDraft();
  if(draft.filaments.every(f=>!f.weightG)){ toast('Informe o peso de pelo menos um filamento','err'); return; }
  const c = calcProduct(draft);
  state.products.push({
    id:uid(), name:draft.name, filaments:draft.filaments, timeH:draft.timeH, bubbleWrapM:draft.bubbleWrapM,
    boxType:draft.boxType, failureMarginPct:draft.failureMarginPct, laborActions:draft.laborActions,
    machineId:draft.machineId, desiredMarginPct:draft.desiredMarginPct, practicedPrice:c.suggestedPrice, stock:0,
  });
  saveProducts();
  toast('Orçamento salvo como produto novo — já aparece em Produtos');
  closeModal(); renderContent();
}
function emptyState(msg){ return `<div class="empty">${msg}</div>`; }
function renderOpenOrdersList(){
  const open = state.orders.filter(o=>o.status!=='Enviado').sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,6);
  if(open.length===0) return emptyState('Nenhuma encomenda em aberto');
  return `<div class="tbl-wrap tbl-responsive"><table><thead><tr><th>Cliente</th><th>Produto</th><th>Status</th></tr></thead><tbody>
    ${open.map(o=>`<tr><td data-label="Cliente">${orderCustomerName(o)||'—'}</td><td data-label="Produto">${o.qty}x ${o.productName}</td><td data-label="Status"><span class="badge info">${o.status}</span></td></tr>`).join('')}
  </tbody></table></div>`;
}
function renderLowStockList(low){
  if(!state.materials.length) return emptyState('Nenhuma matéria-prima cadastrada');
  const rows = state.materials.slice().sort((a,b)=> (a.stock-a.lowStock) - (b.stock-b.lowStock)).slice(0,8);
  return `<div class="tbl-wrap tbl-responsive"><table><thead><tr><th>Material</th><th class="right">Estoque</th><th class="right">Mínimo</th><th>Status</th></tr></thead><tbody>
    ${rows.map(m=>`<tr><td data-label="Material">${m.name}</td><td class="right num" data-label="Estoque">${num(m.stock,0)} ${m.unit}</td><td class="right num" data-label="Mínimo">${num(m.lowStock,0)} ${m.unit}</td><td data-label="Status">${stockBadge(m)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function stockBadge(m){
  if(m.stock<=0) return `<span class="badge bad">Zerado</span>`;
  if(m.stock<=m.lowStock) return `<span class="badge warn">Baixo</span>`;
  return `<span class="badge ok">Ok</span>`;
}
function renderRecentSalesTable(sales){
  return `<div class="tbl-wrap tbl-responsive"><table><thead><tr><th>Data</th><th>Produto</th><th>Plataforma</th><th class="right">Líquido</th></tr></thead><tbody>
    ${sales.map(s=>`<tr><td class="num" data-label="Data">${fmtDate(s.date)}</td><td data-label="Produto">${s.productName}</td><td data-label="Plataforma">${platformBadge(s.platform)}</td><td class="right num" data-label="Líquido">${brl(s.netReceipt)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function fmtDate(d){ if(!d) return '-'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function platformBadge(p){
  const palette = ['warn','bad','info','ok','mut'];
  const idx = state.settings.platforms.findIndex(x=>x.name===p);
  const cls = palette[idx>=0 ? idx%palette.length : palette.length-1];
  return `<span class="badge ${cls}">${p}</span>`;
}
function drawDashboardCharts(){
  if(typeof Chart==='undefined'){ return; }
  const months = [];
  const d0 = new Date(currentMonth+'-01T00:00:00');
  for(let i=5;i>=0;i--){ const dt=new Date(d0.getFullYear(),d0.getMonth()-i,1); months.push(dt.toISOString().slice(0,7)); }
  const revData = months.map(ym=>salesInMonth(ym).reduce((a,s)=>a+s.grossPrice,0));
  const trendCanvas = document.getElementById('chartTrend');
  if(trendCanvas){
    new Chart(trendCanvas, { type:'bar', data:{ labels: months.map(m=>monthLabel(m).slice(0,3)+'/'+m.slice(2,4)), datasets:[{ data:revData, backgroundColor:'#BD4119', borderRadius:4, maxBarThickness:34 }]},
      options:{ plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c)=>brl(c.raw)}}}, scales:{ x:{grid:{display:false},ticks:{color:'#6B7080'}}, y:{grid:{color:'#E2E4E9'},ticks:{color:'#6B7080',callback:(v)=>'R$'+v}} } } });
  }
  const platCanvas = document.getElementById('chartPlatform');
  if(platCanvas){
    const sales = salesInMonth(currentMonth);
    const byPlat = {};
    sales.forEach(s=>{ byPlat[s.platform] = (byPlat[s.platform]||0)+s.grossPrice; });
    new Chart(platCanvas, { type:'doughnut', data:{ labels:Object.keys(byPlat), datasets:[{ data:Object.values(byPlat), backgroundColor:['#95620A','#C13B32','#0B7A6B','#6455D6'], borderColor:'#FFFFFF', borderWidth:2 }]},
      options:{ plugins:{legend:{position:'bottom',labels:{color:'#6B7080',boxWidth:10,font:{size:11}}}, tooltip:{callbacks:{label:(c)=>c.label+': '+brl(c.raw)}}} } });
  }
  const topCanvas = document.getElementById('chartTop');
  if(topCanvas){
    const sales = salesInMonth(currentMonth);
    const byProd = {};
    sales.forEach(s=>{ byProd[s.productName]=(byProd[s.productName]||0)+s.grossPrice; });
    const entries = Object.entries(byProd).sort((a,b)=>b[1]-a[1]).slice(0,8);
    new Chart(topCanvas, { type:'bar', data:{ labels:entries.map(e=>e[0]), datasets:[{ data:entries.map(e=>e[1]), backgroundColor:'#0B7A6B', borderRadius:4 }]},
      options:{ indexAxis:'y', plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c)=>brl(c.raw)}}}, scales:{ x:{grid:{color:'#E2E4E9'},ticks:{color:'#6B7080',callback:(v)=>'R$'+v}}, y:{grid:{display:false},ticks:{color:'#1A1D23',font:{size:11}}} } } });
  }
}

/* ===================== PEDIDOS (fila de encomendas) ===================== */
const ORDER_STATUSES = ['Aguardando impressão','Imprimindo','Pronto para envio','Enviado'];
function renderPedidos(){
  if(state.orders.length===0){
    return `<div class="card">${emptyState('Nenhuma encomenda registrada. Clique em "Nova encomenda" para começar a organizar sua fila de produção.')}</div>`;
  }
  const cols = ORDER_STATUSES.map(status=>{
    const orders = state.orders.filter(o=>o.status===status).sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
    return `<div style="min-width:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-family:var(--font-display);font-weight:600;font-size:13px;">${status}</div>
        <span class="chip">${orders.length}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${orders.length ? orders.map(o=>orderCard(o)).join('') : `<div class="empty" style="padding:16px 8px;">Nada aqui</div>`}
      </div>
    </div>`;
  }).join('');
  return `${renderCapacityPanel()}<div class="grid g-4" style="align-items:start;">${cols}</div>`;
}
function renderCapacityPanel(){
  const machines = state.settings.machines||[];
  if(machines.length===0) return '';
  const pending = state.orders.filter(o=>o.status!=='Enviado');
  if(pending.length===0) return '';
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth()+1, 0).getDate();
  const daysLeft = Math.max(1, lastDay - today.getDate() + 1);
  const hoursPerDay = state.settings.printHoursPerDay||8;
  const availableHours = daysLeft * hoursPerDay;
  const rows = machines.map(m=>{
    const neededHours = pending.reduce((sum,o)=>{
      const prod = state.products.find(p=>p.id===o.productId);
      if(!prod || (prod.machineId||machines[0].id)!==m.id) return sum;
      return sum + (prod.timeH||0)*o.qty;
    }, 0);
    if(neededHours<=0) return null;
    const pctUsed = Math.min(150, (neededHours/availableHours)*100);
    const overloaded = neededHours>availableHours;
    return `<div class="card">
      <div style="font-weight:600;font-size:13px;">${m.name}</div>
      <div style="font-family:var(--font-mono);font-size:16px;font-weight:600;margin:6px 0 4px;">${num(neededHours,1)}h <span style="font-size:11.5px;color:var(--text-faint);font-weight:400;">necessárias / ${num(availableHours,0)}h disponíveis até o fim do mês</span></div>
      <div class="progress"><div style="width:${pctUsed}%;background:${overloaded?'var(--red)':'var(--teal)'};"></div></div>
      <div style="margin-top:6px;">${overloaded ? `<span class="badge bad">Sobrecarregada — faltam ${num(neededHours-availableHours,1)}h</span>` : `<span class="badge ok">Dá tempo</span>`}</div>
    </div>`;
  }).filter(Boolean).join('');
  if(!rows) return '';
  return `
    <div class="section-title" style="margin-top:0;">Capacidade de produção<span style="font-weight:400;font-size:11.5px;color:var(--text-faint);margin-left:8px;">${daysLeft} dia(s) restantes no mês · ${hoursPerDay}h/dia por impressora</span></div>
    <div class="grid g-3" style="margin-bottom:20px;">${rows}</div>
  `;
}
function orderHoursNeeded(o){
  const prod = state.products.find(p=>p.id===o.productId);
  if(!prod) return 0;
  const remaining = Math.max(0, o.qty - (prod.stock||0));
  return remaining * (prod.timeH||0);
}
function orderDeadlineRisk(o){
  if(o.status==='Enviado' || !o.dueDate) return null;
  const prod = state.products.find(p=>p.id===o.productId);
  if(!prod) return null;
  const machines = state.settings.machines||[];
  if(machines.length===0) return null;
  const machineId = prod.machineId || machines[0].id;
  const hoursPerDay = state.settings.printHoursPerDay||8;
  const sameQueue = state.orders.filter(x=>x.status!=='Enviado').filter(x=>{
    const p2 = state.products.find(p=>p.id===x.productId);
    return p2 && (p2.machineId||machines[0].id)===machineId;
  }).sort((a,b)=>(a.dueDate||'9999-99-99').localeCompare(b.dueDate||'9999-99-99'));
  let cumulative = 0;
  for(const ord of sameQueue){
    cumulative += orderHoursNeeded(ord);
    if(ord.id===o.id){
      const today = new Date(todayStr()+'T00:00:00');
      const due = new Date(o.dueDate+'T00:00:00');
      const daysUntil = Math.round((due-today)/86400000) + 1;
      if(daysUntil<=0) return { risk:true, overdue:true, cumulative, available:0 };
      const available = daysUntil*hoursPerDay;
      return { risk: cumulative>available, overdue:false, cumulative, available };
    }
  }
  return null;
}
function orderCard(o){
  const overdue = o.dueDate && o.dueDate < todayStr() && o.status!=='Enviado';
  const prod = state.products.find(p=>p.id===o.productId);
  const deadlineRisk = orderDeadlineRisk(o);
  return `<div class="card" style="padding:12px 13px;">
    <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;">
      <div style="font-weight:600;font-size:13px;">${orderCustomerName(o) || 'Sem cliente'}</div>
      <button class="btn ghost sm" style="padding:2px 7px;" title="Excluir" onclick="deleteOrder('${o.id}')">×</button>
    </div>
    <div style="font-size:12.5px;color:var(--text-dim);margin-top:3px;">${o.qty}x ${o.productName}</div>
    ${o.dueDate ? `<div style="font-size:11px;margin-top:5px;color:${overdue?'var(--red)':'var(--text-faint)'}">${overdue?'Atrasado — ':'Prazo: '}${fmtDate(o.dueDate)}</div>` : ''}
    ${o.notes ? `<div style="font-size:11.5px;color:var(--text-dim);margin-top:6px;background:var(--bg-alt);border-radius:6px;padding:6px 8px;">${o.notes}</div>` : ''}
    <select style="margin-top:10px;width:100%;" onchange="changeOrderStatus('${o.id}', this.value)">
      ${ORDER_STATUSES.map(s=>`<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join('')}
    </select>
    <div style="display:flex;gap:6px;margin-top:8px;">
      ${o.status!=='Enviado' ? `<button class="btn sm" style="flex:1;" onclick="openPrintJobModal('${o.productId}', ${o.qty})">Produzir</button>` : ''}
      ${(o.status==='Pronto para envio'||o.status==='Enviado') ? `<button class="btn sm primary" style="flex:1;" onclick="openSaleModal('${o.productId}', ${o.qty}, '${o.id}')">Vender</button>` : ''}
    </div>
    ${prod && prod.stock < o.qty && o.status!=='Enviado' ? `<div style="font-size:11px;color:var(--amber);margin-top:6px;">Estoque atual: ${num(prod.stock,0)} — falta produzir ${num(o.qty-prod.stock,0)}</div>` : ''}
    ${deadlineRisk && deadlineRisk.risk ? `<div style="font-size:11px;color:var(--red);margin-top:6px;">⚠ ${deadlineRisk.overdue ? 'Prazo já passou' : `Não dá tempo até o prazo — precisa de ${num(deadlineRisk.cumulative,1)}h na impressora, só ${num(deadlineRisk.available,1)}h disponíveis até lá (contando outras encomendas na frente)`}</div>` : ''}
  </div>`;
}
function changeOrderStatus(id, status){
  const o = state.orders.find(x=>x.id===id);
  if(!o) return;
  o.status = status;
  saveOrders();
  renderContent();
}
function deleteOrder(id){
  if(!confirm('Excluir esta encomenda? Isso não afeta estoque ou vendas já registradas.')) return;
  state.orders = state.orders.filter(x=>x.id!==id);
  saveOrders();
  toast('Encomenda excluída');
  renderContent();
}
function orderCustomerName(o){
  if(o.customerId){ const cu = state.customers.find(x=>x.id===o.customerId); if(cu) return cu.name; }
  return o.customerName || '';
}
function openOrderModal(){
  if(state.products.length===0){ toast('Cadastre um produto antes de criar encomendas','err'); return; }
  showModal('Nova encomenda', `
    <div class="field"><label>Cliente (opcional)</label><select id="oCust">
      <option value="">Avulso / sem cadastro</option>
      ${state.customers.map(cu=>`<option value="${cu.id}">${cu.name}</option>`).join('')}
    </select></div>
    <div class="row2">
      <div class="field"><label>Produto</label><select id="oProd">${state.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></div>
      <div class="field"><label>Quantidade</label><input type="number" id="oQty" value="1" min="1"></div>
    </div>
    <div class="field"><label>Prazo de entrega (opcional)</label><input type="date" id="oDue"></div>
    <div class="field"><label>Observações</label><textarea id="oNotes" rows="2" placeholder="Cor, personalização, combinado com o cliente..."></textarea></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmOrder()">Criar encomenda</button>
    </div>
  `);
}
function confirmOrder(){
  const prod = state.products.find(p=>p.id===document.getElementById('oProd').value);
  const qty = parseFloat(document.getElementById('oQty').value)||0;
  if(qty<=0){ toast('Informe uma quantidade válida','err'); return; }
  state.orders.push({
    id:uid(), customerId: document.getElementById('oCust').value || null,
    productId: prod.id, productName: prod.name, qty,
    dueDate: document.getElementById('oDue').value || '',
    notes: document.getElementById('oNotes').value.trim(),
    status: 'Aguardando impressão', createdAt: new Date().toISOString(),
  });
  saveOrders();
  toast('Encomenda criada');
  closeModal(); renderContent();
}

/* ===================== ANUAL ===================== */
function monthsOfYearElapsed(year){
  const now = new Date();
  const nowY = now.getFullYear(), nowM = now.getMonth()+1;
  let maxMonth = 12;
  if(year===nowY) maxMonth = nowM;
  else if(year>nowY) maxMonth = 0;
  return Array.from({length:maxMonth}, (_,i)=> `${year}-${String(i+1).padStart(2,'0')}`);
}
function investmentDueInMonth(inv, ym){
  if(inv.syncedToMachine) return 0;
  if(inv.paymentType==='parcelado'){
    const start = inv.startMonth || (inv.date ? inv.date.slice(0,7) : ym);
    const diff = monthDiff(start, ym);
    const total = inv.installments || 1;
    return (diff>=0 && diff<total) ? inv.value/total : 0;
  }
  return (inv.date && inv.date.slice(0,7)===ym) ? inv.value : 0;
}
function investmentProgress(inv){
  if(inv.paymentType!=='parcelado') return null;
  const now = todayStr().slice(0,7);
  const diff = monthDiff(inv.startMonth, now);
  const paid = Math.max(0, Math.min(inv.installments, diff+1));
  return { paid, total: inv.installments, parcelValue: inv.value/inv.installments, quitado: paid>=inv.installments };
}
function blocoAYear(year){
  const months = monthsOfYearElapsed(year);
  const acc = { faturamento:0, taxas:0, receitaLiquida:0, custoProducao:0, frete:0, despesas:0, mei:0, lucroBruto:0, lucroOperacional:0, qtdVendas:0, parcelas:0 };
  months.forEach(ym=>{
    const a = blocoA(ym);
    const b = blocoB(ym);
    acc.faturamento += a.faturamento;
    acc.taxas += a.taxas;
    acc.receitaLiquida += a.receitaLiquida;
    acc.custoProducao += a.custoProducao;
    acc.frete += a.frete;
    acc.despesas += a.despesas;
    acc.mei += a.mei;
    acc.lucroBruto += a.lucroBruto;
    acc.lucroOperacional += a.lucroOperacional;
    acc.qtdVendas += a.qtdVendas;
    acc.parcelas += b.dueAmount;
  });
  const nonCostGoalIds = new Set(state.settings.reserveGoals.filter(g=>g.autoMode!=='cost_depreciation').map(g=>g.id));
  const reservasAno = months.reduce((sum,ym)=>{
    const already = reservesAlreadyFundedThisMonth(ym);
    return sum + Object.entries(already).reduce((a,[gid,v])=> nonCostGoalIds.has(gid) ? a+v : a, 0);
  }, 0);
  const investimentosAno = months.reduce((sum,ym)=> sum + (state.settings.investments||[]).reduce((a,inv)=>a+investmentDueInMonth(inv,ym),0), 0);
  const saldoFinal = acc.lucroOperacional - acc.parcelas - reservasAno - investimentosAno;
  return { ...acc, reservasAno, investimentosAno, saldoFinal, months };
}
function renderAnual(){
  const y = blocoAYear(currentYear);
  const investmentYears = (state.settings.investments||[]).flatMap(inv=>{
    if(inv.paymentType==='parcelado' && inv.startMonth){
      const startY = parseInt(inv.startMonth.slice(0,4));
      const span = Math.ceil((inv.installments||1)/12);
      return Array.from({length:span+1}, (_,i)=>startY+i);
    }
    return inv.date ? [parseInt(inv.date.slice(0,4))] : [];
  });
  const availableYears = [...new Set([
    ...state.sales.map(s=>s.date?parseInt(s.date.slice(0,4)):null),
    ...investmentYears,
    new Date().getFullYear()
  ].filter(Boolean))].sort();
  return `
    <div class="filter-bar">
      <div class="field"><label>Ano</label><select onchange="currentYear=parseInt(this.value); renderContent();">
        ${availableYears.map(yr=>`<option value="${yr}" ${yr===currentYear?'selected':''}>${yr}</option>`).join('')}
      </select></div>
    </div>

    <div class="grid g-4">
      <div class="kpi" style="--accent:var(--nozzle)"><div class="kpi-label">Faturamento do ano</div><div class="kpi-value">${brl(y.faturamento)}</div><div class="kpi-note">${y.qtdVendas} venda(s)</div></div>
      <div class="kpi" style="--accent:var(--violet)"><div class="kpi-label">Lucro operacional</div><div class="kpi-value ${y.lucroOperacional<0?'neg':'pos'}">${brl(y.lucroOperacional)}</div><div class="kpi-note">Após custos, despesas, impostos</div></div>
      <div class="kpi" style="--accent:var(--amber)"><div class="kpi-label">Investimentos no ano</div><div class="kpi-value">${brl(y.investimentosAno)}</div><div class="kpi-note">Compras iniciais/grandes deste ano</div></div>
      <div class="kpi" style="--accent:${y.saldoFinal<0?'var(--red)':'var(--green)'}"><div class="kpi-label">Saldo final do ano</div><div class="kpi-value ${y.saldoFinal<0?'neg':'pos'}">${brl(y.saldoFinal)}</div><div class="kpi-note">Depois de parcelas, reservas e investimentos</div></div>
    </div>

    ${renderMeiLimitCard(y, currentYear)}

    <div class="card" style="margin-top:14px;">
      <div class="card-title">Lucro operacional por mês<span class="sub">${currentYear}</span></div>
      <div style="height:220px;"><canvas id="chartAnnual"></canvas></div>
    </div>

    <div class="section-title">Resultado do ano</div>
    <div class="card">
      <div class="tbl-wrap"><table><tbody>
        ${caixaRow('Faturamento Bruto', y.faturamento)}
        ${caixaRow('(−) Taxas de Plataforma', -y.taxas)}
        ${caixaRow('(=) Receita Líquida', y.receitaLiquida, true)}
        ${caixaRow('(−) Custo de Produção', -y.custoProducao)}
        ${caixaRow('(−) Frete pago', -y.frete)}
        ${caixaRow('(−) Despesas Operacionais', -y.despesas)}
        ${caixaRow('(−) Impostos', -y.mei)}
        ${caixaRow('(=) LUCRO OPERACIONAL', y.lucroOperacional, true)}
        ${caixaRow('(−) Parcelas pagas no ano', -y.parcelas)}
        ${caixaRow('(−) Reservas alocadas no ano', -y.reservasAno)}
        ${caixaRow('(−) Investimentos do ano', -y.investimentosAno)}
        ${caixaRow('(=) SALDO FINAL DO ANO', y.saldoFinal, true)}
      </tbody></table></div>
      <div class="field hint" style="margin-top:10px;">O Fundo Nova Máquina (Depreciação) não entra em "Reservas alocadas" aqui porque já está embutido no Custo de Produção acima — contar de novo somaria a mesma coisa duas vezes.</div>
    </div>

    <div class="section-title">Investimentos iniciais e grandes compras</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:12px;">Compras que não se repetem todo mês: preço da impressora, compra inicial de filamento e caixas em lote, ferramentas, etc. Item à vista conta inteiro no mês da compra; parcelado conta uma parcela por mês, podendo passar de um ano pro outro.</div>
      ${(state.settings.investments||[]).length ? `<div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Item</th><th>Categoria</th><th>Data</th><th>Pagamento</th><th class="right">Valor</th><th></th></tr></thead>
        <tbody>${state.settings.investments.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(inv=>{
          const prog = investmentProgress(inv);
          const payLabel = inv.syncedToMachine
            ? '<span class="badge info">Acompanhe no Bloco B</span>'
            : prog
              ? `${brl(prog.parcelValue)}/mês — ${prog.paid}/${prog.total}${prog.quitado?' <span class="badge ok">Quitado</span>':''}`
              : 'À vista';
          return `<tr>
          <td data-label="Item">${inv.name}</td><td data-label="Categoria"><span class="chip">${inv.category||'Outros'}</span></td><td class="num" data-label="Data">${fmtDate(inv.date)}</td><td data-label="Pagamento">${payLabel}</td><td class="right num" data-label="Valor">${brl(inv.value)}</td>
          <td class="right"><button class="btn ghost sm" onclick="deleteInvestment('${inv.id}')">Excluir</button></td>
        </tr>`;}).join('')}</tbody>
      </table></div>` : emptyState('Nenhum investimento cadastrado ainda')}
    </div>
  `;
}
function renderMeiLimitCard(y, year){
  const limit = state.settings.meiRevenueLimit||81000;
  const tolerance = limit*1.2;
  const monthsWithData = y.months.length;
  const monthlyAvg = monthsWithData>0 ? y.faturamento/monthsWithData : 0;
  const isCurrentYear = year===new Date().getFullYear();
  const projected = isCurrentYear && monthsWithData>0 && monthsWithData<12 ? monthlyAvg*12 : y.faturamento;
  const pctReal = Math.min(150,(y.faturamento/limit)*100);
  let status;
  if(y.faturamento>tolerance) status = {cls:'bad', text:'Já passou da tolerância de 20% — risco de desenquadramento retroativo'};
  else if(y.faturamento>limit) status = {cls:'warn', text:'Já passou do limite anual — ainda dentro da tolerância de 20%, mas fique atento'};
  else if(isCurrentYear && projected>limit) status = {cls:'warn', text:`No ritmo atual (${brl(monthlyAvg)}/mês), deve ultrapassar o limite este ano`};
  else status = {cls:'ok', text:'Dentro do limite'};
  return `
    <div class="card" style="margin-top:14px;">
      <div class="card-title">Teto do MEI<span class="sub">limite anual: ${brl(limit)}</span></div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <div class="progress" style="height:10px;"><div style="width:${pctReal}%;background:${status.cls==='bad'?'var(--red)':status.cls==='warn'?'var(--amber)':'var(--teal)'}"></div></div>
          <div style="font-size:11.5px;color:var(--text-faint);margin-top:6px;">${brl(y.faturamento)} faturado — ${pct(Math.min(999,(y.faturamento/limit)*100),0)} do limite${isCurrentYear && monthsWithData<12 ? ` · projeção pro ano inteiro: ${brl(projected)}` : ''}</div>
        </div>
        <span class="badge ${status.cls}">${status.text}</span>
      </div>
      <div class="field hint" style="margin-top:10px;">Limite editável em Caixa → Configurar (ex: se a Receita Federal reajustar o teto do MEI). Ultrapassar em até 20% (${brl(tolerance)}) permite continuar no regime até dezembro pagando DAS complementar; acima disso o desenquadramento retroage ao início do ano.</div>
    </div>`;
}
function drawAnnualChart(){
  const canvas = document.getElementById('chartAnnual');
  if(!canvas) return;
  if(typeof Chart==='undefined'){ return; }
  const months = Array.from({length:12}, (_,i)=> `${currentYear}-${String(i+1).padStart(2,'0')}`);
  const data = months.map(ym=>blocoA(ym).lucroOperacional);
  new Chart(canvas, { type:'bar', data:{ labels: months.map(m=>monthLabel(m).slice(0,3)), datasets:[{ data, backgroundColor: data.map(v=>v<0?'#C13B32':'#0B7A6B'), borderRadius:4, maxBarThickness:34 }]},
    options:{ plugins:{legend:{display:false}, tooltip:{callbacks:{label:(c)=>brl(c.raw)}}}, scales:{ x:{grid:{display:false},ticks:{color:'#6B7080'}}, y:{grid:{color:'#E2E4E9'},ticks:{color:'#6B7080',callback:(v)=>'R$'+v}} } } });
}
function openInvestmentModal(){
  showModal('Novo investimento', `
    <div class="field"><label>Descrição</label><input id="invName" placeholder="Ex: Compra inicial de filamento"></div>
    <div class="row2">
      <div class="field"><label>Categoria</label><select id="invCategory" onchange="updateInvestmentFormVisibility()">
        <option value="Impressora">Impressora / equipamento</option>
        <option value="Filamento">Filamento</option>
        <option value="Embalagem">Caixas / embalagem</option>
        <option value="Ferramentas">Ferramentas</option>
        <option value="Outros">Outros</option>
      </select></div>
      <div class="field"><label>Valor total (R$)</label><input type="number" id="invValue" step="0.01"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Data da compra</label><input type="date" id="invDate" value="${todayStr()}"></div>
      <div class="field"><label>Forma de pagamento</label><select id="invPayType" onchange="updateInvestmentFormVisibility()">
        <option value="avista">À vista</option>
        <option value="parcelado">Parcelado</option>
      </select></div>
    </div>
    <div id="invParceladoBlock" style="display:none;">
      <div class="row2">
        <div class="field"><label>Número de parcelas</label><input type="number" id="invInstallments" value="2" min="2" step="1"></div>
        <div class="field"><label>Mês da 1ª parcela</label><input type="month" id="invStartMonth" value="${todayStr().slice(0,7)}"></div>
      </div>
      <div class="field hint" style="margin-top:-8px;">Cada parcela conta no mês em que é paga, não tudo de uma vez na data da compra — e já aparece em Caixa no mês certo.</div>
    </div>
    <div id="invMachineSyncBlock" style="display:none;background:var(--bg-alt);border:1px solid var(--line-soft);border-radius:8px;padding:10px 12px;margin-bottom:12px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim);"><input type="checkbox" id="invSyncMachine" style="width:auto;" checked> Cadastrar automaticamente como impressora no Bloco B (Caixa)</label>
      <div class="field hint" style="margin-top:6px;">Cria uma impressora nova em Configurações com essa parcela — não afeta impressoras já cadastradas.</div>
    </div>
    <div id="invStockBlock" style="display:none;background:var(--bg-alt);border:1px solid var(--line-soft);border-radius:8px;padding:10px 12px;margin-bottom:12px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim);margin-bottom:8px;"><input type="checkbox" id="invAddStock" style="width:auto;" checked onchange="document.getElementById('invStockFields').style.display=this.checked?'grid':'none'"> Já entra no estoque de matéria-prima</label>
      <div id="invStockFields" class="row2" style="margin-bottom:0;">
        <div class="field" style="margin-bottom:0;"><label>Material</label><select id="invMaterial"></select></div>
        <div class="field" style="margin-bottom:0;"><label>Quantidade recebida</label><input type="number" id="invQty" step="0.01" placeholder="Ex: 1000"></div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmInvestment()">Adicionar</button>
    </div>
  `);
  updateInvestmentFormVisibility();
}
function updateInvestmentFormVisibility(){
  const cat = document.getElementById('invCategory').value;
  const payType = document.getElementById('invPayType').value;
  document.getElementById('invParceladoBlock').style.display = payType==='parcelado' ? 'block' : 'none';
  document.getElementById('invMachineSyncBlock').style.display = (cat==='Impressora' && payType==='parcelado') ? 'block' : 'none';
  const isStockCategory = cat==='Filamento' || cat==='Embalagem' || cat==='Ferramentas';
  document.getElementById('invStockBlock').style.display = isStockCategory ? 'block' : 'none';
  if(isStockCategory){
    const matSelect = document.getElementById('invMaterial');
    const opts = state.materials.filter(m=>m.category===cat);
    matSelect.innerHTML = opts.length
      ? opts.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')
      : `<option value="">Nenhum material dessa categoria — cadastre em Estoque primeiro</option>`;
  }
}
function confirmInvestment(){
  const name = document.getElementById('invName').value.trim();
  const value = parseFloat(document.getElementById('invValue').value)||0;
  const date = document.getElementById('invDate').value || todayStr();
  const paymentType = document.getElementById('invPayType').value;
  const category = document.getElementById('invCategory').value;
  if(!name || value<=0){ toast('Informe descrição e valor','err'); return; }
  const inv = { id:uid(), name, value, date, paymentType, category };
  let yearToShow = parseInt(date.slice(0,4));
  if(paymentType==='parcelado'){
    inv.installments = Math.max(1, parseInt(document.getElementById('invInstallments').value)||1);
    inv.startMonth = document.getElementById('invStartMonth').value || date.slice(0,7);
    yearToShow = parseInt(inv.startMonth.slice(0,4));
  }
  if(!state.settings.investments) state.settings.investments = [];
  state.settings.investments.push(inv);

  let extras = [];
  if(category==='Impressora' && paymentType==='parcelado' && document.getElementById('invSyncMachine').checked){
    inv.syncedToMachine = true;
    if(!state.settings.machines) state.settings.machines = [];
    state.settings.machines.push({
      id:uid(), name, price:value, installmentValue: value/inv.installments, installmentsTotal: inv.installments,
      startMonth: inv.startMonth, residual:0, lifeHours:5000, energyCostPerHour:0.0704,
    });
    extras.push('cadastrada como nova impressora no Bloco B');
  }
  if((category==='Filamento'||category==='Embalagem'||category==='Ferramentas') && document.getElementById('invAddStock') && document.getElementById('invAddStock').checked){
    const matId = document.getElementById('invMaterial').value;
    const qty = parseFloat(document.getElementById('invQty').value)||0;
    const mat = state.materials.find(m=>m.id===matId);
    if(mat && qty>0){
      mat.stock += qty;
      mat.purchasePrice = value; mat.purchaseQty = qty; mat.costPerUnit = value/qty;
      saveMaterials();
      extras.push(`${num(qty,1)} ${mat.unit} adicionados ao estoque de "${mat.name}"`);
    }
  }
  currentYear = yearToShow;
  saveSettings();
  toast('Investimento adicionado' + (extras.length ? ' — ' + extras.join(' · ') : ''));
  closeModal(); renderContent();
}
function deleteInvestment(id){
  if(!confirm('Excluir este investimento?')) return;
  state.settings.investments = state.settings.investments.filter(x=>x.id!==id);
  saveSettings();
  toast('Investimento excluído');
  renderContent();
}

/* ===================== PIX ===================== */
function crc16(payload){
  let crc = 0xFFFF;
  for(let i=0;i<payload.length;i++){
    crc ^= (payload.charCodeAt(i) << 8);
    for(let j=0;j<8;j++){
      crc = (crc & 0x8000) ? ((crc<<1) ^ 0x1021) & 0xFFFF : (crc<<1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
function pixSanitize(s){
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9 ]/g,'').toUpperCase().trim();
}
function pixField(id, value){
  return `${id}${String(value.length).padStart(2,'0')}${value}`;
}
function buildPixPayload({key, name, city, amount, txid}){
  const merchantAccount = pixField('26', pixField('00','br.gov.bcb.pix') + pixField('01', key));
  const amountField = amount>0 ? pixField('54', amount.toFixed(2)) : '';
  const addData = pixField('62', pixField('05', (txid||'***').slice(0,25)));
  const base = pixField('00','01') + merchantAccount + pixField('52','0000') + pixField('53','986') + amountField
    + pixField('58','BR') + pixField('59', pixSanitize(name).slice(0,25)||'PIECE OF GEEK 3D') + pixField('60', pixSanitize(city).slice(0,15)||'SAO PAULO') + addData + '6304';
  return base + crc16(base);
}
function openPixQr(containerId, amount){
  if(!state.settings.pixKey){ toast('Configure sua chave PIX em Configurações → Precificação primeiro','err'); return; }
  const payload = buildPixPayload({
    key: state.settings.pixKey, name: state.settings.pixMerchantName, city: state.settings.pixMerchantCity,
    amount, txid: 'VENDA'+Date.now().toString().slice(-8),
  });
  const area = document.getElementById(containerId);
  if(!area) return;
  area.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px;background:var(--bg-alt);border-radius:8px;border:1px solid var(--line-soft);">
      <div id="pixQrCode_${containerId}" style="background:#fff;padding:8px;border-radius:8px;"></div>
      <textarea readonly style="width:100%;font-family:var(--font-mono);font-size:11px;height:56px;resize:none;" onclick="this.select()">${payload}</textarea>
      <button class="btn sm" style="width:100%;" onclick="navigator.clipboard.writeText('${payload}').then(()=>toast('Código PIX copiado')).catch(()=>toast('Não consegui copiar — selecione o texto manualmente','err'))">Copiar código PIX</button>
    </div>`;
  if(typeof QRCode!=='undefined'){
    new QRCode(document.getElementById('pixQrCode_'+containerId), { text: payload, width:160, height:160, colorDark:'#000000', colorLight:'#ffffff' });
  }
}

function machineHoursUsed(machineId){
  const m = (state.settings.machines||[]).find(x=>x.id===machineId);
  return m ? (m.hoursUsed||0) : 0;
}
function backfillMachineHours(){
  (state.settings.machines||[]).forEach(m=>{
    if(m.hoursUsed==null){
      m.hoursUsed = state.sales.filter(s=>s.machineId===m.id).reduce((a,s)=>a+(s.hoursUsed||0),0);
    }
  });
}
function printHTML(html){
  const area = document.getElementById('catalogPrintArea');
  area.innerHTML = html;
  document.body.classList.add('printing-catalog');
  const cleanup = ()=>{ document.body.classList.remove('printing-catalog'); window.removeEventListener('afterprint', cleanup); };
  window.addEventListener('afterprint', cleanup);
  setTimeout(()=>window.print(), 80);
}
function printSaleReceipt(saleId){
  const s = state.sales.find(x=>x.id===saleId);
  if(!s) return;
  const lines = s.groupId ? state.sales.filter(x=>x.groupId===s.groupId) : [s];
  const cuName = s.customerId ? ((state.customers.find(cu=>cu.id===s.customerId)||{}).name || 'Cliente avulso') : 'Cliente avulso';
  const total = lines.reduce((a,l)=>a+l.grossPrice,0);
  const rows = lines.map((l,i)=>`<tr style="${i%2===0?'background:#F6F7F9;':''}"><td style="padding:8px 10px;">${l.productName}</td><td style="text-align:center;padding:8px 10px;">${l.qty}</td><td style="text-align:right;padding:8px 10px;">${brl(l.grossPrice/l.qty)}</td><td style="text-align:right;padding:8px 10px;">${brl(l.grossPrice)}</td></tr>`).join('');
  printHTML(`
    <div class="catalog-summary" style="max-width:480px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;margin:0 0 4px;color:#BD4119;">${bizName()}</h1>
        <div style="color:#5D6270;font-size:12.5px;">Recibo de venda</div>
      </div>
      <div style="border-top:1px solid #E2E4E9;border-bottom:1px solid #E2E4E9;padding:14px 0;margin-bottom:18px;font-size:13px;color:#1A1D23;">
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5D6270;">Data</span><span>${fmtDate(s.date)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5D6270;">Cliente</span><span>${cuName}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5D6270;">Forma</span><span>${s.platform}</span></div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;color:#1A1D23;">
        <thead><tr style="border-bottom:1px solid #E2E4E9;color:#5D6270;"><th style="text-align:left;padding:6px 10px;">Produto</th><th style="text-align:center;padding:6px 10px;">Qtd</th><th style="text-align:right;padding:6px 10px;">Valor unit.</th><th style="text-align:right;padding:6px 10px;">Subtotal</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:bold;border-top:2px solid #1A1D23;padding-top:12px;color:#0B7A6B;">
        <span style="color:#1A1D23;">Total</span><span>${brl(total)}</span>
      </div>
      <div style="text-align:center;color:#5D6270;font-size:12px;margin-top:30px;">Obrigado pela preferência!</div>
    </div>
  `);
}
// Ícones simples e legíveis (não são o logotipo oficial pixel-a-pixel) —
// mantidos como formas geométricas básicas de propósito, pra renderizar de
// forma confiável tanto no HTML impresso quanto desenhados no canvas do PNG.
const WHATSAPP_ICON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align:-3px;margin-right:3px;"><circle cx="12" cy="12" r="12" fill="#25D366"/><path d="M7 8.5A2.5 2.5 0 0 1 9.5 6h5A2.5 2.5 0 0 1 17 8.5v3A2.5 2.5 0 0 1 14.5 14H11l-2.8 2.1c-.3.2-.7 0-.7-.4V14h-.5A2.5 2.5 0 0 1 7 11.5v-3Z" fill="#fff"/></svg>';
const INSTAGRAM_ICON_SVG = '<svg width="15" height="15" viewBox="0 0 24 24" style="vertical-align:-3px;margin-right:3px;"><rect x="2.5" y="2.5" width="19" height="19" rx="6" fill="none" stroke="#C13584" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#C13584" stroke-width="2"/><circle cx="17.3" cy="6.7" r="1.2" fill="#C13584"/></svg>';
function catalogContactLine(){
  const s = state.settings;
  const parts = [];
  if(s.whatsapp) parts.push(`<span style="white-space:nowrap;">${WHATSAPP_ICON_SVG}${s.whatsapp}</span>`);
  if(s.instagram) parts.push(`<span style="white-space:nowrap;">${INSTAGRAM_ICON_SVG}@${s.instagram}</span>`);
  return parts.join(' &nbsp;&nbsp; ');
}
function exportCatalogPDF(){
  if(state.products.length===0){ toast('Cadastre produtos antes de exportar o catálogo','err'); return; }
  const items = state.products.slice().sort((a,b)=>a.name.localeCompare(b.name));

  const cards = items.map(p=>{
    const price = calcProduct(p).practicedPrice;
    return `<div style="page-break-inside:avoid;border:1px solid #E2E4E9;border-radius:16px;overflow:hidden;background:#fff;">
      <div style="position:relative;width:100%;padding-top:100%;background:#F6F7F9;">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;overflow:hidden;">
          ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="font-family:var(--font-body);font-size:11px;font-weight:700;letter-spacing:.05em;color:#B9BEC9;">SEM FOTO</span>`}
        </div>
      </div>
      <div style="padding:14px 16px;">
        <div style="font-family:var(--font-display);font-weight:600;font-size:14.5px;color:#1A1D23;margin-bottom:10px;line-height:1.3;">${p.name}</div>
        <span style="display:inline-block;background:#E1F5F0;color:#0B7A6B;font-family:var(--font-mono);font-weight:700;font-size:13px;padding:5px 12px;border-radius:20px;">${brl(price)}</span>
      </div>
    </div>`;
  }).join('');

  const productPages = items.map(p=>{
    const c = calcProduct(p);
    const filSummary = (p.filaments||[]).map(f=>`${f.materialName} ${num(f.weightG,0)}g`).join(' + ');
    return `<div class="catalog-page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
      ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="max-width:320px;max-height:320px;object-fit:cover;border-radius:14px;margin-bottom:26px;box-shadow:0 4px 16px rgba(0,0,0,0.15);">` : ''}
      <h1 style="font-family:var(--font-display);font-size:30px;margin:0 0 12px;color:#1A1D23;">${p.name}</h1>
      <div style="font-family:var(--font-mono);font-size:34px;font-weight:bold;margin-bottom:22px;color:#0B7A6B;">${brl(c.practicedPrice)}</div>
      <div style="font-size:13.5px;color:#5D6270;line-height:2;max-width:420px;">
        ${filSummary ? `Filamento: ${filSummary}<br>` : ''}
        Peso total: ${num(totalWeight(p),0)}g &nbsp;·&nbsp; Tempo de impressão: ${num(p.timeH,1)}h
        ${p.kitComponents && p.kitComponents.length ? `<br>Composição: ${p.kitComponents.map(kc=>`${kc.qty>1?kc.qty+'x ':''}${kc.productName}`).join(' + ')}` : ''}
      </div>
    </div>`;
  }).join('');

  printHTML(`
    <div class="catalog-summary">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
        <img src="${bizLogoSrc()}" alt="${bizName()}" style="width:52px;height:52px;object-fit:cover;border-radius:14px;box-shadow:0 4px 10px rgba(189,65,25,0.28);">
        <div>
          <h1 style="font-family:var(--font-display);font-size:26px;margin:0;color:#1A1D23;">${bizName()}</h1>
          <div style="font-family:var(--font-body);font-weight:700;letter-spacing:.05em;text-transform:uppercase;font-size:11.5px;color:#5D6270;margin-top:2px;">Catálogo de produtos</div>
        </div>
      </div>
      <div style="border-top:1px solid #E2E4E9;margin-bottom:18px;"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">${cards}</div>
      <div style="border-top:1px solid #E2E4E9;margin-top:18px;padding-top:12px;color:#5D6270;font-size:11.5px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">
        <span>Preços sujeitos a alteração sem aviso prévio · Consulte disponibilidade</span>
        <span>${catalogContactLine()}</span>
      </div>
    </div>
    ${productPages}
  `);
}
function canvasRoundRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
// Quebra texto em até maxLines linhas dentro de maxWidth (canvas não quebra texto sozinho).
function canvasWrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines){
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for(let i=0;i<words.length;i++){
    const test = line ? line+' '+words[i] : words[i];
    if(ctx.measureText(test).width > maxWidth && line){
      lines.push(line);
      line = words[i];
      if(lines.length===maxLines) break;
    } else {
      line = test;
    }
  }
  if(lines.length<maxLines && line) lines.push(line);
  if(lines.length>maxLines) lines.length = maxLines;
  const joined = lines.join(' ');
  if(joined.length < text.length){
    let last = lines[lines.length-1];
    while(ctx.measureText(last+'…').width > maxWidth && last.length>1){ last = last.slice(0,-1).trimEnd(); }
    lines[lines.length-1] = last+'…';
  }
  lines.forEach((l,i)=>ctx.fillText(l, x, y+i*lineHeight));
  return lines.length;
}
// Desenha os mesmos ícones de contato do HTML impresso, só que como formas
// de canvas (o PNG exportado não pode usar as tags <svg> do catalogContactLine).
function drawContactIconsCanvas(ctx, startX, y){
  const s = state.settings;
  let x = startX;
  const iconSize = 15;
  ctx.font = "12px 'Inter', sans-serif";
  ctx.textAlign = 'left';
  if(s.whatsapp){
    ctx.fillStyle = '#25D366';
    ctx.beginPath(); ctx.arc(x+iconSize/2, y-iconSize/2+3, iconSize/2, 0, Math.PI*2); ctx.fill();
    ctx.save();
    ctx.translate(x, y-iconSize+3);
    ctx.scale(iconSize/24, iconSize/24);
    ctx.fillStyle = '#fff';
    ctx.fill(new Path2D('M7 8.5A2.5 2.5 0 0 1 9.5 6h5A2.5 2.5 0 0 1 17 8.5v3A2.5 2.5 0 0 1 14.5 14H11l-2.8 2.1c-.3.2-.7 0-.7-.4V14h-.5A2.5 2.5 0 0 1 7 11.5v-3Z'));
    ctx.restore();
    x += iconSize + 4;
    ctx.fillStyle = '#686D7C';
    ctx.fillText(s.whatsapp, x, y);
    x += ctx.measureText(s.whatsapp).width + 22;
  }
  if(s.instagram){
    ctx.strokeStyle = '#C13584'; ctx.lineWidth = 1.6;
    canvasRoundRectPath(ctx, x+1, y-iconSize+2, iconSize-2, iconSize-2, 4);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x+iconSize/2, y-iconSize/2+2, iconSize/2-4, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = '#C13584';
    ctx.beginPath(); ctx.arc(x+iconSize-3, y-iconSize+4, 1.1, 0, Math.PI*2); ctx.fill();
    x += iconSize + 4;
    ctx.fillStyle = '#686D7C';
    ctx.fillText('@'+s.instagram, x, y);
  }
}
async function exportCatalogImage(){
  if(state.products.length===0){ toast('Cadastre produtos antes de exportar o catálogo','err'); return; }
  const items = state.products.slice().sort((a,b)=>a.name.localeCompare(b.name));
  toast('Gerando catálogo...');
  if(document.fonts && document.fonts.ready) await document.fonts.ready;

  const loadImg = (src) => new Promise((resolve)=>{
    if(!src){ resolve(null); return; }
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>resolve(null);
    img.src = src;
  });
  const [logoImg, ...images] = await Promise.all([loadImg(bizLogoSrc()), ...items.map(p=>loadImg(p.photo))]);

  const width = 900;
  const margin = 36;
  const gap = 20;
  const cols = 2;
  const cardW = (width - margin*2 - gap*(cols-1)) / cols;
  const photoH = cardW;
  const textH = 96;
  const cardH = photoH + textH;
  const rowGap = 20;
  const headerH = 132;
  const footerH = 70;
  const rows = Math.ceil(items.length/cols);
  const height = headerH + rows*cardH + Math.max(0,rows-1)*rowGap + footerH;

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,width,height);

  const logoSize = 52;
  if(logoImg){
    canvasRoundRectPath(ctx, margin, 28, logoSize, logoSize, 14);
    ctx.save(); ctx.clip();
    const scale = Math.max(logoSize/logoImg.naturalWidth, logoSize/logoImg.naturalHeight);
    const iw = logoImg.naturalWidth*scale, ih = logoImg.naturalHeight*scale;
    ctx.drawImage(logoImg, margin+(logoSize-iw)/2, 28+(logoSize-ih)/2, iw, ih);
    ctx.restore();
  }
  const titleX = logoImg ? margin+logoSize+14 : margin;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1A1D23';
  ctx.font = "700 26px 'Space Grotesk', sans-serif";
  ctx.fillText(bizName(), titleX, 55);
  ctx.fillStyle = '#5D6270';
  ctx.font = "700 12px 'Inter', sans-serif";
  ctx.fillText('CATÁLOGO DE PRODUTOS', titleX, 75);

  ctx.strokeStyle = '#E2E4E9';
  ctx.beginPath(); ctx.moveTo(margin, headerH-24); ctx.lineTo(width-margin, headerH-24); ctx.stroke();

  items.forEach((p,i)=>{
    const col = i%cols, row = Math.floor(i/cols);
    const x = margin + col*(cardW+gap);
    const y = headerH + row*(cardH+rowGap);

    canvasRoundRectPath(ctx, x, y, cardW, cardH, 16);
    ctx.strokeStyle = '#E2E4E9'; ctx.lineWidth = 1; ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x+16,y); ctx.arcTo(x+cardW,y,x+cardW,y+photoH,16); ctx.lineTo(x+cardW,y+photoH); ctx.lineTo(x,y+photoH); ctx.arcTo(x,y,x+cardW,y,16); ctx.closePath();
    ctx.clip();
    ctx.fillStyle = '#F6F7F9'; ctx.fillRect(x,y,cardW,photoH);
    const img = images[i];
    if(img){
      const s = Math.max(cardW/img.naturalWidth, photoH/img.naturalHeight);
      const iw = img.naturalWidth*s, ih = img.naturalHeight*s;
      ctx.drawImage(img, x+(cardW-iw)/2, y+(photoH-ih)/2, iw, ih);
    } else {
      ctx.fillStyle = '#B9BEC9';
      ctx.font = "700 11px 'Inter', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('SEM FOTO', x+cardW/2, y+photoH/2+4);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    ctx.strokeStyle = '#EDEEF2';
    ctx.beginPath(); ctx.moveTo(x,y+photoH); ctx.lineTo(x+cardW,y+photoH); ctx.stroke();

    const price = calcProduct(p).practicedPrice;
    ctx.fillStyle = '#1A1D23';
    ctx.font = "600 15px 'Space Grotesk', sans-serif";
    canvasWrapText(ctx, p.name, x+16, y+photoH+26, cardW-32, 19, 2);

    ctx.font = "700 13px 'JetBrains Mono', monospace";
    const priceText = brl(price);
    const priceW = ctx.measureText(priceText).width + 20;
    const pillY = y+cardH-34;
    canvasRoundRectPath(ctx, x+16, pillY, priceW, 26, 13);
    ctx.fillStyle = '#E1F5F0'; ctx.fill();
    ctx.fillStyle = '#0B7A6B';
    ctx.fillText(priceText, x+26, pillY+18);
  });

  const footerY = headerH + rows*cardH + Math.max(0,rows-1)*rowGap + 28;
  ctx.strokeStyle = '#E2E4E9';
  ctx.beginPath(); ctx.moveTo(margin,footerY-14); ctx.lineTo(width-margin,footerY-14); ctx.stroke();
  ctx.fillStyle = '#686D7C';
  ctx.font = "12px 'Inter', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText('Preços sujeitos a alteração sem aviso prévio · Consulte disponibilidade', margin, footerY+4);
  drawContactIconsCanvas(ctx, margin, footerY+26);

  const link = document.createElement('a');
  link.download = `catalogo-piece-of-geek-3d-${todayStr()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('Catálogo exportado como imagem');
}

/* ===================== FILA DE IMPRESSÃO ===================== */
function printJobRecipe(prod){
  const bw = (bubbleWrapMaterial()||{}).name || 'Plástico Bolha';
  const tp = (tapeMaterial()||{}).name || 'Fita Adesiva';
  return productRecipe(prod).filter(r=>r.materialName!==prod.boxType && r.materialName!==bw && r.materialName!==tp);
}
function packagingRecipe(prod){
  const bw = (bubbleWrapMaterial()||{}).name || 'Plástico Bolha';
  const tp = (tapeMaterial()||{}).name || 'Fita Adesiva';
  return productRecipe(prod).filter(r=>r.materialName===prod.boxType || r.materialName===bw || r.materialName===tp);
}
function renderImpressao(){
  const thisMonth = todayStr().slice(0,7);
  const thisYear = todayStr().slice(0,4);
  const jobsMonth = state.printFailures.filter(f=>f.date && f.date.slice(0,7)===thisMonth);
  const jobsYear = state.printFailures.filter(f=>f.date && f.date.slice(0,4)===thisYear);
  const lossMonth = jobsMonth.reduce((a,f)=>a+(f.totalLoss||0),0);
  const lossYear = jobsYear.reduce((a,f)=>a+(f.totalLoss||0),0);
  const failuresMonth = jobsMonth.filter(f=>f.outcome==='failure').length;

  const recent = state.printFailures.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
  const outcomeBadge = (o)=>({success:'<span class="badge ok">Sucesso</span>',test:'<span class="badge info">Teste</span>',failure:'<span class="badge bad">Falha</span>'}[o]||o);

  return `
    <div class="grid g-3" style="margin-bottom:16px;">
      <div class="kpi" style="--accent:var(--red)"><div class="kpi-label">Perdido este mês</div><div class="kpi-value neg">${brl(lossMonth)}</div><div class="kpi-note">${failuresMonth} falha(s)</div></div>
      <div class="kpi" style="--accent:var(--red)"><div class="kpi-label">Perdido este ano</div><div class="kpi-value neg">${brl(lossYear)}</div><div class="kpi-note">${jobsYear.filter(f=>f.outcome==='failure').length} falha(s)</div></div>
      <div class="kpi"><div class="kpi-label">Impressões este mês</div><div class="kpi-value">${jobsMonth.length}</div></div>
    </div>
    <div class="card">
      <div class="card-title">Histórico de impressões<span class="sub">mais recentes primeiro</span></div>
      ${recent.length ? `<div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Data</th><th>Produto</th><th class="right">Qtd</th><th>Filamento gasto</th><th>Resultado</th><th class="right">Prejuízo</th><th>Obs.</th><th></th></tr></thead>
        <tbody>${recent.map(f=>{
          const filamentSummary = (f.filamentUsage||[]).map(u=>`${u.materialName} ${num(u.qty,1)}${u.unit}`).join(' + ') || '—';
          return `<tr>
          <td class="num" data-label="Data">${fmtDate(f.date)}</td>
          <td data-label="Produto">${f.productName}</td>
          <td class="right num" data-label="Qtd">${num(f.qty||1,0)}${f.outcome==='failure'&&f.pctComplete<100?` (${num(f.pctComplete,0)}%)`:''}</td>
          <td data-label="Filamento gasto" title="${filamentSummary}">${filamentSummary}</td>
          <td data-label="Resultado">${outcomeBadge(f.outcome)}</td>
          <td class="right num" data-label="Prejuízo" style="color:var(--red)">${f.totalLoss?brl(f.totalLoss):'—'}</td>
          <td data-label="Obs.">${f.notes||'—'}</td>
          <td class="right"><button class="btn ghost sm" onclick="openPrintJobModal('${f.productId}', ${f.qty||1}, '${f.outcome}', '${f.id}')">Editar</button> <button class="btn ghost sm" onclick="deletePrintJob('${f.id}')">Excluir</button></td>
        </tr>`;
        }).join('')}</tbody>
      </table></div>` : emptyState('Nenhuma impressão registrada ainda. Clique em "Nova impressão" pra começar.')}
    </div>
  `;
}
let editingPrintJobId = null;
let printJobFirstRender = false;
function openPrintJobModal(productId, presetQty, presetOutcome, editId){
  if(state.products.length===0){ toast('Cadastre um produto antes de registrar uma impressão','err'); return; }
  editingPrintJobId = editId || null;
  printJobFirstRender = !!editingPrintJobId;
  const editing = editingPrintJobId ? state.printFailures.find(x=>x.id===editingPrintJobId) : null;
  const selId = productId || (editing && editing.productId) || state.products[0].id;
  const outcomeVal = editing ? editing.outcome : (presetOutcome||'success');
  showModal(editing?'Editar impressão':'Nova impressão', `
    <div class="field"><label>Produto</label><select id="pjProd" onchange="updatePrintJobPreview()">
      ${state.products.map(p=>`<option value="${p.id}" ${p.id===selId?'selected':''}>${p.name}</option>`).join('')}
    </select></div>
    <div class="row3">
      <div class="field"><label>Quantidade</label><input type="number" id="pjQty" value="${editing?editing.qty:(presetQty||1)}" min="1" oninput="updatePrintJobPreview()"></div>
      <div class="field"><label>Data</label><input type="date" id="pjDate" value="${editing?editing.date:todayStr()}"></div>
      <div class="field"><label>Resultado</label><select id="pjOutcome" onchange="updatePrintJobPreview()">
        <option value="success" ${outcomeVal==='success'?'selected':''}>Sucesso — vai pro estoque</option>
        <option value="test" ${outcomeVal==='test'?'selected':''}>Teste — não vai pro estoque de venda</option>
        <option value="failure" ${outcomeVal==='failure'?'selected':''}>Falhou</option>
      </select></div>
    </div>
    <div id="pjPctBlock" style="display:${outcomeVal==='failure'?'block':'none'};"><div class="field"><label>% concluído antes de falhar</label><input type="number" id="pjPct" value="${editing?editing.pctComplete:100}" min="1" max="100" oninput="updatePrintJobPreview()"></div></div>
    <div class="field"><label>Observações (opcional)</label><input id="pjNotes" value="${editing?(editing.notes||''):''}" placeholder="Ex: descolou da mesa, entupiu o bico..."></div>
    <div class="field hint" style="margin-top:-8px;">Caixa e plástico bolha não são descontados aqui — só saem do estoque na hora da venda. Só o filamento sai agora.</div>
    <div class="helper-block" id="pjPreview"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmPrintJob()">${editing?'Salvar alterações':'Registrar impressão'}</button>
    </div>
  `);
  updatePrintJobPreview();
}
function updatePrintJobPreview(){
  const prod = state.products.find(p=>p.id===document.getElementById('pjProd').value);
  const qty = parseFloat(document.getElementById('pjQty').value)||0;
  const outcome = document.getElementById('pjOutcome').value;
  document.getElementById('pjPctBlock').style.display = outcome==='failure' ? 'block' : 'none';
  const pct = outcome==='failure' ? Math.min(100,Math.max(1,parseFloat(document.getElementById('pjPct').value)||100)) : 100;
  const recipe = printJobRecipe(prod);
  const editing = editingPrintJobId ? state.printFailures.find(x=>x.id===editingPrintJobId) : null;
  const useStored = printJobFirstRender && editing && editing.filamentUsage;
  const lines = recipe.map((r,i)=>{
    const mat = materialByName(r.materialName);
    const calcNeed = r.qty*qty*(pct/100);
    const storedU = useStored ? editing.filamentUsage.find(u=>u.materialName===r.materialName) : null;
    const need = storedU ? storedU.qty : calcNeed;
    return `<div class="calc-line" style="align-items:center;">
      <span>${r.materialName} <span style="color:var(--text-faint);font-size:11px;">(estoque: ${mat?num(mat.stock,1):'0'}${mat?mat.unit:'g'})</span></span>
      <span><input type="number" id="pjFil_${i}" value="${(need||0).toFixed(1)}" step="0.1" style="width:80px;padding:4px 6px;text-align:right;"> ${mat?mat.unit:'g'}</span>
    </div>`;
  }).join('');
  const stockLine = outcome==='success'
    ? `<div class="calc-line total"><span>Estoque de "${prod.name}" após produção</span><span>${num(prod.stock,0)} → ${num(prod.stock+qty,0)}</span></div>`
    : `<div class="field hint" style="margin-top:6px;">${outcome==='test'?'Teste não soma no estoque disponível pra venda.':'Falha não soma no estoque.'}</div>`;
  document.getElementById('pjPreview').innerHTML = `<div class="field hint" style="margin:0 0 6px;">Quantidade de filamento — já calculada pela receita do produto, edite se o valor real foi diferente:</div>` + lines + stockLine;
  printJobFirstRender = false;
}
// Desfaz os efeitos de estoque/horas de máquina de um registro de impressão
// já salvo — usado tanto pra excluir quanto pra reaplicar depois de editar.
function reversePrintJobEffects(j){
  const prod = state.products.find(p=>p.id===j.productId);
  if(!prod) return;
  const usage = (j.filamentUsage && j.filamentUsage.length) ? j.filamentUsage : printJobRecipe(prod).map(r=>({materialName:r.materialName, qty:r.qty*(j.qty||1)*(j.pctComplete/100)}));
  usage.forEach(u=>{
    const mat = materialByName(u.materialName);
    if(mat) mat.stock += u.qty;
  });
  if(j.outcome==='success') prod.stock = Math.max(0, prod.stock - (j.qty||1));
  const machines = state.settings.machines||[];
  const machine = machines.find(m=>m.id===prod.machineId) || machines[0];
  if(machine) machine.hoursUsed = Math.max(0, (machine.hoursUsed||0) - (j.qty||1)*(prod.timeH||0)*(j.pctComplete/100));
}
function confirmPrintJob(){
  const prod = state.products.find(p=>p.id===document.getElementById('pjProd').value);
  const qty = parseFloat(document.getElementById('pjQty').value)||0;
  if(qty<=0){ toast('Informe uma quantidade válida','err'); return; }
  const outcome = document.getElementById('pjOutcome').value;
  const date = document.getElementById('pjDate').value || todayStr();
  const notes = document.getElementById('pjNotes').value.trim();
  const pctComplete = outcome==='failure' ? Math.min(100,Math.max(1,parseFloat(document.getElementById('pjPct').value)||100)) : 100;

  const recipe = printJobRecipe(prod);
  const filamentUsage = recipe.map((r,i)=>{
    const input = document.getElementById(`pjFil_${i}`);
    const qtyUsed = input ? Math.max(0, parseFloat(input.value)||0) : r.qty*qty*(pctComplete/100);
    return { materialName:r.materialName, qty:qtyUsed, unit:(materialByName(r.materialName)||{}).unit||'g' };
  });

  const oldJob = editingPrintJobId ? state.printFailures.find(x=>x.id===editingPrintJobId) : null;
  if(oldJob) reversePrintJobEffects(oldJob);

  let negativeWarn = false;
  filamentUsage.forEach(u=>{
    const mat = materialByName(u.materialName);
    if(mat){ mat.stock -= u.qty; if(mat.stock<0) negativeWarn=true; }
  });

  let totalLoss = 0, materialCost = 0, energyCost = 0;
  if(outcome==='success') prod.stock += qty;
  if(outcome==='failure'){
    materialCost = filamentUsage.reduce((sum,u)=>sum+u.qty*filamentCost(u.materialName),0);
    energyCost = calcProduct(prod).energyCost*qty*(pctComplete/100);
    totalLoss = materialCost+energyCost;
  }
  const machines = state.settings.machines||[];
  const machine = machines.find(m=>m.id===prod.machineId) || machines[0];
  if(machine){ machine.hoursUsed = (machine.hoursUsed||0) + qty*(prod.timeH||0)*(pctComplete/100); }

  if(oldJob){
    Object.assign(oldJob, { date, productId:prod.id, productName:prod.name, qty, outcome, pctComplete, materialCost, energyCost, totalLoss, notes, filamentUsage });
  } else {
    state.printFailures.push({ id:uid(), date, productId:prod.id, productName:prod.name, qty, outcome, pctComplete, materialCost, energyCost, totalLoss, notes, filamentUsage });
  }
  saveMaterials(); savePrintFailures(); saveProducts(); if(machine) saveSettings();

  const msgs = { success:'Impressão registrada — estoque atualizado', test:'Impressão de teste registrada', failure:`Falha registrada — prejuízo de ${brl(totalLoss)}` };
  toast((negativeWarn?'Atenção: estoque de matéria-prima negativo — ':'') + (oldJob?'Registro atualizado':msgs[outcome]), negativeWarn?'err':'');
  editingPrintJobId = null;
  closeModal(); renderContent();
}
function deletePrintJob(id){
  const j = state.printFailures.find(x=>x.id===id);
  if(!j) return;
  if(!confirm(`Excluir esse registro de impressão? O material usado volta pro estoque${j.outcome==='success'?' e o estoque do produto é ajustado':''}.`)) return;
  reversePrintJobEffects(j);
  saveMaterials(); saveProducts(); saveSettings();
  state.printFailures = state.printFailures.filter(x=>x.id!==id);
  savePrintFailures();
  toast('Registro excluído');
  renderContent();
}
/* ===================== CÁLCULO ===================== */
function renderCalculo(){
  const machines = state.settings.machines||[];
  const tariff = state.settings.energyTariffPerKwh||0;
  return `
    <div class="section-title" style="margin-top:0;">Tarifa de energia elétrica</div>
    <div class="card">
      <div class="row2">
        <div class="field"><label>Tarifa (R$ por kWh)</label><input type="number" id="calcTariff" value="${tariff}" step="0.001" onchange="updateEnergyTariff(this.value)"></div>
        <div class="field"><label class="hint" style="display:block;margin-bottom:5px;">&nbsp;</label><div class="hint" style="padding-top:9px;">Confira o valor exato na sua fatura da Enel — o número muda com reajustes anuais e bandeiras tarifárias. Assim que atualizar aqui, todas as impressoras com potência preenchida recalculam sozinhas.</div></div>
      </div>
    </div>

    <div class="section-title">Impressoras — energia e depreciação</div>
    ${machines.length ? `<div class="card"><div class="tbl-wrap tbl-responsive"><table>
      <thead><tr><th>Impressora</th><th class="right">Potência</th><th class="right">Energia/h</th><th class="right">Preço − residual</th><th class="right">Vida útil</th><th class="right">Depreciação/h</th></tr></thead>
      <tbody>${machines.map(m=>`<tr>
        <td data-label="Impressora">${m.name}</td>
        <td class="right num" data-label="Potência">${m.powerConsumptionKw>0 ? num(m.powerConsumptionKw,2)+' kW' : '<span class="chip">manual</span>'}</td>
        <td class="right num" data-label="Energia/h">${brl(machineEnergyCostPerHour(m))}</td>
        <td class="right num" data-label="Preço − residual">${brl(m.price)} − ${brl(m.residual||0)}</td>
        <td class="right num" data-label="Vida útil">${num(m.lifeHours||0,0)}h</td>
        <td class="right num" data-label="Depreciação/h">${brl(machineDeprCostPerHour(m))}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="field hint" style="margin-top:10px;">Energia/h = potência (kW) × tarifa. Se a potência estiver em branco, usa o valor manual definido na impressora. Depreciação/h = (preço − valor residual) ÷ vida útil em horas — quanto a máquina "perde de valor" a cada hora de uso.</div>
    </div>` : `<div class="card">${emptyState('Nenhuma impressora cadastrada — adicione em "Gerenciar impressoras"')}</div>`}

    <div class="section-title">Uso e manutenção</div>
    ${machines.length ? `<div class="grid g-3">
      ${machines.map(m=>{
        const used = machineHoursUsed(m.id);
        const life = m.lifeHours||0;
        const pctUsed = life>0 ? Math.min(100,(used/life)*100) : 0;
        const color = pctUsed>=90 ? 'var(--red)' : pctUsed>=70 ? 'var(--amber)' : 'var(--teal)';
        const badge = pctUsed>=100 ? '<span class="badge bad">Vida útil atingida</span>' : pctUsed>=90 ? '<span class="badge bad">Manutenção urgente</span>' : pctUsed>=70 ? '<span class="badge warn">Fique de olho</span>' : '<span class="badge ok">Ok</span>';
        const log = m.maintenanceLog||[];
        const last = log.length ? log.slice().sort((a,b)=>b.date.localeCompare(a.date))[0] : null;
        return `<div class="card">
          <div style="font-weight:600;font-size:13px;">${m.name}</div>
          <div style="font-family:var(--font-mono);font-size:18px;font-weight:600;margin:8px 0 4px;">${num(used,0)}h <span style="font-size:12px;color:var(--text-faint);font-weight:400;">/ ${num(life,0)}h</span></div>
          <div class="progress"><div style="width:${pctUsed}%;background:${color};"></div></div>
          <div style="margin-top:8px;">${badge}</div>
          <div style="margin-top:10px;font-size:11.5px;color:var(--text-faint);">${last ? `Última manutenção: ${fmtDate(last.date)}${last.note?' — '+last.note:''}` : 'Nenhuma manutenção registrada'}</div>
          <button class="btn ghost sm" style="width:100%;margin-top:8px;" onclick="openMaintenanceModal('${m.id}')">Registrar manutenção</button>
        </div>`;
      }).join('')}
    </div>
    <div class="field hint" style="margin-top:10px;">Horas somadas a partir de cada impressão registrada na Fila de Impressão (sucesso, teste ou falha — todas gastam tempo de máquina de verdade). Ajuste a "vida útil" de cada impressora em "Gerenciar impressoras" conforme sua experiência real de manutenção.</div>` : ''}

    <div class="section-title">Mão de obra</div>
    <div class="card">
      <div class="calc-line"><span>Valor da sua hora de trabalho</span><span>${brl(state.settings.laborHourlyRate||0)}/h</span></div>
      <div class="field hint" style="margin-top:8px;">Multiplicado pelos minutos de pintura/montagem/acabamento que você informa em cada produto. Editável em "Gerenciar impressoras" (mesma tela de configurações).</div>
    </div>

    <div class="section-title">As fórmulas, uma por uma</div>
    <div class="card">
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div>
          <div style="font-weight:600;font-size:13.5px;">1. Custo de material</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">peso (g) × custo por grama do filamento</div>
          <div style="font-size:12px;color:var(--text-dim);">Se o produto usa mais de um filamento (ex: peça bicolor), soma o custo de cada um.</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">2. Custo de energia</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">tempo de impressão (h) × custo de energia da impressora (R$/h)</div>
          <div style="font-size:12px;color:var(--text-dim);">O R$/h vem da impressora usada nesse produto — potência × tarifa, se preenchido, ou o valor manual dela.</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">3. Custo de embalagem</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">custo da caixa + (metros de plástico bolha × custo por metro)</div>
          <div style="font-size:12px;color:var(--text-dim);">Só a caixa e o plástico bolha marcados como tal em Estoque entram aqui.</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">4. Depreciação</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">tempo de impressão (h) × [(preço da impressora − valor residual) ÷ vida útil em horas]</div>
          <div style="font-size:12px;color:var(--text-dim);">É quanto a impressora "se desgasta" durante essa impressão específica — não é a parcela que você paga por mês, é um custo de uso da máquina.</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">5. Manutenção</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">tempo de impressão (h) × custo de manutenção da impressora (R$/h)</div>
          <div style="font-size:12px;color:var(--text-dim);">Estimativa fixa de troca de bico, correias, limpeza — configurável em "Gerenciar impressoras", não é calculada a partir do histórico de manutenção (poucas horas rodadas fariam o valor oscilar demais).</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">6. Custo de mão de obra</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">(minutos de pós-processamento ÷ 60) × valor da sua hora</div>
          <div style="font-size:12px;color:var(--text-dim);">Pintura, montagem, acabamento — qualquer trabalho manual depois que a peça sai da impressora.</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">7. Custo de falha</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">(material + energia + depreciação + 50% da mão de obra) × margem de falha%</div>
          <div style="font-size:12px;color:var(--text-dim);">Cobre o risco de uma impressão falhar antes de terminar. Embalagem fica de fora — caixa e plástico bolha só são gastos depois que a peça sai boa. Metade da mão de obra entra porque setup e a descoberta da falha consomem tempo mesmo quando a impressão não termina.</div>
        </div>
        <div style="border-top:1px solid var(--line);padding-top:14px;">
          <div style="font-weight:600;font-size:13.5px;">Custo total</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">material + energia + embalagem + depreciação + manutenção + mão de obra + falha</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">Preço sugerido</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">custo total ÷ (1 − margem de lucro desejada%)</div>
          <div style="font-size:12px;color:var(--text-dim);">Essa divisão (em vez de multiplicar o custo) garante que a margem escolhida seja sobre o <em>preço de venda</em>, não sobre o custo — assim uma margem de 40% realmente sobra 40% do que o cliente paga, não 40% em cima do custo (que na prática é menos que isso).</div>
        </div>
      </div>
    </div>

    <div class="section-title">Veja aplicado num produto real</div>
    <div class="card">
      <div class="field"><label>Ver exemplo com o produto</label><select id="calcProdSelect" onchange="updateCalculoExample()">
        ${state.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}
      </select></div>
      <div id="calculoExample"></div>
    </div>

  `;
}
function updateEnergyTariff(val){
  state.settings.energyTariffPerKwh = parseFloat(val)||0;
  saveSettings();
  toast('Tarifa de energia atualizada');
  renderContent();
}
function updateCalculoExample(){
  const sel = document.getElementById('calcProdSelect');
  const box = document.getElementById('calculoExample');
  if(!sel || !box) return;
  if(state.products.length===0){ box.innerHTML = emptyState('Cadastre um produto pra ver o exemplo'); return; }
  const prod = state.products.find(p=>p.id===sel.value) || state.products[0];
  const c = calcProduct(prod);
  box.innerHTML = `
    <div class="helper-block" style="margin-top:12px;">
      <div class="calc-line"><span>Material (${(prod.filaments||[]).map(f=>`${f.materialName} ${num(f.weightG,0)}g`).join(' + ')})</span><span>${brl(c.materialCost)}</span></div>
      <div class="calc-line"><span>Energia (${prod.timeH}h × ${brl(c.machine?machineEnergyCostPerHour(c.machine):0)}/h em ${c.machine?c.machine.name:'—'})</span><span>${brl(c.energyCost)}</span></div>
      <div class="calc-line"><span>Embalagem (caixa + plástico bolha + fita)</span><span>${brl(c.embalagemCost)}</span></div>
      <div class="calc-line"><span>Depreciação (${prod.timeH}h × ${brl(c.machine?machineDeprCostPerHour(c.machine):0)}/h em ${c.machine?c.machine.name:'—'})</span><span>${brl(c.depreciation)}</span></div>
      <div class="calc-line"><span>Manutenção (${prod.timeH}h × ${brl(c.machine?machineMaintenanceCostPerHour(c.machine):0)}/h)</span><span>${brl(c.maintenance)}</span></div>
      <div class="calc-line"><span>Mão de obra (${(prod.laborActions||[]).length ? (prod.laborActions||[]).map(a=>`${a.action||'(sem nome)'} ${a.minutes}min`).join(' + ') : 'nenhuma ação cadastrada'} × ${brl(state.settings.laborHourlyRate||0)}/h)</span><span>${brl(c.laborCost)}</span></div>
      ${(prod.toolsUsed||[]).length ? `<div class="calc-line"><span>Ferramentas (${(prod.toolsUsed||[]).map(t=>{ const tool=state.materials.find(x=>x.id===t.toolId); return `${tool?tool.name:'?'} ${t.uses}x`; }).join(' + ')})</span><span>${brl(c.toolsCost)}</span></div>` : ''}
      <div class="calc-line"><span>Custo de falha (${num(prod.failureMarginPct*100,0)}% sobre material+energia+depreciação+50% da mão de obra)</span><span>${brl(c.failureCost)}</span></div>
      <div class="calc-line total"><span>Custo total</span><span>${brl(c.totalCost)}</span></div>
      <div class="calc-line total"><span>Preço sugerido — venda própria (margem de ${num(c.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
      ${platformBreakdownHtml('Mercado Livre', c.suggestedPriceMl, c.mlFeeAmount, c.mlFeePct, prod.mlRealFeePct!=null?'real':'estimada', c.effectiveFreightMl, 'Frete estimado', c.netReceiptMl)}
      ${platformBreakdownHtml('Shopee', c.suggestedPriceShopee, c.shopeeFeeAmount, c.shopeeFeePct, 'estimada', c.effectiveFreightShopee, 'Frete acima do subsídio (sai do seu bolso)', c.netReceiptShopee, c.estimatedShopeeFreightCap!=null ? `Shopee subsidia o frete até ${brl(c.estimatedShopeeFreightCap)} nessa faixa de preço — você só paga o que passar disso.` : null)}
      ${extraListingPlatforms().map(plat=>`<div class="calc-line" style="color:var(--text-faint);"><span>↳ ${plat.name} (já com a taxa)</span><span>${brl(c.suggestedPriceExtra[plat.id])}</span></div>`).join('')}
      <div class="calc-line" style="margin-top:8px;"><span>Preço praticado</span><span>${brl(c.practicedPrice)}</span></div>
      <div class="calc-line"><span>Margem — venda própria / ML / Shopee</span><span style="color:${c.marginValue<0?'var(--red)':'var(--green)'}">${pct(c.marginPct)} · ${pct(c.marginMlPct)} · ${pct(c.marginShopeePct)}</span></div>
    </div>
  `;
}

/* ===================== VENDAS ===================== */
function renderVendas(){
  let list = state.sales.slice();
  if(salesFilter.platform) list = list.filter(s=>s.platform===salesFilter.platform);
  if(salesFilter.product) list = list.filter(s=>s.productId===salesFilter.product);
  if(salesFilter.from) list = list.filter(s=>s.date>=salesFilter.from);
  if(salesFilter.to) list = list.filter(s=>s.date<=salesFilter.to);
  list.sort((a,b)=>b.date.localeCompare(a.date));

  const totals = list.reduce((acc,s)=>{ acc.gross+=s.grossPrice; acc.fee+=s.feeTotal; acc.net+=s.netReceipt; acc.cost+=s.productionCost; acc.shipping+=(s.shippingCost||0); acc.coupon+=(s.couponDiscount||0); acc.profit+=s.profit; return acc; }, {gross:0,fee:0,net:0,cost:0,shipping:0,coupon:0,profit:0});

  return `
    <div class="filter-bar">
      <div class="field"><label>Plataforma</label><select onchange="salesFilter.platform=this.value; renderContent();">
        <option value="">Todas</option>
        ${state.settings.platforms.map(p=>`<option value="${p.name}" ${salesFilter.platform===p.name?'selected':''}>${p.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>Produto</label><select onchange="salesFilter.product=this.value; renderContent();">
        <option value="">Todos</option>
        ${state.products.map(p=>`<option value="${p.id}" ${salesFilter.product===p.id?'selected':''}>${p.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>De</label><input type="date" value="${salesFilter.from}" onchange="salesFilter.from=this.value; renderContent();"></div>
      <div class="field"><label>Até</label><input type="date" value="${salesFilter.to}" onchange="salesFilter.to=this.value; renderContent();"></div>
      ${(salesFilter.platform||salesFilter.product||salesFilter.from||salesFilter.to) ? `<button class="btn ghost sm" onclick="salesFilter={platform:'',product:'',from:'',to:''}; renderContent();">Limpar filtros</button>` : ''}
    </div>

    <div class="grid ${totals.coupon>0?'g-5':'g-4'}" style="margin-bottom:16px;">
      <div class="kpi" style="--accent:var(--nozzle)"><div class="kpi-label">Bruto</div><div class="kpi-value" style="font-size:18px;">${brl(totals.gross)}</div></div>
      <div class="kpi" style="--accent:var(--amber)"><div class="kpi-label">Taxas</div><div class="kpi-value" style="font-size:18px;">${brl(totals.fee)}</div></div>
      <div class="kpi" style="--accent:var(--teal)"><div class="kpi-label">Recebido líquido</div><div class="kpi-value" style="font-size:18px;">${brl(totals.net)}</div></div>
      ${totals.coupon>0 ? `<div class="kpi" style="--accent:var(--amber)"><div class="kpi-label">Descontos de cupom</div><div class="kpi-value" style="font-size:18px;">${brl(totals.coupon)}</div></div>` : ''}
      <div class="kpi" style="--accent:${totals.profit<0?'var(--red)':'var(--green)'}"><div class="kpi-label">Lucro real</div><div class="kpi-value ${totals.profit<0?'neg':'pos'}" style="font-size:18px;">${brl(totals.profit)}</div></div>
    </div>

    <div class="card">
      ${list.length===0 ? emptyState('Nenhuma venda encontrada. Clique em "Nova venda" para começar.') : `
      <div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Data</th><th>Produto</th><th>Cliente</th><th>Plataforma</th><th class="right">Qtd</th><th class="right">Preço bruto</th><th class="right">Taxa</th><th class="right">Líquido</th><th class="right">Custo prod.</th><th class="right">Frete</th><th class="right">Lucro</th><th>Rastreio</th><th></th></tr></thead>
        <tbody>
          ${list.map(s=>`<tr>
            <td class="num" data-label="Data">${fmtDate(s.date)}${s.groupId?' <span class="chip" title="Faz parte de uma venda com vários itens">🧾</span>':''}</td>
            <td data-label="Produto">${s.productName}</td>
            <td data-label="Cliente">${s.customerId ? ((state.customers.find(cu=>cu.id===s.customerId)||{}).name || '—') : '<span class="chip">avulso</span>'}</td>
            <td data-label="Plataforma">${platformBadge(s.platform)}</td>
            <td class="right num" data-label="Qtd">${s.qty}</td>
            <td class="right num" data-label="Preço bruto">${brl(s.grossPrice)}</td>
            <td class="right num" data-label="Taxa" style="color:var(--text-faint)">${brl(s.feeTotal)}</td>
            <td class="right num" data-label="Líquido">${brl(s.netReceipt)}</td>
            <td class="right num" data-label="Custo prod." style="color:var(--text-faint)">${brl(s.productionCost)}</td>
            <td class="right num" data-label="Frete" style="color:var(--text-faint)">${s.shippingCost ? brl(s.shippingCost) : '—'}</td>
            <td class="right num ${s.profit<0?'neg':''}" data-label="Lucro" style="${s.profit>=0?'color:var(--green)':''}">${brl(s.profit)}</td>
            <td data-label="Rastreio">${s.trackingCode ? `<span class="chip" style="cursor:pointer;font-family:var(--font-mono);" title="Clique para editar" onclick="openTrackingModal('${s.id}')">${s.trackingCode}</span>` : `<button class="btn ghost sm" onclick="openTrackingModal('${s.id}')">+ rastreio</button>`}</td>
            <td class="right"><button class="btn ghost sm" onclick="printSaleReceipt('${s.id}')">Recibo</button> <button class="btn ghost sm" onclick="deleteSale('${s.id}')">Excluir</button></td>
          </tr>`).join('')}
        </tbody>
      </table></div>`}
    </div>
  `;
}
function computeSaleReserveAllocations(calc, qty, profit){
  const allocations = {};
  state.settings.reserveGoals.forEach(g=>{
    if(g.autoMode==='cost_depreciation'){
      allocations[g.id] = calc.depreciation*qty;
    } else if(g.autoMode==='pct_profit' && g.autoPct>0 && profit>0){
      allocations[g.id] = profit * (g.autoPct/100);
    }
  });
  return allocations;
}
function applySaleReserveAllocations(allocations){
  Object.entries(allocations).forEach(([gid,amt])=>{
    const g = state.settings.reserveGoals.find(x=>x.id===gid);
    if(g) g.balance += amt;
  });
}
function reverseSaleReserveAllocations(sale){
  let touched = false;
  if(sale.reserveAllocations){
    Object.entries(sale.reserveAllocations).forEach(([gid,amt])=>{
      const g = state.settings.reserveGoals.find(x=>x.id===gid);
      if(g){ g.balance -= amt; touched = true; }
    });
  } else if(sale.depreciationAllocated){
    const fund = state.settings.reserveGoals.find(g=>g.name==='Fundo Nova Máquina (Depreciação)');
    if(fund){ fund.balance -= sale.depreciationAllocated; touched = true; }
  }
  return touched;
}
function openTrackingModal(saleId){
  const s = state.sales.find(x=>x.id===saleId);
  if(!s) return;
  showModal('Código de rastreio', `
    <div class="field"><label>Produto</label><input value="${s.productName}" disabled></div>
    <div class="field"><label>Código de rastreio</label><input id="trkCode" value="${s.trackingCode||''}" placeholder="Ex: BR123456789BR"></div>
    ${s.groupId ? `<div class="field hint" style="margin-top:-8px;">Essa venda faz parte de um carrinho com vários itens — o código vai ser aplicado a todos eles, já que normalmente vão no mesmo pacote.</div>` : ''}
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmTracking('${saleId}')">Salvar</button>
    </div>
  `);
}
function confirmTracking(saleId){
  const s = state.sales.find(x=>x.id===saleId);
  if(!s) return;
  const code = document.getElementById('trkCode').value.trim() || null;
  const targets = s.groupId ? state.sales.filter(x=>x.groupId===s.groupId) : [s];
  targets.forEach(t=>{ t.trackingCode = code; });
  saveSales();
  toast(code ? 'Código de rastreio salvo' : 'Código de rastreio removido');
  closeModal(); renderContent();
}
function deleteSale(id){
  const s = state.sales.find(x=>x.id===id);
  if(!s) return;
  const linkedOrder = s.linkedOrderId ? state.orders.find(o=>o.id===s.linkedOrderId && o.status==='Enviado') : null;
  let msg = `Excluir a venda de "${s.productName}" em ${fmtDate(s.date)}? O estoque do produto e as reservas alimentadas por ela serão ajustados.`;
  if(linkedOrder) msg += ` A encomenda vinculada volta pro status "Pronto para envio".`;
  if(!confirm(msg)) return;
  const prod = state.products.find(p=>p.id===s.productId);
  if(prod){
    prod.stock += s.qty;
    packagingRecipe(prod).forEach(r=>{
      const mat = materialByName(r.materialName);
      if(mat) mat.stock += r.qty * s.qty;
    });
  }
  const touchedReserves = reverseSaleReserveAllocations(s);
  if(linkedOrder) linkedOrder.status = 'Pronto para envio';
  state.sales = state.sales.filter(x=>x.id!==id);
  saveSales(); if(prod){ saveProducts(); saveMaterials(); } if(touchedReserves) saveSettings(); if(linkedOrder) saveOrders();
  toast(linkedOrder ? 'Venda excluída e encomenda voltou pra fila' : 'Venda excluída');
  renderContent();
}
let cartItems = [];
let cartOrderLinks = {};
// Se o produto tem um anúncio com preço específico pra essa plataforma
// (Mercado Livre/Shopee — ver aba Anúncios), usa ele; senão cai no preço
// praticado genérico do produto.
function listingPriceForPlatform(productId, platformName){
  const l = listingFor(productId);
  if(!l) return null;
  let key = /shopee/i.test(platformName||'') ? 'shopee' : /mercado ?livre/i.test(platformName||'') ? 'ml' : null;
  if(!key){
    const extraPlat = extraListingPlatforms().find(p=>p.name===platformName);
    if(extraPlat) key = extraPlat.id;
  }
  if(!key) return null;
  const raw = listingPlatformData(l, key).preco;
  if(!raw) return null;
  const val = parseFloat(String(raw).replace(',','.'));
  return isFinite(val) && val>0 ? val : null;
}
function cartItemDefaultPrice(productId, platformName){
  const prod = state.products.find(p=>p.id===productId);
  const fromListing = listingPriceForPlatform(productId, platformName);
  if(fromListing) return fromListing;
  if(!prod) return 0;
  const c = calcProduct(prod);
  if(/shopee/i.test(platformName||'')) return c.practicedPriceShopee;
  if(/mercado ?livre/i.test(platformName||'')) return c.practicedPriceMl;
  const extraPlat = extraListingPlatforms().find(p=>p.name===platformName);
  if(extraPlat) return (c.practicedPriceExtra||{})[extraPlat.id] || c.practicedPrice;
  return c.practicedPrice;
}
function newCartItem(productId, qty, platformName){
  const prod = state.products.find(p=>p.id===productId) || state.products[0];
  return { rowId: uid(), productId: prod.id, qty: qty||1, unitPrice: cartItemDefaultPrice(prod.id, platformName), priceTouched:false };
}
function openSaleModal(presetProductId, presetQty, presetOrderId){
  if(state.products.length===0){ toast('Cadastre um produto antes de registrar vendas','err'); return; }
  cartItems = [ newCartItem(presetProductId || state.products[0].id, presetQty||1, state.settings.platforms[0].name) ];
  cartOrderLinks = {};
  if(presetOrderId){ cartOrderLinks[cartItems[0].productId] = presetOrderId; }
  showModal('Nova venda', `
    <div class="field" style="margin-bottom:6px;"><label>Itens da venda</label></div>
    <div id="cartItemsList"></div>
    <button class="btn ghost sm" onclick="addCartItem()">+ Adicionar item</button>
    <div class="row2" style="margin-top:14px;">
      <div class="field"><label>Data</label><input type="date" id="sDate" value="${todayStr()}"></div>
      <div class="field"><label>Cliente (opcional)</label><select id="sCustomer">
        <option value="">Avulso / sem cadastro</option>
        ${state.customers.map(cu=>`<option value="${cu.id}">${cu.name}</option>`).join('')}
      </select></div>
    </div>
    <div class="row3">
      <div class="field"><label>Plataforma</label><select id="sPlat" onchange="onSalePlatformChange()">
        ${state.settings.platforms.map(p=>`<option value="${p.name}">${p.name} (${num(p.pct,0)}%${p.fixed?' + '+brl(p.fixed):''})</option>`).join('')}
      </select></div>
      <div class="field"><label>Taxa nessa venda (%)</label><input type="number" id="sFeePct" step="0.01" oninput="this.dataset.touched='1'; updateSalePreview()"></div>
      <div class="field"><label>Taxa fixa nessa venda (R$)</label><input type="number" id="sFeeFixed" step="0.01" oninput="this.dataset.touched='1'; updateSalePreview()"></div>
    </div>
    <div class="field hint" style="margin-top:-8px;margin-bottom:12px;">Vem preenchido com a taxa cadastrada da plataforma, mas edite se o Mercado Livre/Shopee cobrou diferente (aplica sobre o total da venda).</div>
    <div id="sTierNote"></div>
    <div class="row2">
      <div class="field"><label>Frete pago por você (R$, total da venda)</label><input type="number" id="sShipping" step="0.01" value="0" placeholder="Ex: frete grátis que você bancou" oninput="updateSalePreview()"></div>
      <div class="field"><label>Desconto de cupom/campanha (R$, opcional)</label><input type="number" id="sCoupon" step="0.01" value="0" placeholder="Quanto o ML/Shopee descontou por promoção"></div>
    </div>
    <div class="field"><label>Código de rastreio (opcional)</label><input id="sTracking" placeholder="Se já tiver na hora — dá pra adicionar depois também"></div>
    <div class="helper-block" id="salePreview"></div>
    <button class="btn ghost sm" style="width:100%;margin-top:10px;" id="sPixBtn">Gerar cobrança PIX</button>
    <div id="salePixArea" style="margin-top:10px;"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmSale()">Registrar venda</button>
    </div>
  `);
  renderCartItemsList();
  updateFeeDefaults();
  updateSalePreview();
}
function currentSalePlatform(){
  const el = document.getElementById('sPlat');
  return el ? el.value : state.settings.platforms[0].name;
}
function addCartItem(){
  cartItems.push(newCartItem(state.products[0].id, 1, currentSalePlatform()));
  renderCartItemsList();
  updateSalePreview();
}
function removeCartItem(rowId){
  if(cartItems.length<=1){ toast('A venda precisa de ao menos um item','err'); return; }
  cartItems = cartItems.filter(it=>it.rowId!==rowId);
  renderCartItemsList();
  updateSalePreview();
}
function updateCartItem(rowId, field, val){
  const item = cartItems.find(it=>it.rowId===rowId);
  if(!item) return;
  if(field==='productId'){
    item.productId = val;
    item.unitPrice = cartItemDefaultPrice(val, currentSalePlatform());
    item.priceTouched = false;
    renderCartItemsList();
  } else if(field==='qty'){
    item.qty = Math.max(1, parseInt(val)||1);
  } else if(field==='unitPrice'){
    item.unitPrice = parseFloat(val)||0;
    item.priceTouched = true;
  }
  updateSalePreview();
}
function onSalePlatformChange(){
  const platform = currentSalePlatform();
  cartItems.forEach(item=>{ if(!item.priceTouched) item.unitPrice = cartItemDefaultPrice(item.productId, platform); });
  renderCartItemsList();
  updateFeeDefaults();
  updateSalePreview();
}
function renderCartItemsList(){
  const el = document.getElementById('cartItemsList');
  if(!el) return;
  el.innerHTML = cartItems.map(item=>{
    const prod = state.products.find(p=>p.id===item.productId);
    return `<div style="display:grid;grid-template-columns:minmax(0,1fr) 52px 76px 28px;gap:6px;align-items:center;margin-bottom:8px;">
      <select style="min-width:0;" onchange="updateCartItem('${item.rowId}','productId',this.value)">
        ${state.products.map(p=>`<option value="${p.id}" ${p.id===item.productId?'selected':''}>${p.name}</option>`).join('')}
      </select>
      <input type="number" min="1" value="${item.qty}" title="Quantidade" style="min-width:0;padding:8px 4px;" oninput="updateCartItem('${item.rowId}','qty',this.value)">
      <input type="number" step="0.01" value="${item.unitPrice.toFixed(2)}" title="Preço unitário" style="min-width:0;padding:8px 4px;" oninput="updateCartItem('${item.rowId}','unitPrice',this.value)">
      <button class="btn ghost sm" title="Remover item" style="padding:6px 8px;" onclick="removeCartItem('${item.rowId}')">×</button>
    </div>`;
  }).join('');
}
function computeTieredFee(tiers, amount){
  const tier = tiers.find(t => amount <= t.max) || tiers[tiers.length-1];
  return { fee: amount*(tier.pct/100) + tier.fixed, tier };
}
function saleFeeFromForm(gross){
  if(gross<=0) return 0;
  const pctEl = document.getElementById('sFeePct'), fixedEl = document.getElementById('sFeeFixed');
  const touched = (pctEl && pctEl.dataset.touched) || (fixedEl && fixedEl.dataset.touched);
  const plat = state.settings.platforms.find(p=>p.name===document.getElementById('sPlat').value);
  if(!touched && plat && plat.tiers){
    return computeTieredFee(plat.tiers, gross).fee;
  }
  const pct = parseFloat(pctEl.value)||0;
  const fixed = parseFloat(fixedEl.value)||0;
  return gross*(pct/100) + fixed;
}
function updateFeeDefaults(){
  const plat = document.getElementById('sPlat').value;
  const p = state.settings.platforms.find(x=>x.name===plat);
  const pctEl = document.getElementById('sFeePct'), fixedEl = document.getElementById('sFeeFixed');
  if(pctEl && !pctEl.dataset.touched) pctEl.value = p ? p.pct : 0;
  if(fixedEl && !fixedEl.dataset.touched) fixedEl.value = p ? p.fixed : 0;
}
function matchingOrdersForProduct(productId){
  return state.orders.filter(o=>o.productId===productId && o.status!=='Enviado').sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
}
function onOrderMatchChange(productId, val){
  if(val) cartOrderLinks[productId] = val; else delete cartOrderLinks[productId];
}
function updateSalePreview(){
  const totalGross = cartItems.reduce((a,it)=>a+it.qty*it.unitPrice,0);
  const pctEl = document.getElementById('sFeePct'), fixedEl = document.getElementById('sFeeFixed');
  const touched = (pctEl && pctEl.dataset.touched) || (fixedEl && fixedEl.dataset.touched);
  const plat = state.settings.platforms.find(p=>p.name===document.getElementById('sPlat').value);
  let tierNote = '';
  if(!touched && plat && plat.tiers && totalGross>0){
    const { tier } = computeTieredFee(plat.tiers, totalGross);
    pctEl.value = tier.pct;
    fixedEl.value = tier.fixed;
    tierNote = `<div class="field hint" style="margin-top:-8px;margin-bottom:12px;color:var(--teal);">Faixa aplicada automaticamente: até ${(tier.max==null||!isFinite(tier.max))?'qualquer valor':brl(tier.max)} → ${tier.pct}%${tier.fixed?' + '+brl(tier.fixed):''} (tabela oficial Shopee 2026)</div>`;
  }
  const tierNoteEl = document.getElementById('sTierNote');
  if(tierNoteEl) tierNoteEl.innerHTML = tierNote;
  const totalFee = saleFeeFromForm(totalGross);
  const totalShipping = parseFloat(document.getElementById('sShipping').value)||0;

  let totalCost = 0, totalProfit = 0, allAllocations = {};
  const itemLines = cartItems.map(item=>{
    const prod = state.products.find(p=>p.id===item.productId);
    const itemGross = item.qty*item.unitPrice;
    const share = totalGross>0 ? itemGross/totalGross : 0;
    const itemFee = totalFee*share;
    const itemShipping = totalShipping*share;
    const calc = calcProduct(prod);
    const cost = calc.totalCost*item.qty;
    const net = itemGross-itemFee;
    const profit = net-cost-itemShipping;
    totalCost += cost; totalProfit += profit;
    const allocations = computeSaleReserveAllocations(calc, item.qty, profit);
    Object.entries(allocations).forEach(([gid,amt])=>{ allAllocations[gid]=(allAllocations[gid]||0)+amt; });
    const stockAfter = prod.stock - item.qty;
    let matchBlock = '';
    const matches = matchingOrdersForProduct(prod.id);
    if(matches.length){
      if(cartOrderLinks[prod.id]===undefined && matches.length===1){ cartOrderLinks[prod.id] = matches[0].id; }
      matchBlock = `<div style="margin-top:4px;font-size:11px;background:var(--bg-alt);border:1px solid var(--line-soft);border-radius:6px;padding:6px 8px;">
        <label style="font-size:11px;">Bate com pedido em aberto —</label>
        <select style="margin-top:3px;" onchange="onOrderMatchChange('${prod.id}', this.value); updateSalePreview();">
          <option value="">Não vincular</option>
          ${matches.map(o=>`<option value="${o.id}" ${cartOrderLinks[prod.id]===o.id?'selected':''}>${orderCustomerName(o)||'Sem cliente'} — ${o.qty}x${o.dueDate?' (prazo '+fmtDate(o.dueDate)+')':''}</option>`).join('')}
        </select>
      </div>`;
    }
    return `<div class="calc-line"><span>${item.qty}x ${prod.name}</span><span>${brl(itemGross)}</span></div>
      <div style="font-size:11px;color:${stockAfter<0?'var(--red)':'var(--text-faint)'};margin:-2px 0 4px;">Estoque após venda: ${num(stockAfter,0)} un${stockAfter<0?' (ficará negativo)':''}</div>
      ${matchBlock}`;
  }).join('');

  const allocLines = Object.entries(allAllocations).map(([gid,amt])=>{
    const g = state.settings.reserveGoals.find(x=>x.id===gid);
    return g ? `<div class="calc-line" style="color:var(--text-faint)"><span>↳ reserva automática: ${g.name}</span><span>${brl(amt)}</span></div>` : '';
  }).join('');

  document.getElementById('salePreview').innerHTML = `
    ${itemLines}
    <div class="calc-line" style="border-top:1px solid var(--line);margin-top:6px;padding-top:6px;"><span>Faturamento bruto (${cartItems.length} ${cartItems.length>1?'itens':'item'})</span><span>${brl(totalGross)}</span></div>
    <div class="calc-line"><span>Taxa da plataforma</span><span>-${brl(totalFee)}</span></div>
    <div class="calc-line"><span>Custo de produção total</span><span>-${brl(totalCost)}</span></div>
    ${totalShipping>0 ? `<div class="calc-line"><span>Frete pago por você</span><span>-${brl(totalShipping)}</span></div>` : ''}
    <div class="calc-line total"><span>Lucro real</span><span style="color:${totalProfit<0?'var(--red)':'var(--green)'}">${brl(totalProfit)}</span></div>
    ${allocLines}
  `;
  const pixBtn = document.getElementById('sPixBtn');
  if(pixBtn) pixBtn.onclick = ()=>openPixQr('salePixArea', totalGross);
}
function confirmSale(){
  const totalGross = cartItems.reduce((a,it)=>a+it.qty*it.unitPrice,0);
  if(cartItems.length===0 || totalGross<=0){ toast('Verifique os itens e valores da venda','err'); return; }
  if(cartItems.some(it=>it.qty<=0 || it.unitPrice<0)){ toast('Quantidade deve ser maior que zero e preço não pode ser negativo','err'); return; }
  const date = document.getElementById('sDate').value || todayStr();
  const plat = document.getElementById('sPlat').value;
  const customerId = document.getElementById('sCustomer').value || null;
  const totalFee = saleFeeFromForm(totalGross);
  const totalShipping = parseFloat(document.getElementById('sShipping').value)||0;
  const totalCoupon = parseFloat(document.getElementById('sCoupon').value)||0;
  const trackingCode = document.getElementById('sTracking').value.trim() || null;
  const groupId = cartItems.length>1 ? uid() : null;

  let totalAllocated = 0;
  let linkedCount = 0;
  let settingsTouched = false;
  let boxNegativeWarn = false;

  cartItems.forEach(item=>{
    const prod = state.products.find(p=>p.id===item.productId);
    if(!prod) return;
    const itemGross = item.qty*item.unitPrice;
    const share = totalGross>0 ? itemGross/totalGross : 0;
    const itemFee = totalFee*share;
    const itemShipping = totalShipping*share;
    const itemCoupon = totalCoupon*share;
    const calc = calcProduct(prod);
    const cost = calc.totalCost*item.qty;
    const net = itemGross-itemFee;
    const profit = net-cost-itemShipping;
    const allocations = computeSaleReserveAllocations(calc, item.qty, profit);
    const linkedOrderId = cartOrderLinks[prod.id] || null;
    state.sales.push({
      id:uid(), groupId, date, productId:prod.id, productName:prod.name, qty:item.qty, platform:plat,
      grossPrice:itemGross, feeTotal:itemFee, netReceipt:net, productionCost:cost, shippingCost:itemShipping, couponDiscount:itemCoupon, profit,
      reserveAllocations:allocations, machineId: calc.machine?calc.machine.id:null, hoursUsed:(prod.timeH||0)*item.qty, customerId, trackingCode, linkedOrderId,
    });
    prod.stock -= item.qty;
    packagingRecipe(prod).forEach(r=>{
      const mat = materialByName(r.materialName);
      if(mat){ mat.stock -= r.qty*item.qty; if(mat.stock<0) boxNegativeWarn = true; }
    });
    applySaleReserveAllocations(allocations);
    if(Object.keys(allocations).length){ settingsTouched = true; totalAllocated += Object.values(allocations).reduce((a,v)=>a+v,0); }
    if(linkedOrderId){
      const ord = state.orders.find(o=>o.id===linkedOrderId);
      if(ord){ ord.status='Enviado'; linkedCount++; }
    }
  });

  saveSales(); saveProducts(); saveMaterials();
  if(linkedCount>0) saveOrders();
  if(settingsTouched) saveSettings();

  const itemMsg = cartItems.length>1 ? `${cartItems.length} itens registrados` : 'Venda registrada';
  const allocMsg = totalAllocated>0 ? ` — ${brl(totalAllocated)} reservado automaticamente` : '';
  const linkMsg = linkedCount>0 ? ` — ${linkedCount} pedido(s) marcado(s) como enviado` : '';
  const boxMsg = boxNegativeWarn ? ' — atenção: estoque de caixa/embalagem negativo' : '';
  toast(itemMsg + allocMsg + linkMsg + boxMsg, boxNegativeWarn?'err':'');
  closeModal();
  renderContent();
}

/* ===================== CLIENTES ===================== */

/* ===================== CLIENTES ===================== */
function customerStats(customerId){
  const sales = state.sales.filter(s=>s.customerId===customerId);
  const total = sales.reduce((a,s)=>a+s.grossPrice,0);
  const lastDate = sales.reduce((a,s)=>s.date>a?s.date:a, '');
  return { qtd: sales.length, total, lastDate };
}
let clientesFilter = { search:'', sortKey:'total', sortDir:-1 };
function toggleClientSort(key){
  if(clientesFilter.sortKey===key){ clientesFilter.sortDir*=-1; }
  else { clientesFilter.sortKey=key; clientesFilter.sortDir=1; }
  renderContent();
}
function renderClientes(){
  if(state.customers.length===0) return `<div class="card">${emptyState('Nenhum cliente cadastrado. Clique em "Novo cliente" — depois é só escolher o cliente na hora de registrar uma venda.')}</div>`;
  let list = state.customers.map(cu=>({ cu, st: customerStats(cu.id) }));
  if(clientesFilter.search){
    const q = clientesFilter.search.toLowerCase();
    list = list.filter(({cu})=>cu.name.toLowerCase().includes(q) || (cu.contact||'').toLowerCase().includes(q));
  }
  const key = clientesFilter.sortKey, dir = clientesFilter.sortDir;
  const getVal = ({cu,st}) => key==='name' ? cu.name.toLowerCase() : key==='qtd' ? st.qtd : key==='last' ? (st.lastDate||'') : st.total;
  list.sort((a,b)=>{ const va=getVal(a), vb=getVal(b); return va<vb?-1*dir:va>vb?1*dir:0; });
  const INACTIVE_DAYS = 60;
  const today = new Date(todayStr()+'T00:00:00');
  const activityStatus = (st) => {
    if(st.qtd===0) return { cls:'mut', text:'Nunca comprou' };
    const last = new Date(st.lastDate+'T00:00:00');
    const days = Math.round((today-last)/86400000);
    return days>INACTIVE_DAYS ? { cls:'warn', text:`Inativo há ${days}d` } : { cls:'ok', text:'Ativo' };
  };
  const inactiveCount = list.filter(({st})=>activityStatus(st).cls!=='ok').length;
  return `
    <div class="filter-bar">
      <div class="field"><label>Buscar</label><input value="${clientesFilter.search}" placeholder="Nome ou contato..." oninput="clientesFilter.search=this.value; renderContent();"></div>
      <div class="field hint" style="padding-top:9px;">${list.length} de ${state.customers.length} cliente(s)${inactiveCount?` · ${inactiveCount} sem comprar há mais de ${INACTIVE_DAYS} dias`:''} · clique no cabeçalho pra ordenar</div>
      ${clientesFilter.search ? `<button class="btn ghost sm" onclick="clientesFilter.search=''; renderContent();">Limpar</button>` : ''}
    </div>
    <div class="card"><div class="tbl-wrap tbl-responsive"><table>
    <thead><tr>
      <th style="cursor:pointer;" onclick="toggleClientSort('name')">Nome${sortArrow(clientesFilter,'name')}</th>
      <th>Contato</th>
      <th class="right" style="cursor:pointer;" onclick="toggleClientSort('qtd')">Compras${sortArrow(clientesFilter,'qtd')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleClientSort('total')">Total gasto${sortArrow(clientesFilter,'total')}</th>
      <th style="cursor:pointer;" onclick="toggleClientSort('last')">Última compra${sortArrow(clientesFilter,'last')}</th>
      <th>Status</th>
      <th></th>
    </tr></thead>
    <tbody>${list.length ? list.map(({cu,st})=>{ const as = activityStatus(st); return `<tr>
      <td data-label="Nome">${cu.name}</td>
      <td data-label="Contato">${cu.contact||'—'}</td>
      <td class="right num" data-label="Compras">${st.qtd}</td>
      <td class="right num" data-label="Total gasto">${brl(st.total)}</td>
      <td class="num" data-label="Última compra">${st.lastDate?fmtDate(st.lastDate):'—'}</td>
      <td data-label="Status"><span class="badge ${as.cls}">${as.text}</span></td>
      <td class="right"><button class="btn ghost sm" onclick="openCustomerModal('${cu.id}')">Editar</button> <button class="btn ghost sm" onclick="deleteCustomer('${cu.id}')">Excluir</button></td>
    </tr>`; }).join('') : `<tr><td colspan="7" style="text-align:center;color:var(--text-faint);padding:20px;">Nenhum cliente encontrado</td></tr>`}</tbody>
  </table></div></div>`;
}
function openCustomerModal(id){
  const editing = !!id;
  const cu = editing ? state.customers.find(x=>x.id===id) : { name:'', contact:'', notes:'' };
  showModal(editing?'Editar cliente':'Novo cliente', `
    <div class="field"><label>Nome</label><input id="cuName" value="${cu.name}" placeholder="Ex: Maria Silva"></div>
    <div class="field"><label>Contato (WhatsApp, e-mail...)</label><input id="cuContact" value="${cu.contact||''}" placeholder="Ex: (11) 99999-9999"></div>
    <div class="field"><label>Observações</label><textarea id="cuNotes" rows="2" placeholder="Preferências, combinados, etc.">${cu.notes||''}</textarea></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmCustomer(${editing?`'${id}'`:'null'})">${editing?'Salvar':'Criar'}</button>
    </div>
  `);
}
function confirmCustomer(id){
  const name = document.getElementById('cuName').value.trim();
  if(!name){ toast('Informe o nome do cliente','err'); return; }
  const dup = state.customers.find(x=>x.id!==id && x.name.trim().toLowerCase()===name.toLowerCase());
  if(dup && !confirm(`Já existe um cliente chamado "${dup.name}". Cadastrar outro com o mesmo nome mesmo assim?`)) return;
  const data = { name, contact: document.getElementById('cuContact').value.trim(), notes: document.getElementById('cuNotes').value.trim() };
  if(id){ Object.assign(state.customers.find(x=>x.id===id), data); }
  else { state.customers.push({ id:uid(), ...data }); }
  saveCustomers();
  toast(id?'Cliente atualizado':'Cliente criado');
  closeModal(); renderContent();
}
function deleteCustomer(id){
  const cu = state.customers.find(x=>x.id===id);
  const st = customerStats(id);
  let msg = `Excluir "${cu.name}"?`;
  if(st.qtd>0) msg += ` As ${st.qtd} venda(s) já registradas continuam no histórico, só ficam sem cliente vinculado.`;
  if(!confirm(msg)) return;
  state.customers = state.customers.filter(x=>x.id!==id);
  state.sales.forEach(s=>{ if(s.customerId===id) s.customerId=null; });
  saveCustomers(); saveSales();
  toast('Cliente excluído');
  renderContent();
}

/* ===================== CRIAR KIT ===================== */
let editingKitItems = {};
function openKitModal(){
  if(state.products.length<2){ toast('Cadastre pelo menos 2 produtos antes de criar um kit','err'); return; }
  const boxOpts = state.materials.filter(m=>m.category==='Embalagem' && m.isBox);
  const machineOpts = state.settings.machines||[];
  if(boxOpts.length===0 || machineOpts.length===0){ toast('Cadastre ao menos uma caixa e uma impressora antes de criar um kit','err'); return; }
  editingKitItems = {};
  showModal('Criar kit', `
    <div class="field hint" style="margin-bottom:10px;">Escolha 2 ou mais produtos já cadastrados. O kit vira um novo produto — com uma caixa só (em vez de uma por item), custo recalculado e preço próprio, pronto pra vender.</div>
    <div class="field" style="margin-bottom:6px;"><label>Itens do kit</label></div>
    <div id="kitItemsList" style="max-height:240px;overflow-y:auto;border:1px solid var(--line);border-radius:8px;padding:10px;margin-bottom:14px;"></div>
    <div class="field"><label>Nome do kit</label><input id="kitName" placeholder="Ex: Kit Dino Trio" oninput="this.dataset.touched='1'"></div>
    <div class="row2">
      <div class="field"><label>Caixa do kit</label><select id="kitBox" onchange="updateKitPreview()">
        ${boxOpts.map(b=>`<option value="${b.name}">${b.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>Plástico bolha (m)</label><input type="number" id="kitBubble" value="0.5" step="0.1" oninput="updateKitPreview()"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Impressora</label><select id="kitMachine" onchange="updateKitPreview()">
        ${machineOpts.map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>Fita adesiva usada (m)</label><input type="number" id="kitTape" value="0.5" step="0.1" oninput="updateKitPreview()"></div>
    </div>
    <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" id="kitMargin" value="${((1-1/(state.settings.markupMultiplier||2.5))*100).toFixed(0)}" step="1" oninput="document.getElementById('kitPrice').dataset.touched=''; updateKitPreview()"></div>
    <div class="field"><label>Preço praticado (R$)</label><input type="number" id="kitPrice" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'; updateKitPreview()"></div>
    <div class="helper-block" id="kitPreview"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmKit()">Criar kit</button>
    </div>
  `);
  renderKitItemsList();
  updateKitPreview();
}
function renderKitItemsList(){
  const el = document.getElementById('kitItemsList');
  if(!el) return;
  el.innerHTML = state.products.map(p=>{
    const checked = editingKitItems[p.id]!=null;
    const c = calcProduct(p);
    return `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;padding:5px 0;">
      <input type="checkbox" style="width:auto;" ${checked?'checked':''} onchange="toggleKitItem('${p.id}', this.checked)">
      <div style="font-size:13px;">${p.name} <span style="color:var(--text-faint);font-size:11.5px;">(${brl(c.totalCost)} custo unit.)</span></div>
      <input type="number" min="1" value="${checked?editingKitItems[p.id]:1}" style="width:60px;" ${checked?'':'disabled'} oninput="updateKitItemQty('${p.id}', this.value)">
    </div>`;
  }).join('');
}
function toggleKitItem(productId, checked){
  if(checked){ editingKitItems[productId] = 1; } else { delete editingKitItems[productId]; }
  renderKitItemsList();
  updateKitPreview();
}
function updateKitItemQty(productId, val){
  editingKitItems[productId] = Math.max(1, parseInt(val)||1);
  updateKitPreview();
}
function buildKitDraft(){
  const boxType = document.getElementById('kitBox').value;
  const bubbleWrapM = parseFloat(document.getElementById('kitBubble').value)||0;
  const tapeM = parseFloat(document.getElementById('kitTape').value)||0;
  const machineId = document.getElementById('kitMachine').value;
  const desiredMarginPct = parseFloat(document.getElementById('kitMargin').value)||0;
  const items = Object.entries(editingKitItems).map(([pid,qty])=>({ prod: state.products.find(p=>p.id===pid), qty })).filter(x=>x.prod);
  const filamentMap = {};
  const laborActionMap = {};
  const toolsUsedMap = {};
  let timeH=0, failureSum=0;
  items.forEach(({prod,qty})=>{
    (prod.filaments||[]).forEach(f=>{ filamentMap[f.materialName] = (filamentMap[f.materialName]||0) + (f.weightG||0)*qty; });
    (prod.laborActions||[]).forEach(a=>{ laborActionMap[a.action] = (laborActionMap[a.action]||0) + (a.minutes||0)*qty; });
    (prod.toolsUsed||[]).forEach(t=>{ toolsUsedMap[t.toolId] = (toolsUsedMap[t.toolId]||0) + (t.uses||0)*qty; });
    timeH += (prod.timeH||0)*qty;
    failureSum += (prod.failureMarginPct||0.1);
  });
  const filaments = Object.entries(filamentMap).map(([materialName,weightG])=>({materialName,weightG}));
  const laborActions = Object.entries(laborActionMap).map(([action,minutes])=>({action,minutes}));
  const toolsUsed = Object.entries(toolsUsedMap).map(([toolId,uses])=>({toolId,uses}));
  const failureMarginPct = items.length ? failureSum/items.length : 0.1;
  return { items, filaments, timeH, laborActions, toolsUsed, failureMarginPct, boxType, bubbleWrapM, tapeM, machineId, desiredMarginPct };
}
function updateKitPreview(){
  const box = document.getElementById('kitPreview');
  if(!box) return;
  const draft = buildKitDraft();
  if(draft.items.length<2){ box.innerHTML = `<div class="empty" style="padding:14px;">Selecione ao menos 2 itens</div>`; return; }
  const c = calcProduct(draft);
  const sumIndividual = draft.items.reduce((a,{prod,qty})=>a+calcProduct(prod).practicedPrice*qty,0);
  const nameField = document.getElementById('kitName');
  if(nameField && !nameField.dataset.touched){ nameField.value = draft.items.map(x=>x.prod.name).join(' + '); }
  const priceField = document.getElementById('kitPrice');
  if(priceField && !priceField.dataset.touched){ priceField.placeholder = 'sugerido: '+c.suggestedPrice.toFixed(2); }
  const finalPrice = (priceField && priceField.value) ? parseFloat(priceField.value)||0 : c.suggestedPrice;
  const finalMarginPct = finalPrice>0 ? ((finalPrice-c.totalCost)/finalPrice)*100 : 0;
  box.innerHTML = `
    <div class="calc-line"><span>Peso total combinado</span><span>${num(totalWeight(draft),0)}g</span></div>
    <div class="calc-line"><span>Tempo total de impressão</span><span>${num(draft.timeH,1)}h</span></div>
    <div class="calc-line"><span>Material + energia + depreciação + mão de obra + falha</span><span>${brl(c.totalCost-c.embalagemCost)}</span></div>
    <div class="calc-line"><span>Embalagem do kit (1 caixa em vez de ${draft.items.length})</span><span>${brl(c.embalagemCost)}</span></div>
    <div class="calc-line total"><span>Custo total do kit</span><span>${brl(c.totalCost)}</span></div>
    <div class="calc-line"><span>Preço sugerido — venda própria (margem ${num(draft.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
    <div class="calc-line" style="color:var(--text-faint);"><span>↳ Mercado Livre (já com a taxa)</span><span>${brl(c.suggestedPriceMl)}</span></div>
    <div class="calc-line" style="color:var(--text-faint);"><span>↳ Shopee (já com a taxa)</span><span>${brl(c.suggestedPriceShopee)}</span></div>
    ${c.estimatedShopeeFreightCap!=null ? `<div class="calc-line" style="color:var(--text-faint);"><span>↳ Shopee — custo estimado de frete (teto do cupom)</span><span>${brl(c.estimatedShopeeFreightCap)}</span></div>` : ''}
    ${extraListingPlatforms().map(plat=>`<div class="calc-line" style="color:var(--text-faint);"><span>↳ ${plat.name} (já com a taxa)</span><span>${brl(c.suggestedPriceExtra[plat.id])}</span></div>`).join('')}
    <div class="calc-line" style="color:var(--text-faint);"><span>Soma se vendido separado (embalagem individual de cada um)</span><span>${brl(sumIndividual)}</span></div>
    <div class="calc-line total"><span>Preço final do kit${priceField && priceField.value ? ' (definido por você)' : ''}</span><span style="color:${finalMarginPct<0?'var(--red)':'var(--green)'}">${brl(finalPrice)} — margem real ${num(finalMarginPct,1)}%</span></div>
  `;
}
function confirmKit(){
  const draft = buildKitDraft();
  if(draft.items.length<2){ toast('Selecione ao menos 2 itens para formar um kit','err'); return; }
  const name = document.getElementById('kitName').value.trim();
  if(!name){ toast('Dê um nome ao kit','err'); return; }
  const c = calcProduct(draft);
  const priceRaw = document.getElementById('kitPrice').value;
  const practicedPrice = priceRaw ? parseFloat(priceRaw) : c.suggestedPrice;
  state.products.push({
    id:uid(), name, filaments:draft.filaments, timeH:draft.timeH, bubbleWrapM:draft.bubbleWrapM, tapeM:draft.tapeM,
    boxType:draft.boxType, failureMarginPct:draft.failureMarginPct, laborActions:draft.laborActions, toolsUsed:draft.toolsUsed,
    machineId:draft.machineId, desiredMarginPct:draft.desiredMarginPct, practicedPrice, stock:0,
    kitComponents: draft.items.map(({prod,qty})=>({productId:prod.id, productName:prod.name, qty})),
  });
  saveProducts();
  toast('Kit criado — já aparece em Produtos, pronto pra vender');
  closeModal(); renderContent();
}

/* ===================== PRODUTOS ===================== */
let produtosFilter = { search:'', machineId:'', sortKey:'name', sortDir:1 };
function toggleProductSort(key){
  if(produtosFilter.sortKey===key){ produtosFilter.sortDir*=-1; }
  else { produtosFilter.sortKey=key; produtosFilter.sortDir=1; }
  renderContent();
}
function sortArrow(filterObj,key){ return filterObj.sortKey===key ? (filterObj.sortDir===1?' ▲':' ▼') : ''; }
function renderProdutos(){
  if(state.products.length===0) return `<div class="card">${emptyState('Nenhum produto cadastrado. Clique em "Novo produto".')}</div>`;
  const machines = state.settings.machines||[];
  let list = state.products.map(p=>({ p, c: calcProduct(p) }));
  if(produtosFilter.search){
    const q = produtosFilter.search.toLowerCase();
    list = list.filter(({p})=>p.name.toLowerCase().includes(q) || (p.filaments||[]).some(f=>f.materialName.toLowerCase().includes(q)));
  }
  if(produtosFilter.machineId){
    list = list.filter(({p})=>(p.machineId||(machines[0]||{}).id)===produtosFilter.machineId);
  }
  const key = produtosFilter.sortKey, dir = produtosFilter.sortDir;
  const getVal = ({p,c}) => {
    switch(key){
      case 'name': return p.name.toLowerCase();
      case 'weight': return totalWeight(p);
      case 'time': return p.timeH;
      case 'cost': return c.totalCost;
      case 'suggested': return c.suggestedPrice;
      case 'practiced': return c.practicedPrice;
      case 'margin': return c.marginPct;
      case 'stock': return p.stock;
      default: return p.name.toLowerCase();
    }
  };
  list.sort((a,b)=>{ const va=getVal(a), vb=getVal(b); return va<vb?-1*dir:va>vb?1*dir:0; });
  const theadHtml = `<thead><tr>
      <th></th>
      <th style="cursor:pointer;" onclick="toggleProductSort('name')">Produto${sortArrow(produtosFilter,'name')}</th>
      <th>Filamentos</th>
      <th>Impressora</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('weight')">Peso total${sortArrow(produtosFilter,'weight')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('time')">Tempo${sortArrow(produtosFilter,'time')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('cost')">Custo total${sortArrow(produtosFilter,'cost')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('suggested')">Preço sugerido${sortArrow(produtosFilter,'suggested')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('practiced')">Preço praticado${sortArrow(produtosFilter,'practiced')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('margin')">Margem${sortArrow(produtosFilter,'margin')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('stock')">Estoque${sortArrow(produtosFilter,'stock')}</th>
      <th></th>
    </tr></thead>`;
  const rowHtml = ({p,c}) => {
    const filSummary = (p.filaments||[]).map(f=>`${f.materialName} ${num(f.weightG,0)}g`).join(' + ');
    return `<tr>
      <td data-label="Foto">${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;">` : `<div style="width:36px;height:36px;border-radius:6px;background:var(--panel-2);"></div>`}</td>
      <td data-label="Produto">${p.name}${p.kitComponents && p.kitComponents.length ? `<div style="font-size:11px;font-style:italic;color:var(--text-faint);margin-top:2px;">${p.kitComponents.map(kc=>`${kc.qty>1?kc.qty+'x ':''}${kc.productName}`).join(' + ')}</div>` : ''}${(!p.laborActions || !p.laborActions.length) ? `<div style="margin-top:3px;"><span class="badge warn" title="Nenhuma ação de mão de obra cadastrada — o custo de mão de obra desse produto está zerado, o que deixa a margem otimista demais">sem mão de obra</span></div>` : ''}${(p.modelOrigin==='terceiro' && !p.modelLicense) ? `<div style="margin-top:3px;"><span class="badge bad" title="Modelo de terceiro sem licença registrada — confira se pode vender antes de anunciar em ML/Shopee">sem licença do modelo</span></div>` : ''}</td>
      <td title="${filSummary}" data-label="Filamentos">${filSummary}</td>
      <td data-label="Impressora">${c.machine ? c.machine.name : '<span class="badge bad">nenhuma</span>'}</td>
      <td class="right num" data-label="Peso total">${num(totalWeight(p),0)}g</td>
      <td class="right num" data-label="Tempo">${num(p.timeH,1)}h</td>
      <td class="right num" data-label="Custo total">${brl(c.totalCost)}</td>
      <td class="right num" data-label="Preço sugerido">${brl(c.suggestedPrice)}</td>
      <td class="right num" data-label="Preço praticado">${brl(c.practicedPrice)}<div style="font-size:10px;font-weight:400;color:var(--text-faint);white-space:nowrap;">ML ${brl(c.practicedPriceMl)} · Shopee ${brl(c.practicedPriceShopee)}${extraListingPlatforms().map(plat=>` · ${plat.name} ${brl(c.practicedPriceExtra[plat.id])}`).join('')}</div></td>
      <td class="right num" data-label="Margem" style="color:${c.marginValue<0?'var(--red)':'var(--green)'}">${pct(c.marginPct)}<div style="font-size:10px;font-weight:400;white-space:nowrap;">ML <span style="color:${c.marginMlPct<(state.settings.minMarginPct!=null?state.settings.minMarginPct:25)?'var(--red)':'var(--text-faint)'}">${pct(c.marginMlPct)}</span> · Shopee <span style="color:${c.marginShopeePct<(state.settings.minMarginPct!=null?state.settings.minMarginPct:25)?'var(--red)':'var(--text-faint)'}">${pct(c.marginShopeePct)}</span></div></td>
      <td class="right num" data-label="Estoque">${p.stock<=0?`<span class="badge mut">0</span>`:num(p.stock,0)}</td>
      <td class="right"><button class="btn ghost sm" onclick="openProductModal('${p.id}')">Editar</button> <button class="btn ghost sm" onclick="duplicateProduct('${p.id}')">Duplicar</button> <button class="btn ghost sm" onclick="deleteProduct('${p.id}')">Excluir</button></td>
    </tr>`;
  };
  const filterBar = `
    <div class="filter-bar">
      <div class="field"><label>Buscar</label><input value="${produtosFilter.search}" placeholder="Nome ou filamento..." oninput="produtosFilter.search=this.value; renderContent();"></div>
      <div class="field"><label>Impressora</label><select onchange="produtosFilter.machineId=this.value; renderContent();">
        <option value="">Todas</option>
        ${machines.map(m=>`<option value="${m.id}" ${produtosFilter.machineId===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select></div>
      <div class="field hint" style="padding-top:9px;">${list.length} de ${state.products.length} produto(s) · clique no cabeçalho pra ordenar</div>
      ${(produtosFilter.search||produtosFilter.machineId) ? `<button class="btn ghost sm" onclick="produtosFilter.search=''; produtosFilter.machineId=''; renderContent();">Limpar filtros</button>` : ''}
    </div>`;
  if(list.length===0){
    return filterBar + `<div class="card"><div class="tbl-wrap tbl-responsive tbl-compact-mobile"><table>${theadHtml}<tbody><tr><td colspan="12" style="text-align:center;color:var(--text-faint);padding:20px;">Nenhum produto encontrado</td></tr></tbody></table></div></div>`;
  }
  const groups = {};
  list.forEach(item=>{
    const isKit = item.p.kitComponents && item.p.kitComponents.length;
    const cat = isKit ? 'Kits' : ((item.p.category||'').trim() || 'Sem categoria');
    (groups[cat] = groups[cat]||[]).push(item);
  });
  const catKeys = Object.keys(groups).filter(k=>k!=='Kits' && k!=='Sem categoria').sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if(groups['Kits']) catKeys.unshift('Kits');
  if(groups['Sem categoria']) catKeys.push('Sem categoria');
  const sections = catKeys.map(cat=>`<div class="section-title">${cat}</div><div class="card"><div class="tbl-wrap tbl-responsive tbl-compact-mobile"><table>${theadHtml}<tbody>${groups[cat].map(rowHtml).join('')}</tbody></table></div></div>`).join('');
  return filterBar + sections;
}
function duplicateProduct(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  const copy = JSON.parse(JSON.stringify(p));
  copy.id = uid();
  copy.name = p.name + ' (cópia)';
  copy.stock = 0;
  delete copy.kitComponents;
  state.products.push(copy);
  saveProducts();
  toast('Produto duplicado — ajuste o que for diferente');
  openProductModal(copy.id);
}
/* ===================== ANÚNCIOS ===================== */
// Campos e cabeçalhos idênticos à planilha-modelo do usuário
// (anuncio_mercadolivre_shopee.xlsx, abas "Mercado Livre" e "Shopee").
const LISTING_FIELDS = {
  ml: [
    {key:'titulo', label:'Título do anúncio (até 60 caracteres)', maxlength:60},
    {key:'categoria', label:'Categoria', presets:['Brinquedos e Hobbies > Bonecos e Bonecos de Ação','Casa, Móveis e Decoração > Objetos e Utilidades Domésticas > Porta-Objetos','Eletrônicos, Áudio e Vídeo > Acessórios para Áudio e Vídeo > Suportes','Informática > Acessórios para Informática > Suportes']},
    {key:'preco', label:'Preço (R$)'},
    {key:'estoque', label:'Estoque disponível'},
    {key:'sku', label:'SKU / Código do produto'},
    {key:'condicao', label:'Condição (Novo/Usado)', type:'select', options:['Novo','Usado']},
    {key:'marca', label:'Marca'},
    {key:'modelo', label:'Modelo'},
    {key:'gtin', label:'GTIN / EAN'},
    {key:'descricao', label:'Descrição', type:'textarea'},
    {key:'peso', label:'Peso (kg)'},
    {key:'dimensoes', label:'Dimensões A x L x C (cm)'},
    {key:'garantia', label:'Garantia', presets:['90 dias (garantia contra defeito de fabricação)','30 dias (garantia contra defeito de fabricação)','Sem garantia (produto sob encomenda / artesanal)']},
    {key:'tipoAnuncio', label:'Tipo de anúncio (Clássico/Premium)', type:'select', options:['Clássico','Premium']},
  ],
  shopee: [
    {key:'nome', label:'Nome do produto (até 120 caracteres)', maxlength:120},
    {key:'categoria', label:'Categoria', presets:['Brinquedos e Hobbies > Bonecos e Miniaturas','Casa e Decoração > Organizadores','Celulares e Acessórios > Suportes','Eletrônicos > Acessórios para Games']},
    {key:'preco', label:'Preço (R$)'},
    {key:'estoque', label:'Estoque'},
    {key:'sku', label:'SKU pai'},
    {key:'variacoes', label:'Variações (cor/tamanho)'},
    {key:'marca', label:'Marca'},
    {key:'gtin', label:'Código de barras / GTIN'},
    {key:'descricao', label:'Descrição', type:'textarea'},
    {key:'peso', label:'Peso do pacote (kg)'},
    {key:'dimensoes', label:'Dimensões do pacote C x L x A (cm)'},
    {key:'preVenda', label:'Pré-venda (Sim/Não)', type:'select', options:['Não','Sim']},
    {key:'envio', label:'Opções de envio', presets:['Frete Grátis Shopee, Correios','Correios, Transportadora','Correios']},
  ],
};
// Campos com o mesmo valor nos dois marketplaces — preenchidos uma vez só
// (fica de fora das abas ML/Shopee, mas é salvo/exportado nos dois).
// Preço fica de fora dos campos comuns de propósito — cada marketplace cobra
// uma taxa diferente, então o preço praticado costuma precisar ser diferente
// em cada um pra manter a mesma margem líquida.
const SHARED_LISTING_KEYS = ['estoque','marca','sku','gtin','peso','descricao'];
const LISTING_SHARED_FIELDS = [
  {key:'estoque', label:'Estoque'},
  {key:'marca', label:'Marca'},
  {key:'sku', label:'SKU / Código do produto'},
  {key:'gtin', label:'GTIN / EAN / Código de barras'},
  {key:'peso', label:'Peso (kg)'},
  {key:'descricao', label:'Descrição', type:'textarea'},
];
// Plataformas além de ML/Shopee que o usuário habilitou com aba de Anúncios
// (ver Caixa → Configurar → "Aba de Anúncios pra..."), clonando os campos de
// uma plataforma já existente (ML, Shopee, ou outra plataforma estendida).
function extraListingPlatforms(){
  return (state.settings.platforms||[]).filter(p=>p.listingTemplate);
}
function platformListingFields(platformId, visited){
  visited = visited || new Set();
  if(visited.has(platformId)) return [];
  visited.add(platformId);
  const plat = (state.settings.platforms||[]).find(p=>p.id===platformId);
  if(!plat || !plat.listingTemplate) return [];
  if(plat.listingTemplate==='ml') return LISTING_FIELDS.ml;
  if(plat.listingTemplate==='shopee') return LISTING_FIELDS.shopee;
  return platformListingFields(plat.listingTemplate, visited);
}
function listingPlatformDisplayName(idKey){
  if(idKey==='ml') return 'Mercado Livre';
  if(idKey==='shopee') return 'Shopee';
  const plat = (state.settings.platforms||[]).find(p=>p.id===idKey);
  return plat ? plat.name : idKey;
}
// l.ml/l.shopee continuam do jeito que sempre foram (zero risco de regressão);
// plataformas extras vivem à parte em l.extra, por id da plataforma.
function listingPlatformData(l, idKey){
  if(!l) return {};
  if(idKey==='ml') return l.ml||{};
  if(idKey==='shopee') return l.shopee||{};
  return (l.extra||{})[idKey] || {};
}
function listingFor(productId){ return state.listings.find(l=>l.productId===productId); }
function listingHasContent(l){
  if(!l) return false;
  if((l.fotos||[]).length) return true;
  if(['ml','shopee'].some(plat => LISTING_FIELDS[plat].some(f => (l[plat]||{})[f.key]))) return true;
  return extraListingPlatforms().some(plat => platformListingFields(plat.id).some(f => listingPlatformData(l, plat.id)[f.key]));
}
function listingIsComplete(l){
  if(!l) return false;
  const na = l.naFields || {};
  const sharedOk = LISTING_SHARED_FIELDS.every(f => na[`shared_${f.key}`] || (l.ml||{})[f.key]);
  const platOk = plat => LISTING_FIELDS[plat].filter(f=>!SHARED_LISTING_KEYS.includes(f.key)).every(f => na[`${plat}_${f.key}`] || (l[plat]||{})[f.key]);
  const extraOk = extraListingPlatforms().every(plat => platformListingFields(plat.id).filter(f=>!SHARED_LISTING_KEYS.includes(f.key)).every(f => na[`${plat.id}_${f.key}`] || listingPlatformData(l, plat.id)[f.key]));
  return sharedOk && platOk('ml') && platOk('shopee') && extraOk;
}
// SKU curto e determinístico a partir do nome do produto, ex: "Espaço Cafe" -> "POG-ESPACO-CAFE".
const ACCENT_MAP = {'á':'a','à':'a','â':'a','ã':'a','ä':'a','é':'e','è':'e','ê':'e','ë':'e','í':'i','ì':'i','î':'i','ï':'i','ó':'o','ò':'o','ô':'o','õ':'o','ö':'o','ú':'u','ù':'u','û':'u','ü':'u','ç':'c','ñ':'n'};
function stripAccents(s){
  return s.split('').map(ch=>{
    const lower = ch.toLowerCase();
    const plain = ACCENT_MAP[lower];
    if(!plain) return ch;
    return ch===lower ? plain : plain.toUpperCase();
  }).join('');
}
function generateSku(p){
  const slug = stripAccents(p.name).toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24);
  return `POG-${slug}`;
}
function defaultListingDraft(p){
  const c = calcProduct(p);
  const peso = num(totalWeight(p)/1000,2);
  const sku = generateSku(p);
  const hasDims = p.lengthCm>0 && p.widthCm>0 && p.heightCm>0;
  const dimensoesMl = hasDims ? `${num(p.heightCm,1)} x ${num(p.widthCm,1)} x ${num(p.lengthCm,1)}` : '';
  const dimensoesShopee = hasDims ? `${num(p.lengthCm,1)} x ${num(p.widthCm,1)} x ${num(p.heightCm,1)}` : '';
  const out = {
    ml: { titulo:p.name.slice(0,60), categoria:p.mlCategoryName||'', preco:num(c.practicedPriceMl,2), estoque:p.stock, sku, condicao:'Novo', marca:bizName(), peso, dimensoes:dimensoesMl, tipoAnuncio: p.mlListingTypeForFee==='gold_pro'?'Premium':'Clássico' },
    shopee: { nome:p.name.slice(0,120), preco:num(c.practicedPriceShopee,2), estoque:p.stock, sku, marca:bizName(), peso, dimensoes:dimensoesShopee },
    extra: {},
  };
  extraListingPlatforms().forEach(plat=>{
    const fields = platformListingFields(plat.id);
    const titleField = fields.find(f=>f.key==='titulo'||f.key==='nome');
    const base = { preco:num((c.suggestedPriceExtra[plat.id]!=null?c.practicedPriceExtra[plat.id]:0),2), estoque:p.stock, sku, marca:bizName(), peso };
    if(titleField) base[titleField.key] = p.name.slice(0, titleField.maxlength||120);
    if(fields.some(f=>f.key==='condicao')) base.condicao = 'Novo';
    if(fields.some(f=>f.key==='tipoAnuncio')) base.tipoAnuncio = 'Clássico';
    if(fields.some(f=>f.key==='dimensoes')) base.dimensoes = plat.listingTemplate==='shopee' ? dimensoesShopee : dimensoesMl;
    out.extra[plat.id] = base;
  });
  return out;
}
// Preenche os campos em branco com o valor automático, mas nunca sobrescreve o que o usuário já preencheu.
function mergeListingValues(auto, existing){
  const out = Object.assign({}, auto);
  if(existing) Object.keys(existing).forEach(k=>{ if(existing[k]) out[k] = existing[k]; });
  return out;
}
function listingFieldSuggestions(idKey, key, presets){
  const platform = idKey==='shared' ? 'ml' : idKey;
  const fromHistory = state.listings.map(l=>listingPlatformData(l, platform)[key]).filter(Boolean);
  return Array.from(new Set([...(presets||[]), ...fromHistory]));
}
let anunciosFilter = { search:'' };
let anunciosView = 'lista';
function renderAnuncios(){
  if(state.products.length===0) return `<div class="card">${emptyState('Cadastre um produto primeiro em Produtos')}</div>`;
  const tabs = `<div class="tabbar">
    <button class="tabbtn ${anunciosView==='lista'?'active':''}" onclick="anunciosView='lista'; renderContent();">Lista</button>
    <button class="tabbtn ${anunciosView==='prontos'?'active':''}" onclick="anunciosView='prontos'; renderContent();">Anúncios prontos</button>
  </div>`;
  return tabs + (anunciosView==='prontos' ? renderAnunciosProntos() : renderAnunciosLista());
}
function groupProductsByCategory(products){
  const groups = {};
  products.forEach(p=>{
    const cat = (p.category||'').trim() || 'Sem categoria';
    (groups[cat] = groups[cat]||[]).push(p);
  });
  const keys = Object.keys(groups).filter(k=>k!=='Sem categoria').sort((a,b)=>a.localeCompare(b,'pt-BR'));
  if(groups['Sem categoria']) keys.push('Sem categoria');
  return keys.map(category=>({category, products:groups[category]}));
}
function listingPriceDisplay(l, p){
  const entries = [['ML', l.ml.preco], ['Shopee', l.shopee.preco], ...extraListingPlatforms().map(plat=>[plat.name, listingPlatformData(l, plat.id).preco])].filter(([,v])=>v);
  if(entries.length===0) return brl(calcProduct(p).practicedPrice);
  const allSame = entries.every(([,v])=>v===entries[0][1]);
  if(allSame) return brl(parseFloat(String(entries[0][1]).replace(',','.'))||0);
  return entries.map(([name,v])=>`${name} ${brl(parseFloat(String(v).replace(',','.'))||0)}`).join(' · ');
}
function renderAnunciosLista(){
  const q = anunciosFilter.search.toLowerCase();
  const list = q ? state.products.filter(p=>p.name.toLowerCase().includes(q)) : state.products;
  const searchBar = `<div class="filter-bar">
    <div class="field"><label>Buscar</label><input value="${anunciosFilter.search}" placeholder="Nome do produto..." oninput="anunciosFilter.search=this.value; renderContent();"></div>
  </div>`;
  if(q && list.length===0) return searchBar + `<div class="card">${emptyState('Nenhum produto encontrado')}</div>`;
  const sections = groupProductsByCategory(list).map(({category, products})=>{
    const rows = products.map(p=>{
      const l = listingFor(p.id);
      const hasContent = listingHasContent(l);
      const complete = listingIsComplete(l);
      const updatedTag = `<span style="color:var(--text-faint);font-size:11px;">atualizado ${fmtDate(((l&&l.updatedAt)||'').slice(0,10))}</span>`;
      const status = !hasContent ? `<span class="badge mut">Sem anúncio</span>`
        : complete ? `<span class="badge ok">Pronto</span> ${updatedTag}`
        : `<span class="badge warn">Incompleto</span> ${updatedTag}`;
      return `<tr>
        <td data-label="Produto">${p.name}</td>
        <td data-label="Preço" class="right num">${hasContent ? listingPriceDisplay(l,p) : brl(calcProduct(p).practicedPrice)}</td>
        <td data-label="Status">${status}</td>
        <td class="right">
          <button class="btn ghost sm" onclick="openListingModal('${p.id}')">${hasContent?'Editar anúncio':'Criar anúncio'}</button>
          ${hasContent?`<button class="btn ghost sm" onclick="openDuplicateListingModal('${p.id}')">Duplicar</button>`:''}
        </td>
      </tr>`;
    }).join('');
    return `<div class="section-title">${category}</div><div class="card"><div class="tbl-wrap tbl-responsive"><table>
      <thead><tr><th>Produto</th><th class="right">Preço</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
  }).join('');
  return searchBar + sections;
}
function renderAnunciosProntos(){
  const ready = state.products.map(p=>({p, l:listingFor(p.id)})).filter(({l})=>listingIsComplete(l));
  if(ready.length===0) return `<div class="card">${emptyState('Nenhum anúncio pronto ainda — complete todos os campos de um produto na aba Lista')}</div>`;
  const toolbar = `<div style="margin-bottom:14px;"><button class="btn ghost sm" onclick="exportAllReadyListingsXlsx()">Exportar todos os prontos (Excel)</button></div>`;
  const grouped = groupProductsByCategory(ready.map(r=>r.p)).map(({category, products})=>{
    const cards = products.map(p=>{
      const l = listingFor(p.id);
      const extras = extraListingPlatforms();
      const tituloExtra = extras.map(plat=>{
        const fields = platformListingFields(plat.id);
        const titleKey = fields.some(f=>f.key==='titulo') ? 'titulo' : 'nome';
        return listingPlatformData(l, plat.id)[titleKey];
      }).find(Boolean);
      const titulo = l.ml.titulo || l.shopee.nome || tituloExtra || p.name;
      const estoque = l.ml.estoque || l.shopee.estoque || p.stock;
      const descricao = l.ml.descricao || l.shopee.descricao || '';
      const photos = [...(p.photo?[p.photo]:[]), ...(l.fotos||[])];
      const cover = photos[0];
      const thumbs = photos.length>1 ? `<div style="display:flex;gap:4px;padding:0 16px;">${photos.slice(1,5).map(ph=>`<img src="${ph}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;border:1px solid var(--line);">`).join('')}</div>` : '';
      return `<div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
        <div style="aspect-ratio:1/1;background:var(--panel-2);display:flex;align-items:center;justify-content:center;">
          ${cover ? `<img src="${cover}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="color:var(--text-faint);font-size:11px;">Sem foto</span>`}
        </div>
        ${thumbs}
        <div style="padding:14px 16px;display:flex;flex-direction:column;gap:6px;flex:1;">
          <div style="font-family:var(--font-display);font-weight:600;font-size:14px;line-height:1.3;">${titulo}</div>
          <div style="color:var(--nozzle);font-weight:700;font-family:var(--font-mono);font-size:14px;">${listingPriceDisplay(l,p)}</div>
          <div style="font-size:12px;color:var(--text-dim);">Estoque: ${estoque}</div>
          ${descricao ? `<div style="font-size:12px;color:var(--text-dim);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${descricao}</div>` : ''}
          ${(l.ml.link||l.shopee.link||extras.some(plat=>listingPlatformData(l,plat.id).link)) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${l.ml.link?`<a href="${l.ml.link}" target="_blank" rel="noopener noreferrer" style="font-size:11px;">ML ↗</a>`:''}
            ${l.shopee.link?`<a href="${l.shopee.link}" target="_blank" rel="noopener noreferrer" style="font-size:11px;">Shopee ↗</a>`:''}
            ${extras.map(plat=>{ const link = listingPlatformData(l,plat.id).link; return link ? `<a href="${link}" target="_blank" rel="noopener noreferrer" style="font-size:11px;">${plat.name} ↗</a>` : ''; }).join('')}
          </div>` : ''}
          <div style="margin-top:auto;display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn ghost sm" style="flex:1;" onclick="openListingViewModal('${p.id}')">Ver anúncio</button>
            <button class="btn ghost sm" style="flex:1;" onclick="openListingModal('${p.id}')">Editar</button>
            <button class="btn ghost sm" style="flex:1;" onclick="openDuplicateListingModal('${p.id}')">Duplicar</button>
          </div>
        </div>
      </div>`;
    }).join('');
    return `<div class="section-title">${category}</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr));">${cards}</div>`;
  }).join('');
  return toolbar + grouped;
}
// Link do anúncio já publicado — fora do LISTING_FIELDS de propósito: não
// conta pro status Pronto/Incompleto (só existe depois de publicar) e não
// entra no Excel exportado (é só referência interna, não um dado do anúncio).
function renderListingLinkField(platform, val){
  const platName = listingPlatformDisplayName(platform);
  const openLink = val ? `<a href="${val}" target="_blank" rel="noopener noreferrer" class="btn ghost sm" style="margin-top:6px;display:inline-flex;">Abrir anúncio ↗</a>` : '';
  return `<div class="field"><label>Link do anúncio publicado na ${platName} (opcional)</label><input id="lst_${platform}_link" type="url" value="${val||''}" placeholder="Cole aqui depois de publicar">${openLink}</div>`;
}
function renderListingField(idKey, f, val, isNa){
  const id = `lst_${idKey}_${f.key}`;
  const naKey = `${idKey}_${f.key}`;
  const naBox = `<label style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:400;color:var(--text-faint);margin-left:8px;cursor:pointer;"><input type="checkbox" ${isNa?'checked':''} onchange="toggleListingFieldNa('${id}','${naKey}',this.checked)" style="width:auto;margin:0;">não se aplica</label>`;
  const dis = isNa ? 'disabled' : '';
  if(f.type==='select'){
    return `<div class="field"><label>${f.label}${naBox}</label><select id="${id}" ${dis}>
      <option value=""></option>
      ${f.options.map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
    </select></div>`;
  }
  if(f.type==='textarea'){
    return `<div class="field"><label>${f.label}${naBox}</label><textarea id="${id}" rows="5" ${dis}>${val!=null?val:''}</textarea></div>`;
  }
  if(f.presets){
    const opts = listingFieldSuggestions(idKey, f.key, f.presets);
    const isCustomVal = val && !opts.includes(val);
    const selId = `${id}_sel`;
    return `<div class="field"><label>${f.label}${naBox}</label>
      <select id="${selId}" onchange="toggleListingPresetNew('${selId}','${id}',this.value)" ${dis}>
        <option value="">Selecione...</option>
        ${opts.map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
        <option value="__new__" ${isCustomVal?'selected':''}>+ Nova opção...</option>
      </select>
      <input id="${id}" value="${val!=null?val:''}" placeholder="Digite a nova opção" style="margin-top:6px;display:${isCustomVal?'block':'none'};" ${dis}>
    </div>`;
  }
  const isPreco = f.key==='preco' && idKey!=='shared';
  const syncAttr = (idKey==='ml' && f.key==='titulo') ? `oninput="syncListingTitle(this.value)"` : isPreco ? `oninput="updateListingFeeHint('${idKey}')"` : '';
  const feeHint = isPreco ? `<div id="lstFeeHint_${idKey}" class="field hint" style="margin-top:-8px;"></div>` : '';
  return `<div class="field"><label>${f.label}${naBox}</label><input id="${id}" ${f.maxlength?`maxlength="${f.maxlength}"`:''} value="${val!=null?val:''}" ${dis} ${syncAttr}></div>${feeHint}`;
}
function toggleListingPresetNew(selId, inputId, val){
  const input = document.getElementById(inputId);
  if(!input) return;
  if(val==='__new__'){ input.style.display='block'; input.value=''; input.focus(); }
  else{ input.style.display='none'; input.value = val; }
}
function syncListingTitle(val){
  const el = document.getElementById('lst_shopee_nome');
  if(el) el.value = val.slice(0,120);
}
function updateListingFeeHint(idKey){
  const el = document.getElementById(`lst_${idKey}_preco`);
  const hintEl = document.getElementById(`lstFeeHint_${idKey}`);
  if(!el || !hintEl) return;
  const platformName = listingPlatformDisplayName(idKey);
  const price = parseFloat((el.value||'').replace(',','.'));
  const plat = (state.settings.platforms||[]).find(pl=>pl.name===platformName);
  if(!price || price<=0 || !plat){ hintEl.textContent = ''; return; }
  const p = state.products.find(x=>x.id===editingListingProductId);
  let fee, freight = 0, freightLabel = '';
  if(idKey==='ml' && p && p.mlRealFeePct!=null){
    fee = price * Math.min(0.95, p.mlRealFeePct/100);
  } else {
    fee = plat.tiers ? computeTieredFee(plat.tiers, price).fee : price*(plat.pct/100)+(plat.fixed||0);
  }
  if(p && idKey==='ml' && p.estimatedFreightMl>0){ freight = p.estimatedFreightMl; freightLabel = ` − frete ${brl(freight)}`; }
  if(p && idKey==='shopee'){
    freight = p.estimatedFreightShopee>0 ? p.estimatedFreightShopee : (shopeeFreightCap(price)||0);
    if(freight>0) freightLabel = ` − frete ${brl(freight)}`;
  }
  const feeLabel = (idKey==='ml' && p && p.mlRealFeePct!=null) ? 'real' : 'estimada';
  hintEl.textContent = `Taxa ${feeLabel} (${platformName}): ${brl(fee)}${freightLabel} → líquido ${brl(price-fee-freight)}`;
}
let editingNaFields = {};
function toggleListingFieldNa(fieldId, naKey, checked){
  if(checked) editingNaFields[naKey] = true; else delete editingNaFields[naKey];
  const el = document.getElementById(fieldId);
  if(el){ el.disabled = checked; if(checked) el.value = ''; }
  const sel = document.getElementById(`${fieldId}_sel`);
  if(sel){ sel.disabled = checked; if(checked) sel.value = ''; }
}
function switchListingTab(platform){
  const allKeys = ['ml','shopee', ...extraListingPlatforms().map(p=>p.id)];
  allKeys.forEach(key=>{
    const panel = document.getElementById(`lstPanel_${key}`);
    const btn = document.getElementById(`lstTabBtn_${key}`);
    if(panel) panel.style.display = key===platform ? '' : 'none';
    if(btn) btn.classList.toggle('active', key===platform);
  });
}
function openListingModal(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  editingListingProductId = id;
  const existing = listingFor(id);
  const auto = defaultListingDraft(p);
  const extras = extraListingPlatforms();
  const draft = { ml: mergeListingValues(auto.ml, existing && existing.ml), shopee: mergeListingValues(auto.shopee, existing && existing.shopee), extra: {} };
  extras.forEach(plat=>{ draft.extra[plat.id] = mergeListingValues(auto.extra[plat.id], existing && existing.extra && existing.extra[plat.id]); });
  editingListingPhotos = (existing && existing.fotos) ? existing.fotos.slice() : [];
  editingNaFields = Object.assign({}, existing && existing.naFields);
  Object.keys(editingNaFields).forEach(naKey=>{
    const [platKey, fieldKey] = [naKey.slice(0,naKey.indexOf('_')), naKey.slice(naKey.indexOf('_')+1)];
    if(platKey==='shared'){ draft.ml[fieldKey]=''; draft.shopee[fieldKey]=''; }
    else if(platKey==='ml'||platKey==='shopee'){ draft[platKey][fieldKey] = ''; }
    else if(draft.extra[platKey]) draft.extra[platKey][fieldKey] = '';
  });
  const extraTabsHtml = extras.map(plat=>`<button type="button" class="tabbtn" id="lstTabBtn_${plat.id}" onclick="switchListingTab('${plat.id}')">${plat.name}</button>`).join('');
  const extraPanelsHtml = extras.map(plat=>{
    const fields = platformListingFields(plat.id).filter(f=>!SHARED_LISTING_KEYS.includes(f.key));
    return `<div id="lstPanel_${plat.id}" style="display:none;">${renderListingLinkField(plat.id, draft.extra[plat.id].link)}${fields.map(f=>renderListingField(plat.id, f, (draft.extra[plat.id]||{})[f.key], !!editingNaFields[`${plat.id}_${f.key}`])).join('')}</div>`;
  }).join('');
  showModal(`Anúncio — ${p.name}`, `
    <div class="field hint" style="margin-top:-4px;margin-bottom:12px;">Campos iguais aos da planilha de exportação — preencha, salve o rascunho e exporte o Excel pra colar no formulário de cada marketplace. Marque "não se aplica" pra um campo não contar como pendente.</div>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
      ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:64px;height:64px;border-radius:8px;background:var(--panel-2);flex-shrink:0;"></div>`}
      <div class="field hint" style="margin:0;">${p.photo ? 'Foto (capa) puxada do cadastro em Produtos.' : 'Esse produto não tem foto cadastrada — adicione uma em Produtos → Editar pra ela aparecer aqui e nos anúncios prontos.'}</div>
    </div>
    <div class="field">
      <label>Fotos adicionais (opcional, além da capa do cadastro)</label>
      <input type="file" accept="image/*" multiple id="lstPhotoInput" onchange="handleListingPhotoUpload(this)">
    </div>
    <div id="lstPhotoPreview" style="margin-bottom:14px;"></div>
    <div class="field hint" style="margin:0 0 4px;font-weight:600;color:var(--text-dim);">Campos comuns (usados em todas as plataformas)</div>
    ${LISTING_SHARED_FIELDS.map(f=>renderListingField('shared', f, (draft.ml||{})[f.key], !!editingNaFields[`shared_${f.key}`])).join('')}
    <div class="tabbar">
      <button type="button" class="tabbtn active" id="lstTabBtn_ml" onclick="switchListingTab('ml')">Mercado Livre</button>
      <button type="button" class="tabbtn" id="lstTabBtn_shopee" onclick="switchListingTab('shopee')">Shopee</button>
      ${extraTabsHtml}
    </div>
    <div id="lstPanel_ml">${renderListingLinkField('ml', draft.ml.link)}${LISTING_FIELDS.ml.filter(f=>!SHARED_LISTING_KEYS.includes(f.key)).map(f=>renderListingField('ml', f, (draft.ml||{})[f.key], !!editingNaFields[`ml_${f.key}`])).join('')}</div>
    <div id="lstPanel_shopee" style="display:none;">${renderListingLinkField('shopee', draft.shopee.link)}${LISTING_FIELDS.shopee.filter(f=>!SHARED_LISTING_KEYS.includes(f.key)).map(f=>renderListingField('shopee', f, (draft.shopee||{})[f.key], !!editingNaFields[`shopee_${f.key}`])).join('')}</div>
    ${extraPanelsHtml}
    <div class="modal-actions" style="justify-content:space-between;flex-wrap:wrap;row-gap:10px;">
      ${listingHasContent(existing) ? `<button class="btn ghost" style="color:var(--red);" onclick="deleteListingDraft('${id}')">Excluir rascunho</button>` : '<span></span>'}
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn ghost" onclick="closeModal()">Fechar</button>
        <button class="btn ghost" onclick="exportListingXlsx('${id}')">Exportar Excel</button>
        <button class="btn primary" onclick="saveListingDraft('${id}')">Salvar</button>
      </div>
    </div>
  `);
  renderListingPhotoPreview();
  updateListingFeeHint('ml');
  updateListingFeeHint('shopee');
  extras.forEach(plat=>updateListingFeeHint(plat.id));
}
function readListingForm(){
  const out = { ml:{}, shopee:{}, extra:{} };
  ['ml','shopee'].forEach(platform=>{
    LISTING_FIELDS[platform].forEach(f=>{
      const idKey = SHARED_LISTING_KEYS.includes(f.key) ? 'shared' : platform;
      const el = document.getElementById(`lst_${idKey}_${f.key}`);
      out[platform][f.key] = el ? el.value.trim() : '';
    });
    const linkEl = document.getElementById(`lst_${platform}_link`);
    out[platform].link = linkEl ? linkEl.value.trim() : '';
  });
  extraListingPlatforms().forEach(plat=>{
    const data = {};
    platformListingFields(plat.id).forEach(f=>{
      const idKey = SHARED_LISTING_KEYS.includes(f.key) ? 'shared' : plat.id;
      const el = document.getElementById(`lst_${idKey}_${f.key}`);
      data[f.key] = el ? el.value.trim() : '';
    });
    const linkEl = document.getElementById(`lst_${plat.id}_link`);
    data.link = linkEl ? linkEl.value.trim() : '';
    out.extra[plat.id] = data;
  });
  return out;
}
let editingListingPhotos = [];
let editingListingProductId = null;
async function handleListingPhotoUpload(input){
  const files = Array.from(input.files||[]);
  if(!files.length) return;
  try{
    const resized = await Promise.all(files.map(f=>resizeImageFile(f, 640, 0.75)));
    editingListingPhotos.push(...resized);
  }catch(e){
    toast('Não consegui processar uma dessas imagens — tente outro arquivo','err');
  }
  input.value = '';
  renderListingPhotoPreview();
}
function removeListingPhoto(index){
  editingListingPhotos.splice(index,1);
  renderListingPhotoPreview();
}
function downloadListingPhoto(index){
  const data = editingListingPhotos[index];
  if(!data) return;
  const a = document.createElement('a');
  a.href = data; a.download = `foto-${index+1}.jpg`;
  document.body.appendChild(a); a.click(); a.remove();
}
function renderListingPhotoPreview(){
  const el = document.getElementById('lstPhotoPreview');
  if(!el) return;
  if(!editingListingPhotos.length){
    el.innerHTML = `<div class="field hint" style="margin:0;">Nenhuma foto adicional — opcional</div>`;
    return;
  }
  el.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;">${editingListingPhotos.map((data,i)=>`
    <div style="position:relative;">
      <img src="${data}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;">
      <button class="btn ghost sm" style="position:absolute;top:-8px;right:-8px;padding:2px 7px;background:var(--panel);" onclick="removeListingPhoto(${i})">×</button>
      <button class="btn ghost sm" style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);padding:1px 6px;font-size:10px;background:var(--panel);white-space:nowrap;" onclick="downloadListingPhoto(${i})">Baixar</button>
    </div>
  `).join('')}</div>`;
}
function saveListingDraft(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  const values = readListingForm();
  let l = listingFor(id);
  if(!l){ l = { id:uid(), productId:id }; state.listings.push(l); }
  Object.assign(l, { productName:p.name, ml:values.ml, shopee:values.shopee, extra:values.extra, fotos:editingListingPhotos.slice(), naFields:Object.assign({},editingNaFields), updatedAt: new Date().toISOString() });
  saveListings();
  toast('Salvo');
  closeModal(); renderContent();
}
function deleteListingDraft(id){
  if(!confirm('Excluir o rascunho desse anúncio?')) return;
  state.listings = state.listings.filter(l=>l.productId!==id);
  saveListings();
  toast('Rascunho excluído');
  closeModal(); renderContent();
}
// Nomes de aba do Excel têm limite de 31 caracteres e não aceitam alguns
// símbolos — sanitiza pra não travar a exportação com nome de plataforma livre.
function sanitizeSheetName(name){
  return (name||'Plataforma').replace(/[\\/*?:\[\]]/g,'').slice(0,31) || 'Plataforma';
}
function exportListingXlsx(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  if(typeof XLSX==='undefined'){ toast('Biblioteca de exportação não carregou — verifique sua conexão e tente de novo','err'); return; }
  const values = readListingForm();
  const wb = XLSX.utils.book_new();
  ['ml','shopee'].forEach(platform=>{
    const rows = [LISTING_FIELDS[platform].map(f=>f.label), LISTING_FIELDS[platform].map(f=>values[platform][f.key]||'')];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), platform==='ml'?'Mercado Livre':'Shopee');
  });
  extraListingPlatforms().forEach(plat=>{
    const fields = platformListingFields(plat.id);
    const data = values.extra[plat.id]||{};
    const rows = [fields.map(f=>f.label), fields.map(f=>data[f.key]||'')];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sanitizeSheetName(plat.name));
  });
  XLSX.writeFile(wb, `anuncio-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.xlsx`);
  toast('Excel exportado');
}
function exportAllReadyListingsXlsx(){
  if(typeof XLSX==='undefined'){ toast('Biblioteca de exportação não carregou — verifique sua conexão e tente de novo','err'); return; }
  const ready = state.products.map(p=>listingFor(p.id)).filter(l=>listingIsComplete(l));
  if(ready.length===0){ toast('Nenhum anúncio pronto pra exportar','err'); return; }
  const wb = XLSX.utils.book_new();
  ['ml','shopee'].forEach(platform=>{
    const rows = [LISTING_FIELDS[platform].map(f=>f.label)];
    ready.forEach(l=> rows.push(LISTING_FIELDS[platform].map(f=>(l[platform]||{})[f.key]||'')));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), platform==='ml'?'Mercado Livre':'Shopee');
  });
  extraListingPlatforms().forEach(plat=>{
    const fields = platformListingFields(plat.id);
    const rows = [fields.map(f=>f.label)];
    ready.forEach(l=> rows.push(fields.map(f=>listingPlatformData(l, plat.id)[f.key]||'')));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sanitizeSheetName(plat.name));
  });
  XLSX.writeFile(wb, `anuncios-prontos-${todayStr()}.xlsx`);
  toast(`${ready.length} anúncio(s) exportado(s)`);
}
// Copia decisões de cadastro (categoria, condição, garantia, tipo de anúncio,
// variações, pré-venda, envio) de um anúncio pra outro produto — útil pra
// famílias de produtos parecidos (ex: os vários Skeleton de dinossauro).
// Preço/estoque/peso/SKU/título são gerados do zero pro produto de destino;
// modelo/GTIN/dimensões/descrição/fotos ficam em branco pra conferir.
const DUPLICATE_CARRY_KEYS = ['categoria','condicao','garantia','tipoAnuncio','variacoes','preVenda','envio'];
function openDuplicateListingModal(sourceId){
  const source = listingFor(sourceId);
  const sourceProduct = state.products.find(x=>x.id===sourceId);
  if(!source || !sourceProduct) return;
  const others = state.products.filter(x=>x.id!==sourceId);
  if(others.length===0){ toast('Não há outro produto pra duplicar esse anúncio','err'); return; }
  showModal(`Duplicar anúncio de "${sourceProduct.name}"`, `
    <div class="field hint" style="margin-top:-4px;">Copia categoria, condição, garantia, tipo de anúncio, variações, pré-venda e opções de envio. Título, preço, estoque, peso e SKU são gerados do zero pro produto escolhido; modelo, GTIN, dimensões, descrição e fotos ficam em branco pra você preencher.</div>
    <div class="field"><label>Duplicar para</label><select id="dupTargetProduct">
      ${others.map(p=>`<option value="${p.id}">${p.name}${listingHasContent(listingFor(p.id))?' (já tem anúncio)':''}</option>`).join('')}
    </select></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmDuplicateListing('${sourceId}')">Duplicar</button>
    </div>
  `);
}
function confirmDuplicateListing(sourceId){
  const targetId = document.getElementById('dupTargetProduct').value;
  const targetListing = listingFor(targetId);
  if(listingHasContent(targetListing) && !confirm('Esse produto já tem um anúncio com informações preenchidas. Duplicar vai sobrescrever os campos copiados. Continuar?')) return;
  duplicateListingToProduct(sourceId, targetId);
}
function duplicateListingToProduct(sourceId, targetId){
  const source = listingFor(sourceId);
  const targetProduct = state.products.find(x=>x.id===targetId);
  if(!source || !targetProduct) return;
  const base = defaultListingDraft(targetProduct);
  DUPLICATE_CARRY_KEYS.forEach(key=>{
    if(LISTING_FIELDS.ml.some(f=>f.key===key) && source.ml && source.ml[key]) base.ml[key] = source.ml[key];
    if(LISTING_FIELDS.shopee.some(f=>f.key===key) && source.shopee && source.shopee[key]) base.shopee[key] = source.shopee[key];
  });
  extraListingPlatforms().forEach(plat=>{
    const fields = platformListingFields(plat.id);
    const sourceData = listingPlatformData(source, plat.id);
    DUPLICATE_CARRY_KEYS.forEach(key=>{
      if(fields.some(f=>f.key===key) && sourceData[key]) base.extra[plat.id][key] = sourceData[key];
    });
  });
  let target = listingFor(targetId);
  if(!target){ target = { id:uid(), productId:targetId }; state.listings.push(target); }
  Object.assign(target, { productName:targetProduct.name, ml:base.ml, shopee:base.shopee, extra:base.extra, naFields:Object.assign({}, source.naFields), updatedAt: new Date().toISOString() });
  closeModal();
  openListingModal(targetId);
  toast('Anúncio duplicado — confira os campos e salve');
}
// Prévia somente leitura, como se fosse a página real do anúncio no
// Mercado Livre/Shopee — sem campos editáveis, sem checkbox de "não se aplica".
function openListingViewModal(id){
  const p = state.products.find(x=>x.id===id);
  const l = listingFor(id);
  if(!p || !l) return;
  const extras = extraListingPlatforms();
  const extraTabsHtml = extras.map(plat=>`<button type="button" class="tabbtn" id="viewTabBtn_${plat.id}" onclick="switchListingViewTab('${plat.id}')">${plat.name}</button>`).join('');
  const extraPanelsHtml = extras.map(plat=>`<div id="viewPanel_${plat.id}" style="display:none;">${renderListingViewPanel(p, l, plat.id)}</div>`).join('');
  showModal(`Anúncio — ${p.name}`, `
    <div class="tabbar">
      <button type="button" class="tabbtn active" id="viewTabBtn_ml" onclick="switchListingViewTab('ml')">Mercado Livre</button>
      <button type="button" class="tabbtn" id="viewTabBtn_shopee" onclick="switchListingViewTab('shopee')">Shopee</button>
      ${extraTabsHtml}
    </div>
    <div id="viewPanel_ml">${renderListingViewPanel(p, l, 'ml')}</div>
    <div id="viewPanel_shopee" style="display:none;">${renderListingViewPanel(p, l, 'shopee')}</div>
    ${extraPanelsHtml}
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Fechar</button>
      <button class="btn primary" onclick="openListingModal('${id}')">Editar</button>
    </div>
  `);
}
function switchListingViewTab(platform){
  const allKeys = ['ml','shopee', ...extraListingPlatforms().map(p=>p.id)];
  allKeys.forEach(key=>{
    const panel = document.getElementById(`viewPanel_${key}`);
    const btn = document.getElementById(`viewTabBtn_${key}`);
    if(panel) panel.style.display = key===platform ? '' : 'none';
    if(btn) btn.classList.toggle('active', key===platform);
  });
}
function renderListingViewPanel(p, l, platform){
  const data = listingPlatformData(l, platform);
  const fields = platform==='ml' ? LISTING_FIELDS.ml : platform==='shopee' ? LISTING_FIELDS.shopee : platformListingFields(platform);
  const titleKey = fields.some(f=>f.key==='titulo') ? 'titulo' : 'nome';
  const titulo = data[titleKey] || p.name;
  const preco = data.preco;
  const photos = [...(p.photo?[p.photo]:[]), ...(l.fotos||[])];
  const cover = photos[0];
  const thumbs = photos.length>1 ? `<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">${photos.slice(1,6).map(ph=>`<img src="${ph}" style="width:52px;height:52px;object-fit:cover;border-radius:6px;border:1px solid var(--line);">`).join('')}</div>` : '';
  const specFields = fields.filter(f=>f.key!==titleKey && f.key!=='descricao' && data[f.key]);
  const specsHtml = specFields.map(f=>`<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--line-soft);font-size:13px;"><span style="color:var(--text-dim);">${f.label.replace(/\s*\(.*?\)/,'')}</span><span style="font-weight:500;text-align:right;">${data[f.key]}</span></div>`).join('');
  return `
    <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:14px;">
      <div style="flex:0 0 220px;">
        <div style="width:220px;height:220px;background:var(--panel-2);border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
          ${cover?`<img src="${cover}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`:`<span style="color:var(--text-faint);font-size:12px;">Sem foto</span>`}
        </div>
        ${thumbs}
      </div>
      <div style="flex:1;min-width:240px;">
        <h2 style="font-family:var(--font-display);font-size:19px;margin:0 0 8px;">${titulo}</h2>
        <div style="font-family:var(--font-mono);font-size:25px;font-weight:700;color:var(--nozzle);margin-bottom:12px;">${preco?'R$ '+preco:'—'}</div>
        ${data.link ? `<a href="${data.link}" target="_blank" rel="noopener noreferrer" class="btn ghost sm" style="margin-bottom:12px;display:inline-flex;">Abrir anúncio publicado ↗</a>` : ''}
        ${specsHtml || `<div class="field hint" style="margin:0;">Nenhuma informação adicional preenchida.</div>`}
      </div>
    </div>
    <div style="margin-top:18px;">
      <div style="font-weight:600;font-size:13px;margin-bottom:6px;">Descrição</div>
      <div style="white-space:pre-wrap;font-size:13.5px;color:var(--text-dim);line-height:1.6;">${data.descricao || 'Sem descrição.'}</div>
    </div>
  `;
}
function deleteProduct(id){
  const p = state.products.find(x=>x.id===id);
  const openOrders = state.orders.filter(o=>o.productId===id && o.status!=='Enviado');
  let msg = `Excluir "${p.name}"? Vendas já registradas não serão afetadas.`;
  if(openOrders.length){
    msg += ` Atenção: ${openOrders.length} encomenda(s) em aberto usam esse produto — elas continuam na fila, mas os botões "Produzir"/"Vender" delas vão passar a apontar pro primeiro produto da lista, o que pode confundir. Considere cancelar ou concluir essas encomendas antes.`;
  }
  if(!confirm(msg)) return;
  state.products = state.products.filter(x=>x.id!==id);
  saveProducts(); toast('Produto excluído'); renderContent();
}
function openProductModal(id){
  currentPreviewFn = updateProductPreview;
  const editing = !!id;
  const filamentOpts = state.materials.filter(m=>m.category==='Filamento');
  const boxOpts = state.materials.filter(m=>m.category==='Embalagem' && m.isBox);
  const machineOpts = state.settings.machines||[];
  if(filamentOpts.length===0 || boxOpts.length===0){
    toast('Cadastre ao menos um filamento e uma caixa em Estoque antes de criar ou editar produtos', 'err');
    return;
  }
  if(machineOpts.length===0){
    toast('Cadastre ao menos uma impressora em Caixa → Configurar → Impressoras antes de criar ou editar produtos', 'err');
    return;
  }
  const p = editing ? state.products.find(x=>x.id===id) : { name:'', filaments:[{materialName:filamentOpts[0].name,weightG:100}], timeH:3, bubbleWrapM:0.5, tapeM:0.5, boxType:boxOpts[0].name, failureMarginPct:0.10, practicedPrice:0, stock:0, machineId:machineOpts[0].id };
  editingFilaments = JSON.parse(JSON.stringify(p.filaments && p.filaments.length ? p.filaments : [{materialName:filamentOpts[0].name,weightG:100}]));
  editingLaborActions = JSON.parse(JSON.stringify(p.laborActions||[]));
  editingToolsUsed = JSON.parse(JSON.stringify(p.toolsUsed||[]));
  editingPhotoData = p.photo || null;
  editingProductMlFee = p.mlRealFeePct!=null ? p.mlRealFeePct : null;
  editingProductMlFeeUpdatedAt = p.mlRealFeeUpdatedAt || null;
  editingProductMlFeeUpdatedAtPrice = p.mlRealFeeUpdatedAtPrice || null;
  const boxes = boxOpts;
  showModal(editing?'Editar produto':'Novo produto', `
    <div class="field"><label>Nome do produto</label><input id="pName" value="${p.name}" placeholder="Ex: Kit Escritório"></div>
    <div class="field"><label>Categoria (opcional)</label>
      <select id="pCategory" onchange="toggleNewCategoryInput(this.value)">
        <option value="">Sem categoria</option>
        ${productCategorySuggestions().map(c=>`<option value="${c}" ${p.category===c?'selected':''}>${c}</option>`).join('')}
        <option value="__new__" ${p.category && !productCategorySuggestions().includes(p.category)?'selected':''}>+ Nova categoria...</option>
      </select>
      <input id="pCategoryNew" placeholder="Nome da nova categoria" style="margin-top:6px;display:${p.category && !productCategorySuggestions().includes(p.category)?'block':'none'};" value="${p.category && !productCategorySuggestions().includes(p.category)?p.category:''}">
    </div>
    ${state.settings.mlConnected ? `
    <div class="field hint" style="margin:4px 0 4px;font-weight:600;color:var(--text-dim);">Categoria no Mercado Livre — taxa real (opcional)</div>
    <div class="row2">
      <div class="field" style="position:relative;"><label>Categoria no ML</label>
        <input id="pMlCategorySearch" placeholder="Digite o nome do produto pra buscar..." value="${p.mlCategoryName||''}" oninput="searchMlCategory(this.value)" autocomplete="off">
        <div id="pMlCategoryResults"></div>
        <input type="hidden" id="pMlCategoryId" value="${p.mlCategoryId||''}">
      </div>
      <div class="field"><label>Tipo de anúncio (pra essa taxa)</label>
        <select id="pMlListingType">
          <option value="gold_special" ${(!p.mlListingTypeForFee || p.mlListingTypeForFee==='gold_special')?'selected':''}>Clássico</option>
          <option value="gold_pro" ${p.mlListingTypeForFee==='gold_pro'?'selected':''}>Premium</option>
        </select>
      </div>
    </div>
    <div class="field hint" id="pMlFeeStatus" style="margin-top:-8px;">${editingProductMlFee!=null ? `Taxa real: <strong>${num(editingProductMlFee,1)}%</strong> (calculada em ${fmtDate((editingProductMlFeeUpdatedAt||'').slice(0,10))} pra R$ ${num(editingProductMlFeeUpdatedAtPrice||0,2)})` : 'Ainda não buscada — escolha a categoria acima e clique em atualizar.'}</div>
    <button type="button" class="btn ghost sm" style="margin-bottom:14px;" onclick="fetchMlRealFee()">Atualizar taxa real</button>
    ` : ''}
    <div class="field"><label>Foto (opcional)</label><input type="file" accept="image/*" id="pPhotoInput" onchange="handlePhotoUpload(this)"></div>
    <div id="pPhotoPreview"></div>

    <div class="field"><label>Origem do modelo 3D</label>
      <select id="pModelOrigin" onchange="toggleModelLicenseFields(this.value)">
        <option value="proprio" ${p.modelOrigin!=='terceiro'?'selected':''}>Próprio (desenhei eu mesmo)</option>
        <option value="terceiro" ${p.modelOrigin==='terceiro'?'selected':''}>Terceiro (baixado ou comprado)</option>
      </select>
    </div>
    <div id="pModelLicenseBlock" style="display:${p.modelOrigin==='terceiro'?'block':'none'};">
      <div class="row2">
        <div class="field"><label>Licença</label><input id="pModelLicense" value="${p.modelLicense||''}" placeholder="Ex: CC0, CC BY, Comprada, Standard Digital File License"></div>
        <div class="field"><label>Fonte do modelo (URL, opcional)</label><input id="pModelSourceUrl" value="${p.modelSourceUrl||''}" placeholder="Link do MakerWorld/Thingiverse/Cults3D..."></div>
      </div>
      <div class="field hint" style="margin-top:-8px;">Modelo de terceiro vendido em ML/Shopee exige comprovação de licença comercial — a licença padrão do MakerWorld, por exemplo, proíbe venda da peça impressa.</div>
    </div>

    <div class="field" style="margin-bottom:6px;"><label>Filamentos usados nessa impressão</label></div>
    <div id="filamentRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addFilamentRow()">+ Adicionar filamento</button>

    <div class="field" style="margin-bottom:6px;"><label>Dimensões do produto (opcional — pra checar se cabe na caixa)</label></div>
    <div class="row3">
      <div class="field"><label>Comprimento (cm)</label><input type="number" id="pLengthCm" value="${p.lengthCm||''}" step="0.1" placeholder="opcional" oninput="suggestBoxForDimensions(); updateProductPreview();"></div>
      <div class="field"><label>Largura (cm)</label><input type="number" id="pWidthCm" value="${p.widthCm||''}" step="0.1" placeholder="opcional" oninput="suggestBoxForDimensions(); updateProductPreview();"></div>
      <div class="field"><label>Altura (cm)</label><input type="number" id="pHeightCm" value="${p.heightCm||''}" step="0.1" placeholder="opcional" oninput="suggestBoxForDimensions(); updateProductPreview();"></div>
    </div>

    <div class="row2">
      <div class="field"><label>Impressora usada</label><select id="pMachine" onchange="updateProductPreview()">
        ${machineOpts.map(m=>`<option value="${m.id}" ${(p.machineId||machineOpts[0].id)===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>Tipo de caixa</label><select id="pBox" onchange="updateBoxFitStatus(); updateProductPreview()">
        ${boxes.map(b=>`<option value="${b.name}" ${p.boxType===b.name?'selected':''}>${b.name}</option>`).join('')}
      </select></div>
    </div>
    <div class="field hint" id="pBoxFitStatus" style="margin-top:-8px;"></div>
    <div class="row2">
      <div class="field"><label>Plástico bolha (m)</label><input type="number" id="pBubble" value="${p.bubbleWrapM}" step="0.1" oninput="updateProductPreview()"></div>
      <div class="field"><label>Tempo impressão</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="number" id="pTimeH" value="${Math.floor(p.timeH||0)}" min="0" step="1" placeholder="h" style="width:0;flex:1;" oninput="updateProductPreview()">
          <span style="font-size:12px;color:var(--text-faint);">h</span>
          <input type="number" id="pTimeMin" value="${Math.round(((p.timeH||0)%1)*60)}" min="0" max="59" step="1" placeholder="min" style="width:0;flex:1;" oninput="updateProductPreview()">
          <span style="font-size:12px;color:var(--text-faint);">min</span>
        </div>
      </div>
    </div>
    <div class="row2">
      <div class="field"><label>Fita adesiva usada (m)</label><input type="number" id="pTape" value="${p.tapeM||0}" step="0.1" oninput="updateProductPreview()"></div>
      <div class="field"><label>Margem de falha (%)</label><input type="number" id="pFail" value="${(p.failureMarginPct*100)}" step="1" oninput="updateProductPreview()"></div>
    </div>

    <div class="field" style="margin-bottom:6px;"><label>Mão de obra (ações e minutos de cada uma)</label></div>
    <div id="laborActionRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addLaborActionRow()">+ Adicionar ação</button>
    ${laborActionOptionsHtml()}

    <div class="field" style="margin-bottom:6px;"><label>Ferramentas usadas (e quantos usos cada uma consome)</label></div>
    <div id="toolsUsedRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addToolsUsedRow()">+ Adicionar ferramenta</button>

    <div class="row2">
      <div class="field"><label>Frete aproximado — Mercado Livre (R$)</label><input type="number" id="pFreightMl" value="${p.estimatedFreightMl||''}" step="0.01" placeholder="opcional" oninput="updateProductPreview()"></div>
      <div class="field"><label>Frete aproximado — Shopee (R$)</label><input type="number" id="pFreightShopee" value="${p.estimatedFreightShopee||''}" step="0.01" placeholder="opcional" oninput="this.dataset.touched='1'; updateProductPreview()"></div>
    </div>

    <div class="row2">
      <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" id="pMargin" value="${(p.desiredMarginPct!=null ? p.desiredMarginPct : calcProduct(p).desiredMarginPct).toFixed(0)}" step="1" oninput="document.getElementById('pPrice').dataset.touched=''; updateProductPreview()"></div>
      <div class="field"><label>Preço praticado — Venda própria (R$)</label><input type="number" id="pPrice" value="${p.practicedPrice||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Preço praticado — Mercado Livre (R$)</label><input type="number" id="pPriceMl" value="${p.practicedPriceMl||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>
      <div class="field"><label>Preço praticado — Shopee (R$)</label><input type="number" id="pPriceShopee" value="${p.practicedPriceShopee||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>
    </div>
    ${extraListingPlatforms().map(plat=>`<div class="field"><label>Preço praticado — ${plat.name} (R$)</label><input type="number" id="pPriceExtra_${plat.id}" value="${(p.practicedPriceExtra||{})[plat.id]||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>`).join('')}
    <div class="field"><label>Estoque inicial (un)</label><input type="number" id="pStock" value="${p.stock}" step="1"></div>
    <div class="helper-block" id="productPreview"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmProduct(${editing?`'${id}'`:'null'})">${editing?'Salvar alterações':'Criar produto'}</button>
    </div>
  `);
  renderFilamentRows();
  renderLaborActionRows();
  renderToolsUsedRows();
  renderPhotoPreview();
  updateBoxFitStatus();
  updateProductPreview();
}
let editingFilaments = [];
let editingLaborActions = [];
let editingToolsUsed = [];
let editingPhotoData = null;
let editingProductMlFee = null;
let editingProductMlFeeUpdatedAt = null;
let editingProductMlFeeUpdatedAtPrice = null;
function resizeImageFile(file, maxSize, quality){
  return new Promise((resolve,reject)=>{
    if(!file.type.startsWith('image/')){ reject(new Error('not an image')); return; }
    const reader = new FileReader();
    reader.onload = (e)=>{
      const img = new Image();
      img.onload = ()=>{
        let w = img.width, h = img.height;
        if(w>h){ if(w>maxSize){ h = Math.round(h*maxSize/w); w = maxSize; } }
        else { if(h>maxSize){ w = Math.round(w*maxSize/h); h = maxSize; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = ()=>reject(new Error('bad image'));
      img.src = e.target.result;
    };
    reader.onerror = ()=>reject(new Error('read error'));
    reader.readAsDataURL(file);
  });
}
async function handleBusinessLogoUpload(input){
  const file = input.files[0];
  if(!file) return;
  try{
    editingBusinessLogo = await resizeImageFile(file, 480, 0.9);
    document.getElementById('cfgBusinessLogoPreview').innerHTML = `<img src="${editingBusinessLogo}" alt="Prévia da logo" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin-top:8px;display:block;">`;
  }catch(e){
    toast('Não consegui processar essa imagem — tente outro arquivo','err');
  }
}
async function handlePhotoUpload(input){
  const file = input.files[0];
  if(!file) return;
  try{
    editingPhotoData = await resizeImageFile(file, 320, 0.72);
    renderPhotoPreview();
  }catch(e){
    toast('Não consegui processar essa imagem — tente outro arquivo','err');
  }
}
function removePhoto(){
  editingPhotoData = null;
  const input = document.getElementById('pPhotoInput');
  if(input) input.value = '';
  renderPhotoPreview();
}
function renderPhotoPreview(){
  const el = document.getElementById('pPhotoPreview');
  if(!el) return;
  el.innerHTML = editingPhotoData
    ? `<div style="position:relative;display:inline-block;margin-top:8px;">
         <img src="${editingPhotoData}" alt="Prévia da foto do produto" style="width:110px;height:110px;object-fit:cover;border-radius:8px;border:1px solid var(--line);display:block;">
         <button class="btn ghost sm" style="position:absolute;top:-8px;right:-8px;padding:2px 7px;background:var(--panel);" onclick="removePhoto()">×</button>
       </div>`
    : `<div style="font-size:11.5px;color:var(--text-faint);margin-top:6px;">Nenhuma foto — opcional</div>`;
}
// As linhas de filamento/mão de obra/ferramentas são compartilhadas entre o
// modal de Produtos e o de Personalizados — currentPreviewFn aponta pra qual
// preview atualizar, em vez de chamar updateProductPreview() direto (que só
// existe no modal de Produtos e quebraria no de Personalizados).
let currentPreviewFn = null;
function refreshCurrentPreview(){ if(currentPreviewFn) currentPreviewFn(); }
function renderFilamentRows(){
  const el = document.getElementById('filamentRows');
  if(!el) return;
  const filamentOptions = state.materials.filter(m=>m.category==='Filamento');
  el.innerHTML = editingFilaments.map((f,i)=>`
    <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 28px;gap:8px;align-items:center;margin-bottom:8px;">
      <select style="min-width:0;" onchange="editingFilaments[${i}].materialName=this.value; refreshCurrentPreview();">
        ${filamentOptions.map(fo=>`<option value="${fo.name}" ${f.materialName===fo.name?'selected':''}>${fo.name}</option>`).join('')}
      </select>
      <input type="number" step="0.01" value="${f.weightG}" placeholder="peso (g)" style="min-width:0;" oninput="editingFilaments[${i}].weightG=parseFloat(this.value)||0; refreshCurrentPreview();">
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="removeFilamentRow(${i})">×</button>
    </div>
  `).join('');
}
function addFilamentRow(){
  const firstFilament = (state.materials.find(m=>m.category==='Filamento')||{}).name||'PLA';
  editingFilaments.push({materialName:firstFilament, weightG:0});
  renderFilamentRows();
  refreshCurrentPreview();
}
function removeFilamentRow(i){
  if(editingFilaments.length<=1){ toast('O produto precisa de ao menos um filamento','err'); return; }
  editingFilaments.splice(i,1);
  renderFilamentRows();
  refreshCurrentPreview();
}
function renderLaborActionRows(){
  const el = document.getElementById('laborActionRows');
  if(!el) return;
  el.innerHTML = editingLaborActions.map((a,i)=>`
    <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 28px;gap:8px;align-items:center;margin-bottom:8px;">
      <input list="laborActionOptions" value="${a.action}" placeholder="Ação (ex: Lixar)" style="min-width:0;" oninput="editingLaborActions[${i}].action=this.value; refreshCurrentPreview();">
      <input type="number" step="1" value="${a.minutes}" placeholder="minutos" style="min-width:0;" oninput="editingLaborActions[${i}].minutes=parseFloat(this.value)||0; refreshCurrentPreview();">
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="removeLaborActionRow(${i})">×</button>
    </div>
  `).join('');
}
function addLaborActionRow(){
  editingLaborActions.push({action:'', minutes:0});
  renderLaborActionRows();
  refreshCurrentPreview();
}
function removeLaborActionRow(i){
  editingLaborActions.splice(i,1);
  renderLaborActionRows();
  refreshCurrentPreview();
}
function renderToolsUsedRows(){
  const el = document.getElementById('toolsUsedRows');
  if(!el) return;
  const toolOptions = state.materials.filter(m=>m.category==='Ferramentas');
  if(toolOptions.length===0){
    el.innerHTML = `<div class="field hint" style="margin-top:0;">Nenhuma ferramenta cadastrada ainda — cadastre em Estoque (categoria Ferramentas) pra poder usar aqui.</div>`;
    return;
  }
  el.innerHTML = editingToolsUsed.map((t,i)=>`
    <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 28px;gap:8px;align-items:center;margin-bottom:8px;">
      <select style="min-width:0;" onchange="editingToolsUsed[${i}].toolId=this.value; refreshCurrentPreview();">
        ${toolOptions.map(to=>`<option value="${to.id}" ${t.toolId===to.id?'selected':''}>${to.name}</option>`).join('')}
      </select>
      <input type="number" step="1" value="${t.uses}" placeholder="usos" style="min-width:0;" oninput="editingToolsUsed[${i}].uses=parseFloat(this.value)||0; refreshCurrentPreview();">
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="removeToolsUsedRow(${i})">×</button>
    </div>
  `).join('');
}
function addToolsUsedRow(){
  const toolOptions = state.materials.filter(m=>m.category==='Ferramentas');
  if(toolOptions.length===0){ toast('Cadastre uma ferramenta em Estoque primeiro','err'); return; }
  editingToolsUsed.push({toolId:toolOptions[0].id, uses:1});
  renderToolsUsedRows();
  refreshCurrentPreview();
}
function removeToolsUsedRow(i){
  editingToolsUsed.splice(i,1);
  renderToolsUsedRows();
  refreshCurrentPreview();
}
function productCategorySuggestions(){
  return Array.from(new Set(state.products.map(p=>p.category).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
const LABOR_ACTION_PRESETS = ['Lixar','Pintar','Colar','Furar','Montar','Empacotar','Revisar/Controle de qualidade'];
function laborActionSuggestions(){
  const used = state.products.flatMap(p=>(p.laborActions||[]).map(a=>a.action)).filter(Boolean);
  return Array.from(new Set([...LABOR_ACTION_PRESETS, ...used])).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function laborActionOptionsHtml(){
  return `<datalist id="laborActionOptions">${laborActionSuggestions().map(a=>`<option value="${a}"></option>`).join('')}</datalist>`;
}
function toggleNewCategoryInput(val){
  const el = document.getElementById('pCategoryNew');
  if(el){ el.style.display = val==='__new__' ? 'block' : 'none'; if(val!=='__new__') el.value=''; }
}
function toggleModelLicenseFields(val){
  const el = document.getElementById('pModelLicenseBlock');
  if(el) el.style.display = val==='terceiro' ? 'block' : 'none';
}
function readProductForm(){
  const catSel = document.getElementById('pCategory').value;
  const form = {
    name: document.getElementById('pName').value.trim(),
    category: catSel==='__new__' ? document.getElementById('pCategoryNew').value.trim() : catSel,
    filaments: editingFilaments,
    boxType: document.getElementById('pBox').value,
    machineId: document.getElementById('pMachine').value,
    timeH: (parseFloat(document.getElementById('pTimeH').value)||0) + (parseFloat(document.getElementById('pTimeMin').value)||0)/60,
    bubbleWrapM: parseFloat(document.getElementById('pBubble').value)||0,
    tapeM: parseFloat(document.getElementById('pTape').value)||0,
    failureMarginPct: (parseFloat(document.getElementById('pFail').value)||0)/100,
    laborActions: editingLaborActions,
    toolsUsed: editingToolsUsed,
    desiredMarginPct: parseFloat(document.getElementById('pMargin').value)||0,
    lengthCm: parseFloat(document.getElementById('pLengthCm').value)||0,
    widthCm: parseFloat(document.getElementById('pWidthCm').value)||0,
    heightCm: parseFloat(document.getElementById('pHeightCm').value)||0,
    estimatedFreightMl: parseFloat(document.getElementById('pFreightMl').value)||0,
    estimatedFreightShopee: parseFloat(document.getElementById('pFreightShopee').value)||0,
    modelOrigin: document.getElementById('pModelOrigin').value,
    modelLicense: document.getElementById('pModelLicense').value.trim(),
    modelSourceUrl: document.getElementById('pModelSourceUrl').value.trim(),
  };
  const mlCatIdEl = document.getElementById('pMlCategoryId');
  if(mlCatIdEl){
    form.mlCategoryId = mlCatIdEl.value.trim();
    form.mlCategoryName = document.getElementById('pMlCategorySearch').value.trim();
    form.mlListingTypeForFee = document.getElementById('pMlListingType').value;
    form.mlRealFeePct = editingProductMlFee;
    form.mlRealFeeUpdatedAt = editingProductMlFeeUpdatedAt;
    form.mlRealFeeUpdatedAtPrice = editingProductMlFeeUpdatedAtPrice;
  }
  return form;
}
function suggestBoxForDimensions(){
  const lengthCm = parseFloat(document.getElementById('pLengthCm').value)||0;
  const widthCm = parseFloat(document.getElementById('pWidthCm').value)||0;
  const heightCm = parseFloat(document.getElementById('pHeightCm').value)||0;
  if(lengthCm>0 && widthCm>0 && heightCm>0){
    const best = bestFittingBox(lengthCm, widthCm, heightCm);
    if(best) document.getElementById('pBox').value = best.name;
  }
  updateBoxFitStatus();
}
function updateBoxFitStatus(){
  const statusEl = document.getElementById('pBoxFitStatus');
  if(!statusEl) return;
  const lengthCm = parseFloat(document.getElementById('pLengthCm').value)||0;
  const widthCm = parseFloat(document.getElementById('pWidthCm').value)||0;
  const heightCm = parseFloat(document.getElementById('pHeightCm').value)||0;
  if(!(lengthCm>0 && widthCm>0 && heightCm>0)){ statusEl.textContent = ''; return; }
  const boxName = document.getElementById('pBox').value;
  const box = materialByName(boxName);
  const fits = boxFitsDimensions(box, lengthCm, widthCm, heightCm);
  if(fits===true){
    statusEl.innerHTML = `<span style="color:var(--teal);">✓ Cabe na caixa selecionada</span>`;
  } else if(fits===false){
    const best = bestFittingBox(lengthCm, widthCm, heightCm);
    statusEl.innerHTML = best
      ? `<span style="color:var(--red);">⚠️ Não cabe nessa caixa — sugerido: ${best.name}</span>`
      : `<span style="color:var(--red);">⚠️ Nenhuma caixa cadastrada é grande o suficiente — cadastre as medidas de uma caixa maior em Estoque</span>`;
  } else {
    statusEl.textContent = '';
  }
}
// Detalha preço de venda → (–) taxa → (–) frete → valor líquido, passo a passo,
// pra ficar claro de onde vem cada desconto (em vez de só um "já com a taxa").
function platformBreakdownHtml(platformName, salePrice, feeAmount, feePct, feeQualifier, freightAmount, freightLabel, netReceipt, note){
  return `
    <div style="margin-top:8px;padding:8px 10px;background:var(--bg-alt);border-radius:8px;">
      <div class="calc-line" style="font-weight:600;"><span>${platformName} — preço de venda</span><span>${brl(salePrice)}</span></div>
      <div class="calc-line" style="color:var(--text-faint);font-size:11.5px;"><span>(–) Taxa ${platformName} (${feeQualifier}, ${num(feePct,1)}%)</span><span>-${brl(feeAmount)}</span></div>
      ${note ? `<div style="color:var(--text-faint);font-size:11px;font-style:italic;padding:2px 0;">${note}</div>` : ''}
      ${freightAmount>0 ? `<div class="calc-line" style="color:var(--text-faint);font-size:11.5px;"><span>(–) ${freightLabel}</span><span>-${brl(freightAmount)}</span></div>` : ''}
      <div class="calc-line" style="border-top:1px dashed var(--line-soft);margin-top:4px;padding-top:4px;font-weight:600;color:var(--green);"><span>= Você recebe</span><span>${brl(netReceipt)}</span></div>
    </div>
  `;
}
function updateProductPreview(){
  const form = readProductForm();
  if(form.mlRealFeePct===undefined) form.mlRealFeePct = editingProductMlFee;
  const c = calcProduct(form);
  document.getElementById('productPreview').innerHTML = `
    <div class="calc-line"><span>Peso total</span><span>${num(totalWeight(form),0)}g</span></div>
    <div class="calc-line"><span>Custo material</span><span>${brl(c.materialCost)}</span></div>
    <div class="calc-line"><span>Custo energia</span><span>${brl(c.energyCost)}</span></div>
    <div class="calc-line"><span>Embalagem (caixa + bolha + fita)</span><span>${brl(c.embalagemCost)}</span></div>
    <div class="calc-line"><span>Depreciação (${c.machine?c.machine.name:'sem impressora'})</span><span>${brl(c.depreciation)}</span></div>
    <div class="calc-line"><span>Manutenção</span><span>${brl(c.maintenance)}</span></div>
    <div class="calc-line"><span>Mão de obra</span><span>${brl(c.laborCost)}</span></div>
    ${c.toolsCost>0 ? `<div class="calc-line"><span>Ferramentas</span><span>${brl(c.toolsCost)}</span></div>` : ''}
    <div class="calc-line"><span>Custo de falha</span><span>${brl(c.failureCost)}</span></div>
    <div class="calc-line total"><span>Custo total</span><span>${brl(c.totalCost)}</span></div>
    <div class="calc-line total"><span>Preço sugerido — venda própria (margem de ${num(form.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
    ${platformBreakdownHtml('Mercado Livre', c.suggestedPriceMl, c.mlFeeAmount, c.mlFeePct, editingProductMlFee!=null?'real':'estimada', c.effectiveFreightMl, 'Frete estimado', c.netReceiptMl)}
    ${platformBreakdownHtml('Shopee', c.suggestedPriceShopee, c.shopeeFeeAmount, c.shopeeFeePct, 'estimada', c.effectiveFreightShopee, 'Frete acima do subsídio (sai do seu bolso)', c.netReceiptShopee, c.estimatedShopeeFreightCap!=null ? `Shopee subsidia o frete até ${brl(c.estimatedShopeeFreightCap)} nessa faixa de preço — você só paga o que passar disso.` : null)}
    ${extraListingPlatforms().map(plat=>`<div class="calc-line" style="color:var(--text-faint);"><span>↳ ${plat.name} (já com a taxa)</span><span>${brl(c.suggestedPriceExtra[plat.id])}</span></div>`).join('')}
  `;
  const priceInput = document.getElementById('pPrice');
  if(priceInput && !priceInput.dataset.touched && document.activeElement!==priceInput){
    priceInput.placeholder = 'sugerido: '+c.suggestedPrice.toFixed(2);
  }
  const priceMlInput = document.getElementById('pPriceMl');
  if(priceMlInput && !priceMlInput.dataset.touched && document.activeElement!==priceMlInput){
    priceMlInput.placeholder = 'sugerido: '+c.suggestedPriceMl.toFixed(2);
  }
  const priceShopeeInput = document.getElementById('pPriceShopee');
  if(priceShopeeInput && !priceShopeeInput.dataset.touched && document.activeElement!==priceShopeeInput){
    priceShopeeInput.placeholder = 'sugerido: '+c.suggestedPriceShopee.toFixed(2);
  }
  extraListingPlatforms().forEach(plat=>{
    const inputEl = document.getElementById(`pPriceExtra_${plat.id}`);
    if(inputEl && !inputEl.dataset.touched && document.activeElement!==inputEl){
      inputEl.placeholder = 'sugerido: '+c.suggestedPriceExtra[plat.id].toFixed(2);
    }
  });
  const freightShopeeInput = document.getElementById('pFreightShopee');
  if(freightShopeeInput && !freightShopeeInput.dataset.touched && document.activeElement!==freightShopeeInput && c.estimatedShopeeFreightCap!=null){
    freightShopeeInput.placeholder = 'sugerido: '+c.estimatedShopeeFreightCap.toFixed(2);
  }
}
function confirmProduct(id){
  const form = readProductForm();
  if(!form.name){ toast('Informe o nome do produto','err'); return; }
  const dup = state.products.find(x=>x.id!==id && x.name.trim().toLowerCase()===form.name.trim().toLowerCase());
  if(dup){ toast(`Já existe um produto chamado "${dup.name}" — use outro nome`,'err'); return; }
  if(form.lengthCm>0 && form.widthCm>0 && form.heightCm>0){
    const fits = boxFitsDimensions(materialByName(form.boxType), form.lengthCm, form.widthCm, form.heightCm);
    if(fits===false){ toast('Esse produto não cabe na caixa selecionada — escolha outra caixa ou ajuste as medidas','err'); return; }
  }
  const priceRaw = document.getElementById('pPrice').value;
  const priceMlRaw = document.getElementById('pPriceMl').value;
  const priceShopeeRaw = document.getElementById('pPriceShopee').value;
  const stock = parseFloat(document.getElementById('pStock').value)||0;
  const c = calcProduct(form);
  const practicedPrice = priceRaw ? parseFloat(priceRaw) : c.suggestedPrice;
  const practicedPriceMl = priceMlRaw ? parseFloat(priceMlRaw) : c.suggestedPriceMl;
  const practicedPriceShopee = priceShopeeRaw ? parseFloat(priceShopeeRaw) : c.suggestedPriceShopee;
  const practicedPriceExtra = {};
  extraListingPlatforms().forEach(plat=>{
    const raw = (document.getElementById(`pPriceExtra_${plat.id}`)||{}).value;
    practicedPriceExtra[plat.id] = raw ? parseFloat(raw) : c.suggestedPriceExtra[plat.id];
  });
  if(practicedPrice<0 || stock<0 || practicedPriceMl<0 || practicedPriceShopee<0 || Object.values(practicedPriceExtra).some(v=>v<0)){ toast('Preço e estoque não podem ser negativos','err'); return; }
  if(id){
    const p = state.products.find(x=>x.id===id);
    Object.assign(p, form, { practicedPrice, practicedPriceMl, practicedPriceShopee, practicedPriceExtra, stock, photo: editingPhotoData });
  } else {
    state.products.push({ id:uid(), ...form, practicedPrice, practicedPriceMl, practicedPriceShopee, practicedPriceExtra, stock, photo: editingPhotoData });
  }
  saveProducts();
  toast(id?'Produto atualizado':'Produto criado');
  closeModal(); renderContent();
}

/* ===================== PERSONALIZADOS ===================== */
// Área separada de Produtos pra projetos/encomendas sob medida: mesmo motor de
// custo (calcProduct), sem a parte de marketplace (ML/Shopee), com campos de
// pedido/cliente e a ficha técnica de impressão — export vira uma peça de cada
// vez, não o catálogo inteiro. Ficha inspirada no modelo em papel já usado.
let personalizadosFilter = { search:'' };
function customerNameFor(o){
  if(o.customerId){ const cu = state.customers.find(c=>c.id===o.customerId); if(cu) return cu.name; }
  return o.customerName || 'Avulso';
}
function nextCustomOrderNumber(){
  const nums = state.customOrders.map(o=>parseInt((o.orderNumber||'').replace(/\D/g,''),10)).filter(n=>!isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return String(next).padStart(4,'0');
}
function renderPersonalizados(){
  if(state.customOrders.length===0) return `<div class="card">${emptyState('Nenhuma encomenda personalizada cadastrada ainda. Clique em "+ Nova encomenda personalizada".')}</div>`;
  let list = state.customOrders.slice().sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''));
  if(personalizadosFilter.search){
    const q = personalizadosFilter.search.toLowerCase();
    list = list.filter(o=>(o.name||'').toLowerCase().includes(q) || (o.orderNumber||'').toLowerCase().includes(q) || customerNameFor(o).toLowerCase().includes(q));
  }
  const resultBadge = (r) => r==='ok' ? '<span class="badge ok">OK</span>' : r==='falha_parcial' ? '<span class="badge warn">Falha parcial</span>' : r==='falha_total' ? '<span class="badge bad">Falha total</span>' : '<span class="badge mut">—</span>';
  const rowHtml = (o) => {
    const c = calcProduct(o);
    return `<tr>
      <td data-label="Foto">${o.photo ? `<img src="${o.photo}" alt="${o.name}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;">` : `<div style="width:36px;height:36px;border-radius:6px;background:var(--panel-2);"></div>`}</td>
      <td data-label="Peça">${o.name||'(sem nome)'}${o.orderNumber ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Pedido ${o.orderNumber}</div>` : ''}</td>
      <td data-label="Cliente">${customerNameFor(o)}</td>
      <td class="right num" data-label="Qtd">${o.qty||1}</td>
      <td class="right num" data-label="Custo total">${brl(c.totalCost)}</td>
      <td class="right num" data-label="Valor total">${brl(c.practicedPrice)}</td>
      <td class="right num" data-label="Margem" style="color:${c.marginValue<0?'var(--red)':'var(--green)'}">${pct(c.marginPct)}</td>
      <td data-label="Resultado">${resultBadge(o.result)}</td>
      <td class="right"><button class="btn ghost sm" onclick="openCustomOrderModal('${o.id}')">Editar</button> <button class="btn ghost sm" onclick="exportCustomOrderPDF('${o.id}')">Ficha</button> <button class="btn ghost sm" onclick="deleteCustomOrder('${o.id}')">Excluir</button></td>
    </tr>`;
  };
  return `
    <div class="filter-bar">
      <div class="field"><label>Buscar</label><input value="${personalizadosFilter.search}" placeholder="Nome, pedido ou cliente..." oninput="personalizadosFilter.search=this.value; renderContent();"></div>
      <div class="field hint" style="padding-top:9px;">${list.length} de ${state.customOrders.length} encomenda(s)</div>
    </div>
    <div class="tbl-wrap tbl-responsive"><table>
      <thead><tr><th></th><th>Peça</th><th>Cliente</th><th class="right">Qtd</th><th class="right">Custo total</th><th class="right">Valor total</th><th class="right">Margem</th><th>Resultado</th><th></th></tr></thead>
      <tbody>${list.map(rowHtml).join('')}</tbody>
    </table></div>
  `;
}
function deleteCustomOrder(id){
  const o = state.customOrders.find(x=>x.id===id);
  if(!o) return;
  if(!confirm(`Excluir a encomenda "${o.name}"${o.orderNumber?' (Pedido '+o.orderNumber+')':''}? Essa ação não pode ser desfeita.`)) return;
  state.customOrders = state.customOrders.filter(x=>x.id!==id);
  saveCustomOrders(); toast('Encomenda excluída'); renderContent();
}
function toggleCoCustomerField(val){
  const el = document.getElementById('coCustomerNameWrap');
  if(el) el.style.display = val ? 'none' : 'block';
}
function openCustomOrderModal(id){
  currentPreviewFn = updateCustomOrderPreview;
  const editing = !!id;
  const filamentOpts = state.materials.filter(m=>m.category==='Filamento');
  const boxOpts = state.materials.filter(m=>m.category==='Embalagem' && m.isBox);
  const machineOpts = state.settings.machines||[];
  if(filamentOpts.length===0 || boxOpts.length===0){
    toast('Cadastre ao menos um filamento e uma caixa em Estoque antes de criar uma encomenda personalizada', 'err');
    return;
  }
  if(machineOpts.length===0){
    toast('Cadastre ao menos uma impressora em Configurações antes de criar uma encomenda personalizada', 'err');
    return;
  }
  const o = editing ? state.customOrders.find(x=>x.id===id) : {
    name:'', filaments:[{materialName:filamentOpts[0].name,weightG:100}], timeH:3, bubbleWrapM:0.5, tapeM:0.5, boxType:boxOpts[0].name,
    failureMarginPct:0.10, practicedPrice:0, machineId:machineOpts[0].id, modelOrigin:'proprio', supports:'nao',
    qty:1, orderNumber: nextCustomOrderNumber(), orderDate: todayStr(), nozzleDiameterMm:0.4,
  };
  editingFilaments = JSON.parse(JSON.stringify(o.filaments && o.filaments.length ? o.filaments : [{materialName:filamentOpts[0].name,weightG:100}]));
  editingLaborActions = JSON.parse(JSON.stringify(o.laborActions||[]));
  editingToolsUsed = JSON.parse(JSON.stringify(o.toolsUsed||[]));
  editingPhotoData = o.photo || null;
  showModal(editing?'Editar encomenda personalizada':'Nova encomenda personalizada', `
    <div class="section-title" style="margin-top:0;">A peça</div>
    <div class="field"><label>Nome da peça</label><input id="pName" value="${o.name||''}" placeholder="Ex: Topo de bolo personalizado"></div>
    <div class="field"><label>Categoria (opcional)</label>
      <select id="pCategory" onchange="toggleNewCategoryInput(this.value)">
        <option value="">Sem categoria</option>
        ${productCategorySuggestions().map(c=>`<option value="${c}" ${o.category===c?'selected':''}>${c}</option>`).join('')}
        <option value="__new__" ${o.category && !productCategorySuggestions().includes(o.category)?'selected':''}>+ Nova categoria...</option>
      </select>
      <input id="pCategoryNew" placeholder="Nome da nova categoria" style="margin-top:6px;display:${o.category && !productCategorySuggestions().includes(o.category)?'block':'none'};" value="${o.category && !productCategorySuggestions().includes(o.category)?o.category:''}">
    </div>
    <div class="field"><label>Foto (opcional)</label><input type="file" accept="image/*" id="pPhotoInput" onchange="handlePhotoUpload(this)"></div>
    <div id="pPhotoPreview"></div>

    <div class="field" style="margin-bottom:6px;"><label>Filamentos usados nessa impressão</label></div>
    <div id="filamentRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addFilamentRow()">+ Adicionar filamento</button>

    <div class="row2">
      <div class="field"><label>Impressora usada</label><select id="pMachine" onchange="refreshCurrentPreview()">
        ${machineOpts.map(m=>`<option value="${m.id}" ${(o.machineId||machineOpts[0].id)===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>Tipo de caixa</label><select id="pBox" onchange="refreshCurrentPreview()">
        ${boxOpts.map(b=>`<option value="${b.name}" ${o.boxType===b.name?'selected':''}>${b.name}</option>`).join('')}
      </select></div>
    </div>
    <div class="row2">
      <div class="field"><label>Plástico bolha (m)</label><input type="number" id="pBubble" value="${o.bubbleWrapM||0}" step="0.1" oninput="refreshCurrentPreview()"></div>
      <div class="field"><label>Tempo impressão</label>
        <div style="display:flex;gap:6px;align-items:center;">
          <input type="number" id="pTimeH" value="${Math.floor(o.timeH||0)}" min="0" step="1" placeholder="h" style="width:0;flex:1;" oninput="refreshCurrentPreview()">
          <span style="font-size:12px;color:var(--text-faint);">h</span>
          <input type="number" id="pTimeMin" value="${Math.round(((o.timeH||0)%1)*60)}" min="0" max="59" step="1" placeholder="min" style="width:0;flex:1;" oninput="refreshCurrentPreview()">
          <span style="font-size:12px;color:var(--text-faint);">min</span>
        </div>
      </div>
    </div>
    <div class="row2">
      <div class="field"><label>Fita adesiva usada (m)</label><input type="number" id="pTape" value="${o.tapeM||0}" step="0.1" oninput="refreshCurrentPreview()"></div>
      <div class="field"><label>Margem de falha (%)</label><input type="number" id="pFail" value="${(o.failureMarginPct*100)||10}" step="1" oninput="refreshCurrentPreview()"></div>
    </div>

    <div class="field" style="margin-bottom:6px;"><label>Mão de obra (ações e minutos de cada uma)</label></div>
    <div id="laborActionRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addLaborActionRow()">+ Adicionar ação</button>
    ${laborActionOptionsHtml()}

    <div class="field" style="margin-bottom:6px;"><label>Ferramentas usadas (e quantos usos cada uma consome)</label></div>
    <div id="toolsUsedRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addToolsUsedRow()">+ Adicionar ferramenta</button>

    <div class="section-title">Pedido e cliente</div>
    <div class="row3">
      <div class="field"><label>Pedido nº</label><input id="coOrderNumber" value="${o.orderNumber||''}"></div>
      <div class="field"><label>Data do pedido</label><input type="date" id="coOrderDate" value="${o.orderDate||todayStr()}"></div>
      <div class="field"><label>Quantidade</label><input type="number" id="coQty" value="${o.qty||1}" min="1" step="1"></div>
    </div>
    <div class="field"><label>Cliente</label>
      <select id="coCustomerId" onchange="toggleCoCustomerField(this.value)">
        <option value="">Avulso / digitar nome</option>
        ${state.customers.map(cu=>`<option value="${cu.id}" ${o.customerId===cu.id?'selected':''}>${cu.name}</option>`).join('')}
      </select>
    </div>
    <div class="field" id="coCustomerNameWrap" style="display:${o.customerId?'none':'block'};"><label>Nome do cliente (se avulso)</label><input id="coCustomerName" value="${o.customerName||''}"></div>
    <div class="field"><label>Tamanho (mm)</label><input id="coSizeLabel" value="${o.sizeLabel||''}" placeholder="Ex: 80 x 60"></div>
    <div class="field"><label>Texto que vai na peça</label><textarea id="coPieceText" rows="2">${o.pieceText||''}</textarea></div>
    <div class="row3">
      <div class="field"><label>Cor da base</label><input id="coBaseColor" value="${o.baseColor||''}"></div>
      <div class="field"><label>Cor do texto/detalhe</label><input id="coDetailColor" value="${o.detailColor||''}"></div>
      <div class="field"><label>Acabamento</label><input id="coFinish" value="${o.finish||''}" placeholder="Ex: fosco, brilhoso"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Entrega prevista</label><input type="date" id="coDeliveryDate" value="${o.deliveryDate||''}"></div>
      <div class="field"><label>Sinal pago (R$)</label><input type="number" id="coDepositPaid" value="${o.depositPaid||''}" step="0.01" placeholder="0,00"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" id="pMargin" value="${(o.desiredMarginPct!=null ? o.desiredMarginPct : calcProduct(o).desiredMarginPct).toFixed(0)}" step="1" oninput="document.getElementById('pPrice').dataset.touched=''; refreshCurrentPreview()"></div>
      <div class="field"><label>Valor total combinado (R$)</label><input type="number" id="pPrice" value="${o.practicedPrice||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'; refreshCurrentPreview()"></div>
    </div>
    <div class="helper-block" id="customOrderPreview"></div>
    <div class="field" style="margin-top:10px;"><label style="display:flex;align-items:center;gap:8px;font-weight:400;"><input type="checkbox" id="coApproved" ${o.approved?'checked':''} style="width:auto;"> Conferi o texto, as cores e o tamanho — cliente autorizou a impressão</label></div>
    <div class="row2">
      <div class="field"><label>Data da aprovação</label><input type="date" id="coApprovalDate" value="${o.approvalDate||''}"></div>
      <div class="field"><label>Confirmado por</label><input id="coApprovedBy" value="${o.approvedBy||''}"></div>
    </div>

    <div class="section-title">Ficha técnica — 1. Arquivo e licença</div>
    <div class="row2">
      <div class="field"><label>Nome do arquivo</label><input id="coModelFileName" value="${o.modelFileName||''}" placeholder="Ex: topo_bolo_v2.3mf"></div>
      <div class="field"><label>Data de impressão</label><input type="date" id="coPrintDate" value="${o.printDate||''}"></div>
    </div>
    <div class="field"><label>Origem do modelo 3D</label>
      <select id="pModelOrigin" onchange="toggleModelLicenseFields(this.value)">
        <option value="proprio" ${o.modelOrigin!=='terceiro'?'selected':''}>Próprio (desenhei eu mesmo)</option>
        <option value="terceiro" ${o.modelOrigin==='terceiro'?'selected':''}>Terceiro (baixado ou comprado)</option>
      </select>
    </div>
    <div id="pModelLicenseBlock" style="display:${o.modelOrigin==='terceiro'?'block':'none'};">
      <div class="row2">
        <div class="field"><label>Licença</label><input id="pModelLicense" value="${o.modelLicense||''}" placeholder="Ex: CC0, CC BY, Comprada"></div>
        <div class="field"><label>Fonte do modelo (URL)</label><input id="pModelSourceUrl" value="${o.modelSourceUrl||''}" placeholder="Link do MakerWorld/Thingiverse/Cults3D..."></div>
      </div>
    </div>

    <div class="section-title">2 e 3. Material e perfil de fatiamento</div>
    <div class="row2">
      <div class="field"><label>Bico (°C)</label><input type="number" id="coNozzleTempC" value="${o.nozzleTempC||''}" step="1"></div>
      <div class="field"><label>Temp. mesa (°C)</label><input type="number" id="coBedTempC" value="${o.bedTempC||''}" step="1"></div>
    </div>
    <div class="row3">
      <div class="field"><label>Altura de camada (mm)</label><input type="number" id="coLayerHeightMm" value="${o.layerHeightMm||''}" step="0.01"></div>
      <div class="field"><label>Diâmetro do bico (mm)</label><input type="number" id="coNozzleDiameterMm" value="${o.nozzleDiameterMm||0.4}" step="0.1"></div>
      <div class="field"><label>Paredes</label><input type="number" id="coWalls" value="${o.walls||''}" step="1"></div>
    </div>
    <div class="row3">
      <div class="field"><label>Preenchimento (%)</label><input type="number" id="coInfillPct" value="${o.infillPct||''}" step="1"></div>
      <div class="field"><label>Padrão</label><input id="coInfillPattern" value="${o.infillPattern||''}" placeholder="Ex: grid, gyroid"></div>
      <div class="field"><label>Velocidade (mm/s)</label><input type="number" id="coPrintSpeedMmS" value="${o.printSpeedMmS||''}" step="1"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Orientação na mesa</label><input id="coOrientation" value="${o.orientation||''}"></div>
      <div class="field"><label>Suportes</label><select id="coSupports">
        <option value="nao" ${o.supports!=='sim'?'selected':''}>Não</option>
        <option value="sim" ${o.supports==='sim'?'selected':''}>Sim</option>
      </select></div>
    </div>
    <div class="field"><label>Brim / raft</label><input id="coBrimRaft" value="${o.brimRaft||''}"></div>
    <div class="row2">
      <div class="field"><label>Pausa p/ troca de cor — camada nº</label><input id="coColorChangeLayer" value="${o.colorChangeLayer||''}"></div>
      <div class="field"><label>Altura (mm)</label><input id="coColorChangeHeightMm" value="${o.colorChangeHeightMm||''}"></div>
    </div>

    <div class="section-title">4. Estimado × real</div>
    <div class="row3">
      <div class="field"><label>Peso real (g)</label><input type="number" id="coRealWeightG" value="${o.realWeightG||''}" step="0.1"></div>
      <div class="field"><label>Tempo real (h)</label><input type="number" id="coRealTimeH" value="${o.realTimeH||''}" step="0.1"></div>
      <div class="field"><label>Custo real (R$)</label><input type="number" id="coRealCost" value="${o.realCost||''}" step="0.01"></div>
    </div>
    <div class="field"><label>Observação</label><input id="coRealObservation" value="${o.realObservation||''}"></div>

    <div class="section-title">5. Resultado e acabamento</div>
    <div class="row2">
      <div class="field"><label>Resultado</label><select id="coResult">
        <option value="" ${!o.result?'selected':''}>Não informado</option>
        <option value="ok" ${o.result==='ok'?'selected':''}>OK</option>
        <option value="falha_parcial" ${o.result==='falha_parcial'?'selected':''}>Falha parcial</option>
        <option value="falha_total" ${o.result==='falha_total'?'selected':''}>Falha total</option>
      </select></div>
      <div class="field"><label>Se falhou — % e motivo</label><input id="coFailurePctReason" value="${o.failurePctReason||''}"></div>
    </div>
    <div class="field"><label>Pós-processamento realizado</label><input id="coPostProcessingDone" value="${o.postProcessingDone||''}" placeholder="Ex: lixado, pintado"></div>

    <div class="section-title">6. Conferência antes de embalar</div>
    <div class="row3">
      <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px;"><input type="checkbox" id="coCheckTextConferred" ${o.checkTextConferred?'checked':''} style="width:auto;"> Texto conferido</label>
      <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px;"><input type="checkbox" id="coCheckNoLayerFailure" ${o.checkNoLayerFailure?'checked':''} style="width:auto;"> Sem falha de camada</label>
      <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px;"><input type="checkbox" id="coCheckBurrRemoved" ${o.checkBurrRemoved?'checked':''} style="width:auto;"> Rebarba removida</label>
    </div>
    <div class="row3" style="margin-top:8px;">
      <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px;"><input type="checkbox" id="coCheckHoleFree" ${o.checkHoleFree?'checked':''} style="width:auto;"> Furo/argola livre</label>
      <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px;"><input type="checkbox" id="coCheckPieceClean" ${o.checkPieceClean?'checked':''} style="width:auto;"> Peça limpa</label>
      <label style="display:flex;align-items:center;gap:6px;font-weight:400;font-size:12.5px;"><input type="checkbox" id="coCheckPackaged" ${o.checkPackaged?'checked':''} style="width:auto;"> Embalada</label>
    </div>

    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmCustomOrder(${editing?`'${id}'`:'null'})">${editing?'Salvar alterações':'Criar encomenda'}</button>
    </div>
  `);
  renderFilamentRows();
  renderLaborActionRows();
  renderToolsUsedRows();
  renderPhotoPreview();
  updateCustomOrderPreview();
}
function readCustomOrderForm(){
  const catSel = document.getElementById('pCategory').value;
  const customerId = document.getElementById('coCustomerId').value;
  return {
    name: document.getElementById('pName').value.trim(),
    category: catSel==='__new__' ? document.getElementById('pCategoryNew').value.trim() : catSel,
    filaments: editingFilaments,
    boxType: document.getElementById('pBox').value,
    machineId: document.getElementById('pMachine').value,
    timeH: (parseFloat(document.getElementById('pTimeH').value)||0) + (parseFloat(document.getElementById('pTimeMin').value)||0)/60,
    bubbleWrapM: parseFloat(document.getElementById('pBubble').value)||0,
    tapeM: parseFloat(document.getElementById('pTape').value)||0,
    failureMarginPct: (parseFloat(document.getElementById('pFail').value)||0)/100,
    laborActions: editingLaborActions,
    toolsUsed: editingToolsUsed,
    desiredMarginPct: parseFloat(document.getElementById('pMargin').value)||0,
    modelOrigin: document.getElementById('pModelOrigin').value,
    modelLicense: document.getElementById('pModelLicense').value.trim(),
    modelSourceUrl: document.getElementById('pModelSourceUrl').value.trim(),
    modelFileName: document.getElementById('coModelFileName').value.trim(),
    orderNumber: document.getElementById('coOrderNumber').value.trim(),
    orderDate: document.getElementById('coOrderDate').value,
    customerId,
    customerName: document.getElementById('coCustomerName').value.trim(),
    qty: parseFloat(document.getElementById('coQty').value)||1,
    sizeLabel: document.getElementById('coSizeLabel').value.trim(),
    pieceText: document.getElementById('coPieceText').value,
    baseColor: document.getElementById('coBaseColor').value.trim(),
    detailColor: document.getElementById('coDetailColor').value.trim(),
    finish: document.getElementById('coFinish').value.trim(),
    deliveryDate: document.getElementById('coDeliveryDate').value,
    depositPaid: parseFloat(document.getElementById('coDepositPaid').value)||0,
    approved: document.getElementById('coApproved').checked,
    approvalDate: document.getElementById('coApprovalDate').value,
    approvedBy: document.getElementById('coApprovedBy').value.trim(),
    printDate: document.getElementById('coPrintDate').value,
    nozzleTempC: parseFloat(document.getElementById('coNozzleTempC').value)||0,
    bedTempC: parseFloat(document.getElementById('coBedTempC').value)||0,
    layerHeightMm: parseFloat(document.getElementById('coLayerHeightMm').value)||0,
    nozzleDiameterMm: parseFloat(document.getElementById('coNozzleDiameterMm').value)||0,
    walls: parseFloat(document.getElementById('coWalls').value)||0,
    infillPct: parseFloat(document.getElementById('coInfillPct').value)||0,
    infillPattern: document.getElementById('coInfillPattern').value.trim(),
    printSpeedMmS: parseFloat(document.getElementById('coPrintSpeedMmS').value)||0,
    orientation: document.getElementById('coOrientation').value.trim(),
    supports: document.getElementById('coSupports').value,
    brimRaft: document.getElementById('coBrimRaft').value.trim(),
    colorChangeLayer: document.getElementById('coColorChangeLayer').value.trim(),
    colorChangeHeightMm: document.getElementById('coColorChangeHeightMm').value.trim(),
    realWeightG: parseFloat(document.getElementById('coRealWeightG').value)||0,
    realTimeH: parseFloat(document.getElementById('coRealTimeH').value)||0,
    realCost: parseFloat(document.getElementById('coRealCost').value)||0,
    realObservation: document.getElementById('coRealObservation').value.trim(),
    result: document.getElementById('coResult').value,
    failurePctReason: document.getElementById('coFailurePctReason').value.trim(),
    postProcessingDone: document.getElementById('coPostProcessingDone').value.trim(),
    checkTextConferred: document.getElementById('coCheckTextConferred').checked,
    checkNoLayerFailure: document.getElementById('coCheckNoLayerFailure').checked,
    checkBurrRemoved: document.getElementById('coCheckBurrRemoved').checked,
    checkHoleFree: document.getElementById('coCheckHoleFree').checked,
    checkPieceClean: document.getElementById('coCheckPieceClean').checked,
    checkPackaged: document.getElementById('coCheckPackaged').checked,
  };
}
function updateCustomOrderPreview(){
  const form = readCustomOrderForm();
  const c = calcProduct(form);
  document.getElementById('customOrderPreview').innerHTML = `
    <div class="calc-line"><span>Peso total</span><span>${num(totalWeight(form),0)}g</span></div>
    <div class="calc-line"><span>Custo material</span><span>${brl(c.materialCost)}</span></div>
    <div class="calc-line"><span>Custo energia</span><span>${brl(c.energyCost)}</span></div>
    <div class="calc-line"><span>Embalagem (caixa + bolha + fita)</span><span>${brl(c.embalagemCost)}</span></div>
    <div class="calc-line"><span>Depreciação (${c.machine?c.machine.name:'sem impressora'})</span><span>${brl(c.depreciation)}</span></div>
    <div class="calc-line"><span>Manutenção</span><span>${brl(c.maintenance)}</span></div>
    <div class="calc-line"><span>Mão de obra</span><span>${brl(c.laborCost)}</span></div>
    ${c.toolsCost>0 ? `<div class="calc-line"><span>Ferramentas</span><span>${brl(c.toolsCost)}</span></div>` : ''}
    <div class="calc-line"><span>Custo de falha</span><span>${brl(c.failureCost)}</span></div>
    <div class="calc-line total"><span>Custo total</span><span>${brl(c.totalCost)}</span></div>
    <div class="calc-line total"><span>Preço sugerido (margem de ${num(form.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
    <div class="calc-line total"><span>Margem no valor combinado</span><span style="color:${c.marginValue<0?'var(--red)':'var(--green)'}">${pct(c.marginPct)}</span></div>
  `;
  const priceInput = document.getElementById('pPrice');
  if(priceInput && !priceInput.dataset.touched && document.activeElement!==priceInput){
    priceInput.placeholder = 'sugerido: '+c.suggestedPrice.toFixed(2);
  }
}
function confirmCustomOrder(id){
  const form = readCustomOrderForm();
  if(!form.name){ toast('Informe o nome da peça','err'); return; }
  const priceRaw = document.getElementById('pPrice').value;
  const c = calcProduct(form);
  const practicedPrice = priceRaw ? parseFloat(priceRaw) : c.suggestedPrice;
  if(practicedPrice<0){ toast('Valor não pode ser negativo','err'); return; }
  if(id){
    const o = state.customOrders.find(x=>x.id===id);
    Object.assign(o, form, { practicedPrice, photo: editingPhotoData });
  } else {
    state.customOrders.push({ id:uid(), ...form, practicedPrice, photo: editingPhotoData, createdAt: new Date().toISOString() });
  }
  saveCustomOrders();
  toast(id?'Encomenda atualizada':'Encomenda criada');
  closeModal(); renderContent();
}
function careInstructionsHtml(){
  return `
    <div style="background:#FDF3E7;border-radius:10px;padding:16px 18px;margin-top:16px;">
      <div style="font-weight:700;font-size:13px;color:#1A1D23;margin-bottom:8px;">CUIDADOS COM A PEÇA</div>
      <ul style="margin:0;padding-left:16px;font-size:11.5px;color:#3A3D45;line-height:1.9;">
        <li><strong>Não deixe no sol ou dentro do carro.</strong> O PLA amolece a partir de 55 °C e a peça deforma sem chance de recuperação.</li>
        <li><strong>Limpe com pano úmido e sabão neutro.</strong> Nada de água quente, álcool, acetona ou máquina de lavar.</li>
        <li><strong>Peça decorativa, não é brinquedo.</strong> Peças pequenas e finas podem quebrar e não são indicadas para crianças pequenas.</li>
        <li><strong>Marcas de camada são da técnica.</strong> Impressão 3D deposita material em camadas — leve textura é característica, não defeito.</li>
      </ul>
      <div style="font-size:11px;color:#5D6270;margin-top:10px;">Dúvida ou ajuste? Fale antes de aprovar — depois da impressão não dá para voltar atrás.</div>
    </div>
  `;
}
function exportCustomOrderPDF(id){
  const o = state.customOrders.find(x=>x.id===id);
  if(!o) return;
  const c = calcProduct(o);
  const cuName = customerNameFor(o);
  const filSummary = (o.filaments||[]).map(f=>`${f.materialName} ${num(f.weightG,0)}g`).join(' + ');
  const filFirst = (o.filaments||[])[0];
  const pageHeader = (title, tag) => `
    <div style="display:flex;align-items:center;justify-content:space-between;background:#1A1D23;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${bizLogoSrc()}" alt="${bizName()}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">
        <div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:17px;">${title}</div>
          <div style="font-size:11px;color:#B9BEC9;">${tag==='cliente'?'Confira os dados abaixo antes de autorizarmos a impressão':'Uso interno — bancada, fatiador e registro de resultado'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#B9BEC9;text-align:right;">${tag==='cliente'?'PARA O CLIENTE · 1/2':'USO INTERNO · 2/2'}</div>
    </div>
    <div style="height:4px;background:#BD4119;"></div>
  `;
  const field = (label, value) => `<div style="flex:1;min-width:0;"><div style="font-size:9.5px;font-weight:700;color:#8A8F9C;letter-spacing:.03em;margin-bottom:3px;">${label}</div><div style="font-size:12.5px;color:#1A1D23;min-height:16px;">${value||'—'}</div></div>`;
  const row = (...fields) => `<div style="display:flex;gap:18px;margin-bottom:12px;">${fields.join('')}</div>`;
  const sectionTitle = (n, t) => `<div style="border-left:3px solid #BD4119;padding-left:8px;font-weight:700;font-size:12px;color:#1A1D23;margin:16px 0 10px;">${n} · ${t.toUpperCase()}</div>`;
  const checkbox = (checked, label) => `<span style="display:inline-flex;align-items:center;gap:5px;margin-right:16px;font-size:11.5px;color:#1A1D23;"><span style="display:inline-block;width:12px;height:12px;border:1.5px solid #8A8F9C;border-radius:3px;background:${checked?'#157A45':'#fff'};"></span>${label}</span>`;

  const page1 = `
    <div class="catalog-summary" style="padding:0;">
      ${pageHeader('Confirmação da Peça','cliente')}
      <div style="padding:22px 26px;">
        ${row(field('Pedido nº',o.orderNumber), field('Data',fmtDate(o.orderDate)), field('Cliente',cuName))}
        <div style="background:#FDF1EC;border-radius:10px;padding:16px 18px;margin:14px 0;">
          <div style="font-weight:700;font-size:12px;color:#BD4119;margin-bottom:2px;">O QUE SERÁ IMPRESSO <span style="font-weight:400;color:#8A8F9C;font-size:10.5px;">— confira letra por letra, depois de impresso não há como corrigir</span></div>
          ${row(field('Produto',o.name), field('Quantidade',o.qty), field('Tamanho (mm)',o.sizeLabel))}
          ${row(field('Texto que vai na peça', (o.pieceText||'—').replace(/\n/g,'<br>')))}
          ${row(field('Cor da base',o.baseColor), field('Cor do texto/detalhe',o.detailColor), field('Acabamento',o.finish))}
        </div>
        <div style="font-weight:700;font-size:12px;color:#1A1D23;margin:14px 0 8px;border-left:3px solid #1A1D23;padding-left:8px;">PRAZO E VALORES</div>
        ${row(field('Entrega prevista',fmtDate(o.deliveryDate)), field('Valor total',brl(c.practicedPrice)), field('Sinal pago',brl(o.depositPaid||0)), field('Saldo na entrega',brl(Math.max(0,c.practicedPrice-(o.depositPaid||0)))))}
        <div style="background:#EAF6EF;border-radius:10px;padding:16px 18px;margin-top:14px;">
          <div style="font-weight:700;font-size:12px;color:#157A45;margin-bottom:8px;">APROVAÇÃO DO CLIENTE</div>
          ${checkbox(o.approved,'Conferi o texto, as cores e o tamanho. Autorizo a impressão.')}
          <div style="font-size:10.5px;color:#5D6270;margin:8px 0;">A produção só entra na fila após esta confirmação. Alteração depois disso implica nova peça e novo valor.</div>
          ${row(field('Data',fmtDate(o.approvalDate)), field('Confirmado por',o.approvedBy))}
        </div>
        ${careInstructionsHtml()}
        <div style="text-align:center;font-size:10px;color:#8A8F9C;margin-top:16px;">Confirmação da Peça — enviar ao cliente e guardar a resposta. ${bizName().toLowerCase()}</div>
      </div>
    </div>`;

  const page2 = `
    <div class="catalog-summary" style="padding:0;">
      ${pageHeader('Ficha Técnica de Impressão','interno')}
      <div style="padding:22px 26px;">
        ${row(field('Pedido nº',o.orderNumber), field('Produto / SKU',o.name), field('Data de impressão',fmtDate(o.printDate)))}
        ${sectionTitle(1,'Arquivo e licença')}
        ${row(field('Nome do arquivo',o.modelFileName), field('Origem',o.modelOrigin==='terceiro'?'Terceiro':'Próprio'), field('Licença',o.modelOrigin==='terceiro'?o.modelLicense:'—'))}
        ${o.modelOrigin==='terceiro' ? row(field('URL do modelo',o.modelSourceUrl)) : ''}
        ${sectionTitle(2,'Material')}
        ${row(field('Filamento',filSummary||'—'), field('Cor',(materialByName((filFirst||{}).materialName)||{}).colorName||'—'), field('R$/g',filFirst?num(filamentCost(filFirst.materialName),4):'—'), field('Bico / temp. mesa',`${o.nozzleTempC||'—'}°C / ${o.bedTempC||'—'}°C`))}
        ${sectionTitle(3,'Perfil de fatiamento')}
        ${row(field('Altura de camada',o.layerHeightMm?o.layerHeightMm+'mm':'—'), field('Bico',o.nozzleDiameterMm?o.nozzleDiameterMm+'mm':'—'), field('Paredes',o.walls), field('Preenchimento',o.infillPct?o.infillPct+'%':'—'), field('Padrão',o.infillPattern), field('Velocidade',o.printSpeedMmS?o.printSpeedMmS+'mm/s':'—'))}
        ${row(field('Orientação na mesa',o.orientation), field('Suportes',o.supports==='sim'?'Sim':'Não'), field('Brim/raft',o.brimRaft))}
        ${(o.colorChangeLayer||o.colorChangeHeightMm) ? `<div style="background:#FDF1EC;border-radius:8px;padding:10px 14px;margin-bottom:12px;">${row(field('Pausa p/ troca de cor — camada nº',o.colorChangeLayer), field('Altura (mm)',o.colorChangeHeightMm))}</div>` : ''}
        ${sectionTitle(4,'Estimado × real')}
        <div style="overflow-x:auto;margin-bottom:4px;"><table style="width:100%;border-collapse:collapse;font-size:11.5px;">
          <thead><tr style="background:#F6F7F9;"><th style="text-align:left;padding:6px 8px;">​</th><th style="text-align:right;padding:6px 8px;">Peso (g)</th><th style="text-align:right;padding:6px 8px;">Tempo (h)</th><th style="text-align:right;padding:6px 8px;">Custo (R$)</th><th style="text-align:left;padding:6px 8px;">Observação</th></tr></thead>
          <tbody>
            <tr><td style="padding:6px 8px;font-weight:600;">Estimado</td><td style="text-align:right;padding:6px 8px;">${num(totalWeight(o),0)}</td><td style="text-align:right;padding:6px 8px;">${num(o.timeH,2)}</td><td style="text-align:right;padding:6px 8px;">${brl(c.totalCost)}</td><td style="padding:6px 8px;">—</td></tr>
            <tr style="background:#F6F7F9;"><td style="padding:6px 8px;font-weight:600;">Real</td><td style="text-align:right;padding:6px 8px;">${o.realWeightG||'—'}</td><td style="text-align:right;padding:6px 8px;">${o.realTimeH||'—'}</td><td style="text-align:right;padding:6px 8px;">${o.realCost?brl(o.realCost):'—'}</td><td style="padding:6px 8px;">${o.realObservation||'—'}</td></tr>
          </tbody>
        </table></div>
        ${sectionTitle(5,'Resultado e acabamento')}
        ${row(field('Resultado', o.result==='ok'?'OK':o.result==='falha_parcial'?'Falha parcial':o.result==='falha_total'?'Falha total':'—'), field('Se falhou — % e motivo',o.failurePctReason))}
        ${row(field('Pós-processamento realizado',o.postProcessingDone))}
        ${sectionTitle(6,'Conferência antes de embalar')}
        <div style="margin-bottom:6px;">${checkbox(o.checkTextConferred,'Texto conferido')}${checkbox(o.checkNoLayerFailure,'Sem falha de camada')}${checkbox(o.checkBurrRemoved,'Rebarba removida')}</div>
        <div style="margin-bottom:14px;">${checkbox(o.checkHoleFree,'Furo/argola livre')}${checkbox(o.checkPieceClean,'Peça limpa')}${checkbox(o.checkPackaged,'Embalada')}</div>
        <div style="display:flex;gap:18px;padding-top:12px;border-top:2px solid #BD4119;">
          ${field('Custo real (R$)', o.realCost?brl(o.realCost):brl(c.totalCost))}
          ${field('Preço de venda (R$)', brl(c.practicedPrice))}
          ${field('R$ por hora-máquina', o.timeH>0 ? brl(c.practicedPrice/o.timeH) : '—')}
        </div>
        <div style="font-size:10px;color:#8A8F9C;margin-top:4px;">Comparar com a estimativa do app. Divergência acima de 20% = revisar o cadastro.</div>
        <div style="text-align:center;font-size:10px;color:#8A8F9C;margin-top:16px;">Ficha Técnica de Impressão — arquivar junto com a ficha de pedido. ${bizName().toLowerCase()}</div>
      </div>
    </div>`;

  printHTML(page1 + page2);
}

/* ===================== ESTOQUE ===================== */
function renderEstoque(){
  return `
    <div class="tabbar">
      <button class="tabbtn ${stockTab==='materiais'?'active':''}" onclick="stockTab='materiais'; renderTopbarActions(); renderContent();">Matéria-prima</button>
      <button class="tabbtn ${stockTab==='produtos'?'active':''}" onclick="stockTab='produtos'; renderTopbarActions(); renderContent();">Produtos prontos</button>
    </div>
    ${stockTab==='materiais' ? renderMaterialsStock() : renderFinishedStock()}
  `;
}
function materialMonthlyConsumption(materialName){
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-60);
  const cutoffStr = localDateStr(cutoff);
  let total = 0;
  state.sales.filter(s=>s.date && s.date>=cutoffStr).forEach(s=>{
    const prod = state.products.find(p=>p.id===s.productId);
    if(!prod) return;
    productRecipe(prod).forEach(r=>{ if(r.materialName===materialName) total += r.qty*s.qty; });
  });
  return total/60*30;
}
function restockSuggestion(material){
  const monthly = materialMonthlyConsumption(material.name);
  if(monthly<=0) return null;
  const target = monthly + material.lowStock;
  const suggested = Math.max(0, target - material.stock);
  if(suggested<=0) return null;
  return { monthly, suggested, cost: suggested*material.costPerUnit };
}
let materialsFilter = { search:'' };
function renderMaterialsStock(){
  if(state.materials.length===0) return `<div class="card">${emptyState('Nenhuma matéria-prima cadastrada')}</div>`;
  const suggestions = state.materials.map(m=>({m, s:restockSuggestion(m)})).filter(x=>x.s).sort((a,b)=>b.s.cost-a.s.cost);
  const suggestionPanel = suggestions.length ? `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">Sugestão de reposição<span class="sub">estimativa com base no consumo dos últimos 60 dias</span></div>
      <div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Material</th><th class="right">Consumo médio/mês</th><th class="right">Estoque atual</th><th class="right">Comprar aprox.</th><th class="right">Custo estimado</th></tr></thead>
        <tbody>${suggestions.map(({m,s})=>`<tr>
          <td data-label="Material">${m.name}</td>
          <td class="right num" data-label="Consumo médio/mês">${num(s.monthly,m.unit==='un'?0:1)} ${m.unit}</td>
          <td class="right num" data-label="Estoque atual">${num(m.stock,m.unit==='un'?0:1)} ${m.unit}</td>
          <td class="right num" data-label="Comprar aprox." style="color:var(--amber)">${num(s.suggested,m.unit==='un'?0:1)} ${m.unit}</td>
          <td class="right num" data-label="Custo estimado">${brl(s.cost)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </div>` : '';
  const searchBar = `<div class="filter-bar">
    <div class="field"><label>Buscar</label><input value="${materialsFilter.search}" placeholder="Nome do material..." oninput="materialsFilter.search=this.value; renderContent();"></div>
    ${materialsFilter.search ? `<button class="btn ghost sm" onclick="materialsFilter.search=''; renderContent();">Limpar</button>` : ''}
  </div>`;
  const q = materialsFilter.search.toLowerCase();
  const filtered = q ? state.materials.filter(m=>m.name.toLowerCase().includes(q)) : state.materials;
  if(q && filtered.length===0) return searchBar + `<div class="card">${emptyState('Nenhum material encontrado')}</div>`;
  const cats = [...new Set(filtered.map(m=>m.category))];
  return searchBar + suggestionPanel + cats.map(cat=>`
    <div class="section-title">${cat}</div>
    <div class="grid g-3">
      ${filtered.filter(m=>m.category===cat).map(m=>materialCard(m)).join('')}
    </div>
  `).join('');
}
function materialCard(m){
  const p = m.lowStock>0 ? Math.min(100,(m.stock/(m.lowStock*2))*100) : (m.stock>0?100:0);
  const color = m.stock<=0 ? 'var(--red)' : m.stock<=m.lowStock ? 'var(--amber)' : 'var(--teal)';
  const sugg = restockSuggestion(m);
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <div style="font-weight:600;font-size:13.5px;display:flex;align-items:center;gap:6px;">
          ${m.category==='Filamento' && m.colorName ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${m.color||'#ccc'};border:1px solid var(--line);flex:none;"></span>` : ''}
          ${m.category==='Filamento' && m.isDualColor && m.colorName2 ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${m.color2||'#ccc'};border:1px solid var(--line);flex:none;margin-left:-8px;"></span>` : ''}
          ${m.name}
        </div>
        <div style="color:var(--text-faint);font-size:11.5px;margin-top:2px;">${brl(m.costPerUnit)}/${m.unit}${m.category==='Filamento' && m.brand ? ` · ${m.brand}` : ''}${m.category==='Ferramentas' && m.toolType ? ` · ${m.toolType}` : ''}</div>
      </div>
      ${stockBadge(m)}
    </div>
    <div style="margin:12px 0 6px;font-family:var(--font-mono);font-size:20px;font-weight:600;">${num(m.stock,m.unit==='un'?0:1)} <span style="font-size:12px;color:var(--text-faint);font-weight:400;">${m.unit}</span></div>
    <div class="progress"><div style="width:${p}%;background:${color};"></div></div>
    <div style="font-size:11px;color:var(--text-faint);margin-top:5px;">Mínimo: ${num(m.lowStock,0)} ${m.unit}</div>
    ${m.isBox && m.lengthCm>0 && m.widthCm>0 && m.heightCm>0 ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Medidas internas: ${num(m.lengthCm,1)}×${num(m.widthCm,1)}×${num(m.heightCm,1)} cm</div>` : ''}
    ${(m.isBubbleWrap||m.isTape) && m.widthCm>0 ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Largura do rolo: ${num(m.widthCm,1)} cm</div>` : ''}
    ${m.category==='Ferramentas' && m.usefulLifeUses>0 ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Vida útil estimada: ${num(m.usefulLifeUses,0)} usos</div>` : ''}
    ${sugg ? `<div style="font-size:11px;color:var(--amber);margin-top:4px;">Sugestão: comprar ~${num(sugg.suggested,m.unit==='un'?0:1)} ${m.unit}</div>` : ''}
    <div style="margin-top:12px;display:flex;gap:8px;">
      <button class="btn sm" style="flex:1" onclick="openRestockModal('${m.id}')">Reabastecer</button>
      <button class="btn ghost sm" onclick="openMaterialModal('${m.id}')">Editar</button>
      <button class="btn ghost sm" onclick="deleteMaterial('${m.id}')">Excluir</button>
    </div>
  </div>`;
}
function renderFinishedStock(){
  if(state.products.length===0) return `<div class="card">${emptyState('Nenhum produto cadastrado')}</div>`;
  const rows = state.products.map(p=>{
    const c = calcProduct(p);
    return `<tr>
      <td data-label="Produto">${p.name}</td>
      <td class="right num" data-label="Estoque">${num(p.stock,0)} un</td>
      <td class="right num" data-label="Custo unitário">${brl(c.totalCost)}</td>
      <td class="right num" data-label="Valor em estoque">${brl(p.stock*c.totalCost)}</td>
      <td class="right" data-label="Status">${p.stock<=0?`<span class="badge bad">Sem estoque</span>`:p.stock<=3?`<span class="badge warn">Baixo</span>`:`<span class="badge ok">Ok</span>`}</td>
      <td class="right"><button class="btn ghost sm" onclick="openPrintJobModal('${p.id}')">Produzir</button></td>
    </tr>`;
  }).join('');
  const totalValue = state.products.reduce((a,p)=>a+p.stock*calcProduct(p).totalCost,0);
  return `<div class="card">
    <div class="card-title">Produtos prontos<span class="sub">valor total em estoque: ${brl(totalValue)}</span></div>
    <div class="tbl-wrap tbl-responsive"><table>
    <thead><tr><th>Produto</th><th class="right">Estoque</th><th class="right">Custo unitário</th><th class="right">Valor em estoque</th><th class="right">Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div></div>`;
}
function deleteMaterial(id){
  const m = state.materials.find(x=>x.id===id);
  if(!m) return;
  let usedBy = state.products.filter(p=>
    (p.filaments||[]).some(f=>f.materialName===m.name) || p.boxType===m.name
  );
  if(m.isBubbleWrap){
    usedBy = usedBy.concat(state.products.filter(p=>!usedBy.includes(p) && (p.bubbleWrapM||0)>0));
  }
  if(m.isTape){
    usedBy = usedBy.concat(state.products.filter(p=>!usedBy.includes(p) && (p.tapeM||0)>0));
  }
  if(m.category==='Ferramentas'){
    usedBy = usedBy.concat(state.products.filter(p=>!usedBy.includes(p) && (p.toolsUsed||[]).some(t=>t.toolId===m.id)));
  }
  let msg = `Excluir "${m.name}" do estoque?`;
  if(m.isBubbleWrap){
    msg += ` Atenção: esse é o material marcado como plástico bolha — depois de excluir, nenhum produto vai ter custo de plástico bolha calculado até você marcar outro material com esse papel.`;
  }
  if(m.isTape){
    msg += ` Atenção: essa é a fita adesiva cadastrada — depois de excluir, nenhum produto vai ter custo de fita calculado até você marcar outro material com esse papel.`;
  }
  if(usedBy.length){
    msg += ` ${usedBy.length} produto(s) usam esse material no cálculo de custo (${usedBy.map(p=>p.name).slice(0,3).join(', ')}${usedBy.length>3?'...':''}) — o custo deles vai ficar incorreto até você ajustar.`;
  }
  if(!confirm(msg)) return;
  state.materials = state.materials.filter(x=>x.id!==id);
  saveMaterials();
  toast('Matéria-prima excluída');
  renderContent();
}
function openMaterialModal(id){
  const editing = !!id;
  const m = editing ? state.materials.find(x=>x.id===id) : { name:'', category:'Filamento', unit:'g', costPerUnit:0, stock:0, lowStock:0, purchasePrice:0, purchaseQty:1, purchaseUnit:'g', isBox:false, isBubbleWrap:false, isTape:false, materialType:'', brand:'', color:'#cccccc', colorName:'', isDualColor:false, color2:'#cccccc', colorName2:'', toolType:'', usefulLifeUses:0 };
  const packagingType = m.isBox ? 'caixa' : m.isBubbleWrap ? 'bolha' : m.isTape ? 'fita' : '';
  const hideName = m.category==='Filamento' || (m.category==='Embalagem' && packagingType==='caixa');
  showModal(editing?'Editar matéria-prima':'Nova matéria-prima', `
    <div class="field" id="mNameField" style="display:${hideName?'none':'block'};"><label>Nome</label><input id="mName" value="${m.name}" placeholder="Ex: Fita Adesiva 45mm"></div>
    <div class="row2">
      <div class="field"><label>Categoria</label><select id="mCat" onchange="onMaterialCategoryChange()">
        ${['Filamento','Embalagem','Ferramentas','Outros'].map(c=>`<option ${m.category===c?'selected':''}>${c}</option>`).join('')}
      </select></div>
      <div class="field"><label>Unidade de estoque</label><select id="mUnit">
        ${['g','kg','un','m'].map(u=>`<option ${m.unit===u?'selected':''}>${u}</option>`).join('')}
      </select></div>
    </div>

    <div id="mFilamentBlock" style="display:${m.category==='Filamento'?'block':'none'};margin-bottom:12px;">
      <div class="row2">
        <div class="field"><label>Material</label>
          <select id="mMaterialType" onchange="toggleNewMaterialTypeInput(this.value); updateFilamentNamePreview();">
            <option value="">Selecione...</option>
            ${materialTypeSuggestions().map(t=>`<option value="${t}" ${m.materialType===t?'selected':''}>${t}</option>`).join('')}
            <option value="__new__" ${m.materialType && !materialTypeSuggestions().includes(m.materialType)?'selected':''}>+ Novo material...</option>
          </select>
          <input id="mMaterialTypeNew" placeholder="Nome do novo material" style="margin-top:6px;display:${m.materialType && !materialTypeSuggestions().includes(m.materialType)?'block':'none'};" value="${m.materialType && !materialTypeSuggestions().includes(m.materialType)?m.materialType:''}" oninput="updateFilamentNamePreview()">
        </div>
        <div class="field"><label>Marca (opcional)</label>
          <select id="mBrand" onchange="toggleNewBrandInput(this.value)">
            <option value="">Sem marca</option>
            ${brandSuggestions().map(b=>`<option value="${b}" ${m.brand===b?'selected':''}>${b}</option>`).join('')}
            <option value="__new__" ${m.brand && !brandSuggestions().includes(m.brand)?'selected':''}>+ Nova marca...</option>
          </select>
          <input id="mBrandNew" placeholder="Nome da nova marca" style="margin-top:6px;display:${m.brand && !brandSuggestions().includes(m.brand)?'block':'none'};" value="${m.brand && !brandSuggestions().includes(m.brand)?m.brand:''}">
        </div>
      </div>
      <div class="row2">
        <div class="field"><label>Cor</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="color" id="mColor" value="${m.color||'#cccccc'}" style="width:44px;padding:2px;height:36px;flex:none;" oninput="updateFilamentNamePreview()">
            <input id="mColorName" placeholder="Nome da cor (ex: Vermelho)" value="${m.colorName||''}" oninput="updateFilamentNamePreview()">
          </div>
        </div>
        <div class="field"><label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim);margin-top:22px;"><input type="checkbox" id="mIsDualColor" style="width:auto;" ${m.isDualColor?'checked':''} onchange="document.getElementById('mColor2Block').style.display=this.checked?'flex':'none'; updateFilamentNamePreview();"> É bicolor</label></div>
      </div>
      <div id="mColor2Block" style="display:${m.isDualColor?'flex':'none'};gap:8px;align-items:center;margin-bottom:12px;">
        <input type="color" id="mColor2" value="${m.color2||'#cccccc'}" style="width:44px;padding:2px;height:36px;flex:none;" oninput="updateFilamentNamePreview()">
        <input id="mColorName2" placeholder="Nome da 2ª cor" value="${m.colorName2||''}" oninput="updateFilamentNamePreview()" style="flex:1;">
      </div>
      <div class="field"><label>Nome do material (calculado)</label><input id="mFilamentNamePreview" value="${m.name||''}" disabled></div>
    </div>

    <div id="mRoleBlock" style="display:${m.category==='Embalagem'?'block':'none'};margin-bottom:12px;">
      <div class="field"><label>Tipo de embalagem</label><select id="mPackagingType" onchange="onPackagingTypeChange()">
        <option value="">Selecione...</option>
        <option value="caixa" ${packagingType==='caixa'?'selected':''}>Caixa</option>
        <option value="bolha" ${packagingType==='bolha'?'selected':''}>Plástico Bolha</option>
        <option value="fita" ${packagingType==='fita'?'selected':''}>Fita Adesiva</option>
      </select></div>
      <div id="mBoxDimsBlock" style="display:${packagingType==='caixa'?'block':'none'};margin:0 0 10px;">
        <div class="field"><label>Tamanho</label><select id="mBoxSize">
          <option value="">Selecione...</option>
          ${['Pequena','Média','Grande'].map(s=>`<option value="${s}" ${m.name===('Caixa '+s)?'selected':''}>${s}</option>`).join('')}
        </select></div>
        <div class="row3">
          <div class="field"><label>Comprimento interno (cm)</label><input type="number" id="mLengthCm" value="${m.lengthCm||''}" step="0.1" placeholder="opcional"></div>
          <div class="field"><label>Largura interna (cm)</label><input type="number" id="mWidthCm" value="${m.widthCm||''}" step="0.1" placeholder="opcional"></div>
          <div class="field"><label>Altura interna (cm)</label><input type="number" id="mHeightCm" value="${m.heightCm||''}" step="0.1" placeholder="opcional"></div>
        </div>
      </div>
      <div id="mRollWidthBlock" style="display:${(packagingType==='bolha'||packagingType==='fita')?'block':'none'};margin:0 0 10px;">
        <div class="field"><label>Largura do rolo (cm)</label><input type="number" id="mRollWidthCm" value="${m.widthCm||''}" step="0.1" placeholder="opcional"></div>
      </div>
    </div>

    <div id="mToolBlock" style="display:${m.category==='Ferramentas'?'block':'none'};margin-bottom:12px;">
      <div class="row2">
        <div class="field"><label>Tipo de ferramenta</label>
          <select id="mToolType" onchange="toggleNewToolTypeInput(this.value)">
            <option value="">Selecione...</option>
            ${toolTypeSuggestions().map(t=>`<option value="${t}" ${m.toolType===t?'selected':''}>${t}</option>`).join('')}
            <option value="__new__" ${m.toolType && !toolTypeSuggestions().includes(m.toolType)?'selected':''}>+ Novo tipo...</option>
          </select>
          <input id="mToolTypeNew" placeholder="Nome do novo tipo" style="margin-top:6px;display:${m.toolType && !toolTypeSuggestions().includes(m.toolType)?'block':'none'};" value="${m.toolType && !toolTypeSuggestions().includes(m.toolType)?m.toolType:''}">
        </div>
        <div class="field"><label>Vida útil estimada (usos)</label><input type="number" id="mUsefulLifeUses" value="${m.usefulLifeUses||''}" step="1" placeholder="Ex: 50"></div>
      </div>
    </div>

    <div class="row2">
      <div class="field"><label>Preço de compra (R$)</label><input type="number" id="mPPrice" value="${m.purchasePrice}" step="0.01" oninput="updateMaterialUnitCost()"></div>
      <div class="field"><label>Quantidade da compra</label><input type="number" id="mPQty" value="${m.purchaseQty}" step="0.01" oninput="updateMaterialUnitCost()"></div>
    </div>
    <div class="field"><label>Custo unitário calculado</label><input id="mUnitCost" value="${brl(m.costPerUnit)}" disabled></div>
    <div class="row2">
      <div class="field"><label>Estoque atual</label><input type="number" id="mStock" value="${m.stock}" step="0.01"></div>
      <div class="field"><label>Estoque mínimo (alerta)</label><input type="number" id="mLow" value="${m.lowStock}" step="0.01"></div>
    </div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmMaterial(${editing?`'${id}'`:'null'})">${editing?'Salvar':'Criar'}</button>
    </div>
  `);
  updateFilamentNamePreview();
}
function onMaterialCategoryChange(){
  const cat = document.getElementById('mCat').value;
  document.getElementById('mFilamentBlock').style.display = cat==='Filamento' ? 'block' : 'none';
  document.getElementById('mRoleBlock').style.display = cat==='Embalagem' ? 'block' : 'none';
  document.getElementById('mToolBlock').style.display = cat==='Ferramentas' ? 'block' : 'none';
  updateMaterialNameFieldVisibility();
}
function onPackagingTypeChange(){
  const val = document.getElementById('mPackagingType').value;
  document.getElementById('mBoxDimsBlock').style.display = val==='caixa' ? 'block' : 'none';
  document.getElementById('mRollWidthBlock').style.display = (val==='bolha'||val==='fita') ? 'block' : 'none';
  updateMaterialNameFieldVisibility();
}
function updateMaterialNameFieldVisibility(){
  const cat = document.getElementById('mCat').value;
  const pkgEl = document.getElementById('mPackagingType');
  const pkg = pkgEl ? pkgEl.value : '';
  const hide = cat==='Filamento' || (cat==='Embalagem' && pkg==='caixa');
  document.getElementById('mNameField').style.display = hide ? 'none' : 'block';
}
const MATERIAL_TYPE_PRESETS = ['PLA','PETG','ABS','TPU','ASA','Nylon'];
function materialTypeSuggestions(){
  const used = state.materials.map(m=>m.materialType).filter(Boolean);
  return Array.from(new Set([...MATERIAL_TYPE_PRESETS, ...used])).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function brandSuggestions(){
  return Array.from(new Set(state.materials.map(m=>m.brand).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
const TOOL_TYPE_PRESETS = ['Lixa','Alicate','Pincel','Espátula','Estilete'];
function toolTypeSuggestions(){
  const used = state.materials.map(m=>m.toolType).filter(Boolean);
  return Array.from(new Set([...TOOL_TYPE_PRESETS, ...used])).sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
function toggleNewMaterialTypeInput(val){
  const el = document.getElementById('mMaterialTypeNew');
  if(el){ el.style.display = val==='__new__' ? 'block' : 'none'; if(val!=='__new__') el.value=''; }
}
function toggleNewBrandInput(val){
  const el = document.getElementById('mBrandNew');
  if(el){ el.style.display = val==='__new__' ? 'block' : 'none'; if(val!=='__new__') el.value=''; }
}
function toggleNewToolTypeInput(val){
  const el = document.getElementById('mToolTypeNew');
  if(el){ el.style.display = val==='__new__' ? 'block' : 'none'; if(val!=='__new__') el.value=''; }
}
function computeFilamentName(materialType, colorName, isDualColor, colorName2){
  if(!materialType) return '';
  if(isDualColor && colorName2) return `${materialType} Duo Color - ${colorName||'?'} com ${colorName2}`;
  return colorName ? `${materialType} ${colorName}` : materialType;
}
function updateFilamentNamePreview(){
  const sel = document.getElementById('mMaterialType');
  if(!sel) return;
  const materialType = sel.value==='__new__' ? document.getElementById('mMaterialTypeNew').value.trim() : sel.value;
  const colorName = document.getElementById('mColorName').value.trim();
  const isDualColor = document.getElementById('mIsDualColor').checked;
  const colorName2 = document.getElementById('mColorName2').value.trim();
  const preview = document.getElementById('mFilamentNamePreview');
  if(preview) preview.value = computeFilamentName(materialType, colorName, isDualColor, colorName2);
}
function updateMaterialUnitCost(){
  const price = parseFloat(document.getElementById('mPPrice').value)||0;
  const qty = parseFloat(document.getElementById('mPQty').value)||1;
  document.getElementById('mUnitCost').value = brl(price/qty);
}
function confirmMaterial(id){
  const category = document.getElementById('mCat').value;
  let name;
  let materialType='', brand='', color='', colorName='', isDualColor=false, color2='', colorName2='';
  let isBox=false, isBubbleWrap=false, isTape=false, lengthCm=0, widthCm=0, heightCm=0;
  let toolType='', usefulLifeUses=0;

  if(category==='Filamento'){
    const mtSel = document.getElementById('mMaterialType').value;
    materialType = mtSel==='__new__' ? document.getElementById('mMaterialTypeNew').value.trim() : mtSel;
    if(!materialType){ toast('Escolha o material (ex: PLA, PETG)','err'); return; }
    const brandSel = document.getElementById('mBrand').value;
    brand = brandSel==='__new__' ? document.getElementById('mBrandNew').value.trim() : brandSel;
    color = document.getElementById('mColor').value;
    colorName = document.getElementById('mColorName').value.trim();
    isDualColor = document.getElementById('mIsDualColor').checked;
    color2 = document.getElementById('mColor2').value;
    colorName2 = document.getElementById('mColorName2').value.trim();
    name = computeFilamentName(materialType, colorName, isDualColor, colorName2);
  } else if(category==='Embalagem'){
    const pkg = document.getElementById('mPackagingType').value;
    isBox = pkg==='caixa'; isBubbleWrap = pkg==='bolha'; isTape = pkg==='fita';
    if(isBox){
      const size = document.getElementById('mBoxSize').value;
      if(!size){ toast('Escolha o tamanho da caixa','err'); return; }
      name = `Caixa ${size}`;
      lengthCm = parseFloat(document.getElementById('mLengthCm').value)||0;
      widthCm = parseFloat(document.getElementById('mWidthCm').value)||0;
      heightCm = parseFloat(document.getElementById('mHeightCm').value)||0;
    } else {
      name = document.getElementById('mName').value.trim();
      if(!name){ toast('Informe o nome','err'); return; }
      if(isBubbleWrap || isTape){
        widthCm = parseFloat(document.getElementById('mRollWidthCm').value)||0;
      }
    }
  } else {
    name = document.getElementById('mName').value.trim();
    if(!name){ toast('Informe o nome','err'); return; }
    if(category==='Ferramentas'){
      const ttSel = document.getElementById('mToolType').value;
      toolType = ttSel==='__new__' ? document.getElementById('mToolTypeNew').value.trim() : ttSel;
      usefulLifeUses = parseFloat(document.getElementById('mUsefulLifeUses').value)||0;
    }
  }
  const dup = state.materials.find(x=>x.id!==id && x.name.trim().toLowerCase()===name.toLowerCase());
  if(dup){ toast(`Já existe uma matéria-prima chamada "${dup.name}" — use outro nome`,'err'); return; }
  const purchasePrice = parseFloat(document.getElementById('mPPrice').value)||0;
  const purchaseQty = parseFloat(document.getElementById('mPQty').value)||1;
  const stock = parseFloat(document.getElementById('mStock').value)||0;
  const lowStock = parseFloat(document.getElementById('mLow').value)||0;
  if(purchasePrice<0 || purchaseQty<0 || stock<0 || lowStock<0){ toast('Valores de preço/quantidade/estoque não podem ser negativos','err'); return; }
  const data = {
    name, category, unit: document.getElementById('mUnit').value,
    purchasePrice, purchaseQty, costPerUnit: purchasePrice/purchaseQty,
    stock, lowStock,
    isBox, isBubbleWrap, isTape, lengthCm, widthCm, heightCm,
    materialType, brand, color, colorName, isDualColor, color2, colorName2,
    toolType, usefulLifeUses,
  };
  if(isBubbleWrap){
    state.materials.forEach(mat=>{ if(mat.id!==id) mat.isBubbleWrap = false; });
  }
  if(isTape){
    state.materials.forEach(mat=>{ if(mat.id!==id) mat.isTape = false; });
  }
  let renamedFrom = null;
  let oldCostPerUnit = null;
  if(id){
    const existing = state.materials.find(x=>x.id===id);
    if(existing.name !== name) renamedFrom = existing.name;
    oldCostPerUnit = existing.costPerUnit;
    Object.assign(existing, data);
  } else {
    state.materials.push({ id:uid(), ...data });
  }
  if(renamedFrom){
    let productsTouched = false;
    state.products.forEach(p=>{
      (p.filaments||[]).forEach(f=>{ if(f.materialName===renamedFrom){ f.materialName=name; productsTouched=true; } });
      if(p.boxType===renamedFrom){ p.boxType=name; productsTouched=true; }
    });
    if(productsTouched) saveProducts();
  }
  saveMaterials();
  let marginMsg = '';
  if(oldCostPerUnit!=null && oldCostPerUnit!==data.costPerUnit){
    const affected = state.products.filter(p=>
      (p.filaments||[]).some(f=>f.materialName===name) || p.boxType===name || (isBubbleWrap && (p.bubbleWrapM||0)>0) || (isTape && (p.tapeM||0)>0)
    ).filter(p=>{ const c = calcProduct(p); return c.marginPct < c.desiredMarginPct; });
    if(affected.length){
      marginMsg = ` — atenção: ${affected.length} produto(s) ficaram com margem abaixo do desejado (${affected.slice(0,3).map(p=>p.name).join(', ')})`;
    }
  }
  toast((id?'Matéria-prima atualizada':'Matéria-prima criada') + marginMsg, marginMsg?'err':'');
  closeModal(); renderContent();
}
function openRestockModal(id){
  const m = state.materials.find(x=>x.id===id);
  showModal(`Reabastecer: ${m.name}`, `
    <div class="field"><label>Estoque atual</label><input value="${num(m.stock,1)} ${m.unit}" disabled></div>
    <div class="field"><label>Quantidade a adicionar (${m.unit})</label><input type="number" id="rQty" step="0.01" placeholder="Ex: ${m.purchaseQty}"></div>
    <div class="field"><label>Custo total da compra (opcional — recalcula custo unitário)</label><input type="number" id="rCost" step="0.01" placeholder="Ex: ${m.purchasePrice}"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmRestock('${id}')">Adicionar ao estoque</button>
    </div>
  `);
}
function confirmRestock(id){
  const m = state.materials.find(x=>x.id===id);
  const qty = parseFloat(document.getElementById('rQty').value)||0;
  const cost = parseFloat(document.getElementById('rCost').value);
  if(qty<=0){ toast('Informe uma quantidade válida','err'); return; }
  if(cost && cost>0){
    /* média ponderada: mistura o valor do estoque já existente com o da compra nova,
       em vez de simplesmente substituir pelo preço do último lote. */
    const existingValue = m.stock * m.costPerUnit;
    const newTotalStock = m.stock + qty;
    m.costPerUnit = newTotalStock>0 ? (existingValue + cost) / newTotalStock : cost/qty;
    m.purchasePrice = cost; m.purchaseQty = qty;
  }
  m.stock += qty;
  saveMaterials(); toast('Estoque atualizado'); closeModal(); renderContent();
}
/* ===================== CAIXA ===================== */
function renderCaixa(){
  const a = blocoA(currentMonth), b = blocoB(currentMonth), c = blocoC(), d = blocoD(currentMonth);
  return `
    <div class="filter-bar">
      <div class="field"><label>Mês de referência</label><input type="month" value="${currentMonth}" onchange="currentMonth=this.value; renderContent();"></div>
      <div style="margin-left:auto;display:flex;gap:8px;">
        <button class="btn" onclick="switchTab('taxas')">Taxas</button>
        <button class="btn" onclick="switchTab('configuracoes')">Despesas, parcelas e reservas</button>
      </div>
    </div>

    <div class="section-title">Bloco A — Resultado operacional</div>
    <div class="card">
      <div class="tbl-wrap"><table>
        <tbody>
          ${caixaRow('Faturamento Bruto', a.faturamento)}
          ${caixaRow('(−) Taxas de Plataforma', -a.taxas)}
          ${caixaRow('(=) Receita Líquida', a.receitaLiquida, true)}
          ${caixaRow('(−) Custo de Produção', -a.custoProducao)}
          ${caixaRow('(−) Frete pago', -a.frete)}
          ${caixaRow('(−) Despesas Operacionais', -a.despesas)}
          ${caixaRow('(=) Lucro Bruto', a.lucroBruto, true)}
          ${caixaRow('(−) Imposto MEI (DAS)', -a.mei)}
          ${caixaRow('(=) LUCRO OPERACIONAL', a.lucroOperacional, true)}
        </tbody>
      </table></div>
    </div>

    <div class="grid g-2" style="margin-top:14px;align-items:start;">
      <div class="card">
        <div class="card-title">Detalhamento — Despesas operacionais<span class="sub">${brl(a.despesas)}/mês</span></div>
        ${breakdownTable(state.settings.expenses)}
      </div>
      <div class="card">
        <div class="card-title">Detalhamento — Impostos<span class="sub">${brl(a.mei)}/mês</span></div>
        ${breakdownTable(state.settings.taxes)}
      </div>
    </div>

    <div class="section-title">Bloco B — Amortização do investimento</div>
    <div class="card">
      ${b.rows.length ? `<div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Impressora</th><th class="right">Parcela mensal</th><th class="right">Parcelas restantes</th><th class="right">Total a pagar</th><th class="right">Status ${monthLabel(currentMonth)}</th></tr></thead>
        <tbody>
          ${b.rows.map(r=>`<tr><td data-label="Impressora">${r.machine.name||'(sem nome)'}</td><td class="right num" data-label="Parcela mensal">${brl(r.parcela)}</td><td class="right num" data-label="Parcelas restantes">${r.restantes}</td><td class="right num" data-label="Total a pagar">${brl(r.totalPagar)}</td><td class="right" data-label="Status">${r.naoConfigurada?'<span class="badge mut">Não configurada</span>':r.quitada?'<span class="badge ok">Quitada</span>':r.dueThisMonth?'<span class="badge info">Devida este mês</span>':'<span class="badge mut">Fora do período</span>'}</td></tr>`).join('')}
          ${b.rows.length>1 ? `<tr><td style="font-weight:600;" data-label="Total">Total</td><td class="right num" style="font-weight:600;" data-label="Parcela mensal">${brl(b.rows.reduce((a,r)=>a+r.parcela,0))}</td><td></td><td class="right num" style="font-weight:600;" data-label="Total a pagar">${brl(b.totalPagar)}</td><td></td></tr>` : ''}
        </tbody>
      </table></div>` : emptyState('Nenhuma impressora cadastrada ainda')}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
        <div class="field hint" style="margin:0;">As parcelas restantes são calculadas automaticamente a partir do mês da 1ª parcela de cada impressora.</div>
        <button class="btn ghost sm" onclick="switchTab('configuracoes')">Gerenciar impressoras</button>
      </div>
    </div>

    <div class="section-title" style="display:flex;align-items:center;justify-content:space-between;">
      <span>Bloco C — Reservas</span>
      <button class="btn sm" onclick="openCloseMonthModal()">Fechar o mês</button>
    </div>
    <div class="grid g-4">
      ${c.goals.map(g=>{
        const p = g.goal>0 ? Math.min(100,(g.balance/g.goal)*100) : (g.balance>0?100:0);
        const isDepreciation = g.autoMode==='cost_depreciation';
        const isAutoPct = g.autoMode==='pct_profit' && g.autoPct>0;
        return `<div class="card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px;">
            <div style="font-weight:600;font-size:13px;">${g.name}</div>
            ${isDepreciation?'<span class="badge info" title="Recebe automaticamente parte do custo de cada venda">Auto</span>':''}
            ${isAutoPct?`<span class="badge info" title="Recebe ${g.autoPct}% do lucro de cada venda automaticamente">Auto ${g.autoPct}%</span>`:''}
          </div>
          <div style="font-family:var(--font-mono);font-size:18px;font-weight:600;margin:8px 0 4px;">${brl(g.balance)}</div>
          <div class="progress"><div style="width:${p}%"></div></div>
          <div style="font-size:11px;color:var(--text-faint);margin-top:5px;">${isDepreciation?'Alimentado a cada venda registrada':'Meta mensal: '+brl(g.goal)}</div>
          <button class="btn sm ghost" style="margin-top:10px;width:100%;" onclick="openReserveModal('${g.id}')">Movimentar</button>
        </div>`;
      }).join('')}
    </div>
    <div class="field hint" style="margin-top:8px;">"Fechar o mês" completa as metas com o que sobrar do lucro do mês (depois da parcela da impressora), na ordem acima — pulando o que as vendas já alimentaram automaticamente.</div>

    <div class="section-title">Bloco D — Resultado final</div>
    <div class="card">
      <div class="tbl-wrap"><table>
        <tbody>
          ${caixaRow('Lucro Operacional (Bloco A)', d.lucroOperacional)}
          ${caixaRow('(−) Total Parcelas (Bloco B)', -d.parcelas)}
          ${caixaRow('(−) Total Reservas (Bloco C)', -d.reservas)}
          ${caixaRow('(−) Investimentos do mês', -d.investimentosMes)}
          ${caixaRow('(=) PRÓ-LABORE DISPONÍVEL', d.proLabore, true)}
        </tbody>
      </table></div>
      ${d.investimentosMes>0 ? `<div class="field hint" style="margin-top:10px;">Inclui compras e parcelas de investimentos (aba Anual) que caem em ${monthLabel(currentMonth)}.</div>` : ''}
    </div>
  `;
}
function caixaRow(label, value, bold){
  return `<tr><td style="${bold?'font-weight:600;':''}">${label}</td><td class="right num" style="${bold?'font-weight:600;':''}color:${value<0?'var(--red)':bold?'var(--green)':'var(--text)'}">${brl(value)}</td></tr>`;
}
function breakdownTable(items){
  if(!items || items.length===0) return `${emptyState('Nenhum item cadastrado')}<button class="btn ghost sm" style="width:100%;margin-top:6px;" onclick="switchTab('configuracoes')">+ Adicionar item</button>`;
  return `<div class="tbl-wrap"><table><tbody>
    ${items.map(i=>`<tr><td>${i.name}</td><td class="right num">${brl(i.value)}</td></tr>`).join('')}
  </tbody></table></div>
  <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="switchTab('configuracoes')">Editar itens</button>`;
}
let editingPlatforms = [];
let editingExpenses = [];
let editingTaxes = [];
let editingMachines = [];
let editingReserveGoals = [];
let editingBusinessName = '';
let editingBusinessLogo = null;
function renderTaxas(){
  const s = state.settings;
  return `
    <div class="section-title" style="margin-top:0;">Taxas por plataforma de venda</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">As plataformas mudam suas taxas de tempos em tempos — atualize aqui quando isso acontecer. Vendas já registradas não são recalculadas.</div>
      <div id="platformRows"></div>
      <button class="btn ghost sm" onclick="addPlatformRow()">+ Adicionar plataforma</button>
    </div>

    <div class="section-title">Mercado Livre — taxa real (opcional)</div>
    <div class="card">
      <div id="mlConnectSection">${renderMlConnectSection()}</div>
    </div>

    <div class="section-title">Precificação</div>
    <div class="card">
      <div class="field"><label>Margem de lucro padrão sugerida (%)</label><input type="number" id="cfgMargin" value="${((1-1/(s.markupMultiplier||2.5))*100).toFixed(0)}" step="1"></div>
      <div class="field hint" style="margin-top:-8px;">Usada como ponto de partida ao criar um produto novo — depois, cada produto pode ter a margem ajustada individualmente no próprio cadastro.</div>
      <div class="field"><label>Piso de alerta de margem (%)</label><input type="number" id="cfgMinMargin" value="${s.minMarginPct!=null?s.minMarginPct:25}" step="1"></div>
      <div class="field hint" style="margin-top:-8px;">Abaixo desse valor, a margem por Mercado Livre/Shopee aparece em vermelho na lista de Produtos — é a taxa da plataforma que costuma corroer a margem, não o preço de venda direta.</div>
    </div>
  `;
}
function renderConfiguracoes(){
  const s = state.settings;
  return `
    <div class="section-title" style="margin-top:0;">Marca do negócio</div>
    <div class="card">
      <div class="field"><label>Nome do negócio</label><input id="cfgBusinessName" value="${editingBusinessName}" placeholder="Ex: Piece of Geek 3D" oninput="editingBusinessName=this.value"></div>
      <div class="field"><label>Logo</label><input type="file" accept="image/*" id="cfgBusinessLogoInput" onchange="handleBusinessLogoUpload(this)"></div>
      <div id="cfgBusinessLogoPreview">${editingBusinessLogo ? `<img src="${editingBusinessLogo}" alt="Logo atual" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin-top:8px;display:block;">` : ''}</div>
      <div class="field hint" style="margin-top:8px;">Aparece na barra lateral, no catálogo exportado, no recibo de venda e no app instalado no celular. Deixe em branco pra usar o padrão.</div>
    </div>

    <div class="section-title">Despesas operacionais mensais</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">Cada item que você paga todo mês pra manter o negócio rodando: assinaturas, anúncios, ferramentas etc.</div>
      <div id="expenseRows"></div>
      <button class="btn ghost sm" onclick="addExpenseRow()">+ Adicionar despesa</button>
      <div class="field hint" style="margin-top:10px;text-align:right;">Total: <strong id="expenseTotal" style="color:var(--text)">${brl(editingExpenses.reduce((a,e)=>a+(e.value||0),0))}</strong></div>
    </div>

    <div class="section-title">Impostos mensais</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">DAS-MEI e qualquer outro imposto que incida sobre o negócio.</div>
      <div id="taxRows"></div>
      <button class="btn ghost sm" onclick="addTaxRow()">+ Adicionar imposto</button>
    </div>

    <div class="section-title">PIX</div>
    <div class="card">
      <div class="field"><label>Chave PIX</label><input id="cfgPixKey" value="${s.pixKey||''}" placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"></div>
      <div class="row2">
        <div class="field"><label>Nome do recebedor</label><input id="cfgPixName" value="${s.pixMerchantName||''}" maxlength="25"></div>
        <div class="field"><label>Cidade</label><input id="cfgPixCity" value="${s.pixMerchantCity||''}" maxlength="15"></div>
      </div>
      <div class="field hint" style="margin-top:-8px;">Preencha pra poder gerar cobrança PIX (QR Code + copia e cola) direto na hora de registrar uma venda.</div>
    </div>

    <div class="section-title">Contato (aparece no catálogo)</div>
    <div class="card">
      <div class="row2">
        <div class="field"><label>WhatsApp</label><input id="cfgWhatsapp" value="${s.whatsapp||''}" placeholder="(11) 99999-9999"></div>
        <div class="field"><label>Instagram</label><input id="cfgInstagram" value="${s.instagram||''}" placeholder="seu.usuario (sem @)"></div>
      </div>
    </div>

    <div class="section-title">Mão de obra</div>
    <div class="card">
      <div class="field"><label>Valor da sua hora de trabalho (R$/h)</label><input type="number" id="cfgLabor" value="${s.laborHourlyRate||0}" step="0.01"></div>
      <div class="field hint" style="margin-top:-8px;">Usado para calcular o custo de mão de obra de cada produto (pintura, montagem, acabamento), com base nos minutos informados no cadastro do produto.</div>
    </div>

    <div class="section-title">MEI, capacidade e metas</div>
    <div class="card">
      <div class="row2">
        <div class="field"><label>Limite anual de faturamento do MEI (R$)</label><input type="number" id="cfgMeiLimit" value="${s.meiRevenueLimit||81000}" step="100"></div>
        <div class="field"><label>Horas de impressão disponíveis por dia (por impressora)</label><input type="number" id="cfgPrintHours" value="${s.printHoursPerDay||8}" step="0.5"></div>
      </div>
      <div class="field"><label>Meta de faturamento mensal (R$)</label><input type="number" id="cfgMonthlyGoal" value="${s.monthlyGoal||0}" step="50" placeholder="0 = sem meta definida"></div>
    </div>

    <div class="section-title">Impressoras</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">Cada impressora tem sua própria depreciação, energia e parcela. O produto escolhe qual impressora usa lá no cadastro.</div>
      <div id="machineRows"></div>
      <button class="btn ghost sm" onclick="addMachineRow()">+ Adicionar impressora</button>
    </div>

    <div class="section-title">Metas de reserva mensal</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">Defina a meta mensal de cada reserva e, se quiser, o % do lucro de cada venda que deve ir automaticamente pra lá. O que faltar pra bater a meta pode ser completado depois com "Fechar o mês" em Caixa.</div>
      <div id="reserveRows"></div>
      <button class="btn ghost sm" onclick="addReserveRow()">+ Adicionar reserva</button>
    </div>
  `;
}
function renderReserveRows(){
  const el = document.getElementById('reserveRows');
  if(!el) return;
  el.innerHTML = editingReserveGoals.map((g,i)=>`
    <div class="row3" style="align-items:end;">
      <div class="field"><label>${i===0?'Nome':''}</label><input value="${g.name}" oninput="editingReserveGoals[${i}].name=this.value"></div>
      <div class="field"><label>${i===0?'Meta mensal (R$)':''}</label><input type="number" value="${g.goal}" step="0.01" placeholder="meta mensal R$" oninput="editingReserveGoals[${i}].goal=parseFloat(this.value)||0"></div>
      ${g.autoMode==='cost_depreciation'
        ? `<div class="field"><label>${i===0?'Alocação automática':''}</label><input value="Automático — via custo de depreciação" disabled></div>`
        : `<div class="field"><label>${i===0?'% do lucro por venda':''}</label><input type="number" value="${g.autoPct||0}" step="1" placeholder="0" oninput="editingReserveGoals[${i}].autoPct=Math.min(100,Math.max(0,parseFloat(this.value)||0))"></div>`}
    </div>
    <div style="display:flex;justify-content:flex-end;margin:-6px 0 10px;">
      ${g.autoMode==='cost_depreciation' ? `<span class="field hint" style="margin:0;">Reserva fixa do sistema — não pode ser removida</span>` : `<button class="btn ghost sm" title="Remover" onclick="removeReserveRow(${i})">Remover reserva</button>`}
    </div>
  `).join('');
}
function addReserveRow(){
  editingReserveGoals.push({ id:uid(), name:'Nova reserva', goal:0, balance:0, autoMode:'pct_profit', autoPct:0 });
  renderReserveRows();
}
function removeReserveRow(i){
  if(editingReserveGoals[i].autoMode==='cost_depreciation') return;
  const removed = editingReserveGoals[i];
  if(removed.balance>0 && !confirm(`"${removed.name}" tem ${brl(removed.balance)} guardado. Remover mesmo assim? Esse saldo deixa de aparecer em Caixa (não é devolvido a lugar nenhum).`)) return;
  editingReserveGoals.splice(i,1);
  renderReserveRows();
}
function renderMachineRows(){
  const el = document.getElementById('machineRows');
  if(!el) return;
  el.innerHTML = editingMachines.length ? editingMachines.map((m,i)=>`
    <div class="card" style="margin-bottom:10px;padding:14px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
        <input value="${m.name}" placeholder="Nome da impressora" oninput="editingMachines[${i}].name=this.value" style="font-weight:600;">
        <button class="btn ghost sm" title="Remover" onclick="removeMachineRow(${i})">Remover</button>
      </div>
      <div class="row3">
        <div class="field"><label>Preço de compra (R$)</label><input type="number" step="0.01" value="${m.price||0}" oninput="editingMachines[${i}].price=parseFloat(this.value)||0"></div>
        <div class="field"><label>Valor residual (R$)</label><input type="number" step="0.01" value="${m.residual||0}" oninput="editingMachines[${i}].residual=parseFloat(this.value)||0"></div>
        <div class="field"><label>Vida útil (horas)</label><input type="number" step="1" value="${m.lifeHours||5000}" oninput="editingMachines[${i}].lifeHours=parseFloat(this.value)||1"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Potência média (kW)</label><input type="number" step="0.01" value="${m.powerConsumptionKw||0}" placeholder="Ex: 0.1" oninput="editingMachines[${i}].powerConsumptionKw=parseFloat(this.value)||0; renderMachineRows();"></div>
        <div class="field"><label>Custo de energia (R$/h)</label><input type="number" step="0.0001" value="${m.energyCostPerHour||0}" ${m.powerConsumptionKw>0?'disabled':''} oninput="editingMachines[${i}].energyCostPerHour=parseFloat(this.value)||0"></div>
      </div>
      <div class="field hint" style="margin-top:-8px;margin-bottom:10px;">${m.powerConsumptionKw>0 ? `Calculado automaticamente pela tarifa (aba Cálculo): ${num(m.powerConsumptionKw,2)}kW × ${brl(state.settings.energyTariffPerKwh||0)}/kWh = ${brl(machineEnergyCostPerHour(m))}/h` : 'Preencha a potência pra calcular sozinho pela tarifa, ou deixe em 0 e informe o R$/h manualmente.'}</div>
      <div class="field hint" style="margin-top:-8px;margin-bottom:10px;">Depreciação calculada: ${brl(machineDeprCostPerHour(m))}/h</div>
      <div class="field"><label>Manutenção (R$/h)</label><input type="number" step="0.01" value="${m.maintenanceCostPerHour!=null?m.maintenanceCostPerHour:0.25}" oninput="editingMachines[${i}].maintenanceCostPerHour=parseFloat(this.value)||0"></div>
      <div class="field hint" style="margin-top:-8px;margin-bottom:10px;">Estimativa fixa de troca de bico, correias, limpeza etc. — não é derivada do histórico de manutenção abaixo (poucas horas rodadas fariam o valor oscilar demais). Revise a cada 6 meses.</div>
      <div class="row3">
        <div class="field"><label>Parcela mensal (R$)</label><input type="number" step="0.01" value="${m.installmentValue||0}" oninput="editingMachines[${i}].installmentValue=parseFloat(this.value)||0"></div>
        <div class="field"><label>Total de parcelas</label><input type="number" step="1" value="${m.installmentsTotal||0}" oninput="editingMachines[${i}].installmentsTotal=parseFloat(this.value)||0"></div>
        <div class="field"><label>Mês da 1ª parcela</label><input type="month" value="${m.startMonth||currentMonth}" oninput="editingMachines[${i}].startMonth=this.value"></div>
      </div>
    </div>
  `).join('') : `<div class="empty" style="padding:14px;">Nenhuma impressora cadastrada</div>`;
}
function openMaintenanceModal(machineId){
  const m = (state.settings.machines||[]).find(x=>x.id===machineId);
  if(!m) return;
  const log = (m.maintenanceLog||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  showModal(`Manutenção — ${m.name}`, `
    <div class="row2">
      <div class="field"><label>Data</label><input type="date" id="mtDate" value="${todayStr()}"></div>
      <div class="field"><label>Custo (R$, opcional)</label><input type="number" id="mtCost" step="0.01" value="0"></div>
    </div>
    <div class="field"><label>O que foi feito</label><input id="mtNote" placeholder="Ex: troca de bico, nivelamento da mesa"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmMaintenance('${machineId}')">Registrar</button>
    </div>
    ${log.length ? `<div class="section-title" style="margin-top:18px;">Histórico</div>
      <div class="tbl-wrap"><table><tbody>
        ${log.map(entry=>`<tr>
          <td class="num" style="white-space:nowrap;">${fmtDate(entry.date)}</td>
          <td>${entry.note||'—'}</td>
          <td class="right num">${entry.cost?brl(entry.cost):''}</td>
          <td class="right"><button class="btn ghost sm" onclick="deleteMaintenanceEntry('${machineId}','${entry.id}')">×</button></td>
        </tr>`).join('')}
      </tbody></table></div>` : ''}
  `);
}
function confirmMaintenance(machineId){
  const m = (state.settings.machines||[]).find(x=>x.id===machineId);
  if(!m) return;
  const date = document.getElementById('mtDate').value || todayStr();
  const cost = parseFloat(document.getElementById('mtCost').value)||0;
  const note = document.getElementById('mtNote').value.trim();
  if(!Array.isArray(m.maintenanceLog)) m.maintenanceLog = [];
  m.maintenanceLog.push({ id:uid(), date, cost, note });
  saveSettings();
  toast('Manutenção registrada');
  closeModal(); renderContent();
}
function deleteMaintenanceEntry(machineId, entryId){
  const m = (state.settings.machines||[]).find(x=>x.id===machineId);
  if(!m) return;
  if(!confirm('Excluir esse registro de manutenção?')) return;
  m.maintenanceLog = (m.maintenanceLog||[]).filter(e=>e.id!==entryId);
  saveSettings();
  openMaintenanceModal(machineId);
}
function addMachineRow(){
  editingMachines.push({ id:uid(), name:'Nova impressora', price:0, residual:0, lifeHours:5000, energyCostPerHour:0.0704, maintenanceCostPerHour:0.25, installmentValue:0, installmentsTotal:0, startMonth:currentMonth });
  renderMachineRows();
}
function removeMachineRow(i){
  const m = editingMachines[i];
  const usedBy = state.products.filter(p=>p.machineId===m.id);
  if(usedBy.length && !confirm(`${usedBy.length} produto(s) usam "${m.name}" (${usedBy.slice(0,3).map(p=>p.name).join(', ')}${usedBy.length>3?'...':''}). Ao remover, eles passam a usar a primeira impressora da lista pro cálculo de custo. Continuar?`)) return;
  editingMachines.splice(i,1);
  renderMachineRows();
}
function renderNameValueRows(containerId, list, updateFn, removeFn){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = list.length ? list.map((item,i)=>`
    <div style="display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) 28px;gap:8px;align-items:center;margin-bottom:8px;">
      <input value="${item.name}" placeholder="Nome" style="min-width:0;" oninput="${updateFn}(${i},'name',this.value)">
      <input type="number" step="0.01" value="${item.value}" placeholder="R$" style="min-width:0;" oninput="${updateFn}(${i},'value',this.value)">
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="${removeFn}(${i})">×</button>
    </div>
  `).join('') : `<div class="empty" style="padding:10px;">Nenhum item ainda</div>`;
}
function addExpenseRow(){ editingExpenses.push({id:uid(),name:'',value:0}); renderNameValueRows('expenseRows', editingExpenses, 'updateExpenseRow', 'removeExpenseRow'); }
function updateExpenseRow(i,field,val){
  editingExpenses[i][field] = field==='value' ? (parseFloat(val)||0) : val;
  const t = document.getElementById('expenseTotal');
  if(t) t.textContent = brl(editingExpenses.reduce((a,e)=>a+(e.value||0),0));
}
function removeExpenseRow(i){ editingExpenses.splice(i,1); renderNameValueRows('expenseRows', editingExpenses, 'updateExpenseRow', 'removeExpenseRow'); }
function addTaxRow(){ editingTaxes.push({id:uid(),name:'',value:0}); renderNameValueRows('taxRows', editingTaxes, 'updateTaxRow', 'removeTaxRow'); }
function updateTaxRow(i,field,val){ editingTaxes[i][field] = field==='value' ? (parseFloat(val)||0) : val; }
function removeTaxRow(i){ editingTaxes.splice(i,1); renderNameValueRows('taxRows', editingTaxes, 'updateTaxRow', 'removeTaxRow'); }
const ML_CATEGORY_PRESETS = [
  { label:'Casa/Decoração · Clássico', pct:12 },
  { label:'Brinquedos/Hobbies · Clássico', pct:12 },
  { label:'Eletrônicos · Clássico', pct:11 },
  { label:'Escritório/Papelaria · Clássico', pct:13 },
  { label:'Qualquer categoria · Premium', pct:17 },
];
function applyMlPreset(i, pct){
  editingPlatforms[i].pct = pct;
  renderPlatformRows();
}
function renderPlatformRows(){
  const el = document.getElementById('platformRows');
  if(!el) return;
  el.innerHTML = editingPlatforms.map((p,i)=>{
    const isML = /mercado\s*livre/i.test(p.name);
    const isShopee = /shopee/i.test(p.name) && p.tiers;
    const canHaveListing = !isML && !isShopee;
    const otherTemplateOptions = canHaveListing ? editingPlatforms.filter((op,oi)=>oi!==i && op.listingTemplate && !/mercado\s*livre/i.test(op.name) && !(/shopee/i.test(op.name)&&op.tiers)) : [];
    return `
    <div style="display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,0.8fr) minmax(0,0.8fr) 28px;gap:8px;align-items:end;margin-bottom:${(isML||isShopee||canHaveListing)?4:8}px;">
      <div class="field" style="margin-bottom:0;min-width:0;">${i===0?'<label>Plataforma</label>':''}<input value="${p.name}" style="min-width:0;" oninput="editingPlatforms[${i}].name=this.value"></div>
      <div class="field" style="margin-bottom:0;min-width:0;">${i===0?'<label>Taxa %</label>':''}<input type="number" step="0.01" value="${p.pct}" style="min-width:0;" oninput="editingPlatforms[${i}].pct=parseFloat(this.value)||0"></div>
      <div class="field" style="margin-bottom:0;min-width:0;">${i===0?'<label>Taxa fixa R$</label>':''}<input type="number" step="0.01" value="${p.fixed}" style="min-width:0;" oninput="editingPlatforms[${i}].fixed=parseFloat(this.value)||0"></div>
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="removePlatformRow(${i})">×</button>
    </div>
    ${isML ? `<div style="margin:0 0 12px;display:flex;flex-wrap:wrap;gap:6px;">
        ${ML_CATEGORY_PRESETS.map(pr=>`<button type="button" class="chip" style="cursor:pointer;border:none;" onclick="applyMlPreset(${i},${pr.pct})">${pr.label} (${pr.pct}%)</button>`).join('')}
      </div>
      <div class="field hint" style="margin-top:-8px;margin-bottom:12px;">Estimativas por grupo de categoria (2026) — o Mercado Livre tem ~477 categorias com percentuais próprios. Confira o valor exato no Seller Center do seu anúncio antes de confiar cegamente.</div>` : ''}
    ${isShopee ? `<div class="field hint" style="margin-top:-8px;margin-bottom:12px;">Taxa % e fixa aqui são só o padrão de fallback — nas vendas, a faixa oficial da Shopee (por valor do produto) é aplicada automaticamente.</div>` : ''}
    ${canHaveListing ? `<div class="field" style="margin-bottom:12px;"><label>Aba de Anúncios pra "${p.name}"</label>
      <select onchange="editingPlatforms[${i}].listingTemplate=this.value||null; renderPlatformRows();">
        <option value="">Sem aba de Anúncios (só taxa pra Vendas)</option>
        <option value="ml" ${p.listingTemplate==='ml'?'selected':''}>Copiar campos do Mercado Livre</option>
        <option value="shopee" ${p.listingTemplate==='shopee'?'selected':''}>Copiar campos da Shopee</option>
        ${otherTemplateOptions.map(op=>`<option value="${op.id}" ${p.listingTemplate===op.id?'selected':''}>Copiar campos de "${op.name}"</option>`).join('')}
      </select>
      <div class="field hint" style="margin-top:4px;">${p.listingTemplate?'Produtos ganha um preço próprio pra essa plataforma, e Anúncios ganha uma aba com os mesmos campos da plataforma copiada.':'Sem aba de Anúncios, essa plataforma entra só no cálculo de taxa das vendas.'}</div>
    </div>` : ''}
  `;}).join('');
}
function addPlatformRow(){
  editingPlatforms.push({id:uid(),name:'Nova plataforma',pct:0,fixed:0,listingTemplate:null});
  renderPlatformRows();
}
function removePlatformRow(i){
  if(editingPlatforms.length<=1){ toast('Mantenha ao menos uma plataforma','err'); return; }
  editingPlatforms.splice(i,1);
  renderPlatformRows();
}
function confirmTaxas(){
  const s = state.settings;
  const cleanPlatforms = editingPlatforms.filter(p=>p.name && p.name.trim());
  if(cleanPlatforms.length===0){ toast('Cadastre ao menos uma plataforma','err'); return; }
  s.platforms = cleanPlatforms;
  const cfgMarginPct = Math.min(95, Math.max(0, parseFloat(document.getElementById('cfgMargin').value)||0));
  s.markupMultiplier = cfgMarginPct<100 ? 1/(1-cfgMarginPct/100) : 20;
  s.minMarginPct = Math.min(95, Math.max(0, parseFloat(document.getElementById('cfgMinMargin').value)||0));
  saveSettings(); toast('Taxas salvas'); renderContent();
}
function confirmConfiguracoes(){
  const s = state.settings;
  s.businessName = document.getElementById('cfgBusinessName').value.trim();
  s.businessLogo = editingBusinessLogo;
  s.expenses = editingExpenses.filter(e=>e.name && e.name.trim());
  s.taxes = editingTaxes.filter(t=>t.name && t.name.trim());
  s.pixKey = document.getElementById('cfgPixKey').value.trim();
  s.pixMerchantName = document.getElementById('cfgPixName').value.trim();
  s.pixMerchantCity = document.getElementById('cfgPixCity').value.trim();
  s.whatsapp = document.getElementById('cfgWhatsapp').value.trim();
  s.instagram = document.getElementById('cfgInstagram').value.trim().replace(/^@/,'');
  s.laborHourlyRate = parseFloat(document.getElementById('cfgLabor').value)||0;
  s.meiRevenueLimit = parseFloat(document.getElementById('cfgMeiLimit').value)||81000;
  s.monthlyGoal = parseFloat(document.getElementById('cfgMonthlyGoal').value)||0;
  s.printHoursPerDay = parseFloat(document.getElementById('cfgPrintHours').value)||8;
  s.machines = editingMachines.filter(m=>m.name && m.name.trim());
  s.reserveGoals = editingReserveGoals.filter(g=>g.name && g.name.trim());
  saveSettings(); toast('Configurações salvas'); render();
}
function openCloseMonthModal(){
  const { plan, leftover } = previewCloseMonth(currentMonth);
  const rows = plan.map(({goal,alreadyForGoal,need,toAllocate})=>`
    <tr>
      <td data-label="Reserva">${goal.name}</td>
      <td class="right num" data-label="Já alimentado" style="color:var(--text-faint)">${brl(alreadyForGoal)}</td>
      <td class="right num" data-label="Falta p/ meta" style="color:var(--text-faint)">${brl(need)}</td>
      <td class="right num" data-label="Vai alocar agora" style="color:${toAllocate>0?'var(--green)':'var(--text-faint)'}">${brl(toAllocate)}</td>
    </tr>`).join('');
  const totalToAllocate = plan.reduce((a,p)=>a+p.toAllocate,0);
  showModal(`Fechar ${monthLabel(currentMonth)}`, `
    <div class="field hint" style="margin-bottom:12px;">Distribui o que sobrou do lucro operacional do mês (depois da parcela da impressora) entre as metas abaixo, na ordem de prioridade, completando o que as vendas ainda não alimentaram automaticamente.</div>
    <div class="tbl-wrap tbl-responsive"><table>
      <thead><tr><th>Reserva</th><th class="right">Já alimentado</th><th class="right">Falta p/ meta</th><th class="right">Vai alocar agora</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--text-faint);padding:16px;">Nenhuma meta configurada</td></tr>'}</tbody>
    </table></div>
    <div class="calc-line total" style="margin-top:10px;"><span>Total a alocar agora</span><span>${brl(totalToAllocate)}</span></div>
    <div class="calc-line"><span>Sobra (não alocada, vira pró-labore)</span><span>${brl(leftover)}</span></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmCloseMonth()" ${totalToAllocate<=0?'disabled':''}>Confirmar fechamento</button>
    </div>
  `);
}
function confirmCloseMonth(){
  applyCloseMonth(currentMonth);
  toast('Reservas do mês atualizadas');
  closeModal(); renderContent();
}
function openReserveModal(id){
  const g = state.settings.reserveGoals.find(x=>x.id===id);
  showModal(`Movimentar: ${g.name}`, `
    <div class="field"><label>Saldo acumulado atual</label><input value="${brl(g.balance)}" disabled></div>
    <div class="field"><label>Valor a adicionar (use negativo para retirar)</label><input type="number" id="resDelta" step="0.01" placeholder="Ex: ${g.goal || 100}"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmReserve('${id}')">Confirmar</button>
    </div>
  `);
}
function confirmReserve(id){
  const g = state.settings.reserveGoals.find(x=>x.id===id);
  const delta = parseFloat(document.getElementById('resDelta').value)||0;
  g.balance += delta;
  saveSettings(); toast('Reserva atualizada'); closeModal(); renderContent();
}

/* ===================== MODAL ===================== */
function showModal(title, bodyHtml){
  const modal = document.getElementById('modalBody');
  modal.innerHTML = `
    <div class="modal-head"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    ${bodyHtml}
  `;
  document.getElementById('overlay').classList.add('show');
  modal.focus();
}
function closeModal(){
  document.getElementById('overlay').classList.remove('show');
  if(pendingRemoteReload){ pendingRemoteReload = false; refreshFromRemote(); }
}
document.getElementById('overlay').addEventListener('click', (e)=>{ if(e.target.id==='overlay') closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && document.getElementById('overlay').classList.contains('show')) closeModal(); });

function handleOnboardingLogoUpload(input){
  const file = input.files[0];
  if(!file) return;
  resizeImageFile(file, 480, 0.9).then(dataUri=>{
    editingBusinessLogo = dataUri;
    const el = document.getElementById('obLogoPreview');
    if(el) el.innerHTML = `<img src="${dataUri}" alt="Prévia da logo" style="width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin-top:8px;display:block;">`;
  }).catch(()=>{ toast('Não consegui processar essa imagem — tente outro arquivo','err'); });
}
function skipOnboardingBrand(){
  state.settings.businessName = state.settings.businessName || 'Piece of Geek 3D';
  saveSettings(); render(); openOnboardingModal();
}
function confirmOnboardingBrand(){
  const name = document.getElementById('obBusinessName').value.trim();
  state.settings.businessName = name || 'Piece of Geek 3D';
  state.settings.businessLogo = editingBusinessLogo;
  saveSettings(); render(); openOnboardingModal();
}
function openOnboardingModal(){
  if(!state.settings.businessName){
    editingBusinessLogo = state.settings.businessLogo || null;
    showModal('Vamos começar', `
      <div class="field hint" style="margin-bottom:16px;">Antes de tudo: como se chama o seu negócio? O nome e a logo aparecem na barra lateral, no catálogo que você manda pro cliente, no recibo de venda e no app instalado no celular — dá pra trocar depois em Configurações.</div>
      <div class="field"><label>Nome do negócio</label><input id="obBusinessName" placeholder="Ex: Piece of Geek 3D"></div>
      <div class="field"><label>Logo (opcional)</label><input type="file" accept="image/*" id="obLogoInput" onchange="handleOnboardingLogoUpload(this)"></div>
      <div id="obLogoPreview">${editingBusinessLogo ? `<img src="${editingBusinessLogo}" alt="Prévia da logo" style="width:72px;height:72px;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin-top:8px;display:block;">` : ''}</div>
      <div class="modal-actions">
        <button class="btn ghost" onclick="skipOnboardingBrand()">Pular por agora</button>
        <button class="btn primary" onclick="confirmOnboardingBrand()">Salvar e continuar</button>
      </div>
    `);
    return;
  }
  const stepDone = {
    estoque: state.materials.length>0,
    investimentos: (state.settings.investments||[]).length>0,
    produtos: state.products.length>0,
    config: (state.settings.expenses||[]).length>0,
    clientes: state.customers.length>0,
    venda: state.sales.length>0,
    anuncios: (state.listings||[]).length>0,
  };
  const stepBadge = (done, num, colorClass) => done ? `<span class="badge ok" title="Concluído">✓</span>` : `<span class="badge ${colorClass}">${num}</span>`;
  showModal('Vamos configurar seu negócio', `
    <div class="field hint" style="margin-bottom:16px;">Essa é a ordem que faz os números baterem desde a primeira venda. Pode seguir na sequência ou fechar e voltar quando quiser — o link fica no rodapé do menu. O ✓ aparece sozinho quando você já fez aquele passo.</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="card" style="padding:14px 16px;${stepDone.estoque?'border:1px solid var(--green-dim);':''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${stepBadge(stepDone.estoque,1,'info')}<div style="font-weight:600;font-size:13.5px;">Cadastre sua matéria-prima</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">Filamentos, caixas e plástico bolha, com o preço que você realmente pagou. É a base de todo cálculo de custo do app.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('estoque');">Ir para Estoque</button>
      </div>
      <div class="card" style="padding:14px 16px;border:1px solid ${stepDone.investimentos?'var(--green-dim)':'var(--nozzle-dim)'};">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${stepBadge(stepDone.investimentos,2,'warn')}<div style="font-weight:600;font-size:13.5px;">Lance seus investimentos iniciais</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">O que você já gastou pra montar o negócio: impressora (se pagou à vista), estoque inicial de filamento, caixas em lote, ferramentas. Isso é o que a aba Anual usa pra mostrar quando o negócio se paga — sem isso, o saldo final fica sempre otimista demais.</div>
        <button class="btn sm primary" style="margin-left:30px;" onclick="closeModal(); switchTab('anual'); openInvestmentModal();">+ Adicionar investimento inicial</button>
      </div>
      <div class="card" style="padding:14px 16px;${stepDone.produtos?'border:1px solid var(--green-dim);':''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${stepBadge(stepDone.produtos,3,'info')}<div style="font-weight:600;font-size:13.5px;">Cadastre seus produtos</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">Peso, tempo de impressão, mão de obra e margem de lucro desejada de cada peça. O custo e o preço sugerido são calculados sozinhos a partir da matéria-prima do passo 1.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('produtos');">Ir para Produtos</button>
      </div>
      <div class="card" style="padding:14px 16px;${stepDone.config?'border:1px solid var(--green-dim);':''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${stepBadge(stepDone.config,4,'info')}<div style="font-weight:600;font-size:13.5px;">Configure taxas, despesas e a parcela da impressora</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">Taxas do Mercado Livre/Shopee, despesas mensais fixas e, se estiver financiando a impressora, o mês da 1ª parcela — as parcelas restantes passam a contar sozinhas a partir daí.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('taxas');">Ir para Taxas</button>
        <button class="btn sm" style="margin-left:8px;" onclick="closeModal(); switchTab('configuracoes');">Ir para Configurações</button>
      </div>
      <div class="card" style="padding:14px 16px;${stepDone.clientes?'border:1px solid var(--green-dim);':''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${stepBadge(stepDone.clientes,5,'info')}<div style="font-weight:600;font-size:13.5px;">Cadastre seus clientes (opcional)</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">Não é obrigatório — dá pra cadastrar um cliente novo na hora de registrar a venda. Mas ter cadastrado antes deixa o histórico de compras mais fácil de acompanhar.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('clientes');">Ir para Clientes</button>
      </div>
      <div class="card" style="padding:14px 16px;${stepDone.venda?'border:1px solid var(--green-dim);':''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${stepBadge(stepDone.venda,6,'ok')}<div style="font-weight:600;font-size:13.5px;">Registre sua primeira venda</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">A partir daqui o Dashboard, o Caixa, a aba Anual e a fila de Pedidos começam a se preencher sozinhos.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('vendas');">Ir para Vendas</button>
      </div>
    </div>

    <div class="section-title" style="margin-top:18px;">Anúncios</div>
    <div class="card" style="padding:14px 16px;${stepDone.anuncios?'border:1px solid var(--green-dim);':''}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">${stepDone.anuncios ? `<span class="badge ok" title="Concluído">✓</span>` : ''}<div style="font-size:12.5px;color:var(--text-dim);">Depois de cadastrar um produto (passo 3), gera o rascunho de anúncio já preenchido pra Mercado Livre e Shopee — título, categoria, dimensões, taxa.</div></div>
      <button class="btn sm" style="margin-top:6px;" onclick="closeModal(); switchTab('anuncios');">Ir para Anúncios</button>
    </div>

    <div class="section-title" style="margin-top:18px;">As outras abas</div>
    <div class="card" style="padding:14px 16px;">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">Essas não têm cadastro inicial — se preenchem sozinhas a partir da produção e das vendas. Só dar uma olhada quando quiser.</div>
      ${[
        {tab:'dashboard', label:'Dashboard', desc:'Visão geral do mês — vendas, produção e metas.'},
        {tab:'pedidos', label:'Pedidos', desc:'Fila de produção em Kanban, alimentada pelas vendas.'},
        {tab:'impressao', label:'Fila de Impressão', desc:'Onde você marca o que está imprimindo agora e registra falhas.'},
        {tab:'caixa', label:'Caixa', desc:'Fluxo de caixa do mês e fechamento de reservas.'},
        {tab:'calculo', label:'Cálculo', desc:'As fórmulas de custo, uma por uma — útil pra conferir o preço de um produto específico.'},
      ].map(t=>`
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line-soft);">
        <div>
          <div style="font-weight:600;font-size:12.5px;">${t.label}</div>
          <div style="font-size:11.5px;color:var(--text-faint);">${t.desc}</div>
        </div>
        <button class="btn ghost sm" onclick="closeModal(); switchTab('${t.tab}');">Ver</button>
      </div>`).join('')}
    </div>

    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Fechar, eu já sei o caminho</button>
    </div>
  `);
}
function syncStatusLabel(){
  if(!syncStatus.configured) return '☁️ Sincronizar entre dispositivos';
  if(!syncStatus.email) return '☁️ Fazer login na sincronização';
  return `☁️ ${syncStatus.email}`;
}
function openSyncModal(){
  if(!syncStatus.configured){
    showModal('Sincronizar entre dispositivos', `
      <div class="field hint" style="margin-bottom:14px;">Conecte uma conta grátis do Supabase pra acessar os mesmos dados do celular, do PC ou de qualquer lugar. Veja o passo a passo abaixo do formulário — leva uns 3 minutos, uma vez só.</div>
      <div class="field"><label>Project URL</label><input id="syncUrl" placeholder="https://xxxxxxxx.supabase.co"></div>
      <div class="field"><label>Publishable key (ou anon key)</label><input id="syncKey" placeholder="sb_publishable_... ou eyJhbGc..."></div>
      <div class="modal-actions">
        <button class="btn ghost" onclick="closeModal()">Cancelar</button>
        <button class="btn primary" onclick="confirmSyncConfig()">Conectar</button>
      </div>
      <div class="section-title" style="margin-top:22px;">Passo a passo (uma vez só)</div>
      <ol style="font-size:12.5px;color:var(--text-dim);line-height:2;padding-left:20px;margin:0;">
        <li>Crie uma conta grátis em <strong>supabase.com</strong> e clique em "New Project".</li>
        <li>No projeto criado, abra <strong>SQL Editor</strong> → "New query", cole o código abaixo e clique em "Run":</li>
      </ol>
      <textarea readonly style="width:100%;height:130px;font-family:var(--font-mono);font-size:10px;margin:8px 0;resize:vertical;" onclick="this.select()">create table app_data (
  user_id uuid references auth.users not null,
  key text not null,
  value text not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table app_data enable row level security;
create policy "own data" on app_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter publication supabase_realtime add table app_data;</textarea>
      <ol start="3" style="font-size:12.5px;color:var(--text-dim);line-height:2;padding-left:20px;margin:0;">
        <li>Vá em <strong>Settings → API Keys</strong>, copie a <strong>Project URL</strong> e a <strong>Publishable key</strong> (chamada de "anon key" em projetos mais antigos) e cole nos dois campos acima.</li>
        <li>Pra abrir esse app no celular, salve esse arquivo .html em algum lugar acessível por link — o jeito mais simples é arrastar o arquivo em <strong>netlify.com/drop</strong>, que gera um link na hora, sem precisar criar conta.</li>
      </ol>
    `);
    return;
  }
  if(!syncStatus.email){
    showModal('Login da sincronização', `
      <div class="field hint" style="margin-bottom:10px;">Primeira vez: clique em "Criar conta". Depois disso, use "Entrar" nesse e em qualquer outro dispositivo com o mesmo e-mail e senha.</div>
      <div class="field"><label>E-mail</label><input type="email" id="syncEmail"></div>
      <div class="field"><label>Senha</label><input type="password" id="syncPassword"></div>
      <div class="field hint" id="syncAuthMsg" style="color:var(--red);"></div>
      <div class="modal-actions" style="justify-content:space-between;">
        <button class="btn ghost" onclick="disconnectSync()">Desconectar</button>
        <div style="display:flex;gap:8px;">
          <button class="btn" onclick="doSyncAuth('signUp')">Criar conta</button>
          <button class="btn primary" onclick="doSyncAuth('signIn')">Entrar</button>
        </div>
      </div>
    `);
    return;
  }
  showModal('Sincronização', `
    <div class="field">Conectado como <strong>${syncStatus.email}</strong>. Os dados são compartilhados entre todos os dispositivos onde você fizer login com essa conta.</div>
    <div class="field hint" style="margin-top:-4px;">Se você conectou esse projeto antes desta versão, as mudanças de outro dispositivo só aparecem depois de recarregar a página. Pra ativar a atualização automática, rode uma vez no <strong>SQL Editor</strong> do seu projeto Supabase:</div>
    <textarea readonly style="width:100%;height:32px;font-family:var(--font-mono);font-size:10px;margin:0 0 12px;resize:vertical;" onclick="this.select()">alter publication supabase_realtime add table app_data;</textarea>
    <div class="modal-actions" style="justify-content:space-between;">
      <button class="btn ghost" onclick="disconnectSync()">Esquecer neste dispositivo</button>
      <button class="btn" onclick="doSyncSignOut()">Sair da conta</button>
    </div>
  `);
}
async function confirmSyncConfig(){
  const url = document.getElementById('syncUrl').value.trim();
  const key = document.getElementById('syncKey').value.trim();
  if(!url || !key){ toast('Preencha a URL e a chave','err'); return; }
  setSyncConfig(url, key);
  sbClient = null;
  const client = initSupabase();
  if(!client){ toast('Não consegui conectar — confira a URL e a chave','err'); clearSyncConfig(); return; }
  await refreshSyncStatus();
  toast('Conectado! Agora faça login ou crie sua conta.');
  render();
  openSyncModal();
}
async function doSyncAuth(mode){
  const client = initSupabase();
  if(!client) return;
  const email = document.getElementById('syncEmail').value.trim();
  const password = document.getElementById('syncPassword').value;
  const msgEl = document.getElementById('syncAuthMsg');
  if(!email || !password){ if(msgEl) msgEl.textContent = 'Preencha e-mail e senha.'; return; }
  try{
    const { data, error } = mode==='signUp'
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password });
    if(error){ if(msgEl) msgEl.textContent = error.message; return; }
    if(mode==='signUp' && data && data.user && !data.session){
      if(msgEl){ msgEl.style.color='var(--teal)'; msgEl.textContent = 'Conta criada! Se seu projeto exigir confirmação por e-mail, confira sua caixa de entrada antes de entrar.'; }
      return;
    }
    await refreshSyncStatus();
    closeModal();
    await afterSyncLogin();
    render();
  }catch(e){ if(msgEl) msgEl.textContent = 'Erro ao conectar — tente de novo.'; }
}
async function afterSyncLogin(){
  const client = initSupabase();
  const user = await getSyncUser();
  if(!client || !user) return;
  try{
    const { data } = await client.from('app_data').select('key').eq('user_id',user.id).limit(1);
    if(!data || data.length===0){
      if(confirm('Não encontrei dados na nuvem ainda pra essa conta. Enviar os dados que já estão salvos neste dispositivo como ponto de partida?')){
        await saveAll();
        toast('Dados enviados para a nuvem');
      }
    } else {
      toast('Puxando dados da nuvem...');
      await loadState();
    }
  }catch(e){ /* silencioso — segue com o que tem local */ }
  startRealtimeSync();
}
async function doSyncSignOut(){
  stopRealtimeSync();
  const client = initSupabase();
  if(client){ try{ await client.auth.signOut(); }catch(e){} }
  await refreshSyncStatus();
  toast('Sessão encerrada neste dispositivo');
  closeModal(); render();
}
function disconnectSync(){
  if(!confirm('Isso desconecta a sincronização neste dispositivo (os dados continuam salvos na nuvem, se você já tiver enviado algum). Continuar?')) return;
  stopRealtimeSync();
  clearSyncConfig();
  syncStatus = { configured:false, email:null };
  toast('Sincronização desconectada neste dispositivo');
  closeModal(); render();
}

/* ---------- Taxa real do Mercado Livre (Edge Functions ml-oauth-callback / ml-api) ---------- */
const ML_OAUTH_REDIRECT_URI = 'https://plskerczkhjvqahpyucd.supabase.co/functions/v1/ml-oauth-callback';
const ML_AUTHORIZE_URL = 'https://auth.mercadolivre.com.br/authorization';
function renderMlConnectSection(forceEdit){
  const s = state.settings;
  if(!syncStatus.email){
    return `<div class="field hint" style="margin-top:-6px;">Primeiro conecte e faça login na sincronização (☁️ no rodapé do menu) — a taxa real usa a mesma conta pra saber quem é você.</div>`;
  }
  if(!s.mlClientId || forceEdit){
    return `
      <div class="field hint" style="margin-top:-6px;margin-bottom:10px;">Conecte sua conta do Mercado Livre pra calcular a comissão real por categoria, em vez de uma % fixa estimada. Crie uma aplicação em developers.mercadolivre.com.br usando essa Redirect URI:</div>
      <textarea readonly style="width:100%;height:32px;font-family:var(--font-mono);font-size:10px;margin-bottom:10px;resize:vertical;" onclick="this.select()">${ML_OAUTH_REDIRECT_URI}</textarea>
      <div class="field"><label>Client ID</label><input id="cfgMlClientId" value="${s.mlClientId||''}" placeholder="Cole aqui o Client ID da aplicação"></div>
      <button class="btn ghost sm" onclick="saveMlClientId()">Salvar Client ID</button>
    `;
  }
  if(!s.mlConnected){
    return `
      <div class="field hint" style="margin-top:-6px;margin-bottom:10px;">Client ID salvo. Falta autorizar — isso te leva pro Mercado Livre pra confirmar o login (só essa vez).</div>
      <button class="btn primary sm" onclick="startMlOauth()">Conectar com Mercado Livre</button>
      <button class="btn ghost sm" onclick="editMlClientId()">Trocar Client ID</button>
    `;
  }
  return `
    <div class="field" style="color:var(--teal);font-weight:600;">✓ Conectado ao Mercado Livre</div>
    <div class="field hint" style="margin-top:-8px;">Agora cada produto pode buscar a taxa real por categoria (veja o cadastro do produto).</div>
    <button class="btn ghost sm" onclick="disconnectMl()">Desconectar</button>
  `;
}
function saveMlClientId(){
  const val = document.getElementById('cfgMlClientId').value.trim();
  if(!val){ toast('Cole o Client ID primeiro','err'); return; }
  state.settings.mlClientId = val;
  saveSettings();
  document.getElementById('mlConnectSection').innerHTML = renderMlConnectSection();
}
function editMlClientId(){
  document.getElementById('mlConnectSection').innerHTML = renderMlConnectSection(true);
}
async function startMlOauth(){
  const client = initSupabase();
  if(!client || !syncStatus.email){ toast('Faça login na sincronização primeiro','err'); return; }
  try{
    const { data, error } = await client.functions.invoke('ml-api', { body:{ action:'sign-state' } });
    if(error || !data || !data.state){ toast('Não consegui iniciar a conexão com o Mercado Livre — tente de novo','err'); return; }
    const url = `${ML_AUTHORIZE_URL}?response_type=code&client_id=${encodeURIComponent(state.settings.mlClientId)}&redirect_uri=${encodeURIComponent(ML_OAUTH_REDIRECT_URI)}&state=${encodeURIComponent(data.state)}`;
    window.location.href = url;
  }catch(e){
    toast('Não consegui iniciar a conexão com o Mercado Livre','err');
  }
}
function disconnectMl(){
  if(!confirm('Desconectar a taxa real do Mercado Livre neste app? (o token continua guardado no servidor, só paramos de usar)')) return;
  state.settings.mlConnected = false;
  saveSettings();
  document.getElementById('mlConnectSection').innerHTML = renderMlConnectSection();
  toast('Desconectado do Mercado Livre');
}
function checkMlAuthRedirect(){
  const params = new URLSearchParams(window.location.search);
  const mlAuth = params.get('ml_auth');
  if(!mlAuth) return;
  if(mlAuth==='ok'){
    state.settings.mlConnected = true;
    saveSettings();
    toast('Conectado ao Mercado Livre!');
  } else {
    toast('Não consegui conectar ao Mercado Livre — tente de novo em Taxas','err');
  }
  params.delete('ml_auth');
  const cleanUrl = window.location.pathname + (params.toString() ? '?'+params.toString() : '');
  window.history.replaceState({}, '', cleanUrl);
}
let mlCategorySearchTimer = null;
function searchMlCategory(q){
  clearTimeout(mlCategorySearchTimer);
  const resultsEl = document.getElementById('pMlCategoryResults');
  if(!resultsEl) return;
  if(!q || q.trim().length<3){ resultsEl.innerHTML=''; return; }
  mlCategorySearchTimer = setTimeout(async ()=>{
    const client = initSupabase();
    if(!client) return;
    try{
      const { data, error } = await client.functions.invoke('ml-api', { body:{ action:'search-category', q } });
      if(error || !data || !data.results) return;
      const items = data.results.slice(0,6);
      resultsEl.innerHTML = items.map(r=>`<div style="padding:6px 8px;border:1px solid var(--line);border-top:none;cursor:pointer;font-size:12px;background:var(--panel);" onmousedown="selectMlCategory('${r.category_id}','${(r.category_name||'').replace(/'/g,"\\'")}')">${r.category_name}</div>`).join('');
    }catch(e){ /* busca falhou — usuário pode tentar de novo digitando */ }
  }, 400);
}
function selectMlCategory(categoryId, categoryName){
  document.getElementById('pMlCategoryId').value = categoryId;
  document.getElementById('pMlCategorySearch').value = categoryName;
  document.getElementById('pMlCategoryResults').innerHTML = '';
}
async function fetchMlRealFee(){
  const categoryId = document.getElementById('pMlCategoryId').value.trim();
  const listingTypeId = document.getElementById('pMlListingType').value;
  if(!categoryId){ toast('Escolha uma categoria da lista de sugestões primeiro','err'); return; }
  const client = initSupabase();
  if(!client){ toast('Conecte a sincronização primeiro','err'); return; }
  const priceRaw = document.getElementById('pPriceMl').value;
  const form = readProductForm();
  if(form.mlRealFeePct===undefined) form.mlRealFeePct = editingProductMlFee;
  const price = priceRaw ? parseFloat(priceRaw) : calcProduct(form).suggestedPriceMl;
  const statusEl = document.getElementById('pMlFeeStatus');
  if(statusEl) statusEl.textContent = 'Buscando...';
  try{
    const { data, error } = await client.functions.invoke('ml-api', { body:{ action:'fee-lookup', price, categoryId, listingTypeId, weightG: totalWeight(form), lengthCm: form.lengthCm||0, widthCm: form.widthCm||0, heightCm: form.heightCm||0 } });
    if(error || !data || data.error || data.feePct==null){
      toast((data && data.error) || 'Não consegui buscar a taxa real — confira a conexão em Configurações','err');
      if(statusEl) statusEl.textContent = 'Falha ao buscar — tente de novo.';
      return;
    }
    editingProductMlFee = data.feePct;
    editingProductMlFeeUpdatedAt = new Date().toISOString();
    editingProductMlFeeUpdatedAtPrice = price;
    toast('Taxa real buscada — clique em Salvar pra guardar');
    if(statusEl) statusEl.innerHTML = `Taxa real: <strong>${num(data.feePct,1)}%</strong> (calculada em ${fmtDate(todayStr())} pra ${brl(price)}) — clique em Salvar pra guardar`;
    updateProductPreview();
  }catch(e){
    toast('Não consegui buscar a taxa real','err');
    if(statusEl) statusEl.textContent = 'Falha ao buscar — tente de novo.';
  }
}
function openResetModal(){
  showModal('Recomeçar do zero', `
    <div class="field hint" style="margin-bottom:14px;">Isso apaga <strong style="color:var(--text)">permanentemente</strong> tudo que está salvo neste navegador: matéria-prima, produtos, vendas, pedidos, encomendas e configurações. Antes de apagar, o app baixa um backup automático — se precisar voltar atrás, é só importar esse arquivo pelo botão "Importar".</div>
    <div class="field"><label>Digite APAGAR para confirmar</label><input id="resetConfirmText" placeholder="APAGAR" oninput="document.getElementById('resetBtn').disabled = this.value.trim().toUpperCase()!=='APAGAR'"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn" style="border-color:var(--red);color:var(--red);" id="resetBtn" disabled onclick="confirmReset()">Apagar tudo e recomeçar</button>
    </div>
  `);
}
function blankSettings(){
  const s = seedData().settings;
  s.businessName = '';
  s.businessLogo = null;
  s.machines = [];
  s.expenses = [];
  s.investments = [];
  s.laborHourlyRate = 0;
  s.reserveGoals.forEach(g=>{ g.goal = 0; g.balance = 0; });
  return s;
}
async function confirmReset(){
  exportBackup(true);
  await new Promise(r=>setTimeout(r,300));
  state = { materials: [], products: [], sales: [], orders: [], customers: [], printFailures: [], listings: [], customOrders: [], settings: blankSettings() };
  await saveAll();
  closeModal();
  currentTab = 'dashboard';
  render();
  toast('Backup automático baixado e dados apagados');
  openOnboardingModal();
}

function exportSalesExcel(){
  if(typeof XLSX==='undefined'){ toast('Biblioteca de exportação não carregou — verifique sua conexão e tente de novo','err'); return; }
  let list = state.sales.slice();
  if(salesFilter.platform) list = list.filter(s=>s.platform===salesFilter.platform);
  if(salesFilter.product) list = list.filter(s=>s.productId===salesFilter.product);
  if(salesFilter.from) list = list.filter(s=>s.date>=salesFilter.from);
  if(salesFilter.to) list = list.filter(s=>s.date<=salesFilter.to);
  if(list.length===0){ toast('Nenhuma venda para exportar com esses filtros','err'); return; }
  list.sort((a,b)=>a.date.localeCompare(b.date));
  const rows = [['Data','Produto','Cliente','Plataforma','Qtd','Preço bruto','Taxa','Líquido','Custo Produção','Frete','Desconto cupom','Lucro','Rastreio']];
  list.forEach(s=>{
    const cuName = s.customerId ? ((state.customers.find(cu=>cu.id===s.customerId)||{}).name||'') : 'Avulso';
    rows.push([s.date, s.productName, cuName, s.platform, s.qty, s.grossPrice, s.feeTotal, s.netReceipt, s.productionCost, s.shippingCost||0, s.couponDiscount||0, s.profit, s.trackingCode||'']);
  });
  const totals = list.reduce((a,s)=>({gross:a.gross+s.grossPrice,fee:a.fee+s.feeTotal,net:a.net+s.netReceipt,cost:a.cost+s.productionCost,shipping:a.shipping+(s.shippingCost||0),coupon:a.coupon+(s.couponDiscount||0),profit:a.profit+s.profit}),{gross:0,fee:0,net:0,cost:0,shipping:0,coupon:0,profit:0});
  rows.push([]);
  rows.push(['TOTAL', '', '', '', '', totals.gross, totals.fee, totals.net, totals.cost, totals.shipping, totals.coupon, totals.profit]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Vendas');
  XLSX.writeFile(wb, `piece-of-geek-vendas-${todayStr()}.xlsx`);
  toast('Vendas exportadas');
}
function exportCustomersExcel(){
  if(typeof XLSX==='undefined'){ toast('Biblioteca de exportação não carregou — verifique sua conexão e tente de novo','err'); return; }
  if(state.customers.length===0){ toast('Nenhum cliente para exportar','err'); return; }
  const rows = [['Nome','Contato','Qtd. vendas','Total comprado','Última compra','Observações']];
  state.customers.forEach(cu=>{
    const st = customerStats(cu.id);
    rows.push([cu.name, cu.contact||'', st.qtd, st.total, st.lastDate?fmtDate(st.lastDate):'', cu.notes||'']);
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Clientes');
  XLSX.writeFile(wb, `piece-of-geek-clientes-${todayStr()}.xlsx`);
  toast('Clientes exportados');
}
function exportOrdersExcel(){
  if(typeof XLSX==='undefined'){ toast('Biblioteca de exportação não carregou — verifique sua conexão e tente de novo','err'); return; }
  if(state.orders.length===0){ toast('Nenhuma encomenda para exportar','err'); return; }
  const rows = [['Cliente','Produto','Qtd','Status','Prazo','Criada em','Observações']];
  state.orders.slice().sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')).forEach(o=>{
    rows.push([orderCustomerName(o)||'Avulso', o.productName, o.qty, o.status, o.dueDate?fmtDate(o.dueDate):'', o.createdAt?fmtDate(o.createdAt.slice(0,10)):'', o.notes||'']);
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Pedidos');
  XLSX.writeFile(wb, `piece-of-geek-pedidos-${todayStr()}.xlsx`);
  toast('Pedidos exportados');
}

/* ===================== BACKUP (exportar / importar) ===================== */
function exportAnnualExcel(){
  if(typeof XLSX==='undefined'){ toast('Biblioteca de exportação não carregou — verifique sua conexão e tente de novo','err'); return; }
  const year = currentYear;
  const months = Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,'0')}`);
  const monthlyRows = [['Mês','Faturamento','Taxas','Receita Líquida','Custo Produção','Frete','Despesas','Lucro Bruto','Impostos','Lucro Operacional','Parcelas','Investimentos do mês']];
  months.forEach(ym=>{
    const a = blocoA(ym), b = blocoB(ym);
    const inv = investmentsDueInMonth(ym);
    monthlyRows.push([monthLabel(ym), a.faturamento, a.taxas, a.receitaLiquida, a.custoProducao, a.frete, a.despesas, a.lucroBruto, a.mei, a.lucroOperacional, b.dueAmount, inv]);
  });
  const y = blocoAYear(year);
  monthlyRows.push([]);
  monthlyRows.push(['TOTAL DO ANO', y.faturamento, y.taxas, y.receitaLiquida, y.custoProducao, y.frete, y.despesas, y.lucroBruto, y.mei, y.lucroOperacional, '', y.investimentosAno]);
  monthlyRows.push(['Reservas alocadas no ano', y.reservasAno]);
  monthlyRows.push(['Saldo final do ano', y.saldoFinal]);

  const salesRows = [['Data','Produto','Cliente','Plataforma','Qtd','Bruto','Taxa','Líquido','Custo Produção','Frete','Lucro']];
  state.sales.filter(s=>s.date && s.date.slice(0,4)===String(year)).sort((a,b)=>a.date.localeCompare(b.date)).forEach(s=>{
    const cuName = s.customerId ? ((state.customers.find(cu=>cu.id===s.customerId)||{}).name||'') : 'Avulso';
    salesRows.push([s.date, s.productName, cuName, s.platform, s.qty, s.grossPrice, s.feeTotal, s.netReceipt, s.productionCost, s.shippingCost||0, s.profit]);
  });

  const invRows = [['Item','Categoria','Data','Forma de pagamento','Valor total']];
  (state.settings.investments||[]).forEach(inv=>{
    invRows.push([inv.name, inv.category||'Outros', inv.date, inv.paymentType==='parcelado'?`${inv.installments}x`:'À vista', inv.value]);
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(monthlyRows), 'Resumo Mensal');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(salesRows), 'Vendas');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invRows), 'Investimentos');
  XLSX.writeFile(wb, `piece-of-geek-relatorio-${year}.xlsx`);
  toast('Relatório Excel exportado');
}
function exportBackup(silent){
  const data = {
    app:'piece-of-geek-gestao', version:2, exportedAt: new Date().toISOString(),
    materials: state.materials, products: state.products, sales: state.sales, orders: state.orders, customers: state.customers, printFailures: state.printFailures, listings: state.listings, customOrders: state.customOrders, settings: state.settings,
  };
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `piece-of-geek-backup-${todayStr()}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  try{ localStorage.setItem('pog3d_last_backup', todayStr()); }catch(e){}
  if(!silent) toast('Backup exportado');
}
function daysSinceLastBackup(){
  let last;
  try{ last = localStorage.getItem('pog3d_last_backup'); }catch(e){ last = null; }
  if(!last) return null;
  const d1 = new Date(last+'T00:00:00'), d2 = new Date(todayStr()+'T00:00:00');
  return Math.round((d2-d1)/86400000);
}
function importBackup(file){
  const reader = new FileReader();
  reader.onload = async (e) => {
    try{
      const data = JSON.parse(e.target.result);
      if(!Array.isArray(data.materials) || !Array.isArray(data.products) || !Array.isArray(data.sales)){
        throw new Error('formato inválido');
      }
      if(!confirm('Isso vai substituir todos os dados atuais (estoque, produtos, vendas, pedidos, configurações) pelos dados desse backup. Continuar?')) return;
      state.materials = migrateMaterials(data.materials);
      state.settings = Object.assign({}, seedData().settings, migrateSettings(data.settings || {}));
      state.products = migrateProducts(data.products);
      state.sales = data.sales;
      state.orders = Array.isArray(data.orders) ? data.orders : [];
      state.customers = Array.isArray(data.customers) ? data.customers : [];
      state.printFailures = migratePrintFailures(Array.isArray(data.printFailures) ? data.printFailures : []);
      state.listings = Array.isArray(data.listings) ? data.listings : [];
      state.customOrders = migrateCustomOrders(Array.isArray(data.customOrders) ? data.customOrders : []);
      backfillMachineHours();
      await saveAll();
      toast('Backup importado com sucesso');
      render();
    }catch(err){
      toast('Arquivo de backup inválido ou corrompido','err');
    }
  };
  reader.readAsText(file);
}

/* ===================== INIT ===================== */
loadState();
