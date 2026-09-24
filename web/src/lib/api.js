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
  getNodes: (token) => request("/api/nodes", { token }),

  getNode: (token, id) => request(`/api/nodes/${ encodeURIComponent(id)}`, { token }),

  createNode: (token, data) => request("/api/nodes", { token, method: "POST", body: data }),

  updateNode: (token, id, data) => request(`/api/nodes/${ encodeURIComponent(id) } `, {
    token,
    method: "PUT",
    body: data
  }),

  deleteNode: (token, id) => request(`/ api / nodes / ${ encodeURIComponent(id) } `, {
    token,
    method: "DELETE"
  }),


};
