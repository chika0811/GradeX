import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, LogOut, BookOpen, Shield, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStoredData, saveTutorialCompleted } from '@/lib/storage';

export default function Settings() {
  const navigate = useNavigate();
  const { user, updateProfile, logout } = useAuth();
  const { courses } = useCourses();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Group courses by level and semester
  const groupedCourses = courses.reduce((acc, course) => {
    const key = `${course.level}-${course.semester}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(course);
    return acc;
  }, {} as Record<string, typeof courses>);

  // Sort the keys to show chronologically
  const sortedKeys = Object.keys(groupedCourses).sort((a, b) => {
    const [levelA, semA] = a.split('-');
    const [levelB, semB] = b.split('-');
    if (levelA !== levelB) return parseInt(levelA) - parseInt(levelB);
    return parseInt(semA) - parseInt(semB);
  });

  const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'text-success';
    if (grade === 'B') return 'text-primary';
    if (grade === 'C' || grade === 'D') return 'text-accent';
    if (grade === 'E') return 'text-muted-foreground';
    return 'text-destructive';
  };

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    about: user?.about || '',
    level: user?.level || '100L',
    semester: user?.semester || '1st',
    profilePic: user?.avatar_url || localStorage.getItem('gradex_user_passport') || '',
  });



  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(
    getStoredData().theme
  );

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        about: user.about || '',
        about: user.about || '',
        level: user.level || '100L',
        semester: user.semester || '1st',
        profilePic: user.avatar_url || prev.profilePic,
      }));
    }
  }, [user]);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.toggle('dark', systemTheme === 'dark');
    } else {
      root.classList.toggle('dark', newTheme === 'dark');
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile(formData);
      toast({ title: 'Profile Updated', description: 'Your changes have been saved.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };



  const handleFeedbackSubmit = async () => {
    if (!formData.about.trim()) {
      toast({ title: 'Error', description: 'Please enter some feedback.', variant: 'destructive' });
      return;
    }



    try {
      // Insert into Supabase
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          message: formData.about,
        });


      if (!error) {
        toast({ title: 'Feedback Sent', description: 'Thank you for your feedback!' });
        setFormData(prev => ({ ...prev, about: '' }));
      } else {
         console.error('Feedback error:', error);
         toast({ 
           title: 'Error', 
           description: error.message || 'Failed to send feedback. Please try again.', 
           variant: 'destructive' 
         });
      }
    } catch (error) {
      console.error('Feedback error:', error);
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to send feedback. Please check your connection.', 
        variant: 'destructive' 
      });
    }
  };

  const handleLogout = async () => {
    await logout();
    toast({ title: 'Logged Out', description: 'See you next time!' });
    navigate('/auth');
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <header className="flex-none bg-card border-b border-border pt-[env(safe-area-inset-top)] z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32 space-y-6 scrollbar-hide">
        <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden mb-3 border-2 border-primary/20 relative">
                {formData.profilePic ? (
                  <img 
                    src={formData.profilePic} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      setFormData(prev => ({ ...prev, profilePic: '' }));
                      toast({ title: 'Error', description: 'Failed to load image', variant: 'destructive' });
                    }}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground text-center px-2">No Photo</span>
                )}
              </div>
              <Label htmlFor="photo" className="cursor-pointer">
                <div className="flex items-center gap-2 text-sm text-primary hover:underline">
                  Upload Profile Image
                </div>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    if (!file.type.startsWith('image/')) {
                      toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' });
                      return;
                    }

                    // Use createObjectURL for better compatibility
                    const objectUrl = URL.createObjectURL(file);
                    const img = new Image();
                    
                    img.onload = () => {
                      try {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;
                        
                        // Max dimensions
                        const MAX_WIDTH = 600;
                        const MAX_HEIGHT = 600;
                        
                        // Maintain aspect ratio
                        if (width > height) {
                          if (width > MAX_WIDTH) {
                            height = Math.round(height * (MAX_WIDTH / width));
                            width = MAX_WIDTH;
                          }
                        } else {
                          if (height > MAX_HEIGHT) {
                            width = Math.round(width * (MAX_HEIGHT / height));
                            height = MAX_HEIGHT;
                          }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                           throw new Error('Could not get canvas context');
                        }

                        // Draw white background mainly for transparent PNGs converted to JPEG
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // Cache base64 locally for offline PDF rendering
                        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                        try {
                          localStorage.setItem('gradex_user_passport', compressedBase64);
                        } catch (err) {
                           console.warn('Storage full for offline cache:', err);
                        }

                        // Provide immediate UI feedback by rendering local base64
                        setFormData(prev => ({ ...prev, profilePic: compressedBase64 }));

                        canvas.toBlob(async (blob) => {
                          if (!blob) throw new Error('Failed to create Image Blob');
                          
                          try {
                            const fileName = `${user?.id}/${Date.now()}.jpg`;
                            
                            // Upload to Supabase Storage
                            const { error: uploadError } = await supabase.storage
                              .from('avatars')
                              .upload(fileName, blob, {
                                contentType: 'image/jpeg',
                                upsert: true
                              });
                              
                            if (uploadError) throw uploadError;
                            
                            // Get Public URL
                            const { data: { publicUrl } } = supabase.storage
                              .from('avatars')
                              .getPublicUrl(fileName);
                              
                            // Save to Profile
                            await updateProfile({ avatar_url: publicUrl });
                            toast({ title: 'Success', description: 'Profile photo updated globally.' });
                          } catch (err: any) {
                            console.error('Storage error:', err);
                            toast({ title: 'Error', description: err.message || 'Failed to upload photo to cloud. Photo is cached locally.', variant: 'destructive' });
                          }
                        }, 'image/jpeg', 0.8);
                        
                      } catch (error) {
                        console.error('Processing error:', error);
                        toast({ title: 'Error', description: 'Failed to process image.', variant: 'destructive' });
                      } finally {
                        URL.revokeObjectURL(objectUrl);
                      }
                    };
                    
                    img.onerror = () => {
                       URL.revokeObjectURL(objectUrl);
                       toast({ title: 'Error', description: 'Failed to load image. Please try another file.', variant: 'destructive' });
                    };

                    img.src = objectUrl;
                  }}
                  disabled={isLoading}
                />
              </Label>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="about">Feedback</Label>

              </div>
              <Textarea
                id="about"
                value={formData.about}
                onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleFeedbackSubmit();
                  }
                }}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={handleFeedbackSubmit}
              >
                Send Feedback
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="level">Current Level</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value) => setFormData({ ...formData, level: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="100L">100 Level</SelectItem>
                    <SelectItem value="200L">200 Level</SelectItem>
                    <SelectItem value="300L">300 Level</SelectItem>
                    <SelectItem value="400L">400 Level</SelectItem>
                    <SelectItem value="500L">500 Level</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="semester">Current Semester</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) => setFormData({ ...formData, semester: value })}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st">First Semester</SelectItem>
                    <SelectItem value="2nd">Second Semester</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </Card>



        {/* Tutorial */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Tutorial</h2>
          <Button
            variant="outline"
            onClick={() => {
              saveTutorialCompleted(false);
              window.location.reload();
            }}
            className="w-full"
          >
            Show Tutorial Again
          </Button>
        </Card>



        {/* Legal & Info */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Legal & Info</h2>
          </div>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate('/legal/privacy')}
            >
              Privacy Policy
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate('/legal/terms')}
            >
              Terms of Use
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate('/legal/disclaimer')}
            >
              Disclaimer
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => navigate('/legal/about')}
            >
              About Gradex
            </Button>
          </div>
        </Card>

        {/* Account Actions */}
        <Card className="p-6">
          <Button variant="destructive" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-4 left-0 right-0 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-sm">
          <span className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">
            Dnovit / NoskyTech
          </span>
        </div>
      </footer>
    </div>
  );
}