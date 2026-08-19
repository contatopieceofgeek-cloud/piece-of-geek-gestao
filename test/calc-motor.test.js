/* Cobertura do resto do motor de cálculo — `node --test`, sem dependência.

   O calc.test.js ao lado trava os bugs que JÁ aconteceram. Estas funções não
   tinham teste nenhum, e a maioria não tem histórico de bug: aqui o que fica
   travado é a REGRA de negócio que elas implementam, e o comportamento nas
   bordas que o app encontra de verdade (material apagado, lista vazia,
   divisão por zero). Se um destes quebrar, alguma regra mudou sem querer. */
const test = require('node:test');
const assert = require('node:assert');

const calc = require('../app/js/calc.js');

// --- Estado mínimo ---------------------------------------------------------
// calc.js lê a global `state` na hora da chamada; cada teste monta a sua.
const MATERIAIS = [
  { id:'fil',   name:'PLA Preto',      category:'Filamento',  unit:'g',  costPerUnit:0.10 },
  { id:'cx',    name:'Caixa Pequena',  category:'Embalagem',  unit:'un', costPerUnit:1.50, isBox:true },
  { id:'bol',   name:'Plástico Bolha', category:'Embalagem',  unit:'m',  costPerUnit:0.50, isBubbleWrap:true },
  { id:'fit',   name:'Fita Adesiva',   category:'Embalagem',  unit:'m',  costPerUnit:0.20, isTape:true },
  { id:'paraf', name:'Parafuso',       category:'Componentes',unit:'un', costPerUnit:0.05 },
];
function setState(over){
  const s = Object.assign({
    machines: [], platforms: [], marketByGroup: {}, customOrderPriceTable: {},
    energyTariffPerKwh: 0, laborHourlyRate: 0, markupMultiplier: 2.5,
    targetHourlyProfit: 15, goodHourlyProfit: 20,
  }, (over && over.settings) || {});
  globalThis.state = Object.assign({ materials: MATERIAIS, products: [], sales: [] },
    over || {}, { settings: s });
}
function produto(over){
  return Object.assign({
    id:'p', name:'Teste', filaments:[{materialName:'PLA Preto', weightG:100}],
    timeH:1, unitsPerPrint:1, unitsPerSale:1, boxType:'', bubbleWrapM:0, tapeM:0,
    failureMarginPct:0, laborActions:[], toolsUsed:[], components:[], machineId:'m1',
  }, over||{});
}

const ML = { id:'ml', name:'Mercado Livre', pct:10, fixed:0 };
const COM_FIXO = { id:'ot', name:'Outro', pct:10, fixed:5 };
const SHOPEE = { id:'sh', name:'Shopee', pct:14, fixed:26,
  tiers:[
    { max:7.99,     pct:50, fixed:0 },
    { max:79.99,    pct:20, fixed:4 },
    { max:99.99,    pct:14, fixed:16 },
    { max:Infinity, pct:14, fixed:26 },
  ],
  freightCapTiers:[
    { max:79.99,    cap:20 },
    { max:199.99,   cap:30 },
    { max:Infinity, cap:40 },
  ]};

// ===========================================================================
//  PREÇO E TAXA POR PLATAFORMA
//  suggestedPriceForPlatform resolve por aproximações sucessivas, porque a
//  taxa depende do preço e o preço depende da taxa.
// ===========================================================================
test('suggestedPriceForPlatform: o preço encontrado paga a taxa e sobra o alvo', () => {
  setState({ settings:{ platforms:[ML] } });
  const preco = calc.suggestedPriceForPlatform(100, 'Mercado Livre');
  assert.ok(Math.abs(preco - 111.11) < 0.02, `esperava ~111,11, veio ${preco.toFixed(2)}`);
  // A prova que importa: descontada a taxa NESSE preço, tem que sobrar o alvo.
  // É isso que evita o erro clássico de somar 10% em vez de dividir por 0,9.
  assert.ok(Math.abs(preco - calc.feeAtPrice('Mercado Livre', preco) - 100) < 0.01);
});

test('suggestedPriceForPlatform: taxa fixa também precisa ser coberta', () => {
  setState({ settings:{ platforms:[COM_FIXO] } });
  const preco = calc.suggestedPriceForPlatform(100, 'Outro');
  assert.ok(Math.abs(preco - calc.feeAtPrice('Outro', preco) - 100) < 0.01);
  assert.ok(preco > 111.11, 'com taxa fixa o preço tem que passar do caso só-percentual');
});

