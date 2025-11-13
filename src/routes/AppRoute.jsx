import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/LoginPage";
import HomePage from "../pages/HomePage";
import CartPage from "../pages/CartPage";
import ProductPage from "../pages/ProductPage";
import AdminPanel from "../pages/AdminPanel";
import MainLayout from "../layouts/MainLayout";
import AccountPage from "../pages/AccountPage";
import RegisterPage from "../pages/RegisterPage";
import PaymentPage from "../pages/PaymentPage";

/**
 * ProtectedRoute: wrapper đơn giản để bảo vệ route
 * - Kiểm tra xem localStorage có access_token hay không.
 * - Nếu không có -> điều hướng về /login
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function AppRoute() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* public routes wrapped with main layout */}
      <Route element={<MainLayout />}>
      
        <Route path="/trang-chu" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/" element={<Navigate to="/trang-chu" replace />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/trang-chu" replace />} />
    </Routes>
  );
}