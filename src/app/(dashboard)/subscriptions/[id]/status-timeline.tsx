import { SubscriptionStatus } from "@prisma/client";
import { Check, PauseCircle, XCircle } from "lucide-react";

interface StatusTimelineProps {
  currentStatus: SubscriptionStatus;
}

const steps = [
  { key: SubscriptionStatus.DRAFT, label: "Draft" },
  { key: SubscriptionStatus.QUOTATION, label: "Quotation" },
  { key: SubscriptionStatus.CONFIRMED, label: "Confirmed" },
  { key: SubscriptionStatus.ACTIVE, label: "Active" },
  { key: SubscriptionStatus.CLOSED, label: "Closed" },
];

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const isPaused = currentStatus === SubscriptionStatus.PAUSED;

  const getStepIndex = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.DRAFT:
        return 0;
      case SubscriptionStatus.QUOTATION:
        return 1;
      case SubscriptionStatus.CONFIRMED:
        return 2;
      case SubscriptionStatus.ACTIVE:
      case SubscriptionStatus.PAUSED:
        return 3;
      case SubscriptionStatus.CLOSED:
        return 4;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Contract Lifecycle Progression
        </h3>
        {isPaused && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 animate-pulse">
            <PauseCircle className="h-3.5 w-3.5" />
            CURRENTLY PAUSED
          </div>
        )}
        {currentStatus === SubscriptionStatus.CLOSED && (
          <div className="flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            <XCircle className="h-3.5 w-3.5" />
            CLOSED
          </div>
        )}
      </div>

      <div className="relative flex items-center justify-between">
        {/* Background Connecting Line */}
        <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200" />

        {/* Active Progress Bar Line */}
        <div
          className="absolute left-6 top-1/2 h-0.5 -translate-y-1/2 bg-blue-600 transition-all duration-300"
          style={{
            width: `${(currentIndex / (steps.length - 1)) * 100}%`,
          }}
        />

        {steps.map((step, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center gap-2"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold text-xs transition-colors ${
                  isCurrent
                    ? isPaused
                      ? "border-amber-500 bg-amber-500 text-white shadow-md ring-4 ring-amber-100"
                      : currentStatus === SubscriptionStatus.CLOSED
                      ? "border-rose-600 bg-rose-600 text-white shadow-md ring-4 ring-rose-100"
                      : "border-blue-600 bg-blue-600 text-white shadow-md ring-4 ring-blue-100"
                    : isPassed
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-400"
                }`}
              >
                {isPassed ? <Check className="h-5 w-5" /> : idx + 1}
              </div>

              <span
                className={`text-xs font-medium ${
                  isCurrent
                    ? "font-bold text-slate-900"
                    : isPassed
                    ? "text-slate-700"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
