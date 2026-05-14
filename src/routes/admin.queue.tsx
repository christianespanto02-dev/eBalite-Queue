import { createFileRoute } from "@tanstack/react-router";
import { useQueue } from "@/hooks/use-queue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  callNext,
  completeTicket,
  resetQueue,
  skipTicket,
  categoryLabel,
  type Ticket,
} from "@/lib/queue";
import { toast } from "sonner";
import { useState } from "react";
import { PhoneCall, SkipForward, CheckCircle2, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/queue")({
  component: QueueControl,
});

const ITEMS_PER_PAGE = 8;

function categoryBadge(t: Ticket) {
  const map: Record<string, string> = {
    regular: "bg-secondary text-secondary-foreground",
    senior: "bg-warning/20 text-warning-foreground border-warning/30",
    pwd: "bg-primary/15 text-primary border-primary/30",
  };
  return <Badge className={`${map[t.category]} border`}>{categoryLabel[t.category]}</Badge>;
}

function QueueControl() {
  const { tickets, serving, waiting } = useQueue();
  const [busy, setBusy] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const action = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Pagination logic
  const sortedTickets = tickets.slice().reverse();
  const totalPages = Math.ceil(sortedTickets.length / ITEMS_PER_PAGE);
  const paginatedTickets = sortedTickets.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue Control</h1>
          <p className="text-muted-foreground mt-1">Manage live queue actions and waiting tickets.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => action(callNext, "Called next")} disabled={busy} className="bg-gradient-primary text-primary-foreground shadow-elegant">
            <PhoneCall className="h-4 w-4" /> Call Next
          </Button>
          {serving && (
            <>
              <Button variant="outline" onClick={() => action(() => completeTicket(serving.id), "Completed")} disabled={busy}>
                <CheckCircle2 className="h-4 w-4" /> Complete
              </Button>
              <Button variant="outline" onClick={() => action(() => skipTicket(serving.id), "Skipped")} disabled={busy}>
                <SkipForward className="h-4 w-4" /> Skip
              </Button>
            </>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <RotateCcw className="h-4 w-4" /> Reset Queue
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset today's queue?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all of today's tickets. Use this for the next day or a new event.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => action(resetQueue, "Queue reset")}>
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-1 p-6 shadow-card">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Now Serving</div>
          {serving ? (
            <>
              <div className="text-6xl font-bold tabular-nums mt-2 text-primary">{serving.ticket_number}</div>
              <div className="text-base mt-1 text-muted-foreground">{categoryLabel[serving.category]}</div>
              <div className="text-xs text-muted-foreground mt-3">
                Called at{" "}
                {serving.called_at && new Date(serving.called_at).toLocaleTimeString()}
              </div>
            </>
          ) : (
            <div className="text-3xl font-semibold opacity-50 mt-4">—</div>
          )}
        </Card>

        <Card className="lg:col-span-2 p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Waiting ({waiting.length})</h3>
            <span className="text-xs text-muted-foreground">Senior & PWD prioritized</span>
          </div>
          <div className="mt-4 divide-y">
            {waiting.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">No one is waiting.</div>
            )}
            {waiting.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold tabular-nums w-20">{t.ticket_number}</div>
                  {categoryBadge(t)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleTimeString()}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => action(() => skipTicket(t.id), "Skipped")} disabled={busy}>
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Today's Activity Table with Pagination */}
      <Card className="mt-6 p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Today's Activity ({tickets.length})</h3>
          {totalPages > 1 && (
            <span className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2">Ticket</th>
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Issued</th>
                <th className="text-left py-2">Called</th>
                <th className="text-left py-2">Completed</th>
              </tr>
            </thead>
            <tbody>
              {paginatedTickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-6">
                    No tickets yet today.
                  </td>
                </tr>
              )}
              {paginatedTickets.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="py-2 font-semibold tabular-nums">{t.ticket_number}</td>
                  <td className="py-2">{categoryBadge(t)}</td>
                  <td className="py-2 capitalize">{t.status}</td>
                  <td className="py-2 text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</td>
                  <td className="py-2 text-muted-foreground">{t.called_at ? new Date(t.called_at).toLocaleTimeString() : "—"}</td>
                  <td className="py-2 text-muted-foreground">{t.completed_at ? new Date(t.completed_at).toLocaleTimeString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}