import c from "@/components/admin/credits.module.css";

/** Shown while an admin page loads. */
export default function Loading() {
  return (
    <div className={c.loading} role="status" aria-label="Loading">
      <span className={c.loadingText}>SL Admin · by Chaitanya</span>
    </div>
  );
}
