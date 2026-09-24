const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const sameHostApiBaseUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
const baseUrl = (configuredBaseUrl || sameHostApiBaseUrl).replace(/\/$/, "");

async function request(path, { token, body, method = "GET" } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("json") ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload), response.status);
  }

  return payload;
}

function getErrorMessage(payload) {
  if (payload?.error) return payload.error;

  if (payload?.errors && typeof payload.errors === "object") {
    const [field, messages] = Object.entries(payload.errors)[0] || [];
    const message = Array.isArray(messages) ? messages[0] : null;
    if (field && message) return `${field}: ${message}`;
  }

  return payload?.title || "The request could not be completed.";
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const api = {
  login: (identifier, password) => request("/api/auth/login", { method: "POST", body: { identifier, password } }),
  getMe: (token) => request("/api/users/me", { token }),
  getWebUsers: (token) => request("/api/users", { token }),
  createWebUser: (token, user) => request("/api/users", { token, method: "POST", body: user }),
  getProsumers: (token, status) => request(`/api/prosumers${status ? `?status=${encodeURIComponent(status)}` : ""}`, { token }),
  getPendingProsumers: (token) => request("/api/prosumers?status=Pending", { token }),
  //getNodes: (token) => request("/api/nodes", { token }),
  updateProsumerStatus: (token, nic, accountStatus) => request(`/api/prosumers/${encodeURIComponent(nic)}/status`, {
    token,
    method: "PATCH",
    body: { accountStatus }
  }),

        async getNodes(token) {
            const response = await fetch("/api/nodes", { headers: { Authorization: `Bearer ${token}`,},});

            if (!response.ok) {
                throw new Error(await getErrorMessage(response, "Failed to load nodes." );
            }

            return response.json();
        },

        async getNode(token, id) {
            const response = await fetch(`/api/nodes/${id}`, { headers: { Authorization: `Bearer ${token}`,}});

            if (!response.ok) {
                throw new Error(await getErrorMessage( response, "Failed to load the node." ));
            }

            return response.json();
        },

        async createNode(token, data) {
            const response = await fetch("/api/nodes", {
                method: "POST",

                headers: {  "Content-Type": "application/json", Authorization: `Bearer ${token}`,},

                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(  await getErrorMessage( response,"Failed to create the node." ));
            }

            return response.json();
        },

        async updateNode(token, id, data) {
            const response = await fetch(`/api/nodes/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`,},

                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error( await getErrorMessage( response, "Failed to update the node."));
            }

            return response.json();
        },

        async deleteNode(token, id) {
            const response = await fetch(`/api/nodes/${id}`, {
                method: "DELETE",
                headers: {Authorization: `Bearer ${token}`, },
            });

            if (!response.ok) {
                throw new Error(  await getErrorMessage( response, "Failed to deactivate the node." ) );
            }
        },
    };

    async function getErrorMessage(response, fallback) {
        try { const body = await response.json();

return body.message || fallback; } catch { return fallback;}

};
