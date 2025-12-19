import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  useProfileProjects, 
  useCreateProject, 
  useUpdateProject,
  useDeleteProject,
  ProfileProject 
} from '@/hooks/useProfilePortfolio';
import { Folder, Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';

interface ProjectsSectionProps {
  userId: string;
  isEditing: boolean;
}

export function ProjectsSection({ userId, isEditing }: ProjectsSectionProps) {
  const { data: projects = [] } = useProfileProjects(userId);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProfileProject | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    external_url: '',
  });

  const handleOpenDialog = (project?: ProfileProject) => {
    if (project) {
      setEditingProject(project);
      setForm({
        title: project.title,
        description: project.description || '',
        image_url: project.image_url || '',
        external_url: project.external_url || '',
      });
    } else {
      setEditingProject(null);
      setForm({ title: '', description: '', image_url: '', external_url: '' });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title) return;

    if (editingProject) {
      await updateProject.mutateAsync({ id: editingProject.id, ...form });
    } else {
      await createProject.mutateAsync(form);
    }
    setDialogOpen(false);
    setForm({ title: '', description: '', image_url: '', external_url: '' });
    setEditingProject(null);
  };

  if (!projects.length && !isEditing) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Projects
        </CardTitle>
        {isEditing && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-1" />
                Add Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Project name"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>External Link</Label>
                  <Input
                    value={form.external_url}
                    onChange={(e) => setForm({ ...form, external_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingProject ? 'Update' : 'Create'} Project
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                {project.image_url && (
                  <div className="aspect-video bg-muted">
                    <img
                      src={project.image_url}
                      alt={project.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{project.title}</h4>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {project.description}
                        </p>
                      )}
                    </div>
                    {project.external_url && !isEditing && (
                      <a
                        href={project.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0"
                      >
                        <Button size="icon" variant="ghost" className="h-8 w-8">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    )}
                    {isEditing && (
                      <div className="flex gap-1 shrink-0">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(project)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8"
                          onClick={() => deleteProject.mutate(project.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            No projects added yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
