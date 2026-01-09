import { supabase } from './supabaseClient';
import { getRecommendedPartsForTask } from './partsService';

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
  purchaseFrequency?: string; // e.g., "Every 6 months", "As needed"
}

export interface MaintenanceHistory {
  completedAt: number;
  notes: string;
  partsUsed: MaintenancePart[];
  toolsUsed: MaintenancePart[];
  totalCost?: number;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  frequency: string; // e.g., "Every 3 months", "Monthly", "Annually"
  completed: boolean;
  lastCompleted: number | null; // timestamp
  nextDue: number | null; // calculated next due date
  status: 'upcoming' | 'due' | 'overdue' | 'completed';
  history: MaintenanceHistory[];
  createdAt: number;
  recommendedParts: MaintenancePart[]; // Parts typically needed for this task
  recommendedTools: MaintenancePart[]; // Tools typically needed for this task
}

// Common parts and tools used in maintenance
const COMMON_PARTS: MaintenancePart[] = [
  {
    id: 'hvac-filter',
    name: 'HVAC Air Filter',
    category: 'part',
    affiliateLinks: {},
    estimatedCost: 25,
    purchaseFrequency: 'Every 1-3 months'
  },
  {
    id: 'gutter-screen',
    name: 'Gutter Guard Screen',
    category: 'part',
    affiliateLinks: {},
    estimatedCost: 15,
    purchaseFrequency: 'As needed'
  },
  {
    id: 'smoke-detector-battery',
    name: '9V Battery',
    category: 'part',
    affiliateLinks: {},
    estimatedCost: 8,
    purchaseFrequency: 'Every 6 months'
  },
  {
    id: 'dryer-vent-cleaning-kit',
    name: 'Dryer Vent Cleaning Kit',
    category: 'tool',
    affiliateLinks: {},
    estimatedCost: 35,
    purchaseFrequency: 'Every 6 months'
  },
  {
    id: 'caulk-gun',
    name: 'Caulk Gun',
    category: 'tool',
    affiliateLinks: {},
    estimatedCost: 12,
    purchaseFrequency: 'As needed'
  },
  {
    id: 'ladder',
    name: 'Extension Ladder',
    category: 'tool',
    affiliateLinks: {},
    estimatedCost: 150,
    purchaseFrequency: 'As needed'
  }
];

const INITIAL_TASKS: MaintenanceTask[] = [
  {
    id: '1',
    title: 'Change HVAC Filter',
    frequency: 'Every 1-3 months',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'due',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [COMMON_PARTS.find(p => p.id === 'hvac-filter')].filter(Boolean),
    recommendedTools: []
  },
  {
    id: '2',
    title: 'Clean Gutters',
    frequency: 'Spring & Fall',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [COMMON_PARTS.find(p => p.id === 'gutter-screen')].filter(Boolean),
    recommendedTools: [COMMON_PARTS.find(p => p.id === 'ladder')].filter(Boolean)
  },
  {
    id: '3',
    title: 'Test Smoke Detectors',
    frequency: 'Monthly',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [COMMON_PARTS.find(p => p.id === 'smoke-detector-battery')].filter(Boolean),
    recommendedTools: []
  },
  {
    id: '4',
    title: 'Inspect Water Heater',
    frequency: 'Every 6 months',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: []
  },
  {
    id: '5',
    title: 'Check for Water Leaks',
    frequency: 'Monthly',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: []
  },
  {
    id: '6',
    title: 'Service HVAC System',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: []
  },
  {
    id: '7',
    title: 'Clean Dryer Vent',
    frequency: 'Every 6 months',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: [COMMON_PARTS.find(p => p.id === 'dryer-vent-cleaning-kit')].filter(Boolean)
  },
  {
    id: '8',
    title: 'Inspect Roof Shingles',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: [COMMON_PARTS.find(p => p.id === 'ladder')].filter(Boolean)
  },
  {
    id: '9',
    title: 'Seal Windows and Doors',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: [COMMON_PARTS.find(p => p.id === 'caulk-gun')].filter(Boolean)
  },
  {
    id: '10',
    title: 'Test GFCI Outlets',
    frequency: 'Monthly',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: []
  },
  {
    id: '11',
    title: 'Flush Water Heater',
    frequency: 'Every 6 months',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: []
  },
  {
    id: '12',
    title: 'Inspect Foundation',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    nextDue: null,
    status: 'upcoming',
    history: [],
    createdAt: Date.now(),
    recommendedParts: [],
    recommendedTools: []
  },
];

