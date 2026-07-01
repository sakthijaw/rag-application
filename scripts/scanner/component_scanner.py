"""
Component Scanner — Step 1

Recursively walks the Astro component library directory and generates
a structured inventory of every discovered component.

Responsibilities:
  - Walk directory tree respecting ignore rules from config
  - Parse each .astro file to extract basic structural information
  - Detect exported TypeScript Props interface names
  - Produce a serialisable ComponentInventory dataclass
"""

from __future__ import annotations

import json
import logging
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterator

import yaml

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────

@dataclass
class ComponentInfo:
    """Represents a single discovered Astro component."""

    component_name: str
    """PascalCase name derived from the file stem (e.g. 'Button')."""

    file_path: str
    """Relative path from the project root (forward slashes)."""

    absolute_path: str
    """Absolute filesystem path (for reading the file later)."""

    extension: str
    """File extension, always '.astro' for now."""

    category: str
    """Parent folder name used as the component category (e.g. 'ui', 'layout')."""

    folder: str
    """Relative path of the containing directory."""

    exports: list[str]
    """Exported TypeScript interface / type names found in the frontmatter."""

    has_props_interface: bool
    """True when an exported Props interface was detected."""

    has_slots: bool
    """True when at least one <slot> tag was found in the template."""

    has_script: bool
    """True when a client-side <script> block exists."""

    line_count: int
    """Total number of lines in the file."""

    file_size_bytes: int
    """File size in bytes."""


@dataclass
class ComponentInventory:
    """Full scan result for the component library."""

    total_components: int
    categories: list[str]
    components: list[ComponentInfo]
    scan_metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


# ─────────────────────────────────────────────
# Scanner configuration
# ─────────────────────────────────────────────

@dataclass
class ScannerConfig:
    """Typed config slice for the scanner (loaded from settings.yaml)."""

    components_dir: Path
    supported_extensions: list[str]
    ignored_dirs: list[str]
    ignored_prefixes: list[str]
    output_file: Path


def load_scanner_config(settings_path: Path, project_root: Path) -> ScannerConfig:
    """Parse settings.yaml and return a ScannerConfig instance."""
    with open(settings_path, encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)

    cfg = raw["scanner"]
    return ScannerConfig(
        components_dir=project_root / cfg["components_dir"],
        supported_extensions=cfg["supported_extensions"],
        ignored_dirs=set(cfg["ignored_dirs"]),
        ignored_prefixes=cfg["ignored_prefixes"],
        output_file=project_root / cfg["output_file"],
    )


# ─────────────────────────────────────────────
# Regex patterns for .astro frontmatter parsing
# ─────────────────────────────────────────────

# Matches the fenced frontmatter block: --- ... ---
_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)^---\s*\n", re.DOTALL | re.MULTILINE)

# Matches exported interface/type declarations inside frontmatter
_EXPORT_RE = re.compile(
    r"export\s+(?:interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)",
    re.MULTILINE,
)

# Checks whether a <slot> tag exists anywhere in the file
_SLOT_RE = re.compile(r"<slot\b", re.IGNORECASE)

# Checks whether a client-side <script> (not define:vars) exists
_SCRIPT_RE = re.compile(r"<script(?!\s+is:inline\s+define:vars)\b", re.IGNORECASE)


# ─────────────────────────────────────────────
# Scanner implementation
# ─────────────────────────────────────────────

