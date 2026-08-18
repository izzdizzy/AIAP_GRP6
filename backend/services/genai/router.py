import json
import logging
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any

from .schemas import (
    CoachChatRequest,
    CoachChatResponse,
    ShapExplainRequest,
    ShapExplainResponse,
    ModuleShapExplanation,
    TriageNavigateRequest,
    TriageNavigateResponse,
    UnifiedPatientContext,
)
from .context_aggregator import update_context_summary, format_context_for_prompt
from .knowledge_base import get_relevant_knowledge
from .client import generate_text, is_genai_available

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/genai", tags=["Centralized GenAI Services"])


# =============================================================================
# FEATURE 1: AI HEALTH & LIFESTYLE COACH CHAT
# =============================================================================

COACH_SYSTEM_PROMPT = """
You are an expert AI Health & Lifestyle Coach for a integrated clinical decision-support application in Singapore.
Your goal is to provide actionable risk reduction, dietary guidance, exercise advice, and lifestyle modifications based on the patient's multi-module clinical assessment context.

CRITICAL GUIDELINES:
1. Ground your advice in the provided local health guides and Singapore healthcare context (CHAS subsidies, Healthier SG enrollment, Polyclinics).
2. Adapt your response based on completed modules (CAD, Diabetes, Readmission). If multiple assessments are complete, provide cross-module clinical synthesis (e.g. how blood pressure and cholesterol impact both heart disease and diabetes).
3. Do NOT invent medical diagnoses. Always recommend consulting an enrolled Healthier SG GP or polyclinic doctor for diagnostic decisions.
4. Keep your tone empathetic, encouraging, clear, and structured with concise markdown bullet points.
5. Embed official markdown links when mentioning schemes, e.g. [CHAS](https://www.chas.sg) or [Healthier SG](https://www.moh.gov.sg/healthiersg).
"""


@router.post("/coach/chat", response_model=CoachChatResponse)
async def coach_chat(request: CoachChatRequest) -> CoachChatResponse:
    ctx = update_context_summary(request.context)
    context_text = format_context_for_prompt(ctx)
    knowledge = get_relevant_knowledge(request.message)

    # Reconstruct multi-turn chat history
    history_str = ""
    if request.chat_history:
        history_lines = [f"{msg.role.upper()}: {msg.content}" for msg in request.chat_history[-6:]]
        history_str = f"\nRECENT CHAT HISTORY:\n" + "\n".join(history_lines)

    prompt = f"""
{context_text}

GROUNDED HEALTH GUIDES & KNOWLEDGE BASE:
{knowledge}
{history_str}

PATIENT USER QUESTION:
"{request.message}"

Please provide a warm, encouraging, and highly specific health & lifestyle coaching response tailored to this patient's completed modules and current query.
"""

    # Dynamic prompt chips based on completed modules
    suggested_chips = ["Suggest a low-sodium diet based on my risk"]
    if ctx.cad.completed and ctx.diabetes.completed:
        suggested_chips.append("How do my heart disease and diabetes risks interact?")
    elif ctx.cad.completed:
        suggested_chips.append("How can I safely manage my cholesterol and blood pressure?")
    elif ctx.diabetes.completed:
        suggested_chips.append("What daily blood sugar and dietary habits should I adopt?")

    if ctx.readmission.completed:
        suggested_chips.append("What symptoms require urgent medical attention after discharge?")

    suggested_chips.append("What healthcare subsidies or CHAS options am I eligible for?")

    if not is_genai_available():
        fallback_reply = (
            "[Offline Mode] Based on your current clinical assessment, we recommend:\n\n"
            "• **Dietary Adjustments**: Adopt a balanced low-sodium, low-saturated-fat diet rich in fiber and whole grains.\n"
            "• **Physical Activity**: Aim for 150 minutes of moderate aerobic exercise weekly as approved by your doctor.\n"
            "• **Preventive Care**: Schedule a routine review with your enrolled [Healthier SG](https://www.moh.gov.sg/healthiersg) GP or polyclinic.\n"
            "• **Subsidies**: Check your eligible subsidies via the [CHAS Portal](https://www.chas.sg)."
        )
        return CoachChatResponse(reply=fallback_reply, is_fallback=True, suggested_chips=suggested_chips)

    try:
        reply = generate_text(prompt=prompt, system_instruction=COACH_SYSTEM_PROMPT)
        return CoachChatResponse(reply=reply, is_fallback=False, suggested_chips=suggested_chips)
    except Exception as e:
        logger.error(f"Coach chat LLM error: {e}")
        fallback_reply = (
            f"[Service Temporarily Unavailable] We could not generate a live response. "
            f"Please ensure you adhere to your prescribed care plan and consult your GP if symptoms persist."
        )
        return CoachChatResponse(reply=fallback_reply, is_fallback=True, suggested_chips=suggested_chips)


