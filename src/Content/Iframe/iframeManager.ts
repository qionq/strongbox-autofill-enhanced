import browser from 'webextension-polyfill';
import { ContentScriptManager, MainPageInformation } from '../ContentScriptManager';
import { Utils } from '../../Utils';
import { SettingsStore } from '../../Settings/SettingsStore';

export enum IframeComponentTypes {
  InlineMiniFieldMenu,
  CreateNewEntryDialog,
  NotificationToast,
}

export enum IframeMessageTypes {
  render,
  remove,
  resize,
  backToInlineMiniFieldMenu,
  onFillWithCredential,
  onFillSingleField,
  onCreatedNewItem,
  showCreateNewEntryDialog,
  showNotificationToast,
  hideInlineMenusForAWhile,
  colorSchemeChanged,
  onRedirectUrl,
  onCopy,
  showLargeTextView,
}

export class IframeManager {
  contentScriptManager: ContentScriptManager;
  iframe: HTMLIFrameElement;
  anchorEl: HTMLInputElement;
  iframeComponentType: IframeComponentTypes;
  isPasswordField: boolean;
  isOneTimeCodeField: boolean;
  areMainPageEventListenersAdded = false;
  notificationToastMessage = '';
  private iframeMessageChannel: MessageChannel | null = null;
  private creationGeneration = 0;

  constructor(contentScriptManager: ContentScriptManager) {
    this.contentScriptManager = contentScriptManager;
  }

  initialize(
    iframeComponentType: IframeComponentTypes,
    anchorEl: HTMLInputElement,
    isPasswordField = false,
    notificationToastMessage = '',
    isOneTimeCodeField = false
  ) {
    this.iframeComponentType = iframeComponentType;
    this.anchorEl = anchorEl;
    this.isPasswordField = isPasswordField;
    this.isOneTimeCodeField = isOneTimeCodeField;
    this.notificationToastMessage = notificationToastMessage;

    
    this.remove();
    const generation = ++this.creationGeneration;

    
    requestAnimationFrame(() => {
      this.contentScriptManager.runSafely(() => this.create(generation));
    });
  }

