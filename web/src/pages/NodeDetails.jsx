import { useEffect, useState } from "react";
import { ArrowLeft, Battery, Edit, Map, MapPin, RadioTower, Zap } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const statColors = {
    brand: "from-brand-50 to-brand-100 text-brand-600",
    solar: "from-amber-50 to-amber-100 text-amber-600",
    emerald: "from-emerald-50 to-emerald-100 text-emerald-600",
    rose: "from-rose-50 to-rose-100 text-rose-600"
};

export function NodeDetailsPage() {
    const { session } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const [node, setNode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deactivating, setDeactivating] = useState(false);

    useEffect(() => {
        async function loadNode() {
            setLoading(true);
            setError("");

            try {
                const result = await api.getNode(session.token, id);
                setNode(result);
            } catch (err) {
                setError(err.message || "Failed to load the node.");
            } finally {
                setLoading(false);
            }
        }

        loadNode();
    }, [id, session.token]);

    async function handleDeactivate() {
        if (!node) return;

        const confirmed = window.confirm(
            `Are you sure you want to deactivate "${node.name}"?\n\n` +
            "This node will no longer be available for active operations."
        );
        if (!confirmed) return;

        setDeactivating(true);
        setError("");

        try {
            await api.deactivateNode(session.token, node.id);
            navigate("/nodes");
        } catch (err) {
            setError(err.message || "Failed to deactivate the node.");
        } finally {
            setDeactivating(false);
        }
    }

    if (loading) {
        return (
            <section>
                <p className="text-sm text-slate-500">Loading node...</p>
            </section>
        );
    }

    if (error || !node) {
        return (
            <section className="space-y-4">
                <Button variant="outline" asChild>
                    <Link to="/nodes">
                        <ArrowLeft size={16} />
                        Back to Nodes
                    </Link>
                </Button>

                {error ? (
                    <FeedbackAlert>{error}</FeedbackAlert>
                ) : (
                    <p className="text-sm text-slate-500">Node not found.</p>
                )}
            </section>
        );
    }

    // older records may not have isActive, treat those as active
    const isActive = node.isActive !== undefined ? node.isActive : true;

    return (
        <section className="space-y-6">
            <PageHeader
                eyebrow="Microgrid node"
                title={node.name}
                description="Node details and configuration."
                icon={RadioTower}
                actions={
                    <>
                        <Button variant="outline" size="icon" asChild>
                            <Link to="/nodes">
                                <ArrowLeft size={18} />
                            </Link>
                        </Button>

                        <Button asChild>
                            <Link to={`/nodes/${node.id}/edit`}>
                                <Edit size={16} />
                                Edit Node
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={RadioTower} tone={isActive ? "emerald" : "rose"} label="Node status">
                    <StatusBadge status={isActive ? "Active" : "Inactive"} className="mt-1 px-3 py-1 text-sm" />
                </StatCard>

                <StatCard icon={MapPin} tone="brand" label="Latitude / Longitude">
                    <p className="text-lg font-bold text-slate-900">
                        {Number(node.latitude).toFixed(4)}, {Number(node.longitude).toFixed(4)}
                    </p>
                </StatCard>

                <StatCard icon={Zap} tone="solar" label="Energy capacity">
                    <p className="text-2xl font-bold text-slate-900">{node.capacityKw} kW</p>
                </StatCard>

                <StatCard icon={Battery} tone="brand" label="Battery slots">
                    <p className="text-2xl font-bold text-slate-900">{node.availableBatterySlots}</p>
                </StatCard>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Node information</CardTitle>
                </CardHeader>

                <CardContent>
                    <dl className="grid gap-5 md:grid-cols-2">
                        <InfoItem label="Node ID" value={node.id} className="break-all" />
                        <InfoItem label="Name" value={node.name} />
                        <InfoItem label="Latitude" value={node.latitude} />
                        <InfoItem label="Longitude" value={node.longitude} />
                        <InfoItem label="Capacity" value={`${node.capacityKw} kW`} />
                        <InfoItem label="Available battery slots" value={node.availableBatterySlots} />
                    </dl>
                </CardContent>
            </Card>

            <Button variant="outline" asChild>
                <Link to={`/nodes/map?nodeId=${encodeURIComponent(node.id)}`}>
                    <Map size={16} />
                    View on Map
                </Link>
            </Button>

            {/* no need to show this if the node is already inactive */}
            {isActive && (
                <Button variant="destructive" onClick={handleDeactivate} disabled={deactivating}>
                    {deactivating ? "Deactivating..." : "Deactivate"}
                </Button>
            )}
        </section>
    );
}

function InfoItem({ label, value, className }) {
    return (
        <div>
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd className={cn("mt-1 font-medium text-slate-900", className)}>{value}</dd>
        </div>
    );
}

function StatCard({ icon: Icon, tone = "brand", label, children }) {
    return (
        <Card>
            <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                    <p className="text-sm text-slate-500">{label}</p>
                    <div className="mt-2">{children}</div>
                </div>

                <div className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${statColors[tone]}`}>
                    <Icon size={20} aria-hidden="true" />
                </div>
            </CardContent>
        </Card>
    );
}