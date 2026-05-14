import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { fetchAllTickets, categoryLabel, type Ticket } from "@/lib/queue";
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: Analytics,
});

const COLORS = ["oklch(0.55 0.16 150)", "oklch(0.78 0.16 75)", "oklch(0.45 0.14 250)"];

function Analytics() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  useEffect(() => { fetchAllTickets().then(setTickets); }, []);

  const stats = useMemo(() => {
    const total = tickets.length;
    const completed = tickets.filter((t) => t.status === "completed").length;
    const skipped = tickets.filter((t) => t.status === "skipped").length;
    const waitTimes = tickets
      .filter((t) => t.called_at)
      .map((t) => (new Date(t.called_at!).getTime() - new Date(t.created_at).getTime()) / 60000);
    const avgWait = waitTimes.length ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) : 0;
    return { total, completed, skipped, avgWait };
  }, [tickets]);

  const byCategory = useMemo(() => {
    const m: Record<string, number> = { regular: 0, senior: 0, pwd: 0 };
    tickets.forEach((t) => (m[t.category]++));
    return Object.entries(m).map(([k, v]) => ({ name: categoryLabel[k as keyof typeof categoryLabel], value: v }));
  }, [tickets]);

  const byDay = useMemo(() => {
    const m = new Map<string, number>();
    tickets.forEach((t) => {
      const k = new Date(t.created_at).toLocaleDateString();
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return Array.from(m.entries()).slice(-14).map(([day, count]) => ({ day, count }));
  }, [tickets]);

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      <p className="text-muted-foreground mt-1">Performance and queue insights.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {[
          { label: "Total Tickets", value: stats.total },
          { label: "Completed", value: stats.completed },
          { label: "Skipped", value: stats.skipped },
          { label: "Avg Wait (min)", value: stats.avgWait },
        ].map((s) => (
          <Card key={s.label} className="p-5 shadow-card">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="text-3xl font-bold mt-1 tabular-nums">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card className="p-6 shadow-card">
          <h3 className="font-semibold mb-4">Tickets by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 shadow-card">
          <h3 className="font-semibold mb-4">Tickets per Day</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 240)" />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="oklch(0.55 0.16 150)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
