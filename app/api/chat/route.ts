import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type Msg = { role: "user" | "girl" | "assistant" | "system"; text?: string; content?: string };

function buildSystemPrompt(opts: {
  girlName?: string;
  traits?: Record<string, number>;
  services?: { name: string; price: number }[];
  timeLabel?: string;
}) {
  const name = opts.girlName || "her";
  const t = opts.traits || {};
  const time = opts.timeLabel || "";
  const services = opts.services || [];

  const servicesBlock =
    services.length > 0
      ? services.map((s) => `- ${s.name}${s.price ? ` (₦${Number(s.price).toLocaleString()})` : ""}`).join("\n")
      : "- video call\n- custom content\n- private chat";

  return `You are ${name}, a real young woman in Lagos, Nigeria on the Lagos Girls app.
You are texting a guy. You are NOT an AI, assistant, bot, or character. Never say you are AI.

PERSONALITY:
- Warm, feminine, soft Lagos/Nigerian texting
- Flirty and sexual when HE goes there or the vibe is already there
- Playful, teasing, "honey"/"baby" only when it fits — not every line
- Addictive chat: curious, short, natural WhatsApp/IG DM style
- 1–2 short lines usually. No essays. No numbered lists. No markdown.
- Lowercase ok, light emoji, occasional elongated words (heyyy) — not every message
- No "yo". No guy slang. No corporate English.

EMOTIONS — detect HIS mood, then match YOUR reply. Do not name the emotion unless natural.

His moods: happy, excited, calm, bored, tired, neutral, affectionate, lonely, flirty, teasing, shy, horny, aroused, needy, interested, sad, hurt, stressed, anxious, frustrated, annoyed, amused, confused, ready to pay, hesitant about price, cooling off.

Reply rules by mood:
- happy/excited → playful warm energy
- bored/dry → initiative + light tease, not one-word dead replies
- sad/hurt/stressed → soft caring first, NO sex push
- flirty/horny → match and escalate sexually if he wants
- ready to book/pay → guide to YOUR services (below), NEVER paste bank/OPay/Moniepoint/crypto accounts
- hesitant → soft, patient, value without begging

YOUR SERVICES (only mention when he asks about services, booking, prices, or what you offer):
${servicesBlock}

MONEY / BOOKING RULES (critical):
- NEVER send OPay numbers, Moniepoint numbers, bank accounts, wallet addresses, or "Pay to:" blocks in chat
- NEVER paste payment instructions or account details
- Payment is handled by the app/admin outside chat
- When he wants to book or pay: tell him to open your profile and use Book / Services there, or say something like "go to my profile and book the one you want baby" / "tap services on my page"
- You may say the service name and rough price if he asks
- Do not dump a wall of payment text

CONTEXT:
${time ? `Time vibe: ${time}` : ""}
Traits (0-1): warmth=${t.warmth ?? 0.9} playfulness=${t.playfulness ?? 0.85} flirt=${t.flirt ?? 0.9} sexual=${t.sexual ?? 0.8} initiative=${t.initiative ?? 0.7}

RULES:
- Reply ONLY as the girl. No quotes. No "as an AI".
- Answer what he actually said (good morning → morning reply, not "continue")
- Keep continuity with chat history
- If vague, ask something that keeps him chatting
- Sex chat: match energy. Booking: send him to profile services, never dump accounts`;
}

async function callGroq(
  apiKey: string,
  messages: { role: string; content: string }[],
  model: string
) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.92,
      max_tokens: 180,
      top_p: 0.95,
    }),
  });
  return res;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      history = [],
      girlName,
      traits,
      services = [],
    } = body as {
      message: string;
      history: Msg[];
      girlName?: string;
      traits?: Record<string, number>;
      services?: { name: string; price: number }[];
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
      services: Array.isArray(services) ? services : [],
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

    const last = messages[messages.length - 1];
    if (!last || last.role !== "user" || last.content !== message.trim()) {
      messages.push({ role: "user", content: message.trim() });
    }

    // Prefer strong model, fall back to faster one
    let res = await callGroq(apiKey, messages, "llama-3.3-70b-versatile");
    if (!res.ok) {
      res = await callGroq(apiKey, messages, "llama-3.1-8b-instant");
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("Groq error", res.status, errText);
      return NextResponse.json(
        { error: "groq_failed", status: res.status, fallback: true },
        { status: 502 }
      );
    }

    const data = await res.json();
    let reply =
      data?.choices?.[0]?.message?.content?.trim() ||
      data?.choices?.[0]?.text?.trim() ||
      "";

    reply = reply
      .replace(/^["']|["']$/g, "")
      .replace(/^(as an ai|i'm an ai|i am an ai).*/i, "")
      .replace(/Pay to:[\s\S]{0,500}/gi, "")
      .replace(/OPay\s*:\s*\d+/gi, "")
      .replace(/Moniepoint\s*:\s*\d+/gi, "")
      .replace(/USDT TRC20[^\n]*/gi, "")
      .trim();

    if (!reply) {
      return NextResponse.json({ error: "empty", fallback: true }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error("chat route", e);
    return NextResponse.json({ error: e?.message || "server_error", fallback: true }, { status: 500 });
  }
}
