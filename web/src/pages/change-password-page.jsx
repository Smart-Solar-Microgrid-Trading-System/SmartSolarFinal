import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ChangePasswordPage() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmNewPassword) return setError("New passwords must match.");
    if (form.newPassword === form.currentPassword) return setError("Choose a different new password.");
    if (new TextEncoder().encode(form.newPassword).length > 72) return setError("New password must not exceed 72 UTF-8 bytes.");
    setBusy(true);
    try {
      await api.changePassword(session.token, form);
      signOut();
      navigate("/login", { replace: true, state: { message: "Password changed. Sign in with your new password." } });
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
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Change password</h2>
      <p className="text-sm text-slate-600">Use 8–72 characters. After changing your password, sign in again on all devices.</p>
      <form onSubmit={submit} className="space-y-4">
        {[
          ["currentPassword", "Current password", "current-password"],
          ["newPassword", "New password", "new-password"],
          ["confirmNewPassword", "Confirm new password", "new-password"]
        ].map(([name, label, autoComplete]) => (
          <div key={name} className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} type="password" autoComplete={autoComplete} required
              minLength={name === "currentPassword" ? undefined : 8}
              maxLength={name === "currentPassword" ? undefined : 72}
              disabled={busy} value={form[name]}
              onChange={(event) => setForm({ ...form, [name]: event.target.value })} />
          </div>
        ))}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={busy}>{busy ? "Changing password…" : "Change password"}</Button>
      </form>
    </section>
  );
}
