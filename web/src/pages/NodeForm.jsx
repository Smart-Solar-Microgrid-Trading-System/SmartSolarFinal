import { useState } from "react";
import { Save } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const emptyForm = {
    name: "",
    latitude: "",
    longitude: "",
    capacityKw: "",
    availableBatterySlots: "",
    address: ""
};

export function NodeForm() {
    const { session } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    }

    // returns an error message, or empty string if the form is ok
    function validate() {
        if (!form.name.trim()) return "Node name is required.";
        if (form.latitude === "" || form.longitude === "") return "Latitude and longitude are required.";
        if (form.capacityKw === "") return "Capacity is required.";
        if (form.availableBatterySlots === "") return "Available battery slots are required.";

        const latitude = Number(form.latitude);
        const longitude = Number(form.longitude);
        const capacityKw = Number(form.capacityKw);
        const slots = Number(form.availableBatterySlots);

        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
            return "Latitude must be between -90 and 90.";
        }
        if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
            return "Longitude must be between -180 and 180.";
        }
        if (!Number.isFinite(capacityKw) || capacityKw <= 0) {
            return "Capacity must be greater than 0.";
        }
        if (!Number.isInteger(slots) || slots < 0) {
            return "Battery slots must be a whole number of 0 or more.";
        }

        return "";
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        const validationError = validate();
        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);

        try {
            await api.createNode(session.token, {
                name: form.name.trim(),
                address: form.address.trim(),
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
                capacityKw: Number(form.capacityKw),
                availableBatterySlots: Number(form.availableBatterySlots)
            });

            navigate("/nodes");
        } catch (err) {
            setError(err.message || "Failed to create the node.");
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
                        <FormField
                            label="Node name"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Example: Colombo Central"
                            disabled={saving}
                        />

                        <FormField
                            label="Address"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            placeholder="Example: No32, Main Street, Colombo 10"
                            disabled={saving}
                        />

                        <div className="grid gap-5 md:grid-cols-2">
                            <FormField
                                label="Latitude"
                                name="latitude"
                                type="number"
                                step="any"
                                value={form.latitude}
                                onChange={handleChange}
                                placeholder="6.9271"
                                disabled={saving}
                            />
                            <FormField
                                label="Longitude"
                                name="longitude"
                                type="number"
                                step="any"
                                value={form.longitude}
                                onChange={handleChange}
                                placeholder="79.8612"
                                disabled={saving}
                            />
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <FormField
                                label="Capacity (kW)"
                                name="capacityKw"
                                type="number"
                                min="0"
                                step="any"
                                value={form.capacityKw}
                                onChange={handleChange}
                                placeholder="50"
                                disabled={saving}
                            />
                            <FormField
                                label="Available battery slots"
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

function FormField({ label, name, ...inputProps }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input id={name} name={name} {...inputProps} />
        </div>
    );
}