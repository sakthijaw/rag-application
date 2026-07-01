"""
Shared configuration loader.

Resolves the project root (the directory containing config/settings.yaml)
regardless of which directory the script is invoked from.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

logger = logging.getLogger(__name__)


def find_project_root() -> Path:
    """
    Walk upward from this file until we find a directory that contains
    both 'config/settings.yaml' and 'components/'.  Falls back to the
    PROJECT_ROOT env var if set.
    """
    env_root = os.getenv("PROJECT_ROOT")
    if env_root:
        return Path(env_root).resolve()

    # Start from this file's location and walk up
    candidate = Path(__file__).resolve().parent
    for _ in range(6):  # max 6 levels up
        if (candidate / "config" / "settings.yaml").exists():
            return candidate
        candidate = candidate.parent

    raise FileNotFoundError(
        "Could not locate project root (no config/settings.yaml found). "
        "Set the PROJECT_ROOT environment variable or run from the project directory."
    )


def load_settings(project_root: Path | None = None) -> dict:
    """Load and return the full settings.yaml as a dict."""
    root = project_root or find_project_root()
    settings_path = root / "config" / "settings.yaml"

    with open(settings_path, encoding="utf-8") as fh:
        settings = yaml.safe_load(fh)

    return settings


def setup_logging(settings: dict) -> None:
    """Configure root logger from settings."""
    log_cfg = settings.get("logging", {})
    level = getattr(logging, log_cfg.get("level", "INFO").upper(), logging.INFO)
    fmt = log_cfg.get("format", "%(asctime)s [%(levelname)s] %(name)s — %(message)s")
    datefmt = log_cfg.get("date_format", "%Y-%m-%d %H:%M:%S")

    logging.basicConfig(level=level, format=fmt, datefmt=datefmt)


def load_env(project_root: Path | None = None) -> None:
    """Load .env file from the project root."""
    root = project_root or find_project_root()
    env_file = root / ".env"
    if env_file.exists():
        load_dotenv(env_file)
        logger.debug("Loaded .env from %s", env_file)
    else:
        logger.debug("No .env file found at %s; skipping.", env_file)
