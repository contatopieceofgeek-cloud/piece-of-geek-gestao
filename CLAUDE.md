# Piece of Geek 3D — Gestão

App de gestão para um negócio MEI de impressão 3D no Brasil (produtos geek: esqueletos de dinossauro, suportes de headphone/controle, organizadores, kits) que vende pelo Mercado Livre e Shopee. Construído inteiramente numa conversa longa com Claude (chat), agora migrando pra um projeto de código de verdade.

**Este arquivo existe pra você (Claude Code) não precisar redescobrir decisões de arquitetura, convenções e pegadinhas que já foram resolvidas.** Leia antes de mexer em qualquer coisa.

## Como rodar localmente

Site estático puro, sem build step. Basta servir a pasta:
```
python3 -m http.server 8000
# ou
npx serve .
```
Abrir `index.html`. Não precisa de bundler — `index.html` carrega `css/styles.css`, `js/pwa-setup.js` e `js/app.js` via tags normais.

## Arquitetura

- **100% client-side.** Toda a lógica de negócio roda no navegador. Não existe backend próprio ainda (só o Supabase, ver abaixo).
- **Armazenamento em camadas**, do mais preferido pro fallback, tudo abstraído em `storageGet(key)`/`storageSet(key, value)` em `app.js`:
  1. Supabase (se o usuário configurou sincronização) — tabela `app_data`, ver `supabase/schema.sql`.
  2. IndexedDB (armazenamento local principal quando não há Supabase configurado).
  3. localStorage (fallback de emergência).
- **Sem framework.** JS puro, renderização via template strings (`innerHTML`). `render()` reconstrói a sidebar/topbar/conteúdo inteiro a cada mudança de estado — funciona bem pro tamanho atual, mas é o principal candidato a refatoração se o projeto crescer muito mais (considerar migrar renderização por trecho, ou um framework leve, SE isso virar gargalo real — não antecipar).
- **PWA**: `js/pwa-setup.js` gera o manifest.json dinamicamente (via Blob URL) e registra `sw.js` (service worker mínimo, só existe pra passar no critério de instalável do Android — não faz cache real).

## Modelo de dados

Estado global em `state = { materials, products, sales, orders, customers, printFailures, settings }`, cada chave persistida separadamente via `storageSet`.

