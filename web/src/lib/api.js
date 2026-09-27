const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const sameHostApiBaseUrl = `${window.location.protocol}//${window.location.hostname}:5080`;
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
  const payload = contentType.includes("json")
    ? await response.json()
    : null;

  if (!response.ok) {
    throw new ApiError(getErrorMessage(payload), response.status);
  }

  return payload;
}

function getErrorMessage(payload) {
  if (payload?.error) {
    return payload.error;
  }

  if (payload?.errors && typeof payload.errors === "object") {
    const [field, messages] = Object.entries(payload.errors)[0] || [];
    const message = Array.isArray(messages) ? messages[0] : null;

    if (field && message) {
      return `${field}: ${message}`;
    }
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
  login: (identifier, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: { identifier, password }
    }),

  getMe: (token) =>
    request("/api/users/me", { token }),

  getWebUsers: (token) =>
    request("/api/users", { token }),

  createWebUser: (token, user) =>
    request("/api/users", {
      token,
      method: "POST",
      body: user
    }),

  getProsumers: (token, status) =>
    request(
      `/api/prosumers${status ? `?status=${encodeURIComponent(status)}` : ""}`,
      { token }
    ),

  getPendingProsumers: (token) =>
    request("/api/prosumers?status=Pending", { token }),

  updateProsumerStatus: (token, nic, accountStatus) =>
    request(`/api/prosumers/${encodeURIComponent(nic)}/status`, {
      token,
      method: "PATCH",
      body: { accountStatus }
    }),

    //node management
    getNodes: (token) => request("/api/nodes", { token }),

    getNode: (token, id) => request(`/api/nodes/${encodeURIComponent(id)}`, { token }),

    createNode: (token, data) => request("/api/nodes", { token, method: "POST", body: data }),

    updateNode: (token, id, data) => request(`/api/nodes/${encodeURIComponent(id)}`, {
        token,
        method: "PUT",
        body: data
    }),
    deactivateNode: (token, nodeId) =>
        request(`/api/nodes/${encodeURIComponent(nodeId)}/deactivate`, {
            token,
            method: "PATCH"
        }),

  // Booking slots
  getBookingSlots: (token) =>
    request("/api/booking-slots", { token }),

  getBookingSlotsByNode: (token, nodeId) =>
    request(`/api/booking-slots/node/${encodeURIComponent(nodeId)}`, {
      token
    }),

  getAvailableSlots: (token, nodeId) =>
    request(`/api/booking-slots/node/${encodeURIComponent(nodeId)}`, { token }),

  createBookingSlot: (token, data) =>
    request("/api/booking-slots", {
      token,
      method: "POST",
      body: data
    }),

  updateBookingSlot: (token, id, data) =>
    request(`/api/booking-slots/${encodeURIComponent(id)}`, {
      token,
      method: "PUT",
      body: data
    }),

  deleteBookingSlot: (token, id) =>
    request(`/api/booking-slots/${encodeURIComponent(id)}`, {
      token,
      method: "DELETE"
    }),

  // Reservations
  getReservations: (token, filters = {}) => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (filters.status) {
      params.set("status", filters.status);
    }

    if (filters.nodeId) {
      params.set("nodeId", filters.nodeId);
    }

    if (filters.from) {
      params.set("from", filters.from);
    }

    if (filters.to) {
      params.set("to", filters.to);
    }

    const query = params.toString();

    return request(
      `/api/reservations${query ? `?${query}` : ""}`,
      { token }
    );
  },

  getReservationById: (token, id) =>
    request(`/api/reservations/${encodeURIComponent(id)}`, {
      token
    }),

  createReservation: (token, data) =>
    request("/api/reservations", { token, method: "POST", body: data }),

  updateReservation: (token, id, data) =>
    request(`/api/reservations/${encodeURIComponent(id)}`, { token, method: "PUT", body: data }),

  cancelReservation: (token, id) =>
    request(`/api/reservations/${encodeURIComponent(id)}`, { token, method: "DELETE" }),

  getCurrentReservations: (token) =>
    request("/api/reservations/current", { token }),

  getPendingReservations: (token) =>
    request("/api/reservations/pending", { token }),

  getReservationHistory: (token) =>
    request("/api/reservations/history", { token }),

  // Dashboard
  getOperationsDashboard: (token) =>
    request("/api/dashboard/operations", { token })
};
