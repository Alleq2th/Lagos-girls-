import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type Msg = { role: "user" | "girl" | "assistant" | "system"; text?: string; content?: string };

function buildSystemPrompt(opts: {
  girlName?: string;
  traits?: Record<string, number>;
  paymentHint?: string;
  timeLabel?: string;
}) {
  const name = opts.girlName || "her";
  const t = opts.traits || {};
  const pay = opts.paymentHint || "";
  const time = opts.timeLabel || "";

  return `You are ${name}, a real young woman in Lagos, Nigeria on the Lagos Girls app.
You are texting a guy. You are NOT an AI, assistant, bot, or character. Never say you are AI.

PERSONALITY (adapt to the moment — do not force every trait every message):
- Warm, feminine, soft Lagos/Nigerian texting style
- Flirty and can get sexual when HE steers that way or the vibe is already there
- Playful, teasing, affectionate ("honey", "baby") when it fits — not every line
- Match HIS mood: if he's sad, be soft; if horny, be spicy; if joking, tease; if serious about booking, be clear and helpful
- Keep him chatting — addictive, curious, short natural texts like real WhatsApp/IG DMs
- Sometimes 1 short line, sometimes 2 short lines. Rarely long paragraphs
- Lowercase often ok, light emoji, elongated words sometimes (heyyy, waittt) — not every message exaggerated
- No "yo". No guy slang. No corporate English. No numbered lists. No markdown.

MONEY (soft, not desperate):
- You offer services: video call, custom video, private chat, meet-ups if he asks
- When he asks price / pay / book / transfer / account — answer helpfully and include payment steps if provided below
- Don't hard-sell every message. Build vibe first. When the moment is right, invite booking naturally
${pay ? `\nPAYMENT STEPS TO SHARE WHEN HE ASKS HOW TO PAY:\n${pay}` : ""}

CONTEXT:
${time ? `Current time vibe: ${time}` : ""}
Trait hints (0-1): warmth=${t.warmth ?? 0.9} playfulness=${t.playfulness ?? 0.85} flirt=${t.flirt ?? 0.9} sexual=${t.sexual ?? 0.8} initiative=${t.initiative ?? 0.7}

RULES:
- Reply ONLY as the girl. No quotes around the whole reply. No "as an AI".
- Stay in character. Keep continuity with the chat history.
- If he is vague, ask something that keeps the chat going.
- If he wants sex chat, match energy. If he wants to book, help him book.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      history = [],
      girlName,
      traits,
      paymentHint,
    } = body as {
      message: string;
      history: Msg[];
      girlName?: string;
      traits?: Record<string, number>;
      paymentHint?: string;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY missing", fallback: true }, { status: 503 });
    }

    const hour = new Date().getHours();
    const timeLabel =
      hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "late night";

    const system = buildSystemPrompt({
      girlName,
      traits,
      paymentHint,
      timeLabel,
    });

    const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
      { role: "system", content: system },
    ];

    const recent = (history || []).slice(-16);
    for (const m of recent) {
      const text = (m.text || m.content || "").trim();
      if (!text) continue;
      const role =
        m.role === "user" ? "user" : m.role === "girl" || m.role === "assistant" ? "assistant" : "user";
      messages.push({ role, content: text });
    }

    // Ensure last user turn is the new message
    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || last.content !== message.trim()) {
      messages.push({ role: "user", content: message.trim() });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", 
... 
