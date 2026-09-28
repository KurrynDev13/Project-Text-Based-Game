import React, { useState } from 'react';
import { PlayerCharacter, BattleState, BattleLogEntry, EnemyMonster, ActiveStatusEffect } from '../types/game';
import { calcDerivedStats } from '../utils/gameFormulas';
import { soundFX } from '../utils/audio';

interface CombatArenaProps {
  player: PlayerCharacter;
  battle: BattleState;
  onUpdatePlayer: (updated: PlayerCharacter) => void;
  onUpdateBattle: (updated: BattleState) => void;
  onMonsterKilled: (monster: EnemyMonster) => void;
}

export const CombatArena: React.FC<CombatArenaProps> = ({
  player,
  battle,
  onUpdatePlayer,
  onUpdateBattle,
  onMonsterKilled,
}) => {
  const [selectedPotionId, setSelectedPotionId] = useState<string>('');

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

  const handlePrimaryAttack = () => {
    if (!battle.enemy || !battle.inCombat) return;

    soundFX.playAttackSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    // Weapon Damage Calculation
    const primaryWeapon = player.equipment.primaryWeapon;
    const minDmg = primaryWeapon?.baseDamageMin || 8;
    const maxDmg = primaryWeapon?.baseDamageMax || 14;
    let baseAttack = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1)) + Math.floor(derived.meleeDamage * 0.4);

    // Crit check
    const isCrit = Math.random() * 100 < derived.critChancePercent;
    if (isCrit) {
      baseAttack = Math.floor(baseAttack * 1.6);
      soundFX.playCritSound();
      logs = addLog(logs, `⚡ CRITICAL HIT! Primary Attack hit ${enemy.name} for ${baseAttack} DMG!`, 'CRIT', 'PLAYER');
    } else {
      logs = addLog(logs, `⚔️ Primary Strike dealt ${baseAttack} physical damage to ${enemy.name}.`, 'DAMAGE', 'PLAYER');
    }

    // Apply Enemy Armor DR
    const enemyDR = enemy.armor / (enemy.armor + 150);
    const finalDmg = Math.max(1, Math.floor(baseAttack * (1 - enemyDR)));
    enemy.currentHp -= finalDmg;

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      handleVictory(enemy, logs);
      return;
    }

    // Enemy Turn Counter Attack
    logs = executeEnemyTurn(enemy, logs);

    onUpdateBattle({
      ...battle,
      turnNumber: battle.turnNumber + 1,
      enemy,
      logs,
    });
  };

  const handleSpecialAbility = () => {
    if (!battle.enemy || !battle.inCombat) return;

    const mpCost = 15;
    if (player.currentMp < mpCost) {
      alert('Not enough Mana for Special Action!');
      return;
    }

    soundFX.playSpellSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    const updatedPlayer = { ...player, currentMp: player.currentMp - mpCost };
    const specialWeapon = player.equipment.specialWeapon;
    const minDmg = specialWeapon?.baseDamageMin || 15;
    const maxDmg = specialWeapon?.baseDamageMax || 25;
    let baseSpell = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1)) + Math.floor(derived.rangedDamage * 0.5 + derived.magicDamage * 0.5);

    if (player.isEmpoweredNextTurn) {
      baseSpell = Math.floor(baseSpell * 1.5);
      updatedPlayer.isEmpoweredNextTurn = false;
      logs = addLog(logs, `🔥 EMPOWERED SPECIAL BURST! Deals +50% bonus damage!`, 'BUFF', 'PLAYER');
    }

    logs = addLog(logs, `🏹 Special Attack (${specialWeapon?.name || 'Ranged Ability'}) hit ${enemy.name} for ${baseSpell} damage!`, 'DAMAGE', 'PLAYER');

    enemy.currentHp -= baseSpell;

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      onUpdatePlayer(updatedPlayer);
      handleVictory(enemy, logs);
      return;
    }

    logs = executeEnemyTurn(enemy, logs);

    onUpdatePlayer(updatedPlayer);
    onUpdateBattle({
      ...battle,
      turnNumber: battle.turnNumber + 1,
      enemy,
      logs,
    });
  };

  const handleHeavyStrike = () => {
    if (!battle.enemy || !battle.inCombat) return;

    const mpCost = 25;
    if (player.currentMp < mpCost) {
      alert('Not enough Mana for Heavy Strike!');
      return;
    }

    soundFX.playSpellSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    const updatedPlayer = { ...player, currentMp: player.currentMp - mpCost };
    const heavyWeapon = player.equipment.heavyWeapon;
    const minDmg = heavyWeapon?.baseDamageMin || 30;
    const maxDmg = heavyWeapon?.baseDamageMax || 50;
    const baseHeavy = Math.floor(minDmg + Math.random() * (maxDmg - minDmg + 1)) + Math.floor(derived.meleeDamage * 0.8 + derived.magicDamage * 0.8);

    logs = addLog(logs, `💥 HEAVY TITAN STRIKE (${heavyWeapon?.name || 'Ultimate Attack'}) slammed ${enemy.name} for ${baseHeavy} DEVASTATING damage!`, 'DAMAGE', 'PLAYER');

    enemy.currentHp -= baseHeavy;

    if (enemy.currentHp <= 0) {
      enemy.currentHp = 0;
      onUpdatePlayer(updatedPlayer);
      handleVictory(enemy, logs);
      return;
    }

    logs = executeEnemyTurn(enemy, logs);

    onUpdatePlayer(updatedPlayer);
    onUpdateBattle({
      ...battle,
      turnNumber: battle.turnNumber + 1,
      enemy,
      logs,
    });
  };

  const handleTakeCover = () => {
    if (!battle.enemy || !battle.inCombat) return;

    soundFX.playPotionSound();
    let logs = battle.logs;
    const enemy = { ...battle.enemy };

    // Restore 15% HP & MP while taking cover
    const healHp = Math.floor(derived.maxHp * 0.15);
    const healMp = Math.floor(derived.maxMp * 0.15);

    const updatedPlayer = {
      ...player,
      currentHp: Math.min(derived.maxHp, player.currentHp + healHp),
      currentMp: Math.min(derived.maxMp, player.currentMp + healMp),
      isCoveredNextTurn: true,
    };

    logs = addLog(logs, `🛡️ Took Cover! Recovered +${healHp} HP and +${healMp} MP while bracing for defense.`, 'HEAL', 'PLAYER');

    logs = executeEnemyTurn(enemy, logs, true);

    onUpdatePlayer(updatedPlayer);
    onUpdateBattle({
      ...battle,
      turnNumber: battle.turnNumber + 1,
      enemy,
      logs,
    });
  };

  const executeEnemyTurn = (enemy: EnemyMonster, currentLogs: BattleLogEntry[], isPlayerCovered = false): BattleLogEntry[] => {
    let logs = currentLogs;

    // Dodge check
    if (Math.random() * 100 < derived.dodgeChancePercent) {
      logs = addLog(logs, `💨 You dodged ${enemy.name}'s incoming attack!`, 'INFO', 'PLAYER');
      return logs;
    }

    const enemyRawDmg = Math.floor(enemy.attackMin + Math.random() * (enemy.attackMax - enemy.attackMin + 1));
    let netDmg = Math.floor(enemyRawDmg * (1 - derived.damageReductionPercent / 100));

    if (isPlayerCovered) {
      netDmg = Math.floor(netDmg * 0.5);
      logs = addLog(logs, `🛡️ Cover reduced incoming attack damage by 50%!`, 'BUFF', 'SYSTEM');
    }

    netDmg = Math.max(1, netDmg);

    const newHp = Math.max(0, player.currentHp - netDmg);
    onUpdatePlayer({ ...player, currentHp: newHp });

    logs = addLog(logs, `🩸 ${enemy.name} attacked for ${netDmg} damage!`, 'DAMAGE', 'ENEMY');

    if (newHp <= 0) {
      soundFX.playDefeatSound();
      logs = addLog(logs, `💀 You were defeated in battle by ${enemy.name}! Reviving at Outpost...`, 'DEBUFF', 'SYSTEM');
      onUpdateBattle({ ...battle, inCombat: false, winner: 'ENEMY', logs });
    }

    return logs;
  };

  const handleVictory = (enemy: EnemyMonster, logs: BattleLogEntry[]) => {
    soundFX.playVictorySound();

    let finalLogs = addLog(logs, `🏆 VICTORY! Defeated ${enemy.name}!`, 'INFO', 'SYSTEM');
    finalLogs = addLog(finalLogs, `✨ Gained +${enemy.expReward} EXP, +${enemy.copperReward} CC, +10 Location Points (LP)`, 'DROP', 'SYSTEM');

    // Grant Encrypted Memory Drop (Titan Conquest Codebreaker drop)
    const newMemories = [...player.encryptedMemories];
    const dropRarity = enemy.memoryDropRarity || 'WHITE';
    if (Math.random() < 0.65) {
      newMemories.push({
        id: `mem_${Date.now()}`,
        name: `Encrypted Memory (${dropRarity})`,
        rarity: dropRarity,
        minLevel: enemy.level,
        acquiredAtLocation: player.currentLocationId,
      });
      finalLogs = addLog(finalLogs, `💎 DROPPED: Encrypted Memory (${dropRarity})! Take to Codebreaker to decrypt gear.`, 'DROP', 'SYSTEM');
    }

    // EXP check & Level up
    let newExp = player.exp + enemy.expReward;
    let newLevel = player.level;
    let newAP = player.availableAP;

    if (newExp >= derived.expRequiredNextLevel) {
      newExp -= derived.expRequiredNextLevel;
      newLevel += 1;
      newAP += 3;
      soundFX.playLevelUpSound();
      finalLogs = addLog(finalLogs, `🌟 LEVEL UP! You reached Level ${newLevel}! +3 Attribute Points earned!`, 'BUFF', 'SYSTEM');
    }

    // Currency update
    const totalCC = player.wallet.copperCoins + enemy.copperReward + (player.wallet.silverShillings * 100) + (player.wallet.goldSovereigns * 10000);
    const newGold = Math.floor(totalCC / 10000);
    const remGold = totalCC % 10000;
    const newSilver = Math.floor(remGold / 100);
    const newCopper = remGold % 100;

    onUpdatePlayer({
      ...player,
      level: newLevel,
      exp: newExp,
      availableAP: newAP,
      locationPoints: player.locationPoints + 10,
      encryptedMemories: newMemories,
      wallet: {
        ...player.wallet,
        goldSovereigns: newGold,
        silverShillings: newSilver,
        copperCoins: newCopper,
      },
    });

    onMonsterKilled(enemy);

    onUpdateBattle({
      ...battle,
      inCombat: false,
      winner: 'PLAYER',
      logs: finalLogs,
    });
  };

  const currentEnemy = battle.enemy;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-amber-100 p-3 md:p-6 space-y-4">
      {/* Enemy Stage / Battle Display */}
      {currentEnemy ? (
        <div className="bg-zinc-900/90 border border-amber-900/50 rounded-xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-800 rounded-lg border border-amber-500/30 flex items-center justify-center text-4xl shadow-inner">
              {currentEnemy.spriteIcon || '👾'}
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-500 font-semibold">{currentEnemy.title}</div>
              <h3 className="text-xl md:text-2xl font-bold font-serif text-amber-200">{currentEnemy.name}</h3>
              <p className="text-xs text-zinc-400">Armor: {currentEnemy.armor} | DMG: {currentEnemy.attackMin}-{currentEnemy.attackMax} ({currentEnemy.damageType})</p>
            </div>
          </div>

          {/* Enemy HP Meter */}
          <div className="w-full md:w-64 space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-red-400 font-semibold">HP</span>
              <span>{currentEnemy.currentHp} / {currentEnemy.maxHp}</span>
            </div>
            <div className="w-full h-3 bg-zinc-950 rounded-full border border-red-900/50 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-700 to-amber-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, (currentEnemy.currentHp / currentEnemy.maxHp) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 text-center space-y-2">
          <p className="text-zinc-400 font-mono">No target engaged in sector.</p>
          <p className="text-xs text-amber-500/80">Select a Location or press Engage Battle to encounter enemies.</p>
        </div>
      )}

      {/* Combat Action Dock (Titan Conquest 3-Weapon Action Dock) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        <button
          onClick={handlePrimaryAttack}
          disabled={!battle.inCombat || !currentEnemy}
          className="bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 text-amber-100 p-3 rounded-lg flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md"
        >
          <span className="text-xs font-mono uppercase text-amber-400 font-semibold">1. Primary</span>
          <span className="text-sm font-bold font-serif">{player.equipment.primaryWeapon?.name || 'Primary Strike'}</span>
          <span className="text-[10px] text-zinc-400">Quick Melee / Ranged Attack</span>
        </button>

        <button
          onClick={handleSpecialAbility}
          disabled={!battle.inCombat || !currentEnemy || player.currentMp < 15}
          className="bg-sky-950/80 hover:bg-sky-900 border border-sky-500/50 text-sky-100 p-3 rounded-lg flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md"
        >
          <span className="text-xs font-mono uppercase text-sky-400 font-semibold">2. Special (15 MP)</span>
          <span className="text-sm font-bold font-serif">{player.equipment.specialWeapon?.name || 'Special Shot'}</span>
          <span className="text-[10px] text-zinc-400">High Velocity Precision Hit</span>
        </button>

        <button
          onClick={handleHeavyStrike}
          disabled={!battle.inCombat || !currentEnemy || player.currentMp < 25}
          className="bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-100 p-3 rounded-lg flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md"
        >
          <span className="text-xs font-mono uppercase text-purple-400 font-semibold">3. Heavy (25 MP)</span>
          <span className="text-sm font-bold font-serif">{player.equipment.heavyWeapon?.name || 'Heavy Titan Slam'}</span>
          <span className="text-[10px] text-zinc-400">Massive Burst Damage</span>
        </button>

        <button
          onClick={handleTakeCover}
          disabled={!battle.inCombat || !currentEnemy}
          className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-100 p-3 rounded-lg flex flex-col items-center justify-center space-y-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md"
        >
          <span className="text-xs font-mono uppercase text-emerald-400 font-semibold">4. Take Cover</span>
          <span className="text-sm font-bold font-serif">Brace & Heal</span>
          <span className="text-[10px] text-zinc-400">+15% HP/MP & 50% DR</span>
        </button>
      </div>

      {/* Battle Log Terminal */}
      <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 flex flex-col min-h-[200px] overflow-hidden shadow-inner">
        <div className="flex justify-between items-center pb-2 border-b border-zinc-800 text-xs font-mono text-zinc-400">
          <span>REAL-TIME COMBAT TERMINAL</span>
          <span>Turn #{battle.turnNumber}</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 mt-2 text-xs font-mono pr-1">
          {battle.logs.length === 0 ? (
            <p className="text-zinc-600 italic">No combat events logged yet.</p>
          ) : (
            battle.logs.map((log) => (
              <div
                key={log.id}
                className={`p-1.5 rounded ${
                  log.type === 'CRIT'
                    ? 'bg-amber-950/60 text-amber-300 font-bold border-l-2 border-amber-500'
                    : log.type === 'DAMAGE'
                    ? log.actor === 'PLAYER'
                      ? 'text-sky-300'
                      : 'text-red-400'
                    : log.type === 'HEAL'
                    ? 'text-emerald-400'
                    : log.type === 'DROP'
                    ? 'text-purple-300 font-semibold bg-purple-950/30'
                    : 'text-zinc-300'
                }`}
              >
                {log.text}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
