const plans = {
  avulso: {
    title: "TurboText AI - Creditos avulsos",
    description: "Compra minima de creditos para transcricao de audio.",
    unit_price: 14.9,
    minutes: 18,
    category_id: "services",
  },
  pro: {
    title: "TurboText AI Pro - 420 minutos",
    description: "Plano mensal com 420 minutos acumulaveis por 60 dias.",
    unit_price: 79.9,
    minutes: 420,
    category_id: "services",
  },
  estudio: {
    title: "TurboText AI Estudio - 1.800 minutos",
    description: "Plano mensal para alto volume com 1.800 minutos acumulaveis.",
    unit_price: 249.9,
    minutes: 1800,
    category_id: "services",
  },
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const getBaseUrl = (request) => {
  const configuredUrl = process.env.SITE_URL || process.env.URL || process.env.DEPLOY_PRIME_URL;
  const origin = request.headers.get("origin");
  const fallback = new URL(request.url).origin;
  return String(configuredUrl || origin || fallback).replace(/\/$/, "");
};

const mercadoPagoError = (status, data) => {
  const message = data?.message || data?.error || data?.cause?.[0]?.description;

  if (status === 401 || status === 403) {
    return "A credencial do Mercado Pago esta incorreta. Confira MERCADO_PAGO_ACCESS_TOKEN no Netlify.";
  }

  return message || "Nao foi possivel criar o checkout no Mercado Pago.";
};

export default async (request) => {
  if (request.method === "OPTIONS") return json(200, { ok: true });
  if (request.method !== "POST") return json(405, { error: "Metodo nao permitido." });

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return json(500, {
      error: "MERCADO_PAGO_ACCESS_TOKEN nao configurado no Netlify.",
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const planKey = String(body.plan || "").toLowerCase();
    const plan = plans[planKey];

    if (!plan) {
      return json(400, { error: "Plano invalido para checkout." });
    }

    const baseUrl = getBaseUrl(request);
    const reference = `turbotext-${planKey}-${Date.now()}`;
    const preference = {
      items: [
        {
          id: planKey,
          title: plan.title,
          description: plan.description,
          category_id: plan.category_id,
          quantity: 1,
          currency_id: "BRL",
          unit_price: plan.unit_price,
        },
      ],
      metadata: {
        plan: planKey,
        minutes: plan.minutes,
        product: "TurboText AI",
      },
      external_reference: reference,
      statement_descriptor: "TURBOTEXTAI",
      back_urls: {
        success: `${baseUrl}/?pagamento=aprovado&plano=${planKey}`,
        failure: `${baseUrl}/?pagamento=falhou&plano=${planKey}`,
        pending: `${baseUrl}/?pagamento=pendente&plano=${planKey}`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/.netlify/functions/mercado-pago-webhook`,
      payment_methods: {
        installments: 12,
        default_installments: 1,
      },
    };

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": reference,
      },
      body: JSON.stringify(preference),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return json(response.status, {
        error: mercadoPagoError(response.status, data),
        details: data,
      });
    }

    return json(200, {
      preferenceId: data.id,
      checkoutUrl: data.init_point || data.sandbox_init_point,
      plan: planKey,
    });
  } catch (error) {
    return json(500, {
      error: error.message || "Erro inesperado ao criar checkout.",
    });
  }
};

export const config = {
  path: "/.netlify/functions/create-payment",
};
