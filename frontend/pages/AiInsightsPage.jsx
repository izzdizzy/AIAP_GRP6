import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionCard from '../components/SectionCard';
import AiInsightsSkeleton from '../components/genai/AiInsightsSkeleton';
import DiagnosticExplainerTab from '../components/genai/DiagnosticExplainerTab';
import LifestyleCoachTab from '../components/genai/LifestyleCoachTab';
import CareTriageTab from '../components/genai/CareTriageTab';
import { getCachedAiInsights, prefetchAiInsights } from '../services/genaiApi';

export default function AiInsightsPage({ unifiedContext }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('explainer'); // 'explainer' | 'coach' | 'triage'
  const [data, setData] = useState(() => getCachedAiInsights());
  const [loading, setLoading] = useState(!getCachedAiInsights());
  const [refreshing, setRefreshing] = useState(false);

  const activeCount = unifiedContext?.active_module_count || 1;
  const activeModules = {
    cad: Boolean(unifiedContext?.cad?.completed),
    diabetes: Boolean(unifiedContext?.diabetes?.completed),
    readmission: Boolean(unifiedContext?.readmission?.completed)
  };

  const loadData = async (force = false) => {
    if (!unifiedContext) return;
    if (force) setRefreshing(true);
    else if (!data) setLoading(true);

    try {
      const res = await prefetchAiInsights(unifiedContext, force);
      if (res) setData(res);
    } catch (err) {
      console.error('Error loading AI insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!data) {
      loadData(false);
    }
  }, [unifiedContext]);

  // Format active context banner string
  const activeNames = [];
  if (activeModules.cad) activeNames.push('CAD');
  if (activeModules.diabetes) activeNames.push('Diabetes');
  if (activeModules.readmission) activeNames.push('Readmission');

  return (
    <div className="page-stack">
      {/* Top Context Banner */}
      <div style={{
        padding: '16px 20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.15), rgba(13, 148, 136, 0.15))',
        border: '1px solid var(--accent)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', fontWeight: 700 }}>
            Unified Patient Context Banner
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: '1.25rem', color: 'var(--text)', fontWeight: 700 }}>
            Active Context: {activeNames.join(' + ') || '1 Assessment'} ({activeCount} of 3 Modules Completed)
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: refreshing ? 'rotate(360deg)' : 'none',
              transition: refreshing ? 'transform 1s linear' : 'none'
            }}>
              🔄
            </span>
            <span>{refreshing ? 'Refreshing AI Analysis...' : 'Refresh AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '2px solid var(--border)',
        gap: '4px',
        marginTop: '8px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('explainer')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'explainer' ? '3px solid var(--accent)' : '3px solid transparent',
            color: activeTab === 'explainer' ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          📊 Diagnostic Explainer
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('coach')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'coach' ? '3px solid var(--accent)' : '3px solid transparent',
            color: activeTab === 'coach' ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🥗 Lifestyle Coach
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('triage')}
          style={{
            padding: '12px 20px',
            fontSize: '0.95rem',
            fontWeight: 700,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'triage' ? '3px solid var(--accent)' : '3px solid transparent',
            color: activeTab === 'triage' ? 'var(--accent)' : 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          🏥 Care Triage
        </button>
      </div>

      {/* Skeleton Shimmer Loader during generation */}
      {loading ? (
        <AiInsightsSkeleton />
      ) : (
        <div style={{ marginTop: '12px' }}>
          {activeTab === 'explainer' && (
            <DiagnosticExplainerTab
              shapData={data?.shapData}
              activeModules={activeModules}
            />
          )}

          {activeTab === 'coach' && (
            <LifestyleCoachTab
              unifiedContext={unifiedContext}
            />
          )}

          {activeTab === 'triage' && (
            <CareTriageTab
              triageData={data?.triageData}
            />
          )}
        </div>
      )}
    </div>
  );
}
