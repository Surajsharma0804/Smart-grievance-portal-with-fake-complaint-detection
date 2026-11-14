/**
 * Text-only fallback classifier using keywords.
 * Used when VLM is unavailable.
 */
import { CategoryCode } from '@nagrik-setu/shared';

interface KeywordRule {
  category: CategoryCode;
  keywords: string[]; // English and Hindi
}

const KEYWORD_RULES: KeywordRule[] = [
  {
    category: CategoryCode.SANITATION,
    keywords: [
      'garbage', 'trash', 'waste', 'dump', 'litter', 'dirty', 'filth', 'sewage', 'drain', 'gutter',
      'कचरा', 'गंदगी', 'कूड़ा', 'नाली', 'सीवर', 'सफाई',
    ],
  },
  {
    category: CategoryCode.ROADS,
    keywords: [
      'pothole', 'road', 'crack', 'pavement', 'asphalt', 'broken road', 'damaged road', 'surface',
      'गड्ढा', 'सड़क', 'रोड', 'टूटी सड़क', 'दरार',
    ],
  },
  {
    category: CategoryCode.WATER,
    keywords: [
      'water', 'pipe', 'leak', 'supply', 'tap', 'burst', 'flood', 'waterlogging', 'drinking',
      'पानी', 'नल', 'पाइप', 'जलापूर्ति', 'लीक', 'बाढ़', 'जलभराव',
    ],
  },
  {
    category: CategoryCode.ELECTRICITY,
    keywords: [
      'electricity', 'power', 'wire', 'transformer', 'outage', 'blackout', 'electric', 'voltage',
      'बिजली', 'ट्रांसफार्मर', 'तार', 'विद्युत', 'बिजली कटौती',
    ],
  },
  {
    category: CategoryCode.STREET_LIGHTING,
    keywords: [
      'street light', 'lamp', 'streetlight', 'light pole', 'dark street', 'broken light', 'bulb',
      'स्ट्रीट लाइट', 'बत्ती', 'लैंप', 'खंभा', 'अंधेरा',
    ],
  },
  {
    category: CategoryCode.TRAFFIC,
    keywords: [
      'traffic', 'signal', 'parking', 'congestion', 'speed', 'accident', 'crosswalk', 'zebra',
      'ट्रैफिक', 'सिग्नल', 'पार्किंग', 'जाम', 'दुर्घटना',
    ],
  },
  {
    category: CategoryCode.PARKS,
    keywords: [
      'park', 'garden', 'playground', 'bench', 'tree', 'green', 'lawn', 'maintenance',
      'पार्क', 'बगीचा', 'खेल का मैदान', 'पेड़', 'हरियाली',
    ],
  },
  {
    category: CategoryCode.PUBLIC_HEALTH,
    keywords: [
      'health', 'mosquito', 'dengue', 'hospital', 'clinic', 'disease', 'pest', 'hygiene',
      'स्वास्थ्य', 'मच्छर', 'डेंगू', 'अस्पताल', 'बीमारी', 'कीट',
    ],
  },
  {
    category: CategoryCode.STRAY_ANIMALS,
    keywords: [
      'stray', 'dog', 'cow', 'animal', 'cattle', 'monkey', 'pig', 'roaming',
      'आवारा', 'कुत्ता', 'गाय', 'जानवर', 'पशु', 'बंदर', 'सुअर',
    ],
  },
  {
    category: CategoryCode.ENCROACHMENT,
    keywords: [
      'encroachment', 'illegal', 'construction', 'hawker', 'vendor', 'occupy', 'footpath', 'sidewalk',
      'अतिक्रमण', 'अवैध', 'निर्माण', 'फेरीवाला', 'फुटपाथ',
    ],
  },
];

/**
 * Classify complaint text using keyword matching.
 * Returns the best matching category with confidence,
 * or OTHER if no strong match is found.
 */
export function classifyByKeywords(
  text: string,
): { category: CategoryCode; confidence: number; matchedKeywords: string[] } {
  const lower = text.toLowerCase();
  let bestCategory: CategoryCode = CategoryCode.OTHER;
  let bestScore = 0;
  let bestKeywords: string[] = [];

  for (const rule of KEYWORD_RULES) {
    const matched = rule.keywords.filter((kw) => lower.includes(kw.toLowerCase()));
    const score = matched.length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = rule.category;
      bestKeywords = matched;
    }
  }

  // Confidence based on number of matches
  const confidence = bestScore === 0 ? 0 : Math.min(0.9, 0.3 + bestScore * 0.15);

  return { category: bestCategory, confidence, matchedKeywords: bestKeywords };
}
