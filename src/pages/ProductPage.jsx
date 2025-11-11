// src/pages/ProductPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Stack,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShareIcon from "@mui/icons-material/Share";
import StarIcon from "@mui/icons-material/Star";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadIcon from "@mui/icons-material/Upload";
import { createTheme, ThemeProvider } from "@mui/material/styles";

/**
 * ProductPage (updated)
 * - Removed usage of hard-coded product images such as "pnv1.jpg".
 * - Now only uses images returned from /api/image-products (image_products).
 * - If no images returned, shows a simple placeholder box (no hard-coded product image).
 * - Handles upload (requires token) and delete (requires token).
 */

const API_BASE = "http://127.0.0.1:8000";
const HERO_KEY = "home_hero_poster";
const CART_COUNT_KEY = "guest_cart_count";

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

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [productDetail, setProductDetail] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [error, setError] = useState(null);

  // mainImage will be taken from images[] (image_products). If no images, it will be null.
  const [mainImage, setMainImage] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [snack, setSnack] = useState(null);
  const [fav, setFav] = useState(false);

  // images from image_products API
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const uploadInputRef = useRef(null);

  // hero image from localStorage (if set by HomePage upload), fallback to default hero file
  const heroImageUrl = useMemo(() => {
    try {
      return localStorage.getItem(HERO_KEY) || "/images/hero-banner.jpg";
    } catch {
      return "/images/hero-banner.jpg";
    }
  }, []);

  // ---------- Fetch product detail ----------
  const fetchProductDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/product-details/${id}`);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fetch failed: ${res.status} ${res.statusText} ${txt}`);
      }
      const p = await res.json();

      const normalized = {
        id: p.id,
        product_id: p.product_id ?? null,
        color: p.color ?? null,
        size: p.size ?? null,
        price: typeof p.price === "number" ? p.price : p.price ? Number(p.price) : null,
        quantity: typeof p.quantity === "number" ? p.quantity : p.quantity ? Number(p.quantity) : 0,
        status:
          typeof p.status === "number" ? !!p.status : typeof p.status === "boolean" ? p.status : true,
        product: p.product ?? null,
        created_at: p.created_at ?? null,
        updated_at: p.updated_at ?? null,
      };

      setProductDetail(normalized);
      // do NOT set mainImage from productDetail; images will come from image_products (fetchImages)
      // keep mainImage unchanged here
    } catch (err) {
      console.error("fetchProductDetail error:", err);
      setError("Không thể tải chi tiết sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ---------- Fetch related ----------
  const fetchRelated = useCallback(
    async (productId) => {
      if (!productId) return;
      setLoadingRelated(true);
      try {
        const res = await fetch(`${API_BASE}/api/product-details`);
        if (!res.ok) throw new Error(`Fetch related failed: ${res.status}`);
        const arr = await res.json();
        const normalized = arr.map((d) => ({
          id: d.id,
          product_id: d.product_id ?? null,
          price: typeof d.price === "number" ? d.price : d.price ? Number(d.price) : null,
          quantity: typeof d.quantity === "number" ? d.quantity : d.quantity ? Number(d.quantity) : 0,
          product: d.product ?? null,
          image:
            d.product && d.product.image_url
              ? d.product.image_url.startsWith("http")
                ? d.product.image_url
                : `${API_BASE}/storage/${d.product.image_url}`
              : null,
        }));
        const filtered = normalized.filter((d) => d.product_id === productId && d.id !== Number(id)).slice(0, 4);
        setRelated(filtered);
      } catch (err) {
        console.warn("fetchRelated error:", err);
        setRelated([]);
      } finally {
        setLoadingRelated(false);
      }
    },
    [id]
  );

  useEffect(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

  useEffect(() => {
    if (productDetail && productDetail.product_id) {
      fetchRelated(productDetail.product_id);
      fetchImages(productDetail.id);
    }
  }, [productDetail, fetchRelated]);

  // ---------- Utilities ----------
  const safePrice = (price) => {
    if (price == null) return "Liên hệ";
    if (typeof price !== "number") return "Liên hệ";
    if (price <= 0) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  function incrementLocalCartCount(incrementBy = 1) {
    try {
      const cur = Number(localStorage.getItem(CART_COUNT_KEY) || 0);
      const next = cur + Number(incrementBy || 0);
      localStorage.setItem(CART_COUNT_KEY, String(next));
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: next } }));
    } catch (e) {
      console.warn("incrementLocalCartCount error", e);
    }
  }

  // ---------- ImageProducts: fetch / upload / delete ----------
  async function fetchImages(productDetailId) {
    if (!productDetailId) return;
    setLoadingImages(true);
    try {
      const res = await fetch(`${API_BASE}/api/image-products?product_detail_id=${encodeURIComponent(productDetailId)}`);
      if (!res.ok) {
        console.warn("fetchImages failed", res.status);
        setImages([]);
        setMainImage(null);
        return;
      }
      const data = await res.json();

      // Support paginator (Laravel) or plain array
      let items = [];
      if (Array.isArray(data)) {
        items = data;
      } else if (Array.isArray(data.data)) {
        items = data.data;
      } else if (Array.isArray(data.items)) {
        items = data.items;
      } else {
        // fallback: maybe object with top-level elements
        items = data;
      }

      const normalized = (items || []).map((it) => {
        // Determine public URL: prefer full_url/url provided by backend
        let url = it.full_url ?? it.url ?? null;

        if (!url && it.url_image) {
          // if absolute URL stored
          if (/^https?:\/\//i.test(it.url_image)) {
            url = it.url_image;
          } else {
            url = `${API_BASE}/storage/${it.url_image.replace(/^\/+/, "")}`;
          }
        }

        return {
          id: it.id,
          raw: it,
          url,
          description: it.description ?? "",
          sort_order: it.sort_order ?? "",
        };
      });

      setImages(normalized);

      // If images exist, set mainImage to first image (authoritative)
      if (normalized.length > 0) {
        setMainImage(normalized[0].url || null);
      } else {
        // no images found: clear mainImage (we intentionally do NOT use productDetail.images or pnv)
        setMainImage(null);
      }
    } catch (err) {
      console.warn("fetchImages error:", err);
      setImages([]);
      setMainImage(null);
    } finally {
      setLoadingImages(false);
    }
  }

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const uploadImage = async (file) => {
    if (!file || !productDetail) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      setSnack({ severity: "error", message: "Bạn cần đăng nhập để upload ảnh." });
      return;
    }

    const fd = new FormData();
    fd.append("image", file);
    fd.append("product_detail_id", productDetail.id);

    try {
      setLoadingImages(true);
      const res = await fetch(`${API_BASE}/api/image-products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }

      const json = await res.json();
      const returned = json.image ?? json.data ?? json;

      let newItem = null;
      if (returned) {
        let url = returned.full_url ?? returned.url ?? null;
        if (!url && returned.url_image) {
          if (/^https?:\/\//i.test(returned.url_image)) url = returned.url_image;
          else url = `${API_BASE}/storage/${returned.url_image.replace(/^\/+/, "")}`;
        }
        newItem = {
          id: returned.id,
          raw: returned,
          url,
          description: returned.description ?? "",
          sort_order: returned.sort_order ?? "",
        };
      }

      // Prepend new image (so user sees it immediately)
      setImages((prev) => (newItem ? [newItem, ...prev] : prev));
      if (newItem) setMainImage(newItem.url || null);

      setSnack({ severity: "success", message: "Upload ảnh thành công." });
    } catch (err) {
      console.error("uploadImage error:", err);
      setSnack({ severity: "error", message: "Upload thất bại. Kiểm tra token/route server." });
    } finally {
      setLoadingImages(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) uploadImage(f);
    e.target.value = "";
  };

  const handleDeleteImage = async (imageId) => {
    if (!imageId) return;
    const token = localStorage.getItem("access_token");
    if (!token) {
      setSnack({ severity: "error", message: "Bạn cần đăng nhập để xóa ảnh." });
      return;
    }

    if (!window.confirm("Xóa ảnh này?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/image-products/${imageId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Delete failed: ${res.status} ${txt}`);
      }
      setImages((prev) => prev.filter((it) => it.id !== imageId));
      setSnack({ severity: "success", message: "Đã xóa ảnh." });

      // If deleted image was current mainImage, switch to first remaining or null
      setMainImage((prevMain) => {
        const remain = images.filter((it) => it.id !== imageId);
        return remain.length > 0 ? remain[0].url : null;
      });
    } catch (err) {
      console.error("delete image error", err);
      setSnack({ severity: "error", message: "Xóa ảnh thất bại." });
    }
  };

  // ---------- New add-to-cart flow (uses localStorage) ----------
  const handleAddToCart = (p) => {
    try {
      const STORAGE_KEY = "cart_items";
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];

      const itemId = p.id;
      const existing = arr.find((it) => it.id === itemId);
      if (existing) {
        existing.qty = (Number(existing.qty) || 0) + Number(quantity || 1);
      } else {
        arr.push({
          id: p.id,
          name: p.name,
          price: typeof p.price === "number" ? p.price : null,
          qty: Number(quantity || 1),
          image_url: mainImage || null,
          slug: p.slug || null,
          description: p.description || "",
        });
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));

      const totalQty = arr.reduce((s, it) => s + (Number(it.qty) || 0), 0);
      localStorage.setItem("guest_cart_count", String(totalQty));
      window.dispatchEvent(new CustomEvent("cartUpdated", { detail: { count: totalQty, items: arr } }));

      incrementLocalCartCount(0);
      setSnack({ severity: "success", message: `${p.name} đã thêm vào giỏ.` });
    } catch (e) {
      console.warn("handleAddToCart error", e);
      setSnack({ severity: "error", message: "Thêm giỏ thất bại." });
    }
  };

  const handleToggleFav = () => {
    setFav((s) => !s);
    setSnack({ severity: "info", message: fav ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích" });
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: "100vh", backgroundColor: "background.default", pb: 6 }}>
        {/* Thin info bar */}
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
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }} onClick={() => navigate("/")}>
                <Typography sx={{ fontWeight: 800, fontSize: 22, letterSpacing: 2, color: "#0D1B2A" }}>DENIM ON</Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 3, alignItems: "center" }}>
                <Button onClick={() => navigate("/trang-chu")} sx={{ color: "#0D1B2A", textTransform: "none" }}>
                  Trang chủ
                </Button>
                <Button onClick={() => navigate("/about")} sx={{ color: "#0D1B2A", textTransform: "none" }}>
                  Giới thiệu
                </Button>
                <Button onClick={() => navigate("/collections")} sx={{ color: "#0D1B2A", textTransform: "none" }}>
                  Sản phẩm
                </Button>
                <Button onClick={() => navigate("/contact")} sx={{ color: "#0D1B2A", textTransform: "none" }}>
                  Liên hệ
                </Button>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <IconButton onClick={() => navigate("/wishlist")} aria-label="wishlist">
                  <FavoriteBorderIcon sx={{ color: "#0D1B2A" }} />
                </IconButton>
                <IconButton onClick={() => navigate("/cart")} aria-label="cart">
                  <ShoppingCartIcon sx={{ color: "#0D1B2A" }} />
                </IconButton>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        {/* Hero section */}
        <Box component="section" sx={{ width: "100%", mt: 0 }}>
          <Box
            sx={{
              width: "100%",
              height: { xs: 220, md: 320 },
              backgroundImage: `url("${heroImageUrl}")`,
              backgroundSize: "cover",
              backgroundPosition: "center center",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Container maxWidth="lg">
              <Grid container>
                <Grid item xs={12} md={7} />
                <Grid item xs={12} md={5} sx={{ display: "flex", alignItems: "center" }}>
                  <Box sx={{ backgroundColor: "rgba(255,255,255,0.95)", p: 2, borderRadius: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: "#0D1B2A", mb: 0.5 }}>
                      Chi tiết sản phẩm
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#0D1B2A" }}>
                      Xem thông tin chi tiết, giá và các phiên bản của sản phẩm.
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      <Button variant="contained" color="primary" onClick={() => navigate("/collections")}>
                        Tất cả sản phẩm
                      </Button>
                      <Button variant="outlined" onClick={() => navigate("/collections?new=1")}>
                        Mới nhất
                      </Button>
                    </Stack>
                  </Box>
                </Grid>
              </Grid>
            </Container>
          </Box>
        </Box>

        {/* Main content */}
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <Typography color="error">{error}</Typography>
              <Button sx={{ ml: 2 }} onClick={() => fetchProductDetail()}>
                Thử lại
              </Button>
            </Box>
          ) : productDetail ? (
            <>
              <Grid container spacing={4}>
                {/* Left column: images + description */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={3} sx={{ p: 2 }}>
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        {/* If mainImage is available (from image_products) show it, otherwise a blank placeholder box */}
                        {mainImage ? (
                          <Box component="img" src={mainImage} alt={`product-${productDetail.id}`} sx={{ width: "100%", borderRadius: 2, objectFit: "cover" }} />
                        ) : (
                          <Box sx={{ width: "100%", height: 420, borderRadius: 2, backgroundColor: "#F3F7F9", display: "flex", alignItems: "center", justifyContent: "center", color: "#8F9BA6" }}>
                            <Typography>Chưa có ảnh cho sản phẩm này</Typography>
                          </Box>
                        )}
                      </Box>

                      <Stack spacing={1} sx={{ width: 100 }}>
                        {loadingImages ? (
                          <Box sx={{ width: "100%", height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CircularProgress size={20} />
                          </Box>
                        ) : images.length ? (
                          images.map((img, i) => (
                            <Box key={img.id || i} sx={{ position: "relative" }}>
                              <Box
                                component="img"
                                src={img.url || ""}
                                alt={`thumb-${i}`}
                                onClick={() => setMainImage(img.url)}
                                sx={{
                                  width: "100%",
                                  height: 80,
                                  objectFit: "cover",
                                  borderRadius: 1,
                                  cursor: "pointer",
                                  border: img.url === mainImage ? "2px solid #162447" : "1px solid rgba(13,27,42,0.06)",
                                }}
                              />
                              {localStorage.getItem("access_token") && (
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteImage(img.id);
                                  }}
                                  sx={{
                                    position: "absolute",
                                    top: 4,
                                    right: 4,
                                    bgcolor: "rgba(255,255,255,0.9)",
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          ))
                        ) : (
                          // no thumb images to display
                          <Box sx={{ width: "100%", height: 80, borderRadius: 1, backgroundColor: "#F7FAFC", display: "flex", alignItems: "center", justifyContent: "center", color: "#9AA8B6" }}>
                            <Typography variant="caption">Không có ảnh</Typography>
                          </Box>
                        )}

                        {/* upload control */}
                        <Box sx={{ mt: 1 }}>
                          <input ref={uploadInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                          <Button startIcon={<UploadIcon />} size="small" onClick={handleUploadClick}>
                            Upload ảnh
                          </Button>
                        </Box>
                      </Stack>
                    </Box>
                  </Paper>

                  <Paper elevation={1} sx={{ mt: 3, p: 2 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                      Mô tả sản phẩm
                    </Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {productDetail.product?.description ?? productDetail.product?.name ?? `Chi tiết #${productDetail.id}`}
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                      Thuộc tính
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2">Màu: {productDetail.color?.name ?? "—"}</Typography>
                      <Typography variant="body2">Size: {productDetail.size?.name ?? "—"}</Typography>
                      <Typography variant="body2">Kho: {productDetail.quantity ?? 0}</Typography>
                      <Typography variant="body2">Mã chi tiết: {productDetail.id}</Typography>
                    </Stack>
                  </Paper>
                </Grid>

                {/* Right column: purchase card */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={6} sx={{ p: 3 }}>
                    <Typography variant="h5" sx={{ fontWeight: 800 }}>
                      {productDetail.product?.name ?? `Chi tiết #${productDetail.id}`}
                    </Typography>

                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                      <StarIcon sx={{ color: "#FFD54F", fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {(productDetail.product?.rating ?? 0).toFixed ? (productDetail.product?.rating ?? 0).toFixed(1) : "—"}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        • Mã SP: {productDetail.product_id ?? "—"}
                      </Typography>
                    </Stack>

                    <Typography variant="h4" sx={{ mt: 2, color: "primary.main", fontWeight: 800 }}>
                      {safePrice(productDetail.price)}
                    </Typography>

                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", px: 2, py: 1, borderRadius: 1, backgroundColor: productDetail.status ? "#E6F0FF" : "#F2F3F5" }}>
                        <Typography variant="body2" sx={{ color: productDetail.status ? "primary.main" : "text.secondary", fontWeight: 700 }}>
                          {productDetail.status ? "Còn hàng" : "Hết hàng"}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "inline-flex", alignItems: "center", px: 2, py: 1, borderRadius: 1, backgroundColor: "#F7FAFC" }}>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          Số lượng: {productDetail.quantity ?? 0}
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                      <TextField label="Số lượng" type="number" size="small" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))} sx={{ width: 140 }} />
                      <Button variant="contained" startIcon={<AddShoppingCartIcon />} onClick={() => handleAddToCart(productDetail)} disabled={!productDetail.status}>
                        Thêm giỏ
                      </Button>
                      <IconButton onClick={handleToggleFav}>
                        <FavoriteBorderIcon color={fav ? "error" : "inherit"} />
                      </IconButton>
                      <IconButton onClick={() => setSnack({ severity: "info", message: "Chia sẻ chưa có." })}>
                        <ShareIcon />
                      </IconButton>
                    </Stack>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="subtitle2">Sản phẩm liên quan</Typography>
                    {loadingRelated ? (
                      <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : (
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        {related.length === 0 ? (
                          <Grid item xs={12}>
                            <Typography variant="body2">Không có sản phẩm liên quan.</Typography>
                          </Grid>
                        ) : (
                          related.map((r) => (
                            <Grid item xs={6} sm={3} key={r.id}>
                              <Card onClick={() => navigate(`/product/${r.id}`)} sx={{ cursor: "pointer" }}>
                                <CardMedia component="img" height="120" image={r.image || "/images/placeholder.png"} alt={r.product?.name ?? `detail-${r.id}`} sx={{ objectFit: "cover" }} />
                                <CardContent sx={{ p: 1 }}>
                                  <Typography variant="body2" noWrap>
                                    {r.product?.name ?? `Chi tiết #${r.id}`}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                    {r.price ? r.price.toLocaleString("vi-VN") + "₫" : "Liên hệ"}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))
                        )}
                      </Grid>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </>
          ) : (
            <Box sx={{ py: 8 }}>
              <Typography textAlign="center">Không có dữ liệu sản phẩm.</Typography>
            </Box>
          )}

          {/* Footer */}
          <Box sx={{ mt: 6 }}>
            <Paper elevation={3} sx={{ p: 3, backgroundColor: "#0D1B2A", borderRadius: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" sx={{ color: "#fff", mb: 1 }}>
                    DENIM ON
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#fff" }}>
                    Thời trang nam cao cấp — giao hàng toàn quốc.
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6} sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                  <Stack direction="row" spacing={2}>
                    <Button variant="outlined" color="inherit" onClick={() => navigate("/contact")}>
                      Liên hệ
                    </Button>
                    <Button variant="contained" color="primary" onClick={() => navigate("/collections")}>
                      Mua ngay
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </Container>

        <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
