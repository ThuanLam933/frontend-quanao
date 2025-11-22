// src/pages/AdminPanel.jsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
  Container,
  Grid,
  Paper,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Pagination,
  Snackbar,
  Alert,
  Stack,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import RefreshIcon from "@mui/icons-material/Refresh";
import HistoryIcon from "@mui/icons-material/History";
import Chip from "@mui/material/Chip";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { useNavigate } from "react-router-dom"; // <-- thêm useNavigate

/**
 * AdminPanel single-file app.
 * - Put in src/pages/AdminPanel.jsx
 * - Add route: <Route path="/admin" element={<AdminPanel />} />
 *
 * Notes:
 * - Assumes your API root variable API_BASE below.
 * - Expects token in localStorage.access_token for write operations.
 * - Each subpage is intentionally simple (list, create/edit, delete).
 * - Extend validations & fields per your backend contract.
 */

const API_BASE = "http://127.0.0.1:8000"; // change if needed

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#F7FAFC", paper: "#fff" },
    primary: { main: "#162447" },
  },
  shape: { borderRadius: 8 },
});

const SIDEBAR_ITEMS = [
  { key: "dashboard", title: "Dashboard" },
  { key: "products", title: "Products" },
  {key: "inventory", title: "Inventory"},
  { key: "categories", title: "Categories" },
  { key: "colors", title: "Colors" },
  { key: "sizes", title: "Sizes" }, // <-- new
  { key: "orders", title: "Orders" },
  { key: "users", title: "Users" },
  { key: "returns", title: "Returns" },
  { key: "stock", title: "Stock Entries" },
  { key: "comments", title: "Comments" },
  { key: "images", title: "Image Manager" },
];

export default function AdminPanel() {
  const [open, setOpen] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [snack, setSnack] = useState(null);
  const navigate = useNavigate(); // <-- để điều hướng khi logout

  // handle logout: xóa token & user, show snackbar, chuyển về /login
  const handleLogout = () => {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user"); // nếu bạn lưu thông tin user
    } catch (e) {
      console.warn("logout cleanup", e);
    }
    setSnack({ severity: "info", message: "Đã đăng xuất." });
    // điều hướng sau một chút để snackbar hiện
    setTimeout(() => {
      navigate("/login");
    }, 700);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: "flex", minHeight: "100vh", backgroundColor: "background.default" }}>
        <AppBar position="fixed" sx={{ zIndex: 1400 }}>
          <Toolbar>
            <IconButton color="inherit" onClick={() => setOpen((s) => !s)} edge="start" sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Admin Panel
            </Typography>
            <Button color="inherit" onClick={handleLogout}>
              Logout
            </Button>
          </Toolbar>
        </AppBar>

        <Drawer variant="persistent" open={open} sx={{ width: 260, flexShrink: 0, "& .MuiDrawer-paper": { width: 260, boxSizing: "border-box", mt: 8 } }}>
          <Toolbar />
          <Box sx={{ overflow: "auto" }}>
            <List>
              {SIDEBAR_ITEMS.map((it) => (
                <ListItem key={it.key} disablePadding>
                  <ListItemButton selected={page === it.key} onClick={() => setPage(it.key)}>
                    <ListItemText primary={it.title} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <Toolbar />
          <Container maxWidth="xl">
            {page === "dashboard" && <DashboardPage setSnack={setSnack} />}

            {page === "products" && <ProductsPage setSnack={setSnack} />}
            {page === "inventory" && <InventoryPage setSnack={setSnack} />}
            {page === "categories" && <CategoriesPage setSnack={setSnack} />} {/* <-- render categories */}
            {page === "colors" && <ColorsPage setSnack={setSnack} />}
            {page === "sizes" && <SizesPage setSnack={setSnack} />}

            {page === "orders" && <OrdersPage setSnack={setSnack} />}

            {page === "users" && <UsersPage setSnack={setSnack} />}

            {page === "returns" && <ReturnsPage setSnack={setSnack} />}

            {page === "stock" && <StockPage setSnack={setSnack} />}
            {page === "comments" && <CommentsPage setSnack={setSnack} />}

            {page === "images" && <ImageAdminPage setSnack={setSnack} />}
          </Container>
        </Box>

        <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
          {snack ? <Alert onClose={() => setSnack(null)} severity={snack.severity}>{snack.message}</Alert> : null}
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

/* ---------------------- Dashboard ---------------------- */
function DashboardPage({ setSnack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("access_token");

    const fetchWithAuth = (url) =>
      fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

    const [pRes, oRes, uRes] = await Promise.all([
      fetch(`${API_BASE}/api/product-details`),
      fetchWithAuth(`${API_BASE}/api/orders`),

      fetchWithAuth(`${API_BASE}/api/admin/users`),
    ]);

    const [p, o, u] = await Promise.all([
      pRes.ok ? pRes.json().catch(()=>[]) : [],
      oRes.ok ? oRes.json().catch(()=>[]) : [],
      uRes.ok ? uRes.json().catch(()=>[]) : [],
    ]);

    // Normalize users
    let uArr = [];
    if (Array.isArray(u)) uArr = u;
    else if (Array.isArray(u.data)) uArr = u.data;

    // -------- FIX ORDER COUNT --------
    let orderCount = 0;

    if (typeof o === "object" && o !== null) {
      if (typeof o.total === "number") {
        orderCount = o.total; // BEST CASE
      } else if (Array.isArray(o.data)) {
        orderCount = o.data.length; // fallback
      } else if (Array.isArray(o)) {
        orderCount = o.length; // fallback mảng
      }
    }

    setStats({
      products: Array.isArray(p) ? p.length : (p.total ?? p.data?.length ?? 0),
      orders: orderCount,
      users: uArr.filter(x => x.role === "user").length,
    });

  } catch (err) {
    console.warn("dashboard fetch error", err);
    setSnack({ severity: "error", message: "Không thể tải số liệu dashboard." });
  } finally {
    setLoading(false);
  }
}, [setSnack]);



  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Overview</Typography>
      {loading ? <CircularProgress /> : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}><StatCard title="Products" value={stats?.products ?? "—"} /></Grid>
          <Grid item xs={12} md={4}><StatCard title="Orders" value={stats?.orders ?? "—"} /></Grid>
          <Grid item xs={12} md={4}><StatCard title="Users" value={stats?.users ?? "—"} /></Grid>
        </Grid>
      )}
    </Paper>
  );
}
function StatCard({ title, value }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
      <Typography variant="h4" sx={{ mt: 1 }}>{value}</Typography>
    </Paper>
  );
}

/* ---------------------- Categories (NEW) ---------------------- */
function CategoriesPage({ setSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [totalPages, setTotalPages] = useState(1);

  // --- helper slugify (remove diacritics, lower, replace spaces -> -) ---
  const slugify = (text) => {
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories`);
      if (!res.ok) throw new Error("Categories fetch failed");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
      setItems(arr);
      setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
    } catch (err) {
      console.error("fetchCategories", err);
      setSnack({ severity: "error", message: "Không tải được categories." });
      setItems([]);
    } finally { setLoading(false); }
  }, [setSnack]);

  useEffect(()=> { fetchCategories(); }, [fetchCategories]);

  const onEdit = (item) => { setEditing(item); setEditOpen(true); };
  const onCreate = () => { setEditing({ name: "", slug: "", description: "" }); setEditOpen(true); };

  const handleSave = async (obj) => {
    const token = localStorage.getItem("access_token");
    try {
      const method = obj.id ? "PUT" : "POST";
      const url = obj.id ? `${API_BASE}/api/categories/${obj.id}` : `${API_BASE}/api/categories`;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(obj),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=>(""));
        throw new Error(txt || "Save failed");
      }
      setSnack({ severity: "success", message: "Lưu danh mục thành công" });
      setEditOpen(false);
      fetchCategories();
    } catch (err) {
      console.error("save category", err);
      setSnack({ severity: "error", message: "Lưu danh mục thất bại" });
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("access_token");
    if (!window.confirm("Xóa danh mục?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Delete failed");
      setSnack({ severity: "success", message: "Đã xóa danh mục" });
      fetchCategories();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Xóa thất bại" });
    }
  };

  const visible = items.slice((page-1)*PAGE_SIZE, (page)*PAGE_SIZE);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Categories</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>Create category</Button>
      </Stack>

      <Paper>
        {loading ? <Box sx={{ p:3, display:"flex", justifyContent:"center" }}><CircularProgress/></Box> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.slug ?? "-"}</TableCell>
                    <TableCell>{c.description ?? "-"}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<VisibilityIcon/>} onClick={()=> window.open(`/collections?category=${c.slug || c.name}`,"_blank")}>View</Button>
                      <Button size="small" startIcon={<EditIcon/>} onClick={()=> onEdit(c)}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon/>} onClick={()=> handleDelete(c.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ display:"flex", justifyContent:"center", p:2 }}>
              <Pagination count={totalPages} page={page} onChange={(_,v)=> setPage(v)} />
            </Box>
          </TableContainer>
        )}
      </Paper>

      <CategoryEditDialog open={editOpen} onClose={()=>setEditOpen(false)} item={editing} onSave={handleSave} slugify={slugify}/>
    </Box>
  );
}

// CategoryEditDialog is defined here (inside same file) but used by the function above.
// It accepts slugify prop so it's reusable.
function CategoryEditDialog({ open, onClose, item, onSave, slugify }) {
  const [form, setForm] = useState(item ?? null);
  const [manualSlug, setManualSlug] = useState(false);

  useEffect(()=> {
    setForm(item ?? null);
    setManualSlug(!!(item && item.slug));
  }, [item]);

  const onNameChange = (value) => {
    const next = { ...(form || {}), name: value };
    if (!manualSlug) {
      next.slug = slugify(value);
    }
    setForm(next);
  };

  const onSlugChange = (value) => {
    setManualSlug(true);
    setForm({ ...(form || {}), slug: value });
  };

  if (!form) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? "Edit category" : "Create category"}</DialogTitle>
      <DialogContent>
        <TextField label="Name" fullWidth value={form.name || ""} onChange={(e)=> onNameChange(e.target.value)} sx={{ mt:1 }} />
        <TextField label="Slug" fullWidth value={form.slug ?? ""} onChange={(e)=> onSlugChange(e.target.value)} sx={{ mt:1 }} helperText="Nếu muốn slug khác mặc định, chỉnh tay vào đây." />
        <TextField label="Description" fullWidth multiline minRows={3} value={form.description ?? ""} onChange={(e)=> setForm({...form, description: e.target.value})} sx={{ mt:1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={()=> onSave(form)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}


/* ---------------------- Colors ---------------------- */
/* ---------------------- Colors (replaces CategoriesPage) ---------------------- */
function ColorsPage({ setSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [totalPages, setTotalPages] = useState(1);

  // --- helper slugify (remove diacritics, lower, replace spaces -> -) ---
  const slugify = (text) => {
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const fetchColors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/colors`);
      if (!res.ok) throw new Error("Colors fetch failed");
      const data = await res.json();

      // hỗ trợ array hoặc response có data/items
      const rawArr = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
      const arr = (rawArr || []).map((it) => {
        const name = it.name ?? it.title ?? "";
        const slug = it.slug ?? (name ? slugify(name) : "");
        return { ...it, name, slug };
      });

      setItems(arr);
      setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
    } catch (err) {
      console.error("fetchColors", err);
      setSnack({ severity: "error", message: "Không tải được colors." });
      setItems([]);
    } finally { setLoading(false); }
  }, [setSnack]);

  useEffect(()=> { fetchColors(); }, [fetchColors]);

  const onEdit = (item) => { setEditing(item); setEditOpen(true); };
  const onCreate = () => { setEditing({ name: "", slug: "" }); setEditOpen(true); };

  const handleSave = async (obj) => {
    const token = localStorage.getItem("access_token");
    try {
      const method = obj.id ? "PUT" : "POST";
      const url = obj.id ? `${API_BASE}/api/colors/${obj.id}` : `${API_BASE}/api/colors`;
      const payload = {
        name: obj.name,
        slug: obj.slug && String(obj.slug).trim() ? obj.slug : slugify(obj.name),
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        throw new Error(txt || "Save failed");
      }
      setSnack({ severity: "success", message: "Lưu color thành công" });
      setEditOpen(false);
      fetchColors();
    } catch (err) {
      console.error("save color", err);
      setSnack({ severity: "error", message: "Lưu color thất bại" });
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("access_token");
    if (!window.confirm("Xóa color?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/colors/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Delete failed");
      setSnack({ severity: "success", message: "Đã xóa color" });
      fetchColors();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Xóa thất bại" });
    }
  };

  const visible = items.slice((page-1)*PAGE_SIZE, (page)*PAGE_SIZE);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Colors</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>Create color</Button>
      </Stack>

      <Paper>
        {loading ? <Box sx={{ p:3, display:"flex", justifyContent:"center" }}><CircularProgress/></Box> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.slug ?? "-"}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<VisibilityIcon/>} onClick={()=> window.open(`/collections?color=${c.slug || c.name}`,"_blank")}>View</Button>
                      <Button size="small" startIcon={<EditIcon/>} onClick={()=> onEdit(c)}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon/>} onClick={()=> handleDelete(c.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ display:"flex", justifyContent:"center", p:2 }}>
              <Pagination count={totalPages} page={page} onChange={(_,v)=> setPage(v)} />
            </Box>
          </TableContainer>
        )}
      </Paper>

      <ColorEditDialog open={editOpen} onClose={()=>setEditOpen(false)} item={editing} onSave={handleSave} slugify={slugify}/>
    </Box>
  );
}