export async function getMaintenanceTasks(): Promise<MaintenanceTask[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return INITIAL_TASKS; // Return defaults for non-authenticated users
    }

    // Fetch tasks from Supabase
    const { data: tasks, error: tasksError } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching maintenance tasks:', tasksError);
      return INITIAL_TASKS;
    }

    // Fetch history for each task
    const tasksWithHistory = await Promise.all(
      (tasks || []).map(async (task) => {
        const { data: history, error: historyError } = await supabase
          .from('maintenance_history')
          .select('*')
          .eq('task_id', task.id)
          .order('completed_at', { ascending: false });

        if (historyError) {
          console.error('Error fetching task history:', historyError);
        }

        const lastCompleted = task.last_completed ? new Date(task.last_completed).getTime() : null;
        const nextDue = calculateNextDue(lastCompleted, task.frequency);
        const status = calculateTaskStatus(nextDue, task.completed);

        return {
          id: task.id,
          title: task.title,
          frequency: task.frequency,
          completed: task.completed,
          lastCompleted,
          nextDue,
          status,
          history: (history || []).map(h => ({
            completedAt: new Date(h.completed_at).getTime(),
            notes: h.notes || '',
            partsUsed: h.parts_used || [],
            toolsUsed: h.tools_used || [],
            totalCost: h.total_cost
          })),
          createdAt: new Date(task.created_at).getTime(),
          recommendedParts: getRecommendedPartsForTask(task.title).filter(p => p.category === 'part'),
          recommendedTools: getRecommendedPartsForTask(task.title).filter(p => p.category === 'tool')
        };
      })
    );

    return tasksWithHistory.length > 0 ? tasksWithHistory : INITIAL_TASKS;
  } catch (error) {
    console.error('Error in getMaintenanceTasks:', error);
    return INITIAL_TASKS;
  }
}

async function saveMaintenanceTaskToSupabase(task: MaintenanceTask): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('maintenance_tasks')
    .upsert({
      id: task.id,
      user_id: user.id,
      title: task.title,
      frequency: task.frequency,
      completed: task.completed,
      last_completed: task.lastCompleted ? new Date(task.lastCompleted).toISOString() : null,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error saving maintenance task:', error);
  }
}

export async function addMaintenanceTask(title: string, frequency: string): Promise<MaintenanceTask[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const newTask: MaintenanceTask = {
      id: crypto.randomUUID(),
      title,
      frequency,
      completed: false,
      lastCompleted: null,
      history: [],
      createdAt: Date.now()
    };

    // Save to Supabase
    const { error } = await supabase
      .from('maintenance_tasks')
      .insert({
        id: newTask.id,
        user_id: user.id,
        title: newTask.title,
        frequency: newTask.frequency,
        completed: newTask.completed,
        last_completed: null
      });

    if (error) {
      console.error('Error adding maintenance task:', error);
      throw error;
    }

    // Return updated list
    return await getMaintenanceTasks();
  } catch (error) {
    console.error('Error in addMaintenanceTask:', error);
    // Return current tasks if there's an error
    return await getMaintenanceTasks();
  }
}

export async function updateMaintenanceTask(
  id: string,
  updates: Partial<MaintenanceTask>
): Promise<MaintenanceTask[]> {
  try {
    await saveMaintenanceTaskToSupabase({ id, ...updates } as MaintenanceTask);
    return await getMaintenanceTasks();
  } catch (error) {
    console.error('Error in updateMaintenanceTask:', error);
    return await getMaintenanceTasks();
  }
}

export async function completeMaintenanceTask(
  id: string,
  notes: string,
  partsUsed: string[],
  toolsUsed?: MaintenancePart[]
): Promise<MaintenanceTask[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date();

    // Add history entry - handle both string array and MaintenancePart array formats
    let partsUsedData: any = null;
    if (partsUsed && partsUsed.length > 0) {
      // Legacy support: if partsUsed is string array, convert to simple format
      if (typeof partsUsed[0] === 'string') {
        partsUsedData = partsUsed.filter(p => p.trim().length > 0);
      } else {
        // New format: MaintenancePart objects
        partsUsedData = (partsUsed as MaintenancePart[]).map(part => ({
          id: part.id,
          name: part.name,
          category: part.category,
          affiliateLinks: part.affiliateLinks,
          estimatedCost: part.estimatedCost
        }));
      }
    }

    const historyData: any = {
      task_id: id,
      user_id: user.id,
      completed_at: now.toISOString(),
      notes: notes.trim() || null,
      parts_used: partsUsedData
    };

    // Add tools_used if provided
    if (toolsUsed && toolsUsed.length > 0) {
      historyData.tools_used = toolsUsed.map(tool => ({
        id: tool.id,
        name: tool.name,
        category: tool.category,
        affiliateLinks: tool.affiliateLinks,
        estimatedCost: tool.estimatedCost
      }));
    }

    const { error: historyError } = await supabase
      .from('maintenance_history')
      .insert(historyData);

    if (historyError) {
      console.error('Error adding maintenance history:', historyError);
    }

    // Update task
    const { error: taskError } = await supabase
      .from('maintenance_tasks')
      .update({
        completed: true,
        last_completed: now.toISOString(),
        updated_at: now.toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (taskError) {
      console.error('Error completing maintenance task:', taskError);
    }

    return await getMaintenanceTasks();
  } catch (error) {
    console.error('Error in completeMaintenanceTask:', error);
    return await getMaintenanceTasks();
  }
}

export async function uncompleteMaintenanceTask(id: string): Promise<MaintenanceTask[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('maintenance_tasks')
      .update({
        completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error uncompleting maintenance task:', error);
    }

    return await getMaintenanceTasks();
  } catch (error) {
    console.error('Error in uncompleteMaintenanceTask:', error);
    return await getMaintenanceTasks();
  }
}

export async function deleteMaintenanceTask(id: string): Promise<MaintenanceTask[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('maintenance_tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting maintenance task:', error);
    }

    return await getMaintenanceTasks();
  } catch (error) {
    console.error('Error in deleteMaintenanceTask:', error);
    return await getMaintenanceTasks();
  }
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/**
 * Parse frequency string and calculate next due date
 */
