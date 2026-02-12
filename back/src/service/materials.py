"""Service for loading pre-made teaching materials from markdown files."""

from pathlib import Path

import yaml

from model.session import MaterialDetail, MaterialListItem

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from markdown text.

    Returns (metadata_dict, body_text).
    """
    if not text.startswith("---"):
        return {}, text

    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text

    meta = yaml.safe_load(parts[1]) or {}
    body = parts[2].strip()
    return meta, body


def list_materials() -> list[MaterialListItem]:
    """Return a list of all available materials (without body content)."""
    items: list[MaterialListItem] = []
    if not CONTENT_DIR.exists():
        return items

    for path in sorted(CONTENT_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        meta, _ = _parse_frontmatter(text)
        if "id" not in meta:
            continue
        items.append(
            MaterialListItem(
                id=meta["id"],
                title=meta.get("title", path.stem),
                description=meta.get("description", ""),
                difficulty=meta.get("difficulty"),
                tags=meta.get("tags", []),
            )
        )
    return items


def get_material(material_id: str) -> MaterialDetail | None:
    """Return a single material with its full markdown content."""
    if not CONTENT_DIR.exists():
        return None

    for path in CONTENT_DIR.glob("*.md"):
        text = path.read_text(encoding="utf-8")
        meta, body = _parse_frontmatter(text)
        if meta.get("id") == material_id:
            return MaterialDetail(
                id=meta["id"],
                title=meta.get("title", path.stem),
                description=meta.get("description", ""),
                difficulty=meta.get("difficulty"),
                tags=meta.get("tags", []),
                content=body,
            )
    return None
