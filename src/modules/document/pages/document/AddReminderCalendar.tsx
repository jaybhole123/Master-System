import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, Loader } from 'lucide-react';
import { submitToGoogleSheets } from '../../utils/googleSheetsService';

interface AddReminderCalendarProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editItem?: any;
}

interface ReminderFormData {
  month: string;
  date: string;
  policyHolder: string;
  reminder: string;
  company: string;
  policy: string;
  policyNo: string;
}

const AddReminderCalendar: React.FC<AddReminderCalendarProps> = ({ isOpen, onClose, onSuccess, editItem }) => {
  const [formData, setFormData] = useState<ReminderFormData>({
    month: '',
    date: '',
    policyHolder: '',
    reminder: '',
    company: '',
    policy: '',
    policyNo: ''
  });
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (editItem) {
      setFormData({
        month: editItem.month || '',
        date: editItem.date || '',
        policyHolder: editItem.policyHolder || '',
        reminder: editItem.reminder || '',
        company: editItem.company || '',
        policy: editItem.policy || '',
        policyNo: editItem.policyNo || ''
      });
    } else {
      setFormData({ month: '', date: '', policyHolder: '', reminder: '', company: '', policy: '', policyNo: '' });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    if (!formData.month.trim()) { toast.error('Month is required'); return false; }
    if (!formData.date.trim()) { toast.error('Date is required'); return false; }
    if (!formData.policyHolder.trim()) { toast.error('Policy Holder is required'); return false; }
    if (!formData.company.trim()) { toast.error('Company is required'); return false; }
    if (!formData.policy.trim()) { toast.error('Policy is required'); return false; }
    if (!formData.policyNo.trim()) { toast.error('Policy No is required'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const toastId = toast.loading(editItem ? 'Updating Google Sheets...' : 'Submitting to Google Sheets...');

    try {
      const rowData = [
        formData.month,
        formData.date,
        formData.policyHolder,
        formData.reminder,
        formData.company,
        formData.policy,
        formData.policyNo
      ];

      const result = await submitToGoogleSheets({
        action: editItem ? "update" : "insert",
        sheetName: "Reminder Calender",
        data: rowData,
        ...(editItem && { rowIndex: editItem.rowIndex })
      });

      if (result.success) {
        toast.success(editItem ? 'Reminder updated successfully!' : 'Reminder added successfully!', { id: toastId });
        setFormData({ month: '', date: '', policyHolder: '', reminder: '', company: '', policy: '', policyNo: '' });
        if (onSuccess) onSuccess();
        setTimeout(onClose, 1000);
      } else {
        throw new Error(result.error || 'Failed to save to Google Sheets');
      }
    } catch (error) {
      console.error('Error submitting:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add reminder', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">{editItem ? 'Edit Reminder' : 'Add Reminder'}</h2>
          <button onClick={onClose} disabled={submitting} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 md:p-8">
          <form id="add-reminder-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Month <span className="text-red-500">*</span></label>
                <select name="month" required disabled={submitting} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={formData.month} onChange={handleInputChange}>
                  <option value="" disabled>Select Month</option>
                  {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date <span className="text-red-500">*</span></label>
                <input type="date" name="date" required disabled={submitting} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={formData.date} onChange={handleInputChange} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Policy Holder <span className="text-red-500">*</span></label>
              <input type="text" name="policyHolder" required disabled={submitting} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={formData.policyHolder} onChange={handleInputChange} placeholder="Name of the Policy Holder" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reminder</label>
                <input type="text" name="reminder" disabled={submitting} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={formData.reminder} onChange={handleInputChange} placeholder="Reminder Note" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Company <span className="text-red-500">*</span></label>
                <input type="text" name="company" required disabled={submitting} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={formData.company} onChange={handleInputChange} placeholder="Company Name" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Policy <span className="text-red-500">*</span></label>
                <input type="text" name="policy" required disabled={submitting} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={formData.policy} onChange={handleInputChange} placeholder="Policy Name" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">POLICY NO <span className="text-red-500">*</span></label>
                <input type="text" name="policyNo" required disabled={submitting} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none" value={formData.policyNo} onChange={handleInputChange} placeholder="Policy Number" />
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button type="button" onClick={onClose} disabled={submitting} className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-white transition-all">
            Cancel
          </button>
          <button type="submit" form="add-reminder-form" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-200">
            {submitting ? <><Loader className="h-5 w-5 animate-spin" /> Saving...</> : <><Save size={18} /> {editItem ? 'Update Reminder' : 'Save Reminder'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddReminderCalendar;
