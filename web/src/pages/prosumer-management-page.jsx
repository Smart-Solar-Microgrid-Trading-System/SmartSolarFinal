import { useEffect, useState } from "react";
import { Check, Pencil, Power, RefreshCw, RotateCcw, UserPlus, UsersRound } from "lucide-react";

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
  nic: "",
  password: "",
  fullName: "",
  email: "",
  phone: ""
};

export function ProsumerManagementPage() {
  const { session } = useAuth();

  const [prosumers, setProsumers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNic, setEditingNic] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");

  async function loadProsumers() {
    setLoading(true);
    setError("");

    try {
      const status = filterStatus === "All" ? undefined : filterStatus;
      const data = await api.getProsumers(session.token, status);
      setProsumers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // reload when the filter changes
  useEffect(() => {
    loadProsumers();
  }, [filterStatus]);

  async function updateStatus(prosumer, newStatus) {
    setError("");
    setMessage("");

    try {
      const user = await api.updateProsumerStatus(session.token, prosumer.id, newStatus);
      setMessage(`${user.fullName} is now ${user.accountStatus}.`);
      await loadProsumers();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleDialogChange(open) {
    setDialogOpen(open);

    if (!open) {
      setFormError("");
    }
  }

  function openCreateDialog() {
    setEditingNic(null);
    setForm(initialForm);
    setFormError("");
    setDialogOpen(true);
  }

  function openEditDialog(prosumer) {
    setEditingNic(prosumer.id);
    setForm({
      nic: prosumer.id,
      password: "",
      fullName: prosumer.fullName ?? "",
      email: prosumer.email ?? "",
      phone: prosumer.phone ?? ""
    });
    setFormError("");
    setDialogOpen(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setFormError("");
    setMessage("");
    setSubmitting(true);

    try {
      const user = editingNic
        ? await api.updateProsumer(session.token, editingNic, {
            fullName: form.fullName,
            email: form.email,
            phone: form.phone
          })
        : await api.createProsumer(session.token, form);

      setMessage(editingNic
        ? `${user.fullName}'s profile was updated.`
        : `${user.fullName} was created and can sign in now.`);
      handleDialogChange(false);
      await loadProsumers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // button depends on the current status
  function renderAction(prosumer) {
    if (prosumer.accountStatus === "Active") {
      return (
        <Button size="sm" variant="outline" onClick={() => updateStatus(prosumer, "Deactivated")}>
          <Power size={15} /> Deactivate
        </Button>
      );
    }

    if (prosumer.accountStatus === "Deactivated") {
      return (
        <Button size="sm" onClick={() => updateStatus(prosumer, "Active")}>
          <RotateCcw size={15} /> Reactivate
        </Button>
      );
    }

    return (
      <Button size="sm" onClick={() => updateStatus(prosumer, "Active")}>
        <Check size={15} /> Activate
      </Button>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Backoffice"
        title="Prosumer Management"
        description="Review and manage prosumer account access."
        icon={UsersRound}
        actions={
          <>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadProsumers} disabled={loading}>
              <RefreshCw size={16} /> Refresh
            </Button>
            <Button onClick={openCreateDialog}>
              <UserPlus size={17} /> Create Prosumer
            </Button>
          </>
        }
      />

      {error && <FeedbackAlert>{error}</FeedbackAlert>}
      {message && <FeedbackAlert variant="success">{message}</FeedbackAlert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound size={19} className="text-brand-600" /> Prosumers
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading Prosumers...</p>
          ) : prosumers.length === 0 ? (
            <p className="text-sm text-slate-500">No Prosumers match this status.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[950px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>NIC</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {prosumers.map((prosumer) => (
                    <TableRow key={prosumer.id}>
                      <TableCell className="font-medium">{prosumer.id}</TableCell>
                      <TableCell>{prosumer.fullName}</TableCell>
                      <TableCell>{prosumer.email || "—"}</TableCell>
                      <TableCell>{prosumer.phone || "—"}</TableCell>
                      <TableCell>
                        <StatusBadge status={prosumer.accountStatus} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(prosumer)}>
                            <Pencil size={15} /> Edit
                          </Button>
                          {renderAction(prosumer)}
                        </div>
                      </TableCell>
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
            <DialogTitle>{editingNic ? "Edit Prosumer" : "Create Prosumer"}</DialogTitle>
            <DialogDescription>
              {editingNic
                ? "Update the Prosumer profile. NIC cannot be changed."
                : "Create a Prosumer profile using the NIC as the primary identifier."}
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
            {formError && (
              <div className="sm:col-span-2">
                <FeedbackAlert>{formError}</FeedbackAlert>
              </div>
            )}

            <Field label="NIC" name="nic" value={form.nic} onChange={handleChange} disabled={Boolean(editingNic)} required />
            <Field label="Full name" name="fullName" value={form.fullName} onChange={handleChange} required />
            {!editingNic && (
              <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} required />
            )}
            <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
            <Field label="Phone (optional)" name="phone" value={form.phone} onChange={handleChange} />

            <DialogFooter className="sm:col-span-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </DialogClose>

              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingNic ? "Save changes" : "Create Prosumer"}
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
