// Point this at your deployed backend (see server/README.md).
// Never call the Anthropic API directly from the app — the key must stay server-side.
export const API_BASE_URL = 'https://shelf-backend-97bp.onrender.com';
// Longer than the server's own 45s Anthropic timeout, so a graceful timeout response
// from the server has time to arrive before the client gives up on its own.
export const REQUEST_TIMEOUT_MS = 55000;
export const TIMEOUT_MESSAGE = 'This is taking longer than expected — please try again.';
export const OVERLOADED_MESSAGE = 'The recipe service is briefly overloaded — please try again in a moment.';
