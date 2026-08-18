import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { fetchShapExplanation } from '../../services/genaiApi';

export default function ShapInterpreterCard({ unifiedContext }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedModule, setExpandedModule] = useState(null);

  const loadExplanation = async () => {
    if (!unifiedContext) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchShapExplanation(unifiedContext);
      setData(res);
      if (res.module_explanations && res.module_explanations.length > 0) {
        setExpandedModule(res.module_explanations[0].module_key);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate SHAP interpretation.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExplanation();
  }, [unifiedContext]);

  return (
    <div style={{ marginTop: '20px' }}>
      <SectionCard>
        <div style={{ padding: '8px 4px' }}>
          {/* Card Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            borderBottom: '1px solid var(--border, #334155)',
            paddingBottom: '10px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text, #f8fafc)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔍</span> Plain-Language SHAP & Model Interpreter
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: 'var(--text-muted, #94a3b8)' }}>
                Translates technical machine learning feature impacts into clinical plain language.
              </p>
            </div>
            <button
              onClick={loadExplanation}
              disabled={loading}
              style={{
                fontSize: '0.8rem',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border, #334155)',
                background: 'var(--surface-muted, #0f172a)',
                color: 'var(--accent, #38bdf8)',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              {loading ? 'Analyzing...' : 'Refresh AI Analysis'}
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
              Synthesizing SHAP waterfall vectors into clinical insights...
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.88rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Content display */}
          {!loading && data && (
            <div>
              {/* Overall Summary Box */}
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'var(--surface-muted, #0f172a)',
                borderLeft: '4px solid var(--accent, #38bdf8)',
                marginBottom: '16px',
                fontSize: '0.92rem',
                lineHeight: '1.5'
              }}>
                <strong style={{ color: 'var(--accent, #38bdf8)', display: 'block', marginBottom: '4px' }}>
                  XAI Clinical Synthesis Overview:
                </strong>
                {data.overall_summary}
              </div>

              {/* Module Breakdowns */}
              {data.module_explanations && data.module_explanations.map((mod) => {
                const isExpanded = expandedModule === mod.module_key;
                return (
                  <div
                    key={mod.module_key}
                    style={{
                      marginBottom: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border, #334155)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Module Accordion Header */}
                    <div
                      onClick={() => setExpandedModule(isExpanded ? null : mod.module_key)}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--surface-muted, #0f172a)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontWeight: 600,
                        fontSize: '0.95rem'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📊</span> {mod.module_name}
                      </span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                        {isExpanded ? '▲ Collapse' : '▼ Expand Insights'}
                      </span>
                    </div>

                    {/* Module Accordion Body */}
                    {isExpanded && (
                      <div style={{ padding: '14px 16px', background: 'var(--surface, #1e293b)' }}>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #94a3b8)', marginTop: 0, marginBottom: '12px' }}>
                          {mod.risk_summary}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {mod.key_drivers.map((driver, idx) => {
                            const isIncrease = driver.direction === 'increase' || driver.impact > 0;
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '10px 14px',
                                  borderRadius: '6px',
                                  background: 'var(--surface-muted, #0f172a)',
                                  border: '1px solid var(--border, #334155)',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '4px'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--text, #f8fafc)' }}>
                                    {driver.feature}
                                  </strong>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    background: isIncrease ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                    color: isIncrease ? '#f87171' : '#4ade80'
                                  }}>
                                    {isIncrease ? '▲ Risk Increaser' : '▼ Risk Reducer'}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)' }}>
                                  {driver.explanation}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
