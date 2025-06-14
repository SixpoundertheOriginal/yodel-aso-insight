
import React from 'react';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotChatMessageProps {
  message: Message;
}

export const CopilotChatMessage: React.FC<CopilotChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start space-x-3 max-w-3xl ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-yodel-orange text-white' 
            : 'bg-zinc-700 text-zinc-300'
        }`}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        
        <div className={`px-4 py-3 rounded-lg ${
          isUser 
            ? 'bg-yodel-orange text-white rounded-br-sm' 
            : 'bg-zinc-800 text-zinc-100 rounded-bl-sm'
        }`}>
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
          <div className={`text-xs mt-2 ${
            isUser ? 'text-orange-200' : 'text-zinc-500'
          }`}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
