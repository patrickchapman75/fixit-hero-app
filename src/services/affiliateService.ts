// Affiliate IDs - Set these in your .env file
// VITE_AMAZON_AFFILIATE_TAG
// VITE_HOMEDEPOT_AFFILIATE_ID
// VITE_LOWES_AFFILIATE_ID
// VITE_WALMART_AFFILIATE_ID

export interface AffiliateLinks {
  amazon: string;
  homeDepot: string;
  lowes: string;
  walmart: string;
}

export function generateAffiliateLinks(partName: string): AffiliateLinks {
  const encodedPart = encodeURIComponent(partName);
  
  // Get affiliate IDs from environment variables
  const amazonTag = import.meta.env.VITE_AMAZON_AFFILIATE_TAG || '';
  const homeDepotId = import.meta.env.VITE_HOMEDEPOT_AFFILIATE_ID || '';
  const lowesId = import.meta.env.VITE_LOWES_AFFILIATE_ID || '';
  const walmartId = import.meta.env.VITE_WALMART_AFFILIATE_ID || '';
  
  // Amazon affiliate link
  const amazonBase = `https://www.amazon.com/s?k=${encodedPart}`;
  const amazonLink = amazonTag 
    ? `${amazonBase}&tag=${amazonTag}`
    : amazonBase;
  
  // Home Depot affiliate link
  const homeDepotBase = `https://www.homedepot.com/s/${encodedPart}`;
  const homeDepotLink = homeDepotId
    ? `${homeDepotBase}?NCNI-5&cm_mmc=CJ-_-${homeDepotId}`
    : homeDepotBase;
  
  // Lowe's affiliate link
  const lowesBase = `https://www.lowes.com/search?searchTerm=${encodedPart}`;
  const lowesLink = lowesId
    ? `${lowesBase}&cm_mmc=${lowesId}`
    : lowesBase;
  
  // Walmart affiliate link
  const walmartBase = `https://www.walmart.com/search?q=${encodedPart}`;
  const walmartLink = walmartId
    ? `${walmartBase}&affp1=${walmartId}`
    : walmartBase;
  
  return {
    amazon: amazonLink,
    homeDepot: homeDepotLink,
    lowes: lowesLink,
    walmart: walmartLink
  };
}

