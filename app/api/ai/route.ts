import { NextRequest, NextResponse } from "next/server";
import {
  generateContent,
  buildDocumentPrompt,
  buildSummaryPrompt,
  buildEditPrompt,
  buildQAPrompt,
  type AIMode,
} from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { mode, prompt, context } = (await req.json()) as {
      mode: AIMode;
      prompt: string;
      context?: string;
    };

    if (!prompt) {
      return NextResponse.json({ error: "الطلب مطلوب" }, { status: 400 });
    }

    let fullPrompt: string;

    switch (mode) {
      case "create":
        fullPrompt = buildDocumentPrompt(prompt);
        break;
      case "summarize":
        if (!context) return NextResponse.json({ error: "النص مطلوب للتلخيص" }, { status: 400 });
        fullPrompt = buildSummaryPrompt(context);
        break;
      case "edit":
        if (!context) return NextResponse.json({ error: "النص الأصلي مطلوب" }, { status: 400 });
        fullPrompt = buildEditPrompt(context, prompt);
        break;
      case "qa":
        if (!context) return NextResponse.json({ error: "النص مطلوب للإجابة" }, { status: 400 });
        fullPrompt = buildQAPrompt(context, prompt);
        break;
      default:
        fullPrompt = prompt;
    }

    const result = await generateContent(fullPrompt);
    return NextResponse.json({ result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "خطأ غير معروف";
    console.error("AI API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
