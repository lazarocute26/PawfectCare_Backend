export const getApiBaseUrl = () => {
  return host === "localhost"
    ? "http://localhost:8081"
    : "https://pawfectcare-ua8k.onrender.com";
};
