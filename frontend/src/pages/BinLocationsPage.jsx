import { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Layers,
  Box,
  Warehouse,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { inventoryAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

export default function BinLocationsPage() {
  const { isManager } = useAuth();
  const toast = useToast();

  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedZone, setSelectedZone] = useState('ALL');

  // Add Bin Modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    zone: 'Zone A - High Velocity',
    aisle: '01',
    rack: '01',
    shelf: '01',
    max_capacity: 100,
    notes: ''
  });

  const fetchBins = async () => {
    try {
      setLoading(true);
      const res = await inventoryAPI.getBinLocations();
      setBins(res.data.bin_locations || []);
    } catch (err) {
      toast.error('Failed to load bin locations', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  const zones = ['ALL', ...new Set(bins.map((b) => b.zone).filter(Boolean))];

  const filteredBins = bins.filter((bin) => {
    const matchesSearch =
      bin.code?.toLowerCase().includes(search.toLowerCase()) ||
      bin.zone?.toLowerCase().includes(search.toLowerCase()) ||
      bin.aisle?.includes(search);
    const matchesZone = selectedZone === 'ALL' || bin.zone === selectedZone;
    return matchesSearch && matchesZone;
  });

  const handleAddBin = async (e) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.warning('Input Required', 'Bin Code is required (e.g. A-01-02).');
      return;
    }
    try {
      setSubmittingAdd(true);
      await inventoryAPI.createBinLocation(formData);
      toast.success('Bin Created', `Bin location ${formData.code} created successfully.`);
      setAddModalOpen(false);
      setFormData({
        code: '',
        zone: 'Zone A - High Velocity',
        aisle: '01',
        rack: '01',
        shelf: '01',
        max_capacity: 100,
        notes: ''
      });
      fetchBins();
    } catch (err) {
      toast.error('Failed to create bin', err.response?.data?.error || err.message);
    } finally {
      setSubmittingAdd(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bin Location Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Organize warehouse storage aisles, racks, shelves, and stock capacity
          </p>
        </div>

        {isManager() && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary self-start sm:self-auto flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Bin Location
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="card bg-white p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code (e.g. A-01-02), zone, or aisle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        {/* Zone Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">Zone:</span>
          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedZone === zone
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Bin Locations */}
      {loading ? (
        <LoadingSpinner text="Loading bin locations..." />
      ) : filteredBins.length === 0 ? (
        <EmptyState
          title="No bin locations found"
          message="No warehouse bins match your search or filter criteria."
          icon={MapPin}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredBins.map((bin) => {
            const occupancyPct = Math.min(100, Math.round(((bin.product_count || 0) / (bin.max_capacity || 100)) * 100));
            const isHighOccupancy = occupancyPct > 80;

            return (
              <div
                key={bin.id}
                className="card bg-white hover:shadow-md transition-shadow duration-150 p-5 flex flex-col justify-between border-t-4 border-t-blue-600"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-lg font-bold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                      {bin.code}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-blue-700 mb-3">{bin.zone}</p>

                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-2.5 rounded-lg text-center text-xs mb-4">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Aisle</span>
                      <span className="font-bold text-gray-800">{bin.aisle}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Rack</span>
                      <span className="font-bold text-gray-800">{bin.rack}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase">Shelf</span>
                      <span className="font-bold text-gray-800">{bin.shelf}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="text-gray-500">Products Stored:</span>
                    <span className="font-bold text-gray-900">{bin.product_count || 0} items</span>
                  </div>

                  {/* Capacity Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isHighOccupancy ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${Math.max(5, occupancyPct)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-gray-400">
                    <span>Max: {bin.max_capacity} units</span>
                    <span>{occupancyPct}% full</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Bin Location Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Warehouse Bin Location"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddBin}
              disabled={submittingAdd}
              className="btn-primary"
            >
              {submittingAdd ? 'Saving...' : 'Create Bin Location'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleAddBin} className="space-y-4">
          <div>
            <label className="label">Bin Code (Format: Zone-Aisle-Rack or A-01-02)</label>
            <input
              type="text"
              required
              placeholder="e.g. A-01-02"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              className="input-field font-mono font-bold"
            />
          </div>

          <div>
            <label className="label">Zone Category</label>
            <select
              value={formData.zone}
              onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              className="input-field"
            >
              <option value="Zone A - High Velocity">Zone A - High Velocity (Fast Movers)</option>
              <option value="Zone B - Apparel & Gear">Zone B - Apparel & Gear</option>
              <option value="Zone C - Tools & Hardware">Zone C - Tools & Hardware</option>
              <option value="Zone D - Fragile / Glass">Zone D - Fragile / Glass</option>
              <option value="Zone E - Bulk Storage">Zone E - Bulk Storage</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Aisle</label>
              <input
                type="text"
                required
                placeholder="01"
                value={formData.aisle}
                onChange={(e) => setFormData({ ...formData, aisle: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Rack</label>
              <input
                type="text"
                required
                placeholder="01"
                value={formData.rack}
                onChange={(e) => setFormData({ ...formData, rack: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Shelf</label>
              <input
                type="text"
                required
                placeholder="01"
                value={formData.shelf}
                onChange={(e) => setFormData({ ...formData, shelf: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="label">Maximum Item Capacity</label>
            <input
              type="number"
              min="1"
              value={formData.max_capacity}
              onChange={(e) => setFormData({ ...formData, max_capacity: parseInt(e.target.value) || 50 })}
              className="input-field"
            />
          </div>

          <div>
            <label className="label">Notes / Storage Specs</label>
            <textarea
              placeholder="e.g. Temperature regulated, reinforced shelving"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="input-field"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