# =============================================================================
# FEATURE 2: PLAIN-LANGUAGE SHAP & XAI INTERPRETER
# =============================================================================

SHAP_SYSTEM_PROMPT = """
You are a Medical Explainable AI (XAI) Interpreter for clinical decision support systems.
Your job is to translate complex SHAP feature importance values and medical model parameters into plain, calming, non-technical language for patients and primary care clinicians.

INSTRUCTIONS:
1. Analyze the provided SHAP drivers for each completed module in the patient context.
2. Explain what each top feature means in everyday clinical terms and WHY it moved the patient's risk score higher or lower.
3. Group explanations by completed module.
4. Output strict JSON with the following structure:
{
  "overall_summary": "1-2 sentence overview of overall risk drivers",
  "module_explanations": [
    {
      "module_key": "cad",
      "module_name": "CAD Risk Assessment",
      "risk_summary": "Summary of CAD drivers",
      "key_drivers": [
        {
          "feature": "Resting Blood Pressure",
          "impact": 0.45,
          "direction": "increase",
          "explanation": "Your blood pressure reading of 140 mmHg increases cardiovascular workload."
        }
      ]
    }
  ]
}
"""


@router.post("/shap/explain", response_model=ShapExplainResponse)
async def explain_shap(request: ShapExplainRequest) -> ShapExplainResponse:
    ctx = update_context_summary(request.context)
    context_text = format_context_for_prompt(ctx)

    if not is_genai_available():
        # Offline rule-based fallback generator
        module_exps: List[ModuleShapExplanation] = []

        if ctx.cad.completed:
            drivers = []
            top_f = ctx.cad.top_shap_factors or (ctx.cad.prediction_outputs or {}).get("top_factors", [])
            for item in top_f[:4]:
                feat = item.get("feature", "Factor")
                impact = float(item.get("impact", 0.1))
                direction = "increase" if impact > 0 else "decrease"
                drivers.append({
                    "feature": str(feat),
                    "impact": impact,
                    "direction": direction,
                    "explanation": f"{feat} was identified as a primary contributor to your CAD risk score."
                })
            module_exps.append(ModuleShapExplanation(
                module_key="cad",
                module_name="CAD Risk Assessment",
                risk_summary="Key cardiovascular markers contributing to Coronary Artery Disease risk.",
                key_drivers=drivers
            ))

        if ctx.diabetes.completed:
            drivers = []
            top_f = ctx.diabetes.top_shap_factors or (ctx.diabetes.prediction_outputs or {}).get("top_factors", [])
            for item in top_f[:4]:
                if isinstance(item, dict):
                    feat = item.get("feature", "Factor")
                    impact = float(item.get("impact", item.get("shap_value", 0.1)))
                else:
                    feat = str(item)
                    impact = 0.1
                direction = "increase" if impact > 0 else "decrease"
                drivers.append({
                    "feature": str(feat),
                    "impact": impact,
                    "direction": direction,
                    "explanation": f"{feat} plays a significant role in determining your glycemic risk profile."
                })
            module_exps.append(ModuleShapExplanation(
                module_key="diabetes",
                module_name="Diabetes Risk Classifier",
                risk_summary="Metabolic and lifestyle factors influencing diabetes probability.",
                key_drivers=drivers
            ))

        if ctx.readmission.completed:
            drivers = []
            top_f = ctx.readmission.top_shap_factors or (ctx.readmission.prediction_outputs or {}).get("shap_values", [])
            for item in top_f[:4]:
                feat = item.get("display_name", item.get("feature", "Factor"))
                impact = float(item.get("shap_value", 0.1))
                direction = "increase" if impact > 0 else "decrease"
                drivers.append({
                    "feature": str(feat),
                    "impact": impact,
                    "direction": direction,
                    "explanation": f"{feat} reflects recent clinical encounter intensity and post-discharge vulnerability."
                })
            module_exps.append(ModuleShapExplanation(
                module_key="readmission",
                module_name="Hospital Readmission",
                risk_summary="Inpatient encounter parameters driving 30-day hospital readmission risk.",
                key_drivers=drivers
            ))

        return ShapExplainResponse(
            overall_summary="[Offline XAI Summary] Your risk factors highlight key areas where lifestyle and medical management can reduce overall vulnerability.",
            module_explanations=module_exps,
            is_fallback=True
        )

    prompt = f"""
{context_text}

Analyze the SHAP feature impacts for all completed modules above.
Return a valid JSON object strictly matching the schema in the system instructions.
Do not include raw markdown formatting around the JSON string.
"""

    try:
        raw_text = generate_text(prompt=prompt, system_instruction=SHAP_SYSTEM_PROMPT)
        # Clean JSON if wrapped in ```json ... ```
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
        module_exps = [ModuleShapExplanation(**m) for m in data.get("module_explanations", [])]
        return ShapExplainResponse(
            overall_summary=data.get("overall_summary", "SHAP Feature Explanation Summary"),
            module_explanations=module_exps,
            is_fallback=False
        )
    except Exception as e:
        logger.error(f"SHAP explanation LLM error: {e}")
        # Return graceful rule-based fallback
        return ShapExplainResponse(
            overall_summary="Your SHAP risk drivers indicate primary contributions from key clinical measurements.",
            module_explanations=[],
            is_fallback=True
        )


