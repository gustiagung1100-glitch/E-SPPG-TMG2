import {
  RecipeIngredient,
  FoodCompositionItem,
  NutritionTargetConfig,
  DivisionJobdesk,
  MenuItem,
  MenuItemGrammage,
} from '../types';

/**
 * DATABASE KOMPOSISI PANGAN INDONESIA (TKPI) KEMENKES RI 2020 & USDA
 * Standar Acuan Gizi Resmi Program Makan Bergizi Gratis (MBG)
 */
export const defaultFoodCompositions: FoodCompositionItem[] = [
  {
    id: 'fc-1',
    code: 'TKPI-BE001',
    name: 'Beras Giling Pulen (Nasi)',
    category: 'Makanan Pokok',
    ediblePortion: 100, // 100% BDD
    calories: 360,     // per 100g beras mentah
    protein: 6.8,
    fat: 0.7,
    carbs: 78.9,
    fiber: 0.8,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: A01)',
    defaultUnitPrice: 14500,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-2',
    code: 'TKPI-AY002',
    name: 'Daging Ayam Fillet Dada/Paha',
    category: 'Lauk Hewani',
    ediblePortion: 100, // Fillet tanpa tulang
    calories: 165,
    protein: 31.0,
    fat: 3.6,
    carbs: 0.0,
    fiber: 0.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: B05) & USDA FDC 171077',
    defaultUnitPrice: 38000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-3',
    code: 'TKPI-AY003',
    name: 'Daging Ayam Karkas Utuh (Bertulang)',
    category: 'Lauk Hewani',
    ediblePortion: 65,  // 65% BDD (35% tulang dan lemak buang)
    calories: 180,
    protein: 18.2,
    fat: 11.5,
    carbs: 0.0,
    fiber: 0.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: B06)',
    defaultUnitPrice: 34000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-4',
    code: 'TKPI-IK004',
    name: 'Ikan Tongkol Segar',
    category: 'Lauk Hewani',
    ediblePortion: 68,  // 68% BDD
    calories: 111,
    protein: 24.0,
    fat: 1.0,
    carbs: 0.0,
    fiber: 0.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: B12)',
    defaultUnitPrice: 32000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-5',
    code: 'TKPI-TL005',
    name: 'Telur Ayam Ras Segar',
    category: 'Lauk Hewani',
    ediblePortion: 90,  // 90% BDD (10% kulit)
    calories: 154,
    protein: 12.4,
    fat: 10.8,
    carbs: 0.7,
    fiber: 0.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: B20)',
    defaultUnitPrice: 27500,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-6',
    code: 'TKPI-DS006',
    name: 'Daging Sapi Murni Rendah Lemak',
    category: 'Lauk Hewani',
    ediblePortion: 100,
    calories: 201,
    protein: 20.0,
    fat: 13.0,
    carbs: 0.0,
    fiber: 0.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: B01)',
    defaultUnitPrice: 125000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-7',
    code: 'TKPI-TP007',
    name: 'Tempe Kedelai Murni',
    category: 'Lauk Nabati',
    ediblePortion: 100,
    calories: 201,
    protein: 20.8,
    fat: 8.8,
    carbs: 13.5,
    fiber: 1.4,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: C02)',
    defaultUnitPrice: 12000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-8',
    code: 'TKPI-TH008',
    name: 'Tahu Putih Kedelai',
    category: 'Lauk Nabati',
    ediblePortion: 100,
    calories: 80,
    protein: 10.9,
    fat: 4.7,
    carbs: 0.8,
    fiber: 0.1,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: C01)',
    defaultUnitPrice: 10000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-9',
    code: 'TKPI-LS009',
    name: 'Labu Siam Segar',
    category: 'Sayuran',
    ediblePortion: 83,  // 83% BDD (17% kulit & biji)
    calories: 26,
    protein: 0.9,
    fat: 0.1,
    carbs: 6.7,
    fiber: 1.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: D15)',
    defaultUnitPrice: 8500,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-10',
    code: 'TKPI-WR010',
    name: 'Wortel Segar',
    category: 'Sayuran',
    ediblePortion: 88,  // 88% BDD (12% kupasan)
    calories: 36,
    protein: 1.0,
    fat: 0.6,
    carbs: 7.9,
    fiber: 1.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: D24)',
    defaultUnitPrice: 13000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-11',
    code: 'TKPI-JG011',
    name: 'Jagung Manis Pipil',
    category: 'Sayuran',
    ediblePortion: 90,  // 90% BDD jagung pipil segar
    calories: 147,
    protein: 5.1,
    fat: 0.7,
    carbs: 31.5,
    fiber: 1.3,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: D09)',
    defaultUnitPrice: 14000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-12',
    code: 'TKPI-BY012',
    name: 'Bayam Hijau Cabut Segar',
    category: 'Sayuran',
    ediblePortion: 71,  // 71% BDD (akar & batang tua dibuang)
    calories: 16,
    protein: 0.9,
    fat: 0.4,
    carbs: 2.9,
    fiber: 0.7,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: D04)',
    defaultUnitPrice: 4000,
    purchaseUnit: 'ikat',
  },
  {
    id: 'fc-13',
    code: 'TKPI-BC013',
    name: 'Buncis Segar',
    category: 'Sayuran',
    ediblePortion: 90,  // 90% BDD (ujung serat)
    calories: 34,
    protein: 2.4,
    fat: 0.3,
    carbs: 7.2,
    fiber: 2.7,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: D06)',
    defaultUnitPrice: 14500,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-14',
    code: 'TKPI-PS014',
    name: 'Pisang Cavendish / Ambon',
    category: 'Buah Segar',
    ediblePortion: 75,  // 75% BDD (25% kulit)
    calories: 89,
    protein: 1.1,
    fat: 0.3,
    carbs: 22.8,
    fiber: 2.6,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: E12) & USDA FDC 173944',
    defaultUnitPrice: 16000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-15',
    code: 'TKPI-SM015',
    name: 'Semangka Merah Segar',
    category: 'Buah Segar',
    ediblePortion: 54,  // 54% BDD (46% kulit tebal)
    calories: 30,
    protein: 0.6,
    fat: 0.2,
    carbs: 7.6,
    fiber: 0.4,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: E18)',
    defaultUnitPrice: 7500,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-16',
    code: 'TKPI-JR016',
    name: 'Jeruk Manis Probolinggo',
    category: 'Buah Segar',
    ediblePortion: 72,  // 72% BDD (28% kulit & serat)
    calories: 45,
    protein: 0.9,
    fat: 0.2,
    carbs: 11.2,
    fiber: 1.4,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: E06)',
    defaultUnitPrice: 18000,
    purchaseUnit: 'kg',
  },
  {
    id: 'fc-17',
    code: 'TKPI-SS017',
    name: 'Susu UHT Plain / Cokelat 125ml',
    category: 'Ekstra / Susu',
    ediblePortion: 100,
    calories: 65,      // per 100ml -> ~81 kkal / 125ml
    protein: 3.2,
    fat: 3.5,
    carbs: 5.0,
    fiber: 0.0,
    sourceReference: 'Standar SNI 01-3141-2011 & TKPI Kemenkes',
    defaultUnitPrice: 3600,
    purchaseUnit: 'pcs',
  },
  {
    id: 'fc-18',
    code: 'TKPI-MY018',
    name: 'Minyak Goreng Sawit Higienis',
    category: 'Bumbu & Minyak',
    ediblePortion: 100,
    calories: 884,
    protein: 0.0,
    fat: 100.0,
    carbs: 0.0,
    fiber: 0.0,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: F01)',
    defaultUnitPrice: 16500,
    purchaseUnit: 'liter',
  },
  {
    id: 'fc-19',
    code: 'TKPI-BM019',
    name: 'Bawang Merah & Putih Halus',
    category: 'Bumbu & Minyak',
    ediblePortion: 90,
    calories: 40,
    protein: 1.5,
    fat: 0.2,
    carbs: 9.0,
    fiber: 1.7,
    sourceReference: 'TKPI 2020 Kemenkes RI (Kode: G01)',
    defaultUnitPrice: 32000,
    purchaseUnit: 'kg',
  },
];

