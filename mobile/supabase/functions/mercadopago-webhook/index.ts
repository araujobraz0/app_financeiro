import { createClient } from "@supabase/supabase-js";

// Valor cobrado pelo plano mensal. Precisa bater com o amount definido
// em create-pix-payment. Uma pequena tolerancia cobre arredondamento.
const PRECO_PLANO = 6.9;
const TOLERANCIA = 0.01;
const DIAS_PLANO = 30;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function extractPaymentId(payload: any, url: URL): string | null {
  if (payload?.data?.id) return String(payload.data.id);

  if (
    payload?.id &&
    (payload?.type === "payment" || payload?.topic === "payment")
  ) {
    return String(payload.id);
  }

  const dataId = url.searchParams.get("data.id");
  if (dataId) return dataId;

  const resource = payload?.resource || url.searchParams.get("resource");
  if (resource && typeof resource === "string") {
    const match = resource.match(/\/v1\/payments\/(\d+)/);
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * Extrai o user_id do pagamento, exigindo que ele tenha vindo do nosso
 * fluxo: o external_reference precisa comecar com "premium:".
 *
 * Nao confiamos apenas no metadata.user_id, porque um pagamento criado
 * fora do app poderia trazer qualquer valor ali.
 */
function extrairUserId(payment: any): string | null {
  const externalReference = typeof payment?.external_reference === "string"
    ? payment.external_reference
    : "";

  if (!externalReference.startsWith("premium:")) return null;

  const idDaReferencia = externalReference.split(":")[1] || null;
  const idDoMetadata = payment?.metadata?.user_id || null;

  // Se os dois existem, precisam concordar.
  if (idDaReferencia && idDoMetadata && idDaReferencia !== idDoMetadata) {
    return null;
  }

  return idDaReferencia || idDoMetadata;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expectedToken = Deno.env.get("MERCADOPAGO_WEBHOOK_TOKEN");

    if (!token || token !== expectedToken) {
      return new Response("unauthorized", { status: 401 });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")!;

    const body = await req.json().catch(() => ({}));
    const paymentId = extractPaymentId(body, url);

    if (!paymentId) {
      return new Response(
        JSON.stringify({ ok: true, ignored: "payment_id_not_found" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const paymentResp = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      },
    );

    const payment = await paymentResp.json();

    if (!paymentResp.ok) {
      return new Response(
        JSON.stringify({
          error: "erro_consultando_pagamento",
          details: payment,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const userId = extrairUserId(payment);
    const valorPago = Number(payment?.transaction_amount ?? 0);
    const normalizedStatus = String(payment.status ?? "unknown");

    const registroPagamento = {
      mp_payment_id: String(payment.id),
      external_reference: payment.external_reference ?? null,
      amount: valorPago,
      status: normalizedStatus,
      qr_code: payment?.point_of_interaction?.transaction_data?.qr_code ?? null,
      qr_code_base64:
        payment?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
      raw_response: payment,
      updated_at: new Date().toISOString(),
    };

    if (!userId) {
      await supabaseAdmin.from("pix_payments").upsert(registroPagamento, {
        onConflict: "mp_payment_id",
      });

      return new Response(
        JSON.stringify({ ok: true, ignored: "user_id_not_found" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    await supabaseAdmin.from("pix_payments").upsert(
      {
        ...registroPagamento,
        user_id: userId,
        paid_at: normalizedStatus === "approved" ? new Date().toISOString() : null,
      },
      { onConflict: "mp_payment_id" },
    );

    if (normalizedStatus !== "approved") {
      return new Response(
        JSON.stringify({ ok: true, status: normalizedStatus }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // VALIDACAO DE VALOR: sem isso, um pagamento de R$ 0,01 criado fora do
    // app liberaria 30 dias de premium. Registramos o pagamento acima, mas
    // nao concedemos o beneficio.
    if (valorPago + TOLERANCIA < PRECO_PLANO) {
      console.warn(
        `[webhook] Pagamento ${payment.id} aprovado com valor insuficiente:`,
        valorPago,
        "esperado:",
        PRECO_PLANO,
      );
      return new Response(
        JSON.stringify({
          ok: true,
          ignored: "valor_insuficiente",
          amount: valorPago,
          expected: PRECO_PLANO,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    // IDEMPOTENCIA: se este pagamento ja concedeu premium antes, um reenvio
    // do webhook (o Mercado Pago reenvia em caso de falha) nao deve somar
    // outros 30 dias.
    const { data: jaProcessado } = await supabaseAdmin
      .from("pix_payments")
      .select("entitlement_granted_at")
      .eq("mp_payment_id", String(payment.id))
      .maybeSingle();

    if (jaProcessado?.entitlement_granted_at) {
      return new Response(
        JSON.stringify({ ok: true, ignored: "ja_processado" }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("user_entitlements")
      .select("premium_expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const now = new Date();
    const currentExpiry = existing?.premium_expires_at
      ? new Date(existing.premium_expires_at)
      : null;

    const baseDate = currentExpiry && currentExpiry.getTime() > now.getTime()
      ? currentExpiry
      : now;

    const nextExpiry = addDays(baseDate, DIAS_PLANO);

    await supabaseAdmin.from("user_entitlements").upsert(
      {
        user_id: userId,
        premium_active: true,
        premium_expires_at: nextExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    await supabaseAdmin
      .from("pix_payments")
      .update({ entitlement_granted_at: new Date().toISOString() })
      .eq("mp_payment_id", String(payment.id));

    return new Response(
      JSON.stringify({
        ok: true,
        payment_id: String(payment.id),
        premium_expires_at: nextExpiry.toISOString(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "webhook_error",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
