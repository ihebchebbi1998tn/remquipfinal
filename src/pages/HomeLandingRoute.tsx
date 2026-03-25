import { useEffect, useState } from "react";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";

/** Minimum time the branded loader stays visible when opening `/` (chunk load + this delay run in parallel). */
const MIN_LANDING_LOAD_MS = 3000;

/**
 * Gates the public homepage: keeps the fullscreen REMQUIP loader for at least {@link MIN_LANDING_LOAD_MS}
 * while the lazy `HomePage` chunk loads in parallel.
 */
export default function HomeLandingRoute() {
  const [Page, setPage] = useState<React.ComponentType | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import("@/pages/HomePage"),
      new Promise<void>((resolve) => setTimeout(resolve, MIN_LANDING_LOAD_MS)),
    ])
      .then(([mod]) => {
        if (!cancelled) setPage(() => mod.default);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadFailed) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center text-muted-foreground">
        <p className="text-sm">We couldn&apos;t load the homepage. Check your connection and refresh the page.</p>
        <button
          type="button"
          className="text-sm font-medium text-accent underline"
          onClick={() => window.location.reload()}
        >
          Refresh
        </button>
      </div>
    );
  }

  if (!Page) {
    return <RemquipLoadingScreen variant="fullscreen" message="Loading" />;
  }

  return <Page />;
}
