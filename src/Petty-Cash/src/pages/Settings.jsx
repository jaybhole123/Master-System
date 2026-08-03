import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Trash2, Plus } from 'lucide-react';
import supabase from '../../../SupabaseClient';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('groupHeads');

  // Group Heads State
  const [groupHeads, setGroupHeads] = useState([]);
  const [newGroupHead, setNewGroupHead] = useState('');
  const [loadingGroupHeads, setLoadingGroupHeads] = useState(true);

  // Payment Modes State
  const [paymentModes, setPaymentModes] = useState([]);
  const [newPaymentMode, setNewPaymentMode] = useState('');
  const [loadingPaymentModes, setLoadingPaymentModes] = useState(true);

  // ===== FETCH ON MOUNT =====
  useEffect(() => {
    fetchGroupHeads();
    fetchPaymentModes();
  }, []);

  const fetchGroupHeads = async () => {
    setLoadingGroupHeads(true);
    const { data, error } = await supabase
      .from('petty_cash_setting')
      .select('id, group_head')
      .not('group_head', 'is', null);
    if (error) {
      toast.error('Failed to load group heads');
    } else {
      setGroupHeads(data || []);
    }
    setLoadingGroupHeads(false);
  };

  const fetchPaymentModes = async () => {
    setLoadingPaymentModes(true);
    const { data, error } = await supabase
      .from('petty_cash_setting')
      .select('id, payment_mode')
      .not('payment_mode', 'is', null);
    if (error) {
      toast.error('Failed to load payment modes');
    } else {
      setPaymentModes(data || []);
    }
    setLoadingPaymentModes(false);
  };

  // ===== GROUP HEADS =====
  const handleAddGroupHead = async () => {
    if (!newGroupHead.trim()) {
      toast.error('Please enter group head name');
      return;
    }
    const { data, error } = await supabase
      .from('petty_cash_setting')
      .insert([{ group_head: newGroupHead.trim() }])
      .select('id, group_head')
      .single();
    if (error) {
      toast.error('Failed to add group head');
    } else {
      setGroupHeads(prev => [...prev, data]);
      setNewGroupHead('');
      toast.success('Group head added successfully!');
    }
  };

  const handleDeleteGroupHead = async (id) => {
    const { error } = await supabase
      .from('petty_cash_setting')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete group head');
    } else {
      setGroupHeads(prev => prev.filter(gh => gh.id !== id));
      toast.success('Group head deleted!');
    }
  };

  // ===== PAYMENT MODES =====
  const handleAddPaymentMode = async () => {
    if (!newPaymentMode.trim()) {
      toast.error('Please enter payment mode');
      return;
    }
    const { data, error } = await supabase
      .from('petty_cash_setting')
      .insert([{ payment_mode: newPaymentMode.trim() }])
      .select('id, payment_mode')
      .single();
    if (error) {
      toast.error('Failed to add payment mode');
    } else {
      setPaymentModes(prev => [...prev, data]);
      setNewPaymentMode('');
      toast.success('Payment mode added successfully!');
    }
  };

  const handleDeletePaymentMode = async (id) => {
    const { error } = await supabase
      .from('petty_cash_setting')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete payment mode');
    } else {
      setPaymentModes(prev => prev.filter(pm => pm.id !== id));
      toast.success('Payment mode deleted!');
    }
  };

  return (
    <div className="p-6 space-y-6">

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('groupHeads')}
            className={`py-3 px-4 font-medium border-b-2 transition ${activeTab === 'groupHeads'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            Group Heads
          </button>
          <button
            onClick={() => setActiveTab('paymentModes')}
            className={`py-3 px-4 font-medium border-b-2 transition ${activeTab === 'paymentModes'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
          >
            Payment Modes
          </button>
        </div>
      </div>

      {/* GROUP HEADS TAB */}
      {activeTab === 'groupHeads' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Manage Approval Heads</h2>

          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newGroupHead}
              onChange={(e) => setNewGroupHead(e.target.value)}
              placeholder="Enter group head name"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              onKeyPress={(e) => e.key === 'Enter' && handleAddGroupHead()}
            />
            <button
              onClick={handleAddGroupHead}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              <Plus size={20} /> Add
            </button>
          </div>

          {loadingGroupHeads ? (
            <p className="text-center text-gray-500 py-8">Loading...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupHeads.map((gh) => (
                  <div key={gh.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <span className="font-medium text-gray-900">{gh.group_head}</span>
                    <button
                      onClick={() => handleDeleteGroupHead(gh.id)}
                      className="text-red-600 hover:text-red-800 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {groupHeads.length === 0 && (
                <p className="text-center text-gray-500 py-8">No group heads added yet.</p>
              )}
            </>
          )}
        </div>
      )}

      {/* PAYMENT MODES TAB */}
      {activeTab === 'paymentModes' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Manage Payment Modes</h2>

          <div className="flex gap-3 mb-6">
            <input
              type="text"
              value={newPaymentMode}
              onChange={(e) => setNewPaymentMode(e.target.value)}
              placeholder="Enter payment mode"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              onKeyPress={(e) => e.key === 'Enter' && handleAddPaymentMode()}
            />
            <button
              onClick={handleAddPaymentMode}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              <Plus size={20} /> Add
            </button>
          </div>

          {loadingPaymentModes ? (
            <p className="text-center text-gray-500 py-8">Loading...</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentModes.map((pm) => (
                  <div key={pm.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                    <span className="font-medium text-gray-900">{pm.payment_mode}</span>
                    <button
                      onClick={() => handleDeletePaymentMode(pm.id)}
                      className="text-red-600 hover:text-red-800 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>

              {paymentModes.length === 0 && (
                <p className="text-center text-gray-500 py-8">No payment modes added yet.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
