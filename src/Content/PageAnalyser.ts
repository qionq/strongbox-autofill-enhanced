import { isLoginIdentifier } from './LoginIdentifierDetector';

export interface InputVisibilityResult {
  input: HTMLInputElement;
  isVisible: boolean;
}

export class PageAnalyser {
  static async getAllUsernameInputs(): Promise<HTMLInputElement[]> {
    const all = await this.getAllInputs();

    const result = all.filter(input => PageAnalyser.isUsernameInput(input));

    return result;
  }

  static async getAllPasswordInputs(): Promise<HTMLInputElement[]> {
    const all = await this.getAllInputs();

    const result = all.filter(input => PageAnalyser.isPasswordInput(input));

    return result;
  }

  static async getAllOneTimeCodeInputs(): Promise<HTMLInputElement[]> {
    // Segmented verification-code boxes are commonly narrower than the
    // username/password width threshold used by getAllInputs().
    const all = await this.getAllInputs(0);

    return all.filter(input => PageAnalyser.isOneTimeCodeInput(input));
  }

  static async getAllInputs(minInputWidth = 50): Promise<HTMLInputElement[]> {
    

    let inputs = Array.from<HTMLInputElement>(document.getElementsByTagName('input'));

    

    const iframes = Array.from<HTMLIFrameElement>(document.getElementsByTagName('iframe'));

    

    for (const iframe of iframes) {
      

      const iframeInputs = iframe.contentDocument?.getElementsByTagName('input');
      if (iframeInputs) {
        const iframeInputsArray = Array.from<HTMLInputElement>(iframeInputs);

        

        inputs.push(...iframeInputsArray);
      }
    }

    

    inputs = inputs.filter(input => input.offsetWidth > minInputWidth);

    

    const inputPromises = inputs.map(async input => {
      const result: InputVisibilityResult = { input, isVisible: false };

      

      
      
      

      
      
      
      

      if (await this.checkInputIsInViewPortUsingIntersectionObserver(input)) {
        result.isVisible = true;
        return result;
      }

      return result;
    });

    const promisesResults = await Promise.allSettled(inputPromises);

    

    const inputMatches = promisesResults
      .filter(result => result.status === 'fulfilled' && result.value.isVisible)
      .map(result => (result as PromiseFulfilledResult<InputVisibilityResult>).value.input); 

    return inputMatches;
  }

  static isPasswordInput(input: HTMLInputElement) {
    return input.type === 'password'; 
  }

