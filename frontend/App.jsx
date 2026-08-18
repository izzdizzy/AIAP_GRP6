import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell';
import LandingPage from './pages/LandingPage';

// CAD
import AssessmentPage from './features/cad/pages/AssessmentPage';
import ResultsPage from './features/cad/pages/ResultsPage';
import ChatPage from './features/cad/pages/ChatbotPage';
import { submitAssessment } from './features/cad/services/predictionService';
import {
  loadStoredAssessmentState,
  saveStoredAssessmentState
} from './features/cad/utils/storage';

// Readmission
import PatientForm from './features/readmission/components/PatientForm';
import ReadmissionResults from './features/readmission/components/ReadmissionResults';
import { predictReadmission } from './features/readmission/services/api';
import {
  loadStoredReadmissionState,
  saveStoredReadmissionState
} from './features/readmission/utils/storage';

// Diabetes
import DiabetesPage from './features/diabetes/pages/DiabetesPage';
import DiabetesResults from './features/diabetes/components/DiabetesResults';
import { predictRisk as predictDiabetesRisk } from './features/diabetes/services/api';
import {
  loadStoredDiabetesState,
  saveStoredDiabetesState
} from './features/diabetes/utils/storage';

// Centralized GenAI
import CoachDrawer from './components/genai/CoachDrawer';
import AiInsightsPage from './pages/AiInsightsPage';
import { buildUnifiedContext, prefetchAiInsights } from './services/genaiApi';
import { CoachProvider } from './context/CoachContext';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // GenAI Coach Drawer State
  const [isCoachOpen, setIsCoachOpen] = useState(false);

  // CAD State
  const [assessmentState, setAssessmentState] = useState(() => loadStoredAssessmentState());
  const [cadLoading, setCadLoading] = useState(false);

  // Readmission State
  const [readmissionState, setReadmissionState] = useState(() => loadStoredReadmissionState());
  const readmissionForm = readmissionState?.form ?? null;
  const readmissionPrediction = readmissionState?.prediction ?? null;
  const [readmissionLoading, setReadmissionLoading] = useState(false);

  // Diabetes State
  const [diabetesState, setDiabetesState] = useState(() => loadStoredDiabetesState());
  const diabetesForm = diabetesState?.form ?? null;
  const diabetesPrediction = diabetesState?.prediction ?? null;
  const [diabetesLoading, setDiabetesLoading] = useState(false);

  useEffect(() => {
    saveStoredAssessmentState(assessmentState);
  }, [assessmentState]);

  useEffect(() => {
    saveStoredReadmissionState(readmissionState);
  }, [readmissionState]);

  useEffect(() => {
    saveStoredDiabetesState(diabetesState);
  }, [diabetesState]);

  // CAD Handlers
  async function handleSubmitCAD(values) {
    setCadLoading(true);
    try {
      const formValues = structuredClone(values);
      const response = await submitAssessment(values);
      const nextCadState = {
        ...response,
        assessmentForm: formValues,
        sessionId: null,
        chatMessages: []
      };
      setAssessmentState(nextCadState);

      // Background pre-fetch of AI Insights
      const nextContext = buildUnifiedContext({
        cadState: nextCadState,
        readmissionForm,
        readmissionPrediction,
        diabetesForm,
        diabetesPrediction
      });
      prefetchAiInsights(nextContext, true).catch(() => {});

      navigate('/cad/results');
    } catch (error) {
      alert(error.message || 'Failed to calculate CAD risk.');
    } finally {
      setCadLoading(false);
    }
  }

  // Readmission Handlers
  async function handleSubmitReadmission(values) {
    setReadmissionLoading(true);
    try {
      const formValues = structuredClone(values);
      const result = await predictReadmission(values);
      const nextReadmissionState = { form: formValues, prediction: result };
      setReadmissionState(nextReadmissionState);

      // Background pre-fetch of AI Insights
      const nextContext = buildUnifiedContext({
        cadState: assessmentState,
        readmissionForm: formValues,
        readmissionPrediction: result,
        diabetesForm,
        diabetesPrediction
      });
      prefetchAiInsights(nextContext, true).catch(() => {});

      navigate('/readmission/results');
    } catch (error) {
      alert(error.message || 'Failed to calculate readmission risk.');
    } finally {
      setReadmissionLoading(false);
    }
  }

  // Diabetes Handlers
  async function handleSubmitDiabetes(values) {
    setDiabetesLoading(true);
    try {
      const formValues = structuredClone(values);
      const result = await predictDiabetesRisk(values);
      const nextDiabetesState = { form: formValues, prediction: result };
      setDiabetesState(nextDiabetesState);

      // Background pre-fetch of AI Insights
      const nextContext = buildUnifiedContext({
        cadState: assessmentState,
        readmissionForm,
        readmissionPrediction,
        diabetesForm: formValues,
        diabetesPrediction: result
      });
      prefetchAiInsights(nextContext, true).catch(() => {});

      navigate('/diabetes/results');
    } catch (error) {
      alert(error.message || 'Failed to calculate diabetes risk.');
    } finally {
      setDiabetesLoading(false);
    }
  }

  const cadCompleted = Boolean(assessmentState?.prediction);
  const readmissionCompleted = Boolean(readmissionPrediction);
  const diabetesCompleted = Boolean(diabetesPrediction);

  const unifiedContext = buildUnifiedContext({
    cadState: assessmentState,
    readmissionForm,
    readmissionPrediction,
    diabetesForm,
    diabetesPrediction
  });

  const isLanding = location.pathname === '/' || location.pathname === '/home';

  if (isLanding) {
    return (
      <LandingPage
        onStartCADAssessment={() => navigate('/cad/assessment')}
        onStartReadmissionAssessment={() => navigate('/readmission/assessment')}
        onStartDiabetesAssessment={() => navigate('/diabetes/assessment')}
      />
    );
  }

  return (
    <CoachProvider>
      <AppShell
        cadCompleted={cadCompleted}
        readmissionCompleted={readmissionCompleted}
        diabetesCompleted={diabetesCompleted}
        activeModuleCount={unifiedContext.active_module_count}
        onOpenCoach={() => setIsCoachOpen(true)}
      >
        <Routes>
          {/* CAD Routes */}
          <Route
            path="/cad/assessment"
            element={
              <AssessmentPage
                onSubmitAssessment={handleSubmitCAD}
                loading={cadLoading}
                onCancel={() => navigate('/')}
                initialValues={assessmentState?.assessmentForm}
              />
            }
          />
          <Route
            path="/cad/results"
            element={
              <ResultsPage
                assessmentState={assessmentState}
                unifiedContext={unifiedContext}
                onRestart={() => {
                  setAssessmentState(null);
                  navigate('/');
                }}
                onEditAssessment={() => navigate('/cad/assessment')}
                onOpenChat={() => setIsCoachOpen(true)}
              />
            }
          />
          <Route
            path="/cad/chat"
            element={
              <ChatPage
                assessmentState={assessmentState}
                setAssessmentState={setAssessmentState}
                chatMessages={assessmentState?.chatMessages ?? []}
                setChatMessages={(updater) => {
                  setAssessmentState(prev => {
                    if (!prev) return prev;
                    const current = prev.chatMessages ?? [];
                    const next = typeof updater === 'function' ? updater(current) : updater;
                    return { ...prev, chatMessages: next };
                  });
                }}
                onBack={() => navigate('/cad/results')}
              />
            }
          />

          {/* Readmission Routes */}
          <Route
            path="/readmission/assessment"
            element={
              <PatientForm
                onSubmit={handleSubmitReadmission}
                loading={readmissionLoading}
                initialValues={readmissionForm}
              />
            }
          />
          <Route
            path="/readmission/results"
            element={
              <ReadmissionResults
                prediction={readmissionPrediction}
                unifiedContext={unifiedContext}
                onResetPrediction={() => {
                  setReadmissionState({ form: null, prediction: null });
                  navigate('/readmission/assessment');
                }}
                onBackToLanding={() => navigate('/')}
                onOpenChat={() => setIsCoachOpen(true)}
              />
            }
          />

          {/* Diabetes Routes */}
          <Route
            path="/diabetes/assessment"
            element={
              <DiabetesPage
                onSubmitAssessment={handleSubmitDiabetes}
                loading={diabetesLoading}
                initialValues={diabetesForm}
              />
            }
          />
          <Route
            path="/diabetes/results"
            element={
              <DiabetesResults
                prediction={diabetesPrediction}
                unifiedContext={unifiedContext}
                onResetPrediction={() => {
                  setDiabetesState({ form: null, prediction: null });
                  navigate('/diabetes/assessment');
                }}
                onBackToLanding={() => navigate('/')}
                onOpenChat={() => setIsCoachOpen(true)}
              />
            }
          />

          {/* Dedicated Centralized AI Insights Hub */}
          <Route
            path="/ai-insights"
            element={
              <AiInsightsPage
                unifiedContext={unifiedContext}
              />
            }
          />

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>

      <CoachDrawer
        isOpen={isCoachOpen}
        onClose={() => setIsCoachOpen(false)}
        unifiedContext={unifiedContext}
      />
    </CoachProvider>
  );
}