/**
 * DEFAULT NUTRITION TARGET CONFIG (AKG STANDAR BGN 2026 - MAKAN SIANG)
 * 30 - 35% dari Angka Kecukupan Gizi (AKG) Harian
 * Peraturan Menteri Kesehatan RI No. 28 Tahun 2019
 */
export const defaultNutritionTarget: NutritionTargetConfig = {
  isConfigured: true,
  referenceSource: 'Pedoman Standar Gizi Program Makan Bergizi Gratis (BGN 2026) & Permenkes No. 28/2019 (AKG Makan Siang 30-35%)',
  smallPortionTarget: {
    // Porsi Kecil: TK / PAUD & Kelas 1 - 3 SD
    caloriesMin: 550,
    caloriesMax: 680,
    proteinMin: 22.0,
    proteinMax: 30.0,
    fatMin: 18.0,
    fatMax: 24.0,
    carbMin: 85.0,
    carbMax: 105.0,
    fiberMin: 5.5,
    fiberMax: 8.0,
  },
  largePortionTarget: {
    // Porsi Besar: Kelas 4 - 6 SD, SMP, SMA, SMK, Santri
    caloriesMin: 780,
    caloriesMax: 920,
    proteinMin: 28.0,
    proteinMax: 38.0,
    fatMin: 22.0,
    fatMax: 29.0,
    carbMin: 110.0,
    carbMax: 135.0,
    fiberMin: 7.5,
    fiberMax: 11.0,
  },
};

/**
 * SAMPLE RECIPE INGREDIENTS FOR MENU-1 (Ayam Fillet Mentega Madu)
 */
export const sampleIngredientsMenu1: RecipeIngredient[] = [
  {
    id: 'ing-1',
    name: 'Beras Pulen Wangi',
    category: 'Makanan Pokok',
    netWeightSmall: 85,  // 85g beras mentah -> ~170g nasi
    netWeightLarge: 125, // 125g beras mentah -> ~250g nasi
    unit: 'gram',
    ediblePortionPercent: 100,
    conversionFactorToBase: 0.001, // 1000g = 1 kg
    purchaseUnit: 'kg',
    unitPrice: 14500,
    calories100g: 360,
    protein100g: 6.8,
    fat100g: 0.7,
    carb100g: 78.9,
    fiber100g: 0.8,
    referenceSource: 'TKPI 2020 (A01)',
  },
  {
    id: 'ing-2',
    name: 'Daging Ayam Fillet Dada',
    category: 'Lauk Hewani',
    netWeightSmall: 55,  // 55g matang/bersih
    netWeightLarge: 80,  // 80g matang/bersih
    unit: 'gram',
    ediblePortionPercent: 100, // Fillet 100% BDD
    conversionFactorToBase: 0.001,
    purchaseUnit: 'kg',
    unitPrice: 38000,
    calories100g: 165,
    protein100g: 31.0,
    fat100g: 3.6,
    carb100g: 0.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B05)',
  },
  {
    id: 'ing-3',
    name: 'Tahu Putih Kedelai Bacem',
    category: 'Lauk Nabati',
    netWeightSmall: 40,
    netWeightLarge: 60,
    unit: 'gram',
    ediblePortionPercent: 100,
    conversionFactorToBase: 0.001,
    purchaseUnit: 'kg',
    unitPrice: 10000,
    calories100g: 80,
    protein100g: 10.9,
    fat100g: 4.7,
    carb100g: 0.8,
    fiber100g: 0.1,
    referenceSource: 'TKPI 2020 (C01)',
  },
  {
    id: 'ing-4',
    name: 'Wortel & Buncis Sop',
    category: 'Sayuran',
    netWeightSmall: 60,
    netWeightLarge: 90,
    unit: 'gram',
    ediblePortionPercent: 89, // Rata-rata BDD Wortel (88%) & Buncis (90%)
    conversionFactorToBase: 0.001,
    purchaseUnit: 'kg',
    unitPrice: 13500,
    calories100g: 35,
    protein100g: 1.7,
    fat100g: 0.45,
    carb100g: 7.55,
    fiber100g: 1.85,
    referenceSource: 'TKPI 2020 (D24 & D06)',
  },
  {
    id: 'ing-5',
    name: 'Pisang Cavendish Masak Pohon',
    category: 'Buah Segar',
    netWeightSmall: 80,  // berat daging buah
    netWeightLarge: 110,
    unit: 'gram',
    ediblePortionPercent: 75, // 75% BDD (25% kulit pisang)
    conversionFactorToBase: 0.001,
    purchaseUnit: 'kg',
    unitPrice: 16000,
    calories100g: 89,
    protein100g: 1.1,
    fat100g: 0.3,
    carb100g: 22.8,
    fiber100g: 2.6,
    referenceSource: 'TKPI 2020 (E12)',
  },
  {
    id: 'ing-6',
    name: 'Susu UHT Plain 125ml',
    category: 'Ekstra / Susu',
    netWeightSmall: 125, // 1 kotak
    netWeightLarge: 125, // 1 kotak
    unit: 'pcs',
    ediblePortionPercent: 100,
    conversionFactorToBase: 1, // 1 kotak = 1 pcs
    purchaseUnit: 'pcs',
    unitPrice: 3600,
    calories100g: 65,
    protein100g: 3.2,
    fat100g: 3.5,
    carb100g: 5.0,
    fiber100g: 0.0,
    referenceSource: 'SNI Susu UHT Kemenkes',
  },
  {
    id: 'ing-7',
    name: 'Minyak Goreng & Bumbu Halus',
    category: 'Bumbu & Minyak',
    netWeightSmall: 8,
    netWeightLarge: 12,
    unit: 'gram',
    ediblePortionPercent: 100,
    conversionFactorToBase: 0.001,
    purchaseUnit: 'kg',
    unitPrice: 22000,
    calories100g: 650,
    protein100g: 0.8,
    fat100g: 70.0,
    carb100g: 6.0,
    fiber100g: 0.5,
    referenceSource: 'TKPI 2020 (F01)',
  },
];

/**
 * DEFAULT DIVISION JOBDESKS (STANDAR OPERASIONAL PROSEDUR PER DIVISI DAPUR MBG)
 */
