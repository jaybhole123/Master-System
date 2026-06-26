import React from "react";
import { Link } from "react-router-dom";
import { Database, FileText, CheckSquare, List, Home, Bell } from "lucide-react";
import AdminLayout from "../components/layout/AdminLayout";

export default function MasterDashboard() {
  const username = localStorage.getItem("user-name") || "User";
  const userRole = localStorage.getItem("role") || "user";

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-700 to-purple-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl md:text-4xl font-black mb-2">Welcome to Jay Bhole, {username}!</h1>
            <p className="text-blue-100 text-lg max-w-2xl">
              Access your modules securely from one central hub. Select a module below to manage your operations.
            </p>
          </div>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Checklist & Delegation Module Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-blue-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CheckSquare size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Checklist & Delegation</h2>
                <p className="text-sm text-gray-500">Task assignments, MIS reports, and scheduling</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Assign and track tasks
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Manage delegation flow
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> View working calendars
              </div>
            </div>

            <Link 
              to="/dashboard/admin"
              className="flex items-center justify-center w-full py-3 px-4 bg-blue-50 text-blue-700 font-semibold rounded-xl hover:bg-blue-600 hover:text-white transition-colors"
            >
              Open Module
            </Link>
          </div>

          {/* Document & Substruction Module Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-purple-100 hover:shadow-lg transition-all duration-300 group">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <FileText size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 group-hover:text-purple-700 transition-colors">Document & Substruction</h2>
                <p className="text-sm text-gray-500">Resource manager, loans, and subscriptions</p>
              </div>
            </div>
            
            <div className="space-y-3 mb-8">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Track document renewals
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Manage subscriptions & payments
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div> Loan foreclosures & NOCs
              </div>
            </div>

            <Link 
              to="/doc-dashboard"
              className="flex items-center justify-center w-full py-3 px-4 bg-purple-50 text-purple-700 font-semibold rounded-xl hover:bg-purple-600 hover:text-white transition-colors"
            >
              Open Module
            </Link>
          </div>

        </div>

      </div>
    </AdminLayout>
  );
}
