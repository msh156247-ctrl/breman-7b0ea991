import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { getAvatarWithFallback } from '@/lib/avatarUtils';
import { processImageForUpload } from '@/lib/imageCompression';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ROLE_TYPES, ANIMAL_SKINS, HOBBY_PRESETS, INTEREST_PRESETS, type RoleType, type AnimalSkin } from '@/lib/constants';

const profileSchema = z.object({
  name: z.string().trim().min(1, '닉네임을 입력해주세요').max(50, '닉네임은 50자 이내로 입력해주세요'),
  bio: z.string().max(500, '자기소개는 500자 이내로 입력해주세요').optional(),
  main_role_type: z.string().optional(),
  animal_skin: z.string().optional(),
  hobbies: z.array(z.string()).max(10, '취미는 최대 10개까지 선택 가능합니다').optional(),
  interests: z.array(z.string()).max(10, '관심분야는 최대 10개까지 선택 가능합니다').optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProfileEditDialog({ open, onOpenChange, onSuccess }: ProfileEditDialogProps) {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
      bio: profile?.bio || '',
      main_role_type: profile?.main_role_type || '',
      animal_skin: profile?.animal_skin || 'horse',
      hobbies: (profile as any)?.hobbies || [],
      interests: (profile as any)?.interests || [],
    },
  });

  const hobbies = form.watch('hobbies') || [];
  const interests = form.watch('interests') || [];

  const addHobby = (hobby: string) => {
    if (hobbies.length >= 10) return;
    if (!hobbies.includes(hobby)) {
      form.setValue('hobbies', [...hobbies, hobby]);
    }
  };

  const removeHobby = (hobby: string) => {
    form.setValue('hobbies', hobbies.filter(h => h !== hobby));
  };

  const addInterest = (interest: string) => {
    if (interests.length >= 10) return;
    if (!interests.includes(interest)) {
      form.setValue('interests', [...interests, interest]);
    }
  };

  const removeInterest = (interest: string) => {
    form.setValue('interests', interests.filter(i => i !== interest));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: '오류',
        description: '이미지 파일만 업로드할 수 있습니다.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    try {
      // Compress image if over 5MB
      const processedFile = await processImageForUpload(file, 5);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setAvatarPreview(event.target?.result as string);
      };
      reader.readAsDataURL(processedFile);

      const fileExt = processedFile.name.split('.').pop();
      const fileName = `profiles/${user.id}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, processedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: '성공',
        description: '프로필 사진이 업데이트되었습니다.',
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: '오류',
        description: '사진 업로드에 실패했습니다.',
        variant: 'destructive',
      });
      setAvatarPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (values: ProfileFormValues) => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: values.name,
          bio: values.bio || null,
          main_role_type: (values.main_role_type || null) as RoleType | null,
          animal_skin: (values.animal_skin || 'horse') as AnimalSkin,
          hobbies: values.hobbies || [],
          interests: values.interests || [],
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: '성공',
        description: '프로필이 업데이트되었습니다.',
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: '오류',
        description: '프로필 업데이트에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Use random avatar as fallback when no avatar is set
  const currentAvatarUrl = avatarPreview || 
    (profile?.avatar_url ? profile.avatar_url : getAvatarWithFallback(null, user?.id || 'default', 'user'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>프로필 수정</DialogTitle>
          <DialogDescription>
            프로필 정보를 수정할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-4">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                    <AvatarImage src={currentAvatarUrl || undefined} />
                    <AvatarFallback className="text-2xl bg-muted">
                      {profile?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Camera className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  클릭하여 사진 변경 (최대 5MB)
                </p>
              </div>

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>닉네임</FormLabel>
                    <FormControl>
                      <Input placeholder="닉네임을 입력하세요" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bio */}
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>자기소개</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="간단한 자기소개를 작성해주세요" 
                        className="resize-none"
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Main Role Type */}
              <FormField
                control={form.control}
                name="main_role_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메인 포지션</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="포지션을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ROLE_TYPES).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {value.icon} {value.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Animal Skin */}
              <FormField
                control={form.control}
                name="animal_skin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>협업 성향</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="협업 성향을 선택하세요" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(ANIMAL_SKINS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              {value.icon} {value.name} - {value.title}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hobbies */}
              <FormField
                control={form.control}
                name="hobbies"
                render={() => (
                  <FormItem>
                    <FormLabel>취미 (최대 10개)</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {hobbies.map((hobby) => (
                          <Badge key={hobby} variant="secondary" className="gap-1 pr-1">
                            {hobby}
                            <button
                              type="button"
                              onClick={() => removeHobby(hobby)}
                              className="ml-1 hover:bg-muted rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="gap-1">
                            <Plus className="w-3 h-3" />
                            취미 추가
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-2" align="start">
                          <ScrollArea className="h-48">
                            <div className="flex flex-wrap gap-1.5 p-1">
                              {HOBBY_PRESETS.filter(h => !hobbies.includes(h)).map((hobby) => (
                                <Badge
                                  key={hobby}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-accent transition-colors"
                                  onClick={() => addHobby(hobby)}
                                >
                                  {hobby}
                                </Badge>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interests */}
              <FormField
                control={form.control}
                name="interests"
                render={() => (
                  <FormItem>
                    <FormLabel>관심분야 (최대 10개)</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {interests.map((interest) => (
                          <Badge key={interest} variant="default" className="gap-1 pr-1">
                            {interest}
                            <button
                              type="button"
                              onClick={() => removeInterest(interest)}
                              className="ml-1 hover:bg-primary/80 rounded-full p-0.5"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button type="button" variant="outline" size="sm" className="gap-1">
                            <Plus className="w-3 h-3" />
                            관심분야 추가
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-2" align="start">
                          <ScrollArea className="h-48">
                            <div className="flex flex-wrap gap-1.5 p-1">
                              {INTEREST_PRESETS.filter(i => !interests.includes(i)).map((interest) => (
                                <Badge
                                  key={interest}
                                  variant="outline"
                                  className="cursor-pointer hover:bg-accent transition-colors"
                                  onClick={() => addInterest(interest)}
                                >
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button - Fixed at bottom */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
