import * as React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Divider,
  Link,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckBoxOutlineBlankRoundedIcon from '@mui/icons-material/CheckBoxOutlineBlankRounded';
import CheckBoxRoundedIcon from '@mui/icons-material/CheckBoxRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import KeyboardRoundedIcon from '@mui/icons-material/KeyboardRounded';
import { Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import browser from 'webextension-polyfill';
import { BackgroundManager } from '../Background/BackgroundManager';
import { LightOrDarkAppearance, useCustomStyle } from '../Contexts/CustomStyleContext';
import { CustomFieldMappingStore } from '../Content/CustomFieldMappingStore';
import { languages } from '../Localization/config';
import { resolveSupportedLanguage } from '../Localization/LanguageSelection';
import { Settings } from '../Settings/Settings';
import { SettingsStore } from '../Settings/SettingsStore';

type SettingsListKey = 'doNotFillOnDomains' | 'doNotShowInlineMenusOnDomains' | 'doNotShowInlineMenusOnPages';

interface SettingsSectionProps {
  title: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}

interface SettingsCheckboxRowProps {
  title: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const sectionCardStyle = {
  overflow: 'hidden',
  border: '1px solid',
  borderColor: (theme: Theme) =>
    theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.92)',
  borderRadius: '13px',
  bgcolor: (theme: Theme) =>
    theme.palette.mode === 'dark' ? 'rgba(44, 44, 46, 0.82)' : 'rgba(118, 118, 128, 0.065)',
  boxShadow: (theme: Theme) =>
    theme.palette.mode === 'dark'
      ? 'inset 0 1px 0 rgba(255, 255, 255, 0.055), 0 1px 3px rgba(0, 0, 0, 0.16)'
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.82), 0 1px 2px rgba(60, 60, 67, 0.045)',
};

