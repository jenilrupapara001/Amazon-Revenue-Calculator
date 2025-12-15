
import { db } from './db';
import { AsinItem, KeepaResponse, ReferralFee, RefundFee } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to calculate return fee based on price and STEP level
const calculateReturnFee = (price: number, stepLevel: string, category: string, refundFees: RefundFee[]): number => {
  try {
    // Validate inputs
    if (!price || price <= 0 || !refundFees || refundFees.length === 0) return 0;

    // Find the appropriate price range
    const priceRange = refundFees.find(rf => price >= rf.minPrice && price <= rf.maxPrice);
    if (!priceRange) return 0;

    // Determine refund fee category: Shoes have their own table, Apparel/Clothing share apparel table, otherwise General
    const cat = (category || '').toLowerCase();
    let feeCategory: RefundFee['category'] = 'General';
    if (cat.includes('shoes') || cat.includes('footwear')) {
      feeCategory = 'Shoes';
    } else if (cat.includes('apparel') || cat.includes('clothing')) {
      feeCategory = 'Apparel';
    }

    const applicableFee = refundFees.find(rf =>
      rf.category === feeCategory &&
      price >= rf.minPrice && price <= rf.maxPrice
    );
    
    if (!applicableFee) return 0;

    // Get the appropriate fee based on STEP level
    switch (stepLevel) {
      case 'Basic': return applicableFee.basic || 0;
      case 'Standard': return applicableFee.standard || 0;
      case 'Advanced': return applicableFee.advanced || 0;
      case 'Premium': return applicableFee.premium || 0;
      default: return applicableFee.standard || 0;
    }
  } catch (error) {
    console.error('Error calculating return fee:', error);
    return 0;
  }
};

const calculateMatchScore = (ruleCat: string, itemPath: string): number => {
  try {
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const stopWords = ['and', 'for', 'the', 'products', 'other', 'supplies', 'accessories'];
    const ruleTokens = clean(ruleCat).split(/\s+/).filter(t => t.length > 2 && !stopWords.includes(t));
    const pathTokens = clean(itemPath).split(/\s+/);

    if (ruleTokens.length === 0) return 0;

    let matches = 0;
    for (const token of ruleTokens) {
        if (pathTokens.some(pt => pt === token)) {
            matches += 1;
        } else if (pathTokens.some(pt => pt.includes(token) || token.includes(pt))) {
            matches += 0.8;
        }
    }
    return matches / ruleTokens.length;
  } catch (error) {
    console.error('Error calculating match score:', error);
    return 0;
  }
};

