// src/lib/axios/api.js

import api from "./api-template";

/* ==========================================
   GET
========================================== */
export async function apiGet(endpoint, config = {}) {
  try {
    const response = await api.get(endpoint, config);
    return response.data;
  } catch (error) {
    console.error("GET Error:", error.response?.data || error.message);
    throw error;
  }
}

/* ==========================================
   POST
========================================== */
export async function apiPost(endpoint, data = {}, config = {}) {
  try {
    const response = await api.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error("POST Error:", error.response?.data || error.message);
    throw error;
  }
}

/* ==========================================
   PUT
========================================== */
export async function apiPut(endpoint, data = {}, config = {}) {
  try {
    const response = await api.put(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error("PUT Error:", error.response?.data || error.message);
    throw error;
  }
}

/* ==========================================
   PATCH
========================================== */
export async function apiPatch(endpoint, data = {}, config = {}) {
  try {
    const response = await api.patch(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error("PATCH Error:", error.response?.data || error.message);
    throw error;
  }
}

/* ==========================================
   DELETE
========================================== */
export async function apiDelete(endpoint, config = {}) {
  try {
    const response = await api.delete(endpoint, config);
    return response.data;
  } catch (error) {
    console.error("DELETE Error:", error.response?.data || error.message);
    throw error;
  }
}

/* ==========================================
   FILE UPLOAD
========================================== */
export async function apiUpload(endpoint, formData, onProgress) {
  try {
    const response = await api.post(endpoint, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },

      onUploadProgress(progressEvent) {
        if (onProgress && progressEvent.total) {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );

          onProgress(percent);
        }
      },
    });

    return response.data;
  } catch (error) {
    console.error("UPLOAD Error:", error.response?.data || error.message);
    throw error;
  }
}

/* ==========================================
   FILE DOWNLOAD
========================================== */
export async function apiDownload(endpoint, config = {}) {
  try {
    const response = await api.get(endpoint, {
      ...config,
      responseType: "blob",
    });

    return response;
  } catch (error) {
    console.error("DOWNLOAD Error:", error.response?.data || error.message);
    throw error;
  }
}

export default api;