import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Courses() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getCurrentSemesterCourses, getCurrentGPA, getCarryovers, deleteCourse, loading } = useCourses();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentCourses = getCurrentSemesterCourses();
  const gpa = getCurrentGPA();
  const carryovers = getCarryovers();

  const handleDelete = async (id: string, courseCode: string) => {
    setDeletingId(id);
    try {
      await deleteCourse(id);
      toast({
        title: 'Course Deleted',
        description: `${courseCode} has been removed from your records.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete course. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'text-success';
    if (grade === 'B') return 'text-primary';
    if (grade === 'C' || grade === 'D') return 'text-accent';
    if (grade === 'E') return 'text-muted-foreground';
    return 'text-destructive';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden relative">
      {/* Header */}
      <header className="flex-none bg-card border-b border-border pt-[env(safe-area-inset-top)] z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
              <p className="text-sm text-muted-foreground">
                Level {user?.level} • Semester {user?.semester}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-3xl font-bold text-primary">{gpa.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">Semester GPA</div>
              </div>
            </div>
            
            <Button onClick={() => navigate('/add-course')}>Add Course</Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32 space-y-6 scrollbar-hide">
        {/* Current Courses */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Current Semester</h2>
          <div className="space-y-3">
            {currentCourses.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No courses added yet</p>
                <Button onClick={() => navigate('/add-course')}>Add Your First Course</Button>
              </Card>
            ) : (
              currentCourses.map((course) => (
                <Card key={course.id} className="p-4 hover:shadow-elevated transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-primary">
                          {course.code}
                        </span>
                        <span className={`text-2xl font-bold ${getGradeColor(course.grade)}`}>
                          {course.grade}
                        </span>
                      </div>
                      <h3 className="font-medium text-foreground mb-2">{course.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{course.units} Units</span>
                        <span>Score: {course.score}/100</span>
                        <span>{course.grade === 'F' ? 'Carryover' : 'Passed'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/edit-course/${course.id}`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(course.id, course.code)}
                        disabled={deletingId === course.id}
                      >
                        {deletingId === course.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Carryovers */}
        {carryovers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold text-foreground">Carry-over Courses</h2>
            </div>
            <div className="space-y-3">
              {carryovers.map((course) => (
                <Card
                  key={course.id}
                  className="p-4 border-destructive/30 bg-destructive/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-destructive">
                          {course.code}
                        </span>
                        <span className="text-2xl font-bold text-destructive">{course.grade}</span>
                      </div>
                      <h3 className="font-medium text-foreground mb-2">{course.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{course.units} Units</span>
                        <span>Score: {course.score}/100</span>
                        <span className="text-destructive">Needs Retake</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
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