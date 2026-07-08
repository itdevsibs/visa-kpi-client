import axios from "axios";

// Setup base configuration for the Axios client
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor for attaching auth tokens (if any)
apiClient.interceptors.request.use(
  (config) => {
    // const token = localStorage.getItem("AUTH_TOKEN");
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor for handling global errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., redirect to login, clear local storage)
      console.error("Unauthorized access, redirecting to login...");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
