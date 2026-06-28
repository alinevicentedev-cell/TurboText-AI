const FREE_KEY = "turbotext-ai-real-free-audio-used";
const PRICE_PER_MINUTE = 0.79;
const MINIMUM_PURCHASE = 14.9;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const CHECKOUT_URLS = {
  avulso: "",
  pro: "",
  estudio: "",
};

const elements = {
  audioFile: document.querySelector("#audioFile"),
  dropZone: document.querySelector("#dropZone"),
  fileSummary: document.querySelector("#fileSummary"),
  freeBadge: document.querySelector("#freeBadge"),
  language: document.querySelector("#language"),
  outputFormat: document.querySelector("#outputFormat"),
  timestamps: document.querySelector("#timestamps"),
  speakers: document.querySelector("#speakers"),
  summary: document.querySelector("#summary"),
  priceEstimate: document.querySelector("#priceEstimate"),
  durationEstimate: document.querySelector("#durationEstimate"),
  transcribeButton: document.querySelector("#transcribeButton"),
  checkoutButton: document.querySelector("#checkoutButton"),
  statusDot: document.querySelector("#statusDot"),
  usageLabel: document.querySelector("#usageLabel"),
  usageBar: document.querySelector("#usageBar"),
  progressLabel: document.querySelector("#progressLabel"),
  progressValue: document.querySelector("#progressValue"),
  progressBar: document.querySelector("#progressBar"),
  transcriptOutput: document.querySelector("#transcriptOutput"),
  copyButton: document.querySelector("#copyButton"),
  downloadTxtButton: document.querySelector("#downloadTxtButton"),
  downloadPdfButton: document.querySelector("#downloadPdfButton"),
  checkoutModal: document.querySelector("#checkoutModal"),
  toast: document.querySelector("#toast"),
};

let selectedFile = null;
let durationMinutes = null;
let progressTimer = null;

