import { useState, useEffect, useMemo } from 'react';
import { Fragment } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSessionToken } from '../services/auth';
import { CATEGORIES } from '../services/claude';

const PAGE_SIZE = 20;

const CATEGORY_COLORS = {
  'Groceries':              { bg: 'rgba(74, 222, 128, 0.15)',  color: '#4ade80' },
  'Fruit & Veg':            { bg: 'rgba(134, 239, 172, 0.15)', color: '#86efac' },
  'Meat & Seafood':         { bg: 'rgba(248, 113, 113, 0.15)', color: '#f87171' },
  'Deli & Bakery':          { bg: 'rgba(251, 191, 36, 0.15)',  color: '#fbbf24' },
  'Dairy & Eggs':           { bg: 'rgba(253, 230, 138, 0.15)', color: '#ca8a04' },
  'Frozen Foods':           { bg: 'rgba(147, 197, 253, 0.15)', color: '#93c5fd' },
  'Snacks & Confectionery': { bg: 'rgba(249, 168, 212, 0.15)', color: '#f9a8d4' },
  'Beverages':              { bg: 'rgba(103, 232, 249, 0.15)', color: '#67e8f9' },
  'Alcohol':                { bg: 'rgba(196, 181, 253, 0.15)', color: '#c4b5fd' },
  'Household & Cleaning':   { bg: 'rgba(165, 180, 252, 0.15)', color: '#a5b4fc' },
  'Health & Beauty':        { bg: 'rgba(240, 171, 252, 0.15)', color: '#f0abfc' },
  'Baby & Kids':            { bg: 'rgba(253, 186, 116, 0.15)', color: '#fdba74' },
  'Pet Supplies':           { bg: 'rgba(110, 231, 183, 0.15)', color: '#6ee7b7' },
  'Clothing':               { bg: 'rgba(216, 180, 254, 0.15)', color: '#d8b4fe' },
  'Electronics':            { bg: 'rgba(125, 211, 252, 0.15)', color: '#7dd3fc' },
  'Dining Out':             { bg: 'rgba(252, 165, 165, 0.15)', color: '#fca5a5' },
  'Fuel':                   { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8' },
  'Other':                  { bg: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' },
};

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

function CategoryBadge({ category }) {
  const colors = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
  return (
    <span className="category-badge" style={{ background: colors.bg, color: colors.color }}>
      {category || 'Other'}
    </span>
  );
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="sort-icon">↕</span>;
  return <span className="sort-icon sort-icon--active">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function MyReceiptsPage() {
  const { isOwner } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!isOwner) return;
    fetchReceipts();
  }, [isOwner, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchReceipts() {
    setLoading(true);
    setError(null);
    try {
      const token = getSessionToken();
      const params = dateRange !== 'all' ? `?range=${dateRange}` : '';
      const res = await fetch(`/api/receipts${params}`, {
        headers: { 'x-session-token': token },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to fetch receipts');
      }
      const { receipts: data } = await res.json();
      setReceipts(data || []);
      setPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteReceipt(id, merchant) {
    if (!confirm(`Delete receipt from "${merchant}"?\nThis cannot be undone.`)) return;
    try {
      const token = getSessionToken();
      const res = await fetch(`/api/receipts?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-session-token': token },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to delete receipt');
      }
      setReceipts(prev => prev.filter(r => r.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'merchant' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    let list = [...receipts];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => r.merchant?.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      list = list.filter(r =>
        r.receipt_items?.some(item => item.category === categoryFilter)
      );
    }
    list.sort((a, b) => {
      let av, bv;
      if (sortKey === 'date') {
        av = a.date || '';
        bv = b.date || '';
      } else if (sortKey === 'merchant') {
        av = (a.merchant || '').toLowerCase();
        bv = (b.merchant || '').toLowerCase();
      } else {
        av = Number(a.receipt_total || 0);
        bv = Number(b.receipt_total || 0);
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [receipts, search, categoryFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = useMemo(() => ({
    count: receipts.length,
    total: receipts.reduce((s, r) => s + Number(r.receipt_total || 0), 0),
    gst: receipts.reduce((s, r) => s + Number(r.total_gst || 0), 0),
  }), [receipts]);

  if (!isOwner) {
    return (
      <div className="my-receipts-page">
        <div className="owner-required card">
          <p>Owner login required to view saved receipts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-receipts-page">
      <h2>My Receipts</h2>

      {/* Summary cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Receipts</div>
          <div className="stat-value">{summary.count}</div>
          <div className="stat-sub">all time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">{formatCurrency(summary.total)}</div>
          <div className="stat-sub">all time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total GST</div>
          <div className="stat-value">{formatCurrency(summary.gst)}</div>
          <div className="stat-sub">all time</div>
        </div>
      </div>

      {/* Filters */}
      <div className="receipts-filters">
        <select
          className="filter-select"
          value={dateRange}
          onChange={e => { setDateRange(e.target.value); setPage(1); }}
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <input
          className="filter-search"
          type="text"
          placeholder="Search merchant..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="filter-select"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={fetchReceipts}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="receipts-loading">
          <div className="spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="receipts-empty card">
          {receipts.length === 0
            ? 'No receipts saved yet. Scan your first receipt to get started.'
            : 'No receipts match your current filters.'}
        </div>
      ) : (
        <>
          <div className="receipts-table-wrap">
            <table className="receipts-table">
              <thead>
                <tr>
                  <th
                    className="sortable"
                    onClick={() => handleSort('date')}
                  >
                    Date <SortIcon active={sortKey === 'date'} dir={sortDir} />
                  </th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('merchant')}
                  >
                    Merchant <SortIcon active={sortKey === 'merchant'} dir={sortDir} />
                  </th>
                  <th>Items</th>
                  <th
                    className="sortable"
                    onClick={() => handleSort('receipt_total')}
                  >
                    Total <SortIcon active={sortKey === 'receipt_total'} dir={sortDir} />
                  </th>
                  <th>GST</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(receipt => (
                  <Fragment key={receipt.id}>
                    <tr className={expandedId === receipt.id ? 'row-expanded' : ''}>
                      <td className="cell-date">{formatDate(receipt.date)}</td>
                      <td className="cell-merchant">{receipt.merchant}</td>
                      <td className="cell-num">{receipt.receipt_items?.length ?? 0}</td>
                      <td className="cell-num">{formatCurrency(receipt.receipt_total)}</td>
                      <td className="cell-num">{formatCurrency(receipt.total_gst)}</td>
                      <td className="cell-payment">{receipt.payment_method || '-'}</td>
                      <td className="cell-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            setExpandedId(expandedId === receipt.id ? null : receipt.id)
                          }
                        >
                          {expandedId === receipt.id ? 'Close' : 'View'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteReceipt(receipt.id, receipt.merchant)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedId === receipt.id && (
                      <tr className="row-detail">
                        <td colSpan={7}>
                          <div className="expanded-content">
                            <div className="items-detail-wrap">
                              <table className="items-detail-table">
                                <thead>
                                  <tr>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Total Price</th>
                                    <th>GST</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(receipt.receipt_items || []).map(item => (
                                    <tr key={item.id}>
                                      <td>{item.product_name}</td>
                                      <td>
                                        <CategoryBadge category={item.category} />
                                      </td>
                                      <td className="cell-num">{item.quantity}</td>
                                      <td className="cell-num">{formatCurrency(item.unit_price)}</td>
                                      <td className="cell-num">{formatCurrency(item.total_price)}</td>
                                      <td className="cell-num">{formatCurrency(item.gst)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className="expanded-totals">
                              <span>Items: <strong>{receipt.receipt_items?.length ?? 0}</strong></span>
                              <span>Receipt total: <strong>{formatCurrency(receipt.receipt_total)}</strong></span>
                              <span>Total GST: <strong>{formatCurrency(receipt.total_gst)}</strong></span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-secondary"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <button
                className="btn btn-secondary"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
