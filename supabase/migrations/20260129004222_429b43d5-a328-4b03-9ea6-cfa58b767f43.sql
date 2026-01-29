
-- 1. 프로필/팀 아바타용 퍼블릭 버킷 생성
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. 아바타 버킷 RLS 정책
-- 누구나 조회 가능
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'avatars');

-- 인증된 사용자가 자기 폴더에 업로드 가능
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 팀 리더가 팀 아바타 업로드 가능
CREATE POLICY "Team leaders can upload team avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'teams'
  AND EXISTS (
    SELECT 1 FROM teams t 
    WHERE t.leader_id = auth.uid() 
    AND t.id::text = (storage.foldername(name))[2]
  )
);

-- 자기 아바타 삭제 가능
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 팀 리더가 팀 아바타 삭제 가능
CREATE POLICY "Team leaders can delete team avatar" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'teams'
  AND EXISTS (
    SELECT 1 FROM teams t 
    WHERE t.leader_id = auth.uid() 
    AND t.id::text = (storage.foldername(name))[2]
  )
);

-- 자기 아바타 업데이트 가능
CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 팀 리더가 팀 아바타 업데이트 가능
CREATE POLICY "Team leaders can update team avatar" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'teams'
  AND EXISTS (
    SELECT 1 FROM teams t 
    WHERE t.leader_id = auth.uid() 
    AND t.id::text = (storage.foldername(name))[2]
  )
);
