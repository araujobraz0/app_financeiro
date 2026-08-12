import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;
    const MERCADOPAGO_WEBHOOK_TOKEN = Deno.env.get("MERCADOPAGO_WEBHOOK_TOKEN")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header ausente" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!user.email) {
      return new Response(
        JSON.stringify({ error: "Seu usuário precisa ter e-mail para gerar o Pix." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const amount = 6.9;
    const externalReference = `premium:${user.id}:${Date.now()}`;
    const webhookUrl =
      `${SUPABASE_URL}/functions/v1/mercadopago-webhook?token=${encodeURIComponent(MERCADOPAGO_WEBHOOK_TOKEN)}`;

    const paymentBody = {
      transaction_amount: amount,
      description: "Brazllet Premium - 30 dias",
      payment_method_id: "pix",
      payer: {
        email: user.email,
        first_name: user.user_metadata?.name || "Cliente",
      },
      external_reference: externalReference,
      notification_url: webhookUrl,
      metadata: {
        user_id: user.id,
        plan: "brazllet_monthly_690",
        source: "app",
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify(paymentBody),
    });

    const mpJson = await mpResponse.json();

    if (!mpResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Erro ao criar pagamento no Mercado Pago",
          details: mpJson,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const qrCode =
      mpJson?.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 =
      mpJson?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
    const ticketUrl =
      mpJson?.point_of_interaction?.transaction_data?.ticket_url ?? null;

    const { error: upsertError } = await supabaseAdmin.from("pix_payments").upsert(
      {
        user_id: user.id,
        mp_payment_id: String(mpJson.id),
        external_reference: externalReference,
        amount,
        status: mpJson.status ?? "pending",
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        raw_response: mpJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mp_payment_id" },
    );

    if (upsertError) {
      return new Response(
        JSON.stringify({
          error: "Erro ao salvar pagamento no Supabase",
          details: upsertError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        payment_id: String(mpJson.id),
        amount,
        status: mpJson.status,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: ticketUrl,
        expires_at: mpJson.date_of_expiration ?? null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Erro interno ao gerar Pix",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});