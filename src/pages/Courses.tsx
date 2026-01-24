import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCourses } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2, AlertCircle, Loader2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ResultSlip from '@/components/ResultSlip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper for GPA Calc
const calculateGradePoints = (score: number) => {
  if (score >= 70) return 5;
  if (score >= 60) return 4;
  if (score >= 50) return 3;
  if (score >= 45) return 2;
  if (score >= 40) return 1;
  return 0;
};

export default function Courses() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const semesterParam = searchParams.get('semester');
  const levelParam = searchParams.get('level');
  const { user } = useAuth();
  const { courses, getCurrentGPA, getCarryovers, deleteCourse, loading } = useCourses();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const resultSlipRef = useRef<HTMLDivElement>(null);

  /* PDF Printing State */
  const [printState, setPrintState] = useState<{ courses: typeof courses, semester: string, topLevelInfo?: string } | null>(null);

  /* Effect to trigger download when printState is updated */
  const downloadTimeoutRef = useRef<NodeJS.Timeout>();
  
  const triggerPdfGeneration = async () => {
    if (!resultSlipRef.current || !printState) return;
    
    setIsDownloading(true);
    try {
      // Small delay to ensure render
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = resultSlipRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Result_${printState.semester.replace(/\s/g, '_')}.pdf`);
      
      toast({
        title: 'Download Complete',
        description: 'Your result slip has been downloaded successfully.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Download Failed',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
      setPrintState(null);
    }
  };

  // Watch for printState changes to trigger download
  useEffect(() => {
    if (printState) {
        triggerPdfGeneration();
    }
  }, [printState]);

  const prepareDownload = (semester: string) => {
    const semesterCourses = currentCourses.filter(c => c.semester === semester);
    if (semesterCourses.length === 0) {
        toast({ title: "No Courses", description: `No courses found for ${semester} semester.`, variant: "destructive" });
        return;
    }
    setPrintState({
        courses: semesterCourses,
        semester: `${semester} Semester`,
        topLevelInfo: targetLevel || undefined
    });
  };

  const targetLevel = levelParam || user?.level;

  const currentCourses = courses.filter(course => {
    // Filter by level
    if (course.level !== targetLevel) return false;
    // Filter by semester if param exists
    if (semesterParam && course.semester !== semesterParam) return false;
    return true;
  });

  const displayTitle = semesterParam ? `${semesterParam} Semester` : (levelParam ? `${levelParam} Courses` : 'Current Semester');
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
                Level {targetLevel} • Semester {user?.semester}
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
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => prepareDownload('1st')}>
                  Download 1st Semester
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => prepareDownload('2nd')}>
                  Download 2nd Semester
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => {
              const params = new URLSearchParams();
              if (semesterParam) params.set('semester', semesterParam);
              if (targetLevel) params.set('level', targetLevel);
              navigate(`/add-course?${params.toString()}`);
            }}>
              Add Course
            </Button>
          </div>
        </div>
      </header>

      {/* Hidden Result Slip for PDF Generation */}
      <div className="absolute top-0 left-0 -z-50 opacity-0 pointer-events-none">
        <div ref={resultSlipRef}>
           {printState && (
             <ResultSlip 
                user={user} 
                courses={printState.courses} 
                semesterParam={printState.semester}
                levelParam={printState.topLevelInfo || null}
                gpa={printState.courses.length > 0 ? (printState.courses.reduce((acc, c) => acc + (calculateGradePoints(c.score) * c.units), 0) / printState.courses.reduce((acc, c) => acc + c.units, 0)) : 0.0}
             />
           )}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-32 space-y-6 scrollbar-hide">
        {/* Current Courses */}
        {/* Grouped Courses */}
        <div>
          {['1st', '2nd'].map(semester => {
             const semesterCourses = currentCourses.filter(c => c.semester === semester);
             if (semesterCourses.length === 0) return null;

             return (
               <div key={semester} className="mb-8">
                 <h2 className="text-lg font-semibold text-foreground mb-3">{semester} Semester</h2>
                 <div className="space-y-3">
                   {semesterCourses.map((course) => (
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
                   ))}
                 </div>
               </div>
             );
           })}
           
           {currentCourses.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No courses added yet</p>
                <Button onClick={() => navigate('/add-course')}>Add Your First Course</Button>
              </Card>
           )}
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