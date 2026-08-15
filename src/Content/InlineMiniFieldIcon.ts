import i18next from 'i18next';

export class InlineMiniFieldIcon {
  fieldElement: HTMLInputElement;
  positionAnchorElement: HTMLInputElement;
  iconElement: HTMLButtonElement;
  placeOutsideField = false;
  isRightToLeft = false;

  isVisible = false;

  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  private lastPositionKey = '';
  private isDetached = false;
  private readonly reposition = () => this.bindIconPosition();
  private readonly monitorPosition = () => {
    if (this.isDetached) return;

    if (this.isVisible) {
      this.bindIconPosition();
    }

    this.animationFrameId = this.isDetached ? null : window.requestAnimationFrame(this.monitorPosition);
  };

  static readonly INLINE_ICON_SHADOW_CONTAINER_ID = 'strongbox-cs-inline-icon-shadow-container';

  static ensureShadow() {
    const found = document.getElementById(InlineMiniFieldIcon.INLINE_ICON_SHADOW_CONTAINER_ID);
    if (!found) {
      const created = document.createElement('div');
      created.id = InlineMiniFieldIcon.INLINE_ICON_SHADOW_CONTAINER_ID;
      created.style.position = 'fixed';
      created.style.inset = '0';
      created.style.width = '0';
      created.style.height = '0';
      created.style.zIndex = '2147483640';
      created.style.pointerEvents = 'none';
      document.body.append(created);
      created.attachShadow({ mode: 'open' });
    }
  }

  static getShadowRoot(): ShadowRoot | null {
    InlineMiniFieldIcon.ensureShadow();

    const found = document.getElementById(InlineMiniFieldIcon.INLINE_ICON_SHADOW_CONTAINER_ID);

    return found?.shadowRoot ?? null;
  }

  static attachToField(
    field: HTMLInputElement,
    disconnected: boolean,
    clickHandler: () => void,
    positionAnchor: HTMLInputElement = field,
    placeOutsideField = false
  ): InlineMiniFieldIcon {
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const icon = document.createElement('button');
    const autoFillLabel = i18next.t('general.autofill', { ns: 'global' });
    const unavailableLabel = i18next.t('not-running-popup-component.title', { ns: 'global' });
    icon.type = 'button';
    icon.setAttribute('aria-label', disconnected ? unavailableLabel : autoFillLabel);
    icon.title = disconnected ? unavailableLabel : autoFillLabel;
    icon.style.all = 'unset';
    icon.style.position = 'fixed';
    icon.style.display = 'grid';
    icon.style.placeItems = 'center';
    icon.style.boxSizing = 'border-box';
    icon.style.zIndex = '2147483640';
    icon.style.pointerEvents = 'auto';
    icon.style.cursor = 'pointer';
    icon.style.color = disconnected ? '#8E8E93' : '#007AFF';
    icon.style.background = disconnected
      ? darkMode
        ? 'rgba(58, 58, 60, 0.88)'
        : 'rgba(239, 239, 242, 0.9)'
      : darkMode
      ? 'rgba(44, 44, 46, 0.9)'
      : 'rgba(247, 247, 249, 0.92)';
    icon.style.border = darkMode ? '1px solid rgba(255, 255, 255, 0.18)' : '1px solid rgba(255, 255, 255, 0.94)';
    icon.style.borderRadius = '7px';
    icon.style.boxShadow = darkMode
      ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.28), 0 2px 8px rgba(0, 0, 0, 0.28)'
      : 'inset 0 0 0 1px rgba(60, 60, 67, 0.12), 0 1px 2px rgba(60, 60, 67, 0.12), 0 3px 9px rgba(60, 60, 67, 0.12)';
    icon.style.backdropFilter = 'blur(14px) saturate(160%)';
    icon.style.setProperty('-webkit-backdrop-filter', 'blur(14px) saturate(160%)');
    icon.style.transition = 'transform 120ms ease, background-color 120ms ease, opacity 120ms ease';
    icon.style.opacity = '0.97';

    const keyIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    keyIcon.setAttribute('viewBox', '0 0 24 24');
    keyIcon.setAttribute('width', '15');
    keyIcon.setAttribute('height', '15');
    keyIcon.setAttribute('fill', 'none');
    keyIcon.setAttribute('stroke', 'currentColor');
    keyIcon.setAttribute('stroke-width', '2.1');
    keyIcon.setAttribute('stroke-linecap', 'round');
    keyIcon.setAttribute('stroke-linejoin', 'round');
    keyIcon.setAttribute('aria-hidden', 'true');

    const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ring.setAttribute('cx', '8');
    ring.setAttribute('cy', '8');
    ring.setAttribute('r', '4.25');
    const stem = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    stem.setAttribute('d', 'M11 11l9 9m-4-4 2-2m-5 0 2-2');
    keyIcon.append(ring, stem);
    icon.append(keyIcon);

