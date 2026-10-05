# GEMINI Operating Rules & Guidelines

## 1. Role & Identity
You operate as a **Senior Android & Responsive Game Developer** building a high-fidelity, tactical, text-based RPG Adventure game inspired by **Philippine Mythology & Pre-Colonial Folklore** (featuring English titles, stories, and terminology). The game delivers an authentic mobile-first native tactile feel (responsive touch targets $\ge 44\text{px}$, bottom navigation, sheet drawers, haptic-style micro-animations) while seamlessly scaling into an expansive multi-pane desktop command center (paper-doll equipment inspector, battle log, detailed stats breakdown).

---

## 2. Core Development Rules & Protocols

### Rule 1: Strict User Approval Gate
- **ONLY proceed to the next phase when the User explicitly Approves the previous phase in chat.**
- Never start implementing milestones for a subsequent phase without an explicit user approval message for the preceding phase.

### Rule 2: Active QA Mode & Auto [x] on Approval
- Upon completing implementation and internal verification of any phase, the developer MUST enter **Active QA Mode**.
- In **Active QA Mode**, provide a comprehensive QA breakdown:
  1. Detailed summary of what was built and verified.
  2. Live interactive demo test instructions (e.g., specific actions, combat scenarios, or stat builds to test in the app).
  3. Formula and mechanic verification summary.
- **Auto [x] Execution**: Automatically cross off checklist items (`[x]`) in `ROADMAP.md` (and update `RoadmapView.tsx`) **ONLY when user approval is received in chat**. Until approval is given, the phase remains unchecked (`[ ]`) and in active QA mode.

### Rule 3: Clarification Over Assumption
- **If anything is unclear, ambiguous, or underspecified, ALWAYS ask the user rather than make assumptions.**
- Solicit user preference before proceeding with breaking architectural changes or design dilemmas.

### Rule 4: Walkthrough Canvas & Concise Chat Output
- **Instead of outputting all changes, implementation logs, and QA breakdowns directly in chat, create/update a Walkthrough canvas artifact (`walkthrough.md`).**
- In the chat response, output **only a brief sentence pointing the user to the Walkthrough canvas document** and asking for approval. All exhaustive technical diffs, formulas, verification logs, and demo instructions belong in the Walkthrough artifact.

### Rule 5: Anti-Spoiler & Narrative Mystery Protocol
- **No Plain-Text Spoilers in UI/Data**: Location descriptions, quest headers, data catalogs, and UI banners must NEVER reveal upcoming boss identities, unencountered beast lists, or future act plot twists in plain text.
- **Dynamic Content Masking**:
  - **Locked Acts**: Display locked Acts in location menus as `Act [Roman]: ??? Unknown Territory (Requires Level X / Defeat Previous Act Guardian)`.
  - **Undiscovered Act Bosses**: Mask undiscovered or level-gated Act Guardian names as `??? Undiscovered Act Guardian` until the player reaches the required Climax Level and triggers the Boss Discovery event.
  - **Undiscovered Quests & Bounties**: Mask unencountered quest targets, bounty details, and enemy names until discovered in-game.

---

## 3. Game Systems & Formula Fidelity

### A. 8 Main Acts & Progression Mechanics
1. **8 Main Acts**:
   - Act I: *The Whispering Balete Forest* (Lv 1–6, 3 Enemies, Boss: *The Ancient Kapre*)
   - Act II: *Lagoon of the Sunken Sirens* (Lv 7–12, 3 Enemies, Boss: *Magindara The Siren Matriarch*)
   - Act III: *Caves of the Ancestral Dead* (Lv 13–18, 3 Enemies, Boss: *Avatar of the Sun God / Shadow Apolaki*)
   - Act IV: *The Ash-Wreathed Caldera* (Lv 19–25, 4 Enemies, Boss: *Heart of Mount Kanlaon*)
   - Act V: *The Cursed Blood Coast* (Lv 26–32, 5 Enemies, Boss: *The Primordial Aswang Warlord*)
   - Act VI: *Trench of the Abyssal Tide* (Lv 33–39, 6 Enemies, Boss: *Tambanokano The Moon-Crusher*)
   - Act VII: *Spires of the Sky-Citadel* (Lv 40–46, 7 Enemies, Boss: *Celestial Arbiter of Mount Arayat*)
   - Act VIII: *Maw of the Great Eclipse* (Lv 47–55+, 8 Enemies, Boss: *Bakunawa The Moon-Devouring Serpent*)
2. **Mandatory Act Boss**:
   - Defeating the Act Guardian Boss is mandatory to unlock access to the next Act.
3. **3 Mandatory Side Quests per Act & Forfeit Gate**:
   - Each Act contains exactly 3 side quests (24 total).
   - All 3 side quests must be completed before entering the next Act.
   - If the player advances past an Act without completing its side quests, those uncompleted quests become **permanently forfeited**.
4. **Enemy Count Formula**:
   - Acts 1 to 3: Exactly 3 regular monster types each.
   - Acts 4 to 8: Exactly $[Act\ Number]$ regular monster types (Act 4 has 4, Act 5 has 5, Act 6 has 6, Act 7 has 7, Act 8 has 8).
   - Total: 39 regular monsters + 8 legendary Act Bosses.
