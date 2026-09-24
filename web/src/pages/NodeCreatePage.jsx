import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { NodeForm } from "./NodeForm";

export function NodeCreatePage() {
    const { session } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);

    async function handleSubmit(data) {
        setLoading(true);

        try {
            const node = await api.createNode(
                session.token,
                data
            );

            navigate(`/nodes/${node.id}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center gap-3">
                <Button
                    variant="outline"
                    size="icon"
                    asChild
                >
                    <Link to="/nodes">
                        <ArrowLeft size={18} />
                    </Link>
                </Button>

                <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                        Microgrid nodes
                    </p>

                    <h1 className="text-2xl font-bold text-slate-900">
                        Create Node
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Add a new solar or grid station.
                    </p>
                </div>
            </div>

            <NodeForm
                submitLabel="Create Node"
                loading={loading}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/nodes")}
            />
        </section>
    );
}