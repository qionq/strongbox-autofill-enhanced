import browser from 'webextension-polyfill';
import i18next from 'i18next';
import { BackgroundManager } from './BackgroundManager';
import { config } from '../Localization/config';

await i18next.init(config);


browser.runtime.onInstalled.addListener(async (): Promise<void> => {
  await BackgroundManager.getInstance().doSimpleStatusUpdate();
});



browser.windows.onFocusChanged.addListener(windowId => {

  if (windowId != browser.windows.WINDOW_ID_NONE) {
    BackgroundManager.getInstance().refreshCredentialsAndAutoFillIfNecessary(true);
  } else {
    BackgroundManager.getInstance().doSimpleStatusUpdate();
  }
});



browser.tabs.onActivated.addListener(() => {
  BackgroundManager.getInstance().refreshCredentialsAndAutoFillIfNecessary();
});



browser.tabs.onUpdated.addListener(() => {
  BackgroundManager.getInstance().refreshCredentialsAndAutoFillIfNecessary();
});



browser.runtime.onMessage.addListener((message, sender) => {
  return BackgroundManager.getInstance().onMessage(message, sender);
});



browser.commands.onCommand.addListener(command => {

  if (command == 'autofill-first') {
    BackgroundManager.getInstance().autoFillCurrentTabWithFirstMatch();
  }

  if (command == 'open-inline-menu') {
    BackgroundManager.getInstance().openInlineMenu();
  }
});



const refreshAfterTopLevelNavigation = (details: { frameId: number; tabId: number; url: string }) => {
  if (details.frameId === 0) {
    void BackgroundManager.getInstance().refreshCredentialsAndAutoFillForTab(details.tabId, details.url);
  }
};

browser.webNavigation.onCompleted.addListener(refreshAfterTopLevelNavigation);
browser.webNavigation.onHistoryStateUpdated.addListener(refreshAfterTopLevelNavigation);
browser.webNavigation.onReferenceFragmentUpdated.addListener(refreshAfterTopLevelNavigation);
