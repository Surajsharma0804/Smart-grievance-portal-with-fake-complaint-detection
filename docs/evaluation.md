# AI Core Evaluation Report: Nagrik Setu

Date: 2026-11-14
Environment: Local Node v24.22.1 + Vitest Engine

## 1. Duplicate Detection Engine Performance

Duplicate detection combines perceptual image hashing (pHash/dHash), geographic proximity (Haversine on 2dsphere), category equality, and text embedding similarity.

### Metrics Summary

| Metric | Target (design.md) | Measured Result | Status |
|---|---|---|---|
| **Precision** | $\ge 90\%$ | **100.0%** | PASS |
| **Recall** | $\ge 85\%$ | **100.0%** | PASS |
| **False Merge Rate** | $\le 5\%$ | **0.0%** | PASS |

### Test Pair Breakdown

| Test Scenario | Score | Verdict | Expected | Result |
|---|---|---|---|---|
| Exact duplicate copy | 0.979 | `HIGH` | Duplicate | Pass |
| Resized photo nearby | 0.954 | `HIGH` | Duplicate | Pass |
| Angle variation duplicate | 0.95 | `HIGH` | Duplicate | Pass |
| Different pothole 40m away | 0.366 | `NONE` | Non-Duplicate | Pass |
| Different category same spot | 0.186 | `NONE` | Non-Duplicate | Pass |
| Completely unrelated issue | 0.021 | `NONE` | Non-Duplicate | Pass |

> **Key Invariant Preserved:** Proximity alone never triggers an auto-merge. Case 4 (*Different pothole 40m away*) produced a visual similarity of 0, keeping the score below `DUP_HIGH` and preventing a false merge.

## 2. Bilingual Text Classifier Performance

Evaluated on 20 synthetic complaints across 10 core categories in Hindi and English.

- **Total Test Samples:** 20 (10 English, 10 Hindi)
- **Correct Predictions:** 20
- **Accuracy:** **100.0%**

## 3. Trust Scoring Calibration

Trust scoring starts at 100 with deduction penalties:
- EXIF GPS mismatch (>500m): -30 to -40
- Stale EXIF (>72h): -15
- Editing Software tag (Photoshop, etc.): -15
- No EXIF from gallery source: -5
- ELA region variance ratio > 3.0: -10 to -20
- Cross-user image reuse (Hamming $\le 6$): -40
- Camera capture bonus within 50m of claim: +10 (capped at 100)

**Verdict bands:**
- $\ge 70$: `PASS`
- $40 - 69$: `NEEDS_REVIEW` (standard triage)
- $< 40$: `NEEDS_REVIEW` (high priority reviewer task)

*No complaint is ever auto-rejected on authenticity alone; citizen-facing status is "Needs Verification".*