  static isOneTimeCodeInput(input: HTMLInputElement) {
    const supportedTypes = ['text', 'tel', 'number', 'password'];
    if (!supportedTypes.includes(input.type) || input.readOnly || input.disabled || input.inputMode === 'email') {
      return false;
    }

    const autocompleteTokens = input.autocomplete
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (autocompleteTokens.includes('one-time-code')) {
      return true;
    }

    if (autocompleteTokens.some(token => ['cc-csc', 'cc-number', 'postal-code'].includes(token))) {
      return false;
    }

    if (PageAnalyser.getSegmentedOneTimeCodeInputs(input).length > 0) {
      return true;
    }

    if (PageAnalyser.isOneTimeCodeSiteException(input)) {
      return true;
    }

    const identifierMetadata = PageAnalyser.normalizeInputMetadata([input.id, input.name, input.placeholder].join(' '));
    const metadata = PageAnalyser.normalizeInputMetadata(
      [
        identifierMetadata,
        input.title,
        input.ariaLabel ?? '',
        input.getAttribute('data-testid') ?? '',
        input.getAttribute('data-test') ?? '',
        input.getAttribute('data-qa') ?? '',
        ...PageAnalyser.getLabelsForInput(input),
      ].join(' ')
    );
    const compactIdentifierMetadata = identifierMetadata.replace(/\s+/g, '');
    const compactMetadata = metadata.replace(/\s+/g, '');

    // Vocabulary and negative matches are informed by KeePassXC-Browser's
    // long-running TOTP detector: content/totp-field.js (GPL-3.0).
    const ignoredIdentifierPattern = /(bank|bar|coupon|post(?:al)?|user|zip|promo).*code|(?:en|de)code(?:d|r)*|comment|author|error/i;
    const cardCodePattern = /(^|\s)(cvv|cvc)(\s|$)|card verification|card security/i;
    if (ignoredIdentifierPattern.test(identifierMetadata) || cardCodePattern.test(metadata)) {
      return false;
    }

    if (input.maxLength > 0 && (input.maxLength < 4 || input.maxLength > 10)) {
      return false;
    }

    const acceptedIdentifierHints = [
      '2fa',
      '2fpin',
      'auth',
      'challenge',
      'code',
      'idvpin',
      'mfa',
      'mfa code',
      'one time password',
      'otc confirmation input',
      'otp',
      'otppw',
      'token',
      'twofa',
      'two factor',
      'verification pin',
    ];

    if (
      acceptedIdentifierHints.some(
        hint => identifierMetadata.includes(hint) || compactIdentifierMetadata.includes(hint.replace(/\s+/g, ''))
      )
    ) {
      return true;
    }

    const descriptivePhrases = [
      'one time code',
      'one time password',
      'verification code',
      'verification passcode',
      'security code',
      'authentication code',
      'authenticator code',
      'two factor code',
      'two step code',
      'login code',
      'confirmation code',
      'ワンタイムコード',
      'ワンタイムパスワード',
      '認証コード',
      '確認コード',
    ];

    if (descriptivePhrases.some(phrase => metadata.includes(phrase) || compactMetadata.includes(phrase.replace(/\s+/g, '')))) {
      return true;
    }

    return input.closest('.mfa-verify') !== null;
  }

  /**
   * Returns the complete group for one-character verification-code inputs.
   * Six boxes are the usual case, while 4-8 explicit one-character boxes are
   * accepted for sites that use a different code length.
   */
  static getSegmentedOneTimeCodeInputs(input: HTMLInputElement): HTMLInputElement[] {
    if (!PageAnalyser.isSegmentedCodeBoxCandidate(input)) {
      return [];
    }

    const checkedContainers = new Set<Element>();
    let container: Element | null = input.parentElement;

    while (container) {
      checkedContainers.add(container);
      const group = PageAnalyser.getSegmentedCodeBoxesInContainer(container);
      if (PageAnalyser.isPlausibleSegmentedCodeGroup(group, input)) {
        return group;
      }

      if (container === input.ownerDocument.body || container === input.form) {
        break;
      }

      container = container.parentElement;
    }

    if (input.form && !checkedContainers.has(input.form)) {
      const formGroup = PageAnalyser.getSegmentedCodeBoxesInContainer(input.form);
      if (PageAnalyser.isPlausibleSegmentedCodeGroup(formGroup, input)) {
        return formGroup;
      }
    }

    return [];
  }

  private static getSegmentedCodeBoxesInContainer(container: Element): HTMLInputElement[] {
    return Array.from(container.querySelectorAll<HTMLInputElement>('input')).filter(candidate =>
      PageAnalyser.isSegmentedCodeBoxCandidate(candidate)
    );
  }

  private static isSegmentedCodeBoxCandidate(input: HTMLInputElement): boolean {
    if (!['text', 'tel', 'number'].includes(input.type) || input.disabled || input.readOnly || !PageAnalyser.isInputVisible(input)) {
      return false;
    }

    const rect = input.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || rect.width >= 100) {
      return false;
    }

    const pattern = input.pattern.toLowerCase();
    const hasNumericSemantics =
      input.type === 'number' ||
      input.type === 'tel' ||
      input.inputMode === 'numeric' ||
      input.inputMode === 'decimal' ||
      pattern.includes('0-9') ||
      pattern.includes('\\d');

