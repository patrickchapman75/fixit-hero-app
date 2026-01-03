import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Minus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getShoppingLists,
  toggleShoppingListItem,
  removeShoppingListItem,
  clearCompletedItems,
  addManualShoppingListItem,
  updateShoppingListItemQuantity,
  type IssueShoppingList
} from '../services/shoppingListService';
import StoreButtons from './StoreButtons';

// Function to categorize items as parts or tools (same logic as Scanner.tsx)
const categorizeItem = (itemName: string): 'part' | 'tool' => {
  const lowerItem = itemName.toLowerCase();
  const isTool = /\b(screwdriver|hammer|pliers|wrench|drill|saw|tape|pliers|pliers|level|sander|sandpaper|tape measure|multimeter|voltage tester|wire stripper|pipe wrench|adjustable wrench|allen wrench|hex key)\b/i.test(lowerItem) ||
                /\b(screwdrivers|hammers|pliers|wrenches|drills|saws|tapes|pliers|pliers|levels|sanders|sandpapers|tape measures|multimeters|voltage testers|wire strippers|pipe wrenches|adjustable wrenches|allen wrenches|hex keys)\b/i.test(lowerItem);

  return isTool ? 'tool' : 'part';
};

export default function ShoppingList() {
  const { user } = useAuth();
  const [issueLists, setIssueLists] = useState<IssueShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState('general');

  const refreshItems = async () => {
    try {
      const updatedLists = await getShoppingLists();
      setIssueLists(updatedLists);
      // Auto-expand all issues (but preserve manually collapsed ones)
      if (updatedLists.length > 0) {
        const allIssueIds = new Set(updatedLists.map(list => list.issueId));
        setExpandedIssues(prev => {
          // Add any new issues to the expanded set, but keep existing collapsed ones collapsed
          const newExpanded = new Set(prev);
          allIssueIds.forEach(issueId => {
            if (!newExpanded.has(issueId)) {
              newExpanded.add(issueId);
            }
          });
          return newExpanded;
        });
      } else {
        setExpandedIssues(new Set());
      }
    } catch (error) {
      console.error('Error refreshing shopping lists:', error);
    }
  };

  const toggleIssueExpansion = (issueId: string) => {
    setExpandedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    let issueId = selectedIssueId;
    let issueTitle = 'General Items';

    if (selectedIssueId !== 'general') {
      const selectedIssue = issueLists.find(list => list.issueId === selectedIssueId);
      if (selectedIssue) {
        issueId = selectedIssue.issueId;
        issueTitle = selectedIssue.issueTitle;
      }
    }

    await addManualShoppingListItem(newItemName.trim(), newItemQuantity, issueId, issueTitle);
    setNewItemName('');
    setNewItemQuantity(1);
    setSelectedIssueId('general');
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateShoppingListItemQuantity(itemId, newQuantity);
  };

  useEffect(() => {
    if (user) {
      refreshItems().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    // Listen for custom event for same-tab updates
    const handleUpdate = () => {
      refreshItems();
    };

    window.addEventListener('shoppingListUpdated', handleUpdate);

    return () => {
      window.removeEventListener('shoppingListUpdated', handleUpdate);
    };
  }, [user]);

  const handleToggle = async (id: string) => {
    try {
      const updatedLists = await toggleShoppingListItem(id);
      setIssueLists(updatedLists);
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const updatedLists = await removeShoppingListItem(id);
      setIssueLists(updatedLists);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleClearCompleted = async () => {
    if (window.confirm('Are you sure you want to clear all completed items from all issues?')) {
      try {
        await clearCompletedItems();
        await refreshItems();
      } catch (error) {
        console.error('Error clearing completed items:', error);
      }
    }
  };

  const totalActiveItems = issueLists.reduce((total, issue) =>
    total + issue.items.filter(item => !item.completed).length, 0
  );
  const totalCompletedItems = issueLists.reduce((total, issue) =>
    total + issue.items.filter(item => item.completed).length, 0
  );
  const hasCompletedItems = totalCompletedItems > 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-bold text-orange-400 mb-2">Shopping List</h2>
          <div className="text-center py-12">
            <div className="animate-spin text-6xl mb-4">🛒</div>
            <p className="text-slate-300">Loading shopping list...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h2 className="text-2xl font-bold text-orange-400 mb-2">Shopping Lists</h2>
        <p className="text-slate-400 mb-4">
          Parts and tools needed for your repairs, organized by issue. Items are automatically added when you analyze a repair.
        </p>

        {/* Add New Item Form */}
        <div className="bg-slate-900 rounded-xl p-4 mb-4">
          <h3 className="text-lg font-semibold text-slate-300 mb-3">Add Manual Item</h3>
          <form onSubmit={handleAddNewItem} className="space-y-3">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Enter item name..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-orange-400"
            />
            {/* Mobile-responsive layout */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedIssueId}
                onChange={(e) => setSelectedIssueId(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-orange-400 text-sm"
              >
                <option value="general">General Items</option>
                {issueLists.map((issue) => (
                  <option key={issue.issueId} value={issue.issueId}>
                    {issue.issueTitle}
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 sm:hidden">Qty:</span>
                  <button
                    type="button"
                    onClick={() => setNewItemQuantity(Math.max(1, newItemQuantity - 1))}
                    className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm text-slate-300">{newItemQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setNewItemQuantity(newItemQuantity + 1)}
                    className="w-8 h-8 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus size={16} />
                  <span className="sm:inline">Add</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {issueLists.length > 0 && (
          <div className="bg-slate-900 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-300">
                {totalActiveItems} {totalActiveItems === 1 ? 'item' : 'items'} remaining across {issueLists.length} {issueLists.length === 1 ? 'issue' : 'issues'}
              </span>
              {hasCompletedItems && (
                <button
                  onClick={handleClearCompleted}
                  className="text-xs text-slate-400 hover:text-orange-400 transition-colors"
                >
                  Clear all completed
                </button>
              )}
            </div>
            {totalActiveItems + totalCompletedItems > 0 && (
              <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-600 to-orange-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${((totalActiveItems + totalCompletedItems) > 0 ? totalCompletedItems / (totalActiveItems + totalCompletedItems) : 0) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {issueLists.length === 0 ? (
        <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
          <span className="text-6xl block mb-4">🛒</span>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">Your shopping lists are empty</h3>
          <p className="text-slate-400">
            Analyze a repair issue to automatically create shopping lists with recommended parts and tools.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {issueLists.map((issueList) => {
            const activeItems = issueList.items.filter(item => !item.completed);
            const completedItems = issueList.items.filter(item => item.completed);

            return (
              <div key={issueList.issueId} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-orange-400">{issueList.issueTitle}</h3>
                    <p className="text-slate-400 text-sm">
                      {activeItems.length} {activeItems.length === 1 ? 'item' : 'items'} to buy
                      {activeItems.length > 0 && (
                        <span className="text-slate-500">
                          {' '}({activeItems.filter(item => categorizeItem(item.name) === 'part').length} parts, {activeItems.filter(item => categorizeItem(item.name) === 'tool').length} tools)
                        </span>
                      )}
                      {completedItems.length > 0 && ` • ${completedItems.length} purchased`}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleIssueExpansion(issueList.issueId)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    {expandedIssues.has(issueList.issueId) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </button>
                </div>

                {expandedIssues.has(issueList.issueId) && (
                  <div className="space-y-4">
                    {/* Active Items */}
                    {activeItems.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-slate-300 mb-3">To Buy</h4>
                        <div className="space-y-4">
                          {activeItems.map((item) => (
                            <div
                              key={item.id}
                              className="bg-slate-900 rounded-xl p-4 border border-slate-700 hover:border-slate-600 transition-all"
                            >
                              <div className="flex items-center gap-4 mb-2">
                                <button
                                  onClick={() => handleToggle(item.id)}
                                  className="flex-shrink-0 text-slate-400 hover:text-orange-400 transition-colors"
                                >
                                  <Circle size={24} />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-1">
                                    {/* Item name - full on mobile, truncate on larger screens */}
                                    <span className="text-white font-medium sm:truncate">{item.name}</span>

                                    {/* Mobile: Show compact info, Desktop: Show expanded layout */}
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-slate-400">Qty:</span>
                                          <button
                                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                                            disabled={item.quantity <= 1}
                                          >
                                            <Minus size={12} />
                                          </button>
                                          <span className="text-sm text-slate-300 min-w-[20px] text-center">{item.quantity}</span>
                                          <button
                                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                            className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                                          >
                                            <Plus size={12} />
                                          </button>
                                        </div>

                                        {/* Mobile timestamp - show date only, Desktop: full datetime */}
                                        <span className="text-xs text-slate-500 sm:hidden">
                                          {new Date(item.addedAt).toLocaleDateString()}
                                        </span>
                                      </div>

                                      {/* Desktop timestamp */}
                                      <span className="text-xs text-slate-500 hidden sm:inline whitespace-nowrap">
                                        {new Date(item.addedAt).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  className="flex-shrink-0 text-slate-500 hover:text-red-400 transition-colors p-1"
                                  title="Delete item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <StoreButtons partName={item.name} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Items */}
                    {completedItems.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-slate-400 mb-3">Purchased</h4>
                        <div className="space-y-2">
                          {completedItems.map((item) => (
                            <div
                              key={item.id}
                              className="bg-slate-900 rounded-xl p-4 border border-slate-700 opacity-75"
                            >
                              <div className="flex items-center gap-4 mb-1">
                                <button
                                  onClick={() => handleToggle(item.id)}
                                  className="flex-shrink-0 text-orange-500 hover:text-orange-400 transition-colors"
                                >
                                  <CheckCircle2 size={24} className="fill-orange-500" />
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-col gap-1">
                                    {/* Item name - full on mobile, truncate on larger screens */}
                                    <span className="text-slate-400 line-through sm:truncate">{item.name}</span>

                                    {/* Mobile: Show compact info, Desktop: Show expanded layout */}
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-slate-500">×{item.quantity}</span>
                                      {/* Mobile timestamp - show date only, Desktop: full datetime */}
                                      <span className="text-xs text-slate-500 sm:hidden">
                                        {new Date(item.addedAt).toLocaleDateString()}
                                      </span>
                                      {/* Desktop timestamp */}
                                      <span className="text-xs text-slate-500 hidden sm:inline whitespace-nowrap">
                                        {new Date(item.addedAt).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleRemove(item.id)}
                                  className="flex-shrink-0 text-slate-500 hover:text-red-400 transition-colors p-1"
                                  title="Delete item"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

