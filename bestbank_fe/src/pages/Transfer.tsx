import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, Paper, AppBar, Toolbar, Chip, IconButton, Tooltip, Snackbar } from '@mui/material';
import { DarkMode, LightMode } from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { useSocket } from '../context/SocketContext';

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const QUICK_AMOUNTS = [100, 250, 500, 1000];

export default function Transfer() {
  const { mode, toggleMode } = useThemeMode();
  const navigate = useNavigate();
  const [receiverEmail, setReceiverEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { notification, clearNotification } = useSocket();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (!notification) return;
    setSnackbarOpen(true);
  }, [notification]);

  const handleSnackbarClose = (_e?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
    clearNotification();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await axios.post('/api/transactions', { receiverEmail, amount: Number(amount) });
      setSuccess(`Transfer successful. New balance: $${res.data.senderBalance.toLocaleString()}`);
      setReceiverEmail('');
      setAmount('');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error ?? 'Request failed.' : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" color="secondary" sx={{ flexGrow: 1 }}>BestBank</Typography>
          <Button color="inherit" onClick={() => navigate('/dashboard')} sx={{ mr: 0.5 }}>Dashboard</Button>
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton color="inherit" onClick={toggleMode}>
              {mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>Send Money</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        <Paper sx={{ p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
          <form onSubmit={handleSubmit}>
            <TextField fullWidth label="Recipient Email" type="email" value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} required sx={{ mb: 3 }} />
            <Typography variant="body2" color="text.secondary" mb={1}>Quick select</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              {QUICK_AMOUNTS.map(a => (
                <Chip key={a} label={`$${a}`} onClick={() => setAmount(String(a))} color={amount === String(a) ? 'error' : 'default'} clickable />
              ))}
            </Box>
            <TextField fullWidth label="Amount ($)" type="number" value={amount} onChange={e => setAmount(e.target.value)} required inputProps={{ min: 1 }} sx={{ mb: 3 }} />
            <Button fullWidth variant="contained" color="secondary" type="submit" disabled={loading} sx={{ py: 1.5 }}>
              {loading ? 'Sending...' : 'Send Money'}
            </Button>
          </form>
        </Paper>
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" variant="filled" sx={{ width: '100%' }}>
          {notification && `You received $${fmt(notification.amount)} from ${notification.senderEmail}`}
        </Alert>
      </Snackbar>

    </Box>
  );
}
