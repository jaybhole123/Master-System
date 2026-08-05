import React, { useState, useEffect } from 'react';
import FormCard from '../components/FormCard';
import toast from 'react-hot-toast';
import supabase from '../../../SupabaseClient';
import { sendHelpSlipReplyNotification } from '../../../services/whatsappService';

const HelpSlipList = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const userRole = (localStorage.getItem("role") || "").toLowerCase();
  const loggedInUserName = (localStorage.getItem("user-name") || localStorage.getItem("username") || localStorage.getItem("user_name") || "").trim();
  const isSuperAdmin = userRole === "superadmin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  const fetchHelpSlips = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('help_slips')
        .select('*')
        .order('created_at', { ascending: false });

      // If role is NOT superadmin, filter help slips matching the logged-in username
      if (!isSuperAdmin && loggedInUserName) {
        query = query.ilike('name', loggedInUserName);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching help slips:', err);
      toast.error('Failed to load help slips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelpSlips();
  }, []);

  const formatDateTime = (isoString) => {
    if (!isoString) return { date: '-', time: '-' };
    const dateObj = new Date(isoString);
    return {
      date: dateObj.toLocaleDateString(),
      time: dateObj.toLocaleTimeString()
    };
  };

  const handleSaveReply = async (id) => {
    if (!replyText.trim()) return;

    try {
      const { error } = await supabase
        .from('help_slips')
        .update({ admin_reply: replyText })
        .eq('id', id);

      if (error) throw error;

      toast.success('Reply saved successfully!');

      // Send WhatsApp Notification to user
      const targetRecord = records.find(r => r.id === id);
      if (targetRecord) {
        sendHelpSlipReplyNotification({
          recipientPhone: targetRecord.number,
          recipientName: targetRecord.name,
          challenge: targetRecord.challenge,
          adminReply: replyText
        });
      }

      fetchHelpSlips();
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      console.error('Error saving reply:', err);
      toast.error('Failed to save reply: ' + (err.message || 'Error'));
    }
  };

  const handleDeleteReply = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;
    try {
      const { error } = await supabase
        .from('help_slips')
        .update({ admin_reply: null })
        .eq('id', id);

      if (error) throw error;

      toast.success('Reply deleted successfully!');
      fetchHelpSlips();
      if (replyingTo === id) {
        setReplyingTo(null);
        setReplyText('');
      }
    } catch (err) {
      console.error('Error deleting reply:', err);
      toast.error('Failed to delete reply: ' + (err.message || 'Error'));
    }
  };

  const renderReplySection = (record) => {
    const adminReply = record.admin_reply || record.adminReply;

    if (isAdmin && replyingTo === record.id) {
      return (
        <div className="mt-3 space-y-2">
          <textarea
            className="w-full text-sm p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-200 outline-none resize-none"
            rows={2}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your reply here..."
          />
          <div className="flex gap-2">
            <button 
              onClick={() => handleSaveReply(record.id)} 
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors"
            >
              Save Reply
            </button>
            <button 
              onClick={() => { setReplyingTo(null); setReplyText(''); }} 
              className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (adminReply) {
      return (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
          <div className="flex justify-between items-center mb-1">
            <div className="text-xs font-semibold text-blue-800">Admin Reply:</div>
            {isAdmin && (
              <div className="flex gap-2">
                <button 
                  onClick={() => { setReplyingTo(record.id); setReplyText(adminReply); }} 
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteReply(record.id)} 
                  className="text-xs text-red-600 hover:text-red-800 font-semibold hover:underline transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
          <div className="text-sm text-blue-900">{adminReply}</div>
        </div>
      );
    }

    if (isAdmin) {
      return (
        <button 
          onClick={() => { setReplyingTo(record.id); setReplyText(''); }} 
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors"
        >
          Reply
        </button>
      );
    }

    return <div className="mt-2 text-gray-400 italic text-xs">Pending Admin Reply</div>;
  };

  return (
    <div className="max-w-7xl mx-auto mt-4 mb-16">
      {loading ? (
        <FormCard>
          <div className="text-center py-10 text-gray-500">
            Loading help slips...
          </div>
        </FormCard>
      ) : records.length === 0 ? (
        <FormCard>
          <div className="text-center py-10 text-gray-500">
            No help slip records found.
          </div>
        </FormCard>
      ) : (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200">
                  <th className="p-4 font-semibold text-gray-600 text-sm whitespace-nowrap">Date & Time</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm whitespace-nowrap">Name</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm whitespace-nowrap">Department</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Challenge & Admin Reply</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">Best Solutions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 whitespace-nowrap align-top">
                      <div>{formatDateTime(record.created_at || record.timestamp).date}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{formatDateTime(record.created_at || record.timestamp).time}</div>
                    </td>
                    <td className="p-4 text-sm font-medium text-gray-800 align-top">
                      {record.name}
                      <div className="text-xs text-gray-500 font-normal">{record.number}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600 align-top">
                      {record.department}
                    </td>
                    <td className="p-4 text-sm text-gray-700 min-w-[250px] align-top">
                      <div className="mb-2">{record.challenge}</div>
                      {renderReplySection(record)}
                    </td>
                    <td className="p-4 text-sm text-gray-700 min-w-[200px] space-y-2 align-top">
                      <div>
                        <span className="text-sm font-semibold text-gray-500">Solution 1 - </span>
                        <span>{record.solution1 || '-'}</span>
                      </div>
                      {record.solution2 && (
                        <div>
                          <span className="text-sm font-semibold text-gray-500">Solution 2 - </span>
                          <span>{record.solution2}</span>
                        </div>
                      )}
                      {record.solution3 && (
                        <div>
                          <span className="text-sm font-semibold text-gray-500">Solution 3 - </span>
                          <span>{record.solution3}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden p-4 space-y-4">
            {records.map((record) => (
              <div key={record.id} className="bg-white rounded-3xl shadow-sm border border-gray-200 p-5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs uppercase tracking-[0.24em] text-gray-400">Date & Time</div>
                    <div className="text-sm text-slate-700">
                      <div>{formatDateTime(record.created_at || record.timestamp).date}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(record.created_at || record.timestamp).time}</div>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-xs uppercase tracking-[0.24em] text-gray-400">Department</div>
                    <div className="text-sm font-semibold text-slate-700">{record.department}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-800">{record.name}</div>
                  <div className="text-xs text-gray-500">{record.number}</div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Challenge</div>
                    <div className="text-sm text-gray-700">{record.challenge}</div>
                    <div className="pt-2">
                      {renderReplySection(record)}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-gray-700">
                      <span className="font-semibold text-gray-500">Solution 1 - </span>
                      <span>{record.solution1 || '-'}</span>
                    </div>
                    {record.solution2 && (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-gray-700">
                        <span className="font-semibold text-gray-500">Solution 2 - </span>
                        <span>{record.solution2}</span>
                      </div>
                    )}
                    {record.solution3 && (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-gray-700">
                        <span className="font-semibold text-gray-500">Solution 3 - </span>
                        <span>{record.solution3}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpSlipList;