test('suggestedPriceForPlatform: plataforma inexistente não inventa taxa', () => {
  setState({ settings:{ platforms:[ML] } });
  assert.strictEqual(calc.suggestedPriceForPlatform(100, 'Não Existe'), 100);
  assert.strictEqual(calc.suggestedPriceForPlatform(100, 'Não Existe', 7), 107,
    'sem plataforma, sobra o alvo mais o custo extra, sem margem pra taxa');
  assert.strictEqual(calc.feeAtPrice('Não Existe', 500), 0);
});

test('suggestedPriceForPlatform: na Shopee só o frete ACIMA do subsídio encarece', () => {
  setState({ settings:{ platforms:[SHOPEE] } });
  const semFrete     = calc.suggestedPriceForPlatform(40, 'Shopee', 0);
  const freteCoberto = calc.suggestedPriceForPlatform(40, 'Shopee', 15);
  assert.ok(Math.abs(semFrete - freteCoberto) < 0.01,
    'frete dentro do teto do subsídio não sai do bolso, então não muda o preço');
  const freteAlto = calc.suggestedPriceForPlatform(40, 'Shopee', 50);
  assert.ok(freteAlto > freteCoberto, 'o que passa do subsídio precisa entrar no preço');
});

test('feeAtPrice: com tabela de faixas, a faixa vem do preço', () => {
  setState({ settings:{ platforms:[SHOPEE] } });
  assert.ok(Math.abs(calc.feeAtPrice('Shopee', 50) - (50*0.20 + 4))  < 1e-9);
  assert.ok(Math.abs(calc.feeAtPrice('Shopee', 90) - (90*0.14 + 16)) < 1e-9);
  // O degrau que o painel de Taxas mostra: R$90 paga MAIS que R$79,99, apesar
  // do percentual ser menor, porque o valor fixo da faixa sobe.
  assert.ok(calc.feeAtPrice('Shopee', 90) > calc.feeAtPrice('Shopee', 79.99));
});

test('shopeeFreightCap: teto do frete grátis sai da faixa do preço', () => {
  setState({ settings:{ platforms:[SHOPEE] } });
  assert.strictEqual(calc.shopeeFreightCap(50), 20);
  assert.strictEqual(calc.shopeeFreightCap(150), 30);
  assert.strictEqual(calc.shopeeFreightCap(500), 40, 'acima da última faixa, usa a última');
  // Sem Shopee cadastrada devolve null, não zero: zero significaria "não
  // subsidia nada", que é uma afirmação diferente de "não sei".
  setState({ settings:{ platforms:[ML] } });
  assert.strictEqual(calc.shopeeFreightCap(50), null);
});

// ===========================================================================
//  CUSTO DE MÁQUINA POR HORA
// ===========================================================================
test('machineDeprCostPerHour: depreciação desconta o valor residual', () => {
  setState({});
  // R$2000 que valem R$400 no fim de 4000h => R$0,40/h.
  assert.ok(Math.abs(calc.machineDeprCostPerHour({price:2000, residual:400, lifeHours:4000}) - 0.4) < 1e-9);
  assert.ok(isFinite(calc.machineDeprCostPerHour({price:2000, residual:0, lifeHours:0})),
    'vida útil zero não pode virar Infinity e contaminar o custo');
  assert.strictEqual(calc.machineDeprCostPerHour({price:1000, residual:5000, lifeHours:100}), 0,
    'residual acima do preço não gera depreciação negativa');
  assert.strictEqual(calc.machineDeprCostPerHour(null), 0);
});

test('machineEnergyCostPerHour: potência x tarifa tem prioridade sobre o valor fixo', () => {
  setState({ settings:{ energyTariffPerKwh:0.90 } });
  assert.ok(Math.abs(calc.machineEnergyCostPerHour({powerConsumptionKw:0.15, energyCostPerHour:99}) - 0.135) < 1e-9,
    'com potência cadastrada, o R$/h digitado é ignorado');
  assert.strictEqual(calc.machineEnergyCostPerHour({powerConsumptionKw:0, energyCostPerHour:0.5}), 0.5,
    'sem potência, cai no valor por hora');
  assert.strictEqual(calc.machineEnergyCostPerHour(null), 0);
});

