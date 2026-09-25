import { useState } from "react";
import { ArrowLeft, RadioTower } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
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
            <PageHeader
                eyebrow="Microgrid nodes"
                title="Create Node"
                description="Register a new solar microgrid node."
                icon={RadioTower}
                actions={(
                    <Button variant="outline" size="icon" asChild>
                        <Link to="/nodes">
                            <ArrowLeft size={18} />
                        </Link>
                    </Button>
                )}
            />

            <NodeForm
                submitLabel="Create Node"
                loading={loading}
                onSubmit={handleSubmit}
                onCancel={() => navigate("/nodes")}
            />
        </section>
    );
}