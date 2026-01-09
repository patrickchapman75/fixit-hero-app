import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, ExternalLink, ShoppingCart, Wrench, Package, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserParts,
  addUserPart,
  updateUserPart,
  deleteUserPart,
  markPartAsPurchased,
  getPartsNeedingRepurchase,
  searchParts,
  type MaintenancePart
} from '../services/partsService';
import { generateAffiliateLinks } from '../services/affiliateService';

export default function PartsManager() {
  const { user } = useAuth();
  const [parts, setParts] = useState<MaintenancePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<MaintenancePart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'part' | 'tool'>('all');
  const [showRepurchaseNeeded, setShowRepurchaseNeeded] = useState(false);

  // Form state
  const [newPartName, setNewPartName] = useState('');
  const [newPartCategory, setNewPartCategory] = useState<'part' | 'tool'>('part');
  const [newPartCost, setNewPartCost] = useState('');
  const [newPartFrequency, setNewPartFrequency] = useState('');

  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<'part' | 'tool'>('part');
  const [editCost, setEditCost] = useState('');
  const [editFrequency, setEditFrequency] = useState('');

  useEffect(() => {
    const loadParts = async () => {
      try {
        const userParts = await getUserParts();
        setParts(userParts);
        setFilteredParts(userParts);
      } catch (error) {
        console.error('Error loading parts:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadParts();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let filtered = parts;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(part =>
        part.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(part => part.category === categoryFilter);
    }

    // Apply repurchase needed filter
    if (showRepurchaseNeeded) {
      const repurchaseNeeded = parts.filter(part => {
        if (!part.lastPurchased || !part.purchaseFrequency) return false;
        const frequency = part.purchaseFrequency.toLowerCase();
        let monthsToAdd = 12;

        if (frequency.includes('every')) {
          const match = frequency.match(/every\s+(\d+)\s*(month|year)/);
          if (match) {
            const [, num, unit] = match;
            const multiplier = parseInt(num);
            monthsToAdd = unit === 'year' ? multiplier * 12 : multiplier;
          }
        }

        const nextPurchaseDate = part.lastPurchased + (monthsToAdd * 30 * 24 * 60 * 60 * 1000);
        return Date.now() >= nextPurchaseDate;
      });
      filtered = repurchaseNeeded;
    }

    setFilteredParts(filtered);
  }, [parts, searchQuery, categoryFilter, showRepurchaseNeeded]);

  const handleAddPart = async () => {
    if (newPartName.trim()) {
      try {
        const newPart = {
          name: newPartName.trim(),
          category: newPartCategory,
          affiliateLinks: generateAffiliateLinks(newPartName.trim()),
          estimatedCost: newPartCost ? parseFloat(newPartCost) : undefined,
          purchaseFrequency: newPartFrequency.trim() || undefined
        };

        const updatedParts = await addUserPart(newPart);
        setParts(updatedParts);
        setNewPartName('');
        setNewPartCost('');
        setNewPartFrequency('');
        setShowAddForm(false);
      } catch (error) {
        console.error('Error adding part:', error);
      }
    }
  };

  const handleUpdatePart = async (id: string) => {
    if (editName.trim()) {
      try {
        const updates = {
          name: editName.trim(),
          category: editCategory,
          estimatedCost: editCost ? parseFloat(editCost) : undefined,
          purchaseFrequency: editFrequency.trim() || undefined
        };

        const updatedParts = await updateUserPart(id, updates);
        setParts(updatedParts);
        setEditingPart(null);
        setEditName('');
        setEditCost('');
        setEditFrequency('');
      } catch (error) {
        console.error('Error updating part:', error);
      }
    }
  };

  const handleDeletePart = async (id: string) => {
    if (confirm('Are you sure you want to delete this part/tool?')) {
      try {
        const updatedParts = await deleteUserPart(id);
        setParts(updatedParts);
      } catch (error) {
        console.error('Error deleting part:', error);
      }
    }
  };

  const handleMarkPurchased = async (id: string) => {
    try {
      const updatedParts = await markPartAsPurchased(id);
      setParts(updatedParts);
    } catch (error) {
      console.error('Error marking part as purchased:', error);
    }
  };

  const startEditing = (part: MaintenancePart) => {
    setEditingPart(part.id);
    setEditName(part.name);
    setEditCategory(part.category);
    setEditCost(part.estimatedCost?.toString() || '');
    setEditFrequency(part.purchaseFrequency || '');
  };

  const partsCount = filteredParts.filter(p => p.category === 'part').length;
  const toolsCount = filteredParts.filter(p => p.category === 'tool').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-bold text-orange-400 mb-2">Parts & Tools Manager</h2>
          <div className="text-center py-12">
            <div className="animate-spin text-6xl mb-4">🔧</div>
            <p className="text-slate-300">Loading your parts inventory...</p>
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
            <h2 className="text-2xl font-bold text-orange-400 mb-2">Parts & Tools Manager</h2>
            <p className="text-slate-400">Track your maintenance parts and tools inventory.</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold transition-colors"
          >
            <Plus size={20} />
            <span className="hidden md:inline">Add Item</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{partsCount}</div>
            <div className="text-sm text-slate-400">Parts</div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{toolsCount}</div>
            <div className="text-sm text-slate-400">Tools</div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {filteredParts.filter(p => p.affiliateLinks && Object.keys(p.affiliateLinks).length > 0).length}
            </div>
            <div className="text-sm text-slate-400">With Links</div>
          </div>
          <div className="bg-slate-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">
              {parts.filter(p => {
                if (!p.lastPurchased || !p.purchaseFrequency) return false;
                const frequency = p.purchaseFrequency.toLowerCase();
                let monthsToAdd = 12;
                if (frequency.includes('every')) {
                  const match = frequency.match(/every\s+(\d+)\s*(month|year)/);
                  if (match) {
                    const [, num, unit] = match;
                    const multiplier = parseInt(num);
                    monthsToAdd = unit === 'year' ? multiplier * 12 : multiplier;
                  }
                }
                const nextPurchaseDate = p.lastPurchased + (monthsToAdd * 30 * 24 * 60 * 60 * 1000);
                return Date.now() >= nextPurchaseDate;
              }).length}
            </div>
            <div className="text-sm text-slate-400">Need Repurchase</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search parts and tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoryFilter === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('part')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoryFilter === 'part'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Parts
            </button>
            <button
              onClick={() => setCategoryFilter('tool')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                categoryFilter === 'tool'
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Tools
            </button>
          </div>
          <button
            onClick={() => setShowRepurchaseNeeded(!showRepurchaseNeeded)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              showRepurchaseNeeded
                ? 'bg-red-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            <AlertTriangle size={16} />
            Need Repurchase
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Part or Tool</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
              <input
                type="text"
                value={newPartName}
                onChange={(e) => setNewPartName(e.target.value)}
                placeholder="e.g., HVAC Filter, Screwdriver"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <select
                value={newPartCategory}
                onChange={(e) => setNewPartCategory(e.target.value as 'part' | 'tool')}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500"
              >
                <option value="part">Part</option>
                <option value="tool">Tool</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Estimated Cost ($)</label>
              <input
                type="number"
                value={newPartCost}
                onChange={(e) => setNewPartCost(e.target.value)}
                placeholder="25.00"
                step="0.01"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Purchase Frequency</label>
              <input
                type="text"
                value={newPartFrequency}
                onChange={(e) => setNewPartFrequency(e.target.value)}
                placeholder="e.g., Every 6 months, As needed"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleAddPart}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-semibold transition-colors"
            >
              Add Item
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewPartName('');
                setNewPartCost('');
                setNewPartFrequency('');
              }}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredParts.map((part) => (
          <div
            key={part.id}
            className="bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-600 transition-all"
          >
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className={`mt-1 p-2 rounded-lg ${
                  part.category === 'part' ? 'bg-blue-600' : 'bg-green-600'
                }`}>
                  {part.category === 'part' ? <Package size={20} /> : <Wrench size={20} />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {editingPart === part.id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-orange-500"
                          autoFocus
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as 'part' | 'tool')}
                          className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-orange-500"
                        >
                          <option value="part">Part</option>
                          <option value="tool">Tool</option>
                        </select>
                      </div>
                    ) : (
                      <>
                        <h3 className="font-semibold text-white">{part.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          part.category === 'part'
                            ? 'bg-blue-600 text-white'
                            : 'bg-green-600 text-white'
                        }`}>
                          {part.category}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    {part.estimatedCost && (
                      <span className="flex items-center gap-1">
                        <span className="text-green-400 font-medium">${part.estimatedCost}</span>
                      </span>
                    )}

                    {part.purchaseFrequency && (
                      <span>{part.purchaseFrequency}</span>
                    )}

                    {part.lastPurchased && (
                      <span>Last purchased: {new Date(part.lastPurchased).toLocaleDateString()}</span>
                    )}

                    {/* Affiliate Links */}
                    {part.affiliateLinks && Object.keys(part.affiliateLinks).length > 0 && (
                      <div className="flex items-center gap-1">
                        <ShoppingCart size={14} />
                        {Object.entries(part.affiliateLinks).map(([store, link]) => (
                          link && (
                            <a
                              key={store}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-orange-400 hover:text-orange-300 transition-colors text-xs font-medium px-2 py-1 bg-slate-700 rounded hover:bg-slate-600"
                            >
                              {store === 'amazon' ? 'Amazon' :
                               store === 'homeDepot' ? 'Home Depot' :
                               store === 'lowes' ? 'Lowe\'s' :
                               store === 'walmart' ? 'Walmart' : store}
                              <ExternalLink size={10} className="inline ml-1" />
                            </a>
                          )
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Edit Form */}
                  {editingPart === part.id && (
                    <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="number"
                        value={editCost}
                        onChange={(e) => setEditCost(e.target.value)}
                        placeholder="Cost"
                        step="0.01"
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                      <input
                        type="text"
                        value={editFrequency}
                        onChange={(e) => setEditFrequency(e.target.value)}
                        placeholder="Purchase frequency"
                        className="px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />
                      <div className="md:col-span-2 flex gap-2">
                        <button
                          onClick={() => handleUpdatePart(part.id)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded font-semibold transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingPart(null)}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {editingPart !== part.id && (
                    <>
                      <button
                        onClick={() => startEditing(part)}
                        className="text-slate-400 hover:text-orange-400 transition-colors p-2"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleMarkPurchased(part.id)}
                        className="text-slate-400 hover:text-green-400 transition-colors p-2"
                        title="Mark as purchased"
                      >
                        <ShoppingCart size={16} />
                      </button>
                      <button
                        onClick={() => handleDeletePart(part.id)}
                        className="text-slate-400 hover:text-red-400 transition-colors p-2"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredParts.length === 0 && (
        <div className="bg-slate-800 rounded-2xl p-12 border border-slate-700 text-center">
          <span className="text-6xl block mb-4">🔧</span>
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No parts or tools found</h3>
          <p className="text-slate-400 mb-4">
            {searchQuery || categoryFilter !== 'all' || showRepurchaseNeeded
              ? 'Try adjusting your filters.'
              : 'Add your first part or tool to get started.'}
          </p>
          {!searchQuery && categoryFilter === 'all' && !showRepurchaseNeeded && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-semibold transition-colors"
            >
              Add Your First Item
            </button>
          )}
        </div>
      )}
    </div>
  );
}
