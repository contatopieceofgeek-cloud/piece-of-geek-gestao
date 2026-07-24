/* ===================== STATE ===================== */
let state = { materials: [], products: [], sales: [], orders: [], customers: [], printFailures: [], listings: [], settings: {} };
let currentTab = 'dashboard';
let currentMonth;
let currentYear = new Date().getFullYear();
let salesFilter = { platform:'', product:'', from:'', to:'' };
let stockTab = 'materiais';

const uid = () => Math.random().toString(36).slice(2,10);
const brl = (n) => (isFinite(n)?n:0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num = (n,d=2) => (isFinite(n)?n:0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
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
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
currentMonth = todayStr().slice(0,7);

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
    {id:uid(),name:'Bambu Lab A1 Mini',price:2279,residual:227.9,lifeHours:5000,energyCostPerHour:0.0704,powerConsumptionKw:0.1,installmentValue:108.523809,installmentsTotal:21,startMonth:'2026-07',maintenanceLog:[]},
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
    printHoursPerDay:16,
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
  }
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
  settings.machines.forEach(m=>{ if(m.energyCostPerHour==null) m.energyCostPerHour = 0.0704; if(m.powerConsumptionKw==null) m.powerConsumptionKw = 0; if(!m.id) m.id = uid(); if(!Array.isArray(m.maintenanceLog)) m.maintenanceLog = []; });
  if(settings.energyTariffPerKwh==null) settings.energyTariffPerKwh = 0.75;
  if(settings.meiRevenueLimit==null) settings.meiRevenueLimit = 81000;
  if(settings.monthlyGoal==null) settings.monthlyGoal = 0;
  if(!settings.dasPaid) settings.dasPaid = {};
  if(settings.dasDueDay==null) settings.dasDueDay = 20;
  if(settings.dasEnabled==null) settings.dasEnabled = false;
  if(settings.pixKey==null) settings.pixKey = '';
  if(settings.pixMerchantName==null) settings.pixMerchantName = 'Piece of Geek 3D';
  if(settings.pixMerchantCity==null) settings.pixMerchantCity = 'Sao Paulo';
  if(settings.printHoursPerDay==null) settings.printHoursPerDay = 16;
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

async function storageGet(key){
  if(hasCloudStorage()){
    try{ const r = await window.storage.get(key); return r ? r.value : null; }catch(e){ return null; }
  }
  if(syncStatus.configured && syncStatus.email){
    try{
      const client = initSupabase();
      const user = await getSyncUser();
      if(client && user){
        const { data, error } = await client.from('app_data').select('value').eq('user_id',user.id).eq('key',key).maybeSingle();
        if(!error) return data ? data.value : null;
      }
    }catch(e){ /* sem conexão — cai pro cache local */ }
  }
  try{
    await migrateLocalStorageToIdb();
    const val = await idbGet(key);
    if(val!=null) return val;
    return localStorage.getItem(STORAGE_PREFIX+key);
  }catch(e){
    return localStorage.getItem(STORAGE_PREFIX+key);
  }
}
async function storageSet(key, value){
  if(hasCloudStorage()){
    try{ await window.storage.set(key, value); return true; }catch(e){ /* fall through to local storage as backup */ }
  }
  let localOk = false;
  try{ await idbSet(key, value); localOk = true; }
  catch(e){ try{ localStorage.setItem(STORAGE_PREFIX+key, value); localOk = true; }catch(e2){} }
  if(syncStatus.configured && syncStatus.email){
    try{
      const client = initSupabase();
      const user = await getSyncUser();
      if(client && user){
        await client.from('app_data').upsert(
          { user_id:user.id, key, value, updated_at:new Date().toISOString() },
          { onConflict:'user_id,key' }
        );
      }
    }catch(e){ /* sem conexão agora — fica salvo local, sincroniza no próximo save online */ }
  }
  return localOk;
}

async function loadState(){
  await refreshSyncStatus();
  try{
    const [m,p,s,o,cu,c,pf,li] = await Promise.all([
      storageGet('materials'), storageGet('products'), storageGet('sales'), storageGet('orders'), storageGet('customers'), storageGet('settings'), storageGet('printFailures'), storageGet('listings'),
    ]);
    if(!m && !p && !s && !o && !cu && !c && !pf && !li){
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
  render();
  if(!hasCloudStorage()){
    if(syncStatus.email) toast(`Sincronizado como ${syncStatus.email}`);
    else toast('Salvando no navegador (IndexedDB) — evite navegação anônima para não perder dados.');
  }
}
async function saveMaterials(){ const ok = await storageSet('materials', JSON.stringify(state.materials)); if(!ok) toast('Erro ao salvar estoque','err'); }
async function saveProducts(){ const ok = await storageSet('products', JSON.stringify(state.products)); if(!ok) toast('Erro ao salvar produtos','err'); }
async function saveSales(){ const ok = await storageSet('sales', JSON.stringify(state.sales)); if(!ok) toast('Erro ao salvar vendas','err'); }
async function saveOrders(){ const ok = await storageSet('orders', JSON.stringify(state.orders)); if(!ok) toast('Erro ao salvar encomendas','err'); }
async function savePrintFailures(){ const ok = await storageSet('printFailures', JSON.stringify(state.printFailures)); if(!ok) toast('Erro ao salvar falhas de impressão','err'); }
async function saveListings(){ const ok = await storageSet('listings', JSON.stringify(state.listings)); if(!ok) toast('Erro ao salvar anúncios','err'); }
async function saveCustomers(){ const ok = await storageSet('customers', JSON.stringify(state.customers)); if(!ok) toast('Erro ao salvar clientes','err'); }
async function saveSettings(){ const ok = await storageSet('settings', JSON.stringify(state.settings)); if(!ok) toast('Erro ao salvar configurações','err'); }
async function saveAll(){ await Promise.all([saveMaterials(),saveProducts(),saveSales(),saveOrders(),saveCustomers(),savePrintFailures(),saveListings(),saveSettings()]); }

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
function calcProduct(prod){
  const s = state.settings;
  const machine = findMachine(prod.machineId);
  const materialCost = (prod.filaments||[]).reduce((a,f)=>a+(f.weightG||0)*filamentCost(f.materialName),0);
  const energyCost = prod.timeH * machineEnergyCostPerHour(machine);
  const bCost = boxCost(prod.boxType);
  const bubbleCost = prod.bubbleWrapM * bubbleWrapUnitCost();
  const embalagemCost = bCost + bubbleCost;
  const depreciation = prod.timeH * machineDeprCostPerHour(machine);
  const laborCost = ((prod.laborMinutes||0)/60) * (s.laborHourlyRate||0);
  const failureCost = (materialCost + energyCost + depreciation) * prod.failureMarginPct;
  const totalCost = materialCost + energyCost + embalagemCost + depreciation + failureCost + laborCost;
  const defaultMargin = 1 - (1/(s.markupMultiplier||2.5));
  const desiredMargin = prod.desiredMarginPct!=null ? Math.min(0.95,Math.max(0,prod.desiredMarginPct/100)) : defaultMargin;
  const suggestedPrice = desiredMargin < 1 ? totalCost / (1 - desiredMargin) : totalCost * (s.markupMultiplier||2.5);
  const practicedPrice = prod.practicedPrice || suggestedPrice;
  const marginValue = practicedPrice - totalCost;
  const marginPct = practicedPrice > 0 ? (marginValue/practicedPrice)*100 : 0;
  return { materialCost, energyCost, boxCost:bCost, bubbleCost, embalagemCost, depreciation, laborCost, failureCost, totalCost, suggestedPrice, practicedPrice, marginValue, marginPct, desiredMarginPct: desiredMargin*100, machine };
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
  ];
}

/* ===================== RENDER SHELL ===================== */
function render(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
    <div class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-mark">PG</div>
        <div class="brand-text">Piece of Geek 3D<small>Gestão do negócio</small></div>
      </div>
      <div class="nav">
        ${navItem('dashboard','Dashboard')}
        ${navItem('pedidos','Pedidos')}
        ${navItem('impressao','Fila de Impressão')}
        ${navItem('vendas','Vendas')}
        ${navItem('clientes','Clientes')}
        ${navItem('produtos','Produtos')}
        ${navItem('anuncios','Anúncios')}
        ${navItem('estoque','Estoque',lowStockMaterials().length)}
        ${navItem('calculo','Cálculo')}
        ${navItem('caixa','Caixa',dasIsUrgent()?'!':0)}
        ${navItem('anual','Anual')}
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
  anuncios: '<path d="M10.5 2.5h5A1.5 1.5 0 0 1 17 4v5a1.5 1.5 0 0 1-.44 1.06l-7 7a1.5 1.5 0 0 1-2.12 0l-5-5a1.5 1.5 0 0 1 0-2.12l7-7a1.5 1.5 0 0 1 1.06-.44z"></path><circle cx="13.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"></circle>',
  estoque: '<rect x="2.5" y="3" width="15" height="4" rx="1"></rect><path d="M3.5 7v7a1.5 1.5 0 0 0 1.5 1.5h10a1.5 1.5 0 0 0 1.5-1.5V7"></path><line x1="8" y1="10.5" x2="12" y2="10.5"></line>',
  calculo: '<rect x="4" y="2.5" width="12" height="15" rx="2"></rect><rect x="6" y="4.5" width="8" height="3" rx="0.5"></rect><line x1="6.5" y1="11" x2="9" y2="11"></line><line x1="11" y1="11" x2="13.5" y2="11"></line><line x1="6.5" y1="14" x2="9" y2="14"></line><line x1="11" y1="14" x2="13.5" y2="14"></line>',
  caixa: '<rect x="2.5" y="5.5" width="15" height="10.5" rx="2"></rect><path d="M13.5 5.5V4A1.5 1.5 0 0 0 12 2.5H6A1.5 1.5 0 0 0 4.5 4v1.5"></path><circle cx="14" cy="11" r="1.1" fill="currentColor" stroke="none"></circle>',
  anual: '<rect x="3" y="4" width="14" height="13" rx="2"></rect><line x1="3" y1="8" x2="17" y2="8"></line><line x1="6.5" y1="2.5" x2="6.5" y2="5.5"></line><line x1="13.5" y1="2.5" x2="13.5" y2="5.5"></line><circle cx="7" cy="11.7" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="10" cy="11.7" r="0.9" fill="currentColor" stroke="none"></circle><circle cx="13" cy="11.7" r="0.9" fill="currentColor" stroke="none"></circle>',
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
function switchTab(t){ currentTab=t; closeSidebar(); render(); }
function tabTitle(){
  return {dashboard:'Dashboard',pedidos:'Pedidos',impressao:'Fila de Impressão',vendas:'Vendas',clientes:'Clientes',produtos:'Produtos',anuncios:'Anúncios',estoque:'Estoque',calculo:'Cálculo',caixa:'Caixa',anual:'Anual'}[currentTab];
}
function tabSubtitle(){
  return {
    dashboard:'Visão geral do seu negócio de impressão 3D',
    pedidos:'Fila de encomendas, da fila de impressão até o envio',
    impressao:'Todas as impressões — sucesso, teste ou falha',
    vendas:'Registro diário de vendas e recebimentos',
    clientes:'Quem compra de você, e quanto',
    produtos:'Calculadora de precificação e catálogo',
    anuncios:'Rascunhos de anúncio pra Mercado Livre e Shopee, por produto',
    estoque:'Matéria-prima e produtos prontos',
    calculo:'Como o app calcula depreciação, energia e mão de obra',
    caixa:'Resultado operacional, parcelas e reservas',
    anual:'Resultado do ano, investimentos iniciais e saldo final'
  }[currentTab];
}
function renderTopbarActions(){
  const el = document.getElementById('topbarActions');
  if(currentTab==='pedidos') el.innerHTML = `<button class="btn ghost" onclick="exportOrdersExcel()">Exportar</button> <button class="btn primary" onclick="openOrderModal()">+ Nova encomenda</button>`;
  else if(currentTab==='vendas') el.innerHTML = `<button class="btn ghost" onclick="openSettingsModal()">Taxas das plataformas</button> <button class="btn ghost" onclick="openKitModal()">Criar kit</button> <button class="btn ghost" onclick="exportSalesExcel()">Exportar</button> <button class="btn primary" onclick="openSaleModal()">+ Nova venda</button>`;
  else if(currentTab==='clientes') el.innerHTML = `<button class="btn ghost" onclick="exportCustomersExcel()">Exportar</button> <button class="btn primary" onclick="openCustomerModal()">+ Novo cliente</button>`;
  else if(currentTab==='produtos') el.innerHTML = `<button class="btn ghost" onclick="openQuickQuoteModal()">Orçamento rápido</button> <button class="btn ghost" onclick="exportCatalogImage()">Catálogo (imagem)</button> <button class="btn ghost" onclick="exportCatalogPDF()">Catálogo (PDF, 1 pág./produto)</button> <button class="btn primary" onclick="openProductModal()">+ Novo produto</button>`;
  else if(currentTab==='anuncios') el.innerHTML = '';
  else if(currentTab==='estoque') el.innerHTML = stockTab==='materiais' ? `<button class="btn primary" onclick="openMaterialModal()">+ Nova matéria-prima</button>` : `<button class="btn primary" onclick="switchTab('impressao')">Ir pra Fila de Impressão</button>`;
  else if(currentTab==='impressao') el.innerHTML = `<button class="btn primary" onclick="openPrintJobModal()">+ Nova impressão</button>`;
  else if(currentTab==='calculo') el.innerHTML = `<button class="btn primary" onclick="openSettingsModal()">Gerenciar impressoras</button>`;
  else if(currentTab==='anual') el.innerHTML = `<button class="btn ghost" onclick="exportAnnualExcel()">Exportar Excel</button> <button class="btn ghost" onclick="window.print()">Exportar PDF</button> <button class="btn primary" onclick="openInvestmentModal()">+ Adicionar investimento</button>`;
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
  else if(currentTab==='anuncios') c.innerHTML = renderAnuncios();
  else if(currentTab==='estoque') c.innerHTML = renderEstoque();
  else if(currentTab==='calculo') c.innerHTML = renderCalculo();
  else if(currentTab==='caixa') c.innerHTML = renderCaixa();
  else if(currentTab==='anual') c.innerHTML = renderAnual();
  if(currentTab==='dashboard') setTimeout(drawDashboardCharts,0);
  if(currentTab==='anual') setTimeout(drawAnnualChart,0);
  if(currentTab==='calculo') updateCalculoExample();
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
  const cutoffStr = cutoff.toISOString().slice(0,10);
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
  })).sort((a,b)=>b.profit-a.profit);
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
    <div class="row2">
      <div class="field"><label>Mão de obra (min)</label><input type="number" id="qtLabor" value="0" oninput="updateQuickQuotePreview()"></div>
      <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" id="qtMargin" value="${((1-1/(state.settings.markupMultiplier||2.5))*100).toFixed(0)}" oninput="updateQuickQuotePreview()"></div>
    </div>
    <div class="helper-block" id="qtPreview"></div>
    <div class="modal-actions" style="justify-content:space-between;">
      <button class="btn ghost" onclick="closeModal()">Fechar</button>
      <button class="btn primary" onclick="saveQuoteAsProduct()">Salvar como produto</button>
    </div>
  `);
  renderQuoteFilamentRows();
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
function buildQuoteDraft(){
  return {
    name: document.getElementById('qtDesc').value.trim() || 'Orçamento sem nome',
    filaments: quoteFilaments,
    timeH: parseFloat(document.getElementById('qtTimeH').value)||0,
    bubbleWrapM: 0,
    boxType: document.getElementById('qtBox').value,
    failureMarginPct: 0.10,
    laborMinutes: parseFloat(document.getElementById('qtLabor').value)||0,
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
    <div class="calc-line total"><span>Preço sugerido (margem ${num(draft.desiredMarginPct,0)}%)</span><span style="color:var(--green)">${brl(c.suggestedPrice)}</span></div>
  `;
}
function saveQuoteAsProduct(){
  const draft = buildQuoteDraft();
  if(draft.filaments.every(f=>!f.weightG)){ toast('Informe o peso de pelo menos um filamento','err'); return; }
  const c = calcProduct(draft);
  state.products.push({
    id:uid(), name:draft.name, filaments:draft.filaments, timeH:draft.timeH, bubbleWrapM:draft.bubbleWrapM,
    boxType:draft.boxType, failureMarginPct:draft.failureMarginPct, laborMinutes:draft.laborMinutes,
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
  const hoursPerDay = state.settings.printHoursPerDay||16;
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
  const hoursPerDay = state.settings.printHoursPerDay||16;
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
  const isStockCategory = cat==='Filamento' || cat==='Embalagem';
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
  if((category==='Filamento'||category==='Embalagem') && document.getElementById('invAddStock') && document.getElementById('invAddStock').checked){
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
        <h1 style="font-size:22px;margin:0 0 4px;color:#BD4119;">Piece of Geek 3D</h1>
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
function exportCatalogPDF(){
  if(state.products.length===0){ toast('Cadastre produtos antes de exportar o catálogo','err'); return; }
  const items = state.products.slice().sort((a,b)=>a.name.localeCompare(b.name));

  const summaryRows = items.map((p,i)=>{
    const price = calcProduct(p).practicedPrice;
    return `<div style="display:flex;align-items:center;gap:14px;padding:10px 12px;page-break-inside:avoid;${i%2===0?'background:#F6F7F9;':''}border-radius:8px;">
      ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:46px;height:46px;object-fit:cover;border-radius:6px;">` : `<div style="width:46px;height:46px;border-radius:6px;background:#eee;"></div>`}
      <div style="flex:1;font-size:14px;color:#1A1D23;">${p.name}</div>
      <div style="font-weight:bold;font-size:14px;color:#0B7A6B;">${brl(price)}</div>
    </div>`;
  }).join('');

  const productPages = items.map(p=>{
    const c = calcProduct(p);
    const filSummary = (p.filaments||[]).map(f=>`${f.materialName} ${num(f.weightG,0)}g`).join(' + ');
    return `<div class="catalog-page" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
      ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="max-width:320px;max-height:320px;object-fit:cover;border-radius:14px;margin-bottom:26px;box-shadow:0 4px 16px rgba(0,0,0,0.15);">` : ''}
      <h1 style="font-size:30px;margin:0 0 12px;color:#1A1D23;">${p.name}</h1>
      <div style="font-size:34px;font-weight:bold;margin-bottom:22px;color:#0B7A6B;">${brl(c.practicedPrice)}</div>
      <div style="font-size:13.5px;color:#5D6270;line-height:2;max-width:420px;">
        ${filSummary ? `Filamento: ${filSummary}<br>` : ''}
        Peso total: ${num(totalWeight(p),0)}g &nbsp;·&nbsp; Tempo de impressão: ${num(p.timeH,1)}h
        ${p.kitComponents && p.kitComponents.length ? `<br>Composição: ${p.kitComponents.map(kc=>`${kc.qty>1?kc.qty+'x ':''}${kc.productName}`).join(' + ')}` : ''}
      </div>
    </div>`;
  }).join('');

  printHTML(`
    <div class="catalog-summary">
      <h1 style="font-size:28px;margin:0 0 4px;color:#BD4119;">Piece of Geek 3D</h1>
      <div style="color:#5D6270;font-size:13px;margin-bottom:18px;">Catálogo de produtos — atualizado em ${new Date().toLocaleDateString('pt-BR')}</div>
      <div style="border-top:1px solid #E2E4E9;margin-bottom:8px;"></div>
      ${summaryRows}
      <div style="border-top:1px solid #E2E4E9;margin-top:8px;padding-top:10px;color:#5D6270;font-size:11.5px;">Preços sujeitos a alteração sem aviso prévio · Consulte disponibilidade</div>
    </div>
    ${productPages}
  `);
}
async function exportCatalogImage(){
  if(state.products.length===0){ toast('Cadastre produtos antes de exportar o catálogo','err'); return; }
  const items = state.products.slice().sort((a,b)=>a.name.localeCompare(b.name));
  toast('Gerando catálogo...');

  const loadImg = (src) => new Promise((resolve)=>{
    if(!src){ resolve(null); return; }
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = ()=>resolve(null);
    img.src = src;
  });
  const images = await Promise.all(items.map(p=>loadImg(p.photo)));

  const width = 900;
  const rowH = 64;
  const thumbSize = 48;
  const headerH = 130;
  const footerH = 50;
  const height = headerH + items.length*rowH + footerH;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0,0,width,height);

  ctx.fillStyle = '#BD4119';
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.fillText('Piece of Geek 3D', 36, 55);
  ctx.fillStyle = '#6B7080';
  ctx.font = '16px Arial, sans-serif';
  ctx.fillText('Catálogo de produtos — atualizado em ' + new Date().toLocaleDateString('pt-BR'), 36, 82);

  ctx.strokeStyle = '#E2E4E9';
  ctx.beginPath(); ctx.moveTo(36,102); ctx.lineTo(width-36,102); ctx.stroke();

  let y = headerH;
  items.forEach((p,i)=>{
    const rowTop = y - 40;
    if(i%2===0){ ctx.fillStyle='#F6F7F9'; ctx.fillRect(20,rowTop,width-40,rowH); }
    const img = images[i];
    const textX = img ? 36+thumbSize+16 : 36;
    if(img){
      const rx=36, ry=rowTop+(rowH-thumbSize)/2, rw=thumbSize, rh=thumbSize, rad=8;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx+rad, ry);
      ctx.arcTo(rx+rw, ry, rx+rw, ry+rh, rad);
      ctx.arcTo(rx+rw, ry+rh, rx, ry+rh, rad);
      ctx.arcTo(rx, ry+rh, rx, ry, rad);
      ctx.arcTo(rx, ry, rx+rw, ry, rad);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, rx, ry, rw, rh);
      ctx.restore();
    }
    const price = calcProduct(p).practicedPrice;
    ctx.fillStyle = '#1A1D23';
    ctx.font = '18px Arial, sans-serif';
    ctx.textAlign = 'left';
    let name = p.name;
    const maxNameWidth = (width-36-140) - textX;
    while(ctx.measureText(name).width > maxNameWidth && name.length>3){ name = name.slice(0,-1); }
    if(name!==p.name) name = name.slice(0,-1)+'…';
    ctx.fillText(name, textX, y);
    ctx.fillStyle = '#0B7A6B';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(brl(price), width-36, y);
    y += rowH;
  });

  ctx.strokeStyle = '#E2E4E9';
  ctx.beginPath(); ctx.moveTo(36,y-40); ctx.lineTo(width-36,y-40); ctx.stroke();
  ctx.fillStyle = '#686D7C';
  ctx.font = '13px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Preços sujeitos a alteração sem aviso prévio · Consulte disponibilidade', 36, y);

  const link = document.createElement('a');
  link.download = `catalogo-piece-of-geek-3d-${todayStr()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('Catálogo exportado como imagem');
}

/* ===================== FILA DE IMPRESSÃO ===================== */
function printJobRecipe(prod){
  const bw = (bubbleWrapMaterial()||{}).name || 'Plástico Bolha';
  return productRecipe(prod).filter(r=>r.materialName!==prod.boxType && r.materialName!==bw);
}
function packagingRecipe(prod){
  const bw = (bubbleWrapMaterial()||{}).name || 'Plástico Bolha';
  return productRecipe(prod).filter(r=>r.materialName===prod.boxType || r.materialName===bw);
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
        <thead><tr><th>Data</th><th>Produto</th><th class="right">Qtd</th><th>Resultado</th><th class="right">Prejuízo</th><th>Obs.</th><th></th></tr></thead>
        <tbody>${recent.map(f=>`<tr>
          <td class="num" data-label="Data">${fmtDate(f.date)}</td>
          <td data-label="Produto">${f.productName}</td>
          <td class="right num" data-label="Qtd">${num(f.qty||1,0)}${f.outcome==='failure'&&f.pctComplete<100?` (${num(f.pctComplete,0)}%)`:''}</td>
          <td data-label="Resultado">${outcomeBadge(f.outcome)}</td>
          <td class="right num" data-label="Prejuízo" style="color:var(--red)">${f.totalLoss?brl(f.totalLoss):'—'}</td>
          <td data-label="Obs.">${f.notes||'—'}</td>
          <td class="right"><button class="btn ghost sm" onclick="deletePrintJob('${f.id}')">Excluir</button></td>
        </tr>`).join('')}</tbody>
      </table></div>` : emptyState('Nenhuma impressão registrada ainda. Clique em "Nova impressão" pra começar.')}
    </div>
  `;
}
function openPrintJobModal(productId, presetQty, presetOutcome){
  if(state.products.length===0){ toast('Cadastre um produto antes de registrar uma impressão','err'); return; }
  const selId = productId || state.products[0].id;
  showModal('Nova impressão', `
    <div class="field"><label>Produto</label><select id="pjProd" onchange="updatePrintJobPreview()">
      ${state.products.map(p=>`<option value="${p.id}" ${p.id===selId?'selected':''}>${p.name}</option>`).join('')}
    </select></div>
    <div class="row3">
      <div class="field"><label>Quantidade</label><input type="number" id="pjQty" value="${presetQty||1}" min="1" oninput="updatePrintJobPreview()"></div>
      <div class="field"><label>Data</label><input type="date" id="pjDate" value="${todayStr()}"></div>
      <div class="field"><label>Resultado</label><select id="pjOutcome" onchange="updatePrintJobPreview()">
        <option value="success" ${(!presetOutcome||presetOutcome==='success')?'selected':''}>Sucesso — vai pro estoque</option>
        <option value="test" ${presetOutcome==='test'?'selected':''}>Teste — não vai pro estoque de venda</option>
        <option value="failure" ${presetOutcome==='failure'?'selected':''}>Falhou</option>
      </select></div>
    </div>
    <div id="pjPctBlock" style="display:none;"><div class="field"><label>% concluído antes de falhar</label><input type="number" id="pjPct" value="100" min="1" max="100" oninput="updatePrintJobPreview()"></div></div>
    <div class="field"><label>Observações (opcional)</label><input id="pjNotes" placeholder="Ex: descolou da mesa, entupiu o bico..."></div>
    <div class="field hint" style="margin-top:-8px;">Caixa e plástico bolha não são descontados aqui — só saem do estoque na hora da venda. Só o filamento sai agora.</div>
    <div class="helper-block" id="pjPreview"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmPrintJob()">Registrar impressão</button>
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
  const lines = recipe.map(r=>{
    const mat = materialByName(r.materialName);
    const need = r.qty*qty*(pct/100);
    const after = mat ? mat.stock-need : -need;
    return `<div class="calc-line"><span>${r.materialName} (${num(need,1)} ${mat?mat.unit:''})</span><span style="color:${after<0?'var(--red)':'var(--text-dim)'}">${mat?num(mat.stock,1):'0'} → ${num(after,1)}</span></div>`;
  }).join('');
  const stockLine = outcome==='success'
    ? `<div class="calc-line total"><span>Estoque de "${prod.name}" após produção</span><span>${num(prod.stock,0)} → ${num(prod.stock+qty,0)}</span></div>`
    : `<div class="field hint" style="margin-top:6px;">${outcome==='test'?'Teste não soma no estoque disponível pra venda.':'Falha não soma no estoque.'}</div>`;
  document.getElementById('pjPreview').innerHTML = lines + stockLine;
}
function confirmPrintJob(){
  const prod = state.products.find(p=>p.id===document.getElementById('pjProd').value);
  const qty = parseFloat(document.getElementById('pjQty').value)||0;
  if(qty<=0){ toast('Informe uma quantidade válida','err'); return; }
  const outcome = document.getElementById('pjOutcome').value;
  const date = document.getElementById('pjDate').value || todayStr();
  const notes = document.getElementById('pjNotes').value.trim();
  const pctComplete = outcome==='failure' ? Math.min(100,Math.max(1,parseFloat(document.getElementById('pjPct').value)||100)) : 100;

  const c = calcProduct(prod);
  const recipe = printJobRecipe(prod);
  let negativeWarn = false;
  recipe.forEach(r=>{
    const mat = materialByName(r.materialName);
    if(mat){ mat.stock -= r.qty*qty*(pctComplete/100); if(mat.stock<0) negativeWarn=true; }
  });

  let totalLoss = 0, materialCost = 0, energyCost = 0;
  if(outcome==='success') prod.stock += qty;
  if(outcome==='failure'){
    materialCost = c.materialCost*qty*(pctComplete/100);
    energyCost = c.energyCost*qty*(pctComplete/100);
    totalLoss = materialCost+energyCost;
  }
  const machines = state.settings.machines||[];
  const machine = machines.find(m=>m.id===prod.machineId) || machines[0];
  if(machine){ machine.hoursUsed = (machine.hoursUsed||0) + qty*(prod.timeH||0)*(pctComplete/100); }

  state.printFailures.push({ id:uid(), date, productId:prod.id, productName:prod.name, qty, outcome, pctComplete, materialCost, energyCost, totalLoss, notes });
  saveMaterials(); savePrintFailures(); if(outcome==='success') saveProducts(); if(machine) saveSettings();

  const msgs = { success:'Impressão registrada — estoque atualizado', test:'Impressão de teste registrada', failure:`Falha registrada — prejuízo de ${brl(totalLoss)}` };
  toast((negativeWarn?'Atenção: estoque de matéria-prima negativo — ':'') + msgs[outcome], negativeWarn?'err':'');
  closeModal(); renderContent();
}
function deletePrintJob(id){
  const j = state.printFailures.find(x=>x.id===id);
  if(!j) return;
  if(!confirm(`Excluir esse registro de impressão? O material usado volta pro estoque${j.outcome==='success'?' e o estoque do produto é ajustado':''}.`)) return;
  const prod = state.products.find(p=>p.id===j.productId);
  if(prod){
    printJobRecipe(prod).forEach(r=>{
      const mat = materialByName(r.materialName);
      if(mat) mat.stock += r.qty * (j.qty||1) * (j.pctComplete/100);
    });
    if(j.outcome==='success') prod.stock = Math.max(0, prod.stock - (j.qty||1));
    const machines = state.settings.machines||[];
    const machine = machines.find(m=>m.id===prod.machineId) || machines[0];
    if(machine){ machine.hoursUsed = Math.max(0, (machine.hoursUsed||0) - (j.qty||1)*(prod.timeH||0)*(j.pctComplete/100)); saveSettings(); }
    saveMaterials(); if(j.outcome==='success') saveProducts();
  }
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
          <div style="font-weight:600;font-size:13.5px;">5. Custo de mão de obra</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">(minutos de pós-processamento ÷ 60) × valor da sua hora</div>
          <div style="font-size:12px;color:var(--text-dim);">Pintura, montagem, acabamento — qualquer trabalho manual depois que a peça sai da impressora.</div>
        </div>
        <div>
          <div style="font-weight:600;font-size:13.5px;">6. Custo de falha</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">(material + energia + depreciação) × margem de falha%</div>
          <div style="font-size:12px;color:var(--text-dim);">Cobre o risco de uma impressão falhar antes de terminar. Só entra material, energia e depreciação — embalagem e mão de obra são gastos que só acontecem depois que a peça já saiu boa, então não têm risco de falha.</div>
        </div>
        <div style="border-top:1px solid var(--line);padding-top:14px;">
          <div style="font-weight:600;font-size:13.5px;">Custo total</div>
          <div class="chip" style="font-family:var(--font-mono);margin:5px 0;">material + energia + embalagem + depreciação + mão de obra + falha</div>
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
      <div class="calc-line"><span>Embalagem (caixa + plástico bolha)</span><span>${brl(c.embalagemCost)}</span></div>
      <div class="calc-line"><span>Depreciação (${prod.timeH}h × ${brl(c.machine?machineDeprCostPerHour(c.machine):0)}/h em ${c.machine?c.machine.name:'—'})</span><span>${brl(c.depreciation)}</span></div>
      <div class="calc-line"><span>Mão de obra (${prod.laborMinutes||0}min × ${brl(state.settings.laborHourlyRate||0)}/h)</span><span>${brl(c.laborCost)}</span></div>
      <div class="calc-line"><span>Custo de falha (${num(prod.failureMarginPct*100,0)}% sobre material+energia+depreciação)</span><span>${brl(c.failureCost)}</span></div>
      <div class="calc-line total"><span>Custo total</span><span>${brl(c.totalCost)}</span></div>
      <div class="calc-line"><span>Preço sugerido (margem de ${num(c.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
      <div class="calc-line"><span>Preço praticado</span><span>${brl(c.practicedPrice)}</span></div>
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
function newCartItem(productId, qty){
  const prod = state.products.find(p=>p.id===productId) || state.products[0];
  return { rowId: uid(), productId: prod.id, qty: qty||1, unitPrice: calcProduct(prod).practicedPrice };
}
function openSaleModal(presetProductId, presetQty, presetOrderId){
  if(state.products.length===0){ toast('Cadastre um produto antes de registrar vendas','err'); return; }
  cartItems = [ newCartItem(presetProductId || state.products[0].id, presetQty||1) ];
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
      <div class="field"><label>Plataforma</label><select id="sPlat" onchange="updateFeeDefaults(); updateSalePreview()">
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
function addCartItem(){
  cartItems.push(newCartItem(state.products[0].id, 1));
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
    item.unitPrice = calcProduct(state.products.find(p=>p.id===val)).practicedPrice;
    renderCartItemsList();
  } else if(field==='qty'){
    item.qty = Math.max(1, parseInt(val)||1);
  } else if(field==='unitPrice'){
    item.unitPrice = parseFloat(val)||0;
  }
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
    tierNote = `<div class="field hint" style="margin-top:-8px;margin-bottom:12px;color:var(--teal);">Faixa aplicada automaticamente: até ${tier.max===Infinity?'qualquer valor':brl(tier.max)} → ${tier.pct}%${tier.fixed?' + '+brl(tier.fixed):''} (tabela oficial Shopee 2026)</div>`;
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
      <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" id="kitMargin" value="${((1-1/(state.settings.markupMultiplier||2.5))*100).toFixed(0)}" step="1" oninput="document.getElementById('kitPrice').dataset.touched=''; updateKitPreview()"></div>
    </div>
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
  const machineId = document.getElementById('kitMachine').value;
  const desiredMarginPct = parseFloat(document.getElementById('kitMargin').value)||0;
  const items = Object.entries(editingKitItems).map(([pid,qty])=>({ prod: state.products.find(p=>p.id===pid), qty })).filter(x=>x.prod);
  const filamentMap = {};
  let timeH=0, laborMinutes=0, failureSum=0;
  items.forEach(({prod,qty})=>{
    (prod.filaments||[]).forEach(f=>{ filamentMap[f.materialName] = (filamentMap[f.materialName]||0) + (f.weightG||0)*qty; });
    timeH += (prod.timeH||0)*qty;
    laborMinutes += (prod.laborMinutes||0)*qty;
    failureSum += (prod.failureMarginPct||0.1);
  });
  const filaments = Object.entries(filamentMap).map(([materialName,weightG])=>({materialName,weightG}));
  const failureMarginPct = items.length ? failureSum/items.length : 0.1;
  return { items, filaments, timeH, laborMinutes, failureMarginPct, boxType, bubbleWrapM, machineId, desiredMarginPct };
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
    <div class="calc-line"><span>Preço sugerido (margem ${num(draft.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
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
    id:uid(), name, filaments:draft.filaments, timeH:draft.timeH, bubbleWrapM:draft.bubbleWrapM,
    boxType:draft.boxType, failureMarginPct:draft.failureMarginPct, laborMinutes:draft.laborMinutes,
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
  const rows = list.map(({p,c})=>{
    const filSummary = (p.filaments||[]).map(f=>`${f.materialName} ${num(f.weightG,0)}g`).join(' + ');
    return `<tr>
      <td data-label="Foto">${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;">` : `<div style="width:36px;height:36px;border-radius:6px;background:var(--panel-2);"></div>`}</td>
      <td data-label="Produto">${p.name}${p.kitComponents && p.kitComponents.length ? `<div style="font-size:11px;font-style:italic;color:var(--text-faint);margin-top:2px;">${p.kitComponents.map(kc=>`${kc.qty>1?kc.qty+'x ':''}${kc.productName}`).join(' + ')}</div>` : ''}</td>
      <td title="${filSummary}" data-label="Filamentos">${filSummary}</td>
      <td data-label="Impressora">${c.machine ? c.machine.name : '<span class="badge bad">nenhuma</span>'}</td>
      <td class="right num" data-label="Peso total">${num(totalWeight(p),0)}g</td>
      <td class="right num" data-label="Tempo">${num(p.timeH,1)}h</td>
      <td class="right num" data-label="Custo total">${brl(c.totalCost)}</td>
      <td class="right num" data-label="Preço sugerido">${brl(c.suggestedPrice)}</td>
      <td class="right num" data-label="Preço praticado">${brl(c.practicedPrice)}</td>
      <td class="right num" data-label="Margem" style="color:${c.marginValue<0?'var(--red)':'var(--green)'}">${pct(c.marginPct)}</td>
      <td class="right num" data-label="Estoque">${p.stock<=0?`<span class="badge mut">0</span>`:num(p.stock,0)}</td>
      <td class="right"><button class="btn ghost sm" onclick="openProductModal('${p.id}')">Editar</button> <button class="btn ghost sm" onclick="duplicateProduct('${p.id}')">Duplicar</button> <button class="btn ghost sm" onclick="deleteProduct('${p.id}')">Excluir</button></td>
    </tr>`;
  }).join('');
  return `
    <div class="filter-bar">
      <div class="field"><label>Buscar</label><input value="${produtosFilter.search}" placeholder="Nome ou filamento..." oninput="produtosFilter.search=this.value; renderContent();"></div>
      <div class="field"><label>Impressora</label><select onchange="produtosFilter.machineId=this.value; renderContent();">
        <option value="">Todas</option>
        ${machines.map(m=>`<option value="${m.id}" ${produtosFilter.machineId===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select></div>
      <div class="field hint" style="padding-top:9px;">${list.length} de ${state.products.length} produto(s) · clique no cabeçalho pra ordenar</div>
      ${(produtosFilter.search||produtosFilter.machineId) ? `<button class="btn ghost sm" onclick="produtosFilter.search=''; produtosFilter.machineId=''; renderContent();">Limpar filtros</button>` : ''}
    </div>
    <div class="card"><div class="tbl-wrap tbl-responsive tbl-compact-mobile"><table>
    <thead><tr>
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
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="12" style="text-align:center;color:var(--text-faint);padding:20px;">Nenhum produto encontrado</td></tr>`}</tbody>
  </table></div></div>`;
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
    {key:'fotos', label:'Fotos (nomes/ordem, capa primeiro)'},
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
    {key:'imagens', label:'Imagens (principal + até 8, ordem)'},
    {key:'peso', label:'Peso do pacote (kg)'},
    {key:'dimensoes', label:'Dimensões do pacote C x L x A (cm)'},
    {key:'preVenda', label:'Pré-venda (Sim/Não)', type:'select', options:['Não','Sim']},
    {key:'envio', label:'Opções de envio', presets:['Frete Grátis Shopee, Correios','Correios, Transportadora','Correios']},
  ],
};
function listingFor(productId){ return state.listings.find(l=>l.productId===productId); }
function listingHasContent(l){
  if(!l) return false;
  if((l.fotos||[]).length) return true;
  return ['ml','shopee'].some(plat => LISTING_FIELDS[plat].some(f => (l[plat]||{})[f.key]));
}
function listingIsComplete(l){
  if(!l) return false;
  return ['ml','shopee'].every(plat => LISTING_FIELDS[plat].every(f => (l[plat]||{})[f.key]));
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
  const preco = num(c.practicedPrice,2);
  const peso = num(totalWeight(p)/1000,2);
  const sku = generateSku(p);
  return {
    ml: { titulo:p.name.slice(0,60), preco, estoque:p.stock, sku, condicao:'Novo', marca:'Piece of Geek 3D', peso, tipoAnuncio:'Clássico' },
    shopee: { nome:p.name.slice(0,120), preco, estoque:p.stock, sku, marca:'Piece of Geek 3D', peso },
  };
}
// Preenche os campos em branco com o valor automático, mas nunca sobrescreve o que o usuário já preencheu.
function mergeListingValues(auto, existing){
  const out = Object.assign({}, auto);
  if(existing) Object.keys(existing).forEach(k=>{ if(existing[k]) out[k] = existing[k]; });
  return out;
}
function listingFieldSuggestions(platform, key, presets){
  const fromHistory = state.listings.map(l=>(l[platform]||{})[key]).filter(Boolean);
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
function renderAnunciosLista(){
  const q = anunciosFilter.search.toLowerCase();
  const list = q ? state.products.filter(p=>p.name.toLowerCase().includes(q)) : state.products;
  const searchBar = `<div class="filter-bar">
    <div class="field"><label>Buscar</label><input value="${anunciosFilter.search}" placeholder="Nome do produto..." oninput="anunciosFilter.search=this.value; renderContent();"></div>
  </div>`;
  if(q && list.length===0) return searchBar + `<div class="card">${emptyState('Nenhum produto encontrado')}</div>`;
  const rows = list.map(p=>{
    const l = listingFor(p.id);
    const hasContent = listingHasContent(l);
    const complete = listingIsComplete(l);
    const updatedTag = `<span style="color:var(--text-faint);font-size:11px;">atualizado ${fmtDate(((l&&l.updatedAt)||'').slice(0,10))}</span>`;
    const status = !hasContent ? `<span class="badge mut">Sem anúncio</span>`
      : complete ? `<span class="badge ok">Pronto</span> ${updatedTag}`
      : `<span class="badge warn">Incompleto</span> ${updatedTag}`;
    return `<tr>
      <td data-label="Produto">${p.name}</td>
      <td data-label="Preço" class="right num">${brl(calcProduct(p).practicedPrice)}</td>
      <td data-label="Status">${status}</td>
      <td class="right"><button class="btn ghost sm" onclick="openListingModal('${p.id}')">${hasContent?'Editar anúncio':'Criar anúncio'}</button></td>
    </tr>`;
  }).join('');
  return searchBar + `<div class="card"><div class="tbl-wrap tbl-responsive"><table>
    <thead><tr><th>Produto</th><th class="right">Preço</th><th>Status</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div></div>`;
}
function renderAnunciosProntos(){
  const ready = state.products.map(p=>({p, l:listingFor(p.id)})).filter(({l})=>listingIsComplete(l));
  if(ready.length===0) return `<div class="card">${emptyState('Nenhum anúncio pronto ainda — complete todos os campos de um produto na aba Lista')}</div>`;
  const cards = ready.map(({p,l})=>{
    const titulo = l.ml.titulo || l.shopee.nome || p.name;
    const preco = l.ml.preco || l.shopee.preco || num(calcProduct(p).practicedPrice,2);
    const estoque = l.ml.estoque || l.shopee.estoque || p.stock;
    const descricao = l.ml.descricao || l.shopee.descricao || '';
    const photos = [...(l.fotos||[]), ...(p.photo?[p.photo]:[])];
    const cover = photos[0];
    const thumbs = photos.length>1 ? `<div style="display:flex;gap:4px;padding:0 16px;">${photos.slice(1,5).map(ph=>`<img src="${ph}" style="width:28px;height:28px;object-fit:cover;border-radius:4px;border:1px solid var(--line);">`).join('')}</div>` : '';
    return `<div class="card" style="padding:0;overflow:hidden;display:flex;flex-direction:column;">
      <div style="aspect-ratio:1/1;background:var(--panel-2);display:flex;align-items:center;justify-content:center;">
        ${cover ? `<img src="${cover}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="color:var(--text-faint);font-size:11px;">Sem foto</span>`}
      </div>
      ${thumbs}
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:6px;flex:1;">
        <div style="font-family:var(--font-display);font-weight:600;font-size:14px;line-height:1.3;">${titulo}</div>
        <div style="color:var(--nozzle);font-weight:700;font-family:var(--font-mono);font-size:15px;">R$ ${preco}</div>
        <div style="font-size:12px;color:var(--text-dim);">Estoque: ${estoque}</div>
        ${descricao ? `<div style="font-size:12px;color:var(--text-dim);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${descricao}</div>` : ''}
        <button class="btn ghost sm" style="margin-top:auto;" onclick="openListingModal('${p.id}')">Editar anúncio</button>
      </div>
    </div>`;
  }).join('');
  return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr));">${cards}</div>`;
}
function renderListingField(platform, f, val){
  const id = `lst_${platform}_${f.key}`;
  if(f.type==='select'){
    return `<div class="field"><label>${f.label}</label><select id="${id}">
      <option value=""></option>
      ${f.options.map(o=>`<option value="${o}" ${val===o?'selected':''}>${o}</option>`).join('')}
    </select></div>`;
  }
  if(f.type==='textarea'){
    return `<div class="field"><label>${f.label}</label><textarea id="${id}" rows="5">${val!=null?val:''}</textarea></div>`;
  }
  if(f.presets){
    const listId = `${id}_opts`;
    const opts = listingFieldSuggestions(platform, f.key, f.presets);
    return `<div class="field"><label>${f.label}</label><input id="${id}" list="${listId}" ${f.maxlength?`maxlength="${f.maxlength}"`:''} value="${val!=null?val:''}">
      <datalist id="${listId}">${opts.map(o=>`<option value="${o}"></option>`).join('')}</datalist>
    </div>`;
  }
  return `<div class="field"><label>${f.label}</label><input id="${id}" ${f.maxlength?`maxlength="${f.maxlength}"`:''} value="${val!=null?val:''}"></div>`;
}
function switchListingTab(platform){
  document.getElementById('lstPanelMl').style.display = platform==='ml' ? '' : 'none';
  document.getElementById('lstPanelShopee').style.display = platform==='shopee' ? '' : 'none';
  document.getElementById('lstTabBtnMl').classList.toggle('active', platform==='ml');
  document.getElementById('lstTabBtnShopee').classList.toggle('active', platform==='shopee');
}
function openListingModal(id){
  const p = state.products.find(x=>x.id===id);
  if(!p) return;
  const existing = listingFor(id);
  const auto = defaultListingDraft(p);
  const draft = { ml: mergeListingValues(auto.ml, existing && existing.ml), shopee: mergeListingValues(auto.shopee, existing && existing.shopee) };
  editingListingPhotos = (existing && existing.fotos) ? existing.fotos.slice() : [];
  showModal(`Anúncio — ${p.name}`, `
    <div class="field hint" style="margin-top:-4px;margin-bottom:12px;">Campos iguais aos da planilha de exportação — preencha, salve o rascunho e exporte o Excel pra colar no formulário de cada marketplace.</div>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
      ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:64px;height:64px;border-radius:8px;background:var(--panel-2);flex-shrink:0;"></div>`}
      <div class="field hint" style="margin:0;">${p.photo ? 'Foto (capa) puxada do cadastro em Produtos.' : 'Esse produto não tem foto cadastrada — adicione uma em Produtos → Editar pra ela aparecer aqui e nos anúncios prontos.'}</div>
    </div>
    <div class="field">
      <label>Fotos adicionais (opcional, além da capa do cadastro)</label>
      <input type="file" accept="image/*" multiple id="lstPhotoInput" onchange="handleListingPhotoUpload(this)">
    </div>
    <div id="lstPhotoPreview" style="margin-bottom:14px;"></div>
    <div class="tabbar">
      <button type="button" class="tabbtn active" id="lstTabBtnMl" onclick="switchListingTab('ml')">Mercado Livre</button>
      <button type="button" class="tabbtn" id="lstTabBtnShopee" onclick="switchListingTab('shopee')">Shopee</button>
    </div>
    <div id="lstPanelMl">${LISTING_FIELDS.ml.map(f=>renderListingField('ml', f, (draft.ml||{})[f.key])).join('')}</div>
    <div id="lstPanelShopee" style="display:none;">${LISTING_FIELDS.shopee.map(f=>renderListingField('shopee', f, (draft.shopee||{})[f.key])).join('')}</div>
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
}
function readListingForm(){
  const out = { ml:{}, shopee:{} };
  ['ml','shopee'].forEach(platform=>{
    LISTING_FIELDS[platform].forEach(f=>{
      const el = document.getElementById(`lst_${platform}_${f.key}`);
      out[platform][f.key] = el ? el.value.trim() : '';
    });
  });
  return out;
}
let editingListingPhotos = [];
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
  Object.assign(l, { productName:p.name, ml:values.ml, shopee:values.shopee, fotos:editingListingPhotos.slice(), updatedAt: new Date().toISOString() });
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
  XLSX.writeFile(wb, `anuncio-${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.xlsx`);
  toast('Excel exportado');
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
  const p = editing ? state.products.find(x=>x.id===id) : { name:'', filaments:[{materialName:filamentOpts[0].name,weightG:100}], timeH:3, bubbleWrapM:0.5, boxType:boxOpts[0].name, failureMarginPct:0.10, practicedPrice:0, stock:0, machineId:machineOpts[0].id };
  editingFilaments = JSON.parse(JSON.stringify(p.filaments && p.filaments.length ? p.filaments : [{materialName:filamentOpts[0].name,weightG:100}]));
  editingPhotoData = p.photo || null;
  const boxes = boxOpts;
  showModal(editing?'Editar produto':'Novo produto', `
    <div class="field"><label>Nome do produto</label><input id="pName" value="${p.name}" placeholder="Ex: Kit Escritório"></div>
    <div class="field"><label>Foto (opcional)</label><input type="file" accept="image/*" id="pPhotoInput" onchange="handlePhotoUpload(this)"></div>
    <div id="pPhotoPreview"></div>

    <div class="field" style="margin-bottom:6px;"><label>Filamentos usados nessa impressão</label></div>
    <div id="filamentRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addFilamentRow()">+ Adicionar filamento</button>

    <div class="row2">
      <div class="field"><label>Impressora usada</label><select id="pMachine" onchange="updateProductPreview()">
        ${machineOpts.map(m=>`<option value="${m.id}" ${(p.machineId||machineOpts[0].id)===m.id?'selected':''}>${m.name}</option>`).join('')}
      </select></div>
      <div class="field"><label>Tipo de caixa</label><select id="pBox" onchange="updateProductPreview()">
        ${boxes.map(b=>`<option value="${b.name}" ${p.boxType===b.name?'selected':''}>${b.name}</option>`).join('')}
      </select></div>
    </div>
    <div class="row2">
      <div class="field"><label>Plástico bolha (m)</label><input type="number" id="pBubble" value="${p.bubbleWrapM}" step="0.1" oninput="updateProductPreview()"></div>
      <div class="field"><label>Tempo impressão (h)</label><input type="number" id="pTime" value="${p.timeH}" step="0.01" oninput="updateProductPreview()"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Margem de falha (%)</label><input type="number" id="pFail" value="${(p.failureMarginPct*100)}" step="1" oninput="updateProductPreview()"></div>
      <div class="field"><label>Mão de obra (min)</label><input type="number" id="pLabor" value="${p.laborMinutes||0}" step="1" oninput="updateProductPreview()"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" id="pMargin" value="${(p.desiredMarginPct!=null ? p.desiredMarginPct : calcProduct(p).desiredMarginPct).toFixed(0)}" step="1" oninput="document.getElementById('pPrice').dataset.touched=''; updateProductPreview()"></div>
      <div class="field"><label>Preço praticado (R$)</label><input type="number" id="pPrice" value="${p.practicedPrice||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>
    </div>
    <div class="field"><label>Estoque inicial (un)</label><input type="number" id="pStock" value="${p.stock}" step="1"></div>
    <div class="helper-block" id="productPreview"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmProduct(${editing?`'${id}'`:'null'})">${editing?'Salvar alterações':'Criar produto'}</button>
    </div>
  `);
  renderFilamentRows();
  renderPhotoPreview();
  updateProductPreview();
}
let editingFilaments = [];
let editingPhotoData = null;
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
function renderFilamentRows(){
  const el = document.getElementById('filamentRows');
  if(!el) return;
  const filamentOptions = state.materials.filter(m=>m.category==='Filamento');
  el.innerHTML = editingFilaments.map((f,i)=>`
    <div style="display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr) 28px;gap:8px;align-items:center;margin-bottom:8px;">
      <select style="min-width:0;" onchange="editingFilaments[${i}].materialName=this.value; updateProductPreview();">
        ${filamentOptions.map(fo=>`<option value="${fo.name}" ${f.materialName===fo.name?'selected':''}>${fo.name}</option>`).join('')}
      </select>
      <input type="number" step="0.01" value="${f.weightG}" placeholder="peso (g)" style="min-width:0;" oninput="editingFilaments[${i}].weightG=parseFloat(this.value)||0; updateProductPreview();">
      <button class="btn ghost sm" title="Remover" style="padding:6px 8px;" onclick="removeFilamentRow(${i})">×</button>
    </div>
  `).join('');
}
function addFilamentRow(){
  const firstFilament = (state.materials.find(m=>m.category==='Filamento')||{}).name||'PLA';
  editingFilaments.push({materialName:firstFilament, weightG:0});
  renderFilamentRows();
  updateProductPreview();
}
function removeFilamentRow(i){
  if(editingFilaments.length<=1){ toast('O produto precisa de ao menos um filamento','err'); return; }
  editingFilaments.splice(i,1);
  renderFilamentRows();
  updateProductPreview();
}
function readProductForm(){
  return {
    name: document.getElementById('pName').value.trim(),
    filaments: editingFilaments,
    boxType: document.getElementById('pBox').value,
    machineId: document.getElementById('pMachine').value,
    timeH: parseFloat(document.getElementById('pTime').value)||0,
    bubbleWrapM: parseFloat(document.getElementById('pBubble').value)||0,
    failureMarginPct: (parseFloat(document.getElementById('pFail').value)||0)/100,
    laborMinutes: parseFloat(document.getElementById('pLabor').value)||0,
    desiredMarginPct: parseFloat(document.getElementById('pMargin').value)||0,
  };
}
function updateProductPreview(){
  const form = readProductForm();
  const c = calcProduct(form);
  document.getElementById('productPreview').innerHTML = `
    <div class="calc-line"><span>Peso total</span><span>${num(totalWeight(form),0)}g</span></div>
    <div class="calc-line"><span>Custo material</span><span>${brl(c.materialCost)}</span></div>
    <div class="calc-line"><span>Custo energia</span><span>${brl(c.energyCost)}</span></div>
    <div class="calc-line"><span>Embalagem (caixa + bolha)</span><span>${brl(c.embalagemCost)}</span></div>
    <div class="calc-line"><span>Depreciação (${c.machine?c.machine.name:'sem impressora'})</span><span>${brl(c.depreciation)}</span></div>
    <div class="calc-line"><span>Mão de obra</span><span>${brl(c.laborCost)}</span></div>
    <div class="calc-line"><span>Custo de falha</span><span>${brl(c.failureCost)}</span></div>
    <div class="calc-line total"><span>Custo total</span><span>${brl(c.totalCost)}</span></div>
    <div class="calc-line"><span>Preço sugerido (margem de ${num(form.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
  `;
  const priceInput = document.getElementById('pPrice');
  if(priceInput && !priceInput.dataset.touched && document.activeElement!==priceInput){
    priceInput.placeholder = 'sugerido: '+c.suggestedPrice.toFixed(2);
  }
}
function confirmProduct(id){
  const form = readProductForm();
  if(!form.name){ toast('Informe o nome do produto','err'); return; }
  const dup = state.products.find(x=>x.id!==id && x.name.trim().toLowerCase()===form.name.trim().toLowerCase());
  if(dup){ toast(`Já existe um produto chamado "${dup.name}" — use outro nome`,'err'); return; }
  const priceRaw = document.getElementById('pPrice').value;
  const stock = parseFloat(document.getElementById('pStock').value)||0;
  const c = calcProduct(form);
  const practicedPrice = priceRaw ? parseFloat(priceRaw) : c.suggestedPrice;
  if((practicedPrice!=null && practicedPrice<0) || stock<0){ toast('Preço e estoque não podem ser negativos','err'); return; }
  if(id){
    const p = state.products.find(x=>x.id===id);
    Object.assign(p, form, { practicedPrice, stock, photo: editingPhotoData });
  } else {
    state.products.push({ id:uid(), ...form, practicedPrice, stock, photo: editingPhotoData });
  }
  saveProducts();
  toast(id?'Produto atualizado':'Produto criado');
  closeModal(); renderContent();
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
  const cutoffStr = cutoff.toISOString().slice(0,10);
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
        <div style="font-weight:600;font-size:13.5px;">${m.name}</div>
        <div style="color:var(--text-faint);font-size:11.5px;margin-top:2px;">${brl(m.costPerUnit)}/${m.unit}</div>
      </div>
      ${stockBadge(m)}
    </div>
    <div style="margin:12px 0 6px;font-family:var(--font-mono);font-size:20px;font-weight:600;">${num(m.stock,m.unit==='un'?0:1)} <span style="font-size:12px;color:var(--text-faint);font-weight:400;">${m.unit}</span></div>
    <div class="progress"><div style="width:${p}%;background:${color};"></div></div>
    <div style="font-size:11px;color:var(--text-faint);margin-top:5px;">Mínimo: ${num(m.lowStock,0)} ${m.unit}</div>
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
  let msg = `Excluir "${m.name}" do estoque?`;
  if(m.isBubbleWrap){
    msg += ` Atenção: esse é o material marcado como plástico bolha — depois de excluir, nenhum produto vai ter custo de plástico bolha calculado até você marcar outro material com esse papel.`;
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
  const m = editing ? state.materials.find(x=>x.id===id) : { name:'', category:'Filamento', unit:'g', costPerUnit:0, stock:0, lowStock:0, purchasePrice:0, purchaseQty:1, purchaseUnit:'g', isBox:false, isBubbleWrap:false };
  showModal(editing?'Editar matéria-prima':'Nova matéria-prima', `
    <div class="field"><label>Nome</label><input id="mName" value="${m.name}" placeholder="Ex: PLA Vermelho"></div>
    <div class="row2">
      <div class="field"><label>Categoria</label><select id="mCat" onchange="document.getElementById('mRoleBlock').style.display=this.value==='Embalagem'?'block':'none'">
        ${['Filamento','Embalagem','Outros'].map(c=>`<option ${m.category===c?'selected':''}>${c}</option>`).join('')}
      </select></div>
      <div class="field"><label>Unidade de estoque</label><select id="mUnit">
        ${['g','kg','un','m'].map(u=>`<option ${m.unit===u?'selected':''}>${u}</option>`).join('')}
      </select></div>
    </div>
    <div id="mRoleBlock" style="display:${m.category==='Embalagem'?'block':'none'};margin-bottom:12px;">
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim);margin-bottom:6px;"><input type="checkbox" id="mIsBox" style="width:auto;" ${m.isBox?'checked':''}> Conta como "caixa" nas opções de embalagem do cadastro de produtos</label>
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-dim);"><input type="checkbox" id="mIsBubbleWrap" style="width:auto;" ${m.isBubbleWrap?'checked':''}> É o plástico bolha usado na embalagem (só pode haver um)</label>
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
}
function updateMaterialUnitCost(){
  const price = parseFloat(document.getElementById('mPPrice').value)||0;
  const qty = parseFloat(document.getElementById('mPQty').value)||1;
  document.getElementById('mUnitCost').value = brl(price/qty);
}
function confirmMaterial(id){
  const name = document.getElementById('mName').value.trim();
  if(!name){ toast('Informe o nome','err'); return; }
  const dup = state.materials.find(x=>x.id!==id && x.name.trim().toLowerCase()===name.toLowerCase());
  if(dup){ toast(`Já existe uma matéria-prima chamada "${dup.name}" — use outro nome`,'err'); return; }
  const purchasePrice = parseFloat(document.getElementById('mPPrice').value)||0;
  const purchaseQty = parseFloat(document.getElementById('mPQty').value)||1;
  const stock = parseFloat(document.getElementById('mStock').value)||0;
  const lowStock = parseFloat(document.getElementById('mLow').value)||0;
  if(purchasePrice<0 || purchaseQty<0 || stock<0 || lowStock<0){ toast('Valores de preço/quantidade/estoque não podem ser negativos','err'); return; }
  const category = document.getElementById('mCat').value;
  const isBox = category==='Embalagem' && !!document.getElementById('mIsBox').checked;
  const isBubbleWrap = category==='Embalagem' && !!document.getElementById('mIsBubbleWrap').checked;
  const data = {
    name, category, unit: document.getElementById('mUnit').value,
    purchasePrice, purchaseQty, costPerUnit: purchasePrice/purchaseQty,
    stock, lowStock,
    isBox, isBubbleWrap,
  };
  if(isBubbleWrap){
    state.materials.forEach(mat=>{ if(mat.id!==id) mat.isBubbleWrap = false; });
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
      (p.filaments||[]).some(f=>f.materialName===name) || p.boxType===name || (isBubbleWrap && (p.bubbleWrapM||0)>0)
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
      <button class="btn" onclick="openSettingsModal()" style="margin-left:auto;">Configurar taxas, despesas, parcelas e reservas</button>
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
        <button class="btn ghost sm" onclick="openSettingsModal()">Gerenciar impressoras</button>
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
  if(!items || items.length===0) return `${emptyState('Nenhum item cadastrado')}<button class="btn ghost sm" style="width:100%;margin-top:6px;" onclick="openSettingsModal()">+ Adicionar item</button>`;
  return `<div class="tbl-wrap"><table><tbody>
    ${items.map(i=>`<tr><td>${i.name}</td><td class="right num">${brl(i.value)}</td></tr>`).join('')}
  </tbody></table></div>
  <button class="btn ghost sm" style="width:100%;margin-top:10px;" onclick="openSettingsModal()">Editar itens</button>`;
}
let editingPlatforms = [];
let editingExpenses = [];
let editingTaxes = [];
let editingMachines = [];
let editingReserveGoals = [];
function openSettingsModal(){
  const s = state.settings;
  editingPlatforms = JSON.parse(JSON.stringify(s.platforms));
  editingExpenses = JSON.parse(JSON.stringify(s.expenses||[]));
  editingTaxes = JSON.parse(JSON.stringify(s.taxes||[]));
  editingMachines = JSON.parse(JSON.stringify(s.machines||[]));
  editingReserveGoals = JSON.parse(JSON.stringify(s.reserveGoals||[]));
  showModal('Configurações de caixa', `
    <div class="section-title" style="margin-top:0;">Taxas por plataforma de venda</div>
    <div class="field hint" style="margin-top:-6px;margin-bottom:10px;">As plataformas mudam suas taxas de tempos em tempos — atualize aqui quando isso acontecer. Vendas já registradas não são recalculadas.</div>
    <div id="platformRows"></div>
    <button class="btn ghost sm" onclick="addPlatformRow()">+ Adicionar plataforma</button>

    <div class="section-title" style="margin-top:20px;">Despesas operacionais mensais</div>
    <div class="field hint" style="margin-top:-6px;margin-bottom:10px;">Cada item que você paga todo mês pra manter o negócio rodando: assinaturas, anúncios, ferramentas etc.</div>
    <div id="expenseRows"></div>
    <button class="btn ghost sm" onclick="addExpenseRow()">+ Adicionar despesa</button>
    <div class="field hint" style="margin-top:10px;text-align:right;">Total: <strong id="expenseTotal" style="color:var(--text)">${brl(editingExpenses.reduce((a,e)=>a+(e.value||0),0))}</strong></div>

    <div class="section-title" style="margin-top:20px;">Impostos mensais</div>
    <div class="field hint" style="margin-top:-6px;margin-bottom:10px;">DAS-MEI e qualquer outro imposto que incida sobre o negócio.</div>
    <div id="taxRows"></div>
    <button class="btn ghost sm" onclick="addTaxRow()">+ Adicionar imposto</button>

    <div class="section-title" style="margin-top:16px;">Precificação</div>
    <div class="field"><label>Margem de lucro padrão sugerida (%)</label><input type="number" id="cfgMargin" value="${((1-1/(s.markupMultiplier||2.5))*100).toFixed(0)}" step="1"></div>

    <div class="section-title" style="margin-top:16px;">PIX</div>
    <div class="field"><label>Chave PIX</label><input id="cfgPixKey" value="${s.pixKey||''}" placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"></div>
    <div class="row2">
      <div class="field"><label>Nome do recebedor</label><input id="cfgPixName" value="${s.pixMerchantName||''}" maxlength="25"></div>
      <div class="field"><label>Cidade</label><input id="cfgPixCity" value="${s.pixMerchantCity||''}" maxlength="15"></div>
    </div>
    <div class="field hint" style="margin-top:-8px;margin-bottom:12px;">Preencha pra poder gerar cobrança PIX (QR Code + copia e cola) direto na hora de registrar uma venda.</div>
    <div class="field hint" style="margin-top:-8px;margin-bottom:12px;">Usada como ponto de partida ao criar um produto novo — depois, cada produto pode ter a margem ajustada individualmente no próprio cadastro.</div>

    <div class="section-title" style="margin-top:16px;">Mão de obra</div>
    <div class="field"><label>Valor da sua hora de trabalho (R$/h)</label><input type="number" id="cfgLabor" value="${s.laborHourlyRate||0}" step="0.01"></div>
    <div class="section-title" style="margin-top:16px;">MEI, capacidade e metas</div>
    <div class="row2">
      <div class="field"><label>Limite anual de faturamento do MEI (R$)</label><input type="number" id="cfgMeiLimit" value="${s.meiRevenueLimit||81000}" step="100"></div>
      <div class="field"><label>Horas de impressão disponíveis por dia (por impressora)</label><input type="number" id="cfgPrintHours" value="${s.printHoursPerDay||16}" step="0.5"></div>
    </div>
    <div class="field"><label>Meta de faturamento mensal (R$)</label><input type="number" id="cfgMonthlyGoal" value="${s.monthlyGoal||0}" step="50" placeholder="0 = sem meta definida"></div>
    <div class="field hint" style="margin-top:-8px;">Usado para calcular o custo de mão de obra de cada produto (pintura, montagem, acabamento), com base nos minutos informados no cadastro do produto.</div>
    <div class="section-title" style="margin-top:16px;">Impressoras</div>
    <div class="field hint" style="margin-top:-6px;margin-bottom:10px;">Cada impressora tem sua própria depreciação, energia e parcela. O produto escolhe qual impressora usa lá no cadastro.</div>
    <div id="machineRows"></div>
    <button class="btn ghost sm" onclick="addMachineRow()">+ Adicionar impressora</button>
    <div class="section-title" style="margin-top:16px;">Metas de reserva mensal</div>
    <div class="field hint" style="margin-top:-6px;margin-bottom:10px;">Defina a meta mensal de cada reserva e, se quiser, o % do lucro de cada venda que deve ir automaticamente pra lá. O que faltar pra bater a meta pode ser completado depois com "Fechar o mês" em Caixa.</div>
    <div id="reserveRows"></div>
    <button class="btn ghost sm" onclick="addReserveRow()">+ Adicionar reserva</button>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmSettings()">Salvar</button>
    </div>
  `);
  renderPlatformRows();
  renderNameValueRows('expenseRows', editingExpenses, 'updateExpenseRow', 'removeExpenseRow');
  renderNameValueRows('taxRows', editingTaxes, 'updateTaxRow', 'removeTaxRow');
  renderMachineRows();
  renderReserveRows();
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
  editingMachines.push({ id:uid(), name:'Nova impressora', price:0, residual:0, lifeHours:5000, energyCostPerHour:0.0704, installmentValue:0, installmentsTotal:0, startMonth:currentMonth });
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
    return `
    <div style="display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,0.8fr) minmax(0,0.8fr) 28px;gap:8px;align-items:end;margin-bottom:${isML||isShopee?4:8}px;">
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
  `;}).join('');
}
function addPlatformRow(){
  editingPlatforms.push({id:uid(),name:'Nova plataforma',pct:0,fixed:0});
  renderPlatformRows();
}
function removePlatformRow(i){
  if(editingPlatforms.length<=1){ toast('Mantenha ao menos uma plataforma','err'); return; }
  editingPlatforms.splice(i,1);
  renderPlatformRows();
}
function confirmSettings(){
  const s = state.settings;
  const cleanPlatforms = editingPlatforms.filter(p=>p.name && p.name.trim());
  if(cleanPlatforms.length===0){ toast('Cadastre ao menos uma plataforma','err'); return; }
  s.platforms = cleanPlatforms;
  s.expenses = editingExpenses.filter(e=>e.name && e.name.trim());
  s.taxes = editingTaxes.filter(t=>t.name && t.name.trim());
  const cfgMarginPct = Math.min(95, Math.max(0, parseFloat(document.getElementById('cfgMargin').value)||0));
  s.markupMultiplier = cfgMarginPct<100 ? 1/(1-cfgMarginPct/100) : 20;
  s.pixKey = document.getElementById('cfgPixKey').value.trim();
  s.pixMerchantName = document.getElementById('cfgPixName').value.trim();
  s.pixMerchantCity = document.getElementById('cfgPixCity').value.trim();
  s.laborHourlyRate = parseFloat(document.getElementById('cfgLabor').value)||0;
  s.meiRevenueLimit = parseFloat(document.getElementById('cfgMeiLimit').value)||81000;
  s.monthlyGoal = parseFloat(document.getElementById('cfgMonthlyGoal').value)||0;
  s.printHoursPerDay = parseFloat(document.getElementById('cfgPrintHours').value)||16;
  s.machines = editingMachines.filter(m=>m.name && m.name.trim());
  s.reserveGoals = editingReserveGoals.filter(g=>g.name && g.name.trim());
  saveSettings(); toast('Configurações salvas'); closeModal(); renderContent();
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
function closeModal(){ document.getElementById('overlay').classList.remove('show'); }
document.getElementById('overlay').addEventListener('click', (e)=>{ if(e.target.id==='overlay') closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && document.getElementById('overlay').classList.contains('show')) closeModal(); });

function openOnboardingModal(){
  showModal('Vamos configurar seu negócio', `
    <div class="field hint" style="margin-bottom:16px;">Essa é a ordem que faz os números baterem desde a primeira venda. Pode seguir na sequência ou fechar e voltar quando quiser — o link fica no rodapé do menu.</div>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div class="card" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span class="badge info">1</span><div style="font-weight:600;font-size:13.5px;">Cadastre sua matéria-prima</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">Filamentos, caixas e plástico bolha, com o preço que você realmente pagou. É a base de todo cálculo de custo do app.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('estoque');">Ir para Estoque</button>
      </div>
      <div class="card" style="padding:14px 16px;border:1px solid var(--nozzle-dim);">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span class="badge warn">2</span><div style="font-weight:600;font-size:13.5px;">Lance seus investimentos iniciais</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">O que você já gastou pra montar o negócio: impressora (se pagou à vista), estoque inicial de filamento, caixas em lote, ferramentas. Isso é o que a aba Anual usa pra mostrar quando o negócio se paga — sem isso, o saldo final fica sempre otimista demais.</div>
        <button class="btn sm primary" style="margin-left:30px;" onclick="closeModal(); switchTab('anual'); openInvestmentModal();">+ Adicionar investimento inicial</button>
      </div>
      <div class="card" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span class="badge info">3</span><div style="font-weight:600;font-size:13.5px;">Cadastre seus produtos</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">Peso, tempo de impressão, mão de obra e margem de lucro desejada de cada peça. O custo e o preço sugerido são calculados sozinhos a partir da matéria-prima do passo 1.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('produtos');">Ir para Produtos</button>
      </div>
      <div class="card" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span class="badge info">4</span><div style="font-weight:600;font-size:13.5px;">Configure taxas, despesas e a parcela da impressora</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">Taxas do Mercado Livre/Shopee, despesas mensais fixas e, se estiver financiando a impressora, o mês da 1ª parcela — as parcelas restantes passam a contar sozinhas a partir daí.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('caixa'); openSettingsModal();">Ir para Configurações</button>
      </div>
      <div class="card" style="padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span class="badge ok">5</span><div style="font-weight:600;font-size:13.5px;">Registre sua primeira venda</div></div>
        <div style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px 30px;">A partir daqui o Dashboard, o Caixa e a aba Anual começam a se preencher sozinhos.</div>
        <button class="btn sm" style="margin-left:30px;" onclick="closeModal(); switchTab('vendas');">Ir para Vendas</button>
      </div>
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
      <textarea readonly style="width:100%;height:110px;font-family:var(--font-mono);font-size:10px;margin:8px 0;resize:vertical;" onclick="this.select()">create table app_data (
  user_id uuid references auth.users not null,
  key text not null,
  value text not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table app_data enable row level security;
create policy "own data" on app_data for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);</textarea>
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
}
async function doSyncSignOut(){
  const client = initSupabase();
  if(client){ try{ await client.auth.signOut(); }catch(e){} }
  await refreshSyncStatus();
  toast('Sessão encerrada neste dispositivo');
  closeModal(); render();
}
function disconnectSync(){
  if(!confirm('Isso desconecta a sincronização neste dispositivo (os dados continuam salvos na nuvem, se você já tiver enviado algum). Continuar?')) return;
  clearSyncConfig();
  syncStatus = { configured:false, email:null };
  toast('Sincronização desconectada neste dispositivo');
  closeModal(); render();
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
  state = { materials: [], products: [], sales: [], orders: [], customers: [], printFailures: [], listings: [], settings: blankSettings() };
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
    materials: state.materials, products: state.products, sales: state.sales, orders: state.orders, customers: state.customers, printFailures: state.printFailures, listings: state.listings, settings: state.settings,
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
