import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { getSessionToken } from '../services/auth';
import { useAuth } from '../contexts/AuthContext';

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time', value: 'all' },
];

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#7c3aed', '#5b21b6', '#4f46e5',
  '#4338ca', '#3730a3', '#6d28d9', '#7e22ce',
  '#9333ea', '#a855f7', '#c084fc', '#d8b4fe',
  '#e9d5ff', '#f3e8ff',
];

export default function ReportsPage() {
  const { isOwner } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(DATE_RANGES[1]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }

    const fetchReceipts = async () => {
      try {
        const token = getSessionToken();
        const response = await fetch(`/api/receipts?range=${selectedRange.value}`, {
          headers: {
            'x-session-token': token,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to fetch receipts (${response.status})`);
        }

        const data = await response.json();
        setReceipts(data.receipts || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReceipts();
  }, [isOwner, selectedRange]);

  const stats = useMemo(() => {
    const totalSpent = receipts.reduce(
      (sum, r) => sum + (parseFloat(r.receipt_total) || 0),
      0
    );

    const categoryTotals = {};
    receipts.forEach((r) => {
      (r.receipt_items || []).forEach((item) => {
        const cat = item.category || 'Other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + (parseFloat(item.total_price) || 0);
      });
    });

    const topCategory = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      totalSpent: totalSpent.toFixed(2),
      receiptCount: receipts.length,
      topCategory: topCategory ? topCategory[0] : 'N/A',
      topCategoryAmount: topCategory ? topCategory[1].toFixed(2) : '0.00',
      categoryData: Object.entries(categoryTotals)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value),
    };
  }, [receipts]);

  if (!isOwner) {
    return (
      <div className="reports-page">
        <h2>Reports</h2>
        <div className="config-notice">
          <p>
            Owner login required to view reports.
            Click the lock icon in the top-right corner to log in.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="reports-page">
        <h2>Reports</h2>
        <div className="spinner" />
        <p>Loading reports...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-page">
        <h2>Reports</h2>
        <div className="error-banner"><p>{error}</p></div>
      </div>
    );
  }

  return (
    <div className="reports-page">
      <h2>Reports</h2>

      <div className="date-range-filter">
        {DATE_RANGES.map((range) => (
          <button
            key={range.label}
            className={`btn btn-filter ${selectedRange.label === range.label ? 'active' : ''}`}
            onClick={() => {
              setSelectedRange(range);
              setLoading(true);
              setError(null);
            }}
          >
            {range.label}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Spent</span>
          <span className="stat-value">${stats.totalSpent}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Receipts Scanned</span>
          <span className="stat-value">{stats.receiptCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Top Category</span>
          <span className="stat-value">{stats.topCategory}</span>
          <span className="stat-sub">${stats.topCategoryAmount}</span>
        </div>
      </div>

      {stats.categoryData.length > 0 ? (
        <div className="card chart-card">
          <h3>Spending by Category</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.categoryData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" tick={{ fill: '#aaa' }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 12 }} width={130} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`$${value.toFixed(2)}`, 'Spent']}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {stats.categoryData.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card">
          <p style={{ textAlign: 'center', color: '#888' }}>
            No receipt data for this period. Scan some receipts to see reports!
          </p>
        </div>
      )}
    </div>
  );
}
