import {
  ORDERING_PAUSED_MESSAGE,
  ORDERING_PAUSED_TITLE,
} from "@/lib/ordering-status";

/** Shown in place of the checkout form while ordering is paused. */
export function OrderingPausedNotice() {
  return (
    <div className="form-card ordering-paused-card" role="status">
      <div className="ordering-paused-icon" aria-hidden="true">
        🔒
      </div>
      <h3 className="form-title">{ORDERING_PAUSED_TITLE}</h3>
      <p className="form-subtitle">{ORDERING_PAUSED_MESSAGE}</p>
      <button type="button" className="form-submit" disabled>
        Online ordering paused
      </button>
    </div>
  );
}
