import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCourses } from '@/contexts/CourseContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Edit, Trash2, AlertCircle, Loader2, Download, Upload, FileText, Image as ImageIcon, Plus } from 'lucide-react';
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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { calculateGPA } from "@/lib/grading";

// Helper for GPA Calc
const calculateGradePoints = (score: number) => {
  if (score >= 70) return 5;
  if (score >= 60) return 4;
  if (score >= 50) return 3;
  if (score >= 45) return 2;
  if (score >= 40) return 1;
  return 0;
};

interface SemesterResult {
  id: string;
  semester: string;
  file_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
  public_url?: string;
}

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

  /* Result Upload State */
  const [semesterResults, setSemesterResults] = useState<SemesterResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadSemester, setUploadSemester] = useState<string | null>(null);

  /* Dialog States */
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewingResult, setViewingResult] = useState<SemesterResult | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  /* PDF Printing State */
  const [printState, setPrintState] = useState<{ courses: typeof courses, semester: string, topLevelInfo?: string } | null>(null);

  useEffect(() => {
    fetchSemesterResults();
  }, [user]);

  // Clean up blob URL when dialog closes or result changes
  useEffect(() => {
    if (!viewingResult && pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
        setPdfBlobUrl(null);
    }
  }, [viewingResult]);

  // Fetch Blob for PDF viewing to enforce inline display
  useEffect(() => {
    if (viewingResult && viewingResult.file_type === 'application/pdf' && viewingResult.public_url) {
        const fetchPdf = async () => {
            try {
                const response = await fetch(viewingResult.public_url!);
                const blob = await response.blob();
                const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                setPdfBlobUrl(url);
            } catch (error) {
                console.error('Error loading PDF:', error);
            }
        };
        fetchPdf();
    }
  }, [viewingResult]);

  const fetchSemesterResults = async () => {
    if (!user) return;
    
    // @ts-expect-error - Table not in types yet
    const { data, error } = await supabase
      .from('semester_results')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching results:', error);
    } else if (data) {
      // Get public URLs for images
      const resultsWithUrls = data.map((result: SemesterResult) => {
         const { data: { publicUrl } } = supabase
           .storage
           .from('course_results')
           .getPublicUrl(result.file_path);
         return { ...result, public_url: publicUrl };
      });
      setSemesterResults(resultsWithUrls);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
      return;
    }
    
    setSelectedFile(file);
    setShowUploadDialog(true);
    // Reset input so change event triggers again for same file if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const performUpload = async () => {
    if (!selectedFile || !uploadSemester || !user) return;

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${uploadSemester}_${Date.now()}.${fileExt}`;
      
      // Upload to storage with explicit content type
      const { error: uploadError } = await supabase.storage
        .from('course_results')
        .upload(fileName, selectedFile, {
            contentType: selectedFile.type,
            upsert: false
        });

      if (uploadError) throw uploadError;

      // Save to database
      // @ts-expect-error - Table not in types yet
      const { error: dbError } = await supabase
        .from('semester_results')
        .insert({
          user_id: user.id,
          semester: uploadSemester,
          level: levelParam || user.level, // Store current viewing level context
          file_path: fileName,
          file_name: selectedFile.name,
          file_type: selectedFile.type
        });

      if (dbError) throw dbError;

      toast({ title: "Success", description: "Result uploaded successfully!" });
      fetchSemesterResults();
      setShowUploadDialog(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Error", description: "Failed to upload result.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteResult = async (id: string, path: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('course_results')
        .remove([path]);
      
      if (storageError) console.error("Storage delete error", storageError);

      // Delete from db
      // @ts-expect-error - Table not in types
      const { error: dbError } = await supabase
        .from('semester_results')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      setSemesterResults(prev => prev.filter(r => r.id !== id));
      toast({ title: "Deleted", description: "Result removed." });
    } catch (error) {
       console.error("Delete error", error);
       toast({ title: "Error", description: "Failed to delete result", variant: "destructive" });
    }
  };

  const triggerUpload = (semester: string) => {
    setUploadSemester(semester);
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

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
  }).sort((a, b) => a.code.localeCompare(b.code));

  const displayTitle = semesterParam ? `${semesterParam} Semester` : (levelParam ? `${levelParam} Courses` : 'Current Semester');
  const gpa = calculateGPA(currentCourses);
  const carryovers = getCarryovers().sort((a, b) => a.code.localeCompare(b.code));

  const handleBackToDashboard = () => navigate('/dashboard');

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
            <Button variant="ghost" size="icon" onClick={handleBackToDashboard}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Courses</h1>
              <p className="text-sm text-muted-foreground">
                Level {targetLevel}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-3xl font-bold text-primary">{gpa.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">{semesterParam ? 'Semester GPA' : 'Level GPA'}</div>
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

       {/* Hidden File Input */}
       <input 
         type="file" 
         ref={fileInputRef} 
         className="hidden" 
         accept="image/*,application/pdf"
         onChange={handleFileSelect}
       />
       
       {/* Upload Confirmation Dialog */}
       <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Upload</DialogTitle>
            <DialogDescription>
              Please confirm the semester for this result upload.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="semester">Semester</Label>
               <Select onValueChange={setUploadSemester} defaultValue={uploadSemester || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st">1st Semester</SelectItem>
                  <SelectItem value="2nd">2nd Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
                File: <span className="font-medium text-foreground">{selectedFile?.name}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button onClick={performUpload} disabled={isUploading || !uploadSemester}>
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
       </Dialog>

       {/* View Result Dialog */}
       <Dialog open={!!viewingResult} onOpenChange={(open) => !open && setViewingResult(null)}>
        <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-1">
             <div className="flex-none p-3 flex items-center justify-between border-b">
                 <h3 className="font-semibold">{viewingResult?.file_name}</h3>
             </div>
             <div className="flex-1 overflow-hidden bg-muted/20 relative">
                 {viewingResult?.file_type && ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'].some(type => viewingResult.file_type.includes(type)) ? (
                     <img 
                        src={viewingResult.public_url} 
                        alt="Result" 
                        className="w-full h-full object-contain"
                     />
                 ) : viewingResult?.file_type === 'application/pdf' ? (
                     <object 
                        data={pdfBlobUrl || undefined}
                        type="application/pdf"
                        className="w-full h-full"
                     >
                         <div className="flex items-center justify-center h-full flex-col gap-4">
                            <p className="text-muted-foreground">Unable to display PDF inline.</p>
                            <a 
                                href={viewingResult?.public_url}
                                download
                                className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
                            >
                                Download Only
                            </a>
                         </div>
                     </object>
                 ) : (
                    <div className="flex items-center justify-center h-full flex-col gap-4">
                        <p className="text-muted-foreground">Preview not available for this file type.</p>
                        <a 
                            href={viewingResult?.public_url}
                            download
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Download Original
                        </a>
                    </div>
                 )}
             </div>
        </DialogContent>
       </Dialog>

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
              const semesterResult = semesterResults.find(r => r.semester === semester && (levelParam ? true : r.semester === semester)); 

              // Show if courses exist OR if there's an uploaded result
              if (semesterCourses.length === 0 && !semesterResult) return null;

              const semesterGPA = calculateGPA(semesterCourses);

              return (
                <div key={semester} className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline gap-2">
                      <h2 className="text-lg font-semibold text-foreground">{semester} Semester</h2>
                      {semesterCourses.length > 0 && (
                         <span className="text-sm font-medium text-muted-foreground">
                           - {semesterGPA.toFixed(2)} GPA
                         </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('semester', semester);
                          if (targetLevel) params.set('level', targetLevel);
                          navigate(`/add-course?${params.toString()}`);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Course
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => triggerUpload(semester)}
                        disabled={isUploading}
                      >
                        {isUploading && uploadSemester === semester ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Upload className="w-4 h-4 mr-2" />
                        )}
                        Upload Result
                      </Button>
                    </div>
                  </div>
                  
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

                             {course.grade === 'F' && <span className="text-destructive">Carryover</span>}
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

                  {/* Uploaded Result Display */}
                  {semesterResults.filter(r => r.semester === semester).map(result => (
                    <Card key={result.id} className="mt-4 p-4 border-dashed border-primary/30 bg-primary/5">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                {result.file_type.includes('image') ? (
                                    <div className="relative group cursor-pointer" onClick={() => setViewingResult(result)}>
                                        <img 
                                            src={result.public_url} 
                                            alt="Result Slip" 
                                            className="w-16 h-16 object-cover rounded-md border border-border"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                            <ImageIcon className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-background rounded-md border border-border flex items-center justify-center cursor-pointer" onClick={() => setViewingResult(result)}>
                                        <FileText className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-semibold text-foreground">Uploaded Result</h4>
                                    <p className="text-xs text-muted-foreground mb-1">{result.file_name}</p>
                                    <button 
                                        onClick={() => setViewingResult(result)}
                                        className="text-xs text-primary hover:underline flex items-center gap-1"
                                    >
                                        View Full Document
                                    </button>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteResult(result.id, result.file_path)}
                                className="text-destructive hover:text-destructive/80"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                  ))}

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
              {carryovers.sort((a, b) => a.code.localeCompare(b.code)).map((course) => (
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
          <span className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">
            Dnovit / NoskyTech
          </span>
        </div>
      </footer>
    </div>
  );
}