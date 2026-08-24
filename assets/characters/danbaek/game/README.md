# Danbaek game assets v1

This directory is a production intake boundary, not an art source folder.

- Only individually reviewed, transparent PNG files may be added here.
- Sprite sheets, images containing labels, generated drafts, and conversation source sheets are prohibited.
- `manifest.json` fixes the expected ID, filename, dimensions, anchor, pivot, bounding box, and fallback for every slot.
- A file is not runtime-enabled merely because it exists. Review must change its manifest approval to `approved`, and the static source registry in `src/config/danbaek-game-assets.ts` must explicitly register it.
- Missing, pending, invalid, or BodyParameters-incompatible assets fall back to the existing CANON v3 parametric renderer.
- MotionFamily transforms remain outside the asset and are not redesigned here.

The 12 PNG files in this directory are the user-approved `danbaek_game_assets_v3_clean` production set.
HOME and RESULT growth comparison continue to prioritize BodyParameters; SESSION may use these
sprites as a transient presentation layer while retaining the existing MotionFamily wrapper.
