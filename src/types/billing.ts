export type BillingType = 'SETUP' | 'SUBSCRIPTION' | 'ADJUSTMENT';
export type BillingRecordStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'VOID';
export type BillingPaymentStatus = 'PENDING' | 'COMPLETED' | 'VOIDED' | 'REFUNDED';
export type BillingPaymentMethod = 'CASH' | 'GCASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
export type XenditPaymentStatus =
  | 'ACCEPTING_PAYMENTS'
  | 'REQUIRES_ACTION'
  | 'AUTHORIZED'
  | 'CANCELED'
  | 'EXPIRED'
  | 'SUCCEEDED'
  | 'FAILED';

export interface BillingPlanSummary {
  id: string;
  name: string;
  code: string;
  currency: string;
  billingInterval: 'MONTHLY';
}

export interface BillingEstimate {
  plan: BillingPlanSummary;
  setupFee: number;
  activeOrganizationUsers: number;
  includedUserSeats: number;
  additionalUserCount: number;
  monthlyBranchCharges: number;
  additionalUserCharges: number;
  monthlyTotal: number;
  currency: string;
  breakdown: Array<{
    branchId: string;
    branchName: string;
    branchCharge: number;
  }>;
  additionalUserDetails: Array<{
    userId: string;
    monthlyUnitPrice: number;
    proratedAmount: number;
    effectiveDate: string;
    endDate?: string;
  }>;
}

export interface BillingLineItem {
  description: string;
  branchId?: string;
  targetType?: 'BRANCH' | 'USER';
  targetId?: string;
  userId?: string;
  activeUsers?: number;
  includedUsers?: number;
  additionalUsers?: number;
  daysCharged?: number;
  totalBillingDays?: number;
  monthlyUnitPrice?: number;
  proratedAmount?: number;
  effectiveDate?: string;
  endDate?: string;
  isProrated?: boolean;
  prorationMethod?: string;
  paymentTermMonths?: number;
  branchCharge: number;
  additionalUserCharge: number;
  amount: number;
}

export interface BillingRecord {
  id: string;
  _id?: string;
  invoiceNumber: string;
  billingType: BillingType;
  paymentTermMonths?: number;
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  setupFee: number;
  branchCharges: number;
  additionalUserCharges: number;
  lineItems: BillingLineItem[];
  totalAmount: number;
  currency: string;
  status: BillingRecordStatus;
  dueDate: string;
  paidAt?: string;
  coverageStart?: string;
  coverageEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPayment {
  id?: string;
  _id?: string;
  amount: number;
  paymentMethod: BillingPaymentMethod;
  referenceNumber?: string;
  status: BillingPaymentStatus;
  providerName?: 'XENDIT';
  providerPaymentRequestId?: string;
  providerReferenceId?: string;
  providerStatus?: string;
  paidAt: string;
  createdAt?: string;
}

export interface BillingRecordDetail extends BillingRecord {
  payments: BillingPayment[];
  paidAmount: number;
  outstandingAmount: number;
}

export interface OrganizationSubscription {
  status: SubscriptionStatus;
  paymentTermMonths: 1 | 3 | 6 | 12;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  setupFeeStatus: 'PENDING' | 'PAID' | 'WAIVED';
  setupFeePaidAt?: string;
  planId?: BillingPlanSummary | string;
}

export interface CreatePrepaidAdjustmentValues {
  userIds: string[];
  branchIds: string[];
}

export interface XenditAction {
  name?: string;
  url?: string;
  method?: string;
}

export interface XenditPaymentInitiation {
  record: BillingRecord;
  payment: BillingPayment;
  xenditPayment: {
    id: string;
    status: XenditPaymentStatus;
    reference_id: string;
    amount: number;
    currency: string;
    actions: XenditAction[];
  };
}