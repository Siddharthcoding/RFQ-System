const BASE_URL = '/api/rfqs';

export async function fetchRfqs() {
  const res = await fetch(`${BASE_URL}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load RFQs: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRfqDetails(rfqId) {
  const res = await fetch(`${BASE_URL}/${rfqId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to load RFQ #${rfqId}: ${res.statusText}`);
  }
  return res.json();
}

export async function createRfq(rfqData) {
  const res = await fetch(`${BASE_URL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rfqData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to create RFQ: ${res.statusText}`);
  }
  return res.json();
}

export async function submitBid(rfqId, bidData, simulatedTime = null) {
  let url = `${BASE_URL}/${rfqId}/bids`;
  if (simulatedTime) {
    url += `?simulated_time=${encodeURIComponent(simulatedTime)}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bidData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to submit quote: ${res.statusText}`);
  }
  return res.json();
}

export async function seedDemoData() {
  const res = await fetch('/api/admin/seed-demo-data', {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to seed demo data: ${res.statusText}`);
  }
  return res.json();
}
