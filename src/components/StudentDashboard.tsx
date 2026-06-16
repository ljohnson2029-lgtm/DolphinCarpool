import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonCarpoolItem } from "@/components/ui/skeleton-card";
import HowToUseGuide from "@/components/HowToUseGuide";
import { 
  GraduationCap,
  Calendar,
  Users,
  User,
} from "lucide-react";
 
 const StudentDashboard = () => {
   const { user, profile } = useAuth();
   const navigate = useNavigate();
 
   if (!user || !profile) {
     return (
       <DashboardLayout>
          <div className="container mx-auto px-4 py-8 max-w-5xl">
            <div className="mb-8">
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="mb-8">
              <Skeleton className="h-7 w-40 mb-4" />
              <div className="space-y-3">
                <SkeletonCarpoolItem />
                <SkeletonCarpoolItem />
                <SkeletonCarpoolItem />
              </div>
            </div>
         </div>
       </DashboardLayout>
     );
   }
 
   return (
     <DashboardLayout>
       <div className="container mx-auto px-4 py-8 max-w-5xl">
         {/* Header */}
         <div className="mb-8">
           <div className="flex items-center gap-3 mb-2">
             <h1 className="text-3xl font-bold">Welcome back, {profile.first_name}!</h1>
           </div>
           <div className="flex items-center gap-2">
             <Badge variant="secondary" className="gap-1">
               <GraduationCap className="h-3 w-3" />
               Student Account
             </Badge>
           </div>
         </div>
 
          {/* Quick Actions */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/my-rides')}>
                <CardContent className="py-6 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <p className="font-medium">View Scheduled Rides</p>
                  <p className="text-sm text-muted-foreground">All rides your parent has scheduled for you</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/profile')}>
                <CardContent className="py-6 text-center">
                  <User className="h-8 w-8 mx-auto mb-3 text-primary" />
                  <p className="font-medium">View Profile</p>
                  <p className="text-sm text-muted-foreground">View your profile information</p>
                </CardContent>
              </Card>
           </div>

           {/* How to Use Guide */}
           <div className="mt-6">
             <HowToUseGuide isStudent={true} />
           </div>
          </div>
         </div>
      </DashboardLayout>
   );
 };
 
 export default StudentDashboard;
