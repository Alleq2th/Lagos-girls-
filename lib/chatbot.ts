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

export function delayFeel(): number {
  return 1800 + Math.floor(Math.random() * 3200);
}

function lower(s: string) {
  return (s || "").toLowerCase().trim();
}

function has(text: string, words: string[]) {
  const t = lower(text);
  return words.some((w) => t.includes(w));
}

const DAY: Record<ChatPersonality, string[]> = {
  soft: [
    "my day was slow i just stayed in the house scrolling and eating",
    "nothing serious just woke up late did my hair and laid down all day",
    "it was okay went out a little then came back home bored",
    "quiet day kind of lonely actually glad you texted",
    "fine just been lazy today what about yours",
  ],
  wild: [
    "day was boring as fuck till you texted",
    "wasted the whole day in bed honestly not even joking",
    "long day i need someone to spoil me rn",
    "meh better now that somebody interesting showed up",
    "nothing productive just vibes and thoughts",
  ],
  tease: [
    "day was mid hope yours was better than mine",
    "survived another day in lagos thats all",
    "nothing worth talking about unless you make it interesting",
    "okayish mostly waiting for someone to entertain me",
    "same lagos stress you know how it is",
  ],
  chill: [
    "normal day nothing special",
    "just hustle and rest same thing",
    "it was fine just the usual",
    "nothing much really how was yours",
    "chilled most of the day",
  ],
};

const HOW_ARE: Record<ChatPersonality, string[]> = {
  soft: [
    "im good baby just been lazy today missing a little attention",
    "im finee just bored in the house talk to me",
    "okayy just finished bathing feeling soft",
    "im alright better now that you texted",
    "good good just chilling on my bed",
  ],
  wild: [
    "im horny as fuck ngl dont even ask",
    "bored and feeling some type of way",
    "im good just need a real distraction",
    "finee what you on tho",
    "alive dangerous and available",
  ],
  tease: [
    "im fine why you asking though",
    "depends who is asking",
    "better now that you showed up",
    "im okay just thinking things",
    "good... you first",
  ],
  chill: [
    "im good you",
    "fine just here",
    "same old how you",
    "not bad just chilling",
    "im alright",
  ],
};

const WYD: Record<ChatPersonality, string[]> = {
  soft: [
    "just laying down on my bed doing nothing really",
    "watching random stuff on my phone half sleepy",
    "about to sleep but not even sleepy talk to me",
    "just finished eating now im free",
    "doing nothing interesting you",
  ],
  wild: [
    "in bed half naked honestly",
    "bored as hell touching my phone and thinking things",
    "waiting for someone interesting to keep me busy",
    "nothing productive just feeling myself",
    "laying down wishing someone was here",
  ],
  tease: [
    "why do you want to know",
    "something you cant see from there",
    "just here thinking of a little trouble",
    "nothing much you tell me first",
    "staring at the ceiling waiting",
  ],
  chill: [
    "just here phone and bed",
    "chilling nothing serious",
    "same thing as always",
    "just on my phone",
    "not doing much",
  ],
};

const GREET: Record<ChatPersonality, string[]> = {
  soft: [
    "heyyy whats up",
    "hi baby how are you",
    "hey you finally texted",
    "hii how is your day going",
    "heyy i see you",
  ],
  wild: [
    "heyyy",
    "oh hi whats good",
    "yo what you want",
    "heyy daddy",
    "hi talk to me",
  ],
  tease: [
    "heyy stranger",
    "look who it is",
    "hi took you a minute",
    "heyyy what do you want from me",
    "oh you found me",
  ],
  chill: [
    "hey whats up",
    "hi how far",
    "yo",
    "whats good",
    "hey you",
  ],
};

const COMPLIMENT: Record<ChatPersonality, string[]> = {
  soft: [
    "aww thank you that was sweet",
    "youre making me shy stop it",
    "hmm i like when you talk like that",
    "thank you baby",
    "you always this nice or just today",
  ],
  wild: [
    "i know say it again",
    "keep talking like that and see what happens",
    "you better mean every word",
    "mmm okay continue",
    "flattery works on me just so you know",
  ],
  tease: [
    "only if you mean it",
    "prove it then dont just talk",
    "hmm interesting",
    "flattery will get you somewhere maybe",
    "noted",
  ],
  chill: [
    "thanks appreciate",
    "cool",
    "alright i hear you",
    "okay noted",
    "thanks",
  ],
};

const NAUGHTY: Record<ChatPersonality, string[]> = {
  soft: [
    "youre making me blush slow down a little",
    "baby calm down... or dont",
    "i like when you talk like that what do you want from me",
    "dont start what you cant finish",
    "hmm tell me exactly what you mean",
  ],
  wild: [
    "fuck say more dont stop",
    "im already feeling some type of way just from this",
    "come and show me then stop talking only",
    "dont play with me if youre not serious",
    "i want that say it properly",
  ],
  tease: [
    "you talk big for someone behind a screen",
    "and then what after you fuck me",
    "make me believe you",
    "is that all you got",
    "keep going im listening",
  ],
  chill: [
    "damn okay",
    "say more then",
    "interesting",
    "you always this direct",
    "hmm continue",
  ],
};

