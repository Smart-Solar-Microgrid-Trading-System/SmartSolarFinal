import { useState } from "react";
import { LogIn, ShieldCheck, SunMedium, Zap } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackAlert } from "@/components/feedback-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const session = await signIn(identifier, password);
      const destination = location.state?.from || (session.role === "Backoffice" ? "/users" : "/");
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[linear-gradient(180deg,var(--color-brand-950)_0%,#0e2847_55%,var(--color-brand-950)_100%)] p-4">
      <div
        aria-hidden="true"
        className="animate-glow-pulse pointer-events-none absolute -top-28 -left-20 size-96 rounded-full bg-solar-400/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 -right-16 size-96 rounded-full bg-brand-400/25 blur-3xl"
      />

      <div className="relative z-10 grid w-full max-w-4xl items-center gap-10 md:grid-cols-2">
        <div className="hidden flex-col gap-6 px-2 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-solar-500 shadow-lg shadow-brand-900/40">
              <Zap size={24} aria-hidden="true" />
            </div>
            <p className="font-display text-lg font-bold tracking-tight">Smart Solar Microgrid</p>
          </div>

          <h1 className="font-display text-4xl leading-tight font-bold tracking-tight">
            Power trading,
            <br />
            beautifully managed.
          </h1>

          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            Sign in to coordinate prosumers, microgrid nodes, and energy reservations from a
            single, unified control center.
          </p>

          <div className="flex items-center gap-2 text-sm text-white/50">
            <ShieldCheck size={16} className="text-solar-300" aria-hidden="true" />
            Secure access for Backoffice &amp; Grid Operators
          </div>
        </div>

        <Card className="w-full max-w-md overflow-hidden border-white/10 bg-white/95 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-600 to-brand-800 p-7 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-solar-400/25 blur-2xl"
            />
            <div className="grid size-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <SunMedium size={24} aria-hidden="true" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-brand-100">Sign in to the Smart Solar Microgrid portal</p>
          </div>

          <CardContent className="p-6">
            <form className="space-y-5" onSubmit={submit}>
              {error && <FeedbackAlert>{error}</FeedbackAlert>}

              <div className="space-y-2">
                <Label htmlFor="identifier">Username</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button className="w-full" size="lg" type="submit" disabled={submitting}>
                {submitting ? "Signing in..." : (
                  <>
                    <LogIn size={17} />
                    Sign in
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}