test('machineMaintenanceCostPerHour: zero é valor válido, não "não informado"', () => {
  setState({});
  // A diferença importa: quem zera de propósito não pode receber o padrão.
  assert.strictEqual(calc.machineMaintenanceCostPerHour({maintenanceCostPerHour:0}), 0);
  assert.strictEqual(calc.machineMaintenanceCostPerHour({maintenanceCostPerHour:1.5}), 1.5);
  assert.strictEqual(calc.machineMaintenanceCostPerHour({}), 0.25, 'sem o campo, usa o padrão');
  assert.strictEqual(calc.machineMaintenanceCostPerHour(null), 0);
});

test('findMachine: id que não casa cai na primeira, nunca em nada', () => {
  setState({ settings:{ machines:[{id:'a',name:'A'},{id:'b',name:'B'}] } });
  assert.strictEqual(calc.findMachine('b').name, 'B');
  assert.strictEqual(calc.findMachine('zzz').name, 'A',
    'impressora apagada não pode derrubar o cálculo de quem apontava pra ela');
  setState({ settings:{ machines:[] } });
  assert.strictEqual(calc.findMachine('a'), null);
});

test('toolCostPerUse: preço da ferramenta dividido pela vida útil em usos', () => {
  assert.strictEqual(calc.toolCostPerUse({purchasePrice:100, usefulLifeUses:50}), 2);
  assert.strictEqual(calc.toolCostPerUse({purchasePrice:100, usefulLifeUses:0}), 100,
    'vida útil zero cai em 1 uso, não divide por zero');
  assert.strictEqual(calc.toolCostPerUse(null), 0);
});

// ===========================================================================
//  RECEITA DO PRODUTO — o que efetivamente sai do estoque
// ===========================================================================
test('productRecipe: componente por PEÇA multiplica pelo tamanho do kit', () => {
  setState({});
  const p = produto({ unitsPerSale:3, boxType:'Caixa Pequena', bubbleWrapM:0.5, tapeM:0.2,
    components:[{materialId:'paraf', qty:2, scope:'peca'}] });
  const r = calc.productRecipe(p);
  // 2 parafusos por peça x kit de 3 = 6 (pegadinha #10 do CLAUDE.md).
  assert.strictEqual(r.find(x=>x.materialName==='Parafuso').qty, 6);
  // Embalagem entra UMA vez por venda, não uma por peça.
  assert.strictEqual(r.find(x=>x.materialName==='Caixa Pequena').qty, 1);
});

test('productRecipe: componente por VENDA não multiplica', () => {
  setState({});
  const p = produto({ unitsPerSale:5, components:[{materialId:'paraf', qty:2, scope:'venda'}] });
  assert.strictEqual(calc.productRecipe(p).find(x=>x.materialName==='Parafuso').qty, 2);
});

test('componentMaterialNames: material apagado vira null, e isso é proposital', () => {
  setState({});
  const p = produto({ components:[
    {materialId:'paraf', qty:1, scope:'venda'},
    {materialId:'apagado', qty:1, scope:'venda'},
  ]});
  const nomes = calc.componentMaterialNames(p);
  assert.ok(nomes.has('Parafuso'));
  assert.ok(nomes.has(null), 'quem consome precisa enxergar que sobrou componente órfão');
  assert.strictEqual(calc.componentMaterialNames(produto({})).size, 0);
});

test('totalWeight soma todas as cores do produto', () => {
  assert.strictEqual(calc.totalWeight({filaments:[{weightG:100},{weightG:50}]}), 150);
  assert.strictEqual(calc.totalWeight({filaments:[]}), 0);
  assert.strictEqual(calc.totalWeight({}), 0, 'produto sem filamento não quebra');
});

// ===========================================================================
//  BUSCA DE MATERIAL E CUSTO UNITÁRIO
// ===========================================================================
test('material inexistente custa zero em vez de derrubar a tela', () => {
  setState({});
  assert.strictEqual(calc.filamentCost('PLA Preto'), 0.10);
  assert.strictEqual(calc.boxCost('Caixa Pequena'), 1.50);
  // Filamento ou caixa apagados do estoque: o custo some, mas Produtos
  // continua abrindo. Melhor um número menor que uma tela quebrada.
  assert.strictEqual(calc.filamentCost('NÃO EXISTE'), 0);
  assert.strictEqual(calc.boxCost('NÃO EXISTE'), 0);
  assert.strictEqual(calc.materialByName('NÃO EXISTE'), undefined);
});

