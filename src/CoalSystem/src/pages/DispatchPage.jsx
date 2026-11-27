import React, { useState, useEffect, useMemo, useCallback } from "react";
import supabase from "../../../SupabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";
import { usePagePermission } from "../../../hooks/usePagePermission";
import {
  Truck,
  Package,
  List,
  Hourglass,
  Scale,
  Hash,
  Eye,
  Pencil,
  Trash2,
  X,
  Download,
  Printer,
  RotateCcw,
  Plus,
  Check,
  ChevronDown,
  FileSpreadsheet,
  FileText
} from "lucide-react";

const STORAGE_KEY = "coalDispatchV2";

const defaultState = () => ({
  dos: [],
  trucks: [],
  act: 0,
  nid: 10
});

class DispatchErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Dispatch Page Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white rounded-2xl border border-rose-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900">Something went wrong in Dispatch Page</h2>
          <p className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded-xl border border-slate-200 text-left overflow-x-auto">
            {String(this.state.error?.message || this.state.error)}
          </p>
          <button
            onClick={() => {
              try {
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem("coalDispatchV1");
              } catch(e) {}
              window.location.reload();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
          >
            Reset Storage & Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function DispatchPageContent() {
  const { canWrite } = usePagePermission("Coal System", "Dispatch");
  const [store, setStore] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          dos: Array.isArray(parsed?.dos) ? parsed.dos : [],
          trucks: Array.isArray(parsed?.trucks) ? parsed.trucks : [],
          act: parsed?.act || 0,
          nid: parsed?.nid || 10
        };
      }
      const old = localStorage.getItem("coalDispatchV1");
      if (old) {
        const o = JSON.parse(old);
        return {
          dos: [{ id: 1, co: o.co, no: o.dono || "", tot: o.tot, parties: o.parties || [] }],
          trucks: (o.trucks || []).map((t) => ({
            id: t.id,
            did: 1,
            pid: t.pid,
            no: t.no,
            date: t.date,
            qty: t.qty,
            tp: t.tp || "",
            done: !!t.done
          })),
          act: 1,
          nid: (o.nid || 10) + 10
        };
      }
    } catch (e) {
      console.error("Failed to load initial dispatch data:", e);
    }
    return defaultState();
  });

  const [selectedTruckFilter, setSelectedTruckFilter] = useState("");
  const [selectedPartyLifterFilter, setSelectedPartyLifterFilter] = useState("");
  const [selectedTruckIds, setSelectedTruckIds] = useState(new Set());
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("ALL");
  const [mainSectionTab, setMainSectionTab] = useState("do-master"); // 'do-master' | 'party-order' | 'truck-dispatch'
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' | 'history' for truck dispatch

  // Modal State
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: "",
    type: "", // 'doForm' | 'viewDO' | 'partyForm' | 'viewParty' | 'truckForm' | 'viewTruck' | 'confirm'
    data: null,
    error: ""
  });

  // Professional Quick Add Popup State (Instead of browser prompt)
  const [quickAddModal, setQuickAddModal] = useState({
    isOpen: false,
    title: "",
    label: "",
    placeholder: "",
    value: "",
    onConfirm: null
  });

  // Form Fields State
  const [formData, setFormData] = useState({});
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const [isMinesDropdownOpen, setIsMinesDropdownOpen] = useState(false);
  const [isLifterDropdownOpen, setIsLifterDropdownOpen] = useState(false);
  const [isTruckNoDropdownOpen, setIsTruckNoDropdownOpen] = useState(false);
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);
  const [isLoadingDOs, setIsLoadingDOs] = useState(false);

  // Fetch DOs, Parties and Trucks directly from Supabase
  const fetchDOsFromSupabase = useCallback(async () => {
    setIsLoadingDOs(true);
    try {
      const [dosRes, partiesRes, trucksRes] = await Promise.all([
        supabase.from("do_master").select("*").order("created_at", { ascending: true }),
        supabase.from("party_order").select("*").order("created_at", { ascending: true }),
        supabase.from("truck_dispatch").select("*").order("created_at", { ascending: false })
      ]);

      if (dosRes.error) {
        console.error("Error fetching from do_master:", dosRes.error);
        return;
      }

      const partiesList = Array.isArray(partiesRes?.data) ? partiesRes.data : [];
      const trucksList = Array.isArray(trucksRes?.data) ? trucksRes.data : [];

      // Group parties by do_id
      const partiesByDO = new Map();
      partiesList.forEach((p) => {
        const doIdStr = String(p.do_id);
        if (!partiesByDO.has(doIdStr)) {
          partiesByDO.set(doIdStr, []);
        }
        partiesByDO.get(doIdStr).push({
          id: p.id,
          name: p.party_name,
          qty: parseFloat(p.order_qty) || 0
        });
      });

      // Map trucks
      const mappedTrucks = trucksList.map((t) => ({
        id: t.id,
        did: t.do_id,
        pid: t.party_id,
        no: t.truck_no,
        driver: t.driver_name || "",
        tp: t.tp_no || "",
        date: t.dispatch_date || "",
        qty: parseFloat(t.net_weight_mt) || 0,
        done: t.status === "done"
      }));

      if (Array.isArray(dosRes.data)) {
        setStore((prev) => {
          const mappedDOs = dosRes.data.map((item) => {
            const doIdStr = String(item.id);
            const dbParties = partiesByDO.get(doIdStr) || [];

            return {
              id: item.id,
              co: item.company_name || "",
              no: item.do_no || "",
              tot: parseFloat(item.do_qty) || 0,
              vf: item.valid_from || "",
              vt: item.valid_to || "",
              mines: item.mines || "",
              parties: dbParties
            };
          });

          const nextAct = mappedDOs.some((d) => d.id === prev.act)
            ? prev.act
            : (mappedDOs[0]?.id || 0);

          return {
            ...prev,
            dos: mappedDOs,
            trucks: mappedTrucks,
            act: nextAct
          };
        });
      }
    } catch (err) {
      console.error("fetchDOsFromSupabase failed:", err);
    } finally {
      setIsLoadingDOs(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchDOsFromSupabase();
  }, [fetchDOsFromSupabase]);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }, [store]);

  // Helpers
  const formatNumber = (num) => {
    return (Math.round((num || 0) * 100) / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (val) => {
    if (!val) return "-";
    return val.split("-").reverse().join("-");
  };

  const getExpiryDetails = (validTo, validFrom) => {
    if (!validTo) return { text: "-", badgeClass: "bg-slate-100 text-slate-500", days: null };
    try {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const toDate = new Date(validTo);
      toDate.setHours(0, 0, 0, 0);

      const diffTime = toDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          text: `Expired (${Math.abs(diffDays)}d ago)`,
          badgeClass: "bg-rose-100 text-rose-700 border border-rose-300",
          days: diffDays
        };
      } else if (diffDays === 0) {
        return {
          text: "Expires Today",
          badgeClass: "bg-amber-100 text-amber-800 border border-amber-300 font-extrabold animate-pulse",
          days: 0
        };
      } else if (diffDays <= 3) {
        return {
          text: `${diffDays} days left`,
          badgeClass: "bg-amber-50 text-amber-700 border border-amber-200 font-bold",
          days: diffDays
        };
      } else {
        return {
          text: `${diffDays} days left`,
          badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-200",
          days: diffDays
        };
      }
    } catch (e) {
      return { text: "-", badgeClass: "bg-slate-100 text-slate-500", days: null };
    }
  };

  const getActiveDO = () => {
    const list = store?.dos || [];
    return list.find((d) => d.id === store?.act) || list[0] || { id: 0, co: "", no: "", tot: 0, parties: [] };
  };

  const currentDO = useMemo(() => getActiveDO(), [store?.dos, store?.act]);

  const getPartyDispatched = (pid) => {
    return (store?.trucks || []).filter((t) => t && t.pid === pid).reduce((acc, t) => acc + (parseFloat(t.qty) || 0), 0);
  };

  const getDODispatched = (doObj) => {
    if (!doObj) return 0;
    return (store?.trucks || []).filter((t) => t && t.did === doObj.id).reduce((acc, t) => acc + (parseFloat(t.qty) || 0), 0);
  };

  const getDOAllotted = (doObj) => {
    if (!doObj || !doObj.parties) return 0;
    return (doObj.parties || []).reduce((acc, p) => acc + (parseFloat(p.qty) || 0), 0);
  };

  const getDOName = (d) => {
    if (!d) return "-";
    return d.no || `DO-${d.id}`;
  };

  const uniqueCompanies = useMemo(() => {
    const list = (store?.dos || []).map((d) => (d?.co || "").trim()).filter(Boolean);
    return [...new Set(list)];
  }, [store?.dos]);

  const uniquePartyNames = useMemo(() => {
    const arr = [];
    (store?.dos || []).forEach((d) => {
      (d?.parties || []).forEach((p) => {
        if (p?.name) arr.push(String(p.name).trim());
      });
    });
    return [...new Set(arr)];
  }, [store?.dos]);

  const uniqueTruckNumbers = useMemo(() => {
    return [...new Set((store?.trucks || []).map((t) => (t?.no || "").trim()).filter(Boolean))];
  }, [store?.trucks]);

  const uniqueDriverNames = useMemo(() => {
    return [...new Set((store?.trucks || []).map((t) => (t?.driver || "").trim()).filter(Boolean))];
  }, [store?.trucks]);

  // Filtered Trucks list
  const visibleTrucks = useMemo(() => {
    return (store?.trucks || []).filter((t) => {
      if (!t) return false;
      const matchDO = t.did === currentDO?.id;
      const matchTab = activeTab === "history" ? !!t.done : !t.done;
      const matchParty = !selectedTruckFilter || String(t.pid) === String(selectedTruckFilter);
      return matchDO && matchTab && matchParty;
    });
  }, [store?.trucks, currentDO?.id, activeTab, selectedTruckFilter]);

  const pendingTruckCount = useMemo(() => {
    return (store?.trucks || []).filter((t) => t && t.did === currentDO?.id && !t.done).length;
  }, [store?.trucks, currentDO?.id]);

  const historyTruckCount = useMemo(() => {
    return (store?.trucks || []).filter((t) => t && t.did === currentDO?.id && !!t.done).length;
  }, [store?.trucks, currentDO?.id]);

  // Close Modal
  const closeModal = () => {
    setModalConfig({ isOpen: false, title: "", type: "", data: null, error: "" });
    setFormData({});
    setIsPartyDropdownOpen(false);
    setIsMinesDropdownOpen(false);
    setIsLifterDropdownOpen(false);
    setIsTruckNoDropdownOpen(false);
    setIsDriverDropdownOpen(false);
  };

  // DO Selection for Company Filter in Party Tab
  const handleSelectCompanyInPartyTab = (co) => {
    setSelectedCompanyFilter(co);
    if (co !== "ALL") {
      const matchDO = (store?.dos || []).find((d) => (d.co || "").trim() === co);
      if (matchDO) {
        setStore((prev) => ({ ...prev, act: matchDO.id }));
      }
    }
  };

  // DO Actions
  const openDOForm = (id = 0) => {
    const d = id ? store.dos.find((x) => x.id === id) : null;
    setFormData({
      co: d ? d.co : "",
      no: d ? d.no : "",
      mines: d && d.mines ? d.mines : "",
      tot: d ? d.tot : "",
      vf: d && d.vf ? d.vf : "",
      vt: d && d.vt ? d.vt : ""
    });
    setModalConfig({
      isOpen: true,
      title: d ? "Edit DO" : "New DO Add",
      type: "doForm",
      data: { id },
      error: ""
    });
  };

  const saveDO = async (id) => {
    const co = (formData.co || "").trim();
    const no = (formData.no || "").trim();
    const mines = (formData.mines || "").trim();
    const tot = parseFloat(formData.tot);
    const vf = formData.vf || null;
    const vt = formData.vt || null;

    if (!no || !(tot > 0)) {
      setModalConfig((prev) => ({ ...prev, error: "Enter DO No. and DO Qty." }));
      return;
    }
    if (vf && vt && vt < vf) {
      setModalConfig((prev) => ({ ...prev, error: "Valid To date cannot be before Valid From date." }));
      return;
    }

    if (id) {
      const existing = store.dos.find((d) => d.id === id);
      const allotted = getDOAllotted(existing);
      if (tot < allotted - 0.001) {
        setModalConfig((prev) => ({
          ...prev,
          error: `Allotted qty is ${formatNumber(allotted)} MT; DO Qty cannot be lower than that.`
        }));
        return;
      }

      // Update directly in Supabase do_master table
      try {
        const { error } = await supabase
          .from("do_master")
          .update({
            company_name: co,
            do_no: no,
            mines: mines || null,
            valid_from: vf,
            valid_to: vt,
            do_qty: tot,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (error) {
          console.error("Supabase DO update error:", error);
          setModalConfig((prev) => ({ ...prev, error: error.message || "Failed to update DO in database." }));
          return;
        }
      } catch (err) {
        console.error("DO update exception:", err);
      }

      setStore((prev) => ({
        ...prev,
        dos: prev.dos.map((d) => (d.id === id ? { ...d, co, no, mines, tot, vf: vf || "", vt: vt || "" } : d))
      }));
    } else {
      // Check duplicate locally first
      if (store.dos.some((d) => d.no.toLowerCase() === no.toLowerCase())) {
        setModalConfig((prev) => ({ ...prev, error: "This DO No. already exists." }));
        return;
      }

      let newRecordId = store.nid;
      try {
        const { data, error } = await supabase
          .from("do_master")
          .insert([
            {
              company_name: co,
              do_no: no,
              mines: mines || null,
              valid_from: vf,
              valid_to: vt,
              do_qty: tot
            }
          ])
          .select()
          .single();

        if (error) {
          console.error("Supabase DO insert error:", error);
          setModalConfig((prev) => ({ ...prev, error: error.message || "Failed to insert DO in database." }));
          return;
        }

        if (data && data.id) {
          newRecordId = data.id;
        }
      } catch (err) {
        console.error("DO insert exception:", err);
      }

      const newDO = {
        id: newRecordId,
        co,
        no,
        mines,
        tot,
        vf: vf || "",
        vt: vt || "",
        parties: []
      };

      setStore((prev) => ({
        ...prev,
        nid: typeof prev.nid === "number" ? prev.nid + 1 : prev.nid,
        dos: [...prev.dos, newDO]
        // Note: Keep previous active DO as active so its existing allotment/trucks don't disappear!
      }));
    }
    closeModal();
  };

  const openViewDO = (id) => {
    const d = store.dos.find((x) => x.id === id);
    if (!d) return;
    setModalConfig({
      isOpen: true,
      title: "DO Details",
      type: "viewDO",
      data: d,
      error: ""
    });
  };

  const selectActiveDO = (id) => {
    setStore((prev) => ({ ...prev, act: id }));
    setSelectedTruckFilter("");
    setSelectedTruckIds(new Set());
    closeModal();
  };

  const deleteDO = (id) => {
    const d = store.dos.find((x) => x.id === id);
    setModalConfig({
      isOpen: true,
      title: "Confirm Delete",
      type: "confirm",
      data: {
        message: `Delete DO "${getDOName(d)}"? Its parties and trucks will also be deleted.`,
        onConfirm: async () => {
          // Delete from Supabase if valid UUID
          try {
            await supabase.from("do_master").delete().eq("id", id);
          } catch (err) {
            console.error("Error deleting from do_master:", err);
          }

          setStore((prev) => {
            const nextDos = prev.dos.filter((x) => x.id !== id);
            const nextTrucks = prev.trucks.filter((t) => t.did !== id);
            const nextAct = prev.act === id ? (nextDos.length ? nextDos[0].id : 0) : prev.act;
            return {
              ...prev,
              dos: nextDos,
              trucks: nextTrucks,
              act: nextAct
            };
          });
          closeModal();
        }
      }
    });
  };

  // Party Actions
  const openPartyForm = (id = 0) => {
    if (!(store?.dos || []).length) {
      alert("Please add a DO first (use the New DO Add button).");
      return;
    }
    const p = id ? currentDO.parties.find((x) => x.id === id) : null;
    setFormData({
      partyName: p ? p.name : "",
      qty: p ? p.qty : "",
      doId: currentDO.id
    });
    setModalConfig({
      isOpen: true,
      title: p ? "Edit Party" : "Add Party",
      type: "partyForm",
      data: { id },
      error: ""
    });
  };

  const saveParty = async (id) => {
    const targetDO = store.dos.find((d) => d.id === (formData.doId || currentDO.id)) || currentDO;
    const name = (formData.partyName || "").trim();
    const qty = parseFloat(formData.qty);
    const existingParty = id ? targetDO.parties.find((p) => p.id === id) : null;

    if (!name || !(qty > 0)) {
      setModalConfig((prev) => ({ ...prev, error: "Enter party name and qty." }));
      return;
    }
    if (targetDO.parties.some((p) => p.id !== id && p.name.toLowerCase() === name.toLowerCase())) {
      setModalConfig((prev) => ({ ...prev, error: "This party already exists in this DO." }));
      return;
    }

    const currentAllotted = getDOAllotted(targetDO);
    const available = targetDO.tot - currentAllotted + (existingParty ? existingParty.qty : 0);
    if (qty > available + 0.001) {
      setModalConfig((prev) => ({
        ...prev,
        error: `Only ${formatNumber(available)} MT can be allotted.`
      }));
      return;
    }

    if (existingParty) {
      const alreadyDisp = getPartyDispatched(existingParty.id);
      if (qty < alreadyDisp - 0.001) {
        setModalConfig((prev) => ({
          ...prev,
          error: `This party has already dispatched ${formatNumber(alreadyDisp)} MT; order qty cannot be lower than that.`
        }));
        return;
      }
    }

    if (id) {
      // Update in Supabase
      try {
        const { error } = await supabase
          .from("party_order")
          .update({
            party_name: name,
            order_qty: qty,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (error) {
          console.error("Supabase party update error:", error);
          setModalConfig((prev) => ({ ...prev, error: error.message || "Failed to update party in database." }));
          return;
        }
      } catch (err) {
        console.error("Party update exception:", err);
      }

      setStore((prev) => {
        const updatedDos = prev.dos.map((d) => {
          if (d.id !== targetDO.id) return d;
          return {
            ...d,
            parties: d.parties.map((p) => (p.id === id ? { ...p, name, qty } : p))
          };
        });
        return { ...prev, dos: updatedDos };
      });
    } else {
      // Insert in Supabase
      let newPartyId = prev => prev.nid;
      try {
        const { data, error } = await supabase
          .from("party_order")
          .insert([
            {
              do_id: targetDO.id,
              party_name: name,
              order_qty: qty
            }
          ])
          .select()
          .single();

        if (error) {
          console.error("Supabase party insert error:", error);
          setModalConfig((prev) => ({ ...prev, error: error.message || "Failed to insert party in database." }));
          return;
        }

        if (data && data.id) {
          newPartyId = data.id;
        }
      } catch (err) {
        console.error("Party insert exception:", err);
      }

      setStore((prev) => {
        const assignedId = typeof newPartyId === "string" ? newPartyId : prev.nid;
        const updatedDos = prev.dos.map((d) => {
          if (d.id !== targetDO.id) return d;
          return {
            ...d,
            parties: [...(d.parties || []), { id: assignedId, name, qty }]
          };
        });

        return {
          ...prev,
          nid: typeof prev.nid === "number" ? prev.nid + 1 : prev.nid,
          dos: updatedDos,
          act: targetDO.id
        };
      });
    }

    closeModal();
  };

  const openViewParty = (id) => {
    const p = currentDO.parties.find((x) => x.id === id);
    if (!p) return;
    setModalConfig({
      isOpen: true,
      title: "Party Details",
      type: "viewParty",
      data: p,
      error: ""
    });
  };

  const deleteParty = (id) => {
    const p = currentDO.parties.find((x) => x.id === id);
    const truckCount = (store.trucks || []).filter((t) => t.pid === id).length;
    setModalConfig({
      isOpen: true,
      title: "Confirm Delete",
      type: "confirm",
      data: {
        message: `Delete party "${p?.name}"? ${truckCount ? `Its ${truckCount} truck(s) will also be deleted.` : ""}`,
        onConfirm: async () => {
          // Delete from Supabase party_order
          try {
            await supabase.from("party_order").delete().eq("id", id);
          } catch (err) {
            console.error("Error deleting from party_order:", err);
          }

          setStore((prev) => ({
            ...prev,
            dos: prev.dos.map((d) => (d.id === currentDO.id ? { ...d, parties: d.parties.filter((x) => x.id !== id) } : d)),
            trucks: prev.trucks.filter((t) => t.pid !== id)
          }));
          closeModal();
        }
      }
    });
  };

  // Truck Actions
  const openTruckForm = (id = 0, defaultPartyId = null) => {
    if (!(store?.dos || []).length) {
      alert("Please add a DO first (use the New DO Add button).");
      return;
    }
    if (!currentDO.parties || !currentDO.parties.length) {
      alert("Please add a party to this DO first.");
      return;
    }

    const t = id ? store.trucks.find((x) => x.id === id) : null;
    const initialPid = t ? t.pid : defaultPartyId || currentDO.parties[0]?.id;

    setFormData({
      pid: initialPid,
      truckNo: t ? t.no : "",
      driver: t ? (t.driver || "") : "",
      tp: t ? t.tp : "",
      date: t ? t.date : new Date().toISOString().slice(0, 10),
      qty: t ? t.qty : ""
    });

    setModalConfig({
      isOpen: true,
      title: t ? "Edit Truck" : "Add Truck",
      type: "truckForm",
      data: { id },
      error: ""
    });
  };

  const saveTruck = async (id) => {
    const pid = formData.pid ? formData.pid : currentDO.parties[0]?.id;
    const party = currentDO.parties.find((p) => String(p.id) === String(pid));
    const truckNo = (formData.truckNo || "").trim().toUpperCase();
    const driver = (formData.driver || "").trim();
    const tp = (formData.tp || "").trim();
    const date = formData.date || new Date().toISOString().slice(0, 10);
    const qty = parseFloat(formData.qty);
    const existing = id ? store.trucks.find((t) => t.id === id) : null;

    if (!party || !truckNo || !(qty > 0)) {
      setModalConfig((prev) => ({ ...prev, error: "Enter party, truck no. and net weight." }));
      return;
    }

    const currentDispatched = getPartyDispatched(party.id);
    const balance = party.qty - currentDispatched + (existing && String(existing.pid) === String(party.id) ? existing.qty : 0);

    if (qty > balance + 0.001) {
      setModalConfig((prev) => ({
        ...prev,
        error: `${party.name} has only ${formatNumber(balance)} MT balance, so ${formatNumber(qty)} MT cannot be dispatched.`
      }));
      return;
    }

    if (id) {
      // Update in Supabase truck_dispatch
      try {
        const { error } = await supabase
          .from("truck_dispatch")
          .update({
            party_id: party.id,
            truck_no: truckNo,
            driver_name: driver,
            tp_no: tp,
            dispatch_date: date,
            net_weight_mt: qty,
            updated_at: new Date().toISOString()
          })
          .eq("id", id);

        if (error) {
          console.error("Supabase truck update error:", error);
          setModalConfig((prev) => ({ ...prev, error: error.message || "Failed to update truck in database." }));
          return;
        }
      } catch (err) {
        console.error("Truck update exception:", err);
      }

      setStore((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) => (t.id === id ? { ...t, pid: party.id, no: truckNo, driver, tp, date, qty } : t))
      }));
    } else {
      // Insert in Supabase truck_dispatch
      let newTruckId = store.nid;
      try {
        const { data, error } = await supabase
          .from("truck_dispatch")
          .insert([
            {
              do_id: currentDO.id,
              party_id: party.id,
              truck_no: truckNo,
              driver_name: driver,
              tp_no: tp,
              dispatch_date: date,
              net_weight_mt: qty,
              status: "pending"
            }
          ])
          .select()
          .single();

        if (error) {
          console.error("Supabase truck insert error:", error);
          setModalConfig((prev) => ({ ...prev, error: error.message || "Failed to insert truck in database." }));
          return;
        }

        if (data && data.id) {
          newTruckId = data.id;
        }
      } catch (err) {
        console.error("Truck insert exception:", err);
      }

      setStore((prev) => ({
        ...prev,
        nid: typeof prev.nid === "number" ? prev.nid + 1 : prev.nid,
        trucks: [
          {
            id: newTruckId,
            did: currentDO.id,
            pid: party.id,
            no: truckNo,
            driver,
            tp,
            date,
            qty,
            done: false
          },
          ...prev.trucks
        ]
      }));
    }

    closeModal();
  };

  const openViewTruck = (id) => {
    const t = store.trucks.find((x) => x.id === id);
    if (!t) return;
    setModalConfig({
      isOpen: true,
      title: "Truck Details",
      type: "viewTruck",
      data: t,
      error: ""
    });
  };

  const setTruckStatus = async (id, done) => {
    try {
      await supabase
        .from("truck_dispatch")
        .update({
          status: done ? "done" : "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
    } catch (err) {
      console.error("Error updating truck status in Supabase:", err);
    }

    setStore((prev) => ({
      ...prev,
      trucks: prev.trucks.map((t) => (t.id === id ? { ...t, done } : t))
    }));
    setSelectedTruckIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    closeModal();
  };

  const deleteTruck = (id) => {
    const t = store.trucks.find((x) => x.id === id);
    setModalConfig({
      isOpen: true,
      title: "Confirm Delete",
      type: "confirm",
      data: {
        message: `Delete truck "${t?.no}" (${formatNumber(t?.qty)} MT) entry?`,
        onConfirm: async () => {
          try {
            await supabase.from("truck_dispatch").delete().eq("id", id);
          } catch (err) {
            console.error("Error deleting truck from Supabase:", err);
          }

          setStore((prev) => ({
            ...prev,
            trucks: prev.trucks.filter((x) => x.id !== id)
          }));
          setSelectedTruckIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          closeModal();
        }
      }
    });
  };

  // Bulk Operations
  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedTruckIds(new Set(visibleTrucks.map((t) => t.id)));
    } else {
      setSelectedTruckIds(new Set());
    }
  };

  const toggleSelectTruck = (id) => {
    setSelectedTruckIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatus = (done) => {
    if (!selectedTruckIds.size) return;
    setStore((prev) => ({
      ...prev,
      trucks: prev.trucks.map((t) => (selectedTruckIds.has(t.id) ? { ...t, done } : t))
    }));
    setSelectedTruckIds(new Set());
  };

  const handleBulkDelete = () => {
    const count = selectedTruckIds.size;
    if (!count) return;
    setModalConfig({
      isOpen: true,
      title: "Confirm Bulk Delete",
      type: "confirm",
      data: {
        message: `Delete ${count} selected truck entries? This cannot be undone.`,
        onConfirm: () => {
          setStore((prev) => ({
            ...prev,
            trucks: prev.trucks.filter((t) => !selectedTruckIds.has(t.id))
          }));
          setSelectedTruckIds(new Set());
          closeModal();
        }
      }
    });
  };

  const handleResetAll = () => {
    setModalConfig({
      isOpen: true,
      title: "Confirm Clear All",
      type: "confirm",
      data: {
        message: "Delete all data (all DOs, parties and trucks)? This cannot be undone.",
        onConfirm: () => {
          setStore(defaultState());
          setSelectedTruckIds(new Set());
          closeModal();
        }
      }
    });
  };

  // Export CSV
  const exportCSV = () => {
    const rows = [["Date", "DO No", "Company", "Party", "Truck No", "TP No", "Net Wt MT", "Status"]];
    (store.trucks || []).forEach((t) => {
      const d = store.dos.find((x) => x.id === t.did);
      const p = d && d.parties.find((x) => x.id === t.pid);
      rows.push([
        t.date || "",
        d ? getDOName(d) : "",
        d ? d.co || "" : "",
        p ? p.name || "" : "",
        t.no || "",
        t.tp || "",
        t.qty || 0,
        t.done ? "Done" : "Pending"
      ]);
    });

    const csvContent = rows
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `coal_dispatch_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Dedicated Tab Exports: DO Master
  const exportDOMasterExcel = () => {
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "doParty", label: "DO Party Name" },
      { key: "mines", label: "Mines" },
      { key: "doNo", label: "DO No." },
      { key: "validFrom", label: "Valid From" },
      { key: "validTo", label: "Valid To" },
      { key: "doQty", label: "DO Qty (MT)" },
      { key: "allotted", label: "Allotted (MT)" },
      { key: "dispatched", label: "Dispatched (MT)" },
      { key: "balance", label: "Balance (MT)" }
    ];
    const data = filteredDOs.map((d, idx) => {
      const disp = getDODispatched(d);
      return {
        sno: idx + 1,
        doParty: d.co || "-",
        mines: d.mines || "-",
        doNo: getDOName(d),
        validFrom: formatDate(d.vf),
        validTo: formatDate(d.vt),
        doQty: formatNumber(d.tot),
        allotted: formatNumber(getDOAllotted(d)),
        dispatched: formatNumber(disp),
        balance: formatNumber(d.tot - disp)
      };
    });
    exportToExcel(data, cols, `DO_Master_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportDOMasterPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    const todayStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const activeFilterText = selectedCompanyFilter === "ALL" ? "All Parties" : selectedCompanyFilter;

    // Top Header Banner
    doc.setFillColor(143, 0, 9); // #8f0009
    doc.rect(10, 10, 277, 24, "F");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("COAL DO MASTER OVERVIEW REPORT", 16, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Party Scope: ${activeFilterText}`, 16, 28);

    // Meta Box right side inside banner
    doc.setFontSize(9);
    doc.text(`Date: ${todayStr}`, 240, 20);
    doc.text(`Total DOs: ${filteredDOs.length}`, 240, 28);

    // Sub-header details card below banner
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(10, 37, 277, 16, 2, 2, "FD");

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text("Total DO Qty:", 16, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(231, 0, 11);
    doc.text(`${formatNumber(totalDOQty)} MT`, 44, 47);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Total Allotted:", 85, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatNumber(totalAllotted)} MT`, 112, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Unallocated:", 150, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatNumber(totalUnallocated)} MT`, 175, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Dispatched:", 208, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(5, 150, 105);
    doc.text(`${formatNumber(totalDispatched)} MT`, 232, 47);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Balance:", 254, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(217, 119, 6);
    doc.text(`${formatNumber(totalBalance)} MT`, 271, 47);

    // Table Data
    const headers = [
      "#",
      "DO Party Name",
      "Mines",
      "DO No.",
      "Valid From",
      "Valid To",
      "Expiry Status",
      "DO Qty (MT)",
      "Allotted (MT)",
      "Dispatched (MT)",
      "Balance (MT)"
    ];

    const body = filteredDOs.map((d, idx) => {
      const disp = getDODispatched(d);
      const expiry = getExpiryDetails(d.vt, d.vf);
      return [
        idx + 1,
        d.co || "-",
        d.mines || "-",
        getDOName(d),
        formatDate(d.vf),
        formatDate(d.vt),
        expiry.text,
        formatNumber(d.tot),
        formatNumber(getDOAllotted(d)),
        formatNumber(disp),
        formatNumber(d.tot - disp)
      ];
    });

    autoTable(doc, {
      startY: 57,
      head: [headers],
      body: body,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        valign: "middle",
        halign: "left"
      },
      headStyles: {
        fillColor: [143, 0, 9],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 42, fontStyle: "bold" },
        2: { cellWidth: 28 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { halign: "center", cellWidth: 28 },
        6: { halign: "right", cellWidth: 30, fontStyle: "bold" },
        7: { halign: "right", cellWidth: 30 },
        8: { halign: "right", cellWidth: 30 },
        9: { halign: "right", cellWidth: 31, fontStyle: "bold" }
      },
      alternateRowStyles: {
        fillColor: [255, 245, 245]
      },
      margin: { top: 57, left: 10, right: 10 },
      tableWidth: "auto",
      didDrawPage: (data) => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          str,
          doc.internal.pageSize.getWidth() - 25,
          doc.internal.pageSize.getHeight() - 8
        );
      }
    });

    // Summary footer total bar
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 70;
    if (finalY < doc.internal.pageSize.getHeight() - 20) {
      doc.setFillColor(254, 242, 242);
      doc.rect(10, finalY + 2, 277, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(143, 0, 9);
      doc.text("Grand Total Summary", 16, finalY + 7.5);
      doc.text(`DO Qty: ${formatNumber(totalDOQty)} MT`, 120, finalY + 7.5);
      doc.text(`Allotted: ${formatNumber(totalAllotted)} MT`, 170, finalY + 7.5);
      doc.text(`Disp: ${formatNumber(totalDispatched)} MT`, 220, finalY + 7.5);
      doc.text(`Bal: ${formatNumber(totalBalance)} MT`, 260, finalY + 7.5);
    }

    doc.save(`DO_Master_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Dedicated Tab Exports: Party Wise Order
  const exportPartyOrderExcel = () => {
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "doParty", label: "DO Party Name" },
      { key: "doNo", label: "DO No." },
      { key: "lifterParty", label: "Lifter Party Name" },
      { key: "orderQty", label: "Order Qty (MT)" },
      { key: "dispatched", label: "Dispatched (MT)" },
      { key: "balance", label: "Balance (MT)" },
      { key: "trucks", label: "Total Trucks" },
      { key: "progress", label: "Progress (%)" }
    ];
    const data = (currentDO?.parties || []).map((p, idx) => {
      const disp = getPartyDispatched(p.id);
      const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;
      const pct = p.qty > 0 ? Math.round(Math.min(100, (disp / p.qty) * 100)) : 0;
      return {
        sno: idx + 1,
        doParty: currentDO?.co || "-",
        doNo: getDOName(currentDO),
        lifterParty: p.name,
        orderQty: formatNumber(p.qty),
        dispatched: formatNumber(disp),
        balance: formatNumber(p.qty - disp),
        trucks: truckCount,
        progress: `${pct}%`
      };
    });
    exportToExcel(data, cols, `DO_Allotment_${getDOName(currentDO)}_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportPartyOrderPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    const doPartyName = currentDO?.co || "-";
    const doNumber = getDOName(currentDO);
    const totalDOQtyMT = currentDO?.tot || 0;
    const todayStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    // Top Header Banner
    doc.setFillColor(143, 0, 9); // #8f0009
    doc.rect(10, 10, 277, 24, "F");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("COAL DO ALLOTMENT REPORT", 16, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`DO No: ${doNumber}`, 16, 28);

    // Meta Box right side inside banner
    doc.setFontSize(9);
    doc.text(`Date: ${todayStr}`, 240, 20);
    doc.text(`DO Qty: ${formatNumber(totalDOQtyMT)} MT`, 240, 28);

    // Sub-header details card below banner
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(10, 37, 277, 16, 2, 2, "FD");

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text("DO Party Name:", 16, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(231, 0, 11);
    doc.text(`${doPartyName}`, 46, 47);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Allotted Parties:", 100, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`${(currentDO?.parties || []).length}`, 130, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Allotted Qty:", 160, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatNumber(partiesTotalQty)} MT`, 185, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Total Dispatched:", 218, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(5, 150, 105);
    doc.text(`${formatNumber(partiesTotalDisp)} MT`, 252, 47);

    // Table Data
    const headers = [
      "#",
      "DO Party Name",
      "DO No.",
      "Lifter Party Name",
      "Order Qty (MT)",
      "Dispatched (MT)",
      "Balance (MT)",
      "Trucks",
      "Progress"
    ];

    const body = (currentDO?.parties || []).map((p, idx) => {
      const disp = getPartyDispatched(p.id);
      const bal = p.qty - disp;
      const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;
      const pct = p.qty > 0 ? Math.round(Math.min(100, (disp / p.qty) * 100)) : 0;
      return [
        idx + 1,
        currentDO?.co || "-",
        getDOName(currentDO),
        p.name || "-",
        formatNumber(p.qty),
        formatNumber(disp),
        formatNumber(bal),
        truckCount,
        `${pct}%`
      ];
    });

    autoTable(doc, {
      startY: 57,
      head: [headers],
      body: body,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        valign: "middle",
        halign: "left"
      },
      headStyles: {
        fillColor: [143, 0, 9],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { cellWidth: 38, fontStyle: "bold" },
        2: { cellWidth: 30 },
        3: { cellWidth: 50, fontStyle: "bold" },
        4: { halign: "right", cellWidth: 32, fontStyle: "bold" },
        5: { halign: "right", cellWidth: 32 },
        6: { halign: "right", cellWidth: 32, fontStyle: "bold" },
        7: { halign: "center", cellWidth: 22 },
        8: { halign: "center", cellWidth: 29 }
      },
      alternateRowStyles: {
        fillColor: [255, 245, 245]
      },
      margin: { top: 57, left: 10, right: 10 },
      tableWidth: "auto",
      didDrawPage: (data) => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          str,
          doc.internal.pageSize.getWidth() - 25,
          doc.internal.pageSize.getHeight() - 8
        );
      }
    });

    // Summary footer total bar
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 70;
    if (finalY < doc.internal.pageSize.getHeight() - 20) {
      doc.setFillColor(254, 242, 242);
      doc.rect(10, finalY + 2, 277, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(143, 0, 9);
      doc.text("Total Allotted Summary", 16, finalY + 7.5);
      doc.text(`Order: ${formatNumber(partiesTotalQty)} MT`, 140, finalY + 7.5);
      doc.text(`Disp: ${formatNumber(partiesTotalDisp)} MT`, 185, finalY + 7.5);
      doc.text(`Bal: ${formatNumber(partiesTotalQty - partiesTotalDisp)} MT`, 230, finalY + 7.5);
    }

    doc.save(`DO_Allotment_${getDOName(currentDO)}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Dedicated Tab Exports: Truck Wise Dispatch
  const exportTruckDispatchExcel = () => {
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "date", label: "Dispatch Date" },
      { key: "doParty", label: "DO Party Name" },
      { key: "doNo", label: "DO No." },
      { key: "lifterParty", label: "Lifter Party Name" },
      { key: "truckNo", label: "Truck No." },
      { key: "driverName", label: "Driver Name" },
      { key: "tpNo", label: "TP No." },
      { key: "netWt", label: "Net Wt (MT)" },
      { key: "status", label: "Status" }
    ];
    const data = visibleTrucks.map((t, idx) => {
      const party = (currentDO?.parties || []).find((p) => p.id === t.pid);
      const truckDO = (store?.dos || []).find((d) => d.id === t.did) || currentDO;
      return {
        sno: idx + 1,
        date: formatDate(t.date),
        doParty: truckDO?.co || "-",
        doNo: getDOName(truckDO),
        lifterParty: party ? party.name : "-",
        truckNo: t.no,
        driverName: t.driver || "-",
        tpNo: t.tp || "-",
        netWt: formatNumber(t.qty),
        status: t.done ? "Done" : "Pending"
      };
    });
    exportToExcel(data, cols, `Truck_Wise_Dispatch_${activeTab}_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportTruckDispatchPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    const activePartyObj = selectedTruckFilter
      ? (currentDO.parties || []).find((p) => String(p.id) === String(selectedTruckFilter))
      : null;

    const doPartyName = currentDO?.co || "-";
    const lifterName = activePartyObj ? activePartyObj.name : "All Lifters";
    const doNumber = getDOName(currentDO);
    const todayStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    // Top Header Banner
    doc.setFillColor(143, 0, 9); // #8f0009
    doc.rect(10, 10, 277, 24, "F");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("COAL TRUCK DISPATCH REPORT", 16, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Status: ${activeTab.toUpperCase()}`, 16, 28);

    // Meta Box right side inside banner
    doc.setFontSize(9);
    doc.text(`Date: ${todayStr}`, 240, 20);
    doc.text(`DO No: ${doNumber}`, 240, 28);

    // Sub-header details card below banner
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(10, 37, 277, 16, 2, 2, "FD");

    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);

    doc.text("DO Party Name:", 16, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(231, 0, 11);
    doc.text(`${doPartyName}`, 46, 47);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Lifter Party Name:", 100, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(231, 0, 11);
    doc.text(`${lifterName}`, 136, 47);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Total Trucks:", 190, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`${visibleTrucks.length}`, 215, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Net Wt:", 235, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatNumber(trucksTotalWeight)} MT`, 252, 47);

    // Table Data
    const headers = [
      "#",
      "Date",
      "DO Party Name",
      "DO No.",
      "Lifter Party Name",
      "Truck No.",
      "Driver Name",
      "TP No.",
      "Net Wt (MT)",
      "Status"
    ];

    const body = visibleTrucks.map((t, idx) => {
      const party = (currentDO?.parties || []).find((p) => p.id === t.pid);
      const truckDO = (store?.dos || []).find((d) => d.id === t.did) || currentDO;
      return [
        idx + 1,
        formatDate(t.date),
        truckDO?.co || "-",
        getDOName(truckDO),
        party ? party.name : "-",
        t.no || "-",
        t.driver || "-",
        t.tp || "-",
        formatNumber(t.qty),
        t.done ? "Done" : "Pending"
      ];
    });

    autoTable(doc, {
      startY: 57,
      head: [headers],
      body: body,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        valign: "middle",
        halign: "left"
      },
      headStyles: {
        fillColor: [143, 0, 9],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8.5
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 24 },
        2: { cellWidth: 32 },
        3: { cellWidth: 26 },
        4: { cellWidth: 38 },
        5: { cellWidth: 32, fontStyle: "bold" },
        6: { cellWidth: 32 },
        7: { cellWidth: 28 },
        8: { halign: "right", cellWidth: 27, fontStyle: "bold" },
        9: { halign: "center", cellWidth: 28 }
      },
      alternateRowStyles: {
        fillColor: [255, 245, 245]
      },
      margin: { top: 57, left: 10, right: 10 },
      tableWidth: "auto",
      didDrawPage: (data) => {
        // Footer page numbering
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          str,
          doc.internal.pageSize.getWidth() - 25,
          doc.internal.pageSize.getHeight() - 8
        );
      }
    });

    // Add total row at bottom if needed
    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 70;
    if (finalY < doc.internal.pageSize.getHeight() - 20) {
      doc.setFillColor(254, 242, 242);
      doc.rect(10, finalY + 2, 277, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(143, 0, 9);
      doc.text("Grand Total", 16, finalY + 7.5);
      doc.text(`${formatNumber(trucksTotalWeight)} MT`, 232, finalY + 7.5, { align: "right" });
    }

    doc.save(`Truck_Wise_Dispatch_${activeTab}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Main Combined Consolidated Report (DO Master + DO Allotment + Truck Dispatch)
  const exportMainReportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    const todayStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const activeFilterText = selectedCompanyFilter === "ALL" ? "All Parties" : selectedCompanyFilter;
    const currentDOName = getDOName(currentDO);

    // Check if a specific lifter party is selected in Tab 3 filter
    const selectedParty = selectedTruckFilter
      ? (currentDO?.parties || []).find((p) => String(p.id) === String(selectedTruckFilter))
      : null;

    const doPartyName = currentDO?.co || activeFilterText;
    const lifterPartyName = selectedParty ? selectedParty.name : "All Lifters";
    const displayOrderQty = selectedParty ? (selectedParty.qty || 0) : (currentDO?.tot || 0);
    const displayAllottedQty = selectedParty ? (selectedParty.qty || 0) : partiesTotalQty;
    const displayDispatchedQty = selectedParty ? getPartyDispatched(selectedParty.id) : partiesTotalDisp;
    const displayPendingBal = Math.max(0, displayOrderQty - displayDispatchedQty);

    // Top Header Banner
    doc.setFillColor(143, 0, 9); // #8f0009
    doc.rect(10, 10, 277, 24, "F");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("COAL DISPATCH SYSTEM - MAIN CONSOLIDATED REPORT", 16, 20);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const headerSubText = selectedParty
      ? `DO Party: ${doPartyName} | Lifter: ${lifterPartyName} | DO: ${currentDOName} | Mines: ${currentDO?.mines || "-"}`
      : `DO Party: ${doPartyName} | DO: ${currentDOName} | Mines: ${currentDO?.mines || "-"}`;
    doc.text(headerSubText, 16, 28);

    doc.setFontSize(9);
    doc.text(`Date: ${todayStr}`, 240, 20);
    doc.text(`Total Trucks: ${activeTrucks.length}`, 240, 28);

    // Top Summary Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, 37, 277, 16, 2, 2, "FD");

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(selectedParty ? "Party Order Qty:" : "DO Qty:", 16, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(231, 0, 11);
    doc.text(`${formatNumber(displayOrderQty)} MT`, selectedParty ? 48 : 35, 47);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Allotted:", selectedParty ? 80 : 70, 47);
    doc.setFont("helvetica", "normal");
    doc.text(`${formatNumber(displayAllottedQty)} MT`, selectedParty ? 98 : 90, 47);

    doc.setFont("helvetica", "bold");
    doc.text("Total Dispatched:", 130, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(5, 150, 105);
    doc.text(`${formatNumber(displayDispatchedQty)} MT`, 168, 47);

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("Pending Balance:", 205, 47);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(217, 119, 6);
    doc.text(`${formatNumber(displayPendingBal)} MT`, 245, 47);

    // Section 1: DO Allotment Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(143, 0, 9);
    doc.text(selectedParty ? "1. Lifter Party Order Details" : "1. DO Allotment Details (Lifter Parties)", 12, 60);

    const partyHeaders = ["#", "Lifter Party", "Order Qty (MT)", "Dispatched (MT)", "Balance (MT)", "Trucks", "Progress"];
    const partyList = selectedParty
      ? [selectedParty]
      : (currentDO?.parties || []);

    const partyBody = partyList.map((p, idx) => {
      const disp = getPartyDispatched(p.id);
      const bal = Math.max(0, (p.qty || 0) - disp);
      const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;
      const pct = p.qty > 0 ? Math.round(Math.min(100, (disp / p.qty) * 100)) : 0;
      return [idx + 1, p.name || "-", formatNumber(p.qty), formatNumber(disp), formatNumber(bal), truckCount, `${pct}%`];
    });

    autoTable(doc, {
      startY: 64,
      head: [partyHeaders],
      body: partyBody,
      theme: "grid",
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [143, 0, 9], textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: 10, right: 10 },
      tableWidth: "auto"
    });

    // Section 2: Truck wise Dispatch Table
    const nextY = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 100) + 8;
    if (nextY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      doc.text("2. Truck Wise Dispatch List", 12, 20);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(143, 0, 9);
      doc.text("2. Truck Wise Dispatch List", 12, nextY);
    }

    const truckHeaders = ["#", "Date", "Lifter Party", "Truck No.", "Driver Name", "TP No.", "Net Wt (MT)", "Status"];
    const truckBody = activeTrucks.map((t, idx) => {
      const party = (currentDO?.parties || []).find((p) => p.id === t.pid);
      return [
        idx + 1,
        formatDate(t.date),
        party ? party.name : "-",
        t.no || "-",
        t.driver || "-",
        t.tp || "-",
        formatNumber(t.qty),
        t.done ? "Done" : "Pending"
      ];
    });

    autoTable(doc, {
      startY: (doc.lastAutoTable && nextY <= doc.internal.pageSize.getHeight() - 40 ? nextY + 4 : 24),
      head: [truckHeaders],
      body: truckBody,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [180, 20, 30], textColor: [255, 255, 255], fontStyle: "bold" },
      margin: { left: 10, right: 10 },
      tableWidth: "auto"
    });

    doc.save(`Main_Consolidated_Report_${getDOName(currentDO)}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // Calculations for DO Stats (filtered by Company if selected, or total across DOs)
  const filteredDOs = useMemo(() => {
    const list = store?.dos || [];
    if (selectedCompanyFilter === "ALL") return list;
    return list.filter((d) => (d?.co || "").trim() === selectedCompanyFilter);
  }, [store?.dos, selectedCompanyFilter]);

  const totalDOQty = useMemo(() => {
    return filteredDOs.reduce((acc, d) => acc + (parseFloat(d?.tot) || 0), 0);
  }, [filteredDOs]);

  const totalAllotted = useMemo(() => {
    return filteredDOs.reduce((acc, d) => acc + getDOAllotted(d), 0);
  }, [filteredDOs]);

  const totalDispatched = useMemo(() => {
    return filteredDOs.reduce((acc, d) => acc + getDODispatched(d), 0);
  }, [filteredDOs]);

  const totalUnallocated = totalDOQty - totalAllotted;
  const totalBalance = totalDOQty - totalDispatched;

  const totalTrucksCount = useMemo(() => {
    const doIds = new Set(filteredDOs.map((d) => d?.id));
    return (store?.trucks || []).filter((t) => t && doIds.has(t.did)).length;
  }, [filteredDOs, store?.trucks]);

  const activeTrucks = useMemo(() => {
    return (store?.trucks || []).filter((t) => t && t.did === currentDO?.id);
  }, [store?.trucks, currentDO?.id]);

  // Tab 3 Filter-based Truck Stats
  const partyFilteredTrucks = useMemo(() => {
    return (store?.trucks || []).filter((t) => {
      if (!t || t.did !== currentDO?.id) return false;
      if (selectedTruckFilter && String(t.pid) !== String(selectedTruckFilter)) return false;
      return true;
    });
  }, [store?.trucks, currentDO?.id, selectedTruckFilter]);

  const partyFilteredPendingTrucks = useMemo(() => {
    return partyFilteredTrucks.filter((t) => !t.done).length;
  }, [partyFilteredTrucks]);

  const partyFilteredHistoryTrucks = useMemo(() => {
    return partyFilteredTrucks.filter((t) => !!t.done).length;
  }, [partyFilteredTrucks]);

  const partyFilteredTrucksWeight = useMemo(() => {
    return partyFilteredTrucks.reduce((acc, t) => acc + (parseFloat(t.qty) || 0), 0);
  }, [partyFilteredTrucks]);

  const selectedPartyObj = useMemo(() => {
    if (!selectedTruckFilter) return null;
    return (currentDO?.parties || []).find((p) => String(p.id) === String(selectedTruckFilter)) || null;
  }, [currentDO?.parties, selectedTruckFilter]);

  const partyFilteredDispatchedQty = useMemo(() => {
    if (selectedPartyObj) {
      return getPartyDispatched(selectedPartyObj.id);
    }
    return getDODispatched(currentDO);
  }, [selectedPartyObj, currentDO, store?.trucks]);

  const partyFilteredRemainingBal = useMemo(() => {
    if (selectedPartyObj) {
      const disp = getPartyDispatched(selectedPartyObj.id);
      return Math.max(0, (selectedPartyObj.qty || 0) - disp);
    }
    return Math.max(0, (currentDO?.tot || 0) - getDODispatched(currentDO));
  }, [selectedPartyObj, currentDO, store?.trucks]);

  // Visible Parties in DO Allotment Tab (Filterable by Lifter Party)
  const visibleParties = useMemo(() => {
    const list = currentDO?.parties || [];
    if (!selectedPartyLifterFilter) return list;
    return list.filter((p) => String(p.id) === String(selectedPartyLifterFilter));
  }, [currentDO?.parties, selectedPartyLifterFilter]);

  const partiesTotalQty = useMemo(() => {
    return (visibleParties || []).reduce((acc, p) => acc + (p?.qty || 0), 0);
  }, [visibleParties]);

  const partiesTotalDisp = useMemo(() => {
    return (visibleParties || []).reduce((acc, p) => acc + getPartyDispatched(p?.id), 0);
  }, [visibleParties, store?.trucks]);

  const activeAllotted = useMemo(() => {
    return getDOAllotted(currentDO);
  }, [currentDO]);

  const activeUnallocated = useMemo(() => {
    return (currentDO?.tot || 0) - activeAllotted;
  }, [currentDO, activeAllotted]);

  const trucksTotalWeight = (visibleTrucks || []).reduce((acc, t) => acc + (t?.qty || 0), 0);

  return (
    <div className="min-h-screen bg-white text-slate-800 text-[14px] font-sans antialiased pb-12">
      {/* Top Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#8f0009] via-[#e7000b] to-[#ff4d57] text-white">
        <div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-32 -bottom-28 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4 flex-wrap relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Coal Dispatch System</h1>
              <p className="text-xs sm:text-sm text-white/80 mt-0.5 font-medium">
                {mainSectionTab === "do-master" ? (
                  (store?.dos || []).length
                    ? `DO Master Overview | ${(store?.dos || []).length} Total DOs | All Companies: ${formatNumber(totalDOQty)} MT`
                    : "No DO yet. Click New DO Add to start."
                ) : (
                  (store?.dos || []).length
                    ? `${currentDO.co || "Company"} | DO No. ${getDOName(currentDO)} | Total ${formatNumber(currentDO.tot)} MT`
                    : "No DO yet. Click New DO Add to start."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Statistics Cards - Dynamic according to active tab */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* TAB 1: DO MASTER STATS (Across All / Selected Company) */}
          {mainSectionTab === "do-master" && (
            <>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#e7000b] flex items-center justify-center shrink-0 border border-red-100/80">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total DO Qty</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(totalDOQty)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                  <List className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Allotted Parties</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(totalAllotted)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Unallocated Bal</span>
                  <div className={`text-[16px] sm:text-[17px] font-bold leading-tight truncate ${totalUnallocated > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(totalUnallocated)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total Dispatched</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(totalDispatched)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">DO Balance</span>
                  <div className={`text-[16px] sm:text-[17px] font-bold leading-tight truncate ${totalBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(totalBalance)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Hash className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total Trucks</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight">
                    {totalTrucksCount}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PARTY WISE ORDER QTY STATS (For Current Active DO) */}
          {mainSectionTab === "party-order" && (
            <>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#e7000b] flex items-center justify-center shrink-0 border border-red-100">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Current DO Qty</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(currentDO?.tot || 0)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                  <List className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Party Order Qty</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(partiesTotalQty)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Unallocated DO</span>
                  <div className={`text-[16px] sm:text-[17px] font-bold leading-tight truncate ${(currentDO?.tot || 0) - partiesTotalQty > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber((currentDO?.tot || 0) - partiesTotalQty)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Dispatched</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(partiesTotalDisp)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Pending Balance</span>
                  <div className={`text-[16px] sm:text-[17px] font-bold leading-tight truncate ${partiesTotalQty - partiesTotalDisp > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(partiesTotalQty - partiesTotalDisp)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Hash className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total Parties</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight">
                    {currentDO?.parties?.length || 0}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 3: TRUCK WISE DISPATCH STATS */}
          {mainSectionTab === "truck-dispatch" && (
            <>
              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-[#e7000b] flex items-center justify-center shrink-0 border border-red-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Trucks" : "Total Trucks"}
                  </span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight">
                    {partyFilteredTrucks.length}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Running" : "Pending Trucks"}
                  </span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-amber-600 leading-tight">
                    {partyFilteredPendingTrucks}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Check className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Done" : "Done / History"}
                  </span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-emerald-600 leading-tight">
                    {partyFilteredHistoryTrucks}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                  <Scale className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Tab Net Wt</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(trucksTotalWeight)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <List className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Dispatched" : "DO Dispatched"}
                  </span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(partyFilteredDispatchedQty)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Balance" : "DO Rem. Bal"}
                  </span>
                  <div className={`text-[16px] sm:text-[17px] font-bold leading-tight truncate ${partyFilteredRemainingBal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(partyFilteredRemainingBal)} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main 3 Section Tabs - Executive Segmented Pill Design */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="inline-flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/90 shadow-inner">
            <button
              onClick={() => setMainSectionTab("do-master")}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "do-master"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white shadow-md shadow-red-500/20 ring-2 ring-red-400/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${
                mainSectionTab === "do-master" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                1
              </span>
              <span>DO Master</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                mainSectionTab === "do-master" ? "bg-white text-red-700 shadow-2xs" : "bg-slate-200 text-slate-700"
              }`}>
                {(store?.dos || []).length}
              </span>
            </button>

            <button
              onClick={() => setMainSectionTab("party-order")}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "party-order"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white shadow-md shadow-red-500/20 ring-2 ring-red-400/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${
                mainSectionTab === "party-order" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                2
              </span>
              <span>DO Allotment</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                mainSectionTab === "party-order" ? "bg-white text-red-700 shadow-2xs" : "bg-slate-200 text-slate-700"
              }`}>
                {currentDO.parties?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setMainSectionTab("truck-dispatch")}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "truck-dispatch"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white shadow-md shadow-red-500/20 ring-2 ring-red-400/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black ${
                mainSectionTab === "truck-dispatch" ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                3
              </span>
              <span>Truck wise Dispatch</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                mainSectionTab === "truck-dispatch" ? "bg-white text-red-700 shadow-2xs" : "bg-slate-200 text-slate-700"
              }`}>
                {activeTrucks.length}
              </span>
            </button>
          </div>
        </div>

        {/* Section 1: DO Master */}
        {mainSectionTab === "do-master" && (
          <section className="space-y-3">
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-red-100 text-[#e7000b] text-xs font-bold flex items-center justify-center">
                1
              </span>
              DO Master
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={exportDOMasterExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              <button
                onClick={exportDOMasterPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>
              {canWrite && (
                <button
                  onClick={() => openDOForm(0)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#ff3340] to-[#e7000b] hover:brightness-105 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> New DO Add
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar Just Above DO Master Table - Professional Card Layout */}
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 sm:p-3.5 rounded-xl shadow-xs">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide uppercase">Party Filter:</span>
              <div className="relative min-w-0">
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="px-3.5 py-1.5 pr-8 rounded-lg border border-slate-300/80 bg-slate-50/70 hover:bg-white text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 cursor-pointer appearance-none transition-all truncate max-w-[180px] sm:max-w-xs"
                >
                  <option value="ALL">All Parties ({(store?.dos || []).length} DOs)</option>
                  {uniqueCompanies.map((co) => (
                    <option key={co} value={co}>
                      {co} ({(store?.dos || []).filter((d) => (d.co || "").trim() === co).length} DOs)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="text-xs text-slate-500 font-semibold whitespace-nowrap flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline">Active Scope:</span>
              <span className="font-extrabold text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg text-xs truncate max-w-[140px] sm:max-w-none shadow-2xs">
                {selectedCompanyFilter === "ALL" ? "All Parties" : selectedCompanyFilter}
              </span>
            </div>
          </div>

          {/* DO Master Table - Desktop View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200/90 bg-white shadow-xs">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/90 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 w-12 whitespace-nowrap">#</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DO Party Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Mines</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DO No.</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Valid From</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Valid To</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Expiry Status</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">DO Qty</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Allotted</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Dispatched</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Balance</th>
                  <th className="py-3.5 px-4 text-center w-16 whitespace-nowrap">View</th>
                  <th className="py-3.5 px-4 text-right w-24 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13.5px] whitespace-nowrap">
                {filteredDOs.length ? (
                  filteredDOs.map((d, idx) => {
                    const dispatched = getDODispatched(d);
                    const bal = d.tot - dispatched;
                    const isActive = d.id === currentDO.id;
                    const expiry = getExpiryDetails(d.vt, d.vf);

                    return (
                      <tr
                        key={d.id}
                        className={`hover:bg-red-50/40 transition-colors whitespace-nowrap ${isActive ? "bg-red-50/50" : ""}`}
                      >
                        <td className="py-3.5 px-4 font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">{d.co || "-"}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">{d.mines || "-"}</td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900 text-sm">{getDOName(d)}</span>
                          {isActive ? (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-[#e7000b]">
                              Active
                            </span>
                          ) : (
                            <button
                              onClick={() => selectActiveDO(d.id)}
                              className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 transition-colors cursor-pointer"
                              title="Make this DO Active"
                            >
                              Make Active
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">{formatDate(d.vf)}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">{formatDate(d.vt)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold ${expiry.badgeClass}`}>
                            {expiry.text}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">{formatNumber(d.tot)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">{formatNumber(getDOAllotted(d))}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">{formatNumber(dispatched)}</td>
                        <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {formatNumber(bal)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openViewDO(d.id);
                            }}
                            className="w-8 h-8 rounded-full bg-red-50 text-[#e7000b] hover:bg-red-100 border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="View DO"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {canWrite ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDOForm(d.id);
                                }}
                                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-[#e7000b] border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit DO"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteDO(d.id);
                                }}
                                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete DO"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">View Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400 font-medium">
                      No DO found. Click "New DO Add" above to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* DO Master Cards - Mobile View */}
          <div className="md:hidden space-y-3">
            {filteredDOs.length ? (
              filteredDOs.map((d, idx) => {
                const dispatched = getDODispatched(d);
                const bal = d.tot - dispatched;
                const isActive = d.id === currentDO.id;
                return (
                  <div
                    key={d.id}
                    className={`bg-white border rounded-2xl p-4 shadow-2xs space-y-3 transition-all ${
                      isActive ? "border-red-300 ring-2 ring-red-100 bg-red-50/20" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 text-sm">{getDOName(d)}</h3>
                            {isActive && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold bg-red-100 text-[#e7000b]">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-medium">
                            {d.co || "No Company"}{d.mines ? ` • Mines: ${d.mines}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openViewDO(d.id)}
                          className="w-7 h-7 rounded-full bg-red-50 text-[#e7000b] border border-red-200 flex items-center justify-center"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDOForm(d.id)}
                          className="w-7 h-7 rounded-full bg-white text-slate-700 border border-slate-200 flex items-center justify-center"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteDO(d.id)}
                          className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">VALIDITY</span>
                        <span className="text-slate-700 font-medium text-[11px] block truncate">
                          {formatDate(d.vf)} to {formatDate(d.vt)}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">EXPIRY STATUS</span>
                        <span className={`text-[11px] font-bold block truncate ${getExpiryDetails(d.vt, d.vf).badgeClass} px-1.5 py-0.5 rounded text-center`}>
                          {getExpiryDetails(d.vt, d.vf).text}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">DO QTY</span>
                        <b className="text-slate-800 font-bold">{formatNumber(d.tot)} MT</b>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">ALLOTTED</span>
                        <b className="text-slate-700 font-semibold">{formatNumber(getDOAllotted(d))} MT</b>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">DISPATCHED</span>
                        <b className="text-emerald-700 font-semibold">{formatNumber(dispatched)} MT</b>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/80 text-xs">
                      <span className="font-semibold text-slate-600">Balance Qty:</span>
                      <b className={`font-bold ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {formatNumber(bal)} MT
                      </b>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                No DO found. Click "New DO Add" to create one.
              </div>
            )}
          </div>
          </section>
        )}

        {/* Section 2: DO Allotment */}
        {mainSectionTab === "party-order" && (
          <section className="space-y-3">
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-red-100 text-[#e7000b] text-xs font-bold flex items-center justify-center">
                2
              </span>
              DO Allotment
              {(store?.dos || []).length > 0 && (
                <span className="text-xs text-slate-400 font-normal">
                  ({currentDO?.co ? `${currentDO.co} - ` : ""}DO: {getDOName(currentDO)})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={exportPartyOrderExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              <button
                onClick={exportPartyOrderPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>
              {canWrite && (
                <button
                  onClick={() => openPartyForm(0)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#ff3340] to-[#e7000b] hover:brightness-105 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Party
                </button>
              )}
            </div>
          </div>

          {/* Filter Bar Just Above Party Table - DO Party Name & Lifter Party Name Dropdown Filters */}
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-lg shadow-2xs flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              {/* DO Party Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">DO Party:</span>
                <div className="relative">
                  <select
                    value={selectedCompanyFilter}
                    onChange={(e) => {
                      handleSelectCompanyInPartyTab(e.target.value);
                      setSelectedPartyLifterFilter("");
                    }}
                    className="px-2.5 sm:px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white text-[11px] sm:text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none transition-colors max-w-[150px] sm:max-w-[200px] truncate"
                  >
                    <option value="ALL">All DO Parties ({(store?.dos || []).length} DOs)</option>
                    {uniqueCompanies.map((co) => (
                      <option key={co} value={co}>
                        {co} ({(store?.dos || []).filter((d) => (d.co || "").trim() === co).length} DOs)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Quick DO Switcher if multiple DOs match */}
              {(store?.dos || []).length > 1 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] sm:text-xs font-medium text-slate-500 whitespace-nowrap">DO No:</span>
                  <div className="relative">
                    <select
                      value={currentDO.id}
                      onChange={(e) => {
                        const targetId = parseInt(e.target.value);
                        setStore((prev) => ({ ...prev, act: targetId }));
                        setSelectedPartyLifterFilter("");
                      }}
                      className="px-2.5 sm:px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] sm:text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none transition-colors max-w-[140px] truncate"
                    >
                      {(selectedCompanyFilter === "ALL"
                        ? store?.dos || []
                        : (store?.dos || []).filter((d) => (d.co || "").trim() === selectedCompanyFilter)
                      ).map((d) => (
                        <option key={d.id} value={d.id}>
                          {getDOName(d)} ({formatNumber(d.tot)} MT)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Lifter Party Name Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">Lifter Party:</span>
                <div className="relative">
                  <select
                    value={selectedPartyLifterFilter}
                    onChange={(e) => setSelectedPartyLifterFilter(e.target.value)}
                    className="px-2.5 sm:px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white text-[11px] sm:text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none transition-colors max-w-[150px] sm:max-w-[200px] truncate"
                  >
                    <option value="">All Lifter Parties ({(currentDO?.parties || []).length})</option>
                    {(currentDO?.parties || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatNumber(p.qty)} MT)
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1 shrink-0">
              <span className="hidden sm:inline">Active DO:</span>
              <span className="font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs whitespace-nowrap">
                {currentDO?.co ? `${currentDO.co}: ` : ""}{getDOName(currentDO)} ({formatNumber(currentDO?.tot || 0)} MT)
              </span>
            </div>
          </div>

          {/* Party Table - Desktop View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200/90 bg-white shadow-xs">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/90 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 w-12 text-center whitespace-nowrap">#</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DO Party Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Lifter Party Name</th>
                  <th className="py-3.5 px-4 w-32 whitespace-nowrap">DO No.</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Expiry Status</th>
                  <th className="py-3.5 px-4 text-right w-32 whitespace-nowrap">Order Qty</th>
                  <th className="py-3.5 px-4 text-right w-32 whitespace-nowrap">Dispatched</th>
                  <th className="py-3.5 px-4 text-right w-32 whitespace-nowrap">Balance</th>
                  <th className="py-3.5 px-4 w-40 whitespace-nowrap">Progress</th>
                  <th className="py-3.5 px-4 text-center w-24 whitespace-nowrap">Trucks</th>
                  <th className="py-3.5 px-4 text-center w-16 whitespace-nowrap">View</th>
                  <th className="py-3.5 px-4 text-right w-24 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13.5px] whitespace-nowrap">
                {visibleParties && visibleParties.length ? (
                  visibleParties.map((p, idx) => {
                    const dispatched = getPartyDispatched(p.id);
                    const bal = p.qty - dispatched;
                    const pct = p.qty > 0 ? Math.min(100, (dispatched / p.qty) * 100) : 0;
                    const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;
                    const expiry = getExpiryDetails(currentDO?.vt, currentDO?.vf);

                    return (
                      <tr key={p.id} className="hover:bg-red-50/40 transition-colors whitespace-nowrap">
                        <td className="py-3.5 px-4 font-medium text-slate-400 text-center whitespace-nowrap">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">{currentDO?.co || "-"}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm whitespace-nowrap">{p.name}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">{getDOName(currentDO)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold ${expiry.badgeClass}`}>
                            {expiry.text}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">{formatNumber(p.qty)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">{formatNumber(dispatched)}</td>
                        <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {formatNumber(bal)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-[70px] h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-600 w-9 text-right">
                              {Math.round(pct)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800 whitespace-nowrap">{truckCount}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => openViewParty(p.id)}
                            className="w-8 h-8 rounded-full bg-red-50 text-[#e7000b] hover:bg-red-100 border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="View Party"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {canWrite ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => openPartyForm(p.id)}
                                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-[#e7000b] border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit Party"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteParty(p.id)}
                                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete Party"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">View Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400 font-medium">
                      {selectedPartyLifterFilter
                        ? `No records found for lifter party "${selectedPartyLifterFilter}".`
                        : (store?.dos || []).length
                        ? "No party in this DO yet. Click Add Party."
                        : "Add a DO first."}
                    </td>
                  </tr>
                )}
              </tbody>
              {visibleParties && visibleParties.length > 0 && (
                <tfoot>
                  <tr className="bg-red-50/80 font-bold text-xs sm:text-[13px] text-[#8f0009] border-t border-red-200 whitespace-nowrap">
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
                    <td className="py-3.5 px-4 whitespace-nowrap">Total</td>
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">{formatNumber(partiesTotalQty)}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">{formatNumber(partiesTotalDisp)}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">{formatNumber(partiesTotalQty - partiesTotalDisp)}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">{activeTrucks.length}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Party Cards - Mobile View */}
          <div className="md:hidden space-y-3">
            {visibleParties && visibleParties.length ? (
              visibleParties.map((p, idx) => {
                const dispatched = getPartyDispatched(p.id);
                const bal = p.qty - dispatched;
                const pct = p.qty > 0 ? Math.min(100, (dispatched / p.qty) * 100) : 0;
                const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;

                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {currentDO?.co ? `${currentDO.co} • ` : ""}DO No: {getDOName(currentDO)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openViewParty(p.id)}
                          className="w-7 h-7 rounded-full bg-red-50 text-[#e7000b] border border-red-200 flex items-center justify-center"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openPartyForm(p.id)}
                          className="w-7 h-7 rounded-full bg-white text-slate-700 border border-slate-200 flex items-center justify-center"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteParty(p.id)}
                          className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">ORDER QTY</span>
                        <b className="text-slate-800 font-bold">{formatNumber(p.qty)} MT</b>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">DISPATCHED</span>
                        <b className="text-emerald-700 font-semibold">{formatNumber(dispatched)} MT</b>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">BALANCE</span>
                        <b className={`font-bold ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {formatNumber(bal)} MT
                        </b>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">TRUCKS</span>
                        <b className="text-slate-700 font-semibold">{truckCount} Trucks</b>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Dispatch Progress</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                {(store?.dos || []).length ? "No party in this DO yet. Click Add Party." : "Add a DO first."}
              </div>
            )}
          </div>
          </section>
        )}

        {/* Section 3: Truck wise Dispatch */}
        {mainSectionTab === "truck-dispatch" && (
          <section className="space-y-3">
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-red-100 text-[#e7000b] text-xs font-bold flex items-center justify-center">
                3
              </span>
              Truck wise Dispatch
            </h2>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedTruckFilter}
                onChange={(e) => {
                  setSelectedTruckFilter(e.target.value);
                  setSelectedTruckIds(new Set());
                }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                <option value="">All parties</option>
                {(currentDO.parties || []).map((p) => {
                  const partyTrucks = (store?.trucks || []).filter((t) => t && t.did === currentDO.id && String(t.pid) === String(p.id));
                  const runningCount = partyTrucks.filter((t) => !t.done).length;
                  const doneCount = partyTrucks.filter((t) => !!t.done).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} (Running: {runningCount} | Done: {doneCount})
                    </option>
                  );
                })}
              </select>

              <button
                onClick={exportTruckDispatchExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              <button
                onClick={exportTruckDispatchPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>
              <button
                onClick={exportMainReportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download Main Consolidated Report (DO + Allotment + Trucks)"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Main Report</span>
              </button>

              {canWrite && (
                <button
                  onClick={() => openTruckForm(0)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#ff3340] to-[#e7000b] hover:brightness-105 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Truck
                </button>
              )}
            </div>
          </div>

          {/* Pending / History Tabs & Lifter Party Live Status */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setActiveTab("pending");
                  setSelectedTruckIds(new Set());
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                  activeTab === "pending"
                    ? "bg-red-50 text-[#e7000b] border border-red-200 shadow-2xs"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                Pending
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-slate-200 text-slate-700">
                  {pendingTruckCount}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("history");
                  setSelectedTruckIds(new Set());
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-2 ${
                  activeTab === "history"
                    ? "bg-red-50 text-[#e7000b] border border-red-200 shadow-2xs"
                    : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                History
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white border border-slate-200 text-slate-700">
                  {historyTruckCount}
                </span>
              </button>
            </div>

            {/* Selected Lifter Party Running / Done Truck Summary */}
            {selectedTruckFilter && (() => {
              const selectedParty = (currentDO.parties || []).find((p) => String(p.id) === String(selectedTruckFilter));
              const partyTrucks = (store?.trucks || []).filter((t) => t && t.did === currentDO.id && String(t.pid) === String(selectedTruckFilter));
              const runningCount = partyTrucks.filter((t) => !t.done).length;
              const doneCount = partyTrucks.filter((t) => !!t.done).length;

              return (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-bold text-slate-800">{selectedParty?.name || "Party"}:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Running: <b>{runningCount}</b>
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Done: <b>{doneCount}</b>
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Bulk Action Bar */}
          {selectedTruckIds.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap bg-red-50/90 border border-red-200 rounded-xl px-4 py-2 text-xs">
              <span className="font-semibold text-[#8f0009] mr-auto">
                {selectedTruckIds.size} selected
              </span>

              {activeTab === "pending" ? (
                <button
                  onClick={() => handleBulkStatus(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold hover:bg-emerald-100 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Done
                </button>
              ) : (
                <button
                  onClick={() => handleBulkStatus(false)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-[#e7000b] border border-red-200 font-semibold hover:bg-red-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Move to Pending
                </button>
              )}

              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 font-semibold hover:bg-rose-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>

              <button
                onClick={() => setSelectedTruckIds(new Set())}
                className="px-3 py-1.5 rounded-lg bg-white text-slate-600 border border-slate-200 font-semibold hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
            </div>
          )}

          {/* Trucks Table - Desktop View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200/90 bg-white shadow-xs">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/90 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 w-10 text-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={visibleTrucks.length > 0 && selectedTruckIds.size === visibleTrucks.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="rounded accent-[#e7000b] cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 w-12 whitespace-nowrap">#</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Date</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DO Party Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DO No.</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Lifter Party Name</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">Expiry Status</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Truck No.</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Driver Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">TP No.</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Net Wt (MT)</th>
                  <th className="py-3.5 px-4 text-center w-16 whitespace-nowrap">View</th>
                  <th className="py-3.5 px-4 text-right w-44 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13.5px] whitespace-nowrap">
                {visibleTrucks.length ? (
                  visibleTrucks.map((t, idx) => {
                    const party = (currentDO.parties || []).find((p) => p.id === t.pid);
                    const truckDO = (store?.dos || []).find((d) => d.id === t.did) || currentDO;
                    const isSelected = selectedTruckIds.has(t.id);
                    const expiry = getExpiryDetails(truckDO?.vt, truckDO?.vf);

                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-red-50/40 transition-colors whitespace-nowrap ${isSelected ? "bg-red-50/60" : ""}`}
                      >
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTruck(t.id)}
                            className="rounded accent-[#e7000b] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-400 whitespace-nowrap">{idx + 1}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">{formatDate(t.date)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">{truckDO?.co || "-"}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">{getDOName(truckDO)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span>{party ? party.name : "-"}</span>
                            {party && (() => {
                              const pTrucks = (store?.trucks || []).filter((tr) => tr && tr.did === currentDO.id && String(tr.pid) === String(party.id));
                              const rCount = pTrucks.filter((tr) => !tr.done).length;
                              const dCount = pTrucks.filter((tr) => !!tr.done).length;
                              return (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/90 px-1.5 py-0.5 rounded-md" title={`Running: ${rCount} | Done: ${dCount}`}>
                                  <span className="text-amber-700">R:{rCount}</span>
                                  <span>|</span>
                                  <span className="text-emerald-700">D:{dCount}</span>
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-bold ${expiry.badgeClass}`}>
                            {expiry.text}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm whitespace-nowrap">{t.no}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium whitespace-nowrap">{t.driver || "-"}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">{t.tp || "-"}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-[14px] whitespace-nowrap">{formatNumber(t.qty)}</td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => openViewTruck(t.id)}
                            className="w-8 h-8 rounded-full bg-red-50 text-[#e7000b] hover:bg-red-100 border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="View Truck"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {canWrite ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {t.done ? (
                                <button
                                  onClick={() => setTruckStatus(t.id, false)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Undo
                                </button>
                              ) : (
                                <button
                                  onClick={() => setTruckStatus(t.id, true)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" /> Done
                                </button>
                              )}
                              <button
                                onClick={() => openTruckForm(t.id)}
                                className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-[#e7000b] border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Edit Truck"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteTruck(t.id)}
                                className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                                title="Delete Truck"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">View Only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={12} className="py-10 text-center text-slate-400 font-medium">
                      {!(store?.dos || []).length
                        ? "Add a DO first."
                        : activeTab === "history"
                        ? "No done truck in history yet."
                        : "No pending truck in this DO."}
                    </td>
                  </tr>
                )}
              </tbody>
              {visibleTrucks.length > 0 && (
                <tfoot>
                  <tr className="bg-red-50/80 font-bold text-xs sm:text-[13px] text-[#8f0009] border-t border-red-200 whitespace-nowrap">
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
                    <td colSpan={9} className="py-3.5 px-4 whitespace-nowrap">
                      Total
                    </td>
                    <td className="py-3.5 px-4 text-right">{formatNumber(trucksTotalWeight)}</td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Trucks Cards - Mobile View */}
          <div className="md:hidden space-y-3">
            {visibleTrucks.length ? (
              visibleTrucks.map((t, idx) => {
                const party = (currentDO.parties || []).find((p) => p.id === t.pid);
                const truckDO = (store?.dos || []).find((d) => d.id === t.did) || currentDO;
                const isSelected = selectedTruckIds.has(t.id);

                return (
                  <div
                    key={t.id}
                    className={`bg-white border rounded-2xl p-4 shadow-2xs space-y-3 transition-all ${
                      isSelected ? "border-red-300 ring-2 ring-red-100 bg-red-50/20" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTruck(t.id)}
                          className="rounded accent-[#e7000b] cursor-pointer"
                        />
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{t.no}</h3>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {truckDO?.co ? `${truckDO.co} • ` : ""}{party ? party.name : "-"}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openViewTruck(t.id)}
                          className="w-7 h-7 rounded-full bg-red-50 text-[#e7000b] border border-red-200 flex items-center justify-center cursor-pointer"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openTruckForm(t.id)}
                          className="w-7 h-7 rounded-full bg-white text-slate-700 border border-slate-200 flex items-center justify-center cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteTruck(t.id)}
                          className="w-7 h-7 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">DATE</span>
                        <span className="text-slate-800 font-medium text-[11px]">{formatDate(t.date)}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">DRIVER NAME</span>
                        <span className="text-slate-800 font-medium text-[11px] truncate block">{t.driver || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">TP NO.</span>
                        <span className="text-slate-800 font-medium text-[11px] truncate block">{t.tp || "-"}</span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">NET WEIGHT</span>
                        <b className="text-slate-900 font-bold">{formatNumber(t.qty)} MT</b>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-medium block">STATUS</span>
                          <span className={`text-[11px] font-bold ${t.done ? "text-emerald-600" : "text-amber-600"}`}>
                            {t.done ? "Done" : "Pending"}
                          </span>
                        </div>
                        {t.done ? (
                          <button
                            onClick={() => setTruckStatus(t.id, false)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white text-amber-700 border border-amber-200 cursor-pointer"
                          >
                            Undo
                          </button>
                        ) : (
                          <button
                            onClick={() => setTruckStatus(t.id, true)}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-pointer"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                {!(store?.dos || []).length
                  ? "Add a DO first."
                  : activeTab === "history"
                  ? "No done truck in history yet."
                  : "No pending truck in this DO."}
              </div>
            )}
          </div>
          </section>
        )}
      </div>

      {/* Global Interactive Modal */}
      {modalConfig.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className={`bg-white rounded-3xl w-full ${modalConfig.type === "confirm" ? "max-w-sm" : "max-w-2xl"} max-h-[92vh] shadow-2xl border border-slate-100 flex flex-col transition-all animate-scaleUp`}>
            {/* Modal Header */}
            <div className="px-6 py-4.5 bg-gradient-to-r from-[#800008] via-[#dc2626] to-[#ef4444] text-white flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-extrabold text-base tracking-tight">{modalConfig.title}</h3>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs bg-slate-50/30 min-h-[320px] pb-32">
              {/* DO Form */}
              {modalConfig.type === "doForm" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* DO Party Name Searchable Combobox */}
                    <div className="relative">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">DO Party Name *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.co || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, co: e.target.value });
                            setIsPartyDropdownOpen(true);
                          }}
                          onFocus={() => setIsPartyDropdownOpen(true)}
                          placeholder="Type or select Party..."
                          className="w-full px-3.5 py-2.5 pr-8 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setIsPartyDropdownOpen((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Custom Clean Dropdown Popup */}
                      {isPartyDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsPartyDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50 py-1">
                            {uniqueCompanies.filter((c) => !formData.co || c.toLowerCase().includes((formData.co || "").toLowerCase())).length > 0 ? (
                              uniqueCompanies
                                .filter((c) => !formData.co || c.toLowerCase().includes((formData.co || "").toLowerCase()))
                                .map((c) => (
                                  <div
                                    key={c}
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, co: c }));
                                      setIsPartyDropdownOpen(false);
                                    }}
                                    className="px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between transition-colors"
                                  >
                                    <span>{c}</span>
                                    {formData.co === c && <Check className="w-3.5 h-3.5 text-red-600" />}
                                  </div>
                                ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-slate-400 italic">No existing matches. Press tab or type to use this name.</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">DO No. *</label>
                      <input
                        type="text"
                        value={formData.no || ""}
                        onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                        placeholder="e.g. DO-12345"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
                      />
                    </div>

                    {/* Mines Searchable Combobox */}
                    <div className="relative">
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Mines</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={formData.mines || ""}
                          onChange={(e) => {
                            setFormData({ ...formData, mines: e.target.value });
                            setIsMinesDropdownOpen(true);
                          }}
                          onFocus={() => setIsMinesDropdownOpen(true)}
                          placeholder="Type or select Mine..."
                          className="w-full px-3.5 py-2.5 pr-8 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setIsMinesDropdownOpen((prev) => !prev)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Custom Clean Dropdown Popup */}
                      {isMinesDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setIsMinesDropdownOpen(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50 py-1">
                            {Array.from(new Set((store?.dos || []).map((d) => (d.mines || "").trim()).filter(Boolean)))
                              .filter((m) => !formData.mines || m.toLowerCase().includes((formData.mines || "").toLowerCase())).length > 0 ? (
                              Array.from(new Set((store?.dos || []).map((d) => (d.mines || "").trim()).filter(Boolean)))
                                .filter((m) => !formData.mines || m.toLowerCase().includes((formData.mines || "").toLowerCase()))
                                .map((m) => (
                                  <div
                                    key={m}
                                    onClick={() => {
                                      setFormData((prev) => ({ ...prev, mines: m }));
                                      setIsMinesDropdownOpen(false);
                                    }}
                                    className="px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between transition-colors"
                                  >
                                    <span>{m}</span>
                                    {formData.mines === m && <Check className="w-3.5 h-3.5 text-red-600" />}
                                  </div>
                                ))
                            ) : (
                              <div className="px-3 py-2 text-xs text-slate-400 italic">No existing mines. Type any name to save.</div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">DO Qty (MT) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.tot || ""}
                        onChange={(e) => setFormData({ ...formData, tot: e.target.value })}
                        placeholder="e.g. 500.00"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Valid From</label>
                      <input
                        type="date"
                        value={formData.vf || ""}
                        onChange={(e) => setFormData({ ...formData, vf: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Valid To</label>
                      <input
                        type="date"
                        value={formData.vt || ""}
                        onChange={(e) => setFormData({ ...formData, vt: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* View DO */}
              {modalConfig.type === "viewDO" && modalConfig.data && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">DO No.</span>
                      <b className="font-bold text-slate-900">{getDOName(modalConfig.data)}</b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Company</span>
                      <b className="font-semibold text-slate-800">{modalConfig.data.co || "-"}</b>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Mines</span>
                      <b className="font-semibold text-slate-800">{modalConfig.data.mines || "-"}</b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Valid From</span>
                      <span className="font-medium">{formatDate(modalConfig.data.vf)}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Valid To</span>
                      <span className="font-medium">{formatDate(modalConfig.data.vt)}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">DO Qty</span>
                      <b className="font-bold text-slate-900">{formatNumber(modalConfig.data.tot)} MT</b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Allotted to Parties</span>
                      <b className="font-semibold text-slate-800">{formatNumber(getDOAllotted(modalConfig.data))} MT</b>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Unallocated</span>
                      <b className="font-semibold text-amber-600">
                        {formatNumber(modalConfig.data.tot - getDOAllotted(modalConfig.data))} MT
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Dispatched</span>
                      <b className="font-semibold text-emerald-600">{formatNumber(getDODispatched(modalConfig.data))} MT</b>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Balance</span>
                      <b className="font-bold text-[#e7000b]">
                        {formatNumber(modalConfig.data.tot - getDODispatched(modalConfig.data))} MT
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Parties</span>
                      <span>{modalConfig.data.parties?.length || 0}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Trucks</span>
                      <span>
                        {(store.trucks || []).filter((t) => t.did === modalConfig.data.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Status</span>
                      <span className="font-bold text-[#e7000b]">
                        {currentDO.id === modalConfig.data.id ? "Active DO" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Party Form */}
              {modalConfig.type === "partyForm" && (() => {
                const selectedDO = (store?.dos || []).find((d) => d.id === (formData.doId || currentDO.id)) || currentDO;
                const companyDOs = (store?.dos || []).filter((d) => (d.co || "").trim() === (selectedDO?.co || "").trim());
                const allotted = getDOAllotted(selectedDO);
                const available = (selectedDO?.tot || 0) - allotted + (modalConfig.data?.id ? (selectedDO?.parties?.find(p => p.id === modalConfig.data.id)?.qty || 0) : 0);
                const balance = (selectedDO?.tot || 0) - getDODispatched(selectedDO);

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Party Name</label>
                        <div className="relative">
                          <select
                            value={selectedDO?.co || ""}
                            onChange={(e) => {
                              const newCo = e.target.value;
                              const firstMatchingDO = (store?.dos || []).find((d) => (d.co || "").trim() === newCo);
                              if (firstMatchingDO) {
                                setFormData({ ...formData, doId: firstMatchingDO.id });
                              }
                            }}
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none shadow-2xs"
                          >
                            {uniqueCompanies.map((co) => (
                              <option key={co} value={co}>
                                {co}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">DO Number</label>
                        <div className="relative">
                          <select
                            value={selectedDO?.id || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, doId: parseInt(e.target.value) });
                            }}
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none shadow-2xs"
                          >
                            {(companyDOs.length ? companyDOs : store?.dos || []).map((d) => (
                              <option key={d.id} value={d.id}>
                                {getDOName(d)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Available DO Qty (MT)</label>
                        <input
                          type="text"
                          value={`${formatNumber(available)} MT`}
                          disabled
                          className="w-full px-3.5 py-2.5 border border-emerald-200 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">DO Balance Qty (MT)</label>
                        <input
                          type="text"
                          value={`${formatNumber(balance)} MT`}
                          disabled
                          className="w-full px-3.5 py-2.5 border border-amber-200 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Lifter Name Searchable Combobox */}
                      <div className="relative">
                        <label className="font-semibold text-slate-700 block mb-1.5">Lifter Name *</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.partyName || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, partyName: e.target.value });
                              setIsLifterDropdownOpen(true);
                            }}
                            onFocus={() => setIsLifterDropdownOpen(true)}
                            placeholder="Type or select Lifter..."
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setIsLifterDropdownOpen((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Custom Clean Dropdown Popup */}
                        {isLifterDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsLifterDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50 py-1">
                              {uniquePartyNames.filter((p) => !formData.partyName || p.toLowerCase().includes((formData.partyName || "").toLowerCase())).length > 0 ? (
                                uniquePartyNames
                                  .filter((p) => !formData.partyName || p.toLowerCase().includes((formData.partyName || "").toLowerCase()))
                                  .map((p) => (
                                    <div
                                      key={p}
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, partyName: p }));
                                        setIsLifterDropdownOpen(false);
                                      }}
                                      className="px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between transition-colors"
                                    >
                                      <span>{p}</span>
                                      {formData.partyName === p && <Check className="w-3.5 h-3.5 text-red-600" />}
                                    </div>
                                  ))
                              ) : (
                                <div className="px-3 py-2 text-xs text-slate-400 italic">No existing lifters. Type to create new.</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Order Qty (MT) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.qty || ""}
                          onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                          placeholder="e.g. 150.00"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* View Party */}
              {modalConfig.type === "viewParty" && modalConfig.data && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Lifter Party Name</span>
                      <b className="font-bold text-slate-900">{modalConfig.data.name}</b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">DO PARTY Name</span>
                      <span className="font-medium">{currentDO.co}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">DO No.</span>
                      <span className="font-bold">{getDOName(currentDO)}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Order Qty</span>
                      <b className="font-bold text-slate-900">{formatNumber(modalConfig.data.qty)} MT</b>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Dispatched</span>
                      <b className="font-semibold text-emerald-600">
                        {formatNumber(getPartyDispatched(modalConfig.data.id))} MT
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Balance</span>
                      <b className="font-bold text-[#e7000b]">
                        {formatNumber(modalConfig.data.qty - getPartyDispatched(modalConfig.data.id))} MT
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Trucks Count</span>
                      <span>
                        {(store.trucks || []).filter((t) => t.pid === modalConfig.data.id).length}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Truck Form */}
              {modalConfig.type === "truckForm" && (() => {
                const currentPid = formData.pid ? parseInt(formData.pid) : (currentDO.parties?.[0]?.id || 0);
                const selectedParty = (currentDO.parties || []).find((p) => p.id === currentPid);
                const partyBal = selectedParty ? selectedParty.qty - getPartyDispatched(selectedParty.id) : 0;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Party *</label>
                        <div className="relative">
                          <select
                            value={formData.pid || (selectedParty?.id || "")}
                            onChange={(e) => setFormData({ ...formData, pid: e.target.value })}
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none shadow-2xs"
                          >
                            {(currentDO.parties || []).map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Party Balance Qty (MT)</label>
                        <input
                          type="text"
                          value={`${formatNumber(partyBal)} MT`}
                          disabled
                          className="w-full px-3.5 py-2.5 border border-amber-200 rounded-xl bg-amber-50 text-amber-800 text-xs font-bold cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Truck No Searchable Combobox */}
                      <div className="relative">
                        <label className="font-semibold text-slate-700 block mb-1.5">Truck No. *</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.truckNo || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, truckNo: e.target.value.toUpperCase() });
                              setIsTruckNoDropdownOpen(true);
                            }}
                            onFocus={() => setIsTruckNoDropdownOpen(true)}
                            placeholder="Type or select Truck No..."
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs uppercase"
                          />
                          <button
                            type="button"
                            onClick={() => setIsTruckNoDropdownOpen((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Custom Clean Dropdown Popup */}
                        {isTruckNoDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsTruckNoDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50 py-1">
                              {uniqueTruckNumbers.filter((no) => !formData.truckNo || no.toUpperCase().includes((formData.truckNo || "").toUpperCase())).length > 0 ? (
                                uniqueTruckNumbers
                                  .filter((no) => !formData.truckNo || no.toUpperCase().includes((formData.truckNo || "").toUpperCase()))
                                  .map((no) => (
                                    <div
                                      key={no}
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, truckNo: no }));
                                        setIsTruckNoDropdownOpen(false);
                                      }}
                                      className="px-3 py-2 text-xs font-bold text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between transition-colors uppercase"
                                    >
                                      <span>{no}</span>
                                      {formData.truckNo === no && <Check className="w-3.5 h-3.5 text-red-600" />}
                                    </div>
                                  ))
                              ) : (
                                <div className="px-3 py-2 text-xs text-slate-400 italic">No matching truck. Type to use this number.</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Driver Name Searchable Combobox */}
                      <div className="relative">
                        <label className="font-semibold text-slate-700 block mb-1.5">Driver Name</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={formData.driver || ""}
                            onChange={(e) => {
                              setFormData({ ...formData, driver: e.target.value });
                              setIsDriverDropdownOpen(true);
                            }}
                            onFocus={() => setIsDriverDropdownOpen(true)}
                            placeholder="Type or select Driver..."
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setIsDriverDropdownOpen((prev) => !prev)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Custom Clean Dropdown Popup */}
                        {isDriverDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setIsDriverDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-50 py-1">
                              {uniqueDriverNames.filter((dName) => !formData.driver || dName.toLowerCase().includes((formData.driver || "").toLowerCase())).length > 0 ? (
                                uniqueDriverNames
                                  .filter((dName) => !formData.driver || dName.toLowerCase().includes((formData.driver || "").toLowerCase()))
                                  .map((dName) => (
                                    <div
                                      key={dName}
                                      onClick={() => {
                                        setFormData((prev) => ({ ...prev, driver: dName }));
                                        setIsDriverDropdownOpen(false);
                                      }}
                                      className="px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between transition-colors"
                                    >
                                      <span>{dName}</span>
                                      {formData.driver === dName && <Check className="w-3.5 h-3.5 text-red-600" />}
                                    </div>
                                  ))
                              ) : (
                                <div className="px-3 py-2 text-xs text-slate-400 italic">No matching driver. Type to use this name.</div>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">TP No.</label>
                        <input
                          type="text"
                          value={formData.tp || ""}
                          onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                          placeholder="Transit pass / TP number"
                          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white hover:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 text-xs font-medium text-slate-800 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Date</label>
                        <input
                          type="date"
                          value={formData.date || ""}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-medium text-slate-700 cursor-pointer shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Net Wt (MT) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.qty || ""}
                          onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                          placeholder="e.g. 35.40"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-bold text-slate-900 shadow-2xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* View Truck */}
              {modalConfig.type === "viewTruck" && modalConfig.data && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Date</span>
                      <span>{formatDate(modalConfig.data.date)}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Truck No.</span>
                      <b className="font-bold text-slate-900">{modalConfig.data.no}</b>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">DO PARTY Name</span>
                      <b className="font-semibold text-slate-800">
                        {((store?.dos || []).find((d) => d.id === modalConfig.data.did) || currentDO)?.co || "-"}
                      </b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">DO No.</span>
                      <span className="font-medium">
                        {getDOName(((store?.dos || []).find((d) => d.id === modalConfig.data.did) || currentDO))}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Lifter Party Name</span>
                      <span className="font-bold text-slate-800">
                        {currentDO.parties?.find((p) => p.id === modalConfig.data.pid)?.name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Driver Name</span>
                      <span className="font-semibold text-slate-800">
                        {modalConfig.data.driver || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">TP No.</span>
                      <span className="font-medium">{modalConfig.data.tp || "-"}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Net Wt</span>
                      <b className="font-bold text-[#e7000b]">{formatNumber(modalConfig.data.qty)} MT</b>
                    </div>
                    <div className="flex justify-between p-2.5 bg-slate-50">
                      <span className="text-slate-500">Status</span>
                      <span className={`font-bold ${modalConfig.data.done ? "text-emerald-600" : "text-amber-600"}`}>
                        {modalConfig.data.done ? "Done (History)" : "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Confirm Dialog */}
              {modalConfig.type === "confirm" && (
                <p className="text-sm text-slate-700 leading-relaxed">{modalConfig.data?.message}</p>
              )}

              {/* Modal Error Message */}
              {modalConfig.error && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                  {modalConfig.error}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold transition-colors"
              >
                Cancel
              </button>

              {modalConfig.type === "doForm" && (
                <button
                  onClick={() => saveDO(modalConfig.data?.id)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3340] to-[#e7000b] text-white font-semibold hover:brightness-105 transition-all shadow-xs"
                >
                  Save DO
                </button>
              )}

              {modalConfig.type === "viewDO" && (
                <div className="flex items-center gap-2">
                  {currentDO.id !== modalConfig.data.id && (
                    <button
                      onClick={() => selectActiveDO(modalConfig.data.id)}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#ff3340] to-[#e7000b] text-white font-semibold hover:brightness-105 transition-all shadow-xs"
                    >
                      Open DO
                    </button>
                  )}
                  <button
                    onClick={() => openDOForm(modalConfig.data.id)}
                    className="px-3 py-2 rounded-xl bg-white border border-red-200 text-[#e7000b] font-semibold hover:bg-red-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteDO(modalConfig.data.id)}
                    className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-semibold hover:bg-rose-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}

              {modalConfig.type === "partyForm" && (
                <button
                  onClick={() => saveParty(modalConfig.data?.id)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3340] to-[#e7000b] text-white font-semibold hover:brightness-105 transition-all shadow-xs"
                >
                  Save Party
                </button>
              )}

              {modalConfig.type === "viewParty" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openTruckForm(0, modalConfig.data.id)}
                    className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#ff3340] to-[#e7000b] text-white font-semibold hover:brightness-105 transition-all shadow-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Truck
                  </button>
                  <button
                    onClick={() => openPartyForm(modalConfig.data.id)}
                    className="px-3 py-2 rounded-xl bg-white border border-red-200 text-[#e7000b] font-semibold hover:bg-red-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteParty(modalConfig.data.id)}
                    className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-semibold hover:bg-rose-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}

              {modalConfig.type === "truckForm" && (
                <button
                  onClick={() => saveTruck(modalConfig.data?.id)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3340] to-[#e7000b] text-white font-semibold hover:brightness-105 transition-all shadow-xs"
                >
                  Save Truck
                </button>
              )}

              {modalConfig.type === "viewTruck" && (
                <div className="flex items-center gap-2">
                  {modalConfig.data.done ? (
                    <button
                      onClick={() => setTruckStatus(modalConfig.data.id, false)}
                      className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-amber-700 font-semibold transition-colors"
                    >
                      Move to Pending
                    </button>
                  ) : (
                    <button
                      onClick={() => setTruckStatus(modalConfig.data.id, true)}
                      className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      Mark Done
                    </button>
                  )}
                  <button
                    onClick={() => openTruckForm(modalConfig.data.id)}
                    className="px-3 py-2 rounded-xl bg-white border border-red-200 text-[#e7000b] font-semibold hover:bg-red-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTruck(modalConfig.data.id)}
                    className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-semibold hover:bg-rose-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}

              {modalConfig.type === "confirm" && (
                <button
                  onClick={modalConfig.data?.onConfirm}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-xs inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Popup Modal (Professional Prompt Replacement) */}
      {quickAddModal.isOpen && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickAddModal({ ...quickAddModal, isOpen: false });
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-scaleUp">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#8f0009] via-[#e7000b] to-[#ff4d57] text-white flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-tight">{quickAddModal.title}</h3>
              <button
                onClick={() => setQuickAddModal({ ...quickAddModal, isOpen: false })}
                className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  {quickAddModal.label}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={quickAddModal.value}
                  onChange={(e) => setQuickAddModal({ ...quickAddModal, value: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quickAddModal.value.trim()) {
                      quickAddModal.onConfirm?.(quickAddModal.value.trim());
                      setQuickAddModal({ ...quickAddModal, isOpen: false });
                    }
                  }}
                  placeholder={quickAddModal.placeholder}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-semibold text-slate-900 shadow-2xs transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setQuickAddModal({ ...quickAddModal, isOpen: false })}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (quickAddModal.value.trim()) {
                      quickAddModal.onConfirm?.(quickAddModal.value.trim());
                      setQuickAddModal({ ...quickAddModal, isOpen: false });
                    }
                  }}
                  disabled={!quickAddModal.value.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#ff3340] to-[#e7000b] text-white font-semibold hover:brightness-105 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  Add Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DispatchPage() {
  return (
    <DispatchErrorBoundary>
      <DispatchPageContent />
    </DispatchErrorBoundary>
  );
}
