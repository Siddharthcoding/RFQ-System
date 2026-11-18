import React, { useState } from 'react';
import { X, AlertCircle, Info, ShieldAlert } from 'lucide-react';
import { createRfq } from '../api';

export default function CreateRfqModal({ isOpen, onClose, onSuccess }) {
  if (!isOpen) return null;

  const toLocalISOString = (date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const now = new Date();
  const defaultStart = toLocalISOString(now);
  const defaultClose = toLocalISOString(new Date(now.getTime() + 15 * 60000));
  const defaultForcedClose = toLocalISOString(new Date(now.getTime() + 30 * 60000));
  const defaultPickup = toLocalISOString(new Date(now.getTime() + 7 * 24 * 3600000));

  const [formData, setFormData] = useState({
    rfq_number: `RFQ-${Math.floor(1000 + Math.random() * 9000)}`,
    title: '',
    pickup_service_date: defaultPickup,
    is_british_auction: true,
    bid_start_time: defaultStart,
    bid_close_time: defaultClose,
    forced_bid_close_time: defaultForcedClose,
    trigger_window_minutes: 10,
    extension_duration_minutes: 5,
    extension_trigger_type: 'ANY_BID',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const start = new Date(formData.bid_start_time);
    const close = new Date(formData.bid_close_time);
    const forced = new Date(formData.forced_bid_close_time);

    if (close <= start) {
      setError('Bid Close Time must be strictly later than Bid Start Time.');
      return;
    }
    if (forced <= close) {
      setError('Forced Bid Close Time must always be greater than Bid Close Time.');
      return;
    }

    try {
      setLoading(true);
      await createRfq({
        ...formData,
        trigger_window_minutes: Number(formData.trigger_window_minutes),
        extension_duration_minutes: Number(formData.extension_duration_minutes),
        bid_start_time: new Date(formData.bid_start_time).toISOString(),
        bid_close_time: new Date(formData.bid_close_time).toISOString(),
        forced_bid_close_time: new Date(formData.forced_bid_close_time).toISOString(),
        pickup_service_date: new Date(formData.pickup_service_date).toISOString(),
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create RFQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Modal Container: Flex column with fixed header & fixed footer */}
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* FIXED HEADER: Never scrolls away; cross button is always visible */}
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Create British Auction RFQ
            </h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem', marginBottom: 0 }}>
              Define procurement parameters, extension triggers, and hard ceiling limits
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: '0.35rem',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form wraps both scrollable body and fixed footer */}
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          {/* SCROLLABLE BODY: Only vertical scrolling, zero horizontal overflow */}
          <div className="modal-body">
            {error && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#991b1b',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  border: '1px solid #fecaca',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: General Information */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#475569',
                  marginBottom: '0.55rem',
                }}
              >
                1. General Information
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">Reference ID</label>
                  <input
                    type="text"
                    name="rfq_number"
                    className="form-control"
                    value={formData.rfq_number}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">Pickup / Service Date</label>
                  <input
                    type="datetime-local"
                    name="pickup_service_date"
                    className="form-control"
                    value={formData.pickup_service_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="form-label">RFQ Title / Shipment Scope</label>
                <input
                  type="text"
                  name="title"
                  className="form-control"
                  placeholder="e.g. Dedicated Freight - Rotterdam to Frankfurt"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {/* Section 2: Auction Timeline */}
            <div
              style={{
                marginBottom: '1.25rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#475569',
                  marginBottom: '0.55rem',
                }}
              >
                2. Auction Timeline & Hard Ceiling
              </div>

              {/* 2-column layout to prevent any horizontal overflow on datetime pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">Bidding Opens</label>
                  <input
                    type="datetime-local"
                    name="bid_start_time"
                    className="form-control"
                    value={formData.bid_start_time}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">Initial Bid Close Time</label>
                  <input
                    type="datetime-local"
                    name="bid_close_time"
                    className="form-control"
                    value={formData.bid_close_time}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Forced Close Highlight Box */}
              <div
                style={{
                  background: '#fffdfd',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  padding: '0.75rem 0.85rem',
                  marginTop: '0.25rem',
                }}
              >
                <div className="form-group" style={{ marginBottom: '0.35rem', minWidth: 0 }}>
                  <label
                    className="form-label"
                    style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <ShieldAlert size={14} />
                    Forced Bid Close Time (Hard Ceiling) *
                  </label>
                  <input
                    type="datetime-local"
                    name="forced_bid_close_time"
                    className="form-control"
                    style={{ borderColor: '#fca5a5' }}
                    value={formData.forced_bid_close_time}
                    onChange={handleChange}
                    required
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#991b1b', lineHeight: 1.35 }}>
                  * Rule: Forced Close Time must be strictly later than Bid Close Time. Dynamic extensions are hard-capped at this time and cannot exceed it.
                </span>
              </div>
            </div>

            {/* Section 3: British Auction Configuration */}
            <div
              style={{
                paddingTop: '0.85rem',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <div
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: '#475569',
                  marginBottom: '0.55rem',
                }}
              >
                3. British Auction Extension Configuration
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">Trigger Window (X Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    name="trigger_window_minutes"
                    className="form-control"
                    value={formData.trigger_window_minutes}
                    onChange={handleChange}
                    required
                  />
                  <span className="form-hint">Monitors bids in the final X mins before close</span>
                </div>

                <div className="form-group" style={{ minWidth: 0 }}>
                  <label className="form-label">Extension Duration (Y Minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    name="extension_duration_minutes"
                    className="form-control"
                    value={formData.extension_duration_minutes}
                    onChange={handleChange}
                    required
                  />
                  <span className="form-hint">Time added to deadline when triggered</span>
                </div>
              </div>

              <div className="form-group" style={{ minWidth: 0, marginBottom: '0.25rem' }}>
                <label className="form-label">Extension Trigger Condition</label>
                <select
                  name="extension_trigger_type"
                  className="form-control"
                  value={formData.extension_trigger_type}
                  onChange={handleChange}
                >
                  <option value="ANY_BID">Any Bid Received in Last X Minutes</option>
                  <option value="ANY_RANK_CHANGE">Any Supplier Rank Change in Last X Minutes</option>
                  <option value="L1_RANK_CHANGE">Lowest Bidder (L1) Rank Change in Last X Minutes</option>
                </select>
                <span className="form-hint">
                  Defines what qualifying bidding activity causes the close time to extend
                </span>
              </div>
            </div>
          </div>

          {/* FIXED FOOTER: Always stays at bottom; buttons never disappear */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create British Auction RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
