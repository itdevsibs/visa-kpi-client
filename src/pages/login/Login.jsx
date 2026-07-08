import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, User } from "lucide-react";

import { apiPost } from "../../lib/axios/api";
import { saveAuth } from "../../lib/axios/api-template";
import { useUser } from "../../services/context/UserContext";
import StatusModal from "../../components/modals/StatusModal";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useUser();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    sibs_id: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const [statusModal, setStatusModal] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const closeStatusModal = () => {
    setStatusModal((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await apiPost("/users/login", formData);

      if (!res.success) {
        setStatusModal({
          open: true,
          type: "error",
          title: "Login Failed",
          message: res.message,
        });

        return;
      }

      saveAuth(res.token, res.user);
      login(res.token, res.user);

      // Navigate immediately after successful login
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error(err);

      setStatusModal({
        open: true,
        type: "error",
        title: "Login Failed",
        message:
          err.response?.data?.message ||
          "Invalid SIBS ID or password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#041f3d] px-4">

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

        {/* Login Card */}

        <div className="relative z-10 w-full max-w-md">

          <div
            className="
              rounded-3xl
              border border-white/15
              bg-white/10
              backdrop-blur-2xl
              shadow-[0_25px_80px_rgba(0,0,0,0.45)]
              ring-1 ring-white/10
              p-8
            "
          >

            {/* Logo */}

            <div className="mb-6 flex justify-center">

              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-xl border border-white/20 shadow-xl">

                <span className="text-3xl font-bold text-white">
                  US
                </span>

              </div>

            </div>

            {/* Title */}

            <h1 className="text-center text-3xl font-bold text-white">
              SiBS US VISA
            </h1>

            <p className="mt-2 mb-8 text-center text-white/70">
              Sign in to continue
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Username */}

              <div>

                <label className="text-sm font-medium text-white/80">
                  Username
                </label>

                <div className="relative mt-2">

                  <User
                    size={20}
                    className="absolute left-3 top-3 text-white/60"
                  />

                  <input
                    type="text"
                    name="sibs_id"
                    value={formData.sibs_id}
                    onChange={handleChange}
                    placeholder="Enter SIBS ID"
                    className="
                      w-full
                      rounded-xl
                      border border-white/20
                      bg-white/10
                      py-3
                      pl-10
                      pr-4
                      text-white
                      placeholder:text-white/40
                      outline-none
                      backdrop-blur-xl
                      transition
                      focus:border-blue-300
                      focus:bg-white/15
                      focus:ring-2
                      focus:ring-blue-400/40
                    "
                    required
                  />

                </div>

              </div>

              {/* Password */}

              <div>

                <label className="text-sm font-medium text-white/80">
                  Password
                </label>

                <div className="relative mt-2">

                  <Lock
                    size={20}
                    className="absolute left-3 top-3 text-white/60"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter password"
                    className="
                      w-full
                      rounded-xl
                      border border-white/20
                      bg-white/10
                      py-3
                      pl-10
                      pr-12
                      text-white
                      placeholder:text-white/40
                      outline-none
                      backdrop-blur-xl
                      transition
                      focus:border-blue-300
                      focus:bg-white/15
                      focus:ring-2
                      focus:ring-blue-400/40
                    "
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-white/60 transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>

                </div>

              </div>

              {/* Remember */}

              <div className="flex items-center justify-between">

                <label className="flex items-center gap-2 text-sm text-white/70">

                  <input
                    type="checkbox"
                    className="rounded"
                  />

                  Remember Me

                </label>

                <button
                  type="button"
                  className="text-sm font-medium text-blue-200 hover:text-white"
                >
                  Forgot Password?
                </button>

              </div>

              {/* Button */}

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full
                  rounded-xl
                  bg-gradient-to-r
                  from-blue-600
                  to-orange-500
                  py-3
                  font-semibold
                  text-white
                  shadow-lg
                  transition-all
                  duration-300
                  hover:scale-[1.02]
                  hover:shadow-blue-500/40
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {loading ? "Signing In..." : "Sign In"}
              </button>

            </form>

            <div className="mt-8 text-center text-sm text-white/50">
              © 2026 SiBS US VISA KPI Dashboard
            </div>

          </div>

        </div>

      </div>

      <StatusModal
        open={statusModal.open}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={closeStatusModal}
        variant="center"
      />
    </>
  );
};

export default Login;