export function calculateNextDue(lastCompleted: number | null, frequency: string): number {
  if (!lastCompleted) return Date.now(); // Due immediately if never completed

  const lastDate = new Date(lastCompleted);
  const frequencyLower = frequency.toLowerCase();

  // Handle different frequency patterns
  if (frequencyLower.includes('every')) {
    const match = frequencyLower.match(/every\s+(\d+)\s*(month|week|day|year)/);
    if (match) {
      const [, num, unit] = match;
      const multiplier = parseInt(num);

      switch (unit) {
        case 'day':
          return lastDate.getTime() + (multiplier * 24 * 60 * 60 * 1000);
        case 'week':
          return lastDate.getTime() + (multiplier * 7 * 24 * 60 * 60 * 1000);
        case 'month':
          const nextMonth = new Date(lastDate);
          nextMonth.setMonth(nextMonth.getMonth() + multiplier);
          return nextMonth.getTime();
        case 'year':
          const nextYear = new Date(lastDate);
          nextYear.setFullYear(nextYear.getFullYear() + multiplier);
          return nextYear.getTime();
      }
    }
  }

  // Handle specific seasonal frequencies
  if (frequencyLower.includes('spring') && frequencyLower.includes('fall')) {
    const currentMonth = new Date().getMonth();
    if (currentMonth < 3) return new Date(new Date().getFullYear(), 2, 20).getTime(); // March 20 (Spring)
    if (currentMonth < 9) return new Date(new Date().getFullYear(), 8, 22).getTime(); // September 22 (Fall)
    return new Date(new Date().getFullYear() + 1, 2, 20).getTime(); // Next spring
  }

  // Handle monthly frequencies
  if (frequencyLower.includes('monthly')) {
    const nextMonth = new Date(lastDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.getTime();
  }

  // Handle annual frequencies
  if (frequencyLower.includes('annual') || frequencyLower.includes('yearly')) {
    const nextYear = new Date(lastDate);
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.getTime();
  }

  // Handle weekly frequencies
  if (frequencyLower.includes('weekly')) {
    return lastDate.getTime() + (7 * 24 * 60 * 60 * 1000);
  }

  // Default to 6 months if pattern not recognized
  const defaultNext = new Date(lastDate);
  defaultNext.setMonth(defaultNext.getMonth() + 6);
  return defaultNext.getTime();
}

/**
 * Calculate maintenance task status based on next due date
 */
export function calculateTaskStatus(nextDue: number | null, completed: boolean): 'upcoming' | 'due' | 'overdue' | 'completed' {
  if (completed) return 'completed';
  if (!nextDue) return 'due';

  const now = Date.now();
  const daysUntilDue = Math.floor((nextDue - now) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) return 'overdue';
  if (daysUntilDue <= 7) return 'due'; // Due within a week
  return 'upcoming';
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status: 'upcoming' | 'due' | 'overdue' | 'completed'): string {
  switch (status) {
    case 'overdue': return 'text-red-400';
    case 'due': return 'text-yellow-400';
    case 'upcoming': return 'text-green-400';
    case 'completed': return 'text-blue-400';
    default: return 'text-slate-400';
  }
}

/**
 * Get status icon for UI display
 */
export function getStatusIcon(status: 'upcoming' | 'due' | 'overdue' | 'completed'): string {
  switch (status) {
    case 'overdue': return '⚠️';
    case 'due': return '🔔';
    case 'upcoming': return '📅';
    case 'completed': return '✅';
    default: return '📋';
  }
}

/**
 * Format due date for display
 */
export function formatDueDate(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 7) return `Due in ${days} days`;
  if (days < 30) return `Due in ${Math.floor(days / 7)} weeks`;
  if (days < 365) return `Due in ${Math.floor(days / 30)} months`;
  return `Due in ${Math.floor(days / 365)} years`;
}

