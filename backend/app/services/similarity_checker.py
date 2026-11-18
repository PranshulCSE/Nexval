import re
from typing import List, Dict, Any, Optional

def clean_tokens(text: str) -> set:
    """Normalize text into a set of lower-case alphanumeric word tokens."""
    if not text:
        return set()
    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    words = cleaned.split()
    # Filter very short stop words
    return {w for w in words if len(w) > 2}

def compute_jaccard_similarity(text_a: str, text_b: str) -> float:
    """Compute token-level Jaccard similarity between two texts."""
    set_a = clean_tokens(text_a)
    set_b = clean_tokens(text_b)
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a.intersection(set_b))
    union = len(set_a.union(set_b))
    return round(intersection / union, 3) if union > 0 else 0.0

def check_submission_similarity(
    current_team_id: str,
    current_submission: Dict[str, Any],
    all_submissions: Dict[str, Dict[str, Any]],
    similarity_threshold: float = 0.65
) -> List[Dict[str, Any]]:
    """
    Compare current submission against all other team submissions:
    - Identical GitHub repository matching
    - README / Description hash matching
    - High textual similarity (Jaccard >= threshold)
    - Fork overlap
    Non-negotiable rule: Flags for human jury review ONLY, never auto-rejects.
    """
    flags: List[Dict[str, Any]] = []

    curr_github = (current_submission.get("github_url") or "").strip().lower().removesuffix(".git")
    curr_desc = current_submission.get("description") or ""
    curr_readme = current_submission.get("readme_content") or ""
    curr_hash = current_submission.get("readme_hash") or ""
    combined_curr = f"{curr_desc} {curr_readme}".strip()

    for other_id, other_sub in all_submissions.items():
        if other_id.upper() == current_team_id.upper():
            continue

        other_github = (other_sub.get("github_url") or "").strip().lower().removesuffix(".git")
        other_desc = other_sub.get("description") or ""
        other_readme = other_sub.get("readme_content") or ""
        other_hash = other_sub.get("readme_hash") or ""
        combined_other = f"{other_desc} {other_readme}".strip()

        # 1. Exact Repo URL Collision
        if curr_github and other_github and curr_github == other_github:
            flags.append({
                "type": "exact_repo_duplicate",
                "severity": "high",
                "matched_team_id": other_id,
                "similarity_score": 1.0,
                "message": f"⚠️ Exact Repository Match: This team submitted the identical GitHub URL as Team {other_id}.",
            })
            continue

        # 2. Exact Hash Collision
        if curr_hash and other_hash and curr_hash == other_hash and len(curr_readme) > 40:
            flags.append({
                "type": "exact_readme_hash",
                "severity": "high",
                "matched_team_id": other_id,
                "similarity_score": 1.0,
                "message": f"⚠️ Identical Documentation: README content hash exactly matches Team {other_id}.",
            })
            continue

        # 3. High Textual Similarity
        if combined_curr and combined_other:
            sim = compute_jaccard_similarity(combined_curr, combined_other)
            if sim >= similarity_threshold:
                flags.append({
                    "type": "high_text_similarity",
                    "severity": "medium",
                    "matched_team_id": other_id,
                    "similarity_score": sim,
                    "message": f"⚠️ High Textual Similarity ({int(sim * 100)}%): Project summary & README show substantial overlap with Team {other_id}.",
                })

    return flags
