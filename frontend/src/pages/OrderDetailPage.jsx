import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  PauseCircle,
  PlayCircle,
  XCircle,
  Hash
} from 'lucide-react';
import { ordersAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const PIPELINE_STAGES = [
  'Order Created',
  'Picking Pending',
  'Picking In Progress',
  'Picking Completed',
  'Packing Pending',
  'Packing In Progress',
  'Packing Completed',
  'Ready for Dispatch',
  'Dispatched',
  'Delivered'
];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickers, setPickers] = useState([]);

  // Modals
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedPickerId, setSelectedPickerId] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdNotes, setHoldNotes] = useState('');
  const [submittingHold, setSubmittingHold] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelNotes, setCancelNotes] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const [resuming, setResuming] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ordersAPI.getById(id);
      setOrder(res.data.order);
    } catch (err) {
      toast.error('Failed to load order', err.response?.data?.error || err.message);
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const loadPickers = async () => {
    try {
      const res = await usersAPI.getStaffByRole('picker');
      setPickers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load pickers:', err);
    }
  };

  const handleOpenAssign = () => {
    loadPickers();
    setSelectedPickerId(order.assigned_picker_id || '');
    setAssignModalOpen(true);
  };

  const handleAssignPicker = async (e) => {
    e.preventDefault();
    if (!selectedPickerId) {
      toast.warning('Selection Required', 'Please select a warehouse picker.');
      return;
    }
    try {
      setSubmittingAssign(true);
      await ordersAPI.assignPicker(order.id, { picker_id: selectedPickerId });
      toast.success('Picker Assigned', 'Order assigned and pick task created.');
      setAssignModalOpen(false);
      fetchOrder();
    } catch (err) {
      toast.error('Assignment Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleHoldOrder = async () => {
    try {
      setSubmittingHold(true);
      await ordersAPI.hold(order.id, { notes: holdNotes || 'Placed on hold by supervisor' });
      toast.success('Order On Hold', `Order ${order.order_number} has been placed on hold.`);
      setHoldModalOpen(false);
      setHoldNotes('');
      fetchOrder();
    } catch (err) {
      toast.error('Hold Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmittingHold(false);
    }
  };

  const handleResumeOrder = async () => {
    try {
      setResuming(true);
      await ordersAPI.resume(order.id);
      toast.success('Order Resumed', `Order ${order.order_number} resumed to workflow.`);
      fetchOrder();
    } catch (err) {
      toast.error('Resume Failed', err.response?.data?.error || err.message);
    } finally {
      setResuming(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      setSubmittingCancel(true);
      await ordersAPI.cancel(order.id, { notes: cancelNotes || 'Cancelled by manager' });
      toast.success('Order Cancelled', `Order ${order.order_number} cancelled and stock released.`);
      setCancelModalOpen(false);
      setCancelNotes('');
      fetchOrder();
    } catch (err) {
      toast.error('Cancellation Failed', err.response?.data?.error || err.message);
    } finally {
      setSubmittingCancel(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading order details..." />;
  }

  if (!order) {
    return null;
  }

  // Calculate current stage index in pipeline
  const currentStageIndex = PIPELINE_STAGES.indexOf(order.status);
  const isSpecialStatus = order.status === 'On Hold' || order.status === 'Cancelled';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            to="/orders"
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
              <StatusBadge status={order.status} />
              <PriorityBadge priority={order.priority} />
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Created on {new Date(order.created_at).toLocaleString()} • ID: #{order.id}
            </p>
          </div>
        </div>

        {/* Action Buttons for Managers */}
        {isManager() && (
          <div className="flex flex-wrap items-center gap-2">
            {order.status !== 'Dispatched' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
              <button
                onClick={handleOpenAssign}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <UserCheck className="w-4 h-4 text-blue-600" />
                {order.assigned_picker_id ? 'Reassign Picker' : 'Assign Picker'}
              </button>
            )}

            {order.status === 'On Hold' ? (
              <button
                onClick={handleResumeOrder}
                disabled={resuming}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-sm flex items-center gap-1.5"
              >
                <PlayCircle className="w-4 h-4" />
                Resume Order
              </button>
            ) : order.status !== 'Dispatched' && order.status !== 'Delivered' && order.status !== 'Cancelled' ? (
              <button
                onClick={() => setHoldModalOpen(true)}
                className="btn-secondary text-sm text-amber-700 hover:bg-amber-50 flex items-center gap-1.5"
              >
                <PauseCircle className="w-4 h-4 text-amber-600" />
                Put On Hold
              </button>
            ) : null}

            {order.status !== 'Dispatched' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="btn-danger text-sm flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                Cancel Order
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pipeline Progress Tracker */}
      <div className="card bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Fulfilment Stage Progress
        </h2>

        {isSpecialStatus ? (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            order.status === 'On Hold' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-semibold text-base">{order.status}</p>
              <p className="text-sm opacity-90">
                {order.status === 'On Hold'
                  ? 'This order is paused. Resume workflow to proceed with picking and packing.'
                  : 'This order was cancelled. Reserved inventory was released back into available stock.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center justify-between min-w-[750px] relative">
              {/* Progress Line */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 z-0" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-blue-600 z-0 transition-all duration-500"
                style={{
                  width: `${Math.max(0, (currentStageIndex / (PIPELINE_STAGES.length - 1)) * 100)}%`
                }}
              />

              {PIPELINE_STAGES.map((stage, idx) => {
                const isPassed = currentStageIndex > idx;
                const isCurrent = currentStageIndex === idx;

                return (
                  <div key={stage} className="flex flex-col items-center relative z-10 text-center w-20">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 shadow-sm ${
                        isCurrent
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110'
                          : isPassed
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border-2 border-gray-300 text-gray-400'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span
                      className={`text-[11px] mt-2 font-medium leading-tight ${
                        isCurrent ? 'text-blue-600 font-bold' : isPassed ? 'text-gray-800' : 'text-gray-400'
                      }`}
                    >
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Customer Information */}
        <div className="card bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
              <User className="w-4 h-4 text-blue-600" />
              Customer Information
            </div>
            <p className="font-bold text-gray-900 text-base">{order.customer_name}</p>
            <p className="text-sm text-gray-600 mt-1">{order.customer_email}</p>
            {order.customer_phone && <p className="text-sm text-gray-600">{order.customer_phone}</p>}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <span>{order.shipping_address}, {order.city} {order.postal_code}</span>
          </div>
        </div>

        {/* Assigned Picker */}
        <div className="card bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
              <Package className="w-4 h-4 text-indigo-600" />
              Picker Assignment
            </div>
            <p className="font-bold text-gray-900 text-base">
              {order.assigned_picker_name || 'Not Assigned'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {order.assigned_picker_id ? `Picker ID #${order.assigned_picker_id}` : 'Pending assignment'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {order.picking_started_at ? (
              <span className="text-blue-600 font-medium">
                Started: {new Date(order.picking_started_at).toLocaleTimeString()}
              </span>
            ) : (
              'Picking not started yet'
            )}
          </div>
        </div>

        {/* Packing Info */}
        <div className="card bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
              <Package className="w-4 h-4 text-purple-600" />
              Packing Staging
            </div>
            <p className="font-bold text-gray-900 text-base">
              {order.packing_info ? (order.packing_info.status === 'COMPLETED' ? 'Completed & Sealed' : 'In Progress') : 'Pending Packing'}
            </p>
            {order.packing_info?.package_dimensions && (
              <p className="text-xs text-gray-600 mt-1">
                Dims: {order.packing_info.package_dimensions} • {order.packing_info.package_weight} kg
              </p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {order.packed_at ? `Packed: ${new Date(order.packed_at).toLocaleTimeString()}` : 'Awaiting inspection'}
          </div>
        </div>

        {/* Dispatch & Carrier */}
        <div className="card bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">
              <Truck className="w-4 h-4 text-emerald-600" />
              Courier & Dispatch
            </div>
            <p className="font-bold text-gray-900 text-base">
              {order.dispatch_info?.courier_name || 'Carrier Unassigned'}
            </p>
            {order.dispatch_info?.tracking_number ? (
              <p className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded mt-1 inline-block">
                {order.dispatch_info.tracking_number}
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">Ready for courier handoff</p>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            {order.dispatched_at ? `Dispatched: ${new Date(order.dispatched_at).toLocaleString()}` : 'Awaiting dispatch'}
          </div>
        </div>
      </div>

      {/* Order Items Table */}
      <div className="card bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Order Products</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {order.items?.length || 0} line items • {order.total_items} total units
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Order Amount</span>
            <p className="text-xl font-bold text-gray-900">${order.total_amount?.toFixed(2)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-y border-gray-100">
              <tr>
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Barcode</th>
                <th className="py-3 px-4">Bin Location</th>
                <th className="py-3 px-4 text-center">Ordered</th>
                <th className="py-3 px-4 text-center">Picked</th>
                <th className="py-3 px-4 text-center">Packed</th>
                <th className="py-3 px-4 text-right">Unit Price</th>
                <th className="py-3 px-4 text-right">Total Price</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {order.items?.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-gray-900">{item.product_name}</p>
                    <p className="text-xs font-mono text-gray-500">{item.sku}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                    {item.barcode}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {item.bin_location}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`font-semibold ${item.picked_qty === item.quantity ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {item.picked_qty}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`font-semibold ${item.packed_qty === item.quantity ? 'text-emerald-600' : 'text-gray-500'}`}>
                      {item.packed_qty}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-gray-600">
                    ${item.unit_price?.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-gray-900">
                    ${item.total_price?.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                      item.status === 'PACKED' ? 'bg-indigo-100 text-indigo-700' :
                      item.status === 'PICKED' ? 'bg-blue-100 text-blue-700' :
                      item.status === 'SHORTAGE' || item.status === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Status History Audit Trail */}
      <div className="card bg-white p-5">
        <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          Status History & Audit Trail
        </h2>

        {order.status_history?.length > 0 ? (
          <div className="flow-root">
            <ul className="-mb-8">
              {order.status_history.map((hist, idx) => (
                <li key={hist.id}>
                  <div className="relative pb-8">
                    {idx !== order.status_history.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    )}
                    <div className="relative flex space-x-3 items-start">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center ring-8 ring-white">
                          <CheckCircle2 className="w-4 h-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Transitioned to <span className="text-blue-600 font-bold">{hist.new_status}</span>
                            {hist.old_status && <span className="text-gray-400 font-normal"> (from {hist.old_status})</span>}
                          </p>
                          {hist.notes && (
                            <p className="text-xs text-gray-600 mt-0.5 bg-gray-50 p-2 rounded border border-gray-100 inline-block">
                              {hist.notes}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            Recorded by: <span className="font-medium text-gray-600">{hist.changed_by_name}</span>
                          </p>
                        </div>
                        <div className="text-right text-xs whitespace-nowrap text-gray-500">
                          {new Date(hist.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No status history recorded yet.</p>
        )}
      </div>

      {/* Assign Picker Modal */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Warehouse Picker"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAssignPicker}
              disabled={submittingAssign}
              className="btn-primary"
            >
              {submittingAssign ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a staff member from the picking team to assign to order <span className="font-semibold text-gray-900">{order.order_number}</span>.
          </p>

          <div>
            <label className="label">Select Picker</label>
            <select
              value={selectedPickerId}
              onChange={(e) => setSelectedPickerId(e.target.value)}
              className="input-field"
            >
              <option value="">-- Choose a Picker --</option>
              {pickers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} (@{p.username})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Hold Modal */}
      <Modal
        isOpen={holdModalOpen}
        onClose={() => setHoldModalOpen(false)}
        title="Place Order On Hold"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setHoldModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleHoldOrder}
              disabled={submittingHold}
              className="btn-primary bg-amber-600 hover:bg-amber-700"
            >
              {submittingHold ? 'Holding...' : 'Hold Order'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Placing this order on hold will pause all picking and packing workflows until resumed.
          </p>
          <div>
            <label className="label">Reason / Notes for Hold</label>
            <textarea
              value={holdNotes}
              onChange={(e) => setHoldNotes(e.target.value)}
              placeholder="e.g. Awaiting customer address verification..."
              rows={3}
              className="input-field"
            />
          </div>
        </div>
      </Modal>

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onConfirm={handleCancelOrder}
        title={`Cancel Order ${order.order_number}?`}
        message="Are you sure you want to cancel this order? All reserved inventory will be automatically restored to available stock."
        confirmLabel="Yes, Cancel Order"
        variant="danger"
        loading={submittingCancel}
      />
    </div>
  );
}
