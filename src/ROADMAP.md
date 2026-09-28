# Text-Based RPG Adventure Game Design - Comprehensive Development Roadmap

Welcome to the development roadmap for **Aetheria: The Shattered Bastion**, built strictly and thoroughly according to the complete 5-page Game Design Document (GDD).

---

## 📋 Overall Development Status & Checklist

Following our **QA Protocol**, items in a Phase are implemented and verified internally first, entering **QA Mode**. The checkboxes are **ONLY** crossed off (`[x]`) after receiving explicit user approval in chat.

---

### Phase 1: Core Systems, Character Stats & Tiered Economy Engine
- [ ] **Milestone 1.1: Primary Attributes & Attribute Point Allocation**
  - Technical Implementation: Initialize base stats at 10 points each: Strength (`STR`), Agility (`AGI`), Intelligence (`INT`), and Vitality (`VIT`).
  - Technical Implementation: Award +3 Attribute Points (AP) per character level-up for player allocation.
  - Technical Implementation: `STR` effects: +2.5 Flat Physical Damage (Melee), +1 Inventory Capacity per 2 points.
  - Technical Implementation: `AGI` effects: +2.5 Flat Physical Damage (Bows/Daggers), +0.3% Dodge Rate, +0.5% Critical Hit Chance.
  - Technical Implementation: `INT` effects: +3.0 Magic Damage (Staves), +10 Max Mana, +0.5 Magic Defense.
  - Technical Implementation: `VIT` effects: +25 Max Health, +0.8 Physical Armor, +1 HP regen/tick outside combat.
- [ ] **Milestone 1.2: Derived Stats & Mathematical Formulas Engine**
  - Technical Implementation: `Max HP` = `100 + (VIT * 25) + (Level * 15)`
  - Technical Implementation: `Max MP` = `50 + (INT * 10) + (Level * 8)`
  - Technical Implementation: `Damage Reduction (%)` = `[Armor / (Armor + 150)] * 100`
  - Technical Implementation: `Level Progression`: EXP needed for level N: `EXP_Req = 100 * (N ^ 1.6)`
- [ ] **Milestone 1.3: Tiered Metal Currency & Prismatic Economy**
  - Technical Implementation: 100:1 metal currency ratio system:
    - Copper Coins (CC): Base currency for street snacks, arrows, low-tier potions.
    - Silver Shillings (SS): 1 SS = 100 CC. Used for mid-tier gear, inn stays, standard weapon upgrades.
    - Gold Sovereigns (GS): 1 GS = 100 SS (10,000 CC). Used for high-tier artifacts, property, exotic spell tomes.
    - Prismatic Shards (PS): Rare dungeon-only salvage used to reroll randomized affixes at the Enchanter.
  - Technical Implementation: Utility functions for parsing currency display (e.g. `1 SS 20 CC`), automated upgrading/downgrading across metal tiers, and spending checks.

---

### Phase 2: Consumables, Status Effects & Full Equipment Database
- [ ] **Milestone 2.1: Status Effects Engine (Buffs & Debuffs)**
  - Technical Implementation: Buffs:
    - *Fortified*: Increases total Armor by 20%.
    - *Haste*: Action speed +25% (extra turn every 4 rounds).
    - *Regeneration*: Restores 4% Max HP per combat turn.
    - *Empowered*: Next skill/spell deals 50% more base damage.
  - Technical Implementation: Debuffs:
    - *Bleed*: Deals 5% Max HP as physical damage per turn (ignores armor); lasts 3 turns.
    - *Burn*: Deals flat fire damage per turn & halves healing received; lasts 4 turns.
    - *Poison*: Escalating nature damage (Turn 1: X, Turn 2: 2X, Turn 3: 3X); lasts 3 turns.
    - *Exhaustion*: Reduces max stamina/mana regeneration by 50% and decreases dodge by 15%.
