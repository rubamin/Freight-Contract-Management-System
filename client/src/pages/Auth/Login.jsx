import React, { useState } from "react";
import { Alert, Box, IconButton, InputAdornment, Typography } from "@mui/material";
import { EmailOutlined, LockOutlined, Visibility, VisibilityOff, Login as LoginIcon } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
<<<<<<< HEAD
import { useNavigate, Link as RouterLink } from "react-router-dom";
=======
import { useNavigate } from "react-router-dom";
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
import { loginUser } from "../../redux/slices/authSlice";

// Import reusable components
import CustomTextField from "../../components/common/CustomTextField";
import CustomButton from "../../components/common/CustomButton";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector((state) => state.auth);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ Email: "", Password: "" });

  // Handle input changes dynamically
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await dispatch(loginUser(formData));
    if (loginUser.fulfilled.match(result)) {
<<<<<<< HEAD
      navigate("/dashboard", { replace: true });
=======
      navigate("/vendors");
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="h4" fontWeight={700} sx={{ textAlign: "center", mb: 1 }}>
        Welcome Back
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mb: 4 }}>
        Sign in to continue to your dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Reusable Email Field */}
      <CustomTextField
        label="Email"
        name="Email"
        type="email"
        value={formData.Email}
        onChange={handleChange}
        icon={EmailOutlined}
      />

      {/* Reusable Password Field with Visibility Toggle */}
      <CustomTextField
        label="Password"
        name="Password"
        type={showPassword ? "text" : "password"}
        value={formData.Password}
        onChange={handleChange}
        icon={LockOutlined}
        endAdornment={
          <InputAdornment position="end">
            <IconButton
              edge="end"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label="toggle password visibility"
            >
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        }
      />

<<<<<<< HEAD
      <Box sx={{ textAlign: "right", mt: 1 }}>
        <Typography
          component={RouterLink}
          to="/forgot-password"
          variant="body2"
          sx={{
            color: "primary.main",
            fontWeight: 600,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Forgot password?
        </Typography>
      </Box>

=======
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
      {/* Reusable Submit Button */}
      <CustomButton loading={loading} loadingText="Signing In..." icon={LoginIcon}>
        Login
      </CustomButton>
    </Box>
  );
};

<<<<<<< HEAD
export default Login;
=======
export default Login;// VITE WATCH TEST 123
>>>>>>> d4b652ff6f505203c633408f126f957ad20b6b8c
