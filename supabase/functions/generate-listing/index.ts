// Edge Function: gera título + descrição de anúncio (Mercado Livre e Shopee)
// a partir dos dados de um produto já cadastrado, usando a API do Gemini.
//
// A chave da API (GEMINI_API_KEY) fica só aqui no servidor — nunca no app.js
// do navegador. Configurar como secret do projeto Supabase, não como código.
//
// Nome do modelo é configurável via secret GEMINI_MODEL (padrão abaixo) porque
// a Google troca nomes de modelo com frequência — confira o nome atual em
// aistudio.google.com antes de usar, e ajuste o secret se a chamada der 404.

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: "GEMINI_API_KEY não configurada no servidor (defina como secret do projeto)" }, 500);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo da requisição inválido" }, 400);
  }

  const { productName, filaments, boxType, practicedPrice, weightTotal, timeH, kitComponents } = body || {};
  if (!productName || typeof productName !== "string") {
    return jsonResponse({ error: "Nome do produto é obrigatório" }, 400);
  }

  const filamentDesc = Array.isArray(filaments)
    ? filaments.map((f: any) => `${f.materialName} (${f.weightG}g)`).join(", ")
    : "";
  const kitDesc = Array.isArray(kitComponents) && kitComponents.length
    ? `Kit composto por: ${kitComponents.map((k: any) => `${k.qty > 1 ? k.qty + "x " : ""}${k.productName}`).join(", ")}.`
    : "";

  const prompt = `Você é um especialista em anúncios pra Mercado Livre e Shopee no Brasil, vendendo produtos geek impressos em 3D (esqueletos de dinossauro, suportes, organizadores, kits).

Gere um anúncio pro produto abaixo. Responda em JSON válido, sem markdown, exatamente neste formato:
{
  "titulo_ml": "título com até 60 caracteres, direto, com palavras-chave de busca",
  "titulo_shopee": "título com até 100 caracteres, um pouco mais descritivo",
  "descricao": "descrição em 3-4 parágrafos curtos, tom vendedor mas honesto, destacando material, tamanho/peso, cuidados de uso, e que é feito sob encomenda numa impressora 3D"
}

Regra mais importante: use só as informações abaixo. Não invente característica, medida, material ou funcionalidade que não foi informada.

Dados do produto:
- Nome: ${productName}
- Material: ${filamentDesc || "não informado"}
- Peso total: ${weightTotal ? weightTotal + "g" : "não informado"}
- Tempo de impressão: ${timeH ? timeH + "h" : "não informado"}
- Embalagem: ${boxType || "não informado"}
- Preço praticado: ${practicedPrice ? "R$ " + practicedPrice : "não informado"}
${kitDesc}`;

  // O Gemini às vezes responde 503/429 (sobrecarga temporária do modelo) — tenta
  // de novo automaticamente algumas vezes antes de desistir e devolver erro.
  const MAX_ATTEMPTS = 3;
  let resp: Response | null = null;
  let lastErrText = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
          }),
        }
      );
    } catch (e) {
      return jsonResponse({ error: "Falha ao conectar com a API do Gemini: " + String(e) }, 502);
    }

    if (resp.ok) break;

    lastErrText = await resp.text();
    const retryable = resp.status === 503 || resp.status === 429;
    if (!retryable || attempt === MAX_ATTEMPTS) {
      return jsonResponse({ error: `Gemini retornou erro (${resp.status}) após ${attempt} tentativa(s): ${lastErrText}` }, 502);
    }
    await new Promise((r) => setTimeout(r, attempt * 1000)); // 1s, depois 2s
  }

  const data = await resp!.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return jsonResponse({ error: "Resposta vazia do Gemini — tente novamente" }, 502);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    return jsonResponse({ error: "Gemini não retornou um JSON válido", raw: text }, 502);
  }

  return jsonResponse(parsed);
});
