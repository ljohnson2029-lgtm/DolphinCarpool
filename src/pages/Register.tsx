import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ArrowRight, Mail, ShieldCheck, UserPlus, Info, CheckCircle2, GraduationCap, Users, Sparkles, Eye, EyeOff } from "lucide-react";
import PhoneNumberInput from "@/components/PhoneNumberInput";
import { isValidPhoneNumber } from "@/lib/phone-validation";
import Navigation from "@/components/Navigation";
import CreatorFooter from "@/components/CreatorFooter";
import SignupWaiverCheckboxes from "@/components/SignupWaiverCheckboxes";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameHint, setUsernameHint] = useState('');
  const [isStudentEmail, setIsStudentEmail] = useState(false);
  // userType removed - auto-assigned by backend based on email whitelist
  
  // Waiver checkboxes state
  const [insuranceAgreed, setInsuranceAgreed] = useState(false);
  const [safetyAgreed, setSafetyAgreed] = useState(false);
  const [liabilityAgreed, setLiabilityAgreed] = useState(false);

  // Field-level errors for inline red highlighting
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: string;
    lastName?: string;
    username?: string;
    password?: string;
    confirmPassword?: string;
    phone?: string;
    insurance?: string;
    safety?: string;
    liability?: string;
  }>({});
  const phoneError = fieldErrors.phone || "";
  const setPhoneError = (msg: string) =>
    setFieldErrors((prev) => ({ ...prev, phone: msg || undefined }));

  const clearFieldError = (key: keyof typeof fieldErrors) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if email is approved BEFORE sending verification code
      const { data: checkData, error: checkError } = await supabase.functions.invoke("auth-check-email", {
        body: { email: normalizedEmail },
      });

      // Use server-side isStudent flag (accounts for whitelist overrides)
      const isStudent = checkData?.isStudent ?? normalizedEmail.endsWith('@chadwickschool.org');
      setIsStudentEmail(isStudent);

      if (checkError) {
        logger.error('Email check error:', checkError);
        throw new Error('Failed to verify email eligibility');
      }

      if (checkData?.exists) {
        toast({
          title: "Account already exists",
          description: "An account with this email already exists. Please log in instead.",
          variant: "destructive",
        });
        setTimeout(() => navigate("/login"), 2000);
        setLoading(false);
        return;
      }

      if (!checkData?.approved) {
        toast({
          title: "Email not approved",
          description: "This email hasn't been approved yet. Please submit an access request first.",
          variant: "destructive",
        });
        navigate("/request-access");
        setLoading(false);
        return;
      }

      // Email is approved, now send verification code
      const { error: sendError } = await supabase.functions.invoke("auth-send-2fa", {
        body: { email: normalizedEmail },
      });

      if (sendError) throw sendError;

      toast({
        title: "Verification code sent",
        description: "Check your email for the verification code.",
      });

      setStep(2);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("auth-verify-2fa", {
        body: { email: email.toLowerCase().trim(), code: verificationCode },
      });

      if (error) throw error;
      if (!data.success) {
        toast({
          title: "Invalid code",
          description: data.error || "The verification code is incorrect.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Email verified",
        description: "Now complete your account details.",
      });

      setStep(3);
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to verify code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if username is available via edge function
  const checkUsernameAvailability = async () => {
    const clean = username.trim();
    if (!clean) {
      setUsernameStatus('idle');
      setUsernameHint('');
      return;
    }
    setUsernameStatus('checking');
    setUsernameHint('Checking username availability...');
    logger.log('Checking username:', clean);
    const { data, error } = await supabase.functions.invoke('auth-check-username', {
      body: { username: clean },
    });
    logger.log('Username check response:', data, error);
    if (error) {
      setUsernameStatus('idle');
      setUsernameHint('');
      return;
    }
    if (data?.available) {
      setUsernameStatus('available');
      setUsernameHint('Username is available');
    } else {
      setUsernameStatus('taken');
      // Show the actual reason if provided, otherwise default message
      setUsernameHint(data?.reason || 'Username is already taken');
    }
  };

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault();

    // Build per-field error map and log state for debugging
    const errors: typeof fieldErrors = {};
    logger.log('[Register] Submit attempt — field state:', {
      firstName, lastName, username, password, confirmPassword,
      phoneNumber, isStudentEmail, insuranceAgreed, safetyAgreed, liabilityAgreed,
    });

    if (!firstName.trim()) errors.firstName = "This field is required";
    if (!lastName.trim()) errors.lastName = "This field is required";
    if (!username.trim()) errors.username = "This field is required";
    if (!password) errors.password = "This field is required";
    if (!confirmPassword) errors.confirmPassword = "This field is required";

    if (!isStudentEmail) {
      if (!phoneNumber.trim()) {
        errors.phone = "This field is required";
      } else if (!isValidPhoneNumber(phoneNumber)) {
        errors.phone = "Please enter a complete phone number";
      }
      if (!insuranceAgreed) errors.insurance = "Required";
      if (!safetyAgreed) errors.safety = "Required";
      if (!liabilityAgreed) errors.liability = "Required";
    }

    // Password match + strength only if both filled
    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (password && !passwordRegex.test(password)) {
      errors.password = "Must be 8+ chars with uppercase, lowercase, and number";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast({
        title: "Please complete all required fields",
        description: "Highlighted fields need your attention.",
        variant: "destructive",
      });
      // Scroll to first invalid field
      const order: (keyof typeof errors)[] = [
        "firstName", "lastName", "username", "phone",
        "password", "confirmPassword", "insurance", "safety", "liability",
      ];
      const firstKey = order.find((k) => errors[k]);
      const idMap: Record<string, string> = {
        firstName: "firstName", lastName: "lastName", username: "username",
        phone: "phone", password: "password", confirmPassword: "confirmPassword",
        insurance: "insurance-waiver", safety: "safety-waiver", liability: "liability-waiver",
      };
      if (firstKey) {
        const el = document.getElementById(idMap[firstKey]);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLElement | null)?.focus?.();
      }
      return;
    }

    setFieldErrors({});

    // Ensure username availability before creating account
    const cleanUsername = username.trim();
    const { data: nameData, error: nameError } = await supabase.functions.invoke('auth-check-username', {
      body: { username: cleanUsername },
    });
    if (nameError || !nameData?.available) {
      toast({
        title: "Username unavailable",
        description: "This username is already in use. Please choose a different username.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      logger.log('Attempting to create account...');
      const { data, error } = await supabase.functions.invoke("auth-create-account", {
        body: {
          email: email.toLowerCase().trim(),
          username,
          password,
          firstName,
          lastName,
          phoneNumber: phoneNumber || null,
        },
      });

      if (error) {
        logger.error('Edge function error:', error);
        logger.error('Full error object:', JSON.stringify(error, null, 2));
        
        // Extract error message from edge function response
        let errorMessage = "An error occurred during registration";
        
        try {
          // Edge function errors come in the format: FunctionsHttpError
          // The actual error message is in error.context.error
          if (error.context && typeof error.context === 'object') {
            if (error.context.error) {
              errorMessage = error.context.error;
            } else if (typeof error.context === 'string') {
              try {
                const parsed = JSON.parse(error.context);
                errorMessage = parsed.error || errorMessage;
              } catch {
                errorMessage = error.context;
              }
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
        } catch (e) {
          logger.error("Error parsing function error:", e);
        }

        logger.error('Extracted error message:', errorMessage);

        // Check for specific error types and show user-friendly messages
        if (errorMessage.includes("Username already taken")) {
          toast({
            title: "Username unavailable",
            description: "This username is already in use. Please choose a different username.",
            variant: "destructive",
          });
        } else if (errorMessage.includes("Email already registered") || errorMessage.includes("Email already in use")) {
          toast({
            title: "Email already registered",
            description: "An account with this email already exists. Try logging in instead.",
            variant: "destructive",
          });
        } else if (errorMessage.includes("Failed to create auth account")) {
          toast({
            title: "Authentication Error",
            description: "Unable to create authentication account. Please try again or contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
        setLoading(false);
        return;
      }

      if (data && !data.success) {
        logger.error('Registration failed:', data);
        toast({
          title: "Registration failed",
          description: data.error || "Could not create account",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      logger.log('Account created successfully');

      // Auto-login after successful registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

      if (signInError) {
        logger.error('Auto-login failed:', signInError);
        toast({
          title: "Account created!",
          description: "Please log in with your credentials.",
        });
        navigate("/login");
      } else {
        toast({
          title: "Welcome to ​Dolphin!",
          description: "Your account has been created. Let's set up your profile.",
        });
        // AuthContext will pick up the session and RequireProfileComplete will redirect to /profile/setup
      }
    } catch (error) {
      // Handle unexpected errors (network issues, etc.)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      logger.error('Unexpected error during registration:', error);
      logger.error('Full exception:', JSON.stringify(error, null, 2));

      let errorMessage = "An unexpected error occurred. Please try again.";

      try {
        if (err.context && typeof err.context === 'object') {
          if (err.context.error) {
            errorMessage = err.context.error;
          } else if (typeof err.context === 'string') {
            try {
              const parsed = JSON.parse(err.context);
              errorMessage = parsed.error || errorMessage;
            } catch {
              errorMessage = err.context;
            }
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
      } catch (e) {
        logger.error("Error parsing exception:", e);
      }
      
      if (errorMessage.includes("Username already taken")) {
        toast({
          title: "Username unavailable",
          description: "This username is already in use. Please choose a different username.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Email already registered") || errorMessage.includes("Email already in use")) {
        toast({
          title: "Email already registered", 
          description: "An account with this email already exists. Try logging in instead.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("Network") || errorMessage.includes("Failed to fetch")) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("auth-send-2fa", {
        body: { email: email.toLowerCase().trim() },
      });

      if (error) throw error;

      toast({
        title: "Code resent",
        description: "A new verification code has been sent to your email.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to resend code",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  const isFormValid =
    !!firstName.trim() &&
    !!lastName.trim() &&
    !!username.trim() &&
    !!password &&
    passwordRegex.test(password) &&
    !!confirmPassword &&
    password === confirmPassword &&
    (isStudentEmail
      ? true
      : !!phoneNumber.trim() &&
        isValidPhoneNumber(phoneNumber) &&
        insuranceAgreed &&
        safetyAgreed &&
        liabilityAgreed);

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center p-4 pt-24">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute bottom-20 right-10 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
      <Card className="bg-white/95 backdrop-blur-2xl border-white/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] rounded-3xl overflow-hidden">
        {/* Gradient top border */}
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600" />
        
        <CardHeader className="pt-6 pb-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25"
            >
              <UserPlus className="w-7 h-7 text-white" />
            </motion.div>
          </div>
          
          <CardTitle className="text-2xl text-center font-bold text-gray-900">
            Create Account
          </CardTitle>
          <CardDescription className="text-center text-gray-500 mt-2">
            {step === 1 && "Enter your email to get started"}
            {step === 2 && "Verify your email address"}
            {step === 3 && "Complete your account details"}
          </CardDescription>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <motion.div
                key={s}
                initial={false}
                animate={{ 
                  scale: s === step ? 1.1 : 1,
                  backgroundColor: s <= step ? "#3B82F6" : "#E5E7EB"
                }}
                className={`h-2 rounded-full transition-all duration-500 ${
                  s <= step ? "w-12" : "w-8"
                }`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {/* Account Types Info Card */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Account Types:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <span><strong>Students:</strong> Use your ​Car Pool email</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span><strong>Parents:</strong> Use any other email address</span>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      Your account type is automatically determined by your email domain.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300" 
                disabled={loading}
              >
                {loading ? "Checking..." : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-sm space-y-1">
                <div>
                  <span className="text-foreground/70">Already have an account? </span>
                  <Button
                    variant="ghost"
                    className="p-0 h-auto font-semibold text-primary hover:text-primary/80"
                    onClick={() => navigate("/login")}
                  >
                    Log in
                  </Button>
                </div>
                <div>
                  <span className="text-foreground/70">Don't have access? </span>
                  <Button
                    variant="ghost"
                    className="p-0 h-auto font-semibold text-primary hover:text-primary/80"
                    onClick={() => navigate("/request-access")}
                  >
                    Request Access
                  </Button>
                </div>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {/* Success Message based on email type */}
              <div className={`p-4 rounded-lg border ${isStudentEmail ? 'bg-blue-500/10 border-blue-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isStudentEmail ? 'text-blue-600' : 'text-green-600'}`} />
                  <div>
                    {isStudentEmail ? (
                      <>
                        <p className="text-sm font-semibold text-foreground mb-2">
                          🎓 Student Email Detected!
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Check your Chadwick email for the verification code.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Next steps after verification:</strong>
                        </p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <li>• Link to your parent's account</li>
                          <li>• View your family's carpool schedule</li>
                        </ul>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-foreground mb-2">
                          👨‍👩‍👧 Parent Email Detected!
                        </p>
                        <p className="text-sm text-muted-foreground mb-2">
                          Check your email for the verification code.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <strong>Next steps after verification:</strong>
                        </p>
                        <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                          <li>• Add your home address</li>
                          <li>• Find carpool partners near you</li>
                          <li>• Create or request rides</li>
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerificationSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="code"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="pl-10"
                      maxLength={6}
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We sent a verification code to <strong>{email}</strong>
                  </p>
                </div>

                <LoadingButton 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:scale-105 hover:shadow-xl transition-all duration-300" 
                  loading={loading}
                  loadingText="Verifying..."
                >
                  Verify Email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </LoadingButton>

                <div className="flex items-center justify-between text-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendCode}
                    disabled={loading}
                    className="text-primary hover:text-primary/80"
                  >
                    Resend code
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 3 && (
            <form onSubmit={handleAccountCreation} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); if (e.target.value.trim()) clearFieldError("firstName"); }}
                    required
                    disabled={loading}
                    aria-invalid={!!fieldErrors.firstName}
                    className={fieldErrors.firstName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.firstName && (
                    <p className="text-sm text-destructive">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); if (e.target.value.trim()) clearFieldError("lastName"); }}
                    required
                    disabled={loading}
                    aria-invalid={!!fieldErrors.lastName}
                    className={fieldErrors.lastName ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {fieldErrors.lastName && (
                    <p className="text-sm text-destructive">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setUsernameStatus('idle');
                    setUsernameHint('');
                    if (e.target.value.trim()) clearFieldError("username");
                  }}
                  onBlur={checkUsernameAvailability}
                  required
                  disabled={loading}
                  aria-invalid={!!fieldErrors.username}
                  className={fieldErrors.username ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.username && (
                  <p className="text-sm text-destructive">{fieldErrors.username}</p>
                )}
                {usernameHint && (
                  <p className="text-xs text-muted-foreground">{usernameHint}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Phone Number {isStudentEmail ? "(Optional)" : <><span className="text-destructive">*</span></>}
                </Label>
                <PhoneNumberInput
                  id="phone"
                  value={phoneNumber}
                  onChange={(val) => { setPhoneNumber(val); if (val.trim() && isValidPhoneNumber(val)) setPhoneError(""); }}
                  disabled={loading}
                  className={phoneError ? "[&_input]:border-destructive [&_input]:focus-visible:ring-destructive" : ""}
                />
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
              </div>

              {isStudentEmail && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    🎓 Student Account Detected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You'll need parent approval to access the platform. After registration, you'll be able to send a link request to your parent.
                  </p>
                </div>
              )}


              <div className="space-y-2">
                <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (e.target.value) clearFieldError("password"); }}
                  required
                  disabled={loading}
                  aria-invalid={!!fieldErrors.password}
                  className={fieldErrors.password ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.password ? (
                  <p className="text-sm text-destructive">{fieldErrors.password}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Must be 8+ characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (e.target.value && (!password || e.target.value === password)) clearFieldError("confirmPassword"); }}
                  required
                  disabled={loading}
                  aria-invalid={!!fieldErrors.confirmPassword}
                  className={fieldErrors.confirmPassword ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {fieldErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Waiver Checkboxes - Only for parent accounts */}
              {!isStudentEmail && (
                <SignupWaiverCheckboxes
                  insuranceAgreed={insuranceAgreed}
                  safetyAgreed={safetyAgreed}
                  liabilityAgreed={liabilityAgreed}
                  onInsuranceChange={(v) => { setInsuranceAgreed(v); if (v) clearFieldError("insurance"); }}
                  onSafetyChange={(v) => { setSafetyAgreed(v); if (v) clearFieldError("safety"); }}
                  onLiabilityChange={(v) => { setLiabilityAgreed(v); if (v) clearFieldError("liability"); }}
                  disabled={loading}
                  insuranceError={!!fieldErrors.insurance}
                  safetyError={!!fieldErrors.safety}
                  liabilityError={!!fieldErrors.liability}
                />
              )}

              <LoadingButton 
                type="submit" 
                className={`w-full h-14 text-lg font-bold rounded-xl transition-all duration-300 ${
                  isFormValid
                    ? "bg-white hover:bg-gray-50 text-blue-700 ring-2 ring-blue-500 hover:ring-blue-600 shadow-xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105 cursor-pointer"
                    : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                }`}
                loading={loading}
                loadingText="Creating Account..."
                disabled={loading}
              >
                Create Account
                <UserPlus className="ml-2 h-4 w-4" />
              </LoadingButton>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep(2)}
                disabled={loading}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </form>
          )}
         </CardContent>
      </Card>
      </motion.div>
    </div>
    <CreatorFooter />
    </>
  );
};

export default Register;
