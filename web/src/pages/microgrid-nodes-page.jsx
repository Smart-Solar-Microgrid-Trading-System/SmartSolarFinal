import { useEffect, useState } from "react";
import { MapPin, RadioTower, RefreshCw,Map } from "lucide-react";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Link } from "react-router-dom";

export function MicrogridNodesPage() {
  const { session } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNodes() {
    setLoading(true);
    setError("");
    try { setNodes(await api.getNodes(session.token)); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadNodes(); }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Microgrid network</p>
          <h1 className="text-2xl font-bold text-slate-900">Microgrid Nodes</h1>
          <p className="mt-1 text-sm text-slate-500">Active hubs available to the Smart Solar Microgrid network.</p>
        </div>
        <Button variant="outline" onClick={loadNodes} disabled={loading}><RefreshCw size={16} /> Refresh</Button>
      </div>

      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><RadioTower size={19} className="text-brand-600" /> Active nodes</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-slate-500">Loading active nodes...</p> : nodes.length === 0 ? <p className="text-sm text-slate-500">No active microgrid nodes are available.</p> : (
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader><TableRow><TableHead>Node</TableHead><TableHead>Location</TableHead><TableHead>Capacity</TableHead><TableHead>Available slots</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>{nodes.map((node) => <TableRow key={node.id}>
                  <TableCell className="font-medium">{node.name}</TableCell>
                  <TableCell><span className="flex items-center gap-1.5 text-slate-600"><MapPin size={15} className="text-brand-600" />{node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}</span></TableCell>
                  <TableCell>{node.capacityKw} kW</TableCell>
                    <TableCell>{node.availableBatterySlots}</TableCell>
                    <TableCell><Badge variant="secondary">{node.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell>
                        <Button variant="outline" size="sm" asChild>
                            <Link to={`/nodes/${node.id}`}> View</Link>
                        </Button>
                    </TableCell>
                </TableRow>)}</TableBody>
              </Table>
            </div>
          )}
        </CardContent>
          </Card>
          <Button variant="outline" asChild>
              <Link to={`/nodes/map`}>
                  <Map size={16} />
                  View on Map
              </Link>
          </Button>
          <Button asChild>
              <Link to="/nodes/new">
                  Add New Node
              </Link>
          </Button>

      <p className="text-sm text-slate-500"></p>
    </section>
  );
}
