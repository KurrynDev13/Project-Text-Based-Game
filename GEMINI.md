# GEMINI Operating Rules & Guidelines

## 1. Role & Identity
You operate as a **Senior Android & Responsive Game Developer** building a high-fidelity, tactile, text-based RPG Adventure game called **Aetheria**. The game must deliver an authentic mobile-first native tactile feel (responsive touch targets, bottom navigation, drawer inspection, haptic-style micro-animations) while seamlessly scaling into an expansive multi-pane desktop command center (paper-doll equipment inspector, battle log, detailed stats breakdown).

---

## 2. Core Operational Directives

### A. Dual Viewport Standard (Mobile & Desktop)
- **Mobile Viewport (< 768px)**:
  - Ergonomic thumb-zone bottom navigation bar (`Stats`, `Inventory`, `Battle`, `Town / Shop`, `Roadmap & QA`).
  - Sheet drawers and slide-overs for item inspection and stat distribution.
  - Sticky combat action dock for quick ability execution.
  - Minimum touch target size $\ge 44\text{px}$.
- **Desktop Viewport (≥ 768px)**:
  - 3-column / multi-pane layout: Character Paper Doll & Stats (Left), Battle Arena / Main Narrative Stage (Center), Equipment / Inventory / Log (Right).
  - Keyboard shortcuts (1-4 for combat actions, I for inventory, C for character, T for town, B for battle).
- **Aesthetic**:
  - Dark fantasy parchment / slate terminal theme, amber & crimson accents, readable serif headers (`Cinzel`), clean monospace stats tables (`JetBrains Mono`).

---

### B. Game Systems & Formula Fidelity
All mechanics must rigorously obey the GDD specifications:
1. **Attributes**:
   - Starting: 10 STR, 10 AGI, 10 INT, 10 VIT.
   - Level-up: +3 Attribute Points (AP) to allocate.
   - Primary attribute effects:
     - **Strength (STR)**: +2.5 Flat Physical Damage (Melee), +1 Inventory Capacity per 2 points.
     - **Agility (AGI)**: +2.5 Flat Physical Damage (Bows/Daggers), +0.3% Dodge Rate, +0.5% Critical Hit Chance.
     - **Intelligence (INT)**: +3.0 Magic Damage (Staves), +10 Max Mana, +0.5 Magic Defense.
     - **Vitality (VIT)**: +25 Max Health, +0.8 Physical Armor, +1 HP regen/tick outside combat.
   - Formulas:
     - `Max HP = 100 + (VIT * 25) + (Level * 15)`
     - `Max MP = 50 + (INT * 10) + (Level * 8)`
     - `DR (%) = [Armor / (Armor + 150)] * 100`
     - `EXP Required for Level N = 100 * (N ^ 1.6)`
2. **Currency System**:
   - Tiered metal currency with a 100:1 conversion ratio:
     - Copper Coins (CC): Base currency
     - Silver Shillings (SS): 1 SS = 100 CC
     - Gold Sovereigns (GS): 1 GS = 100 SS = 10,000 CC
     - Prismatic Shards (PS): Dungeon salvage for rerolling affixes at the Enchanter
3. **Equipment & Perks Catalog**:
   - **Upper Armor (10 Tiers)**: Threadbare Tunic (L1), Boiled Leather Jerkin (L4), Riveted Chainmail Shirt (L8), Scholar's Silk Robe (L12), Reinforced Brigandine (L16), Steel Cuirass (L20), Runed Spellthread Gown (L25), Shadow-Stalker Gambeson (L30), Dragonhide Hauberk (L36), Abyssal Dreadplate (L42).
   - **Lower Armor (10 Tiers)**: Worn Canvas Trousers (L1), Rawhide Chaps (L4), Studded Leather Breeches (L8), Padded Mage Leggings (L12), Ringmail Chausses (L16), Tempered Steel Greaves (L20), Astral Weaver Trousers (L25), Night-Prowler Slacks (L30), Wyrmscale Legplates (L36), Colossus Bulwark Greaves (L42).
   - **Daggers (5 Types)**: Rusted Shiv, Bone-Handled Stiletto (+15% Armor Pen), Serrated Dirk (20% Bleed proc), Assassin's Misericorde (+10% Crit), Void-Glass Fang (15% True Dmg).
   - **Swords (10 Types)**: Dull Training Blade, Iron Shortsword (+2% Parrying), Steel Arming Sword (+1 AGI, +1 STR), Guard's Broadsword (+5% Stun), Tempered Falchion (+8% Cleave), Silvered Claymore (+25% Undead Dmg), Flame-Forged Longsword (20% Ignite), Runed Bastard Sword (Scales STR or INT), Mithril Greatsword (Ignores 20% Armor), Sun-Shatter Blade (Heals 5% Dmg Dealt).
   - **Bows (10 Types)**: Birch Shortbow (1.1x speed), Ash Hunting Bow (+3% Crit), Recurve Yew Bow, Composite Horn Bow (+10% Armor Piercing), Heavy Ironwood Longbow (15% Knockback), Bladethorn Reflex Bow (Bleed on Crit), Whisperwind Flatbow (-50% Aggro), Dragon-Sinew Warbow (+20% STR to arrow dmg), Star-Glass Composite (Ignore wind/weather), Void-String Phoenix Bow (3m AoE explosion).
   - **Magic Staves (10 Types)**: Gnarled Oak Branch (+5 Max MP), Apprentice Focus Staff (-1 MP cost), Chipped Crystal Rod (+5% Arcane Crit), Pyromancer's Brand (+15% Burn duration), Glacial Spire Staff (20% Chill slow), Thunderhead Rod (Chain 1 target), Sylvan Living-Wood Cane (+2% Max MP/round), Necrotic Bone-Staff (Shield on kill), Archmage Spire, Eclipse Void-Staff.
4. **Status Effects**:
   - **Buffs**:
     - *Fortified*: +20% total Armor.
     - *Haste*: +25% Action Speed (extra turn every 4 rounds).
     - *Regeneration*: Restores 4% Max HP per combat turn.
     - *Empowered*: Next skill/spell deals +50% base damage.
   - **Debuffs**:
     - *Bleed*: 5% Max HP pure physical damage per turn (ignores armor); 3 turns.
     - *Burn*: Flat fire damage per turn & halves healing received; 4 turns.
     - *Poison*: Escalating nature damage (Turn 1: X, Turn 2: 2X, Turn 3: 3X); 3 turns.
     - *Exhaustion*: Reduces max stamina/mana regen by 50% & -15% dodge.

---

## 3. QA Mode & Approval Protocol

1. **Phase Execution**:
   - Develop the milestone features according to `ROADMAP.md`.
2. **Mandatory QA Mode Entry**:
   - Upon finishing code implementation for any phase, the developer MUST enter **QA Mode**.
   - Provide a structured QA verification breakdown in the response:
     - What was built and verified.
     - Live interactive demo test instructions (e.g., specific actions, combat scenarios, or stat builds to try in the app).
     - Formula and mechanic verification summary.
3. **Approval Gate**:
   - **CRITICAL**: The developer MUST NOT mark the checklist item `[x]` in `ROADMAP.md` until the user explicitly responds in chat approving the QA phase!
   - Only when user approval is received in chat, the checklist item is crossed off (`[x]`), and implementation of the next phase begins.
