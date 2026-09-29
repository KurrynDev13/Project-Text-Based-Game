# Philippine Mythology RPG — Comprehensive Development Roadmap

Welcome to the comprehensive development roadmap for **Maharlika: Legends of the Archipelago**, built strictly according to the Philippine Mythology & Folklore design specifications.

---

## 📋 Overall Development Status & Checklist

Following our **QA & Approval Protocol**:
1. Features for each phase are built and verified internally.
2. Upon completing a phase, we enter **Active QA Mode** with a structured verification breakdown and interactive test steps.
3. The checklist item is **AUTOMATICALLY crossed off (`[x]`) ONLY upon receiving explicit user approval in chat**.
4. We **ONLY proceed to the next phase when the previous phase has been approved**.
5. If anything is unclear, we **always ask the user rather than make assumptions**.

---

### Phase 1: Core Types, Economy & Equipment Catalog (Mounts & 10 Tiers)
- [x] **Milestone 1.1: Pre-Colonial Economy & Type Architecture**
  - Technical Implementation: Update `Wallet` in `src/types/game.ts` to use `cowrieShells`, `silverPieces`, `goldIngots`, and `mutyaShards` with 100:1 conversion.
  - Technical Implementation: Replace legacy `bike` slot in `EquipmentSlots` with dedicated `mount: EquipmentItem | null` slot.
  - Technical Implementation: Add Act progression tracking types (`act6Completed`, `mountUnlocked`, `forfeitedQuestIds`, `unlockedActId`).
- [x] **Milestone 1.2: Mathematical Engine & Mount Stat Scaling**
  - Technical Implementation: Update `src/utils/gameFormulas.ts` with Cowrie Shell formatters (`formatCostInCowries`, `totalCowriesFromWallet`).
  - Technical Implementation: Update `calcDerivedStats` to calculate mount bonuses (Speed, HP, Armor, Elemental resistances).
