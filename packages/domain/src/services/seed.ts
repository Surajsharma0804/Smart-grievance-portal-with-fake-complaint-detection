import mongoose from 'mongoose';
import { Department } from '../models/department.js';
import { Category } from '../models/category.js';
import { Ward } from '../models/ward.js';

interface DeptSeed {
  code: string;
  name: string;
  categories: string[];
  defaultSlaHours: number;
}

const DEPARTMENTS: DeptSeed[] = [
  { code: 'SANITATION', name: 'Sanitation Department', categories: ['SANITATION'], defaultSlaHours: 48 },
  { code: 'ROADS', name: 'Roads and Infrastructure', categories: ['ROADS'], defaultSlaHours: 72 },
  { code: 'WATER', name: 'Water Supply Department', categories: ['WATER'], defaultSlaHours: 24 },
  { code: 'ELECTRICITY', name: 'Electricity Department', categories: ['ELECTRICITY', 'STREET_LIGHTING'], defaultSlaHours: 24 },
  { code: 'TRAFFIC', name: 'Traffic and Transport', categories: ['TRAFFIC'], defaultSlaHours: 48 },
  { code: 'PARKS', name: 'Parks and Gardens', categories: ['PARKS'], defaultSlaHours: 72 },
  { code: 'HEALTH', name: 'Public Health', categories: ['PUBLIC_HEALTH', 'STRAY_ANIMALS'], defaultSlaHours: 24 },
  { code: 'REVENUE', name: 'Revenue and Land', categories: ['ENCROACHMENT', 'OTHER'], defaultSlaHours: 72 },
];

interface CatSeed {
  code: string;
  label: { en: string; hi: string };
  deptCode: string;
  slaHours: number;
  keywords: string[];
}

const CATEGORIES: CatSeed[] = [
  { code: 'SANITATION', label: { en: 'Sanitation', hi: 'स्वच्छता' }, deptCode: 'SANITATION', slaHours: 48, keywords: ['garbage', 'waste', 'dump', 'trash', 'sewage', 'drain', 'कचरा', 'गंदगी'] },
  { code: 'ROADS', label: { en: 'Roads', hi: 'सड़कें' }, deptCode: 'ROADS', slaHours: 72, keywords: ['pothole', 'road', 'asphalt', 'crack', 'broken', 'गड्ढा', 'सड़क'] },
  { code: 'WATER', label: { en: 'Water Supply', hi: 'जल आपूर्ति' }, deptCode: 'WATER', slaHours: 24, keywords: ['water', 'pipe', 'leak', 'supply', 'contaminated', 'पानी', 'नल'] },
  { code: 'ELECTRICITY', label: { en: 'Electricity', hi: 'बिजली' }, deptCode: 'ELECTRICITY', slaHours: 24, keywords: ['power', 'outage', 'wire', 'transformer', 'electric', 'बिजली', 'तार'] },
  { code: 'STREET_LIGHTING', label: { en: 'Street Lighting', hi: 'स्ट्रीट लाइटिंग' }, deptCode: 'ELECTRICITY', slaHours: 48, keywords: ['streetlight', 'lamp', 'dark', 'bulb', 'लाइट', 'बत्ती'] },
  { code: 'TRAFFIC', label: { en: 'Traffic', hi: 'यातायात' }, deptCode: 'TRAFFIC', slaHours: 48, keywords: ['traffic', 'signal', 'parking', 'congestion', 'ट्रैफिक', 'सिग्नल'] },
  { code: 'PARKS', label: { en: 'Parks and Gardens', hi: 'पार्क और उद्यान' }, deptCode: 'PARKS', slaHours: 72, keywords: ['park', 'garden', 'tree', 'bench', 'playground', 'पार्क', 'बगीचा'] },
  { code: 'PUBLIC_HEALTH', label: { en: 'Public Health', hi: 'सार्वजनिक स्वास्थ्य' }, deptCode: 'HEALTH', slaHours: 24, keywords: ['health', 'mosquito', 'disease', 'hygiene', 'स्वास्थ्य', 'मच्छर'] },
  { code: 'STRAY_ANIMALS', label: { en: 'Stray Animals', hi: 'आवारा पशु' }, deptCode: 'HEALTH', slaHours: 48, keywords: ['stray', 'dog', 'cow', 'animal', 'आवारा', 'कुत्ता', 'गाय'] },
  { code: 'ENCROACHMENT', label: { en: 'Encroachment', hi: 'अतिक्रमण' }, deptCode: 'REVENUE', slaHours: 72, keywords: ['encroachment', 'illegal', 'construction', 'अतिक्रमण', 'अवैध'] },
  { code: 'OTHER', label: { en: 'Other', hi: 'अन्य' }, deptCode: 'REVENUE', slaHours: 72, keywords: [] },
];

const WARDS = [
  {
    code: 'CHD-01',
    name: 'Sector 17-22 (Central)',
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [76.775, 30.740],
        [76.795, 30.740],
        [76.795, 30.755],
        [76.775, 30.755],
        [76.775, 30.740],
      ]],
    },
  },
  {
    code: 'CHD-02',
    name: 'Sector 34-43 (South)',
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [76.755, 30.715],
        [76.785, 30.715],
        [76.785, 30.740],
        [76.755, 30.740],
        [76.755, 30.715],
      ]],
    },
  },
  {
    code: 'CHD-03',
    name: 'Industrial Area (East)',
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[
        [76.795, 30.690],
        [76.835, 30.690],
        [76.835, 30.720],
        [76.795, 30.720],
        [76.795, 30.690],
      ]],
    },
  },
];

export async function seed() {
  const deptMap = new Map<string, mongoose.Types.ObjectId>();
  for (const dept of DEPARTMENTS) {
    await Department.updateOne(
      { code: dept.code },
      { $set: dept },
      { upsert: true },
    );
    const doc = await Department.findOne({ code: dept.code });
    if (doc) deptMap.set(dept.code, doc._id);
  }

  for (const cat of CATEGORIES) {
    const deptId = deptMap.get(cat.deptCode);
    if (!deptId) throw new Error(`Department ${cat.deptCode} not found for category ${cat.code}`);
    await Category.updateOne(
      { code: cat.code },
      { $set: { code: cat.code, label: cat.label, departmentId: deptId, slaHours: cat.slaHours, keywords: cat.keywords } },
      { upsert: true },
    );
  }

  for (const ward of WARDS) {
    await Ward.updateOne(
      { code: ward.code },
      { $set: ward },
      { upsert: true },
    );
  }

  await Ward.ensureIndexes();

  return {
    departments: DEPARTMENTS.length,
    categories: CATEGORIES.length,
    wards: WARDS.length,
  };
}
