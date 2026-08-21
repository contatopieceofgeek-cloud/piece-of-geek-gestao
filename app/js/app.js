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
const fmtHm = (hours) => { const h=Math.floor(hours||0); const m=Math.round(((hours||0)%1)*60); return h>0 ? `${h}h${m>0?' '+m+'min':''}` : `${m}min`; };
/* Quantidade por unidade de medida.
   'un' é contável: não existe meia caixa nem 2,5 parafusos, então o passo do
   campo é 1 e o valor é inteiro. Grama e metro aceitam fração.
   Isso resolve dois incômodos reais: a setinha do campo subia o estoque de
   caixa de 0,01 em 0,01, e a aritmética de float (0.1+0.2) fazia o valor
   aparecer como 24.010000000000002 no campo, porque ia pro HTML sem
   arredondar. */
/* ===================== ESCAPE DE TEXTO DO USUÁRIO =====================
   O app inteiro monta HTML com template string e joga no innerHTML. Sem
   escapar, qualquer texto que o usuário digita vira MARCAÇÃO: um produto
   chamado `<img src=x onerror=...>` executava script ao abrir a aba
   Produtos — verificado, não é teórico.

   Não é só "o usuário se ataca sozinho". Importar backup aceita arquivo de
   qualquer origem (e valida só o formato), e com a sincronização ligada o
   token da sessão fica no localStorage, ao alcance do script injetado.

   REGRA: todo dado vindo de `state` que for texto livre passa por esc()
   antes de entrar em template string — no conteúdo E dentro de atributo
   (as aspas também são escapadas, senão dá pra fechar o value= e injetar
   um handler). Número formatado por brl()/num() já é seguro.

   Em atributo, use sempre aspas duplas: esc() troca " por &quot; mas deixa
   a apóstrofe, que é legítima em português ("D'Ávila"). */
