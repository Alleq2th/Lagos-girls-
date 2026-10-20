// Lagos Girls chatbot — keyword intent scoring, free flowing, human

export type ChatPersonality = "soft" | "wild" | "tease" | "chill";

const PERSONALITIES: ChatPersonality[] = ["soft", "wild", "tease", "chill"];

export function getPersonality(seed: string): ChatPersonality {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i) * (i + 1)) % 997;
  return PERSONALITIES[h % PERSONALITIES.length];
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function delayFeel(): number {
  return 1600 + Math.floor(Math.random() * 2800);
}

function lower(s: string) {
  return (s || "").toLowerCase().trim();
}

// Score how many keywords from a bag appear in the message (word-boundary aware where useful)
function scoreKeywords(msg: string, keywords: string[]): number {
  const t = lower(msg);
  let score = 0;
  for (const k of keywords) {
    if (t.includes(k)) score += k.includes(" ") ? 2 : 1; // phrases weigh more
  }
  return score;
}

type Intent =
  | "day"
  | "how_are"
  | "wyd"
  | "meet"
  | "name"
  | "location"
  | "services"
  | "pay"
  | "serious"
  | "naughty"
  | "compliment"
  | "greet"
  | "love"
  | "age"
  | "photo"
  | "fallback";

const INTENT_KEYS: Record<Intent, string[]> = {
  day: [
    "how was your day", "how was the day", "how's your day", "how is your day",
    "your day", "today was", "all day", "my day",
  ],
  how_are: [
    "how are you", "how r you", "how are u", "how far", "how you dey",
    "you good", "you okay", "how you", "you alright", "how have you been",
  ],
  wyd: [
    "what are you doing", "what you doing", "wyd", "wetin you dey",
    "what u doing", "you busy", "what you on", "what are u doing", "up to",
  ],
  meet: [
    "meet up", "meet you", "come meet", "come see", "see you", "visit",
    "link up", "come over", "where can we", "come to", "i want to come",
    "how can i come", "how is that possible", "in person", "physical",
  ],
  name: [
    "your name", "ur name", "whats your name", "what's your name",
    "what is your name", "who are you", "call you", "real name",
  ],
  location: [
    "where are you", "where you stay", "where you live", "location",
    "which area", "island", "mainland", "lekki", "ikeja", "where from",
  ],
  services: [
    "services", "service", "video call", "custom video", "private chat",
    "what do you offer", "what can you do", "packages", "menu",
  ],
  pay: [
    "how can i pay", "how do i pay", "payment", "pay", "transfer",
    "account number", "how much", "price", "naira", "money", "cost",
    "join", "book", "subscribe",
  ],
  serious: [
    "im serious", "i'm serious", "i am serious", "for real", "fr fr",
    "not joking", "really serious", "i mean it", "i mean yeah",
  ],
  naughty: [
    "fuck", "sex", "dick", "pussy", "ass", "boobs", "nudes", "nude",
    "horny", "wet", "cum", "suck", "ride", "bang", "sleep with", "naked",
    "send pic", "send nudes", "blowjob", "doggy", "tits", "body",
  ],
  compliment: [
    "beautiful", "fine girl", "sexy", "hot", "pretty", "cute", "baddie",
    "gorgeous", "looking good", "fine", "handsome", "nice body", "your body",
  ],
  greet: [
    "hi", "hey", "hello", "hii", "heyy", "yo", "sup", "good morning",
    "good evening", "good afternoon", "howdy",
  ],
  love: ["love you", "miss you", "i like you", "crush", "fall for"],
  age: ["how old", "your age", "ur age", "age"],
  photo: ["send photo", "send pic", "picture", "selfie", "show me"],
  fallback: [],
};

function detectIntent(msg: string): Intent {
  const t = lower(msg);
  const words = t.split(/\s+/).filter(Boolean);

  // Pure short greeting
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

  // greet only if short and no stronger intent
  if (bestScore === 0 && words.length <= 4 && INTENT_KEYS.greet.some((g) => t.includes(g))) {
    return "greet";
  }

  return bestScore > 0 ? best : "fallback";
}

