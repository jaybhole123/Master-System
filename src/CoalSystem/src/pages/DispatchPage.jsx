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
  Clock,
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
  const [selectedTruckCompanyFilter, setSelectedTruckCompanyFilter] = useState("ALL");
  const [selectedTruckDONoFilter, setSelectedTruckDONoFilter] = useState("ALL");
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

  // LocalStorage initialization & Sync
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
      console.error("Failed to save to localStorage:", e);
    }
  }, [store]);

  // Fetch DO Master, DO Allotment & Truck Entries from Supabase
  const fetchDOMasterFromDB = useCallback(async () => {
    if (!supabase) return;
    try {
      setIsLoadingDOs(true);
      // Fetch DO Masters
      const { data: doData, error: doError } = await supabase
        .from("dispatch_do_master")
        .select("*")
        .order("created_at", { ascending: false });

      if (doError) {
        console.warn("Could not fetch from dispatch_do_master table, falling back to local storage:", doError.message);
        return;
      }

      // Fetch DO Allotments
      const { data: allotData, error: allotError } = await supabase
        .from("dispatch_do_allotment")
        .select("*")
        .order("created_at", { ascending: true });

      if (allotError) {
        console.warn("Could not fetch from dispatch_do_allotment table:", allotError.message);
      }

      // Fetch Truck Entries
      const { data: truckData, error: truckError } = await supabase
        .from("dispatch_truck_entries")
        .select("*")
        .order("created_at", { ascending: false });

      if (truckError) {
        console.warn("Could not fetch from dispatch_truck_entries table:", truckError.message);
      }

      if (doData && doData.length > 0) {
        setStore((prev) => {
          const mergedDOs = doData.map((d) => {
            // Find DB allotments for this DO
            const dbParties = (allotData || [])
              .filter((a) => String(a.do_id) === String(d.id))
              .map((a) => ({
                id: a.id,
                name: a.receiver_party_name || "",
                qty: parseFloat(a.order_qty) || 0
              }));

            const existingLocalDO = (prev.dos || []).find(
              (ld) => ld.id === d.id || (ld.no && d.do_no && ld.no.trim() === d.do_no.trim())
            );

            return {
              id: d.id,
              co: d.do_party_name || "",
              no: d.do_no || "",
              mines: d.mines || "",
              grade: d.grade || "",
              tot: parseFloat(d.total_do_qty) || 0,
              vf: d.valid_from || "",
              vt: d.valid_to || "",
              parties: dbParties.length > 0 ? dbParties : (existingLocalDO?.parties || [])
            };
          });

          // Map DB trucks
          const mergedTrucks = (truckData && truckData.length > 0)
            ? truckData.map((t) => ({
                id: t.id,
                did: t.do_id,
                pid: t.party_id,
                no: t.truck_no,
                driver: t.transporter_name || "",
                tp: t.tp_no || "",
                fromLoc: t.route_from || "",
                toLoc: t.route_to || "",
                freight: t.freight_rate || 0,
                date: t.dispatch_date,
                qty: parseFloat(t.net_wt) || 0,
                done: !!t.done
              }))
            : prev.trucks;

          return {
            ...prev,
            dos: mergedDOs,
            trucks: mergedTrucks,
            act: prev.act && mergedDOs.some((d) => d.id === prev.act) ? prev.act : mergedDOs[0]?.id || 0
          };
        });
      }
    } catch (err) {
      console.error("Error fetching dispatch tables:", err);
    } finally {
      setIsLoadingDOs(false);
    }
  }, []);

  useEffect(() => {
    fetchDOMasterFromDB();
  }, [fetchDOMasterFromDB]);

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
    // Strictly only from do_master table
    const listFromDos = (store?.dos || []).map((d) => (d?.co || "").trim()).filter(Boolean);
    return [...new Set(listFromDos)];
  }, [store?.dos]);

  // DO reference items for party auto-fetch strictly from do_master table
  const partyDORefs = useMemo(() => {
    const map = new Map();
    (store?.dos || []).forEach((d) => {
      const coName = (d?.co || "").trim();
      if (coName) {
        map.set(coName.toLowerCase(), {
          co: coName,
          no: d.no || "",
          mines: d.mines || "",
          tot: parseFloat(d.tot) || 0,
          vf: d.vf || "",
          vt: d.vt || ""
        });
      }
    });
    return map;
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

  const uniqueTpNumbers = useMemo(() => {
    return [...new Set((store?.trucks || []).map((t) => (t?.tp || "").trim()).filter(Boolean))];
  }, [store?.trucks]);

  const uniqueFromLocations = useMemo(() => {
    const listFromTrucks = (store?.trucks || []).map((t) => (t?.fromLoc || "").trim()).filter(Boolean);
    const listFromMines = (store?.dos || []).map((d) => (d?.mines || "").trim()).filter(Boolean);
    return [...new Set([...listFromTrucks, ...listFromMines])];
  }, [store?.trucks, store?.dos]);

  const uniqueToLocations = useMemo(() => {
    const listFromTrucks = (store?.trucks || []).map((t) => (t?.toLoc || "").trim()).filter(Boolean);
    return [...new Set(listFromTrucks)];
  }, [store?.trucks]);

  const uniqueFreights = useMemo(() => {
    return [...new Set((store?.trucks || []).map((t) => String(t?.freight || "")).filter((f) => f && f !== "0" && f !== "0.00"))];
  }, [store?.trucks]);

  // Filtered Trucks list
  const visibleTrucks = useMemo(() => {
    return (store?.trucks || []).filter((t) => {
      if (!t) return false;
      const truckDO = (store?.dos || []).find((d) => d.id === t.did);
      const matchCompany = selectedTruckCompanyFilter === "ALL" || (truckDO?.co || "").trim() === selectedTruckCompanyFilter;
      const matchDONo = selectedTruckDONoFilter === "ALL" || String(t.did) === String(selectedTruckDONoFilter) || String(truckDO?.no) === String(selectedTruckDONoFilter);
      const matchDO = selectedTruckCompanyFilter !== "ALL" || selectedTruckDONoFilter !== "ALL" ? true : (t.did === currentDO?.id);
      const matchTab = activeTab === "history" ? !!t.done : !t.done;

      // Party match: can match by PID or party name if selectedTruckFilter is set
      let matchParty = true;
      if (selectedTruckFilter) {
        const partyObj = (store?.dos || []).flatMap((d) => d?.parties || []).find((p) => String(p.id) === String(selectedTruckFilter) || p.name === selectedTruckFilter);
        matchParty = String(t.pid) === String(selectedTruckFilter) || (partyObj && String(t.pid) === String(partyObj.id));
      }

      return matchCompany && matchDONo && matchDO && matchTab && matchParty;
    });
  }, [store?.trucks, store?.dos, currentDO?.id, activeTab, selectedTruckFilter, selectedTruckCompanyFilter, selectedTruckDONoFilter]);

  const pendingTruckCount = useMemo(() => {
    return (store?.trucks || []).filter((t) => {
      if (!t || t.done) return false;
      const truckDO = (store?.dos || []).find((d) => d.id === t.did);
      const matchCompany = selectedTruckCompanyFilter === "ALL" || (truckDO?.co || "").trim() === selectedTruckCompanyFilter;
      const matchDONo = selectedTruckDONoFilter === "ALL" || String(t.did) === String(selectedTruckDONoFilter) || String(truckDO?.no) === String(selectedTruckDONoFilter);
      const matchDO = selectedTruckCompanyFilter !== "ALL" || selectedTruckDONoFilter !== "ALL" ? true : (t.did === currentDO?.id);
      return matchCompany && matchDONo && matchDO;
    }).length;
  }, [store?.trucks, store?.dos, currentDO?.id, selectedTruckCompanyFilter, selectedTruckDONoFilter]);

  const historyTruckCount = useMemo(() => {
    return (store?.trucks || []).filter((t) => {
      if (!t || !t.done) return false;
      const truckDO = (store?.dos || []).find((d) => d.id === t.did);
      const matchCompany = selectedTruckCompanyFilter === "ALL" || (truckDO?.co || "").trim() === selectedTruckCompanyFilter;
      const matchDONo = selectedTruckDONoFilter === "ALL" || String(t.did) === String(selectedTruckDONoFilter) || String(truckDO?.no) === String(selectedTruckDONoFilter);
      const matchDO = selectedTruckCompanyFilter !== "ALL" || selectedTruckDONoFilter !== "ALL" ? true : (t.did === currentDO?.id);
      return matchCompany && matchDONo && matchDO;
    }).length;
  }, [store?.trucks, store?.dos, currentDO?.id, selectedTruckCompanyFilter, selectedTruckDONoFilter]);

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
    const existingLifterRows = d && d.parties && d.parties.length
      ? d.parties.map((p) => ({ id: p.id, partyName: p.name || "", partyQty: p.qty || "" }))
      : [{ id: Date.now(), partyName: "", partyQty: "" }];

    setFormData({
      co: d ? d.co : "",
      no: d ? d.no : "",
      mines: d && d.mines ? d.mines : "",
      grade: d && d.grade ? d.grade : "",
      tot: d ? d.tot : "",
      vf: d && d.vf ? d.vf : "",
      vt: d && d.vt ? d.vt : "",
      // Multi-row lifter allotment rows
      lifterRows: existingLifterRows
    });
    setModalConfig({
      isOpen: true,
      title: d ? "Edit DO" : "New DO & Party Allotment",
      type: "doForm",
      data: { id },
      error: ""
    });
  };

  const saveDO = async (id) => {
    const co = (formData.co || "").trim();
    const no = (formData.no || "").trim();
    const mines = (formData.mines || "").trim();
    const grade = (formData.grade || "").trim();
    const tot = parseFloat(formData.tot);
    const vf = formData.vf || null;
    const vt = formData.vt || null;
    const lifterRows = (formData.lifterRows || []).filter(
      (r) => (r.partyName || "").trim() !== "" && parseFloat(r.partyQty) > 0
    );

    if (!no || !(tot > 0)) {
      setModalConfig((prev) => ({ ...prev, error: "Enter DO No. and DO Qty." }));
      return;
    }
    if (vf && vt && vt < vf) {
      setModalConfig((prev) => ({ ...prev, error: "Valid To date cannot be before Valid From date." }));
      return;
    }

    const totalLifterQty = lifterRows.reduce((sum, r) => sum + (parseFloat(r.partyQty) || 0), 0);
    if (totalLifterQty > tot + 0.001) {
      setModalConfig((prev) => ({
        ...prev,
        error: `Total Lifter Allotted Qty (${formatNumber(totalLifterQty)} MT) cannot exceed DO Qty (${formatNumber(tot)} MT).`
      }));
      return;
    }

    if (id) {
      const existing = store.dos.find((d) => d.id === id);
      const updatedParties = lifterRows.map((r, idx) => {
        const matchedParty = (existing?.parties || []).find((p) => p.id === r.id);
        return {
          id: matchedParty ? matchedParty.id : Date.now() + idx,
          name: (r.partyName || "").trim(),
          qty: parseFloat(r.partyQty) || 0
        };
      });

      // Update in Supabase dispatch_do_master table if connected
      try {
        if (supabase) {
          const { error: dbErr } = await supabase
            .from("dispatch_do_master")
            .update({
              do_party_name: co,
              do_no: no,
              mines,
              grade,
              total_do_qty: tot,
              valid_from: vf || null,
              valid_to: vt || null,
              updated_at: new Date().toISOString()
            })
            .match({ id });

          if (dbErr) {
            console.error("Supabase DO update error:", dbErr);
            alert(`Database Update Error: ${dbErr.message || JSON.stringify(dbErr)}`);
            setModalConfig((prev) => ({ ...prev, error: `DB Error: ${dbErr.message}` }));
            return;
          }

          // Sync allotment parties for this DO in dispatch_do_allotment
          if (lifterRows.length > 0) {
            // Delete previous allotments for this DO and re-insert fresh updated list
            await supabase.from("dispatch_do_allotment").delete().match({ do_id: id });
            const freshAllots = lifterRows.map((r) => ({
              do_id: id,
              receiver_party_name: r.partyName.trim(),
              order_qty: parseFloat(r.partyQty) || 0
            }));
            await supabase.from("dispatch_do_allotment").insert(freshAllots);
          }
        }
      } catch (err) {
        console.error("Failed to update in dispatch_do_master & dispatch_do_allotment:", err);
      }

      setStore((prev) => ({
        ...prev,
        dos: prev.dos.map((d) => (d.id === id ? { ...d, co, no, mines, grade, tot, vf: vf || "", vt: vt || "", parties: updatedParties } : d))
      }));
    } else {
      // Check duplicate locally first
      if (store.dos.some((d) => d.no.toLowerCase() === no.toLowerCase())) {
        setModalConfig((prev) => ({ ...prev, error: "This DO No. already exists." }));
        return;
      }

      let newRecordId = store.nid;

      // Insert into Supabase dispatch_do_master table
      try {
        if (supabase) {
          const payload = {
            do_party_name: co,
            do_no: no,
            mines: mines || null,
            grade: grade || null,
            total_do_qty: tot,
            valid_from: vf || null,
            valid_to: vt || null
          };

          const { data: insertedData, error: dbErr } = await supabase
            .from("dispatch_do_master")
            .insert([payload])
            .select();

          if (dbErr) {
            console.error("Supabase DO insert error:", dbErr);
            alert(`Database Save Error: ${dbErr.message || JSON.stringify(dbErr)}\n\n(Tip: Make sure you ran the CREATE TABLE query in Supabase SQL editor and RLS allows INSERT).`);
            setModalConfig((prev) => ({ ...prev, error: `DB Error: ${dbErr.message}` }));
            return;
          } else if (insertedData && insertedData[0]?.id) {
            newRecordId = insertedData[0].id;
          }
        }
      } catch (err) {
        console.error("Failed to insert into dispatch_do_master:", err);
        alert(`Database Connection Error: ${err.message}`);
        setModalConfig((prev) => ({ ...prev, error: `DB Error: ${err.message}` }));
        return;
      }

      let createdParties = lifterRows.map((r, idx) => ({
        id: Date.now() + idx,
        name: r.partyName.trim(),
        qty: parseFloat(r.partyQty)
      }));

      // Insert parties into dispatch_do_allotment table
      try {
        if (supabase && lifterRows.length > 0) {
          const allotPayload = lifterRows.map((r) => ({
            do_id: newRecordId,
            receiver_party_name: r.partyName.trim(),
            order_qty: parseFloat(r.partyQty) || 0
          }));

          const { data: allotSaved, error: allotErr } = await supabase
            .from("dispatch_do_allotment")
            .insert(allotPayload)
            .select();

          if (allotErr) {
            console.warn("Supabase DO Allotment insert warning:", allotErr.message);
          } else if (allotSaved && allotSaved.length > 0) {
            createdParties = allotSaved.map((a) => ({
              id: a.id,
              name: a.receiver_party_name,
              qty: parseFloat(a.order_qty)
            }));
          }
        }
      } catch (err) {
        console.error("Failed to insert into dispatch_do_allotment:", err);
      }

      const newDO = {
        id: newRecordId,
        co,
        no,
        mines,
        grade,
        tot,
        vf: vf || "",
        vt: vt || "",
        parties: createdParties
      };

      setStore((prev) => ({
        ...prev,
        nid: typeof prev.nid === "number" ? prev.nid + 1 + lifterRows.length : prev.nid + 1,
        dos: [...prev.dos, newDO],
        act: newRecordId
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
          // Delete from Supabase dispatch_do_master
          try {
            if (supabase) {
              const { error: dbErr } = await supabase
                .from("dispatch_do_master")
                .delete()
                .match({ id });

              if (dbErr) {
                console.warn("Supabase delete error:", dbErr.message);
              }
            }
          } catch (err) {
            console.error("Failed to delete from dispatch_do_master:", err);
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
      // Update in Supabase dispatch_do_allotment
      try {
        if (supabase) {
          const { error: dbErr } = await supabase
            .from("dispatch_do_allotment")
            .update({
              receiver_party_name: name,
              order_qty: qty,
              updated_at: new Date().toISOString()
            })
            .match({ id });

          if (dbErr) {
            console.warn("Supabase party update warning:", dbErr.message);
          }
        }
      } catch (err) {
        console.error("Failed to update dispatch_do_allotment:", err);
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
      let assignedId = store.nid;

      // Insert into Supabase dispatch_do_allotment
      try {
        if (supabase && targetDO?.id) {
          const { data: inserted, error: dbErr } = await supabase
            .from("dispatch_do_allotment")
            .insert([
              {
                do_id: targetDO.id,
                receiver_party_name: name,
                order_qty: qty
              }
            ])
            .select();

          if (dbErr) {
            console.warn("Supabase party insert warning:", dbErr.message);
            alert(`Database Allotment Error: ${dbErr.message}`);
          } else if (inserted && inserted[0]?.id) {
            assignedId = inserted[0].id;
          }
        }
      } catch (err) {
        console.error("Failed to insert into dispatch_do_allotment:", err);
      }

      setStore((prev) => {
        const updatedDos = prev.dos.map((d) => {
          if (d.id !== targetDO.id) return d;
          return {
            ...d,
            parties: [...(d.parties || []), { id: assignedId, name, qty }]
          };
        });

        return {
          ...prev,
          nid: typeof prev.nid === "number" ? prev.nid + 1 : prev.nid + 1,
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
          // Delete from Supabase dispatch_do_allotment
          try {
            if (supabase) {
              const { error: dbErr } = await supabase
                .from("dispatch_do_allotment")
                .delete()
                .match({ id });

              if (dbErr) {
                console.warn("Supabase party delete warning:", dbErr.message);
              }
            }
          } catch (err) {
            console.error("Failed to delete from dispatch_do_allotment:", err);
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

    const defaultDate = new Date().toISOString().slice(0, 10);
    setFormData({
      pid: initialPid,
      truckNo: t ? t.no : "",
      driver: t ? (t.driver || "") : "",
      tp: t ? t.tp : "",
      fromLoc: t ? (t.fromLoc || "") : "",
      toLoc: t ? (t.toLoc || "") : "",
      freight: t ? (t.freight || "") : "",
      date: t ? t.date : defaultDate,
      qty: t ? t.qty : "",
      rows: t
        ? [{ id: 1, truckNo: t.no || "", driver: t.driver || "", tp: t.tp || "", fromLoc: t.fromLoc || "", toLoc: t.toLoc || "", freight: t.freight || "", date: t.date || defaultDate, qty: t.qty || "" }]
        : [{ id: 1, truckNo: "", driver: "", tp: "", fromLoc: "", toLoc: "", freight: "", date: defaultDate, qty: "" }]
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
    const allPartiesList = (store?.dos || []).flatMap((d) => d.parties || []);
    const availableParties = (currentDO.parties && currentDO.parties.length) ? currentDO.parties : allPartiesList;
    const party = availableParties.find((p) => String(p.id) === String(pid)) || availableParties[0];

    if (!party) {
      setModalConfig((prev) => ({ ...prev, error: "Please select a valid party." }));
      return;
    }

    // Determine rows to save (multiple rows in add mode, single in edit mode)
    const rows = id
      ? [{
          truckNo: (formData.truckNo || "").trim().toUpperCase(),
          driver: (formData.driver || "").trim(),
          tp: (formData.tp || "").trim(),
          fromLoc: (formData.fromLoc || "").trim(),
          toLoc: (formData.toLoc || "").trim(),
          freight: parseFloat(formData.freight) || 0,
          date: formData.date || new Date().toISOString().slice(0, 10),
          qty: parseFloat(formData.qty)
        }]
      : (formData.rows && formData.rows.length ? formData.rows : [{ truckNo: formData.truckNo, driver: formData.driver, tp: formData.tp, fromLoc: formData.fromLoc, toLoc: formData.toLoc, freight: formData.freight, date: formData.date, qty: formData.qty }])
          .map((r) => ({
            truckNo: (r.truckNo || "").trim().toUpperCase(),
            driver: (r.driver || "").trim(),
            tp: (r.tp || "").trim(),
            fromLoc: (r.fromLoc || "").trim(),
            toLoc: (r.toLoc || "").trim(),
            freight: parseFloat(r.freight) || 0,
            date: r.date || new Date().toISOString().slice(0, 10),
            qty: parseFloat(r.qty)
          }));

    // Validate rows
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.truckNo || !(r.qty > 0)) {
        setModalConfig((prev) => ({
          ...prev,
          error: `Row #${i + 1}: Please enter Truck No. and Net Wt.`
        }));
        return;
      }
    }

    const totalNewQty = rows.reduce((acc, r) => acc + r.qty, 0);
    const currentDispatched = getPartyDispatched(party.id);
    const existing = id ? store.trucks.find((t) => t.id === id) : null;
    const balance = party.qty - currentDispatched + (existing && String(existing.pid) === String(party.id) ? existing.qty : 0);

    if (totalNewQty > balance + 0.001) {
      setModalConfig((prev) => ({
        ...prev,
        error: `${party.name} has only ${formatNumber(balance)} MT balance, but total entered is ${formatNumber(totalNewQty)} MT.`
      }));
      return;
    }

    if (id) {
      const r = rows[0];

      // Update in Supabase dispatch_truck_entries
      try {
        if (supabase) {
          const { error: dbErr } = await supabase
            .from("dispatch_truck_entries")
            .update({
              party_id: party.id,
              truck_no: r.truckNo,
              transporter_name: r.driver || null,
              tp_no: r.tp || null,
              route_from: r.fromLoc || null,
              route_to: r.toLoc || null,
              freight_rate: r.freight || 0,
              dispatch_date: r.date,
              net_wt: r.qty,
              updated_at: new Date().toISOString()
            })
            .match({ id });

          if (dbErr) {
            console.warn("Supabase truck update warning:", dbErr.message);
          }
        }
      } catch (err) {
        console.error("Failed to update in dispatch_truck_entries:", err);
      }

      setStore((prev) => ({
        ...prev,
        trucks: prev.trucks.map((t) =>
          t.id === id
            ? {
                ...t,
                pid: party.id,
                no: r.truckNo,
                driver: r.driver,
                tp: r.tp,
                fromLoc: r.fromLoc,
                toLoc: r.toLoc,
                freight: r.freight,
                date: r.date,
                qty: r.qty
              }
            : t
        )
      }));
    } else {
      let savedDbTrucks = [];

      // Insert multiple rows into Supabase dispatch_truck_entries
      try {
        if (supabase) {
          const truckPayload = rows.map((r) => ({
            do_id: currentDO.id,
            party_id: party.id,
            dispatch_date: r.date,
            truck_no: r.truckNo,
            transporter_name: r.driver || null,
            tp_no: r.tp || null,
            route_from: r.fromLoc || null,
            route_to: r.toLoc || null,
            freight_rate: r.freight || 0,
            net_wt: r.qty,
            done: false
          }));

          const { data: insertedTrucks, error: dbErr } = await supabase
            .from("dispatch_truck_entries")
            .insert(truckPayload)
            .select();

          if (dbErr) {
            console.error("Supabase truck insert error:", dbErr);
            alert(`Database Truck Save Error: ${dbErr.message}`);
          } else if (insertedTrucks && insertedTrucks.length > 0) {
            savedDbTrucks = insertedTrucks;
          }
        }
      } catch (err) {
        console.error("Failed to insert into dispatch_truck_entries:", err);
      }

      setStore((prev) => {
        let baseNid = prev.nid;
        const newTruckObjects = rows.map((r, idx) => {
          const matchedDbTruck = savedDbTrucks[idx];
          return {
            id: matchedDbTruck ? matchedDbTruck.id : baseNid + idx,
            did: currentDO.id,
            pid: party.id,
            no: r.truckNo,
            driver: r.driver,
            tp: r.tp,
            fromLoc: r.fromLoc,
            toLoc: r.toLoc,
            freight: r.freight,
            date: r.date,
            qty: r.qty,
            done: false
          };
        });

        return {
          ...prev,
          nid: typeof prev.nid === "number" ? prev.nid + rows.length : prev.nid + rows.length,
          trucks: [...newTruckObjects, ...prev.trucks]
        };
      });
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
    // Update status in Supabase dispatch_truck_entries
    try {
      if (supabase) {
        await supabase
          .from("dispatch_truck_entries")
          .update({ done, updated_at: new Date().toISOString() })
          .match({ id });
      }
    } catch (err) {
      console.error("Failed to update status in dispatch_truck_entries:", err);
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
          // Delete from Supabase dispatch_truck_entries
          try {
            if (supabase) {
              await supabase
                .from("dispatch_truck_entries")
                .delete()
                .match({ id });
            }
          } catch (err) {
            console.error("Failed to delete from dispatch_truck_entries:", err);
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

  const handleBulkStatus = async (done) => {
    if (!selectedTruckIds.size) return;
    const ids = Array.from(selectedTruckIds);

    try {
      if (supabase && ids.length > 0) {
        await supabase
          .from("dispatch_truck_entries")
          .update({ done, updated_at: new Date().toISOString() })
          .in("id", ids);
      }
    } catch (err) {
      console.error("Bulk status error in dispatch_truck_entries:", err);
    }

    setStore((prev) => ({
      ...prev,
      trucks: prev.trucks.map((t) => (selectedTruckIds.has(t.id) ? { ...t, done } : t))
    }));
    setSelectedTruckIds(new Set());
  };

  const handleBulkDelete = () => {
    const count = selectedTruckIds.size;
    if (!count) return;
    const ids = Array.from(selectedTruckIds);

    setModalConfig({
      isOpen: true,
      title: "Confirm Bulk Delete",
      type: "confirm",
      data: {
        message: `Delete ${count} selected truck entries? This cannot be undone.`,
        onConfirm: async () => {
          try {
            if (supabase && ids.length > 0) {
              await supabase
                .from("dispatch_truck_entries")
                .delete()
                .in("id", ids);
            }
          } catch (err) {
            console.error("Bulk delete error in dispatch_truck_entries:", err);
          }

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
      { key: "lifterParty", label: "Receiver Party Name" },
      { key: "doNo", label: "DO No." },
      { key: "mines", label: "Mines" },
      { key: "grade", label: "Grade" },
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
        lifterParty: p.name,
        doNo: getDOName(currentDO),
        mines: currentDO?.mines || "-",
        grade: currentDO?.grade || "-",
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
      "Receiver Party Name",
      "DO No.",
      "Mines",
      "Grade",
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
        p.name || "-",
        getDOName(currentDO),
        currentDO?.mines || "-",
        currentDO?.grade || "-",
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
      { key: "driverName", label: "Transporter / Lifter Name" },
      { key: "tpNo", label: "TP No." },
      { key: "route", label: "Route (From - To)" },
      { key: "freight", label: "Freight (₹/MT)" },
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
        route: t.fromLoc || t.toLoc ? `${t.fromLoc || "-"} → ${t.toLoc || "-"}` : "-",
        freight: t.freight ? formatNumber(t.freight) : "-",
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
      "DO Party",
      "DO No.",
      "Lifter Party",
      "Truck No.",
      "Driver",
      "TP No.",
      "Route",
      "Freight",
      "Net Wt",
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
        t.fromLoc || t.toLoc ? `${t.fromLoc || "-"} → ${t.toLoc || "-"}` : "-",
        t.freight ? `${formatNumber(t.freight)}` : "-",
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
        fontSize: 8,
        cellPadding: 2.5,
        valign: "middle",
        halign: "left"
      },
      headStyles: {
        fillColor: [143, 0, 9],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {/* TAB 1: DO MASTER STATS (Across All / Selected Company) */}
          {mainSectionTab === "do-master" && (
            <>
              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-red-50 text-[#e7000b] flex items-center justify-center shrink-0 border border-red-100/80">
                  <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total DO Qty</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(totalDOQty)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                  <List className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Allotted Parties</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(totalAllotted)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Hourglass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Unallocated Bal</span>
                  <div className={`text-[13px] sm:text-[14px] xl:text-[15px] font-bold leading-tight whitespace-nowrap ${totalUnallocated > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(totalUnallocated)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Truck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total Dispatched</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(totalDispatched)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Scale className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">DO Balance</span>
                  <div className={`text-[13px] sm:text-[14px] xl:text-[15px] font-bold leading-tight whitespace-nowrap ${totalBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(totalBalance)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Hash className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total Trucks</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {totalTrucksCount}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: PARTY WISE ORDER QTY STATS (For Current Active DO) */}
          {mainSectionTab === "party-order" && (
            <>
              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-red-50 text-[#e7000b] flex items-center justify-center shrink-0 border border-red-100">
                  <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Current DO Qty</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(currentDO?.tot || 0)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                  <List className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Party Order Qty</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(partiesTotalQty)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Hourglass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Unallocated DO</span>
                  <div className={`text-[13px] sm:text-[14px] xl:text-[15px] font-bold leading-tight whitespace-nowrap ${(currentDO?.tot || 0) - partiesTotalQty > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber((currentDO?.tot || 0) - partiesTotalQty)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Truck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Dispatched</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(partiesTotalDisp)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Scale className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Pending Balance</span>
                  <div className={`text-[13px] sm:text-[14px] xl:text-[15px] font-bold leading-tight whitespace-nowrap ${partiesTotalQty - partiesTotalDisp > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(partiesTotalQty - partiesTotalDisp)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <Hash className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Total Parties</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {currentDO?.parties?.length || 0}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 3: TRUCK WISE DISPATCH STATS */}
          {mainSectionTab === "truck-dispatch" && (
            <>
              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-red-50 text-[#e7000b] flex items-center justify-center shrink-0 border border-red-100">
                  <Truck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Trucks" : "Total Trucks"}
                  </span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {partyFilteredTrucks.length}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                  <Hourglass className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Running" : "Pending Trucks"}
                  </span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-amber-600 leading-tight whitespace-nowrap">
                    {partyFilteredPendingTrucks}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <Check className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Done" : "Done / History"}
                  </span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-emerald-600 leading-tight whitespace-nowrap">
                    {partyFilteredHistoryTrucks}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
                  <Scale className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">Tab Net Wt</span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(trucksTotalWeight)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                  <List className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Dispatched" : "DO Dispatched"}
                  </span>
                  <div className="text-[13px] sm:text-[14px] xl:text-[15px] font-bold text-slate-900 leading-tight whitespace-nowrap">
                    {formatNumber(partyFilteredDispatchedQty)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200/90 rounded-md p-2.5 sm:p-3 flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:shadow-xs transition-all min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                  <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-tight block truncate">
                    {selectedPartyObj ? "Party Balance" : "DO Rem. Bal"}
                  </span>
                  <div className={`text-[13px] sm:text-[14px] xl:text-[15px] font-bold leading-tight whitespace-nowrap ${partyFilteredRemainingBal > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatNumber(partyFilteredRemainingBal)} <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400">MT</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main 3 Section Tabs - Executive Segmented Pill Design */}
        <div className="w-full overflow-x-auto pb-1 scrollbar-none">
          <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-lg border border-slate-200/90 shadow-inner">
            <button
              onClick={() => setMainSectionTab("do-master")}
              className={`px-3.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "do-master"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white shadow-md shadow-red-500/20 ring-1 ring-red-400/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <span>DO Master</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                mainSectionTab === "do-master" ? "bg-white text-red-700 shadow-2xs" : "bg-slate-200 text-slate-700"
              }`}>
                {(store?.dos || []).length}
              </span>
            </button>

            <button
              onClick={() => setMainSectionTab("party-order")}
              className={`px-3.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "party-order"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white shadow-md shadow-red-500/20 ring-1 ring-red-400/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
              <span>DO Allotment</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight ${
                mainSectionTab === "party-order" ? "bg-white text-red-700 shadow-2xs" : "bg-slate-200 text-slate-700"
              }`}>
                {currentDO.parties?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setMainSectionTab("truck-dispatch")}
              className={`px-3.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                mainSectionTab === "truck-dispatch"
                  ? "bg-gradient-to-r from-[#dc2626] to-[#ef4444] text-white shadow-md shadow-red-500/20 ring-1 ring-red-400/30"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/80"
              }`}
            >
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
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/90 p-3 sm:p-3.5 rounded-md shadow-xs">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-xs font-extrabold text-slate-700 tracking-wide uppercase">Party Filter:</span>
              <div className="relative min-w-0">
                <select
                  value={selectedCompanyFilter}
                  onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                  className="px-3.5 py-1.5 pr-8 rounded border border-slate-300/80 bg-slate-50/70 hover:bg-white text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-400/40 focus:border-red-500 cursor-pointer appearance-none transition-all truncate max-w-[180px] sm:max-w-xs"
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
              <span className="font-extrabold text-slate-800 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded text-xs truncate max-w-[140px] sm:max-w-none shadow-2xs">
                {selectedCompanyFilter === "ALL" ? "All Parties" : selectedCompanyFilter}
              </span>
            </div>
          </div>

          {/* DO Master Table - Desktop View */}
          <div className="hidden md:block overflow-x-auto rounded-md border border-slate-200/90 bg-white shadow-xs">
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
            </div>
          </div>

          {/* Filter Bar Just Above Party Table - DO Party Name & Lifter Party Name Dropdown Filters */}
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200/90 p-2.5 sm:p-3 rounded-md shadow-2xs flex-wrap">
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

              {/* Receiver Party Name Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] sm:text-xs font-bold text-slate-700 whitespace-nowrap">Receiver Party:</span>
                <div className="relative">
                  <select
                    value={selectedPartyLifterFilter}
                    onChange={(e) => setSelectedPartyLifterFilter(e.target.value)}
                    className="px-2.5 sm:px-3 py-1.5 pr-7 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white text-[11px] sm:text-xs font-bold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-200 cursor-pointer appearance-none transition-colors max-w-[150px] sm:max-w-[200px] truncate"
                  >
                    <option value="">All Receiver Parties ({(currentDO?.parties || []).length})</option>
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
          <div className="hidden md:block overflow-x-auto rounded-md border border-slate-200/90 bg-white shadow-xs">
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/90 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                  <th className="py-3.5 px-4 w-12 text-center whitespace-nowrap">#</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">DO Party Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Receiver Party Name</th>
                  <th className="py-3.5 px-4 w-32 whitespace-nowrap">DO No.</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Mines</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Grade</th>
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
                        <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">{currentDO?.mines || "-"}</td>
                        <td className="py-3.5 px-4 text-slate-800 font-bold whitespace-nowrap">{currentDO?.grade || "-"}</td>
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
                    <td colSpan={14} className="py-10 text-center text-slate-400 font-medium">
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
                    <td className="py-3.5 px-4 whitespace-nowrap"></td>
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
                            {currentDO?.mines ? ` • Mines: ${currentDO.mines}` : ""}
                            {currentDO?.grade ? ` • Grade: ${currentDO.grade}` : ""}
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
              Truck wise Dispatch
            </h2>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Filter Group with its own spacing */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* DO Party Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">DO Party:</span>
                  <select
                    value={selectedTruckCompanyFilter}
                    onChange={(e) => {
                      const co = e.target.value;
                      setSelectedTruckCompanyFilter(co);
                      setSelectedTruckDONoFilter("ALL");
                      setSelectedTruckFilter("");
                      setSelectedTruckIds(new Set());
                      if (co !== "ALL") {
                        const matchDO = (store?.dos || []).find((d) => (d.co || "").trim() === co);
                        if (matchDO) {
                          setStore((prev) => ({ ...prev, act: matchDO.id }));
                        }
                      }
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All DO Parties</option>
                    {uniqueCompanies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DO Number Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">DO No:</span>
                  <select
                    value={selectedTruckDONoFilter}
                    onChange={(e) => {
                      const doVal = e.target.value;
                      setSelectedTruckDONoFilter(doVal);
                      setSelectedTruckFilter("");
                      setSelectedTruckIds(new Set());
                      if (doVal !== "ALL") {
                        const foundDO = (store?.dos || []).find((d) => String(d.id) === String(doVal) || String(d.no) === String(doVal));
                        if (foundDO) {
                          setStore((prev) => ({ ...prev, act: foundDO.id }));
                        }
                      }
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All DO Numbers</option>
                    {(() => {
                      const candidateDOs = selectedTruckCompanyFilter === "ALL"
                        ? (store?.dos || [])
                        : (store?.dos || []).filter((d) => (d.co || "").trim() === selectedTruckCompanyFilter);

                      return candidateDOs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {getDOName(d)} {d.mines ? `(${d.mines})` : ""}
                        </option>
                      ));
                    })()}
                  </select>
                </div>

                {/* Receiver Party Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Receiver Party:</span>
                  <select
                    value={selectedTruckFilter}
                    onChange={(e) => {
                      setSelectedTruckFilter(e.target.value);
                      setSelectedTruckIds(new Set());
                    }}
                    className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Receiver Parties</option>
                    {(() => {
                      let relevantDOs = selectedTruckCompanyFilter === "ALL"
                        ? (store?.dos || [])
                        : (store?.dos || []).filter((d) => (d.co || "").trim() === selectedTruckCompanyFilter);

                      if (selectedTruckDONoFilter !== "ALL") {
                        relevantDOs = relevantDOs.filter((d) => String(d.id) === String(selectedTruckDONoFilter) || String(d.no) === String(selectedTruckDONoFilter));
                      }

                      const lifterMap = new Map();
                      relevantDOs.forEach((d) => {
                        (d.parties || []).forEach((p) => {
                          const trimmedName = (p.name || "").trim();
                          if (trimmedName && !lifterMap.has(trimmedName)) {
                            lifterMap.set(trimmedName, p.id);
                          }
                        });
                      });

                      return Array.from(lifterMap.entries()).map(([name, pid]) => {
                        const partyTrucks = (store?.trucks || []).filter((t) => {
                          if (!t) return false;
                          const tDO = (store?.dos || []).find((d) => d.id === t.did);
                          const matchCo = selectedTruckCompanyFilter === "ALL" || (tDO?.co || "").trim() === selectedTruckCompanyFilter;
                          const matchDONo = selectedTruckDONoFilter === "ALL" || String(t.did) === String(selectedTruckDONoFilter) || String(tDO?.no) === String(selectedTruckDONoFilter);
                          const matchParty = String(t.pid) === String(pid) || (relevantDOs.flatMap(d => d.parties || []).find(p => p.id === t.pid)?.name === name);
                          return matchCo && matchDONo && matchParty;
                        });
                        const runningCount = partyTrucks.filter((t) => !t.done).length;
                        const doneCount = partyTrucks.filter((t) => !!t.done).length;

                        return (
                          <option key={name} value={pid}>
                            {name} (Run: {runningCount} | Done: {doneCount})
                          </option>
                        );
                      });
                    })()}
                  </select>
                </div>
              </div>

              {/* Subtle Vertical Divider between Filters and Action Buttons */}
              <div className="hidden sm:block h-6 w-px bg-slate-200 mx-0.5" />

              {/* Action Buttons Group with generous spacing */}
              <div className="flex items-center gap-2 flex-wrap">
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
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-[#ff3340] to-[#e7000b] hover:brightness-105 text-white transition-all shadow-xs active:scale-95 cursor-pointer ml-1"
                  >
                    <Plus className="w-4 h-4" /> Add Truck
                  </button>
                )}
              </div>
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
              const relevantDOs = selectedTruckCompanyFilter === "ALL"
                ? (store?.dos || [])
                : (store?.dos || []).filter((d) => (d.co || "").trim() === selectedTruckCompanyFilter);

              const partyObj = relevantDOs.flatMap(d => d.parties || []).find((p) => String(p.id) === String(selectedTruckFilter));
              const partyName = partyObj ? partyObj.name : "Lifter";

              const partyTrucks = (store?.trucks || []).filter((t) => {
                if (!t) return false;
                const tDO = (store?.dos || []).find((d) => d.id === t.did);
                const matchCo = selectedTruckCompanyFilter === "ALL" || (tDO?.co || "").trim() === selectedTruckCompanyFilter;
                const matchParty = String(t.pid) === String(selectedTruckFilter) || (tDO?.parties || []).find(p => p.id === t.pid)?.name === partyName;
                return matchCo && matchParty;
              });

              const runningCount = partyTrucks.filter((t) => !t.done).length;
              const doneCount = partyTrucks.filter((t) => !!t.done).length;

              return (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <span className="font-bold text-slate-800">{partyName}:</span>
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
          <div className="hidden md:block overflow-x-auto rounded-md border border-slate-200/90 bg-white shadow-xs">
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
                  <th className="py-3.5 px-4 whitespace-nowrap">Transporter / Lifter Name</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">TP No.</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Route (From - To)</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">Freight (₹)</th>
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
                        <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">
                          {t.fromLoc || t.toLoc ? (
                            <span>{t.fromLoc || "-"} <span className="text-red-500 font-bold">→</span> {t.toLoc || "-"}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-slate-800 whitespace-nowrap">
                          {t.freight ? `₹${formatNumber(t.freight)}` : "-"}
                        </td>
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
                    <td colSpan={15} className="py-10 text-center text-slate-400 font-medium">
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
                    <td colSpan={11} className="py-3.5 px-4 whitespace-nowrap">
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
                        <span className="text-[10px] text-slate-400 font-medium block">TRANSPORTER / LIFTER</span>
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
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">ROUTE (FROM → TO)</span>
                        <span className="text-slate-800 font-semibold text-[11px] truncate block">
                          {t.fromLoc || t.toLoc ? `${t.fromLoc || "-"} → ${t.toLoc || "-"}` : "-"}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-medium block">FREIGHT</span>
                        <span className="text-emerald-700 font-bold text-[11px] truncate block">
                          {t.freight ? `₹${formatNumber(t.freight)}/MT` : "-"}
                        </span>
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
          <div className={`bg-white rounded-2xl w-full ${
            modalConfig.type === "confirm"
              ? "max-w-md"
              : modalConfig.type === "truckForm" || modalConfig.type === "doForm" || modalConfig.type === "partyForm"
              ? "max-w-4xl"
              : "max-w-2xl"
          } max-h-[92vh] shadow-2xl border border-slate-200/80 flex flex-col transition-all animate-scaleUp overflow-hidden`}>
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#700007] via-[#b91c1c] to-[#dc2626] text-white flex items-center justify-between shrink-0 shadow-sm border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-widest text-red-150 text-white/80">Dispatch Module</div>
                  <h3 className="font-extrabold text-base tracking-tight leading-snug">{modalConfig.title}</h3>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/90 hover:text-white transition-all cursor-pointer active:scale-95 border border-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs bg-slate-50/50 min-h-[300px] pb-32">
              {/* DO Form */}
              {modalConfig.type === "doForm" && (
                <div className="space-y-4">
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-red-600"></div>
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">DO Identification & Mines</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* DO Party Name Searchable Combobox */}
                      <div className="relative">
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                          <span>DO Party Name</span>
                          <span className="text-red-500 font-bold">*</span>
                        </label>
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
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-900 transition-all shadow-xs"
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
                                        setFormData((prev) => ({
                                          ...prev,
                                          co: c
                                        }));
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
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                          <span>DO No.</span>
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.no || ""}
                          onChange={(e) => setFormData({ ...formData, no: e.target.value })}
                          placeholder="e.g. DO-12345"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
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
                            className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs"
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

                      {/* Grade Field */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Grade</label>
                        <input
                          type="text"
                          value={formData.grade || ""}
                          onChange={(e) => setFormData({ ...formData, grade: e.target.value.toUpperCase() })}
                          placeholder="e.g. G-11, G-12, ROM"
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Quantity & Validity Window</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                          <span>DO Qty (MT)</span>
                          <span className="text-red-500 font-bold">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={formData.tot || ""}
                            onChange={(e) => setFormData({ ...formData, tot: e.target.value })}
                            placeholder="0.00"
                            className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">MT</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Valid From</label>
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">Auto +45 Days</span>
                        </div>
                        <input
                          type="date"
                          value={formData.vf || ""}
                          onChange={(e) => {
                            const newFrom = e.target.value;
                            if (newFrom) {
                              const d = new Date(newFrom);
                              d.setDate(d.getDate() + 45);
                              const autoTo = d.toISOString().split("T")[0];
                              setFormData({ ...formData, vf: newFrom, vt: autoTo });
                            } else {
                              setFormData({ ...formData, vf: newFrom });
                            }
                          }}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Valid To</label>
                        <input
                          type="date"
                          value={formData.vt || ""}
                          onChange={(e) => setFormData({ ...formData, vt: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs cursor-pointer"
                        />
                      </div>

                      {/* Dynamic Expiry Status Badge */}
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Expiry Status</label>
                        {(() => {
                          const expiry = getExpiryDetails(formData.vt, formData.vf);
                          return (
                            <div className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center justify-between shadow-xs ${expiry.badgeClass}`}>
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {expiry.text}
                              </span>
                              <span className="text-[10px] uppercase font-extrabold opacity-75 tracking-wider">
                                {formData.vt ? "Live" : "No Date"}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Lifter Party Allotment Multi-Row Entry */}
                  {(() => {
                    const doQtyTotal = parseFloat(formData.tot) || 0;
                    const totalAllottedQty = (formData.lifterRows || []).reduce((sum, r) => sum + (parseFloat(r.partyQty) || 0), 0);
                    const remainingBalance = Math.max(0, doQtyTotal - totalAllottedQty);

                    return (
                      <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                        {/* Live Stat Cards: Order Qty & Balance Qty */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="p-3.5 rounded-xl border border-blue-200/90 bg-gradient-to-br from-blue-50/90 to-blue-50/40 flex items-center justify-between shadow-2xs">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Allotted Order Qty</div>
                              <div className="text-base font-extrabold text-blue-950 mt-0.5">
                                {formatNumber(totalAllottedQty)} <span className="text-xs font-semibold text-blue-800">MT</span>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
                              <Check className="w-4 h-4 text-blue-700" />
                            </div>
                          </div>

                          <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-2xs ${
                            totalAllottedQty > doQtyTotal && doQtyTotal > 0
                              ? "border-red-200 bg-red-50/80 text-red-900"
                              : "border-amber-200/90 bg-gradient-to-br from-amber-50/90 to-amber-50/40 text-amber-950"
                          }`}>
                            <div>
                              <div className={`text-[10px] font-bold uppercase tracking-wider ${
                                totalAllottedQty > doQtyTotal && doQtyTotal > 0 ? "text-red-700" : "text-amber-700"
                              }`}>
                                Unallocated Balance Qty
                              </div>
                              <div className="text-base font-extrabold mt-0.5">
                                {formatNumber(remainingBalance)} <span className="text-xs font-semibold">MT</span>
                              </div>
                            </div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs border ${
                              totalAllottedQty > doQtyTotal && doQtyTotal > 0
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}>
                              <Clock className="w-4 h-4" />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                              Receiver Party Allotment Details ({(formData.lifterRows || []).length} { (formData.lifterRows || []).length === 1 ? 'Party' : 'Parties' })
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newRows = [
                                ...(formData.lifterRows || []),
                                { id: Date.now(), partyName: "", partyQty: "" }
                              ];
                              setFormData({ ...formData, lifterRows: newRows });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-xs font-bold transition-all shadow-xs border border-red-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Row</span>
                          </button>
                        </div>
                        <div className="space-y-3 pr-1">
                        {(formData.lifterRows || []).map((row, idx) => (
                          <div key={row.id || idx} className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl relative hover:border-slate-300 transition-all">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md uppercase">
                                #{idx + 1} Receiver Party
                              </span>
                              {(formData.lifterRows || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (formData.lifterRows || []).filter((_, i) => i !== idx);
                                    setFormData({ ...formData, lifterRows: updated });
                                  }}
                                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors"
                                  title="Remove this row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {/* Receiver Party Name */}
                              <div className="relative">
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                  Receiver Party Name
                                </label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={row.partyName || ""}
                                    onChange={(e) => {
                                      const updated = [...(formData.lifterRows || [])];
                                      updated[idx] = { ...updated[idx], partyName: e.target.value };
                                      setFormData({ ...formData, lifterRows: updated });
                                    }}
                                    placeholder="Type or select Receiver Party..."
                                    className="w-full px-3 py-2 pr-7 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-semibold text-slate-800 shadow-xs"
                                  />
                                  {uniquePartyNames.length > 0 && (
                                    <button
                                      type="button"
                                      tabIndex={-1}
                                      onClick={() => {
                                        const updated = [...(formData.lifterRows || [])];
                                        updated[idx] = { ...updated[idx], isDropdownOpen: !updated[idx].isDropdownOpen };
                                        setFormData({ ...formData, lifterRows: updated });
                                      }}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                    >
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                {row.isDropdownOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-20"
                                      onClick={() => {
                                        const updated = [...(formData.lifterRows || [])];
                                        updated[idx] = { ...updated[idx], isDropdownOpen: false };
                                        setFormData({ ...formData, lifterRows: updated });
                                      }}
                                    />
                                    <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-50 py-1">
                                      {uniquePartyNames
                                        .filter((pn) => !row.partyName || pn.toLowerCase().includes((row.partyName || "").toLowerCase()))
                                        .map((pn) => (
                                          <div
                                            key={pn}
                                            onClick={() => {
                                              const updated = [...(formData.lifterRows || [])];
                                              updated[idx] = { ...updated[idx], partyName: pn, isDropdownOpen: false };
                                              setFormData({ ...formData, lifterRows: updated });
                                            }}
                                            className="px-3 py-1.5 text-xs text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between"
                                          >
                                            <span>{pn}</span>
                                            {row.partyName === pn && <Check className="w-3 h-3 text-red-600" />}
                                          </div>
                                        ))}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Order Qty */}
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                  Order Qty (MT)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={row.partyQty || ""}
                                    onChange={(e) => {
                                      const updated = [...(formData.lifterRows || [])];
                                      updated[idx] = { ...updated[idx], partyQty: e.target.value };
                                      setFormData({ ...formData, lifterRows: updated });
                                    }}
                                    placeholder="0.00"
                                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-bold text-slate-900 shadow-xs"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">MT</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            const newRows = [
                              ...(formData.lifterRows || []),
                              { id: Date.now(), partyName: "", partyQty: "" }
                            ];
                            setFormData({ ...formData, lifterRows: newRows });
                          }}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Another Receiver Party</span>
                        </button>

                        <div className="flex items-center gap-3 font-semibold text-slate-700">
                          <span>Total Allotted:</span>
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {formatNumber((formData.lifterRows || []).reduce((sum, r) => sum + (parseFloat(r.partyQty) || 0), 0))} MT
                          </span>
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              )}

              {/* View DO */}
              {modalConfig.type === "viewDO" && modalConfig.data && (() => {
                const d = modalConfig.data;
                const allotted = getDOAllotted(d);
                const unalloc = Math.max(0, (d.tot || 0) - allotted);
                const disp = getDODispatched(d);
                const bal = Math.max(0, (d.tot || 0) - disp);
                const expiry = getExpiryDetails(d.vt, d.vf);
                const truckCount = (store.trucks || []).filter((t) => t.did === d.id).length;
                const progressPct = d.tot > 0 ? Math.min(100, (disp / d.tot) * 100) : 0;

                return (
                  <div className="space-y-4">
                    {/* Header Highlight Card - Clean Light Theme */}
                    <div className="bg-gradient-to-br from-slate-50 via-red-50/20 to-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-[#e7000b]">DO Overview</div>
                          <h4 className="text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">{getDOName(d)}</h4>
                          <p className="text-xs text-slate-600 font-semibold mt-0.5">{d.co || "-"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${expiry.badgeClass}`}>
                            {expiry.text}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${currentDO.id === d.id ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                            {currentDO.id === d.id ? "Active Selected DO" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      {/* Mini Progress */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center text-[11px] mb-1.5 font-bold">
                          <span className="text-slate-600">Dispatch Progress</span>
                          <span className="text-emerald-700 font-extrabold">{Math.round(progressPct)}% Completed</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metric Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total DO Qty</span>
                        <div className="text-base font-extrabold text-slate-900 mt-0.5">{formatNumber(d.tot)} <span className="text-[10px] text-slate-500">MT</span></div>
                      </div>
                      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Allotted</span>
                        <div className="text-base font-extrabold text-blue-900 mt-0.5">{formatNumber(allotted)} <span className="text-[10px] text-blue-700">MT</span></div>
                      </div>
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Dispatched</span>
                        <div className="text-base font-extrabold text-emerald-900 mt-0.5">{formatNumber(disp)} <span className="text-[10px] text-emerald-700">MT</span></div>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Balance</span>
                        <div className="text-base font-extrabold text-amber-900 mt-0.5">{formatNumber(bal)} <span className="text-[10px] text-amber-700">MT</span></div>
                      </div>
                    </div>

                    {/* Detailed Specifications Grid */}
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-red-600" /> Key Attributes
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">DO Reference</span>
                      </div>
                      <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Mines</span>
                          <span className="font-bold text-slate-800">{d.mines || "-"}</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Grade</span>
                          <span className="font-bold text-slate-800">{d.grade || "-"}</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Unallocated</span>
                          <span className="font-bold text-amber-600">{formatNumber(unalloc)} MT</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Valid From</span>
                          <span className="font-semibold text-slate-700">{formatDate(d.vf)}</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Valid To</span>
                          <span className="font-semibold text-slate-700">{formatDate(d.vt)}</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Parties / Trucks</span>
                          <span className="font-bold text-slate-800">{d.parties?.length || 0} Parties • {truckCount} Trucks</span>
                        </div>
                      </div>
                    </div>

                    {/* Allotted Receiver Parties Summary List */}
                    {d.parties && d.parties.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <List className="w-3.5 h-3.5 text-blue-600" /> Receiver Party Allotments ({d.parties.length})
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                          {d.parties.map((p, pIdx) => {
                            const pDisp = getPartyDispatched(p.id);
                            const pBal = Math.max(0, p.qty - pDisp);
                            return (
                              <div key={p.id || pIdx} className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                                    {pIdx + 1}
                                  </span>
                                  <span className="font-bold text-slate-800 text-xs">{p.name}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-slate-500 font-medium">Order: <b className="text-slate-800">{formatNumber(p.qty)} MT</b></span>
                                  <span className="text-emerald-600 font-semibold">Disp: {formatNumber(pDisp)} MT</span>
                                  <span className="text-amber-600 font-bold">Bal: {formatNumber(pBal)} MT</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Party Form */}
              {modalConfig.type === "partyForm" && (() => {
                const selectedDO = (store?.dos || []).find((d) => d.id === (formData.doId || currentDO.id)) || currentDO;
                const companyDOs = (store?.dos || []).filter((d) => (d.co || "").trim() === (selectedDO?.co || "").trim());
                const allotted = getDOAllotted(selectedDO);
                const available = (selectedDO?.tot || 0) - allotted + (modalConfig.data?.id ? (selectedDO?.parties?.find(p => p.id === modalConfig.data.id)?.qty || 0) : 0);
                const balance = (selectedDO?.tot || 0) - getDODispatched(selectedDO);

                return (
                  <div className="space-y-4">
                    {/* DO Source Selection */}
                    <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">DO Reference & Company</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">DO Party Name</label>
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
                              className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer appearance-none shadow-xs"
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
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">DO Number</label>
                          <div className="relative">
                            <select
                              value={selectedDO?.id || ""}
                              onChange={(e) => {
                                setFormData({ ...formData, doId: parseInt(e.target.value) });
                              }}
                              className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer appearance-none shadow-xs"
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
                    </div>

                    {/* Stock Overview Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Available DO Qty</div>
                          <div className="text-base font-extrabold text-emerald-900 mt-0.5">{formatNumber(available)} <span className="text-xs font-semibold">MT</span></div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                          <Check className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 flex items-center justify-between shadow-2xs">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">DO Balance Qty</div>
                          <div className="text-base font-extrabold text-amber-900 mt-0.5">{formatNumber(balance)} <span className="text-xs font-semibold">MT</span></div>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                          <Clock className="w-4 h-4" />
                        </div>
                      </div>
                    </div>

                    {/* Receiver Party Details */}
                    <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Allotment Details</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Receiver Party Name Searchable Combobox */}
                        <div className="relative">
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                            <span>Receiver Party Name</span>
                            <span className="text-red-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={formData.partyName || ""}
                              onChange={(e) => {
                                setFormData({ ...formData, partyName: e.target.value });
                                setIsLifterDropdownOpen(true);
                              }}
                              onFocus={() => setIsLifterDropdownOpen(true)}
                              placeholder="Type or select Receiver Party..."
                              className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
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
                              <div className="fixed inset-0 z-40" onClick={() => setIsLifterDropdownOpen(false)} />
                              <div className="absolute left-0 right-0 bottom-full mb-1.5 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-50 py-1">
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
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                            <span>Order Qty (MT)</span>
                            <span className="text-red-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={formData.qty || ""}
                              onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                              placeholder="0.00"
                              className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">MT</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* View Party */}
              {modalConfig.type === "viewParty" && modalConfig.data && (() => {
                const p = modalConfig.data;
                const disp = getPartyDispatched(p.id);
                const bal = Math.max(0, (p.qty || 0) - disp);
                const truckCount = (store.trucks || []).filter((t) => t.pid === p.id).length;
                const pct = p.qty > 0 ? Math.min(100, (disp / p.qty) * 100) : 0;
                const expiry = getExpiryDetails(currentDO?.vt, currentDO?.vf);

                return (
                  <div className="space-y-4">
                    {/* Header Highlight Card - Clean Light Theme */}
                    <div className="bg-gradient-to-br from-slate-50 via-teal-50/20 to-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-teal-700">Receiver Party Profile</div>
                          <h4 className="text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">{p.name}</h4>
                          <p className="text-xs text-slate-600 font-semibold mt-0.5">
                            {currentDO.co ? `${currentDO.co} • ` : ""}DO No: {getDOName(currentDO)}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${expiry.badgeClass}`}>
                            {expiry.text}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {truckCount} Trucks Dispatched
                          </span>
                        </div>
                      </div>

                      {/* Mini Progress */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center text-[11px] mb-1.5 font-bold">
                          <span className="text-slate-600">Allotment Fulfilled</span>
                          <span className="text-teal-700 font-extrabold">{Math.round(pct)}% Completed</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Order Qty</span>
                        <div className="text-base font-extrabold text-blue-900 mt-0.5">{formatNumber(p.qty)} <span className="text-[10px] text-blue-700">MT</span></div>
                      </div>
                      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Dispatched</span>
                        <div className="text-base font-extrabold text-emerald-900 mt-0.5">{formatNumber(disp)} <span className="text-[10px] text-emerald-700">MT</span></div>
                      </div>
                      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 shadow-2xs">
                        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Pending Bal</span>
                        <div className="text-base font-extrabold text-amber-900 mt-0.5">{formatNumber(bal)} <span className="text-[10px] text-amber-700">MT</span></div>
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-red-600" /> Allotment Parameters
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">DO Reference</span>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">DO Party Name</span>
                          <span className="font-bold text-slate-800">{currentDO?.co || "-"}</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">DO Number</span>
                          <span className="font-bold text-slate-800">{getDOName(currentDO)}</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Mines</span>
                          <span className="font-bold text-slate-800">{currentDO?.mines || "-"}</span>
                        </div>
                        <div className="p-2 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Grade</span>
                          <span className="font-bold text-slate-800">{currentDO?.grade || "-"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Truck Form */}
              {modalConfig.type === "truckForm" && (() => {
                const currentPid = formData.pid !== undefined && formData.pid !== null && formData.pid !== ""
                  ? String(formData.pid)
                  : String(currentDO.parties?.[0]?.id || "");

                // Find party in currentDO or across all DOs
                const allPartiesList = (store?.dos || []).flatMap((d) =>
                  (d.parties || []).map((p) => ({
                    ...p,
                    doCo: d.co,
                    doNo: d.no,
                    doId: d.id,
                    doMines: d.mines,
                    doGrade: d.grade,
                    doTot: d.tot
                  }))
                );

                const availableParties = (currentDO.parties && currentDO.parties.length)
                  ? currentDO.parties.map((p) => ({
                      ...p,
                      doCo: currentDO.co,
                      doNo: currentDO.no,
                      doId: currentDO.id,
                      doMines: currentDO.mines,
                      doGrade: currentDO.grade,
                      doTot: currentDO.tot
                    }))
                  : allPartiesList;

                const selectedParty = availableParties.find((p) => String(p.id) === currentPid) || availableParties[0];
                const orderQty = selectedParty ? (parseFloat(selectedParty.qty) || 0) : 0;
                const baseDispatched = selectedParty ? getPartyDispatched(selectedParty.id) : 0;
                
                // Existing truck qty in edit mode
                const existingTruck = modalConfig.data?.id ? store.trucks.find((t) => t.id === modalConfig.data.id) : null;
                const existingTruckQty = (existingTruck && String(existingTruck.pid) === String(selectedParty?.id)) ? (parseFloat(existingTruck.qty) || 0) : 0;

                // Currently typed / entered net weight in the form
                const currentEnteredNetWt = modalConfig.data?.id
                  ? (parseFloat(formData.qty) || 0)
                  : (formData.rows || []).reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0);

                // Live dynamic balance: initial balance minus newly entered net wt
                const initialPartyBal = Math.max(0, orderQty - baseDispatched + existingTruckQty);
                const liveRemainingBal = initialPartyBal - currentEnteredNetWt;

                // Corresponding DO details
                const associatedDO = (store?.dos || []).find((d) => d.id === selectedParty?.doId) || currentDO;

                return (
                  <div className="space-y-4">
                    {/* DO Information Banner - Premium Modern Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-white via-slate-50/70 to-red-50/30 border border-slate-200/90 shadow-sm relative overflow-hidden">
                      {/* Decorative Subtle Accent Bar */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-red-600 to-rose-700" />
                      
                      <div className="flex flex-wrap items-center justify-between gap-4 pl-1">
                        {/* Company & DO Info */}
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-white flex items-center justify-center font-extrabold text-xs shadow-md shadow-red-500/20 ring-4 ring-red-50 shrink-0">
                            DO
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">DO Party / Company</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100/70 text-red-700 border border-red-200/60">
                                Active Order
                              </span>
                            </div>
                            <h4 className="text-base font-black text-slate-900 tracking-tight mt-0.5">
                              {associatedDO?.co || "N/A"}
                            </h4>
                          </div>
                        </div>

                        {/* Attribute Badges */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* DO Number Badge */}
                          <div className="bg-white/90 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                            <span className="text-slate-400 block text-[9px] uppercase font-extrabold tracking-wider">DO No.</span>
                            <span className="font-extrabold text-slate-800 text-xs tracking-tight">{getDOName(associatedDO)}</span>
                          </div>

                          {/* Mines Badge */}
                          {associatedDO?.mines && (
                            <div className="bg-white/90 px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                              <span className="text-slate-400 block text-[9px] uppercase font-extrabold tracking-wider">Mines / Colliery</span>
                              <span className="font-extrabold text-slate-700 text-xs capitalize">{associatedDO.mines}</span>
                            </div>
                          )}

                          {/* Total DO Qty Badge */}
                          {associatedDO?.tot && (
                            <div className="bg-gradient-to-br from-red-50 to-rose-50/60 px-3.5 py-2 rounded-xl border border-red-200/80 shadow-2xs">
                              <span className="text-red-700/80 block text-[9px] uppercase font-extrabold tracking-wider">Total DO Qty</span>
                              <span className="font-black text-red-700 text-xs tracking-tight">{formatNumber(associatedDO.tot)} <span className="text-[10px] font-bold">MT</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Party & Balance Section */}
                    <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <div className="w-2 h-2 rounded-full bg-red-600"></div>
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Receiver Party & Balance Details</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                            <span>Select Receiver Party</span>
                            <span className="text-red-500 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <select
                              value={selectedParty?.id || ""}
                              onChange={(e) => setFormData({ ...formData, pid: e.target.value })}
                              className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer appearance-none shadow-xs"
                            >
                              {availableParties.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} {p.doCo ? `(${p.doCo})` : ''}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Party Order Qty</label>
                          <div className="px-3.5 py-2.5 border border-blue-200/90 rounded-lg bg-blue-50/80 text-blue-900 text-xs font-bold flex items-center justify-between">
                            <span>{formatNumber(orderQty)} MT</span>
                            <span className="text-[10px] font-semibold text-blue-700 uppercase">Allotted</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Party Balance Qty</label>
                          <div className={`px-3.5 py-2.5 border rounded-lg text-xs font-bold flex items-center justify-between transition-all ${
                            liveRemainingBal < 0
                              ? "border-red-200 bg-red-50/90 text-red-700"
                              : "border-amber-200/90 bg-amber-50/80 text-amber-900"
                          }`}>
                            <span>{formatNumber(liveRemainingBal)} MT</span>
                            <span className={`text-[10px] font-semibold uppercase ${
                              liveRemainingBal < 0 ? "text-red-600" : "text-amber-700"
                            }`}>
                              {liveRemainingBal < 0 ? "Exceeded" : "Remaining"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Truck Details */}
                    {modalConfig.data?.id ? (
                      /* Edit Mode: Single Truck */
                      <>
                        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Vehicle & Driver Details</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Truck No Searchable Combobox */}
                            <div className="relative">
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                                <span>Truck No.</span>
                                <span className="text-red-500 font-bold">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formData.truckNo || ""}
                                  onChange={(e) => {
                                    setFormData({ ...formData, truckNo: e.target.value.toUpperCase() });
                                    setIsTruckNoDropdownOpen(true);
                                  }}
                                  onFocus={() => setIsTruckNoDropdownOpen(true)}
                                  placeholder="e.g. CG04AB1234"
                                  className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 transition-all shadow-xs uppercase"
                                />
                                <button
                                  type="button"
                                  onClick={() => setIsTruckNoDropdownOpen((prev) => !prev)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

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

                            {/* Transporter / Lifter Name */}
                            <div className="relative">
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Transporter Name / Lifter Name</label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formData.driver || ""}
                                  onChange={(e) => {
                                    setFormData({ ...formData, driver: e.target.value });
                                    setIsDriverDropdownOpen(true);
                                  }}
                                  onFocus={() => setIsDriverDropdownOpen(true)}
                                  placeholder="Transporter / Lifter name..."
                                  className="w-full px-3.5 py-2.5 pr-8 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-800 transition-all shadow-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => setIsDriverDropdownOpen((prev) => !prev)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </div>

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
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">TP No.</label>
                              <input
                                type="text"
                                value={formData.tp || ""}
                                onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                                placeholder="e.g. TP-98210"
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-medium text-slate-800 transition-all shadow-xs"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Weight & Date */}
                        <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Route, Freight & Weight</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Route From</label>
                              <input
                                type="text"
                                value={formData.fromLoc || ""}
                                onChange={(e) => setFormData({ ...formData, fromLoc: e.target.value })}
                                placeholder="e.g. Gevra Mines"
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-800 shadow-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Route To</label>
                              <input
                                type="text"
                                value={formData.toLoc || ""}
                                onChange={(e) => setFormData({ ...formData, toLoc: e.target.value })}
                                placeholder="e.g. Raipur Plant"
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-800 shadow-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Freight (₹/MT)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={formData.freight || ""}
                                onChange={(e) => setFormData({ ...formData, freight: e.target.value })}
                                placeholder="e.g. 850.00"
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 shadow-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 border-t border-slate-100 items-end">
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Dispatch Date</label>
                              <input
                                type="date"
                                value={formData.date || ""}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-semibold text-slate-800 cursor-pointer shadow-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1.5">
                                <span>Net Wt (MT)</span>
                                <span className="text-red-500 font-bold">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={formData.qty || ""}
                                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                                  placeholder="0.00"
                                  className="w-full pl-3.5 pr-10 py-2.5 border border-slate-200 rounded-lg bg-white hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-xs font-bold text-slate-900 shadow-xs"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">MT</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                                Freight Amount
                              </label>
                              <div className="w-full px-3.5 py-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs font-extrabold text-emerald-900 shadow-xs">
                                <span className="text-[10px] font-bold text-emerald-700">₹</span>
                                <span>
                                  {formatNumber((parseFloat(formData.freight) || 0) * (parseFloat(formData.qty) || 0))}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Multi-Row Entry for Add Trucks */
                      <div className="bg-white p-4.5 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                              Vehicle & Driver Details ({(formData.rows || []).length} { (formData.rows || []).length === 1 ? 'Truck' : 'Trucks' })
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newRows = [
                                ...(formData.rows || []),
                                {
                                  id: Date.now(),
                                  truckNo: '',
                                  driver: '',
                                  tp: '',
                                  fromLoc: '',
                                  toLoc: '',
                                  freight: '',
                                  date: formData.date || new Date().toISOString().split('T')[0],
                                  qty: ''
                                }
                              ];
                              setFormData({ ...formData, rows: newRows });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-xs font-bold transition-all shadow-xs border border-red-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Row</span>
                          </button>
                        </div>

                        <div className="space-y-3 pr-1">
                          {(formData.rows || []).map((row, idx) => (
                            <div key={row.id || idx} className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl relative group hover:border-slate-300 transition-all">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded-md uppercase">
                                  #{idx + 1} Truck Entry
                                </span>
                                {(formData.rows || []).length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (formData.rows || []).filter((_, i) => i !== idx);
                                      setFormData({ ...formData, rows: updated });
                                    }}
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors"
                                    title="Remove this row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                                <div className="space-y-2.5">
                                  {/* Row 1: Vehicle & Driver details */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 items-end">
                                    {/* Truck No */}
                                    <div className="relative flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-6 flex items-end">
                                        <span>Truck No. <span className="text-red-500">*</span></span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={row.truckNo || ''}
                                          onChange={(e) => {
                                            const val = e.target.value.toUpperCase();
                                            const updated = [...(formData.rows || [])];
                                            updated[idx] = { ...updated[idx], truckNo: val };
                                            setFormData({ ...formData, rows: updated });
                                          }}
                                          placeholder="e.g. CG04AB1234"
                                          className="w-full h-9 px-3 py-2 pr-7 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-bold text-slate-900 uppercase shadow-xs"
                                        />
                                        {uniqueTruckNumbers.length > 0 && (
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isTruckDropdown: !updated[idx].isTruckDropdown };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      {row.isTruckDropdown && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isTruckDropdown: false };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                          />
                                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-50 py-1">
                                            {uniqueTruckNumbers
                                              .filter((tn) => !row.truckNo || tn.toLowerCase().includes((row.truckNo || "").toLowerCase()))
                                              .map((tn) => (
                                                <div
                                                  key={tn}
                                                  onClick={() => {
                                                    const updated = [...(formData.rows || [])];
                                                    updated[idx] = { ...updated[idx], truckNo: tn, isTruckDropdown: false };
                                                    setFormData({ ...formData, rows: updated });
                                                  }}
                                                  className="px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between"
                                                >
                                                  <span>{tn}</span>
                                                  {row.truckNo === tn && <Check className="w-3 h-3 text-red-600" />}
                                                </div>
                                              ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Transporter / Lifter Name */}
                                    <div className="relative flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-6 flex items-end leading-tight">
                                        <span>Transporter Name / Lifter Name</span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={row.driver || ''}
                                          onChange={(e) => {
                                            const updated = [...(formData.rows || [])];
                                            updated[idx] = { ...updated[idx], driver: e.target.value };
                                            setFormData({ ...formData, rows: updated });
                                          }}
                                          placeholder="Transporter / Lifter..."
                                          className="w-full h-9 px-3 py-2 pr-7 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-medium text-slate-800 shadow-xs"
                                        />
                                        {uniqueDriverNames.length > 0 && (
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isDriverDropdown: !updated[idx].isDriverDropdown };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      {row.isDriverDropdown && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isDriverDropdown: false };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                          />
                                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-50 py-1">
                                            {uniqueDriverNames
                                              .filter((dn) => !row.driver || dn.toLowerCase().includes((row.driver || "").toLowerCase()))
                                              .map((dn) => (
                                                <div
                                                  key={dn}
                                                  onClick={() => {
                                                    const updated = [...(formData.rows || [])];
                                                    updated[idx] = { ...updated[idx], driver: dn, isDriverDropdown: false };
                                                    setFormData({ ...formData, rows: updated });
                                                  }}
                                                  className="px-3 py-1.5 text-xs text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between"
                                                >
                                                  <span>{dn}</span>
                                                  {row.driver === dn && <Check className="w-3 h-3 text-red-600" />}
                                                </div>
                                              ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* TP No */}
                                    <div className="relative flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-6 flex items-end">
                                        <span>TP No.</span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={row.tp || ''}
                                          onChange={(e) => {
                                            const updated = [...(formData.rows || [])];
                                            updated[idx] = { ...updated[idx], tp: e.target.value };
                                            setFormData({ ...formData, rows: updated });
                                          }}
                                          placeholder="e.g. TP-98210"
                                          className="w-full h-9 px-3 py-2 pr-7 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-medium text-slate-800 shadow-xs"
                                        />
                                        {uniqueTpNumbers.length > 0 && (
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isTpDropdown: !updated[idx].isTpDropdown };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      {row.isTpDropdown && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isTpDropdown: false };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                          />
                                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-50 py-1">
                                            {uniqueTpNumbers
                                              .filter((tpn) => !row.tp || tpn.toLowerCase().includes((row.tp || "").toLowerCase()))
                                              .map((tpn) => (
                                                <div
                                                  key={tpn}
                                                  onClick={() => {
                                                    const updated = [...(formData.rows || [])];
                                                    updated[idx] = { ...updated[idx], tp: tpn, isTpDropdown: false };
                                                    setFormData({ ...formData, rows: updated });
                                                  }}
                                                  className="px-3 py-1.5 text-xs text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between"
                                                >
                                                  <span>{tpn}</span>
                                                  {row.tp === tpn && <Check className="w-3 h-3 text-red-600" />}
                                                </div>
                                              ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Date */}
                                    <div className="flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-6 flex items-end">
                                        <span>Date</span>
                                      </label>
                                      <input
                                        type="date"
                                        value={row.date || ''}
                                        onChange={(e) => {
                                          const updated = [...(formData.rows || [])];
                                          updated[idx] = { ...updated[idx], date: e.target.value };
                                          setFormData({ ...formData, rows: updated });
                                        }}
                                        className="w-full h-9 px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-semibold text-slate-800 shadow-xs cursor-pointer"
                                      />
                                    </div>
                                  </div>

                                  {/* Row 2: Route, Freight, Net Weight & Dynamic Freight Amount */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 pt-2.5 border-t border-slate-100 items-end">
                                    {/* Route From */}
                                    <div className="relative flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-5 flex items-end">
                                        <span>Route From</span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={row.fromLoc || ''}
                                          onChange={(e) => {
                                            const updated = [...(formData.rows || [])];
                                            updated[idx] = { ...updated[idx], fromLoc: e.target.value };
                                            setFormData({ ...formData, rows: updated });
                                          }}
                                          placeholder="From location..."
                                          className="w-full h-9 px-3 py-2 pr-7 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-semibold text-slate-800 shadow-xs"
                                        />
                                        {uniqueFromLocations.length > 0 && (
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isFromDropdown: !updated[idx].isFromDropdown };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      {row.isFromDropdown && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isFromDropdown: false };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                          />
                                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-50 py-1">
                                            {uniqueFromLocations
                                              .filter((fl) => !row.fromLoc || fl.toLowerCase().includes((row.fromLoc || "").toLowerCase()))
                                              .map((fl) => (
                                                <div
                                                  key={fl}
                                                  onClick={() => {
                                                    const updated = [...(formData.rows || [])];
                                                    updated[idx] = { ...updated[idx], fromLoc: fl, isFromDropdown: false };
                                                    setFormData({ ...formData, rows: updated });
                                                  }}
                                                  className="px-3 py-1.5 text-xs text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between"
                                                >
                                                  <span>{fl}</span>
                                                  {row.fromLoc === fl && <Check className="w-3 h-3 text-red-600" />}
                                                </div>
                                              ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Route To */}
                                    <div className="relative flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-5 flex items-end">
                                        <span>Route To</span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="text"
                                          value={row.toLoc || ''}
                                          onChange={(e) => {
                                            const updated = [...(formData.rows || [])];
                                            updated[idx] = { ...updated[idx], toLoc: e.target.value };
                                            setFormData({ ...formData, rows: updated });
                                          }}
                                          placeholder="To destination..."
                                          className="w-full h-9 px-3 py-2 pr-7 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-semibold text-slate-800 shadow-xs"
                                        />
                                        {uniqueToLocations.length > 0 && (
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isToDropdown: !updated[idx].isToDropdown };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      {row.isToDropdown && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isToDropdown: false };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                          />
                                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-50 py-1">
                                            {uniqueToLocations
                                              .filter((tl) => !row.toLoc || tl.toLowerCase().includes((row.toLoc || "").toLowerCase()))
                                              .map((tl) => (
                                                <div
                                                  key={tl}
                                                  onClick={() => {
                                                    const updated = [...(formData.rows || [])];
                                                    updated[idx] = { ...updated[idx], toLoc: tl, isToDropdown: false };
                                                    setFormData({ ...formData, rows: updated });
                                                  }}
                                                  className="px-3 py-1.5 text-xs text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between"
                                                >
                                                  <span>{tl}</span>
                                                  {row.toLoc === tl && <Check className="w-3 h-3 text-red-600" />}
                                                </div>
                                              ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Freight */}
                                    <div className="relative flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-5 flex items-end">
                                        <span>Freight (₹/MT)</span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={row.freight || ''}
                                          onChange={(e) => {
                                            const updated = [...(formData.rows || [])];
                                            updated[idx] = { ...updated[idx], freight: e.target.value };
                                            setFormData({ ...formData, rows: updated });
                                          }}
                                          placeholder="0.00"
                                          className="w-full h-9 px-3 py-2 pr-7 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-bold text-slate-900 shadow-xs"
                                        />
                                        {uniqueFreights.length > 0 && (
                                          <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isFreightDropdown: !updated[idx].isFreightDropdown };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                                          >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>

                                      {row.isFreightDropdown && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-20"
                                            onClick={() => {
                                              const updated = [...(formData.rows || [])];
                                              updated[idx] = { ...updated[idx], isFreightDropdown: false };
                                              setFormData({ ...formData, rows: updated });
                                            }}
                                          />
                                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-slate-200 rounded-lg shadow-lg max-h-36 overflow-y-auto divide-y divide-slate-50 py-1">
                                            {uniqueFreights
                                              .filter((fr) => !row.freight || fr.includes(String(row.freight || "")))
                                              .map((fr) => (
                                                <div
                                                  key={fr}
                                                  onClick={() => {
                                                    const updated = [...(formData.rows || [])];
                                                    updated[idx] = { ...updated[idx], freight: fr, isFreightDropdown: false };
                                                    setFormData({ ...formData, rows: updated });
                                                  }}
                                                  className="px-3 py-1.5 text-xs text-slate-800 hover:bg-red-50 hover:text-red-600 cursor-pointer flex items-center justify-between"
                                                >
                                                  <span>₹{fr}</span>
                                                  {String(row.freight) === String(fr) && <Check className="w-3 h-3 text-red-600" />}
                                                </div>
                                              ))}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    {/* Net Wt */}
                                    <div className="flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-5 flex items-end">
                                        <span>Net Wt (MT) <span className="text-red-500">*</span></span>
                                      </label>
                                      <div className="relative">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={row.qty || ''}
                                          onChange={(e) => {
                                            const updated = [...(formData.rows || [])];
                                            updated[idx] = { ...updated[idx], qty: e.target.value };
                                            setFormData({ ...formData, rows: updated });
                                          }}
                                          placeholder="0.00"
                                          className="w-full h-9 pl-3 pr-8 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-red-500 text-xs font-bold text-slate-900 shadow-xs"
                                        />
                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 pointer-events-none">MT</span>
                                      </div>
                                    </div>

                                    {/* Dynamically Calculated Freight Amount (Freight * Net Wt) */}
                                    <div className="flex flex-col justify-end">
                                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5 h-5 flex items-end">
                                        <span>Freight Amount</span>
                                      </label>
                                      <div className="w-full h-9 px-3 py-2 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between text-xs font-extrabold text-emerald-900 shadow-xs">
                                        <span className="text-[10px] font-bold text-emerald-700">₹</span>
                                        <span>
                                          {formatNumber((parseFloat(row.freight) || 0) * (parseFloat(row.qty) || 0))}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                            </div>
                          ))}
                        </div>

                        {/* Summary Bar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              const newRows = [
                                ...(formData.rows || []),
                                {
                                  id: Date.now(),
                                  truckNo: '',
                                  driver: '',
                                  tp: '',
                                  fromLoc: '',
                                  toLoc: '',
                                  freight: '',
                                  date: formData.date || new Date().toISOString().split('T')[0],
                                  qty: ''
                                }
                              ];
                              setFormData({ ...formData, rows: newRows });
                            }}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Another Row</span>
                          </button>
                          
                          <div className="flex items-center gap-3 font-semibold text-slate-700">
                            <span>Total Entered:</span>
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {formatNumber((formData.rows || []).reduce((sum, r) => sum + (parseFloat(r.qty) || 0), 0))} MT
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* View Truck */}
              {modalConfig.type === "viewTruck" && modalConfig.data && (() => {
                const t = modalConfig.data;
                const truckDO = ((store?.dos || []).find((d) => d.id === t.did) || currentDO);
                const party = truckDO?.parties?.find((p) => p.id === t.pid) || currentDO.parties?.find((p) => p.id === t.pid);

                return (
                  <div className="space-y-4">
                    {/* Header Highlight Card - Clean Light Theme */}
                    <div className="bg-gradient-to-br from-slate-50 via-amber-50/20 to-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-widest text-amber-700">Truck Dispatch Record</div>
                          <h4 className="text-xl font-extrabold tracking-tight text-slate-900 mt-0.5">{t.no || "No Truck Number"}</h4>
                          <p className="text-xs text-slate-600 font-semibold mt-0.5">
                            Transporter / Lifter: <span className="text-slate-900 font-bold">{t.driver || "-"}</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide uppercase ${t.done ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                            {t.done ? "Done (History)" : "Running (Pending)"}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">
                            {formatDate(t.date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Weight Metric Card */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-red-50/70 border border-red-200/80 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">Net Weight</span>
                          <div className="text-lg font-black text-red-900 mt-0.5">{formatNumber(t.qty)} <span className="text-xs font-bold text-red-700">MT</span></div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold">
                          <Truck className="w-5 h-5 text-red-600" />
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">TP / Challan No.</span>
                          <div className="text-base font-extrabold text-slate-800 mt-0.5">{t.tp || "N/A"}</div>
                        </div>
                        <div className="w-9 h-9 rounded-lg bg-slate-200/60 text-slate-600 flex items-center justify-center font-bold">
                          <FileText className="w-5 h-5 text-slate-600" />
                        </div>
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                      <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-red-600" /> Allotment & DO Mapping
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Dispatch Meta</span>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">DO Party Name</span>
                          <span className="font-bold text-slate-800">{truckDO?.co || "-"}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">DO Number</span>
                          <span className="font-bold text-slate-800">{getDOName(truckDO)}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Lifter Party Name</span>
                          <span className="font-bold text-slate-900">{party?.name || "-"}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Mines / Grade</span>
                          <span className="font-bold text-slate-800">{truckDO?.mines || "-"} {truckDO?.grade ? `(${truckDO.grade})` : ""}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Route (From → To)</span>
                          <span className="font-bold text-slate-800">
                            {t.fromLoc || t.toLoc ? `${t.fromLoc || "-"} → ${t.toLoc || "-"}` : "-"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50/60 rounded-lg border border-slate-100">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase block">Freight Rate</span>
                          <span className="font-bold text-emerald-700">
                            {t.freight ? `₹${formatNumber(t.freight)} / MT` : "-"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-100">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase block">Total Freight Amount</span>
                          <span className="font-extrabold text-emerald-900 text-sm">
                            {t.freight && t.qty ? `₹${formatNumber((parseFloat(t.freight) || 0) * (parseFloat(t.qty) || 0))}` : "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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
            <div className="p-4.5 bg-slate-100/70 border-t border-slate-200/80 flex items-center justify-end gap-2.5 shrink-0">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs active:scale-95"
              >
                Cancel
              </button>

              {modalConfig.type === "doForm" && (
                <button
                  onClick={() => saveDO(modalConfig.data?.id)}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#b91c1c] to-[#e7000b] hover:from-[#991b1b] hover:to-[#dc2626] text-white text-xs font-bold transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Save DO</span>
                </button>
              )}

              {modalConfig.type === "viewDO" && (
                <div className="flex items-center gap-2">
                  {currentDO.id !== modalConfig.data.id && (
                    <button
                      onClick={() => selectActiveDO(modalConfig.data.id)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#b91c1c] to-[#e7000b] text-white text-xs font-bold hover:brightness-105 transition-all shadow-xs"
                    >
                      Open DO
                    </button>
                  )}
                  <button
                    onClick={() => openDOForm(modalConfig.data.id)}
                    className="px-3.5 py-2 rounded-lg bg-white border border-red-200 text-[#e7000b] text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteDO(modalConfig.data.id)}
                    className="px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}

              {modalConfig.type === "partyForm" && (
                <button
                  onClick={() => saveParty(modalConfig.data?.id)}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#b91c1c] to-[#e7000b] hover:from-[#991b1b] hover:to-[#dc2626] text-white text-xs font-bold transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Party</span>
                </button>
              )}

              {modalConfig.type === "viewParty" && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openTruckForm(0, modalConfig.data.id)}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#b91c1c] to-[#e7000b] text-white text-xs font-bold hover:brightness-105 transition-all shadow-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Truck
                  </button>
                  <button
                    onClick={() => openPartyForm(modalConfig.data.id)}
                    className="px-3.5 py-2 rounded-lg bg-white border border-red-200 text-[#e7000b] text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteParty(modalConfig.data.id)}
                    className="px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              )}

              {modalConfig.type === "truckForm" && (
                <button
                  onClick={() => saveTruck(modalConfig.data?.id)}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#b91c1c] to-[#e7000b] hover:from-[#991b1b] hover:to-[#dc2626] text-white text-xs font-bold transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Save Truck</span>
                </button>
              )}

              {modalConfig.type === "viewTruck" && (
                <div className="flex items-center gap-2">
                  {modalConfig.data.done ? (
                    <button
                      onClick={() => setTruckStatus(modalConfig.data.id, false)}
                      className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-amber-700 text-xs font-bold transition-colors"
                    >
                      Move to Pending
                    </button>
                  ) : (
                    <button
                      onClick={() => setTruckStatus(modalConfig.data.id, true)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors"
                    >
                      Mark Done
                    </button>
                  )}
                  <button
                    onClick={() => openTruckForm(modalConfig.data.id)}
                    className="px-3.5 py-2 rounded-lg bg-white border border-red-200 text-[#e7000b] text-xs font-bold hover:bg-red-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteTruck(modalConfig.data.id)}
                    className="px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 transition-colors"
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
