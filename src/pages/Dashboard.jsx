import { User } from "lucide-react";

import Header from "../components/layout/Header";
import Sidebar from "../components/layout/Sidebar";
import { useUser } from "../services/context/UserContext";

const Dashboard = () => {
  const { user } = useUser();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#041f3d]">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Blue Blob */}
        <div className="animate-blueBlob absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-blue-600/40 blur-3xl" />

        {/* Orange Blob */}
        <div className="animate-orangeBlob absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-orange-500/40 blur-3xl" />

        {/* Center Glow */}
        <div className="absolute left-1/2 top-1/2 h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/20 blur-3xl animate-pulse" />

        {/* Extra Blue */}
        <div className="animate-blueBlob absolute bottom-0 left-1/3 h-[250px] w-[250px] rounded-full bg-sky-400/20 blur-3xl" />

        {/* Extra Orange */}
        <div className="animate-orangeBlob absolute right-1/3 top-10 h-[220px] w-[220px] rounded-full bg-orange-400/20 blur-3xl" />
      </div>

      {/* Layout */}
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Right Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <Header title="US Visa KPI Dashboard" />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-8">
            {/* Welcome Card */}
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl">
              <div className="flex items-center gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-orange-500 text-white shadow-lg">
                  <User size={30} />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Welcome,{" "}
                    {user?.first_name ||
                      user?.firstName ||
                      user?.name ||
                      "User"}
                  </h2>

                  <p className="mt-1 text-white/70">
                    SIBS ID : {user?.sibs_id || "-"}
                  </p>

                  <p className="text-white/70">
                    Role : {user?.role || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-blue-500/20">
                <h3 className="text-white/70">
                  Total Employees
                </h3>

                <p className="mt-2 text-4xl font-bold text-blue-400">
                  0
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-orange-500/20">
                <h3 className="text-white/70">
                  Pending Visa
                </h3>

                <p className="mt-2 text-4xl font-bold text-orange-400">
                  0
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-green-500/20">
                <h3 className="text-white/70">
                  Approved Visa
                </h3>

                <p className="mt-2 text-4xl font-bold text-green-400">
                  0
                </p>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 shadow-xl backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-red-500/20">
                <h3 className="text-white/70">
                  Expired Visa
                </h3>

                <p className="mt-2 text-4xl font-bold text-red-400">
                  0
                </p>
              </div>
            </div>

            {/* Dashboard Overview */}
            <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Dashboard Overview
              </h2>

              <div className="flex h-72 items-center justify-center rounded-2xl border-2 border-dashed border-white/20 text-lg text-white/50">
                Charts and KPI reports will appear here.
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;