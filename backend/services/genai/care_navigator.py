"""
Care Navigator Service Module
Triage Care Guidance and Dynamic Google Maps Link Generator for Healthcare Navigation.
"""

from urllib.parse import quote_plus
from typing import Dict, Any, Optional, List
from .client import genai_client
from .context_builder import UnifiedPatientContext, build_unified_context, format_conversation_history
import re


def build_google_maps_url(subsidy_tier: Optional[str], facility_type: str = "Polyclinic") -> str:
    """
    Constructs dynamic Google Maps search URLs matching the pattern:
    https://www.google.com/maps/search/?api=1&query={Subsidy_Tier}+{Facility_Type}+near+me
    Omits subsidy tier if unprovided or not specified.
    """
    tier_str = (subsidy_tier or "").strip()
    if not tier_str or tier_str.lower() in ("not provided", "unprovided", "none", "n/a", "not_provided"):
        query_str = f"{facility_type} near me"
    else:
        query_str = f"{tier_str} {facility_type} near me"
    encoded_query = quote_plus(query_str)
    return f"https://www.google.com/maps/search/?api=1&query={encoded_query}"

class CareNavigatorService:
    """
    Care navigator assistant for patient triage, post-discharge navigation,
    and Singapore healthcare scheme routing (CHAS, Healthier SG, Polyclinics).
    """

    def generate_navigation_advice(
        self,
        context: UnifiedPatientContext,
        user_query: Optional[str] = None,
        history: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Generates care triage advice with dynamic CLINIC_MAP_LINK or TRIAGE_CHECKLIST widget.
        """
        query_str = user_query or "Where should I seek medical care given my current symptoms and subsidy tier?"
        history_str = format_conversation_history(history)

        subsidy = context.demographics.subsidy_tier or "CHAS Green"
        urgency = context.ml_scores.readmission_risk_level or "Routine Monitoring"
        symptoms = context.form_metrics.active_symptoms

        facility_type = "Hospital Emergency Department" if urgency == "Immediate Intervention" else "Polyclinic"
        maps_url = build_google_maps_url(subsidy, facility_type)

        system_prompt = f"""
You are the Care Navigator & Triage Assistant for Singapore healthcare patients.
Your role is to evaluate the patient's symptoms, clinical severity scores, and subsidy tier to guide them to the right healthcare facility.

GLOBAL SYSTEM PERSONA & RESPONSE TONE RULES:
1. CONCISENESS: strictly UNDER 150 WORDS using clean Markdown bullet points.
2. DIRECT SECOND-PERSON TONE: Always address the patient directly using "you" / "your". NEVER use third-person clinical jargon.
3. MEDICAL DISCLAIMER: Avoid diagnostic statements. Focus strictly on decision support and triage.
4. NO HEADERS: DO NOT use markdown headers (#, ##, ###). Use bold text (**text**) for emphasis instead.
5. CLINICAL SEVERITY METRIC: If referencing the score, describe it as a "Clinical Severity Score of [X] out of 100". NEVER describe it as a percentage or probability.

CRITICAL CONTEXT & OFFICIAL KNOWLEDGE BASE LINKS:
1. CHAS (Community Health Assist Scheme):
   - CHAS Blue: Lower-income households (monthly income per person <= $1,200)
   - CHAS Orange: Middle-income households (monthly income per person <= $2,000)
   - CHAS Green: Higher-income households (all Singaporeans not covered by Blue/Orange)
   - Subsidies apply at participating GP clinics for chronic disease management.
   - Link: [CHAS](https://www.chas.sg)

2. Healthier SG:
   - National preventive care initiative where patients enroll with a dedicated family physician (GP).
   - Link: [Healthier SG](https://www.moh.gov.sg/healthiersg)

3. Polyclinic Network:
   - Government-subsidized primary care centers operated by NHG, SingHealth, and NUHS.
   - Link: [MOH Polyclinics](https://www.moh.gov.sg)

4. Medication Assistance Fund (MAF):
   - Subsidises costly medicines for eligible, means-tested patients via medical social service offices.
   - Link: [Medication Assistance Fund](https://www.moh.gov.sg/costs-and-claims/medication-assistance-fund)

5. Emergency Services & Helplines:
   - Call **995** for emergency ambulance service (life-threatening emergencies).
   - Call **1777** for non-emergency ambulance service.
   - Link: [MOH Emergency Guidance](https://www.moh.gov.sg)

LINK EMBEDDING & FORMATTING INSTRUCTIONS:
- Whenever you mention a scheme or service above (CHAS, Healthier SG, Polyclinics, MAF, MOH), you MUST embed its official link using standard Markdown syntax: `[Scheme Name](URL)`.
- Do NOT output raw URLs or guess URLs outside of this provided list.

COLOUR EMPHASIS RULES (USE SPARSELY - MAX 1-2 PER RESPONSE):
- Use `{{red: critical action}}` for urgent actions requiring immediate emergency care or A&E visits.
- Use `{{amber: caution point}}` for monitoring advice, symptoms to watch, or scheduling early follow-ups.
- Use `{{green: reassurance}}` for normal/OK status, routine management, or positive reinforcement.

CLINICAL SEVERITY & URGENCY TRIAGE GUIDELINES:
- Routine Monitoring (Low Urgency, Score < 33): Focus on standard [Healthier SG](https://www.moh.gov.sg/healthiersg) GP follow-ups and routine medication adherence. {{green: Maintain regular appointments.}}
- Increased Surveillance (Moderate Urgency, Score 33-66): Recommend scheduling an earlier follow-up with a [CHAS](https://www.chas.sg) GP or polyclinic. {{amber: Monitor symptoms closely.}}
- Immediate Intervention (High Urgency, Score > 66): High clinical severity requiring prompt action. {{red: Seek immediate medical attention at a polyclinic or A&E / Call 995 if life-threatening.}}

DYNAMIC CONTEXT:
- Maps URL: {maps_url}
- Patient Subsidy Tier: {subsidy}
- Urgency: {urgency}
- Symptoms: {', '.join(symptoms) if symptoms else 'None'}

REQUIRED JSON SCHEMA:
{{
  "message": "<Care triage narrative under 150 words. Must use embedded markdown links from Knowledge Base when mentioning schemes, and optional colour markup.>",
  "widget": {{
    "type": "CLINIC_MAP_LINK" | "TRIAGE_CHECKLIST",
    "data": {{ ... }}
  }}
}}

WIDGET SPECIFICATIONS:
- If type is "CLINIC_MAP_LINK":
  data: {{
    "facility_type": "{facility_type}",
    "subsidy_tier": "{subsidy}",
    "url": "{maps_url}",
    "label": "Find Nearby {subsidy} {facility_type}s"
  }}
- If type is "TRIAGE_CHECKLIST":
  data: {{
    "title": "Post-Discharge Care Navigation Checklist",
    "urgency": "{urgency}",
    "tasks": [
      {{"id": "1", "task": "Book follow-up appointment at nearest Polyclinic / CHAS GP", "completed": false}},
      {{"id": "2", "task": "Bring current discharge medication list to consultation", "completed": false}}
    ]
  }}
"""

        prompt = f"""
PATIENT CONTEXT:
{context.to_prompt_summary()}

CONVERSATION HISTORY SUMMARY:
{history_str}

PATIENT QUERY:
{query_str}

Please generate the JSON response now.
"""

        fallback_widget = {
            "type": "CLINIC_MAP_LINK",
            "data": {
                "facility_type": facility_type,
                "subsidy_tier": subsidy,
                "url": maps_url,
                "label": f"Find Nearby {subsidy} {facility_type}s on Google Maps"
            }
        }

        fallback_payload = {
            "message": (
                f"**Care Navigation Assessment ({urgency})**:\n\n"
                f"Based on your clinical severity score ({context.ml_scores.readmission_severity_score or '30'}/100) and reported symptoms, "
                f"we recommend seeking consultation at a subsidized healthcare facility matching your **{subsidy}** status.\n\n"
                f"**Recommended Action**:\n"
                f"- If experiencing acute chest pain or severe shortness of breath, go immediately to the nearest A&E or call 995.\n"
                f"- For routine or moderate follow-up, book an appointment at your enrolled Healthier SG GP or local Polyclinic."
            ),
            "widget": fallback_widget
        }

        return genai_client.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            fallback_data=fallback_payload
        )


def get_care_navigator_service() -> CareNavigatorService:
    return CareNavigatorService()
