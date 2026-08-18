import React, { createContext, useContext, useState } from 'react';
import { sendCoachMessage } from '../services/genaiApi';

const CoachContext = createContext(null);

export function CoachProvider({ children }) {
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

  const sendMessage = async (textToSend, unifiedContext) => {
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

  const resetChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Hello! I am your AI Health & Lifestyle Coach. I synthesize insights across all your completed health assessments to offer personalized diet, exercise, and care navigation guidance. How can I assist you today?'
      }
    ]);
    setInput('');
    setPromptChips([
      'Suggest a low-sodium diet based on my risk',
      'How do my heart and diabetes risks interact?',
      'What CHAS subsidies or Healthier SG benefits apply to me?'
    ]);
  };

  return (
    <CoachContext.Provider value={{
      messages,
      input,
      setInput,
      loading,
      promptChips,
      sendMessage,
      resetChat
    }}>
      {children}
    </CoachContext.Provider>
  );
}

export function useCoach() {
  const context = useContext(CoachContext);
  if (!context) {
    throw new Error('useCoach must be used within a CoachProvider');
  }
  return context;
}
