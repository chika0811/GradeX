import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Eye, EyeOff, GraduationCap, BookOpen, Calendar, Loader2, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    institution: '',
    faculty: '',
    department: '',
  });

  const { login, signup, session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard');
    }
  }, [session, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await login(formData.email, formData.password);
        if (error) {
          toast({ title: 'Login Failed', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome back!', description: 'Successfully logged in.' });
          navigate('/dashboard');
        }
      } else {
        if (!formData.name || !formData.email || !formData.password) {
          toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
          setIsLoading(false);
          return;
        }
        
        if (formData.password.length < 6) {
          toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        const { error } = await signup(
          formData.name, 
          formData.email, 
          formData.password, 
          formData.institution,
          formData.faculty,
          formData.department
        );
        
        if (error) {
          toast({ title: 'Signup Failed', description: error, variant: 'destructive' });
        } else {
          toast({ title: 'Welcome to Gradex!', description: 'Account created successfully.' });
          navigate('/dashboard');
        }
      }
    } catch (err) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-elevated animate-scale-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Gradex</h1>
          <p className="text-muted-foreground text-sm">Track your academic excellence</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your full name"
                required
                disabled={isLoading}
              />
            </div>
          )}

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.email@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                className="pr-10"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="institution">
                    Institution
                  </Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g., University of Lagos"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="faculty">
                    Faculty
                  </Label>
                  <Input
                    id="faculty"
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    placeholder="e.g., Science"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <Label htmlFor="department">
                    Department
                  </Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g., Computer Science"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isLogin ? 'Logging in...' : 'Creating account...'}
              </>
            ) : (
              isLogin ? 'Login' : 'Sign Up'
            )}
          </Button>

          {isLogin && (
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="w-full text-sm text-primary hover:underline transition-colors"
              disabled={isLoading}
            >
              Forgot Password?
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
            disabled={isLoading}
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          Dnovit / NoskyTech
        </div>
      </Card>
    </div>
  );
}