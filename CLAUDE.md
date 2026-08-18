# Piece of Geek 3D — Gestão

App de gestão para um negócio MEI de impressão 3D no Brasil (produtos geek: esqueletos de dinossauro, suportes de headphone/controle, organizadores, kits) que vende pelo Mercado Livre e Shopee. Construído inteiramente numa conversa longa com Claude (chat), agora migrando pra um projeto de código de verdade.

**Este arquivo existe pra você (Claude Code) não precisar redescobrir decisões de arquitetura, convenções e pegadinhas que já foram resolvidas.** Leia antes de mexer em qualquer coisa.

## Estrutura de pastas

```
/index.html         landing (marketing, CSS inline, sem dependência do app)
/termos.html        Termos de Uso            } rascunhos com [PREENCHER],
/privacidade.html   Política de Privacidade  } precisam de revisão jurídica
/app/               o app em si (index.html, js/, css/, img/, sw.js)
/test/              testes do motor de cálculo
/supabase/          schema e Edge Functions (não é servido)
```

A landing na raiz e o app em `/app/` é o que permite divulgar o link principal
sem cair na tela de dados. Consequência: o `start_url` do PWA é `/app/` — quem
tinha o app instalado apontando pra raiz precisa reinstalar uma vez.

## Como rodar localmente

Site estático puro, sem build step. Basta servir a pasta:
```
python3 -m http.server 8000
# ou
npx serve .
```
A landing abre em `/`, o app em `/app/`. Não precisa de bundler — `app/index.html` carrega `css/styles.css`, `js/pwa-setup.js`, `js/calc.js` e `js/app.js` via tags normais. **`calc.js` tem que vir antes de `app.js`.**

Ao testar mudança em JS no navegador, o service worker + cache de HTTP seguram a versão antiga com teimosia. O jeito mais rápido de furar isso é subir o servidor **numa porta diferente** (origem nova = cache novo).

## Nome do produto ≠ nome do negócio do usuário

`PRODUCT_NAME` (em `app/js/app.js`) e `defaultName` (em `app/js/pwa-setup.js`) são o nome do **produto SaaS**, hoje `'Gestão 3D'` — precisam ser mudados juntos. `bizName()` é o nome do **negócio de quem usa**, que aparece na sidebar, no catálogo e como marca no anúncio. Título/manifest ficam `"<negócio> — <produto>"` quando há negócio cadastrado, e só `"<produto>"` quando não há (antes virava `"Gestão 3D — Gestão"`, com sufixo duplicado).

Testes (sem dependência nenhuma, usa o runner nativo do Node):
```
npm test
```

## Arquitetura

- **100% client-side.** Toda a lógica de negócio roda no navegador. Não existe backend próprio ainda (só o Supabase, ver abaixo).
- **`js/calc.js` = motor de cálculo, `js/app.js` = resto.** Custo, preço, R$/hora e consumo de material moram em `calc.js`, que **não pode tocar DOM, storage nem formatação** — é essa pureza que permite testar no Node, já que `app.js` acessa `document` e não carrega fora do navegador. As funções lêem a global `state` DENTRO do corpo (nunca no carregamento): no navegador quem declara é o `app.js`, nos testes é `globalThis.state`. Isso é de propósito — `state` é reatribuído em vários pontos (`applyLoadedState`, `confirmReset`, `loadSampleData`, `importBackup`), então guardar a referência deixaria o motor lendo estado velho. Ao adicionar cálculo novo, ele vai em `calc.js` com teste; ao adicionar tela, vai em `app.js`.
- **Armazenamento em camadas**, do mais preferido pro fallback, tudo abstraído em `storageGet(key)`/`storageSet(key, value)` em `app.js`:
  1. Supabase (se o usuário configurou sincronização) — tabela `app_data`, ver `supabase/schema.sql`.
  2. IndexedDB (armazenamento local principal quando não há Supabase configurado).
  3. localStorage (fallback de emergência).
- **Sem framework.** JS puro, renderização via template strings (`innerHTML`). `render()` reconstrói a sidebar/topbar/conteúdo inteiro a cada mudança de estado — funciona bem pro tamanho atual, mas é o principal candidato a refatoração se o projeto crescer muito mais (considerar migrar renderização por trecho, ou um framework leve, SE isso virar gargalo real — não antecipar).
- **PWA**: `js/pwa-setup.js` gera o manifest.json dinamicamente (via Blob URL) e registra `sw.js` (service worker mínimo, só existe pra passar no critério de instalável do Android — não faz cache real).

## Modelo de dados

