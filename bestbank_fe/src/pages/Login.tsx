import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert, Paper } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/login', { email, password });
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
        <Typography variant="h6" mb={3}>Sign in to your account</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required sx={{ mb: 2 }} />
          <TextField fullWidth label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required sx={{ mb: 3 }} />
          <Button fullWidth variant="contained" color="secondary" type="submit" disabled={loading} sx={{ py: 1.5, mb: 2 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#c0392b' }}>Register</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
