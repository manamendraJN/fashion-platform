export const INITIAL_WARDROBE = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1583391733958-e02376e9ced3?auto=format&fit=crop&q=80&w=800',
    articleType: 'Kurta',
    color: 'Red',
    usage: 'Ethnic',
    eventScores: {
      'Tamil Wedding': 0.95,
      'Office Meeting': 0.1,
      Party: 0.85,
      'Casual Outing': 0.4,
    },
    wearCount: 3,
    lastWorn: '2023-11-15',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=800',
    articleType: 'Shirt',
    color: 'Navy',
    usage: 'Formal',
    eventScores: {
      'Tamil Wedding': 0.2,
      'Office Meeting': 0.92,
      Party: 0.6,
      'Casual Outing': 0.7,
    },
    wearCount: 12,
    lastWorn: '2023-12-05',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=800',
    articleType: 'Saree',
    color: 'Pink',
    usage: 'Ethnic',
    eventScores: {
      'Tamil Wedding': 0.88,
      'Office Meeting': 0.05,
      Party: 0.9,
      'Casual Outing': 0.1,
    },
    wearCount: 1,
    lastWorn: '2023-10-20',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=800',
    articleType: 'Pants',
    color: 'Black',
    usage: 'Formal',
    eventScores: {
      'Tamil Wedding': 0.15,
      'Office Meeting': 0.95,
      Party: 0.75,
      'Casual Outing': 0.8,
    },
    wearCount: 15,
    lastWorn: '2023-12-06',
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800',
    articleType: 'Dress',
    color: 'Emerald',
    usage: 'Party',
    eventScores: {
      'Tamil Wedding': 0.3,
      'Office Meeting': 0.4,
      Party: 0.95,
      'Casual Outing': 0.6,
    },
    wearCount: 4,
    lastWorn: '2023-11-30',
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=800',
    articleType: 'Blazer',
    color: 'Beige',
    usage: 'Formal',
    eventScores: {
      'Tamil Wedding': 0.1,
      'Office Meeting': 0.9,
      Party: 0.5,
      'Casual Outing': 0.7,
    },
    wearCount: 8,
    lastWorn: '2023-12-01',
  },
];

export const SAMPLE_QUERIES = [
  'Tamil wedding outfit?',
  'Office meeting tomorrow',
  'Casual weekend look',
  'Dinner party tonight',
];

// Real accessory categories from Model 1 training
export const ACC_CATEGORIES = [
  'Belts','Bracelets & Bangles','Cufflinks','Earrings',
  'Handbags & Clutches','Hats & Headwear','Necklaces & Chains',
  'Rings',,'Sunglasses & Eyewear','Ties','Watches'
];

export const ACC_COLORS = [
  'Beige','Black','Blue','Brown','Burgundy','Coffee','Copper','Gold',
  'Green','Grey','Maroon','Metallic','Multi-color','Navy Blue','Nude',
  'Off White','Orange','Pink','Purple','Red','Silver','Tan','Teal','White','Yellow'
];

export const ACC_SIZES = [
  'Small','Medium','Large','Extra Large',
];
export const ACC_GENDERS = ['Men','Unisex','Women'];
export const ACC_SEASONS = ['All Seasons', 'Fall', 'Spring', 'Summer', 'Winter'];
export const ACC_USAGES  = ['Casual','Festive/Religious','Formal','Party','Sports'];

export const OCCASIONS = [
  'Casual','Formal','Party','Wedding','Festive/Religious',
  'Sports','Beach','Date Night','Office','Interview'
];

export const RELIGIONS = ['Any','Buddhist','Catholic','Hindu','Islam','Other'];

// Occasion → excluded categories (from training notebook)
export const OCCASION_EXCLUDED = {
  Casual:    ['Cufflinks','Belts','Ties'],
  Formal:    ['Sunglasses & Eyewear','Hats & Headwear'],
  Office:    ['Sunglasses & Eyewear','Hats & Headwear'],
  Interview: ['Sunglasses & Eyewear','Hats & Headwear','Handbags & Clutches', 'Necklaces & Chains'],
  Wedding:   ['Sunglasses & Eyewear','Hats & Headwear'],
  Sports:    ['Belts','Bracelets & Bangles','Cufflinks','Earrings',
              'Handbags & Clutches','Necklaces & Chains','Rings','Ties','Watches'],
  Beach:     ['Cufflinks','Ties'],
  Party:     ['Sunglasses & Eyewear','Hats & Headwear']
};

// Gender → excluded categories
// For Casual occasion: Men can wear Hats & Headwear, Women cannot
// (handled in generateRecs via CASUAL_GENDER_EXCLUDED)
export const GENDER_EXCLUDED = {
  Men:    ['Earrings','Necklaces & Chains','Handbags & Clutches'],
  Women:  ['Cufflinks','Ties','Belts'],
  Unisex: [],
};

// Extra gender exclusions applied ONLY for Casual occasion
export const CASUAL_GENDER_EXCLUDED = {
  Men:    [],                    // Men CAN wear Hats & Headwear casually
  Women:  ['Hats & Headwear'],   // Women CANNOT wear Hats & Headwear casually
  Unisex: [],
};


