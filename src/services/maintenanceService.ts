import { supabase } from './supabaseClient';

export interface MaintenanceHistory {
  completedAt: number;
  notes: string;
  partsUsed: string[];
}

export interface MaintenanceTask {
  id: string;
  title: string;
  frequency: string; // e.g., "Every 3 months", "Monthly", "Annually"
  completed: boolean;
  lastCompleted: number | null; // timestamp
  history: MaintenanceHistory[];
  createdAt: number;
}

const INITIAL_TASKS: MaintenanceTask[] = [
  {
    id: '1',
    title: 'Change HVAC Filter',
    frequency: 'Every 1-3 months',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '2',
    title: 'Clean Gutters',
    frequency: 'Spring & Fall',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '3',
    title: 'Test Smoke Detectors',
    frequency: 'Monthly',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '4',
    title: 'Inspect Water Heater',
    frequency: 'Every 6 months',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '5',
    title: 'Check for Water Leaks',
    frequency: 'Monthly',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '6',
    title: 'Service HVAC System',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '7',
    title: 'Clean Dryer Vent',
    frequency: 'Every 6 months',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '8',
    title: 'Inspect Roof Shingles',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '9',
    title: 'Seal Windows and Doors',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '10',
    title: 'Test GFCI Outlets',
    frequency: 'Monthly',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '11',
    title: 'Flush Water Heater',
    frequency: 'Every 6 months',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
  },
  {
    id: '12',
    title: 'Inspect Foundation',
    frequency: 'Annually',
    completed: false,
    lastCompleted: null,
    history: [],
    createdAt: Date.now()
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

        return {
          id: task.id,
          title: task.title,
          frequency: task.frequency,
          completed: task.completed,
          lastCompleted: task.last_completed ? new Date(task.last_completed).getTime() : null,
          history: (history || []).map(h => ({
            completedAt: new Date(h.completed_at).getTime(),
            notes: h.notes || '',
            partsUsed: h.parts_used || []
          })),
          createdAt: new Date(task.created_at).getTime()
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
  partsUsed: string[]
): Promise<MaintenanceTask[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const now = new Date();

    // Add history entry
    const { error: historyError } = await supabase
      .from('maintenance_history')
      .insert({
        task_id: id,
        user_id: user.id,
        completed_at: now.toISOString(),
        notes: notes.trim() || null,
        parts_used: partsUsed.filter(p => p.trim().length > 0)
      });

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

