import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import { FeedbackAlert } from "@/components/feedback-alert";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { loadGoogleMaps } from "@/lib/google-maps";

export function NodeMapPage() {
    const { session } = useAuth();
    const [searchParams] = useSearchParams();
    const selectedNodeId = searchParams.get("nodeId");

    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markersRef = useRef([]);

    const [nodes, setNodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadNodes() {
        setLoading(true);
        setError("");

        try {
            const result = await api.getNodes(session.token);

            // when opened from a node page, only show that node
            if (selectedNodeId) {
                setNodes(result.filter((node) => node.id === selectedNodeId));
            } else {
                setNodes(result);
            }
        } catch (err) {
            setError(err.message || "Failed to load microgrid nodes.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadNodes();
    }, []);

    // draw the map again whenever the node list changes
    useEffect(() => {
        if (!nodes.length || !mapRef.current) return;

        async function drawMap() {
            try {
                setError("");

                const googleMaps = await loadGoogleMaps();
                if (!mapRef.current) return;

                const firstNode = nodes[0];

                googleMapRef.current = new googleMaps.Map(mapRef.current, {
                    center: { lat: Number(firstNode.latitude), lng: Number(firstNode.longitude) },
                    zoom: 10,
                    mapTypeControl: true,
                    streetViewControl: false,
                    fullscreenControl: true
                });

                // clear old markers
                markersRef.current.forEach((marker) => marker.setMap(null));
                markersRef.current = [];

                const bounds = new googleMaps.LatLngBounds();

                nodes.forEach((node) => {
                    const position = { lat: Number(node.latitude), lng: Number(node.longitude) };

                    const marker = new googleMaps.Marker({
                        position,
                        map: googleMapRef.current,
                        title: node.name
                    });

                    const infoWindow = new googleMaps.InfoWindow({
                        content: `
              <div style="padding: 8px;">
                <strong>${node.name}</strong>
                <br />
                Capacity: ${node.capacityKw} kW
                <br />
                Battery slots: ${node.availableBatterySlots}
              </div>
            `
                    });

                    marker.addListener("click", () => {
                        infoWindow.open({ map: googleMapRef.current, anchor: marker });
                    });

                    markersRef.current.push(marker);
                    bounds.extend(position);
                });

                // zoom out to fit all markers if there is more than one
                if (nodes.length > 1) {
                    googleMapRef.current.fitBounds(bounds);
                }
            } catch (err) {
                setError(err.message || "Google Maps could not be loaded.");
            }
        }

        drawMap();
    }, [nodes]);

    return (
        <section className="space-y-6">
            <PageHeader
                eyebrow="Microgrid network"
                title="Node Map"
                description="Geographic view of the microgrid network."
                icon={MapPin}
                actions={
                    <>
                        <Button variant="outline" size="icon" asChild>
                            <Link to="/nodes">
                                <ArrowLeft size={18} />
                            </Link>
                        </Button>

                        <Button variant="outline" onClick={loadNodes} disabled={loading}>
                            <RefreshCw size={16} />
                            Refresh
                        </Button>
                    </>
                }
            />

            {error && <FeedbackAlert>{error}</FeedbackAlert>}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin size={19} className="text-brand-600" />
                        Microgrid locations
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500">Loading nodes...</p>
                    ) : nodes.length === 0 ? (
                            <p className="text-sm text-slate-500">No microgrid nodes are available.</p>
                    ) : (
                                <div ref={mapRef} className="h-[600px] w-full rounded-lg border bg-slate-100" />
                    )}
                </CardContent>
            </Card>
        </section>
    );
}