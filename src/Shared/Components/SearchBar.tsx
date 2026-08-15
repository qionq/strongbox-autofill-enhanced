import * as React from 'react';
import debounce from 'lodash.debounce';
import { CloseRounded, SearchRounded } from '@mui/icons-material';
import { Box, IconButton, InputBase } from '@mui/material';
import { useTranslation } from 'react-i18next';

export enum SearchMode {
  Popup,
  InlineMenu,
}

interface SearchBarProps {
  handleSearchChange: (searchText: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setSearching: (loading: boolean) => void;
  autofocus: boolean;
  searchMode: SearchMode;
  onDismissButon?: (text: string) => void;
}

export default function SearchBar(props: SearchBarProps) {
  const [searchText, setSearchText] = React.useState('');
  const [t] = useTranslation('global');
  const searchHandler = React.useRef(props.handleSearchChange);
  searchHandler.current = props.handleSearchChange;
  const debouncedSearch = React.useMemo(
    () =>
      debounce((text: string) => {
        void searchHandler.current(text);
      }, 250),
    []
  );

  React.useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  const searchChange = (text: string) => {
    setSearchText(text);
    props.setLoading(true);
    props.setSearching(Boolean(text.trim()));
    debouncedSearch(text);
  };

  const handleDismissClick = () => {
    if (searchText) {
      searchChange('');
      return;
    }

    props.onDismissButon?.('');
  };

  return (
    <Box
      sx={{
        minWidth: 0,
        flexGrow: 1,
        height: props.searchMode === SearchMode.Popup ? 32 : 34,
        display: 'flex',
        alignItems: 'center',
        gap: 0.35,
        px: 0.7,
        borderRadius: 2.1,
        bgcolor: 'strongbox.field',
        boxShadow: 'inset 0 0 0 1px rgba(128, 128, 128, 0.12)',
      }}
    >
      <SearchRounded sx={{ flex: '0 0 auto', fontSize: 17, color: 'text.secondary' }} />
      <InputBase
        placeholder={t('search-bar.place-holder')}
        inputProps={{ 'aria-label': t('general.search') }}
        onChange={event => searchChange(event.target.value)}
        value={searchText}
        autoFocus={props.autofocus}
        sx={{
          minWidth: 0,
          flexGrow: 1,
          fontSize: '0.75rem',
          '& input': { py: 0.25 },
        }}
      />
      {(searchText || props.searchMode === SearchMode.InlineMenu) && (
        <IconButton size="small" aria-label={t('general.close')} onClick={handleDismissClick} sx={{ p: 0.2, color: 'text.secondary' }}>
          <CloseRounded sx={{ fontSize: 15 }} />
        </IconButton>
      )}
    </Box>
  );
}