- [ ] **Milestone 2.2: Consumable Items Engine**
  - Technical Implementation: Implement all 5 GDD consumables with cost, duration, and effects:
    - *Minor Healing Draught* (25 CC, Instantly recovers 50 HP, Instant)
    - *Elixir of Clarity* (45 CC, Recovers 40 MP and removes Exhaustion, Instant)
    - *Berserker's Brew* (1 SS 20 CC, +25% Physical DMG, -15% Armor, 4 Turns)
    - *Stoneskin Tincture* (1 SS 50 CC, Grants Fortified and immunity to Bleed, 5 Turns)
    - *Panacea Vial* (3 SS, Cleanses all active debuffs, Instant)
- [ ] **Milestone 2.3: Procedural Equipment Catalog (Armor & Weapons)**
  - Technical Implementation: Upper Armor (10 Tiers): Threadbare Tunic (L1, 4 Arm, Cloth/All), Boiled Leather Jerkin (L4, 9 Arm, +2 Dodge, Light/Rogue), Riveted Chainmail Shirt (L8, 16 Arm, Medium/Warrior), Scholar's Silk Robe (L12, 8 Arm, +12 MP, Cloth/Mage), Reinforced Brigandine (L16, 26 Arm, +5 HP, Medium/Balanced), Steel Cuirass (L20, 38 Arm, -2 Dodge, Heavy/Knight), Runed Spellthread Gown (L25, 18 Arm, +8% M.DMG, Cloth/Arcane), Shadow-Stalker Gambeson (L30, 32 Arm, +8% Crit, Light/Scout), Dragonhide Hauberk (L36, 48 Arm, +20 Fire RES, Medium/Elite), Abyssal Dreadplate (L42, 68 Arm, -5 Dodge, Heavy/Juggernaut).
  - Technical Implementation: Lower Armor (10 Tiers): Worn Canvas Trousers (L1, 2 Arm, Cloth/All), Rawhide Chaps (L4, 6 Arm, +1 Dodge, Light/Scout), Studded Leather Breeches (L8, 11 Arm, Medium/Rogue), Padded Mage Leggings (L12, 6 Arm, +8 MP, Cloth/Mage), Ringmail Chausses (L16, 18 Arm, Medium/Warrior), Tempered Steel Greaves (L20, 26 Arm, -1 Dodge, Heavy/Knight), Astral Weaver Trousers (L25, 12 Arm, +5% M.DMG, Cloth/Arcane), Night-Prowler Slacks (L30, 22 Arm, +5% Dodge, Light/Assassin), Wyrmscale Legplates (L36, 34 Arm, +15 Fire RES, Medium/Elite), Colossus Bulwark Greaves (L42, 48 Arm, -3 Dodge, Heavy/Juggernaut).
  - Technical Implementation: Daggers (5 Types): Rusted Shiv (L1, 4–7 Phys, +5% Crit Multiplier), Bone-Handled Stiletto (L8, 12–16 Phys, +15% Armor Penetration), Serrated Dirk (L16, 22–29 Phys, 20% Chance to Bleed), Assassin's Misericorde (L26, 38–48 Phys, +10% Crit Chance), Void-Glass Fang (L38, 58–70 Phys, 15% True Damage conversion).
  - Technical Implementation: Swords (10 Types): Dull Training Blade (L1), Iron Shortsword (L5, +2% Parrying), Steel Arming Sword (L10, +1 AGI/+1 STR), Guard's Broadsword (L15, +5% Stun), Tempered Falchion (L20, +8% Cleave), Silvered Claymore (L25, 2H, +25% vs Undead), Flame-Forged Longsword (L30, 20% Burn), Runed Bastard Sword (L35, Scales STR or INT), Mithril Greatsword (L40, Ignores 20% Armor), Sun-Shatter Blade (L45, Heals 5% DMG dealt).
  - Technical Implementation: Bows (10 Types): Birch Shortbow (L1, 1.1x speed), Ash Hunting Bow (L5, +3% Crit), Recurve Yew Bow (L10, +10m Range), Composite Horn Bow (L15, +10% Armor Pen), Heavy Ironwood Longbow (L20, 15% Knockback), Bladethorn Reflex Bow (L25, Bleed on Crit), Whisperwind Flatbow (L30, -50% Aggro), Dragon-Sinew Warbow (L35, +20% STR to arrow DMG), Star-Glass Composite (L40, Ignores weather), Void-String Phoenix Bow (L45, 3m AoE explosion).
  - Technical Implementation: Magic Staves (10 Types): Gnarled Oak Branch (L1, +5 MP), Apprentice Focus Staff (L5, -1 MP spell cost), Chipped Crystal Rod (L10, +5% Arcane Crit), Pyromancer's Brand (L15, +15% Burn duration), Glacial Spire Staff (L20, 20% Chill slow), Thunderhead Rod (L25, Spells chain to +1 target), Sylvan Living-Wood Cane (L30, Restores 2% MP/round), Necrotic Bone-Staff (L35, Shielding on kill), Archmage Spire (L40), Eclipse Void-Staff (L45).

