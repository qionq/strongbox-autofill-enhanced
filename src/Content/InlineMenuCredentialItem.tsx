import * as React from 'react';
import { Badge, ChevronRightRounded, StarRounded } from '@mui/icons-material';
import { Box, CircularProgress, IconButton, MenuItem, Typography } from '@mui/material';
import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import { GetIconResponse } from '../Messaging/Protocol/GetIconResponse';
import { useTranslation } from 'react-i18next';

interface InlineMenuCredentialItemProps {
  credential: AutoFillCredential;
  onFill: (credential: AutoFillCredential) => void;
  onShowDetails?: (credential: AutoFillCredential) => void;
  getIcon: (databaseId: string, nodeId: string) => Promise<GetIconResponse | null>;
  showDatabaseName: boolean;
}

export function InlineMenuCredentialItem({
  credential,
  onFill,
  onShowDetails,
  getIcon,
  showDatabaseName,
}: InlineMenuCredentialItemProps): JSX.Element {
  const [icon, setIcon] = React.useState(credential.icon);
  const [loadingIcon, setLoadingIcon] = React.useState(!credential.icon);
  const [t] = useTranslation('global');

  React.useEffect(() => {
    let active = true;

    const loadIcon = async () => {
      if (!credential.icon) {
        const iconResponse = await getIcon(credential.databaseId, credential.uuid);
        if (active && iconResponse) {
          setIcon(iconResponse.icon);
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
  }, [credential.databaseId, credential.icon, credential.uuid, getIcon]);

  return (
    <MenuItem
      onClick={() => onFill(credential)}
      sx={{
        minHeight: 42,
        mx: 0.35,
        my: 0.12,
        px: 0.6,
        py: 0.32,
        borderRadius: '10px',
        gap: 0.7,
      }}
    >
      <Box
        sx={{
          width: 26,
          height: 26,
          flex: '0 0 auto',
          display: 'grid',
          placeItems: 'center',
          borderRadius: '8px',
          bgcolor: 'strongbox.field',
          boxShadow: 'inset 0 0 0 1px rgba(128, 128, 128, 0.14)',
          overflow: 'hidden',
          color: 'primary.main',
        }}
      >
        {loadingIcon ? (
          <CircularProgress size={14} />
        ) : icon ? (
          <Box component="img" src={icon} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Badge sx={{ fontSize: 18 }} />
        )}
      </Box>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
          <Typography
            sx={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '0.76rem',
              fontWeight: 620,
              lineHeight: 1.25,
            }}
          >
            {credential.title}
          </Typography>
          {credential.favourite && <StarRounded sx={{ flex: '0 0 auto', color: '#FFCC00', fontSize: 13 }} />}
        </Box>
        <Typography
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.64rem',
            lineHeight: 1.3,
          }}
        >
          {[credential.username, showDatabaseName ? credential.databaseName : ''].filter(Boolean).join(' · ') || '—'}
        </Typography>
      </Box>

      {onShowDetails && (
        <IconButton
          size="small"
          aria-label={t('inline-menu-credential-item.view-details')}
          onClick={event => {
            event.stopPropagation();
            event.preventDefault();
            onShowDetails(credential);
          }}
          sx={{ flex: '0 0 auto', color: 'text.secondary', p: 0.25 }}
        >
          <ChevronRightRounded sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </MenuItem>
  );
}
