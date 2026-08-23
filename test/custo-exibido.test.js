/* Guarda contra a deriva que o usuário encontrou: o motor ganhou custos novos
   (manutenção, ferramentas, componentes, fita) e as telas que MOSTRAM a conta
   ficaram para trás. O sintoma é traiçoeiro porque nada quebra — as linhas
   simplesmente não somam o total impresso logo abaixo delas:

     material 4,46 + energia 0,07 + embalagem 1,30 + depreciação 0,57
     + mão de obra 0,00 + falha 0,51 = 6,91      ...mas o total dizia 7,16

   Os R$ 0,25 eram a manutenção, dentro do total e fora da lista.

   Este teste lê o `totalCost` de calc.js, descobre sozinho quais parcelas o
   compõem, e exige que cada uma apareça nas três telas que explicam o custo.
   Sem lista mantida à mão: acrescentar uma parcela nova no motor faz falhar
   até que as telas a mostrem. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'app', 'js');
const calcSrc = fs.readFileSync(path.join(raiz, 'calc.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(raiz, 'app.js'), 'utf8');

/* As parcelas do custo, lidas da própria linha do motor. `saleUnits` aparece
   ali como multiplicador, não como custo — é a única exclusão, e é explícita
   pra ninguém achar que a lista foi filtrada a dedo. */
const NAO_E_CUSTO = new Set(['saleUnits']);
function parcelasDoCustoTotal(){
  const m = calcSrc.match(/const\s+totalCost\s*=([^;]+);/);
  assert.ok(m, 'não achei a linha `const totalCost = ...` em calc.js — o motor mudou de forma?');
  const nomes = (m[1].match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [])
    .filter(n => !NAO_E_CUSTO.has(n));
  return [...new Set(nomes)];
}

/* Corpo aproximado de uma função de nível de módulo: até a próxima declaração
   `function` na coluna 0. Mesma técnica de escape.test.js. */
function corpoDe(nome){
  const i = appSrc.indexOf(`function ${nome}(`);
  assert.notStrictEqual(i, -1, `função ${nome} sumiu do app.js`);
  const resto = appSrc.slice(i);
  const fim = resto.indexOf('\nfunction ', 1);
  return fim > 0 ? resto.slice(0, fim) : resto;
}

test('a lista de parcelas é descoberta, não chutada', () => {
  const parcelas = parcelasDoCustoTotal();
  // Se a detecção quebrar, os testes abaixo passariam vazios e não guardariam nada.
  assert.ok(parcelas.length >= 7,
    `achei só ${parcelas.length} parcelas (${parcelas}) — a leitura do totalCost falhou`);
  assert.ok(parcelas.includes('maintenance'),
    'manutenção precisa estar entre as parcelas — foi ela que sumiu da tela da primeira vez');
});

/* Quais telas listam o custo item a item? Descobrir, não listar à mão — a
   primeira versão deste teste enumerou duas funções e deixou passar outras
   duas, repetindo em miniatura o erro que ele existe pra pegar.

   A marca de uma tela de detalhamento: imprime `c.totalCost` E cita várias
   parcelas. Quem cita 3+ parcelas está detalhando a conta, e aí precisa citar
   TODAS — senão as linhas não somam o total logo abaixo delas. */
function telasDeDetalhamento(){
  const parcelas = parcelasDoCustoTotal();
  const achadas = [];
  const re = /function\s+([A-Za-z0-9_$]+)\s*\(/g;
  let m;
  while((m = re.exec(appSrc))){
    const nome = m[1];
    const corpo = corpoDe(nome);
    if(!corpo.includes('c.totalCost')) continue;
    const citadas = parcelas.filter(p => corpo.includes('c.' + p));
    if(citadas.length >= 3) achadas.push(nome);
  }
  return [...new Set(achadas)];
}

test('as telas de detalhamento são descobertas, não listadas', () => {
  const telas = telasDeDetalhamento();
  assert.ok(telas.length >= 4,
    `achei só ${telas.length} telas de detalhamento (${telas}) — a detecção quebrou?`);
});

test('toda tela que detalha o custo mostra TODAS as parcelas', () => {
  const parcelas = parcelasDoCustoTotal();
  const faltas = [];
  for(const fn of telasDeDetalhamento()){
    const corpo = corpoDe(fn);
    const ausentes = parcelas.filter(p => !corpo.includes('c.' + p));
    if(ausentes.length) faltas.push(`${fn} não mostra: ${ausentes.join(', ')}`);
  }
  assert.deepStrictEqual(faltas, [],
    'estas telas imprimem o custo total mas escondem parcelas dele — as linhas não vão somar');
});

/* A aba Cálculo explica cada fórmula em português. Aqui não dá pra procurar
   `c.parcela`, então o teste checa o vocabulário: cada parcela tem um termo
   que precisa aparecer no texto explicativo. É a única lista escrita à mão,
   e ela falha alto se uma parcela nova não tiver termo definido. */
const TERMO_DA_PARCELA = {
  materialCost: 'Custo de material',
  energyCost: 'Custo de energia',
  embalagemCost: 'Custo de embalagem',
  depreciation: 'Depreciação',
  maintenance: 'Manutenção',
  laborCost: 'Custo de mão de obra',
  toolsCost: 'Custo de ferramentas',
  componentsCost: 'Custo de componentes',
  failureCost: 'Custo de falha',
};
test('a explicação das fórmulas cobre todas as parcelas', () => {
  const parcelas = parcelasDoCustoTotal();

  const semTermo = parcelas.filter(p => !TERMO_DA_PARCELA[p]);
  assert.deepStrictEqual(semTermo, [],
    'parcela nova no motor sem termo definido aqui — acrescente o título que ela recebe na aba Cálculo');

  const doc = corpoDe('renderCalculo');
  const naoExplicadas = parcelas.filter(p => !doc.includes(TERMO_DA_PARCELA[p]));
  assert.deepStrictEqual(naoExplicadas, [],
    'estas parcelas entram no custo mas não têm fórmula explicada na aba Cálculo');
});

test('a fórmula escrita do Custo total lista as mesmas parcelas do motor', () => {
  const doc = corpoDe('renderCalculo');
  // A linha de código exibida ao usuário, logo abaixo do título "Custo total".
  const m = doc.match(/Custo total<\/div>\s*<div class="chip"[^>]*>([^<]+)</);
  assert.ok(m, 'não achei a fórmula escrita do Custo total na aba Cálculo');
  const escrita = m[1];
  const termosEsperados = ['material','energia','depreciação','manutenção','mão de obra','ferramentas','falha','embalagem','componentes'];
  const ausentes = termosEsperados.filter(t => !escrita.includes(t));
  assert.deepStrictEqual(ausentes, [],
    `a fórmula mostrada ao usuário está incompleta: "${escrita}"`);
});