---

### Phase 3: Central Hub (Haven's Rest) & Exploration Loop
- [ ] **Milestone 3.1: Haven's Rest Central Hub**
  - Technical Implementation: *The Iron Anvil*: Blacksmith upgrades base gear tiers; Enchanter rerolls randomized affixes (prefixes/suffixes) using Prismatic Shards (PS).
  - Technical Implementation: *The Rusty Goblet*: Inn to clear Exhaustion debuffs, buy food buffs, and accept Colossus Bounties.
  - Technical Implementation: *The Alchemist's Mortar*: Brew recovery vials, draughts, and refine herbs.
  - Technical Implementation: *The Anchor Gate*: Waypoint portal to unlocked Act expedition zones.
- [ ] **Milestone 3.2: Sector Exploration Loop**
  - Technical Implementation: `[Scout / Step Forward]`: Standard step; rolls random encounter, event, or resource node.
  - Technical Implementation: `[Search Surroundings]`: High-risk scan; boosts chest rates and triggers elite ambushes.
  - Technical Implementation: `[Camp / Rest]`: Consume food to recover HP/MP with night ambush risk.
  - Technical Implementation: `[Challenge Sector Boss]`: Unlocks after discovering 3 regional clues or defeating sector lieutenants.

---

### Phase 4: Main Campaign (Acts I to V) & World Boss Raids
- [ ] **Milestone 4.1: Act I - The Awakening Fog (Levels 1–10)**
  - Technical Implementation: Zone: *The Ashen Glade* (Mist-choked forest, timber wolves, scavengers). Gear Bracket: Tier 1–2.
  - Technical Implementation: Objective: Cleanse corrupted spring poisoning Haven's water source.
  - Technical Implementation: Climax: Defeat Anchor Boss **Root-Hulk Malphas** (hollow ironwood ancient animated by leaking shard). Slaying Malphas stabilizes 1st Anchor and reveals sabotage.
- [ ] **Milestone 4.2: Act II - The Weeping Tombs (Levels 10–20)**
  - Technical Implementation: Zone: *The Sunken Catacombs* (Flooded crypts, skeleton sentries, marsh leeches). Gear Bracket: Tier 3–4.
  - Technical Implementation: Objective: Track rogue Ash-Sworn cult into royal necropolis beneath Haven.
  - Technical Implementation: Climax: Confront Anchor Boss **High Priestess Valthea** on Sunken Dais. Slashes 2nd Anchor before your eyes.
- [ ] **Milestone 4.3: Act III - The Cinder Wastes (Levels 20–30)**
  - Technical Implementation: Zone: *Scorch-Rock Crags* (Sulfuric vents, volcanic drakes, dwarven reavers). Gear Bracket: Tier 5–6.
  - Technical Implementation: Objective: Secure high passes to reach Ancient Forge.
  - Technical Implementation: Climax: Slay Anchor Boss **Ignis the Pyre Wyrm** nesting over geothermal Great Anvil.
- [ ] **Milestone 4.4: Act IV - The Abyss Unveiled (Levels 30–40)**
  - Technical Implementation: Zone: *The Sunless Depths* (Subterranean bioluminescent chasms, aberrant horrors, void heralds). Gear Bracket: Tier 7–8.
  - Technical Implementation: Objective: Descend into planetary mantle to reactivate Master Seal.
  - Technical Implementation: Climax: Defeat Anchor Boss **Void-Gazer Xar'koth** (astral aberration feeding on sanity).
