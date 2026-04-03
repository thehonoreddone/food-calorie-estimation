// ─── Mascot Message Pool ────────────────────────────────────────────────────
// Mood-based Turkish messages for the Nutrino mascot
// ────────────────────────────────────────────────────────────────────────────

export type MascotMood = 'happy' | 'hungry' | 'excited' | 'overfull' | 'sleepy' | 'idle';

interface MascotMessagePool {
  [key: string]: string[];
}

export const mascotMessages: MascotMessagePool = {
  hungry: [
    "Bugün hiç yemedin, ben de açım! 🥺",
    "Karnım gurluyor, ya seninkisi? 🍽️",
    "Bir şeyler yesek mi? Seçeneklere bakalım! 🧐",
    "Kahvaltı yapmadan güne başlanmaz! ☀️",
    "Aç karnına düşünmek zor, haydi ye bir şeyler! 🤔",
  ],
  sleepy: [
    "Az yedin bugün, biraz daha yesen mi? 😴",
    "Enerji seviyem düşük... seninkisi de mi? 💤",
    "Bir meyve veya atıştırmalık iyi gider! 🍎",
    "Metabolizmayı hızlandırmak için bir şeyler ye! ⚡",
  ],
  happy: [
    "Süpersin! Hedefe doğru gidiyorsun! 💪",
    "Bugün çok iyi besleniyorsun! 👏",
    "Harika gidiyorsun, böyle devam! 🌟",
    "Dengeli beslenme = mutlu ben! 😊",
    "Bugünkü seçimlerin mükemmel! ✨",
    "Her öğünde daha iyiye gidiyorsun! 🎯",
  ],
  excited: [
    "Hedefe çok yakınsın! Son hamle! 🎉",
    "Neredeyse mükemmel bir gün! 🔥",
    "WAW! Bugün gerçekten harika gidiyorsun! 🚀",
    "Hedefine ulaşmak üzeresin! 🏆",
    "Bu tempo süper, devam et! 💥",
  ],
  overfull: [
    "Biraz fazla kaçtı sanırım 😅",
    "Yürüyüşe çıkmaya ne dersin? 🚶",
    "Fazla yemek olur, yarın dengeleyebilirsin 🙂",
    "Endişelenme, bir gün her şeyi değiştirmez! 💚",
    "Biraz su iç, yardımcı olur 💧",
  ],
  idle: [
    "Merhaba! Bugün nasılsın? 👋",
    "Seni görmek güzel! 😄",
    "Hazırsan yemek taramaya başlayalım! 📸",
    "Bugünkü hedefini kontrol edelim mi? 📊",
  ],
};

// ─── Time-based greetings ───────────────────────────────────────────────────

export const timeGreetings: { [key: string]: string[] } = {
  morning: [
    "Günaydın! Kahvaltını unutma ☀️",
    "Güne enerjik başlamak için güzel bir kahvaltı! 🌅",
    "Günaydın şampiyon! Bugün neler yiyeceğiz? 🥐",
  ],
  afternoon: [
    "Öğle yemeği zamanı geldi! 🕐",
    "Öğleden sonra enerjini koru! ⚡",
    "İyi bir öğle yemeği günü kurtarır! 🍝",
  ],
  evening: [
    "Akşam yemeğinde hafif kal! 🌙",
    "Günün son öğünü, akıllıca seç! 🧠",
    "Akşam yemeğinden sonra bir yürüyüş güzel olur! 🌆",
  ],
  night: [
    "Geç saatte atıştırma dikkat! 🕐",
    "Yarın için güzel planlar yapabiliriz! 📝",
    "İyi geceler, yarın görüşürüz! 🌜",
  ],
};

// ─── Streak messages ────────────────────────────────────────────────────────

export function getStreakMessage(days: number): string {
  if (days >= 30) return `${days} gündür hedefine ulaşıyorsun! Efsane! 🏆🔥`;
  if (days >= 14) return `${days} gün üst üste! Muhteşem disiplin! 💎`;
  if (days >= 7) return `${days} günlük seri! Harikasın! ⚡`;
  if (days >= 3) return `${days} gündür düzenlisin, süper! 🌟`;
  return '';
}

// ─── Get time period ────────────────────────────────────────────────────────

function getTimePeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Mood calculator ────────────────────────────────────────────────────────

export function getMascotMood(caloriesEaten: number, calorieGoal: number): MascotMood {
  if (calorieGoal <= 0) return 'idle';

  const ratio = caloriesEaten / calorieGoal;

  if (caloriesEaten === 0) return 'hungry';
  if (ratio < 0.3) return 'sleepy';
  if (ratio >= 0.3 && ratio < 0.7) return 'happy';
  if (ratio >= 0.7 && ratio <= 1.05) return 'excited';
  if (ratio > 1.05) return 'overfull';

  return 'idle';
}

// ─── Random message selector ────────────────────────────────────────────────

export function getRandomMessage(mood: MascotMood, streak: number = 0): string {
  // 30% chance: streak message (if applicable)
  if (streak >= 3 && Math.random() < 0.3) {
    const streakMsg = getStreakMessage(streak);
    if (streakMsg) return streakMsg;
  }

  // 25% chance: time-based greeting
  if (Math.random() < 0.25) {
    const period = getTimePeriod();
    const timeMessages = timeGreetings[period];
    if (timeMessages && timeMessages.length > 0) {
      return timeMessages[Math.floor(Math.random() * timeMessages.length)];
    }
  }

  // Default: mood-based message
  const messages = mascotMessages[mood] || mascotMessages.idle;
  return messages[Math.floor(Math.random() * messages.length)];
}
