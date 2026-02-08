import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageCircle, Mail } from 'lucide-react';
import { ChatConversationList } from '@/components/chat/ChatConversationList';
import { DirectMessageList } from '@/components/messages/DirectMessageList';

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') === 'messages' ? 'messages' : 'chat';
  const [mainTab, setMainTab] = useState<'chat' | 'messages'>(tabFromUrl);

  useEffect(() => {
    const tab = searchParams.get('tab') === 'messages' ? 'messages' : 'chat';
    setMainTab(tab);
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    const tab = value as 'chat' | 'messages';
    setMainTab(tab);
    if (tab === 'messages') {
      setSearchParams({ tab: 'messages' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] -m-4 lg:-m-6 max-w-4xl mx-auto">
      {/* Top-level tabs */}
      <div className="border-b bg-background">
        <Tabs value={mainTab} onValueChange={handleTabChange}>
          <TabsList className="w-full rounded-none border-0 bg-transparent h-12">
            <TabsTrigger 
              value="chat" 
              className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full"
            >
              <MessageCircle className="h-4 w-4" />
              채팅
            </TabsTrigger>
            <TabsTrigger 
              value="messages" 
              className="flex-1 gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none h-full"
            >
              <Mail className="h-4 w-4" />
              쪽지
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tab content */}
      {mainTab === 'chat' ? (
        <ChatConversationList />
      ) : (
        <DirectMessageList />
      )}
    </div>
  );
}
