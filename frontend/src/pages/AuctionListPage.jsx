import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, LayoutList, LayoutGrid, AlertCircle } from 'lucide-react';
import { fetchRfqs } from '../api';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';

export default function AuctionListPage({ onSelectRfq }) {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'

  const loadData = async () => {
    try {
      setError(null);
      const data = await fetchRfqs();
      setRfqs(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch RFQs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const filteredRfqs = rfqs.filter((rfq) => {
    const matchesSearch =
      rfq.rfq_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rfq.title.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === 'ALL') return matchesSearch;
    if (filterStatus === 'ACTIVE') return matchesSearch && rfq.status === 'Active';
    if (filterStatus === 'CLOSED') return matchesSearch && (rfq.status === 'Closed' || rfq.status === 'Force Closed');
    return matchesSearch;
  });

  const activeCount = rfqs.filter((r) => r.status === 'Active').length;
  const inWindowCount = rfqs.filter((r) => r.status === 'Active' && r.is_in_trigger_window).length;
  const closedCount = rfqs.filter((r) => r.status === 'Closed' || r.status === 'Force Closed').length;
  const totalBids = rfqs.reduce((acc, r) => acc + (r.total_bids_count || 0), 0);

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
          Procurement Auctions
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.825rem', marginTop: '0.15rem' }}>
          British Auction RFQ monitoring, dynamic deadline extensions, and supplier price leaderboards
        </p>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Active Auctions</div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-subtext">Currently open for quotes</div>
        </div>

        <div className="kpi-card" style={{ borderColor: inWindowCount > 0 ? '#fde68a' : undefined, background: inWindowCount > 0 ? '#fffdf7' : undefined }}>
          <div className="kpi-label" style={{ color: inWindowCount > 0 ? '#b45309' : undefined }}>
            In Trigger Window
          </div>
          <div className="kpi-value" style={{ color: inWindowCount > 0 ? '#b45309' : undefined }}>
            {inWindowCount}
          </div>
          <div className="kpi-subtext">Qualifying bids extend deadline</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Quotes Submitted</div>
          <div className="kpi-value">{totalBids}</div>
          <div className="kpi-subtext">Across all active & closed RFQs</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">Concluded Auctions</div>
          <div className="kpi-value">{closedCount}</div>
          <div className="kpi-subtext">Normal close or forced cap reached</div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, View Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', maxWidth: '520px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.1rem' }}
              placeholder="Search by RFQ ID or Route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setFilterStatus('ALL')}
              style={{
                border: 'none',
                background: filterStatus === 'ALL' ? '#ffffff' : 'transparent',
                color: filterStatus === 'ALL' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: filterStatus === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              All ({rfqs.length})
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVE')}
              style={{
                border: 'none',
                background: filterStatus === 'ACTIVE' ? '#ffffff' : 'transparent',
                color: filterStatus === 'ACTIVE' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: filterStatus === 'ACTIVE' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('CLOSED')}
              style={{
                border: 'none',
                background: filterStatus === 'CLOSED' ? '#ffffff' : 'transparent',
                color: filterStatus === 'CLOSED' ? '#0f172a' : '#64748b',
                fontWeight: 600,
                fontSize: '0.75rem',
                padding: '0.35rem 0.65rem',
                borderRadius: '4px',
                cursor: 'pointer',
                boxShadow: filterStatus === 'CLOSED' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              Closed ({closedCount})
            </button>
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              style={{
                border: 'none',
                background: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#0f172a' : '#64748b',
                padding: '0.35rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <LayoutList size={15} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Cards View"
              style={{
                border: 'none',
                background: viewMode === 'grid' ? '#ffffff' : 'transparent',
                color: viewMode === 'grid' ? '#0f172a' : '#64748b',
                padding: '0.35rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <LayoutGrid size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.825rem',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredRfqs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            No auctions found matching your filter criteria.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW (Standard B2B Grid) */
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Reference</th>
                <th>RFQ Title / Scope</th>
                <th style={{ width: '170px' }}>Current Lowest (L1)</th>
                <th style={{ width: '130px' }}>Extension Rule</th>
                <th style={{ width: '120px' }}>Dynamic Close</th>
                <th style={{ width: '120px' }}>Hard Ceiling</th>
                <th style={{ width: '110px' }}>Time Left</th>
                <th style={{ width: '140px' }}>Status</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRfqs.map((rfq) => {
                const dynamicClose = new Date(rfq.current_bid_close_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const hardCeiling = new Date(rfq.forced_bid_close_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr
                    key={rfq.id}
                    onClick={() => onSelectRfq(rfq.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.775rem',
                          fontFamily: 'monospace',
                          color: '#0f172a',
                        }}
                      >
                        {rfq.rfq_number}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{rfq.title}</div>
                      <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                        Pickup: {new Date(rfq.pickup_service_date).toLocaleDateString()} &middot;{' '}
                        {rfq.total_bids_count} quote{rfq.total_bids_count === 1 ? '' : 's'}
                      </div>
                    </td>

                    <td>
                      {rfq.current_lowest_bid !== null ? (
                        <div>
                          <div style={{ fontWeight: 700, color: '#047857', fontSize: '0.9rem' }}>
                            ${rfq.current_lowest_bid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                            by {rfq.lowest_bidder_carrier}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.775rem' }}>No bids submitted</span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                        {rfq.trigger_window_minutes}m / +{rfq.extension_duration_minutes}m
                      </span>
                    </td>

                    <td style={{ fontSize: '0.8rem', fontWeight: 500 }}>{dynamicClose}</td>

                    <td style={{ fontSize: '0.8rem', fontWeight: 500, color: '#991b1b' }}>{hardCeiling}</td>

                    <td>
                      {rfq.status === 'Active' ? (
                        <CountdownTimer targetTime={rfq.current_bid_close_time} onExpire={loadData} />
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Ended</span>
                      )}
                    </td>

                    <td>
                      <StatusBadge status={rfq.status} isInTriggerWindow={rfq.is_in_trigger_window} />
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: '#2563eb',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        Open &rarr;
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
          {filteredRfqs.map((rfq) => {
            const dynamicClose = new Date(rfq.current_bid_close_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const hardCeiling = new Date(rfq.forced_bid_close_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={rfq.id}
                className="card"
                onClick={() => onSelectRfq(rfq.id)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'box-shadow 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}>
                      {rfq.rfq_number}
                    </span>
                    <StatusBadge status={rfq.status} isInTriggerWindow={rfq.is_in_trigger_window} />
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.75rem' }}>
                    {rfq.title}
                  </h3>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>
                      Lowest Bid (L1)
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 700, color: rfq.current_lowest_bid ? '#047857' : '#94a3b8' }}>
                        {rfq.current_lowest_bid !== null
                          ? `$${rfq.current_lowest_bid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                          : 'No Bids'}
                      </span>
                      {rfq.lowest_bidder_carrier && (
                        <span style={{ fontSize: '0.725rem', color: '#475569' }}>
                          by {rfq.lowest_bidder_carrier}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', color: '#475569' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Dynamic Close:</span>
                      <span style={{ fontWeight: 600 }}>{dynamicClose}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#991b1b' }}>Hard Ceiling:</span>
                      <span style={{ fontWeight: 600, color: '#991b1b' }}>{hardCeiling}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Time Left:</span>
                      {rfq.status === 'Active' ? (
                        <CountdownTimer targetTime={rfq.current_bid_close_time} onExpire={loadData} />
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Ended</span>
                      )}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: '0.75rem',
                  }}
                >
                  <span style={{ color: '#64748b' }}>{rfq.total_bids_count} quotes</span>
                  <span style={{ color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                    Open Details <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