function SettingsSection({ title, accessory, children }: SettingsSectionProps) {
  return (
    <Box sx={{ mb: 1.35 }}>
      <Box sx={{ minHeight: 20, px: 0.55, pb: 0.35, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ flex: '0 0 auto', fontSize: '0.67rem', fontWeight: 720, letterSpacing: '0.01em' }}>
          {title}
        </Typography>
        {accessory && (
          <Typography
            color="text.secondary"
            sx={{ ml: 'auto', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.62rem' }}
          >
            {accessory}
          </Typography>
        )}
      </Box>
      <Box sx={sectionCardStyle}>{children}</Box>
    </Box>
  );
}

function SettingsCheckboxRow({ title, description, checked, disabled = false, onChange }: SettingsCheckboxRowProps) {
  return (
    <Box
      component="label"
      sx={{
        minHeight: 46,
        px: 1,
        py: 0.65,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.55,
        opacity: disabled ? 0.48 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <Checkbox
        size="small"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
        icon={<CheckBoxOutlineBlankRoundedIcon />}
        checkedIcon={<CheckBoxRoundedIcon />}
        inputProps={{ 'aria-label': title }}
        sx={{
          flex: '0 0 auto',
          mt: -0.05,
          p: 0.15,
          color: 'text.disabled',
          '&.Mui-checked': { color: 'primary.main' },
          '& .MuiSvgIcon-root': { fontSize: 19 },
        }}
      />
      <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Typography sx={{ fontSize: '0.76rem', fontWeight: 590, lineHeight: 1.25 }}>{title}</Typography>
        {description && (
          <Typography color="text.secondary" sx={{ mt: 0.2, fontSize: '0.62rem', lineHeight: 1.3 }}>
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function RowDivider() {
  return <Divider sx={{ ml: 1.15 }} />;
}

export default function SettingsPopupComponent() {
  const [t, i18n] = useTranslation('global');
  const { toggleDarkMode, switchToSystemMode } = useCustomStyle();
  const [settings, setSettings] = React.useState<Settings>(new Settings());
  const [currentUrl, setCurrentUrl] = React.useState<string>();
  const [customFieldMappingCount, setCustomFieldMappingCount] = React.useState(0);
  const [commands, setCommands] = React.useState<browser.Commands.Command[]>([]);

  React.useEffect(() => {
    let isMounted = true;

    void Promise.all([
      SettingsStore.getSettings(),
      BackgroundManager.getCurrentTab(),
      CustomFieldMappingStore.count(),
      browser.commands.getAll(),
    ]).then(([stored, tab, mappingCount, commandList]) => {
      if (!isMounted) return;
      setSettings(stored);
      setCurrentUrl(tab?.url);
      setCustomFieldMappingCount(mappingCount);
      setCommands(commandList);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentSite = React.useMemo(() => {
    if (!currentUrl) return null;

    try {
      const parsed = new URL(currentUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;

      return {
        domain: Settings.prepUrlForDoNotRunList(currentUrl),
        page: Settings.prepUrlPageForDoNotRunList(currentUrl),
        pageLabel: `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`,
      };
    } catch (_error) {
      return null;
    }
  }, [currentUrl]);

  const detectedLanguage = React.useMemo(() => {
    return resolveSupportedLanguage(navigator.language, languages);
  }, []);

  const getLanguageName = React.useCallback(
    (language: string) => {
      try {
        const displayNames = new Intl.DisplayNames([i18n.resolvedLanguage ?? i18n.language], {
          style: 'short',
          type: 'language',
          fallback: 'code',
        });
        return displayNames.of(language) ?? language;
      } catch (_error) {
        return language;
      }
    },
    [i18n.language, i18n.resolvedLanguage]
  );

  const sortedLanguages = React.useMemo(
    () => [...languages].sort((left, right) => getLanguageName(left).localeCompare(getLanguageName(right))),
    [getLanguageName]
  );

  const updateSettings = React.useCallback(async (update: (stored: Settings) => void) => {
    const stored = await SettingsStore.getSettings();
    update(stored);
    await SettingsStore.setSettings(stored);
    setSettings(stored);
  }, []);

  const setListValue = React.useCallback(
    async (key: SettingsListKey, value: string, enabled: boolean) => {
      await updateSettings(stored => {
        const existingValues = stored[key] ?? [];
        stored[key] = enabled
          ? [...new Set([...existingValues, value])]
          : existingValues.filter(existingValue => existingValue !== value);
      });
    },
    [updateSettings]
  );

  const handleAppearanceChange = async (appearance: LightOrDarkAppearance) => {
    if (appearance === LightOrDarkAppearance.system) {
      switchToSystemMode();
    } else {
      toggleDarkMode(appearance === LightOrDarkAppearance.dark);
    }

    await updateSettings(stored => {
      stored.lightOrDarkAppearance = appearance;
    });
  };

  const handleLanguageChange = async (language: string) => {
    await updateSettings(stored => {
      stored.lng = language;
    });
    await i18n.changeLanguage(language || detectedLanguage);
  };

  const clearCustomFieldMappings = async () => {
    await CustomFieldMappingStore.clearAll();
    setCustomFieldMappingCount(0);
  };

  const availableCommands = commands.filter(command => command.shortcut);
  const autoLanguageLabel = t('settings-popup-component.language-auto', {
    language: getLanguageName(detectedLanguage),
  });

  return (
    <Box sx={{ width: 360, maxWidth: 360, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box
        sx={{
          flex: '0 0 auto',
          px: 1.45,
          py: 0.85,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'strongbox.sidebar',
          backdropFilter: 'blur(22px) saturate(165%)',
        }}
      >
        <Typography sx={{ fontSize: '0.9rem', fontWeight: 680, letterSpacing: '-0.012em' }}>
          {t('settings-popup-component.title')}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.05, fontSize: '0.61rem' }}>
          {t('settings-popup-component.subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 1.05,
          pt: 1,
          pb: 1.25,
          scrollbarGutter: 'stable',
        }}
      >
        <SettingsSection title={t('settings-popup-component.section-auto-fill')}>
          <SettingsCheckboxRow
            title={t('settings-popup-component.single-match-title')}
            description={t('settings-popup-component.single-match-description')}
            checked={settings.autoFillImmediatelyIfOnlyASingleMatch}
            onChange={checked =>
              void updateSettings(stored => {
                stored.autoFillImmediatelyIfOnlyASingleMatch = checked;
              })
            }
          />
          <RowDivider />
          <SettingsCheckboxRow
            title={t('settings-popup-component.first-match-title')}
            description={t('settings-popup-component.first-match-description')}
            checked={settings.autoFillImmediatelyWithFirstMatch}
            onChange={checked =>
              void updateSettings(stored => {
                stored.autoFillImmediatelyWithFirstMatch = checked;
              })
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings-popup-component.section-field-controls')}>
          <SettingsCheckboxRow
            title={t('settings-popup-component.inline-icon-title')}
            description={t('settings-popup-component.inline-icon-description')}
            checked={settings.showInlineIconAndPopupMenu}
            onChange={checked =>
              void updateSettings(stored => {
                stored.showInlineIconAndPopupMenu = checked;
              })
            }
          />
          <RowDivider />
          <SettingsCheckboxRow
            title={t('settings-popup-component.inline-details-title')}
            description={t('settings-popup-component.inline-details-description')}
            checked={!settings.hideCredentialDetailsOnInlineMenu}
            onChange={checked =>
              void updateSettings(stored => {
                stored.hideCredentialDetailsOnInlineMenu = !checked;
              })
            }
          />
          <RowDivider />
          <SettingsCheckboxRow
            title={t('settings-popup-component.popup-details-title')}
            description={t('settings-popup-component.popup-details-description')}
            checked={!settings.hideCredentialDetailsOnPopup}
            onChange={checked =>
              void updateSettings(stored => {
                stored.hideCredentialDetailsOnPopup = !checked;
              })
            }
          />
          <RowDivider />
          <SettingsCheckboxRow
            title={t('settings-popup-component.badge-title')}
            description={t('settings-popup-component.badge-description')}
            checked={settings.showMatchCountOnPopupBadge}
            onChange={checked =>
              void updateSettings(stored => {
                stored.showMatchCountOnPopupBadge = checked;
              })
            }
          />
        </SettingsSection>

        <SettingsSection
          title={t('settings-popup-component.section-current-site')}
          accessory={currentSite?.pageLabel ?? t('settings-popup-component.current-site-unavailable')}
        >
          <SettingsCheckboxRow
            title={t('settings-popup-component.site-no-autofill-title')}
            description={t('settings-popup-component.site-no-autofill-description')}
            checked={Boolean(currentSite && (settings.doNotFillOnDomains ?? []).includes(currentSite.domain))}
            disabled={!currentSite}
            onChange={checked => {
              if (currentSite) void setListValue('doNotFillOnDomains', currentSite.domain, checked);
            }}
          />
          <RowDivider />
          <SettingsCheckboxRow
            title={t('settings-popup-component.site-no-inline-domain-title')}
            description={t('settings-popup-component.site-no-inline-domain-description')}
            checked={Boolean(currentSite && (settings.doNotShowInlineMenusOnDomains ?? []).includes(currentSite.domain))}
            disabled={!currentSite}
            onChange={checked => {
              if (currentSite) void setListValue('doNotShowInlineMenusOnDomains', currentSite.domain, checked);
            }}
          />
          <RowDivider />
          <SettingsCheckboxRow
            title={t('settings-popup-component.site-no-inline-page-title')}
            description={t('settings-popup-component.site-no-inline-page-description')}
            checked={Boolean(currentSite && (settings.doNotShowInlineMenusOnPages ?? []).includes(currentSite.page))}
            disabled={!currentSite}
            onChange={checked => {
              if (currentSite) void setListValue('doNotShowInlineMenusOnPages', currentSite.page, checked);
            }}
          />
        </SettingsSection>

        <SettingsSection title={t('settings-popup-component.section-appearance')}>
          <Box sx={{ minHeight: 52, px: 1.15, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ flex: '1 1 auto', minWidth: 0, fontSize: '0.76rem', fontWeight: 590 }}>
              {t('settings-popup-component.appearance-mode-title')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={settings.lightOrDarkAppearance}
              onChange={(_event, value: LightOrDarkAppearance | null) => {
                if (value !== null) void handleAppearanceChange(value);
              }}
              aria-label={t('settings-popup-component.appearance')}
              sx={{
                flex: '0 0 auto',
                height: 30,
                bgcolor: theme => (theme.palette.mode === 'dark' ? 'rgba(118, 118, 128, 0.2)' : 'rgba(118, 118, 128, 0.12)'),
                '& .MuiToggleButton-root': { minWidth: 47, px: 0.7, py: 0, fontSize: '0.64rem', textTransform: 'none' },
                '& .MuiToggleButton-root.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: '#FFFFFF',
                  '&:hover': { bgcolor: 'primary.main' },
                },
              }}
            >
              <ToggleButton value={LightOrDarkAppearance.system}>{t('settings-popup-component.appearance-system-short')}</ToggleButton>
              <ToggleButton value={LightOrDarkAppearance.light}>{t('settings-popup-component.appearance-light')}</ToggleButton>
              <ToggleButton value={LightOrDarkAppearance.dark}>{t('settings-popup-component.appearance-dark')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </SettingsSection>

        <SettingsSection title={t('settings-popup-component.section-data-other')}>
          <Box sx={{ minHeight: 51, px: 1.15, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 590, lineHeight: 1.25 }}>
                {t('settings-popup-component.custom-mappings-title')}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.2, fontSize: '0.62rem', lineHeight: 1.3 }}>
                {t('settings-popup-component.custom-mappings-description', { count: customFieldMappingCount })}
              </Typography>
            </Box>
            <Button
              size="small"
              color="error"
              variant="text"
              disabled={customFieldMappingCount === 0}
              onClick={() => void clearCustomFieldMappings()}
              startIcon={<DeleteOutlineRoundedIcon sx={{ fontSize: '15px !important' }} />}
              sx={{ flex: '0 0 auto', minWidth: 0, px: 0.65, fontSize: '0.64rem' }}
            >
              {t('settings-popup-component.clear-mappings')}
            </Button>
          </Box>
          <RowDivider />
          <Box sx={{ minHeight: 51, px: 1.15, py: 0.75, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography sx={{ fontSize: '0.76rem', fontWeight: 590, lineHeight: 1.25 }}>
                {t('settings-popup-component.language-title')}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.2, fontSize: '0.62rem', lineHeight: 1.3 }}>
                {t('settings-popup-component.language-description')}
              </Typography>
            </Box>
            <Select
              size="small"
              value={settings.lng}
              onChange={event => void handleLanguageChange(String(event.target.value))}
              displayEmpty
              inputProps={{ 'aria-label': t('settings-popup-component.language-title') }}
              renderValue={value => (value ? getLanguageName(String(value)) : autoLanguageLabel)}
              MenuProps={{ PaperProps: { sx: { maxHeight: 280 } } }}
              sx={{ flex: '0 0 125px', height: 30, fontSize: '0.66rem', '& .MuiSelect-select': { py: 0.5, pl: 1 } }}
            >
              <MenuItem value="" sx={{ fontSize: '0.72rem' }}>
                {autoLanguageLabel}
              </MenuItem>
              {sortedLanguages.map(language => (
                <MenuItem key={language} value={language} sx={{ fontSize: '0.72rem' }}>
                  {getLanguageName(language)}
                </MenuItem>
              ))}
            </Select>
          </Box>
        </SettingsSection>

        {availableCommands.length > 0 && (
          <SettingsSection title={t('settings-popup-component.section-shortcuts')} accessory={<KeyboardRoundedIcon sx={{ fontSize: 14 }} />}>
            {availableCommands.map((command, index) => (
              <React.Fragment key={command.name}>
                {index > 0 && <RowDivider />}
                <Box sx={{ minHeight: 39, px: 1.15, py: 0.6, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ flex: '1 1 auto', minWidth: 0, fontSize: '0.7rem' }}>
                    {t(`shortcuts.${command.name}`)}
                  </Typography>
                  <Box
                    component="kbd"
                    sx={{
                      flex: '0 0 auto',
                      px: 0.65,
                      py: 0.25,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '6px',
                      bgcolor: 'background.default',
                      color: 'text.secondary',
                      fontFamily: 'inherit',
                      fontSize: '0.62rem',
                      boxShadow: 'inset 0 -1px 0 rgba(128, 128, 128, 0.15)',
                    }}
                  >
                    {command.shortcut}
                  </Box>
                </Box>
              </React.Fragment>
            ))}
          </SettingsSection>
        )}

        <Box sx={{ pb: 0.15, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ fontSize: '0.58rem' }}>
            Strongbox AutoFill Enhanced · {t('general.version')} {process.env.VERSION}
          </Typography>
          <Link
            href="https://github.com/qionq/strongbox-autofill-enhanced"
            target="_blank"
            rel="noreferrer"
            color="text.secondary"
            underline="hover"
            sx={{ fontSize: '0.56rem' }}
          >
            Source · AGPL-3.0-or-later
          </Link>
        </Box>
      </Box>
    </Box>
  );
}
