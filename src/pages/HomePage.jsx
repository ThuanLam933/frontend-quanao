// src/pages/HomePage.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Box,
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  Chip,
  MenuItem,
  Select,
  FormControl,
  Avatar,
  Badge,
  Paper,
  Stack,
  CircularProgress,
  Pagination,
  Snackbar,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import StarIcon from "@mui/icons-material/Star";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom";

/**
 * NOTES:
 * - API endpoints used:
 *    GET /api/products      -> returns array of products (image_url already mapped to asset URL by backend)
 *    GET /api/categories    -> returns array of categories {id, slug, name}
 *
 * - If backend runs on different origin, set API_BASE to e.g. "http://127.0.0.1:8000"
 *   and ensure CORS is enabled on backend (laravel cors or barryvdh/laravel-cors).
 */
const API_BASE = "http://127.0.0.1:8000"; // empty -> same origin. set e.g. "http://127.0.0.1:8000" if needed

const theme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#0d0d0d", paper: "#121212" },
    primary: { main: "#5EB8FF" },
    secondary: { main: "#64B5F6" },
    text: { primary: "#E0E0E0", secondary: "#90CAF9" },
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: "Roboto, sans-serif" },
});

export default function HomePage() {
  const navigate = useNavigate();

  // UI state
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 9;

  // data state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([{ id: 0, name: "Tất cả" }]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error, setError] = useState(null);
  const [snack, setSnack] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  // fetch categories
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      if (!res.ok) throw new Error(`Categories fetch failed: ${res.status}`);
      const data = await res.json();
      // Prepend "Tất cả"
      setCategories([{ id: 0, name: "Tất cả" }, ...data]);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh mục. Vui lòng thử lại.");
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
      const data = await res.json();

      // Normalize each product:
      // - ensure image_url is either a full URL or fallback placeholder
      // - category name mapping is done later by categories lookup (using categories data)
      const normalized = data.map((p) => ({
        id: p.id,
        name: p.name ?? "Không tên",
        slug: p.slug ?? null,
        description: p.description ?? "",
        status: typeof p.status === "boolean" ? p.status : !!Number(p.status),
        categories_id: p.categories_id ?? null,
        image_url:
          p.image_url && typeof p.image_url === "string"
            ? // backend may send full asset('storage/...') OR relative path.
              // if it's relative (doesn't start with http), prefix with API_BASE + /storage
              (p.image_url.startsWith("http") ? p.image_url : `${API_BASE}/storage/${p.image_url}`)
            : null,
        // price might not be provided in your current backend; handle gracefully.
        price: typeof p.price === "number" ? p.price : null,
        rating: typeof p.rating === "number" ? p.rating : null,
      }));

      setProducts(normalized);
    } catch (err) {
      console.error(err);
      setError("Không thể tải sản phẩm. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);

  // derive category name map for quick lookup
  const categoryMap = useMemo(() => {
    const m = {};
    categories.forEach((c) => {
      m[c.id] = c.name;
    });
    return m;
  }, [categories]);

  // filtering + sorting
  const filtered = useMemo(() => {
    let list = products.slice();

    if (categoryFilter && categoryFilter !== "Tất cả") {
      // categoryFilter may be name string; backend returns categories with id & name.
      list = list.filter((p) => categoryMap[p.categories_id] === categoryFilter);
    }

    if (query) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q)) ||
          (p.slug && p.slug.toLowerCase().includes(q))
      );
    }

    if (sort === "price_asc") list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    if (sort === "price_desc") list.sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
    if (sort === "rating") list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    // featured = default order from backend

    return list;
  }, [products, categoryFilter, query, sort, categoryMap]);

  // pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPageProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // UI helpers
  const safePrice = (price) => {
    if (price == null) return "Liên hệ";
    if (typeof price !== "number") return "Liên hệ";
    if (price <= 0) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  const handleAddToCart = (p) => {
    // TODO: call backend cart API. For demo, increase count & show snackbar.
    setCartCount((c) => c + 1);
    setSnack({ severity: "success", message: `${p.name} đã thêm vào giỏ.` });
  };

  const handlePageChange = (_, value) => {
    setPage(value);
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  // handle category selection by name
  const onCategoryChipClick = (c) => {
    setCategoryFilter(c);
    setPage(1);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg,#0d0d0d 0%,#071026 100%)", pb: 6 }}>
        <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <Container maxWidth="lg">
            <Toolbar disableGutters sx={{ gap: 2 }}>
              <Avatar sx={{ bgcolor: "#1E88E5", mr: 1 }}>D</Avatar>
              <Typography variant="h6" sx={{ flexGrow: 0, cursor: "pointer" }} onClick={() => navigate("/")}>
                Denim Shop
              </Typography>

              <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
                <Paper component="form" onSubmit={(e) => e.preventDefault()} sx={{ display: "flex", alignItems: "center", width: { xs: "100%", sm: 520 }, px: 1, py: 0.3 }}>
                  <InputBase placeholder="Tìm kiếm sản phẩm, ví dụ: jean, áo..." sx={{ ml: 1, flex: 1, color: "white" }} value={query} onChange={(e) => setQuery(e.target.value)} />
                  <IconButton type="submit" sx={{ p: "10px" }} aria-label="search">
                    <SearchIcon sx={{ color: "#90CAF9" }} />
                  </IconButton>
                </Paper>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton size="large" color="inherit" onClick={() => navigate("/wishlist")}>
                  <FavoriteBorderIcon />
                </IconButton>
                <IconButton size="large" color="inherit" onClick={() => navigate("/cart")}>
                  <Badge badgeContent={cartCount} color="secondary">
                    <ShoppingCartIcon />
                  </Badge>
                </IconButton>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4 }}>
          {/* Hero */}
          <Paper elevation={6} sx={{ p: { xs: 3, md: 6 }, borderRadius: 3, background: "linear-gradient(90deg,#081225 0%, rgba(30,136,229,0.08) 100%)", mb: 4 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
                  Denim Shop — Thời trang denim cho mọi phong cách
                </Typography>
                <Typography variant="body1" sx={{ color: "rgba(224,224,224,0.9)", mb: 3 }}>
                  Khám phá bộ sưu tập áo, quần jean và áo khoác—chất liệu thoáng, thiết kế hiện đại.
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button variant="contained" onClick={() => navigate("/trang-chu")}>Khám phá</Button>
                  <Button variant="outlined" onClick={() => navigate("/collections")}>Bộ sưu tập</Button>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box component="img" src="https://cdn.hstatic.net/files/200000887901/file/desktop__5_.jpg" alt="hero" sx={{ width: "100%", borderRadius: 2, boxShadow: "0 10px 30px rgba(0,0,0,0.6)" }} />
              </Grid>
            </Grid>
          </Paper>

          {/* Filters */}
          <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {loadingCategories ? (
                <CircularProgress size={20} />
              ) : (
                categories.map((c) => (
                  <Chip key={c.id} label={c.name} clickable onClick={() => onCategoryChipClick(c.name)} color={c.name === categoryFilter ? "primary" : "default"} variant={c.name === categoryFilter ? "filled" : "outlined"} />
                ))
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <Select value={sort} onChange={(e) => setSort(e.target.value)} sx={{ color: "white" }}>
                  <MenuItem value="featured">Nổi bật</MenuItem>
                  <MenuItem value="price_asc">Giá: Thấp → Cao</MenuItem>
                  <MenuItem value="price_desc">Giá: Cao → Thấp</MenuItem>
                  <MenuItem value="rating">Đánh giá</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Product Grid */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : (
            <>
              <Grid container spacing={3}>
                {currentPageProducts.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography textAlign="center">Không tìm thấy sản phẩm.</Typography>
                  </Grid>
                ) : (
                  currentPageProducts.map((p) => (
                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                      <Card sx={{ backgroundColor: "#0f1216", border: "1px solid rgba(255,255,255,0.04)", height: "100%", display: "flex", flexDirection: "column" }}>
                        <CardMedia component="img" height="280" image={p.image_url || "/images/placeholder.png"} alt={p.name} sx={{ objectFit: "cover" }} />
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{p.name}</Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                            <StarIcon sx={{ color: "#FFD54F", fontSize: 18 }} />
                            <Typography variant="body2">{(p.rating ?? 0).toFixed(1)}</Typography>
                            <Typography variant="body2" sx={{ ml: 1, color: "rgba(224,224,224,0.7)" }}>
                              • {categoryMap[p.categories_id] ?? "Chưa phân loại"}
                            </Typography>
                          </Box>
                          <Typography variant="h6" sx={{ mt: 1, color: "#1E88E5", fontWeight: 700 }}>
                            {safePrice(p.price)}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
                          <Button size="small" variant="outlined" onClick={() => navigate(`/product/${p.id}`)}>Xem</Button>
                          <Box>
                            <Button size="small" variant="contained" onClick={() => handleAddToCart(p)}>Thêm giỏ</Button>
                          </Box>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>

              {/* Pagination */}
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination count={pageCount} page={page} onChange={handlePageChange} color="primary" />
              </Box>
            </>
          )}

          {/* Footer */}
          <Box sx={{ mt: 6 }}>
            <Paper elevation={3} sx={{ p: 3, backgroundColor: "#071426", borderRadius: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="h6" sx={{ color: "#fff", mb: 1 }}>Denim Shop</Typography>
                  <Typography variant="body2">Thời trang denim cao cấp — giao hàng tận nơi.</Typography>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Hỗ trợ</Typography>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>Chính sách đổi trả</li>
                    <li>Hướng dẫn mua hàng</li>
                    <li>Liên hệ</li>
                  </ul>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Theo dõi</Typography>
                  <Stack direction="row" spacing={1}>
                    <Avatar sx={{ bgcolor: "#1E88E5" }}>F</Avatar>
                    <Avatar sx={{ bgcolor: "#1E88E5" }}>I</Avatar>
                    <Avatar sx={{ bgcolor: "#1E88E5" }}>T</Avatar>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </Container>

        {/* Snackbar for small feedback */}
        <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity} sx={{ width: "100%" }}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
