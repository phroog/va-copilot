"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthBridge() {
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token && window.opener) {
        window.opener.postMessage(
          { type: "SARI_AUTH_TOKEN", token: session.access_token },
          "*"
        );
      }

      setTimeout(() => {
        window.close();
      }, 2000);
    };

    init();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF0F5] dark:bg-dark-bg">
      <div className="text-center">
        <p className="text-kawaii-purple text-lg font-semibold">
          You can now close this tab.
        </p>
      </div>
    </div>
  );
}
