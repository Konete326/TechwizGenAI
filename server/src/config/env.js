import "dotenv/config";

const backendKeys = [
  process.env.GEMINI_BACKEND_KEY_1,
  process.env.GEMINI_BACKEND_KEY_2,
  process.env.GEMINI_BACKEND_KEY_3
].filter(Boolean);

if (backendKeys.length === 0 && process.env.GEMINI_API_KEY) {
  backendKeys.push(process.env.GEMINI_API_KEY);
}

const requiredKeys = [
  "PORT",
  "CLIENT_URL",
  "MONGO_URI",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET"
];

for (const key of requiredKeys) {
  if (!process.env[key]) {
    throw new Error("Missing required environment variables");
  }
}

if (backendKeys.length === 0) {
  throw new Error("Missing Gemini API keys in environment");
}

export const env = {
  PORT: process.env.PORT,
  SERVER_URL: process.env.SERVER_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  MONGO_URI: process.env.MONGO_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  GEMINI_API_KEY: backendKeys[0],
  GEMINI_BACKEND_KEYS: backendKeys,
  PRIMARY_BACKEND_MODEL: "gemini-3.8-flash",
  FALLBACK_BACKEND_MODEL: "gemini-3.7-flash",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
};

export default env;
