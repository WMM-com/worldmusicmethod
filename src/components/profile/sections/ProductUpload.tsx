import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useCreateDigitalProduct, useUpdateDigitalProduct, CreateDigitalProductData, DigitalProduct } from '@/hooks/useDigitalProducts';
import { Upload, FileIcon, X, Loader2, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
];

interface ProductUploadProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  /** Pass existing product to enable edit mode */
  editProduct?: DigitalProduct;
}

export function ProductUpload({ onSuccess, onCancel, editProduct }: ProductUploadProps) {
  const { uploadFile, isUploading, progress } = useR2Upload();
  const createProduct = useCreateDigitalProduct();
  const updateProduct = useUpdateDigitalProduct();
  
  const isEditMode = !!editProduct;
  
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>(editProduct?.file_url || '');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>(editProduct?.cover_image_url || '');
  const [coverUploading, setCoverUploading] = useState(false);
  const [form, setForm] = useState({
    title: editProduct?.title || '',
    description: editProduct?.description || '',
    price_type: (editProduct?.price_type || 'fixed') as 'fixed' | 'pwyw',
    base_price: editProduct ? String(editProduct.base_price) : '',
    min_price: editProduct?.min_price != null ? String(editProduct.min_price) : '',
    currency: editProduct?.currency || 'USD',
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    const result = await uploadFile(selectedFile, {
      bucket: 'user',
      folder: 'digital-products',
      trackInDatabase: false,
    });
    
    if (result) {
      setFileUrl(result.url);
      toast.success('File uploaded successfully');
    }
  };

  const handleCoverSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setCoverFile(selectedFile);
    setCoverUploading(true);
    
    const result = await uploadFile(selectedFile, {
      bucket: 'user',
      folder: 'digital-product-covers',
      trackInDatabase: false,
    });
    
    setCoverUploading(false);
    if (result) {
      setCoverUrl(result.url);
      toast.success('Cover image uploaded');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fileUrl) {
      toast.error('Please upload a file first');
      return;
    }
    
    if (!form.title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    
    const basePrice = parseFloat(form.base_price) || 0;
    const minPrice = parseFloat(form.min_price) || 0;
    
    if (form.price_type === 'fixed' && basePrice <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    
    if (form.price_type === 'pwyw' && minPrice < 0) {
      toast.error('Minimum price cannot be negative');
      return;
    }
    
    try {
      if (isEditMode) {
        await updateProduct.mutateAsync({
          id: editProduct.id,
          title: form.title.trim(),
          description: form.description.trim() || null,
          file_url: fileUrl,
          price_type: form.price_type,
          base_price: basePrice,
          min_price: form.price_type === 'pwyw' ? minPrice : null,
          currency: form.currency,
          ...(coverUrl ? { cover_image_url: coverUrl } : {}),
        } as any);
        toast.success('Product updated successfully');
      } else {
        const productData: CreateDigitalProductData = {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          file_url: fileUrl,
          price_type: form.price_type,
          base_price: basePrice,
          min_price: form.price_type === 'pwyw' ? minPrice : undefined,
          currency: form.currency,
        };
        
        const created = await createProduct.mutateAsync(productData);
        
        // Update cover image if provided
        if (coverUrl && created?.id) {
          await updateProduct.mutateAsync({
            id: created.id,
            cover_image_url: coverUrl,
          } as any);
        }
        
        toast.success('Product created successfully');
      }
      onSuccess?.();
    } catch (error) {
      toast.error(isEditMode ? 'Failed to update product' : 'Failed to create product');
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileUrl(isEditMode ? editProduct.file_url : '');
  };

  const clearCover = () => {
    setCoverFile(null);
    setCoverUrl('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {isEditMode ? 'Edit Digital Product' : 'Upload Digital Product'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product File Upload */}
          <div className="space-y-2">
            <Label>Product File</Label>
            {!file && !fileUrl ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  id="product-file"
                  onChange={handleFileSelect}
                  accept=".pdf,.zip,.rar,.mp3,.mp4,.epub,.png,.jpg,.jpeg,.gif,.webp"
                />
                <label htmlFor="product-file" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload your digital product
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, ZIP, RAR, MP3, MP4, EPUB, Images
                  </p>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileIcon className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {file?.name || (fileUrl ? 'Existing file' : '')}
                  </p>
                  {file && (
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                </div>
                {isUploading ? (
                  <div className="w-20">
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : (
                  <Button type="button" variant="ghost" size="icon" onClick={clearFile}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Cover Image Upload */}
          <div className="space-y-2">
            <Label>Cover Image (optional)</Label>
            {!coverFile && !coverUrl ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  id="cover-image"
                  onChange={handleCoverSelect}
                  accept=".png,.jpg,.jpeg,.gif,.webp"
                />
                <label htmlFor="cover-image" className="cursor-pointer flex items-center justify-center gap-2">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload cover image</span>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                {coverUrl && (
                  <img src={coverUrl} alt="Cover" className="h-12 w-12 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {coverFile?.name || 'Cover image'}
                  </p>
                </div>
                {coverUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Button type="button" variant="ghost" size="icon" onClick={clearCover}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g., My Digital Album"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe your product..."
              rows={3}
            />
          </div>

          {/* Pricing Type */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pricing Type</Label>
              <Select
                value={form.price_type}
                onValueChange={(v: 'fixed' | 'pwyw') => setForm({ ...form, price_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Fixed Price</SelectItem>
                  <SelectItem value="pwyw">Pay What You Feel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm({ ...form, currency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Fields — no $ icon inside inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base_price">
                {form.price_type === 'fixed' ? 'Price' : 'Suggested Price'}
              </Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                min="0"
                value={form.base_price}
                onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {form.price_type === 'pwyw' && (
              <div className="space-y-2">
                <Label htmlFor="min_price">Minimum Price</Label>
                <Input
                  id="min_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.min_price}
                  onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                  placeholder="0.00 (free allowed)"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              type="submit" 
              className="flex-1"
              disabled={!fileUrl || createProduct.isPending || updateProduct.isPending}
            >
              {(createProduct.isPending || updateProduct.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Product' : 'Create Product'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
