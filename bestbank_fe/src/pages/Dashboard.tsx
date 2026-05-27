import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, Card, CardContent,
  Chip, Grid, Divider, Avatar, IconButton, Tooltip, Pagination,
  Snackbar, Alert, useTheme,
} from '@mui/material';
import { Refresh, DarkMode, LightMode } from '@mui/icons-material';
import {
  AccountBalance, TrendingDown, HourglassEmpty,
  Send, AddCircle, Receipt, Support,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useThemeMode } from '../context/ThemeModeContext';
import { User, Transaction } from '../types';
import ChatPanel from '../components/ChatPanel';

function getMonthlySpending(transactions: Transaction[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), spent: 0 };
  });
  for (const t of transactions) {
    if (t.amount >= 0) continue;
    const d = new Date(t.timestamp);
    const entry = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (entry) entry.spent += Math.abs(t.amount);
  }
  return months;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
    const { isAuthenticated, loading, logout } = useAuth();

//   const { isAuthenticated, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 5;

  const { notification, clearNotification } = useSocket();
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    if (!notification) return;
    setRefreshKey(k => k + 1);
    setSnackbarOpen(true);
  }, [notification]);

  const handleSnackbarClose = (_e?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
    clearNotification();
  };

  useEffect(() => {
    if (!isAuthenticated) 
        { 
            navigate('/login');
            return; 
        }

    axios.get('/api/account/me')
      .then(res => setUser(res.data))
      .catch(() => setError('Failed to load account.'));

    axios.get('/api/transactions')
      .then(res => { if (res.data.transactions) setTransactions(res.data.transactions); })
      .catch(() => {});
      
  }, [isAuthenticated, navigate, refreshKey]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const total = user?.balance ?? 0;

  const now = new Date();
  const spentThisMonth = transactions
    .filter(t => t.amount < 0 && new Date(t.timestamp).getMonth() === now.getMonth() && new Date(t.timestamp).getFullYear() === now.getFullYear())
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const sortedTx = [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const txPageCount = Math.max(1, Math.ceil(sortedTx.length / TX_PER_PAGE));
  const txVisible = sortedTx.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE);

  const monthlyData = getMonthlySpending(transactions);
  const maxSpent = Math.max(...monthlyData.map(m => m.spent), 1);

  const inactiveBar = isDark ? '#2a2a2a' : '#e0e0e0';
  const inactiveBorder = isDark ? '#333' : '#d0d0d0';

  const metrics = [
    { label: 'Balance',          value: total,          icon: <AccountBalance sx={{ fontSize: 18 }} />, color: '#c0392b' },
    { label: 'Spent This Month', value: spentThisMonth, icon: <TrendingDown   sx={{ fontSize: 18 }} />, color: '#e67e22' },
    { label: 'Pending',          value: 0,              icon: <HourglassEmpty sx={{ fontSize: 18 }} />, color: '#8e44ad' },
  ];

  const quickActions = [
    { label: 'Transfer', icon: <Send />,       onClick: () => navigate('/transfer') },
    { label: 'Deposit',  icon: <AddCircle />,  onClick: () => {} },
    { label: 'History',  icon: <Receipt />,    onClick: () => {} },
    { label: 'Support',  icon: <Support />,    onClick: () => {} },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

      {/* Navbar */}
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" fontWeight="bold" color="secondary" sx={{ flexGrow: 1 }}>BestBank</Typography>
          <Button color="inherit" sx={{ mr: 1 }}>Dashboard</Button>
          <Button color="inherit" onClick={() => navigate('/transfer')} sx={{ mr: 1 }}>Transfer</Button>
          <Tooltip title="Refresh">
            <IconButton color="inherit" onClick={() => setRefreshKey(k => k + 1)} sx={{ mr: 0.5 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton color="inherit" onClick={toggleMode} sx={{ mr: 1 }}>
              {mode === 'dark' ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Tooltip>
          <Button variant="outlined" color="error" onClick={handleLogout}>Sign Out</Button>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box sx={{ bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider', py: 5, px: 3 }}>
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
          {error && <Typography color="error" mb={2}>{error}</Typography>}
          <Typography variant="overline" color="text.secondary" letterSpacing={2}>Total Balance</Typography>
          <Typography variant="h2" fontWeight="bold" color="secondary" lineHeight={1.1}>
            ${user ? fmt(user.balance) : '—'}
          </Typography>
          {user && (
            <Typography variant="body2" color="text.secondary" mt={1.5}>
              {user.email} · {user.phone}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>

        {/* Metric Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {metrics.map(m => (
            <Grid item xs={12} sm={4} key={m.label}>
              <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <Avatar sx={{ bgcolor: m.color, width: 32, height: 32 }}>{m.icon}</Avatar>
                    <Typography variant="caption" color="text.secondary" letterSpacing={0.5}>{m.label}</Typography>
                  </Box>
                  <Typography variant="h5" fontWeight="bold">${fmt(m.value)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Transactions + Chart */}
        <Grid container spacing={2} sx={{ mb: 3 }}>

          {/* All Transactions with Pagination */}
          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    All Transactions
                    {sortedTx.length > 0 && (
                      <Typography component="span" variant="caption" color="text.secondary" ml={1}>
                        ({sortedTx.length} total)
                      </Typography>
                    )}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  {sortedTx.length === 0 ? (
                    <Typography color="text.secondary" variant="body2">No transactions yet.</Typography>
                  ) : (
                    Array.from({ length: TX_PER_PAGE }).map((_, i) => {
                      const t = txVisible[i];
                      return (
                        <Box key={i} sx={{ opacity: t ? 1 : 0, pointerEvents: t ? 'auto' : 'none' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.2 }}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">{t?.counterpartEmail ?? ' '}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {t ? new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ' '}
                                {t ? ' · ' : ''}
                                {t ? new Date(t.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </Typography>
                            </Box>
                            <Chip
                              label={t ? `${t.amount > 0 ? '+' : '-'}$${fmt(Math.abs(t.amount))}` : ' '}
                              color={t && t.amount > 0 ? 'success' : 'error'}
                              size="small"
                              sx={{ visibility: t ? 'visible' : 'hidden' }}
                            />
                          </Box>
                          {i < TX_PER_PAGE - 1 && <Divider sx={{ borderColor: 'divider' }} />}
                        </Box>
                      );
                    })
                  )}
                </Box>
                {txPageCount > 1 && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Pagination
                      count={txPageCount}
                      page={txPage}
                      onChange={(_, p) => setTxPage(p)}
                      color="secondary"
                      size="small"
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Monthly Spending Bar Chart */}
          <Grid item xs={12} md={7}>
            <Card sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" mb={1}>Monthly Spending</Typography>
                <Typography variant="caption" color="text.secondary">Last 6 months</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 180, mt: 3, px: 1 }}>
                  {monthlyData.map((m, i) => {
                    const isCurrent = i === 5;
                    const barH = m.spent > 0 ? Math.max((m.spent / maxSpent) * 140, 6) : 4;
                    return (
                      <Box key={m.label} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                          {m.spent > 0 ? `$${m.spent >= 1000 ? `${(m.spent / 1000).toFixed(1)}k` : m.spent.toFixed(0)}` : ''}
                        </Typography>
                        <Box
                          sx={{
                            width: '100%',
                            height: barH,
                            bgcolor: isCurrent ? '#c0392b' : inactiveBar,
                            borderRadius: '4px 4px 0 0',
                            border: isCurrent ? '1px solid #e74c3c' : `1px solid ${inactiveBorder}`,
                            transition: 'height 0.4s ease',
                          }}
                        />
                        <Typography variant="caption" color={isCurrent ? 'secondary' : 'text.secondary'} fontWeight={isCurrent ? 'bold' : 'normal'}>
                          {m.label}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Actions */}
        <Typography variant="h6" mb={2}>Quick Actions</Typography>
        <Grid container spacing={2}>
          {quickActions.map(a => (
            <Grid item xs={6} sm={3} key={a.label}>
              <Card
                onClick={a.onClick}
                sx={{
                  bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
                  cursor: 'pointer', userSelect: 'none',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  '&:hover': { borderColor: 'secondary.main', bgcolor: 'action.hover' },
                  '&:active': { bgcolor: 'action.selected' },
                }}
              >
                <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, py: '20px !important' }}>
                  <Avatar sx={{ bgcolor: 'action.hover', color: 'secondary.main', width: 44, height: 44 }}>{a.icon}</Avatar>
                  <Typography variant="body2">{a.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

      </Box>

      <ChatPanel />

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
