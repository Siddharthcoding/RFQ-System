import React from 'react';

export default function StatusBadge({ status, isInTriggerWindow }) {
  let styleClass = 'status-active';
  let label = 'Active';

  if (status === 'Force Closed') {
    styleClass = 'status-force-closed';
    label = 'Force Closed';
  } else if (status === 'Closed') {
    styleClass = 'status-closed';
    label = 'Closed';
  } else if (status === 'Upcoming') {
    styleClass = 'status-closed';
    label = 'Upcoming';
  } else {
    styleClass = 'status-active';
    label = 'Active';
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
      <span className={`status-pill ${styleClass}`}>
        <span className="status-dot" />
        {label}
      </span>
      {status === 'Active' && isInTriggerWindow && (
        <span
          className="status-pill status-trigger"
          title="Bidding activity during this window triggers auction extension"
        >
          <span className="status-dot" />
          Trigger Window Active
        </span>
      )}
    </div>
  );
}
