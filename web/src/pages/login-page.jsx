import { useState } from "react";
import { LogIn, Zap } from "lucide-react";
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
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="bg-brand-600 p-7 text-white">
          <div className="grid size-11 place-items-center rounded-xl bg-white/15"><Zap size={24} /></div>
          <h1 className="mt-5 text-2xl font-bold">Smart Solar Microgrid</h1>
          <p className="mt-1 text-sm text-brand-100">Web portal for Backoffice and Grid Operators</p>
        </div>
        <CardContent className="p-6">
          <form className="space-y-5" onSubmit={submit}>
            {error && <FeedbackAlert>{error}</FeedbackAlert>}
            <div className="space-y-2"><Label htmlFor="identifier">Username</Label><Input id="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} required autoComplete="username" /></div>
            <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></div>
            <Button className="w-full" type="submit" disabled={submitting}>{submitting ? "Signing in..." : <><LogIn size={17} /> Sign in</>}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
