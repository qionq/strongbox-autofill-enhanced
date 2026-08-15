import { Box, Button, Checkbox, Divider, FormControlLabel, FormGroup, List, ListItem, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Settings } from '../Settings/Settings';
import { SettingsStore } from '../Settings/SettingsStore';
import { useTranslation } from 'react-i18next';
import { BackgroundManager } from '../Background/BackgroundManager';
import { CustomFieldMappingStore } from '../Content/CustomFieldMappingStore';

interface Props {
  value: number;
  index: number;
}

function SettingsPopupFillTabPanel(props: Props) {
  const { value, index } = props;

  const [t] = useTranslation('global');

  const [settings, setSettings] = useState<Settings>(new Settings());
  const [currentUrl, setCurrentUrl] = useState<string | undefined>('Loading...');
  const [customFieldMappingCount, setCustomFieldMappingCount] = useState(0);

  useEffect(() => {
    getStoredSettings();
  }, []);

  async function getStoredSettings() {
    const stored = await SettingsStore.getSettings();
    const tab = await BackgroundManager.getCurrentTab();
    const url = tab ? tab.url : undefined;
    const mappingCount = await CustomFieldMappingStore.count();
    setCurrentUrl(url);
    setSettings(stored);
    setCustomFieldMappingCount(mappingCount);
  }

  const toggleAutoFillImmediatelyIfOnlyASingleMatch = async () => {
    const stored = await SettingsStore.getSettings();
    stored.autoFillImmediatelyIfOnlyASingleMatch = !stored.autoFillImmediatelyIfOnlyASingleMatch;

    SettingsStore.setSettings(stored);

    const stored2 = await SettingsStore.getSettings();
    setSettings(stored2);
  };

  const toggleAutoFillImmediatelyWithFirstMatch = async () => {
    const stored = await SettingsStore.getSettings();
    stored.autoFillImmediatelyWithFirstMatch = !stored.autoFillImmediatelyWithFirstMatch;

    SettingsStore.setSettings(stored);

    const stored2 = await SettingsStore.getSettings();
    setSettings(stored2);
  };

  const prepUrlForDoNotRunList = (url: string) => {
    return Settings.prepUrlForDoNotRunList(url);
  };

  const isUrlInDoNotFillList = (url: string) => {
    return Settings.isUrlInDoNotFillList(settings, url);
  };

  const toggleDomainToDoNotFillList = async () => {
    const url = currentUrl ?? '';

    if (isUrlInDoNotFillList(url)) {
      await removeThisDomainToDoNotFillList(url);
    } else {
      await addThisDomainToDoNotFillList(url);
    }
  };

  const removeThisDomainToDoNotFillList = async (url: string) => {
    const stored = await SettingsStore.getSettings();

    if (!stored.doNotFillOnDomains) {
      stored.doNotFillOnDomains = [];
    } else {
      const prepped = prepUrlForDoNotRunList(url);
      const index = stored.doNotFillOnDomains.indexOf(prepped, 0);
      if (index > -1) {
        
        stored.doNotFillOnDomains.splice(index, 1);
      }

      
    }

    SettingsStore.setSettings(stored);

    const stored2 = await SettingsStore.getSettings();
    setSettings(stored2);
  };

  const addThisDomainToDoNotFillList = async (url: string) => {
    const stored = await SettingsStore.getSettings();

    if (!stored.doNotFillOnDomains) {
      stored.doNotFillOnDomains = [];
    }

    stored.doNotFillOnDomains.push(prepUrlForDoNotRunList(url));

    

    const uniqueItems = [...new Set(stored.doNotFillOnDomains)];
    stored.doNotFillOnDomains = uniqueItems;


    SettingsStore.setSettings(stored);

    const stored2 = await SettingsStore.getSettings();
    setSettings(stored2);
  };

  const clearCustomFieldMappings = async () => {
    await CustomFieldMappingStore.clearAll();
    setCustomFieldMappingCount(0);
  };

  return (
    <TabPanel value={value} index={index}>
      <Box sx={{ width: '100%', minHeight: 350, overflowWrap: 'anywhere' }}>
        <List sx={{ width: '100%', pt: 0 }}>
          <FormGroup>
            <ListItem sx={{ p: '2px' }}>
              <FormControlLabel
                control={<Checkbox checked={settings.autoFillImmediatelyIfOnlyASingleMatch} onChange={toggleAutoFillImmediatelyIfOnlyASingleMatch} />}
                label={t('settings-popup-component.fill-on-load-if-only-single-match-found')}
              />
            </ListItem>
            <ListItem sx={{ p: '2px' }}>
              <FormControlLabel
                control={<Checkbox checked={settings.autoFillImmediatelyWithFirstMatch} onChange={toggleAutoFillImmediatelyWithFirstMatch} />}
                label={t('settings-popup-component.always-fill-on-load-with-first-match')}
              />
            </ListItem>
            <ListItem sx={{ p: '2px' }}>
              <FormControlLabel
                control={<Checkbox disabled={!currentUrl} checked={isUrlInDoNotFillList(currentUrl ?? '')} onChange={toggleDomainToDoNotFillList} />}
                label={`${t('settings-popup-component.do-not-fill-on-load-on-this-domain')} (${prepUrlForDoNotRunList(currentUrl ?? '')})`}
              />
            </ListItem>
          </FormGroup>
          <Divider sx={{ my: 1 }} />
          <ListItem sx={{ px: 1, py: 1.25 }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle2">
                {t('settings-popup-component.remembered-custom-fields', { defaultValue: 'Remembered custom fields' })}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.35, mb: 1 }}>
                {t('settings-popup-component.remembered-custom-fields-description', {
                  defaultValue: 'Only website-to-field links are stored locally. Secret values stay in Strongbox.',
                })}
              </Typography>
              <Button variant="outlined" size="small" disabled={customFieldMappingCount === 0} onClick={clearCustomFieldMappings}>
                {t('settings-popup-component.forget-remembered-custom-fields', {
                  defaultValue: `Forget remembered fields (${customFieldMappingCount})`,
                  count: customFieldMappingCount,
                })}
              </Button>
            </Box>
          </ListItem>
        </List>
      </Box>
    </TabPanel>
  );
}

function TabPanel(props: { children?: React.ReactNode; index: number; value: number }) {
  const { children, value, index, ...other } = props;

  return (
    <div role="tabpanel" hidden={value !== index} id={`vertical-tabpanel-${index}`} aria-labelledby={`vertical-tab-${index}`} {...other}>
      {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
    </div>
  );
}

export default SettingsPopupFillTabPanel;
