import * as React from 'react';
import {
  AddRounded,
  ArrowBackIosNewRounded,
  CloseRounded,
  KeyRounded,
  LockOpenRounded,
  SearchRounded,
  SendRounded,
} from '@mui/icons-material';
import { Box, Button, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import { GetIconResponse } from '../Messaging/Protocol/GetIconResponse';
import { GetStatusResponse } from '../Messaging/Protocol/GetStatusResponse';
import { SearchResponse } from '../Messaging/Protocol/SearchResponse';
import { SingleFieldFillHandler } from '../Messaging/Protocol/SingleFieldFillRequest';
import { UnlockResponse } from '../Messaging/Protocol/UnlockResponse';
import { LastKnownDatabasesItem } from '../Settings/Settings';
import { NativeAppApi } from '../Messaging/NativeAppApi';
import { useCustomStyle } from '../Contexts/CustomStyleContext';
import CredentialDetails from '../Shared/Components/CredentialDetails';
import SearchBar, { SearchMode } from '../Shared/Components/SearchBar';
import { InlineMenuCredentialItem } from './InlineMenuCredentialItem';
import { SettingsStore } from '../Settings/SettingsStore';

export interface InlineMiniFieldMenuProps {
  status: GetStatusResponse | null;
  url: string;
  inlineMenuTruncatedHeight: string | null;
  unlockedDatabaseAvailable: boolean;
  showCreateNew: boolean;
  credentials: AutoFillCredential[];
  getCredentials: (skip: number, take: number) => Promise<AutoFillCredential[]>;
  onCreateNewEntry: () => void;
  onUnlockDatabase: (databaseUuid: string) => Promise<UnlockResponse | null>;
  onFillWithCredential: (credential: AutoFillCredential) => Promise<void>;
  onFillSingleField: SingleFieldFillHandler;
  unlockableDatabases: LastKnownDatabasesItem[];
  onCopyUsername: (credential: AutoFillCredential) => void;
  onCopyPassword: (credential: AutoFillCredential) => void;
  onCopyTotp: (credential: AutoFillCredential) => void;
  onCopy: (text: string) => Promise<boolean>;
  onRedirectUrl: (url: string) => void;
  refreshInlineMenu: () => void;
  hideInlineMenusForAWhile: () => void;
  showLargeTextView: () => void;
  beforeOpenSubMenu: (showDetails: boolean, restoreIframeSize?: boolean) => void;
  notifyAction: (message: string) => void;
  searchCredentials: (query: string, skip: number, take: number) => Promise<SearchResponse | null>;
  getIcon: (databaseId: string, nodeId: string) => Promise<GetIconResponse | null>;
  resize: () => void;
  onDismiss: () => void;
}

export default function InlineMiniFieldMenu(props: InlineMiniFieldMenuProps) {
  const [t] = useTranslation('global');
  const { sizeHandler } = useCustomStyle();
  const pageSize = NativeAppApi.getInstance().credentialResultsPageSize;
  const [credentials, setCredentials] = React.useState<AutoFillCredential[]>(props.credentials);
  const [loading, setLoading] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSearch, setShowSearch] = React.useState(false);
  const [selectedCredential, setSelectedCredential] = React.useState<AutoFillCredential | null>(null);
  const [resultsCompleted, setResultsCompleted] = React.useState(props.credentials.length < pageSize);
  const [pendingUnlocks, setPendingUnlocks] = React.useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = React.useState('');
  const [hideCredentialDetails, setHideCredentialDetails] = React.useState(false);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const siteName = React.useMemo(() => {
    try {
      return new URL(props.url).hostname.replace(/^www\./, '');
    } catch (_error) {
      return '';
    }
  }, [props.url]);

  const multipleDatabases = React.useMemo(() => new Set(credentials.map(credential => credential.databaseId)).size > 1, [credentials]);

  React.useEffect(() => {
    requestAnimationFrame(() => props.resize());
  }, [credentials.length, loading, selectedCredential, showSearch, toastMessage]);

  React.useEffect(() => {
    void SettingsStore.getSettings().then(settings => setHideCredentialDetails(settings.hideCredentialDetailsOnInlineMenu));

    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const showToast = (message: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }

    setToastMessage(message);
    toastTimer.current = setTimeout(() => setToastMessage(''), 1400);
  };

  const bindSearchResults = async (searchText: string) => {
    const trimmed = searchText.trim();
    setLoading(true);
    setSearchQuery(trimmed);
    setSelectedCredential(null);

    if (!trimmed) {
      setSearching(false);
      setCredentials(props.credentials);
      setResultsCompleted(props.credentials.length < pageSize);
      setLoading(false);
      return;
    }

    setSearching(true);
    const response = await props.searchCredentials(trimmed, 0, pageSize);
    const results = response?.results ?? [];
    setCredentials(results);
    setResultsCompleted(results.length < pageSize);
    setLoading(false);
  };

  const getNext = async () => {
    const updated = searchQuery
      ? (await props.searchCredentials(searchQuery, credentials.length, pageSize))?.results ?? []
      : await props.getCredentials(credentials.length, pageSize);

    if (updated.length === 0) {
      setResultsCompleted(true);
      return;
    }

    setCredentials(previous => [...previous, ...updated]);
    setResultsCompleted(updated.length < pageSize);
  };

  const unlockDatabase = async (databaseUuid: string) => {
    setPendingUnlocks(previous => new Set(previous).add(databaseUuid));
    const response = await props.onUnlockDatabase(databaseUuid);

    if (response?.success) {
      props.refreshInlineMenu();
      return;
    }

    setPendingUnlocks(previous => {
      const next = new Set(previous);
      next.delete(databaseUuid);
      return next;
    });
  };

  const copyUsername = (credential: AutoFillCredential) => {
    props.onCopyUsername(credential);
    showToast(t('notification-toast.username-copied'));
  };

  const copyPassword = (credential: AutoFillCredential) => {
    props.onCopyPassword(credential);
    showToast(t('notification-toast.password-copied'));
  };

  const copyTotp = (credential: AutoFillCredential) => {
    props.onCopyTotp(credential);
    showToast(t('notification-toast.totp-copied'));
  };

  const detailsHeight = sizeHandler.getInlineDetailsHeight(props.inlineMenuTruncatedHeight);

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: sizeHandler.getInlineMenuWidth(),
        overflow: 'hidden',
        borderRadius: '15px',
        border: '1px solid',
        borderColor: theme => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.94)'),
        bgcolor: 'background.paper',
        backdropFilter: 'blur(28px) saturate(180%)',
        boxShadow: theme =>
          theme.palette.mode === 'dark'
            ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.28), 0 1px 2px rgba(0, 0, 0, 0.24), 0 14px 38px rgba(0, 0, 0, 0.48)'
            : 'inset 0 0 0 1px rgba(60, 60, 67, 0.10), 0 1px 2px rgba(60, 60, 67, 0.12), 0 12px 30px rgba(60, 60, 67, 0.17)',
      }}
    >
      <Box
        sx={{
          minHeight: 38,
          display: 'flex',
          alignItems: 'center',
          gap: 0.4,
          px: 0.6,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'strongbox.sidebar',
        }}
      >
        {selectedCredential ? (
          <IconButton size="small" aria-label={t('general.back')} onClick={() => setSelectedCredential(null)}>
            <ArrowBackIosNewRounded sx={{ fontSize: 15 }} />
          </IconButton>
        ) : (
          <Box
            sx={{
              width: 23,
              height: 23,
              display: 'grid',
              placeItems: 'center',
              borderRadius: '8px',
              color: 'primary.main',
              bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)'),
            }}
          >
            <KeyRounded sx={{ fontSize: 15 }} />
          </Box>
        )}

        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.73rem',
              fontWeight: 650,
              lineHeight: 1.2,
            }}
          >
            {selectedCredential?.title || t('general.passwords')}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.59rem',
              lineHeight: 1.15,
            }}
          >
            {selectedCredential?.username || siteName}
          </Typography>
        </Box>

        {selectedCredential ? (
          <IconButton size="small" color="primary" aria-label={t('general.autofill')} onClick={() => props.onFillWithCredential(selectedCredential)}>
            <SendRounded sx={{ fontSize: 17 }} />
          </IconButton>
        ) : (
          <>
            {props.unlockedDatabaseAvailable && (
              <IconButton size="small" color={showSearch ? 'primary' : 'default'} aria-label={t('general.search')} onClick={() => setShowSearch(value => !value)}>
                <SearchRounded sx={{ fontSize: 18 }} />
              </IconButton>
            )}
            {props.showCreateNew && (
              <IconButton size="small" aria-label={t('inline-mini-field-menu.create-new')} onClick={props.onCreateNewEntry}>
                <AddRounded sx={{ fontSize: 19 }} />
              </IconButton>
            )}
          </>
        )}

        <IconButton size="small" aria-label={t('general.close')} onClick={props.onDismiss}>
          <CloseRounded sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      {selectedCredential ? (
        <Box
          data-testid="credential-details-scroll"
          sx={{
            minHeight: 0,
            maxHeight: detailsHeight,
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            p: 0.45,
            scrollbarGutter: 'stable',
          }}
        >
          <CredentialDetails
            credential={selectedCredential}
            getStatus={async () => props.status}
            onCopyUsername={() => copyUsername(selectedCredential)}
            onCopyPassword={() => copyPassword(selectedCredential)}
            onCopyTotp={() => copyTotp(selectedCredential)}
            onCopy={async text => {
              const copied = await props.onCopy(text);
              if (copied) {
                showToast(t('notification-toast.custom-field-copied'));
              }
              return copied;
            }}
            onFillSingleField={props.onFillSingleField}
            onRedirectUrl={props.onRedirectUrl}
            notifyAction={showToast}
            showTitle={false}
            showModified={false}
            allowAutofillField={true}
          />
        </Box>
      ) : (
        <>
          {showSearch && (
            <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 0.35 }}>
              <SearchBar
                searchMode={SearchMode.InlineMenu}
                autofocus={true}
                setSearching={setSearching}
                setLoading={setLoading}
                handleSearchChange={bindSearchResults}
                onDismissButon={() => setShowSearch(false)}
              />
            </Box>
          )}

          <Box
            data-testid="credential-list-scroll"
            sx={{
              minHeight: credentials.length === 0 ? 72 : 0,
              maxHeight: sizeHandler.getInlineMenuHeight(props.inlineMenuTruncatedHeight),
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              py: 0.2,
              scrollbarGutter: 'stable',
            }}
          >
            {loading ? (
              <Box sx={{ minHeight: 72, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <CircularProgress size={16} />
                  <Typography color="text.secondary" sx={{ mt: 0.4, fontSize: '0.68rem' }}>
                    {searching ? t('general.searching') : t('general.loading')}
                  </Typography>
                </Box>
              </Box>
            ) : credentials.length > 0 ? (
              <>
                {credentials.map(credential => (
                  <InlineMenuCredentialItem
                    key={credential.uuid}
                    credential={credential}
                    onFill={value => props.onFillWithCredential(value)}
                    onShowDetails={hideCredentialDetails ? undefined : setSelectedCredential}
                    getIcon={props.getIcon}
                    showDatabaseName={multipleDatabases}
                  />
                ))}
                {!resultsCompleted && (
                  <Button fullWidth size="small" onClick={getNext} sx={{ my: 0.35, fontSize: '0.68rem' }}>
                    {t('general.load-more')}
                  </Button>
                )}
              </>
            ) : props.unlockableDatabases.length > 0 ? (
              <Box sx={{ p: 0.6 }}>
                <Typography color="text.secondary" sx={{ px: 0.6, pb: 0.45, fontSize: '0.68rem' }}>
                  {t('create-new-entry-dialog.please-unlock-your-database')}
                </Typography>
                {props.unlockableDatabases.map(database => (
                  <Button
                    key={database.uuid}
                    fullWidth
                    size="small"
                    startIcon={pendingUnlocks.has(database.uuid) ? <CircularProgress size={13} /> : <LockOpenRounded sx={{ fontSize: 16 }} />}
                    onClick={() => unlockDatabase(database.uuid)}
                    sx={{ justifyContent: 'flex-start', px: 0.8, mb: 0.3, overflow: 'hidden' }}
                  >
                    <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>{database.nickName}</Typography>
                  </Button>
                ))}
              </Box>
            ) : (
              <Box sx={{ minHeight: 72, display: 'grid', placeItems: 'center', px: 1.5, textAlign: 'center' }}>
                <Typography color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {props.unlockedDatabaseAvailable
                    ? t('inline-mini-field-menu.no-matching-entries-found')
                    : t('inline-mini-field-menu.no-autofill-enabled-databases')}
                </Typography>
              </Box>
            )}
          </Box>
        </>
      )}

      {toastMessage && (
        <Box
          role="status"
          sx={{
            position: 'absolute',
            left: 7,
            right: 7,
            bottom: 6,
            px: 1,
            py: 0.5,
            borderRadius: '10px',
            bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(58, 58, 60, 0.96)' : 'rgba(29, 29, 31, 0.9)'),
            color: 'common.white',
            textAlign: 'center',
            fontSize: '0.68rem',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.18)',
          }}
        >
          {toastMessage}
        </Box>
      )}
    </Paper>
  );
}
