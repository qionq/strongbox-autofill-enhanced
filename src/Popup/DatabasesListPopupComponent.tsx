import { Box, List, ListSubheader, Typography } from '@mui/material';
import React, { useState } from 'react';
import { NativeAppApi } from '../Messaging/NativeAppApi';
import { DatabaseSummary } from '../Messaging/Protocol/DatabaseSummary';
import DatabaseListItem from './DatabaseListItem';
import { useTranslation } from 'react-i18next';
import type { PopupToastSeverity } from './PopupComponent';

interface DatabasesListPopupComponentProps {
  showToast: (message: string, severity?: PopupToastSeverity) => void;
}

function DatabasesListPopupComponent({ showToast }: DatabasesListPopupComponentProps) {
  const [databases, setDatabases] = useState<DatabaseSummary[]>();
  const [loading, setLoading] = useState<boolean>(true);
  const [t] = useTranslation('global');

  React.useEffect(() => {
    async function getCurrentStatus() {
      const status = await NativeAppApi.getInstance().getStatus();
      if (status != null) {
        setDatabases(status.databases);
      } else {
        setDatabases([]);
      }

      setLoading(false);
    }

    getCurrentStatus().catch(() => {
      setDatabases([]);
      setLoading(false);
    });
  }, []);

  return (
    <List
      subheader={
        <ListSubheader component="div" id="nested-list-subheader" sx={{ textAlign: 'center' }}>
          {t('databases-list-popup-component.title')}
        </ListSubheader>
      }
      sx={{
        width: 360,
        maxWidth: 360,
        height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        overflowX: 'hidden',
        mt: 0,
        pt: 0,
        pb: 0.5
      }}
    >
      {!loading && databases != undefined ? (
        databases.length ? (
          databases.map(database => <DatabaseListItem database={database} showToast={showToast} key={database.uuid} />)
        ) : (
          <Box>
            <Box display="block">
              <Typography
                variant="body1"
                align="center"

                sx={{
                  textOverflow: 'ellipsis',
                  p: 0
                }}
              >
                {t('databases-list-popup-component.no-databases')}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{
                  textOverflow: 'ellipsis',
                  p: '5px'
                }}
              >
                {t('databases-list-popup-component.no-databases-message')}
              </Typography>
            </Box>
          </Box>
        )
      ) : (
        t('general.loading')
      )}
    </List>
  );
}

export default DatabasesListPopupComponent;
