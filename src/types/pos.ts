export interface PosService {
  id?: string;
  _id?: string;
  name: string;
  code?: string;
  category?: string;
  description?: string;
  price: number;
  durationMinutes: number;
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
  branchId?: string | { _id?: string; id?: string; name?: string } | null;
}

export interface PosServiceListResponse {
  id?: string;
  success: boolean;
  data: PosService[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateSaleItem {
  itemType: 'SERVICE';
  referenceId: string;
  quantity: number;
  discount: number;
}

export interface CreateSaleValues {
  branchId: string;
  items: CreateSaleItem[];
  discount?: number;
  tax?: number;
  notes?: string;
}

export type PosSaleStatus = 'DRAFT' | 'COMPLETED' | 'VOIDED' | 'REFUNDED';
export type PosSalePaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'REFUNDED';
export type PosPaymentMethod = 'CASH' | 'GCASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';
export type PosPaymentStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED';

export interface PosSale {
  id: string;
  _id?: string;
  saleNumber: string;
  branchId: string | { _id?: string; id?: string; name?: string };
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  change: number;
  paymentStatus: PosSalePaymentStatus;
  status: PosSaleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PosPayment {
  id?: string;
  _id?: string;
  amount: number;
  amountReceived: number;
  change: number;
  paymentMethod: PosPaymentMethod;
  referenceNumber?: string;
  status: PosPaymentStatus;
  notes?: string;
  paidAt: string;
}

export interface CreatePosPaymentValues {
  amount: number;
  paymentMethod: PosPaymentMethod;
  amountReceived?: number;
  referenceNumber?: string;
  notes?: string;
}

export interface PosReceipt {
  business: { name: string; email?: string; phone?: string; address?: string } | null;
  branch: { name: string; address?: string; contactNumber?: string } | null;
  sale: PosSale;
  cashier: { name: string; email?: string; role?: string } | null;
  customer: { firstName: string; lastName: string; phone?: string; email?: string } | null;
  items: Array<{
    name: string;
    itemType: 'SERVICE' | 'PRODUCT' | 'PACKAGE' | 'OTHER';
    quantity: number;
    unitPrice: number;
    discount: number;
    subtotal: number;
    total: number;
    durationMinutes?: number;
  }>;
  payments: PosPayment[];
}

export interface PosCreateSaleResponse {
  id?: string;
  success: boolean;
  sale: PosSale;
}

export interface PosPaymentResponse {
  id?: string;
  success: boolean;
  payment: PosPayment;
  sale: PosSale;
}