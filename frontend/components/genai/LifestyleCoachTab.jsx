import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import SectionCard from '../SectionCard';
import PrimaryButton from '../PrimaryButton';
import { useCoach } from '../../context/CoachContext';

export default function LifestyleCoachTab({ unifiedContext }) {
  const {
    messages,
    input,
    setInput,
    loading,
    promptChips,
    sendMessage
  } = useCoach();

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (textToSend) => {
    sendMessage(textToSend, unifiedContext);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 270px)',
      minHeight: '480px',
      maxHeight: '700px',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      <SectionCard style={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', boxSizing: 'border-box' }}>
        <div style={{
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🥗</span> AI Health & Lifestyle Coach
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Actionable risk reduction, dietary guidance, and Singapore healthcare navigation.
              </p>
            </div>
          </div>

          {/* Prompt Chips Bar */}
          {promptChips.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginBottom: '10px',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              maxWidth: '100%',
              boxSizing: 'border-box'
            }}>
              {promptChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(chip)}
                  disabled={loading}
                  style={{
                    fontSize: '0.8rem',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    background: 'var(--surface-muted)',
                    color: 'var(--accent)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    flexShrink: 0
                  }}
                >
                  💡 {chip}
                </button>
              ))}
            </div>
          )}

          {/* Chat Messages Container */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'var(--surface-muted)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginBottom: '12px',
            maxWidth: '100%',
            boxSizing: 'border-box'
          }}>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className="markdown-body"
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  backgroundColor: msg.role === 'user' ? 'var(--accent, #059669)' : 'var(--surface)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word'
                }}
              >
                {msg.role === 'assistant' && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>
                    AI Lifestyle Coach {msg.isFallback && '(Offline Protocol)'}
                  </div>
                )}
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            ))}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--surface)',
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                fontStyle: 'italic'
              }}>
                Analyzing clinical context & generating recommendations...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
            <input
              type="text"
              placeholder="Ask about diet, exercise, or subsidies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
            />
            <PrimaryButton
              type="button"
              variant="primary"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
            >
              Send
            </PrimaryButton>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