# =============================================================================
# FEATURE 3: CARE TRIAGE & POST-DISCHARGE NAVIGATOR
# =============================================================================

TRIAGE_SYSTEM_PROMPT = """
You are a Clinical Care Triage Navigator for diabetic and cardiovascular patients in Singapore.
Your task is to direct patients to the correct level of care based on clinical urgency, comorbidity burden, readmission severity score, and financial subsidy status (CHAS/Medicare).

CATEGORIZATION RULES:
1. "Immediate Intervention" (Urgency Red): If readmission score > 66 or severe acute symptoms (chest pain, shortness of breath, confusion, severe hyperglycemia/hypoglycemia) are present.
2. "Increased Surveillance" (Urgency Amber): If readmission score is 33-66 or moderate comorbidities / elevated risk scores across 2+ modules exist.
3. "Routine Monitoring" (Urgency Green): If readmission score < 33 and all active modules show low/moderate risk.

OUTPUT FORMAT:
Return strict JSON with this shape:
{
  "urgency_level": "Immediate Intervention" | "Increased Surveillance" | "Routine Monitoring",
  "badge_color": "red" | "amber" | "green",
  "summary": "1-2 sentence clear clinical rationale for this triage level",
  "recommended_facility": "Specific healthcare institution (e.g. Polyclinic Urgent Care / Emergency Dept / Enrolled Healthier SG GP Clinic)",
  "questions_for_doctor": ["Question 1", "Question 2", "Question 3"],
  "discharge_checklist": ["Checklist item 1", "Checklist item 2", "Checklist item 3", "Checklist item 4"]
}
"""


