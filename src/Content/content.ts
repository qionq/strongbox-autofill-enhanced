import browser from 'webextension-polyfill';
import './content.css';
import i18next from 'i18next';
import { ContentScriptManager } from './ContentScriptManager';
import { Utils } from '../Utils';
import { config } from '../Localization/config';

await i18next.init(config);

const contentScriptManager = new ContentScriptManager();

browser.runtime.onMessage.addListener((message): void => {
  if (message.credential) {
    contentScriptManager.runSafely(() => contentScriptManager.autoFillWithCredential(message.credential, message.onLoadFill, null, false, true));
  } else if (message.restoreFocus) {
    contentScriptManager.iframeManager.restoreFocus();
  } else if (message.openCreateNewDialog) {
    if (Utils.isParentDocument()) {
      contentScriptManager.showCreateNewDialog();
    }
  } else if (message.openInlineMenu) {
    contentScriptManager.runSafely(() => contentScriptManager.forceShowInlineMenuOnCurrentInput());
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', afterDOMLoaded);
} else {
  afterDOMLoaded();
}

function afterDOMLoaded() {
  contentScriptManager.onDOMLoaded();

  if (document.querySelector('input')) {
    // Every frame that owns an input announces itself after registration. The
    // background process can then return an automatic-fill credential to that
    // exact frame instead of sending it only to the top-level page.
    contentScriptManager.runSafely(async () => {
      await browser.runtime.sendMessage({ type: 'content-input-fields-changed' });
    });
  }
}
