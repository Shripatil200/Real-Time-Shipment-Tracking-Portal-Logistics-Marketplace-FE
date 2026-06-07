const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

export async function api(path, options = {}) {
  const token = localStorage.getItem("fleetflow_token");
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

export function saveSession(session) {
  localStorage.setItem("fleetflow_token", session.token);
  localStorage.setItem("fleetflow_user", JSON.stringify(session));
}

export function getSession() {
  const raw = localStorage.getItem("fleetflow_user");
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem("fleetflow_token");
  localStorage.removeItem("fleetflow_user");
}
