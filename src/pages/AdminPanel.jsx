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
    setEditing({
      ...item,
      image_url: item.image_url ?? (item.image ?? null),
      images: item.images ?? [],
      price: item.first_detail?.price ?? item.price ?? '',
      colors_id: item.first_detail?.color?.id ?? item.colors_id ?? (item.color_id ?? ""),
      sizes_id: item.first_detail?.size?.id ?? item.sizes_id ?? (item.size_id ?? ""),
      categories_id: item.categories_id ?? item.category_id ?? (item.category?.id ?? ""),
      quantity: item.first_detail?.quantity ?? 0,
      // ensure status normalized for UI select (string or number accepted)
      status: item.status ?? 1,
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
      image_url: ""
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
      // normalize status: treat truthy/"1"/1 as 1, otherwise 0
      if (payload.status === true || payload.status === "true" || payload.status === "1" || payload.status === 1) payload.status = 1;
      else payload.status = 0;

      // details array
      const details = [];
      if (payload.price || payload.colors_id || payload.sizes_id || payload.quantity) {
        details.push({
          price: payload.price !== undefined && payload.price !== "" ? payload.price : null,
          color_id: payload.colors_id || null,
          size_id: payload.sizes_id || null,
          quantity: payload.quantity ?? 0,
          status: payload.detail_status ?? 1,
        });
      }

      delete payload.price;
      delete payload.colors_id;
      delete payload.sizes_id;
      delete payload.quantity;
      delete payload.detail_status;

      Object.keys(payload).forEach(k => {
        if (payload[k] !== undefined && payload[k] !== null) fd.append(k, payload[k]);
      });

      if (details.length) fd.append('details', JSON.stringify(details));

      if (files && files.length) {
        for (let i = 0; i < files.length; i++) {
          fd.append('images[]', files[i], files[i].name);
        }
      }

      if (isUpdate) fd.append('_method', 'POST');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: fd,
      });

      if (res.ok) {
        setSnack({ severity: 'success', message: 'Lưu thành công' });
        setEditOpen(false);
        fetchProducts();
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
                    <TableCell>{p.slug ?? "-"}</TableCell>
                    <TableCell>{p.description ?? "-"}</TableCell>
                    <TableCell>
                      {(p.status === 1 || p.status === "1" || p.status === true) ? (
                        <Typography variant="body2" component="span" color="success.main">Còn hàng</Typography>
                      ) : (
                        <Typography variant="body2" component="span" color="text.secondary">Hết hàng</Typography>
                      )}
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

        {/* Status select: 1 = Còn hàng, 0 = Hết hàng */}
        <TextField
          select
          label="Status"
          fullWidth
          value={String(form.status ?? "1")}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
          sx={{ mt: 1 }}
          helperText="1 = Còn hàng, 0 = Hết hàng"
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
function ReturnsPage({ setSnack }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/returns`); // create this endpoint in backend
      if (!res.ok) throw new Error("returns fetch failed");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Không tải returns" });
      setItems([]);
    } finally { setLoading(false); }
  }, [setSnack]);

  useEffect(()=> { fetchReturns(); }, [fetchReturns]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb:2 }}>
        <Typography variant="h6">Returns</Typography>
        <Button onClick={fetchReturns}>Refresh</Button>
      </Stack>
      <Paper>
        {loading ? <Box sx={{ p:3, display:"flex", justifyContent:"center" }}><CircularProgress/></Box> : (
          <TableContainer>
            <Table>
              <TableHead><TableRow><TableCell>#</TableCell><TableCell>Order</TableCell><TableCell>Reason</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
              <TableBody>
                {items.map(r=> <TableRow key={r.id}><TableCell>{r.id}</TableCell><TableCell>{r.order_id}</TableCell><TableCell>{r.reason}</TableCell><TableCell>{r.status}</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}

/* ---------------------- Stock Entries ---------------------- */
function StockPage({ setSnack }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);

  const [suppliers, setSuppliers] = useState([]);
  const [productDetails, setProductDetails] = useState([]);
  const [optsLoading, setOptsLoading] = useState(false);

  // form supports either selecting an existing supplier (suppliers_id)
  // or entering supplier_manual (name/email/address/phone)
  const [form, setForm] = useState({
    suppliers_id: "",
    supplier_manual: { name: "", email: "", address: "", phone: "" },
    note: "",
    import_date: new Date().toISOString().slice(0, 10),
    items: [{ product_detail_id: "", qty: 1, price: 0 }],
  });

  // safe token getter (handles stringified token cases)
  const getStoredToken = () => {
    let token = localStorage.getItem("access_token") || localStorage.getItem("token") || null;
    if (!token) return null;
    try {
      const maybe = JSON.parse(token);
      if (typeof maybe === "string") token = maybe;
    } catch (e) {}
    return String(token).trim();
  };

  // fetch receipts (admin route)
  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_BASE}/api/admin/receipts`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("stock fetch failed");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : (data.data ?? data.items ?? []);
      setEntries(arr);
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Không tải stock entries" });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [setSnack]);

  // fetch suppliers and product details for selects
  const fetchOptions = useCallback(async () => {
    setOptsLoading(true);
    try {
      const token = getStoredToken();
      const [sRes, pdRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/suppliers`, { headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) } }),
        fetch(`${API_BASE}/api/product-details`, { headers: { Accept: "application/json" } }),
      ]);

      const sData = sRes.ok ? await sRes.json().catch(() => []) : [];
      const pdData = pdRes.ok ? await pdRes.json().catch(() => []) : [];

      const normalize = (d) => Array.isArray(d) ? d : (d.data ?? d.items ?? []);
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

  useEffect(() => { fetchStock(); fetchOptions(); }, [fetchStock, fetchOptions]);

  // UI helpers: items management
  const addItemRow = () => {
    setForm(f => ({ ...f, items: [...f.items, { product_detail_id: "", qty: 1, price: 0 }] }));
  };
  const removeItemRow = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };
  const updateItem = (idx, field, value) => {
    setForm(f => {
      const items = f.items.map((it, i) => i === idx ? ({ ...it, [field]: value }) : it);
      return { ...f, items };
    });
  };

  // create supplier (used when user types supplier manually)
  const createSupplier = async (supplierData) => {
    const token = getStoredToken();
    try {
      const res = await fetch(`${API_BASE}/api/admin/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(supplierData),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("create supplier failed:", res.status, txt);
        throw new Error(txt || "Create supplier failed");
      }
      const created = await res.json();
      return created.id ?? created.id; // expect id returned
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  // create receipt: if suppliers_id empty but manual supplier provided, create supplier first
  const handleCreate = async () => {
    const token = getStoredToken();

    // validate supplier presence (either selected or manual name)
    const manual = form.supplier_manual || {};
    const hasManual = manual.name && String(manual.name).trim() !== "";
    if (!form.suppliers_id && !hasManual) {
      setSnack({ severity: "error", message: "Vui lòng chọn supplier hoặc nhập supplier mới" });
      return;
    }

    // validate items
    if (!Array.isArray(form.items) || form.items.length === 0) {
      setSnack({ severity: "error", message: "Thêm ít nhất 1 item" });
      return;
    }
    for (const it of form.items) {
      if (!it.product_detail_id) { setSnack({ severity: "error", message: "Chọn product detail cho tất cả item" }); return; }
      if (!it.qty || Number(it.qty) <= 0) { setSnack({ severity: "error", message: "Quantity phải lớn hơn 0" }); return; }
      if (it.price === "" || Number(it.price) < 0) { setSnack({ severity: "error", message: "Price không hợp lệ" }); return; }
    }

    try {
      setLoading(true);

      let supplierId = form.suppliers_id;
      if (!supplierId && hasManual) {
        // build supplier payload (only include provided fields)
        const payloadSupplier = {
          name: manual.name,
          email: manual.email || "",
          address: manual.address || "",
          phone: manual.phone || "",
        };
        try {
          supplierId = await createSupplier(payloadSupplier);
          // refresh suppliers list so select shows new supplier if needed later
          fetchOptions();
        } catch (err) {
          setSnack({ severity: "error", message: "Tạo supplier thất bại" });
          return;
        }
      }

      // now create receipt
      const payload = {
        suppliers_id: supplierId,
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
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("create receipt failed:", res.status, txt);
        let errMsg = "Tạo phiếu nhập thất bại";
        try { const j = JSON.parse(txt || "{}"); errMsg = j.message || txt || errMsg; } catch {}
        setSnack({ severity: "error", message: errMsg });
        return;
      }

      await res.json();
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
      fetchStock();
    } catch (err) {
      console.error(err);
      setSnack({ severity: "error", message: "Tạo thất bại" });
    } finally {
      setLoading(false);
    }
  };

  // render
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6">Stock Entries (Receipts)</Typography>
        <Button onClick={() => setOpenCreate(true)} variant="contained">Create Receipt</Button>
      </Stack>

      <Paper>
        {loading ? (
          <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Import date</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>Không có phiếu nhập</TableCell>
                  </TableRow>
                ) : entries.map(e => (
                  <TableRow key={e.id}>
                    <TableCell>{e.id}</TableCell>
                    <TableCell>{e.supplier?.name ?? (e.suppliers_id ?? "—")}</TableCell>
                    <TableCell>{e.import_date ?? e.created_at ?? "—"}</TableCell>
                    <TableCell>{e.total_price ? Number(e.total_price).toLocaleString("vi-VN") + "₫" : "—"}</TableCell>
                    <TableCell>{e.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create receipt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Choose existing supplier OR enter manually */}
            <TextField
              select
              label="Select existing supplier (optional)"
              fullWidth
              value={form.suppliers_id}
              onChange={(e) => setForm({ ...form, suppliers_id: e.target.value })}
              helperText={optsLoading ? "Loading suppliers..." : "Bạn có thể chọn supplier có sẵn hoặc nhập tay bên dưới"}
            >
              <MenuItem value="">-- none / use manual input --</MenuItem>
              {suppliers.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>

            <Typography variant="body2" color="text.secondary">Or enter supplier manually:</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                label="Supplier name"
                fullWidth
                value={form.supplier_manual.name}
                onChange={(e) => setForm({ ...form, supplier_manual: { ...form.supplier_manual, name: e.target.value } })}
              />
              <TextField
                label="Phone"
                sx={{ width: 200 }}
                value={form.supplier_manual.phone}
                onChange={(e) => setForm({ ...form, supplier_manual: { ...form.supplier_manual, phone: e.target.value } })}
              />
            </Stack>
            <TextField
              label="Email"
              fullWidth
              value={form.supplier_manual.email}
              onChange={(e) => setForm({ ...form, supplier_manual: { ...form.supplier_manual, email: e.target.value } })}
            />
            <TextField
              label="Address"
              fullWidth
              value={form.supplier_manual.address}
              onChange={(e) => setForm({ ...form, supplier_manual: { ...form.supplier_manual, address: e.target.value } })}
            />

            <TextField
              label="Import date"
              type="date"
              fullWidth
              value={form.import_date}
              onChange={(e) => setForm({ ...form, import_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Note"
              fullWidth
              multiline
              minRows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Items</Typography>
              <Stack spacing={1}>
                {form.items.map((it, idx) => (
                  <Paper key={idx} sx={{ p: 1, display: "flex", gap: 1, alignItems: "center" }}>
                    <TextField
                      select
                      label="Product detail"
                      value={it.product_detail_id}
                      onChange={(e) => updateItem(idx, 'product_detail_id', e.target.value)}
                      sx={{ minWidth: 240 }}
                    >
                      <MenuItem value="">-- select --</MenuItem>
                      {productDetails.map(pd => (
                        <MenuItem key={pd.id} value={pd.id}>
                          {pd.product?.name ? `${pd.product.name} #${pd.id}` : `#${pd.id}`}
                        </MenuItem>
                      ))}
                    </TextField>

                    <TextField
                      label="Qty"
                      type="number"
                      value={it.qty}
                      onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                      sx={{ width: 120 }}
                    />

                    <TextField
                      label="Price"
                      type="number"
                      value={it.price}
                      onChange={(e) => updateItem(idx, 'price', e.target.value)}
                      sx={{ width: 160 }}
                      helperText="Price per unit"
                    />

                    <Box sx={{ ml: 'auto' }}>
                      <Button size="small" color="error" onClick={() => removeItemRow(idx)} disabled={form.items.length === 1}>Remove</Button>
                    </Box>
                  </Paper>
                ))}
              </Stack>

              <Box sx={{ mt: 1 }}>
                <Button onClick={addItemRow}>Add item</Button>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
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
