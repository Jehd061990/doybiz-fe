export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'VOIDED' | 'REFUNDED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'GCASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface Sale {
  id?: string;
  _id?: string;
  branchId: string | { _id?: string; id?: string; name?: string; address?: string };
  customerId?: string | { _id?: string; id?: string; firstName?: string; lastName?: string; phone?: string };
  cashierId?: string | { _id?: string; id?: string; name?: string; email?: string };
  reservationId?: string;
  saleNumber: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id?: string;
  _id?: string;
  itemType: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  total: number;
  durationMinutes?: number;
}

export interface SalesListResponse {
  success: boolean;
  data: Sale[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export interface SaleDetailResponse {
  success: boolean;
  sale: Sale;
  items: SaleItem[];
}

export interface SalePayment {
  id?: string;
  _id?: string;
  amount: number;
  amountReceived: number;
  change: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  status: string;
  notes?: string;
  paidAt: string;
  receivedBy?: { name?: string; email?: string } | string;
}

export interface SalePaymentsResponse {
  success: boolean;
  payments: SalePayment[];
}

export interface SalePaymentResponse {
  success: boolean;
  payment: SalePayment;
  sale: Sale;
}

export interface VoidSaleResponse {
  success: boolean;
  sale: Sale;
}
