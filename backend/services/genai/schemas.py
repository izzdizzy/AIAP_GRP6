from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class ModuleAssessmentContext(BaseModel):
    completed: bool = False
    assessment_name: str
    form_inputs: Optional[Dict[str, Any]] = None
    prediction_outputs: Optional[Dict[str, Any]] = None
    top_shap_factors: Optional[List[Dict[str, Any]]] = None


class UnifiedPatientContext(BaseModel):
    active_module_count: int = Field(default=1, ge=1, le=3)
    cad: ModuleAssessmentContext = Field(
        default_factory=lambda: ModuleAssessmentContext(assessment_name="CAD Risk")
    )
    diabetes: ModuleAssessmentContext = Field(
        default_factory=lambda: ModuleAssessmentContext(assessment_name="Diabetes Classifier")
    )
    readmission: ModuleAssessmentContext = Field(
        default_factory=lambda: ModuleAssessmentContext(assessment_name="Hospital Readmission")
    )
    overall_clinical_summary: str = ""


# Feature 1: Coach Chat Schemas
class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "model"]
    content: str


class CoachChatRequest(BaseModel):
    context: UnifiedPatientContext
    message: str
    chat_history: Optional[List[ChatMessage]] = Field(default_factory=list)


class CoachChatResponse(BaseModel):
    reply: str
    is_fallback: bool = False
    suggested_chips: Optional[List[str]] = None


# Feature 2: SHAP Interpreter Schemas
class ModuleShapExplanation(BaseModel):
    module_key: str  # "cad", "diabetes", "readmission"
    module_name: str
    risk_summary: str
    key_drivers: List[Dict[str, Any]]  # feature, impact, explanation, direction ("increase"/"decrease")


class ShapExplainRequest(BaseModel):
    context: UnifiedPatientContext


class ShapExplainResponse(BaseModel):
    overall_summary: str
    module_explanations: List[ModuleShapExplanation]
    is_fallback: bool = False


# Feature 3: Care Triage & Post-Discharge Navigator Schemas
class TriageNavigateRequest(BaseModel):
    context: UnifiedPatientContext
    user_query: Optional[str] = ""


class TriageNavigateResponse(BaseModel):
    urgency_level: Literal["Immediate Intervention", "Increased Surveillance", "Routine Monitoring"]
    badge_color: Literal["red", "amber", "green"]
    summary: str
    recommended_facility: str
    questions_for_doctor: List[str]
    discharge_checklist: List[str]
    is_fallback: bool = False
