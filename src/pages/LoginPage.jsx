import React, { useState } from "react";
import {
  Avatar,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Link,
  Grid,
  Box,
  Typography,
  Container,
  Paper,
  CircularProgress,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { login } from "../services/userService";
import { useNavigate } from "react-router-dom"; // Thêm dòng này

// 🎨 Chủ đề màu: đen + xanh jean
const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0d0d0d",
      paper: "#121212",
    },
    primary: {
      main: "#1E88E5", // xanh jean
    },
    secondary: {
      main: "#64B5F6",
    },
    text: {
      primary: "#E0E0E0",
      secondary: "#90CAF9",
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate(); // Thêm dòng này

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await login(email, password); // Sử dụng email, password từ state
      console.log(res);
      
      const token = res.data.access_token;
      const user = res.data.user;
      // Lưu token vào localStorage nếu muốn
      localStorage.setItem("access_token", token);
      // Chuyển hướng sau khi đăng nhập thành công
      navigate("/trang-chu");
    } catch (err) {
      console.error("Login failed:", err);
      console.error(err.response);
      if (err.response && err.response.status === 403) {
        setError("Tài khoản của bạn đã bị khóa.");
      } else {
        setError("Tài khoản hoặc mật khẩu không đúng!");
      }
    }
    setLoading(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #0d0d0d 40%, #1E3A5F 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 2,
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={6}
            sx={{
              p: 4,
              backgroundColor: "#121212",
              border: "1px solid #1E88E5",
              boxShadow: "0px 0px 20px rgba(30,136,229,0.2)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Avatar sx={{ m: 1, bgcolor: "#1E88E5" }}>
                <LockOutlinedIcon />
              </Avatar>
              <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                Đăng nhập
              </Typography>

              <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  variant="outlined"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  InputLabelProps={{
                    style: { color: "#90CAF9" },
                  }}
                  InputProps={{
                    style: { color: "white" },
                  }}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Mật khẩu"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputLabelProps={{
                    style: { color: "#90CAF9" },
                  }}
                  InputProps={{
                    style: { color: "white" },
                  }}
                />

                {error && (
                  <Typography
                    variant="body2"
                    sx={{ color: "#ef5350", mt: 1, textAlign: "center" }}
                  >
                    {error}
                  </Typography>
                )}

                <FormControlLabel
                  control={<Checkbox value="remember" color="primary" />}
                  label="Ghi nhớ đăng nhập"
                  sx={{ mt: 1 }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    mb: 2,
                    py: 1.2,
                    fontWeight: "bold",
                    fontSize: "1rem",
                    backgroundColor: "#1E88E5",
                    "&:hover": {
                      backgroundColor: "#1565C0",
                      boxShadow: "0px 0px 10px rgba(30,136,229,0.5)",
                    },
                  }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : "Đăng nhập"}
                </Button>

                <Grid container justifyContent="space-between">
                  <Grid item>
                    <Link href="#" variant="body2" sx={{ color: "#64B5F6" }}>
                      Quên mật khẩu?
                    </Link>
                  </Grid>
                  <Grid item>
                    <Link href="#" variant="body2" sx={{ color: "#64B5F6" }}>
                      Tạo tài khoản
                    </Link>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
