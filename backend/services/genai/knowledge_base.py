from pathlib import Path
from typing import Dict, List, Set

DOCUMENTS_DIR = Path(__file__).resolve().parent.parent.parent / "features" / "cad" / "documents"

DOC_CACHE: Dict[str, str] = {}


def _load_documents():
    if DOC_CACHE:
        return
    if DOCUMENTS_DIR.exists():
        for file in DOCUMENTS_DIR.glob("*.txt"):
            if file.name != "system_prompt.txt":
                DOC_CACHE[file.name] = file.read_text(encoding="utf-8").strip()


_load_documents()

SINGAPORE_HEALTHCARE_KNOWLEDGE = """
SINGAPORE HEALTHCARE SYSTEM & POLICY CONTEXT:
1. CHAS (Community Health Assist Scheme):
   - CHAS Blue: Lower-income (monthly household income per person <= $1,200). Highest subsidies for chronic care.
   - CHAS Orange: Middle-income (monthly household income per person <= $2,000). Moderate subsidies.
   - CHAS Green: All Singaporeans not covered by Blue/Orange. Subsidies for selected chronic conditions at CHAS GPs.
   - Official Link: [CHAS Portal](https://www.chas.sg)

2. Healthier SG Initiative:
   - National preventive care program launched in 2023.
   - Citizens enroll with a chosen family physician / GP for long-term personalized health plans.
   - Free annual health screenings and subsidized chronic medications at enrolled clinics.
   - Official Link: [Healthier SG](https://www.moh.gov.sg/healthiersg)

3. Polyclinics & Primary Care Networks:
   - Government-subsidized primary care centers (SingHealth, NHG, NUHS).
   - Direct referrals to public hospital specialists and comprehensive chronic care management.
   - Official Link: [MOH Polyclinic Guide](https://www.moh.gov.sg)

4. Medication Assistance Fund (MAF) & MediSave:
   - Financial assistance for expensive, high-cost standard and non-standard chronic drugs.
   - MediSave can be drawn down for outpatient chronic disease treatments under CDMP.
   - Official Link: [MOH Financial Assistance](https://www.moh.gov.sg/costs-and-claims/medication-assistance-fund)

5. Emergency & Care Triage Protocols:
   - Emergency Ambulance: Call 995 for life-threatening symptoms (chest pain, stroke, severe breathlessness).
   - Non-Emergency Transport: Call 1777 for non-urgent transfers.
   - Polyclinics & 24-hr Urgent Care Centers: For acute but non-life-threatening conditions.
"""

KEYWORD_MAP = {
    "Heart Health Basic Dietary Guidelines.txt": [
        "eat", "food", "diet", "meal", "nutrition", "rice", "bread", "meat", "beef",
        "pork", "chicken", "fish", "vegetable", "fruit", "salt", "sodium", "fat",
        "oil", "sugar", "sweet", "carb", "carbohydrate", "protein", "cholesterol"
    ],
    "Cholesterol and Heart Disease.txt": [
        "cholesterol", "ldl", "hdl", "triglyceride", "plaque", "artery", "arteries",
        "fat", "saturate", "trans fat", "egg", "seafood", "prawn", "squid", "organ",
        "dairy", "milk", "cheese", "butter"
    ],
    "High Blood Pressure Healthy Eating Guide.txt": [
        "pressure", "blood pressure", "hypertension", "bp", "salt", "sodium",
        "sauce", "canned", "process", "gravy", "soup", "msg"
    ],
    "Alcohol and Smoking.txt": [
        "smoke", "smoking", "cigarette", "tobacco", "nicotine", "vape", "vaping",
        "alcohol", "beer", "wine", "liquor", "spirit", "drink", "drinking"
    ]
}


def get_relevant_knowledge(query_text: str = "") -> str:
    """
    Retrieves matching grounded text guides and appends Singapore healthcare policy context.
    """
    _load_documents()
    query_lower = query_text.lower()
    matched_docs: Set[str] = set()

    for doc_name, keywords in KEYWORD_MAP.items():
        for kw in keywords:
            if kw in query_lower:
                matched_docs.add(doc_name)
                break

    if not matched_docs:
        matched_docs.add("How to Keep Your Heart Healthy The Essential Dos and Donts.txt")

    sections: List[str] = [SINGAPORE_HEALTHCARE_KNOWLEDGE]

    for doc in matched_docs:
        content = DOC_CACHE.get(doc)
        if content:
            sections.append(f"\n--- LOCAL HEALTH GUIDE: {doc} ---\n{content}")

    return "\n\n".join(sections)
