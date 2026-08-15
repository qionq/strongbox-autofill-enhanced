import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import { GetStatusResponse } from '../Messaging/Protocol/GetStatusResponse';
import { AutoFiller } from './AutoFiller';
import browser from 'webextension-polyfill';
import { CreateEntryRequest } from '../Messaging/Protocol/CreateEntryRequest';
import { CreateEntryResponse } from '../Messaging/Protocol/CreateEntryResponse';
import ReactDOM from 'react-dom/client';
import { Utils } from '../Utils';
import { GetGroupsResponse } from '../Messaging/Protocol/GetGroupsResponse';
import { GetGroupsRequest } from '../Messaging/Protocol/GetGroupsRequest';
import { GetNewEntryDefaultsRequest } from '../Messaging/Protocol/GetNewEntryDefaultsRequest';
import { GetNewEntryDefaultsResponse } from '../Messaging/Protocol/GetNewEntryDefaultsResponse';
import { GeneratePasswordRequest } from '../Messaging/Protocol/GeneratePasswordRequest';
import { GeneratePasswordResponse } from '../Messaging/Protocol/GeneratePasswordResponse';
import { UnlockResponse } from '../Messaging/Protocol/UnlockResponse';
import { PageAnalyser } from './PageAnalyser';
import { SettingsStore } from '../Settings/SettingsStore';
import { LastKnownDatabasesItem, Settings } from '../Settings/Settings';
import { IframeComponentTypes, IframeManager } from './Iframe/iframeManager';
import { GeneratePasswordV2Response } from '../Messaging/Protocol/GeneratePasswordV2Response';
import { GetPasswordAndStrengthRequest } from '../Messaging/Protocol/GetPasswordAndStrengthRequest';
import { GetPasswordAndStrengthResponse } from '../Messaging/Protocol/GetPasswordAndStrengthResponse';
import { SearchResponse } from '../Messaging/Protocol/SearchResponse';
import { GetNewEntryDefaultsResponseV2 } from '../Messaging/Protocol/GetNewEntryDefaultsResponseV2';
import { CustomFieldReference } from '../Messaging/Protocol/SingleFieldFillRequest';
import { CustomFieldMappingStore } from './CustomFieldMappingStore';
import { InlineMiniFieldIcon } from './InlineMiniFieldIcon';
import { GetIconResponse } from '../Messaging/Protocol/GetIconResponse';
import { hasActiveExtensionContext, runWithExtensionContext } from './ExtensionContextLifecycle';

export interface MainPageInformation {
  title: string;
  url: string;
  favIconBase64: string | null;
  favIconUrl: string | null;
  inlineMenuTruncatedHeight: string | null;
}

export class ContentScriptManager {
  reactRoot: ReactDOM.Root;
  reactRootPopupMenu: ReactDOM.Root | null;
  currentInlineMenuInputElement: HTMLElement | null;
  iframeManager: IframeManager;
  inlineFieldIcon: InlineMiniFieldIcon | null = null;
  inlineFieldIconRole = '';
  hideInlineMenusForAWhile = false;
  showLargeTextView = false;
  private dynamicInputObserver: MutationObserver | null = null;
  private dynamicInputNotificationTimer: ReturnType<typeof setTimeout> | null = null;
  private extensionContextDisposed = false;

  constructor() {
    this.iframeManager = new IframeManager(this);
  }

  private disposeAfterExtensionContextInvalidated() {
    if (this.extensionContextDisposed) return;
    this.extensionContextDisposed = true;

    this.removeFocusListener();
    this.clearBlurTimeout();
    if (this.dynamicInputNotificationTimer) {
      clearTimeout(this.dynamicInputNotificationTimer);
      this.dynamicInputNotificationTimer = null;
    }
    this.dynamicInputObserver?.disconnect();
    this.dynamicInputObserver = null;
    this.removeInlineFieldIcon();
    this.iframeManager.remove();
  }

  private ensureActiveExtensionContext(): boolean {
    if (this.extensionContextDisposed) return false;
    if (hasActiveExtensionContext(() => browser.runtime.id)) return true;

    this.disposeAfterExtensionContextInvalidated();
    return false;
  }

  private async runWithActiveExtensionContext<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    if (this.extensionContextDisposed) return fallback;

