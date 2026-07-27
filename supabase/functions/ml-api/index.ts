// Ponte autenticada entre o app e a API do Mercado Livre. Todo chamador precisa
// estar logado na sincronização (mesma sessão Supabase já usada pra sync) —
// o app chama via supabase.functions.invoke('ml-api', {...}), que já manda o
// token do usuário automaticamente.
//
// POST { action: 'sign-state' }
//   -> devolve um `state` assinado (HMAC com a service role key), pra montar
//      a URL de autorização do Mercado Livre no navegador (client_id não é
//      segredo, então essa URL é montada no cliente).
// POST { action: 'search-category', q: 'nome do produto' }
//   -> proxy pra /sites/MLB/domain_discovery/search (sugestão de categoria).
// POST { action: 'fee-lookup', price, categoryId, listingTypeId }
//   -> taxa real, usando o token OAuth guardado (renova sozinho se preciso).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SERVICE_ROLE_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

type TokenRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
};

async function refreshIfNeeded(admin: ReturnType<typeof createClient>, row: TokenRow): Promise<TokenRow> {
  if (new Date(row.expires_at).getTime() > Date.now() + 60_000) return row;
  const resp = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: row.refresh_token,
    }),
  });
  if (!resp.ok) {
    throw new Error("não consegui renovar o token do Mercado Livre — reconecte em Configurações");
  }
  const data = await resp.json();
  const updated: TokenRow = {
    user_id: row.user_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? row.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  };
  await admin.from("ml_oauth_tokens").upsert({ ...updated, updated_at: new Date().toISOString() });
  return updated;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("sem autenticação");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) throw new Error("usuário inválido");
    const userId = userData.user.id;

    const body = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    if (body.action === "sign-state") {
      const payload = btoa(JSON.stringify({ userId, ts: Date.now() }));
      const sig = await hmac(payload);
      return new Response(JSON.stringify({ state: `${payload}.${sig}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "search-category") {
      const q = String(body.q || "").trim();
      if (!q) throw new Error("faltou o texto de busca");
      const mlResp = await fetch(
        `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?limit=6&q=${encodeURIComponent(q)}`,
      );
      if (!mlResp.ok) throw new Error(`Mercado Livre respondeu erro: ${await mlResp.text()}`);
      const results = await mlResp.json();
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "fee-lookup") {
      const { price, categoryId, listingTypeId } = body;
      if (!price || !categoryId) throw new Error("faltou preço ou categoria");

      const { data: row, error: tokenErr } = await admin
        .from("ml_oauth_tokens")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (tokenErr || !row) {
        throw new Error("Mercado Livre não conectado — vá em Configurações e conecte sua conta");
      }
      const fresh = await refreshIfNeeded(admin, row as TokenRow);

      const params = new URLSearchParams({
        price: String(price),
        category_id: String(categoryId),
        listing_type_id: String(listingTypeId || "gold_special"),
      });
      const mlResp = await fetch(`https://api.mercadolibre.com/sites/MLB/listing_prices?${params}`, {
        headers: { Authorization: `Bearer ${fresh.access_token}` },
      });
      if (!mlResp.ok) throw new Error(`Mercado Livre respondeu erro: ${await mlResp.text()}`);
      const mlData = await mlResp.json();
      const entry = Array.isArray(mlData) ? mlData[0] : mlData;
      if (!entry || entry.sale_fee_amount == null) {
        throw new Error("resposta inesperada do Mercado Livre (formato mudou?)");
      }
      const feePct = (entry.sale_fee_amount / Number(price)) * 100;
      return new Response(
        JSON.stringify({ feePct, feeAmount: entry.sale_fee_amount, raw: entry }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    throw new Error(`ação desconhecida: ${body.action}`);
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
