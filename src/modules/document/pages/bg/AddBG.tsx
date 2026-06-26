import React, { useState } from 'react';
import useDataStore, { BGItem } from '../../store/dataStore';
import { toast } from 'react-hot-toast';
import { X, Save, Loader2, FileText, Calendar, Building, IndianRupee } from 'lucide-react';
import { submitToGoogleSheets } from '../../utils/googleSheetsService';

interface AddBGProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddBG: React.FC<AddBGProps> = ({ isOpen, onClose }) => {
  const { addBG } = useDataStore();
  const [formData, setFormData] = useState({
    bgName: '',
    bgNo: '',
    bankName: '',
    amount: '',
    startDate: '',
    endDate: '',
    extendExpiryDate: '',
    remarks: '',
    file: null as string | null,
    fileContent: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File size must be less than 50MB");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          file: file.name,
          fileContent: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // 1. Handle File Upload if exists
      let driveFileUrl = "";
      if (formData.file && formData.fileContent) {
        try {
          const uploadRes = await submitToGoogleSheets({
            action: "uploadFile",
            data: {
              base64Data: formData.fileContent,
              fileName: formData.file,
              mimeType: "application/octet-stream",
              folderId: import.meta.env.VITE_GOOGLE_BG_FOLDER_ID,
            },
          });
          if (uploadRes?.success && uploadRes.fileUrl) {
            driveFileUrl = uploadRes.fileUrl;
          }
        } catch (uploadErr) {
          console.error("File upload failed:", uploadErr);
          toast.error("File upload failed, saving record without file.");
        }
      }

      const sn = ""; // Empty: Backend MUST generate this.
      const now = new Date();
      const timestamp = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}, ${now.toLocaleTimeString('en-GB', { hour12: false })}`;

      // 2. Prepare Row Data for 'BG' sheet
      // A: Timestamp | B: Serial No | C: BG Name | D: BG No | E: Bank Name | F: Amount | G: Start Date | H: End Date | I: Extend Expiry | J: Remarks | K: File URL
      const rowData = [
        timestamp,              // A
        sn,                      // B
        formData.bgName,         // C
        formData.bgNo,           // D
        formData.bankName,       // E
        formData.amount,         // F
        formData.startDate,      // G
        formData.endDate,        // H
        formData.extendExpiryDate, // I
        formData.remarks,        // J
        driveFileUrl || "No File" // K
      ];

      const result = await submitToGoogleSheets({
        action: 'insert',
        sheetName: 'BG',
        data: rowData
      });

      if (result.success) {
        // Check for backend version
        if (!result._version) {
          toast.error(
            <div>
              <b>DEPLOYMENT UPDATE REQUIRED</b>
              <br />
              Google Apps Script is outdated.
              <br />
              Please go to Apps Script {"->"} Deploy {"->"} New Version.
            </div>,
            { duration: 6000 }
          );
        }

        const serverSN = result.serialNo;

        const newItem: BGItem = {
          id: Math.random().toString(36).substr(2, 9),
          sn: serverSN || "Processing...",
          Timestamp: timestamp,
          ...formData,
          fileContent: driveFileUrl || undefined,
          file: driveFileUrl || formData.file
        };
        addBG(newItem);

        if (serverSN) {
          toast.success(`BG added successfully! Serial No: ${serverSN}`);
        } else {
          if (!result._version) {
            toast("Entry saved without Serial No (Old Script Version)", { icon: '⚠️' });
          } else {
            toast.success('BG saved! Refreshing sheet to see Serial No...');
          }
        }
        onClose();
        setFormData({
          bgName: '',
          bgNo: '',
          bankName: '',
          amount: '',
          startDate: '',
          endDate: '',
          extendExpiryDate: '',
          remarks: '',
          file: null,
          fileContent: ''
        });
      } else {
        toast.error("Failed to save to Google Sheets");
      }
    } catch (error) {
      console.error("BG Submission Error:", error);
      toast.error("Error saving BG details");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Add New Bank Guarantee</h2>
              <p className="text-xs text-gray-500">Fill in the BG details below</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 max-h-[70vh] overflow-y-auto">
          <form id="add-bg-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600" />
                      BG Name <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    value={formData.bgName}
                    onChange={e => setFormData({ ...formData, bgName: e.target.value })}
                    placeholder="e.g. Performance Guarantee"
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-indigo-600" />
                      BG No <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                    value={formData.bgNo}
                    onChange={e => setFormData({ ...formData, bgNo: e.target.value })}
                    placeholder="e.g. BG/2024/001"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-indigo-600" />
                    Bank Name <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="e.g. HDFC Bank, ICICI Bank, SBI"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <IndianRupee size={14} className="text-indigo-600" />
                    Amount <span className="text-red-500">*</span>
                  </div>
                </label>
                <input
                  type="text"
                  required
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="e.g. ₹10,00,000"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Section 2: Date Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">Date Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-600" />
                      BG Start Date <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50 cursor-pointer"
                    value={formData.startDate}
                    onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-indigo-600" />
                      BG End Date <span className="text-red-500">*</span>
                    </div>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50 cursor-pointer"
                    value={formData.endDate}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-600" />
                    BG Extend Expiry Date <span className="text-gray-400 text-xs">(Optional)</span>
                  </div>
                </label>
                <input
                  type="date"
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50 cursor-pointer"
                  value={formData.extendExpiryDate}
                  onChange={e => setFormData({ ...formData, extendExpiryDate: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Section 3: Additional Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-100 pb-2">Additional Information</h3>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Remarks <span className="text-gray-400 text-xs">(Optional)</span></label>
                <input
                  type="text"
                  className="w-full p-2.5 shadow-input border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-gray-50/50"
                  value={formData.remarks}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Any additional remarks or notes"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-indigo-600" />
                    Upload Document <span className="text-gray-400 text-xs">(Optional, Max 50MB)</span>
                  </div>
                </label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-indigo-400 transition-colors bg-gray-50/50">
                  <input
                    type="file"
                    className="w-full"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                  {formData.file && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
                      <FileText size={14} />
                      <span className="font-medium">Selected: {formData.file}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-white hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-bg-form"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving BG...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Bank Guarantee
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBG;
