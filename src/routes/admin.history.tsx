import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { fetchAllTickets, categoryLabel, type Ticket } from "@/lib/queue";
import { Download, FileSpreadsheet, FileText, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/history")({
  component: History,
});

const ITEMS_PER_PAGE = 9;

const statusColor: Record<string, string> = {
  waiting:   "bg-yellow-100 text-yellow-800 border-yellow-300",
  serving:   "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-green-100 text-green-800 border-green-300",
  skipped:   "bg-red-100 text-red-800 border-red-300",
};

const categoryColor: Record<string, string> = {
  regular: "bg-secondary text-secondary-foreground",
  senior:  "bg-amber-100 text-amber-800 border-amber-300",
  pwd:     "bg-primary/15 text-primary border-primary/30",
};

function History() {
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [status, setStatus]       = useState<string>("all");
  const [cat, setCat]             = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const loadTickets = () => {
    setLoading(true);
    fetchAllTickets()
      .then(setTickets)
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status, cat]);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (status !== "all" && t.status !== status) return false;
      if (cat !== "all" && t.category !== cat) return false;
      if (search && !t.ticket_number.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tickets, search, status, cat]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated  = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Page number buttons (show max 5 pages at a time)
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 2);
    let end   = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const exportCSV = () => {
    const rows = [
      ["Ticket", "Category", "Status", "Issued", "Called", "Completed"],
      ...filtered.map((t) => [
        t.ticket_number,
        categoryLabel[t.category],
        t.status,
        new Date(t.created_at).toLocaleString(),
        t.called_at ? new Date(t.called_at).toLocaleString() : "",
        t.completed_at ? new Date(t.completed_at).toLocaleString() : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(new Blob([csv], { type: "text/csv" }), `queue-${dateTag()}.csv`);
    toast.success("CSV exported successfully!");
  };

  const exportExcel = async () => {
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.json_to_sheet(
        filtered.map((t) => ({
          Ticket:    t.ticket_number,
          Category:  categoryLabel[t.category],
          Status:    t.status,
          Issued:    new Date(t.created_at).toLocaleString(),
          Called:    t.called_at ? new Date(t.called_at).toLocaleString() : "",
          Completed: t.completed_at ? new Date(t.completed_at).toLocaleString() : "",
        })),
      );
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Queue History");
      XLSX.writeFile(wb, `queue-${dateTag()}.xlsx`);
      toast.success("Excel exported successfully!");
    } catch {
      toast.error("Failed to export Excel.");
    }
  };

  const exportPDF = async () => {
    try {
      const { default: jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Barangay Balite — Queue History Report", 14, 18);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
      doc.text(`Total Records: ${filtered.length}`, 14, 31);
      autoTable(doc, {
        startY: 38,
        head: [["Ticket", "Category", "Status", "Issued", "Called", "Completed"]],
        body: filtered.map((t) => [
          t.ticket_number,
          categoryLabel[t.category],
          t.status.charAt(0).toUpperCase() + t.status.slice(1),
          new Date(t.created_at).toLocaleString(),
          t.called_at ? new Date(t.called_at).toLocaleString() : "—",
          t.completed_at ? new Date(t.completed_at).toLocaleString() : "—",
        ]),
        headStyles: { fillColor: [40, 120, 70] },
        alternateRowStyles: { fillColor: [245, 250, 245] },
      });
      doc.save(`queue-${dateTag()}.pdf`);
      toast.success("PDF exported successfully!");
    } catch {
      toast.error("Failed to export PDF.");
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Queue History</h1>
          <p className="text-muted-foreground mt-1">Search, filter, and export queue records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadTickets} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mt-6 p-4 shadow-card">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search ticket number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="serving">Serving</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="senior">Senior Citizen</SelectItem>
              <SelectItem value="pwd">PWD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Summary Row */}
      <div className="flex items-center justify-between mt-3 px-1">
        <p className="text-sm text-muted-foreground">
          Showing{" "}
          <span className="font-medium text-foreground">
            {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">{filtered.length}</span> records
        </p>
        {totalPages > 1 && (
          <p className="text-sm text-muted-foreground">
            Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
            <span className="font-medium text-foreground">{totalPages}</span>
          </p>
        )}
      </div>

      {/* Table */}
      <Card className="mt-2 p-4 shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b">
            <tr>
              <th className="text-left py-2 px-2">Ticket</th>
              <th className="text-left py-2 px-2">Category</th>
              <th className="text-left py-2 px-2">Status</th>
              <th className="text-left py-2 px-2">Issued</th>
              <th className="text-left py-2 px-2">Called</th>
              <th className="text-left py-2 px-2">Completed</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading records…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-muted-foreground">
                  No records found.
                </td>
              </tr>
            )}
            {!loading && paginated.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-2.5 px-2 font-bold tabular-nums">{t.ticket_number}</td>
                <td className="py-2.5 px-2">
                  <Badge className={`${categoryColor[t.category]} border text-xs`}>
                    {categoryLabel[t.category]}
                  </Badge>
                </td>
                <td className="py-2.5 px-2">
                  <Badge className={`${statusColor[t.status]} border text-xs capitalize`}>
                    {t.status}
                  </Badge>
                </td>
                <td className="py-2.5 px-2 text-muted-foreground text-xs">
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td className="py-2.5 px-2 text-muted-foreground text-xs">
                  {t.called_at ? new Date(t.called_at).toLocaleString() : "—"}
                </td>
                <td className="py-2.5 px-2 text-muted-foreground text-xs">
                  {t.completed_at ? new Date(t.completed_at).toLocaleString() : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <div className="flex gap-1">
            {pageNumbers.map((page) => (
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
    </div>
  );
}

function dateTag() {
  return new Date().toISOString().slice(0, 10);
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}