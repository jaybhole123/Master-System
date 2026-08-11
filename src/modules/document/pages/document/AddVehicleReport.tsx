import React, { useState } from 'react';
import { X, Save, Loader, Car } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitToGoogleSheets } from '../../utils/googleSheetsService';

interface AddVehicleReportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editItem?: any;
  nextSNo?: number;
}

interface VehicleFormData {
  ownerName: string;
  vehicleNo: string;
  vehicleName: string;
  policyNumber: string;
  bank: string;
  premiumDate: string;
  modelNumber: string;
  anual: string;
  purchaseDate: string;
  premiumAmount: string;
}

const AddVehicleReport: React.FC<AddVehicleReportProps> = ({ isOpen, onClose, onSuccess, editItem, nextSNo }) => {
  const [formData, setFormData] = useState<VehicleFormData>({
    ownerName: '',
    vehicleNo: '',
    vehicleName: '',
    policyNumber: '',
    bank: '',
    premiumDate: '',
    modelNumber: '',
    anual: '',
    purchaseDate: '',
    premiumAmount: ''
  });
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (editItem) {
      setFormData({
        ownerName: editItem.ownerName || '',
        vehicleNo: editItem.vehicleNo || '',
        vehicleName: editItem.vehicleName || '',
        policyNumber: editItem.policyNumber || '',
        bank: editItem.bank || '',
        premiumDate: editItem.premiumDate || '',
        modelNumber: editItem.modelNumber || '',
        anual: editItem.anual || '',
        purchaseDate: editItem.purchaseDate || '',
        premiumAmount: editItem.premiumAmount || ''
      });
    } else {
      setFormData({
        ownerName: '', vehicleNo: '', vehicleName: '', policyNumber: '', bank: '',
        premiumDate: '', modelNumber: '', anual: '', purchaseDate: '', premiumAmount: ''
      });
    }
  }, [editItem, isOpen]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    if (!formData.ownerName.trim()) {
      toast.error('Owner Name is required');
      return false;
    }
    if (!formData.vehicleNo.trim()) {
      toast.error('Vehicle Number is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    const toastId = toast.loading(editItem ? 'Updating Google Sheets...' : 'Submitting to Google Sheets...');

    try {
      const sNoValue = editItem ? editItem.sNo : (nextSNo ? nextSNo.toString() : "");
      
      const rowData = [
        sNoValue,
        formData.ownerName,
        formData.vehicleNo,
        formData.vehicleName,
        formData.policyNumber,
        formData.bank,
        formData.premiumDate,
        formData.modelNumber,
        formData.anual,
        formData.purchaseDate,
        formData.premiumAmount
      ];

      const result = await submitToGoogleSheets({
        action: editItem ? "update" : "insert",
        sheetName: "VEHICLE",
        data: rowData,
        ...(editItem && { rowIndex: editItem.rowIndex })
      });

      if (result.success) {
        toast.success(editItem ? 'Vehicle record updated successfully!' : 'Vehicle record added successfully!', { id: toastId });
        if (onSuccess) onSuccess();
        setTimeout(onClose, 1000);
      } else {
        throw new Error('Failed to update Google Sheets');
      }
    } catch (error) {
      console.error('Submission Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-lg">
              <Car className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">{editItem ? 'Edit Vehicle Report' : 'Add Vehicle Report'}</h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full">
            <X size={24} />
          </button>
        </div>

        <form id="add-vehicle-form" onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Owner Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="ownerName"
                value={formData.ownerName}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter owner name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Number <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="vehicleNo"
                value={formData.vehicleNo}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter vehicle no."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Name</label>
              <input
                type="text"
                name="vehicleName"
                value={formData.vehicleName}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter vehicle name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Policy Number</label>
              <input
                type="text"
                name="policyNumber"
                value={formData.policyNumber}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter policy number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Bank</label>
              <input
                type="text"
                name="bank"
                value={formData.bank}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter bank name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Premium Date</label>
              <input
                type="date"
                name="premiumDate"
                value={formData.premiumDate}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Model Number</label>
              <input
                type="text"
                name="modelNumber"
                value={formData.modelNumber}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter model number"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Anual</label>
              <input
                type="text"
                name="anual"
                value={formData.anual}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter anual info"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Date</label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Premium Amount</label>
              <input
                type="number"
                name="premiumAmount"
                value={formData.premiumAmount}
                onChange={handleChange}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                placeholder="Enter premium amount"
              />
            </div>
          </div>
        </form>

        <div className="bg-gray-50 p-6 border-t border-gray-100 rounded-b-2xl flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className="px-5 py-2.5 font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit" form="add-vehicle-form" disabled={submitting} className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-all shadow-lg shadow-red-200">
            {submitting ? <><Loader className="h-5 w-5 animate-spin" /> Saving...</> : <><Save size={18} /> {editItem ? 'Update Report' : 'Save Report'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddVehicleReport;
