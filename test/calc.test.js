/* Testes do motor de cálculo — `node --test`, sem dependência nenhuma.
   Cada teste aqui trava um bug que JÁ ACONTECEU de verdade (ver "Pegadinhas
   já resolvidas" no CLAUDE.md). Se um deles quebrar, não é o teste que está
   errado: é um cálculo de dinheiro que voltou a errar. */
const test = require('node:test');
const assert = require('node:assert');

const calc = require('../app/js/calc.js');

// --- Estado mínimo controlado ---------------------------------------------
// calc.js lê a global `state` no momento da chamada; os testes montam a sua.
function setState(over){
  globalThis.state = Object.assign({
    materials: [
      { id:'fil', name:'PLA Preto', category:'Filamento', unit:'g', costPerUnit:0.10 },
      { id:'cx',  name:'Caixa Pequena', category:'Embalagem', unit:'un', costPerUnit:1.50, isBox:true, lengthCm:16, widthCm:11, heightCm:6 },
      { id:'env', name:'Envelope 15x25', category:'Embalagem', unit:'un', costPerUnit:0.17, isEnvelope:true, lengthCm:25, widthCm:15, heightCm:0 },
      { id:'bol', name:'Plástico Bolha', category:'Embalagem', unit:'m', costPerUnit:0.50, isBubbleWrap:true },
      { id:'fit', name:'Fita Adesiva', category:'Embalagem', unit:'m', costPerUnit:0.20, isTape:true },
      { id:'paraf', name:'Parafuso', category:'Componentes', unit:'un', costPerUnit:0.05 },
    ],
    products: [], sales: [],
    settings: {
      // Máquina com custo zero de propósito: energia/depreciação/manutenção
      // aqui só somariam ruído às contas que estes testes querem verificar.
      machines: [{ id:'m1', name:'Impressora', price:0, residual:0, lifeHours:4000,
                   powerConsumptionKw:0, energyCostPerHour:0, maintenanceCostPerHour:0 }],
      energyTariffPerKwh: 0, laborHourlyRate: 0, markupMultiplier: 2.5,
      platforms: [{ id:'p1', name:'Mercado Livre', pct:0, fixed:0 }],
      targetHourlyProfit: 15, goodHourlyProfit: 20, minProfitPerSale: 8,
      marketByGroup: {}, customOrderPriceTable: {},
    },
  }, over||{});
}

// Produto base: 1 peça por leva, 1 por venda, sem embalagem nem componentes.
function produto(over){
  return Object.assign({
    id:'p', name:'Teste', filaments:[{materialName:'PLA Preto', weightG:100}],
    timeH:1, unitsPerPrint:1, unitsPerSale:1, boxType:'', bubbleWrapM:0, tapeM:0,
    failureMarginPct:0, machineId:'m1', laborActions:[], toolsUsed:[], components:[], stock:0,
  }, over||{});
}

// --- 1. Embalagem entra uma vez por VENDA, não por peça --------------------
test('embalagem entra uma vez por venda, não por peça', () => {
  setState();
  const avulso = calc.calcProduct(produto({ boxType:'Caixa Pequena' }));
  const kit4   = calc.calcProduct(produto({ boxType:'Caixa Pequena', unitsPerPrint:4, unitsPerSale:4 }));

  assert.strictEqual(avulso.embalagemCost, 1.50);
  assert.strictEqual(kit4.embalagemCost, 1.50, 'kit de 4 usa UMA caixa, não quatro');

  // O material escala com as 4 peças; a embalagem não.
  assert.ok(Math.abs(kit4.materialCost - avulso.materialCost/4) < 1e-9, 'custo por peça divide pela leva');
  assert.ok(Math.abs(kit4.totalCost - (avulso.materialCost + 1.50)) < 1e-9,
    'venda de 4 = material das 4 peças (= 1 leva) + 1 caixa');
});

// --- 2. Componente scope 'peca' multiplica por unitsPerSale ----------------
test("componente scope 'peca' multiplica por unitsPerSale; 'venda' não", () => {
  setState();
  const porPeca = calc.calcProduct(produto({
    unitsPerPrint:12, unitsPerSale:3, components:[{materialId:'paraf', qty:2, scope:'peca'}],
  }));
  const porVenda = calc.calcProduct(produto({
    unitsPerPrint:12, unitsPerSale:3, components:[{materialId:'paraf', qty:2, scope:'venda'}],
  }));

  // 2 parafusos × 3 peças = 6 × R$0,05
  assert.ok(Math.abs(porPeca.componentsCost - 0.30) < 1e-9, '6 parafusos no kit de 3');
  // 2 parafusos, uma vez só
  assert.ok(Math.abs(porVenda.componentsCost - 0.10) < 1e-9, "'venda' não multiplica");

  // Componente NÃO entra no custo por peça (não é material impresso)
  const semComp = calc.calcProduct(produto({ unitsPerPrint:12, unitsPerSale:3 }));
  assert.strictEqual(semComp.materialCost, porPeca.materialCost);
});

