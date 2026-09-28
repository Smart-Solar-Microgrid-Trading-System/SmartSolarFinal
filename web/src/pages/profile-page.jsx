import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChangePasswordPage } from "@/pages/change-password-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ProfilePage() {
  const { session, profile, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function changeEmail(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const updated = await api.changeEmail(session.token, { newEmail: newEmail.trim(), currentPassword: password });
      updateProfile(updated);
      setPassword("");
      setNewEmail("");
      setMessage("Email address updated.");
    } catch (err) {
      if (err.status === 401) {
        signOut();
        navigate("/login", { replace: true });
      } else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">My Profile</h2>
        <p className="mt-2 text-sm text-slate-600">View your account details and manage your email and password.</p>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Account details</h3>
        {!profile ? <p role="status" className="mt-4">Loading account details...</p> : (
          <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[["Full name", profile.fullName], ["Username", profile.id], ["Email", profile.email],
              ["Phone", profile.phone], ["Role", profile.role], ["Account status", profile.accountStatus]].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="mt-1 break-words font-medium text-slate-900">{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Change email</h2>
          <p className="text-sm text-slate-600">Enter your new email address and confirm with your current password.</p>
          <form onSubmit={changeEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-email">New email address</Label>
              <Input id="new-email" name="newEmail" type="email" autoComplete="email" required maxLength={254}
                value={newEmail} onChange={(event) => setNewEmail(event.target.value)} disabled={busy} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-current-password">Current password</Label>
              <Input id="email-current-password" name="currentPassword" type="password" autoComplete="current-password" required
                value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
            <Button type="submit" disabled={busy || !profile}>{busy ? "Saving..." : "Save email"}</Button>
          </form>
        </section>
        <ChangePasswordPage />
      </div>
    </div>
  );
}