const formatCurrency = (value) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatDuration = (minutes) => {
  if (!Number.isFinite(minutes)) return "Duracao nao detectada";
  const totalSeconds = Math.max(0, Math.round(minutes * 60));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, "0")}min`;
  }

  return `${mins}min ${String(secs).padStart(2, "0")}s`;
};

const formatBytes = (bytes) => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return "00:00";
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

const isFreeUsed = () => localStorage.getItem(FREE_KEY) === "true";

const setFreeUsed = () => {
  localStorage.setItem(FREE_KEY, "true");
  renderUsage();
};

const estimatePaidValue = () => {
  const minutes = Number.isFinite(durationMinutes) ? durationMinutes : 20;
  return Math.max(MINIMUM_PURCHASE, minutes * PRICE_PER_MINUTE);
};

const renderUsage = () => {
  const used = isFreeUsed();
  elements.freeBadge.textContent = used ? "Gratis utilizado" : "Gratis disponivel";
  elements.freeBadge.classList.toggle("is-used", used);
  elements.usageLabel.textContent = used ? "Proximos audios pagos" : "1 audio restante";
  elements.usageBar.style.width = used ? "100%" : "0%";

  if (used) {
    elements.priceEstimate.textContent = `${formatCurrency(estimatePaidValue())} estimados`;
  } else {
    elements.priceEstimate.textContent = "R$ 0,00 no primeiro audio";
  }
};

const setProgress = (value, label) => {
  elements.progressValue.textContent = `${value}%`;
  elements.progressBar.style.width = `${value}%`;
  elements.progressLabel.textContent = label;
};

const setStatus = (text, type = "ready") => {
  elements.statusDot.textContent = text;
  elements.statusDot.classList.toggle("is-busy", type === "busy");
  elements.statusDot.classList.toggle("is-locked", type === "locked");
};

const showToast = (message) => {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(elements.toast.hideTimer);
  elements.toast.hideTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3400);
};

const updateFileSummary = (file) => {
  if (!file) {
    elements.fileSummary.textContent = "Nenhum arquivo selecionado";
    elements.durationEstimate.textContent = "Aguardando arquivo";
    renderUsage();
    return;
  }

  const name = document.createElement("strong");
  name.textContent = file.name;
  elements.fileSummary.replaceChildren(name, document.createTextNode(` ${formatBytes(file.size)}`));
  elements.durationEstimate.textContent = "Detectando...";
  renderUsage();
};

const detectDuration = (file) => {
  durationMinutes = null;
  const media = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
  const objectUrl = URL.createObjectURL(file);

  media.preload = "metadata";
  media.src = objectUrl;

  media.onloadedmetadata = () => {
    durationMinutes = media.duration / 60;
    elements.durationEstimate.textContent = formatDuration(durationMinutes);
    renderUsage();
    URL.revokeObjectURL(objectUrl);
  };

  media.onerror = () => {
    durationMinutes = null;
    elements.durationEstimate.textContent = "Duracao nao detectada";
    renderUsage();
    URL.revokeObjectURL(objectUrl);
  };
};

const setSelectedFile = (file) => {
  selectedFile = file;
  updateFileSummary(file);
  if (file) detectDuration(file);
};

const openCheckout = () => {
  elements.checkoutModal.hidden = false;
  document.body.classList.add("modal-open");
};

const closeCheckout = () => {
  elements.checkoutModal.hidden = true;
  document.body.classList.remove("modal-open");
};

const createCheckout = async (plan) => {
  const response = await fetch("/.netlify/functions/create-payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ plan }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.checkoutUrl) {
    throw new Error(data.error || "Nao foi possivel abrir o checkout do Mercado Pago.");
  }

  return data.checkoutUrl;
};

const goToCheckout = async (plan) => {
  const url = CHECKOUT_URLS[plan];

  if (url) {
    window.location.href = url;
    return;
  }

  try {
    showToast("Abrindo checkout seguro do Mercado Pago...");
    const checkoutUrl = await createCheckout(plan);
    window.location.href = checkoutUrl;
  } catch (error) {
    showToast(error.message);
  }
};

const buildTranscriptText = (result) => {
  const lines = [
    `Arquivo: ${result.fileName || selectedFile.name}`,
    `Idioma: ${result.language || elements.language.value}`,
    `Formato escolhido: ${elements.outputFormat.value}`,
    `Modelo: ${result.model || "OpenAI"}`,
    "",
  ];

  if (elements.summary.checked && result.summary) {
    lines.push("Resumo executivo");
    lines.push(result.summary.trim());
    lines.push("");
  }

  if (Array.isArray(result.segments) && result.segments.length > 0) {
    lines.push("Transcricao");
    result.segments.forEach((segment) => {
      const start = formatTime(segment.start);
      const speaker = segment.speaker ? ` ${segment.speaker}:` : "";
      lines.push(`[${start}]${speaker} ${segment.text}`.trim());
    });
  } else {
    lines.push("Transcricao");
    lines.push(result.text || "Transcricao concluida, mas sem texto retornado.");
  }

  if (result.usage) {
    lines.push("");
    lines.push(`Uso da API: ${JSON.stringify(result.usage)}`);
  }

  return lines.join("\n");
};

const assertCanUseRealBackend = () => {
  if (window.location.protocol === "file:") {
    throw new Error("Para transcrever de verdade, publique no Netlify ou rode o site com Netlify Dev. Aberto como arquivo local, a funcao de servidor nao existe.");
  }
};

const friendlyErrorMessage = (message) => {
  const text = String(message || "");
  const lower = text.toLowerCase();

  if (lower.includes("incorrect api key") || lower.includes("valid issuer")) {
    return "A chave da OpenAI esta incorreta ou foi copiada incompleta. Crie uma nova no painel da OpenAI e salve no Netlify como OPENAI_API_KEY.";
  }

  return text || "Nao foi possivel transcrever agora.";
};

const transcribeAudio = async () => {
  const formData = new FormData();
  formData.append("audio", selectedFile);
  formData.append("fileName", selectedFile.name);
  formData.append("language", elements.language.value);
  formData.append("timestamps", String(elements.timestamps.checked));
  formData.append("speakers", String(elements.speakers.checked));
  formData.append("summary", String(elements.summary.checked));

  const response = await fetch("/.netlify/functions/transcribe", {
    method: "POST",
    body: formData,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(friendlyErrorMessage(data?.error));
  }

  return data;
};

const runTranscription = async () => {
  if (!selectedFile) {
    showToast("Selecione um arquivo de audio para comecar.");
    return;
  }

  if (selectedFile.size > MAX_AUDIO_SIZE) {
    setStatus("Arquivo grande", "locked");
    showToast("O limite atual da API e 25 MB por envio. Comprima o audio ou divida em partes.");
    elements.transcriptOutput.textContent = "Arquivo acima de 25 MB. Para audios muito longos em producao, use armazenamento em nuvem e processamento por partes.";
    return;
  }

  if (isFreeUsed()) {
    setStatus("Pagamento", "locked");
    openCheckout();
    showToast("Seu audio gratuito ja foi usado. Escolha um plano para continuar.");
    return;
  }

  try {
    assertCanUseRealBackend();
    window.clearInterval(progressTimer);
    setStatus("Enviando", "busy");
    elements.transcribeButton.disabled = true;
    elements.checkoutButton.disabled = true;
    elements.transcriptOutput.textContent = "Enviando audio para transcricao real...";
    setProgress(18, "Enviando audio");

    progressTimer = window.setInterval(() => {
      const current = Number.parseInt(elements.progressValue.textContent, 10) || 18;
      if (current < 88) {
        setProgress(current + 4, "Transcrevendo com IA");
      }
    }, 1200);

    const result = await transcribeAudio();

    window.clearInterval(progressTimer);
    setProgress(100, "Concluido");
    elements.transcriptOutput.textContent = buildTranscriptText(result);
    setStatus("Pronto");
    setFreeUsed();
    showToast("Transcricao real concluida.");
  } catch (error) {
    window.clearInterval(progressTimer);
    setProgress(0, "Falhou");
    setStatus("Erro", "locked");
    elements.transcriptOutput.textContent = error.message;
    showToast(error.message);
  } finally {
    elements.transcribeButton.disabled = false;
    elements.checkoutButton.disabled = false;
  }
};

elements.audioFile.addEventListener("change", (event) => {
  setSelectedFile(event.target.files[0] || null);
});

["dragenter", "dragover"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  elements.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.dropZone.classList.remove("is-dragging");
  });
});

elements.dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  elements.audioFile.files = event.dataTransfer.files;
  setSelectedFile(file);
});

elements.transcribeButton.addEventListener("click", runTranscription);
elements.checkoutButton.addEventListener("click", openCheckout);

document.querySelectorAll(".plan-button, .checkout-option").forEach((button) => {
  button.addEventListener("click", () => {
    goToCheckout(button.dataset.plan);
  });
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", closeCheckout);
});

elements.copyButton.addEventListener("click", async () => {
  const text = elements.transcriptOutput.textContent.trim();

  if (!text) {
    showToast("Ainda nao ha transcricao para copiar.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("Transcricao copiada.");
  } catch {
    showToast("Nao foi possivel copiar automaticamente.");
  }
});

const getTranscriptText = () => {
  const text = elements.transcriptOutput.textContent.trim();
  const placeholder = "Envie um audio";

  if (!text || text.startsWith(placeholder)) {
    showToast("Ainda nao ha transcricao para exportar.");
    return "";
  }

  return text;
};

elements.downloadTxtButton.addEventListener("click", () => {
  const text = getTranscriptText();
  if (!text) return;

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = selectedFile?.name?.replace(/\.[^.]+$/, "") || "transcricao";

  link.href = url;
  link.download = `${safeName}-turbotext.txt`;
  link.click();
  URL.revokeObjectURL(url);
});

elements.downloadPdfButton.addEventListener("click", () => {
  const text = getTranscriptText();
  if (!text) return;

  const printWindow = window.open("", "_blank", "width=820,height=920");
  if (!printWindow) {
    showToast("Permita pop-ups para salvar em PDF.");
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Transcricao TurboText AI</title>
        <style>
          body { font-family: Arial, sans-serif; color: #071225; padding: 32px; line-height: 1.55; }
          h1 { font-size: 24px; margin: 0 0 18px; }
          pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; }
        </style>
      </head>
      <body>
        <h1>Transcricao TurboText AI</h1>
        <pre></pre>
      </body>
    </html>
  `);
  printWindow.document.querySelector("pre").textContent = text;
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
});

