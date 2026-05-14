import { createFileRoute } from "@tanstack/react-router";
import { useQueue } from "@/hooks/use-queue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { generateTicket, callNext, categoryLabel, type Category } from "@/lib/queue";
import { toast } from "sonner";
import { useState } from "react";
import { Users, Accessibility, UserPlus, PhoneCall, Clock, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { tickets, serving, next, waiting } = useQueue();
  const [busy, setBusy] = useState(false);

  const completed = tickets.filter((t) => t.status === "completed").length;

  const generate = async (c: Category) => {
    setBusy(true);
    try {
      const t = await generateTicket(c);
      toast.success(`Ticket ${t.ticket_number} issued (${categoryLabel[c]})`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const onCallNext = async () => {
    setBusy(true);
    try {
      const t = await callNext();
      if (!t) toast.info("No one waiting");
      else toast.success(`Now serving ${t.ticket_number}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time queue overview for today.</p>
        </div>
        <Button size="lg" onClick={onCallNext} disabled={busy} className="bg-gradient-primary text-primary-foreground shadow-elegant">
          <PhoneCall className="h-4 w-4" /> Call Next Number
        </Button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {[
          { label: "Issued Today", value: tickets.length, icon: UserPlus, accent: "bg-accent text-accent-foreground" },
          { label: "Waiting", value: waiting.length, icon: Clock, accent: "bg-warning/20 text-warning-foreground" },
          { label: "Now Serving", value: serving?.ticket_number ?? "—", icon: PhoneCall, accent: "bg-primary/15 text-primary" },
          { label: "Completed", value: completed, icon: CheckCircle2, accent: "bg-success/15 text-success" },
        ].map((s) => (
          <Card key={s.label} className="p-5 shadow-card">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{s.label}</div>
                <div className="text-3xl font-bold mt-1 tabular-nums">{s.value}</div>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Now serving + Next */}
      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2 p-8 bg-gradient-primary text-primary-foreground shadow-elegant border-0">
          <div className="text-xs uppercase tracking-widest opacity-90">Now Serving</div>
          {serving ? (
            <>
              <div className="text-7xl lg:text-8xl font-bold tabular-nums mt-2">{serving.ticket_number}</div>
              <div className="text-lg mt-1 opacity-90">{categoryLabel[serving.category]}</div>
            </>
          ) : (
            <div className="text-5xl font-bold opacity-70 mt-4">No active ticket</div>
          )}
        </Card>
        <Card className="p-8 shadow-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Next Up</div>
          {next ? (
            <>
              <div className="text-6xl font-bold tabular-nums mt-2 text-primary">{next.ticket_number}</div>
              <div className="text-base mt-1 text-muted-foreground">{categoryLabel[next.category]}</div>
            </>
          ) : (
            <div className="text-3xl font-semibold opacity-50 mt-4">—</div>
          )}
        </Card>
      </div>

      {/* Generate */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold">Generate Queue Number</h2>
        <div className="grid sm:grid-cols-3 gap-4 mt-4">
          {(
            [
              { c: "regular" as Category, icon: Users, accent: "bg-accent" },
              { c: "senior" as Category, icon: UserPlus, accent: "bg-warning/20" },
              { c: "pwd" as Category, icon: Accessibility, accent: "bg-primary/15" },
            ]
          ).map(({ c, icon: Icon, accent }) => (
            <Card key={c} className="p-6 shadow-card hover:shadow-elegant transition-shadow">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${accent}`}>
                <Icon className="h-6 w-6 text-foreground" />
              </div>
              <div className="mt-4 font-semibold text-lg">{categoryLabel[c]}</div>
              <div className="text-sm text-muted-foreground">
                {c === "regular" ? "Standard queue" : "Priority queue"}
              </div>
              <Button onClick={() => generate(c)} disabled={busy} className="mt-4 w-full">
                Issue Ticket
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
