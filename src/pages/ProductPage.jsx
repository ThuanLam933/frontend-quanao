import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Rating,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Avatar,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  Card,
  CardMedia,
  CardContent,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ShareIcon from "@mui/icons-material/Share";
import StarIcon from "@mui/icons-material/Star";

// Reuse same API base as HomePage; change if your backend origin differs
const API_BASE = "http://127.0.0.1:8000";

export default function ProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [snack, setSnack] = useState(null);
  const [fav, setFav] = useState(false);

  // Fetch single product
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`);
      if (!res.ok) throw new Error(`Fetch product failed: ${res.status}`);
      const p = await res.json();

      // normalize
      const normalized = {
        id: p.id,
        name: p.name ?? "Không tên",
        slug: p.slug ?? null,
        description: p.description ?? "",
       
        status: typeof p.status === "boolean" ? p.status : !!Number(p.status),
        categories_id: p.categories_id ?? null,
        // backend may return array of image URLs or single image_url. Normalize to array.
        images:
          p.images && Array.isArray(p.images)
            ? p.images.map((u) => (u && u.startsWith("http") ? u : `${API_BASE}/storage/${u}`))
            : p.image_url
            ? [p.image_url.startsWith("http") ? p.image_url : `${API_BASE}/storage/${p.image_url}`]
            : [],
        meta: p.meta ?? {},
        attributes: p.attributes ?? {}, // e.g. sizes, colors if available
      };

      setProduct(normalized);
      setMainImage(normalized.images[0] ?? "/images/placeholder.png");
    } catch (err) {
      console.error(err);
      setError("Không thể tải chi tiết sản phẩm.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch related products (simple strategy: fetch all and pick same category)
  const fetchRelated = useCallback(async (categoryId) => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error(`Fetch products failed: ${res.status}`);
      const arr = await res.json();

      const normalized = arr.map((p) => ({
        id: p.id,
        name: p.name ?? "Không tên",
        price: typeof p.price === "number" ? p.price : null,
        rating: typeof p.rating === "number" ? p.rating : null,
        image_url:
          p.image_url && typeof p.image_url === "string"
            ? p.image_url.startsWith("http")
              ? p.image_url
              : `${API_BASE}/storage/${p.image_url}`
            : null,
        categories_id: p.categories_id ?? null,
      }));

      const filtered = normalized.filter((p) => p.id !== Number(id) && p.categories_id === categoryId).slice(0, 4);
      setRelated(filtered);
    } catch (err) {
      console.warn("Related fetch failed", err);
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (product) fetchRelated(product.categories_id);
  }, [product, fetchRelated]);

  const safePrice = (price) => {
    if (price == null) return "Liên hệ";
    if (typeof price !== "number") return "Liên hệ";
    if (price <= 0) return "Liên hệ";
    return price.toLocaleString("vi-VN") + "₫";
  };

  const handleAddToCart = () => {
    // Replace with real cart API call. For demo, show snackbar.
    setSnack({ severity: "success", message: `${product.name} (${quantity}) đã thêm vào giỏ.` });
  };

  const handleToggleFav = () => {
    setFav((s) => !s);
    setSnack({ severity: "info", message: fav ? "Đã bỏ yêu thích" : "Đã thêm vào yêu thích" });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container sx={{ py: 10 }}>
        <Typography color="error">{error}</Typography>
        <Button sx={{ mt: 2 }} onClick={() => fetchProduct()}>
          Thử lại
        </Button>
      </Container>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">Chi tiết sản phẩm</Typography>
      </Stack>

      <Grid container spacing={3}>
        {/* Left: Images */}
        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ p: 2 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box component="img" src={mainImage} alt={product.name} sx={{ width: "100%", borderRadius: 2, objectFit: "cover" }} />
              </Box>
              <Stack spacing={1} sx={{ width: 100 }}>
                {(product.images.length ? product.images : ["/images/placeholder.png"]).map((img, i) => (
                  <Box
                    key={i}
                    component="img"
                    src={img}
                    alt={`thumb-${i}`}
                    onClick={() => setMainImage(img)}
                    sx={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 1, cursor: "pointer", border: img === mainImage ? "2px solid #64B5F6" : "1px solid rgba(255,255,255,0.06)" }}
                  />
                ))}
              </Stack>
            </Box>
          </Paper>

          {/* Tabs: Description / Reviews (simple stacked layout) */}
          <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Mô tả sản phẩm
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(224,224,224,0.85)" }}>
              {product.description || "Chưa có mô tả chi tiết."}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Đánh giá
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Rating value={product.rating ?? 0} precision={0.1} readOnly />
              <Typography variant="body2">{(product.rating ?? 0).toFixed(1)}</Typography>
            </Stack>

            {/* Example static reviews - replace with real reviews API when ready */}
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Paper sx={{ p: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Avatar sx={{ width: 32, height: 32 }}>A</Avatar>
                  <Box>
                    <Typography variant="subtitle2">Nguyễn A</Typography>
                    <Typography variant="caption" sx={{ color: "rgba(224,224,224,0.6)" }}>2 tuần trước</Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                      <Rating value={4} size="small" readOnly />
                      <Typography variant="body2">Áo đẹp, vừa vặn.</Typography>
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Stack>
          </Paper>
        </Grid>

        {/* Right: Details & Purchase */}
        <Grid item xs={12} md={6}>
          <Paper elevation={4} sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{product.name}</Typography>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
              <Rating value={product.rating ?? 0} readOnly precision={0.1} />
              <Typography variant="body2" sx={{ color: "rgba(224,224,224,0.7)" }}>• Mã: {product.id}</Typography>
            </Stack>

            <Typography variant="h4" sx={{ mt: 2, color: "#1E88E5", fontWeight: 800 }}>{safePrice(product.price)}</Typography>

            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Chip label={product.status ? "Còn hàng" : "Hết hàng"} color={product.status ? "success" : "default"} />
              <Chip label={product.categories_id ? `Danh mục ${product.categories_id}` : "Chưa phân loại"} />
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Attributes: sizes/colors from product.attributes if present */}
            {product.attributes?.sizes && (
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Size</InputLabel>
                <Select value={selectedSize} label="Size" onChange={(e) => setSelectedSize(e.target.value)}>
                  {product.attributes.sizes.map((s) => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField label="Số lượng" type="number" size="small" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))} sx={{ width: 120 }} />

              <Button variant="contained" startIcon={<AddShoppingCartIcon />} onClick={handleAddToCart} disabled={!product.status}>
                Thêm giỏ
              </Button>

              <IconButton onClick={handleToggleFav}>
                <FavoriteBorderIcon color={fav ? "error" : "inherit"} />
              </IconButton>

              <IconButton onClick={() => setSnack({ severity: "info", message: "Chức năng chia sẻ chưa triển khai." })}>
                <ShareIcon />
              </IconButton>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2">Chi tiết nhanh</Typography>
            <ul style={{ marginTop: 8 }}>
              <li>Chất liệu: {product.meta.material ?? "—"}</li>
              <li>Bảo quản: {product.meta.care ?? "—"}</li>
              <li>Giao hàng: {product.meta.shipping ?? "Miễn phí với đơn trên 500k"}</li>
            </ul>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2">Sản phẩm liên quan</Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              {related.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="body2">Không có sản phẩm liên quan.</Typography>
                </Grid>
              ) : (
                related.map((r) => (
                  <Grid item xs={6} sm={3} key={r.id}>
                    <Card onClick={() => navigate(`/product/${r.id}`)} sx={{ cursor: "pointer" }}>
                      <CardMedia component="img" height="120" image={r.image_url || "/images/placeholder.png"} alt={r.name} sx={{ objectFit: "cover" }} />
                      <CardContent sx={{ p: 1 }}>
                        <Typography variant="body2" noWrap>{r.name}</Typography>
                        <Typography variant="caption" sx={{ color: "rgba(224,224,224,0.6)" }}>{r.price ? r.price.toLocaleString("vi-VN") + "₫" : "Liên hệ"}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity} sx={{ width: "100%" }}>{snack.message}</Alert> : null}
      </Snackbar>
    </Container>
  );
}
