# Danbaek exact stage crops v5

Status: REVIEW_SOURCE / NOT WIRED TO RUNTIME

Source of truth is the existing locked master image:
`../danbaek_growth_system_canon.png`

These files do **not** redraw or reinterpret Danbaek. Each stage SVG is only a viewport crop of the user-approved master image, so the silhouette, face, line quality, proportions, and late-stage monster bulk come directly from the CANON itself.

Fixed rules:
- round bald head, dot eyes, short smile
- white body + black hand-drawn outline
- no clothes, hair, shoes, accessories, skin-tone rendering
- same character identity across all stages
- growth is horizontal muscle volume, not a taller/new character
- late stages must preserve the exaggerated monster-bulk shown in the master

Files:
- `stage-crops.v5.json`: exact crop rectangles in the 1024×1536 master
- `danbaek_stage_01.svg` ... `danbaek_stage_10.svg`: exact viewport crops of the master
- `danbaek_growth_review_v5.svg`: review sheet referencing those exact crops

Do not replace these with AI-redrawn approximations. Runtime integration should derive self-contained assets from these exact source crops only after visual approval.