  private async create(generation: number) {
    const channelToken = this.createChannelToken();
    const channelRegistered = await browser.runtime.sendMessage({ type: 'register-iframe-channel', details: { token: channelToken } });

    if (!channelRegistered || generation !== this.creationGeneration) return;

    const existRoot = document.querySelector('com-strongbox-extension');

    if (!existRoot) {
      
      const mainRoot = document.createElement('com-strongbox-extension');
      const iframeShadowContainer = mainRoot.attachShadow({ mode: 'closed' });
      this.iframe = document.createElement('iframe');

      
      if (!Utils.isFirefox()) {
        this.iframe.setAttribute('sandbox', 'allow-scripts'); 
      }

      this.iframe.src = browser.runtime.getURL('iframe.html');

      
      iframeShadowContainer.appendChild(this.iframe);
      document.body.append(mainRoot);

      
      this.defineStyle();

      

      const onMainPageScrolled = () => {
        if (this.iframeComponentType == IframeComponentTypes.InlineMiniFieldMenu) {
          this.positionInlineMenu();
        }
      };

      const onMainPageResized = () => {
        if (this.iframeComponentType == IframeComponentTypes.InlineMiniFieldMenu) {
          this.prepareInlineMenuTruncated(this.anchorEl.getBoundingClientRect());
          this.positionInlineMenu();
        }
      };

      const handleMessageReceivedFromIFrame = async (event: MessageEvent) => {
        switch (event.data.type) {
          case IframeMessageTypes.remove: {
            this.remove();
            break;
          }
          case IframeMessageTypes.resize: {
            const width = event.data.data.width;
            const height = event.data.data.height;
            this.iframe.style.width = width;
            this.iframe.style.height = height;

            if (this.iframeComponentType == IframeComponentTypes.InlineMiniFieldMenu) {
              this.positionInlineMenu(width, height);
            }
            break;
          }
          case IframeMessageTypes.backToInlineMiniFieldMenu: {
            this.initialize(IframeComponentTypes.InlineMiniFieldMenu, this.anchorEl, this.isPasswordField, '', this.isOneTimeCodeField);
            break;
          }
          case IframeMessageTypes.onFillWithCredential: {

            const credential = event.data.data;
            await this.contentScriptManager.onFillWithCredential(credential, this.anchorEl, this.isPasswordField, this.isOneTimeCodeField);
            this.remove();
            break;
          }
          case IframeMessageTypes.onFillSingleField: {
            const text = event.data.data.text;
            const appendValue = event.data.data.appendValue ?? false;
            const oneTimeCode = event.data.data.oneTimeCode ?? false;
            const customField = event.data.data.customField;
            await this.contentScriptManager.onFillSingleField(text, this.anchorEl, appendValue, customField, oneTimeCode);

            if (!appendValue) {
              this.remove();
            }
            break;
          }
          case IframeMessageTypes.onCreatedNewItem: {
            this.contentScriptManager.onCreatedNewItem(event.data.data.credential, event.data.data.message);
            this.remove();
            break;
          }
          case IframeMessageTypes.showCreateNewEntryDialog: {
            this.initialize(IframeComponentTypes.CreateNewEntryDialog, this.anchorEl);
            break;
          }
          case IframeMessageTypes.showNotificationToast: {
            this.initialize(IframeComponentTypes.NotificationToast, this.anchorEl, false, event.data.data);
            break;
          }
          case IframeMessageTypes.hideInlineMenusForAWhile: {
            this.contentScriptManager.hideInlineMenusForAWhile = true;
            break;
          }
          case IframeMessageTypes.showLargeTextView: {
            this.contentScriptManager.showLargeTextView = true;
            break;
          }
          case IframeMessageTypes.colorSchemeChanged: {
            this.iframe.style.colorScheme = event.data.data;

            break;
          }
          case IframeMessageTypes.onRedirectUrl: {
            const url = event.data.data;
            await this.contentScriptManager.onLaunchUrl(url);
            break;
          }
          case IframeMessageTypes.onCopy: {
            const text = event.data.data;
            await this.contentScriptManager.onCopy(text);
            break;
          }
          default:
            break;
        }
      };
      const onMessageReceivedFromIFrame = (event: MessageEvent) => {
        this.contentScriptManager.runSafely(() => handleMessageReceivedFromIFrame(event));
      };

      const messageChannel = new MessageChannel();
      let channelTransferred = false;
      this.iframeMessageChannel = messageChannel;
      messageChannel.port1.addEventListener('message', onMessageReceivedFromIFrame);
      messageChannel.port1.start();

      const onMainPageClickPressed = (event: Event) => {
        setTimeout(() => {
          const clickedElement = event.target as HTMLElement;

          if (clickedElement.id === 'strongbox-cs-inline-icon-shadow-container' || clickedElement === this.contentScriptManager.currentInlineMenuInputElement) return;

          this.remove();
        }, 100); 
      };

      const onMainPageKeyup = (event: KeyboardEvent) => {
        if (event.key === 'Escape' || (event.key === 'Tab' && this.anchorEl != document.activeElement)) {
          this.remove();
        } else if (event.key === 'ArrowDown') {
          this.iframe.focus();
        }
      };

      const handleIFrameLoaded = async () => {
        if (generation !== this.creationGeneration || this.iframeMessageChannel !== messageChannel || channelTransferred) return;

        const stored = await SettingsStore.getSettings();
        const url = await this.contentScriptManager.getFavIconUrl();
        const favIconBase64 = url ? await this.contentScriptManager.getFavIconBase64Data(url) : null;
        const isDefaultFavIcon = favIconBase64 == null;
        const favIconUrl: string | null = isDefaultFavIcon ? null : url;
        const inlineMenuTruncatedHeight = this.iframe.getAttribute('inline-menu-truncated-height') ?? null;

        const mainPageInformation: MainPageInformation = {
          title: document.title,
          url: document.location.href,
          favIconBase64,
          favIconUrl,
          inlineMenuTruncatedHeight,
        };

        if (generation !== this.creationGeneration || this.iframeMessageChannel !== messageChannel || channelTransferred) return;
        channelTransferred = true;

        switch (this.iframeComponentType) {
          case IframeComponentTypes.InlineMiniFieldMenu:
          case IframeComponentTypes.CreateNewEntryDialog: {
            this.iframe.contentWindow?.postMessage(
              {
                type: IframeMessageTypes.render,
                data: { iframeComponentType: this.iframeComponentType, mainPageInformation, showScrollbars: stored.showScrollbars, channelToken },
              },
              '*',
              [messageChannel.port2]
            );
            break;
          }
          case IframeComponentTypes.NotificationToast: {
            this.iframe.contentWindow?.postMessage(
              {
                type: IframeMessageTypes.render,
                data: { iframeComponentType: this.iframeComponentType, message: this.notificationToastMessage, channelToken },
              },
              '*',
              [messageChannel.port2]
            );
            break;
          }
          default:
            break;
        }
      };
      const onIFrameLoaded = () => {
        this.contentScriptManager.runSafely(handleIFrameLoaded);
      };

      
      this.iframe.addEventListener('load', onIFrameLoaded);

      
      if (!this.areMainPageEventListenersAdded) {
        window.addEventListener('scroll', onMainPageScrolled, true);
        window.addEventListener('resize', onMainPageResized);
        window.addEventListener('click', onMainPageClickPressed);
        window.addEventListener('keyup', onMainPageKeyup);

        this.areMainPageEventListenersAdded = true;
      }
    }
  }

