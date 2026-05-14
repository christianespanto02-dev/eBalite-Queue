import { supabase } from "@/integrations/supabase/client";

export type Category = "regular" | "senior" | "pwd";
export type Status = "waiting" | "serving" | "completed" | "skipped";

export interface Ticket {
  id: string;
  ticket_number: string;
  category: Category;
  status: Status;
  sequence_no: number;
  called_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const categoryLabel: Record<Category, string> = {
  regular: "Regular",
  senior: "Senior Citizen",
  pwd: "PWD",
};

export const categoryPrefix: Record<Category, string> = {
  regular: "R",
  senior: "S",
  pwd: "P",
};

export function isPriority(c: Category) {
  return c === "senior" || c === "pwd";
}

function todayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchTodayTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("queue_tickets")
    .select("*")
    .gte("created_at", todayStart())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function fetchAllTickets(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from("queue_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []) as Ticket[];
}

export async function generateTicket(category: Category): Promise<Ticket> {
  const today = await fetchTodayTickets();
  const seq = today.filter((t) => t.category === category).length + 1;
  const ticket_number = `${categoryPrefix[category]}${String(seq).padStart(3, "0")}`;
  const { data, error } = await supabase
    .from("queue_tickets")
    .insert({ ticket_number, category, sequence_no: seq, status: "waiting" })
    .select()
    .single();
  if (error) throw error;
  return data as Ticket;
}

/** Pick next ticket: priority first (senior/pwd) then regular, FIFO within group. */
export function pickNext(tickets: Ticket[]): Ticket | null {
  const waiting = tickets.filter((t) => t.status === "waiting");
  if (waiting.length === 0) return null;
  const priority = waiting.filter((t) => isPriority(t.category));
  const pool = priority.length > 0 ? priority : waiting;
  return pool.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0];
}

export async function callNext(): Promise<Ticket | null> {
  const today = await fetchTodayTickets();
  // Mark any currently serving as completed first
  const currentlyServing = today.filter((t) => t.status === "serving");
  for (const s of currentlyServing) {
    await supabase
      .from("queue_tickets")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", s.id);
  }
  const refreshed = await fetchTodayTickets();
  const next = pickNext(refreshed);
  if (!next) return null;
  const { data, error } = await supabase
    .from("queue_tickets")
    .update({ status: "serving", called_at: new Date().toISOString() })
    .eq("id", next.id)
    .select()
    .single();
  if (error) throw error;
  return data as Ticket;
}

export async function skipTicket(id: string) {
  const { error } = await supabase
    .from("queue_tickets")
    .update({ status: "skipped" })
    .eq("id", id);
  if (error) throw error;
}

export async function completeTicket(id: string) {
  const { error } = await supabase
    .from("queue_tickets")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function resetQueue() {
  // Mark all today's waiting/serving as completed (soft reset for the day)
  const { error } = await supabase
    .from("queue_tickets")
    .delete()
    .gte("created_at", todayStart());
  if (error) throw error;
}

/** Plays the SM Mall-style announcement chime before calling a ticket. */
export function playChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio("/sounds/announcement.mp3");
      audio.volume = 0.9;
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

/** Speech announcement of a called ticket. */
export function announceTicket(t: Ticket) {
  try {
    const utter = new SpeechSynthesisUtterance(
      `Now serving ${categoryLabel[t.category]} number ${t.ticket_number.split("").join(" ")}`,
    );
    utter.lang = "en-US"; // ✅ Force English
    utter.rate = 0.9;
    utter.pitch = 1;      // ✅ Natural pitch
    utter.volume = 1;     // ✅ Full volume
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  } catch {
    /* ignore */
  }
}