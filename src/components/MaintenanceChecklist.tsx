import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Trash2, Plus, ChevronDown, ChevronUp, Clock, FileText, Wrench, AlertTriangle, Calendar, ShoppingCart, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getMaintenanceTasks,
  addMaintenanceTask,
  updateMaintenanceTask,
  completeMaintenanceTask,
  uncompleteMaintenanceTask,
  deleteMaintenanceTask,
  formatDate,
  formatRelativeTime,
  formatDueDate,
  getStatusColor,
  getStatusIcon,
  type MaintenanceTask,
  type MaintenancePart
} from '../services/maintenanceService';
import { generateAffiliateLinks } from '../services/affiliateService';

export default function MaintenanceChecklist() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskFrequency, setNewTaskFrequency] = useState('');
  const [editFrequency, setEditFrequency] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionParts, setCompletionParts] = useState('');

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const updatedTasks = await getMaintenanceTasks();
        setTasks(updatedTasks);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadTasks();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleAddTask = async () => {
    if (newTaskTitle.trim() && newTaskFrequency.trim()) {
      try {
        const updatedTasks = await addMaintenanceTask(newTaskTitle.trim(), newTaskFrequency.trim());
        setTasks(updatedTasks);
        setNewTaskTitle('');
        setNewTaskFrequency('');
        setShowAddForm(false);
      } catch (error) {
        console.error('Error adding task:', error);
      }
    }
  };

  const handleUpdateFrequency = async (id: string) => {
    if (editFrequency.trim()) {
      try {
        const updatedTasks = await updateMaintenanceTask(id, { frequency: editFrequency.trim() });
        setTasks(updatedTasks);
        setEditingTask(null);
        setEditFrequency('');
      } catch (error) {
        console.error('Error updating task:', error);
      }
    }
  };

  const handleCompleteTask = async (id: string) => {
    try {
      const partsArray = completionParts.split(',').map(p => p.trim()).filter(p => p.length > 0);
      const updatedTasks = await completeMaintenanceTask(id, completionNotes.trim(), partsArray);
      setTasks(updatedTasks);
      setCompletingTask(null);
      setCompletionNotes('');
      setCompletionParts('');
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.completed) {
      try {
        const updatedTasks = await uncompleteMaintenanceTask(id);
        setTasks(updatedTasks);
      } catch (error) {
        console.error('Error toggling task:', error);
      }
    } else {
      setCompletingTask(id);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this maintenance task?')) {
      try {
        const updatedTasks = await deleteMaintenanceTask(id);
        setTasks(updatedTasks);
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTasks(newExpanded);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const overdueCount = tasks.filter(t => t.status === 'overdue').length;
  const dueSoonCount = tasks.filter(t => t.status === 'due').length;

  // PartBadge component for displaying parts with affiliate links
  const PartBadge: React.FC<{ part: MaintenancePart }> = ({ part }) => {
    const affiliateLinks = generateAffiliateLinks(part.name);
    const hasAffiliateLinks = Object.values(affiliateLinks).some(link => link);

    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 border border-slate-700">
        <Wrench size={12} />
        <span>{part.name}</span>
        {part.estimatedCost && (
          <span className="text-green-400 font-medium">${part.estimatedCost}</span>
        )}
        {hasAffiliateLinks && (
          <a
            href={affiliateLinks.amazon || affiliateLinks.homeDepot || affiliateLinks.lowes || affiliateLinks.walmart}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-orange-400 hover:text-orange-300 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={10} />
          </a>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-bold text-orange-400 mb-2">Maintenance Checklist</h2>
          <div className="text-center py-12">
            <div className="animate-spin text-6xl mb-4">⚙️</div>
            <p className="text-slate-300">Loading maintenance tasks...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-orange-400 mb-2">Maintenance Checklist</h2>
            <p className="text-slate-400">Track your home maintenance tasks to keep everything in top shape.</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold transition-colors"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Add Task</span>
          </button>
        </div>
        
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-300">Progress</span>
            <span className="text-sm font-bold text-orange-400">{completedCount} / {totalCount}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-600 to-orange-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Status Overview */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              {overdueCount > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertTriangle size={12} />
                  {overdueCount} overdue
                </span>
              )}
              {dueSoonCount > 0 && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <Calendar size={12} />
                  {dueSoonCount} due soon
                </span>
              )}
            </div>
            <span className="text-slate-500">
              {tasks.filter(t => t.status === 'upcoming').length} upcoming
            </span>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Maintenance Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Task Name</label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="e.g., Replace Air Filter"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Frequency</label>
              <input
                type="text"
                value={newTaskFrequency}
                onChange={(e) => setNewTaskFrequency(e.target.value)}
                placeholder="e.g., Every 3 months, Monthly, Annually"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAddTask}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold transition-colors"
              >
                Add Task
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskTitle('');
                  setNewTaskFrequency('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className={`bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-all ${
              task.completed ? 'opacity-75' : ''
            }`}
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                <button
                  onClick={() => handleToggleTask(task.id)}
                  className="mt-1 flex-shrink-0 text-orange-500 hover:text-orange-400 transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 size={24} className="fill-orange-500" />
                  ) : (
                    <Circle size={24} />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                          {task.title}
                        </h3>
                        <span className={`text-lg ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        {editingTask === task.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editFrequency}
                              onChange={(e) => setEditFrequency(e.target.value)}
                              onBlur={() => handleUpdateFrequency(task.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateFrequency(task.id);
                                if (e.key === 'Escape') setEditingTask(null);
                              }}
                              className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-orange-500"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <>
                            <span
                              className="flex items-center gap-1 cursor-pointer hover:text-orange-400"
                              onClick={() => {
                                setEditingTask(task.id);
                                setEditFrequency(task.frequency);
                              }}
                            >
                              <Clock size={14} />
                              {task.frequency}
                            </span>
                            {task.nextDue && (
                              <span className={`flex items-center gap-1 font-medium ${getStatusColor(task.status)}`}>
                                <Calendar size={14} />
                                {formatDueDate(task.nextDue)}
                              </span>
                            )}
                            {task.lastCompleted && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <span>Last done: {formatRelativeTime(task.lastCompleted)}</span>
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Recommended Parts & Tools */}
                      {((task.recommendedParts && task.recommendedParts.length > 0) || (task.recommendedTools && task.recommendedTools.length > 0)) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {task.recommendedParts && task.recommendedParts.map((part, idx) => (
                            <PartBadge key={part.id || idx} part={part} />
                          ))}
                          {task.recommendedTools && task.recommendedTools.map((tool, idx) => (
                            <PartBadge key={tool.id || idx} part={tool} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.history.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(task.id)}
                          className="text-slate-400 hover:text-orange-400 transition-colors"
                        >
                          {expandedTasks.has(task.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {expandedTasks.has(task.id) && task.history.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                      <h4 className="text-sm font-semibold text-slate-300 mb-2">History</h4>
                      {task.history.slice().reverse().map((entry, idx) => (
                        <div key={idx} className="bg-slate-900 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{formatDate(entry.completedAt)}</span>
                            <span>{formatRelativeTime(entry.completedAt)}</span>
                          </div>
                          {entry.notes && (
                            <div className="flex items-start gap-2 text-sm text-slate-300">
                              <FileText size={16} className="mt-0.5 flex-shrink-0" />
                              <span>{entry.notes}</span>
                            </div>
                          )}
                          {(entry.partsUsed.length > 0 || entry.toolsUsed.length > 0) && (
                            <div className="space-y-2">
                              {entry.partsUsed.length > 0 && (
                                <div className="flex items-start gap-2 text-sm text-slate-300">
                                  <span className="text-slate-500">Parts:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {entry.partsUsed.map((part, partIdx) => (
                                      <PartBadge key={partIdx} part={part} />
                                    ))}
                                  </div>
                                </div>
                              )}
                              {entry.toolsUsed.length > 0 && (
                                <div className="flex items-start gap-2 text-sm text-slate-300">
                                  <span className="text-slate-500">Tools:</span>
                                  <div className="flex flex-wrap gap-2">
                                    {entry.toolsUsed.map((tool, toolIdx) => (
                                      <PartBadge key={toolIdx} part={tool} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {completingTask === task.id && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-700 bg-slate-900/50">
                <h4 className="text-sm font-semibold text-white mb-3">Complete Task</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Notes (optional)</label>
                    <textarea
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      placeholder="Add any notes about this maintenance..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Parts & Tools Used</label>

                    {/* Recommended Parts */}
                    {(() => {
                      const task = tasks.find(t => t.id === completingTask);
                      return task?.recommendedParts && task.recommendedParts.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs text-slate-500 block mb-1">Recommended Parts:</span>
                          <div className="flex flex-wrap gap-2">
                            {task.recommendedParts.map((part, idx) => (
                              <button
                                key={part.id || idx}
                                onClick={() => {
                                  const currentParts = completionParts.split(',').map(p => p.trim()).filter(p => p);
                                  if (!currentParts.includes(part.name)) {
                                    setCompletionParts([...currentParts, part.name].join(', '));
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
                              >
                                <Wrench size={10} />
                                {part.name}
                                {part.estimatedCost && (
                                  <span className="text-green-400">${part.estimatedCost}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Recommended Tools */}
                    {(() => {
                      const task = tasks.find(t => t.id === completingTask);
                      return task?.recommendedTools && task.recommendedTools.length > 0 && (
                        <div className="mb-3">
                          <span className="text-xs text-slate-500 block mb-1">Recommended Tools:</span>
                          <div className="flex flex-wrap gap-2">
                            {task.recommendedTools.map((tool, idx) => (
                              <button
                                key={tool.id || idx}
                                onClick={() => {
                                  const currentParts = completionParts.split(',').map(p => p.trim()).filter(p => p);
                                  if (!currentParts.includes(tool.name)) {
                                    setCompletionParts([...currentParts, tool.name].join(', '));
                                  }
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors"
                              >
                                <Wrench size={10} />
                                {tool.name}
                                {tool.estimatedCost && (
                                  <span className="text-green-400">${tool.estimatedCost}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <input
                      type="text"
                      value={completionParts}
                      onChange={(e) => setCompletionParts(e.target.value)}
                      placeholder="e.g., Air filter, Screwdriver, Wrench (or click recommended items above)"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => {
                        setCompletingTask(null);
                        setCompletionNotes('');
                        setCompletionParts('');
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
          <span className="text-6xl block mb-4">🔧</span>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No maintenance tasks yet</h3>
          <p className="text-slate-400 mb-4">Add your first maintenance task to get started.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold transition-colors"
          >
            Add Your First Task
          </button>
        </div>
      )}
    </div>
  );
}