class ComponentScanner:
    """
    Scans an Astro component library directory and builds a ComponentInventory.

    Usage::

        scanner = ComponentScanner(config, project_root)
        inventory = scanner.scan()
        scanner.save(inventory)
    """

    def __init__(self, config: ScannerConfig, project_root: Path) -> None:
        self.config = config
        self.project_root = project_root
        self.logger = logging.getLogger(self.__class__.__name__)

    # ── Public API ────────────────────────────────────────────

    def scan(self) -> ComponentInventory:
        """Walk the component directory and return a full inventory."""
        components_dir = self.config.components_dir

        if not components_dir.exists():
            raise FileNotFoundError(
                f"Component directory not found: {components_dir}\n"
                "Check 'scanner.components_dir' in config/settings.yaml."
            )

        self.logger.info("Scanning: %s", components_dir)

        components: list[ComponentInfo] = []
        skipped = 0

        for path in self._walk(components_dir):
            try:
                info = self._parse_file(path)
                components.append(info)
                self.logger.debug("Found: %s", info.file_path)
            except Exception as exc:
                self.logger.warning("Could not parse %s — %s", path, exc)
                skipped += 1

        categories = sorted({c.category for c in components})

        inventory = ComponentInventory(
            total_components=len(components),
            categories=categories,
            components=components,
            scan_metadata={
                "components_dir": str(components_dir),
                "skipped_files": skipped,
                "extensions_scanned": self.config.supported_extensions,
            },
        )

        self.logger.info(
            "Scan complete — %d components across %d categories (%d skipped)",
            inventory.total_components,
            len(categories),
            skipped,
        )
        return inventory

    def save(self, inventory: ComponentInventory) -> Path:
        """Serialise the inventory to JSON and write it to the configured output path."""
        output = self.config.output_file
        output.parent.mkdir(parents=True, exist_ok=True)

        with open(output, "w", encoding="utf-8") as fh:
            json.dump(inventory.to_dict(), fh, indent=2, ensure_ascii=False)

        self.logger.info("Inventory saved → %s", output)
        return output

    # ── Directory walker ──────────────────────────────────────

    def _walk(self, root: Path) -> Iterator[Path]:
        """
        Yield .astro files under *root* while skipping ignored directories
        and files whose names start with an ignored prefix.
        """
        for entry in sorted(root.iterdir()):
            # Skip ignored directories (case-insensitive)
            if entry.is_dir():
                if self._should_ignore_dir(entry):
                    self.logger.debug("Skipping dir: %s", entry.name)
                    continue
                yield from self._walk(entry)

            elif entry.is_file():
                if self._should_ignore_file(entry):
                    continue
                if entry.suffix in self.config.supported_extensions:
                    yield entry

    def _should_ignore_dir(self, path: Path) -> bool:
        name = path.name
        return (
            name in self.config.ignored_dirs
            or any(name.startswith(p) for p in self.config.ignored_prefixes)
        )

    def _should_ignore_file(self, path: Path) -> bool:
        name = path.name
        return any(name.startswith(p) for p in self.config.ignored_prefixes)

    # ── File parser ───────────────────────────────────────────

    def _parse_file(self, path: Path) -> ComponentInfo:
        """Extract structural metadata from a single .astro file."""
        raw = path.read_text(encoding="utf-8", errors="replace")
        lines = raw.splitlines()

        # Category = direct parent folder name (e.g. 'ui', 'layout')
        category = path.parent.name

        # Relative paths (use forward slashes for consistency)
        rel_path = path.relative_to(self.project_root).as_posix()
        rel_folder = path.parent.relative_to(self.project_root).as_posix()

        # Parse frontmatter
        frontmatter = self._extract_frontmatter(raw)
        exports = self._extract_exports(frontmatter)
        has_props = any("Props" in name for name in exports)

        return ComponentInfo(
            component_name=path.stem,            # filename without extension
            file_path=rel_path,
            absolute_path=str(path),
            extension=path.suffix,
            category=category,
            folder=rel_folder,
            exports=exports,
            has_props_interface=has_props,
            has_slots=bool(_SLOT_RE.search(raw)),
            has_script=bool(_SCRIPT_RE.search(raw)),
            line_count=len(lines),
            file_size_bytes=path.stat().st_size,
        )

    @staticmethod
    def _extract_frontmatter(content: str) -> str:
        """Return the text inside the opening --- ... --- fences, or empty string."""
        match = _FRONTMATTER_RE.match(content)
        return match.group(1) if match else ""

    @staticmethod
    def _extract_exports(frontmatter: str) -> list[str]:
        """Return all exported interface/type names from the frontmatter block."""
        return _EXPORT_RE.findall(frontmatter)
