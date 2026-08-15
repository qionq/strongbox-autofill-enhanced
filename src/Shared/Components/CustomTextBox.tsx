import React from 'react';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import ContentPasteGoRoundedIcon from '@mui/icons-material/ContentPasteGoRounded';
import PushPinRoundedIcon from '@mui/icons-material/PushPinRounded';
import { useTranslation } from 'react-i18next';

interface CustomTextBoxProps {
  title: string;
  value: string;
  allowConceal?: boolean;
  allowCopy?: boolean;
  allowAutofill?: boolean;
  allowRedirect?: boolean;
  rememberOnAutofill?: boolean;
  onCopy?: (value: string) => void;
  onAutofill?: (value: string, appendValue?: boolean) => void;
  onRedirect?: (value: string) => void;
}

function CustomTextBox({
  title,
  value,
  allowConceal = false,
  allowCopy = false,
  allowAutofill = false,
  allowRedirect = false,
  rememberOnAutofill = false,
  onCopy,
  onAutofill,
  onRedirect,
}: CustomTextBoxProps) {
  const [hideText, setHideText] = React.useState(allowConceal);
  const [isHovered, setIsHovered] = React.useState(false);
  const [t] = useTranslation('global');
  const displayedValue = hideText ? '••••••••••••' : value || '—';

  const autofill = () => {
    if (allowAutofill) onAutofill?.(value);
  };

  return (
    <Box
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,
        flex: '1 1 0%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: 38,
        px: 0.75,
        py: 0.38,
        borderRadius: '11px',
        border: '1px solid',
        borderColor: theme => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.92)'),
        bgcolor: 'strongbox.field',
        boxShadow: theme =>
          theme.palette.mode === 'dark'
            ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.22), 0 1px 1px rgba(0, 0, 0, 0.16)'
            : 'inset 0 0 0 1px rgba(60, 60, 67, 0.10), 0 1px 2px rgba(60, 60, 67, 0.08)',
        transition: 'background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease',
        '&:hover': {
          bgcolor: 'strongbox.fieldHover',
          borderColor: theme => (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.18)' : '#FFFFFF'),
        },
      }}
    >
      <Box
        role={allowAutofill ? 'button' : undefined}
        tabIndex={allowAutofill ? 0 : -1}
        onClick={autofill}
        onKeyDown={event => {
          if (allowAutofill && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            autofill();
          }
        }}
        sx={{ minWidth: 0, maxWidth: '100%', flex: '1 1 0%', overflow: 'hidden', pr: 0.35, cursor: allowAutofill ? 'pointer' : 'default', outline: 'none' }}
      >
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '0.61rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            lineHeight: 1.25,
            mb: 0.08,
          }}
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            overflow: 'hidden',
            textOverflow: 'clip',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            WebkitMaskImage: hideText ? 'none' : 'linear-gradient(90deg, #000 0, #000 calc(100% - 16px), transparent 100%)',
            maskImage: hideText ? 'none' : 'linear-gradient(90deg, #000 0, #000 calc(100% - 16px), transparent 100%)',
            color: value ? 'text.primary' : 'text.disabled',
            fontFamily: hideText ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : 'inherit',
            letterSpacing: hideText ? '0.07em' : 'normal',
            fontSize: '0.73rem',
            lineHeight: 1.25,
          }}
        >
          {displayedValue}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', flex: '0 0 auto', ml: 0.25, gap: 0.05 }}>
        {allowConceal && isHovered && (
          <Tooltip title={t('general.show-hide')} placement="top" arrow>
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              aria-label={t('general.show-hide')}
              onClick={event => {
                event.stopPropagation();
                setHideText(hide => !hide);
              }}
            >
              {hideText ? <VisibilityRoundedIcon sx={{ fontSize: 16 }} /> : <VisibilityOffRoundedIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        )}

        {allowRedirect && isHovered && (
          <Tooltip title={t('general.launch-url')} placement="top" arrow>
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              aria-label={t('general.launch-url')}
              onClick={event => {
                event.stopPropagation();
                onRedirect?.(value);
              }}
            >
              <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        {allowCopy && isHovered && (
          <Tooltip title={t('general.copy')} placement="top" arrow>
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              aria-label={t('general.copy')}
              onClick={event => {
                event.stopPropagation();
                onCopy?.(value);
              }}
            >
              <ContentCopyRoundedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        {allowAutofill && (
          <Tooltip
            title={
              rememberOnAutofill
                ? t('general.autofill-and-remember', { defaultValue: 'AutoFill & remember for this field' })
                : t('general.autofill')
            }
            placement="top"
            arrow
          >
            <IconButton
              size="small"
              sx={{ p: 0.3 }}
              color={rememberOnAutofill ? 'primary' : 'default'}
              aria-label={rememberOnAutofill ? t('general.autofill-and-remember', { defaultValue: 'AutoFill & remember for this field' }) : t('general.autofill')}
              onClick={event => {
                event.stopPropagation();
                onAutofill?.(value);
              }}
            >
              {rememberOnAutofill ? <PushPinRoundedIcon sx={{ fontSize: 16 }} /> : <ContentPasteGoRoundedIcon sx={{ fontSize: 16 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}

export default CustomTextBox;
