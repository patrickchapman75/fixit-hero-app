import { supabase } from './supabaseClient';
import { toast } from 'sonner';

export interface SavedRepair {
  id: string;
  user_id: string;
  title: string;
  summary: string;
  parts_needed: string[];
  tools_needed: string[];
  steps: string[];
  created_at: string;
  updated_at: string;
}

/**
 * Save a completed repair diagnosis to the user's profile
 * @param diagnosisResult - The diagnosis result from the AI
 * @returns The saved repair object or null if failed
 */
export async function saveRepairDiagnosis(diagnosisResult: {
  title: string;
  summary: string;
  parts_needed: string[];
  tools_needed: string[];
  steps: string[];
}): Promise<SavedRepair | null> {
  try {
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in to save repairs');
      return null;
    }

    // Insert repair into database
    const { data, error } = await supabase
      .from('repairs')
      .insert({
        user_id: user.id,
        title: diagnosisResult.title,
        summary: diagnosisResult.summary,
        parts_needed: diagnosisResult.parts_needed,
        tools_needed: diagnosisResult.tools_needed,
        steps: diagnosisResult.steps,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving repair:', error);
      toast.error('Failed to save repair');
      return null;
    }

    toast.success('Repair saved to your profile!');
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('repairSaved'));

    return data as SavedRepair;
    
  } catch (error) {
    console.error('Error in saveRepairDiagnosis:', error);
    toast.error('An error occurred while saving');
    return null;
  }
}

/**
 * Get all saved repairs for the current user
 * @returns Array of saved repairs
 */
export async function getSavedRepairs(): Promise<SavedRepair[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return [];
    }

    const { data, error } = await supabase
      .from('repairs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching repairs:', error);
      return [];
    }

    return (data || []) as SavedRepair[];
    
  } catch (error) {
    console.error('Error in getSavedRepairs:', error);
    return [];
  }
}

/**
 * Delete a saved repair
 * @param repairId - The ID of the repair to delete
 * @returns true if successful, false otherwise
 */
export async function deleteRepair(repairId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error('Please sign in to delete repairs');
      return false;
    }

    const { error } = await supabase
      .from('repairs')
      .delete()
      .eq('id', repairId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting repair:', error);
      toast.error('Failed to delete repair');
      return false;
    }

    toast.success('Repair deleted');
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('repairDeleted'));

    return true;
    
  } catch (error) {
    console.error('Error in deleteRepair:', error);
    toast.error('An error occurred while deleting');
    return false;
  }
}

