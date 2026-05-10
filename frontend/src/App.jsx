import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MainApp from "./MainApp.jsx";
import LandingPage from "./components/LandingPage.jsx";

const CHECK_URLS = [
  import.meta.env.VITE_BACKEND_1_URL || "http://localhost:3001",
  import.meta.env.VITE_BACKEND_2_URL || "http://localhost:3002",
  import.meta.env.VITE_BACKEND_3_URL || "http://localhost:3003",
];

export default function App() {
  const [searchParams] = useSearchParams();
  const [isLive, setIsLive]         = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const forceShow = searchParams.get("live") === "true";

  useEffect(() => {
    if (forceShow) { setIsChecking(false); return; }

    const check = async () => {
      try {
        const results = await Promise.allSettled(
          CHECK_URLS.map((url) =>
            fetch(`${url}/health`, { signal: AbortSignal.timeout(3000), mode: "cors" })
          )
        );
        const anyAlive = results.some(
          (r) => r.status === "fulfilled" && r.value.ok
        );
        setIsLive(anyAlive);
      } catch {
        setIsLive(false);
      } finally {
        setIsChecking(false);
      }
    };

    check();
  }, [forceShow]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-deep flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin mx-auto" />
          <p className="text-secondary text-sm">Checking infrastructure status…</p>
        </div>
      </div>
    );
  }

  if (isLive || forceShow) return <MainApp />;
  return <LandingPage />;
}