    return input.maxLength === 1 || (input.maxLength === -1 && hasNumericSemantics);
  }

  private static isPlausibleSegmentedCodeGroup(group: HTMLInputElement[], input: HTMLInputElement): boolean {
    if (!group.includes(input) || group.length < 4 || group.length > 8) {
      return false;
    }

    const rects = group.map(field => field.getBoundingClientRect());
    const centers = rects.map(rect => rect.top + rect.height / 2);
    const tallestField = Math.max(...rects.map(rect => rect.height));
    const fieldsShareARow = Math.max(...centers) - Math.min(...centers) <= Math.max(12, tallestField);
    if (!fieldsShareARow) {
      return false;
    }

    const allExplicitlyOneCharacter = group.every(field => field.maxLength === 1);
    const allHaveNumericSemantics = group.every(field => {
      const pattern = field.pattern.toLowerCase();
      return (
        field.type === 'number' ||
        field.type === 'tel' ||
        field.inputMode === 'numeric' ||
        field.inputMode === 'decimal' ||
        pattern.includes('0-9') ||
        pattern.includes('\\d')
      );
    });

    // Requiring explicit one-character limits for non-standard lengths keeps
    // unrelated groups of short form fields from being mistaken for a code.
    return allExplicitlyOneCharacter || (group.length === 6 && allHaveNumericSemantics);
  }

  static isUsernameInput(input: HTMLInputElement) {
    const autocompleteTokens = input.autocomplete
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return isLoginIdentifier({
      type: input.type,
      autocompleteTokens,
      metadata: PageAnalyser.getInputMetadata(input),
      contextMetadata: PageAnalyser.getLoginContextMetadata(input),
      disabled: input.disabled,
      readOnly: input.readOnly,
      isSearch: PageAnalyser.isSearchInput(input),
      isOneTimeCode: PageAnalyser.isOneTimeCodeInput(input),
    });
  }

  static isSearchInput(input: HTMLInputElement) {
    if (input.type === 'search') {
      return true;
    }

    

    const searchMatchNames: string[] = ['search'];

    return PageAnalyser.inputFieldMatchesStrings(input, searchMatchNames);
  }

  

  static inputFieldMatchesStrings(input: HTMLInputElement, matchNames: string[]) {
    if (PageAnalyser.stringFuzzyContainsAny(input.id, matchNames)) {
      return true;
    }

    if (PageAnalyser.stringFuzzyContainsAny(input.name, matchNames)) {
      return true;
    }

    if (PageAnalyser.stringFuzzyContainsAny(input.autocomplete, matchNames)) {
      return true;
    }

    if (PageAnalyser.stringFuzzyContainsAny(input.placeholder, matchNames)) {
      return true;
    }

    if (PageAnalyser.stringFuzzyContainsAny(input.title, matchNames)) {
      return true;
    }

    if (input.ariaLabel && PageAnalyser.stringFuzzyContainsAny(input.ariaLabel, matchNames)) {
      return true;
    }

    

    const allLabels = this.getLabelsForInput(input);

    const labelMatch = allLabels.some(label => PageAnalyser.stringFuzzyContainsAny(label, matchNames));

    if (labelMatch) {
      return true;
    }

    

    for (let i = 0, atts = input.attributes, n = atts.length; i < n; i++) {
      const att = atts[i];

      if (att.nodeName.toLowerCase() == 'style') {
        
        continue;
      }

      if (att.nodeValue && PageAnalyser.stringFuzzyContainsAny(att.nodeValue, matchNames)) {
        

        return true;
      }
    }

    return false;
  }

  static getLabelsForInput(input: HTMLInputElement): string[] {
    const nativeLabels = Array.from(input.labels ?? []);

    const allLabels: string[] = nativeLabels.map(label => label.innerText);

    

    const prevElement = input.previousElementSibling;
    const nextElement = input.nextElementSibling;

    if (prevElement?.tagName === 'LABEL') {
      const label = prevElement as HTMLLabelElement;
      allLabels.push(label.innerText);
    }

    if (nextElement?.tagName === 'LABEL') {
      const label = nextElement as HTMLLabelElement;
      allLabels.push(label.innerText);
    }

    return allLabels;
  }

  static stringFuzzyContainsAny(string1: string, matches: string[]): boolean {
    if (string1 === undefined || string1 === null) {
      return false;
    }

    const result = matches.find(match => {
      return PageAnalyser.stringFuzzyContains(string1, match);
    });

    return result != undefined;
  }

  static stringFuzzyContains(string1: string, match: string) {
    const value1 = string1
      .replace(/(?:\r\n|\r|\n)/g, '')
      .trim()
      .toLowerCase();

    return value1.indexOf(match.toLowerCase()) !== -1;
  }

  static normalizeInputMetadata(value: string) {
    return value
      .normalize('NFKC')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  private static getInputMetadata(input: HTMLInputElement): string {
    const attributeValues = Array.from(input.attributes)
      .filter(attribute => attribute.name.toLowerCase() !== 'style')
      .map(attribute => attribute.value);

    return PageAnalyser.normalizeInputMetadata(
      [
        input.id,
        input.name,
        input.autocomplete,
        input.placeholder,
        input.title,
        input.ariaLabel ?? '',
        ...PageAnalyser.getLabelsForInput(input),
        ...attributeValues,
      ].join(' ')
    );
  }

  private static getLoginContextMetadata(input: HTMLInputElement): string {
    const scope = input.form ?? input.closest('main, [role="main"], [role="dialog"], section, article');
    if (!scope) return '';

    const descriptiveElements = Array.from(
      scope.querySelectorAll<HTMLElement>('h1, h2, h3, legend, button, [role="button"], input[type="submit"]')
    ).slice(0, 24);
    const scopeAttributes = ['id', 'name', 'action', 'aria-label', 'data-testid']
      .map(attribute => scope.getAttribute(attribute) ?? '')
      .filter(Boolean);
    const descriptiveText = descriptiveElements.map(element => {
      if (element.tagName === 'INPUT') return (element as HTMLInputElement).value;
      return element.innerText || element.textContent || '';
    });

    return PageAnalyser.normalizeInputMetadata([...scopeAttributes, ...descriptiveText].join(' '));
  }

  static isOneTimeCodeSiteException(input: HTMLInputElement) {
    const ownerDocument = input.ownerDocument;
    const { hostname, pathname } = ownerDocument.location;
    const normalizedPathname = pathname.replace(/\/+$/, '') || '/';
    const isInstagramTwoStepPage =
      (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) &&
      ['/accounts/login/two_step_verification', '/accounts/login/two_factor'].includes(normalizedPathname);

    if (!isInstagramTwoStepPage || input.autocomplete.toLowerCase() !== 'off') {
      return false;
    }

    const visibleCodeCandidates = Array.from(ownerDocument.querySelectorAll<HTMLInputElement>('input')).filter(candidate => {
      return (
        ['text', 'tel', 'number', 'password'].includes(candidate.type) &&
        candidate.offsetWidth > 0 &&
        candidate.offsetHeight > 0 &&
        !candidate.disabled &&
        !candidate.readOnly
      );
    });

    return visibleCodeCandidates.length === 1 && visibleCodeCandidates[0] === input;
  }

  static isInputVisible(element: HTMLInputElement) {
    let theEl: HTMLElement | null = element as HTMLElement;

    for (; theEl; ) {
      
      if (!!(theEl.offsetParent || theEl.offsetWidth || theEl.offsetHeight || theEl.getClientRects().length) === false) {
        
        return false;
      }

      const style = theEl.style;

      if ('none' === style.display || 'hidden' == style.visibility) {
        
        return false;
      }
      const computedStyle = getComputedStyle(theEl);
      if ('none' === computedStyle.display || 'hidden' == computedStyle.visibility) {
        
        return false;
      }

      theEl = theEl.parentElement;
    }

    return true;
  }

  static isInputInViewport(el: HTMLInputElement) {
    const rect = el.getBoundingClientRect();

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) /* or $(window).height() */ &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
    );
  }

  static async checkInputIsInViewPortUsingIntersectionObserver(targetField: HTMLInputElement) {
    return new Promise((resolve, reject) => {
      if (!targetField) {
        reject('');
      }

      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            resolve(true);
          } else {
            
            resolve(false);
          }

          observer.disconnect();
        });
      });

      observer.observe(targetField);
    });
  }
}
