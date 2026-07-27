// Recebe o redirect do Mercado Livre depois que o vendedor autoriza o app
// (?code=...&state=...), troca o código pelo access/refresh token usando o
// client_secret (guardado só aqui, nunca no navegador) e guarda o token em
// ml_oauth_tokens. O `state` carrega o id do usuário do app, assinado com a
// service role key, pra evitar que alguém forje o callback.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ML_CLIENT_ID = Deno.env.get("ML_CLIENT_ID")!;
const ML_CLIENT_SECRET = Deno.env.get("ML_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/ml-oauth-callback`;
const APP_URL = "https://contatopieceofgeek-cloud.github.io/piece-of-geek-gestao/";

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

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const mlError = url.searchParams.get("error");

  if (mlError || !code || !state) {
    return Response.redirect(`${APP_URL}?ml_auth=erro`, 302);
  }

  try {
    const [payload, sig] = state.split(".");
    if (!payload || sig !== (await hmac(payload))) {
      throw new Error("state com assinatura inválida");
    }
    const { userId, ts } = JSON.parse(atob(payload));
    if (!userId || Date.now() - ts > 10 * 60 * 1000) {
      throw new Error("state expirado ou sem usuário");
    }

    const tokenResp = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    if (!tokenResp.ok) {
      throw new Error(`troca de token falhou: ${await tokenResp.text()}`);
    }
    const tokenData = await tokenResp.json();

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    const { error } = await supabase.from("ml_oauth_tokens").upsert({
      user_id: userId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;

    return Response.redirect(`${APP_URL}?ml_auth=ok`, 302);
  } catch (e) {
    console.error(e);
    return Response.redirect(`${APP_URL}?ml_auth=erro`, 302);
  }
});
