import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamic request interceptor to inject current logged in user email and ID
api.interceptors.request.use((config) => {
  const currentUserEmail = localStorage.getItem('active_user_email');
  const currentUserId = localStorage.getItem('active_user_id');

  if (currentUserEmail) {
    config.headers['x-user-email'] = currentUserEmail;
  } else if (currentUserId) {
    config.headers['x-user-id'] = currentUserId;
  }
  return config;
});

export default api;
