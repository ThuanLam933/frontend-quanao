// src/pages/CartPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Typography,
  IconButton,
  Button,
  Paper,
  Grid,
  Avatar,
  Stack,
  TextField,
  Divider,
  Snackbar,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { useNavigate } from "react-router-dom";

/**
 * CartPage (server-first)
 *
 * - Nếu localStorage chứa guest_cart_id -> load từ server GET /api/cart-details?cart_id=<id>
 * - Nếu server trả về items: map và lưu localStorage "cart_items" để UI sử dụng
 * - Nếu server không thể trả: fallback đọc localStorage như trước
 *
 * Note:
 * - Backend endpoints assumed:
 *    POST /api/carts                 -> create cart (returns { id: ... })
 *    GET  /api/cart-details?cart_id= -> list cart details (returns array of details)
 *    POST /api/cart-details          -> create cart detail (body includes cart_id, product_detail_id, quantity, price)
 *    PUT  /api/cart-details/{id}     -> update cart detail (quantity)
 *    DELETE /api/cart-details/{id}   -> delete cart detail
 *
 * - Items normalized to shape used by UI:
 *    { id, cart_detail_id?, product_detail_id?, name, price, qty, image_url, slug, description }
 */

const API_BASE = "http://127.0.0.1:8000";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#F7FAFC", paper: "#fff" },
    primary: { main: "#162447", contrastText: "#fff" },
    secondary: { main: "#42A5F5" },
    text: { primary: "#0D1B2A", secondary: "#5C6F91" },
  },
  shape: { borderRadius: 8 },
  typography: { fontFamily: "Poppins, Roboto, sans-serif" },
});

const STORAGE_KEY = "cart_items";
const CART_KEY = "guest_cart_id";

