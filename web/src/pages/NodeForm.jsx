import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function NodeForm() {
    const { session } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        latitude: "",
        longitude: "",
        capacityKw: "",
        availableBatterySlots: "",
        address: "",
    });

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

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

        if (form.latitude === "" || form.longitude === "") {
            setError("Latitude and longitude are required.");
            return;
        }

        if (form.capacityKw === "") {
            setError("Capacity is required.");
            return;
        }

        if (form.availableBatterySlots === "") {
            setError("Available battery slots are required.");
            return;
        }

        const latitude = Number(form.latitude);
        const longitude = Number(form.longitude);
        const capacityKw = Number(form.capacityKw);
        const availableBatterySlots = Number(form.availableBatterySlots);

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
            await api.createNode(session.token, {
                name: form.name.trim(),
                address: form.address.trim(),
                latitude,
                longitude,
                capacityKw,
                availableBatterySlots,
            });

            navigate("/nodes");
        } catch (requestError) {
            setError(requestError.message || "Failed to create the node.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="space-y-6">

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
                                placeholder="Example: Colombo Central"
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
                                placeholder="Example: No32, Main Street, Colombo 10"
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
                                    placeholder="6.9271"
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
                                    placeholder="79.8612"
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
                                    placeholder="50"
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
                                    placeholder="4"
                                    disabled={saving}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" asChild disabled={saving}>
                                <Link to="/nodes">Cancel</Link>
                            </Button>

                            <Button type="submit" disabled={saving}>
                                <Save size={16} />

                                {saving ? "Creating..." : "Create Node"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}