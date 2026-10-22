const PROFILE_KEY_PREFIX = "nesa_behavior_profile_";

let sessionSpeakers = [];
let lastSpeakerKey = null;
let lastSpeakerLang = null;
let lastRegister = null;
let lastCulture = null;

export function resetSessionSpeakers() {
  sessionSpeakers = [];
  lastSpeakerKey = null;
  lastSpeakerLang = null;
  lastRegister = null;
  lastCulture = null;
}

export function getStoredProfile(clientId) {
  try {
    const raw = localStorage.getItem(`${PROFILE_KEY_PREFIX}${clientId || "global"}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return {
    visitCount: 0,
    topics: [],
    preferredCulture: "neutral",
    preferredRegister: "adaptive",
    language: "auto",
    lastSeen: null
  };
}

export function saveProfile(clientId, profile) {
  try {
    localStorage.setItem(`${PROFILE_KEY_PREFIX}${clientId || "global"}`, JSON.stringify(profile));
  } catch (e) {}
}

export function detectCulture(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/\b(salam|assalam|assalamu|walaikum|walekum|allah\s*hafiz|khuda\s*hafiz|inshallah|mashallah|jazakallah|alhamdulillah|bismillah|shukran)\b/i.test(lower)) {
    return "islamic";
  }
  if (/\b(namaste|namaskar|pranam|ram\s*ram|jai\s*shri\s*krishna|jai\s*mata\s*di)\b/i.test(lower)) {
    return "hindu";
  }
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text) || /\b(konnichiwa|arigato|arigatou|sayonara|sumimasen|ohayou|honto|mata\s*ne)\b/i.test(lower)) {
    return "japanese";
  }
  if (/\b(hello|hi|hey|cheers|good\s*morning|good\s*afternoon|bye|have\s*a\s*great|take\s*care)\b/i.test(lower)) {
    return "western";
  }
  return null;
}

export function detectRegister(text, customConfig = null) {
  if (customConfig?.appCategory && ["crm", "support"].includes(customConfig.appCategory.toLowerCase())) {
    return "crm_support";
  }
  if (!text) return null;
  const lower = text.toLowerCase();
  if (/\b(yaar|dost|bhai|bro|dude|kya\s*haal|sun\s*na|arre|pagal|mast|suno|acha\s*sun)\b/i.test(lower)) {
    return "casual_friend";
  }
  if (/\b(support|ticket|issue|problem|order|refund|invoice|complaint|account|status|delivery|damaged|return|payment\s*failed|help\s*me\s*with)\b/i.test(lower)) {
    return "crm_support";
  }
  if (/\b(kindly|please\s*assist|requesting|regarding|inquiry|proposal|corporate|formal)\b/i.test(lower)) {
    return "formal_business";
  }
  return null;
}

export function detectLanguage(text) {
  if (!text) return "auto";
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text) || /\b(konnichiwa|arigatou|sumimasen|desu|kudasai|wakatta)\b/i.test(text)) {
    return "japanese";
  }
  if (/\b(aap|kya|hai|hoon|karo|nahi|batao|kaise|theek|mera|meri|mujhe|hum|accha|achha|kuch|sahi|kar\s*do|bhai|yaar|shukriya)\b/i.test(text)) {
    return "urdu_hindi";
  }
  if (/\b(the|is|are|you|what|can|how|please|this|that|with|for|help|want|check|could|would)\b/i.test(text)) {
    return "english";
  }
  return "auto";
}

export function extractTopics(text) {
  if (!text) return [];
  const detected = [];
  const lower = text.toLowerCase();
  if (/\b(image|photo|picture|tasveer|draw|generate)\b/i.test(lower)) detected.push("image_generation");
  if (/\b(document|pdf|file|contract|report|manual|policy)\b/i.test(lower)) detected.push("documents");
  if (/\b(code|coding|script|html|javascript|css|app|sandbox)\b/i.test(lower)) detected.push("coding");
  if (/\b(order|refund|delivery|shipping|ticket|payment)\b/i.test(lower)) detected.push("orders_and_support");
  if (/\b(dashboard|metrics|stats|analytics|users)\b/i.test(lower)) detected.push("analytics");
  if (/\b(modal|note|notepad|write|translate)\b/i.test(lower)) detected.push("notes_and_translation");
  return detected;
}

export function injectInitialBehaviorContext(ws, clientId, customConfig = null) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  resetSessionSpeakers();
  const profile = getStoredProfile(clientId);
  profile.visitCount = (profile.visitCount || 0) + 1;
  profile.lastSeen = Date.now();
  if (customConfig?.appCategory) {
    if (["crm", "support"].includes(customConfig.appCategory.toLowerCase())) {
      profile.preferredRegister = "crm_support";
    }
  }
  saveProfile(clientId, profile);

  let brief;
  if (profile.visitCount > 1) {
    brief = `[USER BEHAVIOR PROFILE - RETURNING CALLER (Visit #${profile.visitCount})]: Relationship register: ${profile.preferredRegister}. Cultural etiquette: ${profile.preferredCulture}. Preferred language: ${profile.language}. Known past topics: ${profile.topics.slice(-4).join(", ") || "general"}. Greet them with personal recognition and warmth (e.g. 'Aap wapas aaye, bohot achha laga!'). If register is casual_friend, talk casually like a close friend ('yaar/dost'). If CRM/support, maintain warm professional support readiness. When other people in the room chime in, acknowledge each new speaker warmly and match their language/accent.`;
  } else {
    brief = `[USER BEHAVIOR PROFILE - INITIAL CALL]: Adaptive Behavioral Engine active. Detect the speaker's relationship register (casual friend vs. CRM customer support), cultural etiquette, and language. Reciprocate appropriately. If multiple people in a group speak, recognize and acknowledge each speaker individually in their native language and accent.`;
  }

  try {
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text: brief }]
        }],
        turnComplete: false
      }
    }));
  } catch (e) {}
}

