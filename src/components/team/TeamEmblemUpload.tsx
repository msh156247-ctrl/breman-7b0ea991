import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';

const EMOJIS = ['🚀', '💻', '🎨', '🔒', '⚡', '🌟', '🎯', '💡', '🔥', '🏆', '💪', '🎮'];

interface TeamEmblemUploadProps {
  teamId?: string;
  currentEmblem: string;
  onEmblemChange: (emblem: string) => void;
  isEditing?: boolean;
}

export function TeamEmblemUpload({ 
  teamId, 
  currentEmblem, 
  onEmblemChange,
  isEditing = false 
}: TeamEmblemUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEmoji = EMOJIS.includes(currentEmblem) || currentEmblem.length <= 4;
  const displayUrl = previewUrl || (!isEmoji ? currentEmblem : null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '오류',
        description: '이미지 파일만 업로드할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: '오류',
        description: '파일 크기는 5MB 이하여야 합니다.',
        variant: 'destructive',
      });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      setPreviewUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // If editing existing team, upload immediately
    if (isEditing && teamId) {
      setIsUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `teams/${teamId}/emblem.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        onEmblemChange(publicUrl);
        
        toast({
          title: '성공',
          description: '팀 엠블럼이 업데이트되었습니다.',
        });
      } catch (error) {
        console.error('Emblem upload error:', error);
        toast({
          title: '오류',
          description: '엠블럼 업로드에 실패했습니다.',
          variant: 'destructive',
        });
        setPreviewUrl(null);
      } finally {
        setIsUploading(false);
      }
    } else {
      // For new teams, store the file temporarily and upload after team creation
      // We'll handle this with a data URL for now
      onEmblemChange(previewUrl || currentEmblem);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setPreviewUrl(null);
    onEmblemChange(emoji);
  };

  return (
    <div className="space-y-3">
      <Label>팀 엠블럼</Label>
      
      {/* Image Upload */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar 
            className="h-20 w-20 cursor-pointer border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {displayUrl ? (
              <AvatarImage src={displayUrl} />
            ) : null}
            <AvatarFallback className="text-3xl bg-muted">
              {isEmoji ? currentEmblem : '📷'}
            </AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {isUploading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Camera className="w-3 h-3" />
            )}
          </button>
        </div>
        <div className="text-sm text-muted-foreground">
          <p>이미지 업로드 또는</p>
          <p>아래 이모지 선택</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Emoji Selection */}
      <div className="flex flex-wrap gap-2">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleEmojiClick(emoji)}
            className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
              currentEmblem === emoji && !previewUrl
                ? 'border-primary bg-primary/10'
                : 'border-muted hover:border-muted-foreground'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
