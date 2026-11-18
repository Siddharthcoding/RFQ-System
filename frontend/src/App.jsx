import React, { useState } from 'react';
import Navbar from './components/Navbar';
import CreateRfqModal from './components/CreateRfqModal';
import AuctionListPage from './pages/AuctionListPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import { seedDemoData } from './api';

export default function App() {
  const [selectedRfqId, setSelectedRfqId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSeedData = async () => {
    try {
      await seedDemoData();
      setRefreshKey((k) => k + 1);
      alert('Demo RFQ data refreshed successfully!');
    } catch (err) {
      alert(`Seed failed: ${err.message}`);
    }
  };

  const handleCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="app-container">
      <Navbar
        onOpenCreate={() => setIsCreateOpen(true)}
        onSeedData={handleSeedData}
        onNavigateHome={() => setSelectedRfqId(null)}
      />

      <main className="content-wrapper">
        {selectedRfqId ? (
          <AuctionDetailPage
            key={selectedRfqId}
            rfqId={selectedRfqId}
            onBack={() => setSelectedRfqId(null)}
          />
        ) : (
          <AuctionListPage
            key={refreshKey}
            onSelectRfq={(id) => setSelectedRfqId(id)}
          />
        )}
      </main>

      <CreateRfqModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreated}
      />
    </div>
  );
}
