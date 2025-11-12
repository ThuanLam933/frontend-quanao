// src/pages/HomePage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  Grid,
  Button,
  Avatar,
  Paper,
  Stack,
  CircularProgress,
  Pagination,
  Snackbar,
  Alert,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Input,
  Tooltip,
} from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import UploadIcon from "@mui/icons-material/Upload";
import DeleteIcon from "@mui/icons-material/Delete";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate, createSearchParams } from "react-router-dom";

/**
 * HomePage with admin-only poster uploads.
 * - Non-admin users will NOT see or be able to use upload controls.
 * - Replace API_BASE if your backend uses a different origin/port.
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

export default function HomePage() {
  const navigate = useNavigate();

  // UI / pagination state
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  // local poster state keys
  const HERO_KEY = "home_hero_poster";
  const CAT_KEY_PREFIX = "cat_img_";

  // upload refs
  const heroInputRef = useRef(null);
  const catInputRef = useRef(null);

  // dialog for category image upload
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catDialogTarget, setCatDialogTarget] = useState(null); // { id, slug, title }

  // Load saved hero poster (dataURL) from localStorage
  const [heroPosterDataUrl, setHeroPosterDataUrl] = useState(() => {
    try {
      return localStorage.getItem(HERO_KEY) || null;
    } catch {
      return null;
    }
  });

  // helpers for category saved images
  const getSavedCatImg = (slugOrId) => {
    try {
      return localStorage.getItem(CAT_KEY_PREFIX + slugOrId) || null;
    } catch {
      return null;
    }
  };
  const setSavedCatImg = (slugOrId, dataUrl) => {
    try {
      localStorage.setItem(CAT_KEY_PREFIX + slugOrId, dataUrl);
    } catch (e) {
      console.warn("Cannot save cat image to localStorage:", e);
    }
  };
  const removeSavedCatImg = (slugOrId) => {
    try {
      localStorage.removeItem(CAT_KEY_PREFIX + slugOrId);
    } catch {}
  };

  // ---------- Admin check ----------
  const isAdminUser = useCallback(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return false;
      const user = JSON.parse(raw);
      if (!user || typeof user !== "object") return false;

      if (user.is_admin === true) return true;
      if (user.isAdmin === true) return true;
      if (user.admin === true) return true;

      if (user.role && typeof user.role === "string" && user.role.toLowerCase().includes("admin")) return true;

      if (user.roles && Array.isArray(user.roles) && user.roles.some((r) => String(r).toLowerCase().includes("admin")))
        return true;

      if (user.data && typeof user.data === "object") {
        const nested = user.data;
        if (nested.role && typeof nested.role === "string" && nested.role.toLowerCase().includes("admin")) return true;
        if (nested.is_admin === true) return true;
      }

      return false;
    } catch (e) {
      console.warn("isAdminUser parse error", e);
      return false;
    }
  }, []);

  const isAdmin = isAdminUser();

  // Fetch categories (optional)
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
      const data = await res.json();
      setCategories(data || []);
    } catch (err) {
      console.warn("Categories load:", err);
      setCategories([]); // fallback empty
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);

      const data = await res.json();

      const normalized = (data || []).map((p) => {
        const firstDetail = p.details?.[0] ?? {}; // lấy chi tiết đầu tiên nếu có
        const price =
          typeof firstDetail.price === "string" || typeof firstDetail.price === "number"
            ? parseFloat(firstDetail.price)
            : null;

        const colorName = firstDetail.color?.name ?? null;
        const sizeName = firstDetail.size?.name ?? null;

        return {
          id: p.id,
          name: p.name ?? p.title ?? "Không tên",
          slug: p.slug ?? null,
          description: p.description ?? "",
          price,
          color: colorName,
          size: sizeName,
          rating: typeof p.rating === "number" ? p.rating : 0,
          categories_id: p.categories_id ?? p.category_id ?? null,
          image_url:
            p.image_url && typeof p.image_url === "string"
              ? p.image_url.startsWith("http")
                ? p.image_url
                : `${API_BASE}/storage/${p.image_url}`
              : null,
        };
      });

      console.log("✅ Products normalized:", normalized); // log ra xem dữ liệu đã chuẩn chưa
      setProducts(normalized);
    } catch (err) {
      console.error("❌ Fetch products error:", err);
      setError("Không thể tải sản phẩm. Vui lòng thử lại.");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // category tiles (prefer real categories, fallback to static)
  const categoryTiles = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.map((c, i) => {
        const slugOrName = c.slug ?? c.name ?? `cat-${i}`;
        const saved = getSavedCatImg(slugOrName);
        return {
          id: c.id ?? i,
          title: (c.name || "Danh mục").toUpperCase(),
          slug: slugOrName,
          img: saved || `/images/cat-${slugOrName.toString().toLowerCase().replace(/\s+/g, "-")}.jpg`,
          to: `/collections?${createSearchParams({ category: c.slug ?? c.name })}`,
        };
      });
    }
    // fallback static tiles (ensure these images exist in public/images)
    return [
      { id: "c1", title: "CLOTHERS", img: "/images/pnv.jpg", to: "/collections?category=clother" },
      { id: "c2", title: "T-SHIRT", img: "/images/pnv1.jpg", to: "/collections?category=tshirt" },
      { id: "c3", title: "JEANS", img: "/images/pnv.jpg", to: "/collections?category=jeans" },
      { id: "c4", title: "SHORTS", img: "/images/pnv1.jpg", to: "/collections?category=shorts" },
    ];
  }, [categories]);

  // client-side filtering (search) + pagination
  const filtered = useMemo(() => {
    let list = products.slice();
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.slug && p.slug.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  //util
  const safePrice = (price) => {
    if (price == null || typeof price !== "number" || price <= 0) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  const handleAddToCart = (p) => {
    try {
      // load existing cart from localStorage
      const raw = localStorage.getItem("cart");
      const cart = raw ? JSON.parse(raw) : [];

      // ensure numeric unit price when available
      const unitPrice =
        typeof p.price === "number"
          ? p.price
          : p.price && !isNaN(parseFloat(p.price))
          ? parseFloat(p.price)
          : null;

      // find existing item
      const idx = cart.findIndex((it) => it.id === p.id);
      if (idx >= 0) {
        // increment quantity
        cart[idx].quantity = (cart[idx].quantity || 1) + 1;
        if (unitPrice != null) cart[idx].unit_price = unitPrice;
        cart[idx].line_total = cart[idx].unit_price != null ? cart[idx].unit_price * cart[idx].quantity : null;
      } else {
        // add new item (store unit_price and line_total)
        cart.push({
          id: p.id,
          name: p.name,
          unit_price: unitPrice,
          line_total: unitPrice != null ? unitPrice * 1 : null,
          price_display: unitPrice != null ? unitPrice.toLocaleString("vi-VN") + "₫" : "Liên hệ",
          image_url: p.image_url ?? null,
          quantity: 1,
        });
      }

      // persist
      localStorage.setItem("cart", JSON.stringify(cart));

      // update cartCount from total quantity
      const totalQty = cart.reduce((s, it) => s + (it.quantity || 0), 0);
      setCartCount(totalQty);

      setSnack({ severity: "success", message: `${p.name} đã thêm vào giỏ.` });
    } catch (e) {
      console.warn("Cannot update cart in localStorage", e);
      setSnack({ severity: "error", message: "Không thể lưu giỏ hàng." });
    }
  };

  // Hero upload handlers (admin-only)
  const onHeroFileSelected = async (file) => {
    if (!file) return;
    if (!isAdmin) {
      setSnack({ severity: "error", message: "Bạn không có quyền tải ảnh." });
      return;
    }
    const maxSizeMB = 5;
    if (file.size / 1024 / 1024 > maxSizeMB) {
      setSnack({ severity: "error", message: `Ảnh quá lớn. Vui lòng chọn < ${maxSizeMB}MB.` });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      try {
        localStorage.setItem(HERO_KEY, dataUrl);
        setHeroPosterDataUrl(dataUrl);
        setSnack({ severity: "success", message: "Đã cập nhật hero poster." });
      } catch (e) {
        console.warn("Cannot save hero to localStorage", e);
        setSnack({ severity: "error", message: "Không thể lưu ảnh (localStorage đầy?)." });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleHeroUploadClick = () => {
    if (!isAdmin) {
      setSnack({ severity: "error", message: "Bạn không có quyền." });
      return;
    }
    heroInputRef.current?.click();
  };

  const handleResetHero = () => {
    if (!isAdmin) {
      setSnack({ severity: "error", message: "Bạn không có quyền." });
      return;
    }
    try {
      localStorage.removeItem(HERO_KEY);
    } catch {}
    setHeroPosterDataUrl(null);
    setSnack({ severity: "info", message: "Đã reset hero poster về mặc định." });
  };

  // Category upload dialog (admin-only)
  const openCatDialog = (tile) => {
    if (!isAdmin) {
      setSnack({ severity: "error", message: "Bạn không có quyền tải ảnh danh mục." });
      return;
    }
    setCatDialogTarget(tile);
    setCatDialogOpen(true);
  };
  const closeCatDialog = () => {
    setCatDialogOpen(false);
    setCatDialogTarget(null);
  };

  const onCatFileSelected = (file) => {
    if (!file || !catDialogTarget) return;
    if (!isAdmin) {
      setSnack({ severity: "error", message: "Bạn không có quyền." });
      return;
    }
    const slug = catDialogTarget.slug || catDialogTarget.id;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setSavedCatImg(slug, dataUrl);
      // refresh categories state to regenerate categoryTiles img
      setCategories((prev) => prev.slice());
      setSnack({ severity: "success", message: `Đã cập nhật ảnh cho ${catDialogTarget.title}.` });
      closeCatDialog();
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCatImage = (slug) => {
    if (!isAdmin) {
      setSnack({ severity: "error", message: "Bạn không có quyền." });
      return;
    }
    removeSavedCatImg(slug);
    setCategories((prev) => prev.slice());
    setSnack({ severity: "info", message: "Đã xóa ảnh category (nếu có)." });
  };

  // get hero image to use (dataUrl in localStorage has priority)
  const heroImageUrl = heroPosterDataUrl || "/images/hero-banner.jpg";

  // render only page content (header/banner/footer moved to MainLayout)
  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
        {/* Category tiles */}
        <Container maxWidth="lg" sx={{ mt: 6 }}>
          <Grid container spacing={3}>
            {categoryTiles.map((c) => (
              <Grid item xs={12} sm={6} md={3} key={c.id}>
                <Paper
                  elevation={0}
                  sx={{
                    position: "relative",
                    overflow: "hidden",
                    cursor: "pointer",
                    height: { xs: 160, md: 220 },
                    borderRadius: 1,
                    "&:hover .overlay": { opacity: 0.95 },
                  }}
                  onClick={() => navigate(c.to)}
                >
                  <Box
                    component="img"
                    src={c.img}
                    alt={c.title}
                    onError={(e) => (e.currentTarget.src = "/images/pnv1.jpg")}
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                      filter: "brightness(0.95)",
                      transition: "transform 0.4s ease",
                      "&:hover": { transform: "scale(1.03)" },
                    }}
                    onClick={() => navigate(c.to)}
                  />
                  <Box
                    className="overlay"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.28)",
                      color: "#fff",
                      opacity: 0.85,
                      transition: "opacity 0.25s ease",
                    }}
                    onClick={() => navigate(c.to)}
                  >
                    <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 26 }, letterSpacing: 1.2 }}>{c.title}</Typography>
                  </Box>

                  {/* show camera button only to admin */}
                  {isAdmin ? (
                    <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                      <Tooltip title="Upload ảnh category">
                        <IconButton
                          size="small"
                          sx={{ bgcolor: "rgba(255,255,255,0.85)" }}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            openCatDialog(c);
                          }}
                        >
                          <CameraAltIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : null}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>

        {/* Products grid */}
        <Container maxWidth="lg" sx={{ mt: 8, mb: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>
            New Arrivals
          </Typography>

          {loadingProducts ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" textAlign="center" sx={{ py: 6 }}>
              {error}
            </Typography>
          ) : (
            <>
              <Grid container spacing={3}>
                {currentPageProducts.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography textAlign="center">Không tìm thấy sản phẩm.</Typography>
                  </Grid>
                ) : (
                  currentPageProducts.map((p) => (
                    console.log("Chi tiết sản phẩm:", p),
                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                      <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                        <CardMedia component="img" height="280" image={p.image_url || "/images/pnv1.jpg"} alt={p.name} sx={{ objectFit: "cover" }} />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {p.name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#5C6F91", mt: 1 }}>
                            {(p.rating ?? 0).toFixed(1)} ⭐
                          </Typography>
                          <Typography variant="h6" sx={{ mt: 1, color: "#162447", fontWeight: 800 }}>
                            {safePrice(p.price)}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                          <Button size="small" variant="outlined" onClick={() => navigate(`/product/${p.id}`)}>
                            Xem
                          </Button>
                          <Button size="small" variant="contained" onClick={() => handleAddToCart(p)}>
                            Thêm giỏ
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination count={pageCount} page={page} onChange={(_, v) => setPage(v)} color="primary" />
              </Box>
            </>
          )}
        </Container>

        {/* Snackbar */}
        <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
