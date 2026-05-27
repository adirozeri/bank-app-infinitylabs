import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const email = (location.state as { email: string })?.email ?? '';
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/verify-otp', { email, otp });
      login();
      navigate('/dashboard');
    } catch (err) {
      setError(axios.isAxiosError(err) ? err.response?.data?.error ?? 'Request failed.' : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Paper elevation={4} sx={{ p: 4, width: '100%', maxWidth: 420, bgcolor: 'background.paper' }}>
        <Typography variant="h4" fontWeight="bold" color="secondary" mb={1}>BestBank</Typography>
        <Typography variant="h6" mb={1}>Verify your account</Typography>
        <Typography variant="body2" color="text.secondary" mb={3}>
          A verification link was sent to <strong>{email}</strong>. Enter the OTP from the email below.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="OTP Code" value={otp} onChange={e => setOtp(e.target.value)} required inputProps={{ maxLength: 6 }} sx={{ mb: 3 }} />
          <Button fullWidth variant="contained" color="secondary" type="submit" disabled={loading} sx={{ py: 1.5 }}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
