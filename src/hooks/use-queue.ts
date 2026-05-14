import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchTodayTickets, type Ticket } from "@/lib/queue";

export function useQueue() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchTodayTickets()
      .then((t) => mounted && setTickets(t))
      .finally(() => mounted && setLoading(false));

    const channel = supabase
      .channel("queue_tickets_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_tickets" },
        () => {
          fetchTodayTickets().then((t) => mounted && setTickets(t));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const serving = tickets.find((t) => t.status === "serving") ?? null;
  const waiting = tickets.filter((t) => t.status === "waiting");
  const next =
    waiting.find((t) => t.category === "senior" || t.category === "pwd") ??
    waiting[0] ??
    null;

  return { tickets, serving, next, waiting, loading };
}
