// ─── Mascot Message Pool ────────────────────────────────────────────────────
// Mood-based Turkish messages for the Nutrino mascot
// Smart mood system: considers time, water, meals, and calories
// ────────────────────────────────────────────────────────────────────────────

export type MascotMood = 'happy' | 'hungry' | 'excited' | 'overfull' | 'sleepy' | 'idle' | 'thirsty';

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
  thirsty: [
    "Su içmeyi unutma! Vücut suya ihtiyaç duyar 💧",
    "Bugün hiç su eklemedin, susadım! 🏜️",
    "Bir bardak su iç, kendini daha iyi hissedeceksin 💦",
    "Suyunu ihmal etme! Sağlığın için çok önemli 🚰",
    "Hey! Su içtin mi bugün? Ben çok susadım! 😰",
    "Günde en az 2 litre su içmelisin! 💧",
  ],
  sleepy: [
    "Geç oldu, dinlenme zamanı geldi 😴",
    "Enerji seviyem düşük... seninkisi de mi? 💤",
    "Yarın güzel bir güne başlamak için uyu 🌙",
    "Gece geç yemek yeme, metabolizman yavaşlar 🛌",
    "Uyku saati yaklaşıyor, iyi geceler! 🌜",
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

export function getTimePeriod(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

// ─── Smart Mood Calculator ──────────────────────────────────────────────────
// Takes into account: calories, water, time of day, meal count

export interface MascotContext {
  caloriesEaten: number;
  calorieGoal: number;
  waterMl?: number;
  waterGoal?: number;
  mealCount?: number;
  hour?: number;
}

export function getMascotMood(
  caloriesEatenOrCtx: number | MascotContext,
  calorieGoalArg?: number,
): MascotMood {
  // Support both old (two-arg) and new (context object) signatures
  let caloriesEaten: number;
  let calorieGoal: number;
  let waterMl = 0;
  let waterGoal = 2500;
  let mealCount = -1; // -1 = unknown
  let hour = new Date().getHours();

  if (typeof caloriesEatenOrCtx === 'object') {
    const ctx = caloriesEatenOrCtx;
    caloriesEaten = ctx.caloriesEaten;
    calorieGoal = ctx.calorieGoal;
    waterMl = ctx.waterMl ?? 0;
    waterGoal = ctx.waterGoal ?? 2500;
    mealCount = ctx.mealCount ?? -1;
    hour = ctx.hour ?? hour;
  } else {
    caloriesEaten = caloriesEatenOrCtx;
    calorieGoal = calorieGoalArg ?? 0;
  }

  if (calorieGoal <= 0) return 'idle';

  const ratio = caloriesEaten / calorieGoal;

  // Night time (22:00 - 04:59) → sleepy
  if (hour >= 22 || hour < 5) return 'sleepy';

  // No water at all and it's past noon → thirsty
  if (waterMl === 0 && hour >= 12) return 'thirsty';

  // Very low water (less than 20% of goal) and past 15:00 → thirsty
  if (waterGoal > 0 && waterMl < waterGoal * 0.2 && hour >= 15) return 'thirsty';

  // Calorie-based moods
  if (caloriesEaten === 0) {
    // Morning and no food yet → hungry but gentle
    if (hour < 10) return 'idle';
    return 'hungry';
  }
  if (ratio < 0.3) return 'hungry';
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

  // 20% chance: time-based greeting
  if (Math.random() < 0.2) {
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
