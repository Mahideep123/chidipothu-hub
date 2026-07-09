import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s timeout — gives Render free tier time to wake up
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Network error — backend offline or sleeping
      error.friendlyMessage =
        'Cannot reach the server. The backend may be waking up (Render free tier). Please wait 30 seconds and try again.';
    } else if (error.response.status === 401) {
      // Token expired — auto logout
      const isLoginRoute = error.config?.url?.includes('/auth/');
      if (!isLoginRoute) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const passwordLogin = (password) => api.post('/api/auth/password-login', { password });
export const sendOTP = (email) => api.post('/api/auth/send-otp', { email });
export const verifyOTP = (email, otp) => api.post('/api/auth/verify-otp', { email, otp });

// Dashboard
export const getDashboard = () => api.get('/api/dashboard');
export const getLocations = () => api.get('/api/locations');

// Properties
export const getProperties = (params) => api.get('/api/properties', { params });
export const getProperty = (id) => api.get(`/api/properties/${id}`);
export const createProperty = (data) => api.post('/api/properties', data);
export const updateProperty = (id, data) => api.put(`/api/properties/${id}`, data);
export const deleteProperty = (id) => api.delete(`/api/properties/${id}`);

// Files
export const uploadFile = (fileData, fileName, fileType) =>
  api.post('/api/upload', { file_data: fileData, file_name: fileName, file_type: fileType });
export const deleteFile = (publicId) => api.delete(`/api/upload/${publicId}`);

export default api;
