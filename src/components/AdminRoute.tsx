import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const adminAccess = localStorage.getItem("adminAccess");
    if (!adminAccess) {
      navigate("/auth");
    }
  }, [navigate]);

  return <>{children}</>;
}