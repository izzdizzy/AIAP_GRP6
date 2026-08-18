const STORAGE_KEY = 'readmission-risk-assessment-state';

export function loadStoredReadmissionState() {
  if (typeof window === 'undefined') {
    return { form: null, prediction: null };
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { form: null, prediction: null };
  } catch {
    return { form: null, prediction: null };
  }
}

export function saveStoredReadmissionState(state) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!state || (!state.form && !state.prediction)) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
