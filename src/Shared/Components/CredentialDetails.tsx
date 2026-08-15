import React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

import { AutoFillCredential } from '../../Messaging/Protocol/AutoFillCredential';
import { Badge, Box, Chip, CircularProgress, Button, TextField, Tooltip } from '@mui/material';
import { NativeAppApi } from '../../Messaging/NativeAppApi';
import { BackgroundManager } from '../../Background/BackgroundManager';

import StarIcon from '@mui/icons-material/Star';
import Countdown from './Countdown';
import { GetStatusResponse } from '../../Messaging/Protocol/GetStatusResponse';
import CustomMarkDown from './CustomMarkDown';
import { SingleFieldFillHandler } from '../../Messaging/Protocol/SingleFieldFillRequest';
import CustomTextBox from './CustomTextBox';
import ContentPasteGoIcon from '@mui/icons-material/ContentPasteGo';

interface Props {
  credential: AutoFillCredential;
  getStatus: () => Promise<GetStatusResponse | null>;
  onCopyUsername: (credential: AutoFillCredential, notifyAction?: boolean) => void;
  onCopyPassword: (credential: AutoFillCredential, notifyAction?: boolean) => void;
  onCopyTotp: (credential: AutoFillCredential, notifyAction?: boolean) => void;
  onFillSingleField: SingleFieldFillHandler;
  onCopy: (text: string) => Promise<boolean>;
  onRedirectUrl: (url: string) => void;
  notifyAction: (message: string, severity?: 'success' | 'error') => void;
  showTitle: boolean;
  showModified: boolean;
  allowAutofillField: boolean;
}