// ColorEditDialog (without hex & preview)
function ColorEditDialog({ open, onClose, item, onSave, slugify }) {
  const [form, setForm] = useState(item ?? null);
  const [manualSlug, setManualSlug] = useState(false);

  useEffect(()=> {
    setForm(item ?? null);
    // nếu edit một item có slug sẵn thì coi đó là manual (không tự override)
    setManualSlug(!!(item && item.slug));
  }, [item]);

  const onNameChange = (value) => {
    const next = { ...(form || {}), name: value };
    if (!manualSlug) {
      next.slug = slugify(value);
    }
    setForm(next);
  };

  const onSlugChange = (value) => {
    setManualSlug(true);
    setForm({ ...(form || {}), slug: value });
  };

  if (!form) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? "Edit color" : "Create color"}</DialogTitle>
      <DialogContent>
        <TextField
          label="Name"
          fullWidth
          value={form.name || ""}
          onChange={(e)=> onNameChange(e.target.value)}
          sx={{ mt:1 }}
        />
        <TextField
          label="Slug"
          fullWidth
          value={form.slug ?? ""}
          onChange={(e)=> onSlugChange(e.target.value)}
          sx={{ mt:1 }}
          helperText="Nếu muốn slug khác mặc định, chỉnh tay vào đây."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={()=> onSave(form)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}