- **materials**: matéria-prima (filamento, caixa, plástico bolha). Campos-chave: `category`, `isBox`, `isBubbleWrap` (flags, não inferência por nome), `stock`, `lowStock`, `costPerUnit`.
- **products**: produtos cadastrados. `filaments: [{materialName, weightG}]` (suporta multi-cor), `machineId`, `desiredMarginPct` (⚠️ ver pegadinha abaixo), `kitComponents` (se foi criado via "Criar kit", registra os produtos originais). `unitsPerPrint` (peças que saem de UMA leva/impressão) e `unitsPerSale` (peças que vão em UMA venda/anúncio/kit) são conceitos diferentes — ver pegadinha #8 sobre `stock`.
- **sales**: uma linha por item vendido (mesmo em vendas com carrinho multi-item — ver `confirmSale()`). Tem `groupId` opcional linkando itens da mesma transação. `qty` é número de VENDAS/kits, não peças (ver pegadinha #8). Snapshot de `productName`, `machineId`, `hoursUsed`, `unitsPerSaleSnapshot`, `unitPriceSnapshot`, `timePerUnitSnapshot` no momento da venda — nunca recalcula retroativamente a partir do cadastro atual do produto (editar o tamanho do kit depois não pode reescrever o faturamento/R$-hora de vendas antigas).
- **orders**: fila de produção (Kanban: Aguardando impressão → Imprimindo → Pronto pra envio → Enviado).
- **customers**: clientes, linkados a `sales` via `customerId`.
- **printFailures**: registro de falhas de impressão (desperdício real de material/energia), desconta do estoque proporcionalmente.
- **settings**: tudo configurável — máquinas, taxas de plataforma (Shopee tem `tiers` pra cálculo automático por faixa de preço, ML não), despesas, impostos, metas de reserva, chave PIX, meta de faturamento, DAS, `operationsStartMonth` (mês de início das operações — ver pegadinha #9).

## ⚠️ Pegadinhas já resolvidas (não reintroduzir)

1. **`desiredMarginPct` é um número percentual RAW (60), não decimal (0.60).** `calcProduct()` divide por 100 internamente (`prod.desiredMarginPct/100`). Um bug real aconteceu aqui: um fluxo novo (orçamento rápido) dividiu por 100 antes de guardar, causando dupla divisão e margem de ~0.6% em vez de 60%. Qualquer código novo que popule esse campo deve passar o número cru (60), nunca a fração.
2. **`todayStr()` usa componentes de data locais, não `toISOString()`.** `toISOString()` sempre converte pra UTC — pra um usuário no Brasil (UTC-3), isso pode fazer o app achar que "hoje" já é amanhã entre ~21h e meia-noite. Já foi corrigido; não reverter pra `.toISOString().slice(0,10)`.
3. **Modais no mobile usam `align-items:flex-start` no `.overlay`, não `flex-end`.** Testei e `flex-end` combinado com `overflow-y:auto` trava a rolagem em modais mais altos que a tela (bug real de flexbox, não é specific deste projeto). Se quiser reintroduzir visual de "bottom sheet", fazer via `transform`/posicionamento diferente, não via `align-items` no container com scroll.
4. **Tabelas viram cards no mobile via classe `tbl-responsive` + atributo `data-label` em cada `<td>`.** Não é CSS puro reaproveitável sem o atributo — ao adicionar uma tabela nova que deve funcionar bem no celular, copiar esse padrão (ver CSS em `@media(max-width:640px)`).
5. **`.tbl-compact-mobile`** esconde colunas secundárias no card mobile da tabela de Produtos especificamente (ficou com 11 colunas × 19 produtos = 11 mil px de scroll antes disso). Usa `td[data-label="..."]{display:none}` escopado por essa classe — não é global.
6. **Gráficos (Chart.js) têm guard `if(typeof Chart==='undefined') return;`** — se o CDN falhar, o resto do app não deve quebrar. Manter esse padrão em qualquer gráfico novo.
7. **Cores do tema estão em `:root` como CSS custom properties**, testadas contra WCAG AA 4.5:1 (ver `--nozzle`, `--teal`, etc. — todas mais escuras que o "natural" pra passarem no contraste em fundo claro). Se mudar qualquer cor de destaque, recalcular contraste antes de aplicar (fórmula de luminância relativa padrão, não só "parece ok visualmente").
8. **`products[].stock` é sempre em PEÇAS FÍSICAS individuais — nunca em levas (`unitsPerPrint`) nem em kits/vendas (`unitsPerSale`).** Bug real: `confirmPrintJob()` fazia `stock += qty` (qty = número de impressões registradas, não de peças) — registrar 1 impressão de uma leva de 12 só somava 1 no estoque. Corrigido pra `stock += qty*unitsPerPrint`. Do lado da venda, `sales[].qty` é o número de VENDAS/kits (não peças, desde a reformulação de `unitsPerSale`) — o desconto é `stock -= qty*unitsPerSaleSnapshot`, sempre usando o snapshot gravado na própria venda (nunca `calcProduct(prod)` recalculado ao vivo), senão editar o tamanho do kit depois de registrar vendas reescreve retroativamente o estoque/faturamento histórico. Qualquer código novo que mexa em estoque de produto ou em `sales[].qty` tem que manter essa distinção.
9. **`state.settings.despesas`/`taxes` são listas FLAT sem data — `blocoA(ym)` (Caixa/Anual) aplica o valor total de cada uma a QUALQUER mês, igualmente.** Um mês só fica imune a edições posteriores em `state.settings.expenses`/`taxes` depois que `snapshotPastMonths()` o "congela" em `state.settings.monthlySnapshots[ym]` — e isso só acontece pra meses que já viraram (entre `lastActiveMonth` e o mês atual) na primeira vez que o app é aberto depois que o mês virou. Ou seja: o mês corrente e qualquer mês futuro (inclusive as 12 linhas do export Anual, que sempre lista janeiro–dezembro) sempre usam a lista AO VIVO — editar/excluir uma despesa hoje muda o resultado de TODOS os meses ainda não congelados, não só do mês corrente. Bug real: o export Anual mostrava a mesma despesa mensal em janeiro–dezembro mesmo o negócio tendo começado em julho, porque não havia snapshot pra nenhum mês ainda e nada limitava despesas a partir de quando a operação existia. Corrigido com `settings.operationsStartMonth` (mês/ano, configurável em Configurações → "Início das operações") — `blocoA(ym)` retorna tudo zerado pra qualquer `ym` anterior a essa data, antes mesmo de olhar snapshot ou lista ao vivo. Deixar em branco preserva o comportamento antigo (sem corte).

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