Estado global em `state = { materials, products, sales, orders, customers, printFailures, settings }`, cada chave persistida separadamente via `storageSet`.

- **materials**: matéria-prima (filamento, embalagem, ferramenta, componente). Campos-chave: `category` (`Filamento`/`Embalagem`/`Ferramentas`/`Componentes`/`Outros`), `isBox`/`isEnvelope`/`isSaquinho`/`isBubbleWrap`/`isTape` (flags de papel dentro de Embalagem, não inferência por nome — mutuamente exclusivos, um material só pode ser um desses), `stock`, `lowStock`, `costPerUnit`. Categoria `Componentes` (parafuso, ímã, tag...) não tem flag própria — a categoria já basta pra filtrar no seletor de "componentes usados" do produto. Ver pegadinha #10 sobre embalagem achatada (envelope/saquinho).
- **products**: produtos cadastrados. `filaments: [{materialName, weightG}]` (suporta multi-cor), `boxType` (nome do material de Embalagem escolhido — caixa, envelope ou saquinho, todos igualmente válidos), `machineId`, `desiredMarginPct` (⚠️ ver pegadinha abaixo), `kitComponents` (se foi criado via "Criar kit", registra os produtos originais). `components: [{materialId, qty, scope}]` — itens inclusos no pacote que não são material impresso (ver pegadinha #10). `unitsPerPrint` (peças que saem de UMA leva/impressão) e `unitsPerSale` (peças que vão em UMA venda/anúncio/kit) são conceitos diferentes — ver pegadinha #8 sobre `stock`.
- **sales**: uma linha por item vendido (mesmo em vendas com carrinho multi-item — ver `confirmSale()`). Tem `groupId` opcional linkando itens da mesma transação. `qty` é número de VENDAS/kits, não peças (ver pegadinha #8). Snapshot de `productName`, `machineId`, `hoursUsed`, `unitsPerSaleSnapshot`, `unitPriceSnapshot`, `timePerUnitSnapshot` no momento da venda — nunca recalcula retroativamente a partir do cadastro atual do produto (editar o tamanho do kit depois não pode reescrever o faturamento/R$-hora de vendas antigas).
- **orders**: fila de produção (Kanban: Aguardando impressão → Imprimindo → Pronto pra envio → Enviado).
- **customers**: clientes, linkados a `sales` via `customerId`.
- **printFailures**: registro de falhas de impressão (desperdício real de material/energia), desconta do estoque proporcionalmente.
- **settings**: tudo configurável — máquinas, taxas de plataforma (Shopee tem `tiers` pra cálculo automático por faixa de preço, ML não), despesas, impostos, metas de reserva, chave PIX, meta de faturamento, DAS, `operationsStartMonth` (mês de início das operações — ver pegadinha #9), `investments` (compras avulsas/parceladas que aparecem em Caixa/Anual — ligado a Estoque nos dois sentidos: criar um investimento de categoria Filamento/Embalagem/Ferramentas/Componentes pode já somar ao estoque do material, e criar material novo ou reabastecer com custo em Estoque pode já criar o investimento correspondente, checkbox em cada modal).

## ⚠️ Pegadinhas já resolvidas (não reintroduzir)

1. **`desiredMarginPct` é um número percentual RAW (60), não decimal (0.60).** `calcProduct()` divide por 100 internamente (`prod.desiredMarginPct/100`). Um bug real aconteceu aqui: um fluxo novo (orçamento rápido) dividiu por 100 antes de guardar, causando dupla divisão e margem de ~0.6% em vez de 60%. Qualquer código novo que popule esse campo deve passar o número cru (60), nunca a fração.
2. **`todayStr()` usa componentes de data locais, não `toISOString()`.** `toISOString()` sempre converte pra UTC — pra um usuário no Brasil (UTC-3), isso pode fazer o app achar que "hoje" já é amanhã entre ~21h e meia-noite. Já foi corrigido; não reverter pra `.toISOString().slice(0,10)`.
3. **Modais no mobile usam `align-items:flex-start` no `.overlay`, não `flex-end`.** Testei e `flex-end` combinado com `overflow-y:auto` trava a rolagem em modais mais altos que a tela (bug real de flexbox, não é specific deste projeto). Se quiser reintroduzir visual de "bottom sheet", fazer via `transform`/posicionamento diferente, não via `align-items` no container com scroll.
4. **Tabelas viram cards no mobile via classe `tbl-responsive` + atributo `data-label` em cada `<td>`.** Não é CSS puro reaproveitável sem o atributo — ao adicionar uma tabela nova que deve funcionar bem no celular, copiar esse padrão (ver CSS em `@media(max-width:640px)`).
5. **`.tbl-compact-mobile`** esconde colunas secundárias no card mobile da tabela de Produtos especificamente (ficou com 11 colunas × 19 produtos = 11 mil px de scroll antes disso). Usa `td[data-label="..."]{display:none}` escopado por essa classe — não é global.
6. **Gráficos (Chart.js) têm guard `if(typeof Chart==='undefined') return;`** — se o CDN falhar, o resto do app não deve quebrar. Manter esse padrão em qualquer gráfico novo.
7. **Cores do tema estão em `:root` como CSS custom properties**, testadas contra WCAG AA 4.5:1 (ver `--nozzle`, `--teal`, etc. — todas mais escuras que o "natural" pra passarem no contraste em fundo claro). Se mudar qualquer cor de destaque, recalcular contraste antes de aplicar (fórmula de luminância relativa padrão, não só "parece ok visualmente").
8. **`products[].stock` é sempre em PEÇAS FÍSICAS individuais — nunca em levas (`unitsPerPrint`) nem em kits/vendas (`unitsPerSale`).** Bug real: `confirmPrintJob()` fazia `stock += qty` (qty = número de impressões registradas, não de peças) — registrar 1 impressão de uma leva de 12 só somava 1 no estoque. Corrigido pra `stock += qty*unitsPerPrint`. Do lado da venda, `sales[].qty` é o número de VENDAS/kits (não peças, desde a reformulação de `unitsPerSale`) — o desconto é `stock -= qty*unitsPerSaleSnapshot`, sempre usando o snapshot gravado na própria venda (nunca `calcProduct(prod)` recalculado ao vivo), senão editar o tamanho do kit depois de registrar vendas reescreve retroativamente o estoque/faturamento histórico. Qualquer código novo que mexa em estoque de produto ou em `sales[].qty` tem que manter essa distinção. **Essas quatro regras agora existem como função nomeada e testada em `calc.js` — `printUnitsOf`, `saleUnitsOf`, `piecesFromPrintJob`, `piecesForSale` e `saleUnitsOfSale`. Use elas em vez de reescrever a fórmula à mão** (era exatamente a fórmula repetida em 3 lugares que quebrou antes); `test/calc.test.js` trava cada uma.
10. **Embalagem "achatada" (envelope/saquinho) não tem altura própria de verdade — `heightCm` fica sempre 0.** `boxFitsDimensions()` trata isso como um caso à parte: se `pkg.heightCm===0`, em vez de comparar 3 eixos como numa caixa rígida, só limita a altura da PEÇA a `FLAT_PACKAGING_MAX_HEIGHT_CM` (3cm, hardcoded) e compara comprimento/largura contra a embalagem — não reintroduzir a comparação de 3 eixos pra esse caso, quebra a seleção automática pra peças finas. `bestFittingBox()` ordena as opções que cabem por `costPerUnit` (mais barata primeiro), não por volume — motivo real do pedido: um envelope de R$0,17 que cabe é melhor que uma caixa de R$1,71 que também cabe, e ordenar por volume escondia isso.
    **Componentes** (`products[].components`) são itens inclusos no pacote que não são material impresso (parafuso, ímã, tag, cordão) — o campo `scope` decide como o custo/estoque escala: `'peca'` multiplica por `unitsPerSale` (2 parafusos por peça, kit de 3 leva 6), `'venda'` é uma vez só, igual embalagem. Consumo/custo somados em `calcProduct()` como `componentsCost`, SEPARADO de `embalagemCost` (linhas de exibição próprias) mas com o mesmo tratamento "fora do custo por peça, dentro do custo por venda". Estoque de componente dá baixa em `confirmSale()` (não em `confirmPrintJob()` — só é gasto quando vende, igual caixa/bolha/fita) via `componentsRecipe(prod)`, com bloqueio DURO antes de qualquer mutação (toast `Sem ${nome} em estoque: precisa de X, há Y`) — diferente de caixa/bolha/fita, que só avisam se ficar negativo, nunca bloqueiam. Não confundir os dois comportamentos ao mexer em `confirmSale()`.
11. **`state.settings.despesas`/`taxes` são listas FLAT sem data — `blocoA(ym)` (Caixa/Anual) aplica o valor total de cada uma a QUALQUER mês, igualmente.** Um mês só fica imune a edições posteriores em `state.settings.expenses`/`taxes` depois que `snapshotPastMonths()` o "congela" em `state.settings.monthlySnapshots[ym]` — e isso só acontece pra meses que já viraram (entre `lastActiveMonth` e o mês atual) na primeira vez que o app é aberto depois que o mês virou. Ou seja: o mês corrente e qualquer mês futuro (inclusive as 12 linhas do export Anual, que sempre lista janeiro–dezembro) sempre usam a lista AO VIVO — editar/excluir uma despesa hoje muda o resultado de TODOS os meses ainda não congelados, não só do mês corrente. Bug real: o export Anual mostrava a mesma despesa mensal em janeiro–dezembro mesmo o negócio tendo começado em julho, porque não havia snapshot pra nenhum mês ainda e nada limitava despesas a partir de quando a operação existia. Corrigido com `settings.operationsStartMonth` (mês/ano, configurável em Configurações → "Início das operações") — `blocoA(ym)` retorna tudo zerado pra qualquer `ym` anterior a essa data, antes mesmo de olhar snapshot ou lista ao vivo. Deixar em branco preserva o comportamento antigo (sem corte).

    **Existem DOIS cortes de data, e eles se somam.** `operationsStartMonth` é global (o negócio não existia); `expenses[].startMonth`/`taxes[].startMonth` é por item (a despesa não existia) — mês da primeira cobrança, configurável na coluna "A partir de" de cada linha em Configurações. O global é aplicado primeiro, o por-item depois, via `sumActiveInMonth(lista, ym)` em `calc.js` (testada). O corte por item vale igual pra lista ao vivo e pra `monthlySnapshots`, já que o `startMonth` vai junto no snapshot. Linha nova nasce com o mês corrente; item que já existia é migrado com `startMonth:''` (= vale desde sempre), pra ninguém ver um total mudar sozinho depois da atualização. No Detalhamento do Caixa, item que ainda não começou aparece apagado com "a partir de \<mês\>" em vez de sumir — se sumisse, o total não bateria com o que o usuário cadastrou e ele não saberia por quê.

## Taxas: como cada plataforma é explicada

A aba Taxas mostra, embaixo da linha de cada plataforma, um painel explicando **como aquela plataforma cobra** — antes o app calculava certo mas não contava a regra pra ninguém.

- **Mercado Livre** → `mlCategoryTable()`. `settings.mlCategories` é uma lista de `{id, nome, mlCategoryId, classicaPct, premiumPct, origem, atualizadoEm}`. `origem` é `'estimativa'` (veio do `ML_CATEGORY_SEED`), `'api'` (buscada no ML) ou `'manual'` (digitada/editada) — e aparece como selo na linha, porque o usuário precisa saber em qual número dá pra confiar. Editar qualquer campo na mão vira `'manual'`. Máximo de 5 linhas visíveis; o resto abre no "Ver todas".

  A busca automática usa a Edge Function **`ml-api` que já está deployada**, chamando `fee-lookup` **duas vezes** (`gold_special` = clássico, `gold_pro` = premium) em vez de criar uma ação nova — de propósito, pra não exigir redeploy. Se você mexer nisso, manter essa restrição em mente ou avisar que precisa deployar.

  As taxas da tabela são sempre pra `ML_REF_PRICE` (R$ 100), **acima do corte de R$ 79** onde o ML soma custo fixo por peso. Abaixo disso a mesma categoria mostraria percentual maior e comparar linhas deixaria de valer. Não baixar essa referência sem repensar a tabela inteira.

⚠️ **A taxa é por ANÚNCIO, nunca sobre o total do pedido** — `cartLineFee`/`cartTotalFee` em `calc.js`, testadas. Marketplace cobra cada anúncio separado, e calcular sobre o total errava nas duas plataformas: no ML, carrinho com taxas reais diferentes caía no percentual genérico (R$8,78 em vez de R$12,02, lucro superestimado); na Shopee, dois itens de R$49,90 (faixa de 20%+R$4 cada) somavam R$99,80 e caíam na faixa de 14%+R$16 cobrada 2x (R$45,97 em vez de R$27,96). `confirmSale` grava a taxa própria de cada linha, não um rateio do total pelo faturamento — senão o histórico mistura as taxas de produtos de categorias diferentes. A exceção é quando o usuário digita um percentual à mão: aí não há como separar, e o rateio proporcional é a única leitura possível de um número só. O campo "Taxa nessa venda (%)" mostra a taxa EFETIVA (soma por anúncio ÷ total), e o painel embaixo lista de onde veio cada número.

- **Shopee** → `shopeeTierPanel()`. Só leitura: as faixas (`plat.tiers`) são política da plataforma e o app já as aplica sozinho via `computeTieredFee`. O painel mostra cada faixa com um **exemplo no teto**, o que torna visível o degrau que ninguém enxerga sozinho: R$ 79,99 paga 25% efetivos, R$ 99,99 paga 30%.

**Os campos "Taxa %"/"Taxa fixa" só aparecem em plataforma SEM tabela própria** (Site Próprio, Outro, plataforma nova), onde são a única fonte da taxa. No ML quem manda é a tabela de categorias, e o `plat.pct` — que ainda vale pros produtos sem taxa real buscada — vira texto, trocado pelos botões "usar". Na Shopee os campos eram decorativos: a última faixa é pega-tudo (`computeTieredFee` cai nela por `|| tiers[tiers.length-1]`), então o fallback nunca disparava.

## Layout: `minmax(0,1fr)`, nunca `1fr`

Todos os grids (`.g-2`…`.g-5`, `.row2`, `.row3`) usam `minmax(0,1fr)`. `1fr` sozinho é `minmax(AUTO,1fr)`: a coluna **nunca encolhe abaixo do conteúdo dela**. Um cartão com tabela larga inchava a própria coluna, espremia as irmãs e empurrava a página pra fora da tela — era essa a causa de "as caixas ficam de tamanhos diferentes", e no celular a aba Caixa rolava de lado. Com mínimo 0 as colunas ficam iguais e quem rola é a tabela, dentro do `.tbl-wrap` (que já tem `overflow-x:auto`). Grid novo tem que seguir isso.

`.card` é coluna flex, e `.card-actions` (`margin-top:auto`) gruda o rodapé de botões embaixo — é o que faz dois cartões lado a lado terem os botões na mesma linha. `align-items:start` num grid é opt-out consciente: sobrou só nos quadros Kanban (Pedidos, Personalizados), onde as colunas não têm fundo e esticar não mudaria nada.

## Formulários: um jeito só de desenhar campo e linha

**A aparência de campo é global, não presa ao `.field`.** Antes só `.field input` era estilizado, e as ~10 listas repetíveis do app montam inputs soltos dentro de um grid próprio — ficavam com a aparência crua do navegador ao lado de campos estilizados. Era essa a origem de "as caixas parecem aleatórias". O seletor hoje cobre `input`/`select`/`textarea` em qualquer lugar, com exceção explícita de `checkbox`/`radio`/`color`/`file`/`button`/`hidden`, que têm desenho próprio e virariam caixas de largura total.

Três formas, e não existe uma quarta:

- **`.field` + `<label>`** — campo avulso. Em grade, dentro de `.row2`/`.row3`.
- **`.form-rows` + `.form-row`** — lista repetível ("N campos + ×"): filamentos, mão de obra, ferramentas, componentes, despesas, impostos, plataformas, faixas de preço. O rótulo aparece **uma vez** no `.form-row-head`; a proporção das colunas vem da variável `--cols`. Use o helper `formRowsHtml(cols, headers, rows, vazio)` em `app.js` — ele acrescenta sozinho a coluna do `×` (`FORM_ROW_X`), então ninguém esquece de somar a largura do botão. O botão sai de `formRowX(onclick)`.
- **`.field-checkbox`** (e as variantes `.sm` pra checklist empilhada, `.inline` pra colar num rótulo) — checkbox. Ocupa a altura de um input pra fechar na mesma base quando divide linha com um campo.

⚠️ **`align-items:end` nas `.row2`/`.row3`/`.form-row` alinha os CAMPOS, não o topo das caixas.** Rótulo que quebra em duas linhas ("Taxa fixa por unidade vendida (R$)") empurrava só aquele input 17px pra baixo. Pelo mesmo motivo, `<select>` e `<input>` levam `line-height` explícito: cada um calcula a altura do conteúdo por métricas próprias, e o select saía 2px mais alto que o input ao lado.

Teste rápido de regressão: percorrer as abas e os modais lendo `getComputedStyle` de cada campo — `background`, `border`, `border-radius`, `font-size` e `padding` têm que dar **uma assinatura só** (hoje: 86 campos nas páginas, 113 nos modais).

## Ícones

`app/img/logo.png` (480px) é o ícone do PWA e o do manifest. Os favicons são arquivos separados e **pré-reduzidos** — `favicon-16/32/48/180.png`, cada um com seu `sizes` no `<link>`. Apontar o favicon direto pro logo de 480px fazia o navegador reduzir 30× num salto só, o que serrilha, e baixava 238 KB pra desenhar 16 pixels.

Pra regerar depois de trocar o logo: `node tools/resize-icon.js app/img/logo.png app/img 16 32 48 180`. O script decodifica/reencoda PNG só com `zlib` (sem dependência) e reduz por passos de metade com **alpha pré-multiplicado** — sem pré-multiplicar, pixel transparente entra na média com a cor dele e a borda ganha auréola clara.

Ícone do produto e logo do usuário se excluem: com `settings.businessLogo` cadastrado, `pwa-setup.js` remove os `link[data-product-icon]`; sem ele, remove os `<link>` dinâmicos. Deixar os dois faz o navegador escolher pelo `sizes` — ou seja, o logo do usuário nunca ganharia.

## Exportar PDF

"Exportar PDF" (aba Anual) chama `exportCurrentTabPDF()`, que **prepara o documento e desfaz no `afterprint`** — não é `window.print()` na tela viva. Monta cabeçalho (negócio/seção/período/data), esconde barra de filtro e `.card-actions`, e a margem da folha vem do `padding` de `.content`, **não do `@page`** — o `@page{margin:0}` precisa continuar em 0 pro catálogo, cujas páginas já são 210×297mm com padding próprio.

O `<canvas>` é o caso que CSS não resolve: é bitmap, não reflui, e o Chart.js redesenha no evento de mídia, às vezes num canvas de tamanho zero. Cada gráfico vira uma `<img>` congelada (`toDataURL`) antes de imprimir; canvas em branco (CDN do Chart.js fora do ar) tem o **cartão inteiro removido**, em vez de imprimir a moldura vazia — era esse o "quadrado desconexo".

## ⚠️ Dados iniciais: nenhum dado real de negócio no código

`defaultData()` é o estado de uma conta NOVA e **não pode conter dado de negócio nenhum** — nem nome, contato, produto, custo ou máquina. O app era pessoal e nasceu com os dados reais do dono embutidos: 23 produtos com custo, a impressora com as parcelas reais, WhatsApp, Instagram e o nome do negócio. Enquanto for um app só, isso é inofensivo; virando multiusuário, cada conta nova recebia os dados de outra pessoa.

Havia **seis** caminhos de vazamento, não um — vale conferir todos ao mexer aqui:
1. `defaultData()` (era `seedData()`) — a lista de produtos/materiais/máquina em si.
2. `migrateSettings()` — os `if(campo==null) campo = '<valor real>'` reinjetavam o dado em qualquer conta com o campo vazio, mesmo com o seed limpo.
3. `bizName()` — o fallback de exibição aparece na sidebar, no catálogo, no recibo **e como `marca` no anúncio do ML** (`defaultListingDraft`). Fallback tem que ser neutro (`'Meu Negócio'`).
4. `skipOnboardingBrand()`/`confirmOnboardingBrand()` — *gravavam* o nome real em quem pulasse o passo, só pra não cair de novo no prompt. Resolvido com a flag `settings.brandPromptSeen`, que separa "já perguntei" de "tem nome".
5. `generateSku()` — prefixo fixo carimbava a sigla de uma loja no SKU de todas. Agora vem de `skuPrefix()`, derivado do nome do negócio.
6. Nomes de arquivo dos exports e o `defaultName` do PWA (`js/pwa-setup.js`) — o app instalado e todo arquivo exportado saíam com o nome de outro negócio. Usar `bizSlug()`.

Ficam de fora, de propósito: `IDB_NAME = 'piece_of_geek_db'` e `app:'piece-of-geek-gestao'` (identificador do formato no backup). São chaves técnicas — trocar órfã o IndexedDB de quem já usa e quebra a importação de backups antigos; só mudar junto com migração.

`sampleData()` é um negócio **fictício**, carregado só sob demanda (`loadSampleData()`, botão no onboarding quando a conta está vazia). Os produtos ali existem pra demonstrar os conceitos que mais confundem (leva que rende várias peças, venda em kit, componente por peça) e os tempos/preços foram escolhidos pra o Diagnóstico abrir com um veredito de cada tipo — se mexer, conferir que não virou tudo "não compensa imprimir".

Teste rápido de regressão: `JSON.stringify(defaultData())` e `JSON.stringify(migrateSettings({}))` não podem conter nenhum dado de negócio real.

## Onboarding: bloqueio sem saída é bug

Duas funções carregam isso, e código novo deve usá-las em vez de reinventar:

- **`blockedBy(titulo, explicacao, botaoLabel, botaoOnclick)`** — quando uma ação exige algo que ainda não existe. Substitui o `toast('Cadastre X antes de...')`, que é beco sem saída pra quem não sabe onde as coisas ficam. A explicação diz POR QUE aquilo é obrigatório, não só o que falta.
- **`emptyState(msg, acaoLabel, acaoOnclick)`** — os dois últimos argumentos são opcionais (as ~26 chamadas antigas seguem válidas). Tela vazia sem botão obriga a adivinhar onde fica a ação.

⚠️ **Mensagem que cita caminho de menu apodrece.** O bloqueio de "cadastre uma impressora" mandava o usuário pra `Caixa → Configurar → Impressoras` — caminho que deixou de existir quando Taxas/Configurações viraram abas próprias, e ninguém percebeu porque só usuário novo bate nele. Preferir botão que navega (`switchTab(...)`) a instrução escrita; se escrever mesmo assim, conferir ao mexer na navegação.

O caminho guiado se forma sozinho por encadeamento: Pedidos vazio → botão → bloqueio "falta produto" → botão → Produtos → bloqueio "falta impressora" → botão → Configurações.

## ⚠️ Sincronização: instalação nova não pode competir com a nuvem

Perda de dado real, em produção: o dono abriu o app numa aba anônima (sem `localStorage`, logo sem as credenciais do Supabase), o app concluiu "instalação nova", criou o andaime de `defaultData()` **e gravou** — com carimbo de data de agora. Ao conectar a conta em seguida, a comparação de timestamp do `storageGet()` viu o vazio local como "edição mais recente", manteve ele e o **empurrou por cima da nuvem**. 23 produtos, anúncios e configurações viraram `[]`.

Três regras que saíram disso:

1. **`applyLoadedState()` não persiste o estado de instalação nova.** Sem timestamp local, a nuvem sempre vence — que é o certo pra quem acabou de instalar. O primeiro save real acontece na primeira edição do usuário.
2. **`afterSyncLogin()` trata conflito como conflito.** Se a nuvem tem dado e o aparelho também (`hasLocalData()`, que checa se existe timestamp gravado), o usuário escolhe qual lado vale — e um backup é baixado antes, automaticamente. Sem dado local, puxa a nuvem direto com `preferRemoteOnPull`, que faz o `storageGet` ignorar a comparação de data.
3. **A comparação de timestamp só é válida entre dois estados que o usuário realmente editou.** Qualquer código novo que grave estado "de sistema" (andaime, migração, default) precisa ou não gravar, ou não carimbar data — senão volta a competir com a nuvem.

Recuperação, se acontecer de novo: os dados ficam no IndexedDB da origem (`piece_of_geek_db`, store `kv`). Dá pra ler sem executar o app abrindo uma página da MESMA origem que não carrega o `app.js` (ex: `/termos.html`) e lendo o IndexedDB pelo console — foi assim que os dados voltaram.

**As quatro decisões agora moram em `app/js/sync-rules.js`, testadas em `test/sync.test.js`** — `isFreshInstall`, `resolveRead`, `classifyWriteError` e `loginSyncDecision`. Eram comparações escritas inline no meio do IO, impossíveis de testar, e foi exatamente aí que o dado sumiu. O `app.js` chama essas funções; ao mexer em conflito de sincronização, mexa nelas, não recrie a comparação à mão.

Cuidado com empate de data: `storageSet` grava o MESMO carimbo no local e na nuvem, então toda chave já sincronizada empata. Por isso só o local **estritamente** mais novo justifica reenviar (`localIsNewer`, não `!remoteIsNewer`) — tratar empate como "local mais novo" fazia o app disparar nove upserts inúteis por abertura.

## Assinatura e cobrança

`app/js/config.js` guarda a URL e a publishable key do projeto Supabase **do produto**. Enquanto estiverem em branco, o app volta ao modo antigo de "traga seu próprio Supabase" (o usuário digita URL e chave em Configurações) — é o que mantém o desenvolvimento local e as contas antigas funcionando. Publishable key no código-fonte é seguro por design: quem protege o dado é a RLS, não o segredo da chave. **service_role key nunca entra aí** — só nos secrets das Edge Functions.

O status vem da tabela `subscriptions` (ver `supabase/schema-subscriptions.sql`) e o navegador **só lê**: não existe policy de insert/update pra usuário autenticado, então apenas a service_role (webhook do gateway) escreve. Se o cliente pudesse mudar o próprio `status` pra `active`, a cobrança seria decorativa.

**Vencer não tranca os dados.** As policies de `app_data` foram separadas: `select` e `delete` só checam dono; `insert` e `update` exigem `has_write_access()`. Ou seja, assinatura vencida continua lendo, exportando e apagando — só não grava coisa nova. Isso é o que os Termos prometem e o que a LGPD espera sobre portabilidade/exclusão; não "endurecer" isso sem mudar os dois documentos junto.

⚠️ **O `schema-subscriptions.sql` tem um bloco 6 que libera os usuários que já existem.** O trigger de trial só dispara em cadastro novo — sem esse backfill, quem já tem conta fica sem linha, `has_write_access()` devolve false e a sincronização para de gravar.

⚠️ **O paywall é intencionalmente permeável.** O app é offline-first: tudo funciona no IndexedDB sem servidor nenhum. A assinatura protege a sincronização entre aparelhos e o que depende de servidor (taxa real do ML), não o uso local. Quem quiser usar de graça num navegador só, consegue — e perde tudo se limpar o navegador. Fechar essa brecha exigiria abrir mão do offline-first, que é o que faz o app funcionar na oficina sem internet. Decisão consciente, não esquecimento.

`storageSet()` distingue recusa da RLS (código `42501`) de falta de conexão. Antes, qualquer erro do upsert virava "sem conexão" silencioso — assinatura vencida parava de sincronizar sem o usuário ficar sabendo.

**Falta pra cobrança funcionar de verdade:** a Edge Function de webhook do gateway, que é quem escreve em `subscriptions`. Depende de escolher o gateway (a verificação de assinatura do webhook e o formato do payload mudam bastante entre eles).

## Sincronização (Supabase)

Ver `supabase/schema.sql` pra recriar a tabela. Auth é email/senha simples (Supabase Auth). RLS restringe cada usuário à própria `user_id`. Chave pública (`sb_publishable_...` ou `anon` legado) fica no `localStorage` do navegador do usuário — é seguro por design (protegido por RLS, não por segredo da chave).

**Isso é o ponto de entrada mais óbvio pra funcionalidade de backend futura** (ex: Edge Functions do Supabase) — coisas que precisam de segredo (client_secret de OAuth do Mercado Livre, por exemplo) não podem viver no `app.js` do navegador. Se for implementar a integração de taxas automáticas do ML (mencionada em conversa anterior, adiada por precisar de backend), esse é o caminho: Supabase Edge Function segurando o `client_secret`, fazendo o fluxo OAuth, devolvendo só o resultado pro cliente.

## Deploy

Netlify, hoje via drag-and-drop manual (`app.netlify.com/drop` ou arrastar a pasta na tela de Deploys do projeto já existente). **Ponto óbvio de melhoria**: conectar isso a um repositório Git no GitHub pra deploy automático a cada push, em vez de arrastar pasta manualmente toda vez.

## O que já existe (não precisa reconstruir)

Dashboard, Pedidos (Kanban com capacidade de produção), Vendas (carrinho multi-item, taxa de plataforma editável/automática, PIX, vínculo automático com Pedidos), Clientes (com status de atividade), Produtos (com foto, kit, orçamento rápido), Estoque (matéria-prima + produtos prontos), Cálculo (fórmulas, falhas de impressão), Caixa (blocos A-D de fluxo de caixa, fechamento mensal de reservas), Anual (MEI, investimentos, export Excel/PDF), catálogo em imagem/PDF, backup export/import, PWA instalável, sincronização multi-dispositivo.

**Taxa automática do Mercado Livre via API oficial** — construída e deployada (não é mais um "cogitado"). Duas Edge Functions no Supabase (`supabase/functions/`):
- `ml-oauth-callback`: recebe o redirect do OAuth do ML e grava o token em `ml_oauth_tokens` (RLS por `user_id`).
- `ml-api`: ponte autenticada pro app — ações `sign-state` (assina o `state` do fluxo OAuth), `search-category` (sugestão de categoria ML) e `fee-lookup` (taxa real via `GET /sites/MLB/listing_prices`, já passando `billable_weight`/`logistic_type`/`shipping_mode` pra cobrir o custo operacional por peso de itens < R$79, regra do ML desde mar/2026).

Variáveis de ambiente exigidas pelas Edge Functions (configuradas nos *secrets* do projeto Supabase, nunca no `app.js`): `ML_CLIENT_ID`, `ML_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## O que foi cogitado mas não construído

- Alternar entre tema claro/escuro (hoje só tem o claro; o tema escuro original foi comparado num mockup, direção poderia ser recuperada se quiser os dois).
- App nativo publicado em loja (App Store/Play Store) — considerado desnecessário já que o PWA instalado já atende "só eu ter acesso".
