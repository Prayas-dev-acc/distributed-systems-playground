// When running via ngrok/tunnel (not localhost and no explicit env vars set),
// route backend requests through the Vite dev server proxy so the browser
// never tries to reach localhost:3001-3003 directly.
const isProxy =
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1" &&
  !import.meta.env.VITE_BACKEND_1_URL;

export const SERVER_URLS = [1, 2, 3].map((i) => {
  const envUrl = import.meta.env[`VITE_BACKEND_${i}_URL`];
  if (envUrl) return envUrl;
  return isProxy ? `/s${i}` : `http://localhost:${3000 + i}`;
});

export const SERVER_URL = SERVER_URLS[0];