    return await runWithExtensionContext(
      () => browser.runtime.id,
      operation,
      () => this.disposeAfterExtensionContextInvalidated(),
      fallback
    );
  }

  public runSafely(operation: () => Promise<unknown>): void {
    void this.runWithActiveExtensionContext(async () => {
      await operation();
    }, undefined).catch(error => {
      queueMicrotask(() => {
        throw error;
      });
    });
  }

  private async sendRuntimeMessage<T>(message: Record<string, unknown>, fallback: T): Promise<T> {
    return await this.runWithActiveExtensionContext(async () => {
      return (await browser.runtime.sendMessage(message)) as T;
    }, fallback);
  }

  onDOMLoaded() {

    if (!this.ensureActiveExtensionContext()) return;

    this.addFocusListener();
    this.observeDynamicInputFields();
    

    
    
    

    
    
    
    

    
    
    
    
    

    this.runSafely(() => this.autoShowInlineMenuIfFocusedInputRecognized());
  }

  private observeDynamicInputFields() {
    if (this.dynamicInputObserver || !document.documentElement) return;

    this.dynamicInputObserver = new MutationObserver(mutations => {
      if (!this.ensureActiveExtensionContext()) return;

      const inputStructureChanged = mutations.some(mutation => {
        if (mutation.type === 'attributes') {
          return mutation.target instanceof HTMLInputElement;
        }

        return Array.from(mutation.addedNodes).some(node => {
          if (!(node instanceof Element)) return false;
          return node.matches('input') || node.querySelector('input') !== null;
        });
      });

      if (!inputStructureChanged) return;

      if (this.dynamicInputNotificationTimer) {
        clearTimeout(this.dynamicInputNotificationTimer);
      }

      // Let SPA frameworks finish mounting and enabling the field before the
      // background process selects and sends an automatic-fill credential.
      this.dynamicInputNotificationTimer = setTimeout(() => {
        this.runSafely(async () => {
          await browser.runtime.sendMessage({ type: 'content-input-fields-changed' });
        });
      }, 180);
    });

    this.dynamicInputObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'autocomplete', 'disabled', 'readonly', 'hidden'],
    });
  }

  async getStatus(): Promise<GetStatusResponse | null> {
    const ret = await this.sendRuntimeMessage<GetStatusResponse | null>({ type: 'get-status' }, null);

    

    return ret;
  }

  async getCredentials(skip: number, take: number): Promise<AutoFillCredential[] | null> {
    const ret = await this.sendRuntimeMessage<AutoFillCredential[] | null>({ type: 'get-credentials', details: { skip, take } }, null);

    

    return ret;
  }

  async getIcon(databaseId: string, nodeId: string): Promise<GetIconResponse | null> {
    const ret = await this.sendRuntimeMessage<GetIconResponse | null>({ type: 'get-icon', details: { databaseId, nodeId } }, null);

    

    return ret;
  }

  async getSearchCredentials(query: string, skip: number, take: number): Promise<SearchResponse | null> {
    const ret = await this.sendRuntimeMessage<SearchResponse | null>({ type: 'get-search', details: { query, skip, take } }, null);

    

    return ret;
  }

  async getGroups(request: GetGroupsRequest): Promise<GetGroupsResponse | null> {
    const ret = await this.sendRuntimeMessage<GetGroupsResponse | null>({ type: 'get-groups', details: request }, null);

    

    return ret;
  }

  async launchStrongbox(): Promise<boolean> {
    const ret = await this.sendRuntimeMessage<boolean>({ type: 'launch-strongbox' }, false);

    

    return ret;
  }

  async onCopyUsername(credential: AutoFillCredential) {
    await this.sendRuntimeMessage<void>({ type: 'copy-username', details: credential }, undefined);
  }

  async onCopyPassword(credential: AutoFillCredential) {
    await this.sendRuntimeMessage<void>({ type: 'copy-password', details: credential }, undefined);
  }

  async onCopyTotp(credential: AutoFillCredential) {
    await this.sendRuntimeMessage<void>({ type: 'copy-totp', details: credential }, undefined);
  }

  async onCopy(value: string) {
    await this.sendRuntimeMessage<void>({ type: 'copy-string', details: value }, undefined);
  }

  async onLaunchUrl(url: string) {
    await this.sendRuntimeMessage<void>({ type: 'content-script-requests-url-launch', details: url }, undefined);
  }

  async unlockDatabase(uuid: string): Promise<UnlockResponse | null> {
    const ret = await this.sendRuntimeMessage<UnlockResponse | null>(
      {
        type: 'unlock-database',
        details: {
          uuid: uuid,
        },
      },
      null
    );

    

    return ret;
  }

  async getNewEntryDefaults(request: GetNewEntryDefaultsRequest): Promise<GetNewEntryDefaultsResponse | null> {
    const ret = await this.sendRuntimeMessage<GetNewEntryDefaultsResponse | null>({ type: 'get-new-entry-defaults', details: request }, null);

    

    return ret;
  }

  async getNewEntryDefaultsV2(request: GetNewEntryDefaultsRequest): Promise<GetNewEntryDefaultsResponseV2 | null> {
    const ret = await this.sendRuntimeMessage<GetNewEntryDefaultsResponseV2 | null>({ type: 'get-new-entry-defaults-v2', details: request }, null);

    

    return ret;
  }

  async generatePassword(request: GeneratePasswordRequest): Promise<GeneratePasswordResponse | null> {
    const ret = await this.sendRuntimeMessage<GeneratePasswordResponse | null>({ type: 'generate-password', details: request }, null);

    

    return ret;
  }

  async generatePasswordV2(): Promise<GeneratePasswordV2Response | null> {
    const ret = await this.sendRuntimeMessage<GeneratePasswordV2Response | null>({ type: 'generate-password-v2' }, null);

    

    return ret;
  }

  async getPasswordStrength(request: GetPasswordAndStrengthRequest): Promise<GetPasswordAndStrengthResponse | null> {
    const ret = await this.sendRuntimeMessage<GetPasswordAndStrengthResponse | null>({ type: 'get-password-strength', details: request }, null);

    

    return ret;
  }

  async createNewEntry(details: CreateEntryRequest): Promise<CreateEntryResponse | null> {
    const ret = await this.sendRuntimeMessage<CreateEntryResponse | null>({ type: 'create-new-entry', details: details }, null);

    

    return ret;
  }

  async copyTotpCodeIfConfiguredAfterFill(details: AutoFillCredential): Promise<void> {
    const ret = await this.sendRuntimeMessage<void>({ type: 'copy-totp-after-fill', details: details }, undefined);

    

    return ret;
  }

  async getCurrentTab(): Promise<browser.Tabs.Tab | null> {
    const ret = await this.sendRuntimeMessage<browser.Tabs.Tab | null>({ type: 'get-tab-for-this-content-script' }, null);

    

    return ret;
  }

  async onCreatedNewItem(credential: AutoFillCredential, message: string) {
    await this.onFillWithCredential(credential);

    setTimeout(() => {
      this.showNotificationToast(message);
    }, 300);
  }

  showNotificationToast(message: string) {
    this.iframeManager.initialize(IframeComponentTypes.NotificationToast, document.body as HTMLInputElement, false, message);
  }

  showCreateNewDialog() {
    this.iframeManager.initialize(IframeComponentTypes.CreateNewEntryDialog, document.body as HTMLInputElement, false);
  }

  async getFavIconBase64Data(url: string): Promise<string | null> {
    

    const testImg = document.createElement('img') as HTMLImageElement;
    if (testImg === null) {
      return null;
    }

    testImg.src = url;

    try {
      await testImg.decode();
    } catch (error) {
      return null;
    }

    const imageData = Utils.getImageElementBase64PNGData(testImg);

    if (imageData && imageData?.length > 20 * 1024) {
      
      
      return null;
    }

    
    
    

    const chromeDefaultFavIconHash = -1499456902;
    if (imageData == null || testImg.naturalHeight === 0) {
      
      
      return null;
    } else if (Utils.quickHashString(imageData) === chromeDefaultFavIconHash) {
      return null;
    }

    return imageData;
  }

  async getFavIconUrl(): Promise<string | null> {
    if (Utils.isFirefox()) {
      const thisTab = await this.getCurrentTab();
      return thisTab?.favIconUrl ?? null;
    } else {
      const extensionUrl = await this.runWithActiveExtensionContext(async () => browser.runtime.getURL('/_favicon/'), '');
      if (!extensionUrl) return null;

      const url = new URL(extensionUrl);
      url.searchParams.set('pageUrl', document.location.href);
      url.searchParams.set('size', '128');
      return url.toString();
    }
  }

  handleSaveNewEntry(details: CreateEntryRequest) {
    return this.createNewEntry(details);
  }

  

  async getLastKnownAutoFillDatabases(): Promise<LastKnownDatabasesItem[]> {
    const stored = await SettingsStore.getSettings();
    return stored.lastKnownDatabases;
  }

  async shouldAutoShowInlineMenuOnFocus(): Promise<boolean> {
    const settings = await SettingsStore.getSettings();

    if (!this.showLargeTextView) {
      settings.uuidForLargeTextView = String();
      await SettingsStore.setSettings(settings);
    }

    if (!Utils.isMacintosh()) {
      return false;
    }

    if (!settings.showInlineIconAndPopupMenu || Settings.isUrlIsInDoNotShowInlineMenusList(settings, document.location.href)) {
      return false;
    }

    if (!settings.showInlineIconAndPopupMenu || Settings.isUrlPageIsInDoNotShowInlineMenusList(settings, document.location.href)) {
      return false;
    }

    if (!settings.showInlineIconAndPopupMenu || this.hideInlineMenusForAWhile) {
      return false;
    }

    return true;
  }

  

  listen = false; 
  focusOrBlurListener: EventListener = event => {
    this.runSafely(() => this.onFocusChanged(event));
  };
  addFocusListener() {
    if (!this.ensureActiveExtensionContext()) return;
    
    this.listen = true;
    document.addEventListener('focus', this.focusOrBlurListener, true);
    document.addEventListener('blur', this.focusOrBlurListener, true);
  }

  removeFocusListener() {
    
    this.listen = false;
    document.removeEventListener('focus', this.focusOrBlurListener, true);
    document.removeEventListener('blur', this.focusOrBlurListener, true);
  }

  timeout: ReturnType<typeof setTimeout> | null;
  clearBlurTimeout() {
    
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  async onFocusChanged(event: Event) {
    if (!this.ensureActiveExtensionContext()) return;

    this.currentInlineMenuInputElement = null;

    if (!this.listen) {
      
      return;
    }

    

    

    this.clearBlurTimeout();

    if (event.type === 'blur') {
      
      this.timeout = setTimeout(() => {
        this.runSafely(() => this.autoShowInlineMenuIfFocusedInputRecognized());
        this.timeout = null;
      }, 200);
    } else {
      await this.autoShowInlineMenuIfFocusedInputRecognized();
    }
  }

  

  async autoShowInlineMenuIfFocusedInputRecognized() {
    if (!this.ensureActiveExtensionContext()) return;

    if (document.activeElement && document.activeElement instanceof HTMLInputElement) {
      const focusedElement = document.activeElement as HTMLInputElement;

      const shouldRun = await this.shouldAutoShowInlineMenuOnFocus();
      if (!shouldRun) {
        this.removeInlineFieldIcon();
        return;
      }

      const usernames = await PageAnalyser.getAllUsernameInputs();
      const isRecognizedUsernameField = usernames.some(input => input == focusedElement);
      const passwords = await PageAnalyser.getAllPasswordInputs();
      const isRecognizedPasswordField = passwords.some(input => input == focusedElement);
      const isRecognizedOneTimeCodeField = PageAnalyser.isOneTimeCodeInput(focusedElement);
      const rememberedCustomField = await CustomFieldMappingStore.getMappingForInput(focusedElement, document.location.href);

      if (isRecognizedUsernameField || isRecognizedPasswordField || isRecognizedOneTimeCodeField || rememberedCustomField) {
        this.currentInlineMenuInputElement = focusedElement;
        this.showInlineIconOnInputElement(focusedElement, isRecognizedPasswordField, isRecognizedOneTimeCodeField);
        return;
      }
    }

    this.removeInlineFieldIcon();
  }

  showInlineIconOnInputElement(fieldElement: HTMLInputElement, isPasswordField: boolean, isOneTimeCodeField: boolean) {
    const role = isOneTimeCodeField ? 'one-time-code' : isPasswordField ? 'password' : 'username-or-custom';
    const segmentedFields = isOneTimeCodeField ? PageAnalyser.getSegmentedOneTimeCodeInputs(fieldElement) : [];
    const positionAnchor = segmentedFields.length > 1 ? segmentedFields[segmentedFields.length - 1] : fieldElement;
    const placeOutsideField = segmentedFields.length > 1;

    if (
      this.inlineFieldIcon?.fieldElement === fieldElement &&
      this.inlineFieldIcon.positionAnchorElement === positionAnchor &&
      this.inlineFieldIcon.placeOutsideField === placeOutsideField &&
      this.inlineFieldIconRole === role
    ) {
      this.inlineFieldIcon.bindIconPosition();
      void this.inlineFieldIcon.show(true);
      return;
    }

    this.removeInlineFieldIcon();
    this.inlineFieldIconRole = role;
    this.inlineFieldIcon = InlineMiniFieldIcon.attachToField(
      fieldElement,
      false,
      () => {
        this.runSafely(() => this.showInlineMenuOnInputElement(fieldElement, isPasswordField, isOneTimeCodeField));
      },
      positionAnchor,
      placeOutsideField
    );
  }

  removeInlineFieldIcon() {
    this.inlineFieldIcon?.detach();
    this.inlineFieldIcon = null;
    this.inlineFieldIconRole = '';
  }

  async forceShowInlineMenuOnCurrentInput() {
    if (!this.ensureActiveExtensionContext()) return false;

    if (!Utils.isMacintosh()) {
      return false;
    }

    if (document.activeElement && document.activeElement instanceof HTMLInputElement) {
      const focusedElement = document.activeElement as HTMLInputElement;

      this.currentInlineMenuInputElement = focusedElement;

      const passwords = await PageAnalyser.getAllPasswordInputs();
      const isLikelyPasswordField = passwords.some(input => input == focusedElement) || focusedElement.type === 'password';
      const isLikelyOneTimeCodeField = PageAnalyser.isOneTimeCodeInput(focusedElement);

      await this.showInlineMenuOnInputElement(focusedElement, isLikelyPasswordField, isLikelyOneTimeCodeField);
    }
  }

  async showInlineMenuOnInputElement(fieldElement: HTMLInputElement, isPasswordField: boolean, isOneTimeCodeField = false) {
    if (!this.ensureActiveExtensionContext()) return;

    this.iframeManager.initialize(IframeComponentTypes.InlineMiniFieldMenu, fieldElement, isPasswordField, '', isOneTimeCodeField);
  }

  async getUnlockableDatabases(status: GetStatusResponse | null): Promise<LastKnownDatabasesItem[]> {
    if (status) {
      return status.databases.filter(database => database.autoFillEnabled && database.locked).map(database => new LastKnownDatabasesItem(database.nickName, database.uuid));
    } else {
      const stored = await SettingsStore.getSettings();
      return stored.lastKnownDatabases;
    }
  }

  async onFillWithCredential(
    credential: AutoFillCredential,
    inlineFieldInitiator: HTMLInputElement | null = null,
    inlineFieldInitiatorIsPassword = false,
    inlineFieldInitiatorIsOneTimeCode = false
  ) {
    if (inlineFieldInitiator && inlineFieldInitiatorIsOneTimeCode) {
      const currentTotp = AutoFillCredential.getCurrentTotpCode(credential, false);
      if (currentTotp) {
        await this.autoFillSingleField(currentTotp, inlineFieldInitiator, false, undefined, true);
      }
      return;
    }

    await this.autoFillWithCredential(credential, false, inlineFieldInitiator, inlineFieldInitiatorIsPassword);
  }

  async onFillSingleField(
    text: string,
    inlineFieldInitiator: HTMLInputElement,
    appendValue = false,
    customField?: CustomFieldReference,
    oneTimeCode = false
  ) {
    await this.autoFillSingleField(text, inlineFieldInitiator, appendValue, customField, oneTimeCode);
  }

  async autoFillWithCredential(
    credential: AutoFillCredential,
    isPageLoadFill = false,
    inlineFieldInitiator: HTMLInputElement | null = null,
    inlineFieldInitiatorIsPassword = false,
    fillMultiple = false
  ): Promise<boolean> {

    if (isPageLoadFill) {

      const settings = await SettingsStore.getSettings();
      if (Settings.isUrlInDoNotFillList(settings, document.location.href)) {
        return false;
      }

    }

    

    this.removeFocusListener();

    const autoFiller = new AutoFiller();
    const filled = await autoFiller.doIt(credential, inlineFieldInitiator, inlineFieldInitiatorIsPassword, fillMultiple, isPageLoadFill);

    setTimeout(() => {
      this.addFocusListener();
    }, 500);

    if (filled) {
      this.iframeManager.remove();
      this.runSafely(() => this.copyTotpCodeIfConfiguredAfterFill(credential));
    }

    return filled;
  }

  async autoFillSingleField(
    text: string,
    inlineFieldInitiator: HTMLInputElement,
    appendValue = false,
    customField?: CustomFieldReference,
    oneTimeCode = false
  ): Promise<void> {

    

    this.removeFocusListener();

    const autoFiller = new AutoFiller();

    if (customField && !appendValue) {
      try {
        await CustomFieldMappingStore.remember(inlineFieldInitiator, document.location.href, customField);
      } catch (_error) {
        // A storage failure must not prevent the requested one-time fill.
      }
    }

    if (oneTimeCode && !appendValue) {
      const segmentedFields = PageAnalyser.getSegmentedOneTimeCodeInputs(inlineFieldInitiator);
      await autoFiller.doItOneTimeCode(text, segmentedFields.length > 0 ? segmentedFields : [inlineFieldInitiator]);
    } else {
      await autoFiller.doItSingleField(text, inlineFieldInitiator, appendValue);
    }

    setTimeout(() => {
      this.addFocusListener();
    }, 500);

    if (!appendValue) {
      this.iframeManager.remove();
    }
  }
}
