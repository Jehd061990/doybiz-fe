export type ReportKey =
  | 'sales-summary'
  | 'daily-sales'
  | 'monthly-sales'
  | 'sales-by-branch'
  | 'sales-by-service'
  | 'sales-by-cashier'
  | 'payments-by-method'
  | 'payments-summary'
  | 'reservations-summary'
  | 'customers-summary'
  | 'top-services';

export interface ReportDateRange {
  startDate: string;
  endDate: string;
}

export interface SalesSummaryReport {
  grossSales: number;
  discounts: number;
  tax: number;
  netSales: number;
  amountPaid: number;
  unpaidAmount: number;
  salesCount: number;
  averageSale: number;
  dateRange: ReportDateRange;
}

export interface DailySalesRow {
  date: string;
  salesCount: number;
  totalSales: number;
}

export interface MonthlySalesRow {
  month: string;
  salesCount: number;
  totalSales: number;
}

export interface SalesByBranchRow {
  branchId: string;
  branchName: string;
  salesCount: number;
  totalSales: number;
}

export interface SalesByServiceRow {
  serviceId?: string;
  serviceName: string;
  quantity: number;
  totalSales: number;
}

export interface SalesByCashierRow {
  cashierId: string;
  cashierName: string;
  salesCount: number;
  totalSales: number;
}

export interface PaymentsByMethodRow {
  paymentMethod: string;
  transactionCount: number;
  totalAmount: number;
}

export interface PaymentSummaryBucket {
  salesCount: number;
  totalAmount: number;
  amountPaid: number;
  outstandingAmount: number;
}

export interface PaymentsSummaryReport {
  UNPAID: PaymentSummaryBucket;
  PARTIALLY_PAID: PaymentSummaryBucket;
  PAID: PaymentSummaryBucket;
  dateRange: ReportDateRange;
}

export interface ReservationsSummaryReport extends ReportDateRange {
  pending: number;
  confirmed: number;
  checked_in: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface CustomersSummaryReport {
  totalCustomers: number;
  activeCustomers: number;
  inactiveCustomers: number;
  newCustomers: number;
  dateRange: ReportDateRange;
}

export interface TopServicesRow {
  serviceName: string;
  quantity: number;
  revenue: number;
}

export interface ReportResponse<T> {
  success: boolean;
  data: T;
}
