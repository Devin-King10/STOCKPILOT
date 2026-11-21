import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ShieldAlert,
  User,
  Check,
  FileText
} from 'lucide-react';
import { activityAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';

export default function ActivityLogsPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('logs'); // 'logs' or 'errors'

  // Logs State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logSearch, setLogSearch] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');

  // Errors State
  const [errors, setErrors] = useState([]);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [errorStatus, setErrorStatus] = useState('ALL');
  const [errorTypeFilter, setErrorTypeFilter] = useState('ALL');

  // Resolve Error Modal
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const params = {};
      if (selectedEntity !== 'ALL') params.entity_type = selectedEntity;
      if (logSearch) params.search = logSearch;

      const res = await activityAPI.getLogs(params);
      setLogs(res.data.logs || []);
    } catch (err) {
      toast.error('Failed to load activity logs', err.response?.data?.error || err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const fetchErrors = async () => {
    try {
      setLoadingErrors(true);
      const params = {};
      if (errorStatus !== 'ALL') params.status = errorStatus;
      if (errorTypeFilter !== 'ALL') params.error_type = errorTypeFilter;

      const res = await activityAPI.getErrors(params);
      setErrors(res.data.errors || []);
    } catch (err) {
      toast.error('Failed to load incident errors', err.response?.data?.error || err.message);
    } finally {
      setLoadingErrors(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else {
      fetchErrors();
    }
  }, [activeTab, selectedEntity, errorStatus, errorTypeFilter]);

  const handleOpenResolve = (errItem) => {
    setSelectedError(errItem);
    setResolutionNotes('');
    setResolveModalOpen(true);
  };

  const handleResolveError = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim()) {
      toast.warning('Notes Required', 'Please enter resolution actions taken.');
      return;
    }

    try {
      setResolving(true);
      await activityAPI.resolveError(selectedError.id, { resolution_notes: resolutionNotes });
      toast.success('Incident Resolved', `Error #${selectedError.id} marked as resolved.`);
      setResolveModalOpen(false);
      fetchErrors();
    } catch (err) {
      toast.error('Resolution Failed', err.response?.data?.error || err.message);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Activity & Error Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Audit logging, operational checkpoints, and discrepancy incident resolution
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-gray-100 p-1 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'logs'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            Activity Logs
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'errors'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Error Records
          </button>
        </div>
      </div>

      {/* Tab 1: Activity Audit Trail */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card bg-white p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search descriptions, actions, or IDs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
                className="input-field pl-9"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0">Entity:</span>
              {['ALL', 'ORDER', 'PRODUCT', 'PICKING', 'PACKING', 'DISPATCH', 'USER'].map((ent) => (
                <button
                  key={ent}
                  onClick={() => setSelectedEntity(ent)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedEntity === ent
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {ent}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loadingLogs ? (
            <LoadingSpinner text="Loading activity history..." />
          ) : logs.length === 0 ? (
            <EmptyState
              title="No activity logs found"
              message="No logs match your current search query."
              icon={Activity}
            />
          ) : (
            <div className="card bg-white p-0 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Entity</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-semibold text-gray-900 text-xs">{log.user_name}</p>
                          <span className="text-[10px] text-gray-400 capitalize">{log.user_role}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-mono font-semibold ${
                            log.action.includes('ERROR') ? 'bg-red-100 text-red-700' :
                            log.action.includes('DISPATCH') ? 'bg-emerald-100 text-emerald-700' :
                            log.action.includes('PACK') ? 'bg-purple-100 text-purple-700' :
                            log.action.includes('PICK') ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-gray-600 whitespace-nowrap">
                          {log.entity_type} {log.entity_id && `(${log.entity_id})`}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-700 max-w-md">
                          {log.description}
                        </td>
                        <td className="py-3.5 px-4 text-right text-xs font-mono text-gray-400 whitespace-nowrap">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Error Records */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          {/* Error Filter Bar */}
          <div className="card bg-white p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status:</span>
              {['ALL', 'UNRESOLVED', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setErrorStatus(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    errorStatus === st
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type:</span>
              {['ALL', 'PICKING_ERROR', 'PACKING_ERROR', 'INVENTORY_ERROR', 'DISPATCH_ERROR'].map((type) => (
                <button
                  key={type}
                  onClick={() => setErrorTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    errorTypeFilter === type
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type.replace('_ERROR', '')}
                </button>
              ))}
            </div>
          </div>

          {/* Errors Table */}
          {loadingErrors ? (
            <LoadingSpinner text="Loading incident records..." />
          ) : errors.length === 0 ? (
            <EmptyState
              title="No incident records found"
              message="Warehouse operations are running smoothly with no flagged errors."
              icon={CheckCircle2}
            />
          ) : (
            <div className="card bg-white p-0 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Incident ID</th>
                      <th className="py-3 px-4">Error Type</th>
                      <th className="py-3 px-4">Target Order / SKU</th>
                      <th className="py-3 px-4">Severity</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4">Reported By</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {errors.map((err) => (
                      <tr key={err.id} className="hover:bg-gray-50/50">
                        <td className="py-3.5 px-4 font-mono font-bold text-xs text-gray-900">
                          #{err.id}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-semibold">
                          <span className={`px-2 py-0.5 rounded ${
                            err.error_type === 'PICKING_ERROR' ? 'bg-amber-100 text-amber-800' :
                            err.error_type === 'PACKING_ERROR' ? 'bg-purple-100 text-purple-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {err.error_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono">
                          {err.order_number || err.product_sku || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                            err.severity === 'CRITICAL' || err.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                            err.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {err.severity}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            err.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {err.status === 'RESOLVED' ? <Check className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {err.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-700 max-w-sm">
                          <p>{err.description}</p>
                          {err.resolution_notes && (
                            <p className="text-[11px] text-emerald-700 font-medium mt-1">
                              Resolution: {err.resolution_notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                          <p className="font-medium text-gray-800">{err.user_name}</p>
                          <span className="text-[10px]">{new Date(err.reported_at).toLocaleDateString()}</span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {err.status === 'UNRESOLVED' ? (
                            <button
                              onClick={() => handleOpenResolve(err)}
                              className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-xs px-3 py-1"
                            >
                              Resolve
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Closed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolve Incident Modal */}
      <Modal
        isOpen={resolveModalOpen}
        onClose={() => setResolveModalOpen(false)}
        title={`Resolve Incident #${selectedError?.id}`}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setResolveModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResolveError}
              disabled={resolving}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700"
            >
              {resolving ? 'Submitting...' : 'Mark as Resolved'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleResolveError} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs space-y-1">
            <p><strong>Incident Type:</strong> {selectedError?.error_type}</p>
            <p><strong>Issue:</strong> {selectedError?.description}</p>
          </div>

          <div>
            <label className="label">Resolution Action Notes</label>
            <textarea
              required
              rows={3}
              placeholder="Detail the corrective actions taken (e.g. Barcode verified, damaged packaging replaced, inventory recount confirmed)..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              className="input-field"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
