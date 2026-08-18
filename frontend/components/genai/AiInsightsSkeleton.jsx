import React from 'react';
import SectionCard from '../SectionCard';

export default function AiInsightsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0' }}>
      <SectionCard>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{
            height: '24px',
            width: '40%',
            background: 'linear-gradient(90deg, var(--surface-muted) 25%, var(--border) 50%, var(--surface-muted) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '6px'
          }} />
          <div style={{
            height: '60px',
            width: '100%',
            background: 'linear-gradient(90deg, var(--surface-muted) 25%, var(--border) 50%, var(--surface-muted) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '8px'
          }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '10px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: '90px',
                background: 'linear-gradient(90deg, var(--surface-muted) 25%, var(--border) 50%, var(--surface-muted) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                borderRadius: '8px'
              }} />
            ))}
          </div>
        </div>
      </SectionCard>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
