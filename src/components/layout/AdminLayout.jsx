"use client";


import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotifications } from "../../redux/slice/notificationSlice";
import supabase from "../../SupabaseClient";
import { processDailyReminders } from "../../services/dailyReminderService";
import jbtLogo from "../../assets/jbt.png";
import jbeLogo from "../../assets/jbe.png";
import jblLogo from "../../assets/jbl.png";
import ganeshLogo from "../../assets/ganesh.jpg";
import askLogo from "../../assets/ASK.png";
import jaiLogostic from "../../assets/jai.logostic.png";
import useDataStore from "../../modules/document/store/dataStore";
import {
  CheckSquare,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Database,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Zap,
  Settings,
  CirclePlus,
  UserRound,
  CalendarCheck,
  Calendar as CalendarIcon,
  BookmarkCheck,
  CrossIcon,
  X,
  Bell,
  Video,
  LayoutDashboard,
  FileText,
  Banknote,
  List,
  RefreshCw,
  Share2,
  CheckCircle,
  DollarSign,
  ShieldCheck,
  Ban,
  CreditCard,
  Settings2,
  Shield,
  HelpCircle,
  Users,
  Building2,
  Truck,
  GitFork,
  Package,
  Factory
} from "lucide-react";

// Helper: get module & page title from current pathname
const getHeaderTitle = (pathname, routes) => {
  // Check Profile
  if (pathname.includes("/dashboard/profile")) return { module: "Profile", page: "My Profile" };
  if (pathname.includes("/dashboard/help-slip/system-flow")) return { module: "Help Slip", page: "System Flow" };
  if (pathname.includes("/dashboard/help-slip")) return { module: "Help Slip", page: "Help Slip" };
  if (pathname.includes("/dashboard/global-settings")) return { module: "Global Settings", page: "Global Settings" };
  // Check Rent Management
  if (pathname.includes("/dashboard/rent-tracker/system-flow")) return { module: "Rent Management Tracker", page: "System Flow" };
  if (pathname.includes("/dashboard/rent-tracker/dashboard")) return { module: "Rent Management Tracker", page: "Rent Dashboard" };
  if (pathname.includes("/dashboard/rent-tracker/master")) return { module: "Rent Management Tracker", page: "Rent Master" };
  if (pathname.includes("/dashboard/rent-tracker/monthly")) return { module: "Rent Management Tracker", page: "Monthly Tracker" };
  if (pathname.includes("/dashboard/rent-management")) return { module: "Rent Management Tracker", page: "Rent Management" };
  // Check HR System routes
  if (pathname.startsWith("/hr")) {
    const flat = routes.flatMap(r => r.subItems ? r.subItems : [r]);
    const match = flat.find(r => r.href && pathname === r.href);
    return { module: "HR System", page: match?.label || "HR System" };
  }
  // Check Petty Cash routes
  if (pathname.startsWith("/petty-cash")) {
    const flat = routes.flatMap(r => r.subItems ? r.subItems : [r]);
    const match = flat.find(r => r.href && pathname === r.href);
    return { module: "Petty Cash", page: match?.label || "Petty Cash" };
  }
  // Check Daily Scheduler routes
  if (pathname.startsWith("/daily-scheduler")) {
    const flat = routes.flatMap(r => r.subItems ? r.subItems : [r]);
    const match = flat.find(r => r.href && pathname === r.href);
    return { module: "Daily Scheduler", page: match?.label || "Daily Scheduler" };
  }
  // Check Plant routes
  if (pathname.startsWith("/plant")) {
    const plantRoutes = [
      { href: "/plant/stock", label: "Stock Management" },
      { href: "/plant/transfer", label: "Incoming & Outgoing" },
      { href: "/plant/production2", label: "Production 2" },
      { href: "/plant/sauda-scale", label: "Sauda Scale" },
      { href: "/plant/sauda-purchase", label: "Sauda Purchase" },
      { href: "/plant/mis-report", label: "MIS Report" },
    ];
    const match = plantRoutes.find(r => pathname === r.href);
    return { module: "Plant ( HDS )", page: match?.label || "Plant System" };
  }
  // Check Coal System routes
  if (pathname.startsWith("/coal-system")) {
    const flat = routes.flatMap(r => r.subItems ? r.subItems : [r]);
    const match = flat.find(r => r.href && pathname === r.href);
    return { module: "Coal System", page: match?.label || "Coal System" };
  }
  // Check Document & Substruction routes (including Document Vault)
  if (
    pathname.includes("/doc-dashboard") ||
    pathname.includes("/resource-manager") ||
    pathname.includes("/document/") ||
    pathname.includes("/subscription/") ||
    pathname.includes("/loan/") ||
    pathname.includes("/bg/") ||
    pathname.startsWith("/document-vault")
  ) {
    // Find exact page label
    const flat = routes.flatMap(r => r.subItems ? r.subItems : [r]);
    const match = flat.find(r => r.href && pathname.startsWith(r.href));
    return { module: "Document & Substruction", page: match?.label || "Document & Substruction" };
  }
  // Checklist & Delegation — find specific page label
  const flat = routes.flatMap(r => r.subItems ? r.subItems : [r]);
  const match = flat.find(r => r.href && pathname === r.href);
  if (match) return { module: "Checklist & Delegation", page: match.label };
  return { module: "Checklist & Delegation", page: "Checklist & Delegation" };
};

