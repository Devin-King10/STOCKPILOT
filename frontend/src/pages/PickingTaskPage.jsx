import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Barcode,
  MapPin,
  Package,
  ShieldCheck,
  Check,
  X,
  Clock,
  Play,
  RotateCcw
} from 'lucide-react';
import { pickingAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import PriorityBadge from '../components/PriorityBadge';
import Modal from '../components/Modal';

export default function PickingTaskPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  // Per-item state tracking: barcode input, verification status, quantity input
  const [barcodeInputs, setBarcodeInputs] = useState({});
  const [verifiedItems, setVerifiedItems] = useState({});
  const [qtyInputs, setQtyInputs] = useState({});
  const [verifyingItem, setVerifyingItem] = useState(null);
  const [confirmingItem, setConfirmingItem] = useState(null);

  // Error Report Modal
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorItem, setErrorItem] = useState(null);
  const [errorType, setErrorType] = useState('MISSING_ITEM');
  const [errorDescription, setErrorDescription] = useState('');
  const [submittingError, setSubmittingError] = useState(false);

  // Complete Task
  const [completingTask, setCompletingTask] = useState(false);

  const fetchTask = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pickingAPI.getTask(id);
      const taskData = res.data.task;
      setTask(taskData);

      // Prepopulate quantities for pending items
      const qtys = {};
      const verifs = {};
      const codes = {};

      taskData.items?.forEach((item) => {
        qtys[item.id] = item.required_qty;
        if (item.status === 'PICKED') {
          verifs[item.id] = true;
          codes[item.id] = item.barcode_scanned || item.barcode;
        }
      });

      setQtyInputs(qtys);
      setVerifiedItems(verifs);
      setBarcodeInputs(codes);
    } catch (err) {
      toast.error('Task Not Found', err.response?.data?.error || err.message);
      navigate('/picking');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStartTask = async () => {
    try {
      await pickingAPI.startTask(task.id);
      toast.success('Picking Started', 'Task status changed to In Progress');
      fetchTask();
    } catch (err) {
      toast.error('Start Failed', err.response?.data?.error || err.message);
    }
  };

  const handleVerifyBarcode = async (itemId) => {
    const code = barcodeInputs[itemId]?.trim();
    if (!code) {
      toast.warning('Barcode Required', 'Please enter the product barcode manually.');
      return;
    }

    try {
      setVerifyingItem(itemId);
      const res = await pickingAPI.verifyBarcode(task.id, {
        picking_item_id: itemId,
        barcode: code
      });

      if (res.data.valid) {
        setVerifiedItems((prev) => ({ ...prev, [itemId]: true }));
        toast.success('Barcode Matched', res.data.message);
      }
    } catch (err) {
      setVerifiedItems((prev) => ({ ...prev, [itemId]: false }));
      toast.error('Verification Mismatch', err.response?.data?.error || 'Incorrect barcode entered.');
    } finally {
      setVerifyingItem(null);
    }
  };

  const handleConfirmPick = async (item) => {
    const qty = parseInt(qtyInputs[item.id] || item.required_qty);
    const barcodeScanned = barcodeInputs[item.id] || item.barcode;

    if (!verifiedItems[item.id]) {
      toast.warning('Verification Needed', 'You must verify the barcode before confirming pick.');
      return;
    }

    if (qty <= 0 || qty > item.required_qty) {
      toast.warning('Invalid Quantity', `Pick quantity must be between 1 and ${item.required_qty}.`);
      return;
    }

    try {
      setConfirmingItem(item.id);
      await pickingAPI.confirmItem(task.id, {
        picking_item_id: item.id,
        picked_qty: qty,
        barcode_scanned: barcodeScanned
      });
      toast.success('Item Confirmed', `Picked ${qty} unit(s) of ${item.product_name}`);
      fetchTask();
    } catch (err) {
      toast.error('Confirmation Failed', err.response?.data?.error || err.message);
    } finally {
      setConfirmingItem(null);
    }
  };

  const handleOpenErrorReport = (item) => {
    setErrorItem(item);
    setErrorType('MISSING_ITEM');
    setErrorDescription('');
    setErrorModalOpen(true);
  };

  const handleSubmitError = async (e) => {
    e.preventDefault();
    if (!errorDescription.trim()) {
      toast.warning('Details Required', 'Please provide a description of the issue.');
      return;
    }

    try {
      setSubmittingError(true);
      await pickingAPI.reportError(task.id, {
        picking_item_id: errorItem?.id,
        error_type: errorType,
        description: errorDescription
      });
      toast.success('Incident Reported', 'Issue logged and supervisor notified.');
      setErrorModalOpen(false);
      fetchTask();
    } catch (err) {
      toast.error('Report Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmittingError(false);
    }
  };

  const handleCompleteTask = async () => {
    try {
      setCompletingTask(true);
      await pickingAPI.completeTask(task.id);
      toast.success('Picking Completed', 'Order queued for Packing inspection!');
      navigate('/picking');
    } catch (err) {
      toast.error('Completion Error', err.response?.data?.error || err.message);
    } finally {
      setCompletingTask(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading pick list details..." />;
  }

  if (!task) return null;

  const totalRequired = task.items?.reduce((sum, i) => sum + i.required_qty, 0) || 0;
  const totalPicked = task.items?.reduce((sum, i) => sum + i.picked_qty, 0) || 0;
  const allAccountedFor = task.items?.every((i) => i.status === 'PICKED' || i.status === 'SHORTAGE' || i.status === 'DAMAGED');
  const progressPercent = totalRequired > 0 ? Math.round((totalPicked / totalRequired) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            to="/picking"
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{task.task_number}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                task.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {task.status}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Order: <span className="font-semibold text-gray-800">{task.order_number}</span> • Customer: {task.customer_name} • Assigned: {task.picker_name}
            </p>
          </div>
        </div>

        {/* Start / Complete Actions */}
        <div className="flex items-center gap-2">
          {task.status === 'PENDING' && (
            <button
              onClick={handleStartTask}
              className="btn-primary bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Picking
            </button>
          )}

          {task.status === 'IN_PROGRESS' && (
            <button
              onClick={handleCompleteTask}
              disabled={!allAccountedFor || completingTask}
              className="btn-primary bg-emerald-600 hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {completingTask ? 'Completing...' : 'Complete Picking'}
            </button>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="card bg-white p-5 border-l-4 border-l-blue-600">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Picking Progress</span>
            <p className="text-lg font-bold text-gray-900">
              {totalPicked} of {totalRequired} Units Picked ({progressPercent}%)
            </p>
          </div>
          <span className="text-xs text-gray-500">
            {task.items?.filter((i) => i.status === 'PICKED').length} of {task.items?.length} line items completed
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Picking Items Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Items to Pick</h2>

        {task.items?.map((item, index) => {
          const isItemPicked = item.status === 'PICKED';
          const isVerified = verifiedItems[item.id];
          const hasMismatch = verifiedItems[item.id] === false;

          return (
            <div
              key={item.id}
              className={`card p-5 transition-all duration-200 ${
                isItemPicked
                  ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                  : 'bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Left: Product & Bin Location Info */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      #{index + 1}
                    </span>
                    <h3 className="font-bold text-gray-900 text-base">{item.product_name}</h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded">
                      SKU: <strong className="text-gray-900">{item.sku}</strong>
                    </span>
                    <span className="font-mono bg-gray-100 text-gray-700 px-2.5 py-1 rounded">
                      Barcode: <strong className="text-gray-900">{item.barcode}</strong>
                    </span>
                  </div>

                  {/* Prominent Bin Location Badge */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white font-mono font-bold text-sm shadow-sm">
                      <MapPin className="w-4 h-4" />
                      BIN: {item.bin_location_code}
                    </div>
                    {item.bin_zone && (
                      <span className="text-xs text-gray-500">({item.bin_zone})</span>
                    )}
                  </div>
                </div>

                {/* Middle: Required & Picked Quantity */}
                <div className="flex items-center justify-around sm:justify-start gap-8 bg-gray-50 p-3.5 rounded-xl text-center border border-gray-100">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Required</span>
                    <span className="text-xl font-bold text-gray-900">{item.required_qty}</span>
                  </div>
                  <div className="h-8 w-px bg-gray-200" />
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase block">Picked</span>
                    <span className={`text-xl font-bold ${isItemPicked ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {item.picked_qty}
                    </span>
                  </div>
                </div>

                {/* Right: Barcode Verification & Confirmation Form */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {isItemPicked ? (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-100/70 px-4 py-2 rounded-lg font-semibold text-sm">
                      <CheckCircle2 className="w-5 h-5" />
                      Item Picked
                    </div>
                  ) : task.status === 'COMPLETED' ? (
                    <span className="text-xs text-gray-400 italic">Task Completed</span>
                  ) : (
                    <>
                      {/* Barcode Manual Entry */}
                      <div className="flex items-center gap-1.5">
                        <div className="relative">
                          <Barcode className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Enter Barcode"
                            value={barcodeInputs[item.id] || ''}
                            onChange={(e) =>
                              setBarcodeInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            className={`input-field pl-8 font-mono text-xs w-40 ${
                              isVerified ? 'border-emerald-500 bg-emerald-50 text-emerald-900' :
                              hasMismatch ? 'border-red-500 bg-red-50 text-red-900' : ''
                            }`}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleVerifyBarcode(item.id)}
                          disabled={verifyingItem === item.id}
                          className={`btn-secondary text-xs px-3 py-2 ${
                            isVerified ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''
                          }`}
                        >
                          {verifyingItem === item.id ? '...' : isVerified ? <Check className="w-4 h-4" /> : 'Verify'}
                        </button>
                      </div>

                      {/* Quantity Input */}
                      <input
                        type="number"
                        min="1"
                        max={item.required_qty}
                        value={qtyInputs[item.id] ?? item.required_qty}
                        onChange={(e) =>
                          setQtyInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        className="input-field w-16 text-center text-xs font-bold"
                      />

                      {/* Confirm Pick Button */}
                      <button
                        type="button"
                        onClick={() => handleConfirmPick(item)}
                        disabled={confirmingItem === item.id || !isVerified}
                        className="btn-primary text-xs px-4 py-2 disabled:opacity-40"
                      >
                        {confirmingItem === item.id ? 'Saving...' : 'Confirm'}
                      </button>

                      {/* Report Issue Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenErrorReport(item)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Report Damaged or Missing Item"
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Error Modal */}
      <Modal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        title="Report Picking Incident"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setErrorModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitError}
              disabled={submittingError}
              className="btn-danger"
            >
              {submittingError ? 'Logging...' : 'Report Incident'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmitError} className="space-y-4">
          <p className="text-sm text-gray-600">
            Reporting an issue with <strong className="text-gray-900">{errorItem?.product_name}</strong> (SKU: {errorItem?.sku})
          </p>

          <div>
            <label className="label">Error Type</label>
            <select
              value={errorType}
              onChange={(e) => setErrorType(e.target.value)}
              className="input-field"
            >
              <option value="MISSING_ITEM">Missing Item (Not at Bin Location)</option>
              <option value="DAMAGED_ITEM">Damaged Goods (Defective Packaging)</option>
              <option value="SHORTAGE">Quantity Shortage (Fewer than required)</option>
            </select>
          </div>

          <div>
            <label className="label">Description / Discrepancy Details</label>
            <textarea
              required
              rows={3}
              placeholder="Describe the exact location state, unit condition, or physical count..."
              value={errorDescription}
              onChange={(e) => setErrorDescription(e.target.value)}
              className="input-field"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