test('bolha e fita são achadas pela FLAG, não pelo nome', () => {
  setState({});
  assert.strictEqual(calc.bubbleWrapMaterial().name, 'Plástico Bolha');
  assert.strictEqual(calc.bubbleWrapUnitCost(), 0.50);
  assert.strictEqual(calc.tapeMaterial().name, 'Fita Adesiva');
  assert.strictEqual(calc.tapeUnitCost(), 0.20);
  // Renomear pra "Bolha 40cm" não pode zerar o custo — é a flag que manda.
  setState({ materials:[{ id:'x', name:'Bolha 40cm', category:'Embalagem', unit:'m', costPerUnit:0.75, isBubbleWrap:true }] });
  assert.strictEqual(calc.bubbleWrapUnitCost(), 0.75);
  setState({ materials:[] });
  assert.strictEqual(calc.bubbleWrapUnitCost(), 0);
  assert.strictEqual(calc.tapeUnitCost(), 0);
});

// ===========================================================================
//  TABELA DE PREÇO POR QUANTIDADE (encomendas personalizadas)
// ===========================================================================
test('tablePriceFor: acha a faixa da quantidade e devolve o TOTAL, não o unitário', () => {
  setState({ settings:{ customOrderPriceTable:{
    chaveiro:[
      { minQty:1,  maxQty:9,  unitPrice:10 },
      { minQty:10, maxQty:49, unitPrice:8  },
      { minQty:50, maxQty:0,  unitPrice:6  },
    ],
  }}});
  assert.strictEqual(calc.tablePriceFor('chaveiro', 5), 50);
  assert.strictEqual(calc.tablePriceFor('chaveiro', 10), 80, 'o piso da faixa pertence a ela');
  assert.strictEqual(calc.tablePriceFor('chaveiro', 100), 600, 'maxQty 0 significa "sem teto"');
  assert.strictEqual(calc.tablePriceFor('chaveiro', 0), null, 'quantidade zero não tem preço');
  assert.strictEqual(calc.tablePriceFor('lembrancinha', 5), null, 'tipo sem tabela devolve null');
});

// ===========================================================================
//  LIMITE DE TEMPO PELO PREÇO DE MERCADO
// ===========================================================================
test('maxTimeAtMarketPrice: quanto tempo cabe antes de furar a meta de R$/hora', () => {
  setState({ settings:{ platforms:[{id:'d', name:'Direta', pct:0, fixed:0}], targetHourlyProfit:15 } });
  // Mercado paga R$50, custo R$20, sem taxa: sobram R$30. A R$15/h, cabem 2h.
  assert.strictEqual(calc.maxTimeAtMarketPrice({totalCost:20}, 'Direta', 50, produto({})), 2);
  assert.strictEqual(calc.maxTimeAtMarketPrice({totalCost:20}, 'Direta', null, produto({})), null,
    'sem preço de mercado não dá pra afirmar nada');
  // Custo acima do que o mercado paga: tempo negativo é INFORMAÇÃO — quer
  // dizer que o produto não fecha nem imprimindo em tempo nenhum.
  assert.ok(calc.maxTimeAtMarketPrice({totalCost:80}, 'Direta', 50, produto({})) < 0);
});

// ===========================================================================
//  DESPESAS ATIVAS NO MÊS
// ===========================================================================
test('activeInMonth devolve os itens em si, não só a soma', () => {
  const lista = [
    { name:'Antiga',   value:10 },
    { name:'Julho',    value:20, startMonth:'2026-07' },
    { name:'Setembro', value:30, startMonth:'2026-09' },
  ];
  assert.deepStrictEqual(calc.activeInMonth(lista, '2026-08').map(i=>i.name), ['Antiga','Julho']);
  assert.deepStrictEqual(calc.activeInMonth(lista, '2026-06').map(i=>i.name), ['Antiga']);
  assert.strictEqual(calc.activeInMonth(null, '2026-08').length, 0);
});