- [x] **Milestone 1.3: 10-Tier English Bladed Weapons, Armors & Post-Act 6 Mounts**
  - Technical Implementation: 10 tiers of Daggers & Shortblades (*Rusted Sickle*, *Batangas Balisong*, *Moro Kalis*, *Venomous Dahong Palay*, *Silvered Kris*).
  - Technical Implementation: 10 tiers of Swords (*Itak*, *Jungle Bolo*, *Barong*, *Panabas Cleaver*, *Lapu-Lapu's Great Kampilan*, *Apolaki's Sun Greatsword*).
  - Technical Implementation: 10 tiers of Ranged Weapons (*Bamboo Bow*, *Rattan Shortbow*, *Hunter's Sumpit Poison Blowgun*, *Ironwood Warbow*).
  - Technical Implementation: 10 tiers of Staves (*Bamboo Cane*, *Shaman's Yantok*, *Carabao Horn Staff*, *Mayari Living-Wood Wand*).
  - Technical Implementation: 10 tiers of Upper Armor (*Woven Cotton*, *Abaca Jerkin*, *Carabao Leather Tunic*, *Sacred Pintados Tattoos*, *Rajah's Chainmail*).
  - Technical Implementation: 10 tiers of Lower Armor (*Woven Breeches*, *Rawhide Chaps*, *Studded Abaca Trousers*, *Warrior's Salawal*).
  - Technical Implementation: 5 Post-Act 6 Mythical Mounts (*Armored Tamaraw War Buffalo*, *Sacred Mountain Carabao*, *Gilded Sarimanok Drake*, *Shadow Sigbin Hound*, *Bakunawa Hatchling*).

---

### Phase 2: The 8-Act World, 39 Monsters & 8 Bosses Engine
- [x] **Milestone 2.1: 8 Act Zones & Exploration Data**
  - Technical Implementation: Define 8 Act Locations in `equipmentData.ts` with English titles, level brackets, and lore:
    - Act I: *The Whispering Balete Forest* (Lv 1–6)
    - Act II: *Lagoon of the Sunken Sirens* (Lv 7–12)
    - Act III: *Caves of the Ancestral Dead* (Lv 13–18)
    - Act IV: *The Ash-Wreathed Caldera* (Lv 19–25)
    - Act V: *The Cursed Blood Coast* (Lv 26–32)
    - Act VI: *Trench of the Abyssal Tide* (Lv 33–39)
    - Act VII: *Spires of the Sky-Citadel* (Lv 40–46)
    - Act VIII: *Maw of the Great Eclipse* (Lv 47–55+)
- [x] **Milestone 2.2: 39 Regular Monsters (Exact Formula)**
  - Technical Implementation: 3 enemies each for Acts 1 to 3 ($3 + 3 + 3 = 9$).
  - Technical Implementation: $[N]$ enemies for Acts 4 to 8 ($4 + 5 + 6 + 7 + 8 = 30$).
  - Technical Implementation: Full stat blocks, damage types, drop rates, and abilities in `monstersData.ts`.
- [x] **Milestone 2.3: 8 Mandatory Act Guardian Bosses**
  - Technical Implementation: Build all 8 Act Bosses with unique combat abilities and climax mechanics:
    - Act I: *The Ancient Kapre*
    - Act II: *Magindara, The Siren Matriarch*
    - Act III: *Avatar of the Sun God (Shadow Apolaki)*
    - Act IV: *Heart of Mount Kanlaon*
    - Act V: *The Primordial Aswang Warlord*
    - Act VI: *Tambanokano, The Moon-Crusher*
    - Act VII: *Celestial Arbiter of Mount Arayat*
    - Act VIII: *Bakunawa, The Moon-Devouring Serpent*

---

### Phase 3: 80 Bounties System & 24 Mandatory Side Quests
- [x] **Milestone 3.1: 80 Bounties Database (10 Per Act)**
  - Technical Implementation: Build all 80 bounties in `src/data/bountiesData.ts` with English titles, targets, minimum level locks, and rewards.
  - Technical Implementation: Strict Level 3+ unlock check in Poblacion Sanctuary Notice Board.
  - Technical Implementation: Strict maximum 3 active bounties constraint with abandon support.
- [x] **Milestone 3.2: 24 Mandatory Side Quests (3 Per Act) & Wilderness Discovery**
  - Technical Implementation: Build 3 mandatory side quests per Act with English lore objectives and pre-colonial rewards.
  - Technical Implementation: Organic Wilderness Quest Discovery (45% chance when venturing forward to encounter quest givers; masked `??? Undiscovered Quest` in Journal until discovered).
  - Technical Implementation: Journal tracking in `src/components/JournalView.tsx` with Active, Completed, and Forfeited state badges.

---

### Phase 4: Act Progression Gates, Climax Level Gates, Forfeit Mechanics & Mount Unlock
- [x] **Milestone 4.1: Act Climax Level Gate & Forfeit Protocol**
  - Technical Implementation: Act Climax Level Gate strictly prevents challenging Act Guardian Bosses before the Act climax level (Act 1: Lv 6, Act 2: Lv 12, Act 3: Lv 18, Act 4: Lv 25, Act 5: Lv 32, Act 6: Lv 39, Act 7: Lv 46, Act 8: Lv 53).
  - Technical Implementation: In `WorldHuntView.tsx`, prevent advancing to Act $N+1$ until Act $N$ Boss is defeated.
  - Technical Implementation: Warning modal alerting player if any side quests are undiscovered or uncompleted, requiring explicit confirmation before permanent forfeiture.
- [x] **Milestone 4.2: Post-Act 6 Mount Unlock & Stable Integration**
  - Technical Implementation: Lock Mount slot in `InventoryView.tsx` during Acts 1 to 6.
  - Technical Implementation: Slaying Act 6 Boss unlocks the Stables, awards the first mount, and permits equipping mounts.

---

### Phase 5: Town Hub (Poblacion Sanctuary), Combat Arena & Raid Polish
- [x] **Milestone 5.1: Poblacion Sanctuary Overhaul**
  - Technical Implementation: Reskin `TownHub.tsx` into *Poblacion Sanctuary* (*Panday Pira's Forge*, *Sanctuary Inn*, *Shaman's Apothecary*, *Beastmaster Stables*, *Bounty Notice Board*).
- [x] **Milestone 5.2: Martial Combat Arena & Bakunawa Moon-Serpent Raid**
  - Technical Implementation: Update `CombatArena.tsx` with English martial moves (*Kampilan Strike*, *Balisong Flurry*, *Shaman Orations*, *Sumpit Darts*).
  - Technical Implementation: Overhaul `TitanRaidView.tsx` into **Bakunawa: The Great Moon Serpent Raid**.
- [x] **Milestone 5.3: End-to-End System QA & Production Build**
  - Technical Implementation: Type check validation (`tsc --noEmit`), Vite production build verification, and clean Level 1 starter state initialization.

---

### Phase 6: Character Creation, Class System & Single Weapon Refactor
- [x] **Milestone 6.1: Character Creation Modal & Opening Lore**
  - Technical Implementation: Build `CharacterCreationModal.tsx` (2-step class selection + hero name input with pre-colonial class descriptions and stat previews).
  - Technical Implementation: Build `OpeningStoryModal.tsx` (cinematic auto-scroll parchment lore with pause-on-hold behavior).
  - Technical Implementation: Launch both modals on new game start (`hasCreatedCharacter = false`).
- [x] **Milestone 6.2: Class-Locked Single Weapon Slot Refactor**
  - Technical Implementation: Consolidate `primaryWeapon`, `specialWeapon`, `heavyWeapon` into a single `weapon` slot in `EquipmentSlots`.
  - Technical Implementation: Add `classReq: HeroClass[]` to all weapon entries (Mandirigma: Swords, Bagani: Daggers, Mangangaso: Bows, Babaylan: Staves).
  - Technical Implementation: Enforce class compatibility checks in `InventoryView.tsx` and `TownHub.tsx` store.
  - Technical Implementation: Update `CharacterSheet.tsx` paper doll to single weapon slot.

---

### Phase 7: Mutya Skill Tree System (32 Skills, 3 Equipped)
- [x] **Milestone 7.1: 32-Skill Database (8 Per Class)**
  - Technical Implementation: Build `src/data/skillsData.ts` with 8 skills per class (Mandirigma, Bagani, Mangangaso, Babaylan), tiered 1–4, with Mutya unlock costs and pre-colonial lore flavor text.
  - Technical Implementation: Each class starts with 1 basic attack + 1 pre-unlocked Tier 1 signature skill equipped by default.
- [x] **Milestone 7.2: Interactive Skill Tree UI & Combat Integration**
  - Technical Implementation: Build `SkillTreeView.tsx` with tier-grouped skill cards, Mutya spending, and 3-slot loadout bar.
  - Technical Implementation: Update `CombatArena.tsx` to render equipped skills dynamically (up to 3 skill buttons + Take Cover).
  - Technical Implementation: Integrate skill damage types, healing skills, and status effect skills into combat engine.

---

### Phase 8: Narrative Immersion — Act Story Overlays & Boss Discovery Cards
- [x] **Milestone 8.1: Act Story Parchment Overlays**
  - Technical Implementation: Build `ActStoryOverlayModal.tsx` with auto-scroll parchment lore, drag/touch-to-pause, for each Act entered for the first time.
  - Technical Implementation: Wire into `WorldHuntView.tsx` via `unlockedActStoryIds` tracking.
- [x] **Milestone 8.2: Boss Discovery Warning Card & SFX**
  - Technical Implementation: Build `BossDiscoveryModal.tsx` with pulsing red warning animation, boss lore, level gate check, and warning SFX.
  - Technical Implementation: Add `playBossWarningSound()` to Web Audio API synthesizer.
  - Technical Implementation: Wire into `WorldHuntView.tsx` via `discoveredBossIds` tracking.

---

### Phase 9: Progression Visibility Locks & Feature Tutorials
- [x] **Milestone 9.1: Hide Locked Game Content**
  - Technical Implementation: Hide locked Acts, Bounties, and Quests until player reaches required level/Act.
  - Technical Implementation: Filter class-incompatible weapons and locked gear tiers in Panday Pira's Forge.
- [x] **Milestone 9.2: Mandatory Feature Tutorials with Skip**
  - Technical Implementation: Build `FeatureTutorialModal.tsx` with multi-step tutorial cards, Skip Tutorial button, and `tutorialsSeen` tracking in `PlayerCharacter`.
  - Technical Implementation: Trigger tutorials on first unlock of key features (Bounties at Level 3, Skill Tree, Beastmaster Stables).

---

### Phase 10: Codebase Cleanup & Final Production QA
- [x] **Milestone 10.1: Remove Legacy Dead Code**
  - Technical Implementation: Remove all references to old `primaryWeapon`, `specialWeapon`, `heavyWeapon` slots.
  - Technical Implementation: Remove unused legacy `BIKES` alias and `copperCoins`, `silverShillings`, `goldSovereigns` wallet fields.
  - Technical Implementation: Remove `EncryptedMemory` / Codebreaker system if confirmed obsolete.
- [x] **Milestone 10.2: End-to-End QA & Production Build**
  - Technical Implementation: Full `tsc --noEmit` type check + `vite build` production bundle verification.
  - Technical Implementation: QA all 8 Acts, class creation flows, skill unlocking, boss discovery, and Act story overlays.

---

### Phase 11: Elemental Debuffs, Affixes & Status Mitigation Engine
- [x] **Milestone 11.1: Alchemist Merchant Currency Bug Fix & Wallet Refactor**
  - Technical Implementation: Fix `handleBuyItem` in `TownHub.tsx` to correctly deduct Cowrie Shells, Silver Pieces, and Gold Ingots via `cowriesToWallet`.
- [x] **Milestone 11.2: Status Infliction & Debuff Mitigation Affix Catalog**
  - Technical Implementation: Enhance `Affix` and `EquipmentItem` types in `game.ts` with `statusInfliction`, `statusMitigation`, and `blessingAttempts`.
  - Technical Implementation: Add status infliction prefixes/suffixes for weapons and status mitigation/immunity affixes for armors in `equipmentData.ts` and `equipmentGenerator.ts`.
- [x] **Milestone 11.3: Mutya Pearl Affix Blessing Upgrade & Dynamic Break Risk Engine**
  - Technical Implementation: Implement Mutya Pearl Affix Blessing in `TownHub.tsx` with exponential break risk (5%, 15%, 30%, 50%, 80%, 100% lock) and scaling Mutya costs (1, 1, 2, 2, 3).
  - Technical Implementation: Roll status inflictions for weapons and mitigations/immunities for armors.
- [x] **Milestone 11.4: Combat Engine Enemy Status Infliction & Debuff Tick Mechanics**
  - Technical Implementation: Implement 17.5% regular / 80% boss status proc rates on enemy attacks in `CombatArena.tsx`.
  - Technical Implementation: Apply armor debuff mitigation resistance and immunity checks.
  - Technical Implementation: Execute start-of-turn status ticks for Bleed (5% HP pure dmg), Poison (escalating 1x/2x/3x), Burn (-50% heal), and Exhaustion.
- [x] **Milestone 11.5: UI Polish, Toast Notifications, & 8-Act Narrative Cutscenes**
  - Technical Implementation: Fixed Persistent HUD top overlay, mobile-native Toast Notification Banner popups (`ToastBanner.tsx`), Haven Action Pad relocation below Poblacion Sanctuary, and 8-Act expanded epic narrative story cutscenes (`actStoryData.ts` & `ActStoryOverlayModal.tsx`).

---

## 🛡️ Operating Rules Reminder
- **Never proceed to the next phase without explicit User Approval in chat.**
- **Auto-mark `[x]` upon approval; remain in active QA mode until approved.**
- **Always ask the user when anything is unclear rather than assume.**

