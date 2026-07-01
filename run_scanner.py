"""
Entry point — Step 1: Component Scanner

Run from the project root:
    python run_scanner.py

Outputs:
    data/component_inventory.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow imports from scripts/ without installing the package
sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging
from scripts.scanner import ComponentInventory, ComponentScanner
from scripts.scanner.component_scanner import ScannerConfig


def build_scanner_config(settings: dict, project_root: Path) -> ScannerConfig:
    cfg = settings["scanner"]
    return ScannerConfig(
        components_dir=project_root / cfg["components_dir"],
        supported_extensions=cfg["supported_extensions"],
        ignored_dirs=set(cfg["ignored_dirs"]),
        ignored_prefixes=cfg["ignored_prefixes"],
        output_file=project_root / cfg["output_file"],
    )


def print_report(inventory: ComponentInventory) -> None:
    """Print a formatted console summary of the scan results."""
    print("\n" + "=" * 60)
    print("  COMPONENT LIBRARY SCAN REPORT")
    print("=" * 60)
    print(f"  Total components : {inventory.total_components}")
    print(f"  Categories found : {len(inventory.categories)}")
    print()

    # Group by category
    by_category: dict[str, list] = {}
    for comp in inventory.components:
        by_category.setdefault(comp.category, []).append(comp)

    for category in sorted(by_category):
        comps = by_category[category]
        print(f"  [{category.upper()}]  ({len(comps)} components)")
        for c in comps:
            props_flag = "[Props] " if c.has_props_interface else "[-----] "
            slots_flag = "[Slots] " if c.has_slots else "[-----] "
            script_flag = "[Script]" if c.has_script else "[------]"
            print(
                f"    • {c.component_name:<20} "
                f"{props_flag}  {slots_flag}  {script_flag}  "
                f"({c.line_count} lines)"
            )
        print()

    print("=" * 60)
    print(f"  Scan metadata: {json.dumps(inventory.scan_metadata, indent=4)}")
    print("=" * 60 + "\n")


def main() -> int:
    project_root = find_project_root()
    settings = load_settings(project_root)
    setup_logging(settings)

    config = build_scanner_config(settings, project_root)
    scanner = ComponentScanner(config, project_root)

    try:
        inventory = scanner.scan()
    except FileNotFoundError as exc:
        print(f"\n[ERROR] {exc}", file=sys.stderr)
        return 1

    print_report(inventory)
    output_path = scanner.save(inventory)
    print(f"[OK] Inventory written to: {output_path}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
