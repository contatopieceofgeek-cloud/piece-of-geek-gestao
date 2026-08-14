/* ===================== MOTOR DE CÁLCULO =====================
   Custo, preço e consumo de material — separado do app.js pra poder ser
   testado no Node (`node --test`), já que app.js toca document/window e não
   carrega fora do navegador.

   Como o `state` chega aqui: as funções leem a variável global `state` DENTRO
   do corpo, nunca no carregamento. No navegador quem declara é o app.js (que
   carrega depois deste arquivo) — funciona porque a leitura só acontece na
   hora da chamada. Nos testes, basta `globalThis.state = {...}` antes de
   chamar. Isso é de propósito: `state` é REATRIBUÍDO em vários pontos
   (applyLoadedState, confirmReset, loadSampleData, importBackup), então
   guardar uma referência aqui deixaria o motor lendo um estado velho.

   Regra: nada aqui pode tocar DOM, storage ou formatação de exibição. */
/* ===================== CALC HELPERS ===================== */
function materialByName(name){ return state.materials.find(m=>m.name===name); }
function boxCost(boxType){ const m = materialByName(boxType); return m ? m.costPerUnit : 0; }
function filamentCost(type){ const m = materialByName(type); return m ? m.costPerUnit : 0; }
function bubbleWrapMaterial(){ return state.materials.find(m=>m.isBubbleWrap); }
function bubbleWrapUnitCost(){ const m = bubbleWrapMaterial(); return m ? m.costPerUnit : 0; }
function tapeMaterial(){ return state.materials.find(m=>m.isTape); }
function tapeUnitCost(){ const m = tapeMaterial(); return m ? m.costPerUnit : 0; }
function toolCostPerUse(tool){ return tool ? tool.purchasePrice / (tool.usefulLifeUses||1) : 0; }
// Envelope/saquinho não tem altura própria (embalagem achatada e flexível) —
// em vez de comparar 3 eixos como numa caixa rígida, só limita a altura da
// peça a esse teto fixo e compara comprimento/largura contra a embalagem.
const FLAT_PACKAGING_MAX_HEIGHT_CM = 3;
function boxFitsDimensions(box, lengthCm, widthCm, heightCm){
  if(!box || !box.lengthCm || !box.widthCm) return null;
  if(box.isEnvelope || box.isSaquinho){
    if(heightCm > FLAT_PACKAGING_MAX_HEIGHT_CM) return false;
    const prodDims = [lengthCm, widthCm].sort((a,b)=>b-a);
    const pkgDims = [box.lengthCm, box.widthCm].sort((a,b)=>b-a);
    return prodDims[0]<=pkgDims[0] && prodDims[1]<=pkgDims[1];
  }
  if(!box.heightCm) return null;
  const prodDims = [lengthCm, widthCm, heightCm].sort((a,b)=>b-a);
  const boxDims = [box.lengthCm, box.widthCm, box.heightCm].sort((a,b)=>b-a);
  return prodDims[0]<=boxDims[0] && prodDims[1]<=boxDims[1] && prodDims[2]<=boxDims[2];
}
function bestFittingBox(lengthCm, widthCm, heightCm){
  const boxes = state.materials.filter(m=>m.category==='Embalagem' && (m.isBox||m.isEnvelope||m.isSaquinho) && m.lengthCm>0 && m.widthCm>0);
  const fitting = boxes.filter(b=>boxFitsDimensions(b, lengthCm, widthCm, heightCm));
  if(!fitting.length) return null;
  // Entre as que cabem, prioriza a mais barata — não a menor volume. Um
  // envelope de R$0,17 que cabe é melhor que uma caixa de R$1,71 que também cabe.
  fitting.sort((a,b)=>a.costPerUnit-b.costPerUnit);
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
  // Peso e tempo cadastrados são da LEVA inteira (uma impressão pode render
  // várias unidades vendáveis) — todo custo que escala com peso/tempo/mão de
  // obra/ferramentas é dividido por unitsPerPrint pra virar custo POR PEÇA.
  // unitsPerPrint ausente (customOrders, kits, orçamento rápido) cai em 1 —
  // comportamento idêntico ao de antes.
  const printUnits = Math.max(1, prod.unitsPerPrint||1);
  const unitWeightG = totalWeight(prod) / printUnits;
  const unitTimeH = (prod.timeH||0) / printUnits;
  const materialCost = (prod.filaments||[]).reduce((a,f)=>a+(f.weightG||0)*filamentCost(f.materialName),0) / printUnits;
  const energyCost = unitTimeH * machineEnergyCostPerHour(machine);
  const bCost = boxCost(prod.boxType);
  const bubbleCost = prod.bubbleWrapM * bubbleWrapUnitCost();
  const tapeCost = (prod.tapeM||0) * tapeUnitCost();
  const embalagemCost = bCost + bubbleCost + tapeCost;
  const depreciation = unitTimeH * machineDeprCostPerHour(machine);
  const maintenance = unitTimeH * machineMaintenanceCostPerHour(machine);
  const totalLaborMinutes = (prod.laborActions||[]).reduce((a,x)=>a+(x.minutes||0),0) / printUnits;
  const laborCost = (totalLaborMinutes/60) * (s.laborHourlyRate||0);
  const toolsCost = (prod.toolsUsed||[]).reduce((a,t)=>a+(t.uses||0)*toolCostPerUse(state.materials.find(x=>x.id===t.toolId)),0) / printUnits;
  // Embalagem fica de fora (caixa/bolha não são gastos numa impressão que falha),
  // mas metade da mão de obra entra — setup e a descoberta da falha consomem tempo.
  const failureCost = (materialCost + energyCost + depreciation + laborCost*0.5) * prod.failureMarginPct;
  // unitsPerPrint (leva) ≠ unitsPerSale (anúncio/kit) — uma leva de 4 pode ser
  // vendida avulsa (unitsPerSale=1) ou em kit de 4. O custo POR PEÇA acima
  // multiplica pelas peças do anúncio; a embalagem entra SÓ UMA VEZ, porque
  // uma venda de 4 peças no mesmo kit usa uma caixa, não quatro.
  const saleUnits = Math.max(1, prod.unitsPerSale||1);
  const saleWeightG = unitWeightG * saleUnits;
  const saleTimeH = unitTimeH * saleUnits;
  // Componentes inclusos no pacote (parafuso, tag, cordão...) — NÃO é material
  // impresso, então fica de fora do custo por peça, igual embalagem. scope
  // 'peca' já vem multiplicado por saleUnits aqui dentro; 'venda' é uma vez só.
  const componentsCost = (prod.components||[]).reduce((a,comp)=>{
    const mat = state.materials.find(x=>x.id===comp.materialId);
    if(!mat) return a;
    const mult = comp.scope==='peca' ? saleUnits : 1;
    return a + (comp.qty||0)*mat.costPerUnit*mult;
  }, 0);
  const totalCost = (materialCost + energyCost + depreciation + maintenance + failureCost + laborCost + toolsCost) * saleUnits + embalagemCost + componentsCost;
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
  return { printUnits, saleUnits, unitWeightG, unitTimeH, saleWeightG, saleTimeH, materialCost, energyCost, boxCost:bCost, bubbleCost, tapeCost, embalagemCost, componentsCost, depreciation, maintenance, laborCost, totalLaborMinutes, toolsCost, failureCost, totalCost, suggestedPrice, suggestedPriceMl, suggestedPriceShopee, suggestedPriceExtra, practicedPrice, practicedPriceMl, practicedPriceShopee, practicedPriceExtra, estimatedShopeeFreightCap, mlFeeAmount, shopeeFeeAmount, mlFeePct, shopeeFeePct, effectiveFreightMl, effectiveFreightShopee, netReceiptMl, netReceiptShopee, marginValue, marginPct, marginMlValue, marginShopeeValue, marginMlPct, marginShopeePct, desiredMarginPct: desiredMargin*100, machine };
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

/* ===== Modelo de precificação por R$/hora-máquina (blocos 4-6) =====
   O recurso escasso é hora de impressora, não grama de filamento — o preço
   vem do mercado (input), o R$/hora é o resultado e o critério de aceite.
   Produtos é exclusivamente marketplace (venda sob medida vive em
   Personalizados) — todo canal aqui é ML/Shopee/plataforma extra, nunca
   "venda direta". channelName sempre precisa ser o nome de uma plataforma. */
// Taxa + frete líquido do canal num preço específico — mesma lógica que
// calcProduct() já usa (effectiveFreightMl/effectiveFreightShopee, e a taxa
// REAL do ML quando já foi buscada via mlRealFeePct) — é a função que faz o
// Diagnóstico bater com a margem que a tela de Produtos já mostrava certo.
function channelFeeAt(channelName, price, prod){
  if(!channelName || !(price>0)) return 0;
  let fee;
  if(channelName==='Mercado Livre' && prod && prod.mlRealFeePct!=null){
    fee = price * Math.min(0.95, prod.mlRealFeePct/100);
  } else {
    fee = feeAtPrice(channelName, price);
  }
  let freight = 0;
  if(prod){
    if(channelName==='Mercado Livre') freight = prod.estimatedFreightMl||0;
    else if(channelName==='Shopee') freight = Math.max(0, (prod.estimatedFreightShopee||0) - (shopeeFreightCap(price)||0));
  }
  return fee + freight;
}
// (preço − taxa/frete do canal − custo da venda) ÷ tempo por venda — totalCost
// já cobre as unitsPerSale peças do anúncio, então o tempo tem que ser o
// mesmo (saleTimeH), não o tempo de uma peça só.
function profitPerHourAt(c, channelName, price, prod){
  if(!(c.saleTimeH>0) || !(price>0)) return null;
  return (price - channelFeeAt(channelName, price, prod) - c.totalCost) / c.saleTimeH;
}
// Preço mínimo pra bater a meta de R$/hora configurada, já com frete embutido.
// Reaproveita suggestedPriceForPlatform (mesma iteração que o resto do app já
// usa pra taxa em faixas + subsídio de frete da Shopee por preço).
function minPriceForTarget(c, channelName, prod){
  if(!(c.saleTimeH>0) || !channelName) return null;
  const target = state.settings.targetHourlyProfit!=null ? state.settings.targetHourlyProfit : 15;
  const needNet = target*c.saleTimeH + c.totalCost;
  const freight = channelName==='Mercado Livre' ? ((prod&&prod.estimatedFreightMl)||0) : channelName==='Shopee' ? ((prod&&prod.estimatedFreightShopee)||0) : 0;
  if(channelName==='Mercado Livre' && prod && prod.mlRealFeePct!=null){
    const pct = Math.min(0.95, prod.mlRealFeePct/100);
    return pct<1 ? (needNet+freight)/(1-pct) : needNet+freight;
  }
  return suggestedPriceForPlatform(needNet, channelName, freight);
}
// Dado um preço de referência (mercado da categoria ou exceção do produto, já
// escalado pra unitsPerSale — ver effectiveMarketPrice), quanto tempo de
// impressão AINDA BATE a meta de R$/hora pra essa venda inteira — pode sair
// negativo (nem a preço de mercado dá pra bater a meta em tempo nenhum).
function maxTimeAtMarketPrice(c, channelName, marketPrice, prod){
  const target = state.settings.targetHourlyProfit!=null ? state.settings.targetHourlyProfit : 15;
  if(marketPrice==null || !(target>0)) return null;
  return (marketPrice - channelFeeAt(channelName, marketPrice, prod) - c.totalCost) / target;
}
// Preço de mercado efetivo do produto: exceção da peça (já no valor da VENDA
// dessa peça, sem conversão — é override manual), senão a faixa da categoria
// escalada de "por unidade" ou "por kit de N" pra unitsPerSale deste produto.
// Comparar preço de kit com faixa cadastrada por unidade (ou vice-versa) sem
// escalar induz erro — ver ponto 5 do pedido que motivou isso.
function effectiveMarketPrice(prod){
  const g = (state.settings.marketByGroup||{})[prod.category||''] || {};
  const saleUnits = Math.max(1, prod.unitsPerSale||1);
  const basisUnits = g.unitBasis==='kit' ? Math.max(1, g.kitSize||1) : 1;
  const scale = saleUnits/basisUnits;
  const hasOverride = prod.marketPriceOverride>0;
  const value = hasOverride ? prod.marketPriceOverride : (g.avg>0 ? g.avg*scale : null);
  const source = hasOverride ? 'override' : (g.avg>0 ? 'category' : 'none');
  return {
    value, source,
    min: g.min>0 ? g.min*scale : 0, max: g.max>0 ? g.max*scale : 0, avg: g.avg>0 ? g.avg*scale : 0,
    unitBasis: g.unitBasis==='kit' ? 'kit' : 'unidade', kitSize: g.kitSize||1,
    rawMin: g.min||0, rawAvg: g.avg||0, rawMax: g.max||0, scale,
  };
}
// Preço de tabela (por unidade, com desconto por faixa) pra Personalizados —
// faixa sem "até" cadastrado cobre tudo dali pra cima. null = sem tabela
// pra esse tipo (não bloqueia nada, o Diagnóstico só deixa de comparar).
function tablePriceFor(orderType, qty){
  const tiers = (state.settings.customOrderPriceTable||{})[orderType];
  if(!tiers || !tiers.length || !(qty>0)) return null;
  const tier = tiers.find(t=>qty>=(t.minQty||1) && qty<=(t.maxQty>0?t.maxQty:Infinity));
  return tier ? tier.unitPrice*qty : null;
}
// absoluteProfit (R$ por venda, já líquido de taxa+frete) sobrepõe o veredito
// por hora quando fica abaixo do piso configurado — um R$/hora ótimo não
// significa nada se cada venda individual mal cobre o cafezinho: um produto
// que "compensa" só em volume gigantesco (milhares de vendas) é risco, não meta.
function hourlyVerdict(hourlyProfit, absoluteProfit){
  if(hourlyProfit==null) return { label:'—', cls:'mut' };
  const target = state.settings.targetHourlyProfit!=null ? state.settings.targetHourlyProfit : 15;
  const good = state.settings.goodHourlyProfit!=null ? state.settings.goodHourlyProfit : 20;
  const minProfit = state.settings.minProfitPerSale!=null ? state.settings.minProfitPerSale : 8;
  if(hourlyProfit>=target && absoluteProfit!=null && absoluteProfit<minProfit){
    return { label:'Lucro por venda baixo demais', cls:'bad' };
  }
  if(hourlyProfit>=good) return { label:'Bom produto', cls:'ok' };
  if(hourlyProfit>=target) return { label:'Aceitável', cls:'info' };
  if(hourlyProfit>=target*0.6) return { label:'Revisar tempo ou preço', cls:'warn' };
  return { label:'Não compensa imprimir', cls:'bad' };
}

/* recipe consumption for 1 unit of a product */
function productRecipe(prod){
  // Componente 'peca' multiplica pelas peças da venda (2 parafusos por peça,
  // kit de 3 leva 6); 'venda' é uma vez só, igual embalagem — ver calcProduct.
  const saleUnits = Math.max(1, prod.unitsPerSale||1);
  return [
    ...(prod.filaments||[]).map(f=>({ materialName: f.materialName, qty: f.weightG })),
    { materialName: prod.boxType, qty: 1 },
    { materialName: (bubbleWrapMaterial()||{}).name || 'Plástico Bolha', qty: prod.bubbleWrapM },
    { materialName: (tapeMaterial()||{}).name || 'Fita Adesiva', qty: prod.tapeM||0 },
    ...(prod.components||[]).map(comp=>{
      const mat = state.materials.find(x=>x.id===comp.materialId);
      return { materialName: mat ? mat.name : null, qty: (comp.qty||0) * (comp.scope==='peca' ? saleUnits : 1) };
    }),
  ];
}

function componentMaterialNames(prod){
  return new Set((prod.components||[]).map(comp=>{ const m = state.materials.find(x=>x.id===comp.materialId); return m ? m.name : null; }));
}
function printJobRecipe(prod){
  const bw = (bubbleWrapMaterial()||{}).name || 'Plástico Bolha';
  const tp = (tapeMaterial()||{}).name || 'Fita Adesiva';
  const compNames = componentMaterialNames(prod);
  return productRecipe(prod).filter(r=>r.materialName!==prod.boxType && r.materialName!==bw && r.materialName!==tp && !compNames.has(r.materialName));
}
function packagingRecipe(prod){
  const bw = (bubbleWrapMaterial()||{}).name || 'Plástico Bolha';
  const tp = (tapeMaterial()||{}).name || 'Fita Adesiva';
  return productRecipe(prod).filter(r=>r.materialName===prod.boxType || r.materialName===bw || r.materialName===tp);
}
// Componentes têm baixa e bloqueio de venda separados de caixa/bolha/fita
// (essas só avisam se ficar negativo — ver confirmSale) — por isso ficam
// numa recipe própria em vez de dentro de packagingRecipe.
function componentsRecipe(prod){
  const compNames = componentMaterialNames(prod);
  return productRecipe(prod).filter(r=>compNames.has(r.materialName));
}

function computeTieredFee(tiers, amount, units){
  const tier = tiers.find(t => amount <= t.max) || tiers[tiers.length-1];
  const u = units!=null ? units : 1;
  return { fee: amount*(tier.pct/100) + tier.fixed*u, tier };
}

function extraListingPlatforms(){
  return (state.settings.platforms||[]).filter(p=>p.listingTemplate);
}
/* ===== Invariantes de estoque, num lugar só =====
   Estas quatro regras estavam escritas à mão em confirmPrintJob, confirmSale
   e deleteSale — e já quebraram na prática (ver pegadinha #8 do CLAUDE.md).
   Ficam aqui como função nomeada e testada, pra existir uma fonte só. */
// Peças que saem de UMA leva/impressão.
function printUnitsOf(prod){ return Math.max(1, (prod && prod.unitsPerPrint) || 1); }
// Peças que vão em UMA venda/anúncio/kit.
function saleUnitsOf(prod){ return Math.max(1, (prod && prod.unitsPerSale) || 1); }
// Registrar N impressões concluídas soma N × peças-por-leva ao estoque —
// nunca N. Bug real: 1 impressão de uma leva de 12 somava 1.
function piecesFromPrintJob(prod, jobQty){ return (jobQty||0) * printUnitsOf(prod); }
// Baixa da venda: qty é número de VENDAS/kits, não de peças.
function piecesForSale(saleUnits, qty){ return (qty||0) * Math.max(1, saleUnits||1); }
// Desfazer venda usa o snapshot GRAVADO nela, nunca o cadastro atual do
// produto — senão mudar o tamanho do kit reescreve o histórico.
function saleUnitsOfSale(sale){ return Math.max(1, (sale && sale.unitsPerSaleSnapshot) || 1); }

/* Horas de máquina que um registro de impressão consumiu.
   Sempre o que o REGISTRO gravou, nunca recalculado do cadastro atual do
   produto. Bug real: o estorno (editar/excluir) refazia a conta com o
   `prod.timeH` de agora — quem mudasse o tempo do produto entre registrar e
   excluir devolvia à máquina um número diferente do que tinha entrado, e o
   contador de horas (base do R$/hora e da depreciação) ia derivando sem
   ninguém notar. Registro antigo, sem o campo, cai na fórmula velha, que era
   correta na época em que ele foi gravado. */
function machineHoursOfJob(job, prod){
  if(!job) return 0;
  if(job.hoursUsed != null) return job.hoursUsed;
  const pct = job.pctComplete != null ? job.pctComplete : 100;
  return (job.qty || 1) * ((prod && prod.timeH) || 0) * (pct / 100);
}

/* Despesas/impostos que valem no mês `ym`.
   A lista é FLAT, sem histórico: sem esse recorte, uma despesa cadastrada hoje
   era cobrada de TODOS os meses, inclusive os anteriores a ela existir — o
   export Anual repetia a mesma assinatura de janeiro a dezembro. `startMonth`
   em branco = vale desde sempre, que era o comportamento antes do campo. */
function activeInMonth(list, ym){
  return (list || []).filter(item => !item.startMonth || item.startMonth <= ym);
}
function sumActiveInMonth(list, ym){
  return activeInMonth(list, ym).reduce((a, item) => a + (item.value || 0), 0);
}

// Ponte pro Node (no navegador `module` não existe e este bloco é ignorado).
if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    activeInMonth, sumActiveInMonth, machineHoursOfJob,
    materialByName, boxCost, filamentCost, bubbleWrapMaterial, bubbleWrapUnitCost,
    tapeMaterial, tapeUnitCost, toolCostPerUse, FLAT_PACKAGING_MAX_HEIGHT_CM,
    boxFitsDimensions, bestFittingBox, totalWeight, findMachine,
    machineDeprCostPerHour, machineEnergyCostPerHour, machineMaintenanceCostPerHour,
    calcProduct, shopeeFreightCap, suggestedPriceForPlatform, feeAtPrice,
    channelFeeAt, profitPerHourAt, minPriceForTarget, maxTimeAtMarketPrice,
    effectiveMarketPrice, tablePriceFor, hourlyVerdict, productRecipe,
    componentMaterialNames, printJobRecipe, packagingRecipe, componentsRecipe,
    computeTieredFee, extraListingPlatforms,
    printUnitsOf, saleUnitsOf, piecesFromPrintJob, piecesForSale, saleUnitsOfSale,
  };
}
