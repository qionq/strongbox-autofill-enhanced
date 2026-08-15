import { Typography, Box, Stack, Paper } from '@mui/material';
import React from 'react';
import { Search } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

function NoResultsFoundPopupComponent() {
  const [t] = useTranslation('global');

  return (
    <Paper elevation={0} sx={{ bgcolor: 'transparent' }}>
      <Stack direction="column" justifyContent="center" alignItems="center" spacing={0.5} sx={{ minHeight: 120, px: 2 }}>
        <Box display="block">
          <Search
            color="disabled"
            sx={{
              fontSize: 34,
            }}
          />
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            align="center"
            sx={{
              textOverflow: 'ellipsis',
              p: 0,
            }}
          >
            {t('no-results-found-popup-component.title')}
          </Typography>
        </Box>
        <Box>
          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            sx={{
              textOverflow: 'ellipsis',
              p: 0.5,
            }}
          >
            {t('no-results-found-popup-component.message')}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default NoResultsFoundPopupComponent;
