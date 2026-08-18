import { apiClient } from './apiClient';

const CACHE_KEY = 'ai-insights-cache-v1';
const COOLDOWN_MS = 30000; // 30 second cooldown

/**
 * Builds a standardized Unified Patient Context object from raw module states.
 * Dynamically handles 1 to 3 completed assessments.
 */
export function buildUnifiedContext({ cadState, readmissionForm, readmissionPrediction, diabetesForm, diabetesPrediction }) {
  const cadCompleted = Boolean(cadState?.prediction);
  const diabetesCompleted = Boolean(diabetesPrediction);
  const readmissionCompleted = Boolean(readmissionPrediction);

  const activeCount = (cadCompleted ? 1 : 0) + (diabetesCompleted ? 1 : 0) + (readmissionCompleted ? 1 : 0);

  return {
    active_module_count: Math.max(1, activeCount),
    cad: {
      completed: cadCompleted,
      assessment_name: 'CAD Risk Assessment',
      form_inputs: cadState?.assessmentForm || null,
      prediction_outputs: cadState?.prediction || null,
      top_shap_factors: cadState?.prediction?.top_factors || null
    },
    diabetes: {
      completed: diabetesCompleted,
      assessment_name: 'Diabetes Risk Classifier',
      form_inputs: diabetesForm || null,
      prediction_outputs: diabetesPrediction || null,
      top_shap_factors: diabetesPrediction?.top_factors || null
    },
    readmission: {
      completed: readmissionCompleted,
      assessment_name: 'Hospital Readmission',
      form_inputs: readmissionForm || null,
      prediction_outputs: readmissionPrediction || null,
      top_shap_factors: readmissionPrediction?.shap_values || null
    },
    overall_clinical_summary: ''
  };
}

/**
 * Session storage cache getters & setters
 */
export function getCachedAiInsights() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

export function setCachedAiInsights(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('Failed to save AI Insights cache:', err);
  }
}

/**
 * Pre-fetches SHAP XAI and Care Triage responses in the background.
 * Uses 30-second cooldown to avoid unnecessary API re-fetches.
 */
export async function prefetchAiInsights(context, force = false) {
  const cached = getCachedAiInsights();
  const now = Date.now();

  if (!force && cached && cached.timestamp && (now - cached.timestamp < COOLDOWN_MS) && cached.activeModuleCount === context.active_module_count) {
    return cached;
  }

  try {
    const [shapRes, triageRes] = await Promise.all([
      fetchShapExplanation(context).catch(err => ({ error: err.message, is_fallback: true })),
      fetchCareTriage(context).catch(err => ({ error: err.message, is_fallback: true }))
    ]);

    const cachePayload = {
      timestamp: now,
      activeModuleCount: context.active_module_count,
      shapData: shapRes,
      triageData: triageRes
    };

    setCachedAiInsights(cachePayload);
    return cachePayload;
  } catch (err) {
    console.error('Background prefetch failed:', err);
    return cached;
  }
}

/**
 * Feature 1: AI Health & Lifestyle Coach Chat
 */
export async function sendCoachMessage(context, message, chatHistory = []) {
  return apiClient('/api/v1/genai/coach/chat', {
    method: 'POST',
    body: JSON.stringify({
      context,
      message,
      chat_history: chatHistory
    })
  });
}

/**
 * Feature 2: Plain-Language SHAP & XAI Interpreter
 */
export async function fetchShapExplanation(context) {
  return apiClient('/api/v1/genai/shap/explain', {
    method: 'POST',
    body: JSON.stringify({ context })
  });
}

/**
 * Feature 3: Care Triage & Post-Discharge Navigator
 */
export async function fetchCareTriage(context, userQuery = '') {
  return apiClient('/api/v1/genai/triage/navigate', {
    method: 'POST',
    body: JSON.stringify({
      context,
      user_query: userQuery
    })
  });
}
