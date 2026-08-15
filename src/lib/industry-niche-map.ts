/**
 * Maps business industry types to relevant creator niches.
 * Used to power "Recommended for your brand" creator suggestions on the Business Profile page.
 *
 * The keys should match common values entered in the `industryType` field of BusinessProfile.
 * The values are a subset of NICHES from `creator-niches.ts`.
 */
export const INDUSTRY_NICHE_MAP: Record<string, string[]> = {
  // Apparel & Fashion
  Fashion: [
    "Fashion",
    "Men's Fashion",
    "Women's Fashion",
    "Streetwear",
    "Luxury Fashion",
    "Sustainable Fashion",
    "Thrift Fashion",
    "Personal Styling",
    "Fashion Reviews",
    "Makeup",
    "Skincare",
    "Grooming",
    "Hair Care",
    "Nail Art",
    "Fragrance",
    "Lifestyle",
  ],
  Beauty: [
    "Makeup",
    "Skincare",
    "Hair Care",
    "Nail Art",
    "Fragrance",
    "Grooming",
    "Personal Styling",
    "Fashion",
    "Lifestyle",
  ],
  Skincare: [
    "Skincare",
    "Makeup",
    "Wellness",
    "Self Improvement",
    "Grooming",
    "Lifestyle",
    "Hair Care",
  ],

  // Food & Beverage
  Food: [
    "Cooking",
    "Baking",
    "Street Food",
    "Food Reviews",
    "Restaurant Reviews",
    "Healthy Recipes",
    "Vegan",
    "Vegetarian",
    "Coffee",
    "Tea",
    "Mukbang",
    "Food Challenges",
    "BBQ & Grilling",
    "Fine Dining",
  ],
  "Food & Beverage": [
    "Cooking",
    "Baking",
    "Street Food",
    "Food Reviews",
    "Restaurant Reviews",
    "Coffee",
    "Tea",
    "Cocktails & Mocktails",
    "Healthy Recipes",
    "Vegan",
    "Mukbang",
  ],
  Restaurant: [
    "Food Reviews",
    "Restaurant Reviews",
    "Street Food",
    "Fine Dining",
    "Local Food",
    "City Guides",
  ],
  Coffee: [
    "Coffee",
    "Lifestyle",
    "Food Reviews",
    "Tea",
    "Morning Routines",
    "Productivity",
  ],

  // Health & Wellness
  Fitness: [
    "Fitness",
    "Bodybuilding",
    "Weight Loss",
    "Yoga",
    "Pilates",
    "CrossFit",
    "Calisthenics",
    "Running",
    "Cycling",
    "Nutrition",
    "Mental Health",
    "Meditation",
    "Wellness",
    "Biohacking",
  ],
  Health: [
    "Wellness",
    "Nutrition",
    "Mental Health",
    "Meditation",
    "Fitness",
    "Yoga",
    "Weight Loss",
    "Biohacking",
  ],
  Wellness: [
    "Wellness",
    "Meditation",
    "Mental Health",
    "Yoga",
    "Nutrition",
    "Self Improvement",
    "Spiritual Growth",
    "Lifestyle",
  ],
  Healthcare: [
    "Wellness",
    "Nutrition",
    "Mental Health",
    "Fitness",
    "Doctors",
    "Meditation",
  ],
  Pharma: ["Wellness", "Nutrition", "Doctors", "Health Awareness", "Fitness"],

  // Technology
  Technology: [
    "Tech Reviews",
    "Smartphones",
    "Laptops",
    "AI",
    "Programming",
    "Gadgets",
    "Smart Home",
    "Startups",
    "SaaS",
    "Cybersecurity",
    "AI Tools",
    "Consumer Electronics",
    "Web Development",
  ],
  SaaS: [
    "SaaS",
    "AI",
    "Programming",
    "Startups",
    "Entrepreneurship",
    "Productivity",
    "Web Development",
    "AI Tools",
    "No-Code",
  ],
  AI: [
    "AI",
    "AI Tools",
    "Prompt Engineering",
    "Programming",
    "Tech Reviews",
    "Startups",
    "No-Code",
    "Web Development",
  ],
  Gadgets: [
    "Gadgets",
    "Tech Reviews",
    "Smartphones",
    "Laptops",
    "Consumer Electronics",
    "Smart Home",
    "Robotics",
    "IoT",
  ],
  Software: [
    "Programming",
    "Web Development",
    "SaaS",
    "AI",
    "AI Tools",
    "Cybersecurity",
    "No-Code",
    "Startups",
  ],

  // Travel & Hospitality
  Travel: [
    "Travel Vlogs",
    "Luxury Travel",
    "Budget Travel",
    "Adventure Travel",
    "Solo Travel",
    "Backpacking",
    "Road Trips",
    "Camping",
    "Hiking",
    "Hotel Reviews",
    "Airline Reviews",
    "Destination Guides",
    "City Guides",
    "Photography",
    "Lifestyle",
  ],
  Hospitality: [
    "Hotel Reviews",
    "Travel Vlogs",
    "Luxury Travel",
    "Destination Guides",
    "Food Reviews",
    "Restaurant Reviews",
    "City Guides",
  ],
  Tourism: [
    "Travel Vlogs",
    "Destination Guides",
    "City Guides",
    "Adventure Travel",
    "Luxury Travel",
    "Photography",
    "Cultural Content",
  ],

  // Finance
  Finance: [
    "Personal Finance",
    "Investing",
    "Stock Market",
    "Mutual Funds",
    "Cryptocurrency",
    "Real Estate",
    "Business",
    "Entrepreneurship",
    "Side Hustles",
    "Career Advice",
  ],
  FinTech: [
    "Personal Finance",
    "Cryptocurrency",
    "Investing",
    "SaaS",
    "AI",
    "Startups",
    "Entrepreneurship",
  ],
  Insurance: [
    "Personal Finance",
    "Investing",
    "Career Advice",
    "Entrepreneurship",
    "Wellness",
  ],
  Banking: [
    "Personal Finance",
    "Investing",
    "Mutual Funds",
    "Career Advice",
    "Business",
  ],

  // Education
  Education: [
    "Mathematics",
    "Science",
    "Engineering",
    "UPSC",
    "JEE",
    "NEET",
    "Study Tips",
    "Language Learning",
    "English Speaking",
    "Coding",
    "Productivity",
    "Self Improvement",
    "Course Creator",
  ],
  EdTech: [
    "Coding",
    "Study Tips",
    "Programming",
    "AI",
    "Web Development",
    "Language Learning",
    "Course Creator",
    "Productivity",
    "AI Tools",
  ],

  // Gaming
  Gaming: [
    "PC Gaming",
    "Mobile Gaming",
    "Console Gaming",
    "Esports",
    "Game Streaming",
    "Game Reviews",
    "Walkthroughs",
    "Speedruns",
    "BGMI/PUBG",
    "Free Fire",
    "Valorant",
    "Minecraft",
  ],

  // E-commerce & Retail
  Ecommerce: [
    "Product Reviewer",
    "Lifestyle",
    "Fashion",
    "Gadgets",
    "Tech Reviews",
    "Affiliate Marketer",
    "UGC Creator",
    "Home Decor",
    "Cooking",
  ],
  Retail: [
    "Product Reviewer",
    "Lifestyle",
    "Fashion",
    "UGC Creator",
    "Affiliate Marketer",
    "Home Decor",
  ],
  "D2C": [
    "UGC Creator",
    "Product Reviewer",
    "Lifestyle",
    "Fashion",
    "Skincare",
    "Fitness",
    "Affiliate Marketer",
  ],

  // Automobile
  Automobile: [
    "Car Reviews",
    "Bike Reviews",
    "EVs",
    "Supercars",
    "Motorsports",
    "Car Modifications",
    "Road Tests",
    "Auto News",
    "Tech Reviews",
    "Gadgets",
  ],
  "Electric Vehicles": [
    "EVs",
    "Car Reviews",
    "Tech Reviews",
    "Sustainability",
    "Climate Tech",
    "Gadgets",
  ],

  // Real Estate
  "Real Estate": [
    "Real Estate",
    "Interior Design",
    "Home Decor",
    "Apartment Living",
    "DIY Home",
    "Luxury Lifestyle",
    "Investing",
    "Personal Finance",
  ],
  Interior: [
    "Interior Design",
    "Home Decor",
    "DIY Home",
    "Apartment Living",
    "Smart Homes",
    "Gardening",
    "Lifestyle",
  ],

  // Media & Entertainment
  Entertainment: [
    "Comedy",
    "Memes",
    "Stand-up Comedy",
    "Short Films",
    "Podcasts",
    "Interviews",
    "Reactions",
    "Storytelling",
    "Skits",
    "Music",
    "Dance",
  ],
  Music: [
    "Singing",
    "Music Production",
    "Rap",
    "Guitar",
    "Piano",
    "DJ",
    "Covers",
    "Original Music",
    "Bollywood Dance",
  ],
  Media: [
    "Podcasts",
    "News",
    "Interviews",
    "Storytelling",
    "Short Films",
    "Comedy",
    "Entertainment",
  ],

  // Sports
  Sports: [
    "Cricket",
    "Football",
    "Basketball",
    "Tennis",
    "Badminton",
    "Fitness",
    "Martial Arts",
    "Running",
    "Cycling",
    "Sports News",
    "Athletics",
  ],

  // NGO / Social Impact
  NGO: [
    "Sustainability",
    "Climate Tech",
    "Mental Health",
    "Wellness",
    "Spiritual Growth",
    "NGO / Social Impact Creator",
    "Community Builder",
  ],
  Sustainability: [
    "Sustainability",
    "Climate Tech",
    "Vegan",
    "Sustainable Fashion",
    "EVs",
    "Gardening",
    "Wellness",
  ],

  // Default fallback — generic niches for unknown industries
  default: [
    "Lifestyle",
    "UGC Creator",
    "Product Reviewer",
    "Affiliate Marketer",
    "Content Creator",
    "Brand Ambassador",
  ],
};

/**
 * Given a business industry string, returns the list of relevant creator niches.
 * Falls back to default niches if no exact match is found.
 * Case-insensitive matching with partial match support.
 */
export function getNichesForIndustry(industry?: string | null): string[] {
  if (!industry) return INDUSTRY_NICHE_MAP.default;

  // Try exact match first
  if (INDUSTRY_NICHE_MAP[industry]) return INDUSTRY_NICHE_MAP[industry];

  // Try case-insensitive match
  const lower = industry.toLowerCase();
  const exactCaseKey = Object.keys(INDUSTRY_NICHE_MAP).find(
    (k) => k.toLowerCase() === lower
  );
  if (exactCaseKey) return INDUSTRY_NICHE_MAP[exactCaseKey];

  // Try partial match (e.g., "Fashion & Lifestyle" → "Fashion")
  const partialKey = Object.keys(INDUSTRY_NICHE_MAP).find(
    (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
  );
  if (partialKey) return INDUSTRY_NICHE_MAP[partialKey];

  return INDUSTRY_NICHE_MAP.default;
}
