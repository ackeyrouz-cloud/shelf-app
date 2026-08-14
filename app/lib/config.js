// Point this at your deployed backend (see server/README.md).
// Never call the Anthropic API directly from the app — the key must stay server-side.
export const API_BASE_URL = 'https://shelf-backend-97bp.onrender.com';
// Longer than the server's own 130s Anthropic timeout, so a graceful timeout response
// from the server has time to arrive before the client gives up on its own. Raised
// alongside the server's own timeout after Render logs confirmed real requests were
// being killed by the old 45s/55s ceiling before generation had a chance to finish,
// then raised again after a real large-pantry test measured 94s end-to-end.
export const REQUEST_TIMEOUT_MS = 145000;
export const TIMEOUT_MESSAGE = 'This is taking longer than expected — please try again.';
export const OVERLOADED_MESSAGE = 'The recipe service is briefly overloaded — please try again in a moment.';
