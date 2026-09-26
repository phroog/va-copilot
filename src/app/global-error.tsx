"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-[#0a0a1a] text-white">
          <div className="text-5xl mb-4">😵</div>
          <h1 className="text-2xl font-extrabold">Something hiccupped</h1>
          <p className="mt-2 text-white/60 text-sm max-w-xs">A small blip on our side. Reload and you're back in — your progress is safe.</p>
          <button onClick={reset} className="mt-6 px-6 py-3 rounded-2xl bg-dl-green text-white font-extrabold hover:brightness-105 transition-all squishy">
            🔄 Reload
          </button>
        </div>
      </body>
    </html>
  );
}