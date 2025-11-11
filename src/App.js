// src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import CartPage from "./pages/CartPage";
import ProductPage from "./pages/ProductPage";
import AdminPanel from "./pages/AdminPanel"; // <- admin page bạn đã dán vào src/pages/AdminPanel.jsx

/**
 * ProtectedRoute: wrapper đơn giản để bảo vệ route
 * - Kiểm tra xem localStorage có access_token hay không.
 * - Nếu không có -> điều hướng về /login
 * - Nếu có -> render children
 *
 * Lưu ý: Đây là bảo vệ phía client (UI) — backend vẫn phải bảo vệ endpoint bằng auth middleware.
 */
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/trang-chu" element={<HomePage />} />
      <Route path="/product/:id" element={<ProductPage />} />
      <Route path="/cart" element={<CartPage />} />

      {/* Admin: protected by token presence */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />

      {/* root redirect to login (as your original) */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* fallback: any unknown route -> send to /trang-chu (or /login) */}
      <Route path="*" element={<Navigate to="/trang-chu" replace />} />
    </Routes>
  );
}
