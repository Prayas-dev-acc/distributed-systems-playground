import { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { SERVER_URLS } from "../utils/serverUrls.js";

export function useServers() {
  const [serverHealth, setServerHealth] = useState(
    SERVER_URLS.map((url, i) => ({
      id: `server-${i + 1}`,
      url,
      port: 3001 + i,
      status: "unknown",
      checks: {},
      uptime: 0,
    }))
  );
  const [sockets, setSockets]       = useState([]);
  const [requestLogs, setRequestLogs] = useState([]);

  const pollHealth = useCallback(async () => {
    const results = await Promise.allSettled(
      SERVER_URLS.map((url) =>
        fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) }).then((r) => r.json())
      )
    );
    setServerHealth((prev) =>
      prev.map((s, i) => {
        const result = results[i];
        if (result.status === "fulfilled") {
          return { ...s, ...result.value, status: result.value.status };
        }
        return { ...s, status: "error", checks: {} };
      })
    );
  }, []);

  useEffect(() => {
    pollHealth();
    const interval = setInterval(pollHealth, 5000);

    const newSockets = SERVER_URLS.map((url, i) => {
      // If URL is a proxy path (relative, starts with /), connect Socket.io
      // to the current origin with a path-based prefix so it goes through Vite proxy.
      const socket = url.startsWith("/")
        ? io(window.location.origin, { path: `${url}/socket.io`, transports: ["websocket"] })
        : io(url, { transports: ["websocket"] });

      socket.on("request_log", (entry) => {
        setRequestLogs((prev) => [entry, ...prev].slice(0, 100));
      });
      return socket;
    });

    setSockets(newSockets);
    return () => {
      clearInterval(interval);
      newSockets.forEach((s) => s.disconnect());
    };
  }, [pollHealth]);

  return { serverHealth, sockets, requestLogs, SERVER_URLS };
}