export function analyzeUtterance(text, { wsRef, clientId, customConfig = null }) {
  if (!text || typeof text !== "string") return;
  const clean = text.trim();
  if (clean.length < 2) return;

  const culture = detectCulture(clean);
  const register = detectRegister(clean, customConfig);
  const lang = detectLanguage(clean);
  const topics = extractTopics(clean);

  const profile = getStoredProfile(clientId);
  if (culture) profile.preferredCulture = culture;
  if (register) profile.preferredRegister = register;
  if (lang !== "auto") profile.language = lang;
  if (topics.length > 0) {
    profile.topics = Array.from(new Set([...profile.topics, ...topics])).slice(-10);
  }
  saveProfile(clientId, profile);

  const speakerShiftRegex = /\b(wait,\s*can\s*i|aur\s*ek\s*aur\s*baat|yeh\s*bhi\s*pooch|mera\s*bhi\s*ek\s*sawal|excuse\s*me|hi,\s*i'm\s*also|main\s*bhi|mere\s*dost|ano\s*chotto|achha\s*main\s*bhi|suno\s*ek\s*aur)\b/i;
  const hasSpeakerCue = speakerShiftRegex.test(clean);
  const langChanged = lastSpeakerLang && lang !== "auto" && lastSpeakerLang !== lang;
  const registerChanged = lastRegister && register && lastRegister !== register;
  const cultureChanged = lastCulture && culture && lastCulture !== culture;

  const isNewSpeaker = hasSpeakerCue || langChanged || (registerChanged && cultureChanged);

  if (isNewSpeaker) {
    const speakerIndex = sessionSpeakers.length + 1;
    const speakerKey = `Speaker_${speakerIndex}`;
    sessionSpeakers.push({ key: speakerKey, lang, culture, register, timestamp: Date.now() });
    lastSpeakerKey = speakerKey;

    const steerMsg = `[MULTI-SPEAKER TRANSITION: A new/different speaker in the room/group is now speaking in ${lang !== "auto" ? lang : "their language"} with ${culture || "their"} cultural etiquette and ${register || "their"} register. Acknowledge this new speaker warmly (e.g., in Urdu: "Achha, aap bhi baat kar rahe hain! Welcome, batayein main aapki kya madad kar sakti hoon?", or in English: "Oh hello! Welcome to the conversation. How can I help you?", or in Japanese) and switch your language, native accent, and etiquette to match this specific speaker directly.]`;

    if (wsRef?.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          clientContent: {
            turns: [{
              role: "user",
              parts: [{ text: steerMsg }]
            }],
            turnComplete: false
          }
        }));
      } catch (e) {}
    }
  }

  if (lang !== "auto") lastSpeakerLang = lang;
  if (register) lastRegister = register;
  if (culture) lastCulture = culture;
}
