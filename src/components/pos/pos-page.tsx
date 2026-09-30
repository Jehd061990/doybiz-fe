'use client';

import { useState, type FormEvent } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { hasModuleAccess } from '@/lib/auth/access';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getPosErrorMessage } from '@/lib/pos/errors';
import type { AuthUser } from '@/types/auth';
import type {
  CreatePosPaymentValues,
  CreateSaleValues,
  PosCreateSaleResponse,
  PosPaymentMethod,
  PosPaymentResponse,
  PosReceipt,
  PosSale,
  PosService,
  PosServiceListResponse,
} from '@/types/pos';

interface CartEntry {
  service: PosService;
  serviceId: string;
  quantity: number;
}

const paymentMethods: PosPaymentMethod[] = ['CASH', 'GCASH', 'CARD', 'BANK_TRANSFER', 'OTHER'];

const serviceId = (service: PosService) => service.id || service._id || '';

const serviceBranchName = (service: PosService) =>
  typeof service.branchId === 'object' && service.branchId !== null ? service.branchId.name : undefined;

const saleId = (sale: PosSale) => sale.id || sale._id || '';

const amountLabel = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

function SaleConfirmation({ sale }: { sale: PosSale }) {
  const id = saleId(sale);
  const receiptQuery = useCustom<{ id?: string; success: boolean; receipt: PosReceipt }>({
    url: `/sales/${encodeURIComponent(id || 'missing-sale')}/receipt`,
    method: 'get',
    queryOptions: { enabled: Boolean(id) },
  });
  const receipt = receiptQuery.result.data?.receipt;

  return (
    <section className="pos-completion" aria-labelledby="pos-completion-heading">
      <header className="pos-completion-header">
        <div>
          <p className="eyebrow">SALE CONFIRMED</p>
          <h2 id="pos-completion-heading">{sale.saleNumber}</h2>
          <p className="management-description">The backend created this sale. Payment status: <strong>{sale.paymentStatus}</strong>.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => receiptQuery.query.refetch()}>
          Refresh receipt
        </button>
      </header>

      <dl className="pos-sale-summary">
        <div><dt>Sale status</dt><dd>{sale.status}</dd></div>
        <div><dt>Payment status</dt><dd>{sale.paymentStatus}</dd></div>
        <div><dt>Subtotal</dt><dd>{amountLabel(sale.subtotal)}</dd></div>
        <div><dt>Discount</dt><dd>{amountLabel(sale.discount)}</dd></div>
        <div><dt>Tax</dt><dd>{amountLabel(sale.tax)}</dd></div>
        <div><dt>Total</dt><dd>{amountLabel(sale.total)}</dd></div>
        <div><dt>Amount paid</dt><dd>{amountLabel(sale.amountPaid)}</dd></div>
        <div><dt>Change</dt><dd>{amountLabel(sale.change)}</dd></div>
      </dl>

      {receiptQuery.query.isLoading ? <p className="management-state" role="status">Loading receipt details…</p> : null}
      {receiptQuery.query.isError ? <p className="management-error" role="alert">{getPosErrorMessage(receiptQuery.query.error, 'receipt')}</p> : null}
      {receipt ? (
        <section className="pos-receipt" aria-labelledby="receipt-heading">
          <div className="pos-receipt-header">
            <h3 id="receipt-heading">Receipt details</h3>
            <span>{receipt.business?.name || ''}</span>
          </div>
          <p>{receipt.branch?.name || ''}{receipt.branch?.address ? ` · ${receipt.branch.address}` : ''}</p>
          <p>Cashier: {receipt.cashier?.name || '—'} · {new Date(sale.createdAt).toLocaleString()}</p>
          <div className="user-table-scroll">
            <table className="user-table pos-receipt-table">
              <thead><tr><th scope="col">Service</th><th scope="col">Quantity</th><th scope="col">Unit price</th><th scope="col">Discount</th><th scope="col">Total</th></tr></thead>
              <tbody>
                {receipt.items.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td>{item.name}</td>
                    <td>{item.quantity}</td>
                    <td>{amountLabel(item.unitPrice)}</td>
                    <td>{amountLabel(item.discount)}</td>
                    <td>{amountLabel(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {receipt.payments.length ? (
            <div className="pos-payment-history">
              <h4>Recorded payments</h4>
              {receipt.payments.map((payment, index) => (
                <p key={payment.id || payment._id || index}>
                  {payment.paymentMethod}: {amountLabel(payment.amount)} · {payment.status}
                  {payment.change > 0 ? ` · Change ${amountLabel(payment.change)}` : ''}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function PosWorkspace({ user }: { user: AuthUser }) {
  const branchesQuery = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [servicePage, setServicePage] = useState(1);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [sale, setSale] = useState<PosSale | null>(null);
  const [saleError, setSaleError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const serviceUrl = selectedBranchId
    ? `/services?branchId=${encodeURIComponent(selectedBranchId)}&status=ACTIVE&page=${servicePage}&limit=100${serviceSearch.trim() ? `&search=${encodeURIComponent(serviceSearch.trim())}` : ''}${serviceCategory ? `&category=${encodeURIComponent(serviceCategory)}` : ''}`
    : '/services';
  const servicesQuery = useCustom<PosServiceListResponse>({
    url: serviceUrl,
    method: 'get',
    queryOptions: { enabled: Boolean(selectedBranchId && !sale) },
  });
  const createSaleMutation = useCustomMutation<PosCreateSaleResponse, HttpError, CreateSaleValues>({
    mutationOptions: { gcTime: 0 },
  });
  const paymentMutation = useCustomMutation<PosPaymentResponse, HttpError, CreatePosPaymentValues>({
    mutationOptions: { gcTime: 0 },
  });
  const serviceCategories = Array.from(new Set((servicesQuery.result.data?.data || []).map(service => service.category).filter(Boolean) as string[])).sort();

  if (branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading available branches…</p>;
  }
  if (branchesQuery.query.isError) {
    return <p className="management-error" role="alert">{getPosErrorMessage(branchesQuery.query.error, 'catalog')}</p>;
  }

  const activeBranches = branchesQuery.result.data.filter(branch => branch.status === 'ACTIVE');
  const catalog = servicesQuery.result.data?.data || [];
  const pagination = servicesQuery.result.data?.pagination;
  const canChangeBranch = cart.length === 0;

  function changeBranch(nextBranchId: string) {
    setSelectedBranchId(nextBranchId);
    setServicePage(1);
    setCart([]);
  }

  function addService(service: PosService) {
    const id = serviceId(service);
    if (!id) return;
    setCart(current => {
      const existing = current.find(item => item.serviceId === id);
      return existing
        ? current.map(item => item.serviceId === id ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { service, serviceId: id, quantity: 1 }];
    });
  }

  function setQuantity(id: string, quantity: number) {
    if (quantity < 1) {
      setCart(current => current.filter(item => item.serviceId !== id));
      return;
    }
    setCart(current => current.map(item => item.serviceId === id ? { ...item, quantity } : item));
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaleError(null);
    if (!selectedBranchId || cart.length === 0) {
      setSaleError('Choose an active branch and add at least one service.');
      return;
    }
    try {
      const values: CreateSaleValues = {
        branchId: selectedBranchId,
        items: cart.map(item => ({
          itemType: 'SERVICE',
          referenceId: item.serviceId,
          quantity: item.quantity,
          discount: 0,
        })),
      };
      const response = await createSaleMutation.mutateAsync({ url: '/sales', method: 'post', values });
      const createdSale = response.data.sale;
      setSale(createdSale);
      setCart([]);
      setPaymentAmount(String(createdSale.total));
      setAmountReceived('');
    } catch (error) {
      setSaleError(getPosErrorMessage(error, 'sale'));
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPaymentError(null);
    setPaymentSuccess(null);
    if (!sale) return;
    const amount = Number(paymentAmount);
    const received = Number(amountReceived);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Enter a payment amount greater than zero.');
      return;
    }
    if (paymentMethod === 'CASH' && (!Number.isFinite(received) || received < amount)) {
      setPaymentError('Cash received must cover the payment amount.');
      return;
    }

    try {
      const values: CreatePosPaymentValues = {
        amount,
        paymentMethod,
        ...(paymentMethod === 'CASH' ? { amountReceived: received } : {}),
        ...(paymentReference.trim() ? { referenceNumber: paymentReference.trim() } : {}),
        ...(paymentNotes.trim() ? { notes: paymentNotes.trim() } : {}),
      };
      const response = await paymentMutation.mutateAsync({
        url: `/sales/${encodeURIComponent(saleId(sale))}/payments`,
        method: 'post',
        values,
      });
      setSale(response.data.sale);
      setPaymentSuccess(response.data.payment.change > 0
        ? `Payment recorded. Change due: ${amountLabel(response.data.payment.change)}.`
        : 'Payment recorded by the backend.');
      setPaymentAmount('');
      setAmountReceived('');
      setPaymentReference('');
      setPaymentNotes('');
      await servicesQuery.query.refetch();
    } catch (error) {
      setPaymentError(getPosErrorMessage(error, 'payment'));
    }
  }

  return (
    <section className="management-page pos-page" aria-labelledby="pos-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">OPERATIONS · POS</p>
          <h1 id="pos-heading">Point of sale</h1>
          <p className="management-description">Select a branch and add active services. Sale totals and payment results are confirmed by the backend.</p>
        </div>
      </header>

      {sale ? (
        <div className="pos-completed-flow">
          <SaleConfirmation sale={sale} />
          {sale.paymentStatus !== 'PAID' && sale.status === 'COMPLETED' ? (
            <section className="pos-payment-panel" aria-labelledby="pos-payment-heading">
              <h2 id="pos-payment-heading">Record payment</h2>
              <p className="field-help">The backend accepts partial payments and determines payment status and cash change.</p>
              <form className="pos-payment-form" onSubmit={recordPayment}>
                <label className="field-control">
                  <span>Amount</span>
                  <input type="number" min="0.01" step="0.01" required value={paymentAmount} onChange={event => setPaymentAmount(event.currentTarget.value)} />
                </label>
                <label className="field-control">
                  <span>Payment method</span>
                  <select value={paymentMethod} onChange={event => setPaymentMethod(event.currentTarget.value as PosPaymentMethod)}>
                    {paymentMethods.map(method => <option key={method} value={method}>{method.replace('_', ' ')}</option>)}
                  </select>
                </label>
                {paymentMethod === 'CASH' ? (
                  <label className="field-control">
                    <span>Cash received</span>
                    <input type="number" min="0.01" step="0.01" required value={amountReceived} onChange={event => setAmountReceived(event.currentTarget.value)} />
                  </label>
                ) : null}
                <label className="field-control">
                  <span>Reference number <small>(optional)</small></span>
                  <input type="text" value={paymentReference} onChange={event => setPaymentReference(event.currentTarget.value)} />
                </label>
                <label className="field-control">
                  <span>Payment notes <small>(optional)</small></span>
                  <input type="text" value={paymentNotes} onChange={event => setPaymentNotes(event.currentTarget.value)} />
                </label>
                {paymentError ? <p className="management-error" role="alert">{paymentError}</p> : null}
                {paymentSuccess ? <p className="management-success" role="status">{paymentSuccess}</p> : null}
                <button className="primary-button" type="submit" disabled={paymentMutation.mutation.isPending}>
                  {paymentMutation.mutation.isPending ? 'Recording payment…' : 'Record payment'}
                </button>
              </form>
            </section>
          ) : null}
          <button className="secondary-button pos-new-sale" type="button" onClick={() => {
            setSale(null);
            setPaymentSuccess(null);
            setPaymentError(null);
          }}>Start another sale</button>
        </div>
      ) : (
        <div className="pos-workspace">
          <div className="pos-catalog-column">
            <section className="pos-branch-panel" aria-labelledby="pos-branch-heading">
              <h2 id="pos-branch-heading">Branch</h2>
              <label className="field-control compact-field">
                <span>Sale branch</span>
                <select value={selectedBranchId} onChange={event => changeBranch(event.currentTarget.value)} disabled={!canChangeBranch}>
                  <option value="">Select an active branch</option>
                  {activeBranches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              {!canChangeBranch ? <p className="field-help">Clear the cart before changing branch.</p> : null}

              {!activeBranches.length ? <p className="billing-empty-note">No active branches are available to your account.</p> : null}
            </section>

            {selectedBranchId ? (
              <section className="pos-service-panel" aria-labelledby="pos-services-heading">
                <div className="pos-service-heading">
                  <div>
                    <h2 id="pos-services-heading">Services</h2>
                    <p className="field-help">Select a service card to add it to the current sale.</p>
                  </div>
                  <div className="pos-service-filters">
                    <label className="field-control"><span>Search</span><input value={serviceSearch} onChange={event => { setServiceSearch(event.currentTarget.value); setServicePage(1); }} placeholder="Search services…" /></label>
                    <label className="field-control"><span>Category</span><select value={serviceCategory} onChange={event => { setServiceCategory(event.currentTarget.value); setServicePage(1); }}><option value="">All categories</option>{serviceCategories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
                  </div>
                </div>
                {servicesQuery.query.isLoading ? <p className="management-state" role="status">Loading branch services…</p> : null}
                {servicesQuery.query.isError ? <p className="management-error" role="alert">{getPosErrorMessage(servicesQuery.query.error, 'catalog')}</p> : null}
                {!servicesQuery.query.isLoading && !servicesQuery.query.isError && catalog.length === 0 ? (
                  <p className="billing-empty-note">No active services are available at this branch.</p>
                ) : null}
                {catalog.length ? (
                  <div className="pos-service-grid">
                    {catalog.map((service, index) => {
                      const id = serviceId(service);
                      const existing = cart.find(item => item.serviceId === id);
                      return (
                        <article className="pos-service-card" key={id || service.name} onClick={() => id && addService(service)}>
                          <div className="pos-service-card-image">{service.imageUrl ? <img src={service.imageUrl} alt="" loading="lazy" /> : <div className="service-image-placeholder">No image</div>}</div>
                          <div className="pos-service-card-body">
                            <div className="service-card-meta"><span>{service.category || 'Service'}</span>{serviceBranchName(service) ? <span>{serviceBranchName(service)}</span> : null}</div>
                            <h3>{service.name}</h3>
                            {service.description ? <p>{service.description}</p> : null}
                            <div className="pos-service-card-footer"><strong>{amountLabel(service.price)}</strong><span>{service.durationMinutes} min</span></div>
                            <button className="secondary-button" type="button" onClick={event => { event.stopPropagation(); addService(service); }} disabled={!id}>
                              {existing ? `Add another (${existing.quantity})` : 'Add service'}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
                {pagination && pagination.totalPages > 1 ? (
                  <div className="pos-pagination" aria-label="Service pages">
                    <button className="secondary-button" type="button" disabled={servicePage <= 1} onClick={() => setServicePage(page => page - 1)}>Previous</button>
                    <span>Page {pagination.page} of {pagination.totalPages}</span>
                    <button className="secondary-button" type="button" disabled={servicePage >= pagination.totalPages} onClick={() => setServicePage(page => page + 1)}>Next</button>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>

          <aside className="pos-cart-panel" aria-labelledby="pos-cart-heading">
            <div className="pos-cart-header">
              <h2 id="pos-cart-heading">Current sale</h2>
              {cart.length ? <span>{cart.length} service{cart.length === 1 ? '' : 's'}</span> : null}
            </div>
            {!cart.length ? <p className="billing-empty-note">No services added.</p> : null}
            {cart.length ? (
              <div className="pos-cart-items">
                {cart.map(item => (
                  <article className="pos-cart-item" key={item.serviceId}>
                    <div>
                      <strong>{item.service.name}</strong>
                      <small>{amountLabel(item.service.price)} each</small>
                    </div>
                    <div className="pos-quantity-control" aria-label={`${item.service.name} quantity`}>
                      <button type="button" aria-label={`Decrease ${item.service.name} quantity`} onClick={() => setQuantity(item.serviceId, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button type="button" aria-label={`Increase ${item.service.name} quantity`} onClick={() => setQuantity(item.serviceId, item.quantity + 1)}>+</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {cart.length ? <p className="field-help">The backend calculates the confirmed sale totals at checkout.</p> : null}
            {saleError ? <p className="management-error" role="alert">{saleError}</p> : null}
            <form onSubmit={checkout}>
              <button className="primary-button pos-checkout-button" type="submit" disabled={!selectedBranchId || !cart.length || createSaleMutation.mutation.isPending}>
                {createSaleMutation.mutation.isPending ? 'Creating sale…' : 'Create sale'}
              </button>
            </form>
            {cart.length ? (
              <button className="text-button pos-clear-cart" type="button" onClick={() => setCart([])}>Clear cart</button>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  );
}

export function PosPage() {
  const { session, isLoading, error } = useAuthSession();
  if (isLoading) return <p className="management-state" role="status">Checking POS access…</p>;
  if (error || !session.authenticated || !session.user) {
    return <p className="management-error" role="alert">Your session could not be verified. Sign in again.</p>;
  }
  if (session.user.role === 'PLATFORM_ADMIN') {
    return <p className="management-error" role="alert">POS is available only inside a tenant organization.</p>;
  }
  if (!hasModuleAccess(session.user, 'POS')) {
    return (
      <section className="management-state" role="alert">
        <h1>You don&apos;t have access to this module.</h1>
        <p>Please contact your organization administrator if you need access.</p>
      </section>
    );
  }
  return <PosWorkspace user={session.user} />;
}