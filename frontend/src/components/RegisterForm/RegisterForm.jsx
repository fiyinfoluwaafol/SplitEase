import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Loader2,
  Check,
  X,
} from "lucide-react";

function RegisterForm({ formData, handleInputChange }) {
  const [errorMessage, setErrorMessage] = useState("");
  const [globalErrorMsg, setGlobalErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [showPasswordRules, setShowPasswordRules] = useState(false);
  const [passwordRules, setPasswordRules] = useState([
    { message: "8 characters", valid: false },
    { message: "1 uppercase letter", valid: false },
    { message: "1 lowercase letter", valid: false },
    { message: "1 number", valid: false },
    { message: "1 special character", valid: false },
  ]);

  const backendUrlAccess = import.meta.env.VITE_BACKEND_ADDRESS;
  const navigate = useNavigate();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validatePassword = (password) => {
    const updatedRules = [
      { message: "8 characters", valid: password.length >= 8 },
      { message: "1 uppercase letter", valid: /[A-Z]/.test(password) },
      { message: "1 lowercase letter", valid: /[a-z]/.test(password) },
      { message: "1 number", valid: /[0-9]/.test(password) },
      {
        message: "1 special character",
        valid: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      },
    ];
    setPasswordRules(updatedRules);
  };

  async function handleLogin(userObj) {
    try {
      const response = await fetch(`${backendUrlAccess}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userObj),
        credentials: "include",
      });

      if (response.ok) {
        navigate("/dashboard");
      } else {
        const errorData = await response.json();
        setGlobalErrorMsg("Login failed: " + errorData.error);
      }
    } catch (error) {
      console.error("Error during login:", error);
      setGlobalErrorMsg("An unexpected error occurred. Please try again.");
    }
  }

  async function handleRegister(userObj) {
    setIsLoading(true);
    setGlobalErrorMsg("");
    try {
      const response = await fetch(`${backendUrlAccess}/auth/registration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userObj),
        credentials: "include",
      });

      if (response.ok) {
        handleLogin(userObj);
      } else {
        const errorData = await response.json();
        setGlobalErrorMsg(errorData.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      setGlobalErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleBlur = () => {
    if (!formData.email) {
      setErrorMessage("");
    } else if (!emailRegex.test(formData.email)) {
      setErrorMessage("Invalid email format");
    } else {
      setErrorMessage("");
    }
  };

  const handleOnSubmit = async (event) => {
    event.preventDefault();
    handleRegister(formData);
  };

  const handleSocialLogin = (provider) => {
    console.log(`Signing up with ${provider}`);
    // TODO: Implement social login
  };

  const isFormValid =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    !errorMessage &&
    passwordRules.every((rule) => rule.valid);

  return (
    <form onSubmit={handleOnSubmit} className="space-y-4">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="firstName"
              name="firstName"
              type="text"
              placeholder="John"
              value={formData.firstName}
              onChange={handleInputChange}
              className="pl-10"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
        </div>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="register-email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="register-email"
            name="email"
            type="email"
            placeholder="johndoe@email.com"
            autoComplete="email"
            value={formData.email}
            onBlur={handleBlur}
            onChange={handleInputChange}
            className={`pl-10 ${errorMessage ? "border-red-500" : ""}`}
            required
          />
        </div>
        {errorMessage && (
          <p className="text-sm text-red-500">{errorMessage}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="register-password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            id="register-password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            value={formData.password}
            onChange={(e) => {
              handleInputChange(e);
              validatePassword(e.target.value);
            }}
            onFocus={() => setShowPasswordRules(true)}
            className="pl-10 pr-10"
            required
          />
          <button
            type="button"
            onClick={() => setPasswordVisible(!passwordVisible)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {passwordVisible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Password Rules */}
        {showPasswordRules && (
          <div className="p-3 rounded-md bg-gray-50 border">
            <p className="text-xs font-medium text-gray-600 mb-2">
              Password must contain:
            </p>
            <ul className="space-y-1">
              {passwordRules.map((rule, index) => (
                <li
                  key={index}
                  className={`flex items-center gap-2 text-xs ${
                    rule.valid ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {rule.valid ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  {rule.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Global Error Message */}
      {globalErrorMsg && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">{globalErrorMsg}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !isFormValid}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      {/* Social Login Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <Separator />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      {/* Social Login Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin("google")}
          className="w-full"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSocialLogin("microsoft")}
          className="w-full"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#F25022" d="M1 1h10v10H1z" />
            <path fill="#00A4EF" d="M1 13h10v10H1z" />
            <path fill="#7FBA00" d="M13 1h10v10H13z" />
            <path fill="#FFB900" d="M13 13h10v10H13z" />
          </svg>
          Microsoft
        </Button>
      </div>
    </form>
  );
}

export default RegisterForm;
