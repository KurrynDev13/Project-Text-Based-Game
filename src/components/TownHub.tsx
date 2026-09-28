import React, { useState } from 'react';
import { PlayerCharacter, EquipmentItem, ConsumableItem, Bounty, GameLocation } from '../types/game';
import { UPPER_ARMORS, LOWER_ARMORS, DAGGERS, SWORDS, BOWS, STAVES, CONSUMABLES, ENCHANTER_PREFIXES, ENCHANTER_SUFFIXES, GAME_LOCATIONS } from '../data/equipmentData';
import { calcDerivedStats, formatCostInCC, totalCopperFromWallet, processExpGain } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

type DistrictTab = 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'GATE' | 'STASH';
type ForgeCategoryFilter = 'ALL' | 'WEAPONS' | 'ARMOR' | 'DAGGERS' | 'SWORDS' | 'BOWS' | 'STAVES' | 'UPPER' | 'LOWER';

interface TownHubProps {
  player: PlayerCharacter;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onNavigateToWorld: () => void;
  onNavigateToTitanRaid?: () => void;
}

export const TownHub: React.FC<TownHubProps> = ({ player, onUpdatePlayer, onNavigateToWorld, onNavigateToTitanRaid }) => {
  const [activeDistrict, setActiveDistrict] = useState<DistrictTab>('TAVERN');
  const [selectedEnchantItem, setSelectedEnchantItem] = useState<EquipmentItem | null>(null);
  const [showBountyBoard, setShowBountyBoard] = useState<boolean>(false);
  const [bountyBoardTab, setBountyBoardTab] = useState<'AVAILABLE' | 'COMPLETED'>('AVAILABLE');

  // Forge Store State
  const [forgeCategory, setForgeCategory] = useState<ForgeCategoryFilter>('ALL');
  const [inspectedShopItem, setInspectedShopItem] = useState<EquipmentItem | null>(null);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  // Regenerate 5 Stamina when resting at Tavern Inn
  const handleRestAtInn = () => {
    const costCC = 500; // 5 Silver Shillings
    const playerTotalCC = totalCopperFromWallet(player.wallet);

    if (playerTotalCC < costCC) {
      alert('Not enough Silver Shillings! Inn stay costs 5 SS (500 CC).');
      return;
    }

    soundFX.playPotionSound();

    const remainingCC = playerTotalCC - costCC;
    const newGold = Math.floor(remainingCC / 10000);
    const remGold = remainingCC % 10000;
    const newSilver = Math.floor(remGold / 100);
    const newCopper = remGold % 100;

    const currentStamina = player.stamina ?? 18;
    const maxStamina = player.maxStamina ?? 20;

    onUpdatePlayer({
      ...player,
      currentHp: derived.maxHp,
      currentMp: derived.maxMp,
      stamina: Math.min(maxStamina, currentStamina + 5),
      activeEffects: [], // Cleanse all debuffs
      wallet: {
        ...player.wallet,
        goldSovereigns: newGold,
        silverShillings: newSilver,
        copperCoins: newCopper,
      },
    });

    alert('✨ Rested at The Rusty Goblet! HP, MP, and Stamina (+5) restored, debuffs cleansed.');
  };

  const handleAcceptBounty = (bountyId: string) => {
    soundFX.playClickSound();
    const updatedBounties = player.bounties.map((b) =>
      b.id === bountyId ? { ...b, isAccepted: true } : b
    );
    onUpdatePlayer({ ...player, bounties: updatedBounties });
    alert('📜 Contract Accepted! Check your Active Quest & Bounty Journal under Log & Chat tab.');
  };

  const handleClaimBounty = (bounty: Bounty) => {
    if (!bounty.isCompleted || bounty.isClaimed) return;

    soundFX.playLevelUpSound();

    const newMemories = [
      ...player.encryptedMemories,
      {
        id: `bounty_mem_${Date.now()}`,
        name: `Bounty Memory (${bounty.rewardMemoryRarity})`,
        rarity: bounty.rewardMemoryRarity,
        minLevel: player.level,
        acquiredAtLocation: player.currentLocationId,
      },
    ];

    const updatedBounties = player.bounties.map((b) =>
      b.id === bounty.id ? { ...b, isClaimed: true } : b
    );

    const totalCC = player.wallet.copperCoins + bounty.rewardCC + (player.wallet.silverShillings * 100) + (player.wallet.goldSovereigns * 10000);
    const newGold = Math.floor(totalCC / 10000);
    const remGold = totalCC % 10000;
    const newSilver = Math.floor(remGold / 100);
    const newCopper = remGold % 100;

    const expResult = processExpGain(player.level, player.exp, bounty.rewardExp);

    onUpdatePlayer({
      ...player,
      level: expResult.newLevel,
      exp: expResult.newExp,
      availableAP: player.availableAP + expResult.apGained,
      encryptedMemories: newMemories,
      bounties: updatedBounties,
      wallet: {
        ...player.wallet,
        goldSovereigns: newGold,
        silverShillings: newSilver,
        copperCoins: newCopper,
      },
    });

    if (expResult.levelsGained > 0) {
      alert(`🎉 Bounty Claimed! Earned +${bounty.rewardExp} EXP, +${bounty.rewardCC} CC, and 1x Encrypted Memory (${bounty.rewardMemoryRarity})!\n\n🌟 LEVEL UP! Reached Level ${expResult.newLevel}! Earned +${expResult.apGained} Attribute Points. EXP reset to 0.`);
    } else {
      alert(`🎉 Bounty Claimed! Earned +${bounty.rewardExp} EXP, +${bounty.rewardCC} CC, and 1x Encrypted Memory (${bounty.rewardMemoryRarity})!`);
    }
  };

  const handleBuyItem = (item: EquipmentItem | ConsumableItem) => {
    const playerTotalCC = totalCopperFromWallet(player.wallet);

    if (playerTotalCC < item.costInCC) {
      alert('Insufficient currency to purchase this item!');
      return;
    }

    if (player.inventory.length >= derived.inventoryCapacity) {
      alert('Inventory capacity reached! Move items to Stash or unequip/salvage first.');
      return;
    }

    soundFX.playCoinSound();

    const remainingCC = playerTotalCC - item.costInCC;
    const newGold = Math.floor(remainingCC / 10000);
    const remGold = remainingCC % 10000;
    const newSilver = Math.floor(remGold / 100);
    const newCopper = remGold % 100;

    onUpdatePlayer({
      ...player,
      inventory: [...player.inventory, { ...item, id: `bought_${Date.now()}_${Math.random()}` }],
      wallet: {
        ...player.wallet,
        goldSovereigns: newGold,
        silverShillings: newSilver,
        copperCoins: newCopper,
      },
    });
  };

  const handleRerollEnchantment = () => {
    if (!selectedEnchantItem) return;

    if (player.wallet.prismaticShards < 1) {
      alert('Requires 1 Prismatic Shard (PS) to reroll affixes!');
      return;
    }

    soundFX.playSpellSound();

    const prefix = ENCHANTER_PREFIXES[Math.floor(Math.random() * ENCHANTER_PREFIXES.length)];
    const suffix = ENCHANTER_SUFFIXES[Math.floor(Math.random() * ENCHANTER_SUFFIXES.length)];

    const updatedItem: EquipmentItem = {
      ...selectedEnchantItem,
      name: `${prefix.name} ${selectedEnchantItem.name.replace(/.*?\s(.*)/, '$1')} ${suffix.name}`,
      affixes: [prefix, suffix],
    };

    const updatedInventory = player.inventory.map((inv) =>
      inv.id === selectedEnchantItem.id ? updatedItem : inv
    );

    onUpdatePlayer({
      ...player,
      inventory: updatedInventory,
      wallet: {
        ...player.wallet,
        prismaticShards: player.wallet.prismaticShards - 1,
      },
    });

    setSelectedEnchantItem(updatedItem);
    alert(`✨ Enchanted ${updatedItem.name}! Prefix: ${prefix.name}, Suffix: ${suffix.name}`);
  };

  const handleMoveToStash = (item: EquipmentItem | ConsumableItem) => {
    const newInventory = player.inventory.filter((i) => i.id !== item.id);
    const newStash = [...(player.stash || []), item];

    onUpdatePlayer({
      ...player,
      inventory: newInventory,
      stash: newStash,
    });
    soundFX.playCoinSound();
  };

  const handleWithdrawFromStash = (item: EquipmentItem | ConsumableItem) => {
    if (player.inventory.length >= derived.inventoryCapacity) {
      alert('Inventory is full! Free up space first.');
      return;
    }

    const newStash = (player.stash || []).filter((i) => i.id !== item.id);
    const newInventory = [...player.inventory, item];

    onUpdatePlayer({
      ...player,
      inventory: newInventory,
      stash: newStash,
    });
    soundFX.playCoinSound();
  };
  // ALL FORGE EQUIPMENT ITEMS CATALOG
  const ALL_FORGE_GEAR: EquipmentItem[] = [
    ...DAGGERS,
    ...SWORDS,
    ...BOWS,
    ...STAVES,
    ...UPPER_ARMORS,
    ...LOWER_ARMORS,
  ];

  const filteredForgeItems = ALL_FORGE_GEAR.filter((item) => {
    if (forgeCategory === 'ALL') return true;
    if (forgeCategory === 'WEAPONS') return ['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(item.category);
    if (forgeCategory === 'ARMOR') return ['UPPER', 'LOWER'].includes(item.category);
    if (forgeCategory === 'DAGGERS') return item.category === 'DAGGER';
    if (forgeCategory === 'SWORDS') return item.category === 'SWORD';
    if (forgeCategory === 'BOWS') return item.category === 'BOW';
    if (forgeCategory === 'STAVES') return item.category === 'STAFF';
    if (forgeCategory === 'UPPER') return item.category === 'UPPER';
    if (forgeCategory === 'LOWER') return item.category === 'LOWER';
    return true;
  });

  const getEquippedItemForShopItem = (shopItem: EquipmentItem): EquipmentItem | null => {
    if (shopItem.category === 'UPPER') return player.equipment.upperArmor || null;
    if (shopItem.category === 'LOWER') return player.equipment.lowerArmor || null;
    if (['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(shopItem.category)) {
      return player.equipment.primaryWeapon || null;
    }
    return null;
  };

  const renderItemComparison = (shopItem: EquipmentItem) => {
    const equipped = getEquippedItemForShopItem(shopItem);
    if (!equipped) return <span className="text-emerald-400 font-mono text-[10px] font-bold">✨ New Slot Gear</span>;

    if (shopItem.baseDefense !== undefined) {
      const eqDef = equipped.baseDefense || 0;
      const diff = shopItem.baseDefense - eqDef;
      if (diff > 0) return <span className="text-emerald-400 font-mono text-[10px] font-bold">📈 +{diff} Armor vs Equipped</span>;
      if (diff < 0) return <span className="text-rose-400 font-mono text-[10px] font-bold">📉 {diff} Armor vs Equipped</span>;
      return <span className="text-zinc-500 font-mono text-[10px]">➡️ Equal Armor</span>;
    }

    if (shopItem.baseDamageMin !== undefined && shopItem.baseDamageMax !== undefined) {
      const shopAvg = (shopItem.baseDamageMin + shopItem.baseDamageMax) / 2;
      const eqAvg = equipped.baseDamageMin && equipped.baseDamageMax ? (equipped.baseDamageMin + equipped.baseDamageMax) / 2 : 0;
      const diff = Math.round(shopAvg - eqAvg);
      if (diff > 0) return <span className="text-emerald-400 font-mono text-[10px] font-bold">📈 +{diff} Avg Atk vs Equipped</span>;
      if (diff < 0) return <span className="text-rose-400 font-mono text-[10px] font-bold">📉 {diff} Avg Atk vs Equipped</span>;
      return <span className="text-zinc-500 font-mono text-[10px]">➡️ Equal Atk</span>;
    }

    return null;
  };

  // Filter bounties based on current player level and unlocked acts
  const unlockedLocationIds = GAME_LOCATIONS.filter((l) => player.level >= l.minLevel).map((l) => l.id);

  // Eligible bounties for current level and unlocked acts (not yet claimed)
  const eligibleBounties = (player.bounties || []).filter((b) => {
    if (b.isClaimed) return false;
    const minLvl = b.minLevel ?? 1;
    if (player.level < minLvl) return false;
    if (b.actId && !unlockedLocationIds.includes(b.actId)) return false;
    return true;
  });

  // Pick up to 3 bounties to show at a time:
  // First prioritize accepted/active bounties, then unaccepted eligible bounties
  const activeAcceptedBounties = eligibleBounties.filter((b) => b.isAccepted);
  const unacceptedEligibleBounties = eligibleBounties.filter((b) => !b.isAccepted);

  const displayedBounties: Bounty[] = [
    ...activeAcceptedBounties,
    ...unacceptedEligibleBounties,
  ].slice(0, 3);

  // Completed bounties for the Completed tab
  const completedBounties = (player.bounties || []).filter((b) => b.isClaimed);

  // Find next locked bounty to tell the player when more become available
  const nextLockedBounty = (player.bounties || []).find((b) => !b.isClaimed && (b.minLevel ?? 1) > player.level);

  const inherentPerkInInspect = (item: EquipmentItem) => {
    if (!item.inherentPerk) return null;
    return (
      <div className="flex justify-between border-b border-zinc-800/40 pb-1">
        <span className="text-zinc-400">Special Inherent Perk:</span>
        <strong className="text-purple-300">{item.inherentPerk}</strong>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* Town Banner */}
      <div className="bg-zinc-900/90 border border-amber-900/50 rounded-xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase text-amber-500 tracking-widest font-semibold">SAFE ZONE • HAVEN'S REST CITADEL</div>
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-amber-200">The Haven Citadel</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Zero combat zone. Stamina regenerates. Visit facilities below or step through the Anchor Gate.
          </p>
        </div>

        <div className="bg-zinc-950 px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs font-mono text-emerald-400 font-bold">
          ⚡ Stamina Restored
        </div>
      </div>

      {/* Main Viewport Content based on Selected District */}
      <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 md:p-6 space-y-4 shadow-xl min-h-[280px]">
        {/* DISTRICT 1: TAVERN & INN */}
        {activeDistrict === 'TAVERN' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <span className="text-3xl">🍺</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">The Rusty Goblet (Inn & Tavern)</h3>
                <p className="text-xs text-zinc-400">Rest in warm beds, clear Exhaustion, or inspect daily Colossus Bounties.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rest Option */}
              <div className="bg-zinc-950 border border-amber-900/40 p-4 rounded-xl space-y-3">
                <h4 className="text-sm font-bold font-serif text-amber-300">Feather Bed Rest</h4>
                <p className="text-xs text-zinc-400">
                  Fully recovers Health & Mana, restores +5 Stamina, and cleanses active debuffs like Bleed & Burn.
                </p>
                <div className="text-xs font-mono text-amber-400">Cost: 5 SS (500 CC)</div>
                <button
                  onClick={handleRestAtInn}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold py-2 rounded text-xs uppercase font-mono tracking-wider transition-all shadow-md active:scale-95"
                >
                  Rest & Restore
                </button>
              </div>

              {/* Tavern Bounties Notice */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl space-y-3">
                <h4 className="text-sm font-bold font-serif text-purple-300">Bounty Notice Board</h4>
                <p className="text-xs text-zinc-400">
                  Inspect posted contracts for hunting mutated beasts in the wilderness.
                </p>
                <button
                  onClick={() => setShowBountyBoard(true)}
                  className="w-full bg-purple-900/80 hover:bg-purple-800 border border-purple-500/40 text-purple-200 font-bold py-2 rounded text-xs uppercase font-mono tracking-wider transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2"
                >
                  <span>📜 Inspect Bounty Notice Board</span>
                  <span className="bg-purple-950 px-2 py-0.5 rounded-full text-[10px] border border-purple-400/40">
                    {displayedBounties.length} Available
                  </span>
                </button>
              </div>
            </div>

            {/* Dedicated Bounty Board Panel inside Tavern */}
            {showBountyBoard && (
              <div className="bg-zinc-950 border border-purple-900/60 p-4 md:p-6 rounded-2xl space-y-4 shadow-2xl animate-fade-in mt-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-800 pb-3 gap-2">
                  <div>
                    <h4 className="text-lg font-bold font-serif text-purple-200 flex items-center space-x-2">
                      <span>📜 Haven Citadel Bounty Notice Board</span>
                    </h4>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">
                      Progressive contracts scaled to your level and unlocked acts. Showing up to 3 available contracts.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Notice Board Tabs */}
                    <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
                      <button
                        onClick={() => setBountyBoardTab('AVAILABLE')}
                        className={`px-3 py-1 rounded-md font-bold transition-all ${
                          bountyBoardTab === 'AVAILABLE'
                            ? 'bg-purple-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        📋 Active & Available ({displayedBounties.length})
                      </button>
                      <button
                        onClick={() => setBountyBoardTab('COMPLETED')}
                        className={`px-3 py-1 rounded-md font-bold transition-all ${
                          bountyBoardTab === 'COMPLETED'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        ✅ Completed ({completedBounties.length})
                      </button>
                    </div>

                    <button
                      onClick={() => setShowBountyBoard(false)}
                      className="text-zinc-500 hover:text-white text-xs font-mono p-1"
                    >
                      ✕ Close
                    </button>
                  </div>
                </div>

                {/* TAB 1: ACTIVE & AVAILABLE BOUNTIES (MAX 3) */}
                {bountyBoardTab === 'AVAILABLE' && (
                  <div className="space-y-3">
                    {displayedBounties.length === 0 ? (
                      <div className="bg-zinc-900/60 border border-dashed border-zinc-800 p-8 rounded-xl text-center space-y-2">
                        <div className="text-3xl">📜</div>
                        <h5 className="text-base font-bold font-serif text-amber-300">
                          No bounties available, level up and come back later
                        </h5>
                        <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto">
                          You have completed all available contracts for your current character level (Level {player.level}).
                        </p>
                        {nextLockedBounty && (
                          <div className="text-xs font-mono text-purple-300 pt-2 font-bold">
                            🔒 Next Contract ({nextLockedBounty.title}) unlocks at Level {nextLockedBounty.minLevel}!
                          </div>
                        )}
                      </div>
                    ) : (
                      displayedBounties.map((bounty) => (
                        <div
                          key={bounty.id}
                          className={`p-4 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all ${
                            bounty.isCompleted
                              ? 'bg-emerald-950/40 border-emerald-500/80'
                              : bounty.isAccepted
                              ? 'bg-purple-950/40 border-purple-500/60'
                              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-mono font-bold uppercase text-amber-400">{bounty.title}</span>
                              <span className="text-[10px] font-mono text-zinc-400">
                                • Level {bounty.minLevel ?? 1}+ Req
                              </span>
                              {bounty.isAccepted && (
                                <span className="bg-purple-900 text-purple-200 border border-purple-500/40 text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                                  Active Contract
                                </span>
                              )}
                            </div>
                            <h5 className="text-base font-bold font-serif text-white">Target: {bounty.targetMonsterName}</h5>
                            <p className="text-xs text-zinc-400 font-mono">
                              Target Count: <strong className="text-amber-300">{bounty.currentCount} / {bounty.targetCount}</strong>
                            </p>
                          </div>

                          <div className="flex items-center space-x-4 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right font-mono text-xs text-zinc-300">
                              <div>Rewards: <strong className="text-emerald-400">+{bounty.rewardExp} EXP</strong> | <strong className="text-yellow-400">+{bounty.rewardCC} CC</strong></div>
                              <div className="text-purple-300 font-bold">1x Memory ({bounty.rewardMemoryRarity})</div>
                            </div>

                            {!bounty.isAccepted ? (
                              <button
                                onClick={() => handleAcceptBounty(bounty.id)}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold font-mono px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
                              >
                                Accept Contract
                              </button>
                            ) : bounty.isCompleted && !bounty.isClaimed ? (
                              <button
                                onClick={() => handleClaimBounty(bounty)}
                                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0 animate-bounce"
                              >
                                Claim Reward
                              </button>
                            ) : (
                              <div className="bg-purple-950/80 border border-purple-500/40 text-purple-200 font-bold font-mono px-4 py-2 rounded-lg text-xs uppercase tracking-wider text-center shrink-0">
                                ⏳ In Progress ({bounty.currentCount}/{bounty.targetCount})
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 2: COMPLETED BOUNTIES HISTORY */}
                {bountyBoardTab === 'COMPLETED' && (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {completedBounties.length === 0 ? (
                      <div className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl text-center text-xs font-mono text-zinc-400">
                        No completed contracts yet. Complete and claim contracts to build your slayer record!
                      </div>
                    ) : (
                      completedBounties.map((bounty) => (
                        <div
                          key={bounty.id}
                          className="bg-zinc-900/40 border border-zinc-800 p-3 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 opacity-80"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-mono text-emerald-400 font-bold">✅ {bounty.title}</span>
                              <span className="text-[10px] font-mono text-zinc-500">• Level {bounty.minLevel ?? 1}</span>
                            </div>
                            <div className="text-xs font-serif text-zinc-300">Target Slain: {bounty.targetMonsterName} ({bounty.targetCount}x)</div>
                          </div>
                          <div className="text-right font-mono text-xs text-zinc-400">
                            <span>Claimed: +{bounty.rewardExp} EXP | +{bounty.rewardCC} CC | 1x {bounty.rewardMemoryRarity} Memory</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DISTRICT 2: THE IRON ANVIL (FORGE & ENCHANTER) */}
        {activeDistrict === 'FORGE' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <span className="text-3xl">⚒️</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">The Iron Anvil (Forge & Enchanter)</h3>
                <p className="text-xs text-zinc-400">Torvald's forge: Buy base gear, or reroll prefixes/suffixes using Prismatic Shards (PS).</p>
              </div>
            </div>

            {/* Enchanter Panel */}
            <div className="bg-zinc-950 border border-purple-900/50 p-4 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold font-serif text-purple-300">Prismatic Affix Reroll</h4>
                <span className="text-xs font-mono font-bold text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/40">
                  {player.wallet.prismaticShards} PS Available
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {player.inventory.filter((i): i is EquipmentItem => 'tier' in i).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEnchantItem(item)}
                    className={`p-2 rounded border text-left text-xs font-mono transition-all ${
                      selectedEnchantItem?.id === item.id
                        ? 'border-purple-500 bg-purple-950/60 text-purple-200 ring-1 ring-purple-500'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="font-bold">{item.name}</div>
                    <div className="text-[10px] text-zinc-500">{item.archetype} • Tier {item.tier}</div>
                  </button>
                ))}
              </div>

              {selectedEnchantItem && (
                <div className="pt-2 flex justify-between items-center border-t border-zinc-800">
                  <span className="text-xs font-mono text-purple-200">Enchanting: <strong>{selectedEnchantItem.name}</strong></span>
                  <button
                    onClick={handleRerollEnchantment}
                    disabled={player.wallet.prismaticShards < 1}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-1.5 rounded text-xs font-mono uppercase tracking-wider disabled:opacity-40"
                  >
                    Reroll Affixes (1 PS)
                  </button>
                </div>
              )}
            </div>

            {/* Categorized Armory Store */}
            <div className="space-y-3">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-zinc-800 pb-2">
                <h4 className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center space-x-1.5">
                  <span>⚒️ FORGE WEAPONS & ARMOR STORE</span>
                  <span className="text-zinc-500 text-[10px]">({filteredForgeItems.length} Items)</span>
                </h4>

                {/* Category Filter Pills */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'ALL', label: 'All Gear', icon: '✨' },
                    { id: 'WEAPONS', label: 'Weapons', icon: '⚔️' },
                    { id: 'ARMOR', label: 'Armors', icon: '🛡️' },
                    { id: 'DAGGERS', label: 'Daggers', icon: '🗡️' },
                    { id: 'SWORDS', label: 'Swords', icon: '⚔️' },
                    { id: 'BOWS', label: 'Bows', icon: '🏹' },
                    { id: 'STAVES', label: 'Staves', icon: '🔮' },
                    { id: 'UPPER', label: 'Upper', icon: '🦺' },
                    { id: 'LOWER', label: 'Lower', icon: '👖' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setForgeCategory(tab.id as ForgeCategoryFilter)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 transition-all ${
                        forgeCategory === tab.id
                          ? 'bg-amber-500 text-zinc-950 shadow-md ring-1 ring-amber-300'
                          : 'bg-zinc-950 text-zinc-400 hover:text-amber-200 hover:bg-zinc-800 border border-zinc-800'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment Item Store Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
                {filteredForgeItems.map((item) => {
                  const meetsLevelReq = player.level >= item.levelReq;
                  const equipped = getEquippedItemForShopItem(item);

                  return (
                    <div
                      key={item.id}
                      className={`bg-zinc-950 border rounded-xl p-3 flex flex-col justify-between space-y-2.5 hover:border-amber-500/50 transition-all ${
                        item.rarity === 'LEGENDARY'
                          ? 'border-amber-500/80 bg-amber-950/10'
                          : item.rarity === 'EPIC'
                          ? 'border-purple-500/60 bg-purple-950/10'
                          : item.rarity === 'RARE'
                          ? 'border-cyan-500/60 bg-cyan-950/10'
                          : item.rarity === 'UNCOMMON'
                          ? 'border-emerald-500/60 bg-emerald-950/10'
                          : 'border-zinc-800'
                      }`}
                    >
                      {/* Item Header */}
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span
                              className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${
                                item.rarity === 'LEGENDARY'
                                  ? 'bg-amber-950 text-amber-300 border-amber-500/60'
                                  : item.rarity === 'EPIC'
                                  ? 'bg-purple-950 text-purple-300 border-purple-500/60'
                                  : item.rarity === 'RARE'
                                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                                  : item.rarity === 'UNCOMMON'
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                                  : 'bg-zinc-900 text-zinc-400 border-zinc-700'
                              }`}
                            >
                              {item.rarity}
                            </span>
                            <h5 className="text-sm font-bold font-serif text-amber-200 mt-1">{item.name}</h5>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                meetsLevelReq ? 'bg-zinc-900 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'
                              }`}
                            >
                              Req Lvl {item.levelReq}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] font-mono text-zinc-400 mt-1 flex justify-between">
                          <span>{item.archetype}</span>
                          <span>Tier {item.tier}</span>
                        </div>
                      </div>

                      {/* Primary Stats Display */}
                      <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-lg p-2 space-y-1 text-xs font-mono">
                        {item.baseDefense !== undefined && (
                          <div className="flex justify-between items-center text-emerald-300 font-bold">
                            <span>🛡️ Base Armor:</span>
                            <span>+{item.baseDefense} Defense</span>
                          </div>
                        )}

                        {item.baseDamageMin !== undefined && item.baseDamageMax !== undefined && (
                          <div className="flex justify-between items-center text-amber-300 font-bold">
                            <span>⚔️ Weapon Damage:</span>
                            <span>{item.baseDamageMin} - {item.baseDamageMax} ({item.damageType})</span>
                          </div>
                        )}

                        {item.inherentPerk && (
                          <div className="text-[11px] text-purple-300 font-semibold pt-1 border-t border-zinc-800/60">
                            ✨ {item.inherentPerk}
                          </div>
                        )}
                      </div>

                      {/* Equipped Gear Comparison Indicator */}
                      <div className="flex justify-between items-center text-[10px] font-mono pt-1 border-t border-zinc-900">
                        {renderItemComparison(item)}
                        <span className="text-zinc-400">vs {equipped ? equipped.name : 'Empty Slot'}</span>
                      </div>

                      {/* Cost & Action Buttons */}
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                        <div className="text-xs font-mono font-bold text-amber-400">
                          {formatCostInCC(item.costInCC)}
                        </div>

                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => setInspectedShopItem(item)}
                            className="bg-zinc-800 hover:bg-zinc-700 text-amber-200 font-bold text-[10px] font-mono px-2.5 py-1 rounded transition-all"
                          >
                            🔍 Details
                          </button>
                          <button
                            onClick={() => handleBuyItem(item)}
                            disabled={!meetsLevelReq}
                            className={`font-bold font-mono text-[10px] uppercase px-3 py-1 rounded shadow transition-all ${
                              meetsLevelReq
                                ? 'bg-amber-600 hover:bg-amber-500 text-zinc-950 active:scale-95'
                                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                            }`}
                          >
                            Buy
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DETAILED EQUIPMENT INSPECTION & BUY MODAL */}
            {inspectedShopItem && (
              <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-zinc-900 border-2 border-amber-500/80 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
                  {/* Close Modal Button */}
                  <button
                    onClick={() => setInspectedShopItem(null)}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white text-sm font-mono"
                  >
                    ✕ Close
                  </button>

                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 bg-zinc-950 border border-amber-500/40 rounded-xl flex items-center justify-center text-3xl shadow-inner">
                      {['DAGGER', 'SWORD', 'BOW', 'STAFF'].includes(inspectedShopItem.category) ? '⚔️' : '🛡️'}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold uppercase text-amber-400">{inspectedShopItem.category}</span>
                        <span className="text-[10px] font-mono text-zinc-400">• Tier {inspectedShopItem.tier}</span>
                      </div>
                      <h3 className="text-xl font-bold font-serif text-amber-200">{inspectedShopItem.name}</h3>
                      <p className="text-xs text-zinc-400 font-mono">{inspectedShopItem.archetype}</p>
                    </div>
                  </div>

                  {/* Level Requirement Check */}
                  <div
                    className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex justify-between items-center ${
                      player.level >= inspectedShopItem.levelReq
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                        : 'bg-red-950/80 text-red-300 border-red-500/60'
                    }`}
                  >
                    <span>Character Level Requirement:</span>
                    <span>Level {inspectedShopItem.levelReq} (Your Level: {player.level})</span>
                  </div>

                  {/* Complete Stat Specifications */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-2 text-xs font-mono">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold border-b border-zinc-800 pb-1 mb-2">
                      ITEM SPECIFICATIONS
                    </div>

                    {inspectedShopItem.baseDefense !== undefined && (
                      <div className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span className="text-zinc-400">Base Physical Armor:</span>
                        <strong className="text-emerald-300">+{inspectedShopItem.baseDefense} Defense</strong>
                      </div>
                    )}

                    {inspectedShopItem.baseDamageMin !== undefined && (
                      <div className="flex justify-between border-b border-zinc-800/40 pb-1">
                        <span className="text-zinc-400">Weapon Attack Range:</span>
                        <strong className="text-amber-300">{inspectedShopItem.baseDamageMin} - {inspectedShopItem.baseDamageMax} ({inspectedShopItem.damageType})</strong>
                      </div>
                    )}

                    {inherentPerkInInspect(inspectedShopItem)}

                    <div className="flex justify-between pt-1">
                      <span className="text-zinc-400">Merchant Retail Price:</span>
                      <strong className="text-amber-400">{formatCostInCC(inspectedShopItem.costInCC)}</strong>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison against Equipped Gear */}
                  <div className="bg-zinc-950/90 border border-amber-900/40 rounded-xl p-3 space-y-1 text-xs font-mono">
                    <div className="text-[10px] text-amber-500 uppercase font-bold">VS CURRENTLY EQUIPPED GEAR</div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-zinc-300">
                        {getEquippedItemForShopItem(inspectedShopItem)?.name || 'Empty Gear Slot'}
                      </span>
                      {renderItemComparison(inspectedShopItem)}
                    </div>
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      onClick={() => setInspectedShopItem(null)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleBuyItem(inspectedShopItem);
                        setInspectedShopItem(null);
                      }}
                      disabled={player.level < inspectedShopItem.levelReq}
                      className={`px-6 py-2.5 font-mono font-bold text-xs uppercase rounded-xl shadow-lg transition-all ${
                        player.level >= inspectedShopItem.levelReq
                          ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 active:scale-95'
                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                    >
                      Buy & Add to Inventory
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DISTRICT 3: THE ALCHEMIST'S MORTAR */}
        {activeDistrict === 'ALCHEMIST' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <span className="text-3xl">🧪</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">The Alchemist’s Mortar</h3>
                <p className="text-xs text-zinc-400">Apothecary brewing recovery draughts, clarity elixirs, and panacea vials.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {CONSUMABLES.map((potion) => (
                <div key={potion.id} className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold font-serif text-emerald-300">{potion.name}</h4>
                    <p className="text-xs text-zinc-400 font-mono mt-0.5">{potion.effectDescription}</p>
                    <div className="text-xs font-mono text-amber-400 mt-1">{formatCostInCC(potion.costInCC)}</div>
                  </div>
                  <button
                    onClick={() => handleBuyItem(potion)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold px-4 py-2 rounded text-xs uppercase font-mono tracking-wider transition-all"
                  >
                    Brew
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DISTRICT 4: THE ANCHOR GATE */}
        {activeDistrict === 'GATE' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center border-b border-zinc-800 pb-3 text-center">
              <span className="text-4xl">🌀</span>
              <h3 className="text-2xl font-bold font-serif text-cyan-200 mt-1">The Anchor Gate</h3>
              <p className="text-xs text-zinc-400 max-w-md mt-1">
                Ancient ward-portal connecting Haven's Rest to unlocked wilderness sectors and World Titan Raids.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase text-cyan-400 font-bold flex items-center space-x-1">
                <span>🌌 WILDERNESS EXPEDITION SECTORS</span>
                <span className="text-zinc-500 font-normal">({unlockedLocationIds.length} / 5 Acts Unlocked)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {GAME_LOCATIONS.map((loc) => {
                  const isUnlocked = player.level >= loc.minLevel;
                  const isCurrent = player.currentLocationId === loc.id;

                  return (
                    <div
                      key={loc.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                        isUnlocked
                          ? 'bg-zinc-950 border-cyan-500/40 hover:border-cyan-400 shadow-lg'
                          : 'bg-zinc-950/60 border-zinc-800/80 opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono font-bold uppercase text-cyan-400">{loc.subtitle}</span>
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isUnlocked
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : 'bg-red-950 text-red-400 border border-red-900/60'
                            }`}
                          >
                            {isUnlocked ? '✅ Unlocked' : `🔒 Req: Lv ${loc.minLevel}`}
                          </span>
                        </div>
                        <h4 className="text-base font-bold font-serif text-white mt-1">{loc.name}</h4>
                        <p className="text-xs text-zinc-400 font-mono mt-1 line-clamp-2">{loc.description}</p>
                      </div>

                      <button
                        onClick={() => {
                          if (!isUnlocked) {
                            alert(`🔒 Sector Locked! Reach Level ${loc.minLevel} to access ${loc.name}. (Your Level: ${player.level})`);
                            return;
                          }
                          onUpdatePlayer({ ...player, currentLocationId: loc.id });
                          onNavigateToWorld();
                        }}
                        disabled={!isUnlocked}
                        className={`w-full py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow ${
                          isUnlocked
                            ? 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950 active:scale-95'
                            : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                        }`}
                      >
                        {isCurrent ? '⚡ Enter Active Zone' : isUnlocked ? 'Step Through Portal' : `🔒 Locked (Level ${loc.minLevel})`}
                      </button>
                    </div>
                  );
                })}

                {/* World Titan Raid Gate Card */}
                <div className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                  player.level >= 40
                    ? 'bg-gradient-to-b from-red-950/60 to-zinc-950 border-red-500/60 shadow-xl'
                    : 'bg-zinc-950/60 border-zinc-800/80 opacity-60'
                }`}>
                  <div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-bold uppercase text-red-400">WORLD TITAN RAID</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        player.level >= 40 ? 'bg-red-950 text-red-300 border border-red-500/40' : 'bg-zinc-900 text-zinc-500'
                      }`}>
                        {player.level >= 40 ? '⚔️ Raid Ready' : '🔒 Req: Lv 40'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold font-serif text-red-200 mt-1">Gorgoroth, Earth-Breaker</h4>
                    <p className="text-xs text-zinc-400 font-mono mt-1">Prime Titan multi-phase global raid event for ultimate endgame rewards.</p>
                  </div>

                  <button
                    onClick={() => {
                      if (player.level < 40) {
                        alert('🔒 Titan Raid Locked! Requires Character Level 40+.');
                        return;
                      }
                      onNavigateToTitanRaid?.();
                    }}
                    disabled={player.level < 40}
                    className={`w-full py-2 rounded-lg font-mono font-bold text-xs uppercase tracking-wider transition-all shadow ${
                      player.level >= 40
                        ? 'bg-red-700 hover:bg-red-600 text-white active:scale-95'
                        : 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800'
                    }`}
                  >
                    {player.level >= 40 ? 'Challenge World Titan' : '🔒 Locked (Level 40)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DISTRICT 5: THE MARKET / ACCOUNT STASH */}
        {activeDistrict === 'STASH' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 border-b border-zinc-800 pb-3">
              <span className="text-3xl">🏛️</span>
              <div>
                <h3 className="text-xl font-bold font-serif text-amber-200">The Market & Account Vault</h3>
                <p className="text-xs text-zinc-400">Store excess weapons, armor, and potions safely in your account stash.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Backpack Items -> Move to Stash */}
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-amber-400 font-bold">Bag Inventory ({player.inventory.length}/{derived.inventoryCapacity})</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {player.inventory.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Bag is empty.</p>
                  ) : (
                    player.inventory.map((item) => (
                      <div key={item.id} className="bg-zinc-900 p-2 rounded flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-amber-200 truncate max-w-[160px]">{item.name}</span>
                        <button
                          onClick={() => handleMoveToStash(item)}
                          className="bg-amber-600/80 hover:bg-amber-500 text-zinc-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase shrink-0"
                        >
                          Store ➔
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Stash Items -> Withdraw to Bag */}
              <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl space-y-2">
                <h4 className="text-xs font-mono uppercase text-cyan-400 font-bold">Vault Stash ({player.stash?.length || 0})</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {!player.stash || player.stash.length === 0 ? (
                    <p className="text-xs text-zinc-500 italic">Vault is empty.</p>
                  ) : (
                    player.stash.map((item) => (
                      <div key={item.id} className="bg-zinc-900 p-2 rounded flex justify-between items-center text-xs font-mono">
                        <span className="font-bold text-cyan-200 truncate max-w-[160px]">{item.name}</span>
                        <button
                          onClick={() => handleWithdrawFromStash(item)}
                          className="bg-cyan-600/80 hover:bg-cyan-500 text-zinc-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase shrink-0"
                        >
                          🛈 Take
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* [BOTTOM] CONTEXTUAL ACTION PAD FOR HOMEPAGE */}
      <div className="bg-zinc-950 border border-amber-900/60 p-2 md:p-3 rounded-xl shadow-2xl">
        <div className="text-[10px] font-mono text-amber-500 uppercase font-semibold mb-1.5 text-center md:text-left">
          HAVEN DISTRICT ACTION PAD
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <button
            onClick={() => setActiveDistrict('TAVERN')}
            className={`p-2.5 rounded-lg border font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
              activeDistrict === 'TAVERN'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span>🍺</span>
            <span>Enter Tavern</span>
          </button>

          <button
            onClick={() => setActiveDistrict('FORGE')}
            className={`p-2.5 rounded-lg border font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
              activeDistrict === 'FORGE'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span>⚒️</span>
            <span>Visit Forge</span>
          </button>

          <button
            onClick={() => setActiveDistrict('ALCHEMIST')}
            className={`p-2.5 rounded-lg border font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
              activeDistrict === 'ALCHEMIST'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span>🧪</span>
            <span>Alchemist</span>
          </button>

          <button
            onClick={() => setActiveDistrict('GATE')}
            className={`p-2.5 rounded-lg border font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
              activeDistrict === 'GATE'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span>🌀</span>
            <span>Open Gate</span>
          </button>

          <button
            onClick={() => setActiveDistrict('STASH')}
            className={`col-span-2 md:col-span-1 p-2.5 rounded-lg border font-mono text-xs font-bold uppercase transition-all flex items-center justify-center space-x-1.5 ${
              activeDistrict === 'STASH'
                ? 'bg-amber-600 text-zinc-950 border-amber-400 shadow-md ring-1 ring-amber-400'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-amber-600/50'
            }`}
          >
            <span>🏛️</span>
            <span>Manage Stash</span>
          </button>
        </div>
      </div>
    </div>
  );
};
