import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Course, Grade, calculateGPA, calculateCGPA, getCarryoverCourses, CGPACalculationResult, calculateGrade } from '@/lib/grading';
import { enqueueSyncAction } from '@/lib/offlineSync';

const CACHE_KEY = 'gradex_cached_courses';

interface CourseContextType {
  courses: Course[];
  loading: boolean;
  addCourse: (course: Omit<Course, 'id' | 'grade'>) => Promise<void>;
  updateCourse: (id: string, updates: Partial<Course>) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  getCurrentSemesterCourses: () => Course[];
  getCurrentGPA: () => number;
  getCGPA: () => number;
  getCGPADetails: (courses: Course[], prior: { cgpa: number, units: number }) => CGPACalculationResult;
  getCarryovers: () => Course[];
  refreshCourses: () => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

interface CourseProviderProps {
  children: ReactNode;
}

function toGrade(grade: string | null): Grade {
  const validGrades: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  if (grade && validGrades.includes(grade as Grade)) {
    return grade as Grade;
  }
  return 'F';
}

export function CourseProvider({ children }: CourseProviderProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { session, user } = useAuth();

  const fetchCourses = async () => {
    if (!session?.user) {
      setCourses([]);
      setLoading(false);
      return;
    }

    // Immediately load from cache
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedData) {
      setCourses(JSON.parse(cachedData));
      setLoading(false);
    }

    if (!navigator.onLine) {
       // Stop fetching if offline; rely on cache
       setLoading(false);
       return;
    }

    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
    } else if (data) {
      const formattedCourses = data.map(c => ({
        id: c.id,
        code: c.code,
        title: c.title,
        units: Number(c.units),
        score: Number(c.score) || 0,
        grade: toGrade(c.grade),
        level: c.level,
        semester: c.semester,
      }));
      setCourses(formattedCourses);
      localStorage.setItem(CACHE_KEY, JSON.stringify(formattedCourses));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCourses();
  }, [session?.user?.id]);

  const addCourse = useCallback(async (course: Omit<Course, 'id' | 'grade'>) => {
    if (!session?.user) return;

    const grade = calculateGrade(course.score);
    const newCourseData = {
        code: course.code,
        title: course.title,
        units: course.units,
        score: course.score,
        grade,
        level: course.level,
        semester: course.semester,
    };
    
    // Optimistic UI Update & Cache Save
    const optimisticId = `local_${Date.now()}`;
    setCourses(prev => {
        const next = [{ id: optimisticId, ...newCourseData }, ...prev];
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        return next;
    });

    if (!navigator.onLine) {
        enqueueSyncAction({ type: 'ADD_COURSE', payload: newCourseData });
        return;
    }

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({ ...newCourseData, user_id: session.user.id })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCourses(prev => {
           const next = prev.map(c => c.id === optimisticId ? {
             id: data.id,
             code: data.code,
             title: data.title,
             units: Number(data.units),
             score: Number(data.score),
             grade: toGrade(data.grade),
             level: data.level,
             semester: data.semester,
           } : c);
           localStorage.setItem(CACHE_KEY, JSON.stringify(next));
           return next;
        });
      }
    } catch (error) {
       console.error('Error adding course:', error);
       // Revert optimistic update on failure
       setCourses(prev => {
           const next = prev.filter(c => c.id !== optimisticId);
           localStorage.setItem(CACHE_KEY, JSON.stringify(next));
           return next;
       });
       throw error;
    }
  }, [session?.user]);

  const updateCourse = useCallback(async (id: string, updates: Partial<Course>) => {
    if (!session?.user) return;

    const updateData: Record<string, unknown> = { ...updates };
    if (updates.score !== undefined) {
      updateData.grade = calculateGrade(updates.score);
    }

    // Optimistic Update & Cache
    setCourses(prev => {
      const next = prev.map(course => {
        if (course.id === id) {
          const updated = { ...course, ...updates };
          if (updates.score !== undefined) {
            updated.grade = calculateGrade(updates.score);
          }
          return updated;
        }
        return course;
      });
      localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      return next;
    });

    if (!navigator.onLine) {
        // Enqueue if the course exists remotely (wasn't just created locally without sync)
        if (!id.startsWith('local_')) {
             enqueueSyncAction({ type: 'UPDATE_COURSE', payload: { id, updates: updateData }});
        }
        return;
    }

    const { error } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error updating course:', error);
       // Ideally we could rollback here by keeping previous state, but we'll surface the error
      throw error;
    }
  }, [session?.user]);

  const deleteCourse = useCallback(async (id: string) => {
    if (!session?.user) return;

    // Optimistic Delete & Cache
    setCourses(prev => {
       const next = prev.filter(course => course.id !== id);
       localStorage.setItem(CACHE_KEY, JSON.stringify(next));
       return next;
    });

    if (!navigator.onLine) {
        if (!id.startsWith('local_')) {
            enqueueSyncAction({ type: 'DELETE_COURSE', payload: { id }});
        }
        return;
    }

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting course:', error);
      throw error;
    }
  }, [session?.user]);

  const getCurrentSemesterCourses = useCallback(() => {
    if (!user) return [];
    return courses.filter(
      course => course.level === user.level && course.semester === user.semester
    );
  }, [courses, user]);

  const getCurrentGPA = useCallback(() => {
    return calculateGPA(getCurrentSemesterCourses());
  }, [getCurrentSemesterCourses]);

  const getCGPA = useCallback(() => {
    return calculateGPA(courses);
  }, [courses]);

  const getCGPADetails = useCallback((courseList: Course[], prior: { cgpa: number, units: number }) => {
    return calculateCGPA(courseList, prior);
  }, []);

  const getCarryovers = useCallback(() => {
    return getCarryoverCourses(courses);
  }, [courses]);

  const refreshCourses = useCallback(async () => {
    setLoading(true);
    await fetchCourses();
  }, [session?.user?.id]); // fetchCourses depends on session.user.id but isn't memoized itself yet. Better to depend on fetchCourses if we memoize it or just keep it simple. fetchCourses is defined in scope, so we can't depend on it unless we move it or memoize it.
  // Actually, fetchCourses uses session.user.id. Let's fix fetchCourses first or just suppress/handle deps.
  // Since fetchCourses is inside the component and uses 'session', we should memoize it or just recreate it. 
  // Let's leave fetchCourses un-memoized (it's called in useEffect) and just use it here.

  const contextValue = useMemo(() => ({
    courses,
    loading,
    addCourse,
    updateCourse,
    deleteCourse,
    getCurrentSemesterCourses,
    getCurrentGPA,
    getCGPA,
    getCGPADetails,
    getCarryovers,
    refreshCourses,
  }), [
    courses, 
    loading, 
    addCourse, 
    updateCourse, 
    deleteCourse, 
    getCurrentSemesterCourses, 
    getCurrentGPA, 
    getCGPA, 
    getCGPADetails, 
    getCarryovers, 
    refreshCourses
  ]);

  return (
    <CourseContext.Provider value={contextValue}>
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  const context = useContext(CourseContext);
  if (!context) {
    throw new Error('useCourses must be used within CourseProvider');
  }
  return context;
}