function esc(v){
  if(v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
/* Link digitado pelo usuário (link do anúncio, WhatsApp...). Escapar aspas
   NÃO basta num href: `javascript:alert(1)` não tem aspa nenhuma e executa
   ao clique. Só http(s) e mailto passam; o resto vira link morto. */
function safeUrl(v){
  const s = String(v == null ? '' : v).trim();
  if(!s) return '';
  if(/^(https?:|mailto:)/i.test(s)) return esc(s);
  // Sem esquema, assume https — é o que a pessoa quis dizer ao colar
  // "mercadolivre.com.br/...".
  if(/^[\w.-]+\.[a-z]{2,}(?:[\/?#]|$)/i.test(s)) return esc('https://' + s);
  return '';
}
/* Pra texto que vai dentro de string JavaScript num onclick="fn('...')".
   Escapar HTML não basta ali: a apóstrofe fecha o argumento. */
function escJs(v){
  if(v == null) return '';
  return String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, ' ');
}
/* Leitura de campo numérico que NÃO pode ser negativo — que é o caso de
   todos eles neste app: peso, tempo, preço, quantidade, percentual, estoque.

   `min="0"` no HTML não resolve sozinho: ele impede a setinha de descer e
   marca o campo como inválido, mas quem DIGITA "-100" ainda entrega -100 pro
   parseFloat. E aí o motor propaga: peso de -100g gerava custo de -R$8,70 e
   preço sugerido de -R$21,76, sem um aviso sequer. Os dois juntos é que
   fecham — o atributo pra avisar, este leitor pra travar. */
/* Mesma trava, pra valor que chega solto — as linhas repetíveis escrevem
   direto no array pelo oninput (`editingFilaments[2].weightG = ...`), sem
   passar por getElementById. */
function nn(v, padrao){
  const n = parseFloat(v);
  return isFinite(n) ? Math.max(0, n) : (padrao || 0);
}
function numField(id, padrao){
  const el = document.getElementById(id);
  if(!el) return padrao || 0;
  const v = parseFloat(el.value);
  if(!isFinite(v)) return padrao || 0;
  return Math.max(0, v);
}
const isCountableUnit = (unit) => unit === 'un';
const stepForUnit = (unit) => isCountableUnit(unit) ? '1' : '0.01';
const roundQty = (n, unit) => {
  const v = (typeof n==='number' && isFinite(n)) ? n : 0;
  return isCountableUnit(unit) ? Math.round(v) : Math.round(v*100)/100;
};
// Valor pronto pra ir num <input type="number" min="0"> (ponto decimal, sem lixo).
const qtyInputValue = (n, unit) => String(roundQty(n, unit));
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
// Fallback NEUTRO de propósito: esse texto aparece na sidebar, no catálogo, no
// recibo e como "marca" no anúncio do ML — pôr o nome de um negócio real aqui
// carimba esse nome em todo mundo que ainda não preencheu o campo.
const bizName = () => (state.settings.businessName && state.settings.businessName.trim()) || 'Meu Negócio';
// Nome de arquivo dos exports, derivado do negócio de quem está usando.
const bizSlug = () => stripAccents(bizName()).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || 'gestao';
const bizLogoSrc = () => state.settings.businessLogo || 'img/logo.png';

/* ===================== DADOS INICIAIS =====================
   defaultData() é o que uma conta NOVA recebe: andaime neutro, sem nenhum
   dado de negócio real. As matérias-primas vêm cadastradas só pra poupar a
   parte chata (categoria, flags de embalagem, medidas) — com preço ZERO, pra
   o usuário preencher o que ele realmente pagou. Nada aqui pode conter nome,
   contato, produto ou custo de um negócio específico: isso vazaria os dados
   de um cliente pra todos os outros. Dado de demonstração fica em
   sampleData(), que só entra se a pessoa pedir. */
function defaultData(){
  const materials = [
    {id:uid(),name:'PLA Preto',category:'Filamento',unit:'g',costPerUnit:0,stock:0,lowStock:200,purchasePrice:0,purchaseQty:1000,purchaseUnit:'g',materialType:'PLA',colorName:'Preto',color:'#222222'},
    {id:uid(),name:'PLA Branco',category:'Filamento',unit:'g',costPerUnit:0,stock:0,lowStock:200,purchasePrice:0,purchaseQty:1000,purchaseUnit:'g',materialType:'PLA',colorName:'Branco',color:'#f2f2f2'},
    {id:uid(),name:'Plástico Bolha',category:'Embalagem',unit:'m',costPerUnit:0,stock:0,lowStock:5,purchasePrice:0,purchaseQty:100,purchaseUnit:'m',isBubbleWrap:true},
    {id:uid(),name:'Fita Adesiva',category:'Embalagem',unit:'m',costPerUnit:0,stock:0,lowStock:5,purchasePrice:0,purchaseQty:50,purchaseUnit:'m',isTape:true},
    {id:uid(),name:'Caixa Pequena',category:'Embalagem',unit:'un',costPerUnit:0,stock:0,lowStock:5,purchasePrice:0,purchaseQty:25,purchaseUnit:'un',isBox:true},
    {id:uid(),name:'Caixa Média',category:'Embalagem',unit:'un',costPerUnit:0,stock:0,lowStock:5,purchasePrice:0,purchaseQty:25,purchaseUnit:'un',isBox:true},
    {id:uid(),name:'Caixa Grande',category:'Embalagem',unit:'un',costPerUnit:0,stock:0,lowStock:3,purchasePrice:0,purchaseQty:10,purchaseUnit:'un',isBox:true},
    {id:uid(),name:'Envelope 12x18',category:'Embalagem',unit:'un',costPerUnit:0,stock:0,lowStock:10,purchasePrice:0,purchaseQty:100,purchaseUnit:'un',isEnvelope:true,lengthCm:18,widthCm:12,heightCm:0},
    {id:uid(),name:'Envelope 15x20',category:'Embalagem',unit:'un',costPerUnit:0,stock:0,lowStock:10,purchasePrice:0,purchaseQty:100,purchaseUnit:'un',isEnvelope:true,lengthCm:20,widthCm:15,heightCm:0},
    {id:uid(),name:'Envelope 15x25',category:'Embalagem',unit:'un',costPerUnit:0,stock:0,lowStock:10,purchasePrice:0,purchaseQty:100,purchaseUnit:'un',isEnvelope:true,lengthCm:25,widthCm:15,heightCm:0},
    {id:uid(),name:'Envelope 19x25',category:'Embalagem',unit:'un',costPerUnit:0,stock:0,lowStock:10,purchasePrice:0,purchaseQty:100,purchaseUnit:'un',isEnvelope:true,lengthCm:25,widthCm:19,heightCm:0},
  ];
  const products = [];
  const settings = {
    businessName:'',
    businessLogo:null,
    customOrderSeq:0,
    markupMultiplier:2.5,
    energyTariffPerKwh:0.75,
    meiRevenueLimit:81000,
    monthlyGoal:0,
    dasPaid:{},
    dasDueDay:20,
    dasEnabled:false,
    pixKey:'',
    pixMerchantName:'',
    pixMerchantCity:'',
    whatsapp:'',
    instagram:'',
    mlClientId:'',
    mlConnected:false,
    printHoursPerDay:8,
    machines:[],
    expenses:[],
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
      {id:uid(),name:'Recompra de Filamento',goal:0,balance:0,autoMode:'pct_profit',autoPct:0},
      {id:uid(),name:'Fundo de Emergência',goal:0,balance:0,autoMode:'pct_profit',autoPct:0},
      {id:uid(),name:'Fundo Nova Máquina (Depreciação)',goal:0,balance:0,autoMode:'cost_depreciation',autoPct:0},
      {id:uid(),name:'Fundo de Expansão (Lucro Retido)',goal:0,balance:0,autoMode:'pct_profit',autoPct:0},
    ],
    monthlyCloses:{},
    monthlySnapshots:{},
    lastActiveMonth: todayStr().slice(0,7),
    laborHourlyRate:0,
    operationsStartMonth:'',
  };
  return { materials, products, sales:[], orders:[], customers:[], printFailures:[], listings:[], customOrders:[], settings };
}

/* Negócio FICTÍCIO só pra explorar o app com números plausíveis — carregado
   sob demanda (ver loadSampleData), nunca automaticamente. Os produtos aqui
   existem pra demonstrar os conceitos que mais confundem: leva que rende
   várias peças (unitsPerPrint), venda em kit (unitsPerSale) e componente
   incluso no pacote. Se mudar algo aqui, não é dado de ninguém — é vitrine. */
function sampleData(){
  const d = defaultData();
  const mat = (name, cat, unit, price, qty, extra) => Object.assign(
    {id:uid(), name, category:cat, unit, costPerUnit: price/qty, stock:0, lowStock:0, purchasePrice:price, purchaseQty:qty, purchaseUnit:unit}, extra||{}
  );
  const materials = [
    mat('PLA Preto','Filamento','g',89.90,1000,{stock:1800,lowStock:500,materialType:'PLA',colorName:'Preto',color:'#222222'}),
    mat('PLA Branco','Filamento','g',89.90,1000,{stock:900,lowStock:500,materialType:'PLA',colorName:'Branco',color:'#f2f2f2'}),
    mat('Plástico Bolha','Embalagem','m',54.53,100,{stock:60,lowStock:10,isBubbleWrap:true}),
    mat('Fita Adesiva','Embalagem','m',12.90,50,{stock:35,lowStock:5,isTape:true}),
    mat('Caixa Pequena','Embalagem','un',35.99,25,{stock:20,lowStock:5,isBox:true,lengthCm:16,widthCm:11,heightCm:6}),
    mat('Caixa Média','Embalagem','un',47.78,25,{stock:12,lowStock:5,isBox:true,lengthCm:22,widthCm:16,heightCm:10}),
    mat('Envelope 15x25','Embalagem','un',16.99,100,{stock:80,lowStock:10,isEnvelope:true,lengthCm:25,widthCm:15,heightCm:0}),
    mat('Parafuso 3,5x40','Componentes','un',26.81,500,{stock:400,lowStock:100}),
    mat('Lixa 220','Ferramentas','un',25.06,1,{stock:1,lowStock:0,toolType:'Lixa',usefulLifeUses:40}),
  ];
  const machine = {id:uid(),name:'Impressora 3D (exemplo)',price:2200,residual:0,lifeHours:4000,energyCostPerHour:0.0704,powerConsumptionKw:0.1,maintenanceCostPerHour:0.25,installmentValue:0,installmentsTotal:0,startMonth:todayStr().slice(0,7),maintenanceLog:[]};
  const parafusoId = materials.find(m=>m.name==='Parafuso 3,5x40').id;
  const lixaId = materials.find(m=>m.name==='Lixa 220').id;
  const prod = (o) => Object.assign({
    id:uid(), filaments:[{materialName:'PLA Preto', weightG:60}], timeH:2, unitsPerPrint:1, unitsPerSale:1,
    bubbleWrapM:0.5, tapeM:0.3, boxType:'Caixa Pequena', failureMarginPct:0.10, stock:0,
    machineId:machine.id, laborActions:[], toolsUsed:[], components:[], marketPriceOverride:null,
  }, o);
  const products = [
    // Os tempos e preços aqui foram escolhidos pra o Diagnóstico abrir com um
    // veredito de cada tipo (bom / aceitável / revisar) — é o que mostra pra
    // que serve a tela, sem parecer que o app achou tudo ruim.
    prod({ name:'Suporte de Headset', category:'Suportes', filaments:[{materialName:'PLA Preto',weightG:125}], timeH:2.8, stock:6,
      laborActions:[{action:'Lixar',minutes:8},{action:'Empacotar',minutes:4}], toolsUsed:[{toolId:lixaId,uses:1}], practicedPriceMl:79.90, practicedPriceShopee:74.90 }),
    prod({ name:'Organizador de Mesa', category:'Organizadores', filaments:[{materialName:'PLA Branco',weightG:210}], timeH:6.5, boxType:'Caixa Média', stock:3,
      laborActions:[{action:'Empacotar',minutes:5}], practicedPriceMl:119.90, practicedPriceShopee:109.90 }),
    // Leva de 12 peças vendida em kit de 3, num envelope, com 2 parafusos por
    // peça — é o caso que mostra unitsPerPrint ≠ unitsPerSale e o scope 'peca'.
    prod({ name:'Guia para Cabo USB (kit 3)', category:'Organizadores', filaments:[{materialName:'PLA Preto',weightG:36}], timeH:1.6,
      unitsPerPrint:12, unitsPerSale:3, boxType:'Envelope 15x25', bubbleWrapM:0, tapeM:0, stock:24,
      components:[{materialId:parafusoId, qty:2, scope:'peca'}], lengthCm:6, widthCm:4, heightCm:1.5,
      laborActions:[{action:'Empacotar',minutes:3}], practicedPriceMl:34.90, practicedPriceShopee:29.90 }),
    prod({ name:'Chaveiro Personalizado', category:'Chaveiros', filaments:[{materialName:'PLA Preto',weightG:9}], timeH:0.5,
      unitsPerPrint:8, unitsPerSale:1, boxType:'Envelope 15x25', bubbleWrapM:0, tapeM:0, stock:16,
      lengthCm:5, widthCm:3, heightCm:0.8, laborActions:[{action:'Empacotar',minutes:2}],
      practicedPriceMl:19.90, practicedPriceShopee:17.90 }),
  ];
  const ym = todayStr().slice(0,7);
  const saleOn = (day, prodName, qty, unitPrice, platform) => {
    const p = products.find(x=>x.name===prodName);
    const gross = qty*unitPrice;
    const fee = gross*0.14;
    return { id:uid(), groupId:null, date:`${ym}-${String(day).padStart(2,'0')}`, productId:p.id, productName:p.name,
      qty, platform, grossPrice:gross, feeTotal:fee, netReceipt:gross-fee, productionCost:gross*0.35, shippingCost:0,
      couponDiscount:0, profit:gross-fee-(gross*0.35), unitsPerSaleSnapshot:p.unitsPerSale, unitPriceSnapshot:unitPrice,
      timePerUnitSnapshot:(p.timeH/p.unitsPerPrint)*p.unitsPerSale, reserveAllocations:{}, machineId:machine.id,
      hoursUsed:(p.timeH/p.unitsPerPrint)*p.unitsPerSale*qty, customerId:null, trackingCode:null, linkedOrderId:null };
  };
  const sales = [
    saleOn(4,'Suporte de Headset',1,79.90,'Mercado Livre'),
    saleOn(9,'Guia para Cabo USB (kit 3)',2,34.90,'Shopee'),
    saleOn(15,'Chaveiro Personalizado',3,19.90,'Shopee'),
    saleOn(21,'Organizador de Mesa',1,119.90,'Mercado Livre'),
  ];
  d.settings.businessName = 'Minha Loja 3D (exemplo)';
  d.settings.machines = [machine];
  d.settings.laborHourlyRate = 25;
  d.settings.operationsStartMonth = ym;
  d.settings.expenses = [{id:uid(),name:'Assinatura de modelos 3D',value:39.90,startMonth:ym}];
  return Object.assign(d, { materials, products, sales });
}

/* ===================== STORAGE ===================== */
function migrateMaterials(materials){
  let hasBubbleWrap = materials.some(m=>m.isBubbleWrap);
  materials.forEach(m=>{
    if(m.isBox==null) m.isBox = m.category==='Embalagem' && m.name.startsWith('Caixa');
    if(m.isEnvelope==null) m.isEnvelope = false;
    if(m.isSaquinho==null) m.isSaquinho = false;
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
    // Limpa o lixo de float que já ficou gravado (ex: 24.010000000000002 de
    // caixa). Arredonda pela unidade: 'un' é contável, o resto vai a 2 casas.
    m.stock = roundQty(m.stock, m.unit);
    m.lowStock = roundQty(m.lowStock, m.unit);
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
    if(!prod.components) prod.components = [];
    if(prod.estimatedFreightMl==null) prod.estimatedFreightMl = 0;
    if(prod.estimatedFreightShopee==null) prod.estimatedFreightShopee = 0;
    if(!prod.modelOrigin) prod.modelOrigin = 'proprio';
    if(prod.modelLicense==null) prod.modelLicense = '';
    if(prod.modelSourceUrl==null) prod.modelSourceUrl = '';
    if(prod.unitsPerPrint==null || prod.unitsPerPrint<1) prod.unitsPerPrint = 1;
    if(prod.unitsPerSale==null || prod.unitsPerSale<1) prod.unitsPerSale = 1;
    if(prod.marketPriceOverride==null) prod.marketPriceOverride = null;
  });
  return products;
}
function migratePrintFailures(list){
  list.forEach(f=>{
    if(!f.outcome) f.outcome = 'failure';
    if(f.qty==null) f.qty = 1;
    // hoursUsed NÃO é preenchido aqui: esta função roda antes de
    // state.products existir (ver applyLoadedState), então o produto ainda
    // não dá pra consultar. Fica pra backfillPrintJobHours().
  });
  return list;
}
/* Registros anteriores ao campo de tempo: estima UMA vez a partir do produto
   atual e congela. Não é o tempo exato da época, mas é a única fonte que
   existe — congelar evita o número ficar mudando a cada edição do produto.
   Precisa rodar DEPOIS de state.products estar carregado. */
function backfillPrintJobHours(){
  let mudou = false;
  (state.printFailures||[]).forEach(f=>{
    if(f.hoursUsed!=null) return;
    const prod = (state.products||[]).find(p=>p.id===f.productId);
    f.hoursUsed = prod ? (prod.timeH||0) * (f.qty||1) * ((f.pctComplete!=null?f.pctComplete:100)/100) : 0;
    mudou = true;
  });
  if(mudou) savePrintFailures();
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
    if(o.contact==null) o.contact = '';
    if(!o.orderType) o.orderType = 'outro';
    if(o.linkedProductId==null) o.linkedProductId = '';
    if(o.paymentMethod==null) o.paymentMethod = '';
    if(o.deliveryMethod==null) o.deliveryMethod = '';
    if(o.deliveryAddress==null) o.deliveryAddress = '';
    if(!o.status) o.status = 'Incompleto';
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
  // Campos de identidade/contato nascem VAZIOS — preencher com o dado de um
  // negócio específico aqui vaza esse dado pra toda conta que ainda não
  // preencheu o campo. Ver defaultData().
  if(settings.businessName==null) settings.businessName = '';
  if(settings.businessLogo===undefined) settings.businessLogo = null;
  if(settings.customOrderSeq==null){
    // state.customOrders já foi atribuído antes de migrateSettings rodar (ver
    // applyLoadedState) — usa o maior número já existente como ponto de partida,
    // pra não colidir com pedidos que já tenham número (ex: dado de teste).
    const nums = (state.customOrders||[]).map(o=>parseInt((o.orderNumber||'').replace(/\D/g,''),10)).filter(n=>!isNaN(n));
    settings.customOrderSeq = nums.length ? Math.max(...nums) : 0;
  }
  if(!Array.isArray(settings.expenses)){
    settings.expenses = settings.opExpenses ? [{id:uid(),name:'Despesas operacionais (migrado)',value:settings.opExpenses}] : [];
  }
  if(!Array.isArray(settings.taxes)){
    settings.taxes = settings.meiTax ? [{id:uid(),name:'Imposto MEI (DAS)',value:settings.meiTax}] : [];
  }
  // Tabela de categorias do ML. O seed é estimativa declarada — quem tem a
  // conta conectada substitui pela taxa real da API; quem edita na mão vira
  // 'manual'. Ver ML_CATEGORY_SEED.
  if(!Array.isArray(settings.mlCategories)){
    settings.mlCategories = ML_CATEGORY_SEED.map(c=>({
      id: uid(), nome: c.nome, mlCategoryId: '',
      classicaPct: c.classicaPct, premiumPct: c.premiumPct,
      origem: 'estimativa', atualizadoEm: '',
    }));
  }
  // Despesas/impostos que já existem ficam SEM data (= valem desde sempre),
  // preservando o resultado que a pessoa já via. Quem quiser recortar preenche
  // o mês na mão; linhas novas já nascem com o mês corrente.
  [settings.expenses, settings.taxes].forEach(lista=>{
    (lista||[]).forEach(item=>{ if(item.startMonth==null) item.startMonth = ''; });
  });
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
  // Gasto de anúncio por mês+plataforma. Ver adSpendInMonth em calc.js.
  if(!Array.isArray(settings.adSpend)) settings.adSpend = [];
  // Orçamento usado no Diagnóstico enquanto não há gasto lançado no mês.
  if(settings.adBudgetRef==null) settings.adBudgetRef = 100;
  /* Regime tributário. Muda o SENTIDO do teto de R$81.000, não só o texto:
     pra quem é MEI é um limite que não pode estourar (desenquadramento);
     pra quem não é, é a resposta de "se eu formalizar, MEI ainda me serve?".
     Quem já tinha o lembrete de DAS ligado é MEI — é o único jeito de pagar
     DAS —, então a migração usa isso pra não perguntar de novo. */
  if(settings.taxRegime==null) settings.taxRegime = settings.dasEnabled ? 'mei' : '';
  if(settings.monthlyGoal==null) settings.monthlyGoal = 0;
  if(!settings.dasPaid) settings.dasPaid = {};
  if(settings.dasDueDay==null) settings.dasDueDay = 20;
  if(settings.dasEnabled==null) settings.dasEnabled = false;
  if(settings.pixKey==null) settings.pixKey = '';
  if(settings.pixMerchantName==null) settings.pixMerchantName = '';
  if(settings.pixMerchantCity==null) settings.pixMerchantCity = '';
  if(settings.whatsapp==null) settings.whatsapp = '';
  if(settings.instagram==null) settings.instagram = '';
  if(settings.brandPromptSeen==null) settings.brandPromptSeen = !!settings.businessName;
  if(settings.mlClientId==null) settings.mlClientId = '';
  if(settings.mlConnected==null) settings.mlConnected = false;
  if(settings.printHoursPerDay==null) settings.printHoursPerDay = 8;
  if(!settings.marketByGroup) settings.marketByGroup = {};
  Object.values(settings.marketByGroup).forEach(g=>{
    if(g.unitBasis!=='kit') g.unitBasis = 'unidade';
    if(g.kitSize==null || g.kitSize<1) g.kitSize = 1;
  });
  if(settings.operationsStartMonth==null) settings.operationsStartMonth = '';
  if(settings.targetHourlyProfit==null) settings.targetHourlyProfit = 15.00;
  if(settings.goodHourlyProfit==null) settings.goodHourlyProfit = 20.00;
  if(settings.minProfitPerSale==null) settings.minProfitPerSale = 8.00;
  if(!settings.customOrderPriceTable) settings.customOrderPriceTable = {};
  ['chaveiro','lembrancinha','topo_bolo'].forEach(t=>{ if(!Array.isArray(settings.customOrderPriceTable[t])) settings.customOrderPriceTable[t] = []; });
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
// Credenciais do projeto do PRODUTO (js/config.js) têm prioridade. O que o
// usuário digitou em Configurações só vale se o config.js estiver em branco —
// é o modo "traga seu próprio Supabase", que sobrevive pra desenvolvimento e
// pra quem já usava o app antes de ele virar serviço.
function appConfig(){ return window.APP_CONFIG || {}; }
function hasEmbeddedBackend(){
  const c = appConfig();
  return !!(c.supabaseUrl && c.supabasePublishableKey);
}
function getSyncConfig(){
  if(hasEmbeddedBackend()){
    const c = appConfig();
    return { url: c.supabaseUrl, key: c.supabasePublishableKey };
  }
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
  await refreshSubscription();
}

/* ---------- Assinatura ----------
   O status vem do banco (tabela subscriptions), nunca do navegador: a RLS não
   deixa o cliente alterar a própria linha, só a Edge Function do webhook
   escreve ali. O que está aqui é espelho pra interface — quem realmente
   bloqueia a gravação é a policy do Postgres. Ver supabase/schema-subscriptions.sql.

   Importante: o app funciona 100% offline no IndexedDB. Isto NÃO tranca o app;
   o que a assinatura protege é a sincronização na nuvem e o que depende de
   servidor (taxa real do ML). Ver a nota no CLAUDE.md. */
let subscription = { loaded:false, status:null, trialEndsAt:null, periodEnd:null, writeBlocked:false };
async function refreshSubscription(){
  if(!syncStatus.configured || !syncStatus.email){
    subscription = { loaded:false, status:null, trialEndsAt:null, periodEnd:null, writeBlocked:false };
    return;
  }
  try{
    const client = initSupabase();
    const user = await getSyncUser();
    if(!client || !user) return;
    const { data, error } = await client.from('subscriptions')
      .select('status,trial_ends_at,current_period_end').eq('user_id', user.id).maybeSingle();
    // Tabela ainda não criada no projeto (erro de relação inexistente) não é
    // motivo pra alarmar o usuário — o app segue como antes da cobrança existir.
    if(error || !data){ subscription.loaded = false; return; }
    subscription = {
      loaded: true,
      status: data.status,
      trialEndsAt: data.trial_ends_at,
      periodEnd: data.current_period_end,
      writeBlocked: subscription.writeBlocked,
    };
  }catch(e){ subscription.loaded = false; }
}
// Dias inteiros que faltam pro fim do teste (negativo = já venceu).
function trialDaysLeft(){
  if(!subscription.trialEndsAt) return null;
  return Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / 86400000);
}
function subscriptionActive(){
  if(!subscription.loaded) return true; // sem informação, não atrapalha o uso
  if(subscription.status === 'active'){
    return !subscription.periodEnd || new Date(subscription.periodEnd) > new Date();
  }
  if(subscription.status === 'trialing') return (trialDaysLeft()||0) > 0;
  return false;
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
// Ligado só durante a puxada pós-login (afterSyncLogin), pra o storageGet
// pular a comparação de timestamp e aceitar a nuvem.
let preferRemoteOnPull = false;
// Este aparelho já tem dado salvo de verdade? Instalação nova não tem
// timestamp nenhum (applyLoadedState não persiste o andaime), e é isso que
// separa "nunca usei aqui" de "tenho edição local que pode ser mais nova".
async function hasLocalData(){
  const keys = ['materials','products','sales','orders','customers','printFailures','listings','customOrders','settings'];
  for(const k of keys){
    const local = await getLocalWithTimestamp(k);
    if(local.value && local.updatedAt) return true;
  }
  return false;
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
          // A decisão de quem vence mora em js/sync-rules.js, testada em
          // test/sync.test.js — era uma comparação escrita aqui no meio do IO
          // que apagou os dados do dono.
          const escolha = resolveRead({
            hasRemote: !!data,
            localUpdatedAt: local.updatedAt,
            remoteUpdatedAt: data ? data.updated_at : null,
            preferRemote: preferRemoteOnPull,
          });
          if(escolha === 'remote') return data.value;
          if(escolha === 'local') return local.value;
          // 'local-and-push': edição mais nova feita aqui (tipicamente
          // offline) — usa a local e reenvia pra nuvem em segundo plano.
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
        const { error } = await client.from('app_data').upsert(
          { user_id:user.id, key, value, updated_at:nowIso },
          { onConflict:'user_id,key' }
        );
        // O cliente do Supabase devolve o erro no objeto, não lança — antes
        // isso passava batido e QUALQUER falha virava "sem conexão" silencioso.
        // Recusa da RLS (42501) aqui significa assinatura vencida: o dado está
        // salvo localmente, mas parou de subir, e o usuário precisa saber.
        if(error) throw error;
        if(subscription.writeBlocked){ subscription.writeBlocked = false; renderSubscriptionBanner(); }
      }
    }catch(e){
      // Recusa da RLS vs. falta de conexão — ver classifyWriteError em
      // js/sync-rules.js. Confundir os dois fazia assinatura vencida parar de
      // sincronizar sem o usuário ficar sabendo.
      if(classifyWriteError(e) === 'rls'){
        if(!subscription.writeBlocked){
          subscription.writeBlocked = true;
          renderSubscriptionBanner();
          toast('Assinatura vencida — salvamos neste aparelho, mas parou de sincronizar na nuvem','err');
        }
      }
      /* qualquer outro erro = provavelmente sem conexão: fica salvo local e
         sobe no próximo save online, comportamento de sempre */
    }
  }
  return localOk;
}

async function applyLoadedState(){
  try{
    const [m,p,s,o,cu,c,pf,li,co] = await Promise.all([
      storageGet('materials'), storageGet('products'), storageGet('sales'), storageGet('orders'), storageGet('customers'), storageGet('settings'), storageGet('printFailures'), storageGet('listings'), storageGet('customOrders'),
    ]);
    if(isFreshInstall([m,p,s,o,cu,c,pf,li,co])){
      // Instalação nova: NÃO persistir o andaime aqui.
      //
      // Gravar isto criava um carimbo de data "agora" pra um estado que o
      // usuário nunca tocou. Se depois ele fizesse login numa conta que já
      // tinha dados, a comparação de timestamp do storageGet via o vazio
      // local como "edição mais recente", mantinha ele E o empurrava por
      // cima da nuvem. Foi exatamente assim que os dados do dono sumiram
      // ao abrir o app numa aba anônima e conectar a conta.
      //
      // Sem gravar, o local fica sem timestamp e a nuvem sempre vence — que
      // é o certo pra quem acabou de instalar. O primeiro save de verdade
      // acontece na primeira edição do usuário, como sempre aconteceu.
      state = defaultData();
    } else {
      const seed = defaultData();
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
      backfillPrintJobHours();
      backfillMachineHours();
      snapshotPastMonths();
    }
  }catch(e){
    console.error('storage load error', e);
    state = defaultData();
  }
}
async function loadState(){
  await refreshSyncStatus();
  await applyLoadedState();
  render();
  if(!hasCloudStorage()){
    if(syncStatus.email) toast(`Sincronizado como ${esc(syncStatus.email)}`);
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



// Alerta de preço praticado vs. faixa de mercado da categoria — não bloqueia
// nada, só sinaliza (categoria sem faixa cadastrada = sem alerta, não erro).
function marketAlertFor(marketInfo, price){
  if(!marketInfo || marketInfo.source==='none' || price==null) return null;
  if(marketInfo.max>0 && price>marketInfo.max) return { label:'Acima de todos os concorrentes — risco alto de não vender', cls:'bad' };
  if(marketInfo.avg>0 && price>marketInfo.avg) return { label:`Acima da média do mercado em ${pct(((price-marketInfo.avg)/marketInfo.avg)*100)}`, cls:'warn' };
  if(marketInfo.min>0 && price<marketInfo.min) return { label:'Abaixo de todos os concorrentes — dá pra subir o preço', cls:'info' };
  return null;
}
// Painel de preço por canal (ML/Shopee/extras — Produtos é só marketplace) —
// piso pra bater a meta, R$/hora no preço praticado com veredito, tempo
// máximo viável ao preço de mercado, e margem só como consequência.
function pricingChannelBlockHtml(label, channelName, price, c, marketInfo, prod){
  const floor = minPriceForTarget(c, channelName, prod);
  const hourly = profitPerHourAt(c, channelName, price, prod);
  const absoluteProfit = (price>0) ? (price - channelFeeAt(channelName, price, prod) - c.totalCost) : null;
  const verdict = hourlyVerdict(hourly, absoluteProfit);
  const maxTime = marketInfo.value!=null ? maxTimeAtMarketPrice(c, channelName, marketInfo.value, prod) : null;
  const marginPctAt = (price>0) ? (absoluteProfit/price)*100 : null;
  const alert = marketAlertFor(marketInfo, price);
  const target = state.settings.targetHourlyProfit!=null ? state.settings.targetHourlyProfit : 15;
  return `
    <div style="margin-top:10px;padding:10px 12px;background:var(--bg-alt);border-radius:8px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-weight:600;font-size:12.5px;">${label}</span>
        <span class="badge ${verdict.cls}">${verdict.label}</span>
      </div>
      <div class="calc-line" style="font-size:11.5px;color:var(--text-faint);"><span>Piso p/ meta de ${brl(target)}/h</span><span>${floor!=null?brl(floor):'—'}</span></div>
      <div class="calc-line" style="font-size:12.5px;"><span>No preço praticado (${price>0?brl(price):'—'})</span><span style="font-weight:600;">${hourly!=null?brl(hourly)+'/h':'—'}</span></div>
      <div class="calc-line" style="font-size:11.5px;color:var(--text-faint);"><span>Lucro por venda</span><span style="color:${absoluteProfit!=null&&absoluteProfit<0?'var(--red)':'inherit'}">${absoluteProfit!=null?brl(absoluteProfit):'—'}</span></div>
      <div class="calc-line" style="font-size:11.5px;color:var(--text-faint);"><span>Tempo máximo viável${marketInfo.value!=null?` a ${brl(marketInfo.value)}`:''}</span><span>${marketInfo.value==null?'sem preço de mercado':(maxTime==null?'—':(maxTime<=0?'inviável a qualquer tempo':fmtHm(maxTime)))}</span></div>
      <div class="calc-line" style="font-size:11px;color:var(--text-faint);"><span>Margem resultante</span><span>${marginPctAt!=null?pct(marginPctAt):'—'}</span></div>
      ${alert ? `<div style="margin-top:4px;"><span class="badge ${alert.cls}">${alert.label}</span></div>` : ''}
    </div>
  `;
}

function salesInMonth(ym){ return state.sales.filter(s=>s.date && s.date.slice(0,7)===ym); }

function blocoA(ym){
  if(state.settings.operationsStartMonth && ym < state.settings.operationsStartMonth){
    return { faturamento:0, taxas:0, receitaLiquida:0, custoProducao:0, frete:0, despesas:0, anuncios:0, lucroBruto:0, mei:0, lucroOperacional:0, qtdVendas:0 };
  }
  const sales = salesInMonth(ym);
  const faturamento = sales.reduce((a,s)=>a+s.grossPrice,0);
  const taxas = sales.reduce((a,s)=>a+s.feeTotal,0);
  const receitaLiquida = faturamento - taxas;
  const custoProducao = sales.reduce((a,s)=>a+s.productionCost,0);
  const frete = sales.reduce((a,s)=>a+(s.shippingCost||0),0);
  const snap = (state.settings.monthlySnapshots||{})[ym];
  const expensesSrc = snap ? snap.expenses : state.settings.expenses;
  const taxesSrc = snap ? snap.taxes : state.settings.taxes;
  // Só conta a partir do mês da 1ª cobrança (ver sumActiveInMonth em calc.js).
  const despesas = sumActiveInMonth(expensesSrc, ym);
  /* Anúncio pago entra AQUI, no Bloco A, e não no D: é custo operacional do
     mês, não investimento. Lançado no D, o lucro operacional apareceria
     melhor do que é. Não passa por snapshot porque cada lançamento já
     carrega o próprio mês — não tem como derivar. */
  const anuncios = adSpendInMonth(state.settings.adSpend, ym);
  const lucroBruto = receitaLiquida - custoProducao - frete - despesas - anuncios;
  const mei = sumActiveInMonth(taxesSrc, ym);
  const lucroOperacional = lucroBruto - mei;
  return { faturamento, taxas, receitaLiquida, custoProducao, frete, despesas, anuncios, lucroBruto, mei, lucroOperacional, qtdVendas: sales.length };
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


/* ===================== RENDER SHELL ===================== */
// Nome do produto (SaaS), diferente do nome do negócio de quem usa. Mantém em
// sincronia com o defaultName do js/pwa-setup.js.
const PRODUCT_NAME = 'Gestão 3D';
function render(){
  // Com negócio cadastrado: "Loja do Fulano — Gestão 3D". Sem: só o produto.
  const own = (state.settings.businessName||'').trim();
  document.title = own ? `${own} — ${PRODUCT_NAME}` : PRODUCT_NAME;
  const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if(appleTitleMeta) appleTitleMeta.setAttribute('content', own || PRODUCT_NAME);
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="sidebar-backdrop" id="sidebarBackdrop" onclick="closeSidebar()"></div>
    <div class="sidebar" id="sidebar">
      <div class="brand">
        <img class="brand-mark" src="${bizLogoSrc()}" alt="${esc(bizName())}">
        <div class="brand-text">${esc(bizName())}<small>Gestão do negócio</small></div>
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
        <button class="btn ghost sm" style="width:100%;margin-top:6px;padding:6px;${esc(syncStatus.email?'color:var(--teal);':'')}" onclick="openSyncModal()">${syncStatusLabel()}</button>
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
      <div id="subscriptionBanner"></div>
      <div class="content" id="content"></div>
    </div>
  `;
  renderTopbarActions();
  renderSubscriptionBanner();
  renderContent();
}
/* Aviso de assinatura no topo do conteúdo. Só aparece quando há algo pra
   dizer — conta em dia e sem nuvem configurada não mostram nada. */
function renderSubscriptionBanner(){
  const el = document.getElementById('subscriptionBanner');
  if(!el) return;
  const cfg = appConfig();
  const cta = cfg.checkoutUrl
    ? `<a class="btn sm primary" href="${safeUrl(cfg.checkoutUrl)}" target="_blank" rel="noopener" style="text-decoration:none;white-space:nowrap;">Assinar ${cfg.precoMensal||''}</a>`
    : '';
  const faixa = (cor, texto, acao) => `
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;
                margin:0 0 14px;padding:11px 16px;border-radius:10px;
                background:var(--${cor}-dim);border:1px solid var(--${cor});">
      <div style="font-size:13.5px;color:var(--${cor});font-weight:600;">${texto}</div>
      <div style="display:flex;gap:8px;align-items:center;">${acao||''}</div>
    </div>`;

  if(subscription.writeBlocked){
    el.innerHTML = faixa('red',
      'Assinatura vencida. Seus dados continuam aqui e você pode exportá-los, mas pararam de sincronizar entre aparelhos.',
      `${cta}<button class="btn ghost sm" onclick="exportBackup()">Exportar backup</button>`);
    return;
  }
  if(!subscription.loaded){ el.innerHTML = ''; return; }

  if(subscription.status === 'trialing'){
    const dias = trialDaysLeft();
    if(dias!=null && dias > 0){
      el.innerHTML = dias <= 5
        ? faixa('amber', `Período de teste termina em ${dias} dia${dias>1?'s':''}.`, cta)
        : '';
      return;
    }
    el.innerHTML = faixa('red', 'Período de teste encerrado. Assine para voltar a sincronizar seus dados.',
      `${cta}<button class="btn ghost sm" onclick="exportBackup()">Exportar backup</button>`);
    return;
  }
  if(subscription.status === 'past_due'){
    el.innerHTML = faixa('amber', 'Não conseguimos processar seu último pagamento.', cta);
    return;
  }
  if(subscription.status === 'canceled'){
    el.innerHTML = faixa('red', 'Assinatura cancelada. Você ainda pode consultar e exportar tudo.',
      `${cta}<button class="btn ghost sm" onclick="exportBackup()">Exportar backup</button>`);
    return;
  }
  el.innerHTML = '';
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
      // Uma linha por categoria já usada em algum produto, união com categorias
      // que já têm faixa de preço salva (pra não perder o dado se a categoria
      // deixar de ter produtos por um tempo) — não é uma lista livre.
      const allCats = Array.from(new Set([...productCategorySuggestions(), ...Object.keys(s.marketByGroup||{})])).sort((a,b)=>a.localeCompare(b,'pt-BR'));
      editingMarketGroups = allCats.map(cat=>{
        const g = (s.marketByGroup||{})[cat] || {};
        return { category:cat, min:g.min||0, avg:g.avg||0, max:g.max||0, checkedAt:g.checkedAt||'', note:g.note||'', unitBasis:g.unitBasis==='kit'?'kit':'unidade', kitSize:g.kitSize||1 };
      });
      editingCustomOrderPriceTable = {
        chaveiro: JSON.parse(JSON.stringify((s.customOrderPriceTable||{}).chaveiro||[])),
        lembrancinha: JSON.parse(JSON.stringify((s.customOrderPriceTable||{}).lembrancinha||[])),
        topo_bolo: JSON.parse(JSON.stringify((s.customOrderPriceTable||{}).topo_bolo||[])),
      };
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
  else if(currentTab==='produtos') el.innerHTML = `<button class="btn ghost" onclick="openQuickQuoteModal()">Orçamento rápido</button> <button class="btn ghost" onclick="produtosView=(produtosView==='diagnostico'?'lista':'diagnostico'); renderContent(); renderTopbarActions();">${produtosView==='diagnostico'?'Voltar à lista':'Diagnóstico'}</button> <button class="btn primary" onclick="openProductModal()">+ Novo produto</button>`;
  else if(currentTab==='personalizados') el.innerHTML = `<button class="btn ghost" onclick="personalizadosView=(personalizadosView==='diagnostico'?'kanban':'diagnostico'); renderContent(); renderTopbarActions();">${personalizadosView==='diagnostico'?'Voltar ao quadro':'Diagnóstico'}</button> <button class="btn primary" onclick="openQuickCustomOrderModal()">+ Nova encomenda personalizada</button>`;
  else if(currentTab==='anuncios') el.innerHTML = '';
  else if(currentTab==='estoque') el.innerHTML = stockTab==='materiais' ? `<button class="btn primary" onclick="openMaterialModal()">+ Nova matéria-prima</button>` : `<button class="btn primary" onclick="switchTab('impressao')">Ir pra Fila de Impressão</button>`;
  else if(currentTab==='impressao') el.innerHTML = `<button class="btn primary" onclick="openPrintJobModal()">+ Nova impressão</button>`;
  else if(currentTab==='calculo') el.innerHTML = `<button class="btn primary" onclick="switchTab('configuracoes')">Gerenciar impressoras</button>`;
  else if(currentTab==='anual') el.innerHTML = `<button class="btn ghost" onclick="exportAnnualExcel()">Exportar Excel</button> <button class="btn ghost" onclick="exportCurrentTabPDF()">Exportar PDF</button> <button class="btn primary" onclick="openInvestmentModal()">+ Adicionar investimento</button>`;
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
  else if(currentTab==='produtos') c.innerHTML = produtosView==='diagnostico' ? renderProdutosDiagnostico() : renderProdutos();
  else if(currentTab==='personalizados') c.innerHTML = personalizadosView==='diagnostico' ? renderPersonalizadosDiagnostico() : renderPersonalizados();
  else if(currentTab==='anuncios') c.innerHTML = renderAnuncios();
  else if(currentTab==='estoque') c.innerHTML = renderEstoque();
  else if(currentTab==='calculo') c.innerHTML = renderCalculo();
  else if(currentTab==='caixa') c.innerHTML = renderCaixa();
  else if(currentTab==='anual') c.innerHTML = renderAnual();
  else if(currentTab==='taxas') c.innerHTML = renderTaxas();
  else if(currentTab==='configuracoes') c.innerHTML = renderConfiguracoes();
  if(currentTab==='dashboard') setTimeout(drawDashboardCharts,0);
  if(currentTab==='anual') setTimeout(drawAnnualChart,0);
  setTimeout(syncFixedTableColumns,0);
  if(currentTab==='calculo') updateCalculoExample();
  if(currentTab==='taxas') renderPlatformRows();
  if(currentTab==='configuracoes'){
    renderNameValueRows('expenseRows', editingExpenses, 'updateExpenseRow', 'removeExpenseRow');
    renderNameValueRows('taxRows', editingTaxes, 'updateTaxRow', 'removeTaxRow');
    renderMachineRows();
    renderReserveRows();
    renderMarketGroupRows();
    ['chaveiro','lembrancinha','topo_bolo'].forEach(renderCustomOrderPriceTierRows);
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
    <div class="field"><label>Meta de faturamento (R$)</label><input type="number" min="0" id="goalInput" value="${state.settings.monthlyGoal||0}" step="50"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmGoal()">Salvar meta</button>
    </div>
  `);
}
function confirmGoal(){
  const val = numField('goalInput');
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
        <div style="height:220px;">${a.qtdVendas? '<canvas id="chartPlatform"></canvas>' : emptyState('Sem vendas registradas neste mês.', '+ Nova venda', `openSaleModal()`)}</div>
      </div>
    </div>

    ${renderDasCard()}
    ${renderMonthlyGoalCard(a)}

    <div class="grid g-3" style="margin-top:14px;">
      <div class="card">
        <div class="card-title">Estoque de matéria-prima<span class="sub">${low.length} item(ns) em alerta</span></div>
        ${renderLowStockList(low)}
      </div>
      <div class="card">
        <div class="card-title">Vendas recentes<span class="sub" style="cursor:pointer;color:var(--teal)" onclick="switchTab('vendas')">ver todas →</span></div>
        ${recentSales.length ? renderRecentSalesTable(recentSales) : emptyState('Nenhuma venda registrada ainda.', '+ Nova venda', `openSaleModal()`)}
      </div>
      <div class="card">
        <div class="card-title">Pedidos em aberto<span class="sub" style="cursor:pointer;color:var(--teal)" onclick="switchTab('pedidos')">ver fila →</span></div>
        ${renderOpenOrdersList()}
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <div class="card-title">Top produtos por receita<span class="sub">${monthLabel(currentMonth)}</span></div>
      <div style="height:260px;">${a.qtdVendas? '<canvas id="chartTop"></canvas>' : emptyState('Sem dados de vendas neste mês.', '+ Nova venda', `openSaleModal()`)}</div>
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
  if(!rows.length) return emptyState(
    'Sem vendas nos últimos 90 dias.<br><span style="font-size:12.5px;">Esta tabela ordena os produtos por lucro por hora de impressora — precisa de venda registrada pra ter o que comparar.</span>',
    '+ Nova venda', `openSaleModal()`);
  return `<div class="tbl-wrap tbl-responsive"><table>
    <thead><tr><th>Produto</th><th class="right">Qtd</th><th class="right">Receita</th><th class="right">Lucro</th><th class="right">Margem</th><th class="right">Lucro/hora impressora</th></tr></thead>
    <tbody>${rows.map(p=>`<tr>
      <td data-label="Produto">${esc(p.name)}</td>
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
  const boxOptions = state.materials.filter(m=>m.category==='Embalagem' && (m.isBox||m.isEnvelope||m.isSaquinho));
  const machines = state.settings.machines||[];
  if(filamentOptions.length===0 || boxOptions.length===0){
    toast('Cadastre ao menos um filamento e uma embalagem em Estoque antes de fazer um orçamento','err');
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
      <div class="field"><label>Tempo de impressão (h)</label><input type="number" min="0" id="qtTimeH" value="1" step="0.1" oninput="updateQuickQuotePreview()"></div>
      <div class="field"><label>Impressora</label><select id="qtMachine" onchange="updateQuickQuotePreview()">
        ${machines.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}
      </select></div>
      <div class="field"><label>Caixa</label><select id="qtBox" onchange="updateQuickQuotePreview()">
        ${boxOptions.map(b=>`<option value="${esc(b.name)}">${esc(b.name)}</option>`).join('')}
      </select></div>
    </div>
    <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" min="0" id="qtMargin" value="${((1-1/(state.settings.markupMultiplier||2.5))*100).toFixed(0)}" oninput="updateQuickQuotePreview()"></div>
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
/* ---------- Envelope padrão das listas repetíveis ----------
   Filamentos, mão de obra, ferramentas, componentes, despesas, impostos,
   plataformas, faixas de preço: todas são "N campos + botão de remover".
   Cada uma tinha grid, gap e proporções próprios escritos inline, o que fazia
   a mesma coisa parecer nove coisas diferentes. Aqui todas passam pelo mesmo
   cabeçalho de rótulos (uma vez, no topo) e pelas mesmas .form-row do CSS.
   `cols` é o grid-template-columns SEM a coluna do ×, que é acrescentada
   aqui — assim ninguém esquece de somar a largura do botão. */
const FORM_ROW_X = 34;
function formRowsHtml(cols, headers, rows, vazio){
  if(!rows.length) return vazio || '';
  return `<div class="form-rows" style="--cols:${cols} ${FORM_ROW_X}px;">
    <div class="form-row-head">${headers.map(h=>`<span>${h}</span>`).join('')}<span></span></div>
    ${rows.join('')}
  </div>`;
}
function formRowX(onclick){
  return `<button class="btn ghost sm form-row-x" title="Remover" onclick="${onclick}">×</button>`;
}
function renderQuoteFilamentRows(){
  const el = document.getElementById('qtFilamentRows');
  if(!el) return;
  const filamentOptions = state.materials.filter(m=>m.category==='Filamento');
  el.innerHTML = formRowsHtml('minmax(0,1.6fr) minmax(0,1fr)', ['Filamento','Peso (g)'],
    quoteFilaments.map((f,i)=>`
    <div class="form-row">
      <select onchange="quoteFilaments[${i}].materialName=this.value; updateQuickQuotePreview();">
        ${filamentOptions.map(fo=>`<option value="${esc(fo.name)}" ${esc(f.materialName===fo.name?'selected':'')}>${esc(fo.name)}</option>`).join('')}
      </select>
      <input type="number" min="0" step="0.01" value="${f.weightG}" placeholder="peso (g)" oninput="quoteFilaments[${i}].weightG=nn(this.value); updateQuickQuotePreview();">
      ${formRowX(`removeQuoteFilamentRow(${i})`)}
    </div>
  `));
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
  el.innerHTML = formRowsHtml('minmax(0,1.6fr) minmax(0,1fr)', ['Ação','Minutos'],
    quoteLaborActions.map((a,i)=>`
    <div class="form-row">
      <input list="laborActionOptions" value="${esc(a.action)}" placeholder="Ação (ex: Lixar)" oninput="quoteLaborActions[${i}].action=this.value; updateQuickQuotePreview();">
      <input type="number" min="0" step="1" value="${a.minutes}" placeholder="minutos" oninput="quoteLaborActions[${i}].minutes=nn(this.value); updateQuickQuotePreview();">
      ${formRowX(`removeQuoteLaborActionRow(${i})`)}
    </div>
  `));
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
    timeH: numField('qtTimeH'),
    bubbleWrapM: 0,
    boxType: document.getElementById('qtBox').value,
    failureMarginPct: 0.10,
    laborActions: quoteLaborActions,
    machineId: document.getElementById('qtMachine').value,
    desiredMarginPct: numField('qtMargin'),
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
    ${extraListingPlatforms().map(plat=>`<div class="calc-line" style="color:var(--text-faint);"><span>↳ ${esc(plat.name)} (já com a taxa)</span><span>${brl(c.suggestedPriceExtra[plat.id])}</span></div>`).join('')}
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
/* Estado vazio, com uma saída opcional. Tela vazia sem botão obriga quem é
   novo a adivinhar onde fica a ação — `acaoLabel`+`acaoOnclick` põem o
   caminho ali. Chamadas antigas com só a mensagem seguem funcionando. */
function emptyState(msg, acaoLabel, acaoOnclick){
  const botao = (acaoLabel && acaoOnclick)
    ? `<div style="margin-top:12px;"><button class="btn primary sm" onclick="${acaoOnclick}">${acaoLabel}</button></div>`
    : '';
  return `<div class="empty">${msg}${botao}</div>`;
}
/* Bloqueio COM saída. Antes isto era um toast dizendo "vá cadastrar X" —
   beco sem saída pra quem ainda não sabe onde as coisas ficam, e o texto
   ainda apontava pra um menu que deixou de existir. Aqui o caminho vira
   botão, e dá pra explicar POR QUE aquilo é obrigatório. */
function blockedBy(titulo, explicacao, botaoLabel, botaoOnclick){
  showModal(titulo, `
    <div class="field hint" style="margin-top:0;margin-bottom:16px;">${explicacao}</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Agora não</button>
      <button class="btn primary" onclick="closeModal(); ${botaoOnclick}">${botaoLabel}</button>
    </div>
  `);
}
function renderOpenOrdersList(){
  const open = state.orders.filter(o=>o.status!=='Enviado').sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999')).slice(0,6);
  if(open.length===0) return emptyState('Nenhuma encomenda em aberto.', '+ Novo pedido', `openOrderModal()`);
  return `<div class="tbl-wrap tbl-responsive"><table><thead><tr><th>Cliente</th><th>Produto</th><th>Status</th></tr></thead><tbody>
    ${open.map(o=>`<tr><td data-label="Cliente">${orderCustomerName(o)||'—'}</td><td data-label="Produto">${o.qty}x ${esc(o.productName)}</td><td data-label="Status"><span class="badge info">${esc(o.status)}</span></td></tr>`).join('')}
  </tbody></table></div>`;
}
function renderLowStockList(low){
  if(!state.materials.length) return emptyState('Nenhuma matéria-prima cadastrada.', '+ Nova matéria-prima', `openMaterialModal()`);
  const rows = state.materials.slice().sort((a,b)=> (a.stock-a.lowStock) - (b.stock-b.lowStock)).slice(0,8);
  return `<div class="tbl-wrap tbl-responsive"><table><thead><tr><th>Material</th><th class="right">Estoque</th><th class="right">Mínimo</th><th>Status</th></tr></thead><tbody>
    ${rows.map(m=>`<tr><td data-label="Material">${esc(m.name)}</td><td class="right num" data-label="Estoque">${num(m.stock,0)} ${esc(m.unit)}</td><td class="right num" data-label="Mínimo">${num(m.lowStock,0)} ${esc(m.unit)}</td><td data-label="Status">${stockBadge(m)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function stockBadge(m){
  if(m.stock<=0) return `<span class="badge bad">Zerado</span>`;
  if(m.stock<=m.lowStock) return `<span class="badge warn">Baixo</span>`;
  return `<span class="badge ok">Ok</span>`;
}
function renderRecentSalesTable(sales){
  return `<div class="tbl-wrap tbl-responsive"><table><thead><tr><th>Data</th><th>Produto</th><th>Plataforma</th><th class="right">Líquido</th></tr></thead><tbody>
    ${sales.map(s=>`<tr><td class="num" data-label="Data">${fmtDate(s.date)}</td><td data-label="Produto">${esc(s.productName)}</td><td data-label="Plataforma">${platformBadge(s.platform)}</td><td class="right num" data-label="Líquido">${brl(s.netReceipt)}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function fmtDate(d){ if(!d) return '-'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function platformBadge(p){
  const palette = ['warn','bad','info','ok','mut'];
  const idx = state.settings.platforms.findIndex(x=>x.name===p);
  const cls = palette[idx>=0 ? idx%palette.length : palette.length-1];
  // Escapa AQUI: esta função devolve HTML, então quem a chama não pode
  // envolvê-la em esc() (a marcação viraria texto). O nome da plataforma é
  // digitado pelo usuário, então a proteção tem que morar dentro.
  return `<span class="badge ${cls}">${esc(p)}</span>`;
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
    return `<div class="card">${emptyState(
      'Nenhum pedido em aberto.<br><span style="font-size:12.5px;">O quadro acompanha da fila de impressão até o envio, e a venda é registrada sozinha quando você marca como enviado.</span>',
      '+ Novo pedido', `openOrderModal()`)}</div>`;
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
      <div style="font-weight:600;font-size:13px;">${esc(m.name)}</div>
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
    <div style="font-size:12.5px;color:var(--text-dim);margin-top:3px;">${o.qty}x ${esc(o.productName)}</div>
    ${o.dueDate ? `<div style="font-size:11px;margin-top:5px;color:${overdue?'var(--red)':'var(--text-faint)'}">${overdue?'Atrasado — ':'Prazo: '}${fmtDate(o.dueDate)}</div>` : ''}
    ${o.notes ? `<div style="font-size:11.5px;color:var(--text-dim);margin-top:6px;background:var(--bg-alt);border-radius:6px;padding:6px 8px;">${esc(o.notes)}</div>` : ''}
    <select style="margin-top:10px;width:100%;" onchange="changeOrderStatus('${o.id}', this.value)">
      ${ORDER_STATUSES.map(s=>`<option value="${esc(s)}" ${esc(s===o.status?'selected':'')}>${esc(s)}</option>`).join('')}
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
  if(state.products.length===0){
    blockedBy('Nenhum produto cadastrado',
      'A encomenda personalizada parte de um produto já cadastrado, pra reaproveitar peso, tempo e custo em vez de você digitar tudo de novo. Cadastre o primeiro e volte aqui.',
      'Ir para Produtos', `switchTab('produtos');`);
    return;
  }
  showModal('Nova encomenda', `
    <div class="field"><label>Cliente (opcional)</label><select id="oCust">
      <option value="">Avulso / sem cadastro</option>
      ${state.customers.map(cu=>`<option value="${cu.id}">${esc(cu.name)}</option>`).join('')}
    </select></div>
    <div class="row2">
      <div class="field"><label>Produto</label><select id="oProd">${state.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
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
  const qty = numField('oQty');
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
  const acc = { faturamento:0, taxas:0, receitaLiquida:0, custoProducao:0, frete:0, despesas:0, anuncios:0, mei:0, lucroBruto:0, lucroOperacional:0, qtdVendas:0, parcelas:0 };
  months.forEach(ym=>{
    const a = blocoA(ym);
    const b = blocoB(ym);
    acc.faturamento += a.faturamento;
    acc.taxas += a.taxas;
    acc.receitaLiquida += a.receitaLiquida;
    acc.custoProducao += a.custoProducao;
    acc.frete += a.frete;
    acc.despesas += a.despesas;
    acc.anuncios += a.anuncios;
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
        ${caixaRow('(−) Anúncios / tráfego pago', -y.anuncios)}
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
          <td data-label="Item">${esc(inv.name)}</td><td data-label="Categoria"><span class="chip">${esc(inv.category||'Outros')}</span></td><td class="num" data-label="Data">${fmtDate(inv.date)}</td><td data-label="Pagamento">${payLabel}</td><td class="right num" data-label="Valor">${brl(inv.value)}</td>
          <td class="right"><button class="btn ghost sm" onclick="deleteInvestment('${inv.id}')">Excluir</button></td>
        </tr>`;}).join('')}</tbody>
      </table></div>` : emptyState(
        'Nenhum investimento cadastrado ainda.<br><span style="font-size:12.5px;">Compras avulsas ou parceladas — impressora, ferramenta, lote de filamento. Aparecem no Bloco D do Caixa, depois do lucro operacional.</span>',
        '+ Adicionar investimento', `openInvestmentModal()`)}
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
  /* O mesmo número quer dizer coisas diferentes conforme o regime, e usar o
     texto errado induz a erro grave: quem NÃO é MEI não pode ser
     "desenquadrado", e — mais importante — o teto não é gatilho pra abrir
     MEI. Não existe piso de faturamento abaixo do qual não se formaliza. */
  const ehMei = state.settings.taxRegime === 'mei';
  let status;
  if(ehMei){
    if(y.faturamento>tolerance) status = {cls:'bad', text:'Já passou da tolerância de 20% — risco de desenquadramento retroativo'};
    else if(y.faturamento>limit) status = {cls:'warn', text:'Já passou do limite anual — ainda dentro da tolerância de 20%, mas fique atento'};
    else if(isCurrentYear && projected>limit) status = {cls:'warn', text:`No ritmo atual (${brl(monthlyAvg)}/mês), deve ultrapassar o limite este ano`};
    else status = {cls:'ok', text:'Dentro do limite'};
  } else {
    if(y.faturamento>limit) status = {cls:'warn', text:'Acima do teto do MEI — nesse faturamento o enquadramento seria ME'};
    else if(isCurrentYear && projected>limit) status = {cls:'warn', text:`No ritmo atual (${brl(monthlyAvg)}/mês), passa do teto do MEI este ano`};
    else status = {cls:'ok', text:'Cabe no teto do MEI'};
  }
  return `
    <div class="card" style="margin-top:14px;">
      <div class="card-title">${ehMei?'Teto do MEI':'Seu faturamento x teto do MEI'}<span class="sub">teto anual: ${brl(limit)}</span></div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <div class="progress" style="height:10px;"><div style="width:${pctReal}%;background:${status.cls==='bad'?'var(--red)':status.cls==='warn'?'var(--amber)':'var(--teal)'}"></div></div>
          <div style="font-size:11.5px;color:var(--text-faint);margin-top:6px;">${brl(y.faturamento)} faturado — ${pct(Math.min(999,(y.faturamento/limit)*100),0)} do limite${isCurrentYear && monthsWithData<12 ? ` · projeção pro ano inteiro: ${brl(projected)}` : ''}</div>
        </div>
        <span class="badge ${status.cls}">${status.text}</span>
      </div>
      <div class="field hint" style="margin-top:10px;">${ehMei
        ? `Ultrapassar em até 20% (${brl(tolerance)}) permite continuar no regime até dezembro pagando DAS complementar; acima disso o desenquadramento retroage ao início do ano. Teto editável em Configurações, caso a Receita reajuste.`
        : `<strong>Os ${brl(limit)} são um teto, não um gatilho.</strong> É o quanto dá pra faturar <em>sendo</em> MEI — passou disso, o enquadramento vira ME.
           <br><br>Não existe valor abaixo do qual não precisa formalizar: quem vende com habitualidade se enquadra independente do quanto, e o imposto de pessoa física vale desde o primeiro real. Então esta barra não responde <em>“já preciso abrir MEI?”</em>, e sim <strong>“se eu formalizar, MEI ainda me serve?”</strong> — a obrigação em si é conversa de contador.`}</div>
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
        <option value="Componentes">Componentes</option>
        <option value="Outros">Outros</option>
      </select></div>
      <div class="field"><label>Valor total (R$)</label><input type="number" min="0" id="invValue" step="0.01"></div>
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
      <label class="field-checkbox"><input type="checkbox" id="invSyncMachine" style="width:auto;" checked> Cadastrar automaticamente como impressora no Bloco B (Caixa)</label>
      <div class="field hint" style="margin-top:6px;">Cria uma impressora nova em Configurações com essa parcela — não afeta impressoras já cadastradas.</div>
    </div>
    <div id="invStockBlock" style="display:none;background:var(--bg-alt);border:1px solid var(--line-soft);border-radius:8px;padding:10px 12px;margin-bottom:12px;">
      <label class="field-checkbox" style="margin-bottom:8px;"><input type="checkbox" id="invAddStock" style="width:auto;" checked onchange="document.getElementById('invStockFields').style.display=this.checked?'grid':'none'"> Já entra no estoque de matéria-prima</label>
      <div id="invStockFields" class="row2" style="margin-bottom:0;">
        <div class="field" style="margin-bottom:0;"><label>Material</label><select id="invMaterial"></select></div>
        <div class="field" style="margin-bottom:0;"><label>Quantidade recebida</label><input type="number" min="0" id="invQty" step="0.01" placeholder="Ex: 1000"></div>
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
  const isStockCategory = cat==='Filamento' || cat==='Embalagem' || cat==='Ferramentas' || cat==='Componentes';
  document.getElementById('invStockBlock').style.display = isStockCategory ? 'block' : 'none';
  if(isStockCategory){
    const matSelect = document.getElementById('invMaterial');
    const opts = state.materials.filter(m=>m.category===cat);
    matSelect.innerHTML = opts.length
      ? opts.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')
      : `<option value="">Nenhum material dessa categoria — cadastre em Estoque primeiro</option>`;
  }
}
function confirmInvestment(){
  const name = document.getElementById('invName').value.trim();
  const value = numField('invValue');
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
  if((category==='Filamento'||category==='Embalagem'||category==='Ferramentas'||category==='Componentes') && document.getElementById('invAddStock') && document.getElementById('invAddStock').checked){
    const matId = document.getElementById('invMaterial').value;
    const qty = numField('invQty');
    const mat = state.materials.find(m=>m.id===matId);
    if(mat && qty>0){
      mat.stock += qty;
      mat.purchasePrice = value; mat.purchaseQty = qty; mat.costPerUnit = value/qty;
      saveMaterials();
      extras.push(`${num(qty,1)} ${esc(mat.unit)} adicionados ao estoque de "${esc(mat.name)}"`);
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
  // Botão que leva, em vez de caminho escrito: "Configurações → Precificação"
  // apontava pra uma seção que nem existe ali (Precificação está em Taxas, e
  // o PIX tem seção própria). Instrução escrita apodrece quando a navegação
  // muda; botão não. Ver "Onboarding" no CLAUDE.md.
  if(!state.settings.pixKey){
    blockedBy('Chave PIX não cadastrada',
      'O QR de cobrança é gerado a partir da sua chave PIX — sem ela não dá pra montar o código que o cliente escaneia.',
      'Cadastrar chave PIX', `switchTab('configuracoes');`);
    return;
  }
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
/* ---------- Exportar a tela atual em PDF (via impressão do navegador) ----------
   O que saía antes era a página viva jogada no papel: caixas de filtro com
   <select> dentro, rodapés de botão vazios, o gráfico virando um retângulo
   em branco e tudo colado na borda da folha, sem nada dizendo que documento
   era aquele. Daí a impressão de "quadrados soltos".

   Aqui o documento é preparado antes de imprimir e desfeito depois. O que o
   CSS de impressão não consegue resolver sozinho é o <canvas>: ele é
   bitmap, não reflui, e o Chart.js redesenha no evento de mídia — às vezes
   pra um canvas de tamanho zero. Então cada gráfico é congelado numa <img>
   antes, e o que estiver em branco (CDN do Chart.js fora do ar, por
   exemplo) tem o cartão inteiro removido, em vez de imprimir uma moldura
   vazia. */
function canvasEstaEmBranco(canvas){
  try{
    const ctx = canvas.getContext('2d');
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for(let i = 3; i < data.length; i += 4) if(data[i] !== 0) return false;
    return true;
  }catch(e){ return false; } // Sem leitura possível, imprime como está.
}
function prepararImpressaoDaTela(){
  const content = document.querySelector('.content');
  if(!content) return;

  document.querySelectorAll('.content canvas').forEach(canvas=>{
    const cartao = canvas.closest('.card') || canvas.parentElement;
    if(canvasEstaEmBranco(canvas)){
      cartao.dataset.printRemovido = '1';
      cartao.style.display = 'none';
      return;
    }
    const img = document.createElement('img');
    img.src = canvas.toDataURL('image/png');
    img.className = 'print-chart';
    img.dataset.printTemp = '1';
    canvas.dataset.printOculto = '1';
    canvas.style.display = 'none';
    canvas.parentElement.insertBefore(img, canvas);
  });

  const cab = document.createElement('div');
  cab.id = 'printHeader';
  cab.dataset.printTemp = '1';
  const aba = tabTitle();
  const periodo = currentTab==='anual' ? currentYear : monthLabel(currentMonth);
  cab.innerHTML = `<div class="print-biz">${esc(bizName())}</div>
    <div class="print-doc">${aba} — ${periodo}</div>
    <div class="print-meta">Gerado em ${new Date().toLocaleString('pt-BR')} · ${PRODUCT_NAME}</div>`;
  content.insertBefore(cab, content.firstChild);
}
function desfazerImpressaoDaTela(){
  document.querySelectorAll('[data-print-temp]').forEach(el=>el.remove());
  document.querySelectorAll('[data-print-oculto]').forEach(el=>{
    el.style.display = ''; delete el.dataset.printOculto;
  });
  document.querySelectorAll('[data-print-removido]').forEach(el=>{
    el.style.display = ''; delete el.dataset.printRemovido;
  });
}
function exportCurrentTabPDF(){
  prepararImpressaoDaTela();
  const limpar = ()=>{ desfazerImpressaoDaTela(); window.removeEventListener('afterprint', limpar); };
  window.addEventListener('afterprint', limpar);
  // O timeout dá ao navegador uma chance de decodificar as <img> dos
  // gráficos antes de montar as páginas.
  setTimeout(()=>window.print(), 120);
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
  const rows = lines.map((l,i)=>`<tr style="${i%2===0?'background:#F6F7F9;':''}"><td style="padding:8px 10px;">${esc(l.productName)}</td><td style="text-align:center;padding:8px 10px;">${l.qty}</td><td style="text-align:right;padding:8px 10px;">${brl(l.grossPrice/l.qty)}</td><td style="text-align:right;padding:8px 10px;">${brl(l.grossPrice)}</td></tr>`).join('');
  printHTML(`
    <div class="catalog-summary" style="max-width:480px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="font-size:22px;margin:0 0 4px;color:#BD4119;">${esc(bizName())}</h1>
        <div style="color:#5D6270;font-size:12.5px;">Recibo de venda</div>
      </div>
      <div style="border-top:1px solid #E2E4E9;border-bottom:1px solid #E2E4E9;padding:14px 0;margin-bottom:18px;font-size:13px;color:#1A1D23;">
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5D6270;">Data</span><span>${fmtDate(s.date)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5D6270;">Cliente</span><span>${cuName}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;"><span style="color:#5D6270;">Forma</span><span>${esc(s.platform)}</span></div>
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

/* ===================== FILA DE IMPRESSÃO ===================== */
// Rótulos pro detalhamento de custo — embalagem mostra o tipo escolhido (caixa/
// envelope/saquinho + bolha/fita se usados), componentes lista cada um com qtd.
function packagingLabelFor(prod){
  const extras = [];
  if((prod.bubbleWrapM||0)>0) extras.push('bolha');
  if((prod.tapeM||0)>0) extras.push('fita');
  // Escapa aqui, na origem: o retorno é texto de exibição e vai direto pra
  // template string em 3 lugares — igual componentsLabelFor logo abaixo.
  const base = esc(prod.boxType || 'nenhuma');
  return extras.length ? `${base} + ${extras.join(' + ')}` : base;
}
function componentsLabelFor(prod){
  return (prod.components||[]).map(comp=>{
    const mat = state.materials.find(x=>x.id===comp.materialId);
    return `${num(comp.qty||0,0)}x ${esc(mat?mat.name:'?')}`;
  }).join(' + ');
}
function renderImpressao(){
  const thisMonth = todayStr().slice(0,7);
  const thisYear = todayStr().slice(0,4);
  const jobsMonth = state.printFailures.filter(f=>f.date && f.date.slice(0,7)===thisMonth);
  const jobsYear = state.printFailures.filter(f=>f.date && f.date.slice(0,4)===thisYear);
  const lossMonth = jobsMonth.reduce((a,f)=>a+(f.totalLoss||0),0);
  const lossYear = jobsYear.reduce((a,f)=>a+(f.totalLoss||0),0);
  const failuresMonth = jobsMonth.filter(f=>f.outcome==='failure').length;
  // Horas de bico ocupadas no mês — o recurso escasso do negócio, mesmo
  // critério do R$/hora usado no resto do app.
  const hoursMonth = jobsMonth.reduce((a,f)=>a+(f.hoursUsed||0),0);
  const hoursLostMonth = jobsMonth.filter(f=>f.outcome==='failure').reduce((a,f)=>a+(f.hoursUsed||0),0);

  const recent = state.printFailures.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,15);
  const outcomeBadge = (o)=>({success:'<span class="badge ok">Sucesso</span>',test:'<span class="badge info">Teste</span>',failure:'<span class="badge bad">Falha</span>'}[o]||o);

  return `
    <div class="grid g-4" style="margin-bottom:16px;">
      <div class="kpi" style="--accent:var(--red)"><div class="kpi-label">Perdido este mês</div><div class="kpi-value neg">${brl(lossMonth)}</div><div class="kpi-note">${failuresMonth} falha(s)</div></div>
      <div class="kpi" style="--accent:var(--red)"><div class="kpi-label">Perdido este ano</div><div class="kpi-value neg">${brl(lossYear)}</div><div class="kpi-note">${jobsYear.filter(f=>f.outcome==='failure').length} falha(s)</div></div>
      <div class="kpi"><div class="kpi-label">Impressões este mês</div><div class="kpi-value">${jobsMonth.length}</div><div class="kpi-note">&nbsp;</div></div>
      <div class="kpi" style="--accent:var(--teal)"><div class="kpi-label">Horas de impressora no mês</div><div class="kpi-value">${fmtHm(hoursMonth)}</div><div class="kpi-note">${hoursLostMonth>0?`${fmtHm(hoursLostMonth)} perdidas em falha`:'&nbsp;'}</div></div>
    </div>
    <div class="card">
      <div class="card-title">Histórico de impressões<span class="sub">mais recentes primeiro</span></div>
      ${recent.length ? `<div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Data</th><th>Produto</th><th class="right">Qtd</th><th class="right">Tempo</th><th>Filamento gasto</th><th>Resultado</th><th class="right">Prejuízo</th><th>Obs.</th><th></th></tr></thead>
        <tbody>${recent.map(f=>{
          const filamentSummary = (f.filamentUsage||[]).map(u=>`${esc(u.materialName)} ${num(u.qty,1)}${esc(u.unit)}`).join(' + ') || '—';
          return `<tr>
          <td class="num" data-label="Data">${fmtDate(f.date)}</td>
          <td data-label="Produto">${esc(f.productName)}</td>
          <td class="right num" data-label="Qtd">${num(f.qty||1,0)}${f.outcome==='failure'&&f.pctComplete<100?` (${num(f.pctComplete,0)}%)`:''}</td>
          <td class="right num" data-label="Tempo">${f.hoursUsed>0?fmtHm(f.hoursUsed):'—'}</td>
          <td data-label="Filamento gasto" title="${filamentSummary}">${filamentSummary}</td>
          <td data-label="Resultado">${outcomeBadge(f.outcome)}</td>
          <td class="right num" data-label="Prejuízo" style="color:var(--red)">${f.totalLoss?brl(f.totalLoss):'—'}</td>
          <td data-label="Obs.">${esc(f.notes||'—')}</td>
          <td class="right"><button class="btn ghost sm" onclick="openPrintJobModal('${f.productId}', ${f.qty||1}, '${f.outcome}', '${f.id}')">Editar</button> <button class="btn ghost sm" onclick="deletePrintJob('${f.id}')">Excluir</button></td>
        </tr>`;
        }).join('')}</tbody>
      </table></div>` : emptyState(
        'Nenhuma impressão registrada ainda.<br><span style="font-size:12.5px;">Registrar a leva soma as peças ao estoque; registrar a falha desconta o material e a energia que foram perdidos.</span>',
        '+ Nova impressão', `openPrintJobModal()`)}
    </div>
  `;
}
let editingPrintJobId = null;
let printJobFirstRender = false;
// Enquanto false, o campo de horas segue o tempo cadastrado no produto; ao
// primeiro toque do usuário ele para de ser sobrescrito. É o pedido: "por
// padrão o registrado no produto, mas com opção de ajustar".
let printJobHoursTouched = false;
function openPrintJobModal(productId, presetQty, presetOutcome, editId){
  if(state.products.length===0){
    blockedBy('Nenhum produto cadastrado',
      'A fila registra levas de um produto — é assim que o estoque de peças prontas sobe e que o desperdício de falha é contabilizado. Cadastre o primeiro e volte aqui.',
      'Ir para Produtos', `switchTab('produtos');`);
    return;
  }
  editingPrintJobId = editId || null;
  printJobFirstRender = !!editingPrintJobId;
  // Registro que já existe pode ter horas corrigidas na mão — não sobrescrever
  // com o cálculo do cadastro só porque a modal reabriu.
  printJobHoursTouched = !!editingPrintJobId;
  const editing = editingPrintJobId ? state.printFailures.find(x=>x.id===editingPrintJobId) : null;
  const selId = productId || (editing && editing.productId) || state.products[0].id;
  const outcomeVal = editing ? editing.outcome : (presetOutcome||'success');
  showModal(editing?'Editar impressão':'Nova impressão', `
    <div class="field"><label>Produto</label><select id="pjProd" onchange="updatePrintJobPreview()">
      ${state.products.map(p=>`<option value="${p.id}" ${p.id===selId?'selected':''}>${esc(p.name)}</option>`).join('')}
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
    <div class="field"><label>Horas de impressão</label>
      <input type="number" id="pjHours" step="0.1" min="0" value="${editing?num(editing.hoursUsed||0,1).replace(',','.'):'0'}" oninput="printJobHoursTouched=true; updatePrintJobPreview()">
      <div class="field hint" id="pjHoursHint" style="margin-top:4px;"></div>
    </div>
    <div class="field"><label>Observações (opcional)</label><input id="pjNotes" value="${esc(editing?(editing.notes||''):'')}" placeholder="Ex: descolou da mesa, entupiu o bico..."></div>
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
  const qty = numField('pjQty');
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
      <span>${esc(r.materialName)} <span style="color:var(--text-faint);font-size:11px;">(estoque: ${mat?num(mat.stock,1):'0'}${esc(mat?mat.unit:'g')})</span></span>
      <span><input type="number" min="0" id="pjFil_${i}" value="${(need||0).toFixed(1)}" step="0.1" style="width:80px;padding:4px 6px;text-align:right;"> ${esc(mat?mat.unit:'g')}</span>
    </div>`;
  }).join('');
  // Horas: acompanha o cadastro do produto até o usuário mexer no campo.
  // Máquina que roda 2 peças ao mesmo tempo, filamento que enrosca e some
  // meia hora, leva que parou pra troca de cor — nada disso está no cadastro,
  // e é a hora de máquina que decide o R$/hora de tudo.
  const horasPrevistas = (prod.timeH||0) * qty * (pct/100);
  const hoursEl = document.getElementById('pjHours');
  if(hoursEl){
    if(!printJobHoursTouched) hoursEl.value = horasPrevistas.toFixed(1);
    const horasInformadas = Math.max(0, parseFloat(hoursEl.value)||0);
    const dif = horasInformadas - horasPrevistas;
    const hintEl = document.getElementById('pjHoursHint');
    if(hintEl){
      hintEl.innerHTML = (prod.timeH||0)===0
        ? `O produto "${esc(prod.name)}" está sem tempo de impressão cadastrado — informe aqui quanto essa leva levou.`
        : `Cadastro do produto: ${num(prod.timeH,2)}h × ${num(qty,0)} = <strong>${num(horasPrevistas,1)}h</strong>${pct<100?` (${pct}% concluído)`:''}.`
          + (Math.abs(dif) > 0.05 ? ` Você informou <strong>${dif>0?'+':''}${num(dif,1)}h</strong> de diferença — vale só pra esta leva, não altera o cadastro.` : ' Ajuste se a leva levou mais ou menos que isso.');
    }
  }

  const printUnits = printUnitsOf(prod);
  const stockLine = outcome==='success'
    ? `<div class="calc-line total"><span>Estoque de "${esc(prod.name)}" após produção</span><span>${num(prod.stock,0)} → ${num(prod.stock+qty*printUnits,0)}</span></div>${printUnits>1?`<div class="field hint" style="margin-top:-6px;">${qty} impressão${qty>1?'ões':''} × ${printUnits} peças/leva = ${qty*printUnits} peças</div>`:''}`
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
  // stock é sempre em peças — uma impressão (qty=leva) rende unitsPerPrint peças cada.
  if(j.outcome==='success') prod.stock = Math.max(0, prod.stock - piecesFromPrintJob(prod, j.qty||1));
  // Devolve à máquina EXATAMENTE a hora que o registro gravou — ver
  // machineHoursOfJob em calc.js, onde a regra está testada.
  const horas = machineHoursOfJob(j, prod);
  const machines = state.settings.machines||[];
  const machine = machines.find(m=>m.id===prod.machineId) || machines[0];
  if(machine) machine.hoursUsed = Math.max(0, (machine.hoursUsed||0) - horas);
}
function confirmPrintJob(){
  const prod = state.products.find(p=>p.id===document.getElementById('pjProd').value);
  const qty = numField('pjQty');
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
  // stock é sempre em peças — uma impressão (qty=leva) rende unitsPerPrint peças cada.
  if(outcome==='success') prod.stock += piecesFromPrintJob(prod, qty);
  if(outcome==='failure'){
    materialCost = filamentUsage.reduce((sum,u)=>sum+u.qty*filamentCost(u.materialName),0);
    // energyCost de calcProduct() agora é POR UNIDADE (ver unitsPerPrint) — aqui
    // qty é número de IMPRESSÕES (levas), não de unidades, então desfaz a
    // divisão (×units) antes de multiplicar pelas levas rodadas.
    const cFail = calcProduct(prod);
    energyCost = cFail.energyCost*cFail.printUnits*qty*(pctComplete/100);
    totalLoss = materialCost+energyCost;
  }
  // hoursUsed é o tempo REAL desta leva: começa no que o cadastro do produto
  // prevê e o usuário corrige no campo se a leva levou diferente. Uma vez
  // gravado nunca é recalculado — se o produto mudar de 3h pra 5h, este
  // registro continua com as 3h de então (mesma regra dos snapshots de venda,
  // ver pegadinha #8 do CLAUDE.md). Falha parcial só gastou a fração que
  // chegou a imprimir, e é isso que o padrão do campo já traz.
  const hoursInput = document.getElementById('pjHours');
  const hoursUsed = hoursInput
    ? Math.max(0, parseFloat(hoursInput.value)||0)
    : (prod.timeH||0) * qty * (pctComplete/100);

  // O contador da máquina soma exatamente a mesma hora gravada no registro —
  // senão o estorno (editar/excluir) devolveria um número diferente do que
  // entrou, e a hora de máquina, que é a base do R$/hora, iria derivando.
  const machines = state.settings.machines||[];
  const machine = machines.find(m=>m.id===prod.machineId) || machines[0];
  if(machine){ machine.hoursUsed = (machine.hoursUsed||0) + hoursUsed; }
  if(oldJob){
    Object.assign(oldJob, { date, productId:prod.id, productName:prod.name, qty, outcome, pctComplete, hoursUsed, materialCost, energyCost, totalLoss, notes, filamentUsage });
  } else {
    state.printFailures.push({ id:uid(), date, productId:prod.id, productName:prod.name, qty, outcome, pctComplete, hoursUsed, materialCost, energyCost, totalLoss, notes, filamentUsage });
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
        <div class="field"><label>Tarifa (R$ por kWh)</label><input type="number" min="0" id="calcTariff" value="${tariff}" step="0.001" onchange="updateEnergyTariff(this.value)"></div>
        <div class="field"><label class="hint" style="display:block;margin-bottom:5px;">&nbsp;</label><div class="hint" style="padding-top:9px;">Confira o valor exato na sua fatura da Enel — o número muda com reajustes anuais e bandeiras tarifárias. Assim que atualizar aqui, todas as impressoras com potência preenchida recalculam sozinhas.</div></div>
      </div>
    </div>

    <div class="section-title">Impressoras — energia e depreciação</div>
    ${machines.length ? `<div class="card"><div class="tbl-wrap tbl-responsive"><table>
      <thead><tr><th>Impressora</th><th class="right">Potência</th><th class="right">Energia/h</th><th class="right">Preço − residual</th><th class="right">Vida útil</th><th class="right">Depreciação/h</th></tr></thead>
      <tbody>${machines.map(m=>`<tr>
        <td data-label="Impressora">${esc(m.name)}</td>
        <td class="right num" data-label="Potência">${m.powerConsumptionKw>0 ? num(m.powerConsumptionKw,2)+' kW' : '<span class="chip">manual</span>'}</td>
        <td class="right num" data-label="Energia/h">${brl(machineEnergyCostPerHour(m))}</td>
        <td class="right num" data-label="Preço − residual">${brl(m.price)} − ${brl(m.residual||0)}</td>
        <td class="right num" data-label="Vida útil">${num(m.lifeHours||0,0)}h</td>
        <td class="right num" data-label="Depreciação/h">${brl(machineDeprCostPerHour(m))}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="field hint" style="margin-top:10px;">Energia/h = potência (kW) × tarifa. Se a potência estiver em branco, usa o valor manual definido na impressora. Depreciação/h = (preço − valor residual) ÷ vida útil em horas — quanto a máquina "perde de valor" a cada hora de uso.</div>
    </div>` : `<div class="card">${emptyState(
      'Nenhuma impressora cadastrada.<br><span style="font-size:12.5px;">Sem ela não há custo de energia nem depreciação por hora — o custo do produto sai incompleto.</span>',
      'Gerenciar impressoras', `switchTab('configuracoes')`)}</div>`}

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
          <div style="font-weight:600;font-size:13px;">${esc(m.name)}</div>
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
        ${state.products.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}
      </select></div>
      <div id="calculoExample"></div>
    </div>

  `;
}
function updateEnergyTariff(val){
  state.settings.energyTariffPerKwh = nn(val);
  saveSettings();
  toast('Tarifa de energia atualizada');
  renderContent();
}
function updateCalculoExample(){
  const sel = document.getElementById('calcProdSelect');
  const box = document.getElementById('calculoExample');
  if(!sel || !box) return;
  if(state.products.length===0){ box.innerHTML = emptyState('Cadastre um produto pra ver o exemplo.', '+ Novo produto', `openProductModal()`); return; }
  const prod = state.products.find(p=>p.id===sel.value) || state.products[0];
  const c = calcProduct(prod);
  box.innerHTML = `
    <div class="helper-block" style="margin-top:12px;">
      ${c.printUnits>1 ? `<div class="field hint" style="margin:0 0 4px;">Valores por peça — essa leva rende ${c.printUnits} un. (${num(totalWeight(prod),0)}g / ${fmtHm(prod.timeH)} no total).</div>` : ''}
      <div class="calc-line"><span>Material (${(prod.filaments||[]).map(f=>`${esc(f.materialName)} ${num((f.weightG||0)/c.printUnits,1)}g`).join(' + ')})</span><span>${brl(c.materialCost)}</span></div>
      <div class="calc-line"><span>Energia (${fmtHm(c.unitTimeH)} × ${brl(c.machine?machineEnergyCostPerHour(c.machine):0)}/h em ${esc(c.machine?c.machine.name:'—')})</span><span>${brl(c.energyCost)}</span></div>
      <div class="calc-line"><span>Depreciação (${fmtHm(c.unitTimeH)} × ${brl(c.machine?machineDeprCostPerHour(c.machine):0)}/h em ${esc(c.machine?c.machine.name:'—')})</span><span>${brl(c.depreciation)}</span></div>
      <div class="calc-line"><span>Manutenção (${fmtHm(c.unitTimeH)} × ${brl(c.machine?machineMaintenanceCostPerHour(c.machine):0)}/h)</span><span>${brl(c.maintenance)}</span></div>
      <div class="calc-line"><span>Mão de obra (${(prod.laborActions||[]).length ? (prod.laborActions||[]).map(a=>`${esc(a.action||'(sem nome)')} ${a.minutes}min`).join(' + ') : 'nenhuma ação cadastrada'} × ${brl(state.settings.laborHourlyRate||0)}/h)</span><span>${brl(c.laborCost)}</span></div>
      ${(prod.toolsUsed||[]).length ? `<div class="calc-line"><span>Ferramentas (${(prod.toolsUsed||[]).map(t=>{ const tool=state.materials.find(x=>x.id===t.toolId); return `${esc(tool?tool.name:'?')} ${t.uses}x`; }).join(' + ')})</span><span>${brl(c.toolsCost)}</span></div>` : ''}
      <div class="calc-line"><span>Custo de falha (${num(prod.failureMarginPct*100,0)}% sobre material+energia+depreciação+50% da mão de obra)</span><span>${brl(c.failureCost)}</span></div>
      <div class="calc-line"><span>Embalagem por venda (${packagingLabelFor(prod)} — uma vez, não por peça)</span><span>${brl(c.embalagemCost)}</span></div>
      ${c.componentsCost>0 ? `<div class="calc-line"><span>Componentes por venda (${componentsLabelFor(prod)})</span><span>${brl(c.componentsCost)}</span></div>` : ''}
      <div class="calc-line total"><span>Custo total${c.saleUnits>1?` — venda de ${c.saleUnits} un`:''}</span><span>${brl(c.totalCost)}</span></div>
      <div class="calc-line total"><span>Preço sugerido${c.saleUnits>1?` — venda de ${c.saleUnits} un`:' — venda própria'} (margem de ${num(c.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
      ${platformBreakdownHtml('Mercado Livre', c.suggestedPriceMl, c.mlFeeAmount, c.mlFeePct, prod.mlRealFeePct!=null?'real':'estimada', c.effectiveFreightMl, 'Frete estimado', c.netReceiptMl)}
      ${platformBreakdownHtml('Shopee', c.suggestedPriceShopee, c.shopeeFeeAmount, c.shopeeFeePct, 'estimada', c.effectiveFreightShopee, 'Frete acima do subsídio (sai do seu bolso)', c.netReceiptShopee, c.estimatedShopeeFreightCap!=null ? `Shopee subsidia o frete até ${brl(c.estimatedShopeeFreightCap)} nessa faixa de preço — você só paga o que passar disso.` : null)}
      ${extraListingPlatforms().map(plat=>`<div class="calc-line" style="color:var(--text-faint);"><span>↳ ${esc(plat.name)} (já com a taxa)</span><span>${brl(c.suggestedPriceExtra[plat.id])}</span></div>`).join('')}
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
        ${state.settings.platforms.map(p=>`<option value="${esc(p.name)}" ${esc(salesFilter.platform===p.name?'selected':'')}>${esc(p.name)}</option>`).join('')}
      </select></div>
      <div class="field"><label>Produto</label><select onchange="salesFilter.product=this.value; renderContent();">
        <option value="">Todos</option>
        ${state.products.map(p=>`<option value="${p.id}" ${salesFilter.product===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
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
      ${list.length===0 ? emptyState('Nenhuma venda encontrada.', '+ Nova venda', `openSaleModal()`) : `
      <div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Data</th><th>Produto</th><th>Cliente</th><th>Plataforma</th><th class="right">Qtd</th><th class="right">Preço bruto</th><th class="right">Taxa</th><th class="right">Líquido</th><th class="right">Custo prod.</th><th class="right">Frete</th><th class="right">Lucro</th><th>Rastreio</th><th></th></tr></thead>
        <tbody>
          ${list.map(s=>`<tr>
            <td class="num" data-label="Data">${fmtDate(s.date)}${s.groupId?' <span class="chip" title="Faz parte de uma venda com vários itens">🧾</span>':''}</td>
            <td data-label="Produto">${esc(s.productName)}</td>
            <td data-label="Cliente">${s.customerId ? ((state.customers.find(cu=>cu.id===s.customerId)||{}).name || '—') : '<span class="chip">avulso</span>'}</td>
            <td data-label="Plataforma">${platformBadge(s.platform)}</td>
            <td class="right num" data-label="Qtd">${s.qty}</td>
            <td class="right num" data-label="Preço bruto">${brl(s.grossPrice)}</td>
            <td class="right num" data-label="Taxa" style="color:var(--text-faint)">${brl(s.feeTotal)}</td>
            <td class="right num" data-label="Líquido">${brl(s.netReceipt)}</td>
            <td class="right num" data-label="Custo prod." style="color:var(--text-faint)">${brl(s.productionCost)}</td>
            <td class="right num" data-label="Frete" style="color:var(--text-faint)">${s.shippingCost ? brl(s.shippingCost) : '—'}</td>
            <td class="right num ${s.profit<0?'neg':''}" data-label="Lucro" style="${s.profit>=0?'color:var(--green)':''}">${brl(s.profit)}</td>
            <td data-label="Rastreio">${s.trackingCode ? `<span class="chip" style="cursor:pointer;font-family:var(--font-mono);" title="Clique para editar" onclick="openTrackingModal('${s.id}')">${esc(s.trackingCode)}</span>` : `<button class="btn ghost sm" onclick="openTrackingModal('${s.id}')">+ rastreio</button>`}</td>
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
    <div class="field"><label>Produto</label><input value="${esc(s.productName)}" disabled></div>
    <div class="field"><label>Código de rastreio</label><input id="trkCode" value="${esc(s.trackingCode||'')}" placeholder="Ex: BR123456789BR"></div>
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
  let msg = `Excluir a venda de "${esc(s.productName)}" em ${fmtDate(s.date)}? O estoque do produto e as reservas alimentadas por ela serão ajustados.`;
  if(linkedOrder) msg += ` A encomenda vinculada volta pro status "Pronto para envio".`;
  if(!confirm(msg)) return;
  const prod = state.products.find(p=>p.id===s.productId);
  if(prod){
    // Usa o snapshot GRAVADO na venda, nunca calcProduct(prod) ao vivo — se o
    // produto mudou de kit de 3 pra 6 depois dessa venda, desfazer tem que
    // devolver os 3 de então, não 6. Vendas antigas sem snapshot (antes dessa
    // mudança) caem no fallback 1:1 peça-venda, que era o comportamento de antes.
    const saleUnits = saleUnitsOfSale(s);
    prod.stock += piecesForSale(saleUnits, s.qty);
    // packagingRecipe é por VENDA — s.qty já é número de vendas/kits.
    packagingRecipe(prod).forEach(r=>{
      const mat = materialByName(r.materialName);
      if(mat) mat.stock += r.qty * s.qty;
    });
    componentsRecipe(prod).forEach(r=>{
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
  if(state.products.length===0){
    blockedBy('Nenhum produto cadastrado',
      'Uma venda precisa de um produto pra saber o que saiu do estoque e quanto custou produzir. Cadastre o primeiro e volte aqui.',
      'Ir para Produtos', `switchTab('produtos');`);
    return;
  }
  // presetQty vem de Pedidos em PEÇAS (o.qty) — o carrinho agora conta em
  // VENDAS/kits, então converte pelo unitsPerSale do produto antes de usar.
  const presetId = presetProductId || state.products[0].id;
  const presetProd = state.products.find(p=>p.id===presetId);
  const presetSaleUnits = presetProd ? saleUnitsOf(presetProd) : 1;
  const initialQty = presetQty ? Math.max(1, Math.round(presetQty/presetSaleUnits)) : 1;
  cartItems = [ newCartItem(presetId, initialQty, state.settings.platforms[0].name) ];
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
        ${state.customers.map(cu=>`<option value="${cu.id}">${esc(cu.name)}</option>`).join('')}
      </select></div>
    </div>
    <div class="row3">
      <div class="field"><label>Plataforma</label><select id="sPlat" onchange="onSalePlatformChange()">
        ${state.settings.platforms.map(p=>`<option value="${esc(p.name)}">${esc(p.name)} (${num(p.pct,0)}%${p.fixed?' + '+brl(p.fixed):''})</option>`).join('')}
      </select></div>
      <div class="field"><label>Taxa nessa venda (%)</label><input type="number" min="0" id="sFeePct" step="0.01" oninput="this.dataset.touched='1'; updateSalePreview()"></div>
      <div class="field"><label>Taxa fixa por unidade vendida (R$)</label><input type="number" min="0" id="sFeeFixed" step="0.01" oninput="this.dataset.touched='1'; updateSalePreview()"></div>
    </div>
    <div class="field hint" style="margin-top:-8px;margin-bottom:12px;">Vem preenchido com a taxa cadastrada da plataforma (ou a taxa real do produto, se já buscada — ver abaixo), mas edite se o Mercado Livre/Shopee cobrou diferente. A % aplica sobre o total da venda; a taxa fixa é cobrada por unidade vendida (2 kits = 2x o valor fixo).</div>
    <div id="sFeeRealNote"></div>
    <div id="sTierNote"></div>
    <div class="row2">
      <div class="field"><label>Frete pago por você (R$, total da venda)</label><input type="number" min="0" id="sShipping" step="0.01" value="0" placeholder="Ex: frete grátis que você bancou" oninput="updateSalePreview()"></div>
      <div class="field"><label>Desconto de cupom/campanha (R$, opcional)</label><input type="number" min="0" id="sCoupon" step="0.01" value="0" placeholder="Quanto o ML/Shopee descontou por promoção"></div>
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
  updateFeeDefaults();
  updateSalePreview();
}
function removeCartItem(rowId){
  if(cartItems.length<=1){ toast('A venda precisa de ao menos um item','err'); return; }
  cartItems = cartItems.filter(it=>it.rowId!==rowId);
  renderCartItemsList();
  updateFeeDefaults();
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
    updateFeeDefaults();
  } else if(field==='qty'){
    item.qty = Math.max(1, parseInt(val)||1);
    refreshCartItemDerivation(rowId);
  } else if(field==='unitPrice'){
    item.unitPrice = nn(val);
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
// "Quantidade" no carrinho é número de VENDAS/kits, não de peças físicas —
// deixa isso explícito no rótulo e mostra a conta ao vivo (peças reais que
// saem do estoque + tempo de impressora), já que os dois números divergem
// sempre que unitsPerSale > 1.
function cartItemDerivationHtml(item){
  const prod = state.products.find(p=>p.id===item.productId);
  if(!prod) return '';
  const c = calcProduct(prod);
  const pieces = item.qty*c.saleUnits;
  const qtyLabel = c.saleUnits>1 ? `${item.qty} kit${item.qty>1?'s':''} de ${c.saleUnits} un` : `${item.qty} unidade${item.qty>1?'s':''}`;
  const stockAfter = prod.stock - pieces;
  return `<div class="field hint" id="cartDerivation_${item.rowId}" style="margin:2px 0 8px;color:${stockAfter<0?'var(--red)':'var(--text-faint)'};">${qtyLabel} = ${pieces} peça${pieces>1?'s':''} · baixa ${pieces} do estoque (tem ${num(prod.stock,0)}) · ${fmtHm(c.saleTimeH*item.qty)} de impressora</div>`;
}
function refreshCartItemDerivation(rowId){
  const item = cartItems.find(it=>it.rowId===rowId);
  const el = document.getElementById(`cartDerivation_${rowId}`);
  if(item && el) el.outerHTML = cartItemDerivationHtml(item);
}
function renderCartItemsList(){
  const el = document.getElementById('cartItemsList');
  if(!el) return;
  el.innerHTML = cartItems.map(item=>{
    const prod = state.products.find(p=>p.id===item.productId);
    const saleUnits = prod ? saleUnitsOf(prod) : 1;
    const qtyLabel = saleUnits>1 ? `Qtd (kits de ${saleUnits})` : 'Qtd (un)';
    // Mesma convenção .field/label do resto do modal (Data, Cliente,
    // Plataforma...) — antes esta linha tinha grid, rótulo e padding
    // próprios, e era a única do formulário fora do padrão.
    return `<div class="cart-item">
    <div class="cart-item-row">
      <div class="field" style="margin-bottom:0;"><label>Produto</label><select onchange="updateCartItem('${item.rowId}','productId',this.value)">
        ${state.products.map(p=>`<option value="${p.id}" ${p.id===item.productId?'selected':''}>${esc(p.name)}</option>`).join('')}
      </select></div>
      <div class="field" style="margin-bottom:0;"><label>${qtyLabel}</label><input type="number" min="1" step="1" value="${item.qty}" oninput="updateCartItem('${item.rowId}','qty',this.value)"></div>
      <div class="field" style="margin-bottom:0;"><label>Preço/venda</label><input type="number" min="0" step="0.01" value="${item.unitPrice.toFixed(2)}" oninput="updateCartItem('${item.rowId}','unitPrice',this.value)"></div>
      <button class="btn ghost sm cart-item-remove" title="Remover item" onclick="removeCartItem('${item.rowId}')">×</button>
    </div>
    ${cartItemDerivationHtml(item)}
    </div>`;
  }).join('');
}
// units (default 1) = quantas vezes o componente FIXO da taxa se aplica — o
// custo fixo do ML/Shopee é por unidade vendida do anúncio, não por pedido
// (vender 2 kits cobra o fixo 2x). Chamadas fora de Vendas (painel de preço
// de Produtos, já avaliando UMA venda) continuam corretas com o default 1.
/* As linhas do carrinho no formato que cartLineFee() espera: cada uma com a
   taxa real do PRÓPRIO produto, quando já foi buscada na API do ML. */
function cartFeeLines(){
  const isML = /mercado\s*livre/i.test(currentSalePlatform()||'');
  return cartItems.map(it=>{
    const prod = state.products.find(p=>p.id===it.productId);
    return {
      qty: it.qty,
      unitPrice: it.unitPrice,
      // Taxa real só vale no ML — é de lá que ela foi buscada.
      realFeePct: (isML && prod && prod.mlRealFeePct!=null) ? prod.mlRealFeePct : null,
    };
  });
}
function currentSalePlatformObj(){
  const el = document.getElementById('sPlat');
  return state.settings.platforms.find(p=>p.name===(el?el.value:''));
}
// true quando o usuário digitou % ou fixo à mão — aí o número dele manda.
function saleFeeOverridden(){
  const pctEl = document.getElementById('sFeePct'), fixedEl = document.getElementById('sFeeFixed');
  return !!((pctEl && pctEl.dataset.touched) || (fixedEl && fixedEl.dataset.touched));
}
/* Sem override: soma a taxa de cada linha (ver cartLineFee em calc.js — o
   marketplace cobra por anúncio, não por pedido). Com override: o percentual
   digitado vale pro total, porque é isso que a pessoa quis dizer ao digitar
   um número só. */
function saleFeeFromForm(gross, totalUnits){
  if(gross<=0) return 0;
  const units = totalUnits!=null ? totalUnits : 1;
  if(!saleFeeOverridden()) return cartTotalFee(currentSalePlatformObj(), cartFeeLines());
  const pct = numField('sFeePct');
  const fixed = numField('sFeeFixed');
  return gross*(pct/100) + fixed*units;
}
// Se o produto já teve a taxa REAL do ML buscada (mlRealFeePct, via
// "Atualizar taxa real" no cadastro — API oficial), usa ela em vez do
// percentual genérico de Configurações/Taxas, igual calcProduct() já faz
// no painel de Produtos. mlRealFeePct é uma % já completa (o custo
// operacional por peso já vem embutido nela) — não soma taxa fixa em cima.
function updateFeeDefaults(){
  const platName = document.getElementById('sPlat').value;
  const plat = state.settings.platforms.find(x=>x.name===platName);
  const pctEl = document.getElementById('sFeePct'), fixedEl = document.getElementById('sFeeFixed');
  const noteEl = document.getElementById('sFeeRealNote');
  /* O campo mostra a taxa EFETIVA da venda, calculada por anúncio e
     convertida em percentual do total. Antes mostrava o percentual genérico
     da plataforma e, quando os produtos tinham taxas diferentes, o app
     desistia com um "confira manualmente" — beco sem saída, e ainda por cima
     usava o número errado no cálculo. */
  const lines = cartFeeLines();
  const gross = cartItems.reduce((a,it)=>a+it.qty*it.unitPrice,0);
  const feeTotal = cartTotalFee(plat, lines);
  let pctValue = gross>0 ? (feeTotal/gross)*100 : (plat ? plat.pct : 0);
  let fixedValue = 0;
  let note = '';
  if(gross>0 && cartItems.length){
    const detalhe = cartItems.map((it,i)=>{
      const prod = state.products.find(p=>p.id===it.productId);
      const f = cartLineFee(plat, lines[i]);
      const pctLinha = it.qty*it.unitPrice>0 ? (f/(it.qty*it.unitPrice))*100 : 0;
      let origem = 'taxa cadastrada';
      if(lines[i].realFeePct!=null) origem = 'taxa real do ML';
      else if(plat && plat.tiers){
        // Qual faixa ESTE anúncio pegou — o degrau só fica visível assim.
        const { tier } = computeTieredFee(plat.tiers, it.unitPrice, 1);
        const teto = (tier.max==null || !isFinite(tier.max)) ? 'acima da última faixa' : `faixa até ${brl(tier.max)}`;
        origem = `${teto}: ${num(tier.pct,0)}%${tier.fixed?' + '+brl(tier.fixed)+'/un':''}`;
      }
      return `<div style="display:flex;justify-content:space-between;gap:10px;">
        <span>${esc(prod?prod.name:'—')} <span style="color:var(--text-faint);">(${origem})</span></span>
        <span class="num">${num(pctLinha,1)}% · ${brl(f)}</span>
      </div>`;
    }).join('');
    note = `<div class="helper-block" style="margin:-4px 0 12px;">
      <div style="margin-bottom:6px;">Cada anúncio é cobrado com a taxa dele — o marketplace não cobra sobre o total do pedido:</div>
      ${detalhe}
      ${cartItems.length>1?`<div style="display:flex;justify-content:space-between;gap:10px;border-top:1px solid var(--line-soft);margin-top:6px;padding-top:6px;font-weight:600;">
        <span>Total</span><span class="num">${num(pctValue,1)}% · ${brl(feeTotal)}</span></div>`:''}
    </div>`;
  }
  // Arredonda pra 2 casas: a taxa real do ML vem de uma divisão
  // (sale_fee_amount / preço) e chegava ao campo como 17,9595991839679 —
  // ilegível, e o input só aceita 2 casas mesmo (step 0.01).
  if(pctEl && !pctEl.dataset.touched) pctEl.value = Math.round((pctValue||0)*100)/100;
  if(fixedEl && !fixedEl.dataset.touched) fixedEl.value = Math.round((fixedValue||0)*100)/100;
  if(noteEl) noteEl.innerHTML = note;
}
function matchingOrdersForProduct(productId){
  return state.orders.filter(o=>o.productId===productId && o.status!=='Enviado').sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
}
function onOrderMatchChange(productId, val){
  if(val) cartOrderLinks[productId] = val; else delete cartOrderLinks[productId];
}
function updateSalePreview(){
  const totalGross = cartItems.reduce((a,it)=>a+it.qty*it.unitPrice,0);
  // Total de VENDAS/kits no carrinho — a taxa fixa do ML/Shopee é por
  // unidade vendida do anúncio, não uma vez por pedido (ver saleFeeFromForm).
  const totalUnits = cartItems.reduce((a,it)=>a+it.qty,0);
  const plat = currentSalePlatformObj();
  /* A faixa da Shopee era escolhida aqui pelo TOTAL do pedido e escrita por
     cima dos campos de taxa — dois itens de R$49,90 (faixa de 20%+R$4 cada)
     somavam R$99,80 e caíam na faixa de 14%+R$16, cobrada 2x. A faixa agora
     é por item, dentro de cartLineFee(), e o detalhamento em sFeeRealNote
     mostra em qual faixa cada anúncio caiu. Nada mais escreve nos campos. */
  const tierNoteEl = document.getElementById('sTierNote');
  if(tierNoteEl) tierNoteEl.innerHTML = '';
  const feeLines = cartFeeLines();
  const totalFee = saleFeeFromForm(totalGross, totalUnits);
  const totalShipping = numField('sShipping');

  let totalCost = 0, totalProfit = 0, allAllocations = {};
  const itemLines = cartItems.map((item,i)=>{
    const prod = state.products.find(p=>p.id===item.productId);
    const itemGross = item.qty*item.unitPrice;
    const share = totalGross>0 ? itemGross/totalGross : 0;
    // Mesma regra do confirmSale: taxa própria da linha, salvo override.
    const itemFee = saleFeeOverridden() ? totalFee*share : cartLineFee(plat, feeLines[i]);
    const itemShipping = totalShipping*share;
    const calc = calcProduct(prod);
    // calc.totalCost já é o custo de UMA venda (kit inteiro, embalagem
    // inclusa uma vez) e item.qty agora é número de vendas — multiplica direto.
    const cost = calc.totalCost*item.qty;
    const net = itemGross-itemFee;
    const profit = net-cost-itemShipping;
    totalCost += cost; totalProfit += profit;
    const allocations = computeSaleReserveAllocations(calc, item.qty, profit);
    Object.entries(allocations).forEach(([gid,amt])=>{ allAllocations[gid]=(allAllocations[gid]||0)+amt; });
    const piecesNeeded = item.qty*calc.saleUnits;
    const stockAfter = prod.stock - piecesNeeded;
    let matchBlock = '';
    const matches = matchingOrdersForProduct(prod.id);
    if(matches.length){
      if(cartOrderLinks[prod.id]===undefined && matches.length===1){ cartOrderLinks[prod.id] = matches[0].id; }
      matchBlock = `<div class="field" style="margin:6px 0 0;">
        <label>Bate com um pedido em aberto</label>
        <select onchange="onOrderMatchChange('${prod.id}', this.value); updateSalePreview();">
          <option value="">Não vincular</option>
          ${matches.map(o=>`<option value="${o.id}" ${cartOrderLinks[prod.id]===o.id?'selected':''}>${orderCustomerName(o)||'Sem cliente'} — ${o.qty}x${o.dueDate?' (prazo '+fmtDate(o.dueDate)+')':''}</option>`).join('')}
        </select>
      </div>`;
    }
    return `<div class="calc-line"><span>${item.qty}x ${esc(prod.name)}</span><span>${brl(itemGross)}</span></div>
      <div style="font-size:11px;color:${stockAfter<0?'var(--red)':'var(--text-faint)'};margin:-2px 0 4px;">Estoque após venda: ${num(stockAfter,0)} peças${stockAfter<0?` (faltam ${num(-stockAfter,0)} — venda será bloqueada)`:''}</div>
      ${matchBlock}`;
  }).join('');

  const allocLines = Object.entries(allAllocations).map(([gid,amt])=>{
    const g = state.settings.reserveGoals.find(x=>x.id===gid);
    return g ? `<div class="calc-line" style="color:var(--text-faint)"><span>↳ reserva automática: ${esc(g.name)}</span><span>${brl(amt)}</span></div>` : '';
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
  // Estoque é sempre em peças — bloqueia ANTES de mexer em qualquer coisa se
  // alguma venda do carrinho não cabe no estoque físico disponível.
  for(const item of cartItems){
    const prod = state.products.find(p=>p.id===item.productId);
    if(!prod) continue;
    const saleUnits = saleUnitsOf(prod);
    const needed = piecesForSale(saleUnits, item.qty);
    if(prod.stock < needed){
      toast(`Estoque insuficiente: ${num(prod.stock,0)} peças, a venda de "${esc(prod.name)}" precisa de ${needed}`,'err');
      return;
    }
  }
  // Componentes (parafuso, tag...) também bloqueiam a venda se faltar —
  // agregado por material, já que dois itens do carrinho podem usar o mesmo.
  const neededComponents = {};
  cartItems.forEach(item=>{
    const prod = state.products.find(p=>p.id===item.productId);
    if(!prod) return;
    componentsRecipe(prod).forEach(r=>{
      if(!r.materialName) return;
      neededComponents[r.materialName] = (neededComponents[r.materialName]||0) + r.qty*item.qty;
    });
  });
  for(const [matName, needed] of Object.entries(neededComponents)){
    const mat = materialByName(matName);
    const avail = mat ? mat.stock : 0;
    if(avail < needed){
      toast(`Sem ${matName} em estoque: precisa de ${num(needed,0)}, há ${num(avail,0)}`,'err');
      return;
    }
  }
  const date = document.getElementById('sDate').value || todayStr();
  const plat = document.getElementById('sPlat').value;
  const customerId = document.getElementById('sCustomer').value || null;
  const totalUnits = cartItems.reduce((a,it)=>a+it.qty,0);
  const totalFee = saleFeeFromForm(totalGross, totalUnits);
  const platObj = currentSalePlatformObj();
  const isMLSale = /mercado\s*livre/i.test(plat||'');
  const feeLineFor = (it)=>{
    const pr = state.products.find(p=>p.id===it.productId);
    return (isMLSale && pr && pr.mlRealFeePct!=null) ? pr.mlRealFeePct : null;
  };
  const totalShipping = numField('sShipping');
  const totalCoupon = numField('sCoupon');
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
    // A taxa de cada linha é a DELA (ver cartLineFee), não um rateio do total
    // pelo faturamento: dois produtos de categorias diferentes têm taxas
    // diferentes, e ratear misturava as duas no histórico. Só quando o
    // usuário digita um percentual único é que não há como separar — aí sim
    // rateia, que é a única leitura possível de um número só.
    const itemFee = saleFeeOverridden()
      ? totalFee*share
      : cartLineFee(platObj, { qty:item.qty, unitPrice:item.unitPrice, realFeePct: feeLineFor(item) });
    // Frete e cupom continuam rateados: são do PEDIDO, não do anúncio.
    const itemShipping = totalShipping*share;
    const itemCoupon = totalCoupon*share;
    const calc = calcProduct(prod);
    // calc.totalCost já é o custo de UMA venda (kit inteiro) — item.qty é
    // número de vendas, multiplica direto (nada de dividir por saleUnits).
    const cost = calc.totalCost*item.qty;
    const net = itemGross-itemFee;
    const profit = net-cost-itemShipping;
    const allocations = computeSaleReserveAllocations(calc, item.qty, profit);
    const linkedOrderId = cartOrderLinks[prod.id] || null;
    state.sales.push({
      id:uid(), groupId, date, productId:prod.id, productName:prod.name, qty:item.qty, platform:plat,
      grossPrice:itemGross, feeTotal:itemFee, netReceipt:net, productionCost:cost, shippingCost:itemShipping, couponDiscount:itemCoupon, profit,
      // Snapshot no momento da venda — se o cadastro do produto mudar depois
      // (kit de 3 virar kit de 6, preço mudar), essa venda não pode ser
      // relida com os valores novos. Ver pegadinha #8 do CLAUDE.md.
      unitsPerSaleSnapshot: calc.saleUnits, unitPriceSnapshot: item.unitPrice, timePerUnitSnapshot: calc.saleTimeH,
      reserveAllocations:allocations, machineId: calc.machine?calc.machine.id:null, hoursUsed:calc.saleTimeH*item.qty, customerId, trackingCode, linkedOrderId,
    });
    // stock em peças: qty (vendas/kits) × unitsPerSale = peças físicas.
    prod.stock -= piecesForSale(calc.saleUnits, item.qty);
    // packagingRecipe é por VENDA (uma caixa por kit) — item.qty já é
    // número de vendas, sem precisar dividir por saleUnits.
    packagingRecipe(prod).forEach(r=>{
      const mat = materialByName(r.materialName);
      if(mat){ mat.stock -= r.qty*item.qty; if(mat.stock<0) boxNegativeWarn = true; }
    });
    // Componentes já foram checados no pré-voo acima — só desconta.
    componentsRecipe(prod).forEach(r=>{
      const mat = materialByName(r.materialName);
      if(mat) mat.stock -= r.qty*item.qty;
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
  if(state.customers.length===0) return `<div class="card">${emptyState(
    'Nenhum cliente cadastrado.<br><span style="font-size:12.5px;">É opcional — dá pra cadastrar na hora da venda. Ter antes só deixa o histórico de compras mais fácil de acompanhar.</span>',
    '+ Novo cliente', `openCustomerModal()`)}</div>`;
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
      <td data-label="Nome">${esc(cu.name)}</td>
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
    <div class="field"><label>Nome</label><input id="cuName" value="${esc(cu.name)}" placeholder="Ex: Maria Silva"></div>
    <div class="field"><label>Contato (WhatsApp, e-mail...)</label><input id="cuContact" value="${cu.contact||''}" placeholder="Ex: (11) 99999-9999"></div>
    <div class="field"><label>Observações</label><textarea id="cuNotes" rows="2" placeholder="Preferências, combinados, etc.">${esc(cu.notes||'')}</textarea></div>
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
  if(dup && !confirm(`Já existe um cliente chamado "${esc(dup.name)}". Cadastrar outro com o mesmo nome mesmo assim?`)) return;
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
  let msg = `Excluir "${esc(cu.name)}"?`;
  if(st.qtd>0) msg += ` As ${st.qtd} venda(s) já registradas continuam no histórico, só ficam sem cliente vinculado.`;
  if(!confirm(msg)) return;
  state.customers = state.customers.filter(x=>x.id!==id);
  state.sales.forEach(s=>{ if(s.customerId===id) s.customerId=null; });
  saveCustomers(); saveSales();
  toast('Cliente excluído');
  renderContent();
}

/* ===================== PRODUTOS ===================== */
let produtosFilter = { search:'', machineId:'', sortKey:'name', sortDir:1 };
let produtosView = 'lista';
// Canal escolhido nas abas do Diagnóstico (Mercado Livre/Shopee).
let diagnosticoChannel = 'Mercado Livre';
function toggleProductSort(key){
  if(produtosFilter.sortKey===key){ produtosFilter.sortDir*=-1; }
  else { produtosFilter.sortKey=key; produtosFilter.sortDir=1; }
  renderContent();
}
function sortArrow(filterObj,key){ return filterObj.sortKey===key ? (filterObj.sortDir===1?' ▲':' ▼') : ''; }
function renderProdutos(){
  if(state.products.length===0) return `<div class="card">${emptyState(
    'Nenhum produto cadastrado ainda.<br><span style="font-size:12.5px;">Um produto é uma peça que você vende: peso, tempo de impressão e embalagem. O custo e o R$/hora saem daí.</span>',
    '+ Novo produto', `openProductModal()`)}</div>`;
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
      case 'weight': return c.unitWeightG;
      case 'time': return c.unitTimeH;
      case 'cost': return c.totalCost;
      case 'floor': return minPriceForTarget(c, 'Mercado Livre', p) || 0;
      case 'practiced': return c.practicedPriceMl;
      case 'margin': return c.marginMlPct;
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
      <th>Embalagem</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('weight')">Peso/un${sortArrow(produtosFilter,'weight')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('time')">Tempo/un${sortArrow(produtosFilter,'time')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('cost')">Custo/venda${sortArrow(produtosFilter,'cost')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('floor')" title="Preço mínimo pra bater a meta de R$/hora-máquina configurada — abaixo disso, a venda não cobre o tempo de impressora.">Piso p/ meta R$/hora${sortArrow(produtosFilter,'floor')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('practiced')">Preço praticado/venda${sortArrow(produtosFilter,'practiced')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('margin')">Margem${sortArrow(produtosFilter,'margin')}</th>
      <th class="right" style="cursor:pointer;" onclick="toggleProductSort('stock')">Estoque${sortArrow(produtosFilter,'stock')}</th>
      <th></th>
    </tr></thead>`;
  const rowHtml = ({p,c}) => {
    const filSummary = (p.filaments||[]).map(f=>`${esc(f.materialName)} ${num(f.weightG,0)}g`).join(' + ');
    const floorMl = minPriceForTarget(c, 'Mercado Livre', p);
    const floorShopee = minPriceForTarget(c, 'Shopee', p);
    return `<tr>
      <td data-label="Foto">${p.photo ? `<img src="${p.photo}" alt="${esc(p.name)}" style="width:36px;height:36px;object-fit:cover;border-radius:6px;">` : `<div style="width:36px;height:36px;border-radius:6px;background:var(--panel-2);"></div>`}</td>
      <td data-label="Produto">${esc(p.name)}${p.kitComponents && p.kitComponents.length ? `<div style="font-size:11px;font-style:italic;color:var(--text-faint);margin-top:2px;">${p.kitComponents.map(kc=>`${kc.qty>1?kc.qty+'x ':''}${esc(kc.productName)}`).join(' + ')}</div>` : ''}${(!p.laborActions || !p.laborActions.length) ? `<div style="margin-top:3px;"><span class="badge warn" title="Nenhuma ação de mão de obra cadastrada — o custo de mão de obra desse produto está zerado, o que deixa a margem otimista demais">sem mão de obra</span></div>` : ''}${(p.modelOrigin==='terceiro' && !p.modelLicense) ? `<div style="margin-top:3px;"><span class="badge bad" title="Modelo de terceiro sem licença registrada — confira se pode vender antes de anunciar em ML/Shopee">sem licença do modelo</span></div>` : ''}</td>
      <td title="${filSummary}" data-label="Filamentos">${filSummary}</td>
      <td data-label="Impressora">${c.machine ? esc(c.machine.name) : '<span class="badge bad">nenhuma</span>'}</td>
      <td data-label="Embalagem">${esc(p.boxType || '<span class="badge mut">nenhuma</span>')}</td>
      <td class="right num" data-label="Peso/un">${num(c.unitWeightG,1)}g${c.printUnits>1?`<div style="font-size:10px;font-weight:400;color:var(--text-faint);white-space:nowrap;">leva: ${num(totalWeight(p),0)}g / ${c.printUnits}un</div>`:''}</td>
      <td class="right num" data-label="Tempo/un">${fmtHm(c.unitTimeH)}${c.printUnits>1?`<div style="font-size:10px;font-weight:400;color:var(--text-faint);white-space:nowrap;">leva: ${num(p.timeH,1)}h</div>`:''}</td>
      <td class="right num" data-label="Custo/venda">${brl(c.totalCost)}${c.saleUnits>1?`<div style="font-size:10px;font-weight:400;color:var(--text-faint);white-space:nowrap;">venda de ${c.saleUnits}un</div>`:''}</td>
      <td class="right num" data-label="Piso p/ meta R$/hora">${floorMl!=null?brl(floorMl):'—'}<div style="font-size:10px;font-weight:400;color:var(--text-faint);white-space:nowrap;">Shopee ${floorShopee!=null?brl(floorShopee):'—'}</div></td>
      <td class="right num" data-label="Preço praticado/venda">${brl(c.practicedPriceMl)}<div style="font-size:10px;font-weight:400;color:var(--text-faint);white-space:nowrap;">Shopee ${brl(c.practicedPriceShopee)}${extraListingPlatforms().map(plat=>` · ${esc(plat.name)} ${brl(c.practicedPriceExtra[plat.id])}`).join('')}</div></td>
      <td class="right num" data-label="Margem" style="color:${c.marginMlValue<0?'var(--red)':'var(--green)'}">${pct(c.marginMlPct)}<div style="font-size:10px;font-weight:400;white-space:nowrap;">Shopee <span style="color:${c.marginShopeePct<(state.settings.minMarginPct!=null?state.settings.minMarginPct:25)?'var(--red)':'var(--text-faint)'}">${pct(c.marginShopeePct)}</span></div></td>
      <td class="right num" data-label="Estoque">${p.stock<=0?`<span class="badge mut">0</span>`:num(p.stock,0)}</td>
      <td class="right"><button class="btn ghost sm" onclick="openProductModal('${p.id}')">Editar</button> <button class="btn ghost sm" onclick="duplicateProduct('${p.id}')">Duplicar</button> <button class="btn ghost sm" onclick="deleteProduct('${p.id}')">Excluir</button></td>
    </tr>`;
  };
  const filterBar = `
    <div class="filter-bar">
      <div class="field"><label>Buscar</label><input value="${produtosFilter.search}" placeholder="Nome ou filamento..." oninput="produtosFilter.search=this.value; renderContent();"></div>
      <div class="field"><label>Impressora</label><select onchange="produtosFilter.machineId=this.value; renderContent();">
        <option value="">Todas</option>
        ${machines.map(m=>`<option value="${m.id}" ${produtosFilter.machineId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}
      </select></div>
      <div class="field hint" style="padding-top:9px;">${list.length} de ${state.products.length} produto(s) · clique no cabeçalho pra ordenar</div>
      ${(produtosFilter.search||produtosFilter.machineId) ? `<button class="btn ghost sm" onclick="produtosFilter.search=''; produtosFilter.machineId=''; renderContent();">Limpar filtros</button>` : ''}
    </div>`;
  if(list.length===0){
    return filterBar + `<div class="card"><div class="tbl-wrap tbl-responsive tbl-compact-mobile"><table>${theadHtml}<tbody><tr><td colspan="13" style="text-align:center;color:var(--text-faint);padding:20px;">Nenhum produto encontrado</td></tr></tbody></table></div></div>`;
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
  const sections = catKeys.map(cat=>`<div class="section-title">${esc(cat)}</div><div class="card"><div class="tbl-wrap tbl-responsive tbl-compact-mobile"><table>${theadHtml}<tbody>${groups[cat].map(rowHtml).join('')}</tbody></table></div></div>`).join('');
  return filterBar + sections;
}
// Diagnóstico do catálogo — ordena pelo recurso escasso (R$/hora-máquina), não
// por lucro total: um produto lento pode dar mais lucro por venda e ainda
// assim ser pior escolha, porque ocupa a impressora por muito mais tempo.
// ML e Shopee são os únicos canais de Produtos (marketplace) — venda sob
// medida/direta vive em Personalizados, fora do escopo do Diagnóstico.
function channelPriceFor(c, channelName){
  return channelName==='Mercado Livre' ? c.practicedPriceMl : c.practicedPriceShopee;
}
// "vende melhor" só quando os dois canais dão lucro — comparar razão com
// número negativo não tem leitura útil (o canal ruim já aparece na cor certa).
function betterChannelInfo(hourlyMl, hourlyShopee){
  if(hourlyMl==null && hourlyShopee==null) return { best:null, label:'—', flag:null };
  if(hourlyMl==null) return { best:'Shopee', label:'Shopee', flag:null };
  if(hourlyShopee==null) return { best:'Mercado Livre', label:'ML', flag:null };
  const best = hourlyMl>=hourlyShopee ? 'Mercado Livre' : 'Shopee';
  let flag = null;
  if(hourlyMl>0 && hourlyShopee>0 && Math.max(hourlyMl,hourlyShopee)/Math.min(hourlyMl,hourlyShopee)>=2){
    flag = `vende melhor n${best==='Mercado Livre'?'o ML':'a Shopee'}`;
  }
  return { best, label: best==='Mercado Livre'?'ML':'Shopee', flag };
}
/* Coluna "Anúncio" do Diagnóstico: transforma a margem em decisão de tráfego
   pago. Duas leituras, porque uma sozinha engana:
     - quantas VENDAS o orçamento do mês precisa gerar (número absoluto, é o
       que dá pra comparar com o volume que você já vende);
     - o ACOS de equilíbrio, que é o teto de gasto por venda em % do preço.
   Lucro <= 0 no canal recebe alerta em vermelho em vez de número: anunciar ali
   é pagar pra vender no prejuízo, e nenhum volume conserta isso. */
function adCellHtml(profit, price){
  const orcamento = adSpendInMonth(state.settings.adSpend, currentMonth, diagnosticoChannel);
  const ref = orcamento > 0 ? orcamento : (state.settings.adBudgetRef || 100);
  const vendas = adBreakEvenSales(ref, profit);
  if(vendas === null){
    return `<span class="badge bad">não anuncie</span>
      <div style="font-size:10.5px;color:var(--text-faint);">lucro ${profit!=null?brl(profit):'—'} — cada venda paga daria prejuízo</div>`;
  }
  const acos = adBreakEvenAcos(profit, price);
  return `<span class="num">${vendas} venda${vendas>1?'s':''}</span>
    <div style="font-size:10.5px;color:var(--text-faint);">pra pagar ${brl(ref)}${orcamento>0?'':' (referência)'} · teto ${num(acos,0)}% do preço</div>`;
}
function renderProdutosDiagnostico(){
  if(state.products.length===0) return `<div class="card">${emptyState(
    'Nenhum produto cadastrado ainda.<br><span style="font-size:12.5px;">O Diagnóstico compara lucro por hora de impressora entre os produtos e diz quais compensam imprimir.</span>',
    '+ Novo produto', `openProductModal()`)}</div>`;
  const target = state.settings.targetHourlyProfit!=null ? state.settings.targetHourlyProfit : 15;
  const channel = diagnosticoChannel;
  const list = state.products.map(p=>{
    const c = calcProduct(p);
    const hourlyMl = profitPerHourAt(c, 'Mercado Livre', c.practicedPriceMl, p);
    const hourlyShopee = profitPerHourAt(c, 'Shopee', c.practicedPriceShopee, p);
    const price = channelPriceFor(c, channel);
    const hourly = channel==='Mercado Livre' ? hourlyMl : hourlyShopee;
    const profit = (price>0) ? (price - channelFeeAt(channel, price, p) - c.totalCost) : null;
    const verdict = hourlyVerdict(hourly, profit);
    const better = betterChannelInfo(hourlyMl, hourlyShopee);
    return { p, c, hourly, hourlyMl, hourlyShopee, profit, verdict, better };
  });
  const sorted = list.slice().sort((a,b)=>{
    if(a.hourly==null) return 1;
    if(b.hourly==null) return -1;
    return b.hourly - a.hourly;
  });
  const withHourly = list.filter(x=>x.hourly!=null);
  const totalHours = withHourly.reduce((a,x)=>a+x.c.unitTimeH,0);
  const totalProfitOverHours = withHourly.reduce((a,x)=>a+x.hourly*x.c.unitTimeH,0);
  const weightedAvg = totalHours>0 ? totalProfitOverHours/totalHours : null;
  const belowTarget = withHourly.filter(x=>x.hourly<target);
  // Horas de impressora já "presas" em estoque de produtos que não compensam —
  // proxy direto e sem depender de histórico de vendas: estoque atual × tempo/un.
  const belowTargetStockHours = belowTarget.reduce((a,x)=>a+(x.p.stock>0?x.p.stock*x.c.unitTimeH:0),0);
  // "Sem categoria" não é um grupo de verdade (é falta de dado, não nicho de
  // mercado) — incluir aqui só gera ruído, então fica de fora do aviso.
  const byCatBelow = {};
  belowTarget.forEach(x=>{ const cat=(x.p.category||'').trim(); if(cat) (byCatBelow[cat]=byCatBelow[cat]||[]).push(x); });
  const canibalizacao = Object.entries(byCatBelow).filter(([,items])=>items.length>=2)
    .map(([cat,items])=>`${items.length} produtos em ${cat} — eles dividem o mesmo comprador em vez de somar vendas`);
  const channelTabs = `<div class="tabbar" style="margin-bottom:14px;">
    <button class="tabbtn ${channel==='Mercado Livre'?'active':''}" onclick="diagnosticoChannel='Mercado Livre'; renderContent();">Mercado Livre</button>
    <button class="tabbtn ${channel==='Shopee'?'active':''}" onclick="diagnosticoChannel='Shopee'; renderContent();">Shopee</button>
  </div>`;
  const summary = `
    <div class="card" style="margin-bottom:14px;">
      <div class="field hint" style="margin:0 0 10px;">Veredito, ordenação e média ponderada abaixo usam o canal <strong>${channel}</strong> — troque na aba acima.</div>
      <div class="row3">
        <div><div class="field hint" style="margin:0;">Média ponderada do catálogo</div><div style="font-family:var(--font-mono);font-size:18px;font-weight:700;color:${weightedAvg!=null&&weightedAvg<target?'var(--red)':'var(--green)'};">${weightedAvg!=null?brl(weightedAvg)+'/h':'—'}</div></div>
        <div><div class="field hint" style="margin:0;">Abaixo da meta (${brl(target)}/h)</div><div style="font-family:var(--font-mono);font-size:18px;font-weight:700;">${belowTarget.length} de ${withHourly.length}</div></div>
        <div><div class="field hint" style="margin:0;">Horas de impressora em estoque abaixo da meta</div><div style="font-family:var(--font-mono);font-size:18px;font-weight:700;">${fmtHm(belowTargetStockHours)}</div></div>
      </div>
      ${canibalizacao.length ? `<div style="margin-top:10px;">${canibalizacao.map(w=>`<div class="calc-line" style="font-size:12.5px;"><span class="badge warn">Canibalização</span> <span style="margin-left:6px;">${w}</span></div>`).join('')}</div>` : ''}
    </div>`;
  const rows = sorted.map(({p,c,hourlyMl,hourlyShopee,profit,verdict,better})=>`<tr>
    <td data-label="Produto">${esc(p.name)}${p.category?`<div style="font-size:11px;color:var(--text-faint);">${esc(p.category)}</div>`:''}</td>
    <td class="right num" data-label="Peso/un">${num(c.unitWeightG,1)}g</td>
    <td class="right num" data-label="Tempo/un">${fmtHm(c.unitTimeH)}</td>
    <td class="right num" data-label="Lucro/venda (${channel==='Mercado Livre'?'ML':'Shopee'})" style="color:${profit!=null&&profit<0?'var(--red)':'inherit'}">${profit!=null?brl(profit):'—'}</td>
    <td class="right num" data-label="R$/hora ML">${hourlyMl!=null?brl(hourlyMl)+'/h':'—'}</td>
    <td class="right num" data-label="R$/hora Shopee">${hourlyShopee!=null?brl(hourlyShopee)+'/h':'—'}</td>
    <td data-label="Melhor canal">${better.best?better.label:'—'}${better.flag?`<div style="font-size:10px;color:var(--text-faint);">${better.flag}</div>`:''}</td>
    <td class="right" data-label="Anúncio">${adCellHtml(profit, channelPriceFor(c, channel))}</td>
    <td data-label="Veredito"><span class="badge ${verdict.cls}">${verdict.label}</span></td>
  </tr>`).join('');
  return channelTabs + summary + `<div class="card"><div class="tbl-wrap tbl-responsive"><table>
    <thead><tr><th>Produto</th><th class="right">Peso/un</th><th class="right">Tempo/un</th><th class="right">Lucro/venda</th><th class="right">R$/hora ML</th><th class="right">R$/hora Shopee</th><th>Melhor canal</th><th class="right">Anúncio</th><th>Veredito</th></tr></thead>
    <tbody>${rows}</tbody>
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
// (ver Configurações → "Aba de Anúncios pra..."), clonando os campos de
// uma plataforma já existente (ML, Shopee, ou outra plataforma estendida).
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
// Prefixo vem das iniciais do negócio de quem está usando — carimbar a sigla
// de uma loja específica no SKU de todas as outras seria errado. O campo SKU
// continua editável em cada anúncio.
function skuPrefix(){
  const initials = stripAccents(bizName()).toUpperCase().replace(/[^A-Z0-9 ]+/g,' ').trim().split(/\s+/)
    .map(w=>w[0]).filter(Boolean).join('').slice(0,3);
  return initials || 'SKU';
}
function generateSku(p){
  const slug = stripAccents(p.name).toUpperCase().replace(/[^A-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,24);
  return `${skuPrefix()}-${slug}`;
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
  if(state.products.length===0) return `<div class="card">${emptyState(
    'Nenhum produto cadastrado ainda.<br><span style="font-size:12.5px;">O anúncio é montado a partir do produto — título, foto, medidas e preço saem do cadastro dele.</span>',
    '+ Novo produto', `openProductModal()`)}</div>`;
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
/* Iguala a 1ª coluna das tabelas .tbl-cols-fixed que são irmãs na página.
   As outras colunas já têm largura fixa no CSS; só a do nome é flexível,
   porque fixar um valor truncaria produto de nome comprido. O problema é que
   cada tabela dimensionava essa coluna pelo conteúdo dela — em tela larga
   sobrava espaço e todas ficavam iguais por acaso, mas ao apertar a janela o
   grupo com o nome mais longo esticava a primeira coluna e empurrava Preço e
   Status pra direita, só naquele quadro.

   Em vez de estimar a largura do texto, deixa o navegador medir: lê o que
   cada tabela pediu naturalmente e aplica o MAIOR valor em todas. Roda uma
   vez por render, e sai antes de mexer no DOM se já estiverem iguais. */
function syncFixedTableColumns(){
  const tabelas = [...document.querySelectorAll('table.tbl-cols-fixed')];
  if(tabelas.length < 2) return;
  tabelas.forEach(t=>t.style.removeProperty('--c1'));
  const larguras = tabelas.map(t=>{
    const c = t.querySelector('thead th:first-child');
    return c ? c.getBoundingClientRect().width : 0;
  });
  const maior = Math.ceil(Math.max(...larguras));
  if(!maior || maior - Math.min(...larguras) < 1) return;
  tabelas.forEach(t=>t.style.setProperty('--c1', maior + 'px'));
}
function renderAnunciosLista(){
  const q = anunciosFilter.search.toLowerCase();
  const list = q ? state.products.filter(p=>p.name.toLowerCase().includes(q)) : state.products;
  const searchBar = `<div class="filter-bar">
    <div class="field"><label>Buscar</label><input value="${anunciosFilter.search}" placeholder="Nome do produto..." oninput="anunciosFilter.search=this.value; renderContent();"></div>
  </div>`;
  if(q && list.length===0) return searchBar + `<div class="card">${emptyState(`Nenhum produto encontrado para “${esc(anunciosFilter.search)}”.`, 'Limpar busca', `anunciosFilter.search=''; renderContent();`)}</div>`;
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
        <td data-label="Produto">${esc(p.name)}</td>
        <td data-label="Preço" class="right num">${hasContent ? listingPriceDisplay(l,p) : brl(calcProduct(p).practicedPrice)}</td>
        <td data-label="Status">${status}</td>
        <td class="right">
          <button class="btn ghost sm" onclick="openListingModal('${p.id}')">${hasContent?'Editar anúncio':'Criar anúncio'}</button>
          ${hasContent?`<button class="btn ghost sm" onclick="openDuplicateListingModal('${p.id}')">Duplicar</button>`:''}
        </td>
      </tr>`;
    }).join('');
    // .tbl-cols-fixed: uma tabela por categoria, e sem largura fixa cada uma
    // dimensionava as colunas pelo próprio conteúdo — "Preço" e "Status"
    // caíam num x diferente em cada quadro. Ver o comentário no CSS.
    return `<div class="section-title">${esc(category)}</div><div class="card"><div class="tbl-wrap tbl-responsive"><table class="tbl-cols-fixed" style="--c2:240px;--c3:235px;--c4:210px;">
      <thead><tr><th>Produto</th><th class="right">Preço</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div></div>`;
  }).join('');
  return searchBar + sections;
}
function renderAnunciosProntos(){
  const ready = state.products.map(p=>({p, l:listingFor(p.id)})).filter(({l})=>listingIsComplete(l));
  if(ready.length===0) return `<div class="card">${emptyState(
    'Nenhum anúncio pronto ainda.<br><span style="font-size:12.5px;">Um anúncio fica pronto quando todos os campos dele estão preenchidos — é o que permite copiar e colar direto no marketplace.</span>',
    'Preencher um anúncio', `anunciosView='lista'; renderContent();`)}</div>`;
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
          ${cover ? `<img src="${cover}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover;">` : `<span style="color:var(--text-faint);font-size:11px;">Sem foto</span>`}
        </div>
        ${thumbs}
        <div style="padding:14px 16px;display:flex;flex-direction:column;gap:6px;flex:1;">
          <div style="font-family:var(--font-display);font-weight:600;font-size:14px;line-height:1.3;">${titulo}</div>
          <div style="color:var(--nozzle);font-weight:700;font-family:var(--font-mono);font-size:14px;">${listingPriceDisplay(l,p)}</div>
          <div style="font-size:12px;color:var(--text-dim);">Estoque: ${estoque}</div>
          ${descricao ? `<div style="font-size:12px;color:var(--text-dim);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${descricao}</div>` : ''}
          ${(l.ml.link||l.shopee.link||extras.some(plat=>listingPlatformData(l,plat.id).link)) ? `<div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${l.ml.link?`<a href="${safeUrl(l.ml.link)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;">ML ↗</a>`:''}
            ${l.shopee.link?`<a href="${safeUrl(l.shopee.link)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;">Shopee ↗</a>`:''}
            ${extras.map(plat=>{ const link = listingPlatformData(l,plat.id).link; return link ? `<a href="${safeUrl(link)}" target="_blank" rel="noopener noreferrer" style="font-size:11px;">${esc(plat.name)} ↗</a>` : ''; }).join('')}
          </div>` : ''}
          <div style="margin-top:auto;display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn ghost sm" style="flex:1;" onclick="openListingViewModal('${p.id}')">Ver anúncio</button>
            <button class="btn ghost sm" style="flex:1;" onclick="openListingModal('${p.id}')">Editar</button>
            <button class="btn ghost sm" style="flex:1;" onclick="openDuplicateListingModal('${p.id}')">Duplicar</button>
          </div>
        </div>
      </div>`;
    }).join('');
    return `<div class="section-title">${esc(category)}</div><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr));">${cards}</div>`;
  }).join('');
  return toolbar + grouped;
}
// Link do anúncio já publicado — fora do LISTING_FIELDS de propósito: não
// conta pro status Pronto/Incompleto (só existe depois de publicar) e não
// entra no Excel exportado (é só referência interna, não um dado do anúncio).
function renderListingLinkField(platform, val){
  const platName = listingPlatformDisplayName(platform);
  const openLink = val ? `<a href="${safeUrl(val)}" target="_blank" rel="noopener noreferrer" class="btn ghost sm" style="margin-top:6px;display:inline-flex;">Abrir anúncio ↗</a>` : '';
  return `<div class="field"><label>Link do anúncio publicado na ${platName} (opcional)</label><input id="lst_${platform}_link" type="url" value="${val||''}" placeholder="Cole aqui depois de publicar">${openLink}</div>`;
}
function renderListingField(idKey, f, val, isNa){
  const id = `lst_${idKey}_${f.key}`;
  const naKey = `${idKey}_${f.key}`;
  const naBox = `<label class="field-checkbox inline"><input type="checkbox" ${isNa?'checked':''} onchange="toggleListingFieldNa('${id}','${naKey}',this.checked)" style="width:auto;margin:0;">não se aplica</label>`;
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
  const extraTabsHtml = extras.map(plat=>`<button type="button" class="tabbtn" id="lstTabBtn_${plat.id}" onclick="switchListingTab('${plat.id}')">${esc(plat.name)}</button>`).join('');
  const extraPanelsHtml = extras.map(plat=>{
    const fields = platformListingFields(plat.id).filter(f=>!SHARED_LISTING_KEYS.includes(f.key));
    return `<div id="lstPanel_${plat.id}" style="display:none;">${renderListingLinkField(plat.id, draft.extra[plat.id].link)}${fields.map(f=>renderListingField(plat.id, f, (draft.extra[plat.id]||{})[f.key], !!editingNaFields[`${plat.id}_${f.key}`])).join('')}</div>`;
  }).join('');
  showModal(`Anúncio — ${esc(p.name)}`, `
    <div class="field hint" style="margin-top:-4px;margin-bottom:12px;">Campos iguais aos da planilha de exportação — preencha, salve o rascunho e exporte o Excel pra colar no formulário de cada marketplace. Marque "não se aplica" pra um campo não contar como pendente.</div>
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;">
      ${p.photo ? `<img src="${p.photo}" alt="${esc(p.name)}" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;">` : `<div style="width:64px;height:64px;border-radius:8px;background:var(--panel-2);flex-shrink:0;"></div>`}
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
  XLSX.writeFile(wb, `anuncio-${esc(p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-'))}.xlsx`);
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
  showModal(`Duplicar anúncio de "${esc(sourceProduct.name)}"`, `
    <div class="field hint" style="margin-top:-4px;">Copia categoria, condição, garantia, tipo de anúncio, variações, pré-venda e opções de envio. Título, preço, estoque, peso e SKU são gerados do zero pro produto escolhido; modelo, GTIN, dimensões, descrição e fotos ficam em branco pra você preencher.</div>
    <div class="field"><label>Duplicar para</label><select id="dupTargetProduct">
      ${others.map(p=>`<option value="${p.id}">${esc(p.name)}${listingHasContent(listingFor(p.id))?' (já tem anúncio)':''}</option>`).join('')}
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
  const extraTabsHtml = extras.map(plat=>`<button type="button" class="tabbtn" id="viewTabBtn_${plat.id}" onclick="switchListingViewTab('${plat.id}')">${esc(plat.name)}</button>`).join('');
  const extraPanelsHtml = extras.map(plat=>`<div id="viewPanel_${plat.id}" style="display:none;">${renderListingViewPanel(p, l, plat.id)}</div>`).join('');
  showModal(`Anúncio — ${esc(p.name)}`, `
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
          ${cover?`<img src="${cover}" alt="${esc(p.name)}" style="width:100%;height:100%;object-fit:cover;">`:`<span style="color:var(--text-faint);font-size:12px;">Sem foto</span>`}
        </div>
        ${thumbs}
      </div>
      <div style="flex:1;min-width:240px;">
        <h2 style="font-family:var(--font-display);font-size:19px;margin:0 0 8px;">${titulo}</h2>
        <div style="font-family:var(--font-mono);font-size:25px;font-weight:700;color:var(--nozzle);margin-bottom:12px;">${preco?'R$ '+preco:'—'}</div>
        ${data.link ? `<a href="${safeUrl(data.link)}" target="_blank" rel="noopener noreferrer" class="btn ghost sm" style="margin-bottom:12px;display:inline-flex;">Abrir anúncio publicado ↗</a>` : ''}
        ${specsHtml || `<div class="field hint" style="margin:0;">Nenhuma informação adicional preenchida.</div>`}
      </div>
    </div>
    <div style="margin-top:18px;">
      <div style="font-weight:600;font-size:13px;margin-bottom:6px;">Descrição</div>
      <div style="white-space:pre-wrap;font-size:13.5px;color:var(--text-dim);line-height:1.6;">${esc(data.descricao || 'Sem descrição.')}</div>
    </div>
  `;
}
function deleteProduct(id){
  const p = state.products.find(x=>x.id===id);
  const openOrders = state.orders.filter(o=>o.productId===id && o.status!=='Enviado');
  let msg = `Excluir "${esc(p.name)}"? Vendas já registradas não serão afetadas.`;
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
  const boxOpts = state.materials.filter(m=>m.category==='Embalagem' && (m.isBox||m.isEnvelope||m.isSaquinho));
  const machineOpts = state.settings.machines||[];
  if(filamentOpts.length===0 || boxOpts.length===0){
    blockedBy('Falta matéria-prima',
      'Todo produto sai de um filamento e vai dentro de uma embalagem — o custo de cada peça é calculado a partir do que você pagou por eles. Cadastre pelo menos um de cada em Estoque.',
      'Ir para Estoque', `switchTab('estoque');`);
    return;
  }
  if(machineOpts.length===0){
    blockedBy('Falta cadastrar sua impressora',
      'O custo de uma peça depende da máquina que a imprime: energia, depreciação e manutenção por hora. Sem isso o app não tem como dizer quanto cada anúncio rende por hora de impressora, que é a conta principal daqui.',
      'Ir para Configurações', `switchTab('configuracoes');`);
    return;
  }
  const p = editing ? state.products.find(x=>x.id===id) : { name:'', filaments:[{materialName:filamentOpts[0].name,weightG:100}], timeH:3, bubbleWrapM:0.5, tapeM:0.5, boxType:boxOpts[0].name, failureMarginPct:0.10, practicedPrice:0, stock:0, machineId:machineOpts[0].id, unitsPerPrint:1, unitsPerSale:1, marketPriceOverride:null, components:[] };
  editingFilaments = JSON.parse(JSON.stringify(p.filaments && p.filaments.length ? p.filaments : [{materialName:filamentOpts[0].name,weightG:100}]));
  editingLaborActions = JSON.parse(JSON.stringify(p.laborActions||[]));
  editingToolsUsed = JSON.parse(JSON.stringify(p.toolsUsed||[]));
  editingComponents = JSON.parse(JSON.stringify(p.components||[]));
  editingPhotoData = p.photo || null;
  editingProductMlFee = p.mlRealFeePct!=null ? p.mlRealFeePct : null;
  editingProductMlFeeUpdatedAt = p.mlRealFeeUpdatedAt || null;
  editingProductMlFeeUpdatedAtPrice = p.mlRealFeeUpdatedAtPrice || null;
  const boxes = boxOpts;
  showModal(editing?'Editar produto':'Novo produto', `
    <div class="field"><label>Nome do produto</label><input id="pName" value="${esc(p.name)}" placeholder="Ex: Kit Escritório"></div>
    <div class="field"><label>Categoria (opcional)</label>
      <select id="pCategory" onchange="toggleNewCategoryInput(this.value)">
        <option value="">Sem categoria</option>
        ${productCategorySuggestions().map(c=>`<option value="${esc(c)}" ${esc(p.category===c?'selected':'')}>${esc(c)}</option>`).join('')}
        <option value="__new__" ${esc(p.category && !productCategorySuggestions().includes(p.category)?'selected':'')}>+ Nova categoria...</option>
      </select>
      <input id="pCategoryNew" placeholder="Nome da nova categoria" style="margin-top:6px;display:${esc(p.category && !productCategorySuggestions().includes(p.category)?'block':'none')};" value="${esc(p.category && !productCategorySuggestions().includes(p.category)?p.category:'')}" oninput="updateMarketHint()">
    </div>
    ${state.settings.mlConnected ? `
    <div class="field hint" style="margin:4px 0 4px;font-weight:600;color:var(--text-dim);">Categoria no Mercado Livre — taxa real (opcional)</div>
    <div class="row2">
      <div class="field" style="position:relative;"><label>Categoria no ML</label>
        <input id="pMlCategorySearch" placeholder="Digite o nome do produto pra buscar..." value="${p.mlCategoryName||''}" oninput="searchMlCategory(this.value)" autocomplete="off">
        <div id="pMlCategoryResults"></div>
        <input type="hidden" id="pMlCategoryId" value="${esc(p.mlCategoryId||'')}">
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
      <div class="field"><label>Comprimento (cm)</label><input type="number" min="0" id="pLengthCm" value="${p.lengthCm||''}" step="0.1" placeholder="opcional" oninput="suggestBoxForDimensions(); updateProductPreview();"></div>
      <div class="field"><label>Largura (cm)</label><input type="number" min="0" id="pWidthCm" value="${p.widthCm||''}" step="0.1" placeholder="opcional" oninput="suggestBoxForDimensions(); updateProductPreview();"></div>
      <div class="field"><label>Altura (cm)</label><input type="number" min="0" id="pHeightCm" value="${p.heightCm||''}" step="0.1" placeholder="opcional" oninput="suggestBoxForDimensions(); updateProductPreview();"></div>
    </div>

    <div class="row2">
      <div class="field"><label>Impressora usada</label><select id="pMachine" onchange="updateProductPreview()">
        ${machineOpts.map(m=>`<option value="${m.id}" ${(p.machineId||machineOpts[0].id)===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}
      </select></div>
      <div class="field"><label>Embalagem</label><select id="pBox" onchange="updateBoxFitStatus(); updateProductPreview()">
        ${boxes.map(b=>`<option value="${esc(b.name)}" ${esc(p.boxType===b.name?'selected':'')}>${esc(b.name)}</option>`).join('')}
      </select></div>
    </div>
    <div class="field hint" id="pBoxFitStatus" style="margin-top:-8px;"></div>
    <div class="row2">
      <div class="field"><label>Plástico bolha (m)</label><input type="number" min="0" id="pBubble" value="${p.bubbleWrapM}" step="0.1" oninput="updateProductPreview()"></div>
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
      <div class="field"><label>Unidades por impressão</label><input type="number" id="pUnitsPerPrint" value="${p.unitsPerPrint||1}" min="1" step="1" oninput="updateProductPreview()"></div>
      <div class="field"><label>Unidades por venda</label><input type="number" id="pUnitsPerSale" value="${p.unitsPerSale||1}" min="1" step="1" oninput="updateMarketHint(); updateProductPreview()"></div>
    </div>
    <div class="field hint" style="margin-top:-8px;">Por impressão = quantas peças saem de uma leva (ex: 4). Por venda = quantas vão em um anúncio/caixa/pedido (ex: 1 se vende avulso, 4 se anuncia como kit) — são conceitos diferentes e o preço abaixo passa a ser sempre da venda inteira.</div>
    <div class="row2">
      <div class="field"><label>Fita adesiva usada (m)</label><input type="number" min="0" id="pTape" value="${p.tapeM||0}" step="0.1" oninput="updateProductPreview()"></div>
      <div class="field"><label>Margem de falha (%)</label><input type="number" min="0" id="pFail" value="${(p.failureMarginPct*100)}" step="1" oninput="updateProductPreview()"></div>
    </div>

    <div class="field" style="margin-bottom:6px;"><label>Mão de obra (ações e minutos de cada uma)</label></div>
    <div id="laborActionRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addLaborActionRow()">+ Adicionar ação</button>
    ${laborActionOptionsHtml()}

    <div class="field" style="margin-bottom:6px;"><label>Ferramentas usadas (e quantos usos cada uma consome)</label></div>
    <div id="toolsUsedRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addToolsUsedRow()">+ Adicionar ferramenta</button>

    <div class="field" style="margin-bottom:6px;"><label>Componentes inclusos na venda (parafuso, ímã, tag...)</label></div>
    <div id="componentRows"></div>
    <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addComponentRow()">+ Adicionar componente</button>

    <div class="row2">
      <div class="field"><label>Frete aproximado — Mercado Livre (R$)</label><input type="number" min="0" id="pFreightMl" value="${p.estimatedFreightMl||''}" step="0.01" placeholder="opcional" oninput="updateProductPreview()"></div>
      <div class="field"><label>Frete aproximado — Shopee (R$)</label><input type="number" min="0" id="pFreightShopee" value="${p.estimatedFreightShopee||''}" step="0.01" placeholder="opcional" oninput="this.dataset.touched='1'; updateProductPreview()"></div>
    </div>

    <div class="field"><label>Preço de mercado — exceção deste produto (R$)</label><input type="number" min="0" id="pMarketOverride" value="${p.marketPriceOverride||''}" step="0.01" placeholder="deixe em branco = herdar da categoria" oninput="updateMarketHint()"></div>
    <div class="field hint" id="pMarketHint" style="margin-top:-8px;"></div>
    <div class="row2">
      <div class="field"><label id="pPriceMlLabel">Preço praticado — Mercado Livre</label><input type="number" min="0" id="pPriceMl" value="${p.practicedPriceMl||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>
      <div class="field"><label id="pPriceShopeeLabel">Preço praticado — Shopee</label><input type="number" min="0" id="pPriceShopee" value="${p.practicedPriceShopee||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>
    </div>
    ${extraListingPlatforms().map(plat=>`<div class="field"><label id="pPriceExtraLabel_${plat.id}">Preço praticado — ${esc(plat.name)}</label><input type="number" min="0" id="pPriceExtra_${plat.id}" value="${(p.practicedPriceExtra||{})[plat.id]||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'"></div>`).join('')}
    <div class="field"><label>Estoque inicial (un)</label><input type="number" min="0" id="pStock" value="${p.stock}" step="1"></div>
    <div class="helper-block" id="productPreview"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmProduct(${editing?`'${id}'`:'null'})">${editing?'Salvar alterações':'Criar produto'}</button>
    </div>
  `);
  renderFilamentRows();
  renderLaborActionRows();
  renderToolsUsedRows();
  renderComponentsRows();
  renderPhotoPreview();
  updateBoxFitStatus();
  updateMarketHint();
  updateProductPreview();
}
let editingFilaments = [];
let editingLaborActions = [];
let editingToolsUsed = [];
let editingComponents = [];
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
  el.innerHTML = formRowsHtml('minmax(0,1.6fr) minmax(0,1fr)', ['Filamento','Peso (g)'],
    editingFilaments.map((f,i)=>`
    <div class="form-row">
      <select onchange="editingFilaments[${i}].materialName=this.value; refreshCurrentPreview();">
        ${filamentOptions.map(fo=>`<option value="${esc(fo.name)}" ${esc(f.materialName===fo.name?'selected':'')}>${esc(fo.name)}</option>`).join('')}
      </select>
      <input type="number" min="0" step="0.01" value="${f.weightG}" placeholder="peso (g)" oninput="editingFilaments[${i}].weightG=nn(this.value); refreshCurrentPreview();">
      ${formRowX(`removeFilamentRow(${i})`)}
    </div>
  `));
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
  el.innerHTML = formRowsHtml('minmax(0,1.6fr) minmax(0,1fr)', ['Ação','Minutos'],
    editingLaborActions.map((a,i)=>`
    <div class="form-row">
      <input list="laborActionOptions" value="${esc(a.action)}" placeholder="Ação (ex: Lixar)" oninput="editingLaborActions[${i}].action=this.value; refreshCurrentPreview();">
      <input type="number" min="0" step="1" value="${a.minutes}" placeholder="minutos" oninput="editingLaborActions[${i}].minutes=nn(this.value); refreshCurrentPreview();">
      ${formRowX(`removeLaborActionRow(${i})`)}
    </div>
  `));
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
  el.innerHTML = formRowsHtml('minmax(0,1.6fr) minmax(0,1fr)', ['Ferramenta','Usos'],
    editingToolsUsed.map((t,i)=>`
    <div class="form-row">
      <select onchange="editingToolsUsed[${i}].toolId=this.value; refreshCurrentPreview();">
        ${toolOptions.map(to=>`<option value="${to.id}" ${t.toolId===to.id?'selected':''}>${esc(to.name)}</option>`).join('')}
      </select>
      <input type="number" min="0" step="1" value="${t.uses}" placeholder="usos" oninput="editingToolsUsed[${i}].uses=nn(this.value); refreshCurrentPreview();">
      ${formRowX(`removeToolsUsedRow(${i})`)}
    </div>
  `));
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
function renderComponentsRows(){
  const el = document.getElementById('componentRows');
  if(!el) return;
  const compOptions = state.materials.filter(m=>m.category==='Componentes');
  if(compOptions.length===0){
    el.innerHTML = `<div class="field hint" style="margin-top:0;">Nenhum componente cadastrado ainda — cadastre em Estoque (categoria Componentes) pra poder usar aqui.</div>`;
    return;
  }
  el.innerHTML = formRowsHtml('minmax(0,1.4fr) minmax(0,0.7fr) minmax(0,1.1fr)', ['Componente','Qtd','Conta por'],
    editingComponents.map((comp,i)=>`
    <div class="form-row">
      <select onchange="editingComponents[${i}].materialId=this.value; refreshCurrentPreview();">
        ${compOptions.map(co=>`<option value="${co.id}" ${comp.materialId===co.id?'selected':''}>${esc(co.name)}</option>`).join('')}
      </select>
      <input type="number" min="0" step="1" value="${comp.qty}" placeholder="qtd" oninput="editingComponents[${i}].qty=nn(this.value); refreshCurrentPreview();">
      <select onchange="editingComponents[${i}].scope=this.value; refreshCurrentPreview();">
        <option value="peca" ${comp.scope==='peca'?'selected':''}>Por peça (× un. por venda)</option>
        <option value="venda" ${comp.scope==='venda'?'selected':''}>Uma vez por venda</option>
      </select>
      ${formRowX(`removeComponentRow(${i})`)}
    </div>
  `));
}
function addComponentRow(){
  const compOptions = state.materials.filter(m=>m.category==='Componentes');
  if(compOptions.length===0){ toast('Cadastre um componente em Estoque primeiro','err'); return; }
  editingComponents.push({materialId:compOptions[0].id, qty:1, scope:'peca'});
  renderComponentsRows();
  refreshCurrentPreview();
}
function removeComponentRow(i){
  editingComponents.splice(i,1);
  renderComponentsRows();
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
  updateMarketHint();
}
function updateMarketHint(){
  const hintEl = document.getElementById('pMarketHint');
  const catEl = document.getElementById('pCategory');
  if(!hintEl || !catEl) return;
  const catSel = catEl.value;
  const category = catSel==='__new__' ? (document.getElementById('pCategoryNew')||{}).value.trim() : catSel;
  const overrideEl = document.getElementById('pMarketOverride');
  if(overrideEl && overrideEl.value){ hintEl.innerHTML = ''; return; }
  const saleUnitsEl = document.getElementById('pUnitsPerSale');
  const saleUnits = saleUnitsEl ? Math.max(1, parseFloat(saleUnitsEl.value)||1) : 1;
  const marketInfo = effectiveMarketPrice({ category, unitsPerSale: saleUnits, marketPriceOverride: null });
  if(marketInfo.value==null){ hintEl.innerHTML = `<span style="color:var(--text-faint);">Preço de mercado não pesquisado — cadastre em Configurações</span>`; return; }
  const basisNote = marketInfo.unitBasis==='kit'
    ? (marketInfo.kitSize===saleUnits ? `kit de ${marketInfo.kitSize} — mesmo tamanho da sua venda` : `kit de ${marketInfo.kitSize}, escalado pra sua venda de ${saleUnits}`)
    : (saleUnits>1 ? `por unidade, escalado pra sua venda de ${saleUnits}` : 'por unidade');
  hintEl.innerHTML = `Herdando da categoria: <strong>${brl(marketInfo.value)}</strong> <span style="color:var(--text-faint);">(faixa ${basisNote})</span>`;
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
    timeH: (numField('pTimeH')) + (numField('pTimeMin'))/60,
    bubbleWrapM: numField('pBubble'),
    tapeM: numField('pTape'),
    failureMarginPct: (numField('pFail'))/100,
    laborActions: editingLaborActions,
    toolsUsed: editingToolsUsed,
    components: editingComponents,
    unitsPerPrint: Math.max(1, numField('pUnitsPerPrint', 1)),
    unitsPerSale: Math.max(1, numField('pUnitsPerSale', 1)),
    marketPriceOverride: (document.getElementById('pMarketOverride').value.trim() ? numField('pMarketOverride') : null),
    lengthCm: numField('pLengthCm'),
    widthCm: numField('pWidthCm'),
    heightCm: numField('pHeightCm'),
    estimatedFreightMl: numField('pFreightMl'),
    estimatedFreightShopee: numField('pFreightShopee'),
    modelOrigin: document.getElementById('pModelOrigin').value,
    modelLicense: document.getElementById('pModelLicense').value.trim(),
    modelSourceUrl: document.getElementById('pModelSourceUrl').value.trim(),
  };
  // Preço praticado por canal — só pra a pré-visualização calcular o R$/hora no
  // que está sendo DIGITADO, não no preço sugerido (confirmProduct lê os campos
  // de novo, direto do DOM, na hora de salvar — isso aqui não afeta o que é salvo).
  // Produtos é só marketplace — não tem mais campo de "venda própria" aqui
  // (isso vive em Personalizados); practicedPrice fica sem input próprio e
  // cai no fallback de calcProduct (preço sugerido por custo).
  const priceMlRaw = document.getElementById('pPriceMl').value;
  form.practicedPriceMl = priceMlRaw ? parseFloat(priceMlRaw) : undefined;
  const priceShopeeRaw = document.getElementById('pPriceShopee').value;
  form.practicedPriceShopee = priceShopeeRaw ? parseFloat(priceShopeeRaw) : undefined;
  form.practicedPriceExtra = {};
  extraListingPlatforms().forEach(plat=>{
    const raw = (document.getElementById(`pPriceExtra_${plat.id}`)||{}).value;
    if(raw) form.practicedPriceExtra[plat.id] = parseFloat(raw);
  });
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
  const lengthCm = numField('pLengthCm');
  const widthCm = numField('pWidthCm');
  const heightCm = numField('pHeightCm');
  if(lengthCm>0 && widthCm>0 && heightCm>0){
    const best = bestFittingBox(lengthCm, widthCm, heightCm);
    if(best) document.getElementById('pBox').value = best.name;
  }
  updateBoxFitStatus();
}
function updateBoxFitStatus(){
  const statusEl = document.getElementById('pBoxFitStatus');
  if(!statusEl) return;
  const lengthCm = numField('pLengthCm');
  const widthCm = numField('pWidthCm');
  const heightCm = numField('pHeightCm');
  if(!(lengthCm>0 && widthCm>0 && heightCm>0)){ statusEl.textContent = ''; return; }
  const boxName = document.getElementById('pBox').value;
  const box = materialByName(boxName);
  const fits = boxFitsDimensions(box, lengthCm, widthCm, heightCm);
  if(fits===true){
    statusEl.innerHTML = `<span style="color:var(--teal);">✓ Cabe na embalagem selecionada</span>`;
  } else if(fits===false){
    const best = bestFittingBox(lengthCm, widthCm, heightCm);
    statusEl.innerHTML = best
      ? `<span style="color:var(--red);">⚠️ Não cabe nessa embalagem — sugerido: ${esc(best.name)}</span>`
      : `<span style="color:var(--red);">⚠️ Nenhuma embalagem cadastrada é grande o suficiente — cadastre as medidas de uma embalagem maior em Estoque</span>`;
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
  const marketInfo = effectiveMarketPrice(form);
  const marketBasisNote = marketInfo.source==='category'
    ? (marketInfo.unitBasis==='kit'
        ? `faixa por kit de ${marketInfo.kitSize}${marketInfo.kitSize!==c.saleUnits?`, escalada pra sua venda de ${c.saleUnits}`:''}`
        : `faixa por unidade${c.saleUnits>1?`, escalada pra sua venda de ${c.saleUnits}`:''}`)
    : null;
  const marketRangeLine = marketInfo.source==='none'
    ? `<div class="calc-line"><span>Preço de mercado${form.category?` (${esc(form.category)})`:''}</span><span class="badge mut">Não pesquisado</span></div>`
    : `<div class="calc-line"><span>Mercado${form.category?` (${esc(form.category)})`:''}${marketInfo.source==='override'?' — exceção':''}</span><span>${marketInfo.min>0?brl(marketInfo.min):'—'} / ${marketInfo.avg>0?brl(marketInfo.avg):'—'} / ${marketInfo.max>0?brl(marketInfo.max):'—'}</span></div>
       ${marketBasisNote?`<div class="field hint" style="margin:-4px 0 0;">${marketBasisNote}</div>`:''}`;
  // "(por venda de N un)" quando a peça é vendida em kit, "(por unidade)"
  // quando é avulsa — evita a ambiguidade de não saber se o preço cobre 1
  // peça ou o anúncio inteiro.
  const saleQualifier = c.saleUnits>1 ? `(por venda de ${c.saleUnits} un)` : '(por unidade)';
  const priceMlLabelEl = document.getElementById('pPriceMlLabel');
  if(priceMlLabelEl) priceMlLabelEl.textContent = `Preço praticado — Mercado Livre ${saleQualifier}`;
  const priceShopeeLabelEl = document.getElementById('pPriceShopeeLabel');
  if(priceShopeeLabelEl) priceShopeeLabelEl.textContent = `Preço praticado — Shopee ${saleQualifier}`;
  extraListingPlatforms().forEach(plat=>{
    const labelEl = document.getElementById(`pPriceExtraLabel_${plat.id}`);
    if(labelEl) labelEl.textContent = `Preço praticado — ${esc(plat.name)} ${saleQualifier}`;
  });

  const saleSummary = `
    <div style="border:1px solid var(--line);border-radius:10px;padding:12px 14px;margin-bottom:12px;background:var(--panel-2);">
      <div style="font-weight:600;font-size:11.5px;margin-bottom:8px;color:var(--text-dim);letter-spacing:.02em;">O ANÚNCIO</div>
      <div class="calc-line"><span>Vende</span><span style="font-weight:600;">${c.saleUnits} unidade${c.saleUnits>1?'s':''} por venda${c.printUnits>1?` <span style="font-weight:400;color:var(--text-faint);font-size:11px;">(leva rende ${c.printUnits})</span>`:''}</span></div>
      <div class="calc-line"><span>Tempo por venda</span><span style="font-weight:600;">${fmtHm(c.saleTimeH)}</span></div>
      <div class="calc-line"><span>Custo por venda</span><span style="font-weight:600;">${brl(c.totalCost)}</span></div>
    </div>`;
  document.getElementById('productPreview').innerHTML = `
    ${saleSummary}
    <div class="calc-line"><span>Peso por peça</span><span>${num(c.unitWeightG,1)}g${c.printUnits>1?` <span style="color:var(--text-faint);font-size:11px;">(leva: ${num(totalWeight(form),0)}g / ${c.printUnits} un)</span>`:''}</span></div>
    <div class="calc-line"><span>Tempo por peça</span><span>${fmtHm(c.unitTimeH)}${c.printUnits>1?` <span style="color:var(--text-faint);font-size:11px;">(leva: ${num(form.timeH,1)}h)</span>`:''}</span></div>
    <div class="calc-line"><span>Custo material (por peça)</span><span>${brl(c.materialCost)}</span></div>
    <div class="calc-line"><span>Custo energia (por peça)</span><span>${brl(c.energyCost)}</span></div>
    <div class="calc-line"><span>Embalagem (${packagingLabelFor(form)}) — por venda</span><span>${brl(c.embalagemCost)}</span></div>
    <div class="calc-line"><span>Depreciação (por peça, ${esc(c.machine?c.machine.name:'sem impressora')})</span><span>${brl(c.depreciation)}</span></div>
    <div class="calc-line"><span>Manutenção (por peça)</span><span>${brl(c.maintenance)}</span></div>
    <div class="calc-line"><span>Mão de obra (por peça)</span><span>${brl(c.laborCost)}</span></div>
    ${c.toolsCost>0 ? `<div class="calc-line"><span>Ferramentas (por peça)</span><span>${brl(c.toolsCost)}</span></div>` : ''}
    ${c.componentsCost>0 ? `<div class="calc-line"><span>Componentes (${componentsLabelFor(form)}) — por venda</span><span>${brl(c.componentsCost)}</span></div>` : ''}
    <div class="calc-line"><span>Custo de falha (por peça)</span><span>${brl(c.failureCost)}</span></div>
    <div class="calc-line total"><span>Custo total — por venda${c.saleUnits>1?` de ${c.saleUnits} un`:''}</span><span>${brl(c.totalCost)}</span></div>
    ${marketRangeLine}
    ${pricingChannelBlockHtml('Mercado Livre', 'Mercado Livre', c.practicedPriceMl, c, marketInfo, form)}
    ${pricingChannelBlockHtml('Shopee', 'Shopee', c.practicedPriceShopee, c, marketInfo, form)}
    ${extraListingPlatforms().map(plat=>pricingChannelBlockHtml(plat.name, plat.name, c.practicedPriceExtra[plat.id], c, marketInfo, form)).join('')}
  `;
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
  if(dup){ toast(`Já existe um produto chamado "${esc(dup.name)}" — use outro nome`,'err'); return; }
  if(form.lengthCm>0 && form.widthCm>0 && form.heightCm>0){
    const fits = boxFitsDimensions(materialByName(form.boxType), form.lengthCm, form.widthCm, form.heightCm);
    if(fits===false){ toast('Esse produto não cabe na embalagem selecionada — escolha outra ou ajuste as medidas','err'); return; }
  }
  const priceMlRaw = document.getElementById('pPriceMl').value;
  const priceShopeeRaw = document.getElementById('pPriceShopee').value;
  const stock = numField('pStock');
  const c = calcProduct(form);
  // Produtos não tem mais campo de "venda própria" — practicedPrice fica no
  // fallback por custo, só pra outros lugares do app (Cálculo, catálogo) que
  // ainda leem esse campo não quebrarem.
  const practicedPrice = c.suggestedPrice;
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
let showDeliveredCustomOrders = false;
let personalizadosView = 'kanban';
const CUSTOM_ORDER_TYPES = { chaveiro:'Chaveiro', lembrancinha:'Lembrancinha', topo_bolo:'Topo de bolo', outro:'Outro' };
// Status próprio de Personalizados — NÃO é o ORDER_STATUSES de Pedidos
// (state.orders), que é outro sistema já em produção com venda vinculada
// (orderId em sales). Esse aqui é novo, só acompanha o ciclo da encomenda
// sob medida — nomeado diferente de propósito pra nunca colidir com aquele.
const CUSTOM_ORDER_STATUSES = ['Incompleto','Aguardando sinal','Na fila','Imprimindo','Pronto','Entregue'];
function orderTypeLabel(t){ return CUSTOM_ORDER_TYPES[t] || CUSTOM_ORDER_TYPES.outro; }
function customerNameFor(o){
  if(o.customerId){ const cu = state.customers.find(c=>c.id===o.customerId); if(cu) return cu.name; }
  return o.customerName || 'Avulso';
}
// Contador persistente em settings — nunca deriva do maior número já usado,
// senão excluir a última encomenda faz o próximo número ser reaproveitado.
function allocateCustomOrderNumber(){
  state.settings.customOrderSeq = (state.settings.customOrderSeq||0) + 1;
  saveSettings();
  return String(state.settings.customOrderSeq).padStart(4,'0');
}
// Obrigatórios só da aba "Pedido" — "Produção" fica de fora de propósito,
// porque se preenche naturalmente durante a impressão, travar por ela não
// faz sentido (o pedido pode estar 100% combinado com o cliente antes disso).
function orderRequiredFields(o){
  const common = [
    {key:'customerName', label:'Nome do cliente', check:x=>!!(x.customerId || (x.customerName&&x.customerName.trim()))},
    {key:'contact', label:'Contato', check:x=>!!(x.contact&&x.contact.trim())},
    {key:'orderType', label:'Tipo', check:x=>!!x.orderType},
    {key:'qty', label:'Quantidade', check:x=>(x.qty||0)>0},
    {key:'deliveryDate', label:'Data de entrega', check:x=>!!x.deliveryDate},
    {key:'totalValue', label:'Valor total', check:x=>(x.practicedPrice||0)>0},
  ];
  const byType = {
    chaveiro: [
      {key:'pieceText', label:'Texto da peça', check:x=>!!(x.pieceText&&x.pieceText.trim())},
      {key:'baseColor', label:'Cor da base', check:x=>!!(x.baseColor&&x.baseColor.trim())},
      {key:'detailColor', label:'Cor do texto', check:x=>!!(x.detailColor&&x.detailColor.trim())},
    ],
    lembrancinha: [
      {key:'pieceText', label:'Texto da peça', check:x=>!!(x.pieceText&&x.pieceText.trim())},
      {key:'baseColor', label:'Cor da base', check:x=>!!(x.baseColor&&x.baseColor.trim())},
    ],
    topo_bolo: [
      {key:'pieceText', label:'Texto da peça', check:x=>!!(x.pieceText&&x.pieceText.trim())},
      {key:'baseColor', label:'Cor da base', check:x=>!!(x.baseColor&&x.baseColor.trim())},
      {key:'sizeLabel', label:'Tamanho', check:x=>!!(x.sizeLabel&&x.sizeLabel.trim())},
    ],
  };
  return [...common, ...(byType[o.orderType]||[])];
}
function orderCompleteness(o){
  const fields = orderRequiredFields(o);
  const missingFields = fields.filter(f=>!f.check(o));
  const total = fields.length;
  const filled = total - missingFields.length;
  return { total, filled, missing: missingFields.map(f=>f.label), missingKeys: missingFields.map(f=>f.key), pct: total>0 ? Math.round((filled/total)*100) : 100 };
}
function waLink(o){
  const digits = (o.contact||'').replace(/\D/g,'');
  if(!digits) return null;
  const phone = digits.length>11 ? digits : '55'+digits;
  return `https://wa.me/${phone}?text=${encodeURIComponent('Oi! Sobre seu pedido '+(o.orderNumber||''))}`;
}
// A trava: não deixa avançar pra "Na fila" ou além sem os obrigatórios
// preenchidos e o texto confirmado com o cliente — é o que evita imprimir
// peça personalizada errada (perda total, não se revende).
function changeCustomOrderStatus(id, status){
  const o = state.customOrders.find(x=>x.id===id);
  if(!o) return;
  const gateFrom = CUSTOM_ORDER_STATUSES.indexOf('Na fila');
  if(CUSTOM_ORDER_STATUSES.indexOf(status)>=gateFrom){
    const completeness = orderCompleteness(o);
    if(completeness.missing.length>0){
      toast(`Faltam ${completeness.missing.length} campo${completeness.missing.length>1?'s':''}: ${completeness.missing.join(', ')}`,'err');
      renderContent();
      return;
    }
    if(!o.approved){
      toast('Confirme o texto com o cliente antes de produzir','err');
      renderContent();
      return;
    }
  }
  o.status = status;
  saveCustomOrders();
  renderContent();
}
function renderPersonalizados(){
  if(state.customOrders.length===0) return `<div class="card">${emptyState(
    'Nenhuma encomenda personalizada cadastrada ainda.<br><span style="font-size:12.5px;">Peça sob medida, feita uma vez só — não vira produto de catálogo, mas o custo e o prazo são calculados igual.</span>',
    '+ Nova encomenda personalizada', `openQuickCustomOrderModal()`)}</div>`;
  let list = state.customOrders.slice();
  if(personalizadosFilter.search){
    const q = personalizadosFilter.search.toLowerCase();
    list = list.filter(o=>(o.name||'').toLowerCase().includes(q) || (o.orderNumber||'').toLowerCase().includes(q) || customerNameFor(o).toLowerCase().includes(q));
  }
  const resultBadge = (r) => r==='ok' ? '<span class="badge ok">OK</span>' : r==='falha_parcial' ? '<span class="badge warn">Falha parcial</span>' : r==='falha_total' ? '<span class="badge bad">Falha total</span>' : '';
  const cardHtml = (o) => {
    const c = calcProduct(o);
    const completeness = orderCompleteness(o);
    const wa = waLink(o);
    const canProduce = completeness.missing.length===0 && o.approved;
    const showProduzir = o.status==='Incompleto' || o.status==='Aguardando sinal';
    return `<div class="card" style="padding:14px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:600;font-size:13.5px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
            ${esc(o.name||orderTypeLabel(o.orderType))}
            <span class="badge info">${orderTypeLabel(o.orderType)}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-faint);margin-top:3px;">Pedido ${o.orderNumber||'—'} · ${customerNameFor(o)}${wa?` · <a href="${safeUrl(wa)}" target="_blank" rel="noopener noreferrer">${o.contact}</a>`:(o.contact?' · '+o.contact:'')}</div>
        </div>
        ${resultBadge(o.result)}
      </div>
      <div style="display:flex;gap:14px;margin-top:10px;font-size:12px;color:var(--text-dim);flex-wrap:wrap;">
        <span>Entrega: ${o.deliveryDate?fmtDate(o.deliveryDate):'—'}</span>
        <span>Qtd: ${o.qty||1}</span>
        <span>Custo: ${brl(c.totalCost)}</span>
        <span>Valor: ${brl(c.practicedPrice)}</span>
        <span style="color:${c.marginValue<0?'var(--red)':'var(--green)'}">Margem: ${pct(c.marginPct)}</span>
      </div>
      <div style="margin-top:8px;">
        ${completeness.pct>=100
          ? `<span class="badge ok">Completo</span>`
          : `<span class="badge warn">Falta preencher · ${completeness.missing.length} campo${completeness.missing.length>1?'s':''}</span><div style="font-size:10.5px;color:var(--amber);margin-top:3px;">${completeness.missing.join(', ')}</div>`}
      </div>
      <select style="margin-top:10px;width:100%;" onchange="changeCustomOrderStatus('${o.id}', this.value)">
        ${CUSTOM_ORDER_STATUSES.map(s=>`<option value="${esc(s)}" ${esc(s===o.status?'selected':'')}>${esc(s)}</option>`).join('')}
      </select>
      <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
        <button class="btn ghost sm" onclick="openCustomOrderModal('${o.id}')">Abrir</button>
        ${showProduzir ? `<button class="btn sm" ${canProduce?'':'disabled'} onclick="changeCustomOrderStatus('${o.id}','Na fila')" title="${canProduce?'':'Complete os campos obrigatórios e confirme o texto com o cliente'}">Produzir</button>` : ''}
        <button class="btn ghost sm" onclick="exportCustomOrderPDF('${o.id}')">Ficha</button>
        <button class="btn ghost sm" onclick="deleteCustomOrder('${o.id}')">Excluir</button>
      </div>
    </div>`;
  };
  const visibleStatuses = showDeliveredCustomOrders ? CUSTOM_ORDER_STATUSES : CUSTOM_ORDER_STATUSES.filter(s=>s!=='Entregue');
  const deliveredCount = state.customOrders.filter(o=>o.status==='Entregue').length;
  const cols = visibleStatuses.map(status=>{
    const inCol = list.filter(o=>o.status===status).sort((a,b)=>(a.deliveryDate||'9999').localeCompare(b.deliveryDate||'9999'));
    return `<div style="min-width:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-family:var(--font-display);font-weight:600;font-size:13px;">${status}</div>
        <span class="chip">${inCol.length}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${inCol.length ? inCol.map(cardHtml).join('') : `<div class="empty" style="padding:16px 8px;">Nada aqui</div>`}
      </div>
    </div>`;
  }).join('');
  return `
    <div class="filter-bar">
      <div class="field"><label>Buscar</label><input value="${personalizadosFilter.search}" placeholder="Nome, pedido ou cliente..." oninput="personalizadosFilter.search=this.value; renderContent();"></div>
      <div class="field hint" style="padding-top:9px;">${list.length} de ${state.customOrders.length} encomenda(s)</div>
      ${deliveredCount>0 ? `<button class="btn ghost sm" style="align-self:flex-end;" onclick="showDeliveredCustomOrders=!showDeliveredCustomOrders; renderContent();">${showDeliveredCustomOrders?'Ocultar':'Mostrar'} entregues (${deliveredCount})</button>` : ''}
    </div>
    <div class="grid g-5" style="align-items:start;">${cols}</div>
  `;
}
// Diagnóstico de Personalizados — mesmo espírito do Diagnóstico de Produtos,
// adaptado ao canal direto (sem taxa de marketplace) e só com encomendas
// ENTREGUES: é a única fase em que peso/tempo/custo reais já existem — antes
// disso ainda é plano, não fato, e não serve pra calibrar nada.
function renderPersonalizadosDiagnostico(){
  const delivered = state.customOrders.filter(o=>o.status==='Entregue');
  if(delivered.length===0) return `<div class="card">${emptyState(
    'Nenhuma encomenda entregue ainda.<br><span style="font-size:12.5px;">O Diagnóstico compara o que você estimou com o que a peça realmente custou — só encomenda entregue tem peso e tempo reais pra comparar.</span>',
    'Voltar ao quadro', `personalizadosView='kanban'; renderContent(); renderTopbarActions();`)}</div>`;
  const list = delivered.map(o=>{
    const c = calcProduct(o);
    const estWeight = totalWeight(o);
    const estTimeH = o.timeH||0;
    // Prefere o dado REAL (preenchido na aba Produção após a impressão) sobre
    // a estimativa — é o ponto inteiro de calibrar com o histórico.
    const effTimeH = o.realTimeH>0 ? o.realTimeH : estTimeH;
    const effCost = o.realCost>0 ? o.realCost : c.totalCost;
    const profit = (o.practicedPrice||0) - effCost;
    const hourly = effTimeH>0 ? profit/effTimeH : null;
    const verdict = hourlyVerdict(hourly, profit);
    const tablePrice = tablePriceFor(o.orderType, o.qty);
    const weightDevPct = (o.realWeightG>0 && estWeight>0) ? ((o.realWeightG-estWeight)/estWeight)*100 : null;
    const timeDevPct = (o.realTimeH>0 && estTimeH>0) ? ((o.realTimeH-estTimeH)/estTimeH)*100 : null;
    return { o, estWeight, estTimeH, effTimeH, profit, hourly, verdict, tablePrice, weightDevPct, timeDevPct };
  });
  const byType = {};
  list.forEach(x=>{ const t=x.o.orderType||'outro'; (byType[t]=byType[t]||[]).push(x); });
  const typeOrder = ['chaveiro','lembrancinha','topo_bolo','outro'];

  const withWeightDev = list.filter(x=>x.weightDevPct!=null);
  const withTimeDev = list.filter(x=>x.timeDevPct!=null);
  const avgWeightDev = withWeightDev.length ? withWeightDev.reduce((a,x)=>a+x.weightDevPct,0)/withWeightDev.length : null;
  const avgTimeDev = withTimeDev.length ? withTimeDev.reduce((a,x)=>a+x.timeDevPct,0)/withTimeDev.length : null;

  const calibrationCard = `
    <div class="card" style="margin-bottom:14px;">
      <div class="field hint" style="margin:0 0 10px;">Comparativo estimado × real — calibra o peso/tempo cadastrado em novas encomendas com o que de fato aconteceu na produção.</div>
      <div class="row2">
        <div><div class="field hint" style="margin:0;">Peso real vs. estimado (média)</div><div style="font-family:var(--font-mono);font-size:18px;font-weight:700;">${avgWeightDev!=null?(avgWeightDev>=0?'+':'')+pct(avgWeightDev):'—'}${withWeightDev.length?` <span style="font-size:11px;font-weight:400;color:var(--text-faint);">(${withWeightDev.length} encomenda${withWeightDev.length>1?'s':''})</span>`:''}</div></div>
        <div><div class="field hint" style="margin:0;">Tempo real vs. estimado (média)</div><div style="font-family:var(--font-mono);font-size:18px;font-weight:700;">${avgTimeDev!=null?(avgTimeDev>=0?'+':'')+pct(avgTimeDev):'—'}${withTimeDev.length?` <span style="font-size:11px;font-weight:400;color:var(--text-faint);">(${withTimeDev.length} encomenda${withTimeDev.length>1?'s':''})</span>`:''}</div></div>
      </div>
    </div>`;

  const typeSections = typeOrder.filter(t=>byType[t] && byType[t].length).map(t=>{
    const items = byType[t];
    const withHourly = items.filter(x=>x.hourly!=null);
    const totalHours = withHourly.reduce((a,x)=>a+(x.effTimeH||0),0);
    const totalProfitOverHours = withHourly.reduce((a,x)=>a+x.hourly*(x.effTimeH||0),0);
    const weightedAvg = totalHours>0 ? totalProfitOverHours/totalHours : null;
    const totalRevenue = items.reduce((a,x)=>a+(x.o.practicedPrice||0),0);
    const rows = items.map(({o,estWeight,estTimeH,profit,hourly,verdict,tablePrice,weightDevPct,timeDevPct})=>{
      const tableDeltaPct = (tablePrice!=null && tablePrice>0) ? ((o.practicedPrice-tablePrice)/tablePrice)*100 : null;
      return `<tr>
        <td data-label="Encomenda">${o.orderNumber?`#${o.orderNumber} — `:''}${customerNameFor(o)}<div style="font-size:11px;color:var(--text-faint);">${o.deliveryDate?fmtDate(o.deliveryDate):''}</div></td>
        <td class="right num" data-label="Qtd">${num(o.qty||0,0)}</td>
        <td class="right num" data-label="Peso (est. → real)">${num(estWeight,1)}g → ${o.realWeightG>0?num(o.realWeightG,1)+'g':'—'}${weightDevPct!=null?`<div style="font-size:10px;color:${Math.abs(weightDevPct)>15?'var(--red)':'var(--text-faint)'};">${weightDevPct>=0?'+':''}${pct(weightDevPct)}</div>`:''}</td>
        <td class="right num" data-label="Tempo (est. → real)">${fmtHm(estTimeH)} → ${o.realTimeH>0?fmtHm(o.realTimeH):'—'}${timeDevPct!=null?`<div style="font-size:10px;color:${Math.abs(timeDevPct)>15?'var(--red)':'var(--text-faint)'};">${timeDevPct>=0?'+':''}${pct(timeDevPct)}</div>`:''}</td>
        <td class="right num" data-label="Preço praticado">${brl(o.practicedPrice||0)}</td>
        <td class="right num" data-label="Preço de tabela">${tablePrice!=null?brl(tablePrice):'<span class="badge mut">sem tabela</span>'}${tableDeltaPct!=null?`<div style="font-size:10px;color:${tableDeltaPct<0?'var(--red)':'var(--text-faint)'};">${tableDeltaPct>=0?'+':''}${pct(tableDeltaPct)}</div>`:''}</td>
        <td class="right num" data-label="Lucro">${brl(profit)}</td>
        <td class="right num" data-label="R$/hora" style="font-weight:600;">${hourly!=null?brl(hourly)+'/h':'—'}</td>
        <td data-label="Veredito"><span class="badge ${verdict.cls}">${verdict.label}</span></td>
      </tr>`;
    }).join('');
    return `<div class="section-title">${orderTypeLabel(t)} — ${items.length} encomenda${items.length>1?'s':''}, receita ${brl(totalRevenue)}, média ${weightedAvg!=null?brl(weightedAvg)+'/h':'—'}</div>
      <div class="card"><div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Encomenda</th><th class="right">Qtd</th><th class="right">Peso (est. → real)</th><th class="right">Tempo (est. → real)</th><th class="right">Preço praticado</th><th class="right">Preço de tabela</th><th class="right">Lucro</th><th class="right">R$/hora</th><th>Veredito</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div></div>`;
  }).join('');

  return calibrationCard + typeSections;
}
function deleteCustomOrder(id){
  const o = state.customOrders.find(x=>x.id===id);
  if(!o) return;
  if(!confirm(`Excluir a encomenda "${esc(o.name)}"${o.orderNumber?' (Pedido '+o.orderNumber+')':''}? Essa ação não pode ser desfeita.`)) return;
  state.customOrders = state.customOrders.filter(x=>x.id!==id);
  saveCustomOrders(); toast('Encomenda excluída'); renderContent();
}
function toggleCoCustomerField(val){
  const el = document.getElementById('coCustomerNameWrap');
  if(el) el.style.display = val ? 'none' : 'block';
}

/* ---- Momento 1: criação rápida — só o que se sabe assim que a encomenda chega ---- */
function openQuickCustomOrderModal(){
  showModal('Nova encomenda personalizada', `
    <div class="field"><label>Nome do cliente</label>
      <input id="qcoClientName" list="qcoClientNames" placeholder="Ex: Maria Silva" oninput="autofillQcoContact(this.value)">
      <datalist id="qcoClientNames">${state.customers.map(cu=>`<option value="${esc(cu.name)}">`).join('')}</datalist>
    </div>
    <div class="field"><label>Contato</label><input id="qcoContact" placeholder="(11) 99999-9999" oninput="this.dataset.touched='1'"></div>
    <div class="field"><label>Tipo</label>
      <select id="qcoType">
        ${Object.entries(CUSTOM_ORDER_TYPES).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}
      </select>
    </div>
    <div class="row2">
      <div class="field"><label>Data de entrega</label><input type="date" id="qcoDeliveryDate"></div>
      <div class="field"><label>Quantidade</label><input type="number" id="qcoQty" value="1" min="1" step="1"></div>
    </div>
    <div class="field hint" style="margin-top:-8px;">Só o essencial pra abrir o pedido — peça, material, impressora e ficha técnica você preenche depois, na hora de produzir.</div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmQuickCustomOrder()">Criar encomenda</button>
    </div>
  `);
}
function autofillQcoContact(name){
  const contactEl = document.getElementById('qcoContact');
  if(!contactEl || contactEl.dataset.touched) return;
  const cu = state.customers.find(c=>c.name.trim().toLowerCase()===name.trim().toLowerCase());
  if(cu) contactEl.value = cu.contact||'';
}
function confirmQuickCustomOrder(){
  const clientName = document.getElementById('qcoClientName').value.trim();
  const contact = document.getElementById('qcoContact').value.trim();
  const type = document.getElementById('qcoType').value;
  const deliveryDate = document.getElementById('qcoDeliveryDate').value;
  const qty = numField('qcoQty', 1);
  if(!clientName || !contact || !type || !deliveryDate){ toast('Preencha nome, contato, tipo e data de entrega','err'); return; }
  let cu = state.customers.find(c=>c.name.trim().toLowerCase()===clientName.toLowerCase());
  if(!cu){ cu = { id:uid(), name:clientName, contact, notes:'' }; state.customers.push(cu); saveCustomers(); }
  const orderNumber = allocateCustomOrderNumber();
  const o = migrateCustomOrders([{
    id:uid(), orderNumber, orderDate: todayStr(), name: orderTypeLabel(type), orderType: type,
    customerId: cu.id, customerName: clientName, contact, qty, deliveryDate, status:'Incompleto',
    createdAt: new Date().toISOString(),
  }])[0];
  state.customOrders.push(o);
  saveCustomOrders();
  toast('Encomenda criada — pedido '+orderNumber);
  closeModal();
  renderContent();
}

/* ---- Momento 2: detalhe em 3 abas — preenchido aos poucos, na hora certa ---- */
function switchCustomOrderTab(tab){
  ['pedido','producao','custos'].forEach(t=>{
    const panel = document.getElementById('coPanel_'+t);
    const btn = document.getElementById('coTabBtn_'+t);
    if(panel) panel.style.display = t===tab ? 'block' : 'none';
    if(btn) btn.classList.toggle('active', t===tab);
  });
}
function openCustomOrderModal(id){
  currentPreviewFn = updateCustomOrderPreview;
  const o = state.customOrders.find(x=>x.id===id);
  if(!o) return;
  const filamentOpts = state.materials.filter(m=>m.category==='Filamento');
  const boxOpts = state.materials.filter(m=>m.category==='Embalagem' && (m.isBox||m.isEnvelope||m.isSaquinho));
  const machineOpts = state.settings.machines||[];
  editingFilaments = JSON.parse(JSON.stringify(o.filaments||[]));
  editingLaborActions = JSON.parse(JSON.stringify(o.laborActions||[]));
  editingToolsUsed = JSON.parse(JSON.stringify(o.toolsUsed||[]));
  editingPhotoData = o.photo || null;
  const completeness = orderCompleteness(o);
  const missingKeys = new Set(completeness.missingKeys);
  const reqBorder = (key) => missingKeys.has(key) ? 'border-color:var(--amber);' : '';
  showModal(`Pedido ${o.orderNumber||''} — ${esc(o.name||orderTypeLabel(o.orderType))}`, `
    <div class="tabbar">
      <button class="tabbtn active" id="coTabBtn_pedido" onclick="switchCustomOrderTab('pedido')">Pedido</button>
      <button class="tabbtn" id="coTabBtn_producao" onclick="switchCustomOrderTab('producao')">Produção</button>
      <button class="tabbtn" id="coTabBtn_custos" onclick="switchCustomOrderTab('custos')">Custos</button>
    </div>

    <div id="coPanel_pedido">
      <div style="height:6px;background:var(--line-soft);border-radius:3px;overflow:hidden;margin-bottom:6px;"><div style="height:100%;width:${completeness.pct}%;background:${completeness.pct>=100?'var(--green)':'var(--amber)'};"></div></div>
      <div class="field hint" style="margin-top:0;margin-bottom:14px;">${completeness.pct>=100 ? 'Pedido completo — pode mover pra "Aguardando sinal" ou "Na fila" na lista.' : `${completeness.filled} de ${completeness.total} campos preenchidos — falta: ${completeness.missing.join(', ')}`}</div>

      <div class="section-title" style="margin-top:0;">Cliente</div>
      <div class="row2">
        <div class="field"><label>Cliente</label>
          <select id="coCustomerId" onchange="toggleCoCustomerField(this.value)">
            <option value="">Avulso / digitar nome</option>
            ${state.customers.map(cu=>`<option value="${cu.id}" ${o.customerId===cu.id?'selected':''}>${esc(cu.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Contato</label><input id="coContact" value="${o.contact||''}" placeholder="(11) 99999-9999" style="${reqBorder('contact')}"></div>
      </div>
      <div class="field" id="coCustomerNameWrap" style="display:${o.customerId?'none':'block'};margin-top:-8px;"><label>Nome do cliente (se avulso)</label><input id="coCustomerName" value="${esc(o.customerName||'')}" style="${reqBorder('customerName')}"></div>
      <div class="field hint" style="margin-top:-8px;">${o.customerId?'Cliente cadastrado':'Cliente avulso — sem cadastro'}</div>

      <div class="section-title">Item</div>
      <div class="row3">
        <div class="field"><label>Tipo</label><select id="coOrderType">
          ${Object.entries(CUSTOM_ORDER_TYPES).map(([v,l])=>`<option value="${v}" ${(o.orderType||'outro')===v?'selected':''}>${l}</option>`).join('')}
        </select></div>
        <div class="field"><label>Quantidade</label><input type="number" id="coQty" value="${o.qty||1}" min="1" step="1" style="${reqBorder('qty')}"></div>
        <div class="field"><label>Produto do catálogo (opcional)</label><select id="coLinkedProductId">
          <option value="">Nenhum</option>
          ${state.products.map(p=>`<option value="${p.id}" ${o.linkedProductId===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}
        </select></div>
      </div>
      <div class="field"><label>Nome da peça</label><input id="pName" value="${esc(o.name||'')}" placeholder="Ex: Chaveiro Goku"></div>

      <div class="section-title">Personalização</div>
      <div style="background:var(--nozzle-dim);border-left:3px solid var(--nozzle);border-radius:8px;padding:14px 16px 2px;">
        <div class="field"><label>Texto que vai na peça</label><textarea id="coPieceText" rows="2" style="font-family:var(--font-mono);text-transform:uppercase;${reqBorder('pieceText')}">${o.pieceText||''}</textarea></div>
        <div class="row3">
          <div class="field"><label>Cor da base</label><input id="coBaseColor" value="${o.baseColor||''}" style="${reqBorder('baseColor')}"></div>
          <div class="field"><label>Cor do texto/detalhe</label><input id="coDetailColor" value="${o.detailColor||''}" style="${reqBorder('detailColor')}"></div>
          <div class="field"><label>Tamanho (mm)</label><input id="coSizeLabel" value="${o.sizeLabel||''}" placeholder="Ex: 80 x 60" style="${reqBorder('sizeLabel')}"></div>
        </div>
        <div class="field"><label>Acabamento</label><input id="coFinish" value="${o.finish||''}" placeholder="Ex: fosco, brilhoso"></div>
        <div class="field"><label class="field-checkbox"><input type="checkbox" id="coApproved" ${o.approved?'checked':''} style="width:auto;"> Texto confirmado por escrito com o cliente</label></div>
        <div class="row2">
          <div class="field"><label>Data da confirmação</label><input type="date" id="coApprovalDate" value="${o.approvalDate||''}"></div>
          <div class="field"><label>Confirmado por</label><input id="coApprovedBy" value="${o.approvedBy||''}"></div>
        </div>
      </div>

      <div class="section-title">Comercial</div>
      <div class="row2">
        <div class="field"><label>Margem de lucro desejada (%)</label><input type="number" min="0" id="pMargin" value="${(o.desiredMarginPct!=null ? o.desiredMarginPct : calcProduct(o).desiredMarginPct).toFixed(0)}" step="1" oninput="document.getElementById('pPrice').dataset.touched=''; refreshCurrentPreview()"></div>
        <div class="field"><label>Valor total combinado (R$)</label><input type="number" min="0" id="pPrice" value="${o.practicedPrice||''}" step="0.01" placeholder="deixe em branco = preço sugerido" oninput="this.dataset.touched='1'; refreshCurrentPreview()" style="${reqBorder('totalValue')}"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Sinal pago (R$)</label><input type="number" min="0" id="coDepositPaid" value="${o.depositPaid||''}" step="0.01" placeholder="0,00"></div>
        <div class="field"><label>Forma de pagamento</label><input id="coPaymentMethod" value="${o.paymentMethod||''}" placeholder="Ex: PIX, dinheiro"></div>
      </div>

      <div class="section-title">Entrega</div>
      <div class="row3">
        <div class="field"><label>Data prevista</label><input type="date" id="coDeliveryDate" value="${o.deliveryDate||''}" style="${reqBorder('deliveryDate')}"></div>
        <div class="field"><label>Forma de entrega</label><input id="coDeliveryMethod" value="${o.deliveryMethod||''}" placeholder="Ex: retirada, Correios"></div>
        <div class="field"><label>Endereço</label><input id="coDeliveryAddress" value="${o.deliveryAddress||''}"></div>
      </div>
    </div>

    <div id="coPanel_producao" style="display:none;">
      <div class="section-title" style="margin-top:0;">Arquivo e licença</div>
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

      <div class="section-title">Insumos</div>
      <div class="field" style="margin-bottom:6px;"><label>Filamentos usados nessa impressão</label></div>
      <div id="filamentRows"></div>
      <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addFilamentRow()">+ Adicionar filamento</button>
      <div class="row2">
        <div class="field"><label>Impressora usada</label><select id="pMachine" onchange="refreshCurrentPreview()">
          <option value="">Selecione...</option>
          ${machineOpts.map(m=>`<option value="${m.id}" ${o.machineId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}
        </select></div>
        <div class="field"><label>Tipo de caixa</label><select id="pBox" onchange="refreshCurrentPreview()">
          <option value="">Nenhuma</option>
          ${boxOpts.map(b=>`<option value="${esc(b.name)}" ${esc(o.boxType===b.name?'selected':'')}>${esc(b.name)}</option>`).join('')}
        </select></div>
      </div>
      <div class="row2">
        <div class="field"><label>Plástico bolha (m)</label><input type="number" min="0" id="pBubble" value="${o.bubbleWrapM||0}" step="0.1" oninput="refreshCurrentPreview()"></div>
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
        <div class="field"><label>Fita adesiva usada (m)</label><input type="number" min="0" id="pTape" value="${o.tapeM||0}" step="0.1" oninput="refreshCurrentPreview()"></div>
        <div class="field"><label>Margem de falha (%)</label><input type="number" min="0" id="pFail" value="${(o.failureMarginPct*100)||10}" step="1" oninput="refreshCurrentPreview()"></div>
      </div>
      <div class="field" style="margin-bottom:6px;"><label>Mão de obra (ações e minutos de cada uma)</label></div>
      <div id="laborActionRows"></div>
      <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addLaborActionRow()">+ Adicionar ação</button>
      ${laborActionOptionsHtml()}
      <div class="field" style="margin-bottom:6px;"><label>Ferramentas usadas (e quantos usos cada uma consome)</label></div>
      <div id="toolsUsedRows"></div>
      <button class="btn ghost sm" style="margin-bottom:14px;" onclick="addToolsUsedRow()">+ Adicionar ferramenta</button>

      <div class="section-title">Perfil de fatiamento</div>
      <div class="row2">
        <div class="field"><label>Bico (°C)</label><input type="number" min="0" id="coNozzleTempC" value="${o.nozzleTempC||''}" step="1"></div>
        <div class="field"><label>Temp. mesa (°C)</label><input type="number" min="0" id="coBedTempC" value="${o.bedTempC||''}" step="1"></div>
      </div>
      <div class="row3">
        <div class="field"><label>Altura de camada (mm)</label><input type="number" min="0" id="coLayerHeightMm" value="${o.layerHeightMm||''}" step="0.01"></div>
        <div class="field"><label>Diâmetro do bico (mm)</label><input type="number" min="0" id="coNozzleDiameterMm" value="${o.nozzleDiameterMm||0.4}" step="0.1"></div>
        <div class="field"><label>Paredes</label><input type="number" min="0" id="coWalls" value="${o.walls||''}" step="1"></div>
      </div>
      <div class="row3">
        <div class="field"><label>Preenchimento (%)</label><input type="number" min="0" id="coInfillPct" value="${o.infillPct||''}" step="1"></div>
        <div class="field"><label>Padrão</label><input id="coInfillPattern" value="${o.infillPattern||''}" placeholder="Ex: grid, gyroid"></div>
        <div class="field"><label>Velocidade (mm/s)</label><input type="number" min="0" id="coPrintSpeedMmS" value="${o.printSpeedMmS||''}" step="1"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Orientação na mesa</label><input id="coOrientation" value="${o.orientation||''}"></div>
        <div class="field"><label>Suportes</label><select id="coSupports">
          <option value="nao" ${o.supports!=='sim'?'selected':''}>Não</option>
          <option value="sim" ${o.supports==='sim'?'selected':''}>Sim</option>
        </select></div>
      </div>
      <div class="field"><label>Brim / raft</label><input id="coBrimRaft" value="${o.brimRaft||''}"></div>
      <div style="background:var(--panel-2);border-radius:8px;padding:10px 14px;">
        <div class="field hint" style="margin-top:0;margin-bottom:8px;">Pausa para troca de cor</div>
        <div class="row2">
          <div class="field"><label>Camada nº</label><input id="coColorChangeLayer" value="${o.colorChangeLayer||''}"></div>
          <div class="field"><label>Altura (mm)</label><input id="coColorChangeHeightMm" value="${o.colorChangeHeightMm||''}"></div>
        </div>
      </div>

      <div class="section-title">Estimado × real</div>
      <div class="row3">
        <div class="field"><label>Peso real (g)</label><input type="number" min="0" id="coRealWeightG" value="${o.realWeightG||''}" step="0.1"></div>
        <div class="field"><label>Tempo real (h)</label><input type="number" min="0" id="coRealTimeH" value="${o.realTimeH||''}" step="0.1"></div>
        <div class="field"><label>Custo real (R$)</label><input type="number" min="0" id="coRealCost" value="${o.realCost||''}" step="0.01"></div>
      </div>
      <div class="field"><label>Observação</label><input id="coRealObservation" value="${o.realObservation||''}"></div>

      <div class="section-title">Resultado</div>
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

      <div class="section-title">Conferência antes de embalar</div>
      <div class="row3">
        <label class="field-checkbox sm"><input type="checkbox" id="coCheckTextConferred" ${o.checkTextConferred?'checked':''} style="width:auto;"> Texto conferido</label>
        <label class="field-checkbox sm"><input type="checkbox" id="coCheckNoLayerFailure" ${o.checkNoLayerFailure?'checked':''} style="width:auto;"> Sem falha de camada</label>
        <label class="field-checkbox sm"><input type="checkbox" id="coCheckBurrRemoved" ${o.checkBurrRemoved?'checked':''} style="width:auto;"> Rebarba removida</label>
      </div>
      <div class="row3" style="margin-top:8px;">
        <label class="field-checkbox sm"><input type="checkbox" id="coCheckHoleFree" ${o.checkHoleFree?'checked':''} style="width:auto;"> Furo/argola livre</label>
        <label class="field-checkbox sm"><input type="checkbox" id="coCheckPieceClean" ${o.checkPieceClean?'checked':''} style="width:auto;"> Peça limpa</label>
        <label class="field-checkbox sm"><input type="checkbox" id="coCheckPackaged" ${o.checkPackaged?'checked':''} style="width:auto;"> Embalada</label>
      </div>
    </div>

    <div id="coPanel_custos" style="display:none;">
      <div class="helper-block" id="customOrderPreview"></div>
    </div>

    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmCustomOrder('${id}')">Salvar alterações</button>
    </div>
  `);
  renderFilamentRows();
  renderLaborActionRows();
  renderToolsUsedRows();
  renderPhotoPreview();
  updateCustomOrderPreview();
}
function readCustomOrderForm(){
  const customerId = document.getElementById('coCustomerId').value;
  return {
    name: document.getElementById('pName').value.trim(),
    filaments: editingFilaments,
    boxType: document.getElementById('pBox').value,
    machineId: document.getElementById('pMachine').value,
    timeH: (numField('pTimeH')) + (numField('pTimeMin'))/60,
    bubbleWrapM: numField('pBubble'),
    tapeM: numField('pTape'),
    failureMarginPct: (numField('pFail'))/100,
    laborActions: editingLaborActions,
    toolsUsed: editingToolsUsed,
    desiredMarginPct: numField('pMargin'),
    modelOrigin: document.getElementById('pModelOrigin').value,
    modelLicense: document.getElementById('pModelLicense').value.trim(),
    modelSourceUrl: document.getElementById('pModelSourceUrl').value.trim(),
    modelFileName: document.getElementById('coModelFileName').value.trim(),
    customerId,
    customerName: document.getElementById('coCustomerName').value.trim(),
    contact: document.getElementById('coContact').value.trim(),
    orderType: document.getElementById('coOrderType').value,
    linkedProductId: document.getElementById('coLinkedProductId').value,
    qty: numField('coQty', 1),
    sizeLabel: document.getElementById('coSizeLabel').value.trim(),
    pieceText: document.getElementById('coPieceText').value,
    baseColor: document.getElementById('coBaseColor').value.trim(),
    detailColor: document.getElementById('coDetailColor').value.trim(),
    finish: document.getElementById('coFinish').value.trim(),
    deliveryDate: document.getElementById('coDeliveryDate').value,
    deliveryMethod: document.getElementById('coDeliveryMethod').value.trim(),
    deliveryAddress: document.getElementById('coDeliveryAddress').value.trim(),
    depositPaid: numField('coDepositPaid'),
    paymentMethod: document.getElementById('coPaymentMethod').value.trim(),
    approved: document.getElementById('coApproved').checked,
    approvalDate: document.getElementById('coApprovalDate').value,
    approvedBy: document.getElementById('coApprovedBy').value.trim(),
    printDate: document.getElementById('coPrintDate').value,
    nozzleTempC: numField('coNozzleTempC'),
    bedTempC: numField('coBedTempC'),
    layerHeightMm: numField('coLayerHeightMm'),
    nozzleDiameterMm: numField('coNozzleDiameterMm'),
    walls: numField('coWalls'),
    infillPct: numField('coInfillPct'),
    infillPattern: document.getElementById('coInfillPattern').value.trim(),
    printSpeedMmS: numField('coPrintSpeedMmS'),
    orientation: document.getElementById('coOrientation').value.trim(),
    supports: document.getElementById('coSupports').value,
    brimRaft: document.getElementById('coBrimRaft').value.trim(),
    colorChangeLayer: document.getElementById('coColorChangeLayer').value.trim(),
    colorChangeHeightMm: document.getElementById('coColorChangeHeightMm').value.trim(),
    realWeightG: numField('coRealWeightG'),
    realTimeH: numField('coRealTimeH'),
    realCost: numField('coRealCost'),
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
  const profitPerHour = form.timeH>0 ? (c.practicedPrice - c.totalCost)/form.timeH : null;
  document.getElementById('customOrderPreview').innerHTML = `
    <div class="calc-line"><span>Peso total</span><span>${num(totalWeight(form),0)}g</span></div>
    <div class="calc-line"><span>Custo material</span><span>${brl(c.materialCost)}</span></div>
    <div class="calc-line"><span>Custo energia</span><span>${brl(c.energyCost)}</span></div>
    <div class="calc-line"><span>Embalagem (${packagingLabelFor(form)})</span><span>${brl(c.embalagemCost)}</span></div>
    <div class="calc-line"><span>Depreciação (${esc(c.machine?c.machine.name:'sem impressora')})</span><span>${brl(c.depreciation)}</span></div>
    <div class="calc-line"><span>Manutenção</span><span>${brl(c.maintenance)}</span></div>
    <div class="calc-line"><span>Mão de obra</span><span>${brl(c.laborCost)}</span></div>
    ${c.toolsCost>0 ? `<div class="calc-line"><span>Ferramentas</span><span>${brl(c.toolsCost)}</span></div>` : ''}
    <div class="calc-line"><span>Custo de falha</span><span>${brl(c.failureCost)}</span></div>
    <div class="calc-line total"><span>Custo total</span><span>${brl(c.totalCost)}</span></div>
    <div class="calc-line total"><span>Preço sugerido (margem de ${num(form.desiredMarginPct,0)}%)</span><span>${brl(c.suggestedPrice)}</span></div>
    <div class="calc-line total"><span>Margem no valor combinado</span><span style="color:${c.marginValue<0?'var(--red)':'var(--green)'}">${pct(c.marginPct)}</span></div>
    <div class="calc-line"><span>R$ por hora-máquina (lucro ÷ tempo)</span><span style="color:${profitPerHour!=null && profitPerHour<0?'var(--red)':'var(--text)'}">${profitPerHour!=null?brl(profitPerHour)+'/h':'—'}</span></div>
  `;
  const priceInput = document.getElementById('pPrice');
  if(priceInput && !priceInput.dataset.touched && document.activeElement!==priceInput){
    priceInput.placeholder = 'sugerido: '+c.suggestedPrice.toFixed(2);
  }
}
function confirmCustomOrder(id){
  const o = state.customOrders.find(x=>x.id===id);
  if(!o) return;
  const form = readCustomOrderForm();
  if(!form.name){ toast('Informe o nome da peça','err'); return; }
  const priceRaw = document.getElementById('pPrice').value;
  const c = calcProduct(form);
  const practicedPrice = priceRaw ? parseFloat(priceRaw) : c.suggestedPrice;
  if(practicedPrice<0){ toast('Valor não pode ser negativo','err'); return; }
  const wasIncomplete = o.status==='Incompleto';
  Object.assign(o, form, { practicedPrice, photo: editingPhotoData });
  saveCustomOrders();
  // Sugere, nunca muda sozinho — quem decide que já pode entrar na fila é o usuário.
  if(wasIncomplete && orderCompleteness(o).pct>=100){
    toast('Encomenda atualizada — pedido completo! Pode mudar o status pra "Aguardando sinal" na lista.');
  } else {
    toast('Encomenda atualizada');
  }
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
  const filSummary = (o.filaments||[]).map(f=>`${esc(f.materialName)} ${num(f.weightG,0)}g`).join(' + ');
  const filFirst = (o.filaments||[])[0];
  const pageHeader = (title, tag) => `
    <div style="display:flex;align-items:center;justify-content:space-between;background:#1A1D23;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="${bizLogoSrc()}" alt="${esc(bizName())}" style="width:40px;height:40px;object-fit:cover;border-radius:8px;">
        <div>
          <div style="font-family:var(--font-display);font-weight:700;font-size:17px;">${title}</div>
          <div style="font-size:11px;color:#B9BEC9;">${tag==='cliente'?'Confira os dados abaixo antes de autorizarmos a impressão':'Uso interno — bancada, fatiador e registro de resultado'}</div>
        </div>
      </div>
      <div style="font-size:10px;color:#B9BEC9;text-align:right;">${tag==='cliente'?'PARA O CLIENTE · 1/2':'USO INTERNO · 2/2'}</div>
    </div>
    <div style="height:4px;background:#BD4119;"></div>
  `;
  // Mesma regra do platformBadge: devolve HTML, logo escapa por dentro —
  // `value` vem do pedido do cliente (nome da peça, texto personalizado).
  const field = (label, value) => `<div style="flex:1;min-width:0;"><div style="font-size:9.5px;font-weight:700;color:#8A8F9C;letter-spacing:.03em;margin-bottom:3px;">${esc(label)}</div><div style="font-size:12.5px;color:#1A1D23;min-height:16px;">${esc(value||'—')}</div></div>`;
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
  if(state.materials.length===0) return `<div class="card">${emptyState(
    'Nenhuma matéria-prima cadastrada.<br><span style="font-size:12.5px;">Filamento, embalagem, ferramenta e componente — com o preço que você realmente pagou. É a base de todo cálculo de custo.</span>',
    '+ Nova matéria-prima', `openMaterialModal()`)}</div>`;
  const suggestions = state.materials.map(m=>({m, s:restockSuggestion(m)})).filter(x=>x.s).sort((a,b)=>b.s.cost-a.s.cost);
  const suggestionPanel = suggestions.length ? `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-title">Sugestão de reposição<span class="sub">estimativa com base no consumo dos últimos 60 dias</span></div>
      <div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Material</th><th class="right">Consumo médio/mês</th><th class="right">Estoque atual</th><th class="right">Comprar aprox.</th><th class="right">Custo estimado</th></tr></thead>
        <tbody>${suggestions.map(({m,s})=>`<tr>
          <td data-label="Material">${esc(m.name)}</td>
          <td class="right num" data-label="Consumo médio/mês">${num(s.monthly,m.unit==='un'?0:1)} ${esc(m.unit)}</td>
          <td class="right num" data-label="Estoque atual">${num(m.stock,m.unit==='un'?0:1)} ${esc(m.unit)}</td>
          <td class="right num" data-label="Comprar aprox." style="color:var(--amber)">${num(s.suggested,m.unit==='un'?0:1)} ${esc(m.unit)}</td>
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
  if(q && filtered.length===0) return searchBar + `<div class="card">${emptyState(`Nenhum material encontrado para “${esc(materialsFilter.search)}”.`, 'Limpar busca', `materialsFilter.search=''; renderContent();`)}</div>`;
  const cats = [...new Set(filtered.map(m=>m.category))];
  return searchBar + suggestionPanel + cats.map(cat=>`
    <div class="section-title">${esc(cat)}</div>
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
          ${m.category==='Filamento' && m.colorName ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${esc(m.color||'#ccc')};border:1px solid var(--line);flex:none;"></span>` : ''}
          ${m.category==='Filamento' && m.isDualColor && m.colorName2 ? `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${esc(m.color2||'#ccc')};border:1px solid var(--line);flex:none;margin-left:-8px;"></span>` : ''}
          ${esc(m.name)}
        </div>
        <div style="color:var(--text-faint);font-size:11.5px;margin-top:2px;">${brl(m.costPerUnit)}/${esc(m.unit)}${m.category==='Filamento' && m.brand ? ` · ${esc(m.brand)}` : ''}${m.category==='Ferramentas' && m.toolType ? ` · ${esc(m.toolType)}` : ''}</div>
        ${!(m.costPerUnit>0) ? `<div style="font-size:11px;color:var(--amber);margin-top:3px;" title="Todo produto que usa esse material está com o custo subestimado até você informar quanto pagou">⚠️ Sem preço cadastrado</div>` : ''}
      </div>
      ${stockBadge(m)}
    </div>
    <div style="margin:12px 0 6px;font-family:var(--font-mono);font-size:20px;font-weight:600;">${num(m.stock,m.unit==='un'?0:1)} <span style="font-size:12px;color:var(--text-faint);font-weight:400;">${esc(m.unit)}</span></div>
    <div class="progress"><div style="width:${p}%;background:${color};"></div></div>
    <div style="font-size:11px;color:var(--text-faint);margin-top:5px;">Mínimo: ${num(m.lowStock,0)} ${esc(m.unit)}</div>
    ${m.isBox && m.lengthCm>0 && m.widthCm>0 && m.heightCm>0 ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Medidas internas: ${num(m.lengthCm,1)}×${num(m.widthCm,1)}×${num(m.heightCm,1)} cm</div>` : ''}
    ${(m.isEnvelope||m.isSaquinho) && m.lengthCm>0 && m.widthCm>0 ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Medidas internas: ${num(m.lengthCm,1)}×${num(m.widthCm,1)} cm (até ${FLAT_PACKAGING_MAX_HEIGHT_CM}cm de altura)</div>` : ''}
    ${(m.isBubbleWrap||m.isTape) && m.widthCm>0 ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Largura do rolo: ${num(m.widthCm,1)} cm</div>` : ''}
    ${m.category==='Ferramentas' && m.usefulLifeUses>0 ? `<div style="font-size:11px;color:var(--text-faint);margin-top:2px;">Vida útil estimada: ${num(m.usefulLifeUses,0)} usos</div>` : ''}
    ${sugg ? `<div style="font-size:11px;color:var(--amber);margin-top:4px;">Sugestão: comprar ~${num(sugg.suggested,m.unit==='un'?0:1)} ${esc(m.unit)}</div>` : ''}
    <div style="margin-top:12px;display:flex;gap:8px;">
      <button class="btn sm" style="flex:1" onclick="openRestockModal('${m.id}')">Reabastecer</button>
      <button class="btn ghost sm" onclick="openMaterialModal('${m.id}')">Editar</button>
      <button class="btn ghost sm" onclick="deleteMaterial('${m.id}')">Excluir</button>
    </div>
  </div>`;
}
// Média de VENDAS (kits) por mês com base no histórico real — "vendas
// disponíveis" só é útil pra decidir se precisa produzir quando comparado
// com quanto realmente sai por mês, não com um limiar fixo de peças. Uma
// peça de 1g com estoque de 40 parece muito, mas se cada venda leva 10
// peças (kit) e vende 2x/mês, são só 4 vendas — pouco mais de 2 meses.
function avgMonthlySalesKits(productId){
  const sales = state.sales.filter(s=>s.productId===productId);
  if(!sales.length) return null;
  const months = new Set(sales.map(s=>s.date.slice(0,7)));
  const totalKits = sales.reduce((a,s)=>a+(s.qty||0),0);
  return totalKits / Math.max(1, months.size);
}
function renderFinishedStock(){
  if(state.products.length===0) return `<div class="card">${emptyState(
    'Nenhum produto cadastrado.<br><span style="font-size:12.5px;">Esta aba conta peças prontas na prateleira — as levas registradas na Fila de Impressão entram aqui.</span>',
    '+ Novo produto', `openProductModal()`)}</div>`;
  const rows = state.products.map(p=>{
    const c = calcProduct(p);
    // totalCost é da VENDA (unitsPerSale peças) — estoque conta PEÇAS, então
    // divide por saleUnits pra ter o custo de uma peça só.
    const unitCost = c.totalCost/c.saleUnits;
    const vendasDisp = Math.floor(p.stock/c.saleUnits);
    const avgMonthly = avgMonthlySalesKits(p.id);
    let status;
    if(p.stock<=0) status = `<span class="badge bad">Sem estoque</span>`;
    else if(avgMonthly!=null) status = vendasDisp<avgMonthly ? `<span class="badge warn" title="Média de ${num(avgMonthly,1)} venda(s)/mês">Baixo p/ demanda</span>` : `<span class="badge ok">Ok</span>`;
    else status = vendasDisp<=3 ? `<span class="badge warn">Baixo</span>` : `<span class="badge ok">Ok</span>`;
    return `<tr>
      <td data-label="Produto">${esc(p.name)}</td>
      <td class="right num" data-label="Estoque">${num(p.stock,0)} peças${c.saleUnits>1?`<div style="font-size:10px;font-weight:400;color:var(--text-faint);white-space:nowrap;">${vendasDisp} venda${vendasDisp!==1?'s':''} disponíve${vendasDisp!==1?'is':'l'}${avgMonthly!=null?` (média ${num(avgMonthly,1)}/mês)`:''}</div>`:''}</td>
      <td class="right num" data-label="Custo unitário">${brl(unitCost)}</td>
      <td class="right num" data-label="Valor em estoque">${brl(p.stock*unitCost)}</td>
      <td class="right" data-label="Status">${status}</td>
      <td class="right"><button class="btn ghost sm" onclick="openPrintJobModal('${p.id}')">Produzir</button></td>
    </tr>`;
  }).join('');
  const totalValue = state.products.reduce((a,p)=>{ const c=calcProduct(p); return a+p.stock*(c.totalCost/c.saleUnits); },0);
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
  let msg = `Excluir "${esc(m.name)}" do estoque?`;
  if(m.isBubbleWrap){
    msg += ` Atenção: esse é o material marcado como plástico bolha — depois de excluir, nenhum produto vai ter custo de plástico bolha calculado até você marcar outro material com esse papel.`;
  }
  if(m.isTape){
    msg += ` Atenção: essa é a fita adesiva cadastrada — depois de excluir, nenhum produto vai ter custo de fita calculado até você marcar outro material com esse papel.`;
  }
  if(usedBy.length){
    msg += ` ${usedBy.length} produto(s) usam esse material no cálculo de custo (${esc(usedBy.map(p=>p.name).slice(0,3).join(', '))}${usedBy.length>3?'...':''}) — o custo deles vai ficar incorreto até você ajustar.`;
  }
  if(!confirm(msg)) return;
  state.materials = state.materials.filter(x=>x.id!==id);
  saveMaterials();
  toast('Matéria-prima excluída');
  renderContent();
}
function openMaterialModal(id){
  const editing = !!id;
  const m = editing ? state.materials.find(x=>x.id===id) : { name:'', category:'Filamento', unit:'g', costPerUnit:0, stock:0, lowStock:0, purchasePrice:0, purchaseQty:1, purchaseUnit:'g', isBox:false, isEnvelope:false, isSaquinho:false, isBubbleWrap:false, isTape:false, materialType:'', brand:'', color:'#cccccc', colorName:'', isDualColor:false, color2:'#cccccc', colorName2:'', toolType:'', usefulLifeUses:0 };
  const packagingType = m.isBox ? 'caixa' : m.isEnvelope ? 'envelope' : m.isSaquinho ? 'saquinho' : m.isBubbleWrap ? 'bolha' : m.isTape ? 'fita' : '';
  const hideName = m.category==='Filamento' || (m.category==='Embalagem' && packagingType==='caixa');
  showModal(editing?'Editar matéria-prima':'Nova matéria-prima', `
    <div class="field" id="mNameField" style="display:${hideName?'none':'block'};"><label>Nome</label><input id="mName" value="${esc(m.name)}" placeholder="Ex: Envelope 15x25, Parafuso 3,5x40..."></div>
    <div class="row2">
      <div class="field"><label>Categoria</label><select id="mCat" onchange="onMaterialCategoryChange()">
        ${['Filamento','Embalagem','Ferramentas','Componentes','Outros'].map(c=>`<option ${esc(m.category===c?'selected':'')}>${esc(c)}</option>`).join('')}
      </select></div>
      <div class="field"><label>Unidade de estoque</label><select id="mUnit">
        ${['g','kg','un','m'].map(u=>`<option ${esc(m.unit===u?'selected':'')}>${esc(u)}</option>`).join('')}
      </select></div>
    </div>

    <div id="mFilamentBlock" style="display:${esc(m.category==='Filamento'?'block':'none')};margin-bottom:12px;">
      <div class="row2">
        <div class="field"><label>Material</label>
          <select id="mMaterialType" onchange="toggleNewMaterialTypeInput(this.value); updateFilamentNamePreview();">
            <option value="">Selecione...</option>
            ${materialTypeSuggestions().map(t=>`<option value="${esc(t)}" ${esc(m.materialType===t?'selected':'')}>${esc(t)}</option>`).join('')}
            <option value="__new__" ${esc(m.materialType && !materialTypeSuggestions().includes(m.materialType)?'selected':'')}>+ Novo material...</option>
          </select>
          <input id="mMaterialTypeNew" placeholder="Nome do novo material" style="margin-top:6px;display:${esc(m.materialType && !materialTypeSuggestions().includes(m.materialType)?'block':'none')};" value="${esc(m.materialType && !materialTypeSuggestions().includes(m.materialType)?m.materialType:'')}" oninput="updateFilamentNamePreview()">
        </div>
        <div class="field"><label>Marca (opcional)</label>
          <select id="mBrand" onchange="toggleNewBrandInput(this.value)">
            <option value="">Sem marca</option>
            ${brandSuggestions().map(b=>`<option value="${esc(b)}" ${esc(m.brand===b?'selected':'')}>${esc(b)}</option>`).join('')}
            <option value="__new__" ${esc(m.brand && !brandSuggestions().includes(m.brand)?'selected':'')}>+ Nova marca...</option>
          </select>
          <input id="mBrandNew" placeholder="Nome da nova marca" style="margin-top:6px;display:${esc(m.brand && !brandSuggestions().includes(m.brand)?'block':'none')};" value="${esc(m.brand && !brandSuggestions().includes(m.brand)?m.brand:'')}">
        </div>
      </div>
      <div class="row2">
        <div class="field"><label>Cor</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="color" id="mColor" value="${m.color||'#cccccc'}" style="width:44px;padding:2px;height:36px;flex:none;" oninput="updateFilamentNamePreview()">
            <input id="mColorName" placeholder="Nome da cor (ex: Vermelho)" value="${esc(m.colorName||'')}" oninput="updateFilamentNamePreview()">
          </div>
        </div>
        <div class="field"><label class="field-checkbox"><input type="checkbox" id="mIsDualColor" ${m.isDualColor?'checked':''} onchange="document.getElementById('mColor2Block').style.display=this.checked?'flex':'none'; updateFilamentNamePreview();"> É bicolor</label></div>
      </div>
      <div id="mColor2Block" style="display:${m.isDualColor?'flex':'none'};gap:8px;align-items:center;margin-bottom:12px;">
        <input type="color" id="mColor2" value="${m.color2||'#cccccc'}" style="width:44px;padding:2px;height:36px;flex:none;" oninput="updateFilamentNamePreview()">
        <input id="mColorName2" placeholder="Nome da 2ª cor" value="${esc(m.colorName2||'')}" oninput="updateFilamentNamePreview()" style="flex:1;">
      </div>
      <div class="field"><label>Nome do material (calculado)</label><input id="mFilamentNamePreview" value="${esc(m.name||'')}" disabled></div>
    </div>

    <div id="mRoleBlock" style="display:${esc(m.category==='Embalagem'?'block':'none')};margin-bottom:12px;">
      <div class="field"><label>Tipo de embalagem</label><select id="mPackagingType" onchange="onPackagingTypeChange()">
        <option value="">Selecione...</option>
        <option value="caixa" ${packagingType==='caixa'?'selected':''}>Caixa</option>
        <option value="envelope" ${packagingType==='envelope'?'selected':''}>Envelope de segurança</option>
        <option value="saquinho" ${packagingType==='saquinho'?'selected':''}>Saquinho</option>
        <option value="bolha" ${packagingType==='bolha'?'selected':''}>Plástico Bolha</option>
        <option value="fita" ${packagingType==='fita'?'selected':''}>Fita Adesiva</option>
      </select></div>
      <div id="mBoxDimsBlock" style="display:${packagingType==='caixa'?'block':'none'};margin:0 0 10px;">
        <div class="field"><label>Tamanho</label><select id="mBoxSize">
          <option value="">Selecione...</option>
          ${['Pequena','Média','Grande'].map(s=>`<option value="${esc(s)}" ${esc(m.name===('Caixa '+s)?'selected':'')}>${esc(s)}</option>`).join('')}
        </select></div>
        <div class="row3">
          <div class="field"><label>Comprimento interno (cm)</label><input type="number" min="0" id="mLengthCm" value="${m.lengthCm||''}" step="0.1" placeholder="opcional"></div>
          <div class="field"><label>Largura interna (cm)</label><input type="number" min="0" id="mWidthCm" value="${m.widthCm||''}" step="0.1" placeholder="opcional"></div>
          <div class="field"><label>Altura interna (cm)</label><input type="number" min="0" id="mHeightCm" value="${m.heightCm||''}" step="0.1" placeholder="opcional"></div>
        </div>
      </div>
      <div id="mFlatDimsBlock" style="display:${(packagingType==='envelope'||packagingType==='saquinho')?'block':'none'};margin:0 0 10px;">
        <div class="row2">
          <div class="field"><label>Comprimento interno (cm)</label><input type="number" min="0" id="mFlatLengthCm" value="${m.lengthCm||''}" step="0.1" placeholder="opcional"></div>
          <div class="field"><label>Largura interna (cm)</label><input type="number" min="0" id="mFlatWidthCm" value="${m.widthCm||''}" step="0.1" placeholder="opcional"></div>
        </div>
        <div class="field hint" style="margin-top:-8px;">Sem altura própria — embalagem achatada e flexível. A seleção automática só oferece essa opção pra peças de até ${FLAT_PACKAGING_MAX_HEIGHT_CM}cm de altura.</div>
      </div>
      <div id="mRollWidthBlock" style="display:${(packagingType==='bolha'||packagingType==='fita')?'block':'none'};margin:0 0 10px;">
        <div class="field"><label>Largura do rolo (cm)</label><input type="number" min="0" id="mRollWidthCm" value="${m.widthCm||''}" step="0.1" placeholder="opcional"></div>
      </div>
    </div>

    <div id="mToolBlock" style="display:${esc(m.category==='Ferramentas'?'block':'none')};margin-bottom:12px;">
      <div class="row2">
        <div class="field"><label>Tipo de ferramenta</label>
          <select id="mToolType" onchange="toggleNewToolTypeInput(this.value)">
            <option value="">Selecione...</option>
            ${toolTypeSuggestions().map(t=>`<option value="${esc(t)}" ${esc(m.toolType===t?'selected':'')}>${esc(t)}</option>`).join('')}
            <option value="__new__" ${esc(m.toolType && !toolTypeSuggestions().includes(m.toolType)?'selected':'')}>+ Novo tipo...</option>
          </select>
          <input id="mToolTypeNew" placeholder="Nome do novo tipo" style="margin-top:6px;display:${esc(m.toolType && !toolTypeSuggestions().includes(m.toolType)?'block':'none')};" value="${esc(m.toolType && !toolTypeSuggestions().includes(m.toolType)?m.toolType:'')}">
        </div>
        <div class="field"><label>Vida útil estimada (usos)</label><input type="number" min="0" id="mUsefulLifeUses" value="${m.usefulLifeUses||''}" step="1" placeholder="Ex: 50"></div>
      </div>
    </div>

    <div class="row2">
      <div class="field"><label>Preço de compra (R$)</label><input type="number" min="0" id="mPPrice" value="${m.purchasePrice}" step="0.01" oninput="updateMaterialUnitCost()"></div>
      <div class="field"><label>Quantidade da compra</label><input type="number" min="0" id="mPQty" value="${m.purchaseQty}" step="0.01" oninput="updateMaterialUnitCost()"></div>
    </div>
    <div class="field"><label>Custo unitário calculado</label><input id="mUnitCost" value="${brl(m.costPerUnit)}" disabled></div>
    <div class="row2">
      <div class="field"><label>Estoque atual</label><input type="number" id="mStock" value="${esc(qtyInputValue(m.stock, m.unit))}" step="${esc(stepForUnit(m.unit))}" min="0"></div>
      <div class="field"><label>Estoque mínimo (alerta)</label><input type="number" id="mLow" value="${esc(qtyInputValue(m.lowStock, m.unit))}" step="${esc(stepForUnit(m.unit))}" min="0"></div>
    </div>
    ${!editing ? `<label class="field-checkbox" style="margin:-6px 0 12px;"><input type="checkbox" id="mAddInvestment" style="width:auto;" checked> Registrar essa compra como investimento em Anual</label>` : ''}
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
  document.getElementById('mFlatDimsBlock').style.display = (val==='envelope'||val==='saquinho') ? 'block' : 'none';
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
  const price = numField('mPPrice');
  const qty = numField('mPQty', 1);
  document.getElementById('mUnitCost').value = brl(price/qty);
}
function confirmMaterial(id){
  const category = document.getElementById('mCat').value;
  let name;
  let materialType='', brand='', color='', colorName='', isDualColor=false, color2='', colorName2='';
  let isBox=false, isEnvelope=false, isSaquinho=false, isBubbleWrap=false, isTape=false, lengthCm=0, widthCm=0, heightCm=0;
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
    isBox = pkg==='caixa'; isEnvelope = pkg==='envelope'; isSaquinho = pkg==='saquinho'; isBubbleWrap = pkg==='bolha'; isTape = pkg==='fita';
    if(isBox){
      const size = document.getElementById('mBoxSize').value;
      if(!size){ toast('Escolha o tamanho da caixa','err'); return; }
      name = `Caixa ${size}`;
      lengthCm = numField('mLengthCm');
      widthCm = numField('mWidthCm');
      heightCm = numField('mHeightCm');
    } else {
      name = document.getElementById('mName').value.trim();
      if(!name){ toast('Informe o nome','err'); return; }
      if(isEnvelope || isSaquinho){
        lengthCm = numField('mFlatLengthCm');
        widthCm = numField('mFlatWidthCm');
      }
      if(isBubbleWrap || isTape){
        widthCm = numField('mRollWidthCm');
      }
    }
  } else {
    name = document.getElementById('mName').value.trim();
    if(!name){ toast('Informe o nome','err'); return; }
    if(category==='Ferramentas'){
      const ttSel = document.getElementById('mToolType').value;
      toolType = ttSel==='__new__' ? document.getElementById('mToolTypeNew').value.trim() : ttSel;
      usefulLifeUses = numField('mUsefulLifeUses');
    }
  }
  const dup = state.materials.find(x=>x.id!==id && x.name.trim().toLowerCase()===name.toLowerCase());
  if(dup){ toast(`Já existe uma matéria-prima chamada "${esc(dup.name)}" — use outro nome`,'err'); return; }
  const purchasePrice = numField('mPPrice');
  const purchaseQty = numField('mPQty', 1);
  // Arredonda conforme a unidade: 'un' é contável, não guarda 24,01 caixas.
  const unidade = document.getElementById('mUnit').value;
  const stock = roundQty(numField('mStock'), unidade);
  const lowStock = roundQty(numField('mLow'), unidade);
  if(purchasePrice<0 || purchaseQty<0 || stock<0 || lowStock<0){ toast('Valores de preço/quantidade/estoque não podem ser negativos','err'); return; }
  const data = {
    name, category, unit: unidade,
    purchasePrice, purchaseQty, costPerUnit: purchasePrice/purchaseQty,
    stock, lowStock,
    isBox, isEnvelope, isSaquinho, isBubbleWrap, isTape, lengthCm, widthCm, heightCm,
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
  let investMsg = '';
  if(id){
    const existing = state.materials.find(x=>x.id===id);
    if(existing.name !== name) renamedFrom = existing.name;
    oldCostPerUnit = existing.costPerUnit;
    Object.assign(existing, data);
  } else {
    state.materials.push({ id:uid(), ...data });
    // Material novo com preço de compra é uma compra de verdade — se não virar
    // investimento também, some do Caixa/Anual (mesmo motivo do Reabastecer).
    const investCk = document.getElementById('mAddInvestment');
    if(purchasePrice>0 && investCk && investCk.checked){
      if(!state.settings.investments) state.settings.investments = [];
      state.settings.investments.push({ id:uid(), name:`Compra inicial: ${name}`, value:purchasePrice, date: todayStr(), paymentType:'avista', category });
      saveSettings();
      investMsg = ' — registrado como investimento em Anual';
    }
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
      marginMsg = ` — atenção: ${affected.length} produto(s) ficaram com margem abaixo do desejado (${esc(affected.slice(0,3).map(p=>p.name).join(', '))})`;
    }
  }
  toast((id?'Matéria-prima atualizada':'Matéria-prima criada') + investMsg + marginMsg, marginMsg?'err':'');
  closeModal(); renderContent();
}
function openRestockModal(id){
  const m = state.materials.find(x=>x.id===id);
  showModal(`Reabastecer: ${esc(m.name)}`, `
    <div class="field"><label>Estoque atual</label><input value="${num(m.stock,1)} ${esc(m.unit)}" disabled></div>
    <div class="field"><label>Quantidade a adicionar (${esc(m.unit)})</label><input type="number" id="rQty" step="${esc(stepForUnit(m.unit))}" min="0" placeholder="Ex: ${m.purchaseQty}"></div>
    <div class="field"><label>Custo total da compra (opcional — recalcula custo unitário)</label><input type="number" min="0" id="rCost" step="0.01" placeholder="Ex: ${m.purchasePrice}"></div>
    <label class="field-checkbox" style="margin:-6px 0 12px;"><input type="checkbox" id="rAddInvestment" style="width:auto;" checked> Também registrar como investimento em Anual (se informar o custo acima)</label>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmRestock('${id}')">Adicionar ao estoque</button>
    </div>
  `);
}
function confirmRestock(id){
  const m = state.materials.find(x=>x.id===id);
  const qty = numField('rQty');
  const cost = parseFloat(document.getElementById('rCost').value);
  if(qty<=0){ toast('Informe uma quantidade válida','err'); return; }
  let investMsg = '';
  if(cost && cost>0){
    /* média ponderada: mistura o valor do estoque já existente com o da compra nova,
       em vez de simplesmente substituir pelo preço do último lote. */
    const existingValue = m.stock * m.costPerUnit;
    const newTotalStock = m.stock + qty;
    m.costPerUnit = newTotalStock>0 ? (existingValue + cost) / newTotalStock : cost/qty;
    m.purchasePrice = cost; m.purchaseQty = qty;
    // Reabastecer é uma compra de verdade acontecendo agora — se não virar
    // investimento também, some do Caixa/Anual (motivo real do pedido).
    if(document.getElementById('rAddInvestment').checked){
      if(!state.settings.investments) state.settings.investments = [];
      state.settings.investments.push({ id:uid(), name:`Reabastecimento: ${esc(m.name)}`, value:cost, date: todayStr(), paymentType:'avista', category: m.category });
      saveSettings();
      investMsg = ' — registrado como investimento em Anual';
    }
  }
  m.stock = roundQty(m.stock + qty, m.unit);
  saveMaterials(); toast('Estoque atualizado'+investMsg); closeModal(); renderContent();
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
          ${caixaRow('(−) Anúncios / tráfego pago', -a.anuncios)}
          ${caixaRow('(=) Lucro Bruto', a.lucroBruto, true)}
          ${caixaRow('(−) Imposto MEI (DAS)', -a.mei)}
          ${caixaRow('(=) LUCRO OPERACIONAL', a.lucroOperacional, true)}
        </tbody>
      </table></div>
    </div>

    <div class="grid g-2" style="margin-top:14px;">
      <div class="card">
        <div class="card-title">Detalhamento — Despesas operacionais<span class="sub">${brl(a.despesas)}/mês</span></div>
        ${breakdownTable(state.settings.expenses, currentMonth)}
      </div>
      <div class="card">
        <div class="card-title">Detalhamento — Impostos<span class="sub">${brl(a.mei)}/mês</span></div>
        ${breakdownTable(state.settings.taxes, currentMonth)}
      </div>
    </div>

    <div class="section-title">Anúncios / tráfego pago</div>
    <div class="card">
      <div class="field hint" style="margin:0 0 10px;">Quanto você gastou com ML Ads / Shopee Ads em <strong>${monthLabel(currentMonth)}</strong>. Diferente das despesas fixas, cada mês tem o seu valor — entra no Bloco A e reduz o lucro operacional do mês.</div>
      ${adSpendRows(currentMonth)}
      <button class="btn ghost sm" style="margin-top:8px;" onclick="addAdSpendRow()">+ Lançar gasto de anúncio</button>
    </div>

    <div class="section-title">Bloco B — Amortização do investimento</div>
    <div class="card">
      ${b.rows.length ? `<div class="tbl-wrap tbl-responsive"><table>
        <thead><tr><th>Impressora</th><th class="right">Parcela mensal</th><th class="right">Parcelas restantes</th><th class="right">Total a pagar</th><th class="right">Status ${monthLabel(currentMonth)}</th></tr></thead>
        <tbody>
          ${b.rows.map(r=>`<tr><td data-label="Impressora">${esc(r.machine.name||'(sem nome)')}</td><td class="right num" data-label="Parcela mensal">${brl(r.parcela)}</td><td class="right num" data-label="Parcelas restantes">${r.restantes}</td><td class="right num" data-label="Total a pagar">${brl(r.totalPagar)}</td><td class="right" data-label="Status">${r.naoConfigurada?'<span class="badge mut">Não configurada</span>':r.quitada?'<span class="badge ok">Quitada</span>':r.dueThisMonth?'<span class="badge info">Devida este mês</span>':'<span class="badge mut">Fora do período</span>'}</td></tr>`).join('')}
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
            <div style="font-weight:600;font-size:13px;">${esc(g.name)}</div>
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
/* Detalhamento de despesas/impostos do mês `ym`. Item cuja 1ª cobrança ainda
   não chegou aparece apagado e sem valor — se sumisse da lista, o usuário não
   entenderia por que o total não bate com o que ele cadastrou. */
function breakdownTable(items, ym){
  if(!items || items.length===0) return emptyState('Nenhum item cadastrado.', '+ Adicionar item', `switchTab('configuracoes')`);
  return `<div class="tbl-wrap"><table><tbody>
    ${items.map(i=>{
      const futuro = ym && i.startMonth && i.startMonth > ym;
      return `<tr${futuro?' style="opacity:.5;"':''}>
        <td>${esc(i.name)}${futuro?` <span class="sub">a partir de ${monthLabel(i.startMonth)}</span>`:''}</td>
        <td class="right num">${futuro ? '—' : brl(i.value)}</td>
      </tr>`;
    }).join('')}
  </tbody></table></div>
  <div class="card-actions"><button class="btn ghost sm" style="width:100%;" onclick="switchTab('configuracoes')">Editar itens</button></div>`;
}
let editingPlatforms = [];
let editingExpenses = [];
let editingTaxes = [];
let editingMachines = [];
let editingReserveGoals = [];
let editingMarketGroups = [];
let editingCustomOrderPriceTable = { chaveiro:[], lembrancinha:[], topo_bolo:[] };
let editingBusinessName = '';
let editingBusinessLogo = null;
/* ---------- Anúncios / tráfego pago (aba Caixa) ----------
   Salva direto no state a cada edição, sem rascunho: a aba Caixa não tem
   botão "Salvar" (Taxas e Configurações têm), então esperar por um seria
   perder o lançamento ao trocar de aba. */
function adSpendRows(ym){
  const lista = (state.settings.adSpend||[]).filter(a=>a.ym===ym);
  const plataformas = (state.settings.platforms||[]).map(p=>p.name);
  if(!lista.length) return emptyState(`Nada lançado em ${monthLabel(ym)}`);
  const total = lista.reduce((s,a)=>s+(a.value||0),0);
  return formRowsHtml('minmax(0,1.4fr) minmax(0,1fr)', ['Plataforma','Gasto no mês'],
    lista.map(a=>`
    <div class="form-row">
      <select onchange="updateAdSpend('${escJs(a.id)}','platform',this.value)">
        ${plataformas.map(n=>`<option value="${esc(n)}" ${a.platform===n?'selected':''}>${esc(n)}</option>`).join('')}
      </select>
      <input type="number" min="0" step="0.01" value="${a.value}" oninput="updateAdSpend('${escJs(a.id)}','value',this.value)">
      ${formRowX(`removeAdSpend('${escJs(a.id)}')`)}
    </div>`))
    + `<div class="field hint" style="margin-top:6px;text-align:right;">Total do mês: <strong style="color:var(--text)">${brl(total)}</strong></div>`;
}
function addAdSpendRow(){
  if(!(state.settings.platforms||[]).length){
    blockedBy('Nenhuma plataforma cadastrada',
      'O gasto de anúncio é lançado por plataforma, pra você comparar depois o que cada uma devolveu. Cadastre as suas primeiro.',
      'Ir para Taxas', `switchTab('taxas');`);
    return;
  }
  if(!Array.isArray(state.settings.adSpend)) state.settings.adSpend = [];
  state.settings.adSpend.push({ id:uid(), ym:currentMonth, platform:state.settings.platforms[0].name, value:0 });
  saveSettings(); renderContent();
}
function updateAdSpend(id, campo, valor){
  const a = (state.settings.adSpend||[]).find(x=>x.id===id);
  if(!a) return;
  a[campo] = campo==='value' ? nn(valor) : valor;
  saveSettings();
  // Só re-renderiza no valor: trocar de plataforma não mexe em total nenhum,
  // e re-render a cada tecla digitada tiraria o foco do campo.
  if(campo==='value') renderContent();
}
function removeAdSpend(id){
  state.settings.adSpend = (state.settings.adSpend||[]).filter(x=>x.id!==id);
  saveSettings(); renderContent();
}
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
      <div class="field"><label>Margem de lucro padrão sugerida (%)</label><input type="number" min="0" id="cfgMargin" value="${((1-1/(s.markupMultiplier||2.5))*100).toFixed(0)}" step="1"></div>
      <div class="field hint" style="margin-top:-8px;">Usada como ponto de partida ao criar um produto novo — depois, cada produto pode ter a margem ajustada individualmente no próprio cadastro.</div>
      <div class="field"><label>Piso de alerta de margem (%)</label><input type="number" min="0" id="cfgMinMargin" value="${s.minMarginPct!=null?s.minMarginPct:25}" step="1"></div>
      <div class="field hint" style="margin-top:-8px;">Abaixo desse valor, a margem por Mercado Livre/Shopee aparece em vermelho na lista de Produtos — é a taxa da plataforma que costuma corroer a margem, não o preço de venda direta.</div>
    </div>
  `;
}
function renderConfiguracoes(){
  const s = state.settings;
  return `
    <div class="section-title" style="margin-top:0;">Marca do negócio</div>
    <div class="card">
      <div class="field"><label>Nome do negócio</label><input id="cfgBusinessName" value="${editingBusinessName}" placeholder="Ex: Minha Loja 3D" oninput="editingBusinessName=this.value"></div>
      <div class="field"><label>Logo</label><input type="file" accept="image/*" id="cfgBusinessLogoInput" onchange="handleBusinessLogoUpload(this)"></div>
      <div id="cfgBusinessLogoPreview">${editingBusinessLogo ? `<img src="${editingBusinessLogo}" alt="Logo atual" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line);margin-top:8px;display:block;">` : ''}</div>
      <div class="field hint" style="margin-top:8px;">Aparece na barra lateral, no catálogo exportado, no recibo de venda e no app instalado no celular. Deixe em branco pra usar o padrão.</div>
    </div>

    <div class="section-title">Início das operações</div>
    <div class="card">
      <div class="field"><label>Mês/ano de início</label><input type="month" id="cfgOpsStart" value="${s.operationsStartMonth||''}"></div>
      <div class="field hint" style="margin-top:-8px;">Meses anteriores a essa data saem zerados do Caixa e do export Anual — evita contar despesas fixas e impostos de antes do negócio começar a operar. Deixe em branco pra não aplicar nenhum corte.</div>
    </div>

    <div class="section-title">Despesas operacionais mensais</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">Cada item que você paga todo mês pra manter o negócio rodando: assinaturas, anúncios, ferramentas etc. Em <strong>A partir de</strong>, o mês da primeira cobrança — antes dele a despesa não entra em nenhum cálculo. Em branco, vale pra todos os meses.</div>
      <div id="expenseRows"></div>
      <button class="btn ghost sm" onclick="addExpenseRow()">+ Adicionar despesa</button>
      <div class="field hint" style="margin-top:10px;text-align:right;">Total: <strong id="expenseTotal" style="color:var(--text)">${brl(editingExpenses.reduce((a,e)=>a+(e.value||0),0))}</strong></div>
    </div>

    <div class="section-title">Impostos mensais</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">DAS-MEI e qualquer outro imposto que incida sobre o negócio. Em <strong>A partir de</strong>, o mês da primeira guia paga — em branco, vale pra todos os meses.</div>
      <div id="taxRows"></div>
      <button class="btn ghost sm" onclick="addTaxRow()">+ Adicionar imposto</button>
    </div>

    <div class="section-title">PIX</div>
    <div class="card">
      <div class="field"><label>Chave PIX</label><input id="cfgPixKey" value="${esc(s.pixKey||'')}" placeholder="CPF/CNPJ, e-mail, telefone ou chave aleatória"></div>
      <div class="row2">
        <div class="field"><label>Nome do recebedor</label><input id="cfgPixName" value="${esc(s.pixMerchantName||'')}" maxlength="25"></div>
        <div class="field"><label>Cidade</label><input id="cfgPixCity" value="${esc(s.pixMerchantCity||'')}" maxlength="15"></div>
      </div>
      <div class="field hint" style="margin-top:-8px;">Preencha pra poder gerar cobrança PIX (QR Code + copia e cola) direto na hora de registrar uma venda.</div>
    </div>

    <div class="section-title">Contato (aparece no catálogo)</div>
    <div class="card">
      <div class="row2">
        <div class="field"><label>WhatsApp</label><input id="cfgWhatsapp" value="${esc(s.whatsapp||'')}" placeholder="(11) 99999-9999"></div>
        <div class="field"><label>Instagram</label><input id="cfgInstagram" value="${esc(s.instagram||'')}" placeholder="seu.usuario (sem @)"></div>
      </div>
    </div>

    <div class="section-title">Mão de obra</div>
    <div class="card">
      <div class="field"><label>Valor da sua hora de trabalho (R$/h)</label><input type="number" min="0" id="cfgLabor" value="${s.laborHourlyRate||0}" step="0.01"></div>
      <div class="field hint" style="margin-top:-8px;">Usado para calcular o custo de mão de obra de cada produto (pintura, montagem, acabamento), com base nos minutos informados no cadastro do produto.</div>
    </div>

    <div class="section-title">MEI, capacidade e metas</div>
    <div class="card">
      <div class="row2">
        <div class="field"><label>Regime tributário</label><select id="cfgTaxRegime">
          <option value="" ${!s.taxRegime?'selected':''}>Ainda não formalizado</option>
          <option value="mei" ${s.taxRegime==='mei'?'selected':''}>MEI</option>
          <option value="outro" ${s.taxRegime==='outro'?'selected':''}>ME ou outro regime</option>
        </select></div>
        <div class="field"><label>Teto anual do MEI (R$)</label><input type="number" min="0" id="cfgMeiLimit" value="${s.meiRevenueLimit||81000}" step="100"></div>
        <div class="field"><label>Horas de impressão disponíveis por dia (por impressora)</label><input type="number" min="0" id="cfgPrintHours" value="${s.printHoursPerDay||8}" step="0.5"></div>
      </div>
      <div class="field"><label>Meta de faturamento mensal (R$)</label><input type="number" min="0" id="cfgMonthlyGoal" value="${s.monthlyGoal||0}" step="50" placeholder="0 = sem meta definida"></div>
    </div>

    <div class="section-title">Meta de rentabilidade</div>
    <div class="card">
      <div class="row2">
        <div class="field"><label>R$/hora-máquina mínimo aceitável</label><input type="number" min="0" id="cfgTargetHourlyProfit" value="${s.targetHourlyProfit!=null?s.targetHourlyProfit:15}" step="0.5"></div>
        <div class="field"><label>R$/hora-máquina de produto bom</label><input type="number" min="0" id="cfgGoodHourlyProfit" value="${s.goodHourlyProfit!=null?s.goodHourlyProfit:20}" step="0.5"></div>
      </div>
      <div class="field hint" style="margin-top:-8px;">Com uma impressora, o recurso escasso é hora de bico. Abaixo da meta, o produto não paga o tempo que ocupa.</div>
      <div class="field"><label>Lucro mínimo aceitável por venda (R$)</label><input type="number" min="0" id="cfgMinProfitPerSale" value="${s.minProfitPerSale!=null?s.minProfitPerSale:8}" step="0.5"></div>
      <div class="field hint" style="margin-top:-8px;">Um R$/hora ótimo não significa nada se cada venda mal cobre o cafezinho — produto abaixo desse piso é sinalizado mesmo com R$/hora alto, porque só compensa em volume gigantesco de vendas.</div>
    </div>

    <div class="section-title">Preço de mercado por categoria</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">A faixa de preço da concorrência é da categoria do produto, não de cada peça — pesquise uma vez por grupo (Porta Guardanapos, Suportes, etc.). Em Produtos, cada peça pode ter uma exceção pontual.</div>
      <div id="marketGroupRows"></div>
    </div>

    <div class="section-title">Tabela de preço — Personalizados</div>
    <div class="card">
      <div class="field hint" style="margin-top:0;margin-bottom:10px;">Preço por unidade, com desconto por faixa de quantidade — usado no Diagnóstico de Personalizados pra comparar com o que foi realmente cobrado em cada encomenda. Faixa sem "até" cobre tudo dali pra cima.</div>
      ${Object.entries({chaveiro:'Chaveiro', lembrancinha:'Lembrancinha', topo_bolo:'Topo de bolo'}).map(([type,label])=>`
        <div style="margin-bottom:14px;">
          <div style="font-weight:600;font-size:13px;margin-bottom:6px;">${label}</div>
          <div id="priceTierRows_${type}"></div>
          <button class="btn ghost sm" onclick="addPriceTierRow('${type}')">+ Adicionar faixa</button>
        </div>
      `).join('')}
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
      <div class="field"><label>${i===0?'Nome':''}</label><input value="${esc(g.name)}" oninput="editingReserveGoals[${i}].name=this.value"></div>
      <div class="field"><label>${i===0?'Meta mensal (R$)':''}</label><input type="number" min="0" value="${g.goal}" step="0.01" placeholder="meta mensal R$" oninput="editingReserveGoals[${i}].goal=nn(this.value)"></div>
      ${g.autoMode==='cost_depreciation'
        ? `<div class="field"><label>${i===0?'Alocação automática':''}</label><input value="Automático — via custo de depreciação" disabled></div>`
        : `<div class="field"><label>${i===0?'% do lucro por venda':''}</label><input type="number" min="0" value="${g.autoPct||0}" step="1" placeholder="0" oninput="editingReserveGoals[${i}].autoPct=Math.min(100,Math.max(0,nn(this.value)))"></div>`}
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
  if(removed.balance>0 && !confirm(`"${esc(removed.name)}" tem ${brl(removed.balance)} guardado. Remover mesmo assim? Esse saldo deixa de aparecer em Caixa (não é devolvido a lugar nenhum).`)) return;
  editingReserveGoals.splice(i,1);
  renderReserveRows();
}
function renderMarketGroupRows(){
  const el = document.getElementById('marketGroupRows');
  if(!el) return;
  if(!editingMarketGroups.length){ el.innerHTML = emptyState(
    'Nenhuma categoria de produto cadastrada ainda.<br><span style="font-size:12.5px;">A faixa de preço de mercado é definida por categoria — a categoria nasce no cadastro do produto.</span>',
    '+ Novo produto', `openProductModal()`); return; }
  el.innerHTML = editingMarketGroups.map((g,i)=>`
    <div class="card" style="margin-bottom:10px;padding:12px 14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:600;font-size:13px;">${esc(g.category)}</div>
        <button class="btn ghost sm" title="Remover" onclick="removeMarketGroupRow(${i})">Remover</button>
      </div>
      <div class="row3">
        <div class="field"><label>Mínimo (R$)</label><input type="number" min="0" step="0.01" value="${g.min||''}" placeholder="0" oninput="editingMarketGroups[${i}].min=nn(this.value)"></div>
        <div class="field"><label>Médio (R$)</label><input type="number" min="0" step="0.01" value="${g.avg||''}" placeholder="0" oninput="editingMarketGroups[${i}].avg=nn(this.value)"></div>
        <div class="field"><label>Máximo (R$)</label><input type="number" min="0" step="0.01" value="${g.max||''}" placeholder="0" oninput="editingMarketGroups[${i}].max=nn(this.value)"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Essa faixa é por</label>
          <select onchange="editingMarketGroups[${i}].unitBasis=this.value; renderMarketGroupRows();">
            <option value="unidade" ${g.unitBasis!=='kit'?'selected':''}>Unidade (peça avulsa)</option>
            <option value="kit" ${g.unitBasis==='kit'?'selected':''}>Kit de N unidades</option>
          </select>
        </div>
        ${g.unitBasis==='kit' ? `<div class="field"><label>Tamanho do kit pesquisado (un)</label><input type="number" min="1" step="1" value="${g.kitSize||1}" oninput="editingMarketGroups[${i}].kitSize=Math.max(1,parseInt(this.value)||1)"></div>` : `<div class="field hint" style="padding-top:9px;">Comparar preço de kit com faixa por unidade (ou vice-versa) sem indicar isso induz erro — por isso essa faixa.</div>`}
      </div>
      <div class="row2">
        <div class="field"><label>Pesquisado em</label><input type="date" value="${g.checkedAt||''}" oninput="editingMarketGroups[${i}].checkedAt=this.value"></div>
        <div class="field"><label>Nota (opcional)</label><input value="${g.note||''}" placeholder="Ex: 5 anúncios ML, 28/07" oninput="editingMarketGroups[${i}].note=this.value"></div>
      </div>
    </div>
  `).join('');
}
// A linha reaparece (vazia) da próxima vez se algum produto ainda usar essa
// categoria — a lista é sempre a união de categorias em uso + faixas salvas
// (ver switchTab). Remover aqui só limpa a faixa de preço, não a categoria.
function removeMarketGroupRow(i){
  const g = editingMarketGroups[i];
  const stillInUse = productCategorySuggestions().includes(g.category);
  if(stillInUse && !confirm(`"${esc(g.category)}" ainda é usada por algum produto — remover só apaga a faixa de preço cadastrada (a categoria continua existindo, e essa linha volta vazia se você reabrir Configurações). Continuar?`)) return;
  editingMarketGroups.splice(i,1);
  renderMarketGroupRows();
}
function renderCustomOrderPriceTierRows(type){
  const el = document.getElementById(`priceTierRows_${type}`);
  if(!el) return;
  const tiers = editingCustomOrderPriceTable[type]||[];
  if(!tiers.length){ el.innerHTML = `<div class="empty" style="padding:8px;font-size:12.5px;">Nenhuma faixa cadastrada — sem faixa, o Diagnóstico não compara com tabela.</div>`; return; }
  el.innerHTML = formRowsHtml('minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', ['De (un)','Até (un)','R$ por unidade'],
    tiers.map((t,i)=>`
    <div class="form-row">
      <input type="number" min="1" step="1" value="${t.minQty||1}" placeholder="de (un)" oninput="editingCustomOrderPriceTable['${type}'][${i}].minQty=nn(this.value, 1)">
      <input type="number" min="1" step="1" value="${t.maxQty||''}" placeholder="até (opcional)" oninput="editingCustomOrderPriceTable['${type}'][${i}].maxQty=nn(this.value)">
      <input type="number" min="0" step="0.01" value="${t.unitPrice||''}" placeholder="R$/un" oninput="editingCustomOrderPriceTable['${type}'][${i}].unitPrice=nn(this.value)">
      ${formRowX(`removePriceTierRow('${type}',${i})`)}
    </div>
  `));
}
function addPriceTierRow(type){
  editingCustomOrderPriceTable[type].push({minQty:1, maxQty:0, unitPrice:0});
  renderCustomOrderPriceTierRows(type);
}
function removePriceTierRow(type, i){
  editingCustomOrderPriceTable[type].splice(i,1);
  renderCustomOrderPriceTierRows(type);
}
function renderMachineRows(){
  const el = document.getElementById('machineRows');
  if(!el) return;
  el.innerHTML = editingMachines.length ? editingMachines.map((m,i)=>`
    <div class="card" style="margin-bottom:10px;padding:14px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;">
        <input value="${esc(m.name)}" placeholder="Nome da impressora" oninput="editingMachines[${i}].name=this.value" style="font-weight:600;">
        <button class="btn ghost sm" title="Remover" onclick="removeMachineRow(${i})">Remover</button>
      </div>
      <div class="row3">
        <div class="field"><label>Preço de compra (R$)</label><input type="number" min="0" step="0.01" value="${m.price||0}" oninput="editingMachines[${i}].price=nn(this.value)"></div>
        <div class="field"><label>Valor residual (R$)</label><input type="number" min="0" step="0.01" value="${m.residual||0}" oninput="editingMachines[${i}].residual=nn(this.value)"></div>
        <div class="field"><label>Vida útil (horas)</label><input type="number" min="0" step="1" value="${m.lifeHours||5000}" oninput="editingMachines[${i}].lifeHours=nn(this.value, 1)"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Potência média (kW)</label><input type="number" min="0" step="0.01" value="${m.powerConsumptionKw||0}" placeholder="Ex: 0.1" oninput="editingMachines[${i}].powerConsumptionKw=nn(this.value); renderMachineRows();"></div>
        <div class="field"><label>Custo de energia (R$/h)</label><input type="number" min="0" step="0.0001" value="${m.energyCostPerHour||0}" ${m.powerConsumptionKw>0?'disabled':''} oninput="editingMachines[${i}].energyCostPerHour=nn(this.value)"></div>
      </div>
      <div class="field hint" style="margin-top:-8px;margin-bottom:10px;">${m.powerConsumptionKw>0 ? `Calculado automaticamente pela tarifa (aba Cálculo): ${num(m.powerConsumptionKw,2)}kW × ${brl(state.settings.energyTariffPerKwh||0)}/kWh = ${brl(machineEnergyCostPerHour(m))}/h` : 'Preencha a potência pra calcular sozinho pela tarifa, ou deixe em 0 e informe o R$/h manualmente.'}</div>
      <div class="field hint" style="margin-top:-8px;margin-bottom:10px;">Depreciação calculada: ${brl(machineDeprCostPerHour(m))}/h</div>
      <div class="field"><label>Manutenção (R$/h)</label><input type="number" min="0" step="0.01" value="${m.maintenanceCostPerHour!=null?m.maintenanceCostPerHour:0.25}" oninput="editingMachines[${i}].maintenanceCostPerHour=nn(this.value)"></div>
      <div class="field hint" style="margin-top:-8px;margin-bottom:10px;">Estimativa fixa de troca de bico, correias, limpeza etc. — não é derivada do histórico de manutenção abaixo (poucas horas rodadas fariam o valor oscilar demais). Revise a cada 6 meses.</div>
      <div class="row3">
        <div class="field"><label>Parcela mensal (R$)</label><input type="number" min="0" step="0.01" value="${m.installmentValue||0}" oninput="editingMachines[${i}].installmentValue=nn(this.value)"></div>
        <div class="field"><label>Total de parcelas</label><input type="number" min="0" step="1" value="${m.installmentsTotal||0}" oninput="editingMachines[${i}].installmentsTotal=nn(this.value)"></div>
        <div class="field"><label>Mês da 1ª parcela</label><input type="month" value="${m.startMonth||currentMonth}" oninput="editingMachines[${i}].startMonth=this.value"></div>
      </div>
    </div>
  `).join('') : `<div class="empty" style="padding:14px;">Nenhuma impressora cadastrada</div>`;
}
function openMaintenanceModal(machineId){
  const m = (state.settings.machines||[]).find(x=>x.id===machineId);
  if(!m) return;
  const log = (m.maintenanceLog||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  showModal(`Manutenção — ${esc(m.name)}`, `
    <div class="row2">
      <div class="field"><label>Data</label><input type="date" id="mtDate" value="${todayStr()}"></div>
      <div class="field"><label>Custo (R$, opcional)</label><input type="number" min="0" id="mtCost" step="0.01" value="0"></div>
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
  const cost = numField('mtCost');
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
  if(usedBy.length && !confirm(`${usedBy.length} produto(s) usam "${esc(m.name)}" (${esc(usedBy.slice(0,3).map(p=>p.name).join(', '))}${usedBy.length>3?'...':''}). Ao remover, eles passam a usar a primeira impressora da lista pro cálculo de custo. Continuar?`)) return;
  editingMachines.splice(i,1);
  renderMachineRows();
}
/* Linhas de nome + valor + mês da 1ª cobrança.
   O mês existe porque a lista não tinha data nenhuma: uma despesa cadastrada
   hoje era aplicada a TODOS os meses, inclusive os anteriores a ela existir —
   o export Anual mostrava a mesma assinatura de janeiro a dezembro. Em branco
   = vale desde sempre, que é o comportamento antigo (ver blocoA). */
function renderNameValueRows(containerId, list, updateFn, removeFn){
  const el = document.getElementById(containerId);
  if(!el) return;
  el.innerHTML = formRowsHtml('minmax(0,2fr) minmax(0,1fr) minmax(0,1.1fr)',
    ['Nome','Valor mensal','A partir de'],
    list.map((item,i)=>`
    <div class="form-row">
      <input value="${esc(item.name)}" placeholder="Nome" oninput="${updateFn}(${i},'name',this.value)">
      <input type="number" step="0.01" min="0" value="${item.value}" placeholder="R$" oninput="${updateFn}(${i},'value',this.value)">
      <input type="month" value="${item.startMonth||''}" title="Mês da primeira cobrança — em branco vale desde sempre" onchange="${updateFn}(${i},'startMonth',this.value)">
      ${formRowX(`${removeFn}(${i})`)}
    </div>
  `), `<div class="empty" style="padding:10px;">Nenhum item ainda</div>`);
}
// Linha nova nasce começando no mês corrente: quem cadastra uma despesa hoje
// começou a pagar por volta de agora, não em janeiro. Era essa a reclamação —
// despesa criada agora aparecia em todos os meses anteriores do Anual.
function addExpenseRow(){ editingExpenses.push({id:uid(),name:'',value:0,startMonth:todayStr().slice(0,7)}); renderNameValueRows('expenseRows', editingExpenses, 'updateExpenseRow', 'removeExpenseRow'); }
function updateExpenseRow(i,field,val){
  editingExpenses[i][field] = field==='value' ? (nn(val)) : val;
  const t = document.getElementById('expenseTotal');
  if(t) t.textContent = brl(editingExpenses.reduce((a,e)=>a+(e.value||0),0));
}
function removeExpenseRow(i){ editingExpenses.splice(i,1); renderNameValueRows('expenseRows', editingExpenses, 'updateExpenseRow', 'removeExpenseRow'); }
function addTaxRow(){ editingTaxes.push({id:uid(),name:'',value:0,startMonth:todayStr().slice(0,7)}); renderNameValueRows('taxRows', editingTaxes, 'updateTaxRow', 'removeTaxRow'); }
function updateTaxRow(i,field,val){ editingTaxes[i][field] = field==='value' ? (nn(val)) : val; }
function removeTaxRow(i){ editingTaxes.splice(i,1); renderNameValueRows('taxRows', editingTaxes, 'updateTaxRow', 'removeTaxRow'); }
/* ---------- Categorias do Mercado Livre (clássico x premium) ----------
   O ML cobra percentual DIFERENTE por categoria (são ~477) e por tipo de
   anúncio. Antes isto era uma fileira de chips fixos com um número só, sem
   dizer se era clássico ou premium — e envelhecia sozinho, porque ninguém
   atualiza número escrito no código.

   Agora é uma lista de verdade em `settings.mlCategories`, com as duas taxas
   lado a lado. Quem tem a conta do ML conectada busca o valor real pela API;
   quem não tem digita na mão. As linhas que vieram do seed nascem marcadas
   como estimativa (`origem:'estimativa'`), pra ficar claro no que dá pra
   confiar. Máximo de 5 visíveis — o resto abre no "ver todas". */
const ML_CATEGORY_SEED = [
  { nome:'Casa / Decoração',        classicaPct:12, premiumPct:17 },
  { nome:'Brinquedos e Hobbies',    classicaPct:12, premiumPct:17 },
  { nome:'Eletrônicos / Acessórios',classicaPct:11, premiumPct:16 },
  { nome:'Escritório / Papelaria',  classicaPct:13, premiumPct:18 },
];
// Preço de referência das taxas da tabela. Acima de R$79 o ML não soma o
// custo fixo por peso, então o percentual sai "limpo" — abaixo disso a mesma
// categoria mostraria um percentual maior e a comparação entre linhas
// deixaria de valer.
const ML_REF_PRICE = 100;
let mlCategoriesExpanded = false;

function mlCategories(){ return state.settings.mlCategories || []; }
function applyMlCategoryFee(platIndex, pct){
  editingPlatforms[platIndex].pct = pct;
  renderPlatformRows();
  toast(`Taxa de ${num(pct,1)}% aplicada — clique em Salvar taxas`);
}
function removeMlCategory(id){
  state.settings.mlCategories = mlCategories().filter(c=>c.id!==id);
  saveSettings();
  renderPlatformRows();
}
function updateMlCategory(id, campo, valor){
  const c = mlCategories().find(x=>x.id===id);
  if(!c) return;
  c[campo] = campo==='nome' ? valor : (parseFloat(valor)||0);
  // Editado na mão deixa de ser estimativa do seed e deixa de ser "da API".
  c.origem = 'manual';
  c.atualizadoEm = todayStr();
  saveSettings();
}
function toggleMlCategories(){
  mlCategoriesExpanded = !mlCategoriesExpanded;
  renderPlatformRows();
}
function renderPlatformRows(){
  const el = document.getElementById('platformRows');
  if(!el) return;
  // Rótulo uma vez, no cabeçalho — antes só a PRIMEIRA linha os mostrava
  // (`i===0 ? <label> : ''`), e como cada plataforma é seguida do próprio
  // painel (categorias do ML, faixas da Shopee), quem chegava na terceira
  // linha já não tinha referência nenhuma na tela.
  /* Os campos "Taxa %"/"Taxa fixa" saíram da linha da plataforma e passaram a
     aparecer SÓ onde são a fonte da taxa:
       Mercado Livre — quem manda é a tabela de categorias logo abaixo; o
         percentual em uso vira texto, trocado pelos botões "usar".
       Shopee — as faixas cobrem qualquer preço (a última é pega-tudo), então
         os campos nunca chegavam a ser usados. Eram decorativos.
       Demais plataformas — aí sim são a única fonte, e continuam editáveis
         no bloco da própria plataforma. */
  el.innerHTML = formRowsHtml('minmax(0,1fr)', ['Plataforma'],
    editingPlatforms.map((p,i)=>{
    const isML = /mercado\s*livre/i.test(p.name);
    const isShopee = /shopee/i.test(p.name) && p.tiers;
    const canHaveListing = !isML && !isShopee;
    const otherTemplateOptions = canHaveListing ? editingPlatforms.filter((op,oi)=>oi!==i && op.listingTemplate && !/mercado\s*livre/i.test(op.name) && !(/shopee/i.test(op.name)&&op.tiers)) : [];
    return `
    <div class="form-row" style="margin-bottom:4px;">
      <input value="${esc(p.name)}" oninput="editingPlatforms[${i}].name=this.value">
      ${formRowX(`removePlatformRow(${i})`)}
    </div>
    ${isML ? mlCategoryTable(i) : ''}
    ${isShopee ? shopeeTierPanel(p) : ''}
    ${(!isML && !isShopee) ? `<div class="row2" style="margin-bottom:4px;">
      <div class="field"><label>Taxa %</label><input type="number" min="0" step="0.01" value="${p.pct}" oninput="editingPlatforms[${i}].pct=nn(this.value)"></div>
      <div class="field"><label>Taxa fixa por unidade vendida (R$)</label><input type="number" min="0" step="0.01" value="${p.fixed}" oninput="editingPlatforms[${i}].fixed=nn(this.value)"></div>
    </div>` : ''}
    ${canHaveListing ? `<div class="field" style="margin-bottom:12px;"><label>Aba de Anúncios pra "${esc(p.name)}"</label>
      <select onchange="editingPlatforms[${i}].listingTemplate=this.value||null; renderPlatformRows();">
        <option value="">Sem aba de Anúncios (só taxa pra Vendas)</option>
        <option value="ml" ${p.listingTemplate==='ml'?'selected':''}>Copiar campos do Mercado Livre</option>
        <option value="shopee" ${p.listingTemplate==='shopee'?'selected':''}>Copiar campos da Shopee</option>
        ${otherTemplateOptions.map(op=>`<option value="${op.id}" ${p.listingTemplate===op.id?'selected':''}>Copiar campos de "${esc(op.name)}"</option>`).join('')}
      </select>
      <div class="field hint" style="margin-top:4px;">${p.listingTemplate?'Produtos ganha um preço próprio pra essa plataforma, e Anúncios ganha uma aba com os mesmos campos da plataforma copiada.':'Sem aba de Anúncios, essa plataforma entra só no cálculo de taxa das vendas.'}</div>
    </div>` : ''}
  `;}));
}
/* Tabela de categorias do ML, embaixo da linha da plataforma. Cada linha tem
   as duas taxas editáveis e um botão pra jogar aquele percentual na taxa da
   plataforma (que é o número que o app usa em Vendas). */
function mlCategoryTable(platIndex){
  const todas = mlCategories();
  const visiveis = mlCategoriesExpanded ? todas : todas.slice(0,5);
  const ocultas = todas.length - visiveis.length;
  const selo = (c) => c.origem==='api'
    ? `<span class="chip" style="background:var(--teal-bg,transparent);color:var(--teal);">API do ML${c.atualizadoEm?' · '+fmtDate(c.atualizadoEm):''}</span>`
    : c.origem==='manual'
      ? `<span class="chip">você digitou${c.atualizadoEm?' · '+fmtDate(c.atualizadoEm):''}</span>`
      : `<span class="chip" title="Veio do cadastro inicial do app, não da API">estimativa</span>`;

  const linhas = visiveis.map(c=>`
    <tr>
      <td data-label="Categoria" style="min-width:150px;">
        <input value="${esc(c.nome)}" style="width:100%;min-width:0;" oninput="updateMlCategory('${c.id}','nome',this.value)">
        <div style="margin-top:4px;">${selo(c)}</div>
      </td>
      <td data-label="Clássico" class="right">
        <input type="number" step="0.1" min="0" value="${c.classicaPct}" style="width:72px;text-align:right;" oninput="updateMlCategory('${c.id}','classicaPct',this.value)">
        <button class="btn ghost sm" style="margin-left:4px;padding:4px 7px;" title="Usar essa taxa na plataforma" onclick="applyMlCategoryFee(${platIndex},${c.classicaPct})">usar</button>
      </td>
      <td data-label="Premium" class="right">
        <input type="number" step="0.1" min="0" value="${c.premiumPct}" style="width:72px;text-align:right;" oninput="updateMlCategory('${c.id}','premiumPct',this.value)">
        <button class="btn ghost sm" style="margin-left:4px;padding:4px 7px;" title="Usar essa taxa na plataforma" onclick="applyMlCategoryFee(${platIndex},${c.premiumPct})">usar</button>
      </td>
      <td data-label="" class="right"><button class="btn ghost sm" title="Remover categoria" style="padding:6px 8px;" onclick="removeMlCategory('${c.id}')">×</button></td>
    </tr>`).join('');

  return `<div style="margin:0 0 14px;">
    <div class="field hint" style="margin:0 0 8px;">O Mercado Livre cobra percentual diferente por categoria e por tipo de anúncio. <strong>Clássico</strong> aparece menos na busca e custa menos; <strong>Premium</strong> aparece mais e inclui parcelamento sem juros pro comprador, por isso é mais caro. Os percentuais abaixo valem pra um produto de ${brl(ML_REF_PRICE)} — em itens abaixo de R$ 79 o ML soma um custo fixo por peso, e o percentual efetivo sobe.</div>
    <div class="helper-block" style="margin:0 0 10px;display:flex;justify-content:space-between;gap:10px;align-items:baseline;">
      <span>Taxa em uso pros produtos que ainda não tiveram a taxa real buscada:</span>
      <strong class="num" style="color:var(--text);white-space:nowrap;">${num(editingPlatforms[platIndex].pct,1)}%${editingPlatforms[platIndex].fixed?' + '+brl(editingPlatforms[platIndex].fixed)+'/un':''}</strong>
    </div>
    ${todas.length ? `<div class="tbl-wrap tbl-responsive"><table>
      <thead><tr><th>Categoria</th><th class="right">Clássico %</th><th class="right">Premium %</th><th></th></tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>
    ${ocultas>0 ? `<button class="btn ghost sm" style="margin-top:8px;" onclick="toggleMlCategories()">Ver todas (${ocultas} a mais)</button>`
      : (mlCategoriesExpanded && todas.length>5 ? `<button class="btn ghost sm" style="margin-top:8px;" onclick="toggleMlCategories()">Mostrar só as 5 primeiras</button>` : '')}`
    : emptyState('Nenhuma categoria cadastrada')}
    <button class="btn ghost sm" style="margin-top:8px;" onclick="openMlCategoryModal()">+ Adicionar categoria</button>
  </div>`;
}

/* Painel explicativo da Shopee. Não edita nada: as faixas são política da
   plataforma, e o app já as aplica sozinho em cada venda — o que faltava era
   deixar visível o que estava rodando escondido. */
function shopeeTierPanel(plat){
  const tiers = plat.tiers || [];
  const faixaLabel = (t, ant) => {
    const de = ant==null ? 'até' : `de ${brl(ant+0.01)} a`;
    return t.max===Infinity || t.max==null ? `acima de ${brl(ant||0)}` : `${de} ${brl(t.max)}`;
  };
  let anterior = null;
  const linhas = tiers.map(t=>{
    // Exemplo no teto da faixa (ou um pouco acima do piso, na última).
    const exemplo = (t.max===Infinity || t.max==null) ? (anterior||0) + 100 : t.max;
    const taxa = exemplo*(t.pct/100) + t.fixed;
    const label = faixaLabel(t, anterior);
    anterior = (t.max===Infinity || t.max==null) ? anterior : t.max;
    return `<tr>
      <td data-label="Faixa">${label}</td>
      <td data-label="Comissão" class="right num">${num(t.pct,0)}%</td>
      <td data-label="Fixo" class="right num">${brl(t.fixed)}</td>
      <td data-label="Exemplo" class="right num">${brl(exemplo)} → <strong>${brl(taxa)}</strong> (${num(taxa/exemplo*100,1)}%)</td>
    </tr>`;
  }).join('');

  const caps = (plat.freightCapTiers||[]).map(f=>
    `${f.max===Infinity||f.max==null ? 'acima disso' : 'até '+brl(f.max)}: ${brl(f.cap)}`
  ).join(' · ');

  return `<div style="margin:0 0 14px;">
    <div class="field hint" style="margin:0 0 8px;">A Shopee não tem taxa única: ela cobra <strong>comissão percentual + um valor fixo</strong>, e os dois mudam conforme o preço do produto. O app aplica a faixa certa sozinho, <strong>item por item</strong> — o que decide é o preço de cada anúncio, não o total do pedido. Por isso não há campo de taxa pra editar aqui: as faixas abaixo cobrem qualquer valor.</div>
    <div class="tbl-wrap tbl-responsive"><table>
      <thead><tr><th>Preço do produto</th><th class="right">Comissão</th><th class="right">Fixo</th><th class="right">Exemplo no teto da faixa</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>
    ${caps ? `<div class="field hint" style="margin-top:8px;">O Frete Grátis da Shopee é subsidiado até um teto, que também varia por faixa (${caps}). O que passar disso sai do seu bolso — é isso que o campo de frete do produto estima.</div>` : ''}
    <div class="field hint" style="margin-top:6px;">Faixas conforme a política vigente. Quando a Shopee mudar, o valor certo está no Seller Centre → Taxas.</div>
  </div>`;
}

/* Adicionar categoria: busca na API do ML se a conta estiver conectada,
   senão cai no cadastro manual — que é o mesmo formulário, só sem o
   preenchimento automático. */
function openMlCategoryModal(){
  const conectado = !!initSupabase();
  showModal('Adicionar categoria do Mercado Livre', `
    <div class="field"><label>Buscar categoria</label>
      <input id="mlCatSearch" placeholder="Ex: suporte para headset" autocomplete="off" oninput="searchMlCategoryForTable(this.value)">
      <div id="mlCatResults" style="max-height:180px;overflow-y:auto;"></div>
    </div>
    <div class="field hint" style="margin-top:-4px;">${conectado
      ? `Digite o que você vende (3 letras ou mais). O app pergunta ao Mercado Livre em qual categoria isso cai e busca as duas taxas reais pra um produto de ${brl(ML_REF_PRICE)}.`
      : 'A busca automática precisa da conta do Mercado Livre conectada (aba Taxas, logo abaixo). Sem ela, preencha o nome e as duas taxas na mão.'}</div>
    <div class="row2">
      <div class="field"><label>Nome da categoria</label><input id="mlCatName" placeholder="Ex: Casa / Decoração"></div>
      <div class="field"><label>ID no ML (opcional)</label><input id="mlCatId" placeholder="MLB1234"></div>
    </div>
    <div class="row2">
      <div class="field"><label>Taxa clássico (%)</label><input type="number" step="0.1" min="0" id="mlCatClassica" value="0"></div>
      <div class="field"><label>Taxa premium (%)</label><input type="number" step="0.1" min="0" id="mlCatPremium" value="0"></div>
    </div>
    <div id="mlCatStatus" class="field hint" style="margin-top:-4px;"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmMlCategory()">Adicionar</button>
    </div>
  `);
}
let mlCatSearchTimer = null;
function searchMlCategoryForTable(q){
  clearTimeout(mlCatSearchTimer);
  const el = document.getElementById('mlCatResults');
  if(!el) return;
  if(!q || q.trim().length<3){ el.innerHTML=''; return; }
  mlCatSearchTimer = setTimeout(async ()=>{
    const client = initSupabase();
    if(!client){ el.innerHTML = `<div class="field hint" style="margin:6px 0 0;">Sem conta do ML conectada — preencha os campos abaixo na mão.</div>`; return; }
    try{
      const { data, error } = await client.functions.invoke('ml-api', { body:{ action:'search-category', q } });
      if(error || !data || !data.results){ el.innerHTML = `<div class="field hint" style="margin:6px 0 0;">Não consegui buscar agora — dá pra preencher na mão abaixo.</div>`; return; }
      el.innerHTML = data.results.slice(0,6).map(r=>
        `<div style="padding:6px 8px;border:1px solid var(--line);border-top:none;cursor:pointer;font-size:12px;background:var(--panel);"
          onmousedown="pickMlCategoryForTable('${r.category_id}','${(r.category_name||'').replace(/'/g,"\\'")}')">${r.category_name}</div>`).join('');
    }catch(e){ el.innerHTML = `<div class="field hint" style="margin:6px 0 0;">Não consegui buscar agora — dá pra preencher na mão abaixo.</div>`; }
  }, 400);
}
/* Escolhida a categoria, busca as DUAS taxas. São duas chamadas ao
   fee-lookup que já está deployado (gold_special = clássico, gold_pro =
   premium) — de propósito, pra não exigir redeploy de Edge Function. */
async function pickMlCategoryForTable(categoryId, categoryName){
  document.getElementById('mlCatResults').innerHTML = '';
  document.getElementById('mlCatSearch').value = categoryName;
  document.getElementById('mlCatName').value = categoryName;
  document.getElementById('mlCatId').value = categoryId;
  const status = document.getElementById('mlCatStatus');
  const client = initSupabase();
  if(!client){ status.textContent = 'Sem conexão — preencha as taxas na mão.'; return; }
  status.textContent = 'Buscando as duas taxas no Mercado Livre...';
  const buscar = async (listingTypeId)=>{
    const { data, error } = await client.functions.invoke('ml-api', {
      body:{ action:'fee-lookup', price: ML_REF_PRICE, categoryId, listingTypeId }
    });
    if(error || !data || data.error || data.feePct==null) return null;
    return data.feePct;
  };
  try{
    const [classica, premium] = await Promise.all([buscar('gold_special'), buscar('gold_pro')]);
    if(classica==null && premium==null){
      status.textContent = 'O Mercado Livre não respondeu as taxas — preencha na mão.';
      return;
    }
    if(classica!=null) document.getElementById('mlCatClassica').value = num(classica,1).replace(',','.');
    if(premium!=null) document.getElementById('mlCatPremium').value = num(premium,1).replace(',','.');
    document.getElementById('mlCatStatus').dataset.origem = 'api';
    status.innerHTML = `Taxas reais pra um produto de ${brl(ML_REF_PRICE)}${classica==null?' (clássico não veio)':''}${premium==null?' (premium não veio)':''}.`;
  }catch(e){ status.textContent = 'Falha ao buscar — preencha as taxas na mão.'; }
}
function confirmMlCategory(){
  const nome = document.getElementById('mlCatName').value.trim();
  if(!nome){ toast('Dê um nome à categoria','err'); return; }
  const origem = document.getElementById('mlCatStatus').dataset.origem === 'api' ? 'api' : 'manual';
  if(!Array.isArray(state.settings.mlCategories)) state.settings.mlCategories = [];
  state.settings.mlCategories.push({
    id: uid(),
    nome,
    mlCategoryId: document.getElementById('mlCatId').value.trim(),
    classicaPct: numField('mlCatClassica'),
    premiumPct: numField('mlCatPremium'),
    origem,
    atualizadoEm: todayStr(),
  });
  saveSettings();
  closeModal();
  renderPlatformRows();
  toast('Categoria adicionada');
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
  const cfgMarginPct = Math.min(95, Math.max(0, numField('cfgMargin')));
  s.markupMultiplier = cfgMarginPct<100 ? 1/(1-cfgMarginPct/100) : 20;
  s.minMarginPct = Math.min(95, Math.max(0, numField('cfgMinMargin')));
  saveSettings(); toast('Taxas salvas'); renderContent();
}
function confirmConfiguracoes(){
  const s = state.settings;
  s.businessName = document.getElementById('cfgBusinessName').value.trim();
  s.businessLogo = editingBusinessLogo;
  s.operationsStartMonth = document.getElementById('cfgOpsStart').value || '';
  s.expenses = editingExpenses.filter(e=>e.name && e.name.trim());
  s.taxes = editingTaxes.filter(t=>t.name && t.name.trim());
  s.pixKey = document.getElementById('cfgPixKey').value.trim();
  s.pixMerchantName = document.getElementById('cfgPixName').value.trim();
  s.pixMerchantCity = document.getElementById('cfgPixCity').value.trim();
  s.whatsapp = document.getElementById('cfgWhatsapp').value.trim();
  s.instagram = document.getElementById('cfgInstagram').value.trim().replace(/^@/,'');
  s.laborHourlyRate = numField('cfgLabor');
  s.taxRegime = document.getElementById('cfgTaxRegime').value;
  s.meiRevenueLimit = numField('cfgMeiLimit', 81000);
  s.monthlyGoal = numField('cfgMonthlyGoal');
  s.printHoursPerDay = numField('cfgPrintHours', 8);
  s.targetHourlyProfit = numField('cfgTargetHourlyProfit', 15);
  s.goodHourlyProfit = numField('cfgGoodHourlyProfit', 20);
  s.minProfitPerSale = numField('cfgMinProfitPerSale', 8);
  s.marketByGroup = {};
  editingMarketGroups.forEach(g=>{ s.marketByGroup[g.category] = { min:g.min||0, avg:g.avg||0, max:g.max||0, checkedAt:g.checkedAt||'', note:g.note||'', unitBasis:g.unitBasis==='kit'?'kit':'unidade', kitSize:g.kitSize||1 }; });
  s.customOrderPriceTable = {
    chaveiro: editingCustomOrderPriceTable.chaveiro.filter(t=>t.unitPrice>0),
    lembrancinha: editingCustomOrderPriceTable.lembrancinha.filter(t=>t.unitPrice>0),
    topo_bolo: editingCustomOrderPriceTable.topo_bolo.filter(t=>t.unitPrice>0),
  };
  s.machines = editingMachines.filter(m=>m.name && m.name.trim());
  s.reserveGoals = editingReserveGoals.filter(g=>g.name && g.name.trim());
  saveSettings(); toast('Configurações salvas'); render();
}
function openCloseMonthModal(){
  const { plan, leftover } = previewCloseMonth(currentMonth);
  const rows = plan.map(({goal,alreadyForGoal,need,toAllocate})=>`
    <tr>
      <td data-label="Reserva">${esc(goal.name)}</td>
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
  showModal(`Movimentar: ${esc(g.name)}`, `
    <div class="field"><label>Saldo acumulado atual</label><input value="${brl(g.balance)}" disabled></div>
    <div class="field"><label>Valor a adicionar (use negativo para retirar)</label><input type="number" min="0" id="resDelta" step="0.01" placeholder="Ex: ${g.goal || 100}"></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn primary" onclick="confirmReserve('${id}')">Confirmar</button>
    </div>
  `);
}
function confirmReserve(id){
  const g = state.settings.reserveGoals.find(x=>x.id===id);
  const delta = numField('resDelta');
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
// Pular deixa o nome VAZIO (bizName() cobre a exibição) e marca que já
// perguntamos — antes isso gravava o nome de um negócio real na conta de quem
// pulasse, só pra não cair de novo no passo da marca.
function skipOnboardingBrand(){
  state.settings.brandPromptSeen = true;
  saveSettings(); render(); openOnboardingModal();
}
function confirmOnboardingBrand(){
  const name = document.getElementById('obBusinessName').value.trim();
  state.settings.businessName = name;
  state.settings.businessLogo = editingBusinessLogo;
  state.settings.brandPromptSeen = true;
  saveSettings(); render(); openOnboardingModal();
}
function openOnboardingModal(){
  if(!state.settings.businessName && !state.settings.brandPromptSeen){
    editingBusinessLogo = state.settings.businessLogo || null;
    showModal('Vamos começar', `
      <div class="field hint" style="margin-bottom:16px;">Antes de tudo: como se chama o seu negócio? O nome e a logo aparecem na barra lateral, no catálogo que você manda pro cliente, no recibo de venda e no app instalado no celular — dá pra trocar depois em Configurações.</div>
      <div class="field"><label>Nome do negócio</label><input id="obBusinessName" placeholder="Ex: Minha Loja 3D"></div>
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
  const isEmpty = state.products.length===0 && state.sales.length===0;
  showModal('Vamos configurar seu negócio', `
    <div class="field hint" style="margin-bottom:16px;">Essa é a ordem que faz os números baterem desde a primeira venda. Pode seguir na sequência ou fechar e voltar quando quiser — o link fica no rodapé do menu. O ✓ aparece sozinho quando você já fez aquele passo.</div>
    ${isEmpty ? `<div class="card" style="padding:12px 14px;margin-bottom:12px;background:var(--bg-alt);">
      <div style="font-size:12.5px;color:var(--text-dim);">Quer ver o app funcionando antes de cadastrar o seu? Dá pra carregar um negócio de exemplo, com produtos, vendas e custos fictícios, só pra explorar as telas.</div>
      <button class="btn ghost sm" style="margin-top:8px;" onclick="loadSampleData()">Carregar dados de exemplo</button>
    </div>` : ''}
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
  return `☁️ ${esc(syncStatus.email)}`;
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
        ${hasEmbeddedBackend()
          // Com backend do produto embutido não há o que "desconectar": o
          // getSyncConfig ignora o localStorage e o app reconectaria sozinho
          // no render seguinte, fazendo o botão fingir que funcionou.
          ? `<button class="btn ghost" onclick="closeModal()">Cancelar</button>`
          : `<button class="btn ghost" onclick="disconnectSync()">Desconectar</button>`}
        <div style="display:flex;gap:8px;">
          <button class="btn" onclick="doSyncAuth('signUp')">Criar conta</button>
          <button class="btn primary" onclick="doSyncAuth('signIn')">Entrar</button>
        </div>
      </div>
    `);
    return;
  }
  // Com o backend do produto embutido, o usuário não administra projeto
  // nenhum: nada de SQL de Realtime nem de "esquecer credenciais". Sobra o
  // que faz sentido pra quem assina — de qual conta está logado e como sair.
  const embutido = hasEmbeddedBackend();
  showModal('Sincronização', `
    <div class="field">Conectado como <strong>${esc(syncStatus.email)}</strong>. Os dados são compartilhados entre todos os dispositivos onde você fizer login com essa conta.</div>
    ${embutido ? '' : `
    <div class="field hint" style="margin-top:-4px;">Se você conectou esse projeto antes desta versão, as mudanças de outro dispositivo só aparecem depois de recarregar a página. Pra ativar a atualização automática, rode uma vez no <strong>SQL Editor</strong> do seu projeto Supabase:</div>
    <textarea readonly style="width:100%;height:32px;font-family:var(--font-mono);font-size:10px;margin:0 0 12px;resize:vertical;" onclick="this.select()">alter publication supabase_realtime add table app_data;</textarea>`}
    <div class="modal-actions" style="justify-content:space-between;">
      ${embutido
        ? `<button class="btn ghost" onclick="closeModal()">Fechar</button>`
        : `<button class="btn ghost" onclick="disconnectSync()">Esquecer neste dispositivo</button>`}
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
    // A decisão mora em loginSyncDecision (js/sync-rules.js), testada. Decidir
    // isso sozinho pela data foi o que apagou a conta do dono.
    const decisao = loginSyncDecision({
      cloudHasData: !!(data && data.length),
      localHasData: await hasLocalData(),
    });

    if(decisao === 'offer-upload'){
      if(confirm('Não encontrei dados na nuvem ainda pra essa conta. Enviar os dados que já estão salvos neste dispositivo como ponto de partida?')){
        await saveAll();
        toast('Dados enviados para a nuvem');
      }
    } else {
      if(decisao === 'ask'){
        // Conflito real: os dois lados têm dado. Backup antes de qualquer
        // coisa, e quem escolhe é o usuário.
        exportBackup(true);
        await new Promise(r=>setTimeout(r,300));
        const usarNuvem = confirm(
          'Esta conta já tem dados na nuvem, e este aparelho também tem dados salvos.\n\n' +
          'Por segurança, acabamos de baixar um backup do que está neste aparelho.\n\n' +
          'OK = usar os dados DA NUVEM (substitui os deste aparelho)\n' +
          'Cancelar = manter os DESTE APARELHO e enviá-los para a nuvem'
        );
        if(!usarNuvem){
          await saveAll();
          toast('Dados deste aparelho enviados para a nuvem');
          startRealtimeSync();
          return;
        }
      }
      toast('Puxando dados da nuvem...');
      preferRemoteOnPull = true;
      try{ await loadState(); }
      finally{ preferRemoteOnPull = false; }
      // Grava o que veio da nuvem também neste aparelho, pra ele não ficar
      // com a cópia antiga guardada e voltar a divergir no próximo acesso.
      await saveAll();
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
// Carrega o negócio fictício de sampleData() por cima do que existe hoje —
// SEMPRE com backup automático antes, porque substitui tudo.
async function loadSampleData(){
  const hasData = state.products.length>0 || state.sales.length>0 || state.materials.some(m=>m.costPerUnit>0);
  if(hasData && !confirm('Isso substitui os dados atuais pelos dados de exemplo. Um backup do que existe hoje será baixado antes. Continuar?')) return;
  if(hasData){ exportBackup(true); await new Promise(r=>setTimeout(r,300)); }
  state = sampleData();
  migrateMaterials(state.materials);
  migrateProducts(state.products);
  await saveAll();
  closeModal();
  currentTab = 'dashboard';
  render();
  toast('Dados de exemplo carregados — explore à vontade e use "Recomeçar do zero" quando quiser começar pra valer');
}
async function confirmReset(){
  exportBackup(true);
  await new Promise(r=>setTimeout(r,300));
  // "Recomeçar do zero" = exatamente o mesmo estado de uma conta nova. Antes
  // isso tinha um blankSettings() próprio que esquecia de limpar PIX/contato.
  state = defaultData();
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
  XLSX.writeFile(wb, `${bizSlug()}-vendas-${todayStr()}.xlsx`);
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
  XLSX.writeFile(wb, `${bizSlug()}-clientes-${todayStr()}.xlsx`);
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
  XLSX.writeFile(wb, `${bizSlug()}-pedidos-${todayStr()}.xlsx`);
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
  XLSX.writeFile(wb, `${bizSlug()}-relatorio-${year}.xlsx`);
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
  a.href = url; a.download = `${bizSlug()}-backup-${todayStr()}.json`;
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
      state.settings = Object.assign({}, defaultData().settings, migrateSettings(data.settings || {}));
      state.products = migrateProducts(data.products);
      state.sales = data.sales;
      state.orders = Array.isArray(data.orders) ? data.orders : [];
      state.customers = Array.isArray(data.customers) ? data.customers : [];
      state.printFailures = migratePrintFailures(Array.isArray(data.printFailures) ? data.printFailures : []);
      state.listings = Array.isArray(data.listings) ? data.listings : [];
      state.customOrders = migrateCustomOrders(Array.isArray(data.customOrders) ? data.customOrders : []);
      backfillPrintJobHours();
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
