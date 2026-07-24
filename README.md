# Piece of Geek 3D — Gestão

App de gestão financeira e operacional pra um negócio de impressão 3D (MEI), cobrindo precificação, estoque, pedidos, vendas, clientes, fluxo de caixa e mais.

## Rodando localmente

Não precisa instalar nada — é HTML/CSS/JS puro. Sirva a pasta com qualquer servidor estático:

```bash
python3 -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador.

## Estrutura

```
index.html          — estrutura da página
css/styles.css       — todo o visual
js/pwa-setup.js      — configura o app instalável (PWA)
js/app.js            — toda a lógica do app
sw.js                — service worker (necessário pro "Instalar app" funcionar)
supabase/schema.sql  — SQL pra recriar a sincronização em um novo projeto Supabase
CLAUDE.md            — anotações de arquitetura pra quem for mexer no código com Claude Code
```

## Publicando uma atualização

Hoje o deploy é manual: arraste a pasta inteira (não só um arquivo) na tela de Deploys do site no Netlify. Ideal a médio prazo: conectar a um repositório Git pra isso ser automático.

## Sincronização entre dispositivos

Usa uma conta gratuita do Supabase (banco de dados + login), configurada pelo próprio app em "☁️ Sincronizar entre dispositivos". O SQL necessário está em `supabase/schema.sql`.
