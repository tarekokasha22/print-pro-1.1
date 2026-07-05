const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
// gemini-1.5-flash was retired on the v1beta endpoint; 2.5-flash is the current
// stable flash model. Override with GEMINI_MODEL if you ever need a different one.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type AIMode = "create" | "edit" | "summarize" | "qa";

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
    };
  }>;
}

export async function generateContent(
  prompt: string,
  context?: string
): Promise<string> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
    throw new Error(
      "مفتاح Gemini غير مُهيّأ. أضف GEMINI_API_KEY في ملف .env.local ثم أعد تشغيل الخادم."
    );
  }

  const fullPrompt = context
    ? `السياق:\n${context}\n\nالطلب:\n${prompt}`
    : prompt;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  // The flash models occasionally return 503/429 under load; retry briefly so
  // transient demand spikes don't surface to the user as a hard error.
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`${GEMINI_BASE_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (response.ok) {
      const data: GeminiResponse = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    lastErr = await response.text();
    if (response.status !== 503 && response.status !== 429) break;
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }

  throw new Error(`Gemini API error: ${lastErr}`);
}

export function buildDocumentPrompt(userPrompt: string): string {
  return `أنت مساعد كتابة متخصص باللغة العربية. مهمتك إنشاء وثيقة احترافية كاملة.

طلب المستخدم: ${userPrompt}

يرجى إنشاء الوثيقة بالتنسيق التالي:
- استخدم عناوين واضحة (##)
- استخدم نقاط والقوائم عند الحاجة
- الكتابة باللغة العربية الفصحى
- المحتوى مفصل ومفيد
- أضف مقدمة وخاتمة

ابدأ مباشرة بالوثيقة دون مقدمات:`;
}

export function buildSummaryPrompt(text: string): string {
  return `لخّص النص التالي باللغة العربية بشكل واضح ومختصر مع الحفاظ على النقاط الرئيسية:

${text}

الملخص:`;
}

export function buildEditPrompt(originalText: string, instruction: string): string {
  return `قم بتعديل النص التالي وفقاً للتعليمات المحددة:

النص الأصلي:
${originalText}

تعليمات التعديل:
${instruction}

النص المعدّل (باللغة العربية):`;
}

export function buildQAPrompt(text: string, question: string): string {
  return `بناءً على النص التالي، أجب على السؤال بشكل دقيق ومفصل باللغة العربية:

النص:
${text}

السؤال: ${question}

الإجابة:`;
}
