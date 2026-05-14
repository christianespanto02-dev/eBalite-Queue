import { createFileRoute, Link } from "@tanstack/react-router";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Monitor, ShieldCheck, Users, Clock, BarChart3, Volume2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Barangay Balite Queue Management System" },
      {
        name: "description",
        content:
          "Modern queue management for Barangay Balite — get a number, sit comfortably, and watch the display.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-30">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Brand />
          <nav className="flex items-center gap-2">
            <Link to="/display">
              <Button variant="ghost" size="sm">
                <Monitor className="h-4 w-4" /> Display
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground shadow-elegant">
                <ShieldCheck className="h-4 w-4" /> Admin Login
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium mb-4">
              Public Service · Surigao Norte
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
              A faster, fairer queue for every resident.
            </h1>
            <p className="mt-5 text-lg md:text-xl text-primary-foreground/90 max-w-xl">
              Skip the long lines. Get a queue number, take a seat, and watch the monitor — we'll
              call you when it's your turn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/display">
                <Button size="lg" variant="secondary" className="shadow-elegant">
                  <Monitor className="h-5 w-5" /> Open Public Display
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-primary-foreground hover:bg-white/20">
                  Admin Login
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-8 shadow-elegant">
              <div className="text-sm uppercase tracking-widest text-primary-foreground/70">Now Serving</div>
              <div className="text-8xl font-bold mt-2 tabular-nums">S012</div>
              <div className="mt-1 text-primary-foreground/80">Senior Citizen · Window 1</div>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                {(["Regular", "Senior", "PWD"] as const).map((c) => (
                  <div key={c} className="rounded-xl bg-white/10 p-3">
                    <div className="text-xs text-primary-foreground/70">{c}</div>
                    <div className="text-xl font-semibold">—</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center">Built for the barangay office</h2>
        <p className="text-center text-muted-foreground mt-2 max-w-xl mx-auto">
          Designed to reduce overcrowding and bring order to public service delivery.
        </p>
        <div className="grid md:grid-cols-3 gap-6 mt-12">
          {[
            { icon: Users, title: "Priority Queue", desc: "Senior Citizens and PWDs are intelligently prioritized." },
            { icon: Clock, title: "Real-Time Sync", desc: "Updates appear instantly on every display." },
            { icon: Volume2, title: "Voice Announcements", desc: "Audible chimes and number callouts." },
            { icon: Monitor, title: "TV Display Mode", desc: "Full-screen layout optimized for monitors." },
            { icon: BarChart3, title: "Reports & Analytics", desc: "Daily reports exportable to PDF, Excel, CSV." },
            { icon: ShieldCheck, title: "Secure Admin", desc: "Role-based authentication for admin only." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-card hover:shadow-elegant transition-shadow">
              <div className="h-11 w-11 rounded-xl bg-accent flex items-center justify-center text-accent-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-card">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Barangay Balite, San Francisco, Surigao del Norte
        </div>
      </footer>
    </div>
  );
}
