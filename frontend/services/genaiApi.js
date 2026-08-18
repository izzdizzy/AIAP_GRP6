import { apiClient } from './apiClient';

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
