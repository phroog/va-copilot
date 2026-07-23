"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthBridge() {
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        setToken(session.access_token);
        const timer = setTimeout(() => {
          dispatchToken(session.access_token);
        }, 1000);
        return () => clearTimeout(timer);
      }
    };
    init();
  }, []);

  function dispatchToken(accessToken: string) {
    window.dispatchEvent(
      new CustomEvent("SariExtensionAuth", { detail: { token: accessToken } })
    );
    setConnected(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF0F5] dark:bg-dark-bg p-4">
      <div className="blob w-96 h-96 bg-kawaii-pink top-[-10%] left-[-20%]" />
      <div className="blob w-80 h-80 bg-kawaii-purple bottom-[-10%] right-[-20%]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white dark:bg-dark-card rounded-kawaii-xl p-8 shadow-sari text-center space-y-6">
          <div className="text-5xl">🌸</div>
          <h1 className="text-2xl font-extrabold text-kawaii-purple">
            Sari Extension
          </h1>
          {connected ? (
            <>
              <div className="text-6xl">✅</div>
              <p className="text-lg text-kawaii-purple font-semibold">
                Connected!
              </p>
              <p className="text-sm text-slate-500">
                You can now close this tab and return to the extension.
              </p>
            </>
          ) : (
            <>
              <p className="text-slate-500 text-sm">
                Click the button below to connect your Sari account to the
                browser extension.
              </p>
              <button
                onClick={() => token && dispatchToken(token)}
                disabled={!token}
                className="w-full px-6 py-3 bg-kawaii-purple text-white font-bold rounded-kawaii text-lg shadow-sari hover:shadow-sari-lg transition-all duration-200 squishy disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {token ? "🔗 Connect Extension" : "Loading session..."}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
