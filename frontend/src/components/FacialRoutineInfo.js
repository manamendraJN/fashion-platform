// FacialRoutineInfo.js
export const FACIAL_ROUTINE_INFO = {
  Tone: {
    dry: {
      morning: ['Use hydrating cleanser', 'Apply moisturizing serum', 'Sunscreen SPF 30+'],
      afternoon: ['Hydrating mist if skin feels dry'],
      night: ['Cleanse gently', 'Apply rich moisturizer', 'Repair serum'],
    },
    normal: {
      morning: ['Use gentle cleanser', 'Vitamin C serum', 'Sunscreen SPF 30+'],
      afternoon: ['Spray water-based mist'],
      night: ['Cleanse', 'Light moisturizer', 'Night serum'],
    },
    oily: {
      morning: ['Use foaming cleanser', 'Oil-free serum', 'Sunscreen SPF 30+'],
      afternoon: ['Blot excess oil with tissue'],
      night: ['Cleanse with mild exfoliating cleanser', 'Light oil-free moisturizer'],
    },
    combination: {
      morning: ['Use balanced cleanser', 'Moisturizing serum on dry areas', 'Sunscreen'],
      afternoon: ['Hydrate dry areas', 'Blot oily zones'],
      night: ['Cleanse', 'Targeted moisturizer for dry zones'],
    },
  },
  Blackhead: {
    dry: {
      morning: ['Gentle cleanser', 'Hydrating moisturizer'],
      afternoon: ['Hydrating mist'],
      night: ['Cleanse with soft exfoliant', 'Moisturize lightly', 'Clay mask once a week'],
    },
    oily: {
      morning: ['Salicylic acid cleanser', 'Oil-free moisturizer'],
      afternoon: ['Blot excess oil'],
      night: ['Exfoliating cleanser', 'Clay mask 1–2x week', 'Oil-free moisturizer'],
    },
    normal: {
      morning: ['Gentle cleanser', 'Light moisturizer'],
      afternoon: ['Hydrate skin if needed'],
      night: ['Cleanse', 'Optional mask once a week', 'Moisturize'],
    },
    combination: {
      morning: ['Balanced cleanser', 'Moisturize dry zones'],
      afternoon: ['Hydrate dry areas, blot oily zones'],
      night: ['Cleanse', 'Targeted mask on oily zones', 'Moisturize dry zones'],
    },
  },
  Color: {
    dry: {
      morning: ['Brightening cleanser', 'Hydrating antioxidant serum', 'Sunscreen'],
      afternoon: ['Hydrate skin'],
      night: ['Cleanse', 'Moisturize', 'Repair serum'],
    },
    normal: {
      morning: ['Brightening cleanser', 'Vitamin C serum', 'Sunscreen'],
      afternoon: ['Hydrate skin'],
      night: ['Cleanse', 'Light moisturizer', 'Repair serum'],
    },
    oily: {
      morning: ['Brightening foaming cleanser', 'Oil-control serum', 'Sunscreen'],
      afternoon: ['Blot excess oil'],
      night: ['Cleanse', 'Oil-free moisturizer', 'Repair serum'],
    },
    combination: {
      morning: ['Balanced cleanser', 'Brightening serum', 'Sunscreen'],
      afternoon: ['Hydrate dry areas', 'Blot oily zones'],
      night: ['Cleanse', 'Targeted moisturizer', 'Repair serum'],
    },
  },
};
