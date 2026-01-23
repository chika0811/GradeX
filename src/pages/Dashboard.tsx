import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourses } from '@/contexts/CourseContext';
import { useChat } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, BookOpen, AlertCircle, Settings, Sparkles, Loader2, Sun, Moon, Monitor, Shield } from 'lucide-react';
import GPAChart from '@/components/GPAChart';
import { useState, useEffect } from 'react';
import { getStoredData, saveTheme } from '@/lib/storage';

export default function Dashboard() {
  const { user } = useAuth();
  const { courses, getCurrentSemesterCourses, getCGPA, getCarryovers, loading } = useCourses();
  const { setIsOpen } = useChat();
  const navigate = useNavigate();

  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(
    getStoredData().theme
  );

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

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    applyTheme(newTheme);
  };

  const currentCourses = getCurrentSemesterCourses();
  const cgpa = getCGPA();
  const carryovers = getCarryovers();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-card border-b border-border pt-[env(safe-area-inset-top)] z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.name}</h1>
            <p className="text-sm text-muted-foreground">
              Level {user?.level} • Semester {user?.semester}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              <Button
                variant={theme === 'light' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleThemeChange('light')}
              >
                <Sun className="w-4 h-4" />
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleThemeChange('dark')}
              >
                <Moon className="w-4 h-4" />
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => handleThemeChange('system')}
              >
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32 space-y-6 scrollbar-hide">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* CGPA Card */}
        <Card className="p-8 text-center bg-gradient-primary text-white shadow-elevated">
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="12"
                  fill="none"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="white"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${(cgpa / 5.0) * 439.6} 439.6`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-5xl font-bold">{cgpa.toFixed(2)}</div>
                  <div className="text-sm opacity-90">/ 5.0</div>
                </div>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-1">Cumulative CGPA</h2>
            <p className="text-sm opacity-90">Keep pushing for excellence!</p>
          </div>
        </Card>

        {/* GPA Performance Chart */}
        {courses.length > 0 && (
          <GPAChart courses={courses} />
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{currentCourses.length}</div>
                <div className="text-sm text-muted-foreground">Current Courses</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{carryovers.length}</div>
                <div className="text-sm text-muted-foreground">Carry-overs</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          {user?.isAdmin && (
            <Button
              onClick={() => navigate('/admin')}
              variant="outline"
              className="w-full h-auto py-4 justify-start gap-3 border-primary/20 bg-primary/5 hover:bg-primary group transition-all duration-300"
            >
              <Shield className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
              <div className="text-left">
                <div className="font-semibold text-primary group-hover:text-white transition-colors">Admin Dashboard</div>
                <div className="text-xs opacity-70 group-hover:text-white/80 transition-colors">Manage users and courses</div>
              </div>
            </Button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => navigate('/courses?semester=1st')}
              variant="outline"
              className="h-auto py-4 justify-start gap-3 border-primary/20 bg-primary/5 hover:bg-primary group transition-all duration-300"
            >
              <BookOpen className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
              <div className="text-left">
                <div className="font-semibold text-primary group-hover:text-white transition-colors">First Semester</div>
                <div className="text-xs opacity-70 group-hover:text-white/80 transition-colors">View courses</div>
              </div>
            </Button>

            <Button
              onClick={() => navigate('/courses?semester=2nd')}
              variant="outline"
              className="h-auto py-4 justify-start gap-3 border-primary/20 bg-primary/5 hover:bg-primary group transition-all duration-300"
            >
              <BookOpen className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
              <div className="text-left">
                <div className="font-semibold text-primary group-hover:text-white transition-colors">Second Semester</div>
                <div className="text-xs opacity-70 group-hover:text-white/80 transition-colors">View courses</div>
              </div>
            </Button>
          </div>


        </div>

        {/* Motivational Message */}
        {cgpa > 0 && (
          <Card className="p-6 bg-ai-glow-soft border-ai-glow">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-ai-glow flex-shrink-0 mt-1" />
              <div>
                <p className="text-sm text-foreground font-medium mb-1">AI Insight</p>
                <p className="text-sm text-muted-foreground">
                  {cgpa >= 4.5
                    ? 'Outstanding performance! You\'re in the first-class zone. Keep it up!'
                    : cgpa >= 3.5
                    ? 'Great work! You\'re performing well. Every mark counts towards your goals.'
                    : cgpa >= 2.5
                    ? 'You\'re making progress. Focus on your CAs and assignments to boost your grades.'
                    : 'Remember, 1 mark counts! Let\'s work together to improve your performance.'}
                </p>
              </div>
            </div>
          </Card>
        )}
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

      {/* Floating AI Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-6 w-14 h-14 rounded-full bg-gradient-ai shadow-glow flex items-center justify-center animate-float hover:scale-110 transition-transform"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}