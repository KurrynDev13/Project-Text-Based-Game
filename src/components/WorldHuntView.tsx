import React, { useState } from 'react';
import { PlayerCharacter, BattleState, BattleLogEntry, EnemyMonster, GameLocation, ConsumableItem } from '../types/game';
import { GAME_LOCATIONS } from '../data/equipmentData';
import { generateMonsterForLocation } from '../data/monstersData';
import { calcDerivedStats, processExpGain } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface WorldHuntViewProps {
  player: PlayerCharacter;
  battle: BattleState;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onUpdateBattle: (updated: BattleState) => void;
  onNavigateToHaven: () => void;
  onMonsterKilled: (monster: EnemyMonster) => void;
}

export const WorldHuntView: React.FC<WorldHuntViewProps> = ({
  player,
  battle,
  onUpdatePlayer,
  onUpdateBattle,
  onNavigateToHaven,
  onMonsterKilled,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<GameLocation>(() => {
    const found = GAME_LOCATIONS.find((l) => l.id === player.currentLocationId);
    if (found && player.level >= found.minLevel) return found;
    return GAME_LOCATIONS[0];
  });
  const [showSpellPicker, setShowSpellPicker] = useState(false);
  const [explorationEvent, setExplorationEvent] = useState<string | null>(null);

  const derived = calcDerivedStats(player.attributes, player.level, player.equipment);

  const addLog = (
    currentLogs: BattleLogEntry[],
    text: string,
    type: BattleLogEntry['type'],
    actor: BattleLogEntry['actor'] = 'SYSTEM'
  ): BattleLogEntry[] => {
    const newEntry: BattleLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      turn: battle.turnNumber,
      actor,
      text,
      type,
    };
    return [newEntry, ...currentLogs.slice(0, 49)];
  };

  // Select Location with Strict Level Lock Validation
  const handleSelectLocation = (loc: GameLocation) => {
    if (player.level < loc.minLevel) {
      alert(`🔒 Act Locked! Character Level ${loc.minLevel} required to enter ${loc.name}. (Your Level: ${player.level})`);
      return;
    }

    setSelectedLocation(loc);
    onUpdatePlayer({
      ...player,
      currentLocationId: loc.id,
    });
  };

  // EXPLORATION ACTION 1: Venture Forward (Costs 1 Stamina)
  const handleVentureForward = () => {
    if (player.level < selectedLocation.minLevel) {
      alert(`🔒 Act Locked! Reach Level ${selectedLocation.minLevel} to explore ${selectedLocation.name}.`);
      return;
    }

    const currentStamina = player.stamina ?? 18;
    if (currentStamina < 1) {
      alert('⚡ Exhausted! You need at least 1 Stamina to venture forward. Rest at The Rusty Goblet in Haven.');
      return;
    }

    soundFX.playAttackSound();
    const newStamina = currentStamina - 1;
    const updatedPlayer = { ...player, stamina: newStamina };

    // Roll encounter table: ~65% Enemy, ~20% Lore/Loot, ~15% Ambient Event
    const roll = Math.random();

    if (roll < 0.65) {
      // Enemy encounter! Prioritize active contract target monster if available in location
      const activeTargetId = player.bounties.find(
        (b) => b.isAccepted !== false && !b.isCompleted && selectedLocation.monsters.includes(b.targetMonsterId)
      )?.targetMonsterId;

      const monsterToSpawn = (activeTargetId && Math.random() < 0.85) ? activeTargetId : undefined;
      const monster = generateMonsterForLocation(selectedLocation.minLevel, monsterToSpawn, selectedLocation.monsters);

      setExplorationEvent(`⚠️ Enemy Ambush! A level ${monster.level} ${monster.name} emerges from the shadows!`);
      soundFX.playCritSound();

      onUpdatePlayer(updatedPlayer);
      onUpdateBattle({
        inCombat: true,
        turnNumber: 1,
        playerActionGauge: 100,
        enemyActionGauge: 50,
        enemy: monster,
        logs: [
          {
            id: `init_${Date.now()}`,
            turn: 1,
            actor: 'SYSTEM',
            text: `[EXPLORATION] Ambushed by ${monster.name} (${monster.title}) in ${selectedLocation.name}!`,
            type: 'INFO',
          },
        ],
        winner: null,
      });
    } else if (roll < 0.85) {
      // Lore / Chest Loot
      const rewardCC = 120 + Math.floor(Math.random() * 200);
      const totalCC = player.wallet.copperCoins + rewardCC + (player.wallet.silverShillings * 100) + (player.wallet.goldSovereigns * 10000);
      const newGold = Math.floor(totalCC / 10000);
      const remGold = totalCC % 10000;
      const newSilver = Math.floor(remGold / 100);
      const newCopper = remGold % 100;

      setExplorationEvent(`🎁 Ancient Chest Discovered! Found ${rewardCC} Copper Coins and a glowing Prismatic Shard!`);
      soundFX.playCoinSound();

      onUpdatePlayer({
        ...updatedPlayer,
        wallet: {
          ...player.wallet,
          goldSovereigns: newGold,
          silverShillings: newSilver,
          copperCoins: newCopper,
          prismaticShards: player.wallet.prismaticShards + 1,
        },
      });
    } else {
      // Ambient Event / Shrine
      const healHp = Math.floor(derived.maxHp * 0.25);
      const newHp = Math.min(derived.maxHp, player.currentHp + healHp);
      setExplorationEvent(`✨ Aether Spring Shrine! Restored +${healHp} HP and cleansed fatigue.`);
      soundFX.playPotionSound();

      onUpdatePlayer({
        ...updatedPlayer,
        currentHp: newHp,
      });
    }
  };

  // EXPLORATION ACTION 2: Search Area (High risk)
  const handleSearchArea = () => {
    if (player.level < selectedLocation.minLevel) {
      alert(`🔒 Act Locked! Reach Level ${selectedLocation.minLevel} to search ${selectedLocation.name}.`);
      return;
    }

    const currentStamina = player.stamina ?? 18;
    if (currentStamina < 2) {
      alert('⚡ Search Area requires 2 Stamina!');
      return;
    }

    const updatedPlayer = { ...player, stamina: currentStamina - 2 };
    // Search Area guarantees an Elite Enemy or Rare Chest, prioritizing active bounty contract target
    const activeTargetId = player.bounties.find(
      (b) => b.isAccepted !== false && !b.isCompleted && selectedLocation.monsters.includes(b.targetMonsterId)
    )?.targetMonsterId;

    const monsterToSpawn = (activeTargetId && Math.random() < 0.85) ? activeTargetId : undefined;
    const monster = generateMonsterForLocation(selectedLocation.minLevel + 3, monsterToSpawn, selectedLocation.monsters);
    monster.maxHp = Math.floor(monster.maxHp * 1.5);
    monster.currentHp = monster.maxHp;
    if (!monster.name.startsWith('Elite')) {
      monster.name = `Elite ${monster.name}`;
    }

    setExplorationEvent(`💀 ELITE SEARCH TRIGGERED! Confronting ${monster.name}!`);
    soundFX.playCritSound();

    onUpdatePlayer(updatedPlayer);
    onUpdateBattle({
      inCombat: true,
      turnNumber: 1,
      playerActionGauge: 100,
      enemyActionGauge: 80,
      enemy: monster,
      logs: [
        {
          id: `init_search_${Date.now()}`,
          turn: 1,
          actor: 'SYSTEM',
          text: `[HIGH RISK SEARCH] Elite ${monster.name} detected! Increased Prismatic Shard drop chance.`,
          type: 'INFO',
        },
      ],
      winner: null,
    });
  };

  // COMBAT ACTION 1: Basic Attack
  const handleAttack = () => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    soundFX.playAttackSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    const primary = player.equipment.primaryWeapon;
    const minDmg = primary?.baseDamageMin || 8;
    const maxDmg = primary?.baseDamageMax || 14;
    let baseDmg = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1)) + Math.floor(derived.meleeDamage * 0.4);

    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      baseDmg = Math.floor(baseDmg * 1.6);
      soundFX.playCritSound();
      logs = addLog(logs, `⚡ CRITICAL STRIKE! Dealt ${baseDmg} physical damage to ${enemy.name}!`, 'CRIT', 'PLAYER');
    } else {
      logs = addLog(logs, `⚔️ You struck ${enemy.name} with ${primary?.name || 'Weapon'} for ${baseDmg} damage!`, 'DAMAGE', 'PLAYER');
    }

    const enemyDR = enemy.armor / (enemy.armor + 150);
    const finalDmg = Math.max(1, Math.floor(baseDmg * (1 - enemyDR)));
    enemy.currentHp -= finalDmg;

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      handleVictory(enemy, logs);
      return;
    }

    const enemyTurnResult = executeEnemyTurn(enemy, logs);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
  };

  // COMBAT ACTION 2: Skill / Spell Execution
  const handleCastSpell = (spellName: string, mpCost: number, multiplier: number) => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    if (player.currentMp < mpCost) {
      alert(`Not enough MP to cast ${spellName}! Costs ${mpCost} MP.`);
      return;
    }

    setShowSpellPicker(false);
    soundFX.playSpellSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    const updatedPlayer = { ...player, currentMp: player.currentMp - mpCost };
    let spellDmg = Math.floor((20 + derived.magicDamage) * multiplier);

    if (player.isEmpoweredNextTurn) {
      spellDmg = Math.floor(spellDmg * 1.5);
      updatedPlayer.isEmpoweredNextTurn = false;
      logs = addLog(logs, `🔥 EMPOWERED SPELL BURST! +50% bonus spell damage applied!`, 'BUFF', 'PLAYER');
    }

    logs = addLog(logs, `✨ Cast [${spellName}] for ${spellDmg} magic damage on ${enemy.name}!`, 'DAMAGE', 'PLAYER');
    enemy.currentHp -= spellDmg;

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      onUpdatePlayer(updatedPlayer);
      handleVictory(enemy, logs);
      return;
    }

    onUpdatePlayer(updatedPlayer);
    const enemyTurnResult = executeEnemyTurn(enemy, logs);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
  };

  // COMBAT ACTION 3: Quick Item
  const handleQuickItem = () => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    const potionIndex = player.inventory.findIndex(
      (i): i is ConsumableItem => 'hpRestore' in i || 'mpRestore' in i || 'cleansesDebuffs' in i
    );

    if (potionIndex === -1) {
      alert('No consumable potions or draughts in bag inventory!');
      return;
    }

    const item = player.inventory[potionIndex] as ConsumableItem;
    soundFX.playPotionSound();
    let logs = battle.logs;

    let updatedHp = player.currentHp;
    let updatedMp = player.currentMp;

    if (item.hpRestore) updatedHp = Math.min(derived.maxHp, player.currentHp + item.hpRestore);
    if (item.mpRestore) updatedMp = Math.min(derived.maxMp, player.currentMp + item.mpRestore);

    logs = addLog(logs, `🧪 Consumed [${item.name}]! Restored HP/MP.`, 'HEAL', 'PLAYER');

    const updatedInventory = player.inventory.filter((_, idx) => idx !== potionIndex);
    const updatedPlayer = {
      ...player,
      currentHp: updatedHp,
      currentMp: updatedMp,
      inventory: updatedInventory,
    };

    onUpdatePlayer(updatedPlayer);
    const enemy = { ...battle.enemy };
    const enemyTurnResult = executeEnemyTurn(enemy, logs);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
  };

  // COMBAT ACTION 4: Guard / Parry
  const handleGuard = () => {
    if (!battle.enemy || !battle.inCombat || battle.winner !== null) return;

    soundFX.playPotionSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    logs = addLog(logs, `🛡️ Raised Guard! Incoming damage reduced by 40% & Bleed negated next turn.`, 'BUFF', 'PLAYER');
    const updatedPlayer = { ...player, isCoveredNextTurn: true };

    onUpdatePlayer(updatedPlayer);
    const enemyTurnResult = executeEnemyTurn(enemy, logs);
    if (enemyTurnResult.isDefeated) return;
    onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
  };

  // COMBAT ACTION 5: Flee
  const handleFlee = () => {
    if (!battle.inCombat) return;

    // Agility check to flee
    const fleeChance = Math.min(90, 50 + player.attributes.agi * 1.5);
    const roll = Math.random() * 100;

    if (roll <= fleeChance) {
      alert('🏃 Escape Successful! Retreating back to sector entrance.');
      soundFX.playCoinSound();

      onUpdateBattle({
        inCombat: false,
        turnNumber: 0,
        playerActionGauge: 100,
        enemyActionGauge: 0,
        enemy: null,
        logs: [],
        winner: null,
      });
    } else {
      let logs = battle.logs;
      logs = addLog(logs, `❌ Flee Failed! The enemy blocked your escape route!`, 'DEBUFF', 'PLAYER');
      const enemy = { ...battle.enemy! };
      const enemyTurnResult = executeEnemyTurn(enemy, logs);
      if (enemyTurnResult.isDefeated) return;
      onUpdateBattle({ ...battle, turnNumber: battle.turnNumber + 1, enemy, logs: enemyTurnResult.logs });
    }
  };

  // Enemy Turn Resolution
  const executeEnemyTurn = (
    enemy: EnemyMonster,
    currentLogs: BattleLogEntry[]
  ): { logs: BattleLogEntry[]; isDefeated: boolean } => {
    let logs = currentLogs;
    const enemyDmg = Math.floor(enemy.attackMin + Math.random() * (enemy.attackMax - enemy.attackMin + 1));

    let playerDR = derived.damageReductionPercent / 100;
    if (player.isCoveredNextTurn) {
      playerDR = Math.min(0.9, playerDR + 0.4);
    }

    const finalEnemyDmg = Math.max(1, Math.floor(enemyDmg * (1 - playerDR)));
    const newPlayerHp = Math.max(0, player.currentHp - finalEnemyDmg);

    logs = addLog(logs, `⚔️ ${enemy.name} attacked you for ${finalEnemyDmg} damage!`, 'DAMAGE', 'ENEMY');

    if (newPlayerHp <= 0) {
      logs = addLog(logs, `💀 You were defeated in battle! Transported back to Haven's Rest.`, 'DEBUFF', 'SYSTEM');
      alert('💀 Slain in Battle! Transporting back to Haven\'s Rest.');

      onUpdatePlayer({
        ...player,
        currentHp: Math.floor(derived.maxHp * 0.5),
      });

      onUpdateBattle({
        inCombat: false,
        turnNumber: 0,
        playerActionGauge: 100,
        enemyActionGauge: 0,
        enemy: null,
        logs: [],
        winner: 'ENEMY',
      });

      onNavigateToHaven();
      return { logs, isDefeated: true };
    }

    onUpdatePlayer({
      ...player,
      currentHp: newPlayerHp,
      isCoveredNextTurn: false,
    });

    return { logs, isDefeated: false };
  };

  // Victory Resolution
  const handleVictory = (enemy: EnemyMonster, currentLogs: BattleLogEntry[]) => {
    soundFX.playLevelUpSound();
    let logs = addLog(currentLogs, `🎉 VICTORY! Defeated ${enemy.name}! Earned +${enemy.expReward} EXP and +${enemy.copperReward} CC.`, 'BUFF', 'SYSTEM');

    // Strict match: Either the cleaned enemy name matches/contains target name, or enemy ID contains target monster ID
    const cleanEnemyName = enemy.name.replace(/^Elite\s+/, '').trim().toLowerCase();
    const cleanEnemyId = enemy.id.toLowerCase();

    const updatedBounties = player.bounties.map((bounty) => {
      const cleanTargetName = bounty.targetMonsterName.toLowerCase();
      const cleanTargetId = bounty.targetMonsterId.toLowerCase();

      const isMatch =
        cleanEnemyName.includes(cleanTargetName) ||
        cleanTargetName.includes(cleanEnemyName) ||
        cleanEnemyId.includes(cleanTargetId);

      if (isMatch) {
        const newCount = Math.min(bounty.targetCount, bounty.currentCount + 1);
        return {
          ...bounty,
          currentCount: newCount,
          isCompleted: newCount >= bounty.targetCount,
        };
      }
      return bounty;
    });

    onMonsterKilled(enemy);

    const totalCC = player.wallet.copperCoins + enemy.copperReward + (player.wallet.silverShillings * 100) + (player.wallet.goldSovereigns * 10000);
    const newGold = Math.floor(totalCC / 10000);
    const remGold = totalCC % 10000;
    const newSilver = Math.floor(remGold / 100);
    const newCopper = remGold % 100;

    const expResult = processExpGain(player.level, player.exp, enemy.expReward);
    const newLevel = expResult.newLevel;
    const newExp = expResult.newExp;
    const newAP = player.availableAP + expResult.apGained;

    if (expResult.levelsGained > 0) {
      logs = addLog(logs, `🌟 LEVEL UP! Reached Level ${newLevel}! Earned +${expResult.apGained} Attribute Points. EXP reset to 0.`, 'CRIT', 'SYSTEM');
    }

    const shardDropped = Math.random() < enemy.shardChance;

    onUpdatePlayer({
      ...player,
      level: newLevel,
      exp: newExp,
      availableAP: newAP,
      locationPoints: player.locationPoints + 15,
      bounties: updatedBounties,
      wallet: {
        ...player.wallet,
        goldSovereigns: newGold,
        silverShillings: newSilver,
        copperCoins: newCopper,
        prismaticShards: player.wallet.prismaticShards + (shardDropped ? 1 : 0),
      },
    });

    // KEEP inCombat: true so the Victory Card remains visible until the user clicks Claim Rewards!
    onUpdateBattle({
      inCombat: true,
      turnNumber: battle.turnNumber,
      playerActionGauge: 100,
      enemyActionGauge: 0,
      enemy: { ...enemy, currentHp: 0 },
      logs,
      winner: 'PLAYER',
    });
  };

  // Claim Rewards and exit battle viewport safely
  const handleClaimRewardsAndExit = () => {
    soundFX.playCoinSound();
    onUpdateBattle({
      inCombat: false,
      turnNumber: 0,
      playerActionGauge: 100,
      enemyActionGauge: 0,
      enemy: null,
      logs: [],
      winner: null,
    });
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4 overflow-y-auto">
      {/* Sector Header & Location Selector */}
      {!battle.inCombat && (
        <div className="bg-zinc-900/90 border border-amber-900/50 rounded-xl p-4 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-500 tracking-widest font-semibold">ACTIVE EXPEDITION ZONE</div>
            <h2 className="text-2xl font-bold font-serif text-amber-200">{selectedLocation.name}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{selectedLocation.description}</p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedLocation.id}
              onChange={(e) => {
                const loc = GAME_LOCATIONS.find((l) => l.id === e.target.value);
                if (loc) handleSelectLocation(loc);
              }}
              className="bg-zinc-950 border border-amber-500/40 text-amber-200 rounded px-3 py-1.5 text-xs font-mono font-bold cursor-pointer"
            >
              {GAME_LOCATIONS.map((loc) => {
                const isLocked = player.level < loc.minLevel;
                return (
                  <option key={loc.id} value={loc.id} disabled={isLocked} className={isLocked ? 'text-zinc-500 bg-zinc-950' : 'text-amber-200 bg-zinc-900'}>
                    {isLocked ? `🔒 ${loc.name} (Req: Lv ${loc.minLevel} - LOCKED)` : `✅ ${loc.name} (Req: Lv ${loc.minLevel})`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* Exploration Event Feed (When NOT in combat) */}
      {!battle.inCombat && (
        <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-xl min-h-[220px]">
          <div>
            <div className="text-xs font-mono uppercase text-amber-500 font-bold mb-2">SECTOR NARRATIVE FEED</div>
            <p className="text-sm font-mono text-zinc-200 leading-relaxed">
              {explorationEvent || `You are treading carefully through ${selectedLocation.name}. Ambient Aether hums in the stone. Venture forward to scout the sector or search for hidden chests.`}
            </p>
          </div>

          <div className="text-xs font-mono text-zinc-400 border-t border-zinc-800 pt-3 flex justify-between">
            <span>Danger Rating: <strong className="text-amber-300">Level {selectedLocation.minLevel}+</strong></span>
            <span>Energy / Stamina: <strong className="text-emerald-400">{player.stamina ?? 18}/{player.maxStamina ?? 20}</strong></span>
          </div>
        </div>
      )}

      {/* IN-LINE COMBAT VIEWPORT (When in combat) */}
      {battle.inCombat && battle.enemy && (
        <div className="flex-1 space-y-3">
          {/* Target Enemy Display Card */}
          <div className="bg-zinc-900/90 border border-red-900/60 rounded-xl p-4 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-zinc-950 border border-amber-500/40 rounded-xl flex items-center justify-center text-4xl shadow-inner shrink-0">
                {battle.winner === 'PLAYER' ? '💀' : battle.enemy.spriteIcon}
              </div>
              <div>
                <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">
                  {battle.winner === 'PLAYER' ? 'TARGET DEFEATED' : `BATTLE TARGET • LEVEL ${battle.enemy.level}`}
                </div>
                <h3 className="text-xl md:text-2xl font-bold font-serif text-amber-200">{battle.enemy.name}</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{battle.enemy.title}</p>
              </div>
            </div>

            {/* Enemy HP Meter */}
            <div className="w-full md:w-64 space-y-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-red-400">HP</span>
                <span>{battle.enemy.currentHp} / {battle.enemy.maxHp}</span>
              </div>
              <div className="w-full h-3 bg-zinc-950 rounded-full border border-red-900/50 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-amber-500 transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (battle.enemy.currentHp / battle.enemy.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          {/* VICTORY & LOOT REWARD CARD (When Winner === 'PLAYER') */}
          {battle.winner === 'PLAYER' && (
            <div className="bg-gradient-to-r from-amber-950 via-zinc-900 to-amber-950 border-2 border-amber-500/80 rounded-2xl p-5 shadow-2xl text-center space-y-3 animate-fade-in">
              <div className="text-3xl">🎉</div>
              <h3 className="text-2xl font-bold font-serif text-amber-200">VICTORY & LOOT SECURED!</h3>
              <p className="text-xs font-mono text-zinc-300">
                Defeated <strong>{battle.enemy.name}</strong>! Earned <strong className="text-emerald-400">+{battle.enemy.expReward} EXP</strong>, <strong className="text-yellow-400">+{battle.enemy.copperReward} CC</strong>, and <strong className="text-cyan-300">+15 Location Points</strong>.
              </p>

              {/* Live Contract Progress Badge */}
              {player.bounties.filter((b) => b.isAccepted !== false).map((b) => (
                <div key={b.id} className="bg-purple-950/80 border border-purple-500/60 p-2 rounded-lg text-xs font-mono text-purple-200 flex justify-between items-center max-w-md mx-auto">
                  <span>🎯 Contract Progress: <strong>{b.title}</strong> ({b.targetMonsterName})</span>
                  <span className={`font-bold ${b.isCompleted ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {b.isCompleted ? '✅ COMPLETED!' : `${b.currentCount} / ${b.targetCount}`}
                  </span>
                </div>
              ))}

              <button
                onClick={handleClaimRewardsAndExit}
                className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-mono text-xs uppercase px-8 py-2.5 rounded-xl shadow-lg transition-all active:scale-95"
              >
                [ Claim Rewards & Continue Expedition ]
              </button>
            </div>
          )}

          {/* Real-time Battle Combat Terminal Feed */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 h-44 overflow-y-auto font-mono text-xs space-y-1 shadow-inner">
            <div className="text-[10px] text-zinc-500 uppercase border-b border-zinc-800 pb-1 mb-1 flex justify-between">
              <span>REAL-TIME COMBAT FEED</span>
              <span>TURN #{battle.turnNumber}</span>
            </div>
            {battle.logs.map((log) => (
              <div
                key={log.id}
                className={`p-1 rounded ${
                  log.type === 'CRIT'
                    ? 'bg-amber-950/60 text-amber-300 font-bold border-l-2 border-amber-500'
                    : log.type === 'DAMAGE'
                    ? log.actor === 'PLAYER'
                      ? 'text-sky-300'
                      : 'text-red-400'
                    : log.type === 'HEAL'
                    ? 'text-emerald-400'
                    : 'text-zinc-300'
                }`}
              >
                {log.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Spell Picker Modal Wheel */}
      {showSpellPicker && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-sky-500/50 rounded-2xl p-5 max-w-md w-full space-y-3 shadow-2xl">
            <h3 className="text-lg font-bold font-serif text-sky-300 flex justify-between items-center">
              <span>Select Spell / Skill</span>
              <button onClick={() => setShowSpellPicker(false)} className="text-zinc-500 hover:text-white">✕</button>
            </h3>
            <p className="text-xs text-zinc-400">Choose an ability to cast on target enemy:</p>

            <div className="space-y-2 font-mono">
              <button
                onClick={() => handleCastSpell('Frost Lance', 15, 1.3)}
                className="w-full bg-sky-950 hover:bg-sky-900 border border-sky-500/50 p-3 rounded-lg text-left text-xs font-bold text-sky-200 flex justify-between items-center"
              >
                <div>
                  <div>❄️ Frost Lance</div>
                  <div className="text-[10px] font-normal text-zinc-400">High precision frost attack (1.3x Magic DMG)</div>
                </div>
                <span>15 MP</span>
              </button>

              <button
                onClick={() => handleCastSpell('Flame Cleave', 25, 1.8)}
                className="w-full bg-amber-950 hover:bg-amber-900 border border-amber-500/50 p-3 rounded-lg text-left text-xs font-bold text-amber-200 flex justify-between items-center"
              >
                <div>
                  <div>🔥 Flame Cleave</div>
                  <div className="text-[10px] font-normal text-zinc-400">Devastating fire strike (1.8x Magic DMG)</div>
                </div>
                <span>25 MP</span>
              </button>

              <button
                onClick={() => handleCastSpell('Arcane Void Burst', 35, 2.5)}
                className="w-full bg-purple-950 hover:bg-purple-900 border border-purple-500/50 p-3 rounded-lg text-left text-xs font-bold text-purple-200 flex justify-between items-center"
              >
                <div>
                  <div>🔮 Arcane Void Burst</div>
                  <div className="text-[10px] font-normal text-zinc-400">Extreme void burst (2.5x Magic DMG)</div>
                </div>
                <span>35 MP</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [BOTTOM] CONTEXTUAL ACTION PAD (EXPLORATION VS COMBAT) */}
      <div className="bg-zinc-950 border border-amber-900/60 p-2 md:p-3 rounded-xl shadow-2xl">
        <div className="text-[10px] font-mono text-amber-500 uppercase font-semibold mb-1.5 text-center md:text-left">
          {battle.inCombat ? 'COMBAT FAST-TAP ACTION PAD' : 'SECTOR EXPLORATION ACTION PAD'}
        </div>

        {/* Exploration Action Pad */}
        {!battle.inCombat ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <button
              onClick={handleVentureForward}
              className="p-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>🧭</span>
              <span>[ Venture Forward ] (1 Stamina)</span>
            </button>

            <button
              onClick={handleSearchArea}
              className="p-3 bg-purple-900 hover:bg-purple-800 border border-purple-500/50 text-purple-100 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>🔍</span>
              <span>[ Search Area ] (High Risk)</span>
            </button>

            <button
              onClick={onNavigateToHaven}
              className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold font-mono text-xs uppercase tracking-wider rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>🏰</span>
              <span>[ Retreat to Haven ]</span>
            </button>
          </div>
        ) : (
          /* Combat Action Pad */
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 font-mono text-xs font-bold">
            <button
              onClick={handleAttack}
              disabled={battle.winner !== null}
              className="p-3 bg-amber-600 hover:bg-amber-500 text-zinc-950 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>1. Attack</span>
              <span className="text-[9px] font-normal opacity-80">{player.equipment.primaryWeapon?.name || 'Primary Strike'}</span>
            </button>

            <button
              onClick={() => setShowSpellPicker(true)}
              disabled={battle.winner !== null}
              className="p-3 bg-sky-900 hover:bg-sky-800 border border-sky-500/50 text-sky-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>2. Skill / Spell</span>
              <span className="text-[9px] font-normal opacity-80">Select Ability</span>
            </button>

            <button
              onClick={handleQuickItem}
              disabled={battle.winner !== null}
              className="p-3 bg-emerald-900 hover:bg-emerald-800 border border-emerald-500/50 text-emerald-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>3. Quick Item</span>
              <span className="text-[9px] font-normal opacity-80">Use Draught</span>
            </button>

            <button
              onClick={handleGuard}
              disabled={battle.winner !== null}
              className="p-3 bg-indigo-900 hover:bg-indigo-800 border border-indigo-500/50 text-indigo-100 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>4. Guard / Parry</span>
              <span className="text-[9px] font-normal opacity-80">-40% Damage</span>
            </button>

            <button
              onClick={handleFlee}
              disabled={battle.winner !== null}
              className="col-span-2 md:col-span-1 p-3 bg-red-950 hover:bg-red-900 border border-red-600/50 text-red-200 rounded-lg uppercase tracking-wider shadow-md transition-all active:scale-95 flex flex-col items-center justify-center disabled:opacity-40"
            >
              <span>5. Flee</span>
              <span className="text-[9px] font-normal opacity-80">Agility Escape</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
