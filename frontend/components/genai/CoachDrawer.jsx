import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import PrimaryButton from '../PrimaryButton';
import { sendCoachMessage } from '../../services/genaiApi';

export default function CoachDrawer({ isOpen, onClose, unifiedContext }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Health & Lifestyle Coach. I synthesize insights across all your completed health assessments to offer personalized diet, exercise, and care navigation guidance. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [promptChips, setPromptChips] = useState([
    'Suggest a low-sodium diet based on my risk',
    'How do my heart and diabetes risks interact?',
    'What CHAS subsidies or Healthier SG benefits apply to me?'
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg = { role: 'user', content: query };
    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await sendCoachMessage(unifiedContext, query, updatedHistory);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: response.reply, isFallback: response.is_fallback }
      ]);
      if (response.suggested_chips && response.suggested_chips.length > 0) {
        setPromptChips(response.suggested_chips);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to process request right now: ${err.message || 'Network error'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
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
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(3px)',
      transition: 'opacity 0.3s ease'
    }}>
      {/* Backdrop click to close */}
      <div style={{ flex: 1 }} onClick={onClose} />

      {/* Drawer Container */}
      <div style={{
        width: '450px',
        maxWidth: '90vw',
        height: '100%',
        backgroundColor: 'var(--surface, #1e293b)',
        color: 'var(--text, #f8fafc)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
        borderLeft: '1px solid var(--border, #334155)',
        animation: 'slideInRight 0.3s ease-out'
      }}>
        {/* Drawer Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border, #334155)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-muted, #0f172a)'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🤖</span> AI Health & Lifestyle Coach
            </h3>
            <span style={{
              display: 'inline-block',
              marginTop: '4px',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'var(--accent, #38bdf8)',
              color: '#0f172a',
              fontWeight: 600
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
            padding: '12px 16px',
            background: 'var(--surface-muted, #0f172a)',
            borderBottom: '1px solid var(--border, #334155)',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            whiteSpace: 'nowrap'
          }}>
            {promptChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(chip)}
                disabled={loading}
                style={{
                  fontSize: '0.78rem',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  background: 'var(--surface, #1e293b)',
                  color: 'var(--accent, #38bdf8)',
                  border: '1px solid var(--border, #334155)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
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
                backgroundColor: msg.role === 'user' ? '#0284c7' : 'var(--surface-muted, #0f172a)',
                color: msg.role === 'user' ? '#ffffff' : 'var(--text, #f8fafc)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border, #334155)',
                whiteSpace: 'pre-line'
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{ fontSize: '0.75rem', color: 'var(--accent, #38bdf8)', fontWeight: 600, marginBottom: '4px' }}>
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
              backgroundColor: 'var(--surface-muted, #0f172a)',
              color: 'var(--text-muted, #94a3b8)',
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
          padding: '16px',
          borderTop: '1px solid var(--border, #334155)',
          background: 'var(--surface-muted, #0f172a)',
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
              border: '1px solid var(--border, #334155)',
              backgroundColor: 'var(--surface, #1e293b)',
              color: 'var(--text, #f8fafc)',
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
