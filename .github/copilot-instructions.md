# Copilot Instructions

## General Guidelines
- All documentation (including copilot-instructions.md and similar docs) should be written in English, regardless of the conversation language used.

## Project Guidelines
- AssetCache is lazy-loaded (unlike ItemCache, which is loaded at app start). For update() operations, loadFromStorage() must be called first 
  if the cache has not been initialized.
- Windows junctions created during the repo migration to avoid file duplication (e.g., packages/common/public -> packages/vue/public, 
  packages/vue/data -> packages/common/data) should be excluded via .gitignore and not checked in as real directories.

## Rendering Instructions
- In PageOntology.vue (and similarly in PageDocument.vue), cross-reference fields like Entity.enumeratedProperty should render the preferred 
  MultiLanguageText title of the referenced element as a clickable link (class 'cascara-type-ref', data-item-id attribute) instead of displaying the raw ID; 
  clicking navigates via the selectNode() method of NavOutline to the corresponding element in the outline area.
