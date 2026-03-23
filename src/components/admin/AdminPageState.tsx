import React from "react";
import { AlertCircle } from "lucide-react";
import { RemquipLoadingScreen } from "@/components/RemquipLoadingScreen";

type StateLoadingProps = {
  message: string;
};

export function AdminPageLoading({ message }: StateLoadingProps) {
  return (
    <div className="min-h-[min(420px,72vh)] flex items-center justify-center">
      <RemquipLoadingScreen variant="embedded" message={message} />
    </div>
  );
}

type StateErrorProps = {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  extra?: React.ReactNode;
};

export function AdminPageError({ message, retryLabel = "Retry", onRetry, extra }: StateErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="font-display font-bold text-lg mb-2">Failed to load</h3>
      <p className="text-muted-foreground text-sm mb-4 max-w-md">{message}</p>
      {extra ? <div className="mb-2">{extra}</div> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

type StateEmptyProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function AdminPageEmpty({ title, description, action }: StateEmptyProps) {
  return (
    <div className="dashboard-card text-center">
      <h3 className="font-display font-bold text-lg">{title}</h3>
      {description ? <p className="text-muted-foreground text-sm mt-1">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

