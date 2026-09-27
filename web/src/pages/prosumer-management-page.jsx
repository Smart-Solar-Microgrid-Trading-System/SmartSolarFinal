import { useEffect, useState } from "react";
import { Check, Power, RefreshCw, RotateCcw, UsersRound } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function ProsumerManagementPage() {
  const { session } = useAuth();

  const [prosumers, setProsumers] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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
              <Table className="min-w-[850px]">
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
                      <TableCell className="text-right">{renderAction(prosumer)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}