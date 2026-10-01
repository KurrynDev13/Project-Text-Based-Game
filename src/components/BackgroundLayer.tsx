import React from 'react';
import poblacionBg from '../bg/poblacion.jpg';
import forgeBg from '../bg/forge.jpg';
import alchemistBg from '../bg/alchemist.jpg';
import gateBg from '../bg/gate.jpg';
import stashBg from '../bg/stash.jpg';
import baleteBg from '../bg/01_balete.jpg';
import lagoonBg from '../bg/02_lagoon.jpg';
import caveBg from '../bg/03_Cave.jpg';
import calderaBg from '../bg/04_caldera.jpg';
import cursedBg from '../bg/05_cursed.jpg';
import trenchBg from '../bg/06_trench.jpg';
import spiresBg from '../bg/07_Spires.jpg';
import mawBg from '../bg/08_Maw.jpg';
import celestialBg from '../bg/09_celestial.jpg';
import bakunawaBg from '../bg/10_bakunawa.jpg';
import inventoryBg from '../bg/inventory.jpg';
import characterBg from '../bg/character.jpg';
import logsBg from '../bg/logs.jpg';

interface BackgroundLayerProps {
  currentTab: 'HAVEN' | 'WORLD' | 'INVENTORY' | 'CHARACTER' | 'LOG';
  townDistrict?: 'TAVERN' | 'FORGE' | 'ALCHEMIST' | 'STABLES' | 'GATE' | 'STASH';
  locationId?: string;
  showRaidView?: boolean;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  currentTab,
  townDistrict = 'TAVERN',
  locationId = 'loc_act_1',
  showRaidView = false,
}) => {
  // Compute active background image directly from current tab, district, and location props
  let activeBg = poblacionBg;

  if (showRaidView) {
    activeBg = bakunawaBg;
  } else if (currentTab === 'INVENTORY') {
    activeBg = inventoryBg;
  } else if (currentTab === 'CHARACTER') {
    activeBg = characterBg;
  } else if (currentTab === 'LOG') {
    activeBg = logsBg;
  } else if (currentTab === 'HAVEN') {
    switch (townDistrict) {
      case 'FORGE':
        activeBg = forgeBg;
        break;
      case 'ALCHEMIST':
        activeBg = alchemistBg;
        break;
      case 'GATE':
        activeBg = gateBg;
        break;
      case 'STASH':
      case 'STABLES':
        activeBg = stashBg;
        break;
      case 'TAVERN':
      default:
        activeBg = poblacionBg;
        break;
    }
  } else if (currentTab === 'WORLD') {
    switch (locationId) {
      case 'loc_act_1':
        activeBg = baleteBg;
        break;
      case 'loc_act_2':
        activeBg = lagoonBg;
        break;
      case 'loc_act_3':
        activeBg = caveBg;
        break;
      case 'loc_act_4':
        activeBg = calderaBg;
        break;
      case 'loc_act_5':
        activeBg = cursedBg;
        break;
      case 'loc_act_6':
        activeBg = trenchBg;
        break;
      case 'loc_act_7':
        activeBg = spiresBg;
        break;
      case 'loc_act_8':
        activeBg = mawBg;
        break;
      case 'loc_act_infinite':
        activeBg = celestialBg;
        break;
      default:
        activeBg = baleteBg;
        break;
    }
  }

  return (
    <div className="fixed inset-0 -z-30 overflow-hidden pointer-events-none select-none bg-black">
      {/* Dynamic Background Image - Directly bound to current view state */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat transition-all duration-300 ease-in-out"
        style={{
          backgroundImage: `url(${activeBg})`,
          backgroundPosition: '50% 0%', // Anchored at top-middle for responsive mobile scaling
        }}
      />

      {/* Dark Vignette & Subtle Blur Overlay — text peeks through cleanly */}
      <div className="fixed inset-0 -z-10 bg-black/20 backdrop-blur-[1.5px] pointer-events-none" />
    </div>
  );
};

