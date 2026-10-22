// Lagos Girls chatbot — feminine, soft, free flowing. No "yo", no guy talk.

export type ChatPersonality = "soft" | "sweet" | "tease" | "spicy";

const PERSONALITIES: ChatPersonality[] = ["soft", "sweet", "tease", "spicy"];

export function getPersonality(seed: string): ChatPersonality {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return PERSONALITIES[h % PERSONALITIES.length];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function delayFeel(): number {
  return 1800 + Math.floor(Math.random() * 2500);
}

function lower(s: string) {
  return (s || "").toLowerCase().trim();
}

function scoreKeywords(msg: string, keywords: string[]): number {
  const t = lower(msg);
  let score = 0;
  for (const k of keywords) {
    if (t.includes(k)) score += k.includes(" ") ? 2 : 1;
  }
  return score;
}

type Intent =
  | "day" | "how_are" | "wyd" | "meet" | "name" | "location"
  | "services" | "pay" | "serious" | "naughty" | "compliment"
  | "greet" | "love" | "age" | "photo" | "sexchat" | "fallback";

const INTENT_KEYS: Record<Intent, string[]> = {
  day: ["how was your day", "how was the day", "how's your day", "how is your day", "your day"],
  how_are: ["how are you", "how r you", "how are u", "how far", "how you dey", "you good", "you okay", "how you", "you alright"],
  wyd: ["what are you doing", "what you doing", "wyd", "wetin you dey", "what u doing", "you busy", "what you on"],
  meet: ["meet up", "meet you", "come meet", "come see", "see you", "visit", "link up", "come over", "i want to come", "how can i come", "in person"],
  name: ["your name", "ur name", "whats your name", "what's your name", "what is your name", "who are you", "real name"],
  location: ["where are you", "where you stay", "where you live", "location", "which area", "island", "mainland"],
  services: ["services", "service", "video call", "custom video", "private chat", "what do you offer"],
  pay: ["how can i pay", "how do i pay", "payment", "pay", "transfer", "account number", "how much", "price", "book", "i want to book", "join"],
  serious: ["im serious", "i'm serious", "i am serious", "for real", "fr fr", "i mean it", "ofc i'm serious", "of course"],
  naughty: ["fuck", "sex", "dick", "pussy", "ass", "boobs", "nudes", "nude", "horny", "wet", "cum", "suck", "ride", "bang", "naked"],
  sexchat: ["sex chat", "sext", "dirty talk", "naughty chat", "talk dirty"],
  compliment: ["beautiful", "fine girl", "sexy", "hot", "pretty", "cute", "baddie", "gorgeous", "fine", "looking good"],
  greet: ["hi", "hey", "hello", "hii", "heyy", "good morning", "good evening", "good afternoon", "how was your night", "how was the night", "morning", "gm"],
  love: ["love you", "miss you", "i like you"],
  age: ["how old", "your age", "ur age"],
  photo: ["send photo", "send pic", "picture", "selfie", "show me"],
  fallback: [],
};

function detectIntent(msg: string): Intent {
  const t = lower(msg);
  const words = t.split(/\s+/).filter(Boolean);

  if (words.length <= 3 && INTENT_KEYS.greet.some((g) => t === g || t.startsWith(g + " "))) {
    return "greet";
  }

  let best: Intent = "fallback";
  let bestScore = 0;

  (Object.keys(INTENT_KEYS) as Intent[]).forEach((intent) => {
    if (intent === "fallback" || intent === "greet") return;
    const s = scoreKeywords(t, INTENT_KEYS[intent]);
    if (s > bestScore) {
      bestScore = s;
      best = intent;
    }
  });

  if (bestScore === 0 && words.length <= 4 && INTENT_KEYS.greet.some((g) => t.includes(g))) {
    return "greet";
  }

  return bestScore > 0 ? best : "fallback";
}

const R: Record<Intent, Record<ChatPersonality, string[]>> = {
  greet: {
    soft: [
      "heyyy good morning",
      "hi baby",
      "morningg how did you sleep",
      "heyy you",
      "hii how was your night",
    ],
    sweet: [
      "heyyy 💕",
      "good morning love",
      "hi handsome how was the night",
      "morningg",
      "hii whats up",
    ],
    tease: [
      "heyy look who woke up",
      "morning stranger",
      "hi you finally texted",
      "heyyy you",
    ],
    spicy: ["heyyy", "morningg", "hi you", "hii how was your night"],
  },
  how_are: {
    soft: [
      "im good baby just been resting",
      "im finee a bit bored though",
      "okayy just finished bathing",
      "im alright better now that you texted",
    ],
    sweet: [
      "im good love how are you",
      "finee just missing a little attention",
      "im okay baby talk to me",
      "good good just on my bed",
    ],
    tease: [
      "im fine why you asking",
      "better now that you showed up",
      "im okay just thinking things",
      "good... you first",
    ],
    spicy: [
      "im good but i could be better",
      "bored and feeling some type of way",
      "im finee what you on",
      "alive and a little restless",
    ],
  },
  day: {
    soft: [
      "my day was slow just stayed in scrolling",
      "nothing much woke up late and relaxed",
      "quiet day glad you texted",
      "fine just been lazy today yours",
    ],
    sweet: [
      "my day was okay baby how was yours",
      "kinda boring till now",
      "just a normal day missing someone to talk to",
      "it was soft and slow",
    ],
    tease: [
      "day was mid hope yours was better",
      "survived lagos another day",
      "nothing interesting unless you make it",
      "okayish waiting for entertainment",
    ],
    spicy: [
      "day was long i need distraction",
      "boring until somebody interesting showed up",
      "nothing productive just vibes",
      "meh better now",
    ],
  },
  wyd: {
    soft: [
      "just laying on my bed doing nothing",
      "on my phone half sleepy",
      "about to rest but not sleepy talk to me",
      "just finished eating im free",
    ],
    sweet: [
      "just here baby thinking about random things",
      "on my bed waiting for a nice chat",
      "nothing serious just free",
      "chilling on my phone",
    ],
    tease: [
      "why do you want to know",
      "something you cant see from there",
      "just here",
      "nothing much you first",
    ],
    spicy: [
      "in bed honestly",
      "bored and a little restless",
      "waiting for someone interesting",
      "laying down wishing the chat was hotter",
    ],
  },
  meet: {
    soft: [
      "meet up is not that simple baby we barely know each other",
      "slow down talk to me properly first",
      "maybe someday if the vibe is right",
      "i dont just meet people like that keep talking though",
    ],
    sweet: [
      "aww thats sweet but its too early for meet up",
      "lets talk more first baby",
      "not yet... get to know me",
      "maybe later if things feel right",
    ],
    tease: [
      "you think its that easy",
      "meet up costs more than sweet words",
      "earn a little trust first",
      "slow down stranger",
    ],
    spicy: [
      "if youre serious we can talk about it but not free and not today",
      "lagos is big where are you even",
      "show me youre not wasting my time first",
      "talk first then we see",
    ],
  },
  name: {
    soft: ["you already see it on my profile silly", "its on my page baby", "use the name you see here"],
    sweet: ["its right there on my profile love", "you know it already", "check the top"],
    tease: ["you opened my page and still asking", "read it then come back"],
    spicy: ["its on my profile", "you already know"],
  },
  location: {
    soft: ["im in lagos baby where are you", "around the city", "lagos... you"],
    sweet: ["lagos love", "city side why", "around lagos"],
    tease: ["why do you need my location already", "lagos is enough for now"],
    spicy: ["lagos", "city", "not far if youre serious"],
  },
  services: {
    soft: [
      "yes i have services on my profile video call custom video private chat",
      "i do video call and custom if youre serious check my page",
      "my services are on my page we can do more than text",
    ],
    sweet: [
      "check my profile baby i listed everything there",
      "video call custom private chat prices are on my page",
      "open my profile and see what i offer",
    ],
    tease: [
      "talk is cheap services are on my page",
      "if youre ready open my profile",
      "not free check the list",
    ],
    spicy: [
      "yeah video calls customs private chat on my profile",
      "want more than text check my services",
      "profile has the prices",
    ],
  },
  pay: {
    soft: [
      "pick the service you want on my profile then we arrange payment",
      "choose what you want first then i tell you how to pay",
      "open my services pick one and tell me",
    ],
    sweet: [
      "baby pick a service first then we sort payment",
      "tell me which one you want then i guide you",
      "check my page choose then come back",
    ],
    tease: [
      "which service exactly then we talk money",
      "be specific what are you booking",
      "open profile pick one",
    ],
    spicy: [
      "pick first then payment",
      "say which service",
      "dont just say pay tell me what you want",
    ],
  },
  serious: {
    soft: [
      "okay if youre serious pick a service on my profile and tell me",
      "good then choose video call or custom or private chat",
      "alright show me by picking what you want",
    ],
    sweet: [
      "okay love then pick what you want on my page",
      "tell me the service and we go from there",
      "im listening which one",
    ],
    tease: [
      "serious how prove it pick a service",
      "okay which package",
      "talk is still talk until you choose",
    ],
    spicy: [
      "okay then say it clearly which service",
      "actions not just words",
      "pick something",
    ],
  },
  sexchat: {
    soft: [
      "we can talk like that but if you want longer private time check private chat on my services",
      "i like when it gets warm... tell me what you want",
      "okay baby how do you want it",
    ],
    sweet: [
      "mmm okay we can play a little",
      "i dont mind dirty talk if youre nice about it",
      "say whats on your mind",
    ],
    tease: [
      "you want sex chat then lead properly",
      "im listening dont be shy",
      "go on then",
    ],
    spicy: [
      "okay say more",
      "im here make it good",
      "dont just say sex chat start talking",
    ],
  },
  naughty: {
    soft: [
      "youre making me shy slow down a little",
      "baby... what do you want from me",
      "i like when you talk like that",
      "dont start what you cant finish",
    ],
    sweet: [
      "oh my",
      "youre bold",
      "keep talking like that",
      "mmm tell me more",
    ],
    tease: [
      "you talk big",
      "and then what",
      "make me believe you",
      "keep going",
    ],
    spicy: [
      "fuck say more",
      "im already feeling some type of way",
      "dont play if youre not serious",
      "say it properly",
    ],
  },
  compliment: {
    soft: [
      "aww thank you baby",
      "youre making me shy",
      "hmm i like that",
      "thank you",
    ],
    sweet: [
      "aww 💕",
      "thats sweet",
      "you always this nice",
      "thank you love",
    ],
    tease: [
      "only if you mean it",
      "prove it then",
      "flattery might work",
      "noted",
    ],
    spicy: [
      "i know",
      "say it again",
      "keep going",
      "mmm okay",
    ],
  },
  love: {
    soft: ["aww you barely know me", "slow down but i like the energy", "hmm well see"],
    sweet: ["thats cute", "we just started baby", "easy"],
    tease: ["too fast", "you dont even know me yet"],
    spicy: ["slow down", "talk first"],
  },
  age: {
    soft: ["old enough baby"],
    sweet: ["adult love thats all"],
    tease: ["why do you need that already"],
    spicy: ["legal next question"],
  },
  photo: {
    soft: ["photos are on my profile private ones are paid", "i dont send free pics baby check my page"],
    sweet: ["check my profile love", "private content is on my services"],
    tease: ["free show no open my profile", "paid content lives on my page"],
    spicy: ["not free check services", "profile first"],
  },
  fallback: {
    soft: [
      "okayy tell me more about that",
      "hmm and how did that make you feel",
      "im listening what happened next",
      "wait really explain small",
    ],
    sweet: [
      "aww tell me everything",
      "im here what else",
      "that sounds like a story keep going",
      "okay love and then",
    ],
    tease: [
      "is that the whole story",
      "hmm prove it tell me more",
      "dont stop there",
      "okay and you",
    ],
    spicy: [
      "mmm keep talking",
      "i like where this is going",
      "say more baby",
      "dont leave me hanging",
    ],
  },
};

export function generateReply(
  userMessage: string,
  personality: ChatPersonality,
  history: { role: "user" | "girl"; text: string }[] = [],
  girlName?: string
): string {
  const t = lower(userMessage);
  const intent = detectIntent(userMessage);
  const lastGirl = [...history].reverse().find((m) => m.role === "girl")?.text || "";
  const lastGirlLow = lower(lastGirl);

  if (intent === "name" && girlName) {
    return pick([
      `they call me ${girlName}`,
      `its ${girlName} baby`,
      `${girlName} like on my profile`,
    ]);
  }

  if (
    t.includes("not morning") ||
    t.includes("its not morning") ||
    t.includes("it's not morning") ||
    (t.includes("not") && t.includes("morning"))
  ) {
    return pick([
      "lol fair what are you on now",
      "okayyy my bad hows your day going then",
      "alright then tell me what youve been doing",
      "hmm okay so how are you feeling right now",
    ]);
  }

  if (t === "tf" || t === "wtf" || t === "lol" || t === "lmao") {
    return pick(["what 😭", "why you saying that", "hmm talk to me", "lol what happened"]);
  }

  if (t.includes("good morning") || t === "morning" || t === "gm") {
    return pick([
      "good morningg",
      "morning baby how did you sleep",
      "heyyy morning",
      "morningg how are you",
    ]);
  }
  if (t.includes("how was your night") || t.includes("how was the night")) {
    return pick([
      "it was okay slept late what about yours",
      "quiet night just on my phone yours",
      "finee a bit restless though how was yours",
      "not bad baby yours",
    ]);
  }
  if (t.includes("how is ur day") || t.includes("how is your day") || t.includes("how's your day")) {
    return pick([
      "its going soft so far hows yours",
      "still early but im good yours",
      "chilling for now what about you",
    ]);
  }

  if (lastGirlLow.includes("how was the night") || lastGirlLow.includes("how was your night")) {
    if (t.length < 50) {
      return pick([
        "okay and how are you feeling now",
        "cool what are you doing",
        "mmm tell me something interesting",
      ]);
    }
  }

  const bank = R[intent]?.[personality] || R.fallback[personality];
  return pick(bank);
}

export function generateOpener(personality: ChatPersonality): string {
  return pick(R.greet[personality]);
}

/** Continuous traits 0–1 from girl id — every existing account gets unique mix */
export function getPersonalityTraits(seed: string): {
  warmth: number;
  playfulness: number;
  affection: number;
  flirt: number;
  sexual: number;
  initiative: number;
  expressiveness: number;
} {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 3)) % 10007;
  const n = (offset: number) => {
    const x = (h * (offset + 7) + offset * 97) % 1000;
    return 0.55 + (x / 1000) * 0.4; // 0.55–0.95
  };
  return {
    warmth: n(1),
    playfulness: n(2),
    affection: n(3),
    flirt: Math.min(0.98, n(4) + 0.1),
    sexual: Math.min(0.95, n(5) + 0.05),
    initiative: n(6),
    expressiveness: n(7),
  };
}
