import os
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


def generate_text(prompt: str, system_instruction: Optional[str] = None, model: str = "gemini-3.6-flash") -> str:
    """
    Sends a text prompt to Gemini LLM with robust error handling.
    """
    if not is_genai_available():
        raise RuntimeError("GenAI API client is not configured or GEMINI_KEY is missing.")

    if GENAI_SDK_TYPE == "google.genai":
        from google.genai import types
        config = types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=2048,
            system_instruction=system_instruction
        )
        response = GENAI_CLIENT.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        return response.text.strip()
    elif GENAI_SDK_TYPE == "google.generativeai":
        gen_model = GENAI_CLIENT.GenerativeModel(
            model_name=model,
            system_instruction=system_instruction
        )
        response = gen_model.generate_content(prompt)
        return response.text.strip()
    else:
        raise RuntimeError("No valid GenAI SDK available.")