/* ---------------------- Sizes ---------------------- */
function SizesPage({ setSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [totalPages, setTotalPages] = useState(1);

  // helper slugify
  const slugify = (text) => {
    if (!text) return "";
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const fetchSizes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sizes`);
      if (!res.ok) throw new Error("Sizes fetch failed");
      const data = await res.json();

      // support array or paginated response
      const rawArr = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
      const arr = (rawArr || []).map((it) => {
        const name = it.name ?? it.title ?? "";
        const slug = it.slug ?? (name ? slugify(name) : "");
        return { ...it, name, slug };
      });

      setItems(arr);
      setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
    } catch (err) {
      console.error("fetchSizes", err);
      setSnack({ severity: "error", message: "Không tải được sizes." });
      setItems([]);
    } finally { setLoading(false); }
  }, [setSnack]);

  useEffect(()=> { fetchSizes(); }, [fetchSizes]);

  const onEdit = (item) => { setEditing(item); setEditOpen(true); };
  const onCreate = () => { setEditing({ name: "", slug: "" }); setEditOpen(true); };

  const handleSave = async (obj) => {
    const token = localStorage.getItem("access_token");
    try {
      const method = obj.id ? "PUT" : "POST";
      const url = obj.id ? `${API_BASE}/api/sizes/${obj.id}` : `${API_BASE}/api/sizes`;
      const payload = { name: obj.name, slug: obj.slug }; // only send name+slug
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        throw new Error(txt || "Save failed");
      }
      setSnack({ severity: "success", message: "Lưu size thành công" });
      setEditOpen(false);
      fetchSizes();
    } catch (err) {
      console.error("save size", err);
      setSnack({ severity: "error", message: "Lưu size thất bại" });
    }
  };

  const handleDelete = async (id) => {
    const token = localStorage.getItem("access_token");
    if (!window.confirm("Xóa size?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/sizes/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Delete failed");
      setSnack({ severity: "success", message: "Đã xóa size" });
      fetchSizes();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Xóa thất bại" });
    }
  };

  const visible = items.slice((page-1)*PAGE_SIZE, (page)*PAGE_SIZE);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Sizes</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>Create size</Button>
      </Stack>

      <Paper>
        {loading ? <Box sx={{ p:3, display:"flex", justifyContent:"center" }}><CircularProgress/></Box> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.id}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.slug ?? "-"}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<VisibilityIcon/>} onClick={()=> window.open(`/collections?size=${c.slug || c.name}`,"_blank")}>View</Button>
                      <Button size="small" startIcon={<EditIcon/>} onClick={()=> onEdit(c)}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon/>} onClick={()=> handleDelete(c.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ display:"flex", justifyContent:"center", p:2 }}>
              <Pagination count={totalPages} page={page} onChange={(_,v)=> setPage(v)} />
            </Box>
          </TableContainer>
        )}
      </Paper>

      <SizeEditDialog open={editOpen} onClose={()=>setEditOpen(false)} item={editing} onSave={handleSave} slugify={slugify}/>
    </Box>
  );
}

function SizeEditDialog({ open, onClose, item, onSave, slugify }) {
  const [form, setForm] = useState(item ?? null);
  const [manualSlug, setManualSlug] = useState(false);

  useEffect(()=> {
    setForm(item ?? null);
    setManualSlug(!!(item && item.slug));
  }, [item]);

  const onNameChange = (value) => {
    const next = { ...(form || {}), name: value };
    if (!manualSlug) {
      next.slug = slugify(value);
    }
    setForm(next);
  };

  const onSlugChange = (value) => {
    setManualSlug(true);
    setForm({ ...(form || {}), slug: value });
  };

  if (!form) return null;
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{form.id ? "Edit size" : "Create size"}</DialogTitle>
      <DialogContent>
        <TextField label="Name" fullWidth value={form.name || ""} onChange={(e)=> onNameChange(e.target.value)} sx={{ mt:1 }} />
        <TextField label="Slug" fullWidth value={form.slug ?? ""} onChange={(e)=> onSlugChange(e.target.value)} sx={{ mt:1 }} helperText="Nếu muốn slug khác mặc định, chỉnh tay vào đây." />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={()=> onSave(form)}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}



/* ---------------------- Products ---------------------- */
/* ---------------------- Products (with image upload) ---------------------- */
/* ---------------------- Products ---------------------- */
/* ProductsPage (updated: loads categories/colors/sizes and passes to dialog) */
/* ---------------------- Products ---------------------- */
/* ProductsPage (status: 1 = còn hàng, 0 = hết hàng) */
/* ---------------------- Products (ProductsPage + ProductEditDialog) ---------------------- */
function ProductsPage({ setSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [totalPages, setTotalPages] = useState(1);

  // option lists
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [optsLoading, setOptsLoading] = useState(false);

  const fetchProducts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error("Products fetch failed");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
      setItems(arr);
      setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
    } catch (err) {
      console.error("fetchProducts", err);
      setSnack({ severity: "error", message: "Không tải được products." });
      setItems([]);
    } finally { setLoading(false); }
  }, [setSnack]);

  const fetchOptions = useCallback(async () => {
    setOptsLoading(true);
    try {
      const [cRes, colRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/api/categories`),
        fetch(`${API_BASE}/api/colors`),
        fetch(`${API_BASE}/api/sizes`)
      ]);

      const [cData, colData, sData] = await Promise.all([
        cRes.ok ? cRes.json().catch(()=>[]) : [],
        colRes.ok ? colRes.json().catch(()=>[]) : [],
        sRes.ok ? sRes.json().catch(()=>[]) : []
      ]);

      const normalize = (d) => Array.isArray(d) ? d : (d.data ?? d.items ?? []);
      setCategories(normalize(cData));
      setColors(normalize(colData));
      setSizes(normalize(sData));
    } catch (err) {
      console.error("fetchOptions", err);
      setSnack({ severity: "warning", message: "Không tải được options (categories/colors/sizes)." });
      setCategories([]); setColors([]); setSizes([]);
    } finally { setOptsLoading(false); }
  }, [setSnack]);

  useEffect(() => { fetchProducts(); fetchOptions(); }, [fetchProducts, fetchOptions]);

  const onEdit = (item) => {
    // derive quantity from first_detail if available
    const qty = item.first_detail?.quantity ?? item.quantity ?? 0;
    setEditing({
      ...item,
      image_url: item.image_url ?? (item.image ?? null),
      images: item.images ?? [],
      price: item.first_detail?.price ?? item.price ?? '',
      colors_id: item.first_detail?.color?.id ?? item.colors_id ?? (item.color_id ?? ""),
      sizes_id: item.first_detail?.size?.id ?? item.sizes_id ?? (item.size_id ?? ""),
      categories_id: item.categories_id ?? item.category_id ?? (item.category?.id ?? ""),
      // keep numeric quantity so user can edit value if needed
      quantity: Number(qty),
      // form status default = based on quantity (but final source of truth is product_detail quantity)
      status: Number(qty) > 0 ? 1 : 0,
    });
    setEditOpen(true);
  };

  const onCreate = () => {
    setEditing({
      name: "",
      description: "",
      price: 0,
      status: 1, // default: còn hàng
      categories_id: "",
      colors_id: "",
      sizes_id: "",
      images: [],
      image_url: "",
      quantity: 0,
    });
    setEditOpen(true);
  };

  // handleSave (same signature as before)
  const handleSave = async (obj, files = []) => {
    const token = localStorage.getItem("access_token");
    if (!obj || !obj.name || String(obj.name).trim() === "") {
      setSnack({ severity: "error", message: "Tên sản phẩm không được để trống" });
      return;
    }

    setLoading(true);
    try {
      const isUpdate = !!obj.id;
      const endpoint = isUpdate ? `${API_BASE}/api/products/${obj.id}` : `${API_BASE}/api/products`;
      const fd = new FormData();

      const payload = { ...obj };
      // đảm bảo có description (backend có thể required)
      if (payload.description === undefined || payload.description === null) payload.description = "";

      // normalize status: treat truthy/"1"/1 as 1, otherwise 0
      if (payload.status === true || payload.status === "true" || payload.status === "1" || payload.status === 1) payload.status = 1;
      else payload.status = 0;

      // --- Build details: kiểm tra !== undefined để chấp nhận giá trị 0 ---
      const details = [];
      if (
        payload.price !== undefined ||
        payload.colors_id !== undefined ||
        payload.sizes_id !== undefined ||
        payload.quantity !== undefined
      ) {
        details.push({
          price: payload.price !== undefined && payload.price !== "" ? payload.price : null,
          color_id: payload.colors_id || null,
          size_id: payload.sizes_id || null,
          // đảm bảo gửi số (0 chấp nhận)
          quantity: payload.quantity !== undefined && payload.quantity !== null ? Number(payload.quantity) : 0,
          status: payload.detail_status !== undefined ? payload.detail_status : 1,
        });
      }

      // remove fields that are moved into details
      delete payload.price;
      delete payload.colors_id;
      delete payload.sizes_id;
      delete payload.quantity;
      delete payload.detail_status;

      // append other payload fields to FormData (0 and "" will be appended)
      Object.keys(payload).forEach(k => {
        const v = payload[k];
        if (v !== undefined && v !== null) fd.append(k, v);
      });

      if (details.length) fd.append('details', JSON.stringify(details));

      if (files && files.length) {
        for (let i = 0; i < files.length; i++) {
          fd.append('images[]', files[i], files[i].name);
        }
      }

      // When update: use method override PUT (Laravel)
      if (isUpdate) fd.append('_method', 'PUT');

      const res = await fetch(endpoint, {
        method: 'POST', // use POST so _method works
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });

      if (res.ok) {
        setSnack({ severity: 'success', message: 'Lưu thành công' });
        setEditOpen(false);
        await fetchProducts();
        return;
      } else {
        const txt = await res.text().catch(() => "");
        console.error("save product failed:", endpoint, res.status, txt);
        try {
          const j = JSON.parse(txt || "{}");
          const errMsg = j.message || txt || `Lưu thất bại (${res.status})`;
          setSnack({ severity: "error", message: errMsg });
        } catch {
          setSnack({ severity: "error", message: `Lưu thất bại (${res.status}). Xem console.` });
        }
      }
    } catch (err) {
      console.error("save product error", err);
      setSnack({ severity: "error", message: "Lỗi khi lưu sản phẩm" });
    } finally { setLoading(false); }
  };


  const handleDelete = async (id) => {
    const token = localStorage.getItem("access_token");
    if (!window.confirm("Xóa sản phẩm?")) return;
    try {
      const endpoint = `${API_BASE}/api/products/${id}`;
      const res = await fetch(endpoint, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) {
        const txt = await res.text().catch(()=>"");
        console.error("delete product failed:", endpoint, res.status, txt);
        const msg = txt || `Delete failed (${res.status})`;
        setSnack({ severity: "error", message: msg });
        return;
      }
      setSnack({ severity: "success", message: "Đã xóa" });
      fetchProducts();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Xóa thất bại" });
    }
  };

  const visible = items.slice((page-1)*PAGE_SIZE, (page)*PAGE_SIZE);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Products</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreate}>Create product</Button>
      </Stack>

      <Paper>
        {loading ? <Box sx={{ p:3, display:"flex", justifyContent:"center" }}><CircularProgress/></Box> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Image</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.id}</TableCell>
                    <TableCell>{p.name ?? p.title}</TableCell>
                    <TableCell>{p.first_detail?.price ? Number(p.first_detail.price).toLocaleString("vi-VN")+"₫" : "—"}</TableCell>

                    {/* Quantity column: show numeric value when possible */}
                    <TableCell>
                      {(() => {
                        const qty = (p.first_detail && typeof p.first_detail.quantity === 'number') ? p.first_detail.quantity
                                  : (p.quantity !== undefined && p.quantity !== null ? p.quantity : null);
                        if (qty === null) return "—";
                        return Number(qty).toLocaleString("en-US");
                      })()}
                    </TableCell>

                    <TableCell>{p.slug ?? "-"}</TableCell>
                    <TableCell>{p.description ?? "-"}</TableCell>

                    {/* Status column: derive from quantity (first_detail preferred) */}
                    <TableCell>
                      {(() => {
                        const qty = (p.first_detail && typeof p.first_detail.quantity === 'number') ? p.first_detail.quantity
                                  : (p.quantity !== undefined && p.quantity !== null ? p.quantity : null);
                        if (qty === null) {
                          // fallback to product.status if quantity unknown
                          if (p.status === 1 || p.status === "1" || p.status === true) {
                            return <Typography variant="body2" component="span" color="success.main">Còn hàng</Typography>;
                          } else {
                            return <Typography variant="body2" component="span" color="text.secondary">Hết hàng</Typography>;
                          }
                        }
                        return Number(qty) > 0
                          ? <Typography variant="body2" component="span" color="success.main">Còn hàng</Typography>
                          : <Typography variant="body2" component="span" color="text.secondary">Hết hàng</Typography>;
                      })()}
                    </TableCell>

                    <TableCell>{p.categories_id ?? (p.category?.name ?? "-")}</TableCell>
                    <TableCell>{ p.first_detail?.color?.name ?? "—" }</TableCell>
                    <TableCell>{ p.first_detail?.size?.name ?? "—" }</TableCell>
                    <TableCell>
                      {p.image_url ? (
                        <img src={p.image_url} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4 }} />
                      ) : (Array.isArray(p.images) && p.images.length ? (
                        <img src={p.images[0]} alt="" style={{ width: 60, height: 40, objectFit: "cover", borderRadius: 4 }} />
                      ) : "—")}
                    </TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<VisibilityIcon/>} onClick={()=> window.open(`/product/${p.id}`,"_blank")}>View</Button>
                      <Button size="small" startIcon={<EditIcon/>} onClick={()=> onEdit(p)}>Edit</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon/>} onClick={()=> handleDelete(p.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ display:"flex", justifyContent:"center", p:2 }}>
              <Pagination count={totalPages} page={page} onChange={(_,v)=> setPage(v)} />
            </Box>
          </TableContainer>
        )}
      </Paper>

      <ProductEditDialog
        open={editOpen}
        onClose={()=>setEditOpen(false)}
        item={editing}
        onSave={handleSave}
        categories={categories}
        colors={colors}
        sizes={sizes}
        optsLoading={optsLoading}
      />
    </Box>
  );
}