export const fetchKeepaData = async (asins: AsinItem[], forceRefresh: boolean = false) => {
  // Logic: If forceRefresh is true, fetch ALL. If false, fetch ONLY pending or error.
  const targets = forceRefresh 
    ? asins 
    : asins.filter(a => a.status === 'pending' || a.status === 'error');

  if (targets.length === 0) return;

  const apiKey = db.getKeepaKey().trim();
  if (!apiKey) {
    console.warn("Skipping Keepa Fetch: Missing API Key.");
    return;
  }

  const chunkSize = 100;
  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    const validAsins = chunk.map(a => a.asin.trim()).filter(a => /^[A-Z0-9]{10}$/i.test(a));
    
    if (validAsins.length === 0) {
        for (const item of chunk) await db.updateAsin(item.id, { status: 'error', errorMessage: 'Invalid ASIN format' });
        continue;
    }

    const asinList = validAsins.join(',');
    let attempts = 0;
    const maxAttempts = 5;
    let success = false;

    console.log(`[Keepa] Fetching chunk ${i / chunkSize + 1} (${validAsins.length} items): ${asinList}`);

    while (attempts < maxAttempts && !success) {
      try {
        // Request all relevant fields for FBA calculations: product info, pricing, dimensions, weight, offers
        const url = `https://api.keepa.com/product?key=${apiKey}&domain=10&asin=${asinList}&stats=1&history=0&offersSuccessful=1`;
        const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });

        if (response.status === 429) {
           attempts++;
           const waitTime = 5000 * Math.pow(2, attempts); 
           await delay(waitTime);
           continue;
        }

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const textResponse = await response.text();
        const data: KeepaResponse = JSON.parse(textResponse);

        if (data.error) {
           if (data.error.message && data.error.message.toLowerCase().includes('token')) {
               attempts++;
               const waitTime = 5000 * Math.pow(2, attempts);
               await delay(waitTime); 
               continue;
           }
           throw new Error(data.error.message);
        }

        const products = data.products || [];
        for (const item of chunk) {
          const product = products.find(p => p.asin.toUpperCase() === item.asin.toUpperCase());
          
          if (product) {
              let rawPrice = -1;
              const stats = product.stats;
              if (stats && stats.current) {
                  const buyBox = stats.buyBoxPrice; 
                  const newPrice = stats.current[1]; 
                  const amazonPrice = stats.current[0]; 
                  if (typeof buyBox === 'number' && buyBox > 0) rawPrice = buyBox;
                  else if (typeof newPrice === 'number' && newPrice > 0) rawPrice = newPrice;
                  else if (typeof amazonPrice === 'number' && amazonPrice > 0) rawPrice = amazonPrice;
              }

              const price = rawPrice > 0 ? rawPrice / 100 : 0;
              
              // For FBA fees: packageWeight (what seller ships) is most important, not itemWeight
              // Amazon charges FBA fees based on package weight (including packaging)
              const itemWeight = product.itemWeight || 0;
              const packageWeight = product.packageWeight || 0;
              
              // Use package dimensions (shipping box) for volumetric calculation
              const l = product.packageLength || 0;
              const w = product.packageWidth || 0;
              const h = product.packageHeight || 0;
              // Convert mm to cm for clarity: divide by 10
              const lCm = l / 10;
              const wCm = w / 10;
              const hCm = h / 10;
              // Volumetric weight: (L cm × W cm × H cm) / 5000
              const volumetricWeight = Math.round((lCm * wCm * hCm) / 5000);
              
              // Priority for FBA fees: packageWeight > volumetric (item weight is for reference only)
              let finalWeight = 0;
              if (packageWeight > 0) finalWeight = packageWeight;
              else finalWeight = volumetricWeight;

              const title = product.title || `ASIN ${item.asin}`;
              const brand = product.brand || 'Unknown';
              const image = product.imagesCSV ? `https://images-na.ssl-images-amazon.com/images/I/${product.imagesCSV.split(',')[0]}` : '';

              let category = 'Uncategorized';
              let categoryPath = '';
              let categoryId = '';

              // Capture category ID specifically
              // We want the LEAF node for specific fee mapping, but store the full path for context.
              if (product.categoryTree && product.categoryTree.length > 0) {
                  const leaf = product.categoryTree[product.categoryTree.length - 1];
                  category = leaf.name; // Use Leaf name (e.g. "De-Scalers") instead of Root (e.g. "Health")
                  categoryPath = product.categoryTree.map(c => c.name).join(' > ');
                  categoryId = String(leaf.catId);
              } else if (product.categories && product.categories.length > 0) {
                 // Fallback if Tree is missing but categories array exists
                 categoryId = String(product.categories[product.categories.length - 1]);
              }

              // Extract Keepa's own FBA fee estimates for reference (optional)
              const keepaFbaFees = product.fbaFees ? { ...product.fbaFees } : null;
              const keepaRefFeePercent = product.referralFeePercentage ? product.referralFeePercentage : null;
              const keepaVarClosingFee = product.variableClosingFee ? product.variableClosingFee : null;

              await db.updateAsin(item.id, {
                  title, brand, category, categoryPath, categoryId, image, price,
                  weight: finalWeight, volumetricWeight,
                  dimensions: `${lCm.toFixed(1)}x${wCm.toFixed(1)}x${hCm.toFixed(1)} cm`,
                  status: 'fetched'
              });
          } else {
              await db.updateAsin(item.id, { status: 'error', errorMessage: 'ASIN not found in Keepa return data' });
          }
        }
        success = true; 
      } catch (error: any) {
        if (error.message.includes('403') || error.message.includes('key')) {
             for (const item of chunk) await db.updateAsin(item.id, { status: 'error', errorMessage: 'Invalid API Key' });
             return; 
        }
        attempts++;
        await delay(5000); 
        if (attempts >= maxAttempts) {
            for (const item of chunk) await db.updateAsin(item.id, { status: 'error', errorMessage: error.message });
        }
      }
    }
    await delay(2000);
  }
};

