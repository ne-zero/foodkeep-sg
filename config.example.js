// Copy to config.js and replace placeholders with your own deployment values.
// Do not commit live credentials or private configuration.
const APP_CONFIG = {
  API_BASE_URL: "https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/prod",
  AWS_REGION: "YOUR_REGION",
  COGNITO_USER_POOL_ID: "YOUR_USER_POOL_ID",
  COGNITO_CLIENT_ID: "YOUR_PUBLIC_APP_CLIENT_ID",
  COGNITO_DOMAIN: "https://YOUR_DOMAIN.auth.YOUR_REGION.amazoncognito.com",
  COGNITO_REDIRECT_URI: "http://localhost:8000",
  COGNITO_LOGOUT_URI: "http://localhost:8000"
};
