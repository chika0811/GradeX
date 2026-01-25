import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  ArrowLeft,
  User,
  Clock,
  Mail,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface FeedbackDetail {
  id: string;
  user_id: string;
  message: string;
  status: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
    level?: string;
    semester?: string;
  };
}

export default function AdminFeedbackDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<FeedbackDetail | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    if (id) {
        fetchFeedbackDetails(id);
    }
  }, [user, navigate, id]);

  const fetchFeedbackDetails = async (feedbackId: string) => {
    try {
      // @ts-expect-error - Table not in types yet
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .eq('id', feedbackId)
        .single();

      if (feedbackError) throw feedbackError;

      if (feedbackData) {
        // Fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', feedbackData.user_id)
          .single();
          
        if (feedbackData.status === 'unread') {
            await supabase
              .from('feedback')
              .update({ status: 'read' })
              .eq('id', feedbackId);
            feedbackData.status = 'read';
        }

        if (!profileError && profile) {
            setFeedback({
                id: feedbackData.id,
                user_id: feedbackData.user_id,
                message: feedbackData.message,
                status: feedbackData.status,
                created_at: feedbackData.created_at,
                profiles: {
                    name: profile.name,
                    email: profile.email,
                    level: profile.level,
                    semester: profile.semester
                }
            });
        } else {
            setFeedback({
                id: feedbackData.id,
                user_id: feedbackData.user_id,
                message: feedbackData.message,
                status: feedbackData.status,
                created_at: feedbackData.created_at
            });
        }
      }
    } catch (error) {
      console.error('Error fetching feedback details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load feedback details',
        variant: 'destructive',
      });
      navigate('/admin/feedback');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!feedback) return null;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <header className="flex-none bg-card border-b border-border pt-[env(safe-area-inset-top)] z-50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/feedback')}
              title="Back to Feedback List"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Feedback Details</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        <div className="max-w-3xl mx-auto space-y-6">
            {/* User Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <User className="w-5 h-5 text-primary" />
                        Sender Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-lg">{feedback.profiles?.name || 'Unknown User'}</h3>
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                <span>{feedback.profiles?.email}</span>
                            </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                            <p>{feedback.profiles?.level || 'N/A'}</p>
                            <p>{feedback.profiles?.semester || 'N/A'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Message Content Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(feedback.created_at), 'MMMM d, yyyy h:mm a')}</span>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted/30 p-6 rounded-lg whitespace-pre-wrap text-foreground leading-relaxed">
                        {feedback.message}
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
