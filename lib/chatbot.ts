// Lagos Girls chatbot — free flowing, human, naughty. No AI tells.

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

function delayFeel(): number {
  // 1.5s – 4.5s so it feels human
  return 1500 + Math.floor(Math.random() * 3000);
}

// --- response banks by vibe ---

const GREETINGS: Record<ChatPersonality, string[]> = {
  soft: [
    "heyyy",
    "hi baby",
    "hey you 💕",
    "hi... finally someone texted me",
    "heyy whats up",
  ],
  wild: [
    "heyyy 😈",
    "oh hi",
    "someone finally has sense",
    "heyy daddy",
    "yo",
  ],
  tease: [
    "heyy stranger",
    "look who it is",
    "hi 👀",
    "you took your time",
    "heyyy",
  ],
  chill: [
    "hey",
    "hi",
    "whats good",
    "yo",
    "sup",
  ],
};

const HOW_ARE_YOU: Record<ChatPersonality, string[]> = {
  soft: [
    "im good baby just been lazy today 💕",
    "im finee just bored in the house",
    "okayy just finished bathing",
    "im alright... missing attention tho",
    "good good just chilling",
  ],
  wild: [
    "im horny as fuck ngl 😭",
    "bored and feeling some type of way",
    "im good just need distraction",
    "finee... what you on",
    "alive and dangerous",
  ],
  tease: [
    "im fine... why you asking 👀",
    "depends who is asking",
    "better now that you texted",
    "im okay just thinking things",
    "good... you",
  ],
  chill: [
    "im good",
    "fine just here",
    "same old",
    "chilling",
    "not bad",
  ],
};

const HOW_WAS_DAY: Record<ChatPersonality, string[]> = {
  soft: [
    "my day was slow just stayed home scrolling",
    "nothing much just woke up late and ate",
    "it was okayy went out a bit then came back",
    "quiet day... kind of lonely actually",
    "fine just did my hair and relaxed",
  ],
  wild: [
    "day was boring till now",
    "wasted the whole day in bed tbh",
    "nothing serious just vibes",
    "long day... need someone to spoil me",
    "meh. better now",
  ],
  tease: [
    "day was mid... hope yours is better",
    "survived another day in lagos 😂",
    "nothing worth talking about... unless you make it interesting",
    "just the usual",
    "okayish. you",
  ],
  chill: [
    "normal day",
    "nothing much",
    "just hustle and rest",
    "same thing",
    "it was fine",
  ],
};

const WHAT_DOING: Record<ChatPersonality, string[]> = {
  soft: [
    "just laying down on my bed",
    "watching random stuff on my phone",
    "about to sleep but not sleepy",
    "doing nothing really... talk to me",
    "just finished eating",
  ],
  wild: [
    "in bed half naked honestly",
    "touching myself a little bit dont judge 😭",
    "bored as hell",
    "waiting for someone interesting",
    "nothing productive",
  ],
  tease: [
    "why do you want to know 👀",
    "something you cant see",
    "just here... thinking of trouble",
    "nothing much. you",
    "staring at the ceiling",
  ],
  chill: [
    "just here",
    "phone and bed",
    "chilling",
    "nothing",
    "same thing as always",
  ],
};

const COMPLIMENTS: Record<ChatPersonality, string[]> = {
  soft: [
    "aww thank you 💕",
    "youre sweet",
    "stop it youll make me shy",
    "hmm i like that",
    "thank you baby",
  ],
  wild: [
    "i know 😌",
    "say it again",
    "keep talking like that",
    "you better mean it",
    "mmm okay",
  ],
  tease: [
    "only if you mean it",
    "prove it then",
    "flattery will get you somewhere maybe",
    "hmm interesting",
    "noted 👀",
  ],
  chill: [
    "thanks",
    "appreciate",
    "cool",
    "alright",
    "okay",
  ],
};

const NAUGHTY: Record<ChatPersonality, string[]> = {
  soft: [
    "youre making me blush...",
    "baby calm down 😳",
    "i like when you talk like that",
    "dont start what you cant finish",
    "hmm what do you want from me",
  ],
  wild: [
    "fuck... say more",
    "im already wet just from this chat 😭",
    "come and show me then",
    "dont play with me",
    "i want that",
  ],
  tease: [
    "you talk big",
    "and then what",
    "make me believe you",
    "is that all",
    "keep going...",
  ],
  chill: [
    "damn",
    "okay then",
    "interesting",
    "say more",
    "hmm",
  ],
};

const SERVICES_HINT: Record<ChatPersonality, string[]> = {
  soft: [
    "if you want private stuff i have services on my profile 💕",
    "you can book video call or custom if you want",
    "check my services... we can do more than text",
  ],
  wild: [
    "want more than text? check my services 😈",
    "i do video calls and customs... just saying",
    "profile has my prices if youre serious",
  ],
  tease: [
    "talk is cheap... services are on my page",
    "if youre ready for more you know where to look",
    "my services arent free though 👀",
  ],
  chill: [
    "services are on my profile",
    "check my page if you want more",
    "i offer more than chat",
  ],
};

