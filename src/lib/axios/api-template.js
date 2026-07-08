// src/lib/axios/api-template.js

import axios from "axios";

/* ==========================================
   BASE URL
========================================== */

const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ==========================================
   STORAGE KEYS
========================================== */

const TOKEN_KEY = "token";
const USER_KEY = "user";

/* ==========================================
   PUBLIC ROUTES
========================================== */

const PUBLIC_ROUTES = ["/", "/login"];

/* ==========================================
   HELPERS
========================================== */

function isPublicRoute() {
  if (typeof window === "undefined") return false;

  return PUBLIC_ROUTES.includes(window.location.pathname);
}

export function saveAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  const user = localStorage.getItem(USER_KEY);

  if (!user) return null;

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated() {
  return !!getToken();
}

export function handleLogout() {
  clearAuth();

  if (!isPublicRoute()) {
    window.location.replace("/login");
  }
}

/* ==========================================
   AXIOS INSTANCE
========================================== */

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

/* ==========================================
   REQUEST INTERCEPTOR
========================================== */

api.interceptors.request.use(
  (config) => {
    const token = getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method?.toLowerCase() === "get") {
      config.params = {
        ...(config.params || {}),
        _t: Date.now(),
      };

      config.headers["Cache-Control"] = "no-cache";
      config.headers["Pragma"] = "no-cache";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ==========================================
   RESPONSE INTERCEPTOR
========================================== */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    if ((status === 401 || status === 403) && !isPublicRoute()) {
      handleLogout();
    }

    return Promise.reject(error);
  }
);

export default api;