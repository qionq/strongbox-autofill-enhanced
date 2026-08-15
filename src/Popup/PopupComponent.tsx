import * as React from 'react';
import { Alert, BottomNavigation, BottomNavigationAction, Box, CircularProgress, CssBaseline, Paper, Snackbar } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { DomainVerificationRounded, SettingsRounded, StorageRounded } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import CurrentTabCredentialsComponent from './CurrentTabCredentials';
import DatabasesListPopupComponent from './DatabasesListPopupComponent';
import NotRunningPopupComponent from './NotRunningPopupComponent';
import SettingsPopupComponent from './SettingsPopupComponent';
import { NativeAppApi } from '../Messaging/NativeAppApi';
import { useCustomStyle } from '../Contexts/CustomStyleContext';
import { SettingsStore } from '../Settings/SettingsStore';

enum Tabs {
  Credentials = 0,
  Databases,
  Settings
}

export type PopupToastSeverity = 'success' | 'error';

export default function PopupComponent() {
  const [t] = useTranslation('global');
  const { getCustomStyle } = useCustomStyle();
  const theme = createTheme(getCustomStyle());
  const [loading, setLoading] = React.useState(true);
  const [unlockedCount, setUnlockedCount] = React.useState(0);
  const [error, setError] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState(Tabs.Databases);
  const [toast, setToast] = React.useState<{
    message: string;
    severity: PopupToastSeverity;
  }>({
    message: '',
    severity: 'success'
  });

  React.useEffect(() => {
    const getCurrentStatus = async () => {
      const status = await NativeAppApi.getInstance().getStatus();

      if (status) {
        const unlocked = status.databases.filter(database => !database.locked && database.autoFillEnabled);
        setUnlockedCount(unlocked.length);
        setSelectedTab(unlocked.length === 0 ? Tabs.Databases : Tabs.Credentials);
      } else {
        setError(true);
      }

      setLoading(false);
    };

    void getCurrentStatus();
    void initScrollbars();
  }, []);

  async function initScrollbars() {
    const stored = await SettingsStore.getSettings();
    const existing = document.getElementById('hide-scrollbar-style');

    if (stored.showScrollbars) {
      existing?.remove();
      return;
    }

    if (!existing) {
      const styleElement = document.createElement('style');
      styleElement.textContent = 'div::-webkit-scrollbar { width: 0; display: none; } div { scrollbar-width: none; }';
      styleElement.id = 'hide-scrollbar-style';
      document.head.appendChild(styleElement);
    }
  }

  const showToast = (message: string, severity: PopupToastSeverity = 'success') => {
    setToast({ message, severity });
  };

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
          <CircularProgress size={20} />
        </Box>
      );
    }

    if (selectedTab === Tabs.Credentials) {
      return <CurrentTabCredentialsComponent initScrollbars={initScrollbars} showToast={showToast} />;
    }

    if (selectedTab === Tabs.Databases) {
      return error ? <NotRunningPopupComponent onRefresh={() => window.close()} /> : <DatabasesListPopupComponent showToast={showToast} />;
    }

    return <SettingsPopupComponent />;
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          width: 360,
          minWidth: 360,
          maxWidth: 360,
          height: 520,
          minHeight: 520,
          maxHeight: 520,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
          bgcolor: 'background.default',
          color: 'text.primary'
        }}
      >
        <Box sx={{ flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}>{renderContent()}</Box>

        <Snackbar
          open={Boolean(toast.message)}
          autoHideDuration={toast.severity === 'error' ? 3500 : 1200}
          onClose={(_event, reason) => {
            if (reason !== 'clickaway') setToast(previous => ({ ...previous, message: '' }));
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity={toast.severity} variant="filled" sx={{ width: '100%', py: 0.25 }}>
            {toast.message}
          </Alert>
        </Snackbar>

        <Paper
          elevation={0}
          square
          sx={{
            flex: '0 0 auto',
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'strongbox.sidebar',
            backdropFilter: 'blur(24px) saturate(170%)'
          }}
        >
          <BottomNavigation showLabels value={selectedTab} onChange={(_event, newValue) => setSelectedTab(newValue)} sx={{ height: 53 }}>
            {unlockedCount > 0 && !error && (
              <BottomNavigationAction
                value={Tabs.Credentials}
                label={t('current-tab-credentials.title')}
                icon={<DomainVerificationRounded sx={{ fontSize: 20 }} />}
              />
            )}
            <BottomNavigationAction value={Tabs.Databases} label={t('databases-list-popup-component.title')} icon={<StorageRounded sx={{ fontSize: 20 }} />} />
            <BottomNavigationAction value={Tabs.Settings} label={t('settings-popup-component.title')} icon={<SettingsRounded sx={{ fontSize: 20 }} />} />
          </BottomNavigation>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
