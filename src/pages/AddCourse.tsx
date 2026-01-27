import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCourses } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { calculateGrade } from '@/lib/grading';

export default function AddCourse() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { courses, addCourse, updateCourse } = useCourses();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const isEdit = Boolean(id);
  const existingCourse = isEdit ? courses.find((c) => c.id === id) : null;

  const [formData, setFormData] = useState({
    code: existingCourse?.code || '',
    title: existingCourse?.title || '',
    units: existingCourse?.units || 3,
    score: existingCourse?.score || 0,
    semester: existingCourse?.semester || searchParams.get('semester') || '1st',
    level: existingCourse?.level || searchParams.get('level') || user?.level || '100L',
    session: localStorage.getItem('gradex_current_session') || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || formData.score < 0 || formData.score > 100) {
      toast({
        title: 'Invalid Input',
        description: 'Please check all fields and ensure score is between 0-100',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Exclude session from the data sent to the backend
      const { session, ...courseData } = formData;

      if (isEdit && id) {
        await updateCourse(id, courseData);
        toast({
          title: 'Course Updated',
          description: `${formData.code} has been updated successfully.`,
        });
      } else {
        await addCourse({
          ...courseData,
          title: formData.title || formData.code, // Default title to code if empty
          level: formData.level,
        });
        toast({
          title: 'Course Added',
          description: `${formData.code} has been added to your records.`,
        });
        // Reset form for next entry but keep context (Level, Semester, Session)
        setFormData(prev => ({ 
          ...prev, 
          code: '', 
          title: '', 
          units: 3, 
          score: 0 
        }));
      }
      
      if (isEdit) {
        navigate('/courses');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save course. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const previewGrade = calculateGrade(formData.score);
  const isCarryover = formData.score < 40;

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <header className="flex-none bg-card border-b border-border pt-[env(safe-area-inset-top)] z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isEdit ? 'Edit Course' : 'Add New Course'}
              </h1>
              <p className="text-sm text-muted-foreground">
                Level {user?.level} • Semester {user?.semester}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32 scrollbar-hide">
        <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="code">Course Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CSC 101"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="units">Credit Unit *</Label>
              <Input
                id="units"
                type="number"
                min="1"
                max="6"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: parseInt(e.target.value) })}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="grade">Grade *</Label>
              <select
                id="grade"
                required
                disabled={isLoading}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={calculateGrade(formData.score)}
                onChange={(e) => {
                  const grade = e.target.value;
                  let score = 0;
                  // Set score based on minimum value for the grade
                  if (grade === 'A') score = 70;
                  else if (grade === 'B') score = 60;
                  else if (grade === 'C') score = 50;
                  else if (grade === 'D') score = 45;
                  else if (grade === 'E') score = 40;
                  else score = 0; // F
                  
                  setFormData({ ...formData, score });
                }}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
                <option value="F">F</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">


              {!searchParams.get('level') && (
              <div>
                <Label htmlFor="level">Level *</Label>
                <select
                  id="level"
                  required
                  disabled={isLoading}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                >
                  <option value="100L">100 Level</option>
                  <option value="200L">200 Level</option>
                  <option value="300L">300 Level</option>
                  <option value="400L">400 Level</option>
                  <option value="500L">500 Level</option>
                  <option value="600L">600 Level</option>
                </select>
              </div>
              )}

              {!searchParams.get('semester') && (
              <div>
                <Label htmlFor="semester">Semester *</Label>
                <select
                  id="semester"
                  required
                  disabled={isLoading}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                >
                  <option value="1st">1st Semester</option>
                  <option value="2nd">2nd Semester</option>
                </select>
              </div>
              )}
            </div>



            <div>
              <Label htmlFor="session">Academic Session</Label>
              <select
                id="session"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading}
                value={formData.session}
                onChange={(e) => {
                  const newSession = e.target.value;
                  setFormData({ ...formData, session: newSession });
                  localStorage.setItem('gradex_current_session', newSession);
                }}
              >
                <option value="">Select Academic Session</option>
                {Array.from({ length: 12 }, (_, i) => {
                  const currentYear = new Date().getFullYear();
                  const startYear = currentYear - 11 + i;
                  return `${startYear}/${startYear + 1}`;
                }).map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>

            {/* Grade Preview */}
            <Card className={`p-4 ${isCarryover ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/5 border-primary/30'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Calculated Grade</p>
                  <p className={`text-3xl font-bold ${isCarryover ? 'text-destructive' : 'text-primary'}`}>
                    {previewGrade}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className={`text-sm font-semibold ${isCarryover ? 'text-destructive' : 'text-success'}`}>
                    {isCarryover ? 'Carry-over' : 'Passed'}
                  </p>
                </div>
              </div>
            </Card>

            <div className="pt-4 space-y-2">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEdit ? 'Updating...' : 'Adding...'}
                  </>
                ) : (
                  isEdit ? 'Update Course' : 'Add Course'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-muted-foreground">Dnovit / NoskyTech</p>
      </footer>
    </div>
  );
}