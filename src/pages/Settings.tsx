import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
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
  });

  const [feedbackCount, setFeedbackCount] = useState(() => {
    const now = new Date();
    const monthKey = `feedback_limit_${user?.email || 'guest'}_${now.getMonth()}_${now.getFullYear()}`;
    return parseInt(localStorage.getItem(monthKey) || '0');
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
        level: user.level || '100L',
        semester: user.semester || '1st',
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

    // Rate limit check
    const now = new Date();
    const monthKey = `feedback_limit_${user?.email || 'guest'}_${now.getMonth()}_${now.getFullYear()}`;
    const currentCount = parseInt(localStorage.getItem(monthKey) || '0');

    if (currentCount >= 3) {
      toast({
        title: 'Limit Reached',
        description: 'You can only send 3 feedback messages per month.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('https://formspree.io/f/xbdlbrzl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user?.email,
          message: formData.about,
          name: user?.name
        })
      });

      if (response.ok) {
        const newCount = currentCount + 1;
        localStorage.setItem(monthKey, newCount.toString());
        setFeedbackCount(newCount);
        toast({ title: 'Feedback Sent', description: 'Thank you for your feedback!' });
        setFormData(prev => ({ ...prev, about: '' }));
      } else {
         toast({ title: 'Error', description: 'Failed to send feedback. Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to send feedback. Please check your connection.', variant: 'destructive' });
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

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="about">Feedback</Label>
                <span className="text-xs text-muted-foreground">
                  {3 - feedbackCount} messages remaining this month
                </span>
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

        {/* Course History */}
        {courses.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Course History</h2>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              {sortedKeys.map((key) => {
                const [level, semester] = key.split('-');
                const semesterCourses = groupedCourses[key];
                const semesterGPA = semesterCourses.reduce((sum, c) => {
                  const points = c.grade === 'A' ? 5 : c.grade === 'B' ? 4 : c.grade === 'C' ? 3 : c.grade === 'D' ? 2 : c.grade === 'E' ? 1 : 0;
                  return sum + (points * c.units);
                }, 0) / semesterCourses.reduce((sum, c) => sum + c.units, 0);

                return (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <span className="font-medium">
                          Level {level} • Semester {semester}
                        </span>
                        <span className="text-sm font-semibold text-primary">
                          GPA: {semesterGPA.toFixed(2)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        {semesterCourses.map((course) => (
                          <div
                            key={course.id}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-mono text-sm font-semibold text-primary">
                                  {course.code}
                                </span>
                                <span className={`text-xl font-bold ${getGradeColor(course.grade)}`}>
                                  {course.grade}
                                </span>
                              </div>
                              <p className="text-sm text-foreground">{course.title}</p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span>{course.units} Units</span>
                                <span>Score: {course.score}/100</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </Card>
        )}

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
          <span className="text-xs text-muted-foreground">Powered by</span>
          <span className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">
            NoskyTech
          </span>
        </div>
      </footer>
    </div>
  );
}