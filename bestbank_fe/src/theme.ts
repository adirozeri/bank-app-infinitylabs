import { createTheme, Theme } from '@mui/material/styles';

export function buildTheme(mode: 'dark' | 'light'): Theme {
  return createTheme({
    palette: {
      mode,
      secondary: { main: '#c0392b' },
      background: {
        default: mode === 'dark' ? '#000000' : '#f4f4f4',
        paper:   mode === 'dark' ? '#111111' : '#ffffff',
      },
      text: {
        primary:   mode === 'dark' ? '#ffffff' : '#111111',
        secondary: mode === 'dark' ? '#aaaaaa' : '#666666',
      },
      divider: mode === 'dark' ? '#222222' : '#e0e0e0',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          containedSecondary: {
            backgroundColor: '#c0392b',
            '&:hover': { backgroundColor: '#a93226' },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: mode === 'dark' ? '#333333' : '#cccccc' },
              '&:hover fieldset': { borderColor: '#c0392b' },
            },
          },
        },
      },
    },
  });
}
