# DANBAEK CHARACTER BIBLE 2.0 — FOUNDATION DRAFT

Status: DESIGN LOCK CANDIDATE / NO FINAL ASSET YET

## Character premise

Danbaek is not the player's avatar and not a stat doll. Danbaek is a small separate being that watches the player with intense curiosity, imitates what the player does, makes mistakes, learns, becomes capable, and then uses those learned behaviors in Danbaek World.

Emotional target:
> "얘가 나를 보고 따라 하네" → "좀 더 가르쳐주고 싶다" → "어디까지 배울까?"

## Personality

Core:
- curious
- earnest
- slightly clumsy
- observant
- proud when imitation succeeds
- resilient rather than heroic

Avoid:
- baby speech
- excessive cuteness
- mascot cheerleader behavior
- aggressive macho personality
- constant jokes
- looking like a miniature human bodybuilder

Humor comes from sincere imitation and mismatch between ambition and current skill.

## Visual design objective

The old character risk was neutrality: simple but not memorable/cute/odd enough to trigger attachment.

New Lv.1 must communicate three things without text:
1. small and learnable
2. watches something/someone
3. wants to copy it

### Identity anchors
- soft rice-cake / snow-white body origin remains a useful identity seed
- genderless
- extremely readable silhouette at small mobile size
- face remains simple enough for animation but gains stronger gaze direction/readability
- body can visibly change with training while head/face identity remains stable
- hands/feet/posture must support expressive imitation; do not reduce limbs to geometry that cannot act

### Proportion direction
Not final numeric CANON yet. Target is compact and slightly bottom-heavy/soft at beginner state, avoiding the current neutral upright mannequin feeling. The silhouette should invite motion: slight forward curiosity, asymmetry, and visible center of gravity.

## Expression language

Required base expressions:
- neutral curiosity
- focused watching
- surprised discovery
- determined imitation
- confused mistake
- strain
- tiny pride/satisfaction
- disappointment without misery
- excited recognition of a familiar exercise

Eyes/gaze are the primary emotional channel. Mouth is secondary and should stay economical.

## Behavior states

These are more important than a large static pose catalog.

1. IDLE — exists independently, not frozen mascot pose.
2. NOTICE — notices player/Stanley/exercise.
3. WATCH — gaze tracks the action.
4. COPY_ATTEMPT — tries the movement, visibly imperfect at low learning.
5. COPY_SUCCESS — recognizable but still Danbaek-like imitation.
6. LEARNED_REACTION — brief realization/pride.
7. WORLD_USE — same learned motion translated into adventure context.
8. BLOCKED — tries, fails because learning is absent/insufficient, communicates what is missing through action before text.

## Growth philosophy

Do not make Lv.1→10 only "same body but wider muscles".

Growth has two visible axes:
- PHYSIQUE: existing body/growth truth may influence volume/definition.
- COMPETENCE: posture, confidence, movement precision, recovery from mistakes, and expression change as learning increases.

Danbaek must remain recognizable at maximum growth. Do not turn into a different heroic character.

## Learning-state animation rule

For the same exercise/movement:
- unseen: watches only / cannot perform
- observing: rough partial mimic
- imitating: complete but clumsy motion
- learned: recognizable successful motion
- familiar: smoother, less hesitation
- proficient: confident efficient motion with restrained flourish

This is the emotional representation of the contract; do not replace it with floating numbers alone.

## Stanley relationship

Stanley primarily addresses/trains the player. Danbaek is nearby watching both.
Stanley may occasionally notice Danbaek, but Danbaek must not steal the professional PT function.
The triangle is: Stanley teaches → player performs → Danbaek learns.

## App placement requirements

Final asset system must support:
- onboarding first meeting
- HOME idle/attention
- PT observation
- workout session watching
- set-complete imitation beat
- workout result learned reaction
- Danbaek World travel/use/block

## Asset production strategy

Do NOT generate dozens of final images first.

Gate A — master identity:
- front/3-quarter Lv.1 master
- neutral + focused-watch + copy-attempt expressions/poses
- one representative movement: bench press/horizontal push

Gate B — insertion proof:
Use those assets in HOME + session + result + one WORLD representative stage. If the same Danbaek reads coherently in all four contexts, lock visual identity.

Gate C — production expansion:
- core expression sheet
- observation/imitation motion set
- movement-family animation set
- growth variants
- world actions/block reactions

No full asset batch before Gate B.

## Acceptance criteria for new CANON

A candidate is rejected if:
- static Lv.1 still feels generic
- cuteness depends only on dialogue
- it cannot visibly watch the player
- copy attempt and successful copy look nearly identical
- physique growth destroys identity
- it looks childish enough to undermine a serious workout tool
- it cannot be rendered clearly in current mobile HOME/session sizes

Final CANON requires actual in-app insertion QA, not image approval in isolation.