export const defaultDivisionJobdesks: DivisionJobdesk[] = [
  {
    id: 'job-1',
    menuId: 'menu-1',
    menuName: 'Ayam Goreng Fillet Saus Mentega Madu & Nasi Pulen',
    date: '2026-11-08',
    divisionName: 'Relawan Div. Persiapan',
    ingredientsHandled: 'Daging Ayam Fillet (235 kg), Sayur Wortel & Buncis (220 kg), Bumbu Halus',
    tasks: '1. Terima ayam fillet dari cold storage, lakukan thawing air mengalir higienis.\n2. Potong dadu fillet ayam sesuai standar gramasi (55g porsi kecil, 80g porsi besar).\n3. Cuci wortel & buncis dengan air ozon/mengalir, kupas bersih, potong dadu 1 cm.\n4. Marinasi ayam dengan bawang putih halus, jahe, madu, dan kecap asin rendah natrium.',
    photoUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
    photoUrls: ['https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80'],
    photoCaption: 'SOP Divisi Persiapan: Pemotongan bahan sayur dan penimbangan gramasi fillet ayam di meja stainless food grade.',
    picName: 'Dewi Sartika (Koordinator Persiapan)',
    status: 'Selesai Sesuai Standar',
  },
  {
    id: 'job-2',
    menuId: 'menu-1',
    menuName: 'Ayam Goreng Fillet Saus Mentega Madu & Nasi Pulen',
    date: '2026-11-08',
    divisionName: 'Relawan Div. Pengolahan',
    ingredientsHandled: 'Beras (315 kg), Fillet Marinasi, Bumbu Sop, Mentega & Madu Asli',
    tasks: '1. Cuci beras pulen hingga air jernih, masak dalam 6 rice steamer otomatis kapasitas 50kg.\n2. Tumis fillet ayam marinasi dengan margarin/mentega nabati suhu 175°C hingga matang sempurna (suhu internal inti ayam min 75°C).\n3. Masak sayur sop dengan kaldu ayam bening alami, masukkan wortel dulu lalu buncis agar renyah segar dan nutrisi terjaga.\n4. Masak tahu bacem hingga air asat dan bumbu meresap sempurna.',
    photoUrl: 'https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?auto=format&fit=crop&w=600&q=80',
    photoUrls: ['https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?auto=format&fit=crop&w=600&q=80'],
    photoCaption: 'SOP Divisi Pengolahan: Memasak di kompresor kuali besar dengan pemantauan suhu termometer tusuk digital.',
    picName: 'Suparman (Chef Pengolahan)',
    status: 'Selesai Sesuai Standar',
  },
  {
    id: 'job-3',
    menuId: 'menu-1',
    menuName: 'Ayam Goreng Fillet Saus Mentega Madu & Nasi Pulen',
    date: '2026-11-08',
    divisionName: 'Relawan Div. Pemorsian',
    ingredientsHandled: 'Semua hidangan matang, Ompreng Stainless SUS304 berpenutup kedap',
    tasks: '1. Sterilisasi tangan, kenakan masker, sarung tangan nitril, apron kedap air, dan hairnet.\n2. Timbang porsi kecil (PAUD/SD 1-3): Nasi 170g, Ayam 55g, Tahu 40g, Sop 60g, Pisang 1 buah, Susu UHT 125ml.\n3. Timbang porsi besar (SD 4-6, SMP, SMA): Nasi 250g, Ayam 80g, Tahu 60g, Sop 90g, Pisang 1 buah, Susu UHT 125ml.\n4. Pastikan suhu makanan saat masuk ompreng berada pada suhu aman hangat (min 60°C).\n5. Tutup ompreng rapat, masukkan ke thermal insulated box per sekolah sasaran.',
    photoUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    photoUrls: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'],
    photoCaption: 'SOP Divisi Pemorsian: Penataan hidangan pada sekat ompreng stainless dengan gramasi presisi timbangan digital.',
    picName: 'Nurul Hidayati (Koordinator Pemorsian)',
    status: 'Selesai Sesuai Standar',
  },
  {
    id: 'job-4',
    menuId: 'menu-1',
    menuName: 'Ayam Goreng Fillet Saus Mentega Madu & Nasi Pulen',
    date: '2026-11-08',
    divisionName: 'Relawan Div. Distribusi',
    ingredientsHandled: '2.850 Ompreng dalam 57 Insulated Box Thermal, Berita Acara Serah Terima (BAST)',
    tasks: '1. Verifikasi barcode label sekolah pada setiap thermal box sesuai Rute A, Rute B, dan Rute C.\n2. Muat box thermal ke 3 armada pick-up/blind van tertutup, pastikan kuncian box stabil.\n3. Berangkat tepat pkl 09:15 WIB agar tiba di sekolah pertama pkl 09:45 WIB (sebelum jam istirahat makan).\n4. Serahkan ompreng kepada PIC Guru MBG di sekolah, lakukan verifikasi fisik dan tanda tangan digital BAST.',
    photoUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    photoUrls: ['https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80'],
    photoCaption: 'SOP Divisi Distribusi: Loading box makanan bersuhu hangat ke armada berpendingin/terisolasi termal.',
    picName: 'Agus Santoso (Koordinator Logistik)',
    status: 'Sedang Berjalan',
  },
  {
    id: 'job-5',
    menuId: 'menu-1',
    menuName: 'Ayam Goreng Fillet Saus Mentega Madu & Nasi Pulen',
    date: '2026-11-08',
    divisionName: 'Relawan Div. Cuci Ompreng',
    ingredientsHandled: '2.850 Ompreng Stainless kotor yang ditarik dari 8 sekolah sasaran',
    tasks: '1. Terima ompreng kotor pkl 12:30 - 13:30 WIB dari armada distribusi.\n2. Pembuangan sisa makanan (*food waste*) ke tempat sampah terpilah organik (dibuat kompos Yayasan).\n3. Bak 1: Perendaman air hangat & sabun cuci piring food grade anti-lemak.\n4. Bak 2: Pembilasan air bersih mengalir hingga kesat dan bebas busa.\n5. Bak 3: Sterilisasi air panas suhu 80°C selama 3 menit, lalu ditiriskan pada rak drying rack UV-C.',
    photoUrl: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80',
    photoUrls: ['https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?auto=format&fit=crop&w=600&q=80'],
    photoCaption: 'SOP Divisi Cuci Ompreng: Sistem 3 bak pencucian dan penirisan ompreng stainless steril.',
    picName: 'Kholifah (Koordinator Sanitasi & Cuci)',
    status: 'Belum Mulai',
  },
];

/**
 * Membangun daftar gramasi item menu standar (Porsi Kecil vs Porsi Besar)
 * secara otomatis dari Menu Harian PLOG & Resep Komposisi Bahannya.
 */
