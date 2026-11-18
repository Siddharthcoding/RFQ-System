import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';

export default function Navbar({ onOpenCreate, onSeedData, onNavigateHome }) {
  return (
    <header className="navbar">
      <div className="brand" onClick={onNavigateHome}>
        <div className="brand-badge">RFQ</div>
        <div className="brand-text">
          <h1>British Auction Console</h1>
          <p>Procurement & Dynamic Bidding Engine</p>
        </div>
      </div>

      <div className="nav-actions">
        <button
          className="btn btn-secondary"
          onClick={onSeedData}
          title="Reset or populate demo RFQ test scenarios"
        >
          <RefreshCw size={13} />
          Reset Demo Data
        </button>

        <button className="btn btn-primary" onClick={onOpenCreate}>
          <Plus size={14} />
          Create RFQ
        </button>
      </div>
    </header>
  );
}
