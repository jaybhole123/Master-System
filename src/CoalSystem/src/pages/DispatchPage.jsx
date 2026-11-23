import React, { useState, useEffect, useMemo, useCallback } from "react";
import supabase from "../../../SupabaseClient";
import { exportToExcel, exportToPDF } from "../utils/exportHelpers";
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
  const [isLoadingDOs, setIsLoadingDOs] = useState(false);

  // Fetch DOs, Parties and Trucks directly from Supabase
  const fetchDOsFromSupabase = useCallback(async () => {
    setIsLoadingDOs(true);
    try {
      const [dosRes, partiesRes, trucksRes] = await Promise.all([
        supabase.from("do_master").select("*").order("created_at", { ascending: false }),
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

      // Update in Supabase do_master
      try {
        const { error } = await supabase
          .from("do_master")
          .update({
            company_name: co,
            do_no: no,
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
        dos: prev.dos.map((d) => (d.id === id ? { ...d, co, no, tot, vf: vf || "", vt: vt || "" } : d))
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
        tot,
        vf: vf || "",
        vt: vt || "",
        parties: []
      };

      setStore((prev) => ({
        ...prev,
        nid: typeof prev.nid === "number" ? prev.nid + 1 : prev.nid,
        dos: [newDO, ...prev.dos],
        act: newDO.id
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
        trucks: prev.trucks.map((t) => (t.id === id ? { ...t, pid: party.id, no: truckNo, tp, date, qty } : t))
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
      { key: "doNo", label: "DO No." },
      { key: "company", label: "Company" },
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
        doNo: getDOName(d),
        company: d.co || "-",
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
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "doNo", label: "DO No." },
      { key: "company", label: "Company" },
      { key: "validFrom", label: "Valid From" },
      { key: "validTo", label: "Valid To" },
      { key: "doQty", label: "DO Qty" },
      { key: "allotted", label: "Allotted" },
      { key: "dispatched", label: "Dispatched" },
      { key: "balance", label: "Balance" }
    ];
    const data = filteredDOs.map((d, idx) => {
      const disp = getDODispatched(d);
      return {
        sno: idx + 1,
        doNo: getDOName(d),
        company: d.co || "-",
        validFrom: formatDate(d.vf),
        validTo: formatDate(d.vt),
        doQty: `${formatNumber(d.tot)} MT`,
        allotted: `${formatNumber(getDOAllotted(d))} MT`,
        dispatched: `${formatNumber(disp)} MT`,
        balance: `${formatNumber(d.tot - disp)} MT`
      };
    });
    exportToPDF(data, cols, `DO_Master_${new Date().toISOString().slice(0, 10)}`, "DO Master Report");
  };

  // Dedicated Tab Exports: Party Wise Order
  const exportPartyOrderExcel = () => {
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "partyName", label: "Party Name" },
      { key: "doNo", label: "DO No." },
      { key: "orderQty", label: "Order Qty (MT)" },
      { key: "dispatched", label: "Dispatched (MT)" },
      { key: "balance", label: "Balance (MT)" },
      { key: "trucks", label: "Trucks Count" }
    ];
    const data = (currentDO?.parties || []).map((p, idx) => {
      const disp = getPartyDispatched(p.id);
      const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;
      return {
        sno: idx + 1,
        partyName: p.name,
        doNo: getDOName(currentDO),
        orderQty: formatNumber(p.qty),
        dispatched: formatNumber(disp),
        balance: formatNumber(p.qty - disp),
        trucks: truckCount
      };
    });
    exportToExcel(data, cols, `Party_Wise_Order_${getDOName(currentDO)}_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportPartyOrderPDF = () => {
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "partyName", label: "Party Name" },
      { key: "doNo", label: "DO No." },
      { key: "orderQty", label: "Order Qty" },
      { key: "dispatched", label: "Dispatched" },
      { key: "balance", label: "Balance" },
      { key: "trucks", label: "Trucks" }
    ];
    const data = (currentDO?.parties || []).map((p, idx) => {
      const disp = getPartyDispatched(p.id);
      const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;
      return {
        sno: idx + 1,
        partyName: p.name,
        doNo: getDOName(currentDO),
        orderQty: `${formatNumber(p.qty)} MT`,
        dispatched: `${formatNumber(disp)} MT`,
        balance: `${formatNumber(p.qty - disp)} MT`,
        trucks: truckCount
      };
    });
    exportToPDF(
      data,
      cols,
      `Party_Wise_Order_${getDOName(currentDO)}_${new Date().toISOString().slice(0, 10)}`,
      `Party Wise Order Qty - DO: ${getDOName(currentDO)} (${currentDO?.co || ""})`
    );
  };

  // Dedicated Tab Exports: Truck Wise Dispatch
  const exportTruckDispatchExcel = () => {
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "date", label: "Dispatch Date" },
      { key: "party", label: "Party" },
      { key: "doNo", label: "DO No." },
      { key: "truckNo", label: "Truck No." },
      { key: "tpNo", label: "TP No." },
      { key: "netWt", label: "Net Wt (MT)" },
      { key: "status", label: "Status" }
    ];
    const data = visibleTrucks.map((t, idx) => {
      const party = (currentDO?.parties || []).find((p) => p.id === t.pid);
      return {
        sno: idx + 1,
        date: formatDate(t.date),
        party: party ? party.name : "-",
        doNo: getDOName(currentDO),
        truckNo: t.no,
        tpNo: t.tp || "-",
        netWt: formatNumber(t.qty),
        status: t.done ? "Done" : "Pending"
      };
    });
    exportToExcel(data, cols, `Truck_Wise_Dispatch_${activeTab}_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportTruckDispatchPDF = () => {
    const cols = [
      { key: "sno", label: "S.No" },
      { key: "date", label: "Date" },
      { key: "party", label: "Party" },
      { key: "doNo", label: "DO No." },
      { key: "truckNo", label: "Truck No." },
      { key: "tpNo", label: "TP No." },
      { key: "netWt", label: "Net Wt" },
      { key: "status", label: "Status" }
    ];
    const data = visibleTrucks.map((t, idx) => {
      const party = (currentDO?.parties || []).find((p) => p.id === t.pid);
      return {
        sno: idx + 1,
        date: formatDate(t.date),
        party: party ? party.name : "-",
        doNo: getDOName(currentDO),
        truckNo: t.no,
        tpNo: t.tp || "-",
        netWt: `${formatNumber(t.qty)} MT`,
        status: t.done ? "Done" : "Pending"
      };
    });
    exportToPDF(
      data,
      cols,
      `Truck_Wise_Dispatch_${activeTab}_${new Date().toISOString().slice(0, 10)}`,
      `Truck Wise Dispatch (${activeTab.toUpperCase()}) - DO: ${getDOName(currentDO)}`
    );
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

  const activeAllotted = useMemo(() => {
    return getDOAllotted(currentDO);
  }, [currentDO]);

  const activeUnallocated = useMemo(() => {
    return (currentDO?.tot || 0) - activeAllotted;
  }, [currentDO, activeAllotted]);

  const partiesTotalQty = (currentDO?.parties || []).reduce((acc, p) => acc + (p?.qty || 0), 0);
  const partiesTotalDisp = (currentDO?.parties || []).reduce((acc, p) => acc + getPartyDispatched(p?.id), 0);
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all active:scale-95 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" /> CSV Export
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all active:scale-95 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 border border-white/30 text-white transition-all active:scale-95 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear All
            </button>
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
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total Trucks</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight">
                    {activeTrucks.length}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Hourglass className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Pending Trucks</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-amber-600 leading-tight">
                    {pendingTruckCount}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Check className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Done / History</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-emerald-600 leading-tight">
                    {historyTruckCount}
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
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">DO Dispatched</span>
                  <div className="text-[16px] sm:text-[17px] font-bold text-slate-900 leading-tight truncate">
                    {formatNumber(getDODispatched(currentDO))} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">DO Rem. Bal</span>
                  <div className={`text-[16px] sm:text-[17px] font-bold leading-tight truncate ${(currentDO?.tot || 0) - getDODispatched(currentDO) > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber((currentDO?.tot || 0) - getDODispatched(currentDO))} <span className="text-xs font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main 3 Section Tabs - Executive Pill Design with smooth mobile horizontal scroll */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:p-1.5 bg-slate-100/90 rounded-2xl w-max border border-slate-200/80 shadow-2xs">
            <button
              onClick={() => setMainSectionTab("do-master")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "do-master"
                  ? "bg-gradient-to-r from-[#e7000b] to-[#ff3340] text-white shadow-sm shadow-red-200 ring-2 ring-red-300/40"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
              }`}
            >
              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                mainSectionTab === "do-master" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                1
              </span>
              DO Master
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                mainSectionTab === "do-master" ? "bg-white text-red-600" : "bg-slate-200 text-slate-600"
              }`}>
                {(store?.dos || []).length}
              </span>
            </button>

            <button
              onClick={() => setMainSectionTab("party-order")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "party-order"
                  ? "bg-gradient-to-r from-[#e7000b] to-[#ff3340] text-white shadow-sm shadow-red-200 ring-2 ring-red-300/40"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
              }`}
            >
              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                mainSectionTab === "party-order" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                2
              </span>
              Party wise Order Qty
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                mainSectionTab === "party-order" ? "bg-white text-red-600" : "bg-slate-200 text-slate-600"
              }`}>
                {currentDO.parties?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setMainSectionTab("truck-dispatch")}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "truck-dispatch"
                  ? "bg-gradient-to-r from-[#e7000b] to-[#ff3340] text-white shadow-sm shadow-red-200 ring-2 ring-red-300/40"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70"
              }`}
            >
              <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-extrabold ${
                mainSectionTab === "truck-dispatch" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                3
              </span>
              Truck wise Dispatch
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                mainSectionTab === "truck-dispatch" ? "bg-white text-red-600" : "bg-slate-200 text-slate-600"
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
              <button
                onClick={() => openDOForm(0)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#ff3340] to-[#e7000b] hover:brightness-105 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New DO Add
              </button>
            </div>
          </div>

          {/* Filter Bar Just Above DO Master Table - Single Line on Mobile */}
          <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-lg shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">Filter:</span>
              <div className="relative min-w-0">
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="px-2.5 sm:px-3.5 py-1.5 pr-7 sm:pr-8 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 text-[11px] sm:text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none transition-colors truncate max-w-[150px] sm:max-w-xs"
                >
                  <option value="ALL">All Companies ({(store?.dos || []).length} DOs)</option>
                  {uniqueCompanies.map((co) => (
                    <option key={co} value={co}>
                      {co} ({(store?.dos || []).filter((d) => (d.co || "").trim() === co).length} DOs)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="text-[11px] sm:text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1 shrink-0">
              <span className="hidden sm:inline">Showing DOs for:</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md truncate max-w-[110px] sm:max-w-none text-[10px] sm:text-xs">
                {selectedCompanyFilter === "ALL" ? "All Companies" : selectedCompanyFilter}
              </span>
            </div>
          </div>

          {/* DO Master Table - Desktop View */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-200/90 bg-white shadow-xs">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/90 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4">DO No.</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Valid From</th>
                  <th className="py-3.5 px-4">Valid To</th>
                  <th className="py-3.5 px-4 text-right">DO Qty</th>
                  <th className="py-3.5 px-4 text-right">Allotted</th>
                  <th className="py-3.5 px-4 text-right">Dispatched</th>
                  <th className="py-3.5 px-4 text-right">Balance</th>
                  <th className="py-3.5 px-4 text-center w-16">View</th>
                  <th className="py-3.5 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13.5px]">
                {filteredDOs.length ? (
                  filteredDOs.map((d, idx) => {
                    const dispatched = getDODispatched(d);
                    const bal = d.tot - dispatched;
                    const isActive = d.id === currentDO.id;
                    return (
                      <tr key={d.id} className={`hover:bg-red-50/40 transition-colors ${isActive ? "bg-red-50/50" : ""}`}>
                        <td className="py-3.5 px-4 font-medium text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-900 text-sm">{getDOName(d)}</span>
                          {isActive && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-[#e7000b]">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{d.co || "-"}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(d.vf)}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(d.vt)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatNumber(d.tot)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700">{formatNumber(getDOAllotted(d))}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700">{formatNumber(dispatched)}</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {formatNumber(bal)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => openViewDO(d.id)}
                            className="w-8 h-8 rounded-full bg-red-50 text-[#e7000b] hover:bg-red-100 border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="View DO"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            <button
                              onClick={() => openDOForm(d.id)}
                              className="w-8 h-8 rounded-full bg-white hover:bg-slate-50 text-[#e7000b] border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                              title="Edit DO"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteDO(d.id)}
                              className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete DO"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-slate-400 font-medium">
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
                          <span className="text-xs text-slate-500 font-medium">{d.co || "No Company"}</span>
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

        {/* Section 2: Party wise Order Qty */}
        {mainSectionTab === "party-order" && (
          <section className="space-y-3">
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-lg bg-red-100 text-[#e7000b] text-xs font-bold flex items-center justify-center">
                2
              </span>
              Party wise Order Qty
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
              <button
                onClick={() => openPartyForm(0)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#ff3340] to-[#e7000b] hover:brightness-105 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Party
              </button>
            </div>
          </div>

          {/* Filter Bar Just Above Party Table - Single Line on Mobile */}
          <div className="flex items-center justify-between gap-2 bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-lg shadow-2xs">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">Filter:</span>
              <div className="relative min-w-0">
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => handleSelectCompanyInPartyTab(e.target.value)}
                  className="px-2.5 sm:px-3.5 py-1.5 pr-7 sm:pr-8 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 text-[11px] sm:text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none transition-colors truncate max-w-[130px] sm:max-w-xs"
                >
                  <option value="ALL">All Companies ({(store?.dos || []).length} DOs)</option>
                  {uniqueCompanies.map((co) => (
                    <option key={co} value={co}>
                      {co} ({(store?.dos || []).filter((d) => (d.co || "").trim() === co).length} DOs)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Quick DO Switcher if multiple DOs match */}
              {(store?.dos || []).length > 1 && (
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">Select DO:</span>
                  <div className="relative">
                    <select
                      value={currentDO.id}
                      onChange={(e) => {
                        const targetId = parseInt(e.target.value);
                        setStore((prev) => ({ ...prev, act: targetId }));
                      }}
                      className="px-3 py-1.5 pr-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none transition-colors"
                    >
                      {(selectedCompanyFilter === "ALL"
                        ? store?.dos || []
                        : (store?.dos || []).filter((d) => (d.co || "").trim() === selectedCompanyFilter)
                      ).map((d) => (
                        <option key={d.id} value={d.id}>
                          {getDOName(d)} ({d.co || "No Co."} - {formatNumber(d.tot)} MT)
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}
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
            <table className="w-full text-left border-collapse table-auto">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/90 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">Party</th>
                  <th className="py-3.5 px-4 w-32">DO No.</th>
                  <th className="py-3.5 px-4 text-right w-32">Order Qty</th>
                  <th className="py-3.5 px-4 text-right w-32">Dispatched</th>
                  <th className="py-3.5 px-4 text-right w-32">Balance</th>
                  <th className="py-3.5 px-4 w-40">Progress</th>
                  <th className="py-3.5 px-4 text-center w-24">Trucks</th>
                  <th className="py-3.5 px-4 text-center w-16">View</th>
                  <th className="py-3.5 px-4 text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13.5px]">
                {currentDO.parties && currentDO.parties.length ? (
                  currentDO.parties.map((p, idx) => {
                    const dispatched = getPartyDispatched(p.id);
                    const bal = p.qty - dispatched;
                    const pct = p.qty > 0 ? Math.min(100, (dispatched / p.qty) * 100) : 0;
                    const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;

                    return (
                      <tr key={p.id} className="hover:bg-red-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-400 text-center">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{p.name}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{getDOName(currentDO)}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatNumber(p.qty)}</td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-700">{formatNumber(dispatched)}</td>
                        <td className={`py-3.5 px-4 text-right font-bold ${bal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {formatNumber(bal)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
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
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">{truckCount}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => openViewParty(p.id)}
                            className="w-8 h-8 rounded-full bg-red-50 text-[#e7000b] hover:bg-red-100 border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="View Party"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
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
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400 font-medium">
                      {(store?.dos || []).length ? "No party in this DO yet. Click Add Party." : "Add a DO first."}
                    </td>
                  </tr>
                )}
              </tbody>
              {currentDO.parties && currentDO.parties.length > 0 && (
                <tfoot>
                  <tr className="bg-red-50/80 font-bold text-xs sm:text-[13px] text-[#8f0009] border-t border-red-200">
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4">Total</td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4 text-right">{formatNumber(partiesTotalQty)}</td>
                    <td className="py-3.5 px-4 text-right">{formatNumber(partiesTotalDisp)}</td>
                    <td className="py-3.5 px-4 text-right">{formatNumber(partiesTotalQty - partiesTotalDisp)}</td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4 text-center">{activeTrucks.length}</td>
                    <td className="py-3.5 px-4"></td>
                    <td className="py-3.5 px-4"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {/* Party Cards - Mobile View */}
          <div className="md:hidden space-y-3">
            {currentDO.parties && currentDO.parties.length ? (
              currentDO.parties.map((p, idx) => {
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
                          <span className="text-[11px] text-slate-500 font-medium">DO No: {getDOName(currentDO)}</span>
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
                {(currentDO.parties || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <button
                onClick={exportTruckDispatchExcel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>
              <button
                onClick={exportTruckDispatchPDF}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 transition-all shadow-2xs active:scale-95 cursor-pointer"
                title="Download PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600" />
                <span>PDF</span>
              </button>

              <button
                onClick={() => openTruckForm(0)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-[#ff3340] to-[#e7000b] hover:brightness-105 text-white transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Truck
              </button>
            </div>
          </div>

          {/* Pending / History Tabs */}
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
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/90 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={visibleTrucks.length > 0 && selectedTruckIds.size === visibleTrucks.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      className="rounded accent-[#e7000b] cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4 w-12">#</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Party</th>
                  <th className="py-3.5 px-4">DO No.</th>
                  <th className="py-3.5 px-4">Truck No.</th>
                  <th className="py-3.5 px-4">TP No.</th>
                  <th className="py-3.5 px-4 text-right">Net Wt (MT)</th>
                  <th className="py-3.5 px-4 text-center w-16">View</th>
                  <th className="py-3.5 px-4 text-right w-44">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13.5px]">
                {visibleTrucks.length ? (
                  visibleTrucks.map((t, idx) => {
                    const party = (currentDO.parties || []).find((p) => p.id === t.pid);
                    const isSelected = selectedTruckIds.has(t.id);

                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-red-50/40 transition-colors ${isSelected ? "bg-red-50/60" : ""}`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectTruck(t.id)}
                            className="rounded accent-[#e7000b] cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-400">{idx + 1}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{formatDate(t.date)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{party ? party.name : "-"}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{getDOName(currentDO)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{t.no}</td>
                        <td className="py-3.5 px-4 text-slate-600 font-medium">{t.tp || "-"}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 text-[14px]">{formatNumber(t.qty)}</td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => openViewTruck(t.id)}
                            className="w-8 h-8 rounded-full bg-red-50 text-[#e7000b] hover:bg-red-100 border border-red-200 inline-flex items-center justify-center transition-colors cursor-pointer"
                            title="View Truck"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right">
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
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400 font-medium">
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
                  <tr className="bg-red-50/80 font-bold text-xs sm:text-[13px] text-[#8f0009] border-t border-red-200">
                    <td className="py-3.5 px-4"></td>
                    <td colSpan={6} className="py-3.5 px-4">
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
                            {party ? party.name : "-"}
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
          <div className={`bg-white rounded-2xl w-full ${modalConfig.type === "confirm" ? "max-w-sm" : "max-w-2xl"} max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col transition-all`}>
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#8f0009] via-[#e7000b] to-[#ff4d57] text-white flex items-center justify-between shrink-0">
              <h3 className="font-bold text-base tracking-tight">{modalConfig.title}</h3>
              <button
                onClick={closeModal}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* DO Form */}
              {modalConfig.type === "doForm" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1.5">Company</label>
                      <div className="relative">
                        <select
                          value={formData.co || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "__new__") {
                              setQuickAddModal({
                                isOpen: true,
                                title: "Add New Company",
                                label: "Company Name *",
                                placeholder: "e.g. Jindal Steel & Power",
                                value: "",
                                onConfirm: (val) => setFormData((prev) => ({ ...prev, co: val }))
                              });
                            } else {
                              setFormData({ ...formData, co: val });
                            }
                          }}
                          className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer appearance-none"
                        >
                          <option value="">Select Company</option>
                          {uniqueCompanies.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                          <option value="__new__">+ Add New Company...</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1.5">DO No. *</label>
                      <input
                        type="text"
                        value={formData.no || ""}
                        onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                        placeholder="e.g. DO-12345"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-bold text-slate-900 transition-colors shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1.5">DO Qty (MT) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.tot || ""}
                        onChange={(e) => setFormData({ ...formData, tot: e.target.value })}
                        placeholder="e.g. 500.00"
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-semibold text-slate-800 transition-colors shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1.5">Valid From</label>
                      <input
                        type="date"
                        value={formData.vf || ""}
                        onChange={(e) => setFormData({ ...formData, vf: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-medium text-slate-700 cursor-pointer shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1.5">Valid To</label>
                      <input
                        type="date"
                        value={formData.vt || ""}
                        onChange={(e) => setFormData({ ...formData, vt: e.target.value })}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-medium text-slate-700 cursor-pointer shadow-2xs"
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
                        <label className="font-semibold text-slate-700 block mb-1.5">Company</label>
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
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Party Name *</label>
                        <div className="relative">
                          <select
                            value={formData.partyName || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new__") {
                                setQuickAddModal({
                                  isOpen: true,
                                  title: "Add New Party",
                                  label: "Party Name *",
                                  placeholder: "e.g. Shyam Traders",
                                  value: "",
                                  onConfirm: (val) => setFormData((prev) => ({ ...prev, partyName: val }))
                                });
                              } else {
                                setFormData({ ...formData, partyName: val });
                              }
                            }}
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-semibold text-slate-800 transition-colors shadow-2xs cursor-pointer appearance-none"
                          >
                            <option value="">Select Party</option>
                            {uniquePartyNames.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                            <option value="__new__">+ Add New Party...</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Order Qty (MT) *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.qty || ""}
                          onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                          placeholder="e.g. 150.00"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-semibold text-slate-900 transition-colors shadow-2xs"
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
                      <span className="text-slate-500">Party</span>
                      <b className="font-bold text-slate-900">{modalConfig.data.name}</b>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Company</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">Truck No. *</label>
                        <div className="relative">
                          <select
                            value={formData.truckNo || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__new__") {
                                setQuickAddModal({
                                  isOpen: true,
                                  title: "Add New Truck",
                                  label: "Truck Number *",
                                  placeholder: "e.g. CG04 AB 1234",
                                  value: "",
                                  onConfirm: (val) => setFormData((prev) => ({ ...prev, truckNo: val.toUpperCase() }))
                                });
                              } else {
                                setFormData({ ...formData, truckNo: val });
                              }
                            }}
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-bold text-slate-900 transition-colors shadow-2xs cursor-pointer appearance-none uppercase"
                          >
                            <option value="">Select Truck No.</option>
                            {uniqueTruckNumbers.map((no) => (
                              <option key={no} value={no}>
                                {no}
                              </option>
                            ))}
                            <option value="__new__">+ Add New Truck...</option>
                          </select>
                          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-700 block mb-1.5">TP No.</label>
                        <input
                          type="text"
                          value={formData.tp || ""}
                          onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                          placeholder="Transit pass / TP number"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-200 text-xs font-medium text-slate-800 transition-colors shadow-2xs"
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
                      <span className="text-slate-500">DO No.</span>
                      <span className="font-medium">{getDOName(currentDO)}</span>
                    </div>
                    <div className="flex justify-between p-2.5">
                      <span className="text-slate-500">Party</span>
                      <span className="font-bold text-slate-800">
                        {currentDO.parties?.find((p) => p.id === modalConfig.data.pid)?.name || "-"}
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
