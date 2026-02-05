import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useR2Upload } from '@/hooks/useR2Upload';
import { useCreateDigitalProduct, CreateDigitalProductData } from '@/hooks/useDigitalProducts';
import { Upload, FileIcon, X, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'GBP', symbol: '£' },
  { code: 'EUR', symbol: '€' },
];

interface ProductUploadProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductUpload({ onSuccess, onCancel }: ProductUploadProps) {
  const { uploadFile, isUploading, progress } = useR2Upload();
  const createProduct = useCreateDigitalProduct();
  
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    price_type: 'fixed' as 'fixed' | 'pwyw',
    base_price: '',
    min_price: '',
    currency: 'USD',
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Upload to R2
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
      const productData: CreateDigitalProductData = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        file_url: fileUrl,
        price_type: form.price_type,
        base_price: basePrice,
        min_price: form.price_type === 'pwyw' ? minPrice : undefined,
        currency: form.currency,
      };
      
      await createProduct.mutateAsync(productData);
      toast.success('Product created successfully');
      onSuccess?.();
    } catch (error) {
      toast.error('Failed to create product');
    }
  };

  const clearFile = () => {
    setFile(null);
    setFileUrl('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Digital Product
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Product File</Label>
            {!file ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  id="product-file"
                  onChange={handleFileSelect}
                  accept=".pdf,.zip,.mp3,.mp4,.epub,.png,.jpg,.jpeg"
                />
                <label htmlFor="product-file" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload your digital product
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, ZIP, MP3, MP4, EPUB, Images
                  </p>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileIcon className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {isUploading ? (
                  <div className="w-20">
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : fileUrl ? (
                  <Button type="button" variant="ghost" size="icon" onClick={clearFile}>
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
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
                  <SelectItem value="pwyw">Pay What You Want</SelectItem>
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

          {/* Price Fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base_price">
                {form.price_type === 'fixed' ? 'Price' : 'Suggested Price'}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
            </div>

            {form.price_type === 'pwyw' && (
              <div className="space-y-2">
                <Label htmlFor="min_price">Minimum Price</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="min_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.min_price}
                    onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                    placeholder="0.00 (free allowed)"
                    className="pl-9"
                  />
                </div>
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
              disabled={!fileUrl || createProduct.isPending}
            >
              {createProduct.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Product'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