export function buildDefaultGrammagesForMenu(
  menu: Pick<
    MenuItem,
    'id' | 'stapleFood' | 'animalProtein' | 'plantProtein' | 'vegetable' | 'fruit' | 'milkOrExtra'
  >,
  recipeList: RecipeIngredient[] = []
): MenuItemGrammage[] {
  const slots: Array<{
    categoryKey: Exclude<MenuItemGrammage['categoryKey'], 'custom'>;
    categoryLabel: string;
    itemName: string;
    matchCats: string[];
    fallbackSmall: number;
    fallbackLarge: number;
  }> = [
    {
      categoryKey: 'stapleFood',
      categoryLabel: 'Makanan Pokok',
      itemName: menu.stapleFood,
      matchCats: ['pokok'],
      fallbackSmall: 100,
      fallbackLarge: 150,
    },
    {
      categoryKey: 'animalProtein',
      categoryLabel: 'Lauk Hewani',
      itemName: menu.animalProtein,
      matchCats: ['hewani'],
      fallbackSmall: 55,
      fallbackLarge: 80,
    },
    {
      categoryKey: 'plantProtein',
      categoryLabel: 'Lauk Nabati',
      itemName: menu.plantProtein,
      matchCats: ['nabati'],
      fallbackSmall: 40,
      fallbackLarge: 60,
    },
    {
      categoryKey: 'vegetable',
      categoryLabel: 'Sayuran',
      itemName: menu.vegetable,
      matchCats: ['sayur'],
      fallbackSmall: 60,
      fallbackLarge: 90,
    },
    {
      categoryKey: 'fruit',
      categoryLabel: 'Buah Segar',
      itemName: menu.fruit,
      matchCats: ['buah'],
      fallbackSmall: 80,
      fallbackLarge: 110,
    },
    {
      categoryKey: 'milkOrExtra',
      categoryLabel: 'Pelengkap / Susu',
      itemName: menu.milkOrExtra,
      matchCats: ['ekstra', 'susu'],
      fallbackSmall: 125,
      fallbackLarge: 125,
    },
  ];

  return slots
    .filter(s => (s.itemName || '').trim() !== '')
    .map(slot => {
      const matchedRecipes = recipeList.filter(ing => {
        const catLower = (ing.category || '').toLowerCase();
        return slot.matchCats.some(tok => catLower.includes(tok));
      });
      const recipeSmallSum = matchedRecipes.reduce((acc, r) => acc + (r.netWeightSmall || 0), 0);
      const recipeLargeSum = matchedRecipes.reduce((acc, r) => acc + (r.netWeightLarge || 0), 0);

      return {
        id: `${menu.id}-gram-${slot.categoryKey}`,
        categoryKey: slot.categoryKey,
        categoryLabel: slot.categoryLabel,
        itemName: slot.itemName.trim(),
        smallGrams: recipeSmallSum > 0 ? recipeSmallSum : slot.fallbackSmall,
        largeGrams: recipeLargeSum > 0 ? recipeLargeSum : slot.fallbackLarge,
        notes:
          matchedRecipes.length > 0
            ? `Diambil dari menu PLOG & ${matchedRecipes.length} bahan resep`
            : 'Standar gramasi menu harian PLOG',
        isManuallyEdited: false,
      };
    });
}

/**
 * Mengambil daftar gramasi item menu final dari PLOG (menggabungkan input manual
 * pada sub-menu "Gramasi Item Menu" dengan sinkronisasi live nama item menu PLOG).
 */
export function resolveMenuGrammages(
  menu: MenuItem | undefined,
  recipeList: RecipeIngredient[] = []
): MenuItemGrammage[] {
  if (!menu) return [];
  const baseDefaults = buildDefaultGrammagesForMenu(menu, recipeList);
  const saved = Array.isArray(menu.itemGrammages) ? menu.itemGrammages : [];
  if (saved.length === 0) return baseDefaults;

  const mergedStandard = baseDefaults.map(def => {
    const existing = saved.find(s => s.categoryKey === def.categoryKey || s.id === def.id);
    if (!existing) return def;
    return {
      ...def,
      ...existing,
      itemName: existing.isManuallyEdited ? existing.itemName : def.itemName,
    };
  });

  const customItems = saved.filter(s => s.categoryKey === 'custom');
  return [...mergedStandard, ...customItems];
}

export interface ExtendedTkpiEntry {
  name: string;
  aliases: string[];
  category: string;
  ediblePortion: number;
  calories100g: number;
  protein100g: number;
  fat100g: number;
  carb100g: number;
  fiber100g: number;
  referenceSource: string;
}

