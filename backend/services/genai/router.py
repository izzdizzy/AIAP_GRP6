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
from .client import generate_text, is_genai_available, repair_and_parse_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/genai", tags=["Centralized GenAI Services"])


# =============================================================================
# FEATURE 1: AI HEALTH & LIFESTYLE COACH CHAT
# =============================================================================

COACH_SYSTEM_PROMPT = """
You are an expert AI Health & Lifestyle Coach for an integrated clinical decision-support application in Singapore.
Your goal is to provide direct, actionable risk reduction, dietary guidance, exercise advice, and Singapore healthcare navigation.

CRITICAL CONCISENESS & TONE RULES:
1. Direct Answer First: Give a clear, direct answer in the very first sentence (e.g., "Yes, **you can eat eggs**, but in **moderation (3–4 yolks per week)** because your total cholesterol is **240 mg/dL**.").
2. Word Count Cap: Simple user queries (e.g. "can I eat eggs?") MUST be answered in under 150 words total.
3. Direct Address: ALWAYS address the user directly as "you / your". Never use third-person terms like "the patient".
4. Formatting: Use lightweight bullet points with **bold text emphasis** for key numbers and clinical targets. DO NOT generate multi-heading essay reports for simple questions.
5. Grounding: Ground advice in Singapore healthcare schemes ([CHAS](https://www.chas.sg), [Healthier SG](https://www.moh.gov.sg/healthiersg), Polyclinics).
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

Provide a direct, warm, concise response (under 150 words for simple queries). State your direct answer in the first sentence with exact metric callouts.
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
            "Yes, **you can make healthy dietary adjustments** based on your clinical assessment:\n\n"
            "• **Sodium & Cholesterol**: Keep sodium under 2,000 mg/day and limit saturated fats to lower your blood pressure and cholesterol.\n"
            "• **Physical Activity**: Aim for 150 minutes of moderate aerobic exercise weekly as approved by your doctor.\n"
            "• **Subsidies**: Review your eligible subsidies via the [CHAS Portal](https://www.chas.sg) or enroll in [Healthier SG](https://www.moh.gov.sg/healthiersg)."
        )
        return CoachChatResponse(reply=fallback_reply, is_fallback=True, suggested_chips=suggested_chips)

    try:
        reply = generate_text(prompt=prompt, system_instruction=COACH_SYSTEM_PROMPT)
        return CoachChatResponse(reply=reply, is_fallback=False, suggested_chips=suggested_chips)
    except Exception as e:
        logger.error(f"Coach chat LLM error: {e}")
        fallback_reply = (
            f"We are operating in offline mode. Please adhere to your prescribed care plan and consult your Healthier SG GP or polyclinic doctor for personalized guidance."
        )
        return CoachChatResponse(reply=fallback_reply, is_fallback=True, suggested_chips=suggested_chips)


# =============================================================================
# FEATURE 2: PLAIN-LANGUAGE SHAP & XAI INTERPRETER
# =============================================================================

SHAP_SYSTEM_PROMPT = """
You are a Medical Explainable AI (XAI) Interpreter for clinical decision support systems.
Your job is to translate complex SHAP feature importance values and medical model parameters into direct, comforting, patient-centric language ("you / your").

CRITICAL METRIC INJECTION & TONE RULES:
1. Direct Address: ALWAYS address the user directly as "you / your". NEVER use third-person terms like "the patient".
2. Metric Injection: You MUST explicitly include the user's EXACT numeric values from their context in the feature title and explanation (e.g., "**240 mg/dL**", "**3 inpatient visits**", "**140 mmHg**", "**BMI 31.2**").
3. Comparative Benchmark: Compare their exact value to standard clinical targets (e.g., "your cholesterol is **240 mg/dL**; ideal target is under **200 mg/dL**").
4. Concise Explanation: Explain in 1-2 simple sentences why this specific number pushed their risk score higher or lower.

