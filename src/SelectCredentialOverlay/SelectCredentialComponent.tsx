import * as React from 'react';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import { ListSubheader } from '@mui/material';
import NoResultsFoundPopupComponent from '../Popup/NoResultsFoundPopupComponent';
import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import CredentialsListItem from '../Popup/CredentialsListItem';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import CssBaseline from '@mui/material/CssBaseline';


import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

export interface SimpleDialogProps {
  open: boolean;
  groupedCredentials: Map<string, AutoFillCredential[]>;
  selectedValue: string;
  onClose: (value: string) => void;
  fillCredential: (credential: AutoFillCredential) => void;
}

function SimpleDialog(props: SimpleDialogProps) {
  const { onClose, groupedCredentials, selectedValue, open, fillCredential } = props;

  const handleClose = () => {
    onClose(selectedValue);
  };

  async function handleListItemClick(credential: AutoFillCredential): Promise<void> {
    fillCredential(credential);
    onClose('email');
  }
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Dialog onClose={handleClose} open={open}>
        <DialogTitle>Select Credential</DialogTitle>

        <List sx={{ minwidth: '400px', maxWidth: '400px', overflow: 'hidden', scrollbarWidth: 'none', mt: 0, pt: 0 }}>
          {groupedCredentials.size == 0 ? (
            <NoResultsFoundPopupComponent />
          ) : (
            <div>
              {[...groupedCredentials.keys()].map(databaseName => (
                <div>
                  <ListSubheader key={databaseName} sx={{ lineHeight: '20px' }}>
                    {databaseName}
                  </ListSubheader>
                  {(groupedCredentials.get(databaseName) || []).map(credential => (
                    <ListItem sx={{ mb: '3px', mt: '3px' }} disableGutters disablePadding button key={credential.uuid} onClick={() => handleListItemClick(credential)}>
                      <CredentialsListItem
                        credential={credential}
                        onFill={handleListItemClick}
                        showDatabaseName={false}
                      />
                    </ListItem>
                  ))}
                </div>
              ))}
            </div>
          )}
        </List>

      </Dialog>
    </ThemeProvider>
  );
}

export interface SelectCredentialComponentProps {
  groupedCredentials: Map<string, AutoFillCredential[]>;
  fillCredential: (credential: AutoFillCredential) => void;
}

export default function SelectCredentialComponent(props: SelectCredentialComponentProps) {
  const [open, setOpen] = React.useState(true);
  const [selectedValue, setSelectedValue] = React.useState('');

  const handleClose = (value: string) => {
    setOpen(false);
    setSelectedValue(value);
  };

  return (
    <div>
      <SimpleDialog selectedValue={selectedValue} open={open} onClose={handleClose} groupedCredentials={props.groupedCredentials} fillCredential={props.fillCredential} />
    </div>
  );
}