// Sample wardrobe items (accessories)
export const SAMPLE_WARDROBE = [
  {
    id: 'w1', name: 'Classic Gold Watch', category: 'Watches',
    color: 'Gold', gender: 'Women', usage: 'Formal', season: 'Fall',
    brand: 'Fossil', size: 'One Size', price: 8500, isFavourite: false,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-01-10',
  },
  {
    id: 'w2', name: 'Pearl Necklace', category: 'Necklaces & Chains',
    color: 'White', gender: 'Women', usage: 'Formal', season: 'Spring',
    brand: 'Local', size: '18 inch', price: 4500, isFavourite: true,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-02-05',
  },
  {
    id: 'w3', name: 'Leather Belt', category: 'Belts',
    color: 'Brown', gender: 'Men', usage: 'Formal', season: 'Fall',
    brand: 'Allen Cooper', size: '32', price: 2200, isFavourite: false,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-01-20',
  },
  {
    id: 'w4', name: 'Diamond Earrings', category: 'Earrings',
    color: 'Silver', gender: 'Women', usage: 'Party', season: 'Winter',
    brand: 'Tanishq', size: 'One Size', price: 15000, isFavourite: true,
    image: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-03-01',
  },
  {
    id: 'w5', name: 'Silk Scarf', category: 'Scarves & Shawls',
    color: 'Multi-color', gender: 'Women', usage: 'Casual', season: 'Spring',
    brand: 'Hermes', size: 'One Size', price: 12000, isFavourite: false,
    image: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-02-18',
  },
  {
    id: 'w6', name: 'Silver Cufflinks', category: 'Cufflinks',
    color: 'Silver', gender: 'Men', usage: 'Formal', season: 'Fall',
    brand: 'Cufflinks Inc', size: 'One Size', price: 3500, isFavourite: false,
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-01-15',
  },
  {
    id: 'w7', name: 'Tote Handbag', category: 'Handbags & Clutches',
    color: 'Black', gender: 'Women', usage: 'Casual', season: 'Summer',
    brand: 'Coach', size: 'Large', price: 18000, isFavourite: true,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-03-10',
  },
  {
    id: 'w8', name: 'Gold Bangles Set', category: 'Bracelets & Bangles',
    color: 'Gold', gender: 'Women', usage: 'Festive/Religious', season: 'Fall',
    brand: 'Malabar', size: '2.4', price: 9500, isFavourite: false,
    image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&q=80&w=800',
    addedDate: '2024-02-25',
  },
];

// export const ANALYTICS_DATA = {
//   composition: [
//     { name: 'Formal',   value: 35, fill: '#8B5A5A' },
//     { name: 'Casual',   value: 25, fill: '#2C2C2C' },
//     { name: 'Party',    value: 20, fill: '#A8A8A8' },
//     { name: 'Festive',  value: 20, fill: '#7A9B8E' },
//   ],
//   categoryBreakdown: [
//     { name: 'Watches',            count: 3 },
//     { name: 'Earrings',           count: 5 },
//     { name: 'Necklaces & Chains', count: 4 },
//     { name: 'Belts',              count: 2 },
//     { name: 'Handbags & Clutches',count: 3 },
//     { name: 'Bracelets & Bangles',count: 4 },
//   ],
//   eventCoverage: [
//     { subject: 'Wedding',  A: 85, fullMark: 100 },
//     { subject: 'Office',   A: 70, fullMark: 100 },
//     { subject: 'Party',    A: 90, fullMark: 100 },
//     { subject: 'Casual',   A: 60, fullMark: 100 },
//     { subject: 'Festive',  A: 80, fullMark: 100 },
//   ],
//   learningProgress: [
//     { month: 'Week 1', accuracy: 45 },
//     { month: 'Week 2', accuracy: 62 },
//     { month: 'Week 3', accuracy: 76 },
//     { month: 'Week 4', accuracy: 88 },
//   ],
// };

export const ANALYTICS_DATA = {
  composition: [
    { name: 'Ethnic', value: 30, fill: '#8B5A5A' },
    { name: 'Formal', value: 40, fill: '#2C2C2C' },
    { name: 'Casual', value: 20, fill: '#A8A8A8' },
    { name: 'Party', value: 10, fill: '#7A9B8E' },
  ],
  wearFrequency: [
    { name: 'Black Pants', count: 15 },
    { name: 'Navy Shirt', count: 12 },
    { name: 'Beige Blazer', count: 8 },
    { name: 'Red Kurta', count: 3 },
    { name: 'Pink Saree', count: 1 },
  ],
  eventCoverage: [
    { subject: 'Wedding', A: 85, fullMark: 100 },
    { subject: 'Office', A: 95, fullMark: 100 },
    { subject: 'Party', A: 70, fullMark: 100 },
    { subject: 'Casual', A: 60, fullMark: 100 },
    { subject: 'Sports', A: 20, fullMark: 100 },
  ],
  learningProgress: [
    { month: 'Week 1', accuracy: 45 },
    { month: 'Week 2', accuracy: 60 },
    { month: 'Week 3', accuracy: 75 },
    { month: 'Week 4', accuracy: 88 },
  ],
};
