import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Loader2 } from "lucide-react";
import { submitToGoogleSheets } from "../../utils/googleSheetsService";
import useDataStore, { CarInsuranceItem } from "../../store/dataStore";

interface EditCarInsuranceProps {
  isOpen: boolean;
  onClose: () => void;
  carInsurance: CarInsuranceItem | null;
}

const EditCarInsurance: React.FC<EditCarInsuranceProps> = ({ isOpen, onClose, carInsurance }) => {
  const { updateCarInsurance } = useDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entry, setEntry] = useState<Partial<CarInsuranceItem>>({});

  useEffect(() => {
    if (carInsurance && isOpen) {
      // Need to format dates to YYYY-MM-DD for input type="date"
      const formatForInput = (dateString: string) => {
        if (!dateString) return "";
        if (dateString.includes('T')) return dateString.split('T')[0];
        
        const sep = dateString.includes('/') ? '/' : '-';
        const parts = dateString.split(sep);
        if (parts.length === 3) {
          const p0 = parseInt(parts[0]);
          const p1 = parseInt(parts[1]);
          const p2 = parseInt(parts[2]);
          
          if (parts[0].length === 4) return dateString;
          if (p0 > 12) return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
          if (p1 > 12) return `${p2}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
          return `${p2}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
        }
        return dateString;
      };

      setEntry({
        ...carInsurance,
        policyStartDate: formatForInput(carInsurance.policyStartDate),
        policyExpiryDate: formatForInput(carInsurance.policyExpiryDate),
      });
    }
  }, [carInsurance, isOpen]);

  if (!isOpen || !carInsurance) return null;

  const handleChange = (field: keyof CarInsuranceItem, value: string) => {
    setEntry((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!entry.vehicleNo || entry.vehicleNo.trim() === "") {
      toast.error("Please fill Vehicle No.");
      return;
    }
    if (!entry.policyNo || entry.policyNo.trim() === "") {
      toast.error("Please fill Policy No.");
      return;
    }

    if (!carInsurance.rowIndex) {
      toast.error("Cannot update: Row index is missing. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert dates back to DD-MM-YYYY format for the sheet to match standard
      const formatForSheet = (dateString: string) => {
        if (!dateString) return "";
        const parts = dateString.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
           return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateString;
      };

      const startDate = formatForSheet(entry.policyStartDate || "");
      const expiryDate = formatForSheet(entry.policyExpiryDate || "");

      const sheetData = [
        carInsurance.sn || "", // S.No
        entry.vehicleNo || "",
        entry.ownerName || "",
        entry.insuranceCompany || "",
        entry.policyNo || "",
        startDate,
        expiryDate,
        carInsurance.daysRemaining || "",
        carInsurance.status || "",
        entry.idv || "",
        entry.premium || "",
        entry.agentContact || "",
        entry.remarks || "",
      ];

      await submitToGoogleSheets({
        action: "update",
        sheetName: "Car Insurance",
        rowIndex: carInsurance.rowIndex,
        data: sheetData,
      });

      const updatedRecord: Partial<CarInsuranceItem> = {
        ...entry,
        policyStartDate: startDate,
        policyExpiryDate: expiryDate,
      };

      updateCarInsurance(carInsurance.id, updatedRecord);
      
      toast.success("Record updated successfully");
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update in Google Sheets.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-4 w-full max-w-4xl bg-white rounded-xl shadow-2xl">
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-50/20">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Edit Car Insurance</h2>
            <p className="text-xs text-gray-500">Update policy details for {carInsurance.vehicleNo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 max-h-[75vh] overflow-y-auto">
          <form id="edit-car-insurance-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Vehicle No <span className="text-red-500">*</span></label>
                <input type="text" required className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.vehicleNo || ""} onChange={(e) => handleChange("vehicleNo", e.target.value)} />
              </div>
              
              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Owner Name</label>
                <input type="text" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.ownerName || ""} onChange={(e) => handleChange("ownerName", e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Insurance Company</label>
                <input type="text" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.insuranceCompany || ""} onChange={(e) => handleChange("insuranceCompany", e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Policy No <span className="text-red-500">*</span></label>
                <input type="text" required className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.policyNo || ""} onChange={(e) => handleChange("policyNo", e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Policy Start Date</label>
                <input type="date" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white cursor-pointer"
                  value={entry.policyStartDate || ""} onChange={(e) => handleChange("policyStartDate", e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Policy Expiry Date</label>
                <input type="date" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white cursor-pointer"
                  value={entry.policyExpiryDate || ""} onChange={(e) => handleChange("policyExpiryDate", e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">IDV (₹)</label>
                <input type="text" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.idv || ""} onChange={(e) => handleChange("idv", e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Premium (₹)</label>
                <input type="text" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.premium || ""} onChange={(e) => handleChange("premium", e.target.value)} />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Agent / Contact</label>
                <input type="text" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.agentContact || ""} onChange={(e) => handleChange("agentContact", e.target.value)} />
              </div>
              
              <div className="md:col-span-3">
                <label className="block mb-1.5 text-xs font-semibold text-gray-700">Remarks</label>
                <input type="text" className="p-2.5 w-full text-sm font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                  value={entry.remarks || ""} onChange={(e) => handleChange("remarks", e.target.value)} />
              </div>
            </div>
          </form>
        </div>

        <div className="flex gap-3 justify-end px-5 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors shadow-sm">
            Cancel
          </button>
          <button type="submit" form="edit-car-insurance-form" disabled={isSubmitting} className="flex gap-2 items-center px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Updating...
              </>
            ) : (
              <>
                <Save size={16} /> Update Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditCarInsurance;
