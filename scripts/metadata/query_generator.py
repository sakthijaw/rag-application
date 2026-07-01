"""
Query Generator — Step 3

For each component, generates 5–10 diverse synthetic developer queries.
Queries simulate the natural language a developer would type when searching
for a component, covering multiple framings of the same intent:
  - Direct task:      "I need a login form"
  - Problem framing:  "how do I let users sign in"
  - Feature request:  "user authentication with email and password"
  - Build scenario:   "building an auth page"

These queries are stored in data/metadata_with_queries.json and become
part of the embedding document in Step 4. They bridge the vocabulary gap
between developer intent and component descriptions/tags.

No LLM is used here — all queries are curated hand-crafted strings,
deterministic and free to generate.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


# ─────────────────────────────────────────────────────────────
# Curated queries — 8–10 per component, varied phrasing
# ─────────────────────────────────────────────────────────────

_CURATED_QUERIES: dict[str, list[str]] = {
    # ── layout ────────────────────────────────────────────────
    "Navbar": [
        "add a navigation bar to the top of my page",
        "I need a responsive navbar with a hamburger menu",
        "how do I create a sticky header with navigation links",
        "site header with logo and nav links",
        "mobile-friendly top navigation that collapses on small screens",
        "navigation bar with dropdown menus",
        "header component for my website",
        "responsive header that collapses on mobile",
        "top nav with logo on the left and links on the right",
    ],
    "Footer": [
        "add a footer to my page",
        "site footer with links and copyright notice",
        "page footer with multiple link columns",
        "bottom section with contact information and links",
        "footer with social media links",
        "how do I add a footer to my astro site",
        "website bottom navigation and copyright",
        "footer with company info and site links",
    ],
    "Sidebar": [
        "I need a sidebar for my dashboard",
        "collapsible side navigation menu",
        "left panel navigation for an admin layout",
        "dashboard sidebar with icon and label links",
        "vertical navigation drawer that can be toggled",
        "side menu for admin panel",
        "expandable sidebar with grouped navigation items",
        "nav drawer for a multi-page application",
        "responsive sidebar that collapses on mobile",
    ],
    "Container": [
        "center my page content within a max width",
        "max width wrapper for page layout",
        "content container with horizontal padding",
        "how do I constrain layout width and center it",
        "page wrapper that limits how wide content stretches",
        "section wrapper with responsive padding",
        "layout container component",
        "center content on page with limited width",
    ],
    "Grid": [
        "create a responsive multi-column grid layout",
        "arrange items in a grid",
        "card grid with responsive columns",
        "css grid layout for a gallery",
        "three column layout that stacks on mobile",
        "responsive column arrangement for cards",
        "grid of images or cards",
        "gallery layout with even columns",
    ],

    # ── ui ────────────────────────────────────────────────────
    "Button": [
        "add a clickable button to my page",
        "submit button for a form",
        "call to action button",
        "primary and secondary button variants",
        "danger button for delete actions",
        "button with loading state while submitting",
        "ghost button with outline style",
        "link-style button for navigation",
        "disabled button state",
        "how do I make a button component",
    ],
    "Badge": [
        "show a status badge on a card",
        "colored label for a category",
        "notification count badge",
        "pill-shaped chip indicator",
        "small label next to text",
        "tag for displaying status or category",
        "new or updated badge on an item",
        "colored status chip",
    ],
    "Avatar": [
        "show a user profile picture",
        "circular user avatar image",
        "user initials when no photo is available",
        "profile picture component with fallback",
        "member photo in a comment or list",
        "avatar with initials fallback",
        "user icon in a navbar or card",
        "team member photo thumbnail",
    ],
    "Spinner": [
        "show a loading spinner while data loads",
        "loading indicator for async operations",
        "circular animation while fetching data",
        "page loading state indicator",
        "busy indicator for a form submission",
        "how do I show a loading state",
        "spinner while waiting for a response",
        "animated loading icon",
    ],
    "Divider": [
        "add a horizontal line between sections",
        "visual separator between content blocks",
        "divider with custom styling",
        "line to separate two sections",
        "section separator",
        "content divider between elements",
    ],

    # ── forms ─────────────────────────────────────────────────
    "Input": [
        "text input field for a form",
        "email input with label and error state",
        "password input field",
        "form input for user data entry",
        "search input field with icon",
        "phone number text input",
        "input with placeholder and validation error",
        "how do I create a text field",
        "labelled input with helper text",
        "numeric input field",
    ],
    "Select": [
        "dropdown select menu in a form",
        "option picker for choosing a value",
        "country select dropdown",
        "form dropdown with multiple options",
        "single choice selector",
        "select input for a category",
        "pick from a list of options",
        "combobox for a form field",
    ],
    "Checkbox": [
        "checkbox for user agreement",
        "terms and conditions agreement checkbox",
        "boolean yes or no option in a form",
        "agree to terms tick box",
        "remember me checkbox",
        "checkbox with accessible label",
        "multi-select option checkboxes",
        "toggle boolean form field",
    ],
    "Textarea": [
        "multi-line text input for messages",
        "comment box in a form",
        "large text field for long descriptions",
        "biography input field",
        "user message or note text area",
        "notes field with multiple lines",
        "long text entry component",
    ],
    "SearchBar": [
        "search bar for filtering content",
        "search input at top of the page",
        "filter bar to find items by name",
        "site search component",
        "search with a magnifying glass icon",
        "how do I add search to my page",
        "input to search or filter a list",
        "query input for searching records",
    ],

    # ── feedback ──────────────────────────────────────────────
    "Alert": [
        "show an error message to the user",
        "success notification after form submission",
        "warning banner at top of the page",
        "informational alert message",
        "inline error notification",
        "dismissible alert box",
        "how do I display validation errors",
        "flash message for user feedback",
        "status message component",
    ],
    "Modal": [
        "show a popup dialog",
        "confirmation dialog before deleting an item",
        "modal with a form inside",
        "overlay popup with content",
        "alert dialog asking the user to confirm",
        "how do I create a modal in astro",
        "dialog that opens on a button click",
        "lightbox overlay popup",
        "modal with a close button",
    ],
    "Toast": [
        "show a brief notification that disappears automatically",
        "auto-dismissing success message",
        "snackbar-style notification",
        "floating notification after saving",
        "toast for error feedback",
        "brief popup feedback message",
        "how do I show toast notifications",
        "notification that fades out after a few seconds",
    ],
    "ProgressBar": [
        "show upload progress to the user",
        "progress bar for a loading operation",
        "percentage completion bar",
        "download progress indicator",
        "task completion progress display",
        "step progress bar for a multi-step form",
        "loading bar with percentage",
    ],
    "Skeleton": [
        "show a loading placeholder while content loads",
        "skeleton screen before data arrives",
        "shimmer loading effect for a card",
        "ghost placeholder for list items",
        "content placeholder animation",
        "how do I show loading placeholders",
        "skeleton loader for images and text",
        "loading state that looks like the content shape",
    ],

    # ── data ──────────────────────────────────────────────────
    "Card": [
        "display content in a card layout",
        "info card with title and description",
        "product card with image and button",
        "feature card on a landing page",
        "content box with shadow and border",
        "tile for displaying items in a list",
        "article preview card",
        "panel with header body and footer slots",
        "media card with image and text",
    ],
    "Table": [
        "display data in a table",
        "sortable data table with rows and columns",
        "list of records in tabular format",
        "data grid with column headers",
        "how do I show a data table",
        "records table with pagination",
        "spreadsheet-style data display",
        "table of users or products",
        "tabular data with sorting",
    ],
    "StatCard": [
        "display a key metric on the dashboard",
        "KPI card showing a number and label",
        "statistics widget for an analytics page",
        "metric display with trend indicator",
        "number card for tracking revenue",
        "show a business metric on a dashboard",
        "dashboard stat card",
        "analytics number widget with change percentage",
    ],
    "Timeline": [
        "show a history of events in chronological order",
        "activity timeline for a user",
        "list of time-ordered events",
        "progress timeline for a project",
        "event history component",
        "order history as a timeline",
        "chronological activity feed",
    ],

    # ── navigation ────────────────────────────────────────────
    "Breadcrumb": [
        "show the current page path to the user",
        "breadcrumb navigation trail",
        "where am I in the site hierarchy indicator",
        "page location indicator",
        "back navigation with path display",
        "navigation breadcrumbs for deep pages",
        "wayfinding for nested pages",
        "page hierarchy path display",
    ],
    "Tabs": [
        "tab navigation to switch between content panels",
        "tabbed interface with multiple sections",
        "horizontal tabs for different views",
        "switch content with clickable tab buttons",
        "tab bar with associated panel content",
        "how do I create tabs in astro",
        "profile page with overview posts and settings tabs",
        "settings page with multiple tab sections",
        "tabbed content switcher",
    ],
    "Pagination": [
        "paginate a long list of results",
        "page number navigation for a data list",
        "next and previous page buttons",
        "how do I add pagination to a table",
        "result pages for search results",
        "navigate through pages of blog posts",
        "page selector component",
        "data pagination with current page indicator",
    ],
    "Steps": [
        "multi-step form with a progress indicator",
        "wizard with step-by-step navigation",
        "checkout steps component",
        "onboarding flow with numbered steps",
        "step indicator for a multi-page form",
        "stepper for a multi-step workflow",
        "numbered steps showing progress through a process",
        "form wizard with next and back navigation",
    ],

    # ── marketing ─────────────────────────────────────────────
    "Hero": [
        "hero section for a landing page",
        "big banner at the top of the homepage",
        "above the fold intro section with headline and button",
        "marketing hero with CTA",
        "landing page hero banner",
        "jumbotron with a call to action button",
        "homepage welcome section with headline",
        "full-width intro section with background image",
        "homepage first section",
        "headline section with subtext and button",
    ],
    "PricingCard": [
        "pricing plan card for a SaaS product",
        "subscription tier display",
        "plan selection card with features list",
        "show pricing options to users",
        "price card with monthly and annual toggle",
        "pricing table card",
        "premium and free plan cards",
        "pricing page card component",
    ],
    "FeatureGrid": [
        "display product features on a landing page",
        "features section with icons and descriptions",
        "benefits grid for a marketing page",
        "product highlights section",
        "why choose us section",
        "feature cards arranged in a grid",
        "capabilities list on homepage",
        "marketing feature highlights section",
    ],
    "CTASection": [
        "call to action section at the bottom of the page",
        "sign up CTA banner",
        "conversion section with a button",
        "get started section for a landing page",
        "promo section prompting users to take action",
        "marketing section with an action button",
        "bottom of page conversion section",
        "prompt users to register or sign up",
    ],
    "Testimonial": [
        "show customer reviews on my landing page",
        "testimonial section with quotes and photos",
        "social proof component",
        "customer review card with star rating",
        "what customers are saying section",
        "user testimonial with author name and photo",
        "feedback card from a satisfied customer",
        "endorsement quote from a customer",
    ],

    # ── auth ──────────────────────────────────────────────────
    "LoginForm": [
        "login form with email and password fields",
        "sign in page for my application",
        "user authentication form",
        "build a login page",
        "email and password sign in",
        "how do I add a login to my site",
        "login screen with remember me checkbox",
        "user login component",
        "authenticate users with a form",
        "sign in with email form",
    ],
    "RegisterForm": [
        "user registration form",
        "sign up form with email and password",
        "create account form",
        "new user registration page",
        "how do I let users create an account",
        "signup page component",
        "user onboarding registration form",
        "account creation with confirmation",
        "register a new user",
    ],
    "ForgotPassword": [
        "forgot password form",
        "password reset page",
        "account recovery form",
        "send a password reset email",
        "how do I add forgot password to my site",
        "password recovery flow",
        "request a reset link form",
    ],

    # ── dashboard ─────────────────────────────────────────────
    "DashboardCard": [
        "card for an admin dashboard",
        "dashboard widget with header and content",
        "admin panel card component",
        "reusable card for dashboard layout",
        "widget for displaying dashboard information",
        "how do I build a dashboard card",
        "admin widget with title and body slot",
        "dashboard panel component",
    ],
    "StatsGrid": [
        "grid of KPI stats for a dashboard",
        "metrics overview section showing multiple numbers",
        "dashboard stats arranged in a grid",
        "show several KPIs side by side",
        "analytics overview grid for an admin panel",
        "statistics summary grid",
        "metrics grid component",
        "KPI grid for a dashboard overview page",
    ],
    "ActivityFeed": [
        "recent activity feed in an admin panel",
        "list of the latest events",
        "live activity log for users",
        "notification feed on a dashboard",
        "what happened recently in the system",
        "updates feed in an admin area",
        "event log stream component",
        "activity stream for a user account",
    ],

    # ── content ───────────────────────────────────────────────
    "ProfileCard": [
        "display a user profile card",
        "author card with bio and photo",
        "team member profile component",
        "user bio card with social links",
        "profile page summary card",
        "member card with name and title",
        "show user information in a card",
        "writer or contributor profile component",
        "personal info card",
    ],
    "BlogCard": [
        "blog post preview card",
        "article card with title and excerpt",
        "news card for a listing page",
        "post preview with thumbnail image",
        "blog listing card",
        "article preview component",
        "how do I show blog posts in a grid",
        "content preview card for a blog",
    ],
    "Article": [
        "display a long-form article",
        "blog post reading layout",
        "styled article content with typography",
        "reading layout for documentation",
        "prose content page",
        "article page with heading and body",
        "long-form content display",
        "content page layout for a post",
    ],
}

# ─────────────────────────────────────────────────────────────
# Category fallback templates
# Used only when a component has no curated entry (shouldn't
# happen for the 42-component library, but future-proofs the
# code for new components added without curated queries).
# ─────────────────────────────────────────────────────────────

_CATEGORY_FALLBACK: dict[str, list[str]] = {
    "layout":     [
        "layout component for structuring a page",
        "page layout wrapper",
        "how do I structure the layout of my page",
        "page structure component",
        "layout helper for organizing content",
    ],
    "ui":         [
        "UI component for user interaction",
        "interactive interface element",
        "how do I add this UI element",
        "visual UI component",
        "user interface element",
    ],
    "forms":      [
        "form input component",
        "user input field",
        "how do I collect user input",
        "form element for data entry",
        "data entry input field",
    ],
    "feedback":   [
        "user feedback component",
        "how do I show status to the user",
        "notification or status display",
        "feedback indicator for the user",
        "status communication component",
    ],
    "data":       [
        "display data to the user",
        "data display component",
        "how do I present information",
        "content display element",
        "information display widget",
    ],
    "navigation": [
        "navigation component",
        "how do I add navigation",
        "site navigation element",
        "navigation pattern",
        "user navigation aid",
    ],
    "marketing":  [
        "marketing section for a landing page",
        "landing page section",
        "how do I add this to my marketing page",
        "promotional section component",
        "conversion component for marketing",
    ],
    "auth":       [
        "user authentication component",
        "how do I add authentication",
        "auth form for my site",
        "user account component",
        "login or signup component",
    ],
    "dashboard":  [
        "dashboard component for admin panel",
        "admin dashboard widget",
        "how do I build a dashboard section",
        "admin area component",
        "analytics dashboard element",
    ],
    "content":    [
        "content display component",
        "how do I display this type of content",
        "content presentation component",
        "content block for my site",
        "content layout element",
    ],
}


# ─────────────────────────────────────────────────────────────
# Config dataclass
# ─────────────────────────────────────────────────────────────

@dataclass
class QueryConfig:
    metadata_file: Path
    output_file: Path
    min_queries: int
    max_queries: int


def load_query_config(settings: dict, project_root: Path) -> "QueryConfig":
    m = settings["metadata"]
    return QueryConfig(
        metadata_file=project_root / m["output_file"],
        output_file=project_root / m["queries_output_file"],
        min_queries=int(m.get("min_queries_per_component", 5)),
        max_queries=int(m.get("max_queries_per_component", 10)),
    )


# ─────────────────────────────────────────────────────────────
# Public interface
# ─────────────────────────────────────────────────────────────

class QueryGenerator:
    """
    Generates a deduplicated list of synthetic developer queries
    for a given component, drawn from curated hand-crafted entries
    with category-based fallbacks.
    """

    def __init__(self, min_queries: int = 5, max_queries: int = 10) -> None:
        self._min = min_queries
        self._max = max_queries

    def generate(
        self,
        component_name: str,
        category: str,
    ) -> list[str]:
        """
        Return min_queries to max_queries unique queries for this component.

        Priority:
          1. Curated queries for this exact component name
          2. Category fallback queries if curated count < min_queries
        """
        seen: set[str] = set()
        queries: list[str] = []

        def _add(q: str) -> None:
            normalised = q.strip().lower()
            if normalised and normalised not in seen:
                seen.add(normalised)
                queries.append(q.strip())

        # Layer 1: curated per-component queries
        for q in _CURATED_QUERIES.get(component_name, []):
            _add(q)
            if len(queries) >= self._max:
                break

        # Layer 2: category fallbacks if still below minimum
        if len(queries) < self._min:
            for q in _CATEGORY_FALLBACK.get(category, []):
                _add(q)
                if len(queries) >= self._max:
                    break

        return queries[: self._max]
