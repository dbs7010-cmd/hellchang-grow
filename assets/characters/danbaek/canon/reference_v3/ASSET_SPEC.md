# DANBAEK CHARACTER ASSETS V1

## Status

- Purpose: final Lv.1–Lv.10 Danbaek character artwork before app integration
- Visual basis: approved final growth sheet with the unified face and jawline
- Code integration: not included
- Growth logic and LOCKED/CANON systems: unchanged

## Files

- `danbaek-growth-master-v1.png`: 1536×1024 transparent master sheet
- `levels/danbaek-lv01.png` … `levels/danbaek-lv10.png`: individual transparent assets

## Individual asset contract

- Format: PNG, RGBA
- Canvas: 320×512 px
- Background: transparent alpha
- Pose: front-facing neutral stance
- Cell alignment: horizontally centered, fixed row baseline inherited from the master
- Naming: `danbaek-lvNN.png`

## Locked visual rules

- The same dot eyes, smile, cheek-to-jaw taper, rounded chin, and short neck are used at every level.
- Only the body and muscle progression changes from Lv.1 to Lv.10.
- Do not redraw, stretch, recolor, or independently regenerate an individual level.
- Any future animation asset must reference the matching level PNG and preserve its face identity and body silhouette.

## Runtime policy

These PNG files are canonical visual references and review assets. They must not replace the runtime `DanbaekBodyParameters → Character Renderer` pipeline because full-body image switching would discard independent muscle-region growth, fat/definition variation, and temporary pump presentation.