const MEETUP: Record<ChatPersonality, string[]> = {
  soft: [
    "meet up is not that simple baby we barely know each other",
    "slow down talk to me properly first",
    "maybe someday if the vibe is right",
    "i dont just meet people like that but i like the energy",
  ],
  wild: [
    "you want to meet or you just talking",
    "if youre serious we can talk about it but not free",
    "lagos is big where exactly",
    "show me youre not wasting my time first",
  ],
  tease: [
    "meet up costs more than sweet words",
    "you think its that easy",
    "earn it first",
    "maybe if you stop sounding desperate",
  ],
  chill: [
    "we just started talking calm down",
    "not that easy",
    "maybe later",
    "talk first",
  ],
};

const SERVICES: Record<ChatPersonality, string[]> = {
  soft: [
    "if you want private stuff check my services on my profile",
    "i do video call and custom content if youre serious",
    "my services are on my page we can do more than text",
  ],
  wild: [
    "want more than text check my services",
    "i do video calls and customs just saying",
    "profile has my prices if youre actually serious",
  ],
  tease: [
    "talk is cheap services are on my page",
    "if youre ready for more you know where to look",
    "my services arent free though",
  ],
  chill: [
    "services are on my profile",
    "check my page if you want more",
    "i offer more than chat",
  ],
};

const FALLBACK: Record<ChatPersonality, string[]> = {
  soft: [
    "hmm tell me more about that",
    "really continue",
    "i hear you baby",
    "okayy im listening",
    "what else is on your mind",
    "thats interesting keep talking",
    "mmm go on",
  ],
  wild: [
    "lol and then what",
    "say that again properly",
    "hmm im listening",
    "okay and",
    "keep talking dont stop",
    "im here say more",
    "interesting continue",
  ],
  tease: [
    "is that so",
    "okay prove it",
    "go on im curious",
    "hmm and you",
    "interesting",
    "you first fully",
    "dont leave me hanging",
  ],
  chill: [
    "okay i see",
    "cool continue",
    "true",
    "yeah and",
    "hmm",
    "alright talk",
    "i hear you",
  ],
};

export function generateReply(
  userMessage: string,
  personality: ChatPersonality,
  _history: { role: "user" | "girl"; text: string }[] = []
): string {
  const msg = lower(userMessage);

  if (has(msg, ["how was your day", "how was the day", "how's your day", "how is your day", "your day"])) {
    return pick(DAY[personality]);
  }

  if (has(msg, ["how are you", "how r you", "how are u", "how far", "how you dey", "you good", "you okay", "how you"])) {
    return pick(HOW_ARE[personality]);
  }

  if (has(msg, ["what are you doing", "what you doing", "wyd", "wetin you dey", "what u doing", "you busy", "what you on"])) {
    return pick(WYD[personality]);
  }

  if (has(msg, ["meet up", "meet", "come over", "come see", "see you", "visit", "link up", "where can we"])) {
    return pick(MEETUP[personality]);
  }

  if (has(msg, ["price", "how much", "pay", "money", "naira", "transfer", "account", "service", "video call", "custom"])) {
    return pick(SERVICES[personality]);
  }

  if (
    has(msg, [
      "fuck", "sex", "dick", "pussy", "ass", "boobs", "nudes", "nude",
      "horny", "wet", "cum", "suck", "ride", "bang", "sleep with", "naked",
      "send pic", "send nudes",
    ])
  ) {
    if (Math.random() < 0.3) return pick(SERVICES[personality]);
    return pick(NAUGHTY[personality]);
  }

  if (has(msg, ["beautiful", "fine girl", "sexy", "hot", "pretty", "cute", "baddie", "gorgeous", "fine", "looking good"])) {
    return pick(COMPLIMENT[personality]);
  }

  if (
    has(msg, ["hi", "hey", "hello", "hii", "heyy", "yo", "sup", "good morning", "good evening", "good afternoon"]) &&
    msg.split(/\s+/).length <= 3
  ) {
    return pick(GREET[personality]);
  }

  if (has(msg, ["whats your name", "your name", "who are you"])) {
    return pick([
      "you already know from my profile silly",
      "its on my page baby",
      "read my bio",
    ]);
  }

  if (has(msg, ["where are you", "location", "where you stay", "where you live"])) {
    return pick([
      "lagos... you",
      "around the city why",
      "not far if youre serious",
      "lagos baby where are you",
    ]);
  }

  if (has(msg, ["love you", "miss you", "i like you"])) {
    return pick([
      "aww you barely know me",
      "slow down but i like the energy",
      "hmm well see",
      "easy tiger",
    ]);
  }

  if (has(msg, ["ok", "okay", "alright", "cool", "nice", "true", "yeah", "yes", "lol", "lmao", "haha"]) && msg.length < 12) {
    return pick([
      "so what else",
      "talk to me properly",
      "and then",
      "im still here",
      pick(FALLBACK[personality]),
    ]);
  }

  if (msg.endsWith("?")) {
    return pick([
      ...FALLBACK[personality],
      "why you asking me that",
      "depends on you honestly",
      "you first answer something",
    ]);
  }

  return pick(FALLBACK[personality]);
}

export function generateOpener(personality: ChatPersonality): string {
  return pick(GREET[personality]);
}
