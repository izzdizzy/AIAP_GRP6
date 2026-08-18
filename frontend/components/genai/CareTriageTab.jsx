import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SectionCard from '../SectionCard';

export default function CareTriageTab({ triageData }) {
  const [checklist, setChecklist] = useState([]);

  useEffect(() => {
    if (triageData?.discharge_checklist) {
      setChecklist(triageData.discharge_checklist.map(item => ({ text: item, done: false })));
    }
  }, [triageData]);

  if (!triageData) {
    return (
      <SectionCard>
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>No care triage data available. Please complete at least one assessment.</p>
        </div>
      </SectionCard>
    );
  }

  const toggleChecklist = (idx) => {
    setChecklist(prev => prev.map((item, i) => i === idx ? { ...item, done: !item.done } : item));
  };

  const getBadgeStyle = (color) => {
    if (color === 'red') return { background: '#ef4444', color: '#ffffff' };
    if (color === 'amber') return { background: '#f59e0b', color: '#0f172a' };
    return { background: '#22c55e', color: '#0f172a' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Triage Urgency Header */}
      <SectionCard>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🏥</span> Care Urgency & Facility Routing
              </h3>
              <div className="markdown-body" style={{ margin: '4px 0 0', fontSize: '0.88rem', color: 'var(--text)' }}>
                <ReactMarkdown>{triageData.summary}</ReactMarkdown>
              </div>
            </div>
            <span style={{
              fontSize: '0.85rem',
              padding: '6px 14px',
              borderRadius: '16px',
              fontWeight: 700,
              letterSpacing: '0.02em',
              ...getBadgeStyle(triageData.badge_color)
            }}>
              {triageData.urgency_level}
            </span>
          </div>

          <div style={{
            marginTop: '14px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            fontSize: '0.92rem',
            fontWeight: 600,
            color: 'var(--text)'
          }}>
            Recommended Facility: {triageData.recommended_facility}
          </div>
        </div>
      </SectionCard>

      {/* Grid: Doctor Questions + Discharge Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {/* Questions for Doctor */}
        <SectionCard>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '1rem', color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💬</span> Questions to Ask Your Doctor
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(triageData.questions_for_doctor || []).map((q, idx) => (
                <div
                  key={idx}
                  className="markdown-body"
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border)',
                    fontSize: '0.88rem',
                    color: 'var(--text)',
                    lineHeight: '1.5'
                  }}
                >
                  <ReactMarkdown>{q}</ReactMarkdown>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Actionable Post-Discharge Checklist */}
        <SectionCard>
          <div style={{ padding: '16px 20px' }}>
            <h4 style={{ margin: '0 0 14px', fontSize: '1rem', color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>✅</span> Actionable Post-Discharge Checklist
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleChecklist(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: item.done ? 'rgba(34, 197, 94, 0.08)' : 'var(--surface-muted)',
                    border: item.done ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border)',
                    fontSize: '0.88rem',
                    color: item.done ? 'var(--text-muted)' : 'var(--text)',
                    textDecoration: item.done ? 'line-through' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {item.done ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" fill="#22c55e" stroke="#22c55e" strokeWidth="2" />
                        <path d="M6 10L9 13L14 7" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" stroke="var(--text-muted)" strokeWidth="2" />
                      </svg>
                    )}
                  </div>
                  <div className="markdown-body" style={{ lineHeight: '1.4', flex: 1 }}>
                    <ReactMarkdown>{item.text}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
