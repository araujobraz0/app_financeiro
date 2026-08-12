import { createClient } from "@supabase/supabase-js";

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
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
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
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const userId =
      payment?.metadata?.user_id ||
      (typeof payment?.external_reference === "string" &&
          payment.external_reference.startsWith("premium:")
        ? payment.external_reference.split(":")[1]
        : null);

    if (!userId) {
      await supabaseAdmin.from("pix_payments").upsert(
        {
          mp_payment_id: String(payment.id),
          external_reference: payment.external_reference ?? null,
          amount: Number(payment.transaction_amount ?? 7),
          status: payment.status ?? "unknown",
          qr_code: payment?.point_of_interaction?.transaction_data?.qr_code ?? null,
          qr_code_base64:
            payment?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
          raw_response: payment,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "mp_payment_id" },
      );

      return new Response(
        JSON.stringify({ ok: true, ignored: "user_id_not_found" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const normalizedStatus = String(payment.status ?? "unknown");

    await supabaseAdmin.from("pix_payments").upsert(
      {
        user_id: userId,
        mp_payment_id: String(payment.id),
        external_reference: payment.external_reference ?? null,
        amount: Number(payment.transaction_amount ?? 7),
        status: normalizedStatus,
        qr_code: payment?.point_of_interaction?.transaction_data?.qr_code ?? null,
        qr_code_base64:
          payment?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null,
        paid_at: normalizedStatus === "approved" ? new Date().toISOString() : null,
        raw_response: payment,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "mp_payment_id" },
    );

    if (normalizedStatus !== "approved") {
      return new Response(
        JSON.stringify({ ok: true, status: normalizedStatus }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
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

    const baseDate =
      currentExpiry && currentExpiry.getTime() > now.getTime()
        ? currentExpiry
        : now;

    const nextExpiry = addDays(baseDate, 30);

    await supabaseAdmin.from("user_entitlements").upsert(
      {
        user_id: userId,
        premium_active: true,
        premium_expires_at: nextExpiry.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    return new Response(
      JSON.stringify({
        ok: true,
        payment_id: String(payment.id),
        premium_expires_at: nextExpiry.toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "webhook_error",
        message: error instanceof Error ? error.message : "unknown_error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});