export const EXTENDED_TKPI_FOODS: ExtendedTkpiEntry[] = [
  {
    name: 'Beras Putih Giling (Mentah)',
    aliases: ['beras', 'beras putih', 'beras pulen', 'beras wangi', 'beras kuning', 'beras merah'],
    category: 'Makanan Pokok',
    ediblePortion: 100,
    calories100g: 360,
    protein100g: 6.8,
    fat100g: 0.7,
    carb100g: 78.9,
    fiber100g: 0.8,
    referenceSource: 'TKPI 2020 (A01)',
  },
  {
    name: 'Nasi Putih Matang',
    aliases: ['nasi', 'nasi putih', 'nasi pulen', 'nasi matang', 'nasi uduk', 'nasi kuning'],
    category: 'Makanan Pokok',
    ediblePortion: 100,
    calories100g: 180,
    protein100g: 3.0,
    fat100g: 0.3,
    carb100g: 39.8,
    fiber100g: 0.2,
    referenceSource: 'TKPI 2020 (A02)',
  },
  {
    name: 'Kentang Segar',
    aliases: ['kentang', 'perkedel kentang'],
    category: 'Makanan Pokok',
    ediblePortion: 85,
    calories100g: 62,
    protein100g: 2.1,
    fat100g: 0.2,
    carb100g: 13.5,
    fiber100g: 0.5,
    referenceSource: 'TKPI 2020 (A12)',
  },
  {
    name: 'Tepung Terigu',
    aliases: ['tepung', 'terigu', 'tepung terigu'],
    category: 'Makanan Pokok',
    ediblePortion: 100,
    calories100g: 333,
    protein100g: 9.0,
    fat100g: 1.0,
    carb100g: 77.2,
    fiber100g: 0.3,
    referenceSource: 'TKPI 2020 (A16)',
  },
  {
    name: 'Telur Ayam Ras',
    aliases: ['telur', 'telur ayam', 'telur ras', 'telur dadar', 'telur ceplok', 'telur rebus'],
    category: 'Lauk Hewani',
    ediblePortion: 90,
    calories100g: 154,
    protein100g: 12.4,
    fat100g: 10.8,
    carb100g: 0.7,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B20)',
  },
  {
    name: 'Daging Ayam Fillet Dada/Paha',
    aliases: ['ayam', 'ayam fillet', 'daging ayam', 'dada ayam', 'ayam tanpa tulang'],
    category: 'Lauk Hewani',
    ediblePortion: 100,
    calories100g: 165,
    protein100g: 31.0,
    fat100g: 3.6,
    carb100g: 0.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B05) & USDA FDC 171077',
  },
  {
    name: 'Daging Ayam Utuh / Paha Berkulit',
    aliases: ['ayam berkulit', 'paha ayam berkulit', 'ayam karkas', 'ayam ras utuh'],
    category: 'Lauk Hewani',
    ediblePortion: 58,
    calories100g: 298,
    protein100g: 18.2,
    fat100g: 25.0,
    carb100g: 0.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B05)',
  },
  {
    name: 'Hati Ayam Segar',
    aliases: ['hati ayam', 'ati ayam'],
    category: 'Lauk Hewani',
    ediblePortion: 100,
    calories100g: 160,
    protein100g: 27.4,
    fat100g: 5.0,
    carb100g: 1.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B07)',
  },
  {
    name: 'Ikan Tenggiri / Kakap Fillet',
    aliases: ['tenggiri', 'ikan tenggiri', 'kakap', 'ikan kakap', 'fillet ikan', 'gurame'],
    category: 'Lauk Hewani',
    ediblePortion: 100,
    calories100g: 112,
    protein100g: 21.4,
    fat100g: 2.3,
    carb100g: 0.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B11)',
  },
  {
    name: 'Ikan Tongkol / Kembung / Lele Segar',
    aliases: ['ikan', 'tongkol', 'kembung', 'lele', 'patin', 'bandeng', 'tuna', 'nila', 'cakalang'],
    category: 'Lauk Hewani',
    ediblePortion: 80,
    calories100g: 111,
    protein100g: 22.0,
    fat100g: 1.5,
    carb100g: 0.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B12)',
  },
  {
    name: 'Udang Segar Kupas',
    aliases: ['udang', 'udang segar', 'udang kupas'],
    category: 'Lauk Hewani',
    ediblePortion: 68,
    calories100g: 91,
    protein100g: 21.0,
    fat100g: 0.2,
    carb100g: 0.1,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B22)',
  },
  {
    name: 'Daging Sapi Segar',
    aliases: ['daging sapi', 'sapi', 'semur sapi', 'rendang'],
    category: 'Lauk Hewani',
    ediblePortion: 100,
    calories100g: 201,
    protein100g: 20.0,
    fat100g: 13.0,
    carb100g: 0.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (B01)',
  },
  {
    name: 'Bakso Daging Sapi',
    aliases: ['bakso', 'bakso sapi', 'bakso daging'],
    category: 'Lauk Hewani',
    ediblePortion: 100,
    calories100g: 202,
    protein100g: 13.4,
    fat100g: 9.0,
    carb100g: 16.5,
    fiber100g: 0.2,
    referenceSource: 'TKPI 2020 (B02)',
  },
  {
    name: 'Tahu Putih Kedelai',
    aliases: ['tahu', 'tahu putih', 'tahu kuning', 'tahu sutra'],
    category: 'Lauk Nabati',
    ediblePortion: 100,
    calories100g: 80,
    protein100g: 10.9,
    fat100g: 4.7,
    carb100g: 0.8,
    fiber100g: 0.1,
    referenceSource: 'TKPI 2020 (C01)',
  },
  {
    name: 'Tempe Kedelai Murni',
    aliases: ['tempe', 'tempe murni', 'tempe goreng', 'perkedel tempe', 'mendoan'],
    category: 'Lauk Nabati',
    ediblePortion: 100,
    calories100g: 201,
    protein100g: 20.8,
    fat100g: 8.8,
    carb100g: 13.5,
    fiber100g: 1.4,
    referenceSource: 'TKPI 2020 (C02)',
  },
  {
    name: 'Kacang Tanah Kupas',
    aliases: ['kacang tanah', 'kacang kupas'],
    category: 'Lauk Nabati',
    ediblePortion: 100,
    calories100g: 525,
    protein100g: 27.9,
    fat100g: 42.7,
    carb100g: 17.4,
    fiber100g: 2.4,
    referenceSource: 'TKPI 2020 (C09)',
  },
  {
    name: 'Kacang Hijau Kering',
    aliases: ['kacang hijau', 'kacang ijo'],
    category: 'Lauk Nabati',
    ediblePortion: 100,
    calories100g: 323,
    protein100g: 22.9,
    fat100g: 1.5,
    carb100g: 56.8,
    fiber100g: 7.5,
    referenceSource: 'TKPI 2020 (C06)',
  },
  {
    name: 'Puding / Bubur Kacang Hijau',
    aliases: ['puding kacang hijau', 'bubur kacang hijau', 'sari kacang hijau'],
    category: 'Ekstra / Susu',
    ediblePortion: 100,
    calories100g: 110,
    protein100g: 4.0,
    fat100g: 2.5,
    carb100g: 18.0,
    fiber100g: 1.8,
    referenceSource: 'TKPI Kemenkes RI',
  },
  {
    name: 'Bumbu / Saus Kacang Siap Saji',
    aliases: ['bumbu kacang', 'saus kacang', 'pecel'],
    category: 'Bumbu & Minyak',
    ediblePortion: 100,
    calories100g: 88,
    protein100g: 3.0,
    fat100g: 4.0,
    carb100g: 9.0,
    fiber100g: 0.8,
    referenceSource: 'TKPI Kemenkes Estimasi',
  },
  {
    name: 'Minyak Goreng Kelapa Sawit',
    aliases: ['minyak', 'minyak goreng', 'minyak sayur', 'margarin', 'mentega'],
    category: 'Bumbu & Minyak',
    ediblePortion: 100,
    calories100g: 884,
    protein100g: 0.0,
    fat100g: 100.0,
    carb100g: 0.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (F01)',
  },
  {
    name: 'Santan Kelapa Encer',
    aliases: ['santan', 'santan encer', 'santan cair'],
    category: 'Bumbu & Minyak',
    ediblePortion: 100,
    calories100g: 122,
    protein100g: 2.0,
    fat100g: 10.0,
    carb100g: 7.6,
    fiber100g: 1.4,
    referenceSource: 'TKPI 2020 (F03)',
  },
  {
    name: 'Gula Pasir / Madu',
    aliases: ['gula', 'gula pasir', 'madu', 'gula merah'],
    category: 'Bumbu & Minyak',
    ediblePortion: 100,
    calories100g: 394,
    protein100g: 0.0,
    fat100g: 0.0,
    carb100g: 94.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (F05)',
  },
  {
    name: 'Kecap Manis',
    aliases: ['kecap', 'kecap manis'],
    category: 'Bumbu & Minyak',
    ediblePortion: 100,
    calories100g: 71,
    protein100g: 5.7,
    fat100g: 1.3,
    carb100g: 9.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (G04)',
  },
  {
    name: 'Bawang Merah & Putih Halus',
    aliases: ['bawang merah', 'bawang putih', 'bumbu halus', 'rempah'],
    category: 'Bumbu & Minyak',
    ediblePortion: 90,
    calories100g: 40,
    protein100g: 1.5,
    fat100g: 0.2,
    carb100g: 9.0,
    fiber100g: 1.7,
    referenceSource: 'TKPI 2020 (G01)',
  },
  {
    name: 'Kembang Kol / Brokoli Segar',
    aliases: ['kembang kol', 'brokoli', 'kubis', 'kol', 'capcay'],
    category: 'Sayuran',
    ediblePortion: 75,
    calories100g: 34,
    protein100g: 2.8,
    fat100g: 0.4,
    carb100g: 6.4,
    fiber100g: 2.4,
    referenceSource: 'TKPI 2020 (D12)',
  },
  {
    name: 'Sawi Hijau / Pakcoy Segar',
    aliases: ['sawi', 'sawi hijau', 'pakcoy', 'caisim'],
    category: 'Sayuran',
    ediblePortion: 87,
    calories100g: 20,
    protein100g: 2.3,
    fat100g: 0.3,
    carb100g: 4.0,
    fiber100g: 1.0,
    referenceSource: 'TKPI 2020 (D20)',
  },
  {
    name: 'Kangkung Segar',
    aliases: ['kangkung', 'tumis kangkung'],
    category: 'Sayuran',
    ediblePortion: 60,
    calories100g: 28,
    protein100g: 3.4,
    fat100g: 0.7,
    carb100g: 3.9,
    fiber100g: 2.0,
    referenceSource: 'TKPI 2020 (D10)',
  },
  {
    name: 'Tauge Kacang Hijau',
    aliases: ['tauge', 'toge', 'kecambah'],
    category: 'Sayuran',
    ediblePortion: 100,
    calories100g: 34,
    protein100g: 3.7,
    fat100g: 1.2,
    carb100g: 4.3,
    fiber100g: 1.6,
    referenceSource: 'TKPI 2020 (D21)',
  },
  {
    name: 'Tomat Merah Segar',
    aliases: ['tomat', 'tomat merah'],
    category: 'Sayuran',
    ediblePortion: 95,
    calories100g: 24,
    protein100g: 1.3,
    fat100g: 0.5,
    carb100g: 4.7,
    fiber100g: 1.5,
    referenceSource: 'TKPI 2020 (D23)',
  },
  {
    name: 'Jagung Manis Pipil',
    aliases: ['jagung', 'jagung manis', 'jagung pipil'],
    category: 'Sayuran',
    ediblePortion: 90,
    calories100g: 147,
    protein100g: 5.1,
    fat100g: 0.7,
    carb100g: 31.5,
    fiber100g: 1.3,
    referenceSource: 'TKPI 2020 (D09)',
  },
  {
    name: 'Mentimun Segar',
    aliases: ['timun', 'mentimun', 'ketimun'],
    category: 'Sayuran',
    ediblePortion: 70,
    calories100g: 12,
    protein100g: 0.6,
    fat100g: 0.2,
    carb100g: 2.4,
    fiber100g: 0.5,
    referenceSource: 'TKPI 2020 (D18)',
  },
  {
    name: 'Wortel Segar',
    aliases: ['wortel', 'wortel manis'],
    category: 'Sayuran',
    ediblePortion: 88,
    calories100g: 36,
    protein100g: 1.0,
    fat100g: 0.6,
    carb100g: 7.9,
    fiber100g: 1.0,
    referenceSource: 'TKPI 2020 (D24)',
  },
  {
    name: 'Bayam Hijau Segar',
    aliases: ['bayam', 'sayur bayam', 'daun singkong'],
    category: 'Sayuran',
    ediblePortion: 71,
    calories100g: 16,
    protein100g: 0.9,
    fat100g: 0.4,
    carb100g: 2.9,
    fiber100g: 0.7,
    referenceSource: 'TKPI 2020 (D04)',
  },
  {
    name: 'Buncis Segar',
    aliases: ['buncis', 'kapri'],
    category: 'Sayuran',
    ediblePortion: 90,
    calories100g: 34,
    protein100g: 2.4,
    fat100g: 0.3,
    carb100g: 7.2,
    fiber100g: 2.7,
    referenceSource: 'TKPI 2020 (D06)',
  },
  {
    name: 'Kacang Panjang Segar',
    aliases: ['kacang panjang'],
    category: 'Sayuran',
    ediblePortion: 75,
    calories100g: 31,
    protein100g: 2.7,
    fat100g: 0.4,
    carb100g: 5.8,
    fiber100g: 2.0,
    referenceSource: 'TKPI 2020 (D08)',
  },
  {
    name: 'Semangka Merah Segar',
    aliases: ['semangka', 'semangka merah'],
    category: 'Buah Segar',
    ediblePortion: 54,
    calories100g: 30,
    protein100g: 0.6,
    fat100g: 0.2,
    carb100g: 7.6,
    fiber100g: 0.4,
    referenceSource: 'TKPI 2020 (E18)',
  },
  {
    name: 'Melon Segar',
    aliases: ['melon', 'blewah'],
    category: 'Buah Segar',
    ediblePortion: 58,
    calories100g: 34,
    protein100g: 0.8,
    fat100g: 0.2,
    carb100g: 8.2,
    fiber100g: 0.9,
    referenceSource: 'TKPI 2020 (E14)',
  },
  {
    name: 'Buah Naga Merah',
    aliases: ['buah naga', 'naga merah'],
    category: 'Buah Segar',
    ediblePortion: 67,
    calories100g: 51,
    protein100g: 1.1,
    fat100g: 0.4,
    carb100g: 12.0,
    fiber100g: 3.0,
    referenceSource: 'TKPI 2020 (E21)',
  },
  {
    name: 'Anggur Merah / Muscat',
    aliases: ['anggur', 'anggur merah', 'anggur muscat', 'anggur hijau'],
    category: 'Buah Segar',
    ediblePortion: 95,
    calories100g: 69,
    protein100g: 0.7,
    fat100g: 0.2,
    carb100g: 18.1,
    fiber100g: 0.9,
    referenceSource: 'TKPI 2020 (E02) & USDA',
  },
  {
    name: 'Pisang Cavendish / Ambon',
    aliases: ['pisang', 'pisang ambon', 'pisang cavendish'],
    category: 'Buah Segar',
    ediblePortion: 75,
    calories100g: 89,
    protein100g: 1.1,
    fat100g: 0.3,
    carb100g: 22.8,
    fiber100g: 2.6,
    referenceSource: 'TKPI 2020 (E12)',
  },
  {
    name: 'Jeruk Manis Segar',
    aliases: ['jeruk', 'jeruk manis', 'jeruk keprok'],
    category: 'Buah Segar',
    ediblePortion: 72,
    calories100g: 45,
    protein100g: 0.9,
    fat100g: 0.2,
    carb100g: 11.2,
    fiber100g: 1.4,
    referenceSource: 'TKPI 2020 (E06)',
  },
  {
    name: 'Nanas Segar',
    aliases: ['nanas', 'nanas madu'],
    category: 'Buah Segar',
    ediblePortion: 53,
    calories100g: 40,
    protein100g: 0.6,
    fat100g: 0.3,
    carb100g: 9.9,
    fiber100g: 1.4,
    referenceSource: 'TKPI 2020 (E10)',
  },
  {
    name: 'Pepaya / Mangga / Apel',
    aliases: ['pepaya', 'mangga', 'apel', 'pir', 'jambu'],
    category: 'Buah Segar',
    ediblePortion: 75,
    calories100g: 46,
    protein100g: 0.5,
    fat100g: 0.1,
    carb100g: 12.2,
    fiber100g: 1.6,
    referenceSource: 'TKPI 2020 (E15)',
  },
  {
    name: 'Susu UHT Plain / Cokelat',
    aliases: ['susu', 'susu uht', 'susu cair', 'susu kotak', 'susu pasteurisasi'],
    category: 'Ekstra / Susu',
    ediblePortion: 100,
    calories100g: 65,
    protein100g: 3.2,
    fat100g: 3.5,
    carb100g: 5.0,
    fiber100g: 0.0,
    referenceSource: 'SNI & TKPI Kemenkes',
  },
  {
    name: 'Kerupuk Udang / Finna / Ikan',
    aliases: ['kerupuk', 'kerupuk finna', 'kerupuk udang', 'kerupuk ikan', 'emping'],
    category: 'Ekstra / Susu',
    ediblePortion: 100,
    calories100g: 500,
    protein100g: 0.0,
    fat100g: 20.0,
    carb100g: 70.0,
    fiber100g: 0.0,
    referenceSource: 'TKPI 2020 (H05)',
  },
  {
    name: 'Dressing Salad / Mayonaise',
    aliases: ['dressing', 'dresing', 'dresing salad', 'dressing salad', 'mayonaise', 'mayones', 'yogurt'],
    category: 'Bumbu & Minyak',
    ediblePortion: 100,
    calories100g: 500,
    protein100g: 1.7,
    fat100g: 36.7,
    carb100g: 40.0,
    fiber100g: 0.0,
    referenceSource: 'USDA & TKPI Estimasi',
  },
];

