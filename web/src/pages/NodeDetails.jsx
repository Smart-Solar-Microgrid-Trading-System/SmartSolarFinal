import { useEffect, useState } from "react";
import { ArrowLeft, Edit, MapPin, RadioTower, Battery,Zap,} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle,} from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function NodeDetailsPage() {
    const { session } = useAuth();
    const { id } = useParams();

    const [node, setNode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadNode() {
            setLoading(true);
            setError("");

            try {
                const result = await api.getNode(session.token, id);
                setNode(result);
            } catch (requestError) {
                setError(
                    requestError.message || "Failed to load the node."
                );
            } finally {
                setLoading(false);
            }
        }

        loadNode();
    }, [id, session.token]);

    if (loading) {
        return (
            <section>
                <p className="text-sm text-slate-500">
                    Loading node...
                </p>
            </section>
        );
    }

    if (error) {
        return (
            <section className="space-y-4">
                <Button variant="outline" asChild>
                    <Link to="/nodes">
                        <ArrowLeft size={16} />
                        Back to Nodes
                    </Link>
                </Button>

                <FeedbackAlert>{error}</FeedbackAlert>
            </section>
        );
    }

    if (!node) {
        return (
            <section className="space-y-4">
                <Button variant="outline" asChild>
                    <Link to="/nodes">
                        <ArrowLeft size={16} />
                        Back to Nodes
                    </Link>
                </Button>

                <p className="text-sm text-slate-500">
                    Node not found.
                </p>
            </section>
        );
    }

    const isActive =
        node.isActive !== undefined ? node.isActive : true;

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" asChild>
                        <Link to="/nodes">
                            <ArrowLeft size={18} />
                        </Link>
                    </Button>

                    <div>
                        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                            Microgrid node
                        </p>

                        <h1 className="text-2xl font-bold text-slate-900">
                            {node.name}
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Node details and configuration.
                        </p>
                    </div>
                </div>

                <Button asChild>
                    <Link to={`/nodes/${node.id}/edit`}>
                        <Edit size={16} />
                        Edit Node
                    </Link>
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <RadioTower
                                size={19}
                                className="text-brand-600"
                            />
                            Node status
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <Badge variant={isActive ? "secondary" : "destructive"}>
                            {isActive ? "Active" : "Inactive"}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin
                                size={19}
                                className="text-brand-600"
                            />
                            Location
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="font-medium text-slate-900">
                            {Number(node.latitude).toFixed(4)},{" "}
                            {Number(node.longitude).toFixed(4)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Latitude / Longitude
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap size={19} className="text-brand-600" />
                            Energy capacity
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-2xl font-bold text-slate-900">
                            {node.capacityKw} kW
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Maximum configured node capacity
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Battery
                                size={19}
                                className="text-brand-600"
                            />
                            Battery slots
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <p className="text-2xl font-bold text-slate-900">
                            {node.availableBatterySlots}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Currently available battery slots
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Node information</CardTitle>
                </CardHeader>

                <CardContent>
                    <dl className="grid gap-5 md:grid-cols-2">
                        <div>
                            <dt className="text-sm text-slate-500">
                                Node ID
                            </dt>

                            <dd className="mt-1 break-all font-medium text-slate-900">
                                {node.id}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm text-slate-500">
                                Name
                            </dt>

                            <dd className="mt-1 font-medium text-slate-900">
                                {node.name}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm text-slate-500">
                                Latitude
                            </dt>

                            <dd className="mt-1 font-medium text-slate-900">
                                {node.latitude}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm text-slate-500">
                                Longitude
                            </dt>

                            <dd className="mt-1 font-medium text-slate-900">
                                {node.longitude}
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm text-slate-500">
                                Capacity
                            </dt>

                            <dd className="mt-1 font-medium text-slate-900">
                                {node.capacityKw} kW
                            </dd>
                        </div>

                        <div>
                            <dt className="text-sm text-slate-500">
                                Available battery slots
                            </dt>

                            <dd className="mt-1 font-medium text-slate-900">
                                {node.availableBatterySlots}
                            </dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </section>
    );
}