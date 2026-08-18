import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import PrimaryButton from '../PrimaryButton';
import { useCoach } from '../../context/CoachContext';

export default function CoachDrawer({ isOpen, onClose, unifiedContext }) {
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
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (textToSend) => {
    sendMessage(textToSend, unifiedContext);
  };

  const activeCount = unifiedContext?.active_module_count || 1;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      backdropFilter: 'blur(4px)',
      padding: '16px',
      boxSizing: 'border-box',
      transition: 'opacity 0.3s ease'
    }}>
      {/* Backdrop click to close */}
      <div style={{ flex: 1 }} onClick={onClose} />

      {/* Island Floating Panel Container */}
      <div style={{
        width: '520px',
        maxWidth: 'calc(100vw - 32px)',
        height: 'calc(100vh - 32px)',
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.45)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          background: 'var(--surface-muted)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤖</span> AI Health & Lifestyle Coach
            </h3>
            <span style={{
              display: 'inline-block',
              marginTop: '4px',
              fontSize: '0.75rem',
              padding: '3px 10px',
              borderRadius: '12px',
              background: 'var(--surface)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
              fontWeight: 500
            }}>
              Context: {activeCount} of 3 Assessments Active
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '4px 8px',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Prompt Chips Bar */}
        {promptChips.length > 0 && (
          <div style={{
            padding: '10px 16px',
            background: 'var(--surface-muted)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(chip)}
                disabled={loading}
                style={{
                  fontSize: '0.78rem',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  background: 'var(--surface)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
              >
                💡 {chip}
              </button>
            ))}
          </div>
        )}

        {/* Chat Messages Body */}
        <div style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
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
                backgroundColor: msg.role === 'user' ? 'var(--accent, #0284c7)' : 'var(--surface-muted)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                whiteSpace: 'pre-line',
                overflowWrap: 'break-word',
                wordBreak: 'break-word'
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' }}>
                  AI Coach {msg.isFallback && '(Offline Clinical Protocol)'}
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
              backgroundColor: 'var(--surface-muted)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              fontStyle: 'italic'
            }}>
              Analyzing clinical context & generating guidance...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Drawer Footer Input */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid var(--border)',
          background: 'var(--surface-muted)',
          display: 'flex',
          gap: '10px'
        }}>
          <input
            type="text"
            placeholder="Ask about diet, risks, or subsidies..."
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
    </div>
  );
}
