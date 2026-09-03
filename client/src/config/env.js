export const VITE_API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const VITE_SERVER_URL = import.meta.env.VITE_SERVER_URL || VITE_API_URL.replace(/\/api\/?$/, "");

export default VITE_API_URL;
