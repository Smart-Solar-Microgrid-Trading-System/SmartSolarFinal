import { useEffect, useState } from "react";
import { RefreshCw, UserPlus, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FeedbackAlert } from "@/components/feedback-alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const initialForm = { identifier: "", password: "", role: "GridOperator", fullName: "", email: "", phone: "" };

export function UserManagementPage() {
  const { session } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    setLoading(true);
    try { setUsers(await api.getWebUsers(session.token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);
  function change(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }

  function setOpen(nextOpen) {
    setDialogOpen(nextOpen);
    if (!nextOpen) setFormError("");
  }

  async function submit(event) {
    event.preventDefault(); setFormError(""); setMessage(""); setSubmitting(true);
    try {
      const user = await api.createWebUser(session.token, form);
      setMessage(`${user.fullName} was created as ${user.role}.`);
      setForm(initialForm);
      setOpen(false);
      await loadUsers();
    } catch (requestError) { setFormError(requestError.message); } finally { setSubmitting(false); }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Backoffice</p><h1 className="text-2xl font-bold text-slate-900">User Management</h1><p className="mt-1 text-sm text-slate-500">Backoffice and Grid Operator web accounts.</p></div>
        <Button onClick={() => setOpen(true)}><UserPlus size={17} /> Create user</Button>
      </div>

      {error && <FeedbackAlert>{error}</FeedbackAlert>}
      {message && <FeedbackAlert variant="success">{message}</FeedbackAlert>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3"><CardTitle className="flex items-center gap-2"><UsersRound size={19} className="text-brand-600" /> Web users</CardTitle><Button variant="outline" onClick={loadUsers} disabled={loading}><RefreshCw size={16} /> Refresh</Button></CardHeader>
        <CardContent>{loading ? <p className="text-sm text-slate-500">Loading web users...</p> : users.length === 0 ? <p className="text-sm text-slate-500">No web users found.</p> : <div className="overflow-x-auto"><Table className="min-w-[700px]"><TableHeader><TableRow><TableHead>Username</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{users.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.id}</TableCell><TableCell>{user.fullName}</TableCell><TableCell>{user.email || "—"}</TableCell><TableCell><Badge variant="secondary">{user.role}</Badge></TableCell><TableCell><Badge variant="secondary">{user.accountStatus}</Badge></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create a web user</DialogTitle><DialogDescription>Create a Backoffice or Grid Operator account. The account is Active immediately.</DialogDescription></DialogHeader>
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
            {formError && <div className="sm:col-span-2"><FeedbackAlert>{formError}</FeedbackAlert></div>}
            <Field label="Username" name="identifier" value={form.identifier} onChange={change} required />
            <Field label="Full name" name="fullName" value={form.fullName} onChange={change} required />
            <div className="space-y-2"><Label>Role</Label><Select value={form.role} onValueChange={(role) => setForm((current) => ({ ...current, role }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="GridOperator">Grid Operator</SelectItem><SelectItem value="Backoffice">Backoffice</SelectItem></SelectContent></Select></div>
            <Field label="Password" name="password" type="password" value={form.password} onChange={change} required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={change} required />
            <Field label="Phone (optional)" name="phone" value={form.phone} onChange={change} />
            <DialogFooter className="sm:col-span-2"><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="submit" disabled={submitting}>{submitting ? "Creating..." : <><UserPlus size={17} /> Create user</>}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ label, name, type, ...props }) { return <div className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} {...props} /></div>; }
