"""
Entry point — Step 2: Metadata Extraction

Run from the project root:
    python run_metadata.py

Input:  data/component_inventory.json
Output: data/metadata.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging
from scripts.metadata import MetadataExtractor
from scripts.metadata.metadata_extractor import MetadataConfig, load_metadata_config


def validate_metadata(data: dict) -> list[str]:
    """
    Basic structural validation of the extracted metadata.
    Returns a list of validation error messages (empty = valid).
    """
    errors: list[str] = []
    required_fields = {
        "component_name", "category", "description",
        "import_path", "file_path", "tags",
    }

    for i, comp in enumerate(data.get("components", [])):
        prefix = f"[{comp.get('component_name', f'index {i}')}]"
        for f in required_fields:
            if not comp.get(f):
                errors.append(f"{prefix} missing or empty field: '{f}'")
        if comp.get("confidence", 0) < 0:
            errors.append(f"{prefix} invalid confidence: {comp['confidence']}")
        if not isinstance(comp.get("props"), list):
            errors.append(f"{prefix} 'props' must be a list")
        if not isinstance(comp.get("tags"), list):
            errors.append(f"{prefix} 'tags' must be a list")

    return errors


def print_report(data: dict) -> None:
    summary = data["summary"]
    components = data["components"]

    print("\n" + "=" * 65)
    print("  METADATA EXTRACTION REPORT")
    print("=" * 65)
    print(f"  Total components  : {data['total_components']}")
    print(f"  Fully extracted   : {summary['fully_extracted']}")
    print(f"  Need review       : {summary['needs_review']}")
    print(f"  Extraction date   : {data['extraction_date']}")
    print()

    # Group by category
    by_cat: dict[str, list[dict]] = {}
    for c in components:
        by_cat.setdefault(c["category"], []).append(c)

    for cat in sorted(by_cat):
        comps = by_cat[cat]
        print(f"  [{cat.upper()}]  ({len(comps)} components)")
        for c in comps:
            review_flag = " [NEEDS REVIEW]" if c["needs_review"] else ""
            print(
                f"    {c['component_name']:<22}"
                f"  props:{len(c['props']):<3}"
                f"  slots:{len(c['slots']):<3}"
                f"  tags:{len(c['tags']):<3}"
                f"  conf:{c['confidence']:.2f}"
                f"{review_flag}"
            )
        print()

    # Show needs-review components
    review_list = [c for c in components if c["needs_review"]]
    if review_list:
        print("  Components flagged for manual review:")
        for c in review_list:
            notes = "; ".join(c.get("extraction_notes", []))
            print(f"    - {c['component_name']} ({notes})")
        print()

    print("=" * 65 + "\n")


def main() -> int:
    project_root = find_project_root()
    settings = load_settings(project_root)
    setup_logging(settings)

    config = load_metadata_config(settings, project_root)

    if not config.inventory_file.exists():
        print(
            f"[ERROR] Inventory file not found: {config.inventory_file}\n"
            "Run `python run_scanner.py` first.",
            file=sys.stderr,
        )
        return 1

    extractor = MetadataExtractor(config, project_root)
    data = extractor.extract_all()

    # Validate
    errors = validate_metadata(data)
    if errors:
        print("\n[VALIDATION ERRORS]")
        for e in errors:
            print(f"  {e}")
        print()

    print_report(data)
    output_path = extractor.save(data)
    print(f"[OK] Metadata written to: {output_path}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
