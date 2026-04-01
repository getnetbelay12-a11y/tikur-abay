'use client';

import { useRouter } from 'next/navigation';
import { useConsoleI18n } from '../lib/use-console-i18n';

export function DashboardStateActions({
  retryLabel,
  disabled = false,
  onRetry,
}: {
  retryLabel?: string;
  disabled?: boolean;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const { tx } = useConsoleI18n();
  const resolvedRetryLabel = retryLabel ?? tx('Retry');

  return (
    <div className="state-actions">
      <button
        className="btn"
        type="button"
        disabled={disabled}
        onClick={() => {
          if (onRetry) {
            onRetry();
            return;
          }
          router.refresh();
        }}
      >
        {resolvedRetryLabel}
      </button>
    </div>
  );
}
