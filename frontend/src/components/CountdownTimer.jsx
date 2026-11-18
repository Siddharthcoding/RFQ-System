import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ targetTime, onExpire }) {
  const calculateRemaining = () => {
    if (!targetTime) return 0;
    const diff = Math.floor((new Date(targetTime).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  };

  const [secondsLeft, setSecondsLeft] = useState(calculateRemaining);

  useEffect(() => {
    setSecondsLeft(calculateRemaining());
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n) => String(n).padStart(2, '0');

  let timeString = `${pad(minutes)}:${pad(seconds)}`;
  if (hours > 0) {
    timeString = `${pad(hours)}:${timeString}`;
  }

  const isExpired = secondsLeft === 0;
  const isUrgent = secondsLeft > 0 && secondsLeft <= 300; // < 5 mins

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontVariantNumeric: 'tabular-nums',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '0.825rem',
        fontWeight: 600,
        color: isExpired ? '#64748b' : isUrgent ? '#b45309' : '#0f172a',
        backgroundColor: isExpired ? '#f1f5f9' : isUrgent ? '#fef3c7' : '#f8fafc',
        padding: '0.15rem 0.45rem',
        borderRadius: '4px',
        border: `1px solid ${isExpired ? '#e2e8f0' : isUrgent ? '#fde68a' : '#e2e8f0'}`,
      }}
    >
      {isExpired ? '00:00:00' : timeString}
    </span>
  );
}