export default function CartPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState(null);

  // ---------- helper: fetch wrapper with credentials ----------
  async function apiFetch(url, opts = {}) {
    const headers = { Accept: "application/json", ...(opts.headers || {}) };
    const cfg = { credentials: "include", ...opts, headers };
    return fetch(url, cfg);
  }

  // ---------- normalize server response -> UI shape ----------
  function normalizeServerItem(it) {
    // Expecting CartDetail with relation to product (may vary)
    // Adjust mapping if your backend returns different keys
    return {
      id: it.product_detail_id ?? it.id ?? Math.random(), // fallback id
      cart_detail_id: it.id ?? null,
      product_detail_id: it.product_detail_id ?? null,
      name: (it.product && it.product.name) || it.product_name || it.name || `Sản phẩm #${it.product_detail_id ?? it.id}`,
      price: Number(it.price ?? it.unit_price ?? 0),
      qty: Number(it.quantity ?? it.qty ?? 1),
      image_url: (it.product && it.product.image_url) || it.image_url || null,
      slug: (it.product && it.product.slug) || it.product_slug || null,
      description: (it.product && it.product.description) || it.description || "",
    };
  }

  // ---------- refresh from server (and persist to localStorage) ----------
  async function refreshCartFromServer(cartId) {
    if (!cartId) return;
    try {
      const res = await apiFetch(`${API_BASE}/api/cart-details?cart_id=${cartId}`, { method: "GET" });
      if (!res.ok) {
        console.warn("refreshCartFromServer: server returned", res.status);
        return;
      }
      const data = await res.json();
      const arr = (Array.isArray(data) ? data : data.data ?? []).map(normalizeServerItem);
      setItems(arr);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
        // also keep a guest_cart_count key for legacy/other components
        const totalQty = arr.reduce((s, it) => s + (Number(it.qty) || 0), 0);
        localStorage.setItem("guest_cart_count", String(totalQty));
      } catch (e) {
        console.warn("Failed to persist cart_items", e);
      }
      // broadcast
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: arr.reduce((s,i)=>s+(i.qty||0),0), items: arr } }));
    } catch (e) {
      console.warn("refreshCartFromServer error", e);
    }
  }

  // ---------- initial load ----------
  useEffect(() => {
    setLoading(true);
    const load = async () => {
      try {
        const cartId = localStorage.getItem(CART_KEY);
        if (cartId) {
          try {
            await refreshCartFromServer(cartId);
            setLoading(false);
            return;
          } catch (e) {
            console.warn("Failed to load from server, falling back to local", e);
          }
        }

        // fallback: localStorage
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setItems(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.warn("Cart load error", e);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();

    // listen for cross-tab/page updates (homepage/productpage can dispatch this)
    const onUpdated = (ev) => {
      const detail = ev.detail || {};
      if (detail.items) {
        setItems(detail.items);
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    };
    window.addEventListener("cartUpdated", onUpdated);

    return () => window.removeEventListener("cartUpdated", onUpdated);
  }, []);

  // persist to localStorage whenever items change (and broadcast)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("Failed to save cart to storage", e);
    }
  }, [items]);

  // ---------- helpers for modifying cart (local + sync to server if cart exists) ----------
  const createOrUpdateServerCartDetail = async (cartId, item) => {
    // if item has cart_detail_id -> update via PUT
    try {
      if (!cartId) return;
      if (item.cart_detail_id) {
        const url = `${API_BASE}/api/cart-details/${item.cart_detail_id}`;
        const body = { quantity: item.qty, note: item.note ?? null };
        const res = await apiFetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          console.warn("PUT cart-detail failed", res.status);
        }
        return;
      } else {
        // create new cart-detail on server
        const url = `${API_BASE}/api/cart-details`;
        const payload = {
          cart_id: Number(cartId),
          product_detail_id: item.product_detail_id ?? item.id,
          quantity: item.qty,
          price: item.price ?? 0,
          note: item.note ?? null,
        };
        const res = await apiFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.warn("POST cart-detail failed", res.status, text);
        }
        return;
      }
    } catch (e) {
      console.warn("createOrUpdateServerCartDetail error", e);
    }
  };

  const deleteServerCartDetail = async (cartId, cartDetailId) => {
    if (!cartId || !cartDetailId) return;
    try {
      const url = `${API_BASE}/api/cart-details/${cartDetailId}`;
      const res = await apiFetch(url, { method: "DELETE" });
      if (!res.ok) {
        console.warn("DELETE cart-detail failed", res.status);
      }
    } catch (e) {
      console.warn("deleteServerCartDetail error", e);
    }
  };

  // increase qty
  const addQty = async (id) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, qty: (i.qty || 1) + 1 } : i));
      // optimistic UI update -> persist handled by effect
      return next;
    });

    const cartId = localStorage.getItem(CART_KEY);
    // find the updated item (after state update may be async, so compute here)
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").find((it) => it.id === id);
    const itemToSync = current
      ? { ...current, qty: (Number(current.qty || 1) + 1) }
      : null;

    if (itemToSync && cartId) {
      await createOrUpdateServerCartDetail(cartId, itemToSync);
      // refresh from server to get canonical cart_detail_id and totals
      await refreshCartFromServer(cartId);
    }
  };

  // decrease qty (min 1)
  const subQty = async (id) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, (i.qty || 1) - 1) } : i));
      return next;
    });

    const cartId = localStorage.getItem(CART_KEY);
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").find((it) => it.id === id);
    const newQty = current ? Math.max(1, (Number(current.qty || 1) - 1)) : null;
    if (current && cartId) {
      const itemToSync = { ...current, qty: newQty };
      await createOrUpdateServerCartDetail(cartId, itemToSync);
      await refreshCartFromServer(cartId);
    }
  };

  // update qty via input
  const updateQty = async (id, value) => {
    const q = Math.max(1, Number(value || 1));
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: q } : i)));

    const cartId = localStorage.getItem(CART_KEY);
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").find((it) => it.id === id);
    if (current && cartId) {
      const itemToSync = { ...current, qty: q };
      await createOrUpdateServerCartDetail(cartId, itemToSync);
      await refreshCartFromServer(cartId);
    }
  };

  // remove item
  const removeItem = async (id) => {
    // find item to get cart_detail_id
    const current = items.find((it) => it.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSnack({ severity: "info", message: "Đã xoá sản phẩm" });

    const cartId = localStorage.getItem(CART_KEY);
    if (current && current.cart_detail_id && cartId) {
      await deleteServerCartDetail(cartId, current.cart_detail_id);
      await refreshCartFromServer(cartId);
    } else {
      // update localStorage and broadcast
      const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]").filter((it) => it.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
      const totalQty = arr.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      localStorage.setItem("guest_cart_count", String(totalQty));
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: totalQty, items: arr } }));
    }
  };

  const clearCart = async () => {
    setItems([]);
    setSnack({ severity: "info", message: "Giỏ hàng đã được làm rỗng" });

    const cartId = localStorage.getItem(CART_KEY);
    if (cartId) {
      // naive approach: delete each cart_detail on server (if many items, consider implementing bulk endpoint)
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      for (const it of parsed) {
        if (it.cart_detail_id) {
          await deleteServerCartDetail(cartId, it.cart_detail_id);
        }
      }
      await refreshCartFromServer(cartId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem("guest_cart_count", "0");
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: 0, items: [] } }));
    }
  };

  const subtotal = useMemo(() => {
    return items.reduce((s, it) => s + ((typeof it.price === "number" ? it.price : 0) * (it.qty || 0)), 0);
  }, [items]);

  const handleCheckout = () => {
    if (items.length === 0) {
      setSnack({ severity: "warning", message: "Giỏ hàng trống" });
      return;
    }
    // If you require auth at checkout, you can check user auth status here and redirect to login if needed.
    setSnack({ severity: "success", message: "Tiến hành thanh toán (demo)" });
  };

  // ensure image url absolute
  const normalizeImg = (u) => {
    if (!u) return "/images/posterdenim.png";
    if (typeof u !== "string") return "/images/posterdenim.png";
    return u.startsWith("http") ? u : `${API_BASE}/storage/${u}`;
  };

  // UI
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default", pb: 6 }}>
        {/* Thin top bar */}
        <Box sx={{ backgroundColor: "#111827", color: "#fff", py: 0.5, fontSize: 12 }}>
          <Container maxWidth="lg" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>Miễn phí giao hàng nội thành HCM từ 1.000.000₫</Box>
            <Box>Liên hệ: webdemo@gmail.com — 09x.xxx.xxxx</Box>
          </Container>
        </Box>

        {/* Header */}
        <AppBar position="sticky" elevation={0} sx={{ backgroundColor: "#fff", borderBottom: "1px solid rgba(13,27,42,0.06)" }}>
          <Container maxWidth="lg">
            <Toolbar disableGutters sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box onClick={() => navigate("/")} sx={{ cursor: "pointer" }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: 2, color: "#0D1B2A" }}>DENIM ON</Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                <Button onClick={() => navigate("/trang-chu")} sx={{ color: "#0D1B2A", textTransform: "none" }}>Trang chủ</Button>
                <Button onClick={() => navigate("/collections")} sx={{ color: "#0D1B2A", textTransform: "none" }}>Sản phẩm</Button>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton onClick={() => navigate("/wishlist")} aria-label="wishlist">
                  <FavoriteBorderIcon sx={{ color: "#0D1B2A" }} />
                </IconButton>
                <IconButton onClick={() => navigate("/cart")} aria-label="cart">
                  <Box sx={{ position: "relative", display: "inline-flex" }}>
                    <ShoppingCartIcon sx={{ color: "#0D1B2A" }} />
                    {items.length > 0 && (
                      <Box sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        minWidth: 18,
                        height: 18,
                        borderRadius: "50%",
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: 0.5,
                      }}>{items.reduce((s,i)=>s+(i.qty||0),0)}</Box>
                    )}
                  </Box>
                </IconButton>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 6 }}>
          <Grid container spacing={4}>
            {/* Left: Cart items */}
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800 }}>Giỏ hàng</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button variant="outlined" color="inherit" onClick={() => navigate("/collections")}>Tiếp tục mua sắm</Button>
                    <Button variant="text" color="error" onClick={clearCart} disabled={items.length===0} startIcon={<DeleteOutlineIcon />}>Xóa hết</Button>
                  </Stack>
                </Stack>

                <Divider sx={{ mb: 2 }} />

                {loading ? (
                  <Box sx={{ py: 6, display: "flex", justifyContent: "center" }}><Typography>Đang tải...</Typography></Box>
                ) : items.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Giỏ hàng của bạn đang trống</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>Thêm sản phẩm vào giỏ để bắt đầu mua sắm.</Typography>
                    <Button variant="contained" onClick={() => navigate("/collections")}>Xem sản phẩm</Button>
                  </Box>
                ) : (
                  <List disablePadding>
                    {items.map((it) => (
                      <ListItem key={it.id} sx={{ py: 2, borderBottom: "1px solid rgba(13,27,42,0.04)" }}>
                        <ListItemAvatar>
                          <Avatar
                            variant="rounded"
                            src={normalizeImg(it.image_url)}
                            alt={it.name}
                            sx={{ width: 88, height: 88, mr: 2 }}
                          />
                        </ListItemAvatar>

                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                              <Typography sx={{ fontWeight: 700 }}>{it.name}</Typography>
                              {it.slug && <Chip size="small" label={it.slug} sx={{ ml: 1 }} />}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" sx={{ color: "text.secondary" }}>{it.description ?? ""}</Typography>
                              <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 800 }}>{typeof it.price === "number" ? it.price.toLocaleString("vi-VN") + "₫" : "Liên hệ"}</Typography>
                            </Box>
                          }
                        />

                        <ListItemSecondaryAction sx={{ right: 0, display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                            <IconButton size="small" onClick={() => subQty(it.id)}><RemoveCircleOutlineIcon /></IconButton>
                            <TextField
                              value={it.qty}
                              onChange={(e) => updateQty(it.id, e.target.value)}
                              inputProps={{ style: { textAlign: "center" } }}
                              size="small"
                              sx={{ width: 72 }}
                            />
                            <IconButton size="small" onClick={() => addQty(it.id)}><AddCircleOutlineIcon /></IconButton>
                          </Box>

                          <IconButton edge="end" color="error" onClick={() => removeItem(it.id)}>
                            <DeleteOutlineIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Right: Summary */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 3, position: "sticky", top: 24 }}>
                <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>Tóm tắt đơn hàng</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 1 }}>Thanh toán</Typography>

                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Tạm tính</Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{subtotal.toLocaleString("vi-VN")}₫</Typography>
                </Box>

                <Box sx={{ mt: 2 }}>
                  <Button fullWidth variant="contained" size="large" onClick={handleCheckout} disabled={items.length === 0}>
                    Thanh toán
                  </Button>
                </Box>

                <Button fullWidth variant="outlined" size="small" sx={{ mt: 2 }} onClick={() => { setSnack({ severity: "info", message: "Lưu giỏ hàng (demo)" }); }}>
                  Lưu để sau
                </Button>

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Phương thức thanh toán COD/Hệ thống thanh toán online sẽ được tích hợp sau.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>

        {/* Footer */}
        <Box sx={{ backgroundColor: "#0D1B2A", color: "#fff", py: 4, mt: 8 }}>
          <Container maxWidth="lg">
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>DENIM ON</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Thời trang nam cao cấp — giao hàng toàn quốc.</Typography>
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                <Stack direction="row" spacing={2}>
                  <Button variant="outlined" color="inherit" onClick={() => navigate("/contact")}>Liên hệ</Button>
                  <Button variant="contained" color="primary" onClick={() => navigate("/collections")}>Mua ngay</Button>
                </Stack>
              </Grid>
            </Grid>
          </Container>
        </Box>

        <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
