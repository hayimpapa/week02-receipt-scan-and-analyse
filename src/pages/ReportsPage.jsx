import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import { getSessionToken } from '../services/auth';
import { getApiBase } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const DATE_RANGES = [
  { label: 'MTD', value: 'mtd' },
  { label: 'YTD', value: 'ytd' },
  { label: '7 Days', value: '7d' },
  { label: '30 Days', value: '30d' },
  { label: '90 Days', value: '90d' },
  { label: 'All Time', value: 'all' },
];

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
  '#818cf8', '#7c3aed', '#5b21b6', '#4f46e5',
  '#4338ca', '#3730a3', '#6d28d9', '#7e22ce',
  '#9333ea', '#a855f7', '#c084fc', '#d8b4fe',
  '#e9d5ff', '#f3e8ff',
];

const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function ReportsPage() {
  const { isOwner } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(DATE_RANGES[0]);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    if (!isOwner) {
      setLoading(false);
      return;
    }

    const fetchReceipts = async () => {
      try {
        const token = getSessionToken();
        const response = await fetch(`${getApiBase()}/api/receipts?range=${selectedRange.value}`, {
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

      <div className="reports-controls">
        <div className="date-range-filter">
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              className={`btn btn-filter ${selectedRange.value === range.value ? 'active' : ''}`}
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

        <div className="chart-type-toggle">
          <button
            className={`btn btn-filter ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
            aria-label="Bar chart"
          >
            Bar
          </button>
          <button
            className={`btn btn-filter ${chartType === 'pie' ? 'active' : ''}`}
            onClick={() => setChartType('pie')}
            aria-label="Pie chart"
          >
            Pie
          </button>
        </div>
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

          {chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height={Math.max(300, stats.categoryData.length * 36)}>
              <BarChart data={stats.categoryData} layout="vertical" margin={{ left: 10, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#aaa', fontSize: 11 }} width={110} />
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
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <PieChart>
                <Pie
                  data={stats.categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  outerRadius="65%"
                  labelLine={false}
                  label={PieLabel}
                >
                  {stats.categoryData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`$${value.toFixed(2)}`, 'Spent']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#aaa', paddingTop: '8px' }}
                  formatter={(value) => <span style={{ color: '#ccc' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
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