OUTPUT JSON SCHEMA:
Return strict JSON with this exact structure:
{
  "overall_summary": "1-2 sentence cross-assessment summary directly addressing the user ('Across your completed assessments...')",
  "module_explanations": [
    {
      "module_key": "cad" | "diabetes" | "readmission",
      "module_name": "CAD Risk Assessment",
      "risk_summary": "1 sentence overview",
      "key_drivers": [
        {
          "feature": "Serum Cholesterol — 240 mg/dL",
          "impact": 0.45,
          "direction": "increase",
          "explanation": "Your cholesterol reading is **240 mg/dL** (ideal target is under **200 mg/dL**). This is currently the primary factor pushing your heart risk score higher."
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
        # Offline rule-based fallback generator with explicit metric injection
        module_exps: List[ModuleShapExplanation] = []

        if ctx.cad.completed:
            cad_inp = ctx.cad.form_inputs or {}
            drivers = [
                {
                    "feature": f"Serum Cholesterol — {cad_inp.get('chol', 240)} mg/dL",
                    "impact": 0.45,
                    "direction": "increase",
                    "explanation": f"Your serum cholesterol reading is **{cad_inp.get('chol', 240)} mg/dL** (ideal target is under **200 mg/dL**). This is currently the primary factor pushing your heart risk score higher."
                },
                {
                    "feature": f"Resting Blood Pressure — {cad_inp.get('trestbps', 140)} mmHg",
                    "impact": 0.35,
                    "direction": "increase",
                    "explanation": f"Your resting blood pressure reading of **{cad_inp.get('trestbps', 140)} mmHg** is above the optimal target of **120/80 mmHg**, increasing cardiovascular workload."
                }
            ]
            module_exps.append(ModuleShapExplanation(
                module_key="cad",
                module_name="CAD Risk Assessment",
                risk_summary="Key cardiovascular markers contributing to your Coronary Artery Disease risk.",
                key_drivers=drivers
            ))

        if ctx.diabetes.completed:
            diab_inp = ctx.diabetes.form_inputs or {}
            drivers = [
                {
                    "feature": f"Body Mass Index (BMI) — {diab_inp.get('BMI', 31.2)}",
                    "impact": 0.40,
                    "direction": "increase",
                    "explanation": f"Your BMI reading of **{diab_inp.get('BMI', 31.2)}** is in the elevated range (healthy benchmark is **18.5–22.9**), influencing your glycemic risk profile."
                },
                {
                    "feature": f"High Blood Pressure History — {'Yes' if diab_inp.get('HighBP') == 1 else 'No'}",
                    "impact": 0.30,
                    "direction": "increase",
                    "explanation": "Having a history of high blood pressure closely interacts with insulin resistance and diabetes risk."
                }
            ]
            module_exps.append(ModuleShapExplanation(
                module_key="diabetes",
                module_name="Diabetes Risk Classifier",
                risk_summary="Metabolic and physical parameters driving your diabetes risk calculation.",
                key_drivers=drivers
            ))

        if ctx.readmission.completed:
            read_inp = ctx.readmission.form_inputs or {}
            inpatient_count = read_inp.get("number_inpatient", 3)
            time_hosp = read_inp.get("time_in_hospital", 5)
            drivers = [
                {
                    "feature": f"Past Hospitalizations — {inpatient_count} Inpatient Visits",
                    "impact": 0.50,
                    "direction": "increase",
                    "explanation": f"You have had **{inpatient_count} hospital stays** over the past year. Having multiple overnight admissions increases your readmission probability."
                },
                {
                    "feature": f"Length of Hospital Stay — {time_hosp} Days",
                    "impact": 0.30,
                    "direction": "increase",
                    "explanation": f"Your recent hospital stay of **{time_hosp} days** indicates higher clinical encounter complexity."
                }
            ]
            module_exps.append(ModuleShapExplanation(
                module_key="readmission",
                module_name="Hospital Readmission",
                risk_summary="Recent clinical encounter factors influencing your 30-day hospital readmission risk.",
                key_drivers=drivers
            ))

        return ShapExplainResponse(
            overall_summary="[Offline XAI Summary] Across your completed assessments, your specific clinical measurements highlight key areas where targeted lifestyle and medical management can reduce your overall risk.",
            module_explanations=module_exps,
            is_fallback=True
        )

    prompt = f"""
{context_text}

Analyze the SHAP feature impacts for all completed modules above.
Return a valid JSON object strictly matching the schema in the system instructions.
You MUST explicitly include the patient's EXACT numeric values (e.g. "**240 mg/dL**", "**3 inpatient visits**") in every driver explanation.
Do not include raw markdown formatting around the JSON string.
"""

    try:
        raw_text = generate_text(prompt=prompt, system_instruction=SHAP_SYSTEM_PROMPT, json_mode=True)
        data = repair_and_parse_json(raw_text)
        module_exps = [ModuleShapExplanation(**m) for m in data.get("module_explanations", [])]
        return ShapExplainResponse(
            overall_summary=data.get("overall_summary", "SHAP Feature Explanation Summary"),
            module_explanations=module_exps,
            is_fallback=False
        )
    except Exception as e:
        logger.error(f"SHAP explanation LLM error: {e}")
        return ShapExplainResponse(
            overall_summary="Your key health measurements provide clear insights into your current risk drivers.",
            module_explanations=[],
            is_fallback=True
        )


# =============================================================================
# FEATURE 3: CARE TRIAGE & POST-DISCHARGE NAVIGATOR
# =============================================================================

TRIAGE_SYSTEM_PROMPT = """
You are a Clinical Care Triage Navigator for diabetic and cardiovascular patients in Singapore.
Your task is to direct users to the correct level of care based on clinical urgency, comorbidity burden, readmission severity score, and financial subsidy status (CHAS/Medicare).

CRITICAL TONE & PATIENT-CENTRIC RULES:
1. Direct Address: NEVER speak in the third person ("the patient exhibits..."). Always address the user directly as "you / your".
2. Plain-Language Translation: Convert complex clinical instructions into simple, warm, second-person action steps (e.g. change "Ensure acute shortness of breath and fluid retention are clinically stabilized prior to discharge" to "1. Make sure that your **shortness of breath** and **fluid retention** are stable before you leave the hospital.").
3. Metric & Symptom Injection: Inject the patient's specific reported symptoms and numerical metrics directly into questions and checklist items.

OUTPUT JSON SCHEMA:
Return strict JSON with this exact shape:
{
  "urgency_level": "Immediate Intervention" | "Increased Surveillance" | "Routine Monitoring",
  "badge_color": "red" | "amber" | "green",
  "summary": "1-2 sentence clear clinical rationale addressing the user directly ('Your Clinical Severity Score of 45/100 indicates moderate risk...')",
  "recommended_facility": "Specific healthcare institution (e.g. Enrolled Healthier SG GP Clinic / Polyclinic Urgent Care)",
  "questions_for_doctor": [
    "💡 1. Symptoms & Fluid Check: 'Are my **shortness of breath** and **leg swelling** related to fluid retention or heart strain?'",
    "💡 2. Medication Dosing: 'Do my **diuretic (water pill)** doses need to be adjusted before I go home?'"
  ],
  "discharge_checklist": [
    "Make sure that your shortness of breath and fluid retention are stable before leaving.",
    "Confirm follow-up appointment date with your primary care GP / polyclinic within 7 days.",
    "Verify your eligible subsidies under your CHAS tier at participating clinics."
  ]
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
        default_facility = "Enrolled Healthier SG GP Clinic (Schedule within 3–7 Days)"

    symptom_text = ", ".join(symptoms) if symptoms else "your reported symptoms"

    if not is_genai_available():
        return TriageNavigateResponse(
            urgency_level=default_urgency,
            badge_color=default_badge,
            summary=f"Based on your Clinical Severity Score of {readmission_score}/100 and active module findings, your care triage status is classified as {default_urgency}.",
            recommended_facility=default_facility,
            questions_for_doctor=[
                f"💡 1. Symptom Review: 'Are my **{symptom_text}** related to fluid retention, blood pressure, or medication side effects?'",
                "💡 2. Medication Dosing: 'Do my current medication dosages need to be adjusted before I go home?'",
                "💡 3. Subsidies & Screening: 'How can I enroll in Healthier SG to subsidize my ongoing follow-up visits?'"
            ],
            discharge_checklist=[
                f"Make sure that your **{symptom_text}** are stable before leaving.",
                "Confirm your follow-up appointment date with your Healthier SG GP / polyclinic within 7 days.",
                "Review your discharge medication sheet and keep a daily log of blood pressure and blood sugar.",
                "Verify your subsidy eligibility at participating CHAS clinics."
            ],
            is_fallback=True
        )

    prompt = f"""
{context_text}

Additional User Query: "{request.user_query or 'None'}"

Evaluate the overall clinical urgency and generate the structured Care Triage JSON.
Address the user directly as "you / your" and inject their exact symptoms and metrics into doctor questions and checklist items.
"""

    try:
        raw_text = generate_text(prompt=prompt, system_instruction=TRIAGE_SYSTEM_PROMPT, json_mode=True)
        data = repair_and_parse_json(raw_text)
        return TriageNavigateResponse(
            urgency_level=data.get("urgency_level", default_urgency),
            badge_color=data.get("badge_color", default_badge),
            summary=data.get("summary", f"Your Clinical Severity Score of {readmission_score}/100 indicates {default_urgency}."),
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
            summary=f"Your Clinical Severity Score of {readmission_score}/100 indicates {default_urgency}.",
            recommended_facility=default_facility,
            questions_for_doctor=[
                f"💡 1. Symptom Review: 'Are my **{symptom_text}** stable?'",
                "💡 2. Next Steps: 'When should I schedule my follow-up appointment?'"
            ],
            discharge_checklist=[
                "Take prescribed medications on time.",
                "Keep a daily log of blood pressure and blood sugar.",
                "Contact 995 immediately if severe chest pain or shortness of breath occurs."
            ],
            is_fallback=True
        )
