'use client';

import { useState } from 'react';
import AIChatModal from '@/components/AIChatModal';

export default function DirectAISQLChatPage() {
  const [isChatModalOpen, setIsChatModalOpen] = useState(true);

  return (
    <>
      <AIChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        chatType="Direct_chat"
      />
    </>
  );
}