export default function AdminLayout({ children, darkMode, toggleDarkMode, showLayout = true, noPadding = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: notifications } = useSelector((state) => state.notifications);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHolidaySubmenuOpen, setIsHolidaySubmenuOpen] = useState(false);
  const [username, setUsername] = useState(() => localStorage.getItem("user-name") || "");
  const [userRole, setUserRole] = useState(() => localStorage.getItem("role") || "user");
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem("email_id") || "");
  const [isSuperAdmin, setIsSuperAdmin] = useState(() => (localStorage.getItem("user-name") || "").toLowerCase() === "admin");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [profileImage, setProfileImage] = useState(() => localStorage.getItem("profile_image") || "");
  const [systemAccess, setSystemAccess] = useState(() => {
    try {
      const data = localStorage.getItem("system_access");
      if (!data) return [];
      if (data.trim().startsWith('[')) return JSON.parse(data);
      return data.split(',').filter(Boolean);
    } catch(e) { return []; }
  });
  const [pageAccess, setPageAccess] = useState(() => {
    try {
      const data = localStorage.getItem("page_access");
      if (!data) return [];
      if (data.trim().startsWith('[')) return JSON.parse(data);
      return data.split(',').filter(Boolean);
    } catch(e) { return []; }
  });
  const [pageCounts, setPageCounts] = useState({});
  const [coalBadges, setCoalBadges] = useState({});
  const [rentBadges, setRentBadges] = useState({});
  const [pettyCashBadges, setPettyCashBadges] = useState({});
  const [hrBadges, setHrBadges] = useState({});
  const [schedulerBadges, setSchedulerBadges] = useState({});
  const [helpSlipPendingCount, setHelpSlipPendingCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchSchedulerCounts = async () => {
      if (!isSuperAdmin && !systemAccess.includes("Daily Scheduler")) return;
      try {
        const fetchCount = async (table, filters = {}) => {
          let query = supabase.from(table).select('*', { count: 'exact', head: true });
          for (const [key, val] of Object.entries(filters)) {
            query = query.eq(key, val);
          }
          
          const userId = localStorage.getItem('user-id');
          const userName = localStorage.getItem('user-name');
          
          // User-specific filtering
          if (table === 'tasks') {
            if (userId && userName) {
               query = query.or(`assigned_staff.eq.${userId},created_by.eq."${userName}"`);
            }
          } else if (table === 'someday_tasks') {
            if (userName) {
               query = query.eq('created_by', userName);
            }
          }

          const { count, error } = await query;
          if (error) console.error("Badge query error:", error);
          return count || 0;
        };

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const [
          dashboardCount, waitingCount, somedayCount
        ] = await Promise.all([
          fetchCount('tasks', { status: 'Pending', date: todayStr }),
          fetchCount('tasks', { status: 'Overdue' }),
          fetchCount('someday_tasks')
        ]);

        if (isMounted) {
          setSchedulerBadges({
            "Scheduler Dashboard": dashboardCount,
            "Waiting List": waitingCount,
            "Someday Tasks": somedayCount
          });
        }
      } catch (err) {
        console.error("Error fetching scheduler counts", err);
      }
    };
    fetchSchedulerCounts();
    return () => { isMounted = false; };
  }, [isSuperAdmin, systemAccess]);

  useEffect(() => {
    let isMounted = true;
    const fetchHrCounts = async () => {
      if (!isSuperAdmin && !systemAccess.includes("HR System")) return;
      try {
        const fetchCount = async (table, filterCol, filterVal) => {
          let query = supabase.from(table).select('*', { count: 'exact', head: true });
          if (filterCol && filterVal) {
             query = query.eq(filterCol, filterVal);
          }
          const { count } = await query;
          return count || 0;
        };

        const [
          empCount, salaryStrCount, pendingLeaves, payrollCount, pendingIndents
        ] = await Promise.all([
          fetchCount('users'),
          fetchCount('salary_structures'),
          fetchCount('leave_requests', 'status', 'Pending'),
          fetchCount('processed_payroll'),
          fetchCount('indents', 'status', 'Pending')
        ]);

        if (isMounted) {
          setHrBadges({
            "Employee Master": empCount,
            "Salary Structure": salaryStrCount,
            "Leave Tracker": pendingLeaves,
            "Payroll Process": payrollCount,
            "Create Indent": pendingIndents
          });
        }
      } catch (err) {
        console.error("Error fetching HR counts", err);
      }
    };
    fetchHrCounts();
    return () => { isMounted = false; };
  }, [isSuperAdmin, systemAccess]);

  useEffect(() => {
    let isMounted = true;
    const fetchPettyCounts = async () => {
      // Avoid fetching if user doesn't have access to save requests, unless they are admin
      if (!isSuperAdmin && !systemAccess.includes("Petty Cash")) return;
      try {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${month}-${day}`;

        const fetchCount = async (table, isPending = false) => {
          try {
            let query = supabase.from(table).select('*', { count: 'exact', head: true });
            if (isPending && table === 'petty_cash_expenses') {
               query = query.eq('status', 'PENDING');
            } else {
               query = query.eq('date', todayDateStr);
            }
            const { count, error } = await query;
            if (error) return 0;
            return count || 0;
          } catch(e) {
            return 0;
          }
        };
        const [
          creditsCount, expensesCount
        ] = await Promise.all([
          fetchCount('petty_cash_addcash_credits'),
          fetchCount('petty_cash_expenses', true)
        ]);

        if (isMounted) {
          setPettyCashBadges({
            "Add Credit": creditsCount,
            "Expenses": expensesCount,
            "Ledger": (creditsCount || 0) + (expensesCount || 0)
          });
        }
      } catch (err) {
        console.error("Error fetching petty cash counts", err);
      }
    };
    fetchPettyCounts();
    return () => { isMounted = false; };
  }, [isSuperAdmin, systemAccess]);


  useEffect(() => {
    let isMounted = true;
    const fetchRentCounts = async () => {
      try {
        const currentMonth = new Date().toLocaleString('default', { month: 'long' });
        
        const fetchCount = async (table, filterMonth = null) => {
          let query = supabase.from(table).select('*', { count: 'exact', head: true });
          if (filterMonth) {
            query = query.eq('month', filterMonth);
          }
          if (table === 'rent_monthly_tracker') {
            query = query.eq('status', 'Pending');
          }
          const { count } = await query;
          return count || 0;
        };
        const [
          monthlyTrackerCount
        ] = await Promise.all([
          fetchCount('rent_monthly_tracker', currentMonth)
        ]);

        if (isMounted) {
          setRentBadges({
            "Rent Master": 0,
            "Monthly Tracker": monthlyTrackerCount,
            "Rent Management": 0
          });
        }
      } catch (err) {
        console.error("Error fetching rent system counts", err);
      }
    };
    fetchRentCounts();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchCoalCounts = async () => {
      if (!isSuperAdmin && !systemAccess.includes("Coal System")) return;
      try {
        const fetchCount = async (table, checkStatus = true) => {
          try {
            let query = supabase.from(table).select('*', { count: 'exact', head: true });
            if (checkStatus) {
              query = query.or('status.is.null,status.neq.done');
            }
            const { count, error } = await query;
            if (error) {
              // Retry without status filter if column doesn't exist
              const { count: fallback } = await supabase.from(table).select('*', { count: 'exact', head: true });
              return fallback || 0;
            }
            return count || 0;
          } catch(e) {
            return 0;
          }
        };
        const [
          auctionCount, seclIntimationCount, seclPaymentCount,
          salesOrderCount, invoiceCount, saudaScaleCount
        ] = await Promise.all([
          fetchCount('auctions', false),
          fetchCount('secl_intimation_format_1', true),
          fetchCount('secl_payment_advices', false),
          fetchCount('sales_orders', false),
          fetchCount('invoices', false),
          fetchCount('buy_sauda', false)
        ]);

        let dispatchCount = 0;
        try {
          const dispatchData = JSON.parse(localStorage.getItem('dispatch_data') || '[]');
          dispatchCount = dispatchData.length;
        } catch(e) {}

        if (isMounted) {
          setCoalBadges({
            "Auction": auctionCount,
            "SECL Intimation": seclIntimationCount,
            "SECL Payment Advice": seclPaymentCount,
            "Sales Order": salesOrderCount,
            "Refund / Lapse": salesOrderCount,
            "Invoice": invoiceCount,
            "Sauda Sale": saudaScaleCount,
            "Dispatch": dispatchCount,
            "Work Order": 0,
            "Transport Payment": 0
          });
        }
      } catch(err) {
        console.error("Error fetching coal system counts", err);
      }
    };
    fetchCoalCounts();
    return () => { isMounted = false; };
  }, [isSuperAdmin, systemAccess]);

  useEffect(() => {
    let isMounted = true;
    const fetchHelpSlipPending = async () => {
      try {
        const loggedInUserName = localStorage.getItem('user-name') || '';
        let query = supabase
          .from('help_slips')
          .select('id, admin_reply, name');

        if (!isSuperAdmin && loggedInUserName) {
          query = query.ilike('name', loggedInUserName);
        }

        const { data, error } = await query;
        if (error) {
          console.error("Error fetching help slips for badge:", error);
          return;
        }

        if (isMounted && data) {
          // Count slips where admin_reply is null or empty/whitespace
          const pendingCount = data.filter(r => !r.admin_reply || !r.admin_reply.trim()).length;
          setHelpSlipPendingCount(pendingCount);
        }
      } catch (err) {
        console.error("Error in fetchHelpSlipPending:", err);
      }
    };

    fetchHelpSlipPending();

    // Subscribe to realtime changes on help_slips
    const channel = supabase
      .channel('realtime:help_slips_badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'help_slips' }, () => {
        fetchHelpSlipPending();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isSuperAdmin]);

  // Get data from Document Store
  const { documents, subscriptions, loans, bgs, shareHistory, carInsurances, renewalHistory } = useDataStore();

  // Clear any legacy cached fake badge numbers
  try {
    localStorage.removeItem('ds_module_counts_cache');
  } catch(e) {}

  // State for Document & Substruction module live counts (only for modules with actual data)
  const [docStats, setDocStats] = useState({
    carInsurance: 6,
    reminderCalendar: 44,
    vehicleReports: 5
  });

  useEffect(() => {
    let isMounted = true;
    const fetchDocCounts = async () => {
      try {
        const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbydeOLTJ81fFwTZ85dVDd5GrbSKASsnjlxK9c_owQ_KCFkTUxAeHBfRtjFCMb-zeo6Qgw/exec";
        if (!GOOGLE_SCRIPT_URL) return;

        const fetchSheetCount = async (sheetName) => {
          try {
            const res = await fetch(`${GOOGLE_SCRIPT_URL}?sheet=${encodeURIComponent(sheetName)}&_t=${Date.now()}`);
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              const rows = json.data.slice(1).filter(r => r && r.some(cell => String(cell || '').trim() !== ''));
              return rows.length;
            }
            return 0;
          } catch (e) {
            return 0;
          }
        };

        const [carCount, remCount, vehCount] = await Promise.all([
          fetchSheetCount("Car Insurance"),
          fetchSheetCount("Reminder Calender"),
          fetchSheetCount("VEHICLE")
        ]);

        if (isMounted) {
          setDocStats({
            carInsurance: carCount || 6,
            reminderCalendar: remCount || 44,
            vehicleReports: vehCount || 5
          });
        }
      } catch (err) {
        console.error("Error fetching doc counts:", err);
      }
    };

    fetchDocCounts();
    return () => { isMounted = false; };
  }, []);

  const docRenewalCount = documents.filter(doc => doc.needsRenewal).length || null;
  const subRenewalCount = subscriptions.filter(sub => sub.planned1 && sub.planned1.trim() !== '' && (!sub.actual1 || sub.actual1.trim() === '')).length || null;
  const subApprovalCount = subscriptions.filter(sub => sub.planned2 && sub.planned2.trim() !== '' && (!sub.actual2 || sub.actual2.trim() === '')).length || null;
  const subPaymentCount = subscriptions.filter(sub => sub.planned3 && sub.planned3.trim() !== '' && (!sub.actual3 || sub.actual3.trim() === '')).length || null;

  const loanForeclosureCount = loans.filter(loan => loan.planned1 && loan.planned1.trim() !== '' && (!loan.actual1 || loan.actual1.trim() === '') && loan.sn?.startsWith('SN-')).length || null;
  const loanNocCount = loans.filter(loan => loan.planned2 && loan.planned2.trim() !== '' && (!loan.actual2 || loan.actual2.trim() === '')).length || null;

  // Badges calculation for each subItem - ONLY show badge when there is actual pending or existing data
  const insuranceBadge = documents?.length > 0 ? documents.length : null;
  const carInsuranceBadge = (carInsurances?.length > 0 ? carInsurances.length : (docStats.carInsurance > 0 ? docStats.carInsurance : null));
  const docRenewalBadge = docRenewalCount > 0 ? docRenewalCount : null;
  const subRenewalBadge = subRenewalCount > 0 ? subRenewalCount : null;
  const docSharedBadge = shareHistory?.length > 0 ? shareHistory.length : null;
  const reminderCalendarBadge = docStats.reminderCalendar > 0 ? docStats.reminderCalendar : null;
  const insuranceMasterBadge = documents?.length > 0 ? documents.length : null;
  const vehicleReportsBadge = docStats.vehicleReports > 0 ? docStats.vehicleReports : null;
  const subApprovalBadge = subApprovalCount > 0 ? subApprovalCount : null;
  const subPaymentBadge = subPaymentCount > 0 ? subPaymentCount : null;

  const allLoanBadge = loans?.length > 0 ? loans.length : null;
  const loanForeclosureBadge = loanForeclosureCount > 0 ? loanForeclosureCount : null;
  const loanNocBadge = loanNocCount > 0 ? loanNocCount : null;
  const bgBadge = bgs?.length > 0 ? bgs.length : null;

  const resourceManagerBadge = ((docRenewalCount || 0) + (subRenewalCount || 0) + (subApprovalCount || 0) + (subPaymentCount || 0)) || null;
  const loanBadge = ((loanForeclosureCount || 0) + (loanNocCount || 0)) || null;

  const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);

  // States for Document Submenus
  const [isResourceMenuOpen, setIsResourceMenuOpen] = useState(false);
  const [isLoanMenuOpen, setIsLoanMenuOpen] = useState(false);
  const [isVaultMenuOpen, setIsVaultMenuOpen] = useState(() => location.pathname.startsWith("/document-vault"));

  // State for Module Accordions
  const [openModules, setOpenModules] = useState(() => {
    const path = location.pathname;
    const defaultState = {
      "Profile": path.includes("/dashboard/profile"),
      "Rent Management": path.includes("/dashboard/rent-management"),
      "HR System": path.startsWith("/hr"),
      "Petty Cash": path.startsWith("/petty-cash"),
      "Daily Scheduler": path.startsWith("/daily-scheduler"),
      "Checklist & Delegation": path.startsWith("/dashboard") && !path.includes("/dashboard/profile") && !path.includes("/dashboard/global-settings") && !path.includes("/dashboard/rent-management") && !path.includes("/dashboard/rent-tracker") && !path.includes("/dashboard/help-slip"),
      "Help Slip": path.includes("/dashboard/help-slip"),
      "Document & Substruction": path.includes("/document") || path.includes("/doc-dashboard") || path.includes("/resource-manager") || path.includes("/loan") || path.includes("/subscription") || path.includes("/bg") || path.startsWith("/document-vault") || path === "/",
      "Rent Management Tracker": path.includes("/dashboard/rent-tracker"),
      "Coal System": path.startsWith("/coal-system"),
      "Plant ( HDS )": path.startsWith("/plant"),
      "Transport Reporting": path.startsWith("/transport-system"),
      "Letter": path.startsWith("/letter")
    };
    try {
      const saved = sessionStorage.getItem('sidebar_open_modules');
      if (saved) {
        return { ...defaultState, ...JSON.parse(saved) };
      }
    } catch(e) {}
    return defaultState;
  });

  useEffect(() => {
    sessionStorage.setItem('sidebar_open_modules', JSON.stringify(openModules));
  }, [openModules]);

  const navRef = useRef(null);
  
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('sidebar_scroll_pos');
    if (savedScroll && navRef.current) {
      navRef.current.scrollTop = parseInt(savedScroll, 10);
    }
  }, []);

  const handleNavScroll = (e) => {
    sessionStorage.setItem('sidebar_scroll_pos', e.target.scrollTop);
  };

  const toggleModule = (moduleName) => {
    setOpenModules((prev) => {
      const isCurrentlyOpen = prev[moduleName];
      const newState = Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {});
      newState[moduleName] = !isCurrentlyOpen;
      return newState;
    });
  };

  // Check authentication on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem("user-name");
    const storedRole = localStorage.getItem("role");
    const storedEmail = localStorage.getItem("email_id");

    if (!storedUsername) {
      // Redirect to login if not authenticated
      navigate("/login");
      return;
    }

    setUsername(storedUsername);
    setUserRole(storedRole || "user");
    setUserEmail(storedEmail);
    setIsSuperAdmin(storedUsername.toLowerCase() === "admin" || (storedRole || "").toLowerCase() === "superadmin");

    // Centralized Security Guard for User Role
    const path = location.pathname;
    const restrictedPages = [
      "/dashboard/assign-task",
      "/dashboard/admin-approval",
      "/dashboard/checklist",
      "/dashboard/maintenance",
      "/dashboard/repair",
      "/dashboard/ea-task",
      "/dashboard/quick-task",
      "/dashboard/holiday-list",
      "/dashboard/working-day-calendar",
      "/dashboard/setting"
    ];

    const storedRoleLower = (storedRole || "user").toLowerCase();
    const hasCustomPermissions = !!localStorage.getItem("system_access");

    if (!hasCustomPermissions && storedRoleLower === "user" && restrictedPages.some(p => path.startsWith(p))) {
      navigate("/dashboard/admin");
      return;
    }

    if (storedRoleLower === "hod") {
      const designation = (localStorage.getItem("designation") || "").toLowerCase();
      const isMachineOperator = designation.includes("machin") || designation.includes("operat") || designation.includes("oprat");
      
      const hodRestrictedPages = [
        "/dashboard/maintenance",
        "/dashboard/ea-task",
        "/dashboard/quick-task",
        "/dashboard/holiday-list",
        "/dashboard/working-day-calendar",
        "/dashboard/setting"
      ];
      
      if (!isMachineOperator) {
        hodRestrictedPages.push("/dashboard/repair");
      }

      if (!hasCustomPermissions && hodRestrictedPages.some(p => path.startsWith(p))) {
        navigate("/dashboard/admin");
        return;
      }
    }

    // Initial load from localStorage
    const cachedImage = localStorage.getItem("profile_image");
    setProfileImage(cachedImage || "");

      // Fetch reporting users for HOD role check
      let reportingUsers = [storedUsername?.toLowerCase()];
      const currentUserRole = (localStorage.getItem("role") || "").toLowerCase();
      if (currentUserRole === "hod") {
          const fetchReportingUsers = async () => {
              const { data: reports } = await supabase
                  .from("users")
                  .select("user_name")
                  .eq("reported_by", storedUsername);
              if (reports) {
                  reportingUsers = [storedUsername.toLowerCase(), ...reports.map(r => (r.user_name || "").toLowerCase())];
              }
          };
          fetchReportingUsers();
      }

    // Sync with database to get the latest image and access rights
    const syncProfileImage = async () => {
      try {
        const { data } = await supabase
          .from("users")
          .select("profile_image, system_access, page_access")
          .eq("user_name", storedUsername)
          .single();

        if (data) {
          if (data.profile_image) {
            setProfileImage(data.profile_image);
            localStorage.setItem("profile_image", data.profile_image);
          }
          try {
             let sysAccess = [];
             if (typeof data.system_access === 'string') {
                 if (data.system_access.trim().startsWith('[')) sysAccess = JSON.parse(data.system_access);
                 else sysAccess = data.system_access.split(',').filter(Boolean);
             } else { sysAccess = data.system_access || []; }
             setSystemAccess(sysAccess);
             localStorage.setItem("system_access", sysAccess.join(','));
          } catch(e) {}
          try {
             let pgAccess = [];
             if (typeof data.page_access === 'string') {
                 if (data.page_access.trim().startsWith('[')) pgAccess = JSON.parse(data.page_access);
                 else pgAccess = data.page_access.split(',').filter(Boolean);
             } else { pgAccess = data.page_access || []; }
             setPageAccess(pgAccess);
             localStorage.setItem("page_access", pgAccess.join(','));
          } catch(e) {}
        }
      } catch (err) {
        console.error("❌ Error syncing profile data:", err);
      }
    };

    if (storedUsername) {
      syncProfileImage();
    }

    // Check if this is the super admin (username = 'admin')
    const normalizedUsername = (storedUsername || "").toLowerCase();
    setIsSuperAdmin(normalizedUsername === "admin");
  }, [navigate, location.pathname]);

  // Fetch page counts for sidebar badges
  useEffect(() => {
    const fetchCounts = async () => {
      if (!username) return;
      const role = (userRole || "").toLowerCase();
      const isAdmin = role === "admin" || role === "superadmin" || username.toLowerCase() === "admin";
      
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const endOfTodayISO = endOfToday.toISOString();

      // Checklist Count
      let chkQuery = supabase.from('checklist').select('*', { count: 'exact', head: true })
          .is('submission_date', null)
          .is('status', null)
          .lte('task_start_date', endOfTodayISO);
      if (!isAdmin) chkQuery = chkQuery.ilike('name', username);
      const { count: checklistCount } = await chkQuery;

      // Delegation Count
      let delQuery = supabase.from('delegation').select('*', { count: 'exact', head: true })
          .or('submission_date.is.null,status.neq.done')
          .lte('task_start_date', endOfTodayISO);
      if (!isAdmin) delQuery = delQuery.ilike('name', username);
      const { count: delegationCount } = await delQuery;

      // Admin Approval Count
      let approvalCount = 0;
      if (isAdmin || role === 'hod') {
          let eaAppQuery = supabase.from('ea_tasks_done').select('*', { count: 'exact', head: true }).eq('status', 'pending');
          if (!isAdmin) eaAppQuery = eaAppQuery.ilike('given_by', username);
          const { count: eaCount } = await eaAppQuery;

          let chkAppQuery = supabase.from('checklist').select('*', { count: 'exact', head: true })
              .not('submission_date', 'is', null)
              .or('admin_done.is.null,admin_done.eq.false');
          if (!isAdmin) chkAppQuery = chkAppQuery.ilike('given_by', username);
          const { count: chkAppCount } = await chkAppQuery;

          let delAppQuery = supabase.from('delegation_done').select('*', { count: 'exact', head: true }).in('status', ['pending', 'extend']);
          if (!isAdmin) delAppQuery = delAppQuery.ilike('given_by', username);
          const { count: delAppCount } = await delAppQuery;

          approvalCount = (eaCount || 0) + (chkAppCount || 0) + (delAppCount || 0);
      }

      setPageCounts({
          checklist: checklistCount || null,
          delegation: delegationCount || null,
          taskManager: (checklistCount || 0) + (delegationCount || 0) || null,
          adminApproval: approvalCount || null
      });
    };
    
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [username, userRole]);

  // Fetch notifications globally for badge count
  useEffect(() => {
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("user-id");
    if (role) {
      dispatch(fetchNotifications({ role: role.toLowerCase(), userId }));
    }
  }, [dispatch, location.pathname]);

  // Set initial submenu state based on current location
  useEffect(() => {
    if (location.pathname.includes("/dashboard/holiday") || location.pathname.includes("/dashboard/working-day")) {
      setIsHolidaySubmenuOpen(true);
    }
    if (location.pathname.includes("/resource-manager") || location.pathname.includes("/document/") || location.pathname.includes("/subscription/")) {
      setIsResourceMenuOpen(true);
    }
    if (location.pathname.includes("/loan/")) {
      setIsLoanMenuOpen(true);
    }
  }, [location.pathname]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("user-name");
    localStorage.removeItem("role");
    localStorage.removeItem("email_id");
    localStorage.removeItem("token");
    localStorage.removeItem("profile_image");
    localStorage.removeItem("system_access");
    localStorage.removeItem("page_access");
    window.location.href = "/login";
  };

  // No data categories needed as Task is now a main route

  // Update the routes array based on user role and super admin status
  const routes = [
    {
      href: "/dashboard/profile",
      label: "My Profile",
      icon: UserRound,
      active: location.pathname === "/dashboard/profile",
      showFor: ["admin", "user", "HOD"],
      module: "Profile",
    },
    {
      href: "/master-dashboard",
      label: "Master Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/master-dashboard",
      showFor: ["admin", "user", "HOD"],
      module: "Master Dashboard",
    },

    {
      href: "/dashboard/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/dashboard/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "Checklist & Delegation",
    },
    {
      href: "/dashboard/admin",
      label: "Dashboard",
      icon: Database,
      active: location.pathname === "/dashboard/admin",
      showFor: ["admin", "user", "HOD"],
      module: "Checklist & Delegation",
    },

    {
      href: "/dashboard/rent-tracker/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/dashboard/rent-tracker/system-flow",
      showFor: ["admin", "HOD"],
      module: "Rent Management Tracker",
    },
    {
      href: "/dashboard/rent-tracker/dashboard",
      label: "Rent Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/dashboard/rent-tracker/dashboard",
      showFor: ["admin", "HOD"],
      module: "Rent Management Tracker",
    },
    {
      href: "/dashboard/rent-tracker/master",
      label: "Rent Master",
      icon: Building2,
      active: location.pathname === "/dashboard/rent-tracker/master",
      showFor: ["admin", "HOD"],
      module: "Rent Management Tracker",
      badge: rentBadges["Rent Master"] > 0 ? rentBadges["Rent Master"] : null,
    },
    {
      href: "/dashboard/rent-tracker/monthly",
      label: "Monthly Tracker",
      icon: CalendarIcon,
      active: location.pathname === "/dashboard/rent-tracker/monthly",
      showFor: ["admin", "HOD"],
      module: "Rent Management Tracker",
      badge: rentBadges["Monthly Tracker"] > 0 ? rentBadges["Monthly Tracker"] : null,
    },
    {
      href: "/dashboard/notifications",
      label: "Notifications",
      icon: Bell,
      active: location.pathname === "/dashboard/notifications",
      showFor: ["admin", "user", "hod"],
      badge: notifications.filter(n => !n.isRead).length || null,
    },
    {
      href: "/dashboard/quick-task",
      label: "Task Manager",
      icon: Zap,
      active: location.pathname === "/dashboard/quick-task",
      // Show for super admin OR anyone with 'admin' role
      showFor: (isSuperAdmin || userRole.toLowerCase() === "admin") ? ["admin"] : [],
    },
    {
      href: "/dashboard/my-task",
      label: "My Task",
      icon: CheckCircle,
      active: location.pathname === "/dashboard/my-task",
      showFor: isSuperAdmin ? ["admin", "superadmin"] : [],
      module: "Checklist & Delegation",
    },
    {
      href: "/dashboard/assign-task",
      label: "Assign Task",
      icon: CheckSquare,
      active: location.pathname === "/dashboard/assign-task",
      showFor: ["admin", "HOD"],
    },
    {
      href: "/dashboard/delegation",
      label: "Delegation",
      icon: ClipboardList,
      active: location.pathname === "/dashboard/delegation",
      showFor: ["admin", "user", "HOD"],
      badge: pageCounts.delegation,
    },
    {
      href: "/dashboard/task",
      label: "Checklist",
      icon: CalendarCheck,
      active: location.pathname === "/dashboard/task",
      showFor: ["admin", "HOD", "user"],
      badge: pageCounts.checklist,
    },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: CalendarIcon,
      active: location.pathname === "/dashboard/calendar",
      showFor: ["admin", "user", "HOD"],
    },
    {
      label: "Holiday",
      icon: CalendarIcon, // Or a specific holiday icon
      showFor: (isSuperAdmin || userRole.toLowerCase() === "admin") ? ["admin"] : [], 
      isSubmenu: true,
      isOpen: isHolidaySubmenuOpen,
      setIsOpen: setIsHolidaySubmenuOpen,
      active: location.pathname.includes("/dashboard/holiday") || location.pathname.includes("/dashboard/working-day"),
      subItems: [
        {
          href: "/dashboard/holiday-list",
          label: "Holiday List",
          active: location.pathname === "/dashboard/holiday-list",
          showFor: ["admin"],
        },
        {
          href: "/dashboard/working-day-calendar",
          label: "Working Day Calendar",
          active: location.pathname === "/dashboard/working-day-calendar",
          showFor: ["admin"],
        }
      ]
    },
    {
      href: "/dashboard/admin-approval",
      label: "Admin Approval",
      icon: BookmarkCheck,
      active: location.pathname === "/dashboard/admin-approval",
      showFor: ["admin", "HOD"],
      badge: pageCounts.adminApproval,
    },
    {
      href: "/dashboard/training-video",
      label: "Training Video",
      icon: Video,
      active: location.pathname === "/dashboard/training-video",
      showFor: ["admin", "user", "HOD"],
      module: "Checklist & Delegation",
    },
    /*
    {
      href: "/dashboard/insurance",
      label: "Insurance",
      icon: ShieldCheck,
      active: location.pathname === "/dashboard/insurance",
      showFor: ["admin", "user", "HOD"],
      module: "Checklist & Delegation",
    },
    */
    // Document & Substruction Routes
    {
      href: "/document/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/document/system-flow" || location.pathname === "/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "Document & Substruction",
    },
    {
      href: "/doc-dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/doc-dashboard" || location.pathname === "/",
      showFor: ["admin", "user", "HOD"],
      module: "Document & Substruction",
    },
    // Document Vault Submenu right after Dashboard
    {
      label: "Document Vault",
      icon: ShieldCheck,
      showFor: ["admin", "user", "HOD"],
      isSubmenu: true,
      isOpen: isVaultMenuOpen,
      setIsOpen: setIsVaultMenuOpen,
      active: location.pathname.startsWith("/document-vault"),
      module: "Document & Substruction",
      subItems: [
        { href: "/document-vault/system-flow", label: "System Flow", active: location.pathname === "/document-vault/system-flow", showFor: ["admin", "user", "HOD"] },
        { href: "/document-vault", label: "Individual Documents", active: location.pathname === "/document-vault", showFor: ["admin", "user", "HOD"] },
        { href: "/document-vault/company", label: "Firm & Company Documents", active: location.pathname === "/document-vault/company", showFor: ["admin", "user", "HOD"] },
      ]
    },
    {
      label: "Resource Manager",
      icon: FileText,
      badge: resourceManagerBadge,
      showFor: ["admin", "user", "HOD"],
      isSubmenu: true,
      isOpen: isResourceMenuOpen,
      setIsOpen: setIsResourceMenuOpen,
      active: location.pathname.includes("/resource-manager") || location.pathname.includes("/document/") || location.pathname.includes("/subscription/"),
      module: "Document & Substruction",
      subItems: [
        { href: "/resource-manager", label: "Insurance", badge: insuranceBadge, active: location.pathname === "/resource-manager", showFor: ["admin", "user", "HOD"] },
        { href: "/document/car-insurance", label: "Car Insurance", badge: carInsuranceBadge, active: location.pathname === "/document/car-insurance", showFor: ["admin", "user", "HOD"] },
        { href: "/document/renewal", label: "Document Renewal", badge: docRenewalBadge, active: location.pathname === "/document/renewal", showFor: ["admin", "user", "HOD"] },
        /*
        { href: "/subscription/renewal", label: "Subscription Renewal", badge: subRenewalBadge, active: location.pathname === "/subscription/renewal", showFor: ["admin", "user", "HOD"] },
        */
        { href: "/document/shared", label: "Document Shared", badge: docSharedBadge, active: location.pathname === "/document/shared", showFor: ["admin", "user", "HOD"] },
        /*
        { href: "/subscription/approval", label: "Subscription Approval", badge: subApprovalBadge, active: location.pathname === "/subscription/approval", showFor: ["admin", "user", "HOD"] },
        { href: "/subscription/payment", label: "Subscription Payment", badge: subPaymentBadge, active: location.pathname === "/subscription/payment", showFor: ["admin", "user", "HOD"] },
        */
      ]
    },
    {
      label: "Loan",
      icon: Banknote,
      badge: (loanForeclosureCount || 0) + (loanNocCount || 0) || null,
      showFor: ["admin", "user", "HOD"],
      isSubmenu: true,
      isOpen: isLoanMenuOpen,
      setIsOpen: setIsLoanMenuOpen,
      active: location.pathname.includes("/loan/"),
      module: "Document & Substruction",
      subItems: [
         { href: "/loan/all", label: "All Loan", badge: allLoanBadge, active: location.pathname === "/loan/all", showFor: ["admin", "user", "HOD"] },
         { href: "/loan/foreclosure", label: "Request Forecloser", badge: loanForeclosureBadge, active: location.pathname === "/loan/foreclosure", showFor: ["admin", "user", "HOD"] },
         { href: "/loan/noc", label: "Collect NOC", badge: loanNocBadge, active: location.pathname === "/loan/noc", showFor: ["admin", "user", "HOD"] }
      ]
    },
    /*
    {
      href: "/bg/all",
      label: "Bank Guarantee",
      icon: List,
      badge: bgBadge,
      active: location.pathname === "/bg/all",
      showFor: ["admin", "user", "HOD"],
      module: "Document & Substruction",
    },
    */
    {
      href: "/dashboard/setting",
      label: "Settings",
      icon: Settings,
      active: location.pathname.includes("/dashboard/setting") || location.pathname.includes("/settings"),
      showFor: ["admin"],
      module: "Checklist & Delegation",
    },

    // --- HR System Module Routes ---
    {
      href: "/hr/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/hr/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/dashboard",
      label: "HR Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/hr/dashboard" || location.pathname === "/hr",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/employee-master",
      label: "Employee Master",
      icon: UserRound,
      active: location.pathname === "/hr/employee-master",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/salary-structure",
      label: "Salary Structure",
      icon: CreditCard,
      active: location.pathname === "/hr/salary-structure",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/attendance",
      label: "Attendance",
      icon: CalendarCheck,
      active: location.pathname === "/hr/attendance",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/leave-tracker",
      label: "Leave Tracker",
      icon: CalendarIcon,
      active: location.pathname === "/hr/leave-tracker",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/payroll-process",
      label: "Payroll Process",
      icon: RefreshCw,
      active: location.pathname === "/hr/payroll-process",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/net-salary",
      label: "Net Salary",
      icon: DollarSign,
      active: location.pathname === "/hr/net-salary",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/payslip",
      label: "Payslip",
      icon: FileText,
      active: location.pathname === "/hr/payslip",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/create-indent",
      label: "Create Indent",
      icon: CirclePlus,
      active: location.pathname === "/hr/create-indent",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/inventory",
      label: "Inventory",
      icon: ClipboardList,
      active: location.pathname === "/hr/inventory",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    {
      href: "/hr/offer-letter",
      label: "Offer Letter",
      icon: FileText,
      active: location.pathname === "/hr/offer-letter",
      showFor: ["admin", "user", "HOD"],
      module: "HR System",
    },
    // --- Letter Module Routes ---
    {
      href: "/letter/offer-letter",
      label: "Coal Supply Offer Letter",
      icon: FileText,
      active: location.pathname === "/letter/offer-letter",
      showFor: ["admin", "user", "HOD"],
      module: "Letter",
    },
    {
      href: "/letter/work-order",
      label: "Work Order",
      icon: FileText,
      active: location.pathname === "/letter/work-order",
      showFor: ["admin", "user", "HOD"],
      module: "Letter",
    },
    // --- Petty Cash Module Routes ---
    {
      href: "/petty-cash/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/petty-cash/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "Petty Cash",
    },
    {
      href: "/petty-cash/dashboard",
      label: "Petty Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/petty-cash/dashboard" || location.pathname === "/petty-cash",
      showFor: ["admin", "user", "HOD"],
      module: "Petty Cash",
    },
    {
      href: "/petty-cash/add-case",
      label: "Add Credit",
      icon: CirclePlus,
      active: location.pathname === "/petty-cash/add-case",
      showFor: ["admin", "user", "HOD"],
      module: "Petty Cash",
      badge: pettyCashBadges["Add Credit"] > 0 ? pettyCashBadges["Add Credit"] : null,
    },
    {
      href: "/petty-cash/expenses",
      label: "Expenses",
      icon: CreditCard,
      active: location.pathname === "/petty-cash/expenses",
      showFor: ["admin", "user", "HOD"],
      module: "Petty Cash",
      badge: pettyCashBadges["Expenses"] > 0 ? pettyCashBadges["Expenses"] : null,
    },
    {
      href: "/petty-cash/ledger",
      label: "Ledger",
      icon: ClipboardList,
      active: location.pathname === "/petty-cash/ledger",
      showFor: ["admin", "user", "HOD"],
      module: "Petty Cash",
      badge: pettyCashBadges["Ledger"] > 0 ? pettyCashBadges["Ledger"] : null,
    },
    {
      href: "/petty-cash/summary",
      label: "Summary",
      icon: Database,
      active: location.pathname === "/petty-cash/summary",
      showFor: ["admin", "user", "HOD"],
      module: "Petty Cash",
    },
    {
      href: "/petty-cash/settings",
      label: "Petty Settings",
      icon: Settings,
      active: location.pathname === "/petty-cash/settings",
      showFor: ["admin"],
      module: "Petty Cash",
    },
    {
      href: "/dashboard/help-slip/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/dashboard/help-slip/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "Help Slip",
    },
    {
      href: "/dashboard/help-slip",
      label: "Help Slip",
      icon: HelpCircle,
      active: location.pathname === "/dashboard/help-slip",
      showFor: ["admin", "user", "HOD"],
      module: "Help Slip",
      badge: helpSlipPendingCount > 0 ? helpSlipPendingCount : null,
    },
    // Global Settings moved to after Daily Scheduler
    // --- Daily Scheduler Module Routes ---
    {
      href: "/daily-scheduler/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/daily-scheduler/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "Daily Scheduler",
    },
    {
      href: "/daily-scheduler/dashboard",
      label: "Scheduler Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/daily-scheduler/dashboard" || location.pathname === "/daily-scheduler",
      showFor: ["admin", "user", "HOD"],
      module: "Daily Scheduler",
      badge: schedulerBadges["Scheduler Dashboard"] > 0 ? schedulerBadges["Scheduler Dashboard"] : null,
    },
    {
      href: "/daily-scheduler/waiting-list",
      label: "Waiting List",
      icon: List,
      active: location.pathname === "/daily-scheduler/waiting-list",
      showFor: ["admin", "user", "HOD"],
      module: "Daily Scheduler",
      badge: schedulerBadges["Waiting List"] > 0 ? schedulerBadges["Waiting List"] : null,
    },
    {
      href: "/daily-scheduler/someday",
      label: "Someday Tasks",
      icon: CalendarIcon,
      active: location.pathname === "/daily-scheduler/someday",
      showFor: ["admin", "user", "HOD"],
      module: "Daily Scheduler",
      badge: schedulerBadges["Someday Tasks"] > 0 ? schedulerBadges["Someday Tasks"] : null,
    },
    {
      href: "/daily-scheduler/calendar",
      label: "Calendar",
      icon: CalendarIcon,
      active: location.pathname === "/daily-scheduler/calendar",
      showFor: ["admin", "user", "HOD"],
      module: "Daily Scheduler",
    },
    {
      href: "/daily-scheduler/reports",
      label: "Reports",
      icon: FileText,
      active: location.pathname === "/daily-scheduler/reports",
      showFor: ["admin", "user", "HOD"],
      module: "Daily Scheduler",
    },
    // --- Transport System Module Routes ---
    {
      href: "/transport-system/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/transport-system/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "Transport Reporting",
    },
    {
      href: "/transport-system/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/transport-system/dashboard" || location.pathname === "/transport-system",
      showFor: ["admin", "user", "HOD"],
      module: "Transport Reporting",
    },
    {
      href: "/transport-system/purchase-truck",
      label: "Purchase Truck",
      icon: Truck,
      active: location.pathname === "/transport-system/purchase-truck",
      showFor: ["admin", "user", "HOD"],
      module: "Transport Reporting",
    },
    {
      href: "/transport-system/fastag",
      label: "Fastag",
      icon: Banknote,
      active: location.pathname === "/transport-system/fastag",
      showFor: ["admin", "user", "HOD"],
      module: "Transport Reporting",
    },
    {
      href: "/transport-system/Challan",
      label: "Challan",
      icon: Shield,
      active: location.pathname === "/transport-system/Challan",
      showFor: ["admin", "user", "HOD"],
      module: "Transport Reporting",
    },
    {
      href: "/transport-system/truck-reports",
      label: "Truck Reports",
      icon: FileText,
      active: location.pathname === "/transport-system/truck-reports",
      showFor: ["admin", "user", "HOD"],
      module: "Transport Reporting",
    },

    // --- Plant ( HDS ) Module Routes ---
    {
      label: "Stock Management",
      href: "/plant/stock",
      icon: Database,
      active: location.pathname === "/plant/stock" || location.pathname === "/plant",
      badge: null,
      module: "Plant ( HDS )",
    },
    {
      label: "Incoming & Outgoing",
      href: "/plant/transfer",
      icon: FileText,
      active: location.pathname === "/plant/transfer",
      badge: null,
      module: "Plant ( HDS )",
    },
    {
      label: "Production 2",
      href: "/plant/production2",
      icon: Database,
      active: location.pathname === "/plant/production2",
      badge: null,
      module: "Plant ( HDS )",
    },
    {
      label: "Sauda Scale",
      href: "/plant/sauda-scale",
      icon: Database,
      active: location.pathname === "/plant/sauda-scale",
      badge: null,
      module: "Plant ( HDS )",
    },
    {
      label: "Sauda Purchase",
      href: "/plant/sauda-purchase",
      icon: Package,
      active: location.pathname === "/plant/sauda-purchase",
      badge: null,
      module: "Plant ( HDS )",
    },
    {
      label: "MIS Report",
      href: "/plant/mis-report",
      icon: FileText,
      active: location.pathname === "/plant/mis-report",
      badge: null,
      module: "Plant ( HDS )",
    },
    // --- Coal System Module Routes ---
    {
      href: "/coal-system/system-flow",
      label: "System Flow",
      icon: GitFork,
      active: location.pathname === "/coal-system/system-flow",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
    },
    {
      href: "/coal-system/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/coal-system/dashboard" || location.pathname === "/coal-system",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
    },
    {
      href: "/coal-system/auction",
      label: "Auction",
      icon: Database,
      active: location.pathname === "/coal-system/auction",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["Auction"] > 0 ? coalBadges["Auction"] : null,
    },
    {
      href: "/coal-system/secl-intimation",
      label: "SECL Intimation",
      icon: FileText,
      active: location.pathname === "/coal-system/secl-intimation",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["SECL Intimation"] > 0 ? coalBadges["SECL Intimation"] : null,
    },
    {
      href: "/coal-system/secl-payment",
      label: "SECL Payment Advice",
      icon: FileText,
      active: location.pathname === "/coal-system/secl-payment",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["SECL Payment Advice"] > 0 ? coalBadges["SECL Payment Advice"] : null,
    },
    {
      href: "/coal-system/sales-order",
      label: "Sales Order",
      icon: FileText,
      active: location.pathname === "/coal-system/sales-order",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["Sales Order"] > 0 ? coalBadges["Sales Order"] : null,
    },

    {
      href: "/coal-system/dispatch",
      label: "Dispatch",
      icon: FileText,
      active: location.pathname === "/coal-system/dispatch",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["Dispatch"] > 0 ? coalBadges["Dispatch"] : null,
    },
    {
      href: "/coal-system/invoice",
      label: "Invoice",
      icon: FileText,
      active: location.pathname === "/coal-system/invoice",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["Invoice"] > 0 ? coalBadges["Invoice"] : null,
    },
      // Transport Payment temporarily hidden from sidebar per user request
      // {
      //   href: "/coal-system/transport-payment",
      //   label: "Transport Payment",
      //   icon: FileText,
      //   active: location.pathname === "/coal-system/transport-payment",
      //   showFor: ["admin", "user", "HOD"],
      //   module: "Coal System",
      //   badge: coalBadges["Transport Payment"] > 0 ? coalBadges["Transport Payment"] : null,
      // },
    {
      href: "/coal-system/refund-lapse",
      label: "Refund / Lapse",
      icon: FileText,
      active: location.pathname === "/coal-system/refund-lapse",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["Refund / Lapse"] > 0 ? coalBadges["Refund / Lapse"] : null,
    },
    {
      href: "/coal-system/sauda-scale",
      label: "Sauda Sale",
      icon: FileText,
      active: location.pathname === "/coal-system/sauda-scale",
      showFor: ["admin", "user", "HOD"],
      module: "Coal System",
      badge: coalBadges["Sauda Sale"] > 0 ? coalBadges["Sauda Sale"] : null,
    },


    {
      href: "/dashboard/global-settings",
      label: "Global Settings",
      icon: Settings2,
      active: location.pathname.includes("/dashboard/global-settings"),
      showFor: ["admin"],
      module: "Global Settings",
    },
  ];

  const getAccessibleDepartments = () => {
    return [];
  };

  // Filter routes based on user role and super admin status
  const getAccessibleRoutes = () => {
    const userRole = localStorage.getItem("role") || "user";
    const username = localStorage.getItem("user-name");
    const isSuperAdminUser = (username || "").toLowerCase() === "admin" || (userRole || "").toLowerCase() === "superadmin";
    const hasCustomPermissions = systemAccess && systemAccess.length > 0;
    
    return routes
      .filter((route) => {
        const userRoleNormalized = (userRole || "user").toLowerCase();
        
        if (isSuperAdminUser) {
            if (route.label === "My Profile") return false;
            return true;
        }

        if (route.label === "Master Dashboard") {
            return false;
        }

        if (hasCustomPermissions) {
           if (route.module === "Profile") return true; 
           if (route.isSubmenu && route.subItems) return true; 

           let mappedLabel = route.label;
           let mappedModule = route.module || "Checklist & Delegation";
           
           if (route.label === "Add Credit") {
               mappedLabel = "Add Credit / Case";
           }
           if (route.label === "Coal Supply Offer Letter") {
               mappedLabel = "Offer Letter";
           }

           const pageKey = `${mappedModule}::${mappedLabel}`;
           return pageAccess && pageAccess.includes(pageKey);
        }

        // Fallback to old behavior
        if (route.label === "Settings" || route.label === "Global Settings") {
          return userRoleNormalized === "admin";
        }
        
        if (route.label === "Holiday") {
            return userRoleNormalized === "admin";
        }
        return route.showFor.some(role => role.toLowerCase() === userRoleNormalized);
      })
      .map(route => {
        if (route.subItems) {
          const userRoleNormalized = (userRole || "user").toLowerCase();
          return {
            ...route,
            subItems: route.subItems.filter(sub => {
                if (isSuperAdminUser) return true;
                if (hasCustomPermissions) {
                    let mappedLabel = sub.label;
                    // We only map Holiday to match the Global Settings page name
                    if (sub.label === "Holiday List" || sub.label === "Working Day Calendar") mappedLabel = "Holiday";

                    const pageKey = `${route.module}::${mappedLabel}`;
                    return pageAccess && pageAccess.includes(pageKey);
                }
                return sub.showFor.some(role => role.toLowerCase() === userRoleNormalized);
            })
          };
        }
        return route;
      })
      .filter(route => !route.isSubmenu || (route.subItems && route.subItems.length > 0));
  };

  // Submenu logic removed

  // Get accessible routes
  const accessibleRoutes = getAccessibleRoutes();

  if (!showLayout) {
    return <>{children}</>;
  }

  return (
    <div
      className={`flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50`}
    >
      {/* Sidebar for desktop */}
      <aside className={`max-md:hidden flex flex-col ${isCollapsed ? 'w-20' : 'w-[242px]'} flex-shrink-0 border-r border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[4px_0_24px_rgba(0,0,0,0.03)] z-40 relative transition-all duration-300`}>
        {/* Floating Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white shadow-xs text-slate-500 hover:text-red-600 hover:border-red-200 hover:scale-105 active:scale-95 transition-all z-[60] cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
        <div className="flex h-[68px] items-center border-b border-slate-100 bg-white relative w-full overflow-hidden shrink-0">
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
          <Link
            to="/master-dashboard"
            className="flex items-center h-full w-full relative group cursor-pointer"
          >
            <div className={`flex w-max ${isCollapsed ? 'justify-center w-full' : 'animate-marquee-seamless'}`}>
              <div className="flex items-center gap-4 shrink-0 pr-6">
                <img src={ganeshLogo} alt="Ganesh" className="h-8 w-auto object-contain rounded-lg shadow-2xs border border-slate-100 p-0.5 bg-white transition-transform hover:scale-105" />
                {!isCollapsed && (
                  <>
                    <img src={askLogo} alt="ASK" className="h-6 max-w-[110px] w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                    <img src={jaiLogostic} alt="Jai Logostic" className="h-7 max-w-[110px] w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                    <img src={jbtLogo} alt="JBT" className="h-7 w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                    <img src={jbeLogo} alt="JBE" className="h-9 w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                    <img src={jblLogo} alt="JBL" className="h-7 w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                  </>
                )}
              </div>
              {/* Duplicated for seamless scrolling */}
              {!isCollapsed && (
                <div className="flex items-center gap-4 shrink-0 pr-6">
                  <img src={ganeshLogo} alt="Ganesh" className="h-8 w-auto object-contain rounded-lg shadow-2xs border border-slate-100 p-0.5 bg-white transition-transform hover:scale-105" />
                  <img src={askLogo} alt="ASK" className="h-6 max-w-[110px] w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                  <img src={jaiLogostic} alt="Jai Logostic" className="h-7 max-w-[110px] w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                  <img src={jbtLogo} alt="JBT" className="h-7 w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                  <img src={jbeLogo} alt="JBE" className="h-9 w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                  <img src={jblLogo} alt="JBL" className="h-7 w-auto object-contain drop-shadow-2xs transition-transform hover:scale-105" />
                </div>
              )}
            </div>
          </Link>
        </div>
        <nav ref={navRef} onScroll={handleNavScroll} className="flex-1 overflow-y-auto px-2.5 py-3 custom-sidebar-scroll space-y-1">
          <ul className="space-y-1">
            {Object.entries(
              accessibleRoutes.reduce((acc, route) => {
                const module = route.module || "Checklist & Delegation";
                if (!acc[module]) acc[module] = [];
                acc[module].push(route);
                return acc;
              }, {})
            ).map(([moduleName, moduleRoutes]) => (
              <div key={moduleName} className="mb-1.5">
                {moduleName === "Master Dashboard" || moduleName === "Profile" || moduleName === "Global Settings" || moduleName === "Rent Management" ? (
                  <Link
                    to={moduleRoutes[0].href}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 text-[13.5px] font-semibold rounded-xl transition-all relative overflow-hidden ${
                      location.pathname.includes(moduleRoutes[0].href)
                        ? 'text-red-600 bg-red-50/80 font-bold border border-red-100/80 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {location.pathname.includes(moduleRoutes[0].href) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-red-600 rounded-r-full"></div>
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        location.pathname.includes(moduleRoutes[0].href)
                          ? 'bg-red-100 text-red-600'
                          : 'bg-slate-100/80 text-slate-500 group-hover:bg-slate-200/60 group-hover:text-slate-700'
                      }`}>
                        {moduleName === "Master Dashboard" && <LayoutDashboard className="h-4 w-4" />}
                        {moduleName === "Profile" && <UserRound className="h-4 w-4" />}
                        {moduleName === "Global Settings" && <Settings2 className="h-4 w-4" />}
                        {moduleName === "Rent Management" && <Banknote className="h-4 w-4" />}
                      </div>
                      {!isCollapsed && <span className="text-left leading-tight truncate">{moduleName}</span>}
                    </div>
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleModule(moduleName)}
                    className={`group w-full flex items-center justify-between px-3 py-2.5 text-[13.5px] font-semibold rounded-xl transition-all relative overflow-hidden cursor-pointer ${
                      openModules[moduleName]
                        ? 'text-slate-900 bg-slate-100/90 font-bold border border-slate-200/60 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`}
                  >
                    {openModules[moduleName] && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-red-600 rounded-r-full"></div>
                    )}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                        openModules[moduleName]
                          ? 'bg-red-50 text-red-600'
                          : 'bg-slate-100/80 text-slate-500 group-hover:bg-slate-200/60 group-hover:text-slate-700'
                      }`}>
                        {moduleName === "Checklist & Delegation" && <ClipboardList className="h-4 w-4" />}
                        {moduleName === "Document & Substruction" && <Database className="h-4 w-4" />}
                        {moduleName === "HR System" && <UserRound className="h-4 w-4" />}
                        {moduleName === "Petty Cash" && <Banknote className="h-4 w-4" />}
                        {moduleName === "Daily Scheduler" && <CalendarCheck className="h-4 w-4" />}
                        {moduleName === "Rent Management Tracker" && <Banknote className="h-4 w-4" />}
                        {moduleName === "Coal System" && <Database className="h-4 w-4" />}
                        {moduleName === "Plant ( HDS )" && <Factory className="h-4 w-4" />}
                        {moduleName === "Letter" && <FileText className="h-4 w-4" />}
                        {moduleName === "Transport Reporting" && <Truck className="h-4 w-4" />}
                        {moduleName === "Help Slip" && <HelpCircle className="h-4 w-4" />}
                      </div>
                      {!isCollapsed && <span className="text-left leading-tight truncate">{moduleName}</span>}
                    </div>
                    {!isCollapsed && (
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {!openModules[moduleName] && (() => {
                          const moduleBadgeTotal = moduleRoutes.reduce((total, route) => {
                            if (route.href === "/dashboard/quick-task") return total;
                            let sum = parseInt(route.badge) || 0;
                            if (route.subItems) {
                              sum += route.subItems.reduce((subTotal, sub) => subTotal + (parseInt(sub.badge) || 0), 0);
                            }
                            return total + sum;
                          }, 0);
                          if (moduleBadgeTotal > 0) {
                            return (
                              <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-2xs shadow-red-500/20">
                                {moduleBadgeTotal}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {openModules[moduleName] ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
                        )}
                      </div>
                    )}
                  </button>
                )}
                {moduleName !== "Master Dashboard" && moduleName !== "Profile" && moduleName !== "Global Settings" && moduleName !== "Rent Management" && openModules[moduleName] && !isCollapsed && (
                  <ul className="mt-1 space-y-0.5 bg-slate-50/80 rounded-xl p-1.5 mb-1.5 border border-slate-200/60 shadow-2xs">
                    {moduleRoutes.map((route) => (
                      <li key={route.label}>
                        {route.isSubmenu ? (
                          <div className="flex flex-col">
                            <button
                              onClick={() => route.setIsOpen(!route.isOpen)}
                              className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                route.active
                                  ? "bg-red-600 text-white shadow-xs shadow-red-500/20"
                                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <route.icon
                                  className={`h-3.5 w-3.5 shrink-0 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`}
                                />
                                <span className="truncate">{route.label}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                {route.badge && (
                                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                                    {route.badge}
                                  </span>
                                )}
                                {route.isOpen ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </div>
                            </button>
                            {route.isOpen && (
                              <ul className="mt-1 ml-3 space-y-0.5 border-l-2 border-slate-200/80 pl-2 py-0.5">
                                {route.subItems.map((sub) => (
                                  <li key={sub.label}>
                                    <Link
                                      to={sub.href}
                                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                                        sub.active
                                          ? "text-red-600 bg-red-50/90 font-bold border border-red-100"
                                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                                      }`}
                                    >
                                      <span className="truncate">{sub.label}</span>
                                      {sub.badge && (
                                        <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center ml-1 shrink-0">
                                          {sub.badge}
                                        </span>
                                      )}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ) : (
                          <Link
                            to={route.href}
                            className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                              route.active
                                ? "bg-red-600 text-white shadow-xs shadow-red-500/20"
                                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <route.icon
                                className={`h-3.5 w-3.5 shrink-0 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`}
                              />
                              <span className="truncate">{route.label}</span>
                            </div>
                            {route.badge && (
                              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center ml-1 shrink-0">
                                {route.badge}
                              </span>
                            )}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </ul>
        </nav>
        <div className="border-t border-slate-200/80 p-3 bg-white shrink-0">
          <div className="bg-slate-50/90 rounded-2xl p-2.5 border border-slate-200/70 shadow-2xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shadow-red-500/20 overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    username ? username.charAt(0).toUpperCase() : "A"
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {username || "admin"}
                    </p>
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-red-100 text-red-700 shrink-0">
                      {userRole.toLowerCase() === "admin"
                        ? isSuperAdmin ? "SUPERADMIN" : "ADMIN"
                        : userRole.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                    {userEmail || "admin@jaibhole.in"}
                  </p>
                </div>
              )}
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile menu button and sidebar - similar structure as desktop but with mobile classes */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute left-3.5 top-3.5 z-[110] text-slate-700 p-2 rounded-xl hover:bg-red-50 hover:text-red-600 active:scale-95 transition-all cursor-pointer"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-[270px] bg-white shadow-[4px_0_24px_rgba(0,0,0,0.15)] flex flex-col">
            <div className="flex h-16 items-center border-b border-slate-100 px-4 bg-white justify-between">
              <Link
                to="/master-dashboard"
                className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <img src={jbtLogo} alt="JBT Logo" className="h-8 w-auto object-contain shrink-0" />
                <div>
                  <span className="text-sm font-black tracking-tight text-slate-900 block leading-tight">
                    Jai Bhole Group
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Enterprise Portal
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2.5 py-3 custom-sidebar-scroll space-y-1 bg-white">
              <ul className="space-y-1">
                {Object.entries(
                  accessibleRoutes.reduce((acc, route) => {
                    const module = route.module || "Checklist & Delegation";
                    if (!acc[module]) acc[module] = [];
                    acc[module].push(route);
                    return acc;
                  }, {})
                ).map(([moduleName, moduleRoutes]) => (
                  <div key={moduleName} className="mb-1.5">
                    {moduleName === "Master Dashboard" || moduleName === "Profile" || moduleName === "Global Settings" || moduleName === "Rent Management" ? (
                      <Link
                        to={moduleRoutes[0].href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`group w-full flex items-center justify-between px-3 py-2.5 text-[13.5px] font-semibold rounded-xl transition-all relative overflow-hidden ${
                          location.pathname.includes(moduleRoutes[0].href)
                            ? 'text-red-600 bg-red-50/80 font-bold border border-red-100/80 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }`}
                      >
                        {location.pathname.includes(moduleRoutes[0].href) && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-red-600 rounded-r-full"></div>
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                            location.pathname.includes(moduleRoutes[0].href)
                              ? 'bg-red-100 text-red-600'
                              : 'bg-slate-100/80 text-slate-500 group-hover:bg-slate-200/60 group-hover:text-slate-700'
                          }`}>
                            {moduleName === "Master Dashboard" && <LayoutDashboard className="h-4 w-4" />}
                            {moduleName === "Profile" && <UserRound className="h-4 w-4" />}
                            {moduleName === "Global Settings" && <Settings2 className="h-4 w-4" />}
                            {moduleName === "Rent Management" && <Banknote className="h-4 w-4" />}
                          </div>
                          <span className="text-left leading-tight truncate">{moduleName}</span>
                        </div>
                      </Link>
                    ) : (
                      <button
                        onClick={() => toggleModule(moduleName)}
                        className={`group w-full flex items-center justify-between px-3 py-2.5 text-[13.5px] font-semibold rounded-xl transition-all relative overflow-hidden cursor-pointer ${
                          openModules[moduleName]
                            ? 'text-slate-900 bg-slate-100/90 font-bold border border-slate-200/60 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }`}
                      >
                        {openModules[moduleName] && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 bg-red-600 rounded-r-full"></div>
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                            openModules[moduleName]
                              ? 'bg-red-50 text-red-600'
                              : 'bg-slate-100/80 text-slate-500 group-hover:bg-slate-200/60 group-hover:text-slate-700'
                          }`}>
                            {moduleName === "Checklist & Delegation" && <ClipboardList className="h-4 w-4" />}
                            {moduleName === "Document & Substruction" && <Database className="h-4 w-4" />}
                            {moduleName === "HR System" && <UserRound className="h-4 w-4" />}
                            {moduleName === "Petty Cash" && <Banknote className="h-4 w-4" />}
                            {moduleName === "Daily Scheduler" && <CalendarCheck className="h-4 w-4" />}
                            {moduleName === "Rent Management Tracker" && <Banknote className="h-4 w-4" />}
                            {moduleName === "Coal System" && <Database className="h-4 w-4" />}
                            {moduleName === "Plant ( HDS )" && <Factory className="h-4 w-4" />}
                            {moduleName === "Letter" && <FileText className="h-4 w-4" />}
                            {moduleName === "Transport Reporting" && <Truck className="h-4 w-4" />}
                            {moduleName === "Help Slip" && <HelpCircle className="h-4 w-4" />}
                          </div>
                          <span className="text-left leading-tight truncate">{moduleName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          {!openModules[moduleName] && (() => {
                            const moduleBadgeTotal = moduleRoutes.reduce((total, route) => {
                              if (route.href === "/dashboard/quick-task") return total;
                              let sum = parseInt(route.badge) || 0;
                              if (route.subItems) {
                                sum += route.subItems.reduce((subTotal, sub) => subTotal + (parseInt(sub.badge) || 0), 0);
                              }
                              return total + sum;
                            }, 0);
                            if (moduleBadgeTotal > 0) {
                              return (
                                <span className="bg-gradient-to-r from-red-500 to-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-2xs shadow-red-500/20">
                                  {moduleBadgeTotal}
                                </span>
                              );
                            }
                            return null;
                          })()}
                          {openModules[moduleName] ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          )}
                        </div>
                      </button>
                    )}
                    {moduleName !== "Profile" && moduleName !== "Global Settings" && moduleName !== "Rent Management" && openModules[moduleName] && (
                      <ul className="mt-1 space-y-0.5 bg-slate-50/80 rounded-xl p-1.5 mb-1.5 border border-slate-200/60 shadow-2xs">
                        {moduleRoutes.map((route) => (
                          <li key={route.label}>
                            {route.isSubmenu ? (
                              <div className="flex flex-col">
                                <button
                                  onClick={() => route.setIsOpen(!route.isOpen)}
                                  className={`group flex items-center justify-between w-full rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                                    route.active
                                      ? "bg-red-600 text-white shadow-xs shadow-red-500/20"
                                      : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <route.icon
                                      className={`h-3.5 w-3.5 shrink-0 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`}
                                    />
                                    <span className="truncate">{route.label}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-1">
                                    {route.badge && (
                                      <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center">
                                        {route.badge}
                                      </span>
                                    )}
                                    {route.isOpen ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </div>
                                </button>
                                {route.isOpen && (
                                  <ul className="mt-1 ml-3 space-y-0.5 border-l-2 border-slate-200/80 pl-2 py-0.5">
                                    {route.subItems.map((sub) => (
                                      <li key={sub.label}>
                                        <Link
                                          to={sub.href}
                                          className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
                                            sub.active
                                              ? "text-red-600 bg-red-50/90 font-bold border border-red-100"
                                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                                          }`}
                                          onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                          <span className="truncate">{sub.label}</span>
                                          {sub.badge && (
                                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center ml-1 shrink-0">
                                              {sub.badge}
                                            </span>
                                          )}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ) : (
                              <Link
                                to={route.href}
                                className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-semibold transition-all duration-150 ${
                                  route.active
                                    ? "bg-red-600 text-white shadow-xs shadow-red-500/20"
                                    : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                                }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <route.icon
                                    className={`h-3.5 w-3.5 shrink-0 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-700"}`}
                                  />
                                  <span className="truncate">{route.label}</span>
                                </div>
                                {route.badge && (
                                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full min-w-[16px] text-center ml-1 shrink-0">
                                    {route.badge}
                                  </span>
                                )}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </ul>
            </nav>
            <div className="border-t border-slate-200/80 p-3 bg-white shrink-0">
              <div className="bg-slate-50/90 rounded-2xl p-2.5 border border-slate-200/70 shadow-2xs space-y-2">
                <div className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shadow-red-500/20 overflow-hidden">
                      {profileImage ? (
                        <img src={profileImage} alt={username} className="h-full w-full object-cover" />
                      ) : (
                        username ? username.charAt(0).toUpperCase() : "A"
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                        {username || "admin"}
                      </p>
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded-md bg-red-100 text-red-700 shrink-0">
                        {userRole.toLowerCase() === "admin"
                          ? isSuperAdmin ? "SUPERADMIN" : "ADMIN"
                          : userRole.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                      {userEmail || "admin@jaibhole.in"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5 shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 md:px-6 shadow-2xs z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              className="flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Toggle Sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex flex-col">
            {(() => {
              const { module: activeModule, page: activePage } = getHeaderTitle(location.pathname, routes);
              return (
                <>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    {activePage}
                  </h1>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em] -mt-1 hidden sm:block">
                    {activeModule}
                  </p>
                </>
              );
            })()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Welcome</span>
              <span className="text-sm font-black text-red-700 -mt-1">Hello, {username || 'User'}</span>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-red-500 to-red-600 flex items-center justify-center shadow-lg border-2 border-white ring-2 ring-red-100/50 overflow-hidden">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={username}
                  className="h-full w-full object-cover"
                  onError={() => {
                    console.error("❌ AdminLayout Image Failed to Load:", profileImage);
                    setProfileImage(""); // Fallback to initials
                  }}
                />
              ) : (
                <span className="text-white text-sm font-black uppercase">{username ? username.charAt(0) : 'U'}</span>
              )}
            </div>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto overflow-x-hidden ${noPadding ? 'pb-5' : 'px-4 pb-4 md:px-6 md:pb-6'} bg-gradient-to-br from-red-50/50 to-red-50/50 ${noPadding ? '' : 'pb-24 md:pb-6'}`}>
          {children}
        </main>

        <div className="bg-gradient-to-r from-red-600 to-red-700 h-5 flex items-center justify-center px-4 shadow-md z-40">
          <a
            href="https://www.botivate.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] text-white/90 font-medium tracking-[0.2em] uppercase hover:underline hover:text-white transition-colors"
          >
            Powered by <span className="font-bold">Botivate</span>
          </a>
        </div>



        {/* User Popup */}
        {isUserPopupOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 transition-all duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-[340px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/50">
              {/* Header Gradient */}
              <div className="h-32 bg-gradient-to-br from-red-600 via-red-700 to-red-800 relative">
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]"></div>
                <button
                  onClick={() => setIsUserPopupOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-all hover:rotate-90 z-10"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Profile Info */}
              <div className="px-8 pb-8 text-center bg-white">
                <div className="relative -mt-16 mb-6 flex justify-center">
                  <div className="h-28 w-28 rounded-full bg-white p-1.5 shadow-2xl ring-4 ring-white/30">
                    <div className="h-full w-full rounded-full bg-gradient-to-tr from-red-500 to-red-600 flex items-center justify-center overflow-hidden border-2 border-white shadow-inner">
                      {profileImage ? (
                        <img src={profileImage} alt={username} className="h-full w-full object-cover transform hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <span className="text-4xl font-black text-white uppercase tracking-tighter">
                          {username ? username.charAt(0) : "U"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-1">
                      {username || "User"}
                    </h3>
                    <div className="flex justify-center flex-wrap gap-2">
                      <span className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] px-3 py-1 bg-red-50 rounded-full border border-red-100/50">
                        {userRole?.toLowerCase() === "admin" ? (isSuperAdmin ? "Super Admin" : "Administrator") : userRole?.toLowerCase() === "hod" ? "HOD / Supervisor" : "Staff"}
                      </span>
                    </div>
                  </div>

                  <div className="py-3 px-4 bg-gray-50 rounded-2xl flex items-center justify-center gap-2 border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-bold text-gray-500 truncate">{userEmail || "user@example.com"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setIsUserPopupOpen(false)}
                    className="flex justify-center items-center py-3.5 px-4 rounded-2xl text-xs font-black text-gray-400 border-2 border-gray-50 hover:bg-gray-50 hover:text-gray-600 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-[0_10px_20px_-5px_rgba(220,38,38,0.4)] hover:shadow-red-200 transition-all active:scale-95 uppercase tracking-widest"
                  >
                    Logout <LogOut size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
