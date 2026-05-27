import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Car, 
  Mail, 
  Lock, 
  ArrowRight, 
  Shield, 
  Zap,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import AddressRequiredModal from '@/components/AddressRequiredModal';
import { useScrollReveal, useCountUp } from '@/lib/animations';

// Premium Login Page with Apple/ESPN-quality design
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [actualEmail, setActualEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [userAccountType, setUserAccountType] = useState<'student' | 'parent'>('parent');
  const [userFirstName, setUserFirstName] = useState('');
  const [loggedInUserId, setLoggedInUserId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();
  const { ref: heroRef, isVisible: heroVisible } = useScrollReveal<HTMLDivElement>();

  // Animated counters for stats
  const satisfactionRate = useCountUp(98, 1500);

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: loginData, error: loginError } = await supabase.functions.invoke('auth-login', {
        body: { 
          usernameOrEmail: email.toLowerCase().trim(),
          password 
        }
      });

      if (loginError || !loginData?.success) {
        throw new Error('Invalid email/username or password');
      }

      const { data: codeData, error: codeError } = await supabase.functions.invoke('auth-send-2fa', {
        body: { email: loginData.user.email }
      });

      if (codeError || !codeData?.success) {
        throw new Error('Failed to send verification code');
      }

      setActualEmail(loginData.user.email);
      setShowCodeInput(true);
      setError('');
    } catch (err) {
      setError((err as Error).message || 'Invalid email/username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('auth-verify-2fa', {
        body: { email: actualEmail, code: code.trim() }
      });

      if (verifyError || !verifyData?.success) {
        setAttemptsRemaining(verifyData?.attemptsRemaining ?? 0);
        throw new Error(verifyData?.error || 'Invalid verification code');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: actualEmail,
        password,
      });

      if (signInError) throw signInError;
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('home_address, account_type, first_name')
          .eq('id', authUser.id)
          .maybeSingle();

        setLoggedInUserId(authUser.id);
        setUserAccountType((profileData?.account_type as 'student' | 'parent') || 'parent');
        setUserFirstName(profileData?.first_name || '');

        const isParent = profileData?.account_type === 'parent';
        const needsAddress = !profileData?.home_address;

        if (isParent && needsAddress) {
          setShowAddressModal(true);
          return;
        }

        if (profileData?.account_type === 'student' && needsAddress) {
          navigate('/family-links');
          return;
        }
      }
      
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressAdded = () => {
    setShowAddressModal(false);
    navigate('/dashboard');
  };

  const goBack = () => {
    setShowCodeInput(false);
    setCode('');
    setError('');
  };

  return (
    <>
      <Navigation />
      {loggedInUserId && (
        <AddressRequiredModal
          open={showAddressModal}
          userId={loggedInUserId}
          onAddressAdded={handleAddressAdded}
        />
      )}
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-start lg:items-center justify-center p-4 pt-24 pb-32 lg:pb-24">
        {/* Background decorations */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-300/10 rounded-full blur-3xl"
            animate={{ 
              scale: [1.2, 1, 1.2],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ duration: 10, repeat: Infinity }}
          />
        </div>

        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left side - Hero content */}
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, x: -30 }}
            animate={heroVisible ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="hidden lg:block space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-blue-600 text-sm font-medium"
              >
                <Sparkles className="w-4 h-4" />
                Welcome Back
              </motion.div>
              
              <h1 className="text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
                Connecting ​Car Pool
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
                  Families Together
                </span>
              </h1>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                Join hundreds of ​Car Pool families who save time, reduce traffic, 
                and build community through smart carpooling.
              </p>
            </div>



            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="flex items-center gap-4 pt-4"
            >
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Secure & Private</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Lightning Fast</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Login form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="bg-white/80 backdrop-blur-2xl rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-white/50 p-8 lg:p-10">
              <AnimatePresence mode="wait">
                {!showCodeInput ? (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Header */}
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 mb-4">
                        <Car className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                      <p className="text-gray-500">Sign in to your ​Dolphin account</p>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-5">
                      {/* Email */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Email or Username</Label>
                        <div className="relative">
                          <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                            focusedInput === 'email' ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                          <Input
                            type="text"
                            placeholder="Enter your email or username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onFocus={() => setFocusedInput('email')}
                            onBlur={() => setFocusedInput(null)}
                            className="pl-12 h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 rounded-xl transition-all"
                            required
                          />
                        </div>
                      </div>

                      {/* Password */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Password</Label>
                        <div className="relative">
                          <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                            focusedInput === 'password' ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={() => setFocusedInput('password')}
                            onBlur={() => setFocusedInput(null)}
                            className="pl-12 pr-12 h-14 bg-gray-50/50 border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-blue-500/20 rounded-xl transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Submit */}
                      <LoadingButton
                        type="submit"
                        loading={loading}
                        className="w-full h-16 text-lg bg-white hover:bg-gray-50 text-blue-700 font-bold rounded-xl shadow-xl shadow-blue-500/40 hover:shadow-blue-500/60 ring-2 ring-blue-500 hover:ring-blue-600 transition-all"
                      >
                        Sign In
                        <ArrowRight className="w-6 h-6 ml-2" />
                      </LoadingButton>
                    </form>

                    {/* Footer */}
                    <div className="space-y-4 text-center">
                      <button
                        onClick={() => navigate('/forgot-password')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Forgot password?
                      </button>
                      
                      <div className="h-px bg-gray-200" />
                      
                      <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <button
                          onClick={() => navigate('/register')}
                          className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                        >
                          Sign up
                        </button>
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="2fa-form"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6"
                  >
                    {/* Back button */}
                    <button
                      onClick={goBack}
                      className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      Back
                    </button>

                    {/* Header */}
                    <div className="text-center space-y-2">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/25 mb-4">
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-900">Verify Your Identity</h2>
                      <p className="text-gray-500">
                        Enter the 6-digit code sent to<br />
                        <span className="font-medium text-gray-700">{actualEmail}</span>
                      </p>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm text-center"
                        >
                          {error}
                          {attemptsRemaining > 0 && (
                            <p className="text-xs mt-1">{attemptsRemaining} attempts remaining</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Code Input */}
                    <form onSubmit={handleVerifyCode} className="space-y-5">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700 text-center block">
                          Verification Code
                        </Label>
                        <div className="flex justify-center">
                          <InputOTP
                            maxLength={6}
                            value={code}
                            onChange={setCode}
                            autoFocus
                          >
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </div>

                      <LoadingButton
                        type="submit"
                        loading={loading}
                        className="w-full h-14 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                      >
                        Verify & Sign In
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </LoadingButton>
                    </form>

                    <p className="text-center text-sm text-gray-500">
                      Didn't receive the code?{' '}
                      <button
                        onClick={() => {
                          setCode('');
                          setError('');
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          handleLogin({ preventDefault: () => {} } as any);
                        }}
                        className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        Resend
                      </button>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default Login;
