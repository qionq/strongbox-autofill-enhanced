import * as React from 'react';
import browser from 'webextension-polyfill';
import { AddRounded, ArrowBackIosNewRounded, KeyRounded, SendRounded } from '@mui/icons-material';
import { Box, Button, CircularProgress, IconButton, List, ListSubheader, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NativeAppApi } from '../Messaging/NativeAppApi';
import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import CredentialsListItem from './CredentialsListItem';
import NoResultsFoundPopupComponent from './NoResultsFoundPopupComponent';
import { BackgroundManager } from '../Background/BackgroundManager';
import SearchBar, { SearchMode } from '../Shared/Components/SearchBar';
import CredentialDetails from '../Shared/Components/CredentialDetails';
import { WellKnownField } from '../Messaging/Protocol/WellKnownField';
import { SettingsStore } from '../Settings/SettingsStore';
import { Settings } from '../Settings/Settings';
import type { PopupToastSeverity } from './PopupComponent';

interface CurrentTabCredentialsComponentProps {
  showToast: (message: string, severity?: PopupToastSeverity) => void;
  initScrollbars: () => void;
}

function CurrentTabCredentialsComponent({ showToast, initScrollbars }: CurrentTabCredentialsComponentProps) {
  const nativeAppApi = NativeAppApi.getInstance();
  const pageSize = nativeAppApi.credentialResultsPageSize;
  const [loading, setLoading] = React.useState(true);
  const [credentials, setCredentials] = React.useState<AutoFillCredential[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [resultsCompleted, setResultsCompleted] = React.useState(true);
  const [selectedCredential, setSelectedCredential] = React.useState<AutoFillCredential | null>(null);
  const [settings, setSettings] = React.useState<Settings>(new Settings());
  const [t] = useTranslation('global');

  React.useEffect(() => {
    const initialize = async () => {
      setSettings(await SettingsStore.getSettings());
      await bindSearchOrUrlResults();
      await initScrollbars();
    };

    void initialize();
  }, []);

  const search = async (query: string, skip = 0): Promise<AutoFillCredential[]> => {
    const response = await nativeAppApi.search(query, skip, pageSize);
    return response?.results ?? [];
  };

  const getCredentialsForCurrentUrl = async (skip = 0): Promise<AutoFillCredential[]> => {
    const tab = await BackgroundManager.getCurrentTab();
    if (!tab?.url || !tab.id) return [];

    const response = await nativeAppApi.credentialsForUrlIncludingPasswordless(tab.url, skip, pageSize);
    return response?.results ?? [];
  };

  async function bindSearchOrUrlResults(searchText = '') {
    const trimmed = searchText.trim();
    setLoading(true);
    setSearchQuery(trimmed);
    setSelectedCredential(null);
    setSearching(Boolean(trimmed));

    const results = trimmed ? await search(trimmed) : await getCredentialsForCurrentUrl();
    setCredentials(results);
    setResultsCompleted(results.length < pageSize);
    setLoading(false);
  }

  const getNext = async () => {
    const updated = searchQuery ? await search(searchQuery, credentials.length) : await getCredentialsForCurrentUrl(credentials.length);

    if (updated.length === 0) {
      setResultsCompleted(true);
      return;
    }

    setCredentials(previous => [...previous, ...updated]);
    setResultsCompleted(updated.length < pageSize);
  };

  const handleCreateNewEntry = async () => {
    const tab = await BackgroundManager.getCurrentTab();
    if (!tab?.url || !tab.id) return;

    try {
      const delivered = await BackgroundManager.getInstance().openCreateNewDialog(tab.id);
      if (!delivered) {
        showToast(t('notification-toast.page-connection-unavailable'), 'error');
        return;
      }

      window.close();
    } catch (_error) {
      showToast(t('notification-toast.page-connection-unavailable'), 'error');
    }
  };

  const fillWithCredential = async (credential: AutoFillCredential) => {
    const tab = await BackgroundManager.getCurrentTab();
    if (!tab?.url || !tab.id) return;

    try {
      const delivered = await BackgroundManager.getInstance().fillWithCredential(tab.id, credential);
      if (!delivered) {
        showToast(t('notification-toast.page-connection-unavailable'), 'error');
        return;
      }

      window.close();
    } catch (_error) {
      showToast(t('notification-toast.page-connection-unavailable'), 'error');
    }
  };

  const onCopyUsername = (credential: AutoFillCredential, notifyAction = true) => {
    void nativeAppApi.copyField(credential.databaseId, credential.uuid, WellKnownField.username);
    if (notifyAction) showToast(t('notification-toast.username-copied'));
  };

  const onCopyPassword = (credential: AutoFillCredential, notifyAction = true) => {
    void nativeAppApi.copyField(credential.databaseId, credential.uuid, WellKnownField.password);
    if (notifyAction) showToast(t('notification-toast.password-copied'));
  };

  const onCopyTotp = (credential: AutoFillCredential, notifyAction = true) => {
    void nativeAppApi.copyField(credential.databaseId, credential.uuid, WellKnownField.totp, true);
    if (notifyAction) showToast(t('notification-toast.totp-copied'));
  };

  const onCopy = async (value: string) => {
    const response = await nativeAppApi.copyString(value);
    return response?.success ?? false;
  };

  const onRedirectUrl = async (newUrl: string) => {
    await browser.tabs.create({ url: newUrl });
  };

  const groupedCredentials = React.useMemo(() => {
    const groups = new Map<string, AutoFillCredential[]>();
    credentials.forEach(credential => {
      const groupName = credential.databaseName || t('databases-list-popup-component.title');
      groups.set(groupName, [...(groups.get(groupName) ?? []), credential]);
    });
    return groups;
  }, [credentials, t]);

  const showDatabaseName = groupedCredentials.size > 1;

  if (selectedCredential) {
    return (
      <Box
        sx={{
          width: 360,
          maxWidth: 360,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            gap: 0.55,
            px: 0.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'strongbox.sidebar'
          }}
        >
          <IconButton size="small" aria-label={t('general.back')} onClick={() => setSelectedCredential(null)}>
            <ArrowBackIosNewRounded sx={{ fontSize: 16 }} />
          </IconButton>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.84rem',
                fontWeight: 650
              }}
            >
              {selectedCredential.title}
            </Typography>
            <Typography
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '0.67rem'
              }}
            >
              {selectedCredential.username}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<SendRounded sx={{ fontSize: 15 }} />}
            onClick={() => fillWithCredential(selectedCredential)}
            sx={{ minWidth: 0, px: 1 }}
          >
            {t('general.autofill')}
          </Button>
        </Box>

        <Box
          data-testid="popup-credential-details-scroll"
          sx={{
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            overscrollBehavior: 'contain',
            scrollbarGutter: 'stable',
            p: 0.75
          }}
        >
          <CredentialDetails
            getStatus={() => nativeAppApi.getStatus()}
            onCopyUsername={onCopyUsername}
            onCopyPassword={onCopyPassword}
            onCopyTotp={onCopyTotp}
            onCopy={onCopy}
            onRedirectUrl={onRedirectUrl}
            notifyAction={showToast}
            credential={selectedCredential}
            showTitle={false}
            showModified={true}
            allowAutofillField={false}
            onFillSingleField={() => undefined}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 360,
        maxWidth: 360,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Box
        sx={{
          minHeight: 50,
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          px: 0.5,
          py: 0.55,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'strongbox.sidebar'
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            color: 'primary.main'
          }}
        >
          <KeyRounded sx={{ fontSize: 20 }} />
        </Box>
        <SearchBar
          searchMode={SearchMode.Popup}
          autofocus={true}
          setSearching={setSearching}
          setLoading={setLoading}
          handleSearchChange={bindSearchOrUrlResults}
        />
        <IconButton size="small" aria-label={t('inline-mini-field-menu.create-new')} onClick={handleCreateNewEntry}>
          <AddRounded sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      <List
        disablePadding
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          overscrollBehavior: 'contain',
          scrollbarGutter: 'stable',
          py: 0.35
        }}
      >
        {loading ? (
          <Box sx={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress size={18} />
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: '0.7rem' }}>
                {searching ? t('general.searching') : t('general.loading')}
              </Typography>
            </Box>
          </Box>
        ) : credentials.length === 0 ? (
          <NoResultsFoundPopupComponent />
        ) : (
          <>
            {Array.from(groupedCredentials.entries()).map(([groupName, values]) => (
              <Box key={groupName}>
                {showDatabaseName && (
                  <ListSubheader
                    disableSticky
                    sx={{
                      lineHeight: '24px',
                      px: 1.25,
                      fontSize: '0.65rem',
                      color: 'text.secondary',
                      bgcolor: 'transparent'
                    }}
                  >
                    {groupName}
                  </ListSubheader>
                )}
                {values.map(credential => (
                  <CredentialsListItem
                    key={credential.uuid}
                    credential={credential}
                    onFill={fillWithCredential}
                    onDetails={settings.hideCredentialDetailsOnPopup ? undefined : setSelectedCredential}
                    showDatabaseName={false}
                  />
                ))}
              </Box>
            ))}
            {!resultsCompleted && (
              <Button fullWidth size="small" onClick={getNext} sx={{ my: 0.5, fontSize: '0.7rem' }}>
                {t('general.load-more')}
              </Button>
            )}
          </>
        )}
      </List>
    </Box>
  );
}

export default CurrentTabCredentialsComponent;
