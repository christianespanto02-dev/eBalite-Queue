import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brand } from "@/components/Brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Admin Login — Barangay Balite QMS" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if the user has admin or staff role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        throw new Error("Access denied. You are not authorized to use this system.");
      }

      toast.success(`Welcome back! Signed in as ${roleData.role}.`);
      navigate({ to: "/admin" });
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left Panel */}
      <div className="hidden lg:flex bg-gradient-hero text-primary-foreground p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-white/10" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full border-2 border-white/20" />
        <Brand size="lg" invert />
        <div className="relative max-w-md">
          <h2 className="text-4xl font-bold leading-tight">
            Welcome to the Barangay Balite Queue System.
          </h2>
          <p className="mt-4 text-primary-foreground/85">
            Sign in to manage queue numbers, generate tickets, monitor real-time activity, and
            export daily reports for the barangay office.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/70">
          Brgy. Balite, San Francisco · Surigao del Norte
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to home
          </Link>

          {/* Lock Icon */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-6">
            <Lock className="h-6 w-6 text-primary" />
          </div>

          <h1 className="text-3xl font-bold">Admin Sign In</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Authorized personnel only. Contact your administrator if you need access.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
                placeholder="admin@barangaybalite.gov.ph"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary text-primary-foreground shadow-elegant"
              size="lg"
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          {/* No signup link - accounts are created by admin only */}
          <p className="mt-6 text-xs text-muted-foreground text-center">
            🔒︎ Account access is managed by the system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}