from typing import Dict, Any, List
from .schemas import UnifiedPatientContext, ModuleAssessmentContext


def format_context_for_prompt(context: UnifiedPatientContext) -> str:
    """
    Builds a structured text block representing the patient's multi-module assessment state.
    Gracefully handles partial assessments (1 to 3 completed modules).
    """
    lines = []
    lines.append(f"PATIENT ASSESSMENT OVERVIEW ({context.active_module_count} of 3 Modules Completed)")
    lines.append("=" * 60)

    # 1. CAD Module Context
    if context.cad.completed:
        cad_out = context.cad.prediction_outputs or {}
        cad_inp = context.cad.form_inputs or {}
        lines.append("\n[MODULE 1: CAD (Coronary Artery Disease) Risk]")
        lines.append(f" Status: Completed")
        lines.append(f" Risk Level: {cad_out.get('risk_level', 'N/A')}")
        lines.append(f" Risk Probability: {cad_out.get('risk_percent', cad_out.get('risk_probability', 0))}%")
        lines.append(f" Patient Profile: Age {cad_inp.get('age', 'N/A')}, Sex {'Male' if cad_inp.get('sex') == 1 else 'Female'}, Resting BP: {cad_inp.get('trestbps', 'N/A')} mmHg, Cholesterol: {cad_inp.get('chol', 'N/A')} mg/dL")
        top_f = context.cad.top_shap_factors or cad_out.get("top_factors", [])
        if top_f:
            f_str = ", ".join([f"{f.get('feature', f.get('label', 'factor'))} ({f.get('impact', f.get('value', 0)):+.2f})" for f in top_f[:5]])
            lines.append(f" Top Influential Drivers: {f_str}")
    else:
        lines.append("\n[MODULE 1: CAD Risk] Status: Not Completed (Optional/Null)")

    # 2. Diabetes Module Context
    if context.diabetes.completed:
        diab_out = context.diabetes.prediction_outputs or {}
        diab_inp = context.diabetes.form_inputs or {}
        lines.append("\n[MODULE 2: Diabetes Risk Classifier]")
        lines.append(f" Status: Completed")
        lines.append(f" Risk Band: {diab_out.get('risk_band', 'N/A')} ({diab_out.get('risk_label', 'N/A')})")
        lines.append(f" Risk Probability: {round(float(diab_out.get('risk_probability', 0)) * 100, 1)}%")
        lines.append(f" Patient Profile: High BP: {'Yes' if diab_inp.get('HighBP') == 1 else 'No'}, High Chol: {'Yes' if diab_inp.get('HighChol') == 1 else 'No'}, BMI: {diab_inp.get('BMI', 'N/A')}, Smoker: {'Yes' if diab_inp.get('Smoker') == 1 else 'No'}")
        top_f = context.diabetes.top_shap_factors or diab_out.get("top_factors", [])
        if top_f:
            f_str = ", ".join([
                f"{f.get('feature', f.get('label', 'factor'))} ({f.get('impact', f.get('shap_value', f.get('importance', 0))):+.2f})"
                if isinstance(f, dict) else str(f)
                for f in top_f[:5]
            ])
            lines.append(f" Top Influential Drivers: {f_str}")
    else:
        lines.append("\n[MODULE 2: Diabetes Classifier] Status: Not Completed (Optional/Null)")

    # 3. Hospital Readmission Module Context
    if context.readmission.completed:
        read_out = context.readmission.prediction_outputs or {}
        read_inp = context.readmission.form_inputs or {}
        lines.append("\n[MODULE 3: Hospital Readmission Risk]")
        lines.append(f" Status: Completed")
        lines.append(f" Urgency Level: {read_out.get('urgency_level', 'N/A')}")
        lines.append(f" Clinical Severity Score: {read_out.get('clinical_severity_score', 'N/A')}/100")
        lines.append(f" Readmission Risk Category: {read_out.get('risk_category', read_out.get('prediction_label', 'N/A'))}")
        symptoms = read_inp.get("symptoms") or []
        lines.append(f" Patient Symptoms: {', '.join(symptoms) if symptoms else 'None reported'}")
        lines.append(f" Financial Subsidy Tier: {read_inp.get('chas_tier', 'Standard / Unknown')}")
        top_f = context.readmission.top_shap_factors or read_out.get("shap_values", [])
        if top_f:
            f_str = ", ".join([f"{f.get('display_name', f.get('feature', 'factor'))} (SHAP {f.get('shap_value', 0):+.2f})" for f in top_f[:5]])
            lines.append(f" Top Influential Drivers: {f_str}")
    else:
        lines.append("\n[MODULE 3: Hospital Readmission] Status: Not Completed (Optional/Null)")

    # Synthesize Cross-Module Synthesis Note
    completed_names = []
    if context.cad.completed: completed_names.append("CAD")
    if context.diabetes.completed: completed_names.append("Diabetes")
    if context.readmission.completed: completed_names.append("Readmission")

    lines.append("\n" + "=" * 60)
    lines.append(f"CROSS-MODULE SYNTHESIS NOTICE:")
    if len(completed_names) > 1:
        lines.append(f" Patient has completed multiple assessments ({', '.join(completed_names)}).Synthesize recommendations holistically across these correlated risk factors.")
    else:
        lines.append(f" Patient has completed 1 assessment ({completed_names[0] if completed_names else 'None'}). Provide targeted advice based on available data, without assuming missing modules.")

    return "\n".join(lines)


def update_context_summary(context: UnifiedPatientContext) -> UnifiedPatientContext:
    """Calculates active_module_count and generates overall_clinical_summary."""
    active_count = sum([
        1 if context.cad.completed else 0,
        1 if context.diabetes.completed else 0,
        1 if context.readmission.completed else 0,
    ])
    context.active_module_count = max(1, active_count)
    context.overall_clinical_summary = format_context_for_prompt(context)
    return context
