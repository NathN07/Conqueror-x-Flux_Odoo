/**
 * Payments Summary Module Stub
 * Note: Cross-module interface requirement specifies "none required".
 * This file serves as an empty placeholder for future payment aggregation contracts.
 */

export interface PaymentSummaryStub {
  totalPaid: string;
  totalPending: string;
}

export async function getPaymentSummaryStub(): Promise<PaymentSummaryStub> {
  return {
    totalPaid: '0.00',
    totalPending: '0.00',
  };
}
