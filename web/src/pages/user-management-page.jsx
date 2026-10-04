import { useEffect, useState } from "react";
import { Power, RefreshCw, RotateCcw, Search, UserPlus, UsersRound } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const initialForm = {
  identifier: "",
  password: "",
  role: "GridOperator",
  fullName: "",
  email: "",
  phone: ""
};

export function UserManagementPage() {
  const { session, profile } = useAuth();

  const [users, setUsers] = useState([]);
  const [usernameSearch, setUsernameSearch] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function loadUsers() {
    setLoading(true);

    try {
      const data = await api.getWebUsers(session.token);
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  // Clear any previous form error when the dialog closes
  function handleDialogChange(open) {
    setDialogOpen(open);

    if (!open) {
      setFormError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setMessage("");
    setSubmitting(true);

    try {
      const user = await api.createWebUser(session.token, form);

      setMessage(`${user.fullName} was created as ${user.role}.`);
      setForm(initialForm);
      handleDialogChange(false);

      await loadUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateUserStatus(user, accountStatus) {
    setError("");
    setMessage("");

    try {
      const updatedUser = await api.updateWebUserStatus(session.token, user.id, accountStatus);
      setMessage(`${updatedUser.fullName} is now ${updatedUser.accountStatus}.`);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  function renderUserAction(user) {
    if (profile?.id === user.id) {
      return <span className="text-xs text-slate-500">Current account</span>;
    }

    if (user.accountStatus === "Active") {
      return (
        <Button size="sm" variant="outline" onClick={() => updateUserStatus(user, "Deactivated")}>
          <Power size={15} /> Deactivate
        </Button>
      );
    }

    return (
      <Button size="sm" onClick={() => updateUserStatus(user, "Active")}>
        <RotateCcw size={15} /> Reactivate
      </Button>
    );
  }

  const normalizedUsernameSearch = usernameSearch.trim().toLowerCase();
  const displayedUsers = normalizedUsernameSearch
    ? users.filter((user) => user.id.toLowerCase().includes(normalizedUsernameSearch))
    : users;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Backoffice"
        title="User Management"
        description="Backoffice and Grid Operator web accounts."
        icon={UsersRound}
        actions={
          <Button onClick={() => handleDialogChange(true)}>
            <UserPlus size={17} /> Create user
          </Button>
        }
      />

      {error && <FeedbackAlert>{error}</FeedbackAlert>}
      {message && <FeedbackAlert variant="success">{message}</FeedbackAlert>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <UsersRound size={19} className="text-brand-600" /> Web users
          </CardTitle>

          <Button variant="outline" onClick={loadUsers} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="usernameSearch">Search by username</Label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <Input
                id="usernameSearch"
                type="search"
                placeholder="Enter username"
                value={usernameSearch}
                onChange={(event) => setUsernameSearch(event.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading web users...</p>
          ) : displayedUsers.length === 0 ? (
            <p className="text-sm text-slate-500">
              {users.length === 0 ? "No web users found." : "No web users match this username search."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {displayedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.id}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={user.role} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.accountStatus} />
                      </TableCell>
                      <TableCell className="text-right">{renderUserAction(user)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a web user</DialogTitle>
            <DialogDescription>
              Create a Backoffice or Grid Operator account. The account is Active immediately.
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            {formError && (
              <div className="sm:col-span-2">
                <FeedbackAlert>{formError}</FeedbackAlert>
              </div>
            )}

            <Field label="Username" name="identifier" value={form.identifier} onChange={handleChange} required />
            <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} required />

            <div className="space-y-2">
              <Label>Role</Label>

              <Select
                value={form.role}
                onValueChange={(role) => setForm((current) => ({ ...current, role }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="GridOperator">Grid Operator</SelectItem>
                  <SelectItem value="Backoffice">Backoffice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Field
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
            <Field label="Phone (optional)" name="phone" value={form.phone} onChange={handleChange} />

            <DialogFooter className="sm:col-span-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  "Creating..."
                ) : (
                  <>
                    <UserPlus size={17} /> Create user
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Field({ label, name, type, ...props }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} {...props} />
    </div>
  );
}
