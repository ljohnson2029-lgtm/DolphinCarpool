import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Handshake, MessageSquare, Car, ArrowRight, Users } from 'lucide-react';
import { TopConnection, useTopConnections } from '@/hooks/useTopConnections';

interface TopConnectionsProps {
  /** Max items to show */
  limit?: number;
  /** Compact = profile page (top 3, no header actions) */
  variant?: 'dashboard' | 'profile';
}

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const ConnectionRow = ({ conn }: { conn: TopConnection }) => {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/profile/${conn.connected_user_id}`)}
    >
      <Avatar className="h-10 w-10 flex-shrink-0 border border-border">
        <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
          {getInitials(conn.full_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{conn.full_name}</p>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${
              conn.account_type === 'parent'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
            }`}
          >
            {conn.account_type === 'parent' ? 'Parent' : 'Student'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {conn.message_count} messages
          </span>
          <span className="inline-flex items-center gap-1">
            <Car className="h-3 w-3" />
            {conn.shared_rides} shared rides
          </span>
        </p>
      </div>
    </div>
  );
};

export const TopConnections = ({ limit = 5, variant = 'dashboard' }: TopConnectionsProps) => {
  const { connections, loading } = useTopConnections(limit);
  const navigate = useNavigate();

  const skeletonCount = variant === 'profile' ? 3 : 5;

  return (
    <Card className="rounded-lg shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            {variant === 'profile' ? 'Frequent Carpool Partners' : 'Your Top Connections'}
          </CardTitle>
          {variant === 'dashboard' && connections.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs h-8" onClick={() => navigate('/profile')}>
              View All <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              Start carpooling to build your network!
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/find-rides')} className="gap-1.5">
              Browse Rides
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((conn) => (
              <ConnectionRow key={conn.connected_user_id} conn={conn} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