function CredentialDetails(props: Props) {
  const { credential, notifyAction } = props;
  const [icon, setIcon] = React.useState(credential.icon);
  const [loadingIcon, setLoadingIcon] = React.useState(true);
  const [t] = useTranslation('global');
  const [totp, setTotp] = React.useState(() => AutoFillCredential.getCurrentTotpCode(credential));
  const [markdownNotes, setMarkdownNotes] = React.useState(false);
  const customFields = AutoFillCredential.getCustomFields(credential);
  const hasTotp = credential.totp.trim().length > 0;

  React.useEffect(() => {
    const asyncFunc = async () => {
      getIcon();
      setTotp(AutoFillCredential.getCurrentTotpCode(credential));

      const status = await props.getStatus();

      if (status) {
        setMarkdownNotes(status.serverSettings.markdownNotes);
      }
    };

    asyncFunc();
  }, [credential]);

  const getIcon = async () => {
    if (!props.credential.icon) {
      const iconResponse = await NativeAppApi.getInstance().getIcon(credential.databaseId, credential.uuid);

      if (iconResponse) {
        setIcon(iconResponse.icon);
      }
    } else {
      setIcon(props.credential.icon);
    }

    setLoadingIcon(false);
  };

  const onCopyUsername = () => {
    props.onCopyUsername(credential, false);
    notifyAction(t('notification-toast.username-copied'));
  };

  const onCopyPassword = () => {
    props.onCopyPassword(credential, false);
    notifyAction(t('notification-toast.password-copied'));
  };

  const onCopyTotp = () => {
    props.onCopyTotp(credential, false);
    notifyAction(t('notification-toast.totp-copied'));
  };

  const onCopyUrl = async () => {
    const textCopied = await props.onCopy(credential.url);

    if (textCopied) {
      notifyAction(t('notification-toast.url-copied'));
    }
  };

  const onCopyCustomField = async (text: string) => {
    const textCopied = await props.onCopy(text);

    if (textCopied) {
      notifyAction(t('notification-toast.custom-field-copied'));
    }
  };

  const onRedirectUrl = (url?: string) => {
    props.onRedirectUrl(url || credential.url);
  };

  const autofill = async (): Promise<void> => {
    const tab = await BackgroundManager.getCurrentTab();
    const url = tab ? tab.url : undefined;
    const tabId = tab?.id;

    if (!url || !tabId) {
      return;
    }

    try {
      const delivered = await BackgroundManager.getInstance().fillWithCredential(tabId, credential);
      if (!delivered) {
        notifyAction(t('notification-toast.page-connection-unavailable'), 'error');
        return;
      }

      window.close();
    } catch (_error) {
      notifyAction(t('notification-toast.page-connection-unavailable'), 'error');
    }
  };

  return (
    <Card
      sx={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        boxShadow: 'none',
        p: props.showTitle ? 0.75 : 0.15,
        bgcolor: 'transparent'
      }}
    >
      {props.showTitle && (
        <CardHeader
          sx={{ p: 0.55, pb: 0.8 }}
          title={
            <Box
              display="flex"
              sx={{
                alignContent: 'center',
                alignItems: 'center'
              }}
            >
              <Box
                sx={{
                  flexGrow: 0,
                  flexShrink: 0,
                  alignContent: 'center',
                  justifyContent: 'center',
                  mt: 'auto',
                  mb: 'auto',
                  cursor: 'pointer'
                }}
                onClick={() => onRedirectUrl()}
              >
                {loadingIcon ? (
                  <Box display="block" sx={{ height: 32, width: 32, mr: '8px' }}>
                    <CircularProgress style={{ color: 'gray' }} size={20} />
                  </Box>
                ) : icon ? (
                  <Box
                    component="img"
                    display="block"
                    sx={{
                      height: 32,
                      width: 32,
                      borderRadius: '9px',
                      marginRight: '8px',
                      boxShadow: '0 0 0 1px rgba(128, 128, 128, 0.18)'
                    }}
                    alt="Icon"
                    src={icon}
                  />
                ) : (
                  <Box display="block" sx={{ height: 32, width: 32, mr: '8px' }}>
                    <Badge />
                  </Box>
                )}
              </Box>
              <Box
                sx={{
                  width: '100%',
                  pr: 1,
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => onRedirectUrl()}
              >
                <Typography variant="h6" sx={{ textAlign: 'left', fontSize: '0.94rem' }}>
                  {credential.title}
                </Typography>
                {credential.favourite && <StarIcon sx={{ color: '#FFCC00', ml: '5px', fontSize: 18 }} />}
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Tooltip title={t('current-tab-credentials.autofill')} placement="bottom" arrow>
                  <Button variant="contained" color="primary" onClick={autofill} sx={{ minWidth: 34, width: 34, height: 30, p: 0 }}>
                    <ContentPasteGoIcon fontSize="small" />
                  </Button>
                </Tooltip>
              </Box>
            </Box>
          }
        />
      )}

      <CardContent sx={{ width: '100%', minWidth: 0, p: 0, '&:last-child': { pb: 0 } }}>
        {credential.username && (
          <Box sx={{ width: '100%', minWidth: 0, alignItems: 'center', pt: 0.4 }}>
            <CustomTextBox
              title={t('create-new-entry-dialog.username')}
              value={credential.username}
              allowCopy={true}
              allowAutofill={props.allowAutofillField}
              onCopy={onCopyUsername}
              onAutofill={value => props.onFillSingleField({ text: value })}
            ></CustomTextBox>
          </Box>
        )}

        {credential.password && (
          <Box sx={{ width: '100%', minWidth: 0, alignItems: 'center', pt: 0.5 }}>
            <CustomTextBox
              title={t('create-new-entry-dialog.password')}
              value={credential.password}
              allowConceal={true}
              allowCopy={true}
              allowAutofill={props.allowAutofillField}
              onCopy={onCopyPassword}
              onAutofill={value => props.onFillSingleField({ text: value })}
            ></CustomTextBox>
          </Box>
        )}

        {hasTotp && (
          <>
            <Box
              sx={{
                width: '100%',
                minWidth: 0,
                display: 'flex',
                gap: 0.55,
                alignItems: 'center',
                pt: 0.5
              }}
            >
              <Box
                sx={{
                  width: 22,
                  height: 22,
                  flex: '0 0 22px',
                  display: 'grid',
                  placeItems: 'center'
                }}
              >
                <Countdown
                  seconds={30}
                  onLoop={() => {
                    setTotp(AutoFillCredential.getCurrentTotpCode(credential));
                  }}
                ></Countdown>
              </Box>
              <CustomTextBox
                title={t('create-new-entry-dialog.totp')}
                value={totp}
                allowCopy={Boolean(totp)}
                allowAutofill={props.allowAutofillField && Boolean(totp)}
                onCopy={onCopyTotp}
                onAutofill={value =>
                  props.onFillSingleField({
                    text: value.replace('-', String()),
                    oneTimeCode: true
                  })
                }
              ></CustomTextBox>
            </Box>
          </>
        )}

        {credential.url && (
          <Box
            sx={{
              width: '100%',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              pt: 0.5
            }}
          >
            <CustomTextBox
              title={t('create-new-entry-dialog.url')}
              value={credential.url}
              allowCopy={true}
              allowAutofill={props.allowAutofillField}
              allowRedirect={true}
              onCopy={onCopyUrl}
              onAutofill={value => props.onFillSingleField({ text: value })}
              onRedirect={onRedirectUrl}
            ></CustomTextBox>
          </Box>
        )}

        {customFields.length > 0 && (
          <Box sx={{ width: '100%', minWidth: 0, pt: 0.55 }}>
            <Typography
              color="text.secondary"
              sx={{
                px: 0.35,
                pb: 0.2,
                fontSize: '0.64rem',
                fontWeight: 650,
                letterSpacing: '0.01em'
              }}
            >
              {t('create-new-entry-dialog.custom-fields')}
            </Typography>
            {customFields.map(value => {
              return (
                <Box
                  key={value.key}
                  sx={{
                    width: '100%',
                    minWidth: 0,
                    alignItems: 'center',
                    pt: 0.35
                  }}
                >
                  <CustomTextBox
                    key={value.key}
                    title={value.key}
                    value={value.value}
                    allowConceal={value.concealable}
                    allowCopy={true}
                    allowAutofill={props.allowAutofillField}
                    onCopy={onCopyCustomField}
                    rememberOnAutofill={true}
                    onAutofill={text =>
                      props.onFillSingleField({
                        text,
                        customField: {
                          databaseId: credential.databaseId,
                          credentialUuid: credential.uuid,
                          fieldKey: value.key
                        }
                      })
                    }
                  ></CustomTextBox>
                </Box>
              );
            })}
          </Box>
        )}

        {credential.modified && props.showModified && (
          <Box sx={{ pt: 1.25, display: 'flex', alignItems: 'row' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ pt: 0, pl: 0.5, textAlign: 'left', fontFamily: 'inherit' }}>
              {t('create-new-entry-dialog.modified-date')}:
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ m: 0, pl: 0.5, textAlign: 'left', fontFamily: 'inherit' }}>
              {credential.modified}
            </Typography>
          </Box>
        )}

        {credential.tags.length > 0 && (
          <Box sx={{ pt: 1.25 }}>
            <Typography
              variant="subtitle2"
              sx={{
                pl: 0,
                textAlign: 'left',
                fontFamily: 'inherit'
              }}
            >
              {t('current-tab-credentials.tags')}
            </Typography>
            <Box sx={{ textAlign: 'left', py: 0.75 }}>
              {credential.tags.map((tag: string) => (
                <Chip key={tag} size="small" sx={{ mr: 0.5, mb: 0.5 }} label={tag} />
              ))}
            </Box>
          </Box>
        )}

        {credential.notes && !markdownNotes && (
          <Box sx={{ pt: 1.25 }}>
            <TextField
              sx={{ width: '100%' }}
              id="outlined-multiline-static"
              label={t('current-tab-credentials.notes')}
              multiline
              rows={4}
              defaultValue={credential.notes}
            />
          </Box>
        )}

        {credential.notes && markdownNotes && (
          <Box sx={{ pt: 1.25 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'row',
                justifyContent: 'space-between'
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  pt: 0,
                  pl: 0,
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {t('current-tab-credentials.notes')}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'left', p: 0, pt: 1 }}>
              <CustomMarkDown onRedirectUrl={onRedirectUrl} text={credential.notes} />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default CredentialDetails;
