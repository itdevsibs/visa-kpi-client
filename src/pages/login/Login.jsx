import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";

import { apiPost } from "../../lib/axios/api";
import { saveAuth } from "../../lib/axios/api-template";
import { useUser } from "../../services/context/UserContext";

const Login = () => {

  const navigate = useNavigate();
  const { login } = useUser();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    sibs_id: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await apiPost("/users/login", formData);

      if (!res.success) {
        alert(res.message);
        return;
      }

      saveAuth(res.token, res.user);
      login(res.token, res.user);

      navigate("/dashboard");
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
        "Invalid SIBS ID or password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

      <div className="w-full max-w-md">

        <div className="bg-white rounded-2xl shadow-2xl p-8">

          {/* Logo */}

          <div className="flex justify-center mb-5">

            <div className="h-20 w-20 rounded-full bg-blue-700 flex items-center justify-center text-white text-3xl font-bold">
              US
            </div>

          </div>

          {/* Title */}

          <h1 className="text-3xl font-bold text-center text-slate-800">
            US Visa KPI
          </h1>

          <p className="text-center text-gray-500 mt-2 mb-8">
            Sign in to continue
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}

            <div>

              <label className="text-sm font-medium text-gray-700">
                Username
              </label>

              <div className="mt-2 relative">

                <User
                  size={20}
                  className="absolute left-3 top-3 text-gray-400"
                />

                <input
                  type="text"
                  name="sibs_id"
                  value={formData.sibs_id}
                  onChange={handleChange}
                  placeholder="Enter SIBS ID"
                  className="w-full pl-10 pr-4 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />

              </div>

            </div>

            {/* Password */}

            <div>

              <label className="text-sm font-medium text-gray-700">
                Password
              </label>

              <div className="mt-2 relative">

                <Lock
                  size={20}
                  className="absolute left-3 top-3 text-gray-400"
                />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-12 py-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-500"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>

              </div>

            </div>

            {/* Remember */}

            <div className="flex justify-between items-center">

              <label className="flex items-center gap-2 text-sm text-gray-600">

                <input
                  type="checkbox"
                  className="rounded"
                />

                Remember Me

              </label>

              <button
                type="button"
                className="text-sm text-blue-700 hover:underline"
              >
                Forgot Password?
              </button>

            </div>

            {/* Login Button */}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white py-3 rounded-lg font-semibold transition duration-300"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            © 2026 SiBS US Visa KPI Dashboard
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;