export interface FoodNutritionMatch {
  matchedName: string;
  category: string;
  ediblePortionPercent: number;
  calories100g: number;
  protein100g: number;
  fat100g: number;
  carb100g: number;
  fiber100g: number;
  referenceSource: string;
}

const FOOD_MODIFIER_STOPWORDS = new Set([
  'segar',
  'murni',
  'halus',
  'manis',
  'gurih',
  'pedas',
  'putih',
  'merah',
  'hijau',
  'kuning',
  'hitam',
  'cokelat',
  'coklat',
  'goreng',
  'rebus',
  'kukus',
  'tumis',
  'panggang',
  'bakar',
  'kuah',
  'saus',
  'saos',
  'bumbu',
  'balado',
  'bacem',
  'semur',
  'suwir',
  'potong',
  'iris',
  'irisan',
  'dadu',
  'pipil',
  'cincang',
  'giling',
  'pulen',
  'wangi',
  'empuk',
  'enak',
  'legit',
  'bersih',
  'kupas',
  'utuh',
  'tanpa',
  'tulang',
  'pilihan',
  'lokal',
  'grade',
  'kemasan',
  'kotak',
  'cair',
  'encer',
  'kental',
  'plain',
  'masak',
  'matang',
  'mentah',
  'pohon',
  'sayur',
  'asam',
  'asin',
  'rendah',
  'natrium',
  'higienis',
  'probolinggo',
  'semboro',
  'jember',
  'krejengan',
  'rasa',
]);

