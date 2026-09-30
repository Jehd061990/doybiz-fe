'use client';

import { useMemo, useState } from 'react';
import { useCustom } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import type {
  CustomersSummaryReport,
  DailySalesRow,
  MonthlySalesRow,
  PaymentSummaryBucket,
  PaymentsByMethodRow,
  PaymentsSummaryReport,
  ReportKey,
  ReportResponse,
  ReservationsSummaryReport,
  SalesByBranchRow,
  SalesByCashierRow,
  SalesByServiceRow,
  SalesSummaryReport,
  TopServicesRow,
} from '@/types/reports';

const REPORTS: Array<{ key: ReportKey; label: string; financial?: boolean }> = [
  { key: 'sales-summary', label: 'Sales summary', financial: true },
  { key: 'daily-sales', label: 'Daily sales', financial: true },
  { key: 'monthly-sales', label: 'Monthly sales', financial: true },
  { key: 'sales-by-branch', label: 'Sales by branch', financial: true },
  { key: 'sales-by-service', label: 'Sales by service', financial: true },
  { key: 'sales-by-cashier', label: 'Sales by cashier', financial: true },
  { key: 'payments-by-method', label: 'Payments by method', financial: true },
  { key: 'payments-summary', label: 'Payment summary', financial: true },
  { key: 'reservations-summary', label: 'Reservations', financial: false },
  { key: 'customers-summary', label: 'Customers', financial: false },
  { key: 'top-services', label: 'Top services', financial: true },
];

const ENDPOINTS: Record<ReportKey, string> = {
  'sales-summary': '/reports/sales/summary',
  'daily-sales': '/reports/sales/daily',
  'monthly-sales': '/reports/sales/monthly',
  'sales-by-branch': '/reports/sales/by-branch',
  'sales-by-service': '/reports/sales/by-service',
  'sales-by-cashier': '/reports/sales/by-cashier',
  'payments-by-method': '/reports/payments/by-method',
  'payments-summary': '/reports/payments/summary',
  'reservations-summary': '/reports/reservations/summary',
  'customers-summary': '/reports/customers/summary',
  'top-services': '/reports/services/top',
};

