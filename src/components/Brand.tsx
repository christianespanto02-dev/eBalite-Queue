import logo from "@/assets/logo.png";

export function Brand({ size = "md", invert = false }: { size?: "sm" | "md" | "lg"; invert?: boolean }) {
  const dims = size === "lg" ? "h-14 w-14" : size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const title = size === "lg" ? "text-2xl" : "text-base";
  const sub = size === "lg" ? "text-sm" : "text-xs";
  return (
    <div className="flex items-center gap-3">
      <img
        src={logo}
        alt="Barangay Balite Official Seal"
        className={`${dims} rounded-full ring-2 ring-primary/20 object-cover bg-white`}
      />
      <div className="leading-tight">
        <div className={`${title} font-bold tracking-tight ${invert ? "text-sidebar-foreground" : "text-foreground"}`}>
          Barangay Balite
        </div>
        <div className={`${sub} ${invert ? "text-sidebar-foreground/70" : "text-muted-foreground"}`}>
          Queue Management System
        </div>
      </div>
    </div>
  );
}
