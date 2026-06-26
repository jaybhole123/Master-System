import React, { useEffect, useState } from "react";
import AdminLayout from "../components/layout/AdminLayout";
import { UserCircle, Mail, Briefcase, Shield } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState({
    username: "",
    email: "",
    role: "",
    designation: "",
  });

  useEffect(() => {
    setUser({
      username: localStorage.getItem("user-name") || "N/A",
      email: localStorage.getItem("email_id") || "N/A",
      role: localStorage.getItem("role") || "N/A",
      designation: localStorage.getItem("designation") || "N/A",
    });
  }, []);

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header Banner */}
          <div className="h-32 bg-gradient-to-r from-red-600 to-red-700 relative"></div>
          
          <div className="px-8 pb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 -mt-16 relative z-10 mb-8">
              {/* Avatar */}
              <div className="h-32 w-32 rounded-full border-4 border-white bg-red-50 flex items-center justify-center shadow-md shrink-0">
                <span className="text-5xl font-black text-red-600 uppercase">
                  {user.username ? user.username.charAt(0) : "U"}
                </span>
              </div>
              
              <div className="mb-2 text-center sm:text-left">
                <h1 className="text-3xl font-bold text-gray-900 capitalize">
                  {user.username}
                </h1>
                <p className="text-gray-500 font-medium uppercase tracking-wider text-sm mt-1 flex items-center justify-center sm:justify-start gap-2">
                  <Shield className="w-4 h-4" />
                  {user.role}
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-10">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Username</p>
                  <p className="font-medium text-gray-900 capitalize">{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Email Address</p>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Designation</p>
                  <p className="font-medium text-gray-900 capitalize">{user.designation}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