const money = (value: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const errorMessage = (error: unknown) => {
  const value = error as { response?: { data?: { message?: string } }; message?: string } | undefined;
  return value?.response?.data?.message || value?.message || 'Unable to load the selected report.';
};

function ReportTable({ report, data }: { report: ReportKey; data: unknown }) {
  if (report === 'sales-summary') {
    const row = data as SalesSummaryReport;
    const cards = [
      ['Gross sales', money(row.grossSales)],
      ['Net sales', money(row.netSales)],
      ['Discounts', money(row.discounts)],
      ['Tax', money(row.tax)],
      ['Paid', money(row.amountPaid)],
      ['Outstanding', money(row.unpaidAmount)],
      ['Transactions', String(row.salesCount)],
      ['Average sale', money(row.averageSale)],
    ];
    return <div className="pos-sale-summary">{cards.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</div>;
  }

  if (report === 'payments-summary') {
    const row = data as PaymentsSummaryReport;
    const entries: Array<[string, PaymentSummaryBucket]> = [['Unpaid', row.UNPAID], ['Partially paid', row.PARTIALLY_PAID], ['Paid', row.PAID]];
    return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Status</th><th>Sales</th><th>Total</th><th>Paid</th><th>Outstanding</th></tr></thead><tbody>{entries.map(([label, bucket]) => <tr key={label}><td>{label}</td><td>{bucket.salesCount}</td><td>{money(bucket.totalAmount)}</td><td>{money(bucket.amountPaid)}</td><td>{money(bucket.outstandingAmount)}</td></tr>)}</tbody></table></div>;
  }

  if (report === 'reservations-summary') {
    const row = data as ReservationsSummaryReport;
    const entries = [['Pending', row.pending], ['Confirmed', row.confirmed], ['Checked in', row.checked_in], ['Completed', row.completed], ['Cancelled', row.cancelled], ['No show', row.no_show]];
    return <div className="pos-sale-summary">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</div>;
  }

  if (report === 'customers-summary') {
    const row = data as CustomersSummaryReport;
    const entries = [['Total customers', row.totalCustomers], ['Active', row.activeCustomers], ['Inactive', row.inactiveCustomers], ['New in range', row.newCustomers]];
    return <div className="pos-sale-summary">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</div>;
  }

  if (report === 'daily-sales') {
    const rows = data as DailySalesRow[];
    return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Date</th><th>Transactions</th><th>Total sales</th></tr></thead><tbody>{rows.map(row => <tr key={row.date}><td>{row.date}</td><td>{row.salesCount}</td><td>{money(row.totalSales)}</td></tr>)}</tbody></table></div>;
  }

  if (report === 'monthly-sales') {
    const rows = data as MonthlySalesRow[];
    return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Month</th><th>Transactions</th><th>Total sales</th></tr></thead><tbody>{rows.map(row => <tr key={row.month}><td>{row.month}</td><td>{row.salesCount}</td><td>{money(row.totalSales)}</td></tr>)}</tbody></table></div>;
  }

  if (report === 'sales-by-branch') {
    const rows = data as SalesByBranchRow[];
    return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Branch</th><th>Transactions</th><th>Total sales</th></tr></thead><tbody>{rows.map(row => <tr key={row.branchId}><td>{row.branchName}</td><td>{row.salesCount}</td><td>{money(row.totalSales)}</td></tr>)}</tbody></table></div>;
  }

  if (report === 'sales-by-service') {
    const rows = data as SalesByServiceRow[];
    return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Service</th><th>Quantity</th><th>Total sales</th></tr></thead><tbody>{rows.map((row, index) => <tr key={row.serviceId || `${row.serviceName}-${index}`}><td>{row.serviceName}</td><td>{row.quantity}</td><td>{money(row.totalSales)}</td></tr>)}</tbody></table></div>;
  }

  if (report === 'sales-by-cashier') {
    const rows = data as SalesByCashierRow[];
    return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Cashier</th><th>Transactions</th><th>Total sales</th></tr></thead><tbody>{rows.map(row => <tr key={row.cashierId}><td>{row.cashierName}</td><td>{row.salesCount}</td><td>{money(row.totalSales)}</td></tr>)}</tbody></table></div>;
  }

  if (report === 'payments-by-method') {
    const rows = data as PaymentsByMethodRow[];
    return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Payment method</th><th>Transactions</th><th>Total amount</th></tr></thead><tbody>{rows.map(row => <tr key={row.paymentMethod}><td>{row.paymentMethod}</td><td>{row.transactionCount}</td><td>{money(row.totalAmount)}</td></tr>)}</tbody></table></div>;
  }

  const rows = data as TopServicesRow[];
  return <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Service</th><th>Quantity</th><th>Revenue</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.serviceName}-${index}`}><td>{row.serviceName}</td><td>{row.quantity}</td><td>{money(row.revenue)}</td></tr>)}</tbody></table></div>;
}

export function ReportsPage() {
  const { session, isLoading: sessionLoading } = useAuthSession();
  const user = session.user;
  const branches = useBranches();
  const [report, setReport] = useState<ReportKey>('sales-summary');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [branchId, setBranchId] = useState('');
  const [limit, setLimit] = useState('10');

  const availableReports = useMemo(
    () => REPORTS.filter(item => !item.financial || user?.role === 'OWNER' || user?.role === 'MANAGER'),
    [user?.role],
  );

  const params = useMemo(() => {
    const query = new URLSearchParams();
    query.set('startDate', startDate);
    query.set('endDate', endDate);
    if (branchId) query.set('branchId', branchId);
    if (report === 'top-services') query.set('limit', limit);
    return query.toString();
  }, [branchId, endDate, limit, report, startDate]);

  const selectedEndpoint = ENDPOINTS[report];
  const reportQuery = useCustom<ReportResponse<unknown>>({
    url: `${selectedEndpoint}?${params}`,
    method: 'get',
    queryOptions: { enabled: Boolean(user) },
  });

  if (sessionLoading) return <p className="management-state" role="status">Loading session…</p>;
  if (!user) return null;

  return (
    <section className="management-page" aria-labelledby="reports-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">ANALYTICS · REPORTS</p>
          <h1 id="reports-heading">Reports</h1>
          <p className="management-description">Organization-scoped operational and financial reporting using the existing backend report contract.</p>
        </div>
      </header>

      <section className="management-filters" aria-label="Report filters">
        <label className="field-control"><span>Report</span><select value={report} onChange={e => setReport(e.currentTarget.value as ReportKey)}>{availableReports.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
        <label className="field-control"><span>Start date</span><input type="date" value={startDate} onChange={e => setStartDate(e.currentTarget.value)} /></label>
        <label className="field-control"><span>End date</span><input type="date" value={endDate} onChange={e => setEndDate(e.currentTarget.value)} /></label>
        <label className="field-control"><span>Branch</span><select value={branchId} onChange={e => setBranchId(e.currentTarget.value)}><option value="">All accessible branches</option>{branches.result.data.filter(branch => branch.status === 'ACTIVE').map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        {report === 'top-services' ? <label className="field-control"><span>Top services</span><select value={limit} onChange={e => setLimit(e.currentTarget.value)}>{['5','10','20','50','100'].map(value => <option key={value} value={value}>{value}</option>)}</select></label> : null}
      </section>

      <section className="pos-receipt" aria-labelledby="report-results-heading">
        <header className="management-page-header">
          <div><h2 id="report-results-heading">{REPORTS.find(item => item.key === report)?.label}</h2><p className="field-help">{startDate} to {endDate}{branchId ? ' · selected branch' : ' · all accessible branches'}</p></div>
        </header>
        {reportQuery.query.isLoading ? <p className="management-state" role="status">Loading report…</p> : null}
        {reportQuery.query.isError ? <p className="management-error" role="alert">{errorMessage(reportQuery.query.error)}</p> : null}
        {!reportQuery.query.isLoading && !reportQuery.query.isError && reportQuery.result.data ? <ReportTable report={report} data={reportQuery.result.data.data} /> : null}
      </section>
    </section>
  );
}