const REPLIES: Record<Intent, Record<ChatPersonality, string[]>> = {
  day: {
    soft: [
      "my day was slow i just stayed in the house scrolling and eating",
      "nothing serious woke up late did my hair and laid down",
      "quiet day kind of lonely actually glad you texted",
      "fine just been lazy today what about yours",
    ],
    wild: [
      "day was boring as fuck till you texted",
      "wasted the whole day in bed honestly",
      "long day i need someone to spoil me rn",
      "meh better now that somebody interesting showed up",
    ],
    tease: [
      "day was mid hope yours was better",
      "survived another day in lagos thats all",
      "nothing worth talking about unless you make it interesting",
      "okayish mostly waiting for someone to entertain me",
    ],
    chill: [
      "normal day nothing special how was yours",
      "just hustle and rest same thing",
      "it was fine just the usual",
      "chilled most of the day",
    ],
  },
  how_are: {
    soft: [
      "im good baby just been lazy today missing a little attention",
      "im finee bored in the house talk to me",
      "okayy just finished bathing",
      "im alright better now that you texted",
    ],
    wild: [
      "im horny as fuck ngl dont even ask",
      "bored and feeling some type of way",
      "im good just need a real distraction",
      "finee what you on tho",
    ],
    tease: [
      "im fine why you asking though",
      "depends who is asking",
      "better now that you showed up",
      "im okay just thinking things",
    ],
    chill: [
      "im good you",
      "fine just here",
      "same old how you",
      "not bad just chilling",
    ],
  },
  wyd: {
    soft: [
      "just laying down on my bed doing nothing really",
      "watching random stuff on my phone",
      "about to sleep but not sleepy talk to me",
      "just finished eating now im free",
    ],
    wild: [
      "in bed half naked honestly",
      "bored as hell on my phone thinking things",
      "waiting for someone interesting",
      "nothing productive just feeling myself",
    ],
    tease: [
      "why do you want to know",
      "something you cant see from there",
      "just here thinking of a little trouble",
      "nothing much you tell me first",
    ],
    chill: [
      "just here phone and bed",
      "chilling nothing serious",
      "same thing as always",
      "just on my phone",
    ],
  },
  meet: {
    soft: [
      "meet up is not that simple baby we barely know each other talk to me first",
      "slow down talk properly first then we see",
      "maybe someday if the vibe is right not right now",
      "i dont just meet people like that but i like your energy keep talking",
    ],
    wild: [
      "you want to meet or you just talking big",
      "if youre serious we can talk about it but its not free and not today",
      "lagos is big where exactly are you even",
      "show me youre not wasting my time first then we talk meet up",
    ],
    tease: [
      "meet up costs more than sweet words",
      "you think its that easy just type come meet me",
      "earn a little trust first",
      "maybe if you stop rushing",
    ],
    chill: [
      "we just started talking calm down",
      "not that easy",
      "maybe later not now",
      "talk first properly",
    ],
  },
  name: {
    soft: [
      "you already see my name on the profile silly",
      "its on my page baby",
      "use the name you see here thats what everyone calls me",
    ],
    wild: [
      "its right there on my profile",
      "you texting me and dont know the name you opened",
      "check the top of this chat",
    ],
    tease: [
      "you opened my profile and still asking",
      "read the name then come back",
      "its on my page dont play",
    ],
    chill: [
      "check my profile",
      "its on my page",
      "you already know it",
    ],
  },
  location: {
    soft: [
      "im in lagos baby where are you",
      "around the city why you asking",
      "lagos... you",
    ],
    wild: [
      "lagos where else",
      "city side why",
      "not far if youre actually serious",
    ],
    tease: [
      "why do you need my location already",
      "lagos is enough for now",
      "curious one",
    ],
    chill: [
      "lagos",
      "around lagos",
      "city",
    ],
  },
  services: {
    soft: [
      "yes i have services on my profile video call custom video private chat check the prices there",
      "i do video call and custom content if youre serious open my profile and see",
      "my services are listed on my page we can do more than text",
    ],
    wild: [
      "yeah i do video calls customs private chat prices are on my profile",
      "want more than text check my services on my page",
      "profile has everything if youre actually serious",
    ],
    tease: [
      "talk is cheap services are on my page with prices",
      "if youre ready for more open my profile",
      "my services arent free check the list",
    ],
    chill: [
      "services are on my profile",
      "check my page for prices",
      "i offer video call and custom stuff",
    ],
  },
  pay: {
    soft: [
      "for now payment is sorted after you pick a service on my profile then we arrange transfer",
      "choose what you want from my services then message me the one you picked",
      "pick a service first then i tell you how to pay",
    ],
    wild: [
      "pick the service you want on my profile then we talk payment",
      "choose first then i give you transfer details",
      "dont just say pay tell me which service",
    ],
    tease: [
      "which service exactly then we talk money",
      "open my profile pick one then come back",
      "be specific what are you booking",
    ],
    chill: [
      "pick a service on my profile first",
      "tell me which one then we sort payment",
      "check my services then say which",
    ],
  },
  serious: {
    soft: [
      "okay if youre serious open my profile pick the service you want and tell me",
      "good then choose video call or custom or private chat and we go from there",
      "alright show me by picking what you want on my page",
    ],
    wild: [
      "okay serious people pick a service and say it clearly",
      "then say which one video call custom or private chat",
      "actions not just words pick something",
    ],
    tease: [
      "serious how prove it pick a service",
      "okay then which package",
      "talk is still talk until you choose",
    ],
    chill: [
      "okay pick a service then",
      "which one do you want",
      "say the service",
    ],
  },
  naughty: {
    soft: [
      "youre making me blush slow down a little",
      "baby calm down or dont what do you want from me",
      "i like when you talk like that tell me exactly",
      "dont start what you cant finish",
    ],
    wild: [
      "fuck say more dont stop",
      "im already feeling some type of way just from this",
      "come and show me then stop talking only",
      "dont play if youre not serious",
    ],
    tease: [
      "you talk big for someone behind a screen",
      "and then what",
      "make me believe you",
      "keep going im listening",
    ],
    chill: [
      "damn okay say more",
      "you always this direct",
      "hmm continue",
      "interesting",
    ],
  },
  compliment: {
    soft: [
      "aww thank you baby that was sweet",
      "youre making me shy",
      "hmm i like when you talk like that",
      "thank you",
    ],
    wild: [
      "i know say it again",
      "keep talking like that and see what happens",
      "you better mean every word",
      "mmm okay continue",
    ],
    tease: [
      "only if you mean it",
      "prove it then",
      "flattery will get you somewhere maybe",
      "noted",
    ],
    chill: [
      "thanks",
      "appreciate",
      "cool",
      "alright i hear you",
    ],
  },
  greet: {
    soft: [
      "heyyy whats up",
      "hi baby how are you",
      "hey you finally texted",
      "hii how is your day going",
    ],
    wild: [
      "heyyy",
      "oh hi whats good",
      "yo what you want",
      "hi talk to me",
    ],
    tease: [
      "heyy stranger",
      "look who it is",
      "hi took you a minute",
      "heyyy what do you want from me",
    ],
    chill: [
      "hey whats up",
      "hi how far",
      "yo",
      "whats good",
    ],
  },
  love: {
    soft: [
      "aww you barely know me",
      "slow down but i like the energy",
      "hmm well see",
    ],
    wild: [
      "easy we just started",
      "save that energy",
      "talk first",
    ],
    tease: [
      "too fast",
      "you dont even know me yet",
      "prove youre not playing",
    ],
    chill: [
      "slow down",
      "we just met here",
      "okay",
    ],
  },
  age: {
    soft: ["old enough baby thats all you need"],
    wild: ["legal and dangerous next question"],
    tease: ["why do you need my age already"],
    chill: ["adult next"],
  },
  photo: {
    soft: [
      "photos are on my profile and private content is paid check there",
      "i dont send free pics baby check my page",
    ],
    wild: [
      "free pics no check my services",
      "profile first private stuff costs",
    ],
    tease: [
      "you want free show open my profile",
      "paid content lives on my page",
    ],
    chill: [
      "check my profile",
      "not free",
    ],
  },
  fallback: {
    soft: [
      "hmm tell me more about that",
      "okayy im listening continue",
      "what else is on your mind",
      "thats interesting keep talking",
      "mmm go on",
    ],
    wild: [
      "lol and then what",
      "say that again properly",
      "hmm im listening",
      "keep talking dont stop",
      "interesting continue",
    ],
    tease: [
      "is that so",
      "go on im curious",
      "hmm and you",
      "dont leave me hanging",
      "okay prove it",
    ],
    chill: [
      "okay i see continue",
      "cool",
      "yeah and",
      "alright talk",
      "i hear you",
    ],
  },
};

export function generateReply(
  userMessage: string,
  personality: ChatPersonality,
  _history: { role: "user" | "girl"; text: string }[] = [],
  girlName?: string
): string {
  const intent = detectIntent(userMessage);

  // Name intent can use display name if provided
  if (intent === "name" && girlName) {
    const variants = [
      `they call me ${girlName}`,
      `${girlName} thats me`,
      `its ${girlName} like on my profile`,
    ];
    return pick(variants);
  }

  // If naughty + services both score, sometimes pitch services
  const t = lower(userMessage);
  if (intent === "naughty" && scoreKeywords(t, INTENT_KEYS.services) > 0) {
    return pick(REPLIES.services[personality]);
  }

  // serious after pay/services context
  if (intent === "serious") {
    return pick(REPLIES.serious[personality]);
  }

  const bank = REPLIES[intent]?.[personality] || REPLIES.fallback[personality];
  return pick(bank);
}

export function generateOpener(personality: ChatPersonality): string {
  return pick(REPLIES.greet[personality]);
}
