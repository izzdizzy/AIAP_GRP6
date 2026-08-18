import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import SectionCard from '../SectionCard';

export default function DiagnosticExplainerTab({ shapData, activeModules }) {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!shapData) {
    return (
      <SectionCard>
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No diagnostic explanation data available. Please complete at least one assessment.</p>
        </div>
      </SectionCard>
    );
  }

  const moduleExplanations = shapData.module_explanations || [];

  // Filter factors based on selected module pill
  const filteredExplanations = selectedFilter === 'all'
    ? moduleExplanations
    : moduleExplanations.filter(m => m.module_key === selectedFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Hero Overview Card */}
      <SectionCard>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>💡</span>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)', fontWeight: 700 }}>
              Cross-Assessment Diagnostic Synthesis
            </h3>
          </div>
          <div className="markdown-body" style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: '1.6' }}>
            <ReactMarkdown>
              {shapData.overall_summary || "Plain-language translation of machine learning SHAP feature impacts."}
            </ReactMarkdown>
          </div>
        </div>
      </SectionCard>

      {/* Module Filter Pills */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '4px' }}>
          Filter Factors:
        </span>
        <button
          type="button"
          onClick={() => setSelectedFilter('all')}
          style={{
            padding: '6px 14px',
            borderRadius: '16px',
            fontSize: '0.82rem',
            fontWeight: 600,
            border: '1px solid var(--border)',
            background: selectedFilter === 'all' ? 'var(--accent)' : 'var(--surface-muted)',
            color: selectedFilter === 'all' ? '#0f172a' : 'var(--text)',
            cursor: 'pointer'
          }}
        >
          All Active Factors
        </button>

        {activeModules.cad && (
          <button
            type="button"
            onClick={() => setSelectedFilter('cad')}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: selectedFilter === 'cad' ? 'var(--accent)' : 'var(--surface-muted)',
              color: selectedFilter === 'cad' ? '#0f172a' : 'var(--text)',
              cursor: 'pointer'
            }}
          >
            CAD Risk Factors
          </button>
        )}

        {activeModules.diabetes && (
          <button
            type="button"
            onClick={() => setSelectedFilter('diabetes')}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: selectedFilter === 'diabetes' ? 'var(--accent)' : 'var(--surface-muted)',
              color: selectedFilter === 'diabetes' ? '#0f172a' : 'var(--text)',
              cursor: 'pointer'
            }}
          >
            Diabetes Risk Factors
          </button>
        )}

        {activeModules.readmission && (
          <button
            type="button"
            onClick={() => setSelectedFilter('readmission')}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              border: '1px solid var(--border)',
              background: selectedFilter === 'readmission' ? 'var(--accent)' : 'var(--surface-muted)',
              color: selectedFilter === 'readmission' ? '#0f172a' : 'var(--text)',
              cursor: 'pointer'
            }}
          >
            Readmission Drivers
          </button>
        )}
      </div>

      {/* Diagnostic Factors Accordion Cards */}
      {filteredExplanations.map((mod) => (
        <SectionCard key={mod.module_key}>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', color: 'var(--text)', fontWeight: 700 }}>
              {mod.module_name}
            </h4>
            <p style={{ margin: '0 0 16px', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              {mod.risk_summary}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {mod.key_drivers.map((driver, idx) => {
                const uniqueKey = `${mod.module_key}-${idx}`;
                const isExpanded = expandedIndex === uniqueKey;
                const isIncrease = driver.direction === 'increase' || driver.impact > 0;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'var(--surface-muted)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setExpandedIndex(isExpanded ? null : uniqueKey)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <strong style={{ fontSize: '0.92rem', color: 'var(--text)' }}>
                        {driver.feature}
                      </strong>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          background: isIncrease ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                          color: isIncrease ? '#f87171' : '#4ade80'
                        }}>
                          {isIncrease ? '▲ Risk Driver' : '▼ Risk Reducer'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    <div className="markdown-body" style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.55' }}>
                      <ReactMarkdown>{driver.explanation}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionCard>
      ))}
    </div>
  );
}
