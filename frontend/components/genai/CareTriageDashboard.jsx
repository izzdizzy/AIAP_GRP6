import React, { useState, useEffect } from 'react';
import SectionCard from '../SectionCard';
import { fetchCareTriage } from '../../services/genaiApi';

export default function CareTriageDashboard({ unifiedContext }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checklist, setChecklist] = useState([]);

  const loadTriage = async () => {
    if (!unifiedContext) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchCareTriage(unifiedContext);
      setData(res);
      if (res.discharge_checklist) {
        setChecklist(res.discharge_checklist.map(item => ({ text: item, done: false })));
      }
    } catch (err) {
      setError(err.message || 'Failed to generate care triage plan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTriage();
  }, [unifiedContext]);

  const toggleChecklistItem = (index) => {
    setChecklist(prev =>
      prev.map((item, i) => i === index ? { ...item, done: !item.done } : item)
    );
  };

  const getBadgeStyle = (color) => {
    if (color === 'red') {
      return { background: '#ef4444', color: '#ffffff' };
    } else if (color === 'amber') {
      return { background: '#f59e0b', color: '#0f172a' };
    } else {
      return { background: '#22c55e', color: '#0f172a' };
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <SectionCard>
        <div style={{ padding: '8px 4px' }}>
          {/* Dashboard Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border, #334155)',
            paddingBottom: '12px'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text, #f8fafc)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏥</span> Care Triage & Post-Discharge Navigator
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.83rem', color: 'var(--text-muted, #94a3b8)' }}>
                Structured clinical care routing, doctor questions, and post-discharge guidance.
              </p>
            </div>
            {data && (
              <span style={{
                fontSize: '0.82rem',
                padding: '6px 14px',
                borderRadius: '16px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                ...getBadgeStyle(data.badge_color)
              }}>
                {data.urgency_level}
              </span>
            )}
          </div>

          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic' }}>
              Evaluating clinical urgency, comorbidity burden, and subsidy pathways...
            </div>
          )}

          {error && (
            <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', fontSize: '0.88rem' }}>
              ⚠️ {error}
            </div>
          )}

          {!loading && data && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              {/* Clinical Summary & Facility Recommendation */}
              <div style={{
                padding: '14px 18px',
                borderRadius: '10px',
                background: 'var(--surface-muted, #0f172a)',
                border: '1px solid var(--border, #334155)'
              }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--accent, #38bdf8)', fontWeight: 600 }}>
                  📍 Recommended Care Routing & Facility
                </h4>
                <p style={{ margin: '0 0 10px', fontSize: '0.9rem', color: 'var(--text, #f8fafc)', lineHeight: '1.5' }}>
                  {data.summary}
                </p>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'var(--surface, #1e293b)',
                  border: '1px solid var(--border, #334155)',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text, #f8fafc)'
                }}>
                  Facility Option: {data.recommended_facility}
                </div>
              </div>

              {/* Questions for Doctor & Post-Discharge Checklist Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {/* Questions for Doctor */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'var(--surface-muted, #0f172a)',
                  border: '1px solid var(--border, #334155)'
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: 'var(--text, #f8fafc)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>💬</span> Questions to Ask Your Doctor
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {data.questions_for_doctor.map((q, i) => (
                      <li key={i} style={{ lineHeight: '1.4' }}>{q}</li>
                    ))}
                  </ul>
                </div>

                {/* Post-Discharge Checklist */}
                <div style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: 'var(--surface-muted, #0f172a)',
                  border: '1px solid var(--border, #334155)'
                }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: 'var(--text, #f8fafc)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>✅</span> Actionable Post-Discharge Checklist
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {checklist.map((item, idx) => (
                      <label
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          fontSize: '0.85rem',
                          color: item.done ? 'var(--text-muted, #94a3b8)' : 'var(--text, #f8fafc)',
                          textDecoration: item.done ? 'line-through' : 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => toggleChecklistItem(idx)}
                          style={{ marginTop: '3px', cursor: 'pointer' }}
                        />
                        <span>{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