["language", "outputFormat", "timestamps", "speakers", "summary"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener("change", renderUsage);
});

renderUsage();
setProgress(0, "Aguardando envio");

const applyOfferPositioning = () => {
  const pricingSection = document.querySelector("#precos");
  if (!pricingSection) return;

  const heading = pricingSection.querySelector(".section-heading h2");
  if (heading) {
    heading.textContent = "Mais minutos incluidos, extras mais baratos e saldo que acumula por 60 dias.";
  }

  const cards = pricingSection.querySelectorAll(".price-card");
  const avulso = cards[1];
  const pro = cards[2];
  const estudio = cards[3];

  if (avulso) {
    avulso.querySelector(".price").textContent = "R$ 0,79/min";
    const items = avulso.querySelectorAll("li");
    if (items[0]) items[0].textContent = "Minimo de R$ 14,90 por compra";
    if (items[1]) items[1].textContent = "Ideal para entrevistas e aulas";
    if (items[2]) items[2].textContent = "Resumo, falantes e exportacoes incluidos";
  }

  if (pro) {
    const items = pro.querySelectorAll("li");
    if (items[0]) items[0].textContent = "420 minutos incluidos por mes";
    if (items[1]) items[1].textContent = "Minutos nao usados acumulam por 60 dias";
    if (items[2]) items[2].textContent = "Extras por R$ 0,39/min";
  }

  if (estudio) {
    const items = estudio.querySelectorAll("li");
    if (items[0]) items[0].textContent = "1.800 minutos incluidos por mes";
    if (items[1]) items[1].textContent = "Saldo acumulado por 60 dias";
    if (items[2]) items[2].textContent = "Extras por R$ 0,29/min e prioridade";
  }

  const modalOptions = document.querySelectorAll(".checkout-option");
  if (modalOptions[0]) modalOptions[0].querySelector("span").textContent = "R$ 0,79 por minuto, minimo R$ 14,90";
  if (modalOptions[1]) modalOptions[1].querySelector("span").textContent = "R$ 79,90 por mes com 420 minutos acumulaveis";
  if (modalOptions[2]) modalOptions[2].querySelector("span").textContent = "R$ 249,90 por mes com 1.800 minutos acumulaveis";

  if (!document.querySelector(".advantage-band")) {
    pricingSection.insertAdjacentHTML(
      "afterend",
      `<section class="advantage-band">
        <div class="section-heading compact">
          <p class="eyebrow">Vantagem TurboText</p>
          <h2>Mais valor para quem transcreve audio longo de verdade.</h2>
        </div>
        <div class="advantage-grid">
          <article>
            <i data-lucide="calendar-plus" aria-hidden="true"></i>
            <h3>Minutos acumulaveis</h3>
            <p>O saldo nao usado fica disponivel por 60 dias, para o cliente nao perder minutos em meses mais tranquilos.</p>
          </article>
          <article>
            <i data-lucide="sparkles" aria-hidden="true"></i>
            <h3>Recursos sem taxa extra</h3>
            <p>Resumo executivo, separacao de falantes, marcadores de tempo e exportacoes entram no pacote.</p>
          </article>
          <article>
            <i data-lucide="clock-3" aria-hidden="true"></i>
            <h3>Feito para arquivos longos</h3>
            <p>Planos com mais minutos inclusos para entrevistas, aulas, reunioes, pesquisas e conteudos em outros idiomas.</p>
          </article>
        </div>
      </section>`
    );
  }
};

applyOfferPositioning();

if (window.lucide) {
  window.lucide.createIcons();
}
