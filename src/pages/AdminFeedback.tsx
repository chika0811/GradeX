import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  User,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeedbackItem {
  id: string;
  user_id: string;
  message: string;
  status: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchFeedback();
  }, [user, navigate]);

  const fetchFeedback = async () => {
    try {
      // Fetch feedback and manually join with profiles if foreign key isn't set up for auto-join
      // Or try to fetch with relation
      
      // @ts-expect-error - Table not in types yet
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      // Fetch profiles for these users
      if (feedbackData && feedbackData.length > 0) {
        // @ts-expect-error - user_id not in type
        const userIds = Array.from(new Set(feedbackData.map(f => f.user_id)));
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, email')
          // @ts-expect-error - profiles type issues
          .in('id', userIds);
          
        if (!profilesError && profiles) {
          const profileMap = new Map(profiles.map(p => [p.id, p]));
          // @ts-expect-error - Implicit types
          const combined = feedbackData.map(f => ({
            ...f,
            // @ts-expect-error - user_id
            profiles: profileMap.get(f.user_id)
          }));
          setFeedback(combined);
        } else {
          // @ts-expect-error - Type mismatch
          setFeedback(feedbackData);
        }
      } else {
        setFeedback([]);
      }
      
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'read' ? 'unread' : 'read';
      // @ts-expect-error - Table not in types
      const { error } = await supabase
        .from('feedback')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setFeedback(prev => 
        prev.map(f => f.id === id ? { ...f, status: newStatus } : f)
      );
      
      toast({
        title: 'Updated',
        description: `Marked as ${newStatus}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <header className="flex-none bg-card border-b border-border pt-[env(safe-area-inset-top)] z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
              title="Return to Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">User Feedback</h1>
              <p className="text-xs text-muted-foreground">Manage user submissions</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                <CardTitle>All Feedback</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {feedback.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No feedback received yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedback.map((item) => (
                        <TableRow 
                          key={item.id} 
                          className={`cursor-pointer transition-colors hover:bg-muted/50 ${item.status === 'unread' ? 'bg-muted/30' : ''}`}
                          onClick={() => navigate(`/admin/feedback/${item.id}`)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium flex items-center gap-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                {item.profiles?.name || 'Unknown User'}
                              </span>
                              <span className="text-xs text-muted-foreground ml-5">
                                {item.profiles?.email}
                              </span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                              item.status === 'unread' 
                                ? 'bg-primary/10 text-primary border-primary/20' 
                                : 'bg-muted text-muted-foreground border-border'
                            }`}>
                              {item.status.toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleMarkAsRead(item.id, item.status);
                               }}
                               title={item.status === 'read' ? 'Mark as Unread' : 'Mark as Read'}
                             >
                               {item.status === 'read' ? (
                                 <XCircle className="w-4 h-4 text-muted-foreground" />
                               ) : (
                                 <CheckCircle className="w-4 h-4 text-primary" />
                               )}
                             </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
