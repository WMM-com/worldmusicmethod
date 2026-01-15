import { useState } from 'react';
import { useUserDocuments, DOCUMENT_CATEGORIES, UserDocument } from '@/hooks/useUserDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileUpload } from '@/components/ui/file-upload';
import { 
  Plus, 
  FileText, 
  Trash2, 
  Edit, 
  Mail, 
  Download, 
  ExternalLink,
  FolderOpen,
  FileImage,
  FileAudio,
  FileVideo,
  File
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

export function DocumentsTab() {
  const { user, profile } = useAuth();
  const { documents, loading, createDocument, updateDocument, deleteDocument } = useUserDocuments();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<UserDocument | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [shareDialogDoc, setShareDialogDoc] = useState<UserDocument | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const resetUploadForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setCategory('');
    setUploadProgress(0);
  };

  const handleUpload = async () => {
    if (!file || !title.trim() || !user) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      
      setUploadProgress(30);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setUploadProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-documents')
        .getPublicUrl(fileName);

      setUploadProgress(90);

      // Save to database
      await createDocument(
        title.trim(),
        urlData.publicUrl,
        file.name,
        file.type,
        file.size,
        description,
        category || undefined
      );

      setUploadProgress(100);
      setUploadDialogOpen(false);
      resetUploadForm();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    await deleteDocument(deleteConfirmId);
    setDeleteConfirmId(null);
  };

  const handleEdit = async () => {
    if (!editingDoc) return;
    await updateDocument(editingDoc.id, {
      title: title.trim(),
      description: description.trim() || null,
      document_category: category || null,
    });
    setEditingDoc(null);
    resetUploadForm();
  };

  const openEditDialog = (doc: UserDocument) => {
    setTitle(doc.title);
    setDescription(doc.description || '');
    setCategory(doc.document_category || '');
    setEditingDoc(doc);
  };

  const openShareDialog = (doc: UserDocument) => {
    const userName = profile?.full_name || profile?.business_name || 'A user';
    setShareMessage(`${userName} has shared a document with you: "${doc.title}"\n\nYou can view it using the link below.`);
    setShareDialogDoc(doc);
    setShareEmail('');
  };

  const handleShare = async () => {
    if (!shareDialogDoc || !shareEmail) return;
    
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-direct-email', {
        body: {
          to: shareEmail,
          subject: `${profile?.full_name || 'Document'} - Document Sharing`,
          html: `
            <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Document Shared With You</h2>
              <p>${shareMessage.replace(/\n/g, '<br/>')}</p>
              <p style="margin-top: 20px;">
                <a href="${shareDialogDoc.file_url}" 
                   style="background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block;">
                  View Document
                </a>
              </p>
            </div>
          `,
        },
      });

      if (error) throw error;
      toast.success('Document shared successfully');
      setShareDialogDoc(null);
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share document');
    } finally {
      setSending(false);
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-8 w-8" />;
    if (fileType.startsWith('image/')) return <FileImage className="h-8 w-8" />;
    if (fileType.startsWith('audio/')) return <FileAudio className="h-8 w-8" />;
    if (fileType.startsWith('video/')) return <FileVideo className="h-8 w-8" />;
    if (fileType.includes('pdf')) return <FileText className="h-8 w-8" />;
    return <File className="h-8 w-8" />;
  };

  const getCategoryLabel = (cat: string | null) => {
    return DOCUMENT_CATEGORIES.find(c => c.value === cat)?.label || 'Uncategorized';
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Guide text */}
      <div className="bg-card/50 border border-border rounded-lg px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Upload and store any documents which might be needed to share with venues, tour managers, or bandmates with one click.
        </p>
      </div>

      {/* Document type suggestions */}
      <div className="flex flex-wrap gap-2">
        {DOCUMENT_CATEGORIES.map(cat => (
          <div
            key={cat.value}
            className="px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground"
            title={cat.description}
          >
            {cat.label}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Your Documents</h2>
          <p className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? 's' : ''} stored
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) resetUploadForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <FileUpload
                accept="*/*"
                maxSizeMB={50}
                onFileSelect={setFile}
                onRemove={() => setFile(null)}
                isUploading={uploading}
                progress={uploadProgress}
              />
              
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Passport, Public Liability Insurance"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add any notes about this document..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              
              <Button 
                onClick={handleUpload} 
                className="w-full" 
                disabled={!file || !title.trim() || uploading}
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-8 bg-muted rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-1">No documents yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Upload your first document to keep it safe and shareable
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="group hover:border-secondary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{doc.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {getCategoryLabel(doc.document_category)}
                    </p>
                    {doc.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {doc.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.file_name} {doc.file_size && `• ${formatFileSize(doc.file_size)}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 mt-4 pt-3 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(doc.file_url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1"
                    onClick={() => openShareDialog(doc)}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openEditDialog(doc)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirmId(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={(open) => {
        if (!open) {
          setEditingDoc(null);
          resetUploadForm();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            
            <Button onClick={handleEdit} className="w-full" disabled={!title.trim()}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={!!shareDialogDoc} onOpenChange={(open) => !open && setShareDialogDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="share-email">Recipient Email</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="email@example.com"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="share-message">Message</Label>
              <Textarea
                id="share-message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                rows={4}
              />
            </div>
            
            <Button 
              onClick={handleShare} 
              className="w-full" 
              disabled={!shareEmail || sending}
            >
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
