/**
 * Temporary closure switch.
 *
 * While `ORDERING_PAUSED` is true the site stays online but:
 *  - menu "+ Add", hero / CTA order buttons and the sticky basket are disabled
 *  - the checkout form is replaced with a closed notice
 *  - /api/create-payment and /api/create-cash-order reject new orders (503)
 *
 * To restore ordering: set `ORDERING_PAUSED` to false and redeploy.
 */
export const ORDERING_PAUSED = true;

export const ORDERING_PAUSED_TITLE = "We're closed for a week";

export const ORDERING_PAUSED_MESSAGE =
  "Amore Mio is temporarily closed for one week, so we're not taking online orders right now. We look forward to welcoming you back very soon!";
