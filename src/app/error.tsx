"use client";

import { ErrorState } from "@/components/ui/states";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-24">
      <ErrorState message="Something went wrong while showing this page." onRetry={reset} />
    </div>
  );
}
