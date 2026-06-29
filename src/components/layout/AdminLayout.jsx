"use client";


import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotifications } from "../../redux/slice/notificationSlice";
import supabase from "../../SupabaseClient";
import jbtLogo from "../../assets/jbt.png";
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
  Shield
} from "lucide-react";

// Helper: get module & page title from current pathname
const getHeaderTitle = (pathname, routes) => {
  // Check Profile
  if (pathname.includes("/dashboard/profile")) return { module: "Profile", page: "My Profile" };
  // Check Global Settings
  if (pathname.includes("/dashboard/global-settings")) return { module: "Global Settings", page: "Global Settings" };
  // Check Document & Substruction routes
  if (
    pathname.includes("/doc-dashboard") ||
    pathname.includes("/resource-manager") ||
    pathname.includes("/document/") ||
    pathname.includes("/subscription/") ||
    pathname.includes("/loan/") ||
    pathname.includes("/bg/")
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

export default function AdminLayout({ children, darkMode, toggleDarkMode, showLayout = true }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { list: notifications } = useSelector((state) => state.notifications);
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Get data from Document Store
  const { documents, subscriptions, loans, bgs, shareHistory } = useDataStore();

  const docRenewalCount = documents.filter(doc => doc.needsRenewal).length || null;
  const subRenewalCount = subscriptions.filter(sub => sub.planned1 && sub.planned1.trim() !== '' && (!sub.actual1 || sub.actual1.trim() === '')).length || null;
  const subApprovalCount = subscriptions.filter(sub => sub.planned2 && sub.planned2.trim() !== '' && (!sub.actual2 || sub.actual2.trim() === '')).length || null;
  const subPaymentCount = subscriptions.filter(sub => sub.planned3 && sub.planned3.trim() !== '' && (!sub.actual3 || sub.actual3.trim() === '')).length || null;

  const loanForeclosureCount = loans.filter(loan => loan.planned1 && loan.planned1.trim() !== '' && (!loan.actual1 || loan.actual1.trim() === '') && loan.sn?.startsWith('SN-')).length || null;
  const loanNocCount = loans.filter(loan => loan.planned2 && loan.planned2.trim() !== '' && (!loan.actual2 || loan.actual2.trim() === '')).length || null;

  const resourceManagerBadge = ((docRenewalCount || 0) + (subRenewalCount || 0) + (subApprovalCount || 0) + (subPaymentCount || 0)) || null;
  const loanBadge = ((loanForeclosureCount || 0) + (loanNocCount || 0)) || null;

  const [isUserPopupOpen, setIsUserPopupOpen] = useState(false);

  // States for Document Submenus
  const [isResourceMenuOpen, setIsResourceMenuOpen] = useState(false);
  const [isLoanMenuOpen, setIsLoanMenuOpen] = useState(false);

  // State for Module Accordions
  const [openModules, setOpenModules] = useState(() => {
    const path = location.pathname;
    return {
      "Profile": path.includes("/dashboard/profile"),
      "Checklist & Delegation": path.includes("/dashboard") && !path.includes("/dashboard/profile") && !path.includes("/dashboard/global-settings"),
      "Document & Substruction": path.includes("/document") || path.includes("/doc-dashboard") || path.includes("/resource-manager") || path.includes("/loan") || path.includes("/subscription") || path.includes("/bg") || path === "/",
    };
  });

  const toggleModule = (moduleName) => {
    setOpenModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
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
    setIsSuperAdmin(storedUsername.toLowerCase() === "admin");

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
            console.log("✅ Profile image synced from DB:", data.profile_image);
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

    console.log("AdminLayout - Profile Image URL (Cached):", cachedImage);

    // Check if this is the super admin (username = 'admin')
    const normalizedUsername = (storedUsername || "").toLowerCase();
    setIsSuperAdmin(normalizedUsername === "admin");
  }, [navigate, location.pathname]);

  // Fetch page counts for sidebar badges
  useEffect(() => {
    const fetchCounts = async () => {
      if (!username) return;
      const role = (userRole || "").toLowerCase();
      const isAdmin = role === "admin" || username.toLowerCase() === "admin";
      
      // Checklist Count
      let chkQuery = supabase.from('checklist').select('*', { count: 'exact', head: true })
          .is('submission_date', null)
          .is('status', null);
      if (!isAdmin) chkQuery = chkQuery.ilike('name', username);
      const { count: checklistCount } = await chkQuery;

      // Delegation Count
      let delQuery = supabase.from('delegation').select('*', { count: 'exact', head: true })
          .or('submission_date.is.null,status.neq.done');
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
      href: "/dashboard/global-settings",
      label: "Global Settings",
      icon: Settings2,
      active: location.pathname.includes("/dashboard/global-settings"),
      showFor: ["admin"],
      module: "Global Settings",
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
      badge: pageCounts.taskManager,
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
      href: "/doc-dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      active: location.pathname === "/doc-dashboard" || location.pathname === "/",
      showFor: ["admin", "user", "HOD"],
      module: "Document & Substruction",
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
        { href: "/resource-manager", label: "All Resources", badge: documents?.length || null, active: location.pathname === "/resource-manager", showFor: ["admin", "user", "HOD"] },
        { href: "/document/renewal", label: "Document Renewal", badge: docRenewalCount, active: location.pathname === "/document/renewal", showFor: ["admin", "user", "HOD"] },
        { href: "/subscription/renewal", label: "Subscription Renewal", badge: subRenewalCount, active: location.pathname === "/subscription/renewal", showFor: ["admin", "user", "HOD"] },
        { href: "/document/shared", label: "Document Shared", badge: shareHistory?.length || null, active: location.pathname === "/document/shared", showFor: ["admin", "user", "HOD"] },
        { href: "/subscription/approval", label: "Subscription Approval", badge: subApprovalCount, active: location.pathname === "/subscription/approval", showFor: ["admin", "user", "HOD"] },
        { href: "/subscription/payment", label: "Subscription Payment", badge: subPaymentCount, active: location.pathname === "/subscription/payment", showFor: ["admin", "user", "HOD"] },
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
         { href: "/loan/all", label: "All Loan", badge: loans?.length || null, active: location.pathname === "/loan/all", showFor: ["admin", "user", "HOD"] },
         { href: "/loan/foreclosure", label: "Request Forecloser", badge: loanForeclosureCount, active: location.pathname === "/loan/foreclosure", showFor: ["admin", "user", "HOD"] },
         { href: "/loan/noc", label: "Collect NOC", badge: loanNocCount, active: location.pathname === "/loan/noc", showFor: ["admin", "user", "HOD"] }
      ]
    },
    {
      href: "/bg/all",
      label: "Bank Guarantee",
      icon: List,
      badge: bgs?.length || null,
      active: location.pathname === "/bg/all",
      showFor: ["admin", "user", "HOD"],
      module: "Document & Substruction",
    },
    {
      href: "/dashboard/setting",
      label: "Settings",
      icon: Settings,
      active: location.pathname.includes("/dashboard/setting") || location.pathname.includes("/settings"),
      showFor: ["admin"],
      module: "Checklist & Delegation",
    }
  ];

  const getAccessibleDepartments = () => {
    return [];
  };

  // Filter routes based on user role and super admin status
  const getAccessibleRoutes = () => {
    const userRole = localStorage.getItem("role") || "user";
    const username = localStorage.getItem("user-name");
    const isSuperAdminUser = (username || "").toLowerCase() === "admin";
    const hasCustomPermissions = systemAccess && systemAccess.length > 0;
    
    return routes
      .filter((route) => {
        const userRoleNormalized = (userRole || "user").toLowerCase();
        
        if (isSuperAdminUser) return true;

        if (hasCustomPermissions) {
           if (route.module === "Profile") return true; 
           if (route.isSubmenu && route.subItems) return true; 

           let mappedLabel = route.label;
           let mappedModule = route.module || "Checklist & Delegation";
           
           if (route.label === "Global Settings") {
               mappedModule = "Checklist & Delegation";
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
      <aside className="hidden w-56 flex-shrink-0 border-r border-slate-100 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.06)] md:flex md:flex-col z-20 relative">
        <div className="flex h-16 items-center border-b border-slate-100 px-4 bg-white">
          <Link
            to="/master-dashboard"
            className="flex items-center gap-3 hover:opacity-90 transition-opacity"
          >
            <img src={jbtLogo} alt="JBT Logo" className="h-9 w-auto object-contain shrink-0" />
            <span className="text-sm font-bold tracking-tight leading-tight text-slate-800 whitespace-nowrap">
              Jay Bhole
            </span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {Object.entries(
              accessibleRoutes.reduce((acc, route) => {
                const module = route.module || "Checklist & Delegation";
                if (!acc[module]) acc[module] = [];
                acc[module].push(route);
                return acc;
              }, {})
            ).map(([moduleName, moduleRoutes]) => (
              <div key={moduleName} className="mb-4">
                {moduleName === "Profile" || moduleName === "Global Settings" ? (
                  <Link
                    to={moduleRoutes[0].href}
                    className={`group w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold rounded-xl transition-all relative overflow-hidden ${location.pathname.includes(moduleRoutes[0].href) ? 'text-red-600 bg-slate-100' : 'text-slate-600 hover:text-red-600 hover:bg-slate-50'}`}
                  >
                    {location.pathname.includes(moduleRoutes[0].href) && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-red-600 rounded-r-full"></div>
                    )}
                    <div className="flex items-center gap-3 overflow-hidden">
                      {moduleName === "Profile" && <UserRound className="h-5 w-5 shrink-0" />}
                      {moduleName === "Global Settings" && <Settings2 className="h-5 w-5 shrink-0" />}
                      <span className="text-left leading-tight truncate">{moduleName}</span>
                    </div>
                  </Link>
                ) : (
                  <button
                    onClick={() => toggleModule(moduleName)}
                    className={`group w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold rounded-xl transition-all relative overflow-hidden ${openModules[moduleName] ? 'text-red-600 bg-slate-100' : 'text-slate-600 hover:text-red-600 hover:bg-slate-50'}`}
                  >
                    {openModules[moduleName] && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-red-600 rounded-r-full"></div>
                    )}
                    <div className="flex items-center gap-3 overflow-hidden">
                      {moduleName === "Checklist & Delegation" && <ClipboardList className="h-5 w-5 shrink-0" />}
                      {moduleName === "Document & Substruction" && <Database className="h-5 w-5 shrink-0" />}
                      <span className="text-left leading-tight truncate">{moduleName}</span>
                    </div>
                    <div className="flex items-center gap-2">
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
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {moduleBadgeTotal}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      {openModules[moduleName] ? (
                        <ChevronDown className="h-4 w-4 shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      )}
                    </div>
                  </button>
                )}
                {moduleName !== "Profile" && openModules[moduleName] && moduleRoutes.map((route) => (
                  <li key={route.label}>
                {route.isSubmenu ? (
                  <div className="flex flex-col">
                    <button
                      onClick={() => route.setIsOpen(!route.isOpen)}
                      className={`group flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${route.active
                        ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <route.icon
                          className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{route.label}</span>
                          {route.badge && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {route.badge}
                            </span>
                          )}
                        </div>
                      </div>
                      {route.isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                    {route.isOpen && (
                      <ul className="mt-1 ml-4 space-y-1 border-l-2 border-slate-100 pl-2">
                        {route.subItems.map((sub) => (
                          <li key={sub.label}>
                            <Link
                              to={sub.href}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${sub.active
                                ? "text-red-700 bg-red-50 font-bold"
                                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{sub.label}</span>
                                {sub.badge && (
                                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {sub.badge}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    to={route.href}
                    className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${route.active
                      ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                  >
                    <route.icon
                      className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}
                    />
                    <div className="flex items-center justify-between w-full">
                      <span>{route.label}</span>
                      {route.badge && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                          {route.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
                  </li>
                ))}
              </div>
            ))}
          </ul>
        </nav>
      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="flex flex-col">
          {/* User info section */}
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                  {profileImage ? (
                    <img src={profileImage} alt={username} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-slate-600">
                      {username ? username.charAt(0).toUpperCase() : "U"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate leading-tight mb-0.5">
                    {username || "User"}{" "}
                    {userRole.toLowerCase() === "admin"
                      ? isSuperAdmin
                        ? "(Super Admin)"
                        : "(Admin)"
                      : userRole.toLowerCase() === "hod"
                        ? "(HOD)"
                        : ""}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate leading-tight">
                    {userEmail || "user@example.com"}
                  </p>
                </div>
              </div>

              {/* Dark mode toggle (if available) */}
              {toggleDarkMode && (
                <button
                  onClick={toggleDarkMode}
                  className="text-blue-700 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100"
                >
                  {darkMode ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    </svg>
                  )}
                  <span className="sr-only">
                    {darkMode ? "Light mode" : "Dark mode"}
                  </span>
                </button>
              )}
            </div>

          {/* Logout button positioned below user info */}
          <div className="mt-2 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full text-slate-600 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors border border-transparent hover:border-red-100"
            >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button and sidebar - similar structure as desktop but with mobile classes */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden absolute left-4 top-3 z-[110] text-blue-700 p-2 rounded-md hover:bg-blue-100"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      {/* Mobile sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          <div className="fixed inset-y-0 left-0 w-56 bg-white shadow-[4px_0_24px_rgba(0,0,0,0.1)] flex flex-col">
            <div className="flex h-16 items-center border-b border-slate-100 px-4 bg-white justify-end">
              <Link
                to="/master-dashboard"
                className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <img src={jbtLogo} alt="JBT Logo" className="h-9 w-auto object-contain shrink-0" />
                <span className="text-sm font-bold tracking-tight leading-tight text-slate-800 whitespace-nowrap">
                  Jay Bhole
                </span>
              </Link>
            </div>
            <nav className="flex-1 overflow-y-auto p-2 bg-white">
              <ul className="space-y-1">
                {Object.entries(
                  accessibleRoutes.reduce((acc, route) => {
                    const module = route.module || "Checklist & Delegation";
                    if (!acc[module]) acc[module] = [];
                    acc[module].push(route);
                    return acc;
                  }, {})
                ).map(([moduleName, moduleRoutes]) => (
                  <div key={moduleName} className="mb-4">
                    {moduleName === "Profile" || moduleName === "Global Settings" ? (
                      <Link
                        to={moduleRoutes[0].href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`group w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold rounded-xl transition-all relative overflow-hidden ${location.pathname.includes(moduleRoutes[0].href) ? 'text-red-600 bg-slate-100' : 'text-slate-600 hover:text-red-600 hover:bg-slate-50'}`}
                      >
                        {location.pathname.includes(moduleRoutes[0].href) && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-red-600 rounded-r-full"></div>
                        )}
                        <div className="flex items-center gap-3 overflow-hidden">
                          {moduleName === "Profile" && <UserRound className="h-5 w-5 shrink-0" />}
                          {moduleName === "Global Settings" && <Settings2 className="h-5 w-5 shrink-0" />}
                          <span className="text-left leading-tight truncate">{moduleName}</span>
                        </div>
                      </Link>
                    ) : (
                      <button
                        onClick={() => toggleModule(moduleName)}
                        className={`group w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold rounded-xl transition-all relative overflow-hidden ${openModules[moduleName] ? 'text-red-600 bg-slate-100' : 'text-slate-600 hover:text-red-600 hover:bg-slate-50'}`}
                      >
                        {openModules[moduleName] && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-2/3 w-1.5 bg-red-600 rounded-r-full"></div>
                        )}
                        <div className="flex items-center gap-3 overflow-hidden">
                          {moduleName === "Checklist & Delegation" && <ClipboardList className="h-5 w-5 shrink-0" />}
                          {moduleName === "Document & Substruction" && <Database className="h-5 w-5 shrink-0" />}
                          <span className="text-left leading-tight truncate">{moduleName}</span>
                        </div>
                        {openModules[moduleName] ? (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" />
                        )}
                      </button>
                    )}
                    {moduleName !== "Profile" && openModules[moduleName] && moduleRoutes.map((route) => (
                      <li key={route.label}>
                    {route.isSubmenu ? (
                      <div className="flex flex-col">
                        <button
                          onClick={() => route.setIsOpen(!route.isOpen)}
                          className={`group flex items-center justify-between w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${route.active
                            ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <route.icon
                              className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}
                            />
                            {route.label}
                          </div>
                          {route.isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        {route.isOpen && (
                          <ul className="mt-1 ml-4 space-y-1 border-l-2 border-red-50 pl-2">
                            {route.subItems.map((sub) => (
                              <li key={sub.label}>
                                <Link
                                  to={sub.href}
                                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200 ${sub.active
                                    ? "text-red-700 bg-red-50 font-bold"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    }`}
                                  onClick={() => setIsMobileMenuOpen(false)}
                                >
                                  {sub.label}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <Link
                        to={route.href}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${route.active
                          ? "bg-red-600 text-white shadow-md shadow-red-500/20"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <route.icon
                          className={`h-4 w-4 ${route.active ? "text-white" : "text-slate-400 group-hover:text-slate-600"}`}
                        />
                        <div className="flex items-center justify-between w-full">
                          <span>{route.label}</span>
                          {route.badge && (
                            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                              {route.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    )}
                      </li>
                    ))}
                  </div>
                ))}
              </ul>
            </nav>
            <div className="border-t border-slate-200 p-3 bg-white">
              <div className="flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 shrink-0">
                      {profileImage ? (
                        <img src={profileImage} alt={username} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-slate-600">
                          {username ? username.charAt(0).toUpperCase() : "U"}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate leading-tight mb-0.5">
                        {username || "User"}{" "}
                        {userRole === "admin"
                          ? isSuperAdmin
                            ? "(Super Admin)"
                            : "(Admin)"
                          : userRole === "HOD"
                            ? "(HOD)"
                            : ""}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate leading-tight">
                        {userEmail || "user@example.com"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {toggleDarkMode && (
                      <button
                        onClick={toggleDarkMode}
                        className="text-slate-500 hover:text-slate-800 p-1 rounded-full hover:bg-slate-100"
                      >
                        {darkMode ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20.354 15.354A9 9 0 018.646 3.646A9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                          </svg>
                        )}
                        <span className="sr-only">
                          {darkMode ? "Light mode" : "Dark mode"}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 w-full text-slate-600 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors border border-transparent hover:border-red-100"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-purple-100 bg-white px-4 md:px-6 shadow-sm z-30">
          <div className="flex md:hidden w-8"></div>
          <div className="flex flex-col items-center">
            {(() => {
              const { module: activeModule, page: activePage } = getHeaderTitle(location.pathname, routes);
              return (
                <>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    {activePage}
                  </h1>
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em] -mt-1 hidden xs:block">
                    {activeModule}
                  </p>
                </>
              );
            })()}
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

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 md:px-6 md:pb-6 bg-gradient-to-br from-red-50/50 to-red-50/50 pb-24 md:pb-6">
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