// --- 3. desiredMarginPct é percentual cru (60), não fração (0.60) ----------
test('desiredMarginPct 60 significa 60%, não 0,6%', () => {
  setState();
  const c = calc.calcProduct(produto({ desiredMarginPct:60 }));
  // custo 10 com margem 60% => preço 25 (a margem é sobre o PREÇO, não o custo)
  assert.ok(Math.abs(c.totalCost - 10) < 1e-9);
  assert.ok(Math.abs(c.suggestedPrice - 25) < 1e-9, 'custo ÷ (1 − 0,60) = 25');
  assert.ok(Math.abs(c.desiredMarginPct - 60) < 1e-9, 'volta como 60, não 0,6');
});

// --- 4. Estoque soma qty × peças-por-leva na impressão ---------------------
test('impressão concluída soma qty × unitsPerPrint em peças', () => {
  const leva12 = produto({ unitsPerPrint:12 });
  assert.strictEqual(calc.piecesFromPrintJob(leva12, 1), 12, '1 impressão de leva 12 = 12 peças');
  assert.strictEqual(calc.piecesFromPrintJob(leva12, 3), 36);
  // Produto sem unitsPerPrint (customOrders, kits) cai em 1 — comportamento antigo
  assert.strictEqual(calc.piecesFromPrintJob(produto(), 5), 5);
  assert.strictEqual(calc.piecesFromPrintJob({}, 2), 2);
});

// --- 5. Desfazer venda usa o snapshot, nunca o cadastro atual --------------
test('venda usa unitsPerSaleSnapshot, não o valor vivo do produto', () => {
  const vendaAntiga = { qty:2, unitsPerSaleSnapshot:3 };
  assert.strictEqual(calc.saleUnitsOfSale(vendaAntiga), 3);
  assert.strictEqual(calc.piecesForSale(calc.saleUnitsOfSale(vendaAntiga), vendaAntiga.qty), 6);

  // O produto virou kit de 6 DEPOIS da venda: desfazer tem que devolver 6, não 12.
  const produtoHoje = produto({ unitsPerSale:6 });
  assert.notStrictEqual(calc.saleUnitsOf(produtoHoje), calc.saleUnitsOfSale(vendaAntiga));
  assert.strictEqual(calc.piecesForSale(calc.saleUnitsOfSale(vendaAntiga), 2), 6,
    'devolve o tamanho do kit DA ÉPOCA da venda');

  // Venda antiga sem snapshot cai em 1:1 (comportamento anterior à mudança)
  assert.strictEqual(calc.saleUnitsOfSale({ qty:2 }), 1);
});

// --- 6. Taxa fixa do marketplace é por unidade vendida, não por pedido -----
test('taxa fixa multiplica por unidade vendida, não uma vez por pedido', () => {
  const tiers = [{ max:Infinity, pct:10, fixed:6.50 }];
  const uma  = calc.computeTieredFee(tiers, 100, 1);
  const duas = calc.computeTieredFee(tiers, 200, 2);

  assert.ok(Math.abs(uma.fee - 16.50) < 1e-9, '10% de 100 + 6,50');
  assert.ok(Math.abs(duas.fee - 33.00) < 1e-9, '10% de 200 + 2 × 6,50');

  // Sem informar unidades, mantém o comportamento antigo (1×) — os outros
  // chamadores (channelFeeAt, minPriceForTarget) dependem disso.
  assert.ok(Math.abs(calc.computeTieredFee(tiers, 100).fee - 16.50) < 1e-9);
});

// --- Extras: regras que também já custaram caro ---------------------------
test('envelope só aceita peça baixa e a mais barata que cabe ganha', () => {
  setState();
  const env = globalThis.state.materials.find(m => m.id === 'env');

  assert.strictEqual(calc.boxFitsDimensions(env, 10, 8, 2), true, 'peça fina cabe no envelope');
  assert.strictEqual(calc.boxFitsDimensions(env, 10, 8, 5), false,
    `peça acima de ${calc.FLAT_PACKAGING_MAX_HEIGHT_CM}cm não cabe em embalagem achatada`);

  // Envelope (R$0,17) e caixa (R$1,50) cabem; ganha a mais barata, não a menor.
  const melhor = calc.bestFittingBox(10, 8, 2);
  assert.strictEqual(melhor.name, 'Envelope 15x25');
});