// ===========================================================================
//  PEÇAS POR LEVA
// ===========================================================================
test('printUnitsOf: leva rende ao menos 1 peça, nunca 0', () => {
  assert.strictEqual(calc.printUnitsOf({unitsPerPrint:12}), 12);
  assert.strictEqual(calc.printUnitsOf({unitsPerPrint:0}), 1, 'zero peças por leva é engano, não entrada');
  assert.strictEqual(calc.printUnitsOf({}), 1);
  assert.strictEqual(calc.printUnitsOf(null), 1);
});

// ===========================================================================
//  PLATAFORMAS COM ABA DE ANÚNCIOS
// ===========================================================================
test('extraListingPlatforms traz só quem tem aba de Anúncios', () => {
  setState({ settings:{ platforms:[
    ML,
    { id:'ex', name:'Loja Própria', pct:0, fixed:0, listingTemplate:'ml' },
  ]}});
  assert.deepStrictEqual(calc.extraListingPlatforms().map(p=>p.name), ['Loja Própria']);
  setState({ settings:{ platforms:[ML] } });
  assert.strictEqual(calc.extraListingPlatforms().length, 0);
});

// ===========================================================================
//  ANÚNCIO PAGO (ML Ads / Shopee Ads)
// ===========================================================================
test('adSpendInMonth soma só o mês pedido, e filtra por plataforma', () => {
  const lista = [
    { ym:'2026-08', platform:'Mercado Livre', value:60 },
    { ym:'2026-08', platform:'Shopee',        value:40 },
    { ym:'2026-09', platform:'Mercado Livre', value:300 },
  ];
  assert.strictEqual(calc.adSpendInMonth(lista, '2026-08'), 100, 'sem plataforma, soma o mês todo');
  assert.strictEqual(calc.adSpendInMonth(lista, '2026-08', 'Mercado Livre'), 60);
  assert.strictEqual(calc.adSpendInMonth(lista, '2026-08', 'Shopee'), 40);
  // O ponto de existir esta estrutura: gasto de anúncio VARIA por mês. Se
  // caísse em settings.expenses (lista plana), agosto e setembro seriam iguais.
  assert.strictEqual(calc.adSpendInMonth(lista, '2026-09'), 300);
  assert.strictEqual(calc.adSpendInMonth(lista, '2026-07'), 0);
  assert.strictEqual(calc.adSpendInMonth(null, '2026-08'), 0);
});

test('adBreakEvenSales: quantas vendas o orçamento precisa gerar', () => {
  // R$60 num produto que lucra R$30,23 por venda: 2 vendas pagam.
  assert.strictEqual(calc.adBreakEvenSales(60, 30.23), 2);
  // R$60 num que lucra R$1,01: precisaria de 60 vendas — o número já diz
  // sozinho que não vale anunciar esse.
  assert.strictEqual(calc.adBreakEvenSales(60, 1.01), 60);
  // Arredonda pra cima: 3,2 vendas não existe, são 4.
  assert.strictEqual(calc.adBreakEvenSales(100, 30), 4);
  assert.strictEqual(calc.adBreakEvenSales(0, 30), 0, 'sem orçamento, nada a pagar');
});

test('adBreakEvenSales: lucro zero ou negativo devolve null, não um número', () => {
  /* null é a resposta CERTA, e a diferença importa: com lucro negativo,
     nenhum número de vendas paga o anúncio — cada clique pago vira prejuízo
     em cima de prejuízo. Devolver um número grande daria a impressão de que
     bastaria vender mais. */
  assert.strictEqual(calc.adBreakEvenSales(60, 0), null);
  assert.strictEqual(calc.adBreakEvenSales(60, -3.39), null);
});

test('adBreakEvenAcos: teto de gasto por venda, em % do preço', () => {
  // Lucro de R$16,98 num preço de R$39,90 = pode gastar até 42,6% em anúncio.
  assert.ok(Math.abs(calc.adBreakEvenAcos(16.98, 39.90) - 42.56) < 0.01);
  assert.strictEqual(calc.adBreakEvenAcos(-3, 39.90), 0, 'sem lucro, nenhum gasto se justifica');
  assert.strictEqual(calc.adBreakEvenAcos(10, 0), 0, 'preço zero não tem percentual');
});
