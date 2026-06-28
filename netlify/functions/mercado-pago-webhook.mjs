const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

export default async (request) => {
  if (request.method === "OPTIONS") return json(200, { ok: true });
  if (request.method !== "POST") return json(405, { error: "Metodo nao permitido." });

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

  try {
    const url = new URL(request.url);
    const payload = await request.json().catch(() => ({}));
    const topic = payload.type || payload.topic || url.searchParams.get("topic");
    const paymentId = payload.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");

    if (accessToken && topic === "payment" && paymentId) {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const payment = await response.json().catch(() => ({}));

      console.log("Mercado Pago payment", {
        id: payment.id,
        status: payment.status,
        external_reference: payment.external_reference,
        metadata: payment.metadata,
      });
    } else {
      console.log("Mercado Pago notification", { topic, paymentId });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error("Mercado Pago webhook error", error);
    return json(200, { ok: true });
  }
};

export const config = {
  path: "/.netlify/functions/mercado-pago-webhook",
};
