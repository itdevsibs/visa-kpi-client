import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../services/context/UserContext";

const Header = () => {
  const navigate = useNavigate();
  const { logout } = useUser();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header
      className="
        relative
        z-20
        border-b
        border-white/10
        bg-white/10
        backdrop-blur-2xl
      "
    >
      <div className="flex h-16 w-full items-center justify-end px-6">

        <button
          onClick={handleLogout}
          className="
            flex
            items-center
            gap-2
            rounded-xl
            bg-red-500/90
            px-4
            py-2
            font-medium
            text-white
            transition-all
            duration-300
            hover:bg-red-600
          "
        >
          <LogOut size={18} />
          Logout
        </button>

      </div>
    </header>
  );
};

export default Header;