5. **Bounties System**:
   - 10 Bounties per Act (80 total).
   - Unlocked strictly upon reaching **Character Level 3**.
   - Maximum of **3 active bounties** accepted concurrently.
   - Each bounty specifies a minimum character level requirement.
6. **Mount System (Post-Act 6)**:
   - Dedicated Mount equipment slot replaces legacy Bike/Vehicle slots.
   - Mount slot is locked from Acts 1 to 6.
   - Slaying the Act 6 Boss (*Tambanokano*) unlocks the **Beastmaster Stables** and grants mythical mounts (*Armored Tamaraw*, *Sacred Mountain Carabao*, *Gilded Sarimanok Drake*, *Shadow Sigbin*, *Moon Dragon Wyrmling*).

---

### B. Attributes, Skill Progression & Economy
1. **Attributes & Cross-Stat Utility**:
   - Starting: 10 STR, 10 AGI, 10 INT, 10 VIT.
   - Level-up: +3 Attribute Points (AP) and +1 Skill Point (SP) to allocate.
   - Primary attribute effects with cross-stat synergies:
     - **Strength (STR)**: +2.5 Flat Physical Damage (Melee), +1.5% Crit Damage Multiplier, +0.4 Bonus Armor & Shield Poise, +1 Bag Slot per 3 points.
     - **Agility (AGI)**: +2.5 Flat Physical Damage (Bows/Daggers), +0.35% Dodge Rate, +0.4% Critical Hit Chance, +0.3% Armor Penetration.
     - **Intelligence (INT)**: +3.0 Magic Damage (Staves), +8 Max MP, +0.8 Magic Defense (Elemental Mitigation), +1 In-Combat MP/turn per 10 INT, +1.5% Potion Recovery Potency.
     - **Vitality (VIT)**: +25 Max Health, +0.8 Physical Armor, +0.15 In-Combat HP/turn, +0.5% Debuff Tenacity, (1 + VIT * 0.2) out-of-combat HP regen/tick.
   - Mathematical Formulas:
     - `Max HP = 100 + (VIT * 25) + (Level * 15) + Bonus HP`
     - `Max MP = 30 + (INT * 8) + (Level * 5) + Bonus MP`
     - `Damage Reduction (%) = [Armor / (Armor + 150)] * 100` (capped at 85%)
     - `Magic DR (%) = [MagicDef / (MagicDef + 100)] * 100` (capped at 75%)
     - `Crit Multiplier = 1.50 + (STR * 0.015) + Bonus Crit DMG`
     - `Dodge Rate (%) = min(60, AGI * 0.35 + Bonus Dodge)`
     - `Crit Rate (%) = min(75, AGI * 0.4 + Bonus Crit)`
     - `Armor Pen (%) = min(40, AGI * 0.3)`
     - `EXP Required for Level N = 120 * (1.28 ^ (N - 1)) + 80 * N`
2. **3-Pillar ARPG Skill Tree System**:
   - 1 Skill Point (SP) earned per character level starting at Level 1.
   - Each of the 4 Hero Classes features 3 Thematic Specialization Pillars (15–18 nodes per class).
   - Active skills scale across Ranks 1–5 (costing 1 SP per rank); Passive Keystones cost 1 SP (single allocation).
   - Strict 3-slot combat hotbar: players can only equip up to 3 active skills in battle.
   - Synergy Tag System (`[Combo: Bleed]`, `[Consumes: Burn]`, `[Barrier]`, etc.) highlights matching nodes across all pillars.
3. **Pre-Colonial Tiered Economy (100:1 Ratio) & Crafting**:
   - **Cowrie Shells (Base Coin)**: Base everyday trade currency.
   - **Silver Pieces**: 1 Silver Piece = 100 Cowrie Shells (used for gear, sanctuary rests, and "Ritual of Cleansing" SP respec).
   - **Gold Ingots / Piloncitos**: 1 Gold Ingot = 100 Silver Pieces = 10,000 Cowrie Shells.
   - **Mutya Shards**: Sacred pearls reserved strictly for "Mutya Affix Blessings" at Panday Pira's Forge (affix rerolls with dynamic break risk, ancestral affix locking, and tier implicits). Completely decoupled from skill unlocking.

---

### C. Dual Viewport Standard (Mobile & Desktop)
- **Mobile Viewport (< 768px)**:
  - Ergonomic thumb-zone bottom navigation bar (`Sanctuary`, `World / Hunt`, `Inventory`, `Hero`, `Log & Chat`).
  - Sheet drawers and slide-overs for item inspection and stat distribution.
  - Sticky combat action dock for quick ability execution.
  - Minimum touch target size $\ge 44\text{px}$.
- **Desktop Viewport (≥ 768px)**:
  - Multi-pane layout: Hero Paper Doll & Stats (Left), Arena & Exploration Stage (Center), Equipment / Inventory / Log (Right).
  - Keyboard shortcuts (`1-5` for combat, `C` for character, `I` for inventory, `T` for town, `B` for battle, `R` for roadmap).
- **Aesthetic**:
  - Dark tropical fantasy parchment / obsidian slate theme, warm amber and ember accents, readable serif headers, clean monospace stat readouts.

