const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

const languageCodes = {
  Portugues: "pt",
  Ingles: "en",
  Espanhol: "es",
  Frances: "fr",
  Alemao: "de",
  Italiano: "it",
  Japones: "ja",
  Mandarim: "zh",
  Arabe: "ar",
};

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const normalizeSegments = (data) => {
  if (!Array.isArray(data?.segments)) return [];

  return data.segments
    .filter((segment) => segment && typeof segment.text === "string")
    .map((segment) => ({
      start: Number(segment.start) || 0,
      end: Number(segment.end) || 0,
      speaker: segment.speaker || "",
      text: segment.text.trim(),
    }));
};

const extractOutputText = (data) => {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  if (!Array.isArray(data?.output)) return "";

  return data.output
    .flatMap((item) => item.content || [])
    .map((content) => content.text || "")
    .join("\n")
    .trim();
};

const createSummary = async ({ apiKey, text, language }) => {
  if (!text || text.length < 120) return "";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL || "gpt-5.5",
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
      input: `Crie um resumo executivo curto, claro e fiel da transcricao abaixo. Responda no mesmo idioma principal do texto. Idioma informado: ${language || "automatico"}.\n\nTranscricao:\n${text.slice(0, 60000)}`,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return "";
  }

  return extractOutputText(data);
};

export default async (request) => {
  if (request.method === "OPTIONS") return json(200, { ok: true });
  if (request.method !== "POST") return json(405, { error: "Metodo nao permitido." });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(500, {
      error: "OPENAI_API_KEY nao configurada no Netlify. Adicione a chave em Site configuration > Environment variables.",
    });
  }

  try {
    const form = await request.formData();
    const audio = form.get("audio");
    const fileName = String(form.get("fileName") || audio?.name || "audio");
    const languageLabel = String(form.get("language") || "");
    const wantsSpeakers = String(form.get("speakers")) === "true";
    const wantsTimestamps = String(form.get("timestamps")) === "true";
    const wantsSummary = String(form.get("summary")) === "true";

    if (!audio || typeof audio.arrayBuffer !== "function") {
      return json(400, { error: "Nenhum arquivo de audio foi recebido." });
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return json(413, { error: "O arquivo ultrapassa 25 MB. Divida ou compacte o audio antes de enviar." });
    }

    const transcriptionForm = new FormData();
    transcriptionForm.append("file", audio, fileName);

    if (wantsSpeakers) {
      transcriptionForm.append("model", "gpt-4o-transcribe-diarize");
      transcriptionForm.append("response_format", "diarized_json");
      transcriptionForm.append("chunking_strategy", "auto");
    } else if (wantsTimestamps) {
      transcriptionForm.append("model", "whisper-1");
      transcriptionForm.append("response_format", "verbose_json");
      transcriptionForm.append("timestamp_granularities[]", "segment");
    } else {
      transcriptionForm.append("model", "gpt-4o-transcribe");
      transcriptionForm.append("response_format", "json");
    }

    const languageCode = languageCodes[languageLabel];
    if (languageCode) {
      transcriptionForm.append("language", languageCode);
    }

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: transcriptionForm,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return json(response.status, {
        error: data?.error?.message || "A API de transcricao recusou o audio.",
      });
    }

    const text = String(data.text || "").trim();
    const segments = normalizeSegments(data);
    const summary = wantsSummary ? await createSummary({ apiKey, text, language: languageLabel }) : "";

    return json(200, {
      fileName,
      language: data.language || languageLabel || "Detectado automaticamente",
      model: wantsSpeakers ? "gpt-4o-transcribe-diarize" : wantsTimestamps ? "whisper-1" : "gpt-4o-transcribe",
      text,
      segments,
      summary,
      duration: data.duration || null,
      usage: data.usage || null,
    });
  } catch (error) {
    return json(500, {
      error: error.message || "Erro inesperado ao transcrever.",
    });
  }
};

export const config = {
  path: "/.netlify/functions/transcribe",
};
