const TATWEEL = new RegExp("\\u0640", "g");
const ARABIC_DIACRITICS = new RegExp("[\\u064B-\\u065F\\u0670]", "g");
const FORMAT_MARKS = new RegExp("[\\u200B-\\u200D\\uFEFF]", "g");

export const CRITICAL_REQUEST_PHRASES = {
  executeLogout: [
    "logout", "log out", "sign out", "signout", "log out karo", "logout kar do", "nikal do",
    "account band", "hesab band", "hesab khatam", "session band",
    "लॉग आउट", "लॉगआउट", "साइन आउट", "खाता बंद करो", "बाहर नकालो", "सेशन बंद करो",
    "لاگ آؤٹ", "سائن آؤٹ", "اکاؤنٹ بند کرو", "حساب بند کرو", "باہر نکالو", "سیشن بند کرو"
  ],
  disconnectCall: [
    "cut the call", "call cut", "cut call", "end call", "end the call", "hang up", "disconnect",
    "goodbye", "bye", "alvida", "call band", "band kar do", "band kar do call", "call khatam",
    "call tod", "call ruk", "baat khatam", "phone cut", "band karo",
    "कॉल काटो", "कॉल बंद करो", "कॉल खत्म करो", "फोन काटो", "बात खत्म", "अलवदा", "कनेशन तोड़ो",
    "کال کاٹو", "کال بند کرو", "کال ختم کرو", "فون کاٹو", "بات ختم", "الودا", "کنکشن توڑو"
  ]
};

export function normalizeUtterance(text) {
  return String(text || "")
    .replace(TATWEEL, "")
    .replace(ARABIC_DIACRITICS, "")
    .replace(FORMAT_MARKS, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function textMentionsPhrase(text, phrase) {
  const haystack = ` ${normalizeUtterance(text)} `;
  const needle = ` ${normalizeUtterance(phrase)} `;
  return needle.length > 2 && haystack.includes(needle);
}

export function textMentionsAny(text, phrases = []) {
  return phrases.some((phrase) => textMentionsPhrase(text, phrase));
}
