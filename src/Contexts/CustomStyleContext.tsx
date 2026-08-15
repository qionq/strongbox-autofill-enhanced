import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsStore } from '../Settings/SettingsStore';
import { IframeMessageTypes } from '../Content/Iframe/iframeManager';
import { Utils } from '../Utils';
import { tooltipClasses } from '@mui/material';
import githubMarkdownDarkStyle from '../Shared/Styles/markdown-styles/github-markdown-dark';
import githubMarkdownLightStyle from '../Shared/Styles/markdown-styles/github-markdown-light';
import { SizeHandler } from '../SizeHandler';
import { StrongboxColours } from '../StrongboxColours';
import { postToIframeParent } from '../Content/Iframe/IframeParentChannel';

interface ThemeContextType {
  getCustomStyle: (components?: object | null) => object;
  darkMode: boolean;
  systemMode: boolean;
  fontSize: FontSize;
  toggleDarkMode: (isDark: boolean) => void;
  setFontSize: (fontSize: FontSize) => void;
  setSpacing: (spacing: Spacing) => void;
  switchToSystemMode: () => void;
  sizeHandler: SizeHandler;
  convertToColouredChar: (char: string, ColourPalete: ColourPalete) => string;
}

const CustomStyleContext = createContext<ThemeContextType | undefined>(undefined);

export enum ColourPalete {
  dark,
  light,
  darkForBlind,
  lightForBlind,
}

export enum LightOrDarkAppearance {
  dark,
  light,
  system,
}

export enum FontSize {
  small = 20,
  medium = 16,
  large = 12,
  xl = 10,
}

export enum Spacing {
  small = 4,
  medium = 6,
  large = 8,
}

