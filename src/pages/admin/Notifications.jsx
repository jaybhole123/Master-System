import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Bell, Plus, Trash2, Shield, User, Globe, Clock, Loader2, X, CheckCheck } from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import { fetchNotifications, createNotification, removeNotification, markAsRead } from "../../redux/slice/notificationSlice";
import { useMagicToast } from "../../context/MagicToastContext";
import supabase from "../../SupabaseClient";
import { sendCustomNotificationReminder } from "../../services/whatsappService";

export default function Notifications() {
  const dispatch = useDispatch();
  const { showToast } = useMagicToast();
  const { list, loading } = useSelector((state) => state.notifications);
  const currentUserRole = (localStorage.getItem("role") || "").toLowerCase();
  const currentUsername = (localStorage.getItem("user-name") || "Admin");
  const currentUserId = localStorage.getItem("user-id");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    roleTarget: "all",
    reminderDate: "",
  });
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const isAdmin = currentUserRole === "admin" || currentUserRole === "superadmin";

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('user_name').eq('status', 'active').order('user_name');
      if (data) setAllUsers(data.map(u => u.user_name));
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUserRole) {
      dispatch(fetchNotifications({ role: currentUserRole, userId: currentUserId }));
    }
  }, [dispatch, currentUserRole, currentUserId]);

  // --- AUTOMATIC WHATSAPP REMINDER SENDER ---
  useEffect(() => {
    const autoSendReminders = async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('reminder_date', today)
        .eq('reminder_sent', false)
        .not('custom_targets', 'is', null);

      if (!error && data && data.length > 0) {
        let anySent = false;
        
        for (const noti of data) {
          if (!noti.custom_targets || noti.custom_targets.length === 0) continue;
          
          // Get phone numbers for all targets
          const usernames = noti.custom_targets.map(t => t.user);
          const { data: usersInfo } = await supabase
            .from('users')
            .select('user_name, number')
            .in('user_name', usernames);

          if (usersInfo && usersInfo.length > 0) {
            for (const user of usersInfo) {
              await sendCustomNotificationReminder({
                phone: user.number,
                name: user.user_name,
                subject: noti.title,
                message: noti.message,
                date: noti.reminder_date
              });
            }
            await supabase.from('notifications').update({ reminder_sent: true }).eq('id', noti.id);
            anySent = true;
          }
        }
      }
    };
    
    autoSendReminders();
  }, []);
  // ------------------------------------------

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      showToast("Please fill all fields", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const target = formData.roleTarget === 'custom_users' ? 'custom_users' : (formData.roleTarget === 'specific_user' ? `person:${selectedUsers[0]}` : formData.roleTarget);
      
      await dispatch(
        createNotification({
          ...formData,
          roleTarget: target,
          createdBy: currentUserId || null,
          customTargets: formData.roleTarget === 'custom_users' ? selectedUsers : null,
          reminderDate: formData.reminderDate || null
        })
      ).unwrap();
      showToast("Notification created successfully", "success");
      setIsModalOpen(false);
      setFormData({ title: "", message: "", roleTarget: "all", reminderDate: "" });
      setSelectedUsers([]);
    } catch (err) {
      showToast(err || "Failed to create notification", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return;
    try {
      await dispatch(removeNotification(id)).unwrap();
      showToast("Notification deleted", "success");
    } catch (err) {
      showToast("Failed to delete notification", "error");
    }
  };

  const handleMarkAsRead = (notificationId, isRead) => {
    if (!isRead && currentUserId) {
      dispatch(markAsRead({ notificationId, userId: currentUserId }));
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header - Chat Style */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-gray-100 pb-8">
          <div>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200">
                <Bell className="text-white" size={24} />
              </div>
              <div className="h-10 w-px bg-gray-100" />
              <div>
                <h1 className="text-4xl font-black text-gray-900 tracking-tighter">
                  Updates <span className="text-red-600">Feed</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-gray-500 font-bold text-sm tracking-tight">System announcements and priority alerts</p>
              {list.filter(n => !n.isRead).length > 0 && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  {list.filter(n => !n.isRead).length} Unread
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
             {isAdmin && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="group flex items-center justify-center gap-2 bg-gray-900 hover:bg-red-600 text-white px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-gray-200 hover:shadow-red-200"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
                <span className="tracking-tight">New Broadcast</span>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
              <p className="font-semibold text-gray-500 text-sm">Fetching notifications...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center shadow-sm">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                <Bell size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No notifications yet</h3>
              <p className="text-gray-500">When announcements are made, they will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {list.map((noti) => (
                <div
                  key={noti.id}
                  onMouseEnter={() => handleMarkAsRead(noti.id, noti.isRead)}
                  className={`group relative flex gap-4 md:gap-6 p-2 transition-all duration-300`}
                >
                  {/* Left: Avatar & Connector */}
                  <div className="flex flex-col items-center">
                    <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center border-2 shadow-sm transition-transform duration-300 ${
                      noti.isRead 
                        ? 'bg-white border-gray-100 text-gray-400' 
                        : 'bg-red-600 border-red-600 text-white'
                    }`}>
                      {noti.creator?.profile_image ? (
                        <img src={noti.creator.profile_image} alt="" className="w-full h-full object-cover rounded-[inherit]" />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div className="w-0.5 flex-1 bg-gray-100 mt-2 mb-2" />
                  </div>

                  {/* Right: Content Bubble */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 px-1">
                      <span className="text-sm font-bold text-gray-900">
                        {noti.creator?.user_name || "Admin"}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span className="text-xs font-medium text-gray-500">
                        {new Date(noti.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        {new Date(noti.created_at).toLocaleDateString() !== new Date().toLocaleDateString() && (
                          <> • {new Date(noti.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</>
                        )}
                      </span>
                      
                      {/* Status Badges */}
                      <div className="ml-auto flex items-center gap-3">
                         <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          noti.role_target === 'all' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                          noti.role_target === 'admin' ? 'bg-red-50 text-red-600 border-red-100' :
                          noti.role_target === 'superadmin' ? 'bg-red-50 text-red-600 border-red-100' :
                          noti.role_target === 'custom_users' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                          noti.role_target.startsWith('person:') ? 'bg-purple-50 text-purple-600 border-purple-100' :
                          'bg-orange-50 text-orange-600 border-orange-100'
                        }`}>
                          {noti.role_target.startsWith('person:') ? noti.role_target.replace('person:', 'User: ') : (noti.role_target === 'custom_users' ? 'Selected Users' : noti.role_target)}
                        </span>
                        {noti.isRead ? (
                          <CheckCheck size={16} className="text-blue-500" />
                        ) : (
                          <div className="w-2.5 h-2.5 bg-red-600 rounded-full shadow-sm" />
                        )}
                      </div>
                    </div>

                    <div className={`relative p-5 md:p-6 rounded-2xl transition-all duration-300 border ${
                      noti.isRead 
                        ? 'bg-white border-gray-100 shadow-sm' 
                        : 'bg-white border-red-100 shadow-md ring-1 ring-red-50'
                    }`}>
                      {/* Chat Bubble Tail */}
                      <div className={`absolute top-4 -left-2 w-4 h-4 rotate-45 border-l border-b transition-all duration-300 ${
                        noti.isRead ? 'bg-white border-gray-100' : 'bg-white border-red-100'
                      }`} />

                      <h3 className={`text-lg font-bold mb-1 transition-colors ${
                        noti.isRead ? 'text-gray-700' : 'text-red-700'
                      }`}>
                        {noti.title}
                      </h3>
                      <p className="text-sm md:text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {noti.message}
                      </p>

                      {isAdmin && (
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleDelete(noti.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Modal - Simplified Style */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => !isSubmitting && setIsModalOpen(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Create Notification</h2>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <form onSubmit={handleCreate} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Subject</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Title of notification"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Message</label>
                    <textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows="4"
                      placeholder="Details of the announcement..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700">Target Audience</label>
                    <select
                      value={formData.roleTarget}
                      onChange={(e) => setFormData({ ...formData, roleTarget: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900 cursor-pointer"
                    >
                      <option value="all">Everyone</option>
                      <option value="admin">Admins</option>
                      <option value="custom_users">Custom Selected Users (WhatsApp Reminder)</option>
                    </select>
                  </div>

                  {formData.roleTarget === "custom_users" && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Reminder Date (For WhatsApp)</label>
                        <input
                          type="date"
                          required
                          value={formData.reminderDate}
                          onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-600 focus:bg-white outline-none transition-all text-gray-900"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 flex justify-between items-center">
                          <span>Select Target Users/Admins</span>
                          <div className="flex gap-3 items-center">
                            <button type="button" onClick={() => setSelectedUsers([...allUsers])} className="text-xs font-bold text-red-600 hover:underline">Select All</button>
                            <button type="button" onClick={() => setSelectedUsers([])} className="text-xs font-bold text-gray-500 hover:underline">Unselect All</button>
                            <span className="text-xs text-gray-400 font-normal ml-1 border-l pl-3 border-gray-300">{selectedUsers.length} selected</span>
                          </div>
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 border border-gray-200 rounded-xl">
                          {allUsers.map(u => (
                            <label key={u} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                              <input 
                                type="checkbox"
                                checked={selectedUsers.includes(u)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedUsers([...selectedUsers, u]);
                                  else setSelectedUsers(selectedUsers.filter(user => user !== u));
                                }}
                                className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                              />
                              <span className="text-sm text-gray-700 font-medium truncate">{u}</span>
                            </label>
                          ))}
                        </div>
                        {selectedUsers.length === 0 && <p className="text-xs text-red-500 font-medium">Please select at least one user.</p>}
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        "Send Notification"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
