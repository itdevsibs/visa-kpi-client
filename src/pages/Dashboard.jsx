import { LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useUser } from "../services/context/UserContext";

const Dashboard = () => {
  const navigate = useNavigate();

  const { user, logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between px-6">

          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              US Visa KPI Dashboard
            </h1>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            <LogOut size={18} />
            Logout
          </button>

        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-8">

        <div className="bg-white rounded-xl shadow p-6">

          <div className="flex items-center gap-4">

            <div className="h-16 w-16 rounded-full bg-blue-700 text-white flex items-center justify-center">
              <User size={30} />
            </div>

            <div>

              <h2 className="text-2xl font-bold">
                Welcome,
                {" "}
                {user?.first_name || user?.firstName || "User"}
              </h2>

              <p className="text-gray-500">
                SIBS ID :
                {" "}
                {user?.sibs_id || "-"}
              </p>

              <p className="text-gray-500">
                Role :
                {" "}
                {user?.role || "-"}
              </p>

            </div>

          </div>

        </div>

        {/* KPI Cards */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-8">

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">Total Employees</h3>
            <p className="text-4xl font-bold text-blue-700 mt-2">0</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">Pending Visa</h3>
            <p className="text-4xl font-bold text-orange-500 mt-2">0</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">Approved Visa</h3>
            <p className="text-4xl font-bold text-green-600 mt-2">0</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-gray-500">Expired Visa</h3>
            <p className="text-4xl font-bold text-red-600 mt-2">0</p>
          </div>

        </div>

        {/* Placeholder */}

        <div className="bg-white rounded-xl shadow p-6 mt-8">

          <h2 className="text-xl font-semibold mb-4">
            Dashboard Overview
          </h2>

          <div className="h-72 flex items-center justify-center border-2 border-dashed rounded-lg text-gray-400">
            Charts and KPI reports will appear here.
          </div>

        </div>

      </main>

    </div>
  );
};

export default Dashboard;