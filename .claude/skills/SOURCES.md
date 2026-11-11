# Installed skills: sources and licenses

Copied from the public repositories below. Each skill folder keeps its own LICENSE where the upstream repo had one.

| Source repo (commit) | License | Skills |
|---|---|---|
| codeswithroh/tastemaker (792a28a) | MIT | tastemaker |
| ConardLi/garden-skills (08150e7) | MIT | web-design-engineer |
| mattpocock/skills (4ae2317) | MIT | improve-codebase-architecture |
| DietrichGebert/ponytail (96608e0) | MIT | ponytail, ponytail-audit, ponytail-debt, ponytail-gain, ponytail-help, ponytail-review |
| emilkowalski/skills (715c180) | MIT | animation-vocabulary, animate, find-animation-opportunities, improve-animations, review-animations, apple-design, emil-design-eng, ask-sonner, pick-ui-library, prototype |
| lexicalninja/my-little-scrum-team (6b137af) | MIT | typography-designer |
| nateherkai/scroll-craft (75d81f7) | MIT | scroll-craft |
| freshtechbro/claudedesignskills (1da73fe) | MIT at root; some plugin manifests say Apache-2.0 | aframe-webxr, animated-component-libraries, animejs, babylonjs-engine, barba-js, blender-web-pipeline, gsap-scrolltrigger, lightweight-3d-effects, locomotive-scroll, lottie-animations, modern-web-design, motion-framer, pixijs-2d, playcanvas-engine, react-spring-physics, react-three-fiber, rive-interactive, scroll-reveal-libraries, spline-interactive, substance-3d-texturing, threejs-webgl, web3d-integration-patterns |

Not installed: skill-creator from freshtechbro (duplicates a built-in skill), the two mcpmarket.com skills (page could not be fetched), landing-page-design (source not identified).

Note: scroll-craft's kie.mjs script sends prompts and uploaded images to api.kie.ai and kieai.redpandaai.co when run, and needs KIE_AI_API_KEY. Only run it on purpose.

## Batch 2

| Source repo (commit) | License | Skills |
|---|---|---|
| nextlevelbuilder/ui-ux-pro-max-skill (6ae86f6) | MIT | ui-ux-pro-max, design, design-system, brand, slides, ui-styling, banner-design |
| blader/humanizer (b48c832) | MIT | humanizer |
| tt-a1i/archify (7e45f36) | Apache-2.0 | archify (main skill only; `archify/examples` sample output removed to save space) |
| JuliusBrussee/caveman (3dc497a) | Apache-2.0 at root | cavecrew, caveman, caveman-commit, caveman-compress, caveman-evidence-review, caveman-explore, caveman-help, caveman-learn, caveman-review, caveman-stats, investigate-first, lean-build, megacave, migration, safe-refactor, surgical-patch, ultracave, verify-and-stop |
| PierreAndreis/pierre-skills (3158a4c) | MIT | animation |
| segersniels/dotfiles (485e5ff) | **No license file** | web-animation-design (unlicensed: reuse rights not granted by the author) |

Skipped from caveman: caveman-setup, caveman-manage, caveman-optimize, caveman-discover. These send work through Caveman Cloud (caveman.so). Their hooks (src/hooks) were not installed, so caveman-stats and the mode tracking in `caveman` will not work here.
Skipped from the others: ui-ux-pro-max's `cli/`, the `.agents/` developer skills in archify, and all plugin/hook folders.
Note: archify checks https://tt-a1i.github.io/archify/skill-updates/archify/stable.json for updates.

## Batch 3

| Source repo (commit) | License | Skills |
|---|---|---|
| uditakhourii/adhd (47beee2) | MIT | adhd (SKILL.md and SOURCE-SPEC.md only; the npm CLI in the repo is not installed) |

Note: the adhd skill runs about 10 Agent calls per use (5 to 10 times the cost of one answer).