    InlineMiniFieldIcon.getShadowRoot()?.append(icon);

    const miniIcon = new InlineMiniFieldIcon();
    miniIcon.fieldElement = field;
    miniIcon.positionAnchorElement = positionAnchor;
    miniIcon.placeOutsideField = placeOutsideField;
    miniIcon.isRightToLeft =
      (positionAnchor.ownerDocument.defaultView?.getComputedStyle(positionAnchor) ?? getComputedStyle(positionAnchor)).direction === 'rtl';
    miniIcon.iconElement = icon;
    void miniIcon.show(true);

    icon.addEventListener('mousedown', event => {
      event.preventDefault();
      event.stopPropagation();
    });
    icon.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      clickHandler();
    });
    icon.addEventListener('mouseenter', () => {
      icon.style.transform = 'scale(1.04)';
      icon.style.opacity = '1';
      icon.style.background = darkMode ? 'rgba(58, 58, 60, 0.96)' : 'rgba(255, 255, 255, 0.98)';
    });
    icon.addEventListener('mouseleave', () => {
      icon.style.transform = 'scale(1)';
      icon.style.opacity = '0.97';
      icon.style.background = disconnected
        ? darkMode
          ? 'rgba(58, 58, 60, 0.88)'
          : 'rgba(239, 239, 242, 0.9)'
        : darkMode
        ? 'rgba(44, 44, 46, 0.9)'
        : 'rgba(247, 247, 249, 0.92)';
    });

    window.addEventListener('scroll', miniIcon.reposition, true);
    window.addEventListener('resize', miniIcon.reposition);
    window.visualViewport?.addEventListener('scroll', miniIcon.reposition);
    window.visualViewport?.addEventListener('resize', miniIcon.reposition);
    miniIcon.resizeObserver = new ResizeObserver(miniIcon.reposition);
    miniIcon.resizeObserver.observe(field);
    if (positionAnchor !== field) {
      miniIcon.resizeObserver.observe(positionAnchor);
    }

    return miniIcon;
  }

  detach() {
    if (this.isDetached) return;
    this.isDetached = true;

    window.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
    window.visualViewport?.removeEventListener('scroll', this.reposition);
    window.visualViewport?.removeEventListener('resize', this.reposition);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.animationFrameId !== null) {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.iconElement.remove();
    this.isVisible = false;
  }

  async show(show = true) {
    if (!show) {
      this.iconElement.style.display = 'none';
      this.isVisible = false;
      return;
    }

    this.bindIconPosition();
    this.iconElement.style.display = 'grid';
    this.isVisible = true;
    if (this.animationFrameId === null) {
      this.animationFrameId = window.requestAnimationFrame(this.monitorPosition);
    }
  }

  bindIconPosition() {
    if (!this.fieldElement.isConnected || !this.positionAnchorElement.isConnected) {
      this.detach();
      return;
    }

    const rect = this.positionAnchorElement.getBoundingClientRect();
    const size = Math.max(20, Math.min(24, Math.floor(rect.height - 10)));
    const inset = Math.max(4, Math.min(7, Math.floor((rect.height - size) / 2)));
    const top = rect.top + Math.max(0, (rect.height - size) / 2);
    let left: number;

    if (this.placeOutsideField) {
      const preferredLeft = this.isRightToLeft ? rect.left - size - 6 : rect.right + 6;
      const fallbackLeft = this.isRightToLeft ? rect.right + 6 : rect.left - size - 6;
      const preferredFits = preferredLeft >= 4 && preferredLeft + size <= window.innerWidth - 4;
      left = preferredFits ? preferredLeft : fallbackLeft;
    } else {
      left = this.isRightToLeft ? rect.left + inset : rect.right - size - inset;
    }

    left = Math.max(4, Math.min(left, window.innerWidth - size - 4));

    const width = InlineMiniFieldIcon.pixelsCssString(size);
    const height = InlineMiniFieldIcon.pixelsCssString(size);
    const topCss = InlineMiniFieldIcon.pixelsCssString(top);
    const leftCss = InlineMiniFieldIcon.pixelsCssString(left);
    const hasRoom = this.placeOutsideField || rect.width > size + inset * 2;
    const visibility =
      hasRoom && rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
        ? 'visible'
        : 'hidden';
    const positionKey = `${width}|${height}|${topCss}|${leftCss}|${visibility}`;

    if (positionKey === this.lastPositionKey) return;
    this.lastPositionKey = positionKey;

    this.iconElement.style.width = width;
    this.iconElement.style.height = height;
    this.iconElement.style.top = topCss;
    this.iconElement.style.left = leftCss;
    this.iconElement.style.visibility = visibility;
  }

  static pixelsCssString(value: number) {
    const pixelRatio = window.devicePixelRatio || 1;
    return `${Math.round(value * pixelRatio) / pixelRatio}px`;
  }
}