  restoreFocus() {
    requestAnimationFrame(() => {
      this.anchorEl?.focus();
    });
  }

  remove() {
    this.creationGeneration += 1;
    this.iframeMessageChannel?.port1.close();
    this.iframeMessageChannel?.port2.close();
    this.iframeMessageChannel = null;

    const existRoot = document.querySelector('com-strongbox-extension');
    existRoot?.remove();
  }

  private createChannelToken(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private defineStyle() {
    this.iframe.style.display = 'block';
    this.iframe.style.position = 'fixed';
    this.iframe.style.border = 'none';
    this.iframe.style.zIndex = '2147483647';
    this.iframe.style.overflow = 'hidden';
    this.iframe.style.colorScheme = 'none';
    this.iframe.setAttribute('scrolling', 'no');

    
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `com-strongbox-extension {visibility: visible !important; /* Ensure visibility for Strongbox Extension  */}`;
    document.head.appendChild(styleElement);

    switch (this.iframeComponentType) {
      case IframeComponentTypes.InlineMiniFieldMenu: {
        const inputRect = this.anchorEl.getBoundingClientRect();

        this.prepareInlineMenuTruncated(inputRect);

        this.iframe.style.top = inputRect.bottom + 6 + 'px';
        this.iframe.style.left = inputRect.right + 'px';
        this.iframe.style.width = '0px';
        this.iframe.style.height = '0px';

        break;
      }
      case IframeComponentTypes.CreateNewEntryDialog: {
        this.iframe.style.top = '0';
        this.iframe.style.left = '0';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        break;
      }
      case IframeComponentTypes.NotificationToast: {
        this.iframe.style.bottom = '0';
        break;
      }
      default:
        break;
    }
  }

  prepareInlineMenuTruncated = (inputRect: DOMRect): void => {
    const margin = 8;
    const gap = 6;
    const availableBelow = Math.max(0, window.innerHeight - inputRect.bottom - gap - margin);
    const availableAbove = Math.max(0, inputRect.top - gap - margin);
    const available = Math.max(availableBelow, availableAbove);

    this.iframe.setAttribute('inline-menu-truncated-height', Math.floor(available).toString());
  };

  private positionInlineMenu(widthCss?: string, heightCss?: string) {
    if (!this.iframe || !this.anchorEl?.isConnected) return;

    const margin = 8;
    const gap = 6;
    const inputRect = this.anchorEl.getBoundingClientRect();
    const requestedWidth = Math.max(0, parseFloat(widthCss ?? this.iframe.style.width) || this.iframe.offsetWidth);
    const requestedHeight = Math.max(0, parseFloat(heightCss ?? this.iframe.style.height) || this.iframe.offsetHeight);
    const maxHeight = Math.max(0, window.innerHeight - margin * 2);
    const height = Math.min(requestedHeight, maxHeight);
    const availableBelow = window.innerHeight - inputRect.bottom - gap - margin;
    const availableAbove = inputRect.top - gap - margin;

    const top = availableBelow >= height || availableBelow >= availableAbove ? inputRect.bottom + gap : inputRect.top - gap - height;
    const left = inputRect.right - requestedWidth;

    this.iframe.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - height - margin))}px`;
    this.iframe.style.left = `${Math.max(margin, Math.min(left, window.innerWidth - requestedWidth - margin))}px`;
  }
}
