import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // while supabase is checking auth
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  // if not logged in → send to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // if logged in → render the page
  return <>{children}</>;
};

export default ProtectedRoute;
