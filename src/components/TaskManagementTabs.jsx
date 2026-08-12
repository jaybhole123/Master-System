"use client"
import React from 'react'
import { ClipboardCheck, Hammer, Wrench, Activity, Users, PlusCircle, ShieldCheck, Send, CheckCircle } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function TaskManagementTabs({ activeTab, setActiveTab }) {
    const navigate = useNavigate();
    const location = useLocation();
    const isMyTask = location.pathname.includes('/my-task');
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const username = (localStorage.getItem("user-name") || "").toLowerCase();
    const isSuperAdmin = role === "superadmin" || username === "admin";
    const designation = (localStorage.getItem("designation") || "").toLowerCase();
    const isMachineOperator = designation.includes("machin") || designation.includes("operat") || designation.includes("oprat");

    const allTabs = [
        { id: 'checklist', label: 'Checklist', icon: ClipboardCheck, color: 'text-red-600', activeColor: 'bg-red-600' },
        { id: 'delegation', label: 'Delegation', icon: Send, color: 'text-blue-600', activeColor: 'bg-blue-600', isRoute: true, route: isMyTask ? '/dashboard/my-task/delegation' : '/dashboard/delegation' },
        { id: 'maintenance', label: 'Maintenance', icon: Hammer, color: 'text-blue-600', activeColor: 'bg-blue-600' },
        { id: 'repair', label: 'Repair', icon: Wrench, color: 'text-orange-600', activeColor: 'bg-orange-600' },
        { id: 'ea', label: 'EA', icon: Users, color: 'text-green-600', activeColor: 'bg-green-600' },
        { id: 'assign-task', label: 'Assign Task', icon: PlusCircle, color: 'text-purple-600', activeColor: 'bg-purple-600', isRoute: true, route: '/dashboard/assign-task', adminOnly: true },
        { id: 'admin-approval', label: 'Admin Approval', icon: ShieldCheck, color: 'text-amber-600', activeColor: 'bg-amber-600', isRoute: true, route: '/dashboard/admin-approval', adminOnly: true },
        { id: 'my-task', label: 'My Task', icon: CheckCircle, color: 'text-red-600', activeColor: 'bg-red-600', isRoute: true, route: '/dashboard/my-task', superAdminOnly: true },
    ]

    const tabs = allTabs.filter(tab => {
        if (tab.adminOnly && !role.includes('admin')) return false;
        if (tab.superAdminOnly && !isSuperAdmin) return false;
        if (tab.id === "maintenance" || tab.id === "repair") return false; // currently disabled based on existing logic
        if (tab.id === 'ea' && !role.includes('admin')) return false;
        if (role === "hod") {
            if (tab.id === "checklist" || tab.id === "delegation") return true;
            if (tab.id === "repair" && isMachineOperator) return true;
            return false;
        }
        return true;
    });

    return (
        <div className="bg-white/40 backdrop-blur-md rounded-2xl p-1.5 border border-gray-100/80 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-start">
                {/* Navigation Tabs */}
                <div className="w-full lg:w-auto overflow-hidden">
                    <div className="flex bg-gray-100/50 p-1 rounded-xl relative overflow-x-auto no-scrollbar max-w-max">
                        {tabs.map((tab) => {
                            let normalizedActive = (activeTab || '').toLowerCase();
                            if (!activeTab && location.pathname.includes(tab.id)) {
                                normalizedActive = tab.id.toLowerCase();
                            }
                            const normalizedId = tab.id.toLowerCase();
                            const isActive = normalizedActive === normalizedId || (normalizedActive === 'default' && normalizedId === 'checklist');
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if (tab.isRoute) {
                                            navigate(tab.route);
                                        } else {
                                            if (setActiveTab) {
                                                setActiveTab(tab.id);
                                            } else {
                                                navigate(isMyTask ? '/dashboard/my-task' : '/dashboard/task', { state: { activeTab: tab.id } });
                                            }
                                        }
                                    }}
                                    className={`
                                        relative flex items-center justify-center gap-2.5 py-2 px-6 rounded-lg text-xs font-bold transition-all duration-500 whitespace-nowrap min-w-[100px] md:min-w-[120px] z-10
                                        ${isActive ? 'text-white' : `text-gray-500 hover:${tab.color}`}
                                    `}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabPillGlobal"
                                            className={`absolute inset-0 rounded-lg shadow-md z-[-1] ${tab.activeColor.replace('bg-', 'bg-')}`}
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <Icon size={isActive ? 17 : 16} className={`${isActive ? 'text-white' : tab.color} transition-colors duration-300`} />
                                    <span className="relative">{tab.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
