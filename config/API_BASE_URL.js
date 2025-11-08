export const getApiBaseUrl = () => {
  const host = window.location.hostname;
  return host === "localhost" ? "http://localhost:8081" : `http://${host}:8081`;
};
