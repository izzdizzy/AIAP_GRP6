import React from 'react';
import ReactMarkdown from 'react-markdown';

function renderColoredText(text) {
  if (typeof text !== 'string') return text;

  const regex = /\{\{?(red|amber|green):\s*([^}]+)\}?\}/gi;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const colorType = match[1].toLowerCase();
    const content = match[2].replace(/\}$/, '').trim();
    const className = colorType === 'red' ? 'chat-red' : colorType === 'amber' ? 'chat-amber' : 'chat-green';

    parts.push(
      <span key={match.index} className={className}>
        {content}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function processChildren(children) {
  if (typeof children === 'string') {
    return renderColoredText(children);
  }
  if (Array.isArray(children)) {
    return children.map((child, i) => (
      typeof child === 'string' ? <React.Fragment key={i}>{renderColoredText(child)}</React.Fragment> : child
    ));
  }
  return children;
}

export default function ChatMessage({ role, content }) {
  const isAssistant = role === 'assistant';

  return (
    <div
      className={`chat-message ${
        isAssistant
          ? 'chat-message--assistant'
          : 'chat-message--user'
      }`}
    >
      <div className="chat-message__label">
        {isAssistant ? 'AI Assistant' : 'You'}
      </div>

      <div className="chat-message__bubble">
        <ReactMarkdown
          components={{
            ul: ({ node, children, ...props }) => <ul style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'disc' }} {...props}>{processChildren(children)}</ul>,
            ol: ({ node, children, ...props }) => <ol style={{ margin: '8px 0', paddingLeft: '20px', listStyleType: 'decimal' }} {...props}>{processChildren(children)}</ol>,
            li: ({ node, children, ...props }) => <li style={{ marginBottom: '4px' }} {...props}>{processChildren(children)}</li>,
            p: ({ node, children, ...props }) => <p style={{ margin: '6px 0', lineHeight: '1.5' }} {...props}>{processChildren(children)}</p>,
            strong: ({ node, children, ...props }) => <strong style={{ fontWeight: 700 }} {...props}>{processChildren(children)}</strong>,
            a: ({ node, children, href, ...props }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#38bdf8', textDecoration: 'underline' }}
                {...props}
              >
                {processChildren(children)}
              </a>
            )
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}