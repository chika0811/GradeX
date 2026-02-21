import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ProfileCompletion() {
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if profile is incomplete
  const isIncomplete = user && (!user.institution || !user.faculty || !user.department || !user.matric_no);

  const [formData, setFormData] = useState({
    institution: user?.institution || '',
    faculty: user?.faculty || '',
    department: user?.department || '',
    matric_no: user?.matric_no || '',
  });

  if (!isIncomplete) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfile(formData);
      toast({
        title: 'Profile Updated',
        description: 'Thank you for completing your profile.',
      });
      setIsOpen(false);
    } catch (error: unknown) {
      toast({
        title: 'Update Failed',
        description: (error as Error).message || 'Could not update your profile.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="px-4 py-2 bg-destructive/10 cursor-pointer animate-in fade-in" onClick={() => setIsOpen(true)}>
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">Profile Incomplete</p>
            <p className="text-xs text-destructive/80">
              Please complete your profile to enable accurate PDF result generation. Click here to update.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 border-destructive text-destructive hover:bg-destructive hover:text-white">
            Update Now
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              We need a few more details to accurately generate your academic results sheets.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="institution">Institution / University Name <span className="text-destructive">*</span></Label>
              <Input
                id="institution"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                placeholder="e.g. University of Lagos"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="matric_no">Matric Number <span className="text-destructive">*</span></Label>
              <Input
                id="matric_no"
                value={formData.matric_no}
                onChange={(e) => setFormData({ ...formData, matric_no: e.target.value })}
                placeholder="e.g. MAT/123/456"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faculty">Faculty <span className="text-destructive">*</span></Label>
              <Input
                id="faculty"
                value={formData.faculty}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                placeholder="e.g. Science"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. Computer Science"
                required
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
