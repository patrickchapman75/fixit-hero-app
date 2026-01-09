import { supabase } from './supabaseClient';
import { generateAffiliateLinks } from './affiliateService';

export interface MaintenancePart {
  id: string;
  name: string;
  category: 'part' | 'tool';
  affiliateLinks: {
    amazon?: string;
    homeDepot?: string;
    lowes?: string;
    walmart?: string;
  };
  estimatedCost?: number;
  lastPurchased?: number;
  purchaseFrequency?: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface PartsInventory {
  [partId: string]: {
    quantity: number;
    lastUsed: number;
    condition: 'new' | 'good' | 'worn' | 'needs_replacement';
  };
}

/**
 * Get all parts and tools for the current user
 */
export async function getUserParts(): Promise<MaintenancePart[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('maintenance_parts')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('Error fetching user parts:', error);
      return [];
    }

    return (data || []).map(part => ({
      id: part.id,
      name: part.name,
      category: part.category,
      affiliateLinks: part.affiliate_links || {},
      estimatedCost: part.estimated_cost,
      lastPurchased: part.last_purchased ? new Date(part.last_purchased).getTime() : undefined,
      purchaseFrequency: part.purchase_frequency,
      userId: part.user_id,
      createdAt: new Date(part.created_at).getTime(),
      updatedAt: new Date(part.updated_at).getTime()
    }));
  } catch (error) {
    console.error('Error in getUserParts:', error);
    return [];
  }
}

/**
 * Add a new part or tool to the user's inventory
 */
export async function addUserPart(part: Omit<MaintenancePart, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<MaintenancePart[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Generate affiliate links if not provided
    const affiliateLinks = part.affiliateLinks || generateAffiliateLinks(part.name);

    const { error } = await supabase
      .from('maintenance_parts')
      .insert({
        name: part.name,
        category: part.category,
        affiliate_links: affiliateLinks,
        estimated_cost: part.estimatedCost,
        last_purchased: part.lastPurchased ? new Date(part.lastPurchased).toISOString() : null,
        purchase_frequency: part.purchaseFrequency,
        user_id: user.id
      });

    if (error) {
      console.error('Error adding user part:', error);
      throw error;
    }

    return await getUserParts();
  } catch (error) {
    console.error('Error in addUserPart:', error);
    return await getUserParts();
  }
}

/**
 * Update an existing part or tool
 */
export async function updateUserPart(id: string, updates: Partial<MaintenancePart>): Promise<MaintenancePart[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.category) updateData.category = updates.category;
    if (updates.affiliateLinks) updateData.affiliate_links = updates.affiliateLinks;
    if (updates.estimatedCost !== undefined) updateData.estimated_cost = updates.estimatedCost;
    if (updates.lastPurchased) updateData.last_purchased = new Date(updates.lastPurchased).toISOString();
    if (updates.purchaseFrequency) updateData.purchase_frequency = updates.purchaseFrequency;

    const { error } = await supabase
      .from('maintenance_parts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating user part:', error);
      throw error;
    }

    return await getUserParts();
  } catch (error) {
    console.error('Error in updateUserPart:', error);
    return await getUserParts();
  }
}

/**
 * Delete a part or tool from the user's inventory
 */
export async function deleteUserPart(id: string): Promise<MaintenancePart[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('maintenance_parts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting user part:', error);
      throw error;
    }

    return await getUserParts();
  } catch (error) {
    console.error('Error in deleteUserPart:', error);
    return await getUserParts();
  }
}

/**
 * Mark a part as purchased (update last purchased date)
 */
export async function markPartAsPurchased(id: string): Promise<MaintenancePart[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('maintenance_parts')
      .update({
        last_purchased: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking part as purchased:', error);
      throw error;
    }

    return await getUserParts();
  } catch (error) {
    console.error('Error in markPartAsPurchased:', error);
    return await getUserParts();
  }
}

/**
 * Get parts that need to be re-purchased based on purchase frequency
 */
