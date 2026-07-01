"""
Metadata Extractor — Step 2

Reads each .astro component file and extracts or infers structured metadata:
  - Description          (from JSDoc @component block)
  - Props                (from TypeScript Props interface + destructuring defaults)
  - Slots                (from @slot JSDoc tags + <slot> elements in template)
  - Accessibility notes  (from @accessibility JSDoc tag)
  - Tags                 (via TagGenerator)
  - Import path          (derived from file path)
  - Usage example        (generated from props + slots)
  - Confidence score     (based on richness of extracted data)
  - needs_review flag    (confidence below threshold)

Extraction is purely source-based — nothing is invented.
If data cannot be found, the field is left empty and confidence decreases.
"""

from __future__ import annotations

import json
import logging
import re
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from .tag_generator import TagGenerator

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Data models
# ─────────────────────────────────────────────

@dataclass
class PropInfo:
    """A single prop extracted from the TypeScript Props interface."""

    name: str
    type: str
    required: bool
    default: str         # Empty string if no default found
    description: str     # From JSDoc comment above the prop


@dataclass
class SlotInfo:
    """A single slot found via @slot JSDoc tag or <slot> element."""

    name: str            # "default" for the unnamed slot
    description: str


@dataclass
class ComponentMetadata:
    """Full structured metadata for one Astro component."""

    component_name: str
    category: str
    description: str
    import_path: str
    file_path: str
    props: list[PropInfo]
    slots: list[SlotInfo]
    events: list[str]
    accessibility_notes: str
    tags: list[str]
    dependencies: list[str]
    usage_example: str
    confidence: float
    needs_review: bool
    extraction_notes: list[str]

    def to_dict(self) -> dict:
        return asdict(self)


# ─────────────────────────────────────────────
# Regex patterns
# ─────────────────────────────────────────────

# Fenced frontmatter block
_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)^---\s*\n", re.DOTALL | re.MULTILINE)

# First JSDoc block (the component-level block)
_MAIN_JSDOC_RE = re.compile(r"/\*\*(.*?)\*/", re.DOTALL)

# `export interface Props {` opening — captures everything after the brace
_PROPS_OPEN_RE = re.compile(r"export\s+interface\s+Props\s*\{")

# Destructuring: `const { ... } = Astro.props;`
_DESTRUCTURE_RE = re.compile(r"const\s*\{([^}]+)\}\s*=\s*Astro\.props", re.DOTALL)

# One default in the destructuring: `propName = value,`
_DEFAULT_RE = re.compile(
    r"(\w+)(?:\s*:\s*\w+)?\s*=\s*([^,\n\}]+)",
    re.MULTILINE,
)

# Single prop definition line: `propName?: type;`
_PROP_LINE_RE = re.compile(r"^(\w+)(\??):\s*(.+?)(?:;.*)?\s*$")

# <slot> elements in template
_SLOT_ELEM_RE = re.compile(
    r"""<slot\s*(?:name=['"](\w+)['"])?\s*/?>""",
    re.IGNORECASE,
)

# import statements in frontmatter
_IMPORT_RE = re.compile(
    r"""import\s+\w+\s+from\s+['"]([^'"]+\.astro)['"]""",
    re.MULTILINE,
)


# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────

@dataclass
class MetadataConfig:
    inventory_file: Path
    output_file: Path
    confidence_threshold: float = 0.60


def load_metadata_config(settings: dict, project_root: Path) -> MetadataConfig:
    cfg = settings["metadata"]
    return MetadataConfig(
        inventory_file=project_root / cfg["input_file"],
        output_file=project_root / cfg["output_file"],
        confidence_threshold=cfg["confidence_threshold"],
    )


# ─────────────────────────────────────────────
# MetadataExtractor
# ─────────────────────────────────────────────

