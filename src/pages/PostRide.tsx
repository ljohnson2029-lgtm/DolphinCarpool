import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/ui/card";
import { Hand, Car, School, ArrowRight, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import RideRequestForm from "@/components/RideRequestForm";
import RideOfferForm from "@/components/RideOfferForm";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/lib/animations";

const CHADWICK_SCHOOL_ADDRESS = '26800 S Academy Dr, Palos Verdes Peninsula, CA 90274';

const PostRide = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedType, setSelectedType] = useState<'request' | 'offer' | null>(null);

  const destination = searchParams.get('destination');
  const origin = searchParams.get('origin');
  const prefillPickup = origin === 'chadwick' ? CHADWICK_SCHOOL_ADDRESS : undefined;
  const prefillDropoff = destination === 'chadwick' ? CHADWICK_SCHOOL_ADDRESS : undefined;
  const showSchoolInfo = destination === 'chadwick' || origin === 'chadwick';

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  const handleSuccess = () => navigate('/family-carpools');

  const { ref: headerRef, isVisible: headerVisible } = useScrollReveal<HTMLDivElement>();

  if (loading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center min-h-[60vh]">
            <motion.div 
              className="text-muted-foreground"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Loading...
            </motion.div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <SEO
        title="Post a Ride — Dolphin Carpool"
        description="Offer or request a school carpool with your Dolphin community parents."
        path="/post-ride"
      />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      >
      <div className="container mx-auto px-4 max-w-2xl py-8">
        <Breadcrumbs items={[{ label: "Post a Ride" }]} />

        {/* Premium Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 20 }}
          animate={headerVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={headerVisible ? { scale: 1, rotate: 0 } : {}}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                Post a Ride
              </h1>
            </div>
          </div>
          <p className="text-gray-500 ml-15">
            Create a public post that all parents can see and respond to
          </p>
        </motion.div>

        {showSchoolInfo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Alert className="mb-6 rounded-2xl border-indigo-200 bg-indigo-50/80 backdrop-blur-sm">
              <School className="h-4 w-4 text-indigo-600" />
              <AlertDescription className="text-indigo-900">
                {destination === 'chadwick' 
                  ? 'Ride to Chadwick School — destination pre-filled.'
                  : 'Ride from Chadwick School — origin pre-filled.'}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* Type Selection Cards */}
        {!selectedType && (
          <motion.div 
            className="grid sm:grid-cols-2 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.button
              onClick={() => setSelectedType('request')}
              className="group text-left"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className={cn(
                "p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl cursor-pointer bg-white/80 backdrop-blur-sm",
                "border-gray-200 hover:border-red-300 hover:shadow-red-500/10"
              )}>
                <motion.div 
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Hand className="h-6 w-6 text-red-600" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">I Need a Ride</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Post a request and let other parents know you need help getting your kids to school.
                </p>
                <div className="flex items-center text-sm font-medium text-red-600 gap-1 group-hover:gap-2 transition-all">
                  Request a ride <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </motion.button>

            <motion.button
              onClick={() => setSelectedType('offer')}
              className="group text-left"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card className={cn(
                "p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl cursor-pointer bg-white/80 backdrop-blur-sm",
                "border-gray-200 hover:border-emerald-300 hover:shadow-emerald-500/10"
              )}>
                <motion.div 
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mb-4"
                  whileHover={{ scale: 1.1, rotate: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Car className="h-6 w-6 text-emerald-600" />
                </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">I Can Drive</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Offer available seats in your car and help another family with their commute.
                </p>
                <div className="flex items-center text-sm font-medium text-emerald-600 gap-1 group-hover:gap-2 transition-all">
                  Offer a ride <ArrowRight className="h-4 w-4" />
                </div>
              </Card>
            </motion.button>
          </motion.div>
        )}

        {/* Form */}
        {selectedType && (
          <div className="space-y-4">
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to options
            </button>
            
            {selectedType === 'request' ? (
              <RideRequestForm 
                onSuccess={handleSuccess}
                isBroadcast={true}
                prefillPickup={prefillPickup}
                prefillDropoff={prefillDropoff}
              />
            ) : (
              <RideOfferForm 
                onSuccess={handleSuccess}
                isBroadcast={true}
                prefillPickup={prefillPickup}
                prefillDropoff={prefillDropoff}
              />
            )}
          </div>
        )}
      </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default PostRide;
