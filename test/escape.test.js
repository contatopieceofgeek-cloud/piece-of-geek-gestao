/* Guarda estática contra um erro que eu já cometi TRÊS vezes ao aplicar
   escape em massa: envolver em esc() uma função que PRODUZ HTML.

   O sintoma é sempre o mesmo — a tela mostra a marcação como texto:
     materialCard          → o cartão inteiro virou texto no Estoque
     renderListingLinkField→ idem no modal de Anúncios
     platformBadge         → "<span class=..>Mercado Livre</span>" em Vendas

   A regra: função que devolve HTML escapa POR DENTRO; quem chama não escapa
   de novo. Este teste não depende de lista mantida à mão — ele lê o app.js,
   descobre quais funções retornam marcação, e falha se alguma aparecer
   dentro de esc(). Ver "Escape" no CLAUDE.md. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'js', 'app.js'), 'utf8');

/* Funções que produzem HTML: as que têm algum `return` de template string
   começando com uma tag. Pega a forma usada no projeto inteiro. */
function funcoesQueProduzemHtml(codigo){
  const nomes = new Set();
  const re = /function\s+([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/g;
  let m;
  while((m = re.exec(codigo))){
    const nome = m[1];
    // Corpo aproximado: até a próxima declaração de função no topo do arquivo.
    const resto = codigo.slice(m.index);
    const fim = resto.indexOf('\nfunction ', 1);
    const corpo = fim > 0 ? resto.slice(0, fim) : resto;
    if(/return\s*`\s*<[a-zA-Z]/.test(corpo)) nomes.add(nome);
  }
  return nomes;
}

test('nenhuma função que devolve HTML está envolvida em esc()', () => {
  const produtoras = funcoesQueProduzemHtml(src);
  assert.ok(produtoras.size > 10,
    `a detecção falhou: achou só ${produtoras.size} funções de HTML — o formato do arquivo mudou?`);

  const infratoras = [];
  for(const nome of produtoras){
    // esc(nomeDaFuncao(  — o caso exato que quebrou três vezes.
    if(new RegExp('esc\\(\\s*' + nome + '\\s*\\(').test(src)) infratoras.push(nome);
    // esc( ... .map(x=>nomeDaFuncao(...)).join('')) — a variante em lista.
    if(new RegExp('esc\\([^)]*\\b' + nome + '\\([^;]*\\.join\\(').test(src)) infratoras.push(nome + ' (dentro de .map/.join)');
  }
  assert.deepStrictEqual(infratoras, [],
    'estas devolvem HTML e não podem ser escapadas — a marcação apareceria como texto na tela');
});

test('esc, safeUrl e escJs continuam existindo e exportados no app.js', () => {
  // Se alguém remover ou renomear, o teste acima passaria vazio e daria uma
  // falsa sensação de segurança — este trava a existência das três.
  for(const fn of ['function esc(', 'function safeUrl(', 'function escJs(']){
    assert.ok(src.includes(fn), `${fn} sumiu do app.js`);
  }
});

test('TODA href dinâmica passa por safeUrl — sem exceção', () => {
  /* esc() escapa aspas, mas `javascript:alert(1)` não tem aspa nenhuma.
     A regra é sem exceção de propósito: alguns links são montados pelo
     próprio app e seriam seguros (waLink só junta dígitos com esquema fixo),
     mas manter uma lista de "esses podem" é o que apodrece — safeUrl numa
     URL https já válida não muda nada, e a regra fica fácil de conferir. */
  const hrefs = src.match(/href="\$\{[^}]*\}"/g) || [];
  const suspeitos = hrefs.filter(h => !/safeUrl\(/.test(h));
  assert.deepStrictEqual(suspeitos, [],
    'href com valor dinâmico precisa de safeUrl — escapar aspas não bloqueia o esquema javascript:');
});
