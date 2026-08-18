import React from 'react';

/**
 * Reusable Integrated Progress & Stepper Sidebar
 * Features:
 * - Top Section: Total completion bar (using Green)
 * - Stepper List:
 *   - Green for fully completed steps
 *   - Lime for incomplete steps that are left optional
 */
export default function ProgressSidebar({
  answeredCount = 0,
  totalCount = 0,
  groups = [],
  steps = [],
  currentStepIndex = 1,
  onSelectStep = null
}) {
  const percentage = totalCount > 0 ? Math.min(100, Math.round((answeredCount / totalCount) * 100)) : 0;
  const validSteps = steps.filter(s => s.id !== 'intro');

  return (
    <aside className="assessment-progress" aria-label="Form Progress Sidebar">
      <div className="section-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)' }}>
          Form Progress
        </h3>

        {/* Top Section: Total Counter with Green Progress Bar Background */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Completion</span>
            <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#16a34a' }}>
              {answeredCount} of {totalCount} completed ({percentage}%)
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            borderRadius: '999px',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${percentage}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #16a34a, #22c55e)',
              borderRadius: '999px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Integrated Stepper List with Green (completed) & Lime (optional incomplete) badges */}
        {validSteps.length > 0 && (
          <div style={{ display: 'grid', gap: '8px' }}>
            {validSteps.map((step, idx) => {
              const stepNum = idx + 1;
              const isActive = stepNum === currentStepIndex;
              const isPassed = stepNum < currentStepIndex;
              const isPending = stepNum > currentStepIndex;

              const stepAnswered = step.answeredCount ?? groups[idx]?.answeredCount ?? 0;
              const stepTotal = step.totalCount ?? groups[idx]?.totalCount ?? 0;
              
              const isFullyComplete = stepTotal > 0 ? (stepAnswered === stepTotal) : isPassed;
              const isOptionalIncomplete = isPassed && !isFullyComplete;

              let badgeBg = 'var(--surface)';
              let badgeBorder = 'var(--border)';
              let iconBg = 'var(--surface-muted)';
              let iconColor = 'var(--text)';

              if (isFullyComplete) {
                badgeBg = 'rgba(22, 163, 74, 0.12)';
                badgeBorder = 'rgba(22, 163, 74, 0.4)';
                iconBg = '#16a34a';
                iconColor = '#ffffff';
              } else if (isOptionalIncomplete) {
                badgeBg = 'rgba(132, 204, 22, 0.12)';
                badgeBorder = 'rgba(132, 204, 22, 0.4)';
                iconBg = '#84cc16';
                iconColor = '#0f172a';
              } else if (isActive) {
                badgeBg = 'var(--surface-muted)';
                badgeBorder = 'var(--accent)';
                iconBg = 'transparent';
                iconColor = 'var(--accent)';
              }

              return (
                <button
                  key={step.id || stepNum}
                  type="button"
                  onClick={() => onSelectStep?.(stepNum)}
                  disabled={!onSelectStep}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    border: `1px solid ${badgeBorder}`,
                    background: badgeBg,
                    color: isPending ? 'var(--text-muted)' : 'var(--text)',
                    cursor: onSelectStep ? 'pointer' : 'default',
                    textAlign: 'left',
                    width: '100%',
                    fontSize: '0.85rem',
                    boxShadow: isActive ? '0 0 0 1px var(--accent)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: iconBg,
                      color: iconColor,
                      border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      flex: '0 0 auto'
                    }}>
                      {isFullyComplete ? '✓' : isOptionalIncomplete ? '○' : stepNum}
                    </span>
                    <span style={{
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'var(--text)' : isPending ? 'var(--text-muted)' : 'var(--text)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {step.title}
                    </span>
                  </div>

                  {stepTotal > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: isFullyComplete ? 'rgba(22, 163, 74, 0.2)' : isOptionalIncomplete ? 'rgba(132, 204, 22, 0.2)' : 'var(--surface-muted)',
                      color: isFullyComplete ? '#16a34a' : isOptionalIncomplete ? '#65a30d' : 'var(--text-muted)',
                      border: `1px solid ${isFullyComplete ? 'rgba(22, 163, 74, 0.4)' : isOptionalIncomplete ? 'rgba(132, 204, 22, 0.4)' : 'var(--border)'}`,
                      flexShrink: 0
                    }}>
                      ({stepAnswered}/{stepTotal})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}