import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueue } from "@/hooks/use-queue";
import { categoryLabel, playChime, announceTicket } from "@/lib/queue";
import { Brand } from "@/components/Brand";

export const Route = createFileRoute("/display")({
  head: () => ({ meta: [{ title: "Queue Display — Barangay Balite" }] }),
  component: DisplayScreen,
});

function DisplayScreen() {
  const { serving, next, waiting } = useQueue();
  const [now, setNow] = useState(new Date());
  const lastServingId = useRef<string | null>(null);

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (serving && serving.id !== lastServingId.current) {
      lastServingId.current = serving.id;
      playChime().then(() => announceTicket(serving));
    }
  }, [serving]);

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      <header className="border-b border-sidebar-border bg-sidebar px-6 lg:px-10 py-4 flex items-center justify-between">
        <Brand size="lg" invert />
        <div className="text-right">
          <div className="text-2xl lg:text-3xl font-semibold tabular-nums">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="text-sm lg:text-base text-sidebar-foreground/70">
            {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </div>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-3 gap-6 p-6 lg:p-10">
        {/* Now Serving */}
        <section className="lg:col-span-2 rounded-3xl bg-gradient-primary text-primary-foreground p-8 lg:p-12 flex flex-col justify-center items-center text-center shadow-elegant relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white,transparent_60%)]" />
          <div className="relative">
            <div className="uppercase tracking-[0.3em] text-sm lg:text-base opacity-90">Now Serving</div>
            {serving ? (
              <>
                <div className="font-bold tabular-nums leading-none mt-4 text-[10rem] lg:text-[16rem] animate-pulse-call">
                  {serving.ticket_number}
                </div>
                <div className="mt-4 text-2xl lg:text-4xl font-medium">
                  {categoryLabel[serving.category]}
                </div>
              </>
            ) : (
              <div className="mt-10 text-5xl lg:text-7xl font-semibold opacity-80">— — —</div>
            )}
          </div>
        </section>

        {/* Right column */}
        <section className="flex flex-col gap-6">
          <div className="rounded-3xl bg-sidebar-accent p-6 lg:p-8 flex-1 flex flex-col justify-center text-center">
            <div className="uppercase tracking-[0.25em] text-xs lg:text-sm text-sidebar-foreground/70">
              Next Number
            </div>
            <div className="font-bold tabular-nums leading-none mt-3 text-7xl lg:text-9xl text-primary-glow">
              {next ? next.ticket_number : "—"}
            </div>
            <div className="mt-2 text-lg lg:text-2xl text-sidebar-foreground/80">
              {next ? categoryLabel[next.category] : "Waiting"}
            </div>
          </div>

          <div className="rounded-3xl bg-sidebar-accent p-6 lg:p-8">
            <div className="uppercase tracking-[0.25em] text-xs lg:text-sm text-sidebar-foreground/70 mb-4">
              In Queue ({waiting.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {waiting.slice(0, 12).map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1.5 rounded-lg bg-sidebar text-sidebar-foreground border border-sidebar-border font-semibold tabular-nums"
                >
                  {t.ticket_number}
                </span>
              ))}
              {waiting.length === 0 && (
                <span className="text-sidebar-foreground/60">No one waiting.</span>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-sidebar-border px-6 lg:px-10 py-3 text-center text-sm text-sidebar-foreground/70">
        Please remain seated. You will be called by your queue number.
      </footer>
    </div>
  );
}
