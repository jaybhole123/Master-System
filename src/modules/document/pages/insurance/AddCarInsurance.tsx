import { useState } from "react";
import { toast } from "react-hot-toast";
import { X, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { submitToGoogleSheets } from "../../utils/googleSheetsService";
import useDataStore from "../../store/dataStore";
import { CarInsuranceItem } from "../../store/dataStore";

interface AddCarInsuranceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddCarInsurance: React.FC<AddCarInsuranceProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addCarInsurance } = useDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entries, setEntries] = useState<Partial<CarInsuranceItem>[]>([{
    id: Math.random().toString(),
    vehicleNo: "",
    ownerName: "",
    insuranceCompany: "",
    policyNo: "",
    policyStartDate: "",
    policyExpiryDate: "",
    idv: "",
    premium: "",
    agentContact: "",
    remarks: "",
  }]);

  if (!isOpen) return null;

  const handleChange = (id: string, field: keyof CarInsuranceItem, value: string) => {
    setEntries((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const addEntry = () => {
    if (entries.length >= 10) {
      toast.error("You can add maximum 10 records at a time.");
      return;
    }

    const lastEntry = entries[entries.length - 1];
    setEntries((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        vehicleNo: "",
        ownerName: lastEntry.ownerName || "",
        insuranceCompany: lastEntry.insuranceCompany || "",
        policyNo: "",
        policyStartDate: lastEntry.policyStartDate || "",
        policyExpiryDate: lastEntry.policyExpiryDate || "",
        idv: "",
        premium: "",
        agentContact: lastEntry.agentContact || "",
        remarks: "",
      },
    ]);
  };

  const removeEntry = (id: string) => {
    if (entries.length === 1) {
      toast.error("At least one entry is required.");
      return;
    }
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    for (const entry of entries) {
      if (!entry.vehicleNo || entry.vehicleNo.trim() === "") {
        toast.error("Please fill Vehicle No for all entries.");
        return;
      }
      if (!entry.policyNo || entry.policyNo.trim() === "") {
        toast.error("Please fill Policy No for all entries.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const now = new Date();
      const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      const insertPromises = entries.map(async (entry, index) => {
        let serverResponseSN = "";
        
        // Calculate status and days remaining for initial state if possible
        const status = "Active";
        const daysRemaining = "";

        const sheetData = [
            "=ROW()-1", // S.No (auto-calculated by formula)
            entry.vehicleNo || "",
            entry.ownerName || "",
            entry.insuranceCompany || "",
            entry.policyNo || "",
            entry.policyStartDate || "",
            entry.policyExpiryDate || "",
            daysRemaining,
            status,
            entry.idv || "",
            entry.premium || "",
            entry.agentContact || "",
            entry.remarks || "",
        ];

        try {
          const res = await submitToGoogleSheets({
            action: "insert",
            sheetName: "Car Insurance",
            data: sheetData,
          });

          if (res && res.serialNo) {
            serverResponseSN = res.serialNo;
          }
        } catch (error) {
          console.error(`Error saving entry ${index + 1}:`, error);
          throw error;
        }

        const newCarInsurance: CarInsuranceItem = {
          id: Math.random().toString(36).substr(2, 9),
          sn: serverResponseSN || "Pending",
          vehicleNo: entry.vehicleNo || "",
          ownerName: entry.ownerName || "",
          insuranceCompany: entry.insuranceCompany || "",
          policyNo: entry.policyNo || "",
          policyStartDate: entry.policyStartDate || "",
          policyExpiryDate: entry.policyExpiryDate || "",
          daysRemaining: daysRemaining,
          status: status,
          idv: entry.idv || "",
          premium: entry.premium || "",
          agentContact: entry.agentContact || "",
          remarks: entry.remarks || "",
        };

        return newCarInsurance;
      });

      const insertedRecords = await Promise.all(insertPromises);
      insertedRecords.forEach((record) => addCarInsurance(record));
      
      toast.success(`${insertedRecords.length} Record(s) added successfully`);
      
      if (onSuccess) onSuccess();
      onClose();

      setEntries([{
        id: Math.random().toString(),
        vehicleNo: "",
        ownerName: "",
        insuranceCompany: "",
        policyNo: "",
        policyStartDate: "",
        policyExpiryDate: "",
        idv: "",
        premium: "",
        agentContact: "",
        remarks: "",
      }]);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save to Google Sheets.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-4 w-full max-w-4xl bg-white rounded-xl">
        <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Add Car Insurance</h2>
            <p className="text-xs text-gray-500">Add details (Max 10)</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[75vh] overflow-y-auto bg-gray-50/30">
          <form id="add-car-insurance-form" onSubmit={handleSubmit} className="space-y-3">
            {entries.map((entry, index) => (
              <div key={entry.id} className="relative p-4 bg-white rounded-lg group border shadow-sm">
                <div className="flex justify-between items-center pb-2 mb-3 border-b border-gray-50">
                  <h3 className="text-xs font-bold tracking-wider text-gray-600 uppercase">
                    Record #{index + 1}
                  </h3>
                  {entries.length > 1 && (
                    <button type="button" onClick={() => removeEntry(entry.id!)} className="p-1 text-red-500 rounded transition-colors hover:text-red-700 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Vehicle No <span className="text-red-500">*</span></label>
                    <input type="text" required className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.vehicleNo} onChange={(e) => handleChange(entry.id!, "vehicleNo", e.target.value)} />
                  </div>
                  
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Owner Name</label>
                    <input type="text" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.ownerName} onChange={(e) => handleChange(entry.id!, "ownerName", e.target.value)} />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Insurance Company</label>
                    <input type="text" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.insuranceCompany} onChange={(e) => handleChange(entry.id!, "insuranceCompany", e.target.value)} />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Policy No <span className="text-red-500">*</span></label>
                    <input type="text" required className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.policyNo} onChange={(e) => handleChange(entry.id!, "policyNo", e.target.value)} />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Policy Start Date</label>
                    <input type="date" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.policyStartDate} onChange={(e) => handleChange(entry.id!, "policyStartDate", e.target.value)} />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Policy Expiry Date</label>
                    <input type="date" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.policyExpiryDate} onChange={(e) => handleChange(entry.id!, "policyExpiryDate", e.target.value)} />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">IDV (₹)</label>
                    <input type="text" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.idv} onChange={(e) => handleChange(entry.id!, "idv", e.target.value)} />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Premium (₹)</label>
                    <input type="text" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.premium} onChange={(e) => handleChange(entry.id!, "premium", e.target.value)} />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Agent / Contact</label>
                    <input type="text" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.agentContact} onChange={(e) => handleChange(entry.id!, "agentContact", e.target.value)} />
                  </div>
                  
                  <div className="md:col-span-3">
                    <label className="block mb-1 text-xs font-semibold text-gray-600">Remarks</label>
                    <input type="text" className="p-2 w-full text-xs font-medium rounded-lg border border-gray-200 transition-colors outline-none focus:ring-1 focus:ring-red-500 bg-gray-50/50 focus:bg-white"
                      value={entry.remarks} onChange={(e) => handleChange(entry.id!, "remarks", e.target.value)} />
                  </div>
                </div>
              </div>
            ))}

            <button type="button" onClick={addEntry} className="flex gap-2 justify-center items-center py-2 w-full text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100 transition-colors border-dashed">
              <Plus size={16} /> Add Another Record
            </button>
          </form>
        </div>

        <div className="flex gap-3 justify-end px-5 py-4 bg-gray-50 rounded-b-xl border-t border-gray-100">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="px-5 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors">
            Cancel
          </button>
          <button type="submit" form="add-car-insurance-form" disabled={isSubmitting} className="flex gap-2 items-center px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={16} /> Save Records
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCarInsurance;
