import os
import re
import json
import logging
from typing import Dict, Any, List, Optional

from ...config import settings

logger = logging.getLogger(__name__)

# Try loading new google.genai SDK first, then google.generativeai
GENAI_CLIENT = None
GENAI_SDK_TYPE = None

try:
    from google import genai
    from google.genai import types
    if settings.GEMINI_KEY:
        GENAI_CLIENT = genai.Client(api_key=settings.GEMINI_KEY)
        GENAI_SDK_TYPE = "google.genai"
        logger.info("[GenAI Service] Initialized with google.genai SDK.")
except Exception as e:
    logger.warning(f"[GenAI Service] google.genai client init failed: {e}")

if not GENAI_CLIENT:
    try:
        import google.generativeai as legacy_genai
        if settings.GEMINI_KEY:
            legacy_genai.configure(api_key=settings.GEMINI_KEY)
            GENAI_CLIENT = legacy_genai
            GENAI_SDK_TYPE = "google.generativeai"
            logger.info("[GenAI Service] Initialized with google.generativeai SDK.")
    except Exception as e:
        logger.warning(f"[GenAI Service] google.generativeai client init failed: {e}")


def is_genai_available() -> bool:
    return GENAI_CLIENT is not None and bool(settings.GEMINI_KEY)


def repair_and_parse_json(text: str) -> Dict[str, Any]:
    """
    Cleans and repairs common LLM JSON syntax anomalies (codeblocks, trailing commas, unescaped quotes/newlines).
    """
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[1]
        if cleaned.endswith("```"):
            cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    # Attempt 1: Standard json.loads
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Extract JSON object substring {...}
    start = cleaned.find('{')
    end = cleaned.rfind('}')
    if start != -1 and end != -1 and end > start:
        cleaned_obj = cleaned[start:end+1]
        try:
            return json.loads(cleaned_obj)
        except json.JSONDecodeError:
            pass

        # Repair trailing commas before } or ]
        repaired = re.sub(r',\s*([}\]])', r'\1', cleaned_obj)
        try:
            return json.loads(repaired)
        except json.JSONDecodeError:
            pass

        # Repair unescaped newlines inside string literals
        repaired = re.sub(
            r'(?<=: ")(.*?)(?=",\s*"|\s*})',
            lambda m: m.group(1).replace('\n', '\\n'),
            repaired,
            flags=re.DOTALL
        )
        try:
            return json.loads(repaired)
        except json.JSONDecodeError as err:
            logger.error(f"[JSON Repair] Failed to parse JSON even after repairs: {err}. Raw text snippet: {cleaned[:300]}")
            raise err
    else:
        raise ValueError("No JSON object found in response.")


def generate_text(
    prompt: str,
    system_instruction: Optional[str] = None,
    model: str = "gemini-3.6-flash",
    json_mode: bool = False
) -> str:
    """
    Sends a text prompt to Gemini LLM with robust error handling and optional json_mode.
    """
    if not is_genai_available():
        raise RuntimeError("GenAI API client is not configured or GEMINI_KEY is missing.")

    if GENAI_SDK_TYPE == "google.genai":
        from google.genai import types
        config_kwargs = {
            "temperature": 0.1,
            "max_output_tokens": 2048,
            "system_instruction": system_instruction
        }
        if json_mode:
            config_kwargs["response_mime_type"] = "application/json"

        config = types.GenerateContentConfig(**config_kwargs)
        response = GENAI_CLIENT.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text.strip()
    elif GENAI_SDK_TYPE == "google.generativeai":
        gen_kwargs = {
            "model_name": model,
            "system_instruction": system_instruction
        }
        if json_mode:
            gen_kwargs["generation_config"] = {"response_mime_type": "application/json", "temperature": 0.1}

        gen_model = GENAI_CLIENT.GenerativeModel(**gen_kwargs)
        response = gen_model.generate_content(prompt)
        return response.text.strip()
    else:
        raise RuntimeError("No valid GenAI SDK available.")
