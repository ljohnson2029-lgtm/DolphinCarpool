import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LogOut, User, Mail, Phone, Calendar, GraduationCap, Users, Home, 
  Car as CarIcon, Pencil, UserPlus, Baby, MapPin, Shield, Edit3, Sparkles
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import VerifiedBadge from '@/components/VerifiedBadge';
import { SignOutDialog } from '@/components/ConfirmDialogs';
import FamilyLinksSection from '@/components/FamilyLinksSection';
import ChildEmailManager from '@/components/profile/ChildEmailManager';
import ProfileEditForm from '@/components/profile/ProfileEditForm';

interface LinkedParentInfo {
  parent_id: string;
  parent_email: string;
  parent_first_name: string;
  parent_last_name: string;
  parent_phone: string | null;
}

const Profile = () => {
  const { user, profile, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [linkedParents, setLinkedParents] = useState<LinkedParentInfo[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [childrenList, setChildrenList] = useState<{ id: string; first_name: string; last_name: string; age: number; grade_level: string | null }[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserRole(data?.role || null);
    };
    fetchUserRole();
  }, [user]);

  // Fetch children for parent accounts
  useEffect(() => {
    const fetchChildren = async () => {
      if (!user || profile?.account_type !== 'parent') return;
      setLoadingChildren(true);
      try {
        const { data } = await supabase
          .from('children')
          .select('id, first_name, last_name, age, grade_level')
          .eq('user_id', user.id);
        setChildrenList(data || []);
      } catch (err) {
        console.error('Error fetching children:', err);
      } finally {
        setLoadingChildren(false);
      }
    };
    fetchChildren();
  }, [user, profile?.account_type]);

  // Fetch linked parents for student accounts
  useEffect(() => {
    const fetchLinkedParents = async () => {
      if (!user || profile?.account_type !== 'student') return;
      setLoadingParents(true);
      try {
        const { data: links } = await supabase
          .from('account_links')
          .select('parent_id')
          .eq('student_id', user.id)
          .eq('status', 'approved');
        
        if (links && links.length > 0) {
          const parentIds = links.map(l => l.parent_id);
          const { data: parentsData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, phone_number')
            .in('id', parentIds);
          
          if (parentsData) {
            const { data: usersData } = await supabase
              .from('users_safe')
              .select('user_id, email')
              .in('user_id', parentIds);
            
            const parents = parentsData.map(p => ({
              parent_id: p.id,
              parent_email: usersData?.find(u => u.user_id === p.id)?.email || '',
              parent_first_name: p.first_name || '',
              parent_last_name: p.last_name || '',
              parent_phone: p.phone_number
            }));
            
            setLinkedParents(parents);
          }
        }
      } catch (err) {
        console.error('Error fetching linked parents:', err);
      } finally {
        setLoadingParents(false);
      }
    };
    fetchLinkedParents();
  }, [user, profile?.account_type]);

  const handleLogout = useCallback(async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setSigningOut(false);
      setSignOutDialogOpen(false);
    }
  }, [logout, navigate]);

  const handleEditSave = useCallback(() => {
    setIsEditing(false);
    window.location.reload();
  }, []);

  const getInitials = (firstName: string | null, lastName: string | null, username: string) => {
    if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
    return username.substring(0, 2).toUpperCase();
  };

  if (loading || !user || !profile) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30 p-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isParent = profile.account_type === 'parent';
  const isChild = profile.account_type === 'student';
  const displayName = profile.first_name && profile.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile.username;

  return (
    <DashboardLayout>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30"
      >
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Breadcrumbs items={[{ label: 'Profile' }]} />

          {/* Header Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative"
              >
                <Avatar className="h-24 w-24 ring-4 ring-white shadow-xl">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-3xl font-bold">
                    {getInitials(profile.first_name, profile.last_name, profile.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </motion.div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                  <VerifiedBadge />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge 
                    variant={isParent ? 'default' : 'secondary'}
                    className={isParent 
                      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }
                  >
                    {isParent ? 'Parent Account' : 'Student Account'}
                  </Badge>
                  <span className="text-gray-500">@{profile.username}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="ghost"
                    onClick={() => setSignOutDialogOpen(true)}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <div className="space-y-6">
            {isEditing ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="rounded-2xl shadow-lg border-0 bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      Edit Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ProfileEditForm 
                      user={{ id: user.id, email: user.email }}
                      profile={profile}
                      isParent={isParent}
                      onSave={handleEditSave} 
                      onCancel={() => setIsEditing(false)} 
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <>
                {/* Personal Information */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                >
                  <Card className="rounded-2xl shadow-sm border border-gray-100 bg-white/80 backdrop-blur-sm overflow-hidden">
                    <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-blue-600" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <User className="h-5 w-5 text-blue-500" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Full Name</p>
                            <p className="font-semibold text-gray-900">
                              {profile.first_name || profile.last_name 
                                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                                : 'Not set'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Mail className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-semibold text-gray-900">{user.email}</p>
                          </div>
                        </div>

                        {profile.phone_number && (
                          <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                              <Phone className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Phone</p>
                              <p className="font-semibold text-gray-900">{profile.phone_number}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Member Since</p>
                            <p className="font-semibold text-gray-900">
                              {new Date(profile.created_at).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {isParent && (
                        <>
                          {profile.home_address ? (
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50/50">
                              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                <MapPin className="h-5 w-5 text-green-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-gray-500 mb-1">Home Address</p>
                                <p className="font-semibold text-gray-900">{profile.home_address}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
                              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <MapPin className="h-5 w-5 text-amber-600" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-amber-700 mb-1">Address Required</p>
                                <p className="text-sm text-amber-600 mb-3">
                                  Add your home address to use map features and find carpool partners.
                                </p>
                                <Button size="sm" onClick={() => setIsEditing(true)} className="bg-amber-600 hover:bg-amber-700">
                                  Add Address
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {profile.grade_level && profile.grade_level !== 'Parent/Adult' && (
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50/50">
                          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Grade Level</p>
                            <p className="font-semibold text-gray-900">{profile.grade_level}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Vehicle Information */}
                {isParent && (profile.car_make || profile.car_model) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-gray-100 bg-white/80 backdrop-blur-sm overflow-hidden">
                      <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <CarIcon className="h-5 w-5 text-emerald-500" />
                          Vehicle Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50/50">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                            <CarIcon className="h-8 w-8 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-bold text-lg text-gray-900">
                              {[profile.car_color, profile.car_make, profile.car_model].filter(Boolean).join(' ')}
                            </p>
                            {profile.license_plate && (
                              <p className="text-sm text-gray-500 mt-1">
                                License Plate: <span className="font-mono font-semibold">{profile.license_plate}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* My Children */}
                {isParent && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-gray-100 bg-white/80 backdrop-blur-sm overflow-hidden">
                      <div className="h-1 w-full bg-gradient-to-r from-pink-500 to-rose-400" />
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <Baby className="h-5 w-5 text-pink-500" />
                          My Children
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingChildren ? (
                          <div className="space-y-3">
                            {[1, 2].map((i) => (
                              <Skeleton key={i} className="h-16 rounded-xl" />
                            ))}
                          </div>
                        ) : childrenList.length > 0 ? (
                          <div className="space-y-3">
                            {childrenList.map((child, index) => (
                              <motion.div
                                key={child.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-4 rounded-xl bg-pink-50/50 hover:bg-pink-50 transition-colors border border-pink-100"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold text-gray-900">{child.first_name} {child.last_name}</p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                      {child.grade_level && (
                                        <span className="px-2 py-0.5 bg-white rounded-md text-xs font-medium">
                                          {child.grade_level}
                                        </span>
                                      )}
                                      <span>Age {child.age}</span>
                                    </div>
                                  </div>
                                  <Baby className="h-5 w-5 text-pink-400" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                              <Baby className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 mb-3">No children added yet.</p>
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                              Add Children
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Linked Parents */}
                {isChild && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <Card className="rounded-2xl shadow-sm border border-gray-100 bg-white/80 backdrop-blur-sm overflow-hidden">
                      <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-400" />
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <Users className="h-5 w-5 text-blue-500" />
                          Linked Parent Contact
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {loadingParents ? (
                          <div className="space-y-3">
                            <Skeleton className="h-32 rounded-xl" />
                          </div>
                        ) : linkedParents.length > 0 ? (
                          <div className="space-y-4">
                            {linkedParents.map((parent, index) => (
                              <motion.div
                                key={parent.parent_id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="p-5 rounded-xl bg-blue-50/50 border border-blue-100"
                              >
                                <div className="flex items-center gap-4 mb-4">
                                  <Avatar className="h-12 w-12">
                                    <AvatarFallback className="bg-blue-200 text-blue-700">
                                      {parent.parent_first_name[0]}{parent.parent_last_name[0]}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-gray-900">
                                      {parent.parent_first_name} {parent.parent_last_name}
                                    </p>
                                    <p className="text-sm text-gray-500">Parent/Guardian</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">{parent.parent_email}</span>
                                  </div>
                                  {parent.parent_phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Phone className="h-4 w-4 text-gray-400" />
                                      <span className="text-gray-600">{parent.parent_phone}</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                              <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 mb-3">No parent linked yet.</p>
                            <Button variant="outline" onClick={() => navigate('/family-links')} className="gap-2">
                              <UserPlus className="h-4 w-4" />
                              Link to Parent Account
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Family Links Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <Separator className="my-8" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Family Links</h2>
                      <p className="text-gray-500">
                        {isChild
                          ? "Connect with your parent's account"
                          : "Manage students linked to your account"
                        }
                      </p>
                    </div>
                  </div>
                  <FamilyLinksSection />
                </motion.div>
              </>
            )}
          </div>

          <SignOutDialog
            open={signOutDialogOpen}
            onOpenChange={setSignOutDialogOpen}
            onConfirm={handleLogout}
            loading={signingOut}
          />
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default Profile;
