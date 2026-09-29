import { useEffect, useState } from "react";
import { Map, MapPin, Plus, RadioTower, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function MicrogridNodesPage() {
  const { session } = useAuth();

  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadNodes() {
    setLoading(true);
    setError("");

    try {
      const data = await api.getNodes(session.token);
      setNodes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNodes();
  }, []);

  function renderContent() {
    if (loading) {
      return <p className="text-sm text-slate-500">Loading active nodes...</p>;
    }

    if (nodes.length === 0) {
      return <p className="text-sm text-slate-500">No active microgrid nodes are available.</p>;
    }

    return (
      <div className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Node</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Available slots</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {nodes.map((node) => (
              <TableRow key={node.id}>
                <TableCell className="font-medium">{node.name}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <MapPin size={15} className="text-brand-600" />
                    {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                  </span>
                </TableCell>
                <TableCell>{node.capacityKw} kW</TableCell>
                <TableCell>{node.availableBatterySlots}</TableCell>
                <TableCell>
                  <StatusBadge status={node.isActive ? "Active" : "Inactive"} />
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/nodes/${node.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Microgrid network"
        title="Microgrid Nodes"
        description="Active hubs available to the Smart Solar Microgrid network."
        icon={RadioTower}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/nodes/map">
                <Map size={16} />
                View on Map
              </Link>
            </Button>
            <Button variant="outline" onClick={loadNodes} disabled={loading}>
              <RefreshCw size={16} /> Refresh
            </Button>
            <Button asChild>
              <Link to="/nodes/new">
                <Plus size={16} />
                Add New Node
              </Link>
            </Button>
          </>
        }
      />

      {error && <FeedbackAlert>{error}</FeedbackAlert>}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RadioTower size={19} className="text-brand-600" /> Active nodes
          </CardTitle>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>
    </section>
  );
}