@router.post("/triage/navigate", response_model=TriageNavigateResponse)
async def navigate_triage(request: TriageNavigateRequest) -> TriageNavigateResponse:
    ctx = update_context_summary(request.context)
    context_text = format_context_for_prompt(ctx)

    # Compute rule-based urgency score as baseline
    readmission_score = 0
    if ctx.readmission.completed:
        readmission_score = (ctx.readmission.prediction_outputs or {}).get("clinical_severity_score", 0)

    # Check acute symptoms
    read_inputs = (ctx.readmission.form_inputs or {}) if ctx.readmission.completed else {}
    symptoms = [s.lower() for s in read_inputs.get("symptoms", [])]
    has_acute_symptoms = any(s in ["chest pain", "breathlessness", "dizziness", "severe pain"] for s in symptoms)

    default_urgency = "Routine Monitoring"
    default_badge = "green"
    default_facility = "Enrolled Healthier SG GP Clinic / Local Polyclinic"

    if readmission_score > 66 or has_acute_symptoms:
        default_urgency = "Immediate Intervention"
        default_badge = "red"
        default_facility = "Nearest Public Hospital Emergency Department / Polyclinic Urgent Care"
    elif readmission_score >= 33 or ctx.active_module_count >= 2:
        default_urgency = "Increased Surveillance"
        default_badge = "amber"
        default_facility = "Enrolled Healthier SG GP Clinic (Schedule within 3-7 Days)"

    if not is_genai_available():
        return TriageNavigateResponse(
            urgency_level=default_urgency,
            badge_color=default_badge,
            summary=f"Based on your clinical severity score of {readmission_score}/100 and active module findings, your care triage status is classified as {default_urgency}.",
            recommended_facility=default_facility,
            questions_for_doctor=[
                "Are my current medication dosages optimal given my multi-condition assessment?",
                "What specific warning symptoms should prompt immediate hospital re-evaluation?",
                "How can I enroll in Healthier SG to subsidize my ongoing follow-up visits?"
            ],
            discharge_checklist=[
                "Confirm follow-up appointment date with primary care GP / polyclinic.",
                "Review discharge medication reconciliation sheet and daily dosage schedule.",
                "Monitor blood glucose and blood pressure daily; record in patient log.",
                "Verify eligibility for CHAS subsidy tier at participating clinics."
            ],
            is_fallback=True
        )

    prompt = f"""
{context_text}

Additional User Query: "{request.user_query or 'None'}"

Evaluate the overall clinical urgency and generate the structured Care Triage JSON.
"""

    try:
        raw_text = generate_text(prompt=prompt, system_instruction=TRIAGE_SYSTEM_PROMPT)
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
        cleaned = cleaned.strip()

        data = json.loads(cleaned)
        return TriageNavigateResponse(
            urgency_level=data.get("urgency_level", default_urgency),
            badge_color=data.get("badge_color", default_badge),
            summary=data.get("summary", "Triage summary provided based on clinical parameters."),
            recommended_facility=data.get("recommended_facility", default_facility),
            questions_for_doctor=data.get("questions_for_doctor", []),
            discharge_checklist=data.get("discharge_checklist", []),
            is_fallback=False
        )
    except Exception as e:
        logger.error(f"Triage navigation LLM error: {e}")
        return TriageNavigateResponse(
            urgency_level=default_urgency,
            badge_color=default_badge,
            summary=f"Clinical severity score ({readmission_score}/100) indicates {default_urgency}.",
            recommended_facility=default_facility,
            questions_for_doctor=[
                "How should I adjust my medications if my symptoms change?",
                "When is my next scheduled follow-up at the polyclinic/GP?"
            ],
            discharge_checklist=[
                "Take prescribed medications on time.",
                "Keep a daily log of blood pressure and blood sugar.",
                "Contact 995 immediately if severe chest pain or shortness of breath occurs."
            ],
            is_fallback=True
        )
