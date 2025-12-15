
export interface User {
  id: string;
  email: string;
  role: 'admin';
}

export interface ReferralFeeTier {
  minPrice: number;
  maxPrice: number;
  percentage: number;
}

export interface ReferralFee {
  id: string;
  category: string;
  nodeId?: string; 
  tiers: ReferralFeeTier[];
}

export interface ClosingFee {
  id: string;
  minPrice: number;
  maxPrice: number;
  fee: number;
  // Optional fields to allow category / node-based closing fee mappings
  category?: string;
  nodeId?: string;
  // Optional seller type: FC (Fulfilled by Amazon), SF, ES, MFN
  sellerType?: 'FC' | 'SF' | 'ES' | 'MFN';
}

export interface ShippingFee {
  id: string;
  sizeType: 'Standard' | 'Heavy' | 'Oversize';
  weightMin: number; // grams
  weightMax: number; // grams
  fee: number; // Base fee (national)
  
  // Dynamic Calculation Logic
  useIncremental?: boolean;
  incrementalFee?: number;
  incrementalStep?: number; // e.g. 1000
  
  pickAndPackFee?: number; 
}

export interface StorageFee {
  id: string;
  duration: string; // e.g., "Monthly"
  rate: number; // Cost per Cubic Foot
  description?: string;
}

export interface CategoryMap {
  id: string;
  keepaCategory: string; 
  feeCategory: string; 
}

export interface NodeMap {
  id: string;
  nodeId: string;
  feeCategoryName: string;
}

export interface RefundFee {
  id: string;
  minPrice: number;
  maxPrice: number;
  basic: number;
  standard: number;
  advanced: number;
  premium: number;
  category: 'General' | 'Apparel' | 'Shoes'; // Category type for different refund fee structures
}

export type AsinStatus = 'pending' | 'fetched' | 'calculated' | 'error';

export interface AsinItem {
  id: string;
  asin: string;
  stapleLevel: 'Standard' | 'Heavy' | 'Oversize';
  status: AsinStatus;
  errorMessage?: string;
  createdAt: string;
  
  // Product Data
  title?: string;
  categoryId?: string; 
  category?: string;
  categoryPath?: string; 
  price?: number; 
  image?: string;
  brand?: string;
  weight?: number; // grams
  volumetricWeight?: number; 
  dimensions?: string; // LxWxH cm

  // Calculation Data
  referralFee?: number;
  closingFee?: number;
  shippingFee?: number; 
  pickAndPackFee?: number; 
  storageFee?: number; 
  tax?: number; 
  totalFees?: number; 
  netRevenue?: number; 
  marginPercent?: number; 
  calculatedAt?: string;
  returnPercent?: number; // Return percentage for the product
  productCost?: number; // Landed product cost to Amazon warehouse
  profitBeforeReturns?: number; // Profit before applying return calculations
  lossPerReturn?: number; // Loss per returned unit (Amazon fees)
  adjustedNetRevenue?: number; // Net revenue after considering returns
  adjustedMarginPercent?: number; // Margin after considering returns
  stepLevel?: 'Basic' | 'Standard' | 'Advanced' | 'Premium'; // STEP level for refund fees
  returnFee?: number; // Return processing fee based on STEP level
}

export interface KeepaCategory {
  catId: number;
  name: string;
}

export interface KeepaProduct {
  asin: string;
  title: string;
  imagesCSV?: string;
  brand?: string;
  rootCategory?: number; 
  // Item Dimensions (actual product item)
  itemWeight?: number; // in grams
  itemHeight?: number;
  itemLength?: number;
  itemWidth?: number;
  // Package Dimensions (shipping/storage)
  packageWeight?: number; 
  packageHeight?: number; 
  packageLength?: number; 
  packageWidth?: number; 
  categoryTree?: KeepaCategory[]; 
  categories?: number[]; 
  // FBA & Fee information from Keepa
  fbaFees?: any;
  referralFeePercentage?: number;
  variableClosingFee?: number;
  stats?: {
    buyBoxPrice?: number;
    current?: number[];
  };
}

export interface KeepaResponse {
  products: KeepaProduct[];
  error?: {
    message: string;
  }
}