export function useCustomStyle() {
  const context = useContext(CustomStyleContext);
  if (!context) {
    throw new Error('useCustomStyle must be used within a CustomStyleProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function CustomStyleProvider({ children }: ThemeProviderProps) {
  const [darkMode, setDarkMode] = useState(false);
  const [systemMode, setSystemMode] = useState(true);
  const [fontSize, setFontSize] = useState(FontSize.medium);
  const [spacing, setSpacing] = useState(Spacing.medium);

  React.useEffect(() => {
    initializeStyles();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (event.matches && systemMode) {
        setDarkMode(true);
        addColorSchemeTag(true);
      } else if (systemMode) {
        setDarkMode(false);
        addColorSchemeTag(false);
      }
    };
    initializeStyles();
    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [systemMode]);

  const getCustomStyle = () => {
    const isDark = systemMode ? window.matchMedia('(prefers-color-scheme: dark)').matches : darkMode;
    const mode = isDark ? 'dark' : 'light';
    const fieldBackground = isDark ? 'rgba(58, 58, 60, 0.74)' : 'rgba(255, 255, 255, 0.72)';
    const fieldHover = isDark ? 'rgba(72, 72, 74, 0.84)' : 'rgba(255, 255, 255, 0.92)';
    const separator = isDark ? 'rgba(84, 84, 88, 0.58)' : 'rgba(60, 60, 67, 0.13)';

    const theme = {
      palette: {
        mode,
        primary: { main: isDark ? '#0A84FF' : '#007AFF' },
        success: { main: isDark ? '#30D158' : '#34C759' },
        warning: { main: isDark ? '#FFD60A' : '#FF9F0A' },
        error: { main: isDark ? '#FF453A' : '#FF3B30' },
        background: {
          default: isDark ? '#1C1C1E' : '#EFEFF2',
          paper: isDark ? 'rgba(36, 36, 38, 0.97)' : 'rgba(242, 242, 245, 0.97)',
        },
        text: {
          primary: isDark ? '#F5F5F7' : '#1D1D1F',
          secondary: isDark ? 'rgba(235, 235, 245, 0.62)' : 'rgba(60, 60, 67, 0.68)',
          disabled: isDark ? 'rgba(235, 235, 245, 0.3)' : 'rgba(60, 60, 67, 0.32)',
        },
        divider: separator,
        action: {
          hover: isDark ? 'rgba(255, 255, 255, 0.075)' : 'rgba(0, 0, 0, 0.045)',
          selected: isDark ? 'rgba(10, 132, 255, 0.24)' : 'rgba(0, 122, 255, 0.14)',
          focus: isDark ? 'rgba(10, 132, 255, 0.28)' : 'rgba(0, 122, 255, 0.18)',
        },
        strongbox: {
          field: fieldBackground,
          fieldHover,
          borderStrong: isDark ? 'rgba(174, 174, 178, 0.38)' : 'rgba(60, 60, 67, 0.22)',
          sidebar: isDark ? 'rgba(28, 28, 30, 0.78)' : 'rgba(232, 232, 236, 0.84)',
        },
      },
      spacing,
      shape: { borderRadius: 10 },
      typography: {
        htmlFontSize: parseInt(fontSize.toString()),
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
        h6: { fontWeight: 650, letterSpacing: '-0.015em' },
        subtitle1: { fontWeight: 600 },
      },
      components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: 'transparent',
            colorScheme: mode,
            WebkitFontSmoothing: 'antialiased',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 28,
            borderRadius: 9,
            textTransform: 'none',
            boxShadow: 'none',
          },
          contained: {
            boxShadow: 'none',
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 9,
            padding: 4,
            transition: 'background-color 120ms ease, color 120ms ease',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            minHeight: 40,
            borderRadius: 9,
            marginLeft: 4,
            marginRight: 4,
            paddingLeft: 8,
            paddingRight: 8,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)'}`,
            borderRadius: 13,
            boxShadow: isDark
              ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.24), 0 14px 38px rgba(0, 0, 0, 0.46)'
              : 'inset 0 0 0 1px rgba(60, 60, 67, 0.1), 0 12px 32px rgba(60, 60, 67, 0.18)',
            backdropFilter: 'blur(24px) saturate(165%)',
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            backgroundColor: fieldBackground,
            '& fieldset': { borderColor: separator },
            '&:hover fieldset': { borderColor: isDark ? 'rgba(99, 99, 102, 0.9)' : 'rgba(60, 60, 67, 0.28)' },
          },
        },
      },
      MuiListSubheader: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            color: isDark ? '#F5F5F7' : '#1D1D1F',
            fontWeight: 650,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: { width: 3, borderRadius: 3 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 42,
            textTransform: 'none',
            alignItems: 'flex-start',
            borderRadius: 8,
            margin: '2px 6px',
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            borderTop: `1px solid ${separator}`,
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: { minWidth: 64 },
          label: { fontSize: '0.68rem' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundColor: isDark ? 'rgba(10, 132, 255, 0.2)' : 'rgba(0, 122, 255, 0.12)',
            color: isDark ? '#64D2FF' : '#0066CC',
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 7,
            fontSize: '0.72rem',
            [`.${tooltipClasses.popper}[data-popper-placement*="right"] &`]: {
              marginLeft: '1px',
            },
          },
        },
      },
      },
    };

    let styleElement = document.getElementById('custom-scrollbar-style') as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'custom-scrollbar-style';
      document.head.appendChild(styleElement);
    }
    let cssRules = `
    ::-webkit-scrollbar {width: 6px;}
    ::-webkit-scrollbar-track {background: transparent;border-radius: 15px;}
    ::-webkit-scrollbar-thumb {background:  ${isDark ? StrongboxColours.scrollbar.thumb.background.dark : StrongboxColours.scrollbar.thumb.background.light};border-radius: 6px;}
    ::-webkit-scrollbar-thumb:hover {background: ${isDark ? StrongboxColours.scrollbar.thumb.hover.background.dark : StrongboxColours.scrollbar.thumb.hover.background.light};}`;
    styleElement.textContent = cssRules;

    styleElement = document.getElementById('github-markdown-style') as HTMLStyleElement | null;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'github-markdown-style';
      document.head.appendChild(styleElement);
    }
    cssRules = isDark ? githubMarkdownDarkStyle : githubMarkdownLightStyle;
    styleElement.textContent = cssRules;
    document.documentElement.style.colorScheme = mode;

    return theme;
  };

  const toggleDarkMode = (isDark: boolean) => {
    setDarkMode(isDark);
    addColorSchemeTag(isDark);
    setSystemMode(false);
  };

  const switchToSystemMode = () => {
    setSystemMode(true);
  };

  const initializeStyles = async () => {
    const stored = await SettingsStore.getSettings();

    
    switch (stored.lightOrDarkAppearance) {
      case LightOrDarkAppearance.dark:
      case LightOrDarkAppearance.light:
        toggleDarkMode(stored.lightOrDarkAppearance == LightOrDarkAppearance.dark);
        addColorSchemeTag(stored.lightOrDarkAppearance == LightOrDarkAppearance.dark);
        break;
      case LightOrDarkAppearance.system:
        toggleDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
        addColorSchemeTag(window.matchMedia('(prefers-color-scheme: dark)').matches);
        switchToSystemMode();
        break;
    }

    
    setFontSize(stored.fontSize as FontSize);

    
    setSpacing(stored.spacing as Spacing);
  };

  const addColorSchemeTag = (isDark: boolean) => {
    if (Utils.isFirefox()) {
      removeColorSchemeTag();

      const metaTag = document.createElement('meta');
      metaTag.name = 'color-scheme';
      metaTag.content = isDark ? 'dark' : 'light';
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(metaTag);

      postToIframeParent({ type: IframeMessageTypes.colorSchemeChanged, data: isDark ? 'dark' : 'light' });
    }
  };

  const removeColorSchemeTag = () => {
    const head = document.head || document.getElementsByTagName('head')[0];
    const metaTag = document.querySelector('meta[name="color-scheme"]');

    if (metaTag) {
      head.removeChild(metaTag);
    }
  };

  const convertToColouredChar = (char: string, colourPalete: ColourPalete): string => {
    if (/[a-z]/.test(char)) {
      switch (colourPalete) {
        case ColourPalete.dark:
          return StrongboxColours.darkLowerLetterColor;
        case ColourPalete.light:
          return StrongboxColours.lightLowerLetterColor;
        case ColourPalete.darkForBlind:
          return StrongboxColours.darkColorBlindLowerLetterColor;
        case ColourPalete.lightForBlind:
          return StrongboxColours.lightColorBlindLowerLetterColor;
      }
    } else if (/[A-Z]/.test(char)) {
      switch (colourPalete) {
        case ColourPalete.dark:
          return StrongboxColours.darkUpperLetterColor;
        case ColourPalete.light:
          return StrongboxColours.lightUpperLetterColor;
        case ColourPalete.darkForBlind:
          return StrongboxColours.darkColorBlindUpperLetterColor;
        case ColourPalete.lightForBlind:
          return StrongboxColours.lightColorBlindUpperLetterColor;
      }
    } else if (/[0-9]/.test(char)) {
      switch (colourPalete) {
        case ColourPalete.dark:
          return StrongboxColours.darkNumberColor;
        case ColourPalete.light:
          return StrongboxColours.lightNumberColor;
        case ColourPalete.darkForBlind:
          return StrongboxColours.darkColorBlindNumberColor;
        case ColourPalete.lightForBlind:
          return StrongboxColours.lightColorBlindNumberColor;
      }
    } else {
      switch (colourPalete) {
        case ColourPalete.dark:
          return StrongboxColours.darkSymbolColor;
        case ColourPalete.light:
          return StrongboxColours.lightSymbolColor;
        case ColourPalete.darkForBlind:
          return StrongboxColours.darkColorBlindSymbolColor;
        case ColourPalete.lightForBlind:
          return StrongboxColours.lightColorBlindSymbolColor;
      }
    }
  };

  const sizeHandler = new SizeHandler(fontSize);

  const contextValue = {
    getCustomStyle,
    darkMode,
    toggleDarkMode,
    setFontSize,
    setSpacing,
    systemMode,
    switchToSystemMode,
    fontSize,
    sizeHandler,
    convertToColouredChar,
  };

  return <CustomStyleContext.Provider value={contextValue}>{children}</CustomStyleContext.Provider>;
}
