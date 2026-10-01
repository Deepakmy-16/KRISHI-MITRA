// Central API configuration
// Production backend: https://krishi-mitra-6avb.onrender.com
// For local dev, set REACT_APP_API_URL=http://localhost:5000 in frontend/.env.local
const API_BASE_URL =
  process.env.REACT_APP_API_URL || "https://krishi-mitra-6avb.onrender.com";

export default API_BASE_URL;