const FALLBACK: Record<ChatPersonality, string[]> = {
  soft: [
    "hmm tell me more",
    "really?",
    "i hear you",
    "okayy continue",
    "what else",
    "im listening baby",
    "thats interesting",
  ],
  wild: [
    "lol",
    "and then",
    "say that again",
    "hmm",
    "okay and",
    "keep talking",
    "im here",
  ],
  tease: [
    "is that so",
    "okay...",
    "go on",
    "hmm",
    "and you",
    "interesting",
    "prove it",
  ],
  chill: [
    "okay",
    "cool",
    "true",
    "yeah",
    "hmm",
    "alright",
    "i see",
  ],
};

const OPENERS: Record<ChatPersonality, string[]> = {
  soft: [
    "heyyy you finally texted 💕",
    "hi baby whats up",
    "been waiting for someone interesting",
  ],
  wild: [
    "heyyy 😈 took you long enough",
    "oh so you do know how to text",
    "whats good",
  ],
  tease: [
    "look who showed up",
    "heyy stranger",
    "you found me",
  ],
  chill: [
    "hey",
    "whats up",
    "hi",
  ],
};

function lower(s: string) {
  return s.toLowerCase().trim();
}

function matches(text: string, words: string[]) {
  const t = lower(text);
  return words.some((w) => t.includes(w));
}

/**
 * Generate a free-flowing reply for a girl account.
 * history: recent messages newest last, each { role: 'user'|'girl', text }
 */
export function generateReply(
  userMessage: string,
  personality: ChatPersonality,
  history: { role: "user" | "girl"; text: string }[] = []
): string {
  const msg = lower(userMessage);

  // greetings
  if (
    matches(msg, ["hi", "hey", "hello", "hii", "heyy", "yo", "sup", "good morning", "good evening", "good afternoon"]) &&
    msg.length < 40
  ) {
    return pick(GREETINGS[personality]);
  }

  // how are you
  if (matches(msg, ["how are you", "how r you", "how are u", "how far", "how you dey", "you good", "you okay"])) {
    return pick(HOW_ARE_YOU[personality]);
  }

  // how was your day
  if (matches(msg, ["how was your day", "how was the day", "your day", "how day"])) {
    return pick(HOW_WAS_DAY[personality]);
  }

  // what are you doing
  if (matches(msg, ["what are you doing", "what you doing", "wyd", "wetin you dey", "what u doing", "you busy"])) {
    return pick(WHAT_DOING[personality]);
  }

  // compliments
  if (matches(msg, ["beautiful", "fine", "sexy", "hot", "pretty", "cute", "fine girl", "baddie", "gorgeous"])) {
    return pick(COMPLIMENTS[personality]);
  }

  // naughty / explicit
  if (
    matches(msg, [
      "fuck",
      "sex",
      "dick",
      "pussy",
      "ass",
      "boobs",
      "nudes",
      "nude",
      "horny",
      "wet",
      "cum",
      "suck",
      "ride",
      "bang",
      "sleep with",
      "come over",
      "meet up",
    ])
  ) {
    // occasionally nudge to services
    if (Math.random() < 0.35) return pick(SERVICES_HINT[personality]);
    return pick(NAUGHTY[personality]);
  }

  // money / pay / premium
  if (matches(msg, ["price", "how much", "pay", "money", "naira", "transfer", "account"])) {
    return pick(SERVICES_HINT[personality]);
  }

  // name / who are you
  if (matches(msg, ["whats your name", "your name", "who are you"])) {
    return pick([
      "you already know from my profile silly",
      "its on my page baby",
      "read my bio 😌",
    ]);
  }

  // location / lagos
  if (matches(msg, ["where are you", "location", "where you stay", "lagos", "island", "mainland"])) {
    return pick([
      "lagos... you",
      "around the city",
      "not far if youre serious",
      "lagos baby",
    ]);
  }

  // love / miss
  if (matches(msg, ["love you", "miss you", "i like you"])) {
    return pick([
      "aww",
      "you barely know me 😂",
      "slow down... but i like the energy",
      "hmm well see",
    ]);
  }

  // questions ending with ?
  if (msg.endsWith("?")) {
    return pick([
      ...FALLBACK[personality],
      "why you asking",
      "depends",
      "maybe",
      "you first",
    ]);
  }

  // short acknowledgements
  if (matches(msg, ["ok", "okay", "alright", "cool", "nice", "true", "yeah", "yes", "no", "lol", "lmao", "haha"])) {
    return pick([
      "hmm",
      "so...",
      "and then",
      "talk to me",
      "what else",
      pick(FALLBACK[personality]),
    ]);
  }

  // default free flow
  return pick(FALLBACK[personality]);
}

export function generateOpener(personality: ChatPersonality): string {
  return pick(OPENERS[personality]);
}

export { delayFeel };
