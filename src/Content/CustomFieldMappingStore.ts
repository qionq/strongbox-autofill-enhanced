import browser from 'webextension-polyfill';
import { CustomFieldReference } from '../Messaging/Protocol/SingleFieldFillRequest';

export interface InputFieldDescriptor {
  type: string;
  name: string;
  id: string;
  autocomplete: string;
  ariaLabel: string;
  placeholder: string;
  labels: string[];
  formAction: string;
  fallbackIndex: number;
}

export interface CustomFieldMapping {
  origin: string;
  fieldIdentity: string;
  field: InputFieldDescriptor;
  databaseId: string;
  credentialUuid: string;
  customFieldKey: string;
  updatedAt: number;
}

const storageKey = 'custom-field-mappings.v1';
const maximumMappingCount = 250;

export class CustomFieldMappingStore {
  static describeInput(input: HTMLInputElement): InputFieldDescriptor {
    const ownerDocument = input.ownerDocument;
    const pageUrl = ownerDocument.defaultView?.location.href ?? '';
    const inputs = Array.from(ownerDocument.querySelectorAll<HTMLInputElement>('input'));

    return {
      type: this.normalize(input.type || 'text'),
      name: this.normalize(input.name),
      id: this.normalize(input.id),
      autocomplete: this.normalize(input.autocomplete),
      ariaLabel: this.normalize(input.getAttribute('aria-label') ?? ''),
      placeholder: this.normalize(input.placeholder),
      labels: Array.from(input.labels ?? []).map(label => this.normalize(label.innerText)).filter(Boolean),
      formAction: this.normalizeFormAction(input.form?.action, pageUrl),
      fallbackIndex: Math.max(inputs.indexOf(input), 0),
    };
  }

  static getFieldIdentity(field: InputFieldDescriptor): string {
    const suffix = `type:${field.type}|form:${field.formAction}`;

    if (field.name) return `name:${field.name}|${suffix}`;
    if (field.id) return `id:${field.id}|${suffix}`;
    if (field.autocomplete && field.autocomplete !== 'off') return `autocomplete:${field.autocomplete}|label:${field.labels[0] ?? ''}|${suffix}`;
    if (field.ariaLabel) return `aria:${field.ariaLabel}|${suffix}`;
    if (field.labels.length > 0) return `label:${field.labels[0]}|${suffix}`;
    if (field.placeholder) return `placeholder:${field.placeholder}|${suffix}`;

    return `index:${field.fallbackIndex}|${suffix}`;
  }

  static scoreCandidate(expected: InputFieldDescriptor, candidate: InputFieldDescriptor): number {
    if (expected.type && candidate.type && expected.type !== candidate.type) return -1;
    if (expected.formAction && candidate.formAction && expected.formAction !== candidate.formAction) return -1;

    let score = 0;
    let stableMatch = false;

    if (expected.name && expected.name === candidate.name) {
      score += 100;
      stableMatch = true;
    }
    if (expected.id && expected.id === candidate.id) {
      score += 90;
      stableMatch = true;
    }
    if (expected.autocomplete && expected.autocomplete !== 'off' && expected.autocomplete === candidate.autocomplete) {
      score += 45;
      stableMatch = true;
    }
    if (expected.ariaLabel && expected.ariaLabel === candidate.ariaLabel) {
      score += 40;
      stableMatch = true;
    }
    if (expected.placeholder && expected.placeholder === candidate.placeholder) {
      score += 30;
      stableMatch = true;
    }
    if (expected.labels.some(label => candidate.labels.includes(label))) {
      score += 45;
      stableMatch = true;
    }
    if (expected.formAction && expected.formAction === candidate.formAction) score += 20;
    if (expected.fallbackIndex === candidate.fallbackIndex) score += 10;

    return stableMatch || score >= 30 ? score : -1;
  }

  static async remember(input: HTMLInputElement, pageUrl: string, reference: CustomFieldReference): Promise<void> {
    const origin = this.getOrigin(pageUrl);
    if (!origin || !reference.fieldKey) return;

    const field = this.describeInput(input);
    const fieldIdentity = this.getFieldIdentity(field);
    const mappings = await this.getAll();
    const retained = mappings.filter(mapping => !(mapping.origin === origin && mapping.fieldIdentity === fieldIdentity));

    retained.push({
      origin,
      fieldIdentity,
      field,
      databaseId: reference.databaseId,
      credentialUuid: reference.credentialUuid,
      customFieldKey: reference.fieldKey,
      updatedAt: Date.now(),
    });

    const bounded = retained.sort((left, right) => right.updatedAt - left.updatedAt).slice(0, maximumMappingCount);
    await browser.storage.local.set({ [storageKey]: bounded });
  }

  static async getMappingForInput(input: HTMLInputElement, pageUrl: string): Promise<CustomFieldMapping | undefined> {
    const origin = this.getOrigin(pageUrl);
    const descriptor = this.describeInput(input);
    const identity = this.getFieldIdentity(descriptor);
    const mappings = (await this.getAll()).filter(mapping => mapping.origin === origin);

    return mappings.find(mapping => mapping.fieldIdentity === identity) ?? mappings.find(mapping => this.scoreCandidate(mapping.field, descriptor) >= 70);
  }

  static async getMappingsForCredential(pageUrl: string, databaseId: string, credentialUuid: string): Promise<CustomFieldMapping[]> {
    const origin = this.getOrigin(pageUrl);
    return (await this.getAll()).filter(mapping => mapping.origin === origin && mapping.databaseId === databaseId && mapping.credentialUuid === credentialUuid);
  }

  static findInput(mapping: CustomFieldMapping, ownerDocument: Document = document): HTMLInputElement | null {
    const candidates = Array.from(ownerDocument.querySelectorAll<HTMLInputElement>('input')).filter(input => {
      const isVisible = Boolean(input.offsetWidth || input.offsetHeight || input.getClientRects().length);
      return !input.disabled && !input.readOnly && input.type !== 'hidden' && isVisible;
    });

    const ranked = candidates
      .map(input => ({ input, score: this.scoreCandidate(mapping.field, this.describeInput(input)) }))
      .filter(candidate => candidate.score >= 70)
      .sort((left, right) => right.score - left.score);

    return ranked[0]?.input ?? null;
  }

  static async count(): Promise<number> {
    return (await this.getAll()).length;
  }

  static async clearAll(): Promise<void> {
    await browser.storage.local.remove(storageKey);
  }

  private static async getAll(): Promise<CustomFieldMapping[]> {
    const result = await browser.storage.local.get(storageKey);
    const mappings = result[storageKey];

    if (!Array.isArray(mappings)) return [];

    return mappings.filter(mapping => {
      return Boolean(mapping?.origin && mapping?.fieldIdentity && mapping?.databaseId && mapping?.credentialUuid && mapping?.customFieldKey && mapping?.field);
    });
  }

  private static getOrigin(pageUrl: string): string {
    try {
      return new URL(pageUrl).origin.toLocaleLowerCase();
    } catch (_error) {
      return '';
    }
  }

  private static normalize(value: string): string {
    return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  }

  private static normalizeFormAction(action: string | undefined, pageUrl: string): string {
    try {
      const url = new URL(action || pageUrl, pageUrl);
      return `${url.origin}${url.pathname}`.toLocaleLowerCase();
    } catch (_error) {
      return '';
    }
  }
}
