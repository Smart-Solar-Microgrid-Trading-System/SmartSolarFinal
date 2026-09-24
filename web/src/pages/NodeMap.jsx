import { useEffect, useRef, useState } from "react";
import { ArrowLeft, MapPin, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { FeedbackAlert } from "@/components/feedback-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle,} from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function NodeMapPage() {
    const { session } = useAuth();

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
            setNodes(result);
        } catch (requestError) {
            setError(
                requestError.message || "Failed to load microgrid nodes."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadNodes();
    }, []);

    useEffect(() => {
        if (!nodes.length || !mapRef.current) {
            return;
        }

        if (!window.google?.maps) {
            setError(
                "Google Maps could not be loaded. Check your Google Maps API configuration."
            );
            return;
        }

        const firstNode = nodes[0];

        googleMapRef.current = new window.google.maps.Map(
            mapRef.current,
            {
                center: {
                    lat: Number(firstNode.latitude),
                    lng: Number(firstNode.longitude),
                },
                zoom: 10,
                mapTypeControl: true,
                streetViewControl: false,
                fullscreenControl: true,
            }
        );

        markersRef.current.forEach((marker) => {
            marker.setMap(null);
        });

        markersRef.current = [];

        const bounds = new window.google.maps.LatLngBounds();

        nodes.forEach((node) => {
            const position = {
                lat: Number(node.latitude),
                lng: Number(node.longitude),
            };

            const marker = new window.google.maps.Marker({
                position,
                map: googleMapRef.current,
                title: node.name,
            });

            const infoWindow = new window.google.maps.InfoWindow({
                content: `
          <div style="padding: 4px;">
            <strong>${node.name}</strong>
            <br />
            Capacity: ${node.capacityKw} kW
            <br />
            Battery slots: ${node.availableBatterySlots}
          </div>
        `,
            });

            marker.addListener("click", () => {
                infoWindow.open({
                    map: googleMapRef.current,
                    anchor: marker,
                });
            });

            markersRef.current.push(marker);
            bounds.extend(position);
        });

        if (nodes.length > 1) {
            googleMapRef.current.fitBounds(bounds);
        }
    }, [nodes]);

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
                            Microgrid network
                        </p>

                        <h1 className="text-2xl font-bold text-slate-900">
                            Node Map
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Geographic view of the microgrid network.
                        </p>
                    </div>
                </div>

                <Button
                    variant="outline"
                    onClick={loadNodes}
                    disabled={loading}
                >
                    <RefreshCw size={16} />
                    Refresh
                </Button>
            </div>

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
                        <p className="text-sm text-slate-500">
                            Loading nodes...
                        </p>
                    ) : nodes.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            No microgrid nodes are available.
                        </p>
                    ) : (
                        <div
                            ref={mapRef}
                            className="h-[600px] w-full rounded-lg border bg-slate-100"/>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}