function normalizeFoodKey(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExpForFood(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWholePhrase(haystack: string, phrase: string): boolean {
  if (!haystack || !phrase) return false;
  const rx = new RegExp(`(?:^|\\s)${escapeRegExpForFood(phrase)}(?:\\s|$)`);
  return rx.test(haystack);
}

function extractDistinctFoodTokens(normalized: string): string[] {
  return normalized
    .split(' ')
    .filter(t => t.length >= 3 && !FOOD_MODIFIER_STOPWORDS.has(t));
}

export function resolveFoodNutritionLookup(
  foodName: string,
  foodCompositions: FoodCompositionItem[],
  masterBahanList: Array<{
    name: string;
    category?: string;
    calories100g: number;
    protein100g: number;
    fat100g: number;
    carb100g: number;
    fiber100g: number;
  }> = []
): FoodNutritionMatch | null {
  const query = normalizeFoodKey(foodName);
  if (!query || query.length < 2) return null;

  // 1. Exact match in foodCompositions (TKPI 2020 / USDA)
  const exactComp = foodCompositions.find(c => normalizeFoodKey(c.name) === query);
  if (exactComp) {
    return {
      matchedName: exactComp.name,
      category: exactComp.category,
      ediblePortionPercent: exactComp.ediblePortion,
      calories100g: exactComp.calories,
      protein100g: exactComp.protein,
      fat100g: exactComp.fat,
      carb100g: exactComp.carbs,
      fiber100g: exactComp.fiber,
      referenceSource: exactComp.sourceReference,
    };
  }

  // 2. Exact match in Master Bahan (jika nilai gizinya > 0)
  const exactMaster = masterBahanList.find(m => normalizeFoodKey(m.name) === query);
  if (exactMaster && (exactMaster.calories100g > 0 || exactMaster.protein100g > 0)) {
    return {
      matchedName: exactMaster.name,
      category: exactMaster.category || 'Bahan Makanan',
      ediblePortionPercent: 100,
      calories100g: exactMaster.calories100g,
      protein100g: exactMaster.protein100g,
      fat100g: exactMaster.fat100g,
      carb100g: exactMaster.carb100g,
      fiber100g: exactMaster.fiber100g,
      referenceSource: 'Master Bahan Pangan SPPG',
    };
  }

  // 3. Alias or whole-phrase match in EXTENDED_TKPI_FOODS
  let bestExtended: { entry: ExtendedTkpiEntry; score: number } | null = null;
  for (const entry of EXTENDED_TKPI_FOODS) {
    const candidates = [entry.name, ...entry.aliases].map(normalizeFoodKey).filter(Boolean);
    for (const alias of candidates) {
      let score = 0;
      if (alias === query) {
        score = 1000 + alias.length;
      } else if (hasWholePhrase(query, alias)) {
        // Whole phrase alias inside query (e.g., "telur ayam" in "telur ayam segar")
        score = 200 + alias.length + (query.startsWith(alias) ? 15 : 0);
      } else if (hasWholePhrase(alias, query)) {
        score = 120 + query.length;
      } else if (query.includes(alias) || alias.includes(query)) {
        score = 20 + Math.min(query.length, alias.length);
      }
      if (score > 0 && (!bestExtended || score > bestExtended.score)) {
        bestExtended = { entry, score };
      }
    }
  }

  // 4. Whole-phrase / primary-token match in foodCompositions (stopwords excluded)
  let bestComp: { item: FoodCompositionItem; score: number } | null = null;
  const queryDistinctTokens = extractDistinctFoodTokens(query);
  for (const c of foodCompositions) {
    const norm = normalizeFoodKey(c.name);
    let score = 0;
    if (hasWholePhrase(query, norm) || hasWholePhrase(norm, query)) {
      score = 220 + Math.min(norm.length, query.length);
    } else if (queryDistinctTokens.length > 0) {
      const compDistinctTokens = extractDistinctFoodTokens(norm);
      const overlap = queryDistinctTokens.filter(t => compDistinctTokens.includes(t));
      if (overlap.length > 0) {
        const primaryMatchBonus = compDistinctTokens[0] === queryDistinctTokens[0] ? 15 : 0;
        score = overlap.length * 25 + primaryMatchBonus;
      }
    }
    if (score > 0 && (!bestComp || score > bestComp.score)) {
      bestComp = { item: c, score };
    }
  }

  // Prioritaskan exact/phrase match dari EXTENDED_TKPI_FOODS jika lebih spesifik (misal Nasi Putih Matang vs Beras Mentah)
  if (bestExtended && (!bestComp || bestExtended.score >= bestComp.score)) {
    const e = bestExtended.entry;
    return {
      matchedName: e.name,
      category: e.category,
      ediblePortionPercent: e.ediblePortion,
      calories100g: e.calories100g,
      protein100g: e.protein100g,
      fat100g: e.fat100g,
      carb100g: e.carb100g,
      fiber100g: e.fiber100g,
      referenceSource: e.referenceSource,
    };
  }

  if (bestComp) {
    const c = bestComp.item;
    return {
      matchedName: c.name,
      category: c.category,
      ediblePortionPercent: c.ediblePortion,
      calories100g: c.calories,
      protein100g: c.protein,
      fat100g: c.fat,
      carb100g: c.carbs,
      fiber100g: c.fiber,
      referenceSource: c.sourceReference,
    };
  }

  // 5. Fallback substring match in Master Bahan
  for (const m of masterBahanList) {
    const norm = normalizeFoodKey(m.name);
    if ((hasWholePhrase(norm, query) || hasWholePhrase(query, norm)) && (m.calories100g > 0 || m.protein100g > 0)) {
      return {
        matchedName: m.name,
        category: m.category || 'Bahan Makanan',
        ediblePortionPercent: 100,
        calories100g: m.calories100g,
        protein100g: m.protein100g,
        fat100g: m.fat100g,
        carb100g: m.carb100g,
        fiber100g: m.fiber100g,
        referenceSource: 'Master Bahan Pangan SPPG',
      };
    }
  }

  return null;
}

export function buildRecipeIngredientsForMenu(
  menu: Pick<
    MenuItem,
    'stapleFood' | 'animalProtein' | 'plantProtein' | 'vegetable' | 'fruit' | 'milkOrExtra'
  >,
  foodCompositions: FoodCompositionItem[],
  masterBahanList: Array<{
    name: string;
    category?: string;
    unit?: string;
    actualPrice?: number;
    calories100g: number;
    protein100g: number;
    fat100g: number;
    carb100g: number;
    fiber100g: number;
  }> = [],
  inventoryList: Array<{ name: string; unit?: string; pricePerUnit?: number }> = []
): RecipeIngredient[] {
  const ts = Date.now();
  const findPriceAndUnit = (name: string, fallbackUnit: string, fallbackPrice: number) => {
    const norm = normalizeFoodKey(name);
    const tokens = extractDistinctFoodTokens(norm);
    const inv = inventoryList.find(i => {
      const iNorm = normalizeFoodKey(i.name);
      return hasWholePhrase(iNorm, norm) || tokens.some(t => hasWholePhrase(iNorm, t));
    });
    const mb = masterBahanList.find(m => {
      const mNorm = normalizeFoodKey(m.name);
      return hasWholePhrase(mNorm, norm) || tokens.some(t => hasWholePhrase(mNorm, t));
    });
    const fc = foodCompositions.find(c => {
      const cNorm = normalizeFoodKey(c.name);
      return hasWholePhrase(cNorm, norm) || tokens.some(t => hasWholePhrase(cNorm, t));
    });
    return {
      purchaseUnit: inv?.unit || mb?.unit || fc?.purchaseUnit || fallbackUnit,
      unitPrice: inv?.pricePerUnit || mb?.actualPrice || fc?.defaultUnitPrice || fallbackPrice,
    };
  };

  const slots: Array<{
    dishName: string;
    category: string;
    weightSmall: number;
    weightLarge: number;
    isStapleRice?: boolean;
    isExtraMilk?: boolean;
    fallbackName: string;
    fallbackUnit: string;
    fallbackPrice: number;
  }> = [
    {
      dishName: menu.stapleFood,
      category: 'Makanan Pokok',
      weightSmall: 85,
      weightLarge: 125,
      isStapleRice: true,
      fallbackName: 'Beras Putih Giling (Mentah)',
      fallbackUnit: 'kg',
      fallbackPrice: 14500,
    },
    {
      dishName: menu.animalProtein,
      category: 'Lauk Hewani',
      weightSmall: 55,
      weightLarge: 80,
      fallbackName: 'Daging Ayam Fillet Dada/Paha',
      fallbackUnit: 'kg',
      fallbackPrice: 38000,
    },
    {
      dishName: menu.plantProtein,
      category: 'Lauk Nabati',
      weightSmall: 40,
      weightLarge: 60,
      fallbackName: 'Tahu Putih Kedelai',
      fallbackUnit: 'kg',
      fallbackPrice: 10000,
    },
    {
      dishName: menu.vegetable,
      category: 'Sayuran',
      weightSmall: 60,
      weightLarge: 90,
      fallbackName: 'Wortel Segar',
      fallbackUnit: 'kg',
      fallbackPrice: 13500,
    },
    {
      dishName: menu.fruit,
      category: 'Buah Segar',
      weightSmall: 80,
      weightLarge: 110,
      fallbackName: 'Pisang Cavendish / Ambon',
      fallbackUnit: 'kg',
      fallbackPrice: 16000,
    },
    {
      dishName: menu.milkOrExtra,
      category: 'Ekstra / Susu',
      weightSmall: 125,
      weightLarge: 125,
      isExtraMilk: true,
      fallbackName: 'Susu UHT Plain / Cokelat',
      fallbackUnit: 'pcs',
      fallbackPrice: 3600,
    },
  ];

  const list: RecipeIngredient[] = [];
  slots.forEach((slot, idx) => {
    const rawDish = (slot.dishName || '').trim();
    if (!rawDish) return;

    const dishLower = rawDish.toLowerCase();
    // Jika makanan pokok tertulis "Nasi ...", gunakan bahan mentah Beras untuk kebutuhan PLOG (85g/125g -> 360 kkal/100g)
    const lookupQuery =
      slot.isStapleRice && dishLower.includes('nasi') && !dishLower.includes('kentang')
        ? 'Beras Putih Giling (Mentah)'
        : rawDish;

    const match =
      resolveFoodNutritionLookup(lookupQuery, foodCompositions, masterBahanList) ||
      resolveFoodNutritionLookup(slot.fallbackName, foodCompositions, masterBahanList);

    const ingName =
      slot.isStapleRice && dishLower.includes('nasi') && !dishLower.includes('kentang')
        ? 'Beras Pulen Wangi'
        : match?.matchedName || rawDish;

    const isPcsExtra =
      Boolean(slot.isExtraMilk) && (dishLower.includes('susu') || dishLower.includes('uht'));
    const pu = findPriceAndUnit(
      ingName,
      isPcsExtra ? 'pcs' : slot.fallbackUnit,
      slot.fallbackPrice
    );

    list.push({
      id: `ing-${ts}-${idx + 1}`,
      menuName: rawDish,
      name: ingName,
      category: slot.category,
      netWeightSmall: slot.weightSmall,
      netWeightLarge: slot.weightLarge,
      unit: isPcsExtra ? 'pcs' : 'gram',
      ediblePortionPercent: match?.ediblePortionPercent ?? 100,
      conversionFactorToBase: isPcsExtra ? 1 : 0.001,
      purchaseUnit: isPcsExtra ? 'pcs' : pu.purchaseUnit,
      unitPrice: pu.unitPrice,
      calories100g: match?.calories100g ?? 0,
      protein100g: match?.protein100g ?? 0,
      fat100g: match?.fat100g ?? 0,
      carb100g: match?.carb100g ?? 0,
      fiber100g: match?.fiber100g ?? 0,
      referenceSource: match?.referenceSource || 'TKPI 2020 Kemenkes RI',
    });
  });

  // Tambah minyak goreng & bumbu dasar pengolahan harian
  list.push({
    id: `ing-${ts}-${list.length + 1}`,
    menuName: 'Pelengkap & Bumbu',
    name: 'Minyak Goreng & Bumbu Halus',
    category: 'Bumbu & Minyak',
    netWeightSmall: 8,
    netWeightLarge: 12,
    unit: 'gram',
    ediblePortionPercent: 100,
    conversionFactorToBase: 0.001,
    purchaseUnit: 'kg',
    unitPrice: 22000,
    calories100g: 650,
    protein100g: 0.8,
    fat100g: 70.0,
    carb100g: 6.0,
    fiber100g: 0.5,
    referenceSource: 'TKPI 2020 (F01)',
  });

  return list;
}

export function getFoodNutritionSuggestions(
  foodCompositions: FoodCompositionItem[],
  masterBahanList: Array<{ name: string }> = []
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const pushUnique = (name: string) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  };

  foodCompositions.forEach(c => pushUnique(c.name));
  masterBahanList.forEach(m => pushUnique(m.name));
  EXTENDED_TKPI_FOODS.forEach(e => pushUnique(e.name));
  return result;
}

