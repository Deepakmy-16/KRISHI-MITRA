// Central API configuration
// Production backend: https://krishi-mitra-6avb.onrender.com
const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000";
  }
  return "https://krishi-mitra-6avb.onrender.com";
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;