- [ ] **Milestone 4.5: Act V - The Shattered Ascent (Levels 40–50)**
  - Technical Implementation: Zone: *The Broken Crown* (Floating obsidian spires suspended by raw aether). Gear Bracket: Tier 9–10.
  - Technical Implementation: Climax / World Titan Raid: **Gorgoroth, the Earth-Breaker**. Multi-phase raid requiring targeting structural limbs, sundering heavy plates with elemental weaknesses, and bracing against arena tremors.

---

### Phase 5: Side Quests, World Encounters & Colossus Bounties
- [ ] **Milestone 5.1: Side Quest 1 - The Blind Cartographer**
  - Technical Implementation: Unlock via Cracked Compass in Act I glade. Task: Kindle beacon fires at high outlooks across all 5 zones. Reward: Permanent map vision (-15% ambush chance, +10% chest spawn).
- [ ] **Milestone 5.2: Side Quest 2 - Blood of the Forge**
  - Technical Implementation: Unlock via Torvald the Smith at Tier 3 gear. Task: Harvest 3 elite beasts: Brine-Tusk Boar, Obsidian Crab, Chitin Stalker. Reward: Masterwork Sockets (locks 1 chosen affix during rerolls).
- [ ] **Milestone 5.3: Side Quest 3 - The Deserting Herald**
  - Technical Implementation: Event with wounded cult defector carrying relics. Decisions: Execute for bounty (+5 SS, rep), Heal him (unlocks black market vendor), or Rob him (curse: +10% Crit, -50 Max HP).
- [ ] **Milestone 5.4: Colossus Bounties Notice Board**
  - Technical Implementation: Unlock at Rusty Goblet (Lv 15+). Hunt daily elite monsters with rolled combat affixes for Prismatic Shards, Gold Sovereigns, and chest keys.

---

### Phase 6: Sample Text RPG Interface & Dual-Viewport Polish
- [ ] **Milestone 6.1: Authentic Text RPG Encounter Interface**
  - Technical Implementation: Render header with Location, Danger Level, HP, MP, Status, Equipped Gear, and Metal / Prismatic Shard counters.
  - Technical Implementation: Event card displaying beast descriptions, debuff risks, and command dock: `[1] Attack`, `[2] Cast Spell`, `[3] Parry & Counter`, `[4] Use Item`, `[5] Attempt Retreat (AGI check)`.
- [ ] **Milestone 6.2: Dual Viewport Responsiveness (Mobile & Desktop)**
  - Technical Implementation: Mobile (< 768px): Thumb-zone bottom navbar (`Hero`, `Inventory`, `Battle`, `Haven Hub`, `Sectors`, `Roadmap & QA`), bottom sheet modals, sticky action dock.
  - Technical Implementation: Desktop (≥ 768px): Multi-column layout with Paper-Doll Inspector, Stage/Terminal, and Inventory/Log sidebar. Keyboard shortcuts (`1-5`, `C`, `I`, `B`, `T`, `R`).
- [ ] **Milestone 6.3: Web Audio API & State Persistence**
  - Technical Implementation: Synthesize combat hits, spell casts, item gulping, coins clinking, and level-up fanfares via Web Audio API.
  - Technical Implementation: Full local storage persistence with JSON import/export save states.

---

## 🛡️ QA Protocol & Approval Gate

1. **Phase Execution**: Features for each phase are built and verified internally.
2. **Mandatory QA Mode**: Upon finishing code implementation for any phase, the developer MUST enter **QA Mode** in the chat summary.
3. **Approval Gate**: **CRITICAL: The developer MUST NOT mark any checklist item `[x]` in `ROADMAP.md` until the user explicitly responds in chat approving the QA phase!**
4. **Transition**: Once user approval is received in chat, the checklist items for that phase are marked as completed (`[x]`), and implementation proceeds to the next phase.
