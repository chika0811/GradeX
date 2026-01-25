
import React, { forwardRef } from 'react';
import { UserProfile } from '@/contexts/AuthContext';
import { Course } from '@/lib/grading';
import { calculateGrade } from '@/lib/grading';
import { Building } from 'lucide-react';

interface ResultSlipProps {
  user: UserProfile | null;
  courses: Course[];
  semesterParam: string | null;
  levelParam: string | null;
  gpa: number;
}

const ResultSlip = forwardRef<HTMLDivElement, ResultSlipProps>(({ user, courses, semesterParam, levelParam, gpa }, ref) => {
  const displayLevel = levelParam || user?.level || 'N/A';
  const displaySemester = semesterParam || 'Results';
  const session = "2023/2024"; // Dynamic session would be better if tracked

  const passportImage = localStorage.getItem('gradex_user_passport');

  return (
    <div ref={ref} className="p-10 bg-white text-black font-sans min-w-[800px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <p className="text-gray-500 text-sm">Results/ {session} {displaySemester}</p>
          <h1 className="text-2xl font-bold text-teal-800">Results</h1>
        </div>
        {/* Placeholder for Print Button if viewed in browser, but hidden in PDF usually */}
      </div>

      <div className="text-center mb-10">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Building className="w-6 h-6 text-green-900"/>
            <h2 className="text-xl font-bold text-green-900 uppercase">{user?.institution || "University Name"}</h2>
        </div>
      </div>

      {/* Profile Section */}
      <div className="flex gap-8 mb-10 text-sm">
        {/* Passport Placeholder */}
        <div className="w-32 h-32 bg-gray-200 flex items-center justify-center border border-gray-300 overflow-hidden">
           {passportImage ? (
             <img src={passportImage} alt="Passport" className="w-full h-full object-cover" />
           ) : (
             <span className="text-xs text-center text-gray-500">Passport Photograph</span>
           )}
        </div>

        <div className="flex-1 grid grid-cols-2 gap-x-12 gap-y-2">
            <div className="flex">
                <span className="font-semibold w-24">Full Name:</span>
                <span className="uppercase font-bold">{user?.name}</span>
            </div>
            <div className="flex">
                <span className="font-semibold w-24">Matric No:</span>
                <span className="font-bold">N/A</span> 
            </div>
            
            <div className="flex">
                <span className="font-semibold w-24">Faculty:</span>
                <span className="uppercase font-bold">{user?.faculty || "N/A"}</span>
            </div>
            <div className="flex">
                 <span className="font-semibold w-24">Department:</span>
                 <span className="font-bold uppercase">{user?.department || "N/A"}</span>
            </div>

            <div className="flex">
                <span className="font-semibold w-24">Entry Mode:</span>
                <span className="font-bold">UTME</span>
            </div>
            <div className="flex">
                <span className="font-semibold w-24">Level:</span>
                <span className="font-bold uppercase">{displayLevel}</span>
            </div>

            <div className="flex">
                <span className="font-semibold w-24">Session:</span>
                <span className="font-bold">{session}</span>
            </div>
             <div className="flex">
                <span className="font-semibold w-24">Semester:</span>
                <span className="font-bold uppercase">{displaySemester}</span>
            </div>
        </div>
      </div>

      <div className="text-center mb-6">
          <h3 className="font-bold text-lg uppercase text-blue-900">{session} {displaySemester} RESULTS</h3>
      </div>

      {/* Results Table */}
      <div className="mb-6">
        <table className="w-full text-left text-sm border-t border-b border-gray-200">
            <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-2">Course Code</th>
                    <th className="py-2">Course Unit</th>
                    <th className="py-2">Grade</th>
                </tr>
            </thead>
            <tbody>
                {courses.map((course) => (
                    <tr key={course.id} className="border-b border-gray-100">
                        <td className="py-3 font-medium text-gray-700 uppercase">{course.code}</td>
                        <td className="py-3 text-gray-600">{course.units}</td>
                        <td className="py-3 font-bold text-gray-700">{course.grade}</td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      <div className="flex justify-end mt-4">
          <div className="flex gap-4 text-sm">
            <span className="font-bold text-gray-600">GPA</span>
            <span className="font-bold text-black">{gpa.toFixed(2)}</span>
          </div>
      </div>

    </div>
  );
});

export default ResultSlip;
