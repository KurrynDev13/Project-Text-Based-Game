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
- [ ] **Milestone 1.1: Pre-Colonial Economy & Type Architecture**
  - Technical Implementation: Update `Wallet` in `src/types/game.ts` to use `cowrieShells`, `silverPieces`, `goldIngots`, and `mutyaShards` with 100:1 conversion.
  - Technical Implementation: Replace legacy `bike` slot in `EquipmentSlots` with dedicated `mount: EquipmentItem | null` slot.
  - Technical Implementation: Add Act progression tracking types (`act6Completed`, `mountUnlocked`, `forfeitedQuestIds`, `unlockedActId`).
- [ ] **Milestone 1.2: Mathematical Engine & Mount Stat Scaling**
  - Technical Implementation: Update `src/utils/gameFormulas.ts` with Cowrie Shell formatters (`formatCostInCowries`, `totalCowriesFromWallet`).
  - Technical Implementation: Update `calcDerivedStats` to calculate mount bonuses (Speed, HP, Armor, Elemental resistances).
- [ ] **Milestone 1.3: 10-Tier English Bladed Weapons, Armors & Post-Act 6 Mounts**
  - Technical Implementation: 10 tiers of Daggers & Shortblades (*Rusted Sickle*, *Batangas Balisong*, *Moro Kalis*, *Venomous Dahong Palay*, *Silvered Kris*).
  - Technical Implementation: 10 tiers of Swords (*Itak*, *Jungle Bolo*, *Barong*, *Panabas Cleaver*, *Lapu-Lapu's Great Kampilan*, *Apolaki's Sun Greatsword*).
  - Technical Implementation: 10 tiers of Ranged Weapons (*Bamboo Bow*, *Rattan Shortbow*, *Hunter's Sumpit Poison Blowgun*, *Ironwood Warbow*).
  - Technical Implementation: 10 tiers of Staves (*Bamboo Cane*, *Shaman's Yantok*, *Carabao Horn Staff*, *Mayari Living-Wood Wand*).
  - Technical Implementation: 10 tiers of Upper Armor (*Woven Cotton*, *Abaca Jerkin*, *Carabao Leather Tunic*, *Sacred Pintados Tattoos*, *Rajah's Chainmail*).
  - Technical Implementation: 10 tiers of Lower Armor (*Woven Breeches*, *Rawhide Chaps*, *Studded Abaca Trousers*, *Warrior's Salawal*).
  - Technical Implementation: 5 Post-Act 6 Mythical Mounts (*Armored Tamaraw War Buffalo*, *Sacred Mountain Carabao*, *Gilded Sarimanok Drake*, *Shadow Sigbin Hound*, *Bakunawa Hatchling*).

---

### Phase 2: The 8-Act World, 39 Monsters & 8 Bosses Engine
- [ ] **Milestone 2.1: 8 Act Zones & Exploration Data**
  - Technical Implementation: Define 8 Act Locations in `equipmentData.ts` with English titles, level brackets, and lore:
    - Act I: *The Whispering Balete Forest* (Lv 1–6)
    - Act II: *Lagoon of the Sunken Sirens* (Lv 7–12)
    - Act III: *Caves of the Ancestral Dead* (Lv 13–18)
    - Act IV: *The Ash-Wreathed Caldera* (Lv 19–25)
    - Act V: *The Cursed Blood Coast* (Lv 26–32)
    - Act VI: *Trench of the Abyssal Tide* (Lv 33–39)
    - Act VII: *Spires of the Sky-Citadel* (Lv 40–46)
    - Act VIII: *Maw of the Great Eclipse* (Lv 47–55+)
- [ ] **Milestone 2.2: 39 Regular Monsters (Exact Formula)**
  - Technical Implementation: 3 enemies each for Acts 1 to 3 ($3 + 3 + 3 = 9$).
  - Technical Implementation: $[N]$ enemies for Acts 4 to 8 ($4 + 5 + 6 + 7 + 8 = 30$).
  - Technical Implementation: Full stat blocks, damage types, drop rates, and abilities in `monstersData.ts`.
- [ ] **Milestone 2.3: 8 Mandatory Act Guardian Bosses**
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
- [ ] **Milestone 3.1: 80 Bounties Database (10 Per Act)**
  - Technical Implementation: Build all 80 bounties in `src/data/bountiesData.ts` with English titles, targets, minimum level locks, and rewards.
  - Technical Implementation: Level 3+ unlock validation.
  - Technical Implementation: Strict maximum 3 active bounties constraint.
- [ ] **Milestone 3.2: 24 Mandatory Side Quests (3 Per Act)**
  - Technical Implementation: Build 3 mandatory side quests per Act with English lore objectives.
  - Technical Implementation: Journal tracking in `src/components/JournalView.tsx` with Active, Completed, and Forfeited state badges.

---

### Phase 4: Act Progression Gates, Forfeit Mechanics & Mount Unlock
- [ ] **Milestone 4.1: Act Gate & Forfeit Protocol**
  - Technical Implementation: In `WorldHuntView.tsx`, prevent advancing to Act $N+1$ until Act $N$ Boss is defeated AND all 3 side quests in Act $N$ are completed.
  - Technical Implementation: Warning modal alerting player if any side quests will be forfeited.
- [ ] **Milestone 4.2: Post-Act 6 Mount Unlock & Stable Integration**
  - Technical Implementation: Lock Mount slot in `InventoryView.tsx` during Acts 1 to 6.
  - Technical Implementation: Slaying Act 6 Boss unlocks the Stables, awards the first mount, and permits equipping mounts.

---

### Phase 5: Town Hub (Poblacion Sanctuary), Combat Arena & Raid Polish
- [ ] **Milestone 5.1: Poblacion Sanctuary Overhaul**
  - Technical Implementation: Reskin `TownHub.tsx` into *Poblacion Sanctuary* (*Panday Pira's Forge*, *Sanctuary Inn*, *Shaman's Apothecary*, *Beastmaster Stables*, *Bounty Notice Board*).
- [ ] **Milestone 5.2: Martial Combat Arena & Bakunawa Moon-Serpent Raid**
  - Technical Implementation: Update `CombatArena.tsx` with English martial moves (*Kampilan Strike*, *Balisong Flurry*, *Shaman Orations*, *Sumpit Darts*).
  - Technical Implementation: Overhaul `TitanRaidView.tsx` into **Bakunawa: The Great Moon Serpent Raid**.
- [ ] **Milestone 5.3: End-to-End System QA & Production Build**
  - Technical Implementation: Type check validation (`tsc --noEmit`), Vite production build verification, and clean Level 1 starter state initialization.

---

## 🛡️ Operating Rules Reminder
- **Never proceed to the next phase without explicit User Approval in chat.**
- **Auto-mark `[x]` upon approval; remain in active QA mode until approved.**
- **Always ask the user when anything is unclear rather than assume.**

