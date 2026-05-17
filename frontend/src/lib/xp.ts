export const maxLevel = 100;

export function cumulativeXpForLevel(level: number) {
  if (level <= 1) {
    return 0;
  }

  return (100 * (level - 1) * level) / 2;
}

export function getXpState(totalXp: number) {
  let level = 1;

  while (level < maxLevel && totalXp >= cumulativeXpForLevel(level + 1)) {
    level += 1;
  }

  const currentLevelStart = cumulativeXpForLevel(level);
  const nextLevelStart = level >= maxLevel ? currentLevelStart : cumulativeXpForLevel(level + 1);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelStart);
  const xpNeededForNextLevel = Math.max(0, nextLevelStart - currentLevelStart);
  const xpProgressPercent = xpNeededForNextLevel > 0 ? (xpIntoLevel / xpNeededForNextLevel) * 100 : 100;

  return {
    level,
    xpIntoLevel,
    xpNeededForNextLevel,
    xpProgressPercent,
  };
}