class MetadataExtractor:
    """
    Extracts rich metadata from Astro component source files.

    Usage::

        extractor = MetadataExtractor(config, project_root)
        result = extractor.extract_all()
        extractor.save(result)
    """

    def __init__(
        self,
        config: MetadataConfig,
        project_root: Path,
    ) -> None:
        self.config = config
        self.project_root = project_root
        self.tag_gen = TagGenerator()
        self.logger = logging.getLogger(self.__class__.__name__)

    # ── Public API ────────────────────────────────────────────

    def extract_all(self) -> dict:
        """Load inventory and extract metadata for every component."""
        inventory = self._load_inventory()
        components = inventory["components"]

        results: list[dict] = []
        needs_review_count = 0

        for comp in components:
            self.logger.debug("Extracting: %s", comp["component_name"])
            try:
                meta = self._extract_one(comp)
                results.append(meta.to_dict())
                if meta.needs_review:
                    needs_review_count += 1
                    self.logger.warning(
                        "Needs review (confidence=%.2f): %s",
                        meta.confidence,
                        meta.component_name,
                    )
            except Exception as exc:
                self.logger.error("Failed to extract %s: %s", comp["component_name"], exc)

        categories = sorted({r["category"] for r in results})

        output = {
            "total_components": len(results),
            "extraction_date": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "fully_extracted": len(results) - needs_review_count,
                "needs_review": needs_review_count,
                "categories": categories,
            },
            "components": results,
        }

        self.logger.info(
            "Extraction complete — %d components, %d need review",
            len(results),
            needs_review_count,
        )
        return output

    def save(self, data: dict) -> Path:
        """Write metadata to JSON file."""
        out = self.config.output_file
        out.parent.mkdir(parents=True, exist_ok=True)
        with open(out, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2, ensure_ascii=False)
        self.logger.info("Metadata saved -> %s", out)
        return out

    # ── Single-component extraction ───────────────────────────

    def _extract_one(self, inv_entry: dict) -> ComponentMetadata:
        """Extract full metadata from one component's source file."""
        path = Path(inv_entry["absolute_path"])
        raw = path.read_text(encoding="utf-8", errors="replace")

        frontmatter = self._get_frontmatter(raw)
        template = raw[raw.find("---", 3) + 3:]  # everything after closing ---

        notes: list[str] = []

        # ── Parse main JSDoc ──────────────────────────────────
        jsdoc = self._parse_main_jsdoc(frontmatter)

        description = jsdoc.get("description", "")
        if not description:
            description = self._infer_description(inv_entry["component_name"])
            notes.append("description inferred from component name")

        # ── Props ─────────────────────────────────────────────
        defaults = self._extract_defaults(frontmatter)
        props = self._parse_props_interface(frontmatter, defaults)

        if not props:
            notes.append("no Props interface found")

        # ── Slots ─────────────────────────────────────────────
        slots = self._merge_slots(
            jsdoc_slots=jsdoc.get("slots", []),
            template=template,
        )

        # ── Accessibility ─────────────────────────────────────
        accessibility = jsdoc.get("accessibility", "")

        # ── Dependencies (imported .astro files) ──────────────
        dependencies = self._extract_dependencies(frontmatter)

        # ── Import path ───────────────────────────────────────
        import_path = self._build_import_path(inv_entry["file_path"])

        # ── Tags ──────────────────────────────────────────────
        tags = self.tag_gen.generate(
            component_name=inv_entry["component_name"],
            category=inv_entry["category"],
            description=description,
            prop_names=[p.name for p in props],
            slot_names=[s.name for s in slots],
        )

        # ── Usage example ─────────────────────────────────────
        usage_example = self._generate_usage_example(
            component_name=inv_entry["component_name"],
            import_path=import_path,
            props=props,
            slots=slots,
        )

        # ── Confidence ────────────────────────────────────────
        confidence = self._score_confidence(
            has_description=bool(description and "inferred" not in " ".join(notes)),
            has_props=bool(props),
            has_slots=bool(slots),
            has_accessibility=bool(accessibility),
            tag_count=len(tags),
        )
        needs_review = confidence < self.config.confidence_threshold

        return ComponentMetadata(
            component_name=inv_entry["component_name"],
            category=inv_entry["category"],
            description=description,
            import_path=import_path,
            file_path=inv_entry["file_path"],
            props=props,
            slots=slots,
            events=[],
            accessibility_notes=accessibility,
            tags=tags,
            dependencies=dependencies,
            usage_example=usage_example,
            confidence=round(confidence, 3),
            needs_review=needs_review,
            extraction_notes=notes,
        )

    # ── Frontmatter parsing ───────────────────────────────────

    @staticmethod
    def _get_frontmatter(content: str) -> str:
        m = _FRONTMATTER_RE.match(content)
        return m.group(1) if m else ""

    @staticmethod
    def _parse_main_jsdoc(frontmatter: str) -> dict:
        """
        Parse the component-level JSDoc block at the top of the frontmatter.

        Extracts:
          - description
          - accessibility
          - slots (list of (name, description) tuples)
        """
        result: dict = {
            "description": "",
            "accessibility": "",
            "slots": [],
        }

        m = _MAIN_JSDOC_RE.search(frontmatter)
        if not m:
            return result

        raw_lines = m.group(1).split("\n")
        # Strip leading * and whitespace from each line
        lines = [
            re.sub(r"^\s*\*\s?", "", ln).rstrip()
            for ln in raw_lines
        ]

        desc_parts: list[str] = []

        for line in lines:
            if line.startswith("@component"):
                continue  # we get name from the file
            elif line.startswith("@category"):
                continue  # we get category from directory
            elif line.startswith("@accessibility"):
                result["accessibility"] = line[len("@accessibility"):].strip()
            elif line.startswith("@slot"):
                # @slot name - description
                slot_m = re.match(r"@slot\s+(\w+)\s*[-–]?\s*(.*)", line)
                if slot_m:
                    result["slots"].append(
                        (slot_m.group(1).strip(), slot_m.group(2).strip())
                    )
            elif not line.startswith("@") and line.strip():
                desc_parts.append(line.strip())

        # Clean up: strip leading "ComponentName - " or "ComponentName — "
        raw_desc = " ".join(desc_parts).strip()
        # Remove component name prefix (e.g. "Button - description")
        raw_desc = re.sub(r"^[A-Z]\w+\s*[-–]\s*", "", raw_desc).strip()
        result["description"] = raw_desc
        return result

    def _parse_props_interface(
        self, frontmatter: str, defaults: dict[str, str]
    ) -> list[PropInfo]:
        """Extract props from the TypeScript `export interface Props { ... }` block."""
        # Locate the opening brace of Props
        open_m = _PROPS_OPEN_RE.search(frontmatter)
        if not open_m:
            return []

        # Walk character-by-character to find the matching closing brace
        start = open_m.end()  # position just after the opening {
        body = self._extract_balanced_block(frontmatter, start)
        if body is None:
            return []

        return self._parse_interface_body(body, defaults)

    @staticmethod
    def _extract_balanced_block(text: str, start: int) -> Optional[str]:
        """
        Starting right after an opening `{`, find the matching `}` by depth-counting.
        Returns the content between the braces (exclusive).
        """
        depth = 1
        i = start
        while i < len(text) and depth > 0:
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
            i += 1
        if depth != 0:
            return None
        return text[start : i - 1]

    @staticmethod
    def _parse_interface_body(body: str, defaults: dict[str, str]) -> list[PropInfo]:
        """Line-by-line parse of a Props interface body."""
        props: list[PropInfo] = []
        lines = body.split("\n")
        current_desc = ""
        jsdoc_lines: list[str] = []
        in_jsdoc = False

        for raw_line in lines:
            stripped = raw_line.strip()

            if not stripped:
                if not in_jsdoc:
                    current_desc = ""
                continue

            # JSDoc start
            if stripped.startswith("/**"):
                in_jsdoc = True
                jsdoc_lines = []
                # Single-line: /** description */
                if stripped.endswith("*/"):
                    inner = stripped[3:-2].strip().lstrip("* ").strip()
                    current_desc = inner
                    in_jsdoc = False
                continue

            # JSDoc end
            if in_jsdoc and "*/" in stripped:
                in_jsdoc = False
                current_desc = " ".join(jsdoc_lines)
                continue

            # Inside JSDoc
            if in_jsdoc:
                content = stripped.lstrip("* ").strip()
                if content and not content.startswith("@"):
                    jsdoc_lines.append(content)
                continue

            # Skip // comments
            if stripped.startswith("//"):
                continue

            # Match prop definition: propName?: type; or propName: type;
            pm = _PROP_LINE_RE.match(stripped)
            if pm:
                name = pm.group(1)
                optional = bool(pm.group(2))
                type_str = pm.group(3).strip().rstrip(";").strip()

                props.append(
                    PropInfo(
                        name=name,
                        type=type_str,
                        required=not optional,
                        default=defaults.get(name, ""),
                        description=current_desc,
                    )
                )
                current_desc = ""

        return props

    @staticmethod
    def _extract_defaults(frontmatter: str) -> dict[str, str]:
        """
        Extract default values from the `const { ... } = Astro.props` destructuring.
        Returns { propName: defaultValue } mapping.
        """
        m = _DESTRUCTURE_RE.search(frontmatter)
        if not m:
            return {}

        body = m.group(1)
        defaults: dict[str, str] = {}
        for dm in _DEFAULT_RE.finditer(body):
            name = dm.group(1).strip()
            value = dm.group(2).strip().rstrip(",").strip()
            defaults[name] = value
        return defaults

    @staticmethod
    def _merge_slots(
        jsdoc_slots: list[tuple[str, str]],
        template: str,
    ) -> list[SlotInfo]:
        """
        Combine @slot JSDoc tags with <slot> elements found in the template.
        JSDoc descriptions take precedence; template-only slots get empty descriptions.
        """
        slot_map: dict[str, str] = {}

        # JSDoc slots first (higher quality)
        for name, desc in jsdoc_slots:
            slot_map[name] = desc

        # Supplement with template <slot> elements
        for m in _SLOT_ELEM_RE.finditer(template):
            name = m.group(1) or "default"
            if name not in slot_map:
                slot_map[name] = ""

        return [SlotInfo(name=n, description=d) for n, d in slot_map.items()]

    @staticmethod
    def _extract_dependencies(frontmatter: str) -> list[str]:
        """Return list of .astro files imported in the frontmatter."""
        return [m.group(1) for m in _IMPORT_RE.finditer(frontmatter)]

    @staticmethod
    def _build_import_path(file_path: str) -> str:
        """Convert 'components/ui/Button.astro' → '@/components/ui/Button.astro'."""
        return f"@/{file_path}"

    # ── Usage example generator ───────────────────────────────

    def _generate_usage_example(
        self,
        component_name: str,
        import_path: str,
        props: list[PropInfo],
        slots: list[SlotInfo],
    ) -> str:
        """Generate a concise, realistic Astro usage snippet."""
        # Determine which props to show
        skip_props = {"class", "style", "id"}
        show_props: list[PropInfo] = []

        for p in props:
            if p.name in skip_props:
                continue
            if p.required:
                show_props.append(p)
            elif len(show_props) < 3:
                show_props.append(p)

        show_props = show_props[:4]

        # Build prop attribute strings
        attr_lines = []
        for p in show_props:
            val = self._sample_value(p)
            if val:
                attr_lines.append(f"  {p.name}={val}")

        attrs = "\n".join(attr_lines)

        # Build slot content
        named_slots = [s for s in slots if s.name != "default"]
        default_slot = next((s for s in slots if s.name == "default"), None)

        slot_lines = []
        for s in named_slots[:2]:
            desc = s.description or s.name + " content"
            slot_lines.append(f'  <Fragment slot="{s.name}">\n    <!-- {desc} -->\n  </Fragment>')
        if default_slot:
            desc = default_slot.description or "content"
            slot_lines.append(f"  {component_name} content")

        # Assemble the tag
        if attrs and slot_lines:
            body = "\n" + attrs + "\n"
            inner = "\n" + "\n".join(slot_lines) + "\n"
            tag = f"<{component_name}\n{body}>\n{inner}</{component_name}>"
        elif attrs:
            tag = f"<{component_name}\n{attrs}\n/>"
        elif slot_lines:
            inner = "\n".join(slot_lines)
            tag = f"<{component_name}>\n{inner}\n</{component_name}>"
        else:
            tag = f"<{component_name} />"

        return f"---\nimport {component_name} from '{import_path}';\n---\n\n{tag}"

    @staticmethod
    def _sample_value(prop: PropInfo) -> str:
        """Return a realistic sample attribute value string for a prop."""
        name = prop.name
        ptype = prop.type
        default = prop.default.strip().strip('"').strip("'")

        # Boolean shortcuts
        if ptype == "boolean" or prop.default in ("true", "false"):
            return "{" + (prop.default if prop.default else "false") + "}"

        # Use default if it's a string literal (not empty string or "")
        if prop.default and prop.default not in ('""', "''", '""'):
            # Already quoted default → wrap in quotes
            if prop.default.startswith('"') or prop.default.startswith("'"):
                return prop.default  # keep as-is
            if prop.default.lstrip("-").isdigit():
                return "{" + prop.default + "}"
            if prop.default in ("true", "false"):
                return "{" + prop.default + "}"
            # string literal without quotes
            return f'"{default}"'

        # Union of string literals → pick first
        lit_match = re.search(r'"([^"]+)"', ptype)
        if lit_match:
            return f'"{lit_match.group(1)}"'

        # Semantic defaults by name
        name_defaults: dict[str, str] = {
            "id": '"example-id"',
            "name": '"field-name"',
            "label": '"Label"',
            "title": '"Title"',
            "heading": '"Heading"',
            "text": '"Text"',
            "href": '"#"',
            "url": '"#"',
            "src": '"https://example.com/image.jpg"',
            "action": '"/api/action"',
            "placeholder": '"Enter text..."',
            "message": '"Your message here"',
            "value": '"value"',
            "totalPages": "{10}",
            "currentPage": "{1}",
            "cols": "{3}",
            "rows": "{4}",
            "width": '"100%"',
            "height": '"auto"',
            "duration": "{4000}",
            "maxLength": "{500}",
        }
        if name in name_defaults:
            return name_defaults[name]

        if "number" in ptype.lower():
            return "{0}"
        if "string" in ptype.lower():
            return f'"example"'

        return ""

    # ── Utility ───────────────────────────────────────────────

    @staticmethod
    def _infer_description(name: str) -> str:
        """Generate a minimal fallback description from the component name."""
        parts = re.findall(r"[A-Z][a-z0-9]*", name)
        readable = " ".join(parts).lower()
        return f"Reusable {readable} component."

    @staticmethod
    def _score_confidence(
        has_description: bool,
        has_props: bool,
        has_slots: bool,
        has_accessibility: bool,
        tag_count: int,
    ) -> float:
        score = 0.50  # base — all components are real
        if has_description:
            score += 0.25
        if has_props:
            score += 0.15
        if has_slots:
            score += 0.05
        if has_accessibility:
            score += 0.05
        if tag_count >= 5:
            score += 0.05
        if tag_count >= 10:
            score += 0.05  # extra bump for well-tagged components
        return min(score, 1.0)

    def _load_inventory(self) -> dict:
        with open(self.config.inventory_file, encoding="utf-8") as fh:
            return json.load(fh)
