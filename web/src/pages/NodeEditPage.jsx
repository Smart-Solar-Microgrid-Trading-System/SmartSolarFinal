import { useEffect, useState } from "react";
import { ArrowLeft, RadioTower, Save } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function NodeEditPage() {
    const { session } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        latitude: "",
        longitude: "",
        capacityKw: "",
        availableBatterySlots: "",
        address: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadNode() {
            setLoading(true);
            setError("");

            try {
                const node = await api.getNode(session.token, id);

                setForm({
                    name: node.name ?? "",
                    latitude: node.latitude ?? "",
                    longitude: node.longitude ?? "",
                    capacityKw: node.capacityKw ?? "",
                    availableBatterySlots:
                        node.availableBatterySlots ?? "",
                });
            } catch (requestError) {
                setError(requestError.message || "Failed to load the node.");
            } finally {
                setLoading(false);
            }
        }

        loadNode();
    }, [id, session.token]);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");

        if (!form.name.trim()) {
            setError("Node name is required.");
            return;
        }

        const latitude = Number(form.latitude);
        const longitude = Number(form.longitude);
        const capacityKw = Number(form.capacityKw);
        const availableBatterySlots = Number(
            form.availableBatterySlots
        );

        if (
            !Number.isFinite(latitude) ||
            latitude < -90 ||
            latitude > 90
        ) {
            setError("Latitude must be between -90 and 90.");
            return;
        }

        if (
            !Number.isFinite(longitude) ||
            longitude < -180 ||
            longitude > 180
        ) {
            setError("Longitude must be between -180 and 180.");
            return;
        }

        if (!Number.isFinite(capacityKw) || capacityKw <= 0) {
            setError("Capacity must be greater than 0.");
            return;
        }

        if (
            !Number.isInteger(availableBatterySlots) ||
            availableBatterySlots < 0
        ) {
            setError("Battery slots must be a whole number of 0 or more.");
            return;
        }

        setSaving(true);

        try {
            await api.updateNode(session.token, id, {
                name: form.name.trim(),
                address: form.address.trim(),
                latitude,
                longitude,
                capacityKw,
                availableBatterySlots,
            });

            navigate(`/nodes/${id}`);
        } catch (requestError) {
            setError(requestError.message || "Failed to update the node.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <section>
                <p className="text-sm text-slate-500">
                    Loading node...
                </p>
            </section>
        );
    }

    return (
        <section className="space-y-6">
            <PageHeader
                eyebrow="Microgrid network"
                title="Edit Microgrid Node"
                description="Update the node configuration."
                icon={RadioTower}
                actions={(
                    <Button variant="outline" size="icon" asChild>
                        <Link to={`/nodes/${id}`}>
                            <ArrowLeft size={18} />
                        </Link>
                    </Button>
                )}
            />

            {error && <FeedbackAlert>{error}</FeedbackAlert>}

            <Card className="max-w-3xl">
                <CardHeader>
                    <CardTitle>Node information</CardTitle>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="name">Node name</Label>

                            <Input
                                id="name"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>

                            <Input
                                id="address"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="latitude">Latitude</Label>

                                <Input
                                    id="latitude"
                                    name="latitude"
                                    type="number"
                                    step="any"
                                    value={form.latitude}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="longitude">Longitude</Label>

                                <Input
                                    id="longitude"
                                    name="longitude"
                                    type="number"
                                    step="any"
                                    value={form.longitude}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="capacityKw">
                                    Capacity (kW)
                                </Label>

                                <Input
                                    id="capacityKw"
                                    name="capacityKw"
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={form.capacityKw}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="availableBatterySlots">
                                    Available battery slots
                                </Label>

                                <Input
                                    id="availableBatterySlots"
                                    name="availableBatterySlots"
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.availableBatterySlots}
                                    onChange={handleChange}
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" asChild disabled={saving}>
                                <Link to={`/nodes/${id}`}>Cancel</Link>
                            </Button>

                            <Button type="submit" disabled={saving}>
                                <Save size={16} />

                                {saving ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}