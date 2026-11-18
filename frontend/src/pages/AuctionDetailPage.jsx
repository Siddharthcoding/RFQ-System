import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Info, Award, History, Clock } from 'lucide-react';
import { fetchRfqDetails, submitBid } from '../api';
import StatusBadge from '../components/StatusBadge';
import CountdownTimer from '../components/CountdownTimer';

export default function AuctionDetailPage({ rfqId, onBack }) {
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [activeTab, setActiveTab] = useState('bids'); // 'bids' or 'audit'

  // Quote form state
  const tomorrow = new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 10);
  const [bidForm, setBidForm] = useState({
    carrier_name: '',
    freight_charges: '',
    origin_charges: '',
    destination_charges: '',
    transit_time: '2 Business Days',
    validity_of_quote: tomorrow,
    simulate_trigger_window: false,
  });

  const loadDetails = async () => {
    try {
      setError(null);
      const data = await fetchRfqDetails(rfqId);
      setRfq(data);
    } catch (err) {
      setError(err.message || 'Failed to load auction details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
    const interval = setInterval(loadDetails, 3500);
    return () => clearInterval(interval);
  }, [rfqId]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setBidForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const calculateTotalQuote = () => {
    const f = parseFloat(bidForm.freight_charges) || 0;
    const o = parseFloat(bidForm.origin_charges) || 0;
    const d = parseFloat(bidForm.destination_charges) || 0;
    return (f + o + d).toFixed(2);
  };

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const f = parseFloat(bidForm.freight_charges);
    const o = parseFloat(bidForm.origin_charges);
    const d = parseFloat(bidForm.destination_charges);

    if (isNaN(f) || isNaN(o) || isNaN(d) || f < 0 || o < 0 || d < 0) {
      setActionError('Please enter valid, non-negative amounts for all charges.');
      return;
    }

    try {
      setSubmitting(true);

      // If user enabled simulation, timestamp bid 1 minute prior to close (safely within trigger window)
      let simulatedTime = null;
      if (bidForm.simulate_trigger_window && rfq) {
        const closeDate = new Date(rfq.current_bid_close_time);
        simulatedTime = new Date(closeDate.getTime() - 60000).toISOString();
      }

      const res = await submitBid(
        rfqId,
        {
          carrier_name: bidForm.carrier_name,
          freight_charges: f,
          origin_charges: o,
          destination_charges: d,
          transit_time: bidForm.transit_time,
          validity_of_quote: new Date(bidForm.validity_of_quote).toISOString(),
        },
        simulatedTime
      );

      setActionSuccess(`Quote submitted successfully. Assigned Rank: ${res.rank}`);
      setBidForm((prev) => ({
        ...prev,
        carrier_name: '',
        freight_charges: '',
        origin_charges: '',
        destination_charges: '',
      }));
      await loadDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !rfq) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading auction parameters...</div>;
  }

  if (error || !rfq) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={14} /> Back to Auctions
        </button>
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '6px', border: '1px solid #fecaca' }}>
          {error || 'RFQ not found'}
        </div>
      </div>
    );
  }

  const triggerRuleLabels = {
    ANY_BID: 'Any Bid Received in Last X Minutes',
    ANY_RANK_CHANGE: 'Any Supplier Rank Change in Last X Minutes',
    L1_RANK_CHANGE: 'Lowest Bidder (L1) Rank Change in Last X Minutes',
  };

  const isAuctionClosed = rfq.status === 'Closed' || rfq.status === 'Force Closed';

  const dynamicCloseFormatted = new Date(rfq.current_bid_close_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const forcedCloseFormatted = new Date(rfq.forced_bid_close_time).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div>
      {/* Breadcrumb Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
        >
          <ArrowLeft size={14} /> Auctions
        </button>
        <span style={{ color: '#cbd5e1' }}>/</span>
        <span style={{ color: '#0f172a', fontWeight: 600, fontFamily: 'monospace' }}>{rfq.rfq_number}</span>
      </div>

      {/* Header Banner */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                {rfq.rfq_number}
              </span>
              <StatusBadge status={rfq.status} isInTriggerWindow={rfq.is_in_trigger_window} />
            </div>

            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
              {rfq.title}
            </h1>

            <div style={{ fontSize: '0.775rem', color: '#64748b', marginTop: '0.35rem' }}>
              Pickup / Service Date: <strong>{new Date(rfq.pickup_service_date).toLocaleDateString()}</strong> &middot;{' '}
              Trigger Window: <strong>Last {rfq.trigger_window_minutes} mins</strong> &middot;{' '}
              Extension: <strong>+{rfq.extension_duration_minutes} mins</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.725rem', color: '#64748b', marginBottom: '0.3rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Time Remaining
            </div>
            {isAuctionClosed ? (
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#991b1b', background: '#fef2f2', padding: '0.2rem 0.6rem', borderRadius: '4px', border: '1px solid #fecaca' }}>
                Auction {rfq.status}
              </span>
            ) : (
              <CountdownTimer targetTime={rfq.current_bid_close_time} onExpire={loadDetails} />
            )}
          </div>
        </div>

        {/* 4-KPI Metric Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f1f5f9',
          }}
        >
          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Current Lowest Quote (L1)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: rfq.current_lowest_bid ? '#047857' : '#94a3b8', marginTop: '0.15rem' }}>
              {rfq.current_lowest_bid !== null
                ? `$${rfq.current_lowest_bid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                : 'No Quotes'}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
              {rfq.lowest_bidder_carrier ? `Leader: ${rfq.lowest_bidder_carrier}` : 'Awaiting first bid'}
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Dynamic Close Time
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
              {dynamicCloseFormatted}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
              Extends if triggered in last {rfq.trigger_window_minutes}m
            </div>
          </div>

          <div style={{ background: '#fff5f5', padding: '0.75rem', borderRadius: '6px', border: '1px solid #fed7d7' }}>
            <div style={{ fontSize: '0.7rem', color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Hard Deadline (Forced Cap)
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#991b1b', marginTop: '0.15rem' }}>
              {forcedCloseFormatted}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#991b1b' }}>
              Absolute ceiling; zero extensions past this
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Quotes Submitted
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '0.15rem' }}>
              {rfq.bids.length}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
              {rfq.activity_logs.filter((l) => l.event_type === 'TIME_EXTENSION').length} extensions granted
            </div>
          </div>
        </div>
      </div>

      {/* British Auction Rule Explanation Callout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          padding: '0.65rem 1rem',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          marginBottom: '1.25rem',
          fontSize: '0.8rem',
          color: '#475569',
        }}
      >
        <Info size={15} style={{ flexShrink: 0, color: '#2563eb' }} />
        <span>
          <strong>Rule in effect:</strong> {triggerRuleLabels[rfq.extension_trigger_type]}. If triggered within the last{' '}
          {rfq.trigger_window_minutes} minutes, bidding extends by +{rfq.extension_duration_minutes} minutes, capped at{' '}
          {forcedCloseFormatted}.
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('bids')}
          className="btn"
          style={{
            background: activeTab === 'bids' ? '#0f172a' : 'transparent',
            color: activeTab === 'bids' ? '#ffffff' : '#64748b',
            border: 'none',
            fontSize: '0.8rem',
            padding: '0.4rem 0.85rem',
          }}
        >
          <Award size={14} /> Quotes & Leaderboard ({rfq.bids.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className="btn"
          style={{
            background: activeTab === 'audit' ? '#0f172a' : 'transparent',
            color: activeTab === 'audit' ? '#ffffff' : '#64748b',
            border: 'none',
            fontSize: '0.8rem',
            padding: '0.4rem 0.85rem',
          }}
        >
          <History size={14} /> Audit Trail & Extensions ({rfq.activity_logs.length})
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'bids' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 380px) 1fr', gap: '1.25rem', alignItems: 'start' }}>
          {/* Quote Submission Form */}
          <div className="card">
            <div className="card-header-clean">
              <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0f172a' }}>Submit Carrier Quote</h3>
              {isAuctionClosed && (
                <span style={{ fontSize: '0.7rem', color: '#991b1b', fontWeight: 600 }}>Closed</span>
              )}
            </div>

            {actionSuccess && (
              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  color: '#065f46',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.775rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  border: '1px solid #a7f3d0',
                }}
              >
                <CheckCircle2 size={14} />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  padding: '0.6rem 0.85rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.775rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  border: '1px solid #fecaca',
                }}
              >
                <AlertCircle size={14} />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleBidSubmit}>
              <div className="form-group">
                <label className="form-label">Carrier / Supplier Name</label>
                <input
                  type="text"
                  name="carrier_name"
                  placeholder="e.g. Apex Freight Lines"
                  className="form-control"
                  value={bidForm.carrier_name}
                  onChange={handleInputChange}
                  disabled={isAuctionClosed || submitting}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Freight ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="freight_charges"
                    placeholder="0.00"
                    className="form-control"
                    value={bidForm.freight_charges}
                    onChange={handleInputChange}
                    disabled={isAuctionClosed || submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Origin ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="origin_charges"
                    placeholder="0.00"
                    className="form-control"
                    value={bidForm.origin_charges}
                    onChange={handleInputChange}
                    disabled={isAuctionClosed || submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dest. ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="destination_charges"
                    placeholder="0.00"
                    className="form-control"
                    value={bidForm.destination_charges}
                    onChange={handleInputChange}
                    disabled={isAuctionClosed || submitting}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Transit Time</label>
                  <input
                    type="text"
                    name="transit_time"
                    className="form-control"
                    value={bidForm.transit_time}
                    onChange={handleInputChange}
                    disabled={isAuctionClosed || submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Validity</label>
                  <input
                    type="date"
                    name="validity_of_quote"
                    className="form-control"
                    value={bidForm.validity_of_quote}
                    onChange={handleInputChange}
                    disabled={isAuctionClosed || submitting}
                    required
                  />
                </div>
              </div>

              {/* Total Quote Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  margin: '0.75rem 0',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Total Calculated Quote:</span>
                <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  ${parseFloat(calculateTotalQuote()).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Simulation Helper */}
              {!isAuctionClosed && (
                <div
                  style={{
                    margin: '0.65rem 0 1rem 0',
                    padding: '0.55rem 0.75rem',
                    backgroundColor: '#fffdf5',
                    border: '1px solid #fef3c7',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <input
                    type="checkbox"
                    id="sim_toggle"
                    name="simulate_trigger_window"
                    checked={bidForm.simulate_trigger_window}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="sim_toggle" style={{ fontSize: '0.725rem', color: '#92400e', cursor: 'pointer' }}>
                    <strong>Simulate Trigger Window submission</strong> (submits timestamp 1m before close)
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={isAuctionClosed || submitting}
              >
                <Send size={13} /> {submitting ? 'Submitting...' : 'Submit Quote'}
              </button>
            </form>
          </div>

          {/* Ranked Bids Table */}
          <div className="table-container">
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
                Supplier Leaderboard (Ranked Ascending by Price)
              </div>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Best Quote per Supplier</span>
            </div>

            {rfq.bids.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.825rem' }}>
                No quotes submitted yet for this RFQ.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>Rank</th>
                    <th>Carrier</th>
                    <th>Total Quote</th>
                    <th>Charges (Freight / Orig / Dest)</th>
                    <th>Transit</th>
                    <th>Valid Till</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {rfq.bids.map((bid) => {
                    let rankClass = 'other';
                    if (bid.rank === 'L1') rankClass = 'l1';
                    else if (bid.rank === 'L2') rankClass = 'l2';
                    else if (bid.rank === 'L3') rankClass = 'l3';

                    return (
                      <tr key={bid.id}>
                        <td>
                          <span className={`rank-tag ${rankClass}`}>{bid.rank || 'N/A'}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f172a' }}>{bid.carrier_name}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: bid.rank === 'L1' ? '#047857' : '#0f172a' }}>
                            ${bid.total_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          ${bid.freight_charges.toFixed(0)} / ${bid.origin_charges.toFixed(0)} / ${bid.destination_charges.toFixed(0)}
                        </td>
                        <td>{bid.transit_time}</td>
                        <td style={{ fontSize: '0.75rem' }}>{new Date(bid.validity_of_quote).toLocaleDateString()}</td>
                        <td style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          {new Date(bid.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* AUDIT TRAIL TAB */
        <div className="card" style={{ maxWidth: '820px' }}>
          <div className="card-header-clean">
            <div>
              <h3 style={{ fontSize: '0.925rem', fontWeight: 700, color: '#0f172a' }}>Auction Event Audit Trail</h3>
              <p style={{ fontSize: '0.725rem', color: '#64748b' }}>
                Complete chronological log of all bid entries, rule evaluations, and time extensions
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
              {rfq.activity_logs.length} logged events
            </span>
          </div>

          <div className="audit-list">
            {rfq.activity_logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.825rem' }}>
                No events recorded.
              </div>
            ) : (
              rfq.activity_logs.map((log) => {
                const isExtension = log.event_type === 'TIME_EXTENSION';
                const isBid = log.event_type === 'BID_SUBMISSION';
                let entryClass = 'created';
                if (isExtension) entryClass = 'extension';
                else if (isBid) entryClass = 'bid';

                return (
                  <div key={log.id} className={`audit-entry ${entryClass}`}>
                    <div className="audit-header">
                      <span
                        className="audit-tag"
                        style={{
                          color: isExtension ? '#b45309' : isBid ? '#1d4ed8' : '#475569',
                        }}
                      >
                        {isExtension ? 'Time Extension' : isBid ? 'Quote Received' : 'RFQ Initialization'}
                      </span>
                      <span className="audit-time">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <div style={{ color: '#1e293b', fontSize: '0.8rem', marginTop: '0.15rem' }}>{log.reason}</div>

                    {isExtension && log.previous_close_time && log.new_close_time && (
                      <div
                        style={{
                          marginTop: '0.4rem',
                          padding: '0.3rem 0.55rem',
                          background: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '4px',
                          fontSize: '0.725rem',
                          color: '#92400e',
                          fontFamily: 'monospace',
                        }}
                      >
                        Shift: {new Date(log.previous_close_time).toLocaleTimeString()} &rarr;{' '}
                        {new Date(log.new_close_time).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
