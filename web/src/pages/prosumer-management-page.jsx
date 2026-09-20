import { useEffect, useState } from "react";
import { Check, Power, RefreshCw, RotateCcw, UsersRound } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Badge } from "@/components/ui/badge";
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

  async function load() {
    setLoading(true);
    setError("");
    try { setProsumers(await api.getProsumers(session.token, filterStatus === "All" ? undefined : filterStatus)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filterStatus]);

  async function update(prosumer, nextStatus) {
    setError(""); setMessage("");
    try {
      const user = await api.updateProsumerStatus(session.token, prosumer.id, nextStatus);
      setMessage(`${user.fullName} is now ${user.accountStatus}.`);
      await load();
    } catch (requestError) { setError(requestError.message); }
  }

  function actionFor(prosumer) {
    if (prosumer.accountStatus === "Active") return <Button size="sm" variant="outline" onClick={() => update(prosumer, "Deactivated")}><Power size={15} /> Deactivate</Button>;
    if (prosumer.accountStatus === "Deactivated") return <Button size="sm" onClick={() => update(prosumer, "Active")}><RotateCcw size={15} /> Reactivate</Button>;
    return <Button size="sm" onClick={() => update(prosumer, "Active")}><Check size={15} /> Activate</Button>;
  }

  return <section className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Backoffice</p><h1 className="text-2xl font-bold text-slate-900">Prosumer Management</h1></div><div className="flex flex-wrap gap-2"><Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="All">All statuses</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Deactivated">Deactivated</SelectItem></SelectContent></Select><Button variant="outline" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</Button></div></div>{error && <FeedbackAlert>{error}</FeedbackAlert>}{message && <FeedbackAlert variant="success">{message}</FeedbackAlert>}<Card><CardHeader><CardTitle className="flex items-center gap-2"><UsersRound size={19} className="text-brand-600" /> Prosumers</CardTitle></CardHeader><CardContent>{loading ? <p className="text-sm text-slate-500">Loading Prosumers...</p> : prosumers.length === 0 ? <p className="text-sm text-slate-500">No Prosumers match this status.</p> : <div className="overflow-x-auto"><Table className="min-w-[850px]"><TableHeader><TableRow><TableHead>NIC</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{prosumers.map((prosumer) => <TableRow key={prosumer.id}><TableCell className="font-medium">{prosumer.id}</TableCell><TableCell>{prosumer.fullName}</TableCell><TableCell>{prosumer.email || "—"}</TableCell><TableCell>{prosumer.phone || "—"}</TableCell><TableCell><Badge variant="secondary">{prosumer.accountStatus}</Badge></TableCell><TableCell className="text-right">{actionFor(prosumer)}</TableCell></TableRow>)}</TableBody></Table></div>}</CardContent></Card></section>;
}