test('R$/hora usa o tempo da VENDA inteira, não o de uma peça', () => {
  setState();
  const p = produto({ unitsPerPrint:1, unitsPerSale:3, timeH:1 });
  const c = calc.calcProduct(p);
  assert.strictEqual(c.saleTimeH, 3, '3 peças por venda × 1h cada');

  // Lucro 30 em 3h = R$10/h (e não R$30/h, que seria usar o tempo de 1 peça)
  const hora = calc.profitPerHourAt(c, 'Mercado Livre', c.totalCost + 30, p);
  assert.ok(Math.abs(hora - 10) < 1e-9);
});

test('veredito derruba produto com R$/hora bom mas lucro por venda irrisório', () => {
  setState();
  // 200/h está acima da meta (15) e do "bom" (20), mas R$2 por venda < piso R$8
  assert.strictEqual(calc.hourlyVerdict(200, 2).label, 'Lucro por venda baixo demais');
  assert.strictEqual(calc.hourlyVerdict(200, 50).label, 'Bom produto');
  assert.strictEqual(calc.hourlyVerdict(16, 50).label, 'Aceitável');
  assert.strictEqual(calc.hourlyVerdict(2, 50).label, 'Não compensa imprimir');
});

test('faixa de mercado por kit é escalada pro tamanho da venda', () => {
  setState();
  globalThis.state.settings.marketByGroup = {
    Chaveiros: { min:10, avg:20, max:30, unitBasis:'kit', kitSize:2 },
  };
  // Faixa cadastrada por kit de 2; este produto vende kit de 6 => escala 3×
  const info = calc.effectiveMarketPrice({ category:'Chaveiros', unitsPerSale:6 });
  assert.strictEqual(info.avg, 60);
  assert.strictEqual(info.source, 'category');

  // Exceção do produto NÃO é escalada (já é o preço daquela venda)
  const override = calc.effectiveMarketPrice({ category:'Chaveiros', unitsPerSale:6, marketPriceOverride:99 });
  assert.strictEqual(override.value, 99);
  assert.strictEqual(override.source, 'override');
});

test('recipes separam impressão, embalagem e componentes', () => {
  setState();
  const p = produto({
    unitsPerPrint:12, unitsPerSale:3, boxType:'Envelope 15x25', bubbleWrapM:0.5, tapeM:0.2,
    components:[{materialId:'paraf', qty:2, scope:'peca'}],
  });
  const nome = r => r.materialName;

  // A impressão gasta filamento; não gasta embalagem nem componente.
  assert.deepStrictEqual(calc.printJobRecipe(p).map(nome), ['PLA Preto']);
  // Embalagem é por venda.
  assert.deepStrictEqual(calc.packagingRecipe(p).map(nome).sort(),
    ['Envelope 15x25', 'Fita Adesiva', 'Plástico Bolha']);
  // Componente: 2 por peça × 3 peças do kit.
  const comps = calc.componentsRecipe(p);
  assert.deepStrictEqual(comps.map(nome), ['Parafuso']);
  assert.strictEqual(comps[0].qty, 6);
});

// ===========================================================================
//  Despesas/impostos por mês de início (pegadinha #9 do CLAUDE.md)
// ===========================================================================
test('sumActiveInMonth só conta despesa a partir do mês da 1ª cobrança', () => {
  const despesas = [
    { name:'Assinatura', value:39.90, startMonth:'2026-07' },
    { name:'Anúncio',    value:100,   startMonth:'2026-09' },
  ];
  // Bug real: o export Anual repetia a mesma assinatura de janeiro a dezembro
  // mesmo o negócio tendo começado em julho.
  assert.strictEqual(calc.sumActiveInMonth(despesas, '2026-06'), 0, 'antes da 1ª cobrança, nada');
  assert.strictEqual(calc.sumActiveInMonth(despesas, '2026-07'), 39.90, 'no mês da 1ª cobrança, já conta');
  assert.strictEqual(calc.sumActiveInMonth(despesas, '2026-08'), 39.90, 'segue contando nos meses seguintes');
  assert.strictEqual(calc.sumActiveInMonth(despesas, '2026-09'), 139.90, 'a segunda entra quando chega a vez dela');
  // Comparação é de string 'AAAA-MM', então a virada de ano tem que funcionar.
  assert.strictEqual(calc.sumActiveInMonth(despesas, '2027-01'), 139.90, 'ano seguinte continua contando');
});

test('sumActiveInMonth: sem data preenchida, vale desde sempre', () => {
  // Preserva o comportamento de antes do campo existir — é o que os dados
  // já cadastrados recebem na migração, pra ninguém ver total mudar sozinho.
  const lista = [{ name:'DAS-MEI', value:76, startMonth:'' }, { name:'Contador', value:120 }];
  assert.strictEqual(calc.sumActiveInMonth(lista, '2020-01'), 196);
  assert.strictEqual(calc.sumActiveInMonth(lista, '2030-12'), 196);
  assert.strictEqual(calc.sumActiveInMonth(null, '2026-08'), 0, 'lista ausente não quebra');
});