export const calculateProfits = async (asins: AsinItem[]) => {
  try {
    console.log('[FeeCalc] Starting calculation for', asins.length, 'items');
    
    // First, update any products missing STEP levels
    await db.updateMissingStepLevels();
    
    const referralFees = await db.getReferralFees();
    const closingFees = await db.getClosingFees();
    const shippingFees = await db.getShippingFees();
    const storageFees = await db.getStorageFees();
    const categoryMappings = await db.getCategoryMappings();
    const nodeMaps = await db.getNodeMaps(); // Fetch node mappings
    const refundFees = await db.getRefundFees(); // Fetch refund fees
    const GST_RATE = 0.18;

    console.log('[FeeCalc] Fee data loaded:', {
      referralFees: referralFees.length,
      closingFees: closingFees.length,
      shippingFees: shippingFees.length,
      storageFees: storageFees.length,
      categoryMappings: categoryMappings.length,
      nodeMaps: nodeMaps.length,
      refundFees: refundFees.length
    });

    const targetAsins = asins.filter(a => a.status === 'fetched' || a.status === 'calculated');
    console.log('[FeeCalc] Processing', targetAsins.length, 'target items');

    for (const item of targetAsins) {
      try {
        const price = Number(item.price) || 0;
        const weight = Number(item.weight) || 0; 
        
        if (price <= 0) {
            await db.updateAsin(item.id, { status: 'error', errorMessage: 'Price is 0 or invalid', totalFees: 0, netRevenue: 0, marginPercent: 0 });
            continue;
        }

        // 1. Referral Fees Logic (Strict Priority: Node Map > ReferralFee.nodeId > Category Map > Name)
        let refRule: ReferralFee | undefined = undefined;
        const itemNodeId = item.categoryId ? String(item.categoryId).trim() : '';

        // A. Node Map (New - Highest Priority)
        if (itemNodeId) {
            const nodeMapping = nodeMaps.find(m => String(m.nodeId).trim() === itemNodeId);
            if (nodeMapping) {
                refRule = referralFees.find(r => r.category.toLowerCase() === nodeMapping.feeCategoryName.toLowerCase());
                 if (refRule) console.log(`[FeeCalc] Match by NodeMap: ${item.asin} -> ${refRule.category}`);
            }
        }

        // B. Direct Node ID Match (ReferralFee property)
        if (!refRule && itemNodeId) {
            refRule = referralFees.find(r => r.nodeId && String(r.nodeId).trim() === itemNodeId);
            if (refRule) {
                console.log(`[FeeCalc] Match by ReferralFee.nodeId: ${item.asin} -> ${refRule.category}`);
            }
        }

        // C. Category Mapping (Keepa Name -> Fee Name)
        if (!refRule) {
            const itemCat = (item.category || '').toLowerCase();
            const itemPath = (item.categoryPath || itemCat).toLowerCase();
            const mapping = categoryMappings.find(m => itemPath.includes(m.keepaCategory.toLowerCase()) || itemCat === m.keepaCategory.toLowerCase());
            if (mapping) {
                refRule = referralFees.find(r => r.category.toLowerCase() === mapping.feeCategory.toLowerCase());
            }
        }

        // D. Name Match (Fallback)
        if (!refRule) {
            const itemCat = (item.category || '').toLowerCase();
            const itemPath = (item.categoryPath || itemCat).toLowerCase();
            
            // Exact name match (item.category is now Leaf Name)
            refRule = referralFees.find(r => r.category.toLowerCase() === itemCat);
            
            // Fuzzy Score match against Path
            if (!refRule) {
                let bestScore = 0; let bestRule = null;
                for (const r of referralFees) {
                     const score = calculateMatchScore(r.category, itemPath);
                     if (score > bestScore) { bestScore = score; bestRule = r; }
                }
                if (bestScore >= 0.4) refRule = bestRule as any;
            }

            // Hardcoded Fallbacks
            if (!refRule) {
                 if (itemPath.includes('book')) refRule = referralFees.find(r => r.category === 'Books');
                 else if (itemPath.includes('mobile')) refRule = referralFees.find(r => r.category === 'Mobile Phones');
            }
        }

        let referralFee = 0;
        if (refRule && refRule.tiers && Array.isArray(refRule.tiers)) {
            const sortedTiers = [...refRule.tiers].sort((a, b) => a.minPrice - b.minPrice);
            const tier = sortedTiers.find(t => price >= t.minPrice && price <= t.maxPrice);
            if (tier && typeof tier.percentage === 'number' && !isNaN(tier.percentage)) {
                referralFee = Number((price * (tier.percentage / 100)).toFixed(2));
            } else {
                const lastTier = sortedTiers[sortedTiers.length - 1];
                if (lastTier && typeof lastTier.percentage === 'number' && !isNaN(lastTier.percentage) && price > lastTier.maxPrice) {
                    referralFee = Number((price * (lastTier.percentage / 100)).toFixed(2));
                }
            }
        }

        // 2. Closing Fees (Category-aware: NodeMap > ClosingFee.nodeId > CategoryMapping > Name > Price Tiers)
        let closingFee = 0;
        let matchedClosing: any = undefined;

        // Helper: prefer FC sellerType if present among candidates
        const findBestMatch = (candidates: any[], priceVal: number) => {
            if (!candidates || candidates.length === 0) return undefined;
            // Prefer candidates explicitly marked as FC
            const fcCandidates = candidates.filter(c => c.sellerType && String(c.sellerType).toUpperCase() === 'FC');
            const pool = fcCandidates.length > 0 ? fcCandidates : candidates;
            const byRange = pool.find(c => priceVal >= c.minPrice && priceVal <= c.maxPrice);
            return byRange || pool[pool.length - 1];
        };

        const itemCat = (item.category || '').toLowerCase();
        const itemPath = (item.categoryPath || itemCat).toLowerCase();

        // A. NodeMap (highest priority)
        if (itemNodeId) {
            const nodeMapping = nodeMaps.find(m => String(m.nodeId).trim() === itemNodeId);
            if (nodeMapping) {
                const candidates = closingFees.filter(c => c.category && c.category.toLowerCase() === nodeMapping.feeCategoryName.toLowerCase());
                if (candidates.length > 0) {
                    matchedClosing = findBestMatch(candidates, price);
                    if (matchedClosing) console.log(`[FeeCalc] Closing match by NodeMap: ${item.asin} -> ${matchedClosing.category}`);
                }
            }
        }

        // B. Direct ClosingFee.nodeId
        if (!matchedClosing && itemNodeId) {
            const candidates = closingFees.filter(c => c.nodeId && String(c.nodeId).trim() === itemNodeId);
            if (candidates.length > 0) {
                matchedClosing = findBestMatch(candidates, price);
                if (matchedClosing) console.log(`[FeeCalc] Closing match by ClosingFee.nodeId: ${item.asin} -> ${matchedClosing.nodeId}`);
            }
        }

        // C. Category Mapping (Keepa Name -> Fee Name)
        if (!matchedClosing) {
            const mapping = categoryMappings.find(m => itemPath.includes(m.keepaCategory.toLowerCase()) || itemCat === m.keepaCategory.toLowerCase());
            if (mapping) {
                const candidates = closingFees.filter(c => c.category && c.category.toLowerCase() === mapping.feeCategory.toLowerCase());
                if (candidates.length > 0) {
                    matchedClosing = findBestMatch(candidates, price);
                    if (matchedClosing) console.log(`[FeeCalc] Closing match by CategoryMapping: ${item.asin} -> ${matchedClosing.category}`);
                }
            }
        }

        // D. Name Match (fallback)
        if (!matchedClosing) {
            const nameCandidates = closingFees.filter(c => c.category && c.category.toLowerCase() === itemCat);
            if (nameCandidates.length > 0) {
                matchedClosing = findBestMatch(nameCandidates, price);
            } else {
                // Fuzzy match against closing fee category names
                let bestScore = 0; let bestRule: any = null;
                for (const c of closingFees) {
                    if (!c.category) continue;
                    const score = calculateMatchScore(c.category, itemPath);
                    if (score > bestScore) { bestScore = score; bestRule = c; }
                }
                if (bestScore >= 0.4) matchedClosing = bestRule;
            }
        }

        // E. Price-tier fallback (original behavior)
        if (!matchedClosing) {
            matchedClosing = findBestMatch(closingFees, price);
        }

        if (matchedClosing && typeof matchedClosing.fee === 'number' && !isNaN(matchedClosing.fee)) {
            closingFee = matchedClosing.fee;
        }
        // historical fallback: if still not found and price > 1000, use 51
        if (!matchedClosing && price > 1000) closingFee = 51;

        // 3. Weight Handling & Pick Pack (Dynamic Logic)
        const sizeType = (item.stapleLevel || 'Standard');
        const normalizedSizeType = sizeType.charAt(0).toUpperCase() + sizeType.slice(1).toLowerCase();
        
        const relevantFees = shippingFees
            .filter(f => f.sizeType.toLowerCase() === normalizedSizeType.toLowerCase())
            .sort((a, b) => a.weightMin - b.weightMin);

        let weightHandlingFee = 0;
        let pickAndPackFee = 0;

        let match = relevantFees.find(f => weight <= f.weightMax && weight >= f.weightMin);
        
        if (!match && relevantFees.length > 0) {
            const last = relevantFees[relevantFees.length - 1];
            if (weight > last.weightMax) {
                 match = last;
            }
        }

        if (match) {
            weightHandlingFee = Number(match.fee) || 0;
            pickAndPackFee = Number(match.pickAndPackFee) || 0;

            if (match.useIncremental && match.incrementalStep && match.incrementalFee) {
                 const threshold = match.weightMin - 1;
                 const extraWeight = Math.max(0, weight - threshold);
                 const multipliers = Math.ceil(extraWeight / match.incrementalStep);
                 weightHandlingFee += multipliers * match.incrementalFee;
            }
        }

        const fulfilmentCost = weightHandlingFee + pickAndPackFee;

        // 4. Storage Cost (Dynamic)
        let calculatedStorageFee = 0;
        if (item.dimensions) {
            try {
                const parts = item.dimensions.replace(/[^0-9.x]/g, '').split('x').map(Number);
                if (parts.length === 3 && !parts.some(isNaN)) {
                    const [l, w, h] = parts; 
                    // Prevent division by zero
                    if (l > 0 && w > 0 && h > 0) {
                        const volCft = (l * w * h) / 28316.8; 
                        
                        // Find rate
                        const storageRate = storageFees.length > 0 ? Number(storageFees[0].rate) : 45;
                        calculatedStorageFee = Number((volCft * storageRate).toFixed(2));
                        if (calculatedStorageFee < 1) calculatedStorageFee = 1; 
                    }
                }
            } catch (error) {
                console.error('[FeeCalc] Error calculating storage fee for item', item.asin, ':', error);
            }
        } else {
            // Fallback if dimensions missing
            calculatedStorageFee = sizeType.toLowerCase() === 'standard' ? 5 : 20;
        }

        // 5. Other Cost (Tax)
        const otherCost = Number(((referralFee + closingFee + fulfilmentCost) * GST_RATE).toFixed(2));

        // 6. Net Profit
        const totalDeductions = Number((referralFee + closingFee + fulfilmentCost + calculatedStorageFee + otherCost).toFixed(2));
        const netProfit = Number((price - totalDeductions).toFixed(2));
        const netMargin = price > 0 ? Number(((netProfit / price) * 100).toFixed(2)) : 0;

        // Calculate return fee based on STEP level (exclude referral fees from return cost)
        // Ensure all products have a STEP level for return fee calculation
        const stepLevel = item.stepLevel || 'Standard';
        const refundProcessingFee = calculateReturnFee(price, stepLevel, item.category || '', refundFees);
        
        // Calculate return processing cost (exclude referral fees from return cost)
        // Return cost includes: closing + shipping + pick & pack + storage + GST + refund processing fee
        const returnCostExcludingReferral = Number((closingFee + weightHandlingFee + pickAndPackFee + calculatedStorageFee + otherCost + refundProcessingFee).toFixed(2));
        
        console.log(`[FeeCalc] Return fee calc for ${item.asin}:`, {
          price,
          stepLevel,
          category: item.category,
          refundProcessingFee,
          returnCostExcludingReferral,
          refundFeesCount: refundFees.length
        });

        await db.updateAsin(item.id, {
          referralFee, closingFee, shippingFee: weightHandlingFee, pickAndPackFee, storageFee: calculatedStorageFee,
          tax: otherCost, totalFees: totalDeductions, netRevenue: netProfit, marginPercent: netMargin,
          stepLevel: stepLevel, // Ensure STEP level is saved/updated
          returnFee: refundProcessingFee, // returnFee should reflect only the refund processing component
          lossPerReturn: returnCostExcludingReferral,
          status: 'calculated', calculatedAt: new Date().toISOString()
        });
      } catch (itemError) {
        console.error(`[FeeCalc] Error calculating item ${item.asin}:`, itemError);
        await db.updateAsin(item.id, { 
          status: 'error', 
          errorMessage: `Calculation failed: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`,
          totalFees: 0, 
          netRevenue: 0, 
          marginPercent: 0 
        });
      }
    }
    
    console.log('[FeeCalc] Calculation completed');
  } catch (error) {
    console.error('[FeeCalc] Critical error in calculateProfits:', error);
    throw error; // Re-throw to be caught by the UI handler
  }
};
