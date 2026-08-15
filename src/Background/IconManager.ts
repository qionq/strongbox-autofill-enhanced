import browser from 'webextension-polyfill';
import i18next from 'i18next';

export enum IconState {
  disconnected,
  allDatabasesLocked,
  good,
}
export class IconManager {
  static async setIcon(state: IconState, badgeText = '', badgeColor = '#344d56'): Promise<void> {
    const action = browser.action || browser.browserAction;

    if (action == undefined) {
      return;
    }

    try {
      

      if (state == IconState.disconnected) {
        await action.setIcon({
          path: {
            19: '/assets/icons/app-icon-grey-19.png',
            38: '/assets/icons/app-icon-grey-38.png',
          },
        });

        await action.setTitle({ title: i18next.t('not-running-popup-component.title', { ns: 'global' }) });
      } else if (state == IconState.allDatabasesLocked) {
        await action.setIcon({
          path: {
            19: '/assets/icons/app-icon-all-locked-19.png',
            38: '/assets/icons/app-icon-all-locked-38.png',
          },
        });

        await action.setTitle({
          title: `${i18next.t('general.enhanced-app-name', { ns: 'global' })}: ${i18next.t('database-list-item.locked', { ns: 'global' })}`,
        });
      } else {
        await action.setIcon({
          path: {
            19: '/assets/icons/app-icon-blue-19.png',
            38: '/assets/icons/app-icon-blue-38.png',
          },
        });
        await action.setTitle({ title: i18next.t('general.enhanced-app-name', { ns: 'global' }) });
      }

      await action.setBadgeText({ text: badgeText });
      await action.setBadgeBackgroundColor({ color: badgeColor });
    } catch (error) {
      // Icon updates are cosmetic and can fail while a browser window is closing.
    }
  }
}
