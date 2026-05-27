import { useState, useRef, useEffect } from 'react';
import {
  Box, Drawer, Fab, TextField, IconButton, Typography,
  CircularProgress, Avatar, Tooltip,
} from '@mui/material';
import { Chat, Close, Send, SmartToy, Person } from '@mui/icons-material';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTIONS = [
  'What is my current balance?',
  'How much did I spend last month?',
  'Show me my last 5 transactions',
  'How much have I received this week?',
];

export default function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('/api/chat', { question: q });
      setMessages(prev => [...prev, { role: 'assistant', text: res.data.answer }]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      <Tooltip title="Ask about your account" placement="left">
        <Fab
          color="secondary"
          onClick={() => setOpen(true)}
          sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1200 }}
        >
          <Chat />
        </Fab>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: { xs: '100vw', sm: 400 }, display: 'flex', flexDirection: 'column' } }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
            <SmartToy sx={{ fontSize: 18 }} />
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2}>Account Assistant</Typography>
            <Typography variant="caption" color="text.secondary">Ask anything about your account</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small">
            <Close />
          </IconButton>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {messages.length === 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Try asking:
              </Typography>
              {SUGGESTIONS.map(s => (
                <Box
                  key={s}
                  onClick={() => send(s)}
                  sx={{
                    px: 1.5, py: 1, mb: 1, borderRadius: 2,
                    border: '1px solid', borderColor: 'divider',
                    cursor: 'pointer', typography: 'body2',
                    '&:hover': { borderColor: 'secondary.main', bgcolor: 'action.hover' },
                  }}
                >
                  {s}
                </Box>
              ))}
            </Box>
          )}

          {messages.map((m, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 1,
              }}
            >
              <Avatar
                sx={{
                  width: 28, height: 28, flexShrink: 0,
                  bgcolor: m.role === 'user' ? 'primary.main' : 'secondary.main',
                  mt: 0.5,
                }}
              >
                {m.role === 'user' ? <Person sx={{ fontSize: 16 }} /> : <SmartToy sx={{ fontSize: 16 }} />}
              </Avatar>
              <Box
                sx={{
                  maxWidth: '78%',
                  px: 1.5, py: 1,
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  bgcolor: m.role === 'user' ? 'secondary.main' : 'action.hover',
                  color: m.role === 'user' ? 'secondary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {m.text}
                </Typography>
              </Box>
            </Box>
          ))}

          {loading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main' }}>
                <SmartToy sx={{ fontSize: 16 }} />
              </Avatar>
              <Box sx={{ px: 1.5, py: 1, borderRadius: '16px 16px 16px 4px', bgcolor: 'action.hover' }}>
                <CircularProgress size={16} color="secondary" />
              </Box>
            </Box>
          )}

          <div ref={bottomRef} />
        </Box>

        {/* Input */}
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask about your account..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            multiline
            maxRows={3}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <IconButton
            color="secondary"
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            sx={{ alignSelf: 'flex-end', border: '1px solid', borderColor: 'secondary.main', borderRadius: 2 }}
          >
            <Send fontSize="small" />
          </IconButton>
        </Box>
      </Drawer>
    </>
  );
}