/* Product edit/create dialog with status select (1 = còn hàng, 0 = hết hàng) */
function ProductEditDialog({ open, onClose, item, onSave, categories = [], colors = [], sizes = [], optsLoading = false }) {
  const [form, setForm] = useState(item ?? null);
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(()=> {
    setForm(item ? { ...item } : null);
    setFiles([]);
    setPreviews([]);
  }, [item]);

  useEffect(()=> {
    if (!files || files.length === 0) { setPreviews([]); return; }
    const readers = [];
    const results = [];
    files.forEach((f, idx) => {
      const r = new FileReader();
      readers.push(r);
      r.onload = (e) => {
        results[idx] = e.target.result;
        if (results.filter(Boolean).length === files.length) setPreviews([...results]);
      };
      r.readAsDataURL(f);
    });
    return () => { readers.forEach(r => { try{ r.abort(); }catch{} }); };
  }, [files]);

  if (!form) return null;

  const handleFilesChange = (e) => {
    const fl = Array.from(e.target.files || []);
    setFiles(fl);
  };

  const handleSaveClick = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      // normalize status strictly to 1 or 0
      if (payload.status === true || payload.status === "true" || payload.status === "1" || payload.status === 1) payload.status = 1;
      else payload.status = 0;

      if (payload.categories_id === "" || payload.categories_id === null) payload.categories_id = null;
      if (payload.colors_id === "" || payload.colors_id === null) payload.colors_id = null;
      if (payload.sizes_id === "" || payload.sizes_id === null) payload.sizes_id = null;

      // ensure description exists (backend may require)
      if (payload.description === undefined || payload.description === null) payload.description = "";

      // ensure quantity is numeric (could be 0)
      if (payload.quantity === undefined || payload.quantity === null) payload.quantity = 0;
      else payload.quantity = Number(payload.quantity);

      await onSave(payload, files);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{form.id ? "Edit product" : "Create product"}</DialogTitle>
      <DialogContent>
        <TextField label="Name" fullWidth value={form.name || ""} onChange={(e)=> setForm({...form, name: e.target.value})} sx={{ mt:1 }} />
        <TextField label="Price" fullWidth value={form.price ?? ""} onChange={(e)=> setForm({...form, price: e.target.value})} sx={{ mt:1 }} />
        <TextField label="Description" fullWidth multiline minRows={3} value={form.description ?? ""} onChange={(e)=> setForm({...form, description: e.target.value})} sx={{ mt:1 }} />

        {/* Status select (kept for manual override) */}
        <TextField
          select
          label="Status"
          fullWidth
          value={String(form.status ?? "1")}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          sx={{ mt: 1 }}
          helperText="1 = Còn hàng, 0 = Hết hàng (lưu ý: hệ thống sẽ ưu tiên quantity của detail để hiện thị status)"
        >
          <MenuItem value={"1"}>Còn hàng</MenuItem>
          <MenuItem value={"0"}>Hết hàng</MenuItem>
        </TextField>

        {/* Category select */}
        <TextField
          select
          label="Category"
          fullWidth
          value={form.categories_id ?? ""}
          onChange={(e) => setForm({ ...form, categories_id: e.target.value })}
          sx={{ mt: 1 }}
          helperText={optsLoading ? "Loading categories..." : ""}
        >
          <MenuItem value="">-- none --</MenuItem>
          {categories.map(c => (
            <MenuItem key={c.id ?? c.slug ?? c.name} value={c.id ?? c.slug ?? c.name}>
              {c.name ?? c.title ?? c.slug}
            </MenuItem>
          ))}
        </TextField>

        {/* Color select */}
        <TextField
          select
          label="Color"
          fullWidth
          value={form.colors_id ?? ""}
          onChange={(e) => setForm({ ...form, colors_id: e.target.value })}
          sx={{ mt: 1 }}
          helperText={optsLoading ? "Loading colors..." : ""}
        >
          <MenuItem value="">-- none --</MenuItem>
          {colors.map(c => (
            <MenuItem key={c.id ?? c.slug ?? c.name} value={c.id ?? c.slug ?? c.name}>
              {c.name ?? c.title ?? c.slug}
            </MenuItem>
          ))}
        </TextField>

        {/* Size select */}
        <TextField
          select
          label="Size"
          fullWidth
          value={form.sizes_id ?? ""}
          onChange={(e) => setForm({ ...form, sizes_id: e.target.value })}
          sx={{ mt: 1 }}
          helperText={optsLoading ? "Loading sizes..." : ""}
        >
          <MenuItem value="">-- none --</MenuItem>
          {sizes.map(s => (
            <MenuItem key={s.id ?? s.slug ?? s.name} value={s.id ?? s.slug ?? s.name}>
              {s.name ?? s.title ?? s.slug}
            </MenuItem>
          ))}
        </TextField>

        {/* Quantity field: numeric input (important - status displayed from this) */}
        <TextField
          label="Quantity (for first detail)"
          fullWidth
          type="number"
          value={form.quantity ?? 0}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
          sx={{ mt: 1 }}
          helperText="Số lượng sẽ quyết định hiển thị Status (Còn/Hết hàng) sau khi lưu"
        />

        <Box sx={{ mt:2 }}>
          <Typography variant="subtitle2">Images</Typography>
          <input type="file" accept="image/*" multiple onChange={handleFilesChange} style={{ marginTop: 8 }} />
          <Box sx={{ mt:1, display:"flex", gap:1, flexWrap:"wrap" }}>
            {previews.map((p, idx) => (
              <Paper key={idx} sx={{ width: 120, height: 90, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src={p} alt={`preview-${idx}`} style={{ maxWidth:"100%", maxHeight:"100%" }} />
              </Paper>
            ))}
            {(!previews.length && form.image_url) && (
              <Paper sx={{ width:120, height:90, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <img src={form.image_url} alt="existing" style={{ maxWidth:"100%", maxHeight:"100%" }} />
              </Paper>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSaveClick} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}
/* ---------------------- Orders ---------------------- */
function OrdersPage({ setSnack }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(null);

  // -------------------------------
  // FETCH ORDERS (ADMIN GET ALL)
  // -------------------------------
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");

      const res = await fetch(`${API_BASE}/api/orders-all`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) throw new Error("Orders fetch failed");

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.data ?? [];

      setOrders(arr);
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Không tải danh sách đơn hàng!" });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [setSnack]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleView = (o) => setSel(o);

  // -------------------------------
  // UPDATE STATUS (ADMIN)
  // -------------------------------
  const changeStatus = async (orderId, status) => {
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error("Status update failed");

      setSnack({ severity: "success", message: "Cập nhật trạng thái thành công!" });
      fetchOrders();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Cập nhật thất bại!" });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Orders (Admin)</Typography>
        <Button onClick={fetchOrders}>Refresh</Button>
      </Stack>

      <Paper>
        {loading ? (
          <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Customer Name</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.id}</TableCell>
                    <TableCell>{o.user?.email ?? "—"}</TableCell>
                    <TableCell>{o.name ?? "—"}</TableCell>

                    <TableCell>
                      {o.total_price
                        ? Number(o.total_price).toLocaleString("vi-VN") + "₫"
                        : "—"}
                    </TableCell>

                    <TableCell>{o.payment_method ?? "—"}</TableCell>
                    <TableCell>{o.status ?? "—"}</TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleView(o)}
                      >
                        View
                      </Button>

                      {/* Demo update status */}
                      <Button
                        size="small"
                        onClick={() => changeStatus(o.id, "confirmed")}
                      >
                        Confirm
                      </Button>

                      <Button
                        size="small"
                        onClick={() => changeStatus(o.id, "cancelled")}
                        color="error"
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ---------------------- Dialog detail ---------------------- */}
      <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="md" fullWidth>
        <DialogTitle>Order #{sel?.id}</DialogTitle>
        <DialogContent>
          <Typography>Email: {sel?.email}</Typography>
          <Typography>Phone: {sel?.phone}</Typography>
          <Typography>Address: {sel?.address}</Typography>
          <Typography sx={{ mt: 2 }}>
            Total Price:{" "}
            {sel?.total_price
              ? Number(sel.total_price).toLocaleString("vi-VN") + "₫"
              : "—"}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSel(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


/* ---------------------- Users ---------------------- */
function UsersPage({ setSnack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- Hàm lấy token an toàn ---
  const getStoredToken = () => {
    let token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("token") ||
      null;

    if (!token) return null;

    try {
      const maybe = JSON.parse(token);
      if (typeof maybe === "string") token = maybe;
    } catch (e) {}

    return String(token).trim();
  };

  // --- Fetch Users ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const token = getStoredToken();
      console.log("Token dùng để fetch:", token);

      const res = await fetch("http://127.0.0.1:8000/api/admin/users", {
        method: "GET",
        headers: {
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) throw new Error("users fetch failed");

      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];

      setUsers(arr);
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Không tải users" });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [setSnack]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- Toggle Lock / Unlock ---
  const toggleLock = async (u) => {
    const token = getStoredToken();

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/users/${u.id}/toggle-lock`,
        {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({})
        }
      );

      if (!res.ok) throw new Error("toggle failed");

      setSnack({ severity: "success", message: "Cập nhật user" });
      fetchUsers();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Thao tác thất bại" });
    }
  };

  return (
  <Box>
    <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
      <Typography variant="h6">Users</Typography>
      <Button onClick={fetchUsers}>Refresh</Button>
    </Stack>

    <Paper>
      {loading ? (
        <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Verified</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    Không có users
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.email ?? "—"}</TableCell>
                    <TableCell>{u.name ?? "—"}</TableCell>
                    <TableCell>
                      {u.email_verified_at ? (
                        <Typography component="span" variant="body2" color="success.main">
                          Yes
                        </Typography>
                      ) : (
                        <Typography component="span" variant="body2" color="text.secondary">
                          No
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.created_at
                        ? new Date(u.created_at).toLocaleString()
                        : u.updated_at
                        ? new Date(u.updated_at).toLocaleString()
                        : "—"}
                    </TableCell>

                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => toggleLock(u)}
                        sx={{ mr: 1 }}
                        disabled={!u.id}
                      >
                        {u.locked ? "Unlock" : "Lock"}
                      </Button>

                      {/* Example: view details button (optional) */}
                      <Button
                        size="small"
                        onClick={() => {
                          // open details or navigate — replace with your logic
                          console.log("View user", u.id);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  </Box>
);
}


/* ---------------------- Returns ---------------------- */
/* ---------------------- Returns (Improved) ---------------------- */
function ReturnsPage({ setSnack }) {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);
  const [sel, setSel] = React.useState(null); // selected return for view/edit
  const [creating, setCreating] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [orders, setOrders] = React.useState([]);
  const [productDetails, setProductDetails] = React.useState([]);
  const [optsLoading, setOptsLoading] = React.useState(false);

  const PAGE_SIZE = 12;
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  const getStoredToken = () => {
    let token = localStorage.getItem("access_token") || localStorage.getItem("token") || null;
    if (!token) return null;
    try {
      const maybe = JSON.parse(token);
      if (typeof maybe === "string") token = maybe;
    } catch (e) {}
    return String(token).trim();
  };

  const extractErrorMessage = async (res) => {
    try {
      const j = await res.json();
      if (j && (j.message || j.error || j.errors)) {
        if (typeof j.message === "string") return j.message;
        if (typeof j.error === "string") return j.error;
        if (j.errors) {
          if (typeof j.errors === "string") return j.errors;
          if (typeof j.errors === "object") return JSON.stringify(j.errors);
        }
        return JSON.stringify(j);
      }
    } catch (e) {}
    try {
      const txt = await res.text();
      if (txt) return txt;
    } catch (e) {}
    return "Có lỗi xảy ra";
  };

  // Fetch returns list
  const fetchReturns = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/api/returns`, {
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("fetch returns failed");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setItems(arr);
      setTotalPages(Math.max(1, Math.ceil(arr.length / PAGE_SIZE)));
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Không tải returns" });
      setItems([]);
    } finally { setLoading(false); }
  }, [setSnack]);

  // Fetch options for create form: orders and product-details
  const fetchOptions = React.useCallback(async () => {
    setOptsLoading(true);
    const token = getStoredToken();
    try {
      const [oRes, pdRes] = await Promise.all([
        fetch(`${API_BASE}/api/orders`, {
          headers: {
          "Authorization": `Bearer ${token}`
        }
        }),
        fetch(`${API_BASE}/api/product-details?with=product,color,size`),
      ]);
      const oData = oRes.ok ? await oRes.json().catch(()=>[]) : [];
      const pdData = pdRes.ok ? await pdRes.json().catch(()=>[]) : [];

      const normalize = d => Array.isArray(d) ? d : (d.data ?? d.items ?? []);
      setOrders(normalize(oData));
      setProductDetails(normalize(pdData));
    } catch (err) {
      console.error("fetchOptions returns", err);
      setSnack({ severity: "warning", message: "Không tải được orders hoặc product details" });
      setOrders([]); setProductDetails([]);
    } finally { setOptsLoading(false); }
  }, [setSnack]);

  React.useEffect(()=> { fetchReturns(); fetchOptions(); }, [fetchReturns, fetchOptions]);

  // Create form state
  const [form, setForm] = React.useState({
    order_id: "",
    product_detail_id: "",
    quantity: 1,
    reason: "",
    requested_by: "",
  });

  const resetForm = () => setForm({ order_id: "", product_detail_id: "", quantity: 1, reason: "", requested_by: "" });

  // Create new return
  const handleCreate = async () => {
    if (!form.order_id) { setSnack({ severity: "error", message: "Chọn order" }); return; }
    if (!form.product_detail_id) { setSnack({ severity: "error", message: "Chọn product detail" }); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setSnack({ severity: "error", message: "Quantity phải > 0" }); return; }
    if (!form.reason || String(form.reason).trim() === "") { setSnack({ severity: "error", message: "Nhập lý do" }); return; }

    if (creating) return;
    setCreating(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/api/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          order_id: form.order_id,
          product_detail_id: form.product_detail_id,
          quantity: Number(form.quantity),
          reason: form.reason,
          requested_by: form.requested_by || null,
        }),
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setSnack({ severity: "error", message: msg || "Tạo phiếu thất bại" });
        return;
      }
      setSnack({ severity: "success", message: "Tạo phiếu thành công" });
      setOpenCreate(false);
      resetForm();
      await fetchReturns();
    } catch (err) {
      console.error("create return error", err);
      setSnack({ severity: "error", message: "Tạo phiếu lỗi" });
    } finally { setCreating(false); }
  };

  // Update status or other fields of a return
  const handleUpdate = async (id, patch) => {
    if (updating) return;
    setUpdating(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/api/returns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setSnack({ severity: "error", message: msg || "Cập nhật thất bại" });
        return;
      }
      setSnack({ severity: "success", message: "Cập nhật thành công" });
      setSel(null);
      await fetchReturns();
    } catch (err) {
      console.error("update return", err);
      setSnack({ severity: "error", message: "Cập nhật lỗi" });
    } finally { setUpdating(false); }
  };

  // Delete return
  const handleDelete = async (id) => {
    if (!window.confirm("Xóa phiếu đổi/trả?")) return;
    if (deleting) return;
    setDeleting(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/api/returns/${id}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setSnack({ severity: "error", message: msg || "Xóa thất bại" });
        return;
      }
      setSnack({ severity: "success", message: "Đã xóa phiếu" });
      await fetchReturns();
      setSel(null);
    } catch (err) {
      console.error("delete return", err);
      setSnack({ severity: "error", message: "Xóa thất bại" });
    } finally { setDeleting(false); }
  };

  // Pagination slice
  const visible = items.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Returns / Exchanges</Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={fetchReturns}>Refresh</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setOpenCreate(true); }}>Create return</Button>
        </Stack>
      </Stack>

      <Paper>
        {loading ? <Box sx={{ p:3, display:"flex", justifyContent:"center" }}><CircularProgress/></Box> : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Requested by</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>Không có phiếu</TableCell>
                  </TableRow>
                ) : visible.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.id}</TableCell>
                    <TableCell>{r.order_id ?? (r.order?.id ?? "—")}</TableCell>
                    <TableCell>{r.product_detail?.product?.name ?? `#${r.product_detail_id}`}</TableCell>
                    <TableCell>{r.quantity ?? "—"}</TableCell>
                    <TableCell>{r.reason ?? "—"}</TableCell>
                    <TableCell>
                      <Typography variant="body2" component="span" color={r.status === "approved" ? "success.main" : r.status === "rejected" ? "error.main" : "text.secondary"}>
                        {r.status ?? "pending"}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.requested_by ?? r.user?.email ?? "—"}</TableCell>
                    <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</TableCell>
                    <TableCell>
                      <Button size="small" startIcon={<VisibilityIcon/>} onClick={() => setSel(r)}>View</Button>
                      <Button size="small" onClick={() => handleUpdate(r.id, { status: "approved" })}>Approve</Button>
                      <Button size="small" color="error" onClick={() => handleUpdate(r.id, { status: "rejected" })}>Reject</Button>
                      <Button size="small" color="error" startIcon={<DeleteIcon/>} onClick={() => handleDelete(r.id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Box sx={{ display:"flex", justifyContent:"center", p:2 }}>
              <Pagination count={totalPages} page={page} onChange={(_,v)=> setPage(v)} />
            </Box>
          </TableContainer>
        )}
      </Paper>

      {/* Create dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Return / Exchange</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Order"
              fullWidth
              value={form.order_id}
              onChange={(e)=> setForm({...form, order_id: e.target.value})}
              helperText={optsLoading ? "Loading orders..." : ""}
            >
              <MenuItem value="">-- select order --</MenuItem>
              {orders.map(o => <MenuItem key={o.id} value={o.id}>#{o.id} — {o.name ?? o.user?.email ?? "—"}</MenuItem>)}
            </TextField>

            <TextField
              select
              label="Product detail"
              fullWidth
              value={form.product_detail_id}
              onChange={(e)=> setForm({...form, product_detail_id: e.target.value})}
              helperText={optsLoading ? "Loading product details..." : ""}
            >
              <MenuItem value="">-- select --</MenuItem>
              {productDetails.map(pd => (
                <MenuItem key={pd.id} value={pd.id}>
                  {pd.product?.name ?? `#${pd.product_id}`} — {pd.color?.name ?? "—"} — {pd.size?.name ?? "—"}
                </MenuItem>
              ))}
            </TextField>

            <TextField label="Quantity" type="number" fullWidth value={form.quantity} onChange={(e)=> setForm({...form, quantity: Number(e.target.value)})} />
            <TextField label="Reason" fullWidth multiline minRows={3} value={form.reason} onChange={(e)=> setForm({...form, reason: e.target.value})} />
            <TextField label="Requested by (email/name)" fullWidth value={form.requested_by} onChange={(e)=> setForm({...form, requested_by: e.target.value})} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>{creating ? "Creating..." : "Create"}</Button>
        </DialogActions>
      </Dialog>

      {/* View / Edit dialog */}
      <Dialog open={!!sel} onClose={() => setSel(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Return #{sel?.id}</DialogTitle>
        <DialogContent>
          {sel ? (
            <Stack spacing={1}>
              <Typography><strong>Order:</strong> {sel.order_id ?? sel.order?.id ?? "—"}</Typography>
              <Typography><strong>Product:</strong> {sel.product_detail?.product?.name ?? `#${sel.product_detail_id}`}</Typography>
              <Typography><strong>Qty:</strong> {sel.quantity}</Typography>
              <Typography><strong>Reason:</strong> {sel.reason}</Typography>
              <Typography><strong>Requested by:</strong> {sel.requested_by ?? sel.user?.email ?? "—"}</Typography>
              <TextField
                select
                label="Status"
                value={sel.status ?? "pending"}
                onChange={(e)=> setSel({...sel, status: e.target.value})}
                helperText="Change status then click Update"
              >
                <MenuItem value="pending">pending</MenuItem>
                <MenuItem value="approved">approved</MenuItem>
                <MenuItem value="rejected">rejected</MenuItem>
                <MenuItem value="refunded">refunded</MenuItem>
              </TextField>

              {/* optional admin note */}
              <TextField
                label="Admin note (optional)"
                fullWidth
                multiline
                minRows={2}
                value={sel.admin_note ?? ""}
                onChange={(e)=> setSel({...sel, admin_note: e.target.value})}
              />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSel(null)} disabled={updating}>Close</Button>
          <Button onClick={() => handleUpdate(sel.id, { status: sel.status, admin_note: sel.admin_note ?? null })} variant="contained" disabled={updating}>
            {updating ? "Updating..." : "Update"}
          </Button>
          <Button color="error" onClick={() => handleDelete(sel.id)} disabled={deleting}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


/* ---------------------- Stock Entries ---------------------- */
/* ---------------------- Stock Entries (upgraded) ---------------------- */
function StockPage({ setSnack }) {
  const [entries, setEntries] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [openCreate, setOpenCreate] = React.useState(false);

  const [suppliers, setSuppliers] = React.useState([]);
  const [productDetails, setProductDetails] = React.useState([]);
  const [optsLoading, setOptsLoading] = React.useState(false);

  // supplier quick-create modal state
  const [openSupplierModal, setOpenSupplierModal] = React.useState(false);
  const [supplierForm, setSupplierForm] = React.useState({ name: "", email: "", phone: "", address: "" });
  const [supplierCreating, setSupplierCreating] = React.useState(false);

  // main create-receipt form
  const [form, setForm] = React.useState({
    suppliers_id: "",
    supplier_manual: { name: "", email: "", address: "", phone: "" },
    note: "",
    import_date: new Date().toISOString().slice(0, 10),
    items: [{ product_detail_id: "", qty: 1, price: 0 }],
  });

  const [viewReceipt, setViewReceipt] = React.useState(null); // for dialog view

  const getStoredToken = () => {
    let token = localStorage.getItem("access_token") || localStorage.getItem("token") || null;
    if (!token) return null;
    try {
      const maybe = JSON.parse(token);
      if (typeof maybe === "string") token = maybe;
    } catch (e) {}
    return String(token).trim();
  };

  // fetch receipts
  const fetchStock = React.useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/api/admin/receipts`, {
        method: "GET",
        headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!res.ok) throw new Error("fetch receipts failed");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.data ?? data.items ?? [];
      setEntries(arr);
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Không tải stock entries" });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [setSnack]);

  // fetch suppliers & product-details
  const fetchOptions = React.useCallback(async () => {
    setOptsLoading(true);
    try {
      const token = getStoredToken();
      const [sRes, pdRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/suppliers`, { headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }),
        fetch(`${API_BASE}/api/product-details?with=color,size,product`, { headers: { Accept: "application/json" } }),
      ]);

      const sData = sRes.ok ? await sRes.json().catch(() => []) : [];
      const pdData = pdRes.ok ? await pdRes.json().catch(() => []) : [];

      const normalize = (d) => (Array.isArray(d) ? d : (d.data ?? d.items ?? []));
      setSuppliers(normalize(sData));
      setProductDetails(normalize(pdData));
    } catch (err) {
      console.error("fetchOptions", err);
      setSnack({ severity: "warning", message: "Không tải được suppliers hoặc product details" });
      setSuppliers([]); setProductDetails([]);
    } finally {
      setOptsLoading(false);
    }
  }, [setSnack]);

  React.useEffect(() => { fetchStock(); fetchOptions(); }, [fetchStock, fetchOptions]);

  /** items helpers **/
  const addItemRow = React.useCallback(() => {
    setForm(f => ({ ...f, items: [...f.items, { product_detail_id: "", qty: 1, price: 0 }] }));
  }, []);
  const removeItemRow = React.useCallback((idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  }, []);
  const updateItem = React.useCallback((idx, field, value) => {
    setForm(f => {
      const items = f.items.map((it, i) => {
        if (i !== idx) return it;
        if (field === "qty") {
          const n = Number(value);
          return { ...it, qty: Number.isNaN(n) ? 0 : n };
        }
        if (field === "price") {
          const n = Number(value);
          return { ...it, price: Number.isNaN(n) ? 0 : n };
        }
        return { ...it, [field]: value };
      });
      return { ...f, items };
    });
  }, []);

  const findDetail = React.useCallback((id) => {
    if (!id) return null;
    return productDetails.find(d => String(d.id) === String(id)) || null;
  }, [productDetails]);

  const formatCurrency = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString("vi-VN") + "₫";
  };
  const computeLineTotal = (item) => (Number(item.qty) || 0) * (Number(item.price) || 0);
  const computeGrandTotal = React.useMemo(() => form.items.reduce((acc, it) => acc + computeLineTotal(it), 0), [form.items]);

  const extractErrorMessage = async (res) => {
    try {
      const j = await res.json();
      if (j && (j.message || j.error || j.errors)) {
        if (typeof j.message === "string") return j.message;
        if (typeof j.error === "string") return j.error;
        if (j.errors) {
          if (typeof j.errors === "string") return j.errors;
          if (typeof j.errors === "object") return JSON.stringify(j.errors);
        }
        return JSON.stringify(j);
      }
    } catch (e) {}
    try {
      const txt = await res.text();
      if (txt) return txt;
    } catch (e) {}
    return "Có lỗi xảy ra";
  };

  /** handle create receipt **/
  const [creatingReceipt, setCreatingReceipt] = React.useState(false);
  const handleCreate = React.useCallback(async () => {
    if (!form.suppliers_id) {
      setSnack({ severity: "error", message: "Vui lòng chọn supplier (hoặc tạo supplier bằng nút 'Tạo supplier') trước khi tạo phiếu." });
      return;
    }

    if (!Array.isArray(form.items) || form.items.length === 0) {
      setSnack({ severity: "error", message: "Thêm ít nhất 1 item" }); return;
    }
    for (const it of form.items) {
      if (!it.product_detail_id) { setSnack({ severity: "error", message: "Chọn product detail cho tất cả item" }); return; }
      if (!it.qty || Number(it.qty) <= 0) { setSnack({ severity: "error", message: "Quantity phải lớn hơn 0" }); return; }
      if (it.price === "" || Number(it.price) < 0) { setSnack({ severity: "error", message: "Price không hợp lệ" }); return; }
    }

    if (creatingReceipt) return;
    setCreatingReceipt(true);
    try {
      const token = getStoredToken();
      const payload = {
        suppliers_id: form.suppliers_id,
        note: form.note || "",
        import_date: form.import_date || new Date().toISOString().slice(0, 10),
        items: form.items.map(it => ({
          product_detail_id: it.product_detail_id,
          quantity: Number(it.qty),
          price: Number(it.price),
        })),
      };

      const res = await fetch(`${API_BASE}/api/admin/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setSnack({ severity: "error", message: msg || "Tạo phiếu nhập thất bại" });
        return;
      }

      const created = await res.json();
      setSnack({ severity: "success", message: "Tạo phiếu nhập thành công" });
      setOpenCreate(false);
      // reset form
      setForm({
        suppliers_id: "",
        supplier_manual: { name: "", email: "", address: "", phone: "" },
        note: "",
        import_date: new Date().toISOString().slice(0, 10),
        items: [{ product_detail_id: "", qty: 1, price: 0 }],
      });
      // refresh receipts & product details (to show updated stock)
      await fetchStock();
      await fetchOptions();
    } catch (err) {
      console.error("handleCreate error", err);
      setSnack({ severity: "error", message: "Tạo thất bại" });
    } finally {
      setCreatingReceipt(false);
    }
  }, [form, creatingReceipt, fetchStock, fetchOptions, setSnack]);

  /** Supplier quick-create **/
  const openSupplierCreate = () => {
    setSupplierForm({ name: "", email: "", phone: "", address: "" });
    setOpenSupplierModal(true);
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name || supplierForm.name.trim() === "") {
      setSnack({ severity: "error", message: "Tên supplier là bắt buộc" });
      return;
    }
    setSupplierCreating(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/api/admin/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(supplierForm),
      });
      if (!res.ok) {
        const msg = await extractErrorMessage(res);
        setSnack({ severity: "error", message: msg || "Tạo supplier thất bại" });
        return;
      }
      const created = await res.json();
      setSnack({ severity: "success", message: "Tạo supplier thành công" });
      await fetchOptions();
      setForm(f => ({ ...f, suppliers_id: created.id ?? created.ID ?? created.data?.id ?? created.id }));
      setOpenSupplierModal(false);
    } catch (err) {
      console.error("create supplier error", err);
      setSnack({ severity: "error", message: "Tạo supplier thất bại" });
    } finally {
      setSupplierCreating(false);
    }
  };

  /** Product detail preview **/
  const ProductDetailPreview = ({ detail }) => {
    if (!detail) return React.createElement("div", { style: { color: "#6b7280" } }, "Chưa chọn sản phẩm");
    return React.createElement("div", null,
      React.createElement("div", { style: { fontWeight: 600 } }, detail.product?.name ?? `#${detail.id}`),
      React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Màu: ${detail.color?.name ?? "—"}`),
      React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Size: ${detail.size?.name ?? "—"}`),
      React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Giá bán (site): ${detail.price ? formatCurrency(detail.price) : "—"}`),
      React.createElement("div", { style: { color: "#6b7280", fontSize: 13 } }, `Tồn kho: ${detail.quantity ?? "—"}`)
    );
  };

  /** Render UI **/
  return (
    React.createElement(Box, null,
      React.createElement(Stack, { direction: "row", justifyContent: "space-between", sx: { mb: 2 } },
        React.createElement(Typography, { variant: "h6" }, "Stock Entries (Receipts)"),
        React.createElement(Stack, { direction: "row", spacing: 1 },
          React.createElement(Button, { variant: "outlined", onClick: openSupplierCreate }, "Tạo supplier"),
          React.createElement(Button, { onClick: () => setOpenCreate(true), variant: "contained" }, "Create Receipt")
        )
      ),

      React.createElement(Paper, null,
        loading ? React.createElement(Box, { sx: { p: 3, display: "flex", justifyContent: "center" } }, React.createElement(CircularProgress, null))
        : React.createElement(TableContainer, null,
          React.createElement(Table, null,
            React.createElement(TableHead, null,
              React.createElement(TableRow, null,
                React.createElement(TableCell, null, "#"),
                React.createElement(TableCell, null, "Supplier"),
                React.createElement(TableCell, null, "Import date"),
                React.createElement(TableCell, null, "Total"),
                React.createElement(TableCell, null, "Actions")
              )
            ),
            React.createElement(TableBody, null,
              entries.length === 0 ? React.createElement(TableRow, null,
                React.createElement(TableCell, { colSpan: 5, align: "center", sx: { py: 6 } }, "Không có phiếu nhập")
              ) : entries.map(e => React.createElement(TableRow, { key: e.id },
                React.createElement(TableCell, null, e.id),
                React.createElement(TableCell, null, e.supplier?.name ?? (e.suppliers_id ?? "—")),
                React.createElement(TableCell, null, e.import_date ?? e.created_at ?? "—"),
                React.createElement(TableCell, null, e.total_price ? Number(e.total_price).toLocaleString("vi-VN") + "₫" : "—"),
                React.createElement(TableCell, null,
                  React.createElement(Button, { size: "small", onClick: () => setViewReceipt(e) }, "View"),
                  React.createElement(Button, { size: "small", color: "error", onClick: async () => {
                    if (!window.confirm("Xóa phiếu nhập? Hành động có thể không rollback tồn kho.")) return;
                    try {
                      const token = getStoredToken();
                      const res = await fetch(`${API_BASE}/api/admin/receipts/${e.id}`, { method: "DELETE", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                      if (!res.ok) throw new Error("Delete failed");
                      setSnack({ severity: "success", message: "Đã xóa phiếu" });
                      fetchStock();
                      await fetchOptions();
                    } catch (err) {
                      console.error(err);
                      setSnack({ severity: "error", message: "Xóa thất bại" });
                    }
                  } }, "Delete")
                )
              ))
            )
          )
        )
      ),

      // Receipt create dialog (same layout as you had)
      React.createElement(Dialog, { open: openCreate, onClose: () => setOpenCreate(false), maxWidth: "md", fullWidth: true },
        React.createElement(DialogTitle, null, "Create receipt"),
        React.createElement(DialogContent, null,
          React.createElement(Stack, { spacing: 2, sx: { mt: 1 } },

            React.createElement(TextField, {
              select: true,
              label: "Select existing supplier (required)",
              fullWidth: true,
              value: form.suppliers_id,
              onChange: (e) => setForm({ ...form, suppliers_id: e.target.value }),
              helperText: optsLoading ? "Loading suppliers..." : "Chọn supplier có sẵn hoặc tạo mới bằng nút 'Tạo supplier'"
            },
              React.createElement(MenuItem, { value: "" }, "-- none --"),
              suppliers.map(s => React.createElement(MenuItem, { key: s.id, value: s.id }, s.name))
            ),

            React.createElement(TextField, {
              label: "Supplier (manual note, won't auto-create)",
              fullWidth: true,
              value: form.supplier_manual.name,
              onChange: (e) => setForm({ ...form, supplier_manual: { ...form.supplier_manual, name: e.target.value } }),
              helperText: "Bạn có thể nhập tạm tên supplier nhưng cần tạo supplier qua nút 'Tạo supplier' nếu muốn lưu chính thức."
            }),

            React.createElement(TextField, {
              label: "Import date",
              type: "date",
              fullWidth: true,
              value: form.import_date,
              onChange: (e) => setForm({ ...form, import_date: e.target.value }),
              InputLabelProps: { shrink: true }
            }),

            React.createElement(TextField, {
              label: "Note",
              fullWidth: true,
              multiline: true,
              minRows: 2,
              value: form.note,
              onChange: (e) => setForm({ ...form, note: e.target.value })
            }),

            // Items list
            React.createElement(Box, null,
              React.createElement(Typography, { variant: "subtitle2", sx: { mb: 1 } }, "Items"),
              React.createElement(Stack, { spacing: 1 },
                form.items.map((it, idx) => {
                  const detail = findDetail(it.product_detail_id);
                  return React.createElement(Paper, { key: idx, sx: { p: 1 } },
                    React.createElement(Stack, { spacing: 1 },
                      React.createElement(TextField, {
                        select: true,
                        label: "Product Detail",
                        value: it.product_detail_id,
                        onChange: (e) => {
                          const id = e.target.value;
                          updateItem(idx, "product_detail_id", id);
                          const d = findDetail(id);
                          if (d && (!it.price || it.price === 0)) updateItem(idx, "price", Number(d.price || 0));
                        }
                      },
                        React.createElement(MenuItem, { value: "" }, "-- chọn --"),
                        productDetails.map(pd => React.createElement(MenuItem, { key: pd.id, value: pd.id },
                          `${pd.product?.name ?? `#${pd.id}`} — ${pd.color?.name ?? "—"} — ${pd.size?.name ?? "—"} — ${Number(pd.price || 0).toLocaleString("vi-VN")}₫`
                        ))
                      ),

                      React.createElement(Box, { sx: { p: 1, border: "1px solid #eee", borderRadius: 1 } },
                        React.createElement(ProductDetailPreview, { detail })
                      ),

                      React.createElement(Stack, { direction: "row", spacing: 2, alignItems: "center" },
                        React.createElement(TextField, {
                          label: "Qty",
                          type: "number",
                          value: it.qty,
                          onChange: (e) => updateItem(idx, "qty", e.target.value),
                          sx: { width: 120 }
                        }),
                        React.createElement(TextField, {
                          label: "Purchase price (VNĐ)",
                          type: "number",
                          value: it.price,
                          onChange: (e) => updateItem(idx, "price", e.target.value),
                          sx: { width: 180 },
                          helperText: "Giá nhập lưu trong phiếu (không cập nhật giá bán)"
                        }),
                        React.createElement("div", null,
                          React.createElement(Typography, { variant: "body2" }, "Thành tiền"),
                          React.createElement(Typography, { variant: "subtitle2" }, formatCurrency(computeLineTotal(it)))
                        ),
                        React.createElement(Box, { sx: { ml: "auto" } },
                          React.createElement(Button, { size: "small", color: "error", onClick: () => removeItemRow(idx), disabled: form.items.length === 1 }, "Remove")
                        )
                      )
                    )
                  );
                })
              ),
              React.createElement(Box, { sx: { mt: 1 } },
                React.createElement(Button, { onClick: addItemRow }, "Add item")
              ),

              React.createElement(Box, { sx: { mt: 2, textAlign: "right" } },
                React.createElement(Typography, { variant: "subtitle2" }, "Tổng tạm tính: " + formatCurrency(computeGrandTotal))
              )
            )
          )
        ),
        React.createElement(DialogActions, null,
          React.createElement(Button, { onClick: () => setOpenCreate(false) }, "Cancel"),
          React.createElement(Button, { variant: "contained", onClick: handleCreate, disabled: creatingReceipt },
            creatingReceipt ? "Đang tạo..." : "Create"
          )
        )
      ),

      // View receipt dialog (shows each receipt item + purchase price)
      React.createElement(Dialog, { open: !!viewReceipt, onClose: () => setViewReceipt(null), maxWidth: "md", fullWidth: true },
        React.createElement(DialogTitle, null, viewReceipt ? `Receipt #${viewReceipt.id}` : "Receipt"),
        React.createElement(DialogContent, null,
          viewReceipt ? React.createElement(Box, null,
            React.createElement(Typography, null, `Supplier: ${viewReceipt.supplier?.name ?? viewReceipt.suppliers_id ?? "-"}`),
            React.createElement(Typography, null, `Import date: ${viewReceipt.import_date ?? viewReceipt.created_at ?? "-"}`),
            React.createElement(Box, { sx: { mt: 2 } },
              React.createElement(TableContainer, null,
                React.createElement(Table, null,
                  React.createElement(TableHead, null,
                    React.createElement(TableRow, null,
                      React.createElement(TableCell, null, "Product"),
                      React.createElement(TableCell, null, "Color"),
                      React.createElement(TableCell, null, "Size"),
                      React.createElement(TableCell, null, "Qty"),
                      React.createElement(TableCell, null, "Purchase price"),
                      React.createElement(TableCell, null, "Subtotal")
                    )
                  ),
                  React.createElement(TableBody, null,
                    (viewReceipt.details || []).map(d => React.createElement(TableRow, { key: d.id || `${d.product_detail_id}_${Math.random()}` },
                      React.createElement(TableCell, null, d.product_detail?.product?.name ?? `#${d.product_detail_id}`),
                      React.createElement(TableCell, null, d.product_detail?.color?.name ?? "—"),
                      React.createElement(TableCell, null, d.product_detail?.size?.name ?? "—"),
                      React.createElement(TableCell, null, d.quantity),
                      React.createElement(TableCell, null, d.price ? Number(d.price).toLocaleString("vi-VN") + "₫" : "—"),
                      React.createElement(TableCell, null, d.subtotal ? Number(d.subtotal).toLocaleString("vi-VN") + "₫" : (d.quantity && d.price ? Number(d.quantity * d.price).toLocaleString("vi-VN") + "₫" : "—"))
                    ))
                  )
                )
              )
            )
          ) : null
        ),
        React.createElement(DialogActions, null,
          React.createElement(Button, { onClick: () => setViewReceipt(null) }, "Close")
        )
      ),

      // Supplier Quick Create Modal
      React.createElement(Dialog, { open: openSupplierModal, onClose: () => setOpenSupplierModal(false), maxWidth: "sm", fullWidth: true },
        React.createElement(DialogTitle, null, "Create Supplier (Quick)"),
        React.createElement(DialogContent, null,
          React.createElement(Stack, { spacing: 2, sx: { mt: 1 } },
            React.createElement(TextField, {
              label: "Name",
              fullWidth: true,
              value: supplierForm.name,
              onChange: (e) => setSupplierForm({ ...supplierForm, name: e.target.value })
            }),
            React.createElement(TextField, {
              label: "Phone",
              fullWidth: true,
              value: supplierForm.phone,
              inputProps: { maxLength: 10 },
              onChange: (e) => {
                const v = e.target.value;
                if (!/^\d*$/.test(v)) return;
                setSupplierForm({ ...supplierForm, phone: v });
              },
              error: supplierForm.phone.length > 0 && supplierForm.phone.length !== 10,
              helperText: supplierForm.phone.length > 0 && supplierForm.phone.length !== 10 ? "Số điện thoại phải đúng 10 số" : ""
            }),
            React.createElement(TextField, {
              label: "Email",
              fullWidth: true,
              value: supplierForm.email,
              onChange: (e) => setSupplierForm({ ...supplierForm, email: e.target.value })
            }),
            React.createElement(TextField, {
              label: "Address",
              fullWidth: true,
              value: supplierForm.address,
              onChange: (e) => setSupplierForm({ ...supplierForm, address: e.target.value })
            }),
            React.createElement(Typography, { variant: "caption", color: "text.secondary" }, "Supplier sẽ được tạo và tự động chọn cho form tạo phiếu.")
          )
        ),
        React.createElement(DialogActions, null,
          React.createElement(Button, { onClick: () => setOpenSupplierModal(false) }, "Cancel"),
          React.createElement(Button, { variant: "contained", onClick: handleCreateSupplier, disabled: supplierCreating },
            supplierCreating ? "Đang tạo..." : "Create supplier"
          )
        )
      )
    )
  );
}

