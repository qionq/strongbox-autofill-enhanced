import * as React from 'react';
import { Badge, ChevronRightRounded, StarRounded } from '@mui/icons-material';
import { Box, CircularProgress, IconButton, ListItemButton, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import { NativeAppApi } from '../Messaging/NativeAppApi';

interface CredentialListItemProps {
  credential: AutoFillCredential;
  onFill: (credential: AutoFillCredential) => void;
  onDetails?: (credential: AutoFillCredential) => void;
  showDatabaseName: boolean;
}

export default function CredentialsListItem({ credential, onFill, onDetails, showDatabaseName }: CredentialListItemProps) {
  const [icon, setIcon] = React.useState(credential.icon);
  const [loadingIcon, setLoadingIcon] = React.useState(!credential.icon);
  const [t] = useTranslation('global');

  React.useEffect(() => {
    let active = true;

    const loadIcon = async () => {
      if (!credential.icon) {
        const response = await NativeAppApi.getInstance().getIcon(credential.databaseId, credential.uuid);
        if (active && response) {
          setIcon(response.icon);
        }
      }

      if (active) {
        setLoadingIcon(false);
      }
    };

    void loadIcon();
    return () => {
      active = false;
    };
  }, [credential.databaseId, credential.icon, credential.uuid]);

  return (
    <ListItemButton
      onClick={() => onFill(credential)}
      sx={{
        minHeight: 52,
        mx: 0.75,
        my: 0.25,
        px: 0.8,
        py: 0.5,
        borderRadius: 2.25,
        gap: 0.9,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          borderRadius: 1.9,
          bgcolor: 'strongbox.field',
          boxShadow: 'inset 0 0 0 1px rgba(128, 128, 128, 0.14)',
          color: 'primary.main',
        }}
      >
        {loadingIcon ? (
          <CircularProgress size={15} />
        ) : icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Badge sx={{ fontSize: 19 }} />
        )}
      </Box>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
          <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', fontWeight: 620 }}>
            {credential.title}
          </Typography>
          {credential.favourite && <StarRounded sx={{ flex: '0 0 auto', color: '#FFCC00', fontSize: 14 }} />}
        </Box>
        <Typography
          color="text.secondary"
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.69rem' }}
        >
          {[credential.username, showDatabaseName ? credential.databaseName : ''].filter(Boolean).join(' · ') || '—'}
        </Typography>
      </Box>

      {onDetails && (
        <IconButton
          size="small"
          aria-label={t('inline-menu-credential-item.view-details')}
          onClick={event => {
            event.stopPropagation();
            event.preventDefault();
            onDetails(credential);
          }}
          sx={{ p: 0.35, color: 'text.secondary' }}
        >
          <ChevronRightRounded sx={{ fontSize: 19 }} />
        </IconButton>
      )}
    </ListItemButton>
  );
}
