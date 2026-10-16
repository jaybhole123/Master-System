import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { X, RotateCcw, Loader2, Calendar, Shield, CreditCard, Clock, FileText } from "lucide-react";
import { submitToGoogleSheets } from "../../utils/googleSheetsService";
import useDataStore, { CarInsuranceItem } from "../../store/dataStore";

interface RenewCarInsuranceModalProps {
  isOpen: boolean;
  onClose: () => void;
  carInsurance: CarInsuranceItem | null;
  onSuccess?: () => void;
}

const RenewCarInsuranceModal: React.FC<RenewCarInsuranceModalProps> = ({
  isOpen,
  onClose,
  carInsurance,
  onSuccess,
}) => {
  const { updateCarInsurance } = useDataStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    newPolicyNo: "",
    insuranceCompany: "",
    policyStartDate: "",
    policyExpiryDate: "",
    idv: "",
    premium: "",
    agentContact: "",
    remarks: "",
  });

  useEffect(() => {
    if (carInsurance && isOpen) {
      // Helper to compute next year start date from previous expiry date
      const getSuggestedStartDate = (prevExpiry: string) => {
        if (!prevExpiry) return "";
        let expiryDate: Date | null = null;
        if (prevExpiry.includes("T")) {
          expiryDate = new Date(prevExpiry);
        } else {
          const sep = prevExpiry.includes("/") ? "/" : "-";
          const parts = prevExpiry.split(sep);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              expiryDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            } else {
              const p0 = parseInt(parts[0]);
              const p1 = parseInt(parts[1]);
              const p2 = parseInt(parts[2]);
              expiryDate = new Date(p2, p1 - 1, p0);
            }
          }
        }
        if (expiryDate && !isNaN(expiryDate.getTime())) {
          // New start date = next day after expiry
          const nextDay = new Date(expiryDate);
          nextDay.setDate(nextDay.getDate() + 1);
          return nextDay.toISOString().split("T")[0];
        }
        return "";
      };

      const suggestedStart = getSuggestedStartDate(carInsurance.policyExpiryDate);

      setFormData({
        newPolicyNo: "",
        insuranceCompany: carInsurance.insuranceCompany || "",
        policyStartDate: suggestedStart,
        policyExpiryDate: "", // Empty as requested: user will enter manually
        idv: carInsurance.idv || "",
        premium: carInsurance.premium || "",
        agentContact: carInsurance.agentContact || "",
        remarks: carInsurance.remarks ? `Renewed from ${carInsurance.policyNo || 'prev policy'}` : "Renewed policy",
      });
    }
  }, [carInsurance, isOpen]);

  if (!isOpen || !carInsurance) return null;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.newPolicyNo || formData.newPolicyNo.trim() === "") {
      toast.error("Please enter New Policy No.");
      return;
    }
    if (!formData.policyStartDate) {
      toast.error("Please select Policy Start Date.");
      return;
    }
    if (!formData.policyExpiryDate) {
      toast.error("Please select Policy Expiry Date.");
      return;
    }

    if (!carInsurance.rowIndex) {
      toast.error("Cannot renew: Row index missing. Please refresh the page.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formatForSheet = (dateString: string) => {
        if (!dateString) return "";
        const parts = dateString.split("-");
        if (parts.length === 3 && parts[0].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateString;
      };

      const startDate = formatForSheet(formData.policyStartDate);
      const expiryDate = formatForSheet(formData.policyExpiryDate);

      // Calculate days remaining dynamically
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(formData.policyExpiryDate);
      expDate.setHours(0, 0, 0, 0);
      const timeDiff = expDate.getTime() - today.getTime();
      const daysDiff = Math.round(timeDiff / (1000 * 3600 * 24));
      const daysRemaining = daysDiff.toString();
      const status = daysDiff < 0 ? "Expired" : daysDiff <= 30 ? "Expiring Soon" : "Active";

      const sheetData = [
        carInsurance.sn || "", // S.No
        carInsurance.vehicleNo || "",
        carInsurance.ownerName || "",
        formData.insuranceCompany || carInsurance.insuranceCompany || "",
        formData.newPolicyNo,
        startDate,
        expiryDate,
        daysRemaining,
        status,
        formData.idv || "",
        formData.premium || "",
        formData.agentContact || "",
        formData.remarks || "",
      ];

      await submitToGoogleSheets({
        action: "update",
        sheetName: "Car Insurance",
        rowIndex: carInsurance.rowIndex,
        data: sheetData,
      });

      // Optionally log to Renewal History sheet if available (non-blocking)
      try {
        const renewalLog = [
          new Date().toLocaleString(),
          carInsurance.sn || "",
          carInsurance.vehicleNo || "",
          carInsurance.policyNo || "", // Old policy
          formData.newPolicyNo,        // New policy
          startDate,
          expiryDate,
          formData.premium || "",
          formData.idv || "",
          "Renewed"
        ];
        await submitToGoogleSheets({
          action: "insert",
          sheetName: "Car Insurance Renewal",
          data: renewalLog
        });
      } catch (logErr) {
        // Silently skip if separate log sheet doesn't exist
        console.warn("Renewal log sheet skip:", logErr);
      }

      updateCarInsurance(carInsurance.id, {
        policyNo: formData.newPolicyNo,
        insuranceCompany: formData.insuranceCompany,
        policyStartDate: startDate,
        policyExpiryDate: expiryDate,
        daysRemaining,
        status,
        idv: formData.idv,
        premium: formData.premium,
        agentContact: formData.agentContact,
        remarks: formData.remarks,
      });

      toast.success("Car Insurance renewed successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error("Renewal Error:", error);
      toast.error("Failed to renew in Google Sheets.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-4 w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50/70 via-rose-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100/80 text-red-600 rounded-xl">
              <RotateCcw size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">Renew Car Insurance</h2>
              <p className="text-xs text-gray-500">
                Update policy details for vehicle <span className="font-semibold text-gray-700">{carInsurance.vehicleNo}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Policy Overview Box */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
          <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/80">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Shield size={13} className="text-red-500" /> Current Policy Overview
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-gray-500 block">Vehicle No</span>
                <span className="font-bold text-gray-800">{carInsurance.vehicleNo || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Owner Name</span>
                <span className="font-medium text-gray-800">{carInsurance.ownerName || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Current Policy No</span>
                <span className="font-mono text-gray-800">{carInsurance.policyNo || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Current Expiry</span>
                <span className="font-semibold text-rose-600">
                  {carInsurance.policyExpiryDate ? (carInsurance.policyExpiryDate.includes('T') ? carInsurance.policyExpiryDate.split('T')[0] : carInsurance.policyExpiryDate) : "-"}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form id="renew-car-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="border border-gray-100 rounded-xl p-4 bg-white shadow-sm space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                <Calendar size={13} /> New Renewal Details
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* New Policy No */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Policy No <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter new policy number"
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.newPolicyNo}
                    onChange={(e) => handleChange("newPolicyNo", e.target.value)}
                  />
                </div>

                {/* Insurance Company */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Insurance Company
                  </label>
                  <input
                    type="text"
                    placeholder="Insurance Provider"
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.insuranceCompany}
                    onChange={(e) => handleChange("insuranceCompany", e.target.value)}
                  />
                </div>

                {/* Agent / Contact */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Agent / Contact
                  </label>
                  <input
                    type="text"
                    placeholder="Agent name or contact"
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.agentContact}
                    onChange={(e) => handleChange("agentContact", e.target.value)}
                  />
                </div>

                {/* New Start Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.policyStartDate}
                    onChange={(e) => handleChange("policyStartDate", e.target.value)}
                  />
                </div>

                {/* New Expiry Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    New Expiry Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.policyExpiryDate}
                    onChange={(e) => handleChange("policyExpiryDate", e.target.value)}
                  />
                </div>

                {/* IDV */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    IDV (₹)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 500000"
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.idv}
                    onChange={(e) => handleChange("idv", e.target.value)}
                  />
                </div>

                {/* Premium */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Premium (₹)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 25000"
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.premium}
                    onChange={(e) => handleChange("premium", e.target.value)}
                  />
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2 md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Remarks / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Renewal notes..."
                    className="w-full p-2 text-xs border border-gray-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none font-medium bg-gray-50/50 focus:bg-white transition-colors"
                    value={formData.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-white hover:border-gray-300 transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="renew-car-form"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Processing Renewal...</span>
              </>
            ) : (
              <>
                <RotateCcw size={16} />
                <span>Complete Renewal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RenewCarInsuranceModal;