/* ---------------------- Inventory Logs ---------------------- */
// PANEL INVENTORY – dùng API:
// GET    /api/admin/inventory/logs
// POST   /api/admin/inventory/adjust
// POST   /api/admin/inventory/logs
// POST   /api/admin/inventory/revert-receipt/{receiptId}

function InventoryPage({ setSnack }) {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  // filters
  const [filters, setFilters] = React.useState({
    type: "",
    productDetailId: "",
    dateFrom: "",
    dateTo: "",
    q: ""
  });

  // dialogs
  const [adjustOpen, setAdjustOpen] = React.useState(false);
  const [logOnlyOpen, setLogOnlyOpen] = React.useState(false);

  const token = localStorage.getItem("access_token");
  const PAGE_PARAM = "page";

  const fetchLogs = React.useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append(PAGE_PARAM, p);

        if (filters.type) params.append("type", filters.type);
        if (filters.productDetailId) params.append("product_detail_id", filters.productDetailId);
        if (filters.dateFrom) params.append("date_from", filters.dateFrom);
        if (filters.dateTo) params.append("date_to", filters.dateTo);
        if (filters.q) params.append("q", filters.q);

        const url = `${API_BASE}/api/admin/inventory/logs?${params.toString()}`;
        const res = await fetch(url, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) throw new Error(`Fetch logs failed: ${res.status}`);
        const data = await res.json();

        const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
        setLogs(arr);

        const lastPage =
          (!Array.isArray(data) && (data.last_page || data.lastPage || data.meta?.last_page)) || 1;
        setTotalPages(Math.max(1, Number(lastPage) || 1));
        setPage(p);
      } catch (err) {
        console.error("fetchLogs error", err);
        setSnack({ severity: "error", message: "Không tải được lịch sử tồn kho." });
        setLogs([]);
      } finally {
        setLoading(false);
      }
    },
    [filters, token, setSnack]
  );

  React.useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const applyFilters = () => {
    fetchLogs(1);
  };

  const resetFilters = () => {
    setFilters({
      type: "",
      productDetailId: "",
      dateFrom: "",
      dateTo: "",
      q: ""
    });
  };

  const handleRevertReceipt = async (receiptId) => {
    if (!receiptId) {
      setSnack({ severity: "warning", message: "Không có receiptId để revert." });
      return;
    }
    if (!window.confirm(`Revert receipt #${receiptId}?`)) return;

    try {
      const endpoint = `${API_BASE}/api/admin/inventory/revert-receipt/${receiptId}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({})
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("revert receipt failed:", endpoint, res.status, txt);
        setSnack({
          severity: "error",
          message: txt || `Revert receipt thất bại (${res.status})`
        });
        return;
      }
      setSnack({ severity: "success", message: "Đã revert receipt và cập nhật tồn kho." });
      fetchLogs(page);
    } catch (err) {
      console.error("handleRevertReceipt error", err);
      setSnack({ severity: "error", message: "Lỗi khi revert receipt." });
    }
  };

  const handleAdjustSubmit = async (payload) => {
    const endpoint = `${API_BASE}/api/admin/inventory/adjust`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("adjust failed:", endpoint, res.status, txt);
        setSnack({ severity: "error", message: txt || `Điều chỉnh tồn kho thất bại (${res.status})` });
        return;
      }
      setSnack({ severity: "success", message: "Đã điều chỉnh tồn kho." });
      setAdjustOpen(false);
      fetchLogs(page);
    } catch (err) {
      console.error("handleAdjustSubmit error", err);
      setSnack({ severity: "error", message: "Lỗi khi điều chỉnh tồn kho." });
    }
  };

  const handleLogOnlySubmit = async (payload) => {
    const endpoint = `${API_BASE}/api/admin/inventory/logs`;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("log-only failed:", endpoint, res.status, txt);
        setSnack({ severity: "error", message: txt || `Tạo log tồn kho thất bại (${res.status})` });
        return;
      }
      setSnack({ severity: "success", message: "Đã tạo log tồn kho (không đổi số lượng)." });
      setLogOnlyOpen(false);
      fetchLogs(page);
    } catch (err) {
      console.error("handleLogOnlySubmit error", err);
      setSnack({ severity: "error", message: "Lỗi khi tạo log tồn kho." });
    }
  };

  return (
    <Box>
      {/* Header + actions */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Inventory / Stock logs</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchLogs(page)}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() => setLogOnlyOpen(true)}
          >
            Log only
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAdjustOpen(true)}
          >
            Manual adjust
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Paper sx={{ mb: 2, p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
          <TextField
            select
            label="Type"
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">(All)</MenuItem>
            <MenuItem value="receipt">Receipt</MenuItem>
            <MenuItem value="sale">Sale</MenuItem>
            <MenuItem value="adjustment">Adjustment</MenuItem>
            <MenuItem value="other">Other</MenuItem>
          </TextField>

          <TextField
            label="Product detail ID"
            size="small"
            value={filters.productDetailId}
            onChange={(e) => handleFilterChange("productDetailId", e.target.value)}
            sx={{ minWidth: 160 }}
          />

          <TextField
            label="Date from"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateFrom}
            onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
          />

          <TextField
            label="Date to"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateTo}
            onChange={(e) => handleFilterChange("dateTo", e.target.value)}
          />

          <TextField
            label="Search note / user / related"
            size="small"
            fullWidth
            value={filters.q}
            onChange={(e) => handleFilterChange("q", e.target.value)}
          />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1 }} justifyContent="flex-end">
          <Button size="small" onClick={resetFilters}>Reset</Button>
          <Button size="small" variant="contained" onClick={applyFilters}>Apply</Button>
        </Stack>
      </Paper>

      {/* Table logs */}
      <Paper>
        {loading ? (
          <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Time</TableCell>
                  <TableCell>ProductDetail</TableCell>
                  <TableCell align="right">Change</TableCell>
                  <TableCell align="right">Qty before</TableCell>
                  <TableCell align="right">Qty after</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Related</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>
                      {row.created_at
                        ? new Date(row.created_at).toLocaleString("vi-VN")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {row.product_detail_id}
                      {row.product_detail?.product?.name
                        ? ` - ${row.product_detail.product.name}`
                        : ""}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        color={
                          Number(row.change) > 0
                            ? "success.main"
                            : Number(row.change) < 0
                            ? "error.main"
                            : "text.primary"
                        }
                      >
                        {Number(row.change) > 0 ? `+${row.change}` : row.change}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {row.quantity_before}
                    </TableCell>
                    <TableCell align="right">
                      {row.quantity_after}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.type || "-"}
                        color={
                          row.type === "receipt"
                            ? "success"
                            : row.type === "sale"
                            ? "error"
                            : row.type === "adjustment"
                            ? "warning"
                            : "default"
                        }
                      />
                    </TableCell>
                    <TableCell>{row.related_id ?? "-"}</TableCell>
                    <TableCell>
                      {row.user?.name ?? row.user_id ?? "-"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap title={row.note || ""}>
                        {row.note || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.type === "receipt" && row.related_id ? (
                        <Button
                          size="small"
                          color="warning"
                          onClick={() => handleRevertReceipt(row.related_id)}
                        >
                          Revert
                        </Button>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}

                {logs.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Không có dữ liệu.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, v) => fetchLogs(v)}
              />
            </Box>
          </TableContainer>
        )}
      </Paper>

      {/* Dialog manual adjust */}
      <InventoryAdjustDialog
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        onSubmit={handleAdjustSubmit}
      />

      {/* Dialog log-only */}
      <InventoryLogOnlyDialog
        open={logOnlyOpen}
        onClose={() => setLogOnlyOpen(false)}
        onSubmit={handleLogOnlySubmit}
      />
    </Box>
  );
}

/**
 * Dialog điều chỉnh tồn kho (thực sự thay đổi quantity)
 * Gửi: { product_detail_id, change, type, note }
 */
function InventoryAdjustDialog({ open, onClose, onSubmit }) {
  const [form, setForm] = React.useState({
    product_detail_id: "",
    change: 0,
    type: "adjustment",
    note: ""
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({
        product_detail_id: "",
        change: 0,
        type: "adjustment",
        note: ""
      });
    }
  }, [open]);

  const handleSaveClick = async () => {
    if (!form.product_detail_id) {
      alert("product_detail_id không được để trống");
      return;
    }
    if (!form.change || Number(form.change) === 0) {
      alert("Change phải khác 0");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        product_detail_id: form.product_detail_id,
        change: Number(form.change),
        type: form.type || "adjustment",
        note: form.note || ""
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manual stock adjust</DialogTitle>
      <DialogContent>
        <TextField
          label="Product detail ID"
          fullWidth
          sx={{ mt: 1 }}
          value={form.product_detail_id}
          onChange={(e) => setForm({ ...form, product_detail_id: e.target.value })}
        />
        <TextField
          label="Change (+ tăng, - giảm)"
          type="number"
          fullWidth
          sx={{ mt: 1 }}
          value={form.change}
          onChange={(e) => setForm({ ...form, change: e.target.value })}
        />
        <TextField
          select
          label="Type"
          fullWidth
          sx={{ mt: 1 }}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <MenuItem value="adjustment">Adjustment</MenuItem>
          <MenuItem value="receipt">Receipt</MenuItem>
          <MenuItem value="sale">Sale</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>
        <TextField
          label="Note"
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 1 }}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSaveClick} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/**
 * Dialog tạo log-only (không đổi quantity, chỉ lưu history)
 * Gửi: { product_detail_id, change, type, related_id, note }
 */
function InventoryLogOnlyDialog({ open, onClose, onSubmit }) {
  const [form, setForm] = React.useState({
    product_detail_id: "",
    change: 0,
    type: "import",
    related_id: "",
    note: ""
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm({
        product_detail_id: "",
        change: 0,
        type: "import",
        related_id: "",
        note: ""
      });
    }
  }, [open]);

  const handleSaveClick = async () => {
    if (!form.product_detail_id) {
      alert("product_detail_id không được để trống");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        product_detail_id: form.product_detail_id,
        change: form.change ? Number(form.change) : 0,
        type: form.type || "import",
        related_id: form.related_id || null,
        note: form.note || ""
      };
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create inventory log (only)</DialogTitle>
      <DialogContent>
        <TextField
          label="Product detail ID"
          fullWidth
          sx={{ mt: 1 }}
          value={form.product_detail_id}
          onChange={(e) => setForm({ ...form, product_detail_id: e.target.value })}
        />
        <TextField
          label="Change (optional, không đổi quantity)"
          type="number"
          fullWidth
          sx={{ mt: 1 }}
          value={form.change}
          onChange={(e) => setForm({ ...form, change: e.target.value })}
          helperText="Có thể 0 nếu chỉ lưu note."
        />
        <TextField
          label="Type"
          fullWidth
          sx={{ mt: 1 }}
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        />
        <TextField
          label="Related ID (optional)"
          fullWidth
          sx={{ mt: 1 }}
          value={form.related_id}
          onChange={(e) => setForm({ ...form, related_id: e.target.value })}
          helperText="Ví dụ: id phiếu nhập cũ, chứng từ, v.v."
        />
        <TextField
          label="Note"
          fullWidth
          multiline
          minRows={2}
          sx={{ mt: 1 }}
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSaveClick} variant="contained" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}





/* ---------------------- Comments ---------------------- */
function CommentsPage({ setSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/comments`); // implement endpoint
      if (!res.ok) throw new Error("comments fetch failed");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Không tải comments" });
      setItems([]);
    } finally { setLoading(false); }
  }, [setSnack]);

  useEffect(()=> { fetchComments(); }, [fetchComments]);

  const handleDelete = async (id) => {
    const token = localStorage.getItem("access_token");
    if (!token) { setSnack({ severity: "error", message: "Cần đăng nhập" }); return; }
    if (!window.confirm("Xóa comment?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/comments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }});
      if (!res.ok) throw new Error("delete failed");
      setSnack({ severity: "success", message: "Đã xóa" });
      fetchComments();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Xóa thất bại" });
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb:2 }}>
        <Typography variant="h6">Comments</Typography>
        <Button onClick={fetchComments}>Refresh</Button>
      </Stack>

      <Paper>
        {loading ? <Box sx={{ p:3, display:"flex", justifyContent:"center" }}><CircularProgress/></Box> : (
          <TableContainer>
            <Table>
              <TableHead><TableRow><TableCell>#</TableCell><TableCell>User</TableCell><TableCell>Comment</TableCell><TableCell>Actions</TableCell></TableRow></TableHead>
              <TableBody>
                {items.map(c => <TableRow key={c.id}><TableCell>{c.id}</TableCell><TableCell>{c.user?.email ?? c.user_id}</TableCell><TableCell>{c.body}</TableCell><TableCell><Button size="small" color="error" onClick={()=> handleDelete(c.id)}>Delete</Button></TableCell></TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

/* ---------------------- Image admin (light) ---------------------- */
function ImageAdminPage({ setSnack }) {
  // simplified manager - reuse earlier patterns
  const [productDetailId, setProductDetailId] = useState("");
  const [details, setDetails] = useState([]);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/product-details`);
      if (!res.ok) throw new Error("fetch details failed");
      const data = await res.json();
      setDetails(Array.isArray(data) ? data : (data.data ?? []));
    } catch (err) {
      console.warn(err);
      setDetails([]);
    }
  }, []);

  const fetchImages = useCallback(async (id) => {
    if (!id) { setImages([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/image-products?product_detail_id=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("fetch images failed");
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
      const norm = items.map(it => {
        let url = it.full_url ?? it.url ?? null;
        if (!url && it.url_image) {
          if (/^https?:\/\//i.test(it.url_image)) url = it.url_image;
          else url = `${API_BASE}/storage/${it.url_image.replace(/^\/+/, "")}`;
        }
        return { id: it.id, url, desc: it.description ?? "" };
      });
      setImages(norm);
    } catch (err) {
      console.error(err);
      setImages([]);
      setSnack({ severity: "error", message: "Không tải ảnh" });
    } finally { setLoading(false); }
  }, [setSnack]);

  useEffect(()=> { fetchDetails(); }, [fetchDetails]);
  useEffect(()=> { if (productDetailId) fetchImages(productDetailId); else setImages([]); }, [productDetailId, fetchImages]);

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb:2 }}>
        <TextField select label="Product detail" value={productDetailId} onChange={(e)=> setProductDetailId(e.target.value)} sx={{ minWidth: 320 }}>
          <MenuItem value="">-- select --</MenuItem>
          {details.map(d => <MenuItem key={d.id} value={d.id}>{d.product?.name ?? d.id} #{d.id}</MenuItem>)}
        </TextField>
        <Button variant="outlined" onClick={()=> fetchImages(productDetailId)}>Refresh</Button>
      </Stack>

      <Grid container spacing={2}>
        {images.map(img => (
          <Grid item key={img.id}>
            <Paper sx={{ width: 180, height: 160, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {img.url ? <img src={img.url} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} /> : <Typography>no url</Typography>}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