export async function getPartsNeedingRepurchase(): Promise<MaintenancePart[]> {
  try {
    const allParts = await getUserParts();
    const now = Date.now();

    return allParts.filter(part => {
      if (!part.lastPurchased || !part.purchaseFrequency) return false;

      const frequency = part.purchaseFrequency.toLowerCase();

      // Parse frequency and calculate next purchase date
      let monthsToAdd = 12; // Default to annual

      if (frequency.includes('every')) {
        const match = frequency.match(/every\s+(\d+)\s*(month|year)/);
        if (match) {
          const [, num, unit] = match;
          const multiplier = parseInt(num);
          monthsToAdd = unit === 'year' ? multiplier * 12 : multiplier;
        }
      } else if (frequency.includes('annual') || frequency.includes('yearly')) {
        monthsToAdd = 12;
      } else if (frequency.includes('semi-annual')) {
        monthsToAdd = 6;
      } else if (frequency.includes('quarterly')) {
        monthsToAdd = 3;
      } else if (frequency.includes('monthly')) {
        monthsToAdd = 1;
      }

      const nextPurchaseDate = part.lastPurchased + (monthsToAdd * 30 * 24 * 60 * 60 * 1000);
      return now >= nextPurchaseDate;
    });
  } catch (error) {
    console.error('Error in getPartsNeedingRepurchase:', error);
    return [];
  }
}

/**
 * Search for parts by name or category
 */
export async function searchParts(query: string, category?: 'part' | 'tool'): Promise<MaintenancePart[]> {
  try {
    const allParts = await getUserParts();
    const searchTerm = query.toLowerCase();

    return allParts.filter(part => {
      const matchesQuery = part.name.toLowerCase().includes(searchTerm);
      const matchesCategory = !category || part.category === category;
      return matchesQuery && matchesCategory;
    });
  } catch (error) {
    console.error('Error in searchParts:', error);
    return [];
  }
}

/**
 * Get recommended parts for a specific maintenance task
 */
export function getRecommendedPartsForTask(taskName: string): MaintenancePart[] {
  const taskNameLower = taskName.toLowerCase();

  // Common maintenance tasks and their recommended parts/tools
  const recommendations: { [key: string]: MaintenancePart[] } = {
    'change hvac filter': [
      {
        id: 'hvac-filter',
        name: 'HVAC Air Filter',
        category: 'part',
        affiliateLinks: {},
        estimatedCost: 25,
        purchaseFrequency: 'Every 1-3 months',
        userId: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    'clean gutters': [
      {
        id: 'gutter-guard',
        name: 'Gutter Guard Screen',
        category: 'part',
        affiliateLinks: {},
        estimatedCost: 15,
        purchaseFrequency: 'As needed',
        userId: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'ladder',
        name: 'Extension Ladder',
        category: 'tool',
        affiliateLinks: {},
        estimatedCost: 150,
        purchaseFrequency: 'As needed',
        userId: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    'test smoke detectors': [
      {
        id: '9v-battery',
        name: '9V Battery',
        category: 'part',
        affiliateLinks: {},
        estimatedCost: 8,
        purchaseFrequency: 'Every 6 months',
        userId: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    'clean dryer vent': [
      {
        id: 'dryer-vent-kit',
        name: 'Dryer Vent Cleaning Kit',
        category: 'tool',
        affiliateLinks: {},
        estimatedCost: 35,
        purchaseFrequency: 'Every 6 months',
        userId: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ],
    'seal windows and doors': [
      {
        id: 'caulk-gun',
        name: 'Caulk Gun',
        category: 'tool',
        affiliateLinks: {},
        estimatedCost: 12,
        purchaseFrequency: 'As needed',
        userId: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ]
  };

  // Find matching recommendations
  for (const [taskPattern, parts] of Object.entries(recommendations)) {
    if (taskNameLower.includes(taskPattern)) {
      return parts;
    }
  }

  return [];
}
