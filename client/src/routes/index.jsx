import { createBrowserRouter, Navigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import Home from "../pages/Home.jsx";
import Studio from "../pages/Studio/index.jsx";
import Assets from "../pages/Assets/index.jsx";
import Settings from "../pages/Settings/index.jsx";
import Profile from "../pages/Profile/index.jsx";
import Notifications from "../pages/Notifications/index.jsx";
import UsersView from "../pages/Users/index.jsx";
import AuthLayout from "../pages/Auth/AuthLayout.jsx";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <AuthLayout defaultIsSignIn={true} key="login" />
  },
  {
    path: "/register",
    element: <AuthLayout defaultIsSignIn={false} key="register" />
  },
  {
    path: "/auth",
    element: <AuthLayout defaultIsSignIn={true} key="auth" />
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: "dashboard",
        element: <Home />
      },
      {
        path: "studio",
        element: <Studio />
      },
      {
        path: "assets",
        element: <Assets />
      },
      {
        path: "users",
        element: <UsersView />
      },
      {
        path: "notifications",
        element: <Notifications />
      },
      {
        path: "profile",
        element: <Profile />
      },
      {
        path: "settings",
        element: <Settings />
      }
    ]
  },
  {
    path: "*",
    element: <Navigate to="/dashboard" replace />
  }
]);

export default router;
