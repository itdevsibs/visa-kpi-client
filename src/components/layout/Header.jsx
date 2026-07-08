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
            group
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-white/20
            bg-white/10
            px-4
            py-2
            font-medium
            text-white
            backdrop-blur-xl
            transition-all
            duration-300
            hover:border-[#FF5C28]/60
            hover:bg-[#FF5C28]/90
            hover:shadow-lg
            hover:shadow-orange-500/20
          "
        >
          <LogOut
            size={18}
            className="
              transition-transform
              duration-300
              group-hover:-translate-x-1
            "
          />

          Logout
        </button>

      </div>
    </header>
  );
};

export default Header;