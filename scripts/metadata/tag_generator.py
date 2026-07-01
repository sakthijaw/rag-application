"""
Tag Generator — Step 2 (utility)

Generates a rich, deduplicated list of semantic tags for each component.
Tags directly power embedding quality: the richer and more semantically
correct they are, the better the retriever matches user queries.

Strategy (layered, highest to lowest precedence):
  1. Curated hand-crafted tags per component (best signal, verified)
  2. Category base tags (always included)
  3. PascalCase split of component name
  4. Keywords extracted from JSDoc description
  5. Prop name keywords
  6. Slot name keywords
"""

from __future__ import annotations

import re
from dataclasses import dataclass


# ─────────────────────────────────────────────
# Curated tags — verified semantic synonyms
# These are the most important for RAG quality.
# ─────────────────────────────────────────────

_CURATED: dict[str, list[str]] = {
    # layout
    "Navbar": [
        "navbar", "navigation bar", "top nav", "header", "site header",
        "menu bar", "hamburger menu", "mobile menu", "responsive nav",
        "top navigation", "navigation header", "main navigation",
    ],
    "Footer": [
        "footer", "site footer", "page footer", "bottom section",
        "copyright", "footer links", "footer navigation",
    ],
    "Sidebar": [
        "sidebar", "side navigation", "side menu", "drawer",
        "left panel", "collapsible menu", "dashboard sidebar",
        "vertical navigation", "nav drawer",
    ],
    "Container": [
        "container", "wrapper", "max width", "page wrapper",
        "content container", "layout wrapper", "center content",
        "section wrapper",
    ],
    "Grid": [
        "grid", "css grid", "column layout", "responsive grid",
        "multi column", "layout grid", "gallery grid", "card grid",
    ],
    # ui
    "Button": [
        "button", "action button", "submit button", "click",
        "cta", "call to action", "primary button", "secondary button",
        "danger button", "ghost button", "outline button", "submit form",
        "save changes", "form submit", "clickable", "interactive button",
        "link button",
    ],
    "Badge": [
        "badge", "label", "tag", "status badge", "chip", "pill",
        "indicator", "status indicator", "count badge", "notification badge",
        "category tag",
    ],
    "Avatar": [
        "avatar", "profile picture", "user photo", "user image",
        "profile avatar", "user icon", "initials", "profile image",
        "user avatar", "member photo",
    ],
    "Spinner": [
        "spinner", "loading spinner", "loading indicator", "loader",
        "loading state", "busy indicator", "circular loader",
        "progress spinner", "loading animation", "processing indicator",
    ],
    "Divider": [
        "divider", "separator", "horizontal rule", "hr", "line divider",
        "section separator", "content divider", "visual divider",
    ],
    # forms
    "Input": [
        "input", "text input", "text field", "form input",
        "input field", "text box", "email input", "password input",
        "form field", "data entry", "user input field", "search input",
        "number input", "phone input",
    ],
    "Select": [
        "select", "dropdown", "select dropdown", "option picker",
        "combobox", "select box", "form dropdown", "choice selector",
        "select menu", "option list",
    ],
    "Checkbox": [
        "checkbox", "check box", "toggle", "boolean input",
        "agree checkbox", "terms checkbox", "multi select option",
        "tick box", "check option",
    ],
    "Textarea": [
        "textarea", "text area", "multiline input", "message field",
        "comment box", "description field", "long text input",
        "multiline text", "notes field", "bio field",
    ],
    "SearchBar": [
        "search bar", "search", "search field", "search input",
        "search box", "query input", "find input", "search component",
        "search form", "filter bar",
    ],
    # feedback
    "Alert": [
        "alert", "notification", "alert message", "warning banner",
        "error alert", "success alert", "info alert", "alert box",
        "status message", "inline notification", "warning message",
        "error message", "info message", "flash message",
    ],
    "Toast": [
        "toast", "toast notification", "snackbar", "popup notification",
        "brief notification", "auto dismiss", "floating notification",
        "toast message", "success toast", "error toast",
    ],
    "Modal": [
        "modal", "dialog", "popup", "modal dialog", "overlay",
        "lightbox", "confirmation dialog", "modal popup", "dialog box",
        "alert dialog", "form modal", "side sheet",
    ],
    "ProgressBar": [
        "progress bar", "progress", "loading bar", "completion bar",
        "upload progress", "download progress", "percentage bar",
        "task progress", "step progress",
    ],
    "Skeleton": [
        "skeleton", "loading skeleton", "content placeholder",
        "loading placeholder", "skeleton screen", "shimmer",
        "loading state", "placeholder", "ghost element",
    ],
    # data
    "Card": [
        "card", "content card", "info card", "widget card",
        "panel", "box", "tile", "article card", "product card",
        "feature card", "media card",
    ],
    "Table": [
        "table", "data table", "grid table", "sortable table",
        "list table", "tabular data", "rows and columns",
        "data grid", "spreadsheet", "records table",
    ],
    "StatCard": [
        "stat card", "metric card", "kpi card", "statistics card",
        "number card", "metric display", "dashboard metric",
        "analytics card", "number widget", "stat widget",
    ],
    "Timeline": [
        "timeline", "activity timeline", "event timeline",
        "chronological list", "history", "event list",
        "activity log", "time feed", "progress timeline",
    ],
    # navigation
    "Breadcrumb": [
        "breadcrumb", "breadcrumb navigation", "nav trail",
        "page path", "wayfinding", "location path",
        "navigation breadcrumb", "back navigation",
    ],
    "Tabs": [
        "tabs", "tab navigation", "tabbed interface", "tab bar",
        "tab panels", "switch tabs", "content tabs",
        "horizontal tabs", "tab list",
    ],
    "Pagination": [
        "pagination", "paging", "page numbers", "next page",
        "previous page", "page navigation", "infinite scroll alternative",
        "data pagination", "list pagination", "result pages",
    ],
    "Steps": [
        "steps", "step indicator", "wizard", "multi step",
        "progress steps", "step by step", "onboarding steps",
        "checkout steps", "form wizard", "stepper",
    ],
    # marketing
    "Hero": [
        "hero", "hero section", "landing page hero", "banner",
        "jumbotron", "above the fold", "homepage hero",
        "hero banner", "welcome section", "intro section",
        "headline section", "marketing hero",
    ],
    "PricingCard": [
        "pricing card", "pricing", "price card", "plan card",
        "subscription plan", "pricing tier", "pricing table",
        "plan selection", "pricing page",
    ],
    "FeatureGrid": [
        "feature grid", "features section", "product features",
        "feature list", "benefits section", "capabilities",
        "highlights", "marketing features",
    ],
    "CTASection": [
        "cta section", "call to action", "action section",
        "conversion section", "sign up section", "cta banner",
        "get started section", "promo section",
    ],
    "Testimonial": [
        "testimonial", "review", "customer review", "quote",
        "social proof", "customer testimonial", "star rating",
        "feedback card", "user review", "recommendation",
    ],
    # auth
    "LoginForm": [
        "login form", "sign in form", "login page", "sign in",
        "email login", "password login", "authentication form",
        "user login", "login screen", "login",
    ],
    "RegisterForm": [
        "register form", "sign up form", "registration form",
        "create account", "new user form", "signup form",
        "account creation", "register", "user registration",
    ],
    "ForgotPassword": [
        "forgot password", "password reset", "reset password form",
        "account recovery", "password recovery", "reset link",
        "forgot password form",
    ],
    # dashboard
    "DashboardCard": [
        "dashboard card", "dashboard widget", "admin card",
        "widget", "dashboard panel", "metric widget",
        "admin widget", "dashboard component",
    ],
    "StatsGrid": [
        "stats grid", "metrics grid", "kpi grid",
        "dashboard stats", "analytics grid", "statistics grid",
        "overview stats", "summary stats",
    ],
    "ActivityFeed": [
        "activity feed", "activity log", "recent activity",
        "feed", "notification feed", "event feed",
        "updates feed", "live feed",
    ],
    # content
    "ProfileCard": [
        "profile card", "user profile", "profile page",
        "user card", "member card", "bio card",
        "author card", "team member card",
    ],
    "BlogCard": [
        "blog card", "article card", "post card", "news card",
        "blog preview", "content card", "article preview",
        "post preview", "blog listing",
    ],
    "Article": [
        "article", "blog post", "long form content", "prose",
        "article layout", "content page", "post page",
        "reading layout", "documentation page",
    ],
}

# ─────────────────────────────────────────────
# Category base tags
# ─────────────────────────────────────────────

_CATEGORY_TAGS: dict[str, list[str]] = {
    "layout":     ["layout", "structure", "page layout"],
    "ui":         ["ui", "ui component", "interactive"],
    "forms":      ["form", "input", "user input", "data entry"],
    "feedback":   ["feedback", "notification", "status"],
    "data":       ["data display", "content"],
    "navigation": ["navigation", "nav"],
    "marketing":  ["marketing", "landing page"],
    "auth":       ["authentication", "auth", "user"],
    "dashboard":  ["dashboard", "admin", "analytics"],
    "content":    ["content", "text", "media"],
}

# ─────────────────────────────────────────────
# Stop words excluded from description extraction
# ─────────────────────────────────────────────

_STOP_WORDS = frozenset({
    "a", "an", "the", "and", "or", "for", "to", "of", "with",
    "in", "on", "at", "by", "as", "is", "it", "its", "be",
    "are", "was", "were", "that", "this", "from", "into", "when",
    "can", "has", "have", "will", "not", "no", "vs", "etc",
    "per", "via", "any", "all", "each", "also", "both", "such",
})


# ─────────────────────────────────────────────
# Public interface
# ─────────────────────────────────────────────

class TagGenerator:
    """Generates a deduplicated, sorted list of semantic tags for a component."""

    def generate(
        self,
        component_name: str,
        category: str,
        description: str,
        prop_names: list[str],
        slot_names: list[str],
    ) -> list[str]:
        """Return a comprehensive, deduplicated tag list."""
        tags: set[str] = set()

        tags.update(t.lower() for t in _CATEGORY_TAGS.get(category, []))
        tags.update(t.lower() for t in self._name_tags(component_name))
        tags.update(t.lower() for t in _CURATED.get(component_name, []))
        tags.update(t.lower() for t in self._description_tags(description))
        tags.update(t.lower() for t in self._prop_tags(prop_names))
        tags.update(t.lower() for t in self._slot_tags(slot_names))

        # Remove empty strings
        tags.discard("")
        return sorted(tags)

    # ── Private helpers ───────────────────────────────────────

    @staticmethod
    def _split_pascal(name: str) -> list[str]:
        """Split PascalCase into lowercase words: 'DashboardCard' → ['dashboard', 'card']."""
        parts = re.findall(r"[A-Z][a-z0-9]*|[a-z0-9]+", name)
        return [p.lower() for p in parts]

    def _name_tags(self, name: str) -> list[str]:
        parts = self._split_pascal(name)
        tags = parts[:]
        if len(parts) > 1:
            tags.append(" ".join(parts))
        tags.append(name.lower())
        return tags

    @staticmethod
    def _description_tags(description: str) -> list[str]:
        """Extract meaningful keywords from the description text."""
        if not description:
            return []
        words = re.findall(r"[a-zA-Z]{3,}", description.lower())
        return [w for w in words if w not in _STOP_WORDS]

    @staticmethod
    def _prop_tags(prop_names: list[str]) -> list[str]:
        """Extract semantic keywords from prop names."""
        skip = {"class", "style", "id", "as", "ref", "key"}
        tags = []
        for name in prop_names:
            if name in skip:
                continue
            # Split camelCase prop names
            parts = re.findall(r"[A-Z][a-z0-9]*|[a-z0-9]+", name)
            tags.extend(p.lower() for p in parts if len(p) > 2)
        return tags

    @staticmethod
    def _slot_tags(slot_names: list[str]) -> list[str]:
        skip = {"default"}
        return [s.lower() for s in slot_names if s not in skip and len(s) > 2]
