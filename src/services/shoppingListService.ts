import { supabase } from './supabaseClient';

export interface ShoppingListItem {
  id: string;
  issueId: string;
  issueTitle: string;
  name: string;
  completed: boolean;
  quantity: number;
  addedAt: number;
}

export interface IssueShoppingList {
  issueId: string;
  issueTitle: string;
  items: ShoppingListItem[];
  createdAt: number;
}

export async function getShoppingLists(): Promise<IssueShoppingList[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return []; // Return empty list for non-authenticated users
    }

    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching shopping lists:', error);
      return [];
    }

    // Group items by issue, handling invalid UUIDs gracefully
    const issueMap = new Map<string, IssueShoppingList>();

    (data || []).forEach(item => {
      // Handle cases where issue_id might not be a valid UUID
      let issueId = item.issue_id;
      let issueTitle = item.issue_title;

      // If issue_id is invalid or missing, use a fallback
      if (!issueId || typeof issueId !== 'string') {
        issueId = 'general_fallback';
        issueTitle = issueTitle || 'General Items';
      }

      if (!issueMap.has(issueId)) {
        issueMap.set(issueId, {
          issueId,
          issueTitle: issueTitle || 'Unnamed Issue',
          items: [],
          createdAt: new Date(item.added_at).getTime()
        });
      }

      issueMap.get(issueId)!.items.push({
        id: item.id,
        issueId: issueId,
        issueTitle: issueTitle || 'Unnamed Issue',
        name: item.name,
        completed: item.completed,
        quantity: item.quantity || 1,
        addedAt: new Date(item.added_at).getTime()
      });
    });

    return Array.from(issueMap.values()).sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error in getShoppingLists:', error);
    return [];
  }
}

// Keep the old function for backward compatibility
export async function getShoppingList(): Promise<ShoppingListItem[]> {
  const issueLists = await getShoppingLists();
  // Flatten all items from all issues
  return issueLists.flatMap(issue => issue.items);
}

export async function addToShoppingList(parts: string[]): Promise<IssueShoppingList[]> {
  // For backward compatibility, add to a general issue
  const generalIssueId = '550e8400-e29b-41d4-a716-446655440000';
  return await addToIssueShoppingList(generalIssueId, 'General Repair Items', parts);
}

export async function addToIssueShoppingList(issueId: string, issueTitle: string, parts: string[] | Array<{name: string, quantity: number}>): Promise<IssueShoppingList[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Handle both string arrays and objects with quantities
    const itemsToAdd = parts.map(part => {
      if (typeof part === 'string') {
        return { name: part.trim(), quantity: 1 };
      }
      return part;
    }).filter(item => item.name.length > 0);

    if (itemsToAdd.length === 0) {
      return await getShoppingLists();
    }

    const newItems = itemsToAdd.map(item => ({
      user_id: user.id,
      issue_id: issueId,
      issue_title: issueTitle,
      name: item.name,
      completed: false,
      quantity: item.quantity
    }));

    const { error } = await supabase
      .from('shopping_list_items')
      .insert(newItems);

    if (error) {
      // If we get a duplicate key error, try inserting items one by one
      // to skip the ones that already exist
      if (error.code === '23505') {
        console.log('Some items already exist, trying individual insertions...');
        const successfulInserts: string[] = [];

        for (const item of newItems) {
          try {
            const { error: singleError } = await supabase
              .from('shopping_list_items')
              .insert(item);

            if (!singleError) {
              successfulInserts.push(item.name);
            } else if (singleError.code !== '23505') {
              // Log non-duplicate errors
              console.error(`Error inserting ${item.name}:`, singleError);
            }
          } catch (singleError) {
            console.error(`Error inserting ${item.name}:`, singleError);
          }
        }

        if (successfulInserts.length > 0) {
          console.log(`Successfully added ${successfulInserts.length} new items:`, successfulInserts);
          // Dispatch custom event to notify other components
          window.dispatchEvent(new Event('shoppingListUpdated'));
        } else {
          console.log('No new items were added (all were duplicates)');
        }
      } else {
        console.error('Error adding to issue shopping list:', error);
      }
      return await getShoppingLists();
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('shoppingListUpdated'));

    return await getShoppingLists();
  } catch (error) {
    console.error('Error in addToIssueShoppingList:', error);
    return await getShoppingLists();
  }
}

export async function addManualShoppingListItem(name: string, quantity: number = 1, issueId?: string, issueTitle?: string): Promise<IssueShoppingList[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { error } = await supabase
      .from('shopping_list_items')
      .insert({
        user_id: user.id,
        issue_id: issueId || 'general',
        issue_title: issueTitle || 'General Items',
        name: name.trim(),
        completed: false,
        quantity: quantity
      });

    if (error) {
      console.error('Error adding manual shopping list item:', error);
      return await getShoppingLists();
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('shoppingListUpdated'));

    return await getShoppingLists();
  } catch (error) {
    console.error('Error in addManualShoppingListItem:', error);
    return await getShoppingLists();
  }
}

export async function updateShoppingListItemQuantity(id: string, quantity: number): Promise<IssueShoppingList[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { error } = await supabase
      .from('shopping_list_items')
      .update({
        quantity: Math.max(1, quantity), // Ensure quantity is at least 1
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating shopping list item quantity:', error);
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('shoppingListUpdated'));

    return await getShoppingLists();
  } catch (error) {
    console.error('Error in updateShoppingListItemQuantity:', error);
    return await getShoppingLists();
  }
}

export async function toggleShoppingListItem(id: string): Promise<IssueShoppingList[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    // Get current item state
    const issueLists = await getShoppingLists();
    const allItems = issueLists.flatMap(issue => issue.items);
    const item = allItems.find(i => i.id === id);
    if (!item) {
      return issueLists;
    }

    const { error } = await supabase
      .from('shopping_list_items')
      .update({
        completed: !item.completed,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error toggling shopping list item:', error);
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('shoppingListUpdated'));

    return await getShoppingLists();
  } catch (error) {
    console.error('Error in toggleShoppingListItem:', error);
    return await getShoppingLists();
  }
}

export async function removeShoppingListItem(id: string): Promise<IssueShoppingList[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing shopping list item:', error);
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('shoppingListUpdated'));

    return await getShoppingLists();
  } catch (error) {
    console.error('Error in removeShoppingListItem:', error);
    return await getShoppingLists();
  }
}

export async function clearCompletedItems(): Promise<IssueShoppingList[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('user_id', user.id)
      .eq('completed', true);

    if (error) {
      console.error('Error clearing completed items:', error);
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('shoppingListUpdated'));

    return await getShoppingLists();
  } catch (error) {
    console.error('Error in clearCompletedItems:', error);
    return await getShoppingLists();
  }
}

