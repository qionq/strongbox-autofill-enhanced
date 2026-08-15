import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import { PageAnalyser } from './PageAnalyser';
import { CustomFieldMappingStore } from './CustomFieldMappingStore';

export class AutoFiller {
  async doIt(
    credential: AutoFillCredential,
    inlineFieldInitiator: HTMLInputElement | null = null,
    inlineFieldInitiatorIsPassword = false,
    fillMultiple = false,
    onlyEmptyFields = false
  ): Promise<boolean> {
    const usernames = await PageAnalyser.getAllUsernameInputs();
    const passwords = await PageAnalyser.getAllPasswordInputs();
    const customFieldMappings = await CustomFieldMappingStore.getMappingsForCredential(document.location.href, credential.databaseId, credential.uuid);
    const claimedCustomInputs = new Set<HTMLInputElement>();
    const customFieldTargets = customFieldMappings.flatMap(mapping => {
      const input = CustomFieldMappingStore.findInput(mapping);
      if (input === null || claimedCustomInputs.has(input)) return [];

      claimedCustomInputs.add(input);
      return [{ mapping, input }];
    });
    const customInputs = new Set(customFieldTargets.map(target => target.input));
    const initiatorIsCustomField = inlineFieldInitiator !== null && customInputs.has(inlineFieldInitiator);
    const initiatorIsUsername = inlineFieldInitiator !== null && PageAnalyser.isUsernameInput(inlineFieldInitiator);

    let filledSomething = false;

    if (credential.username.length > 0) {
      if (inlineFieldInitiator !== null && initiatorIsUsername && !inlineFieldInitiatorIsPassword && !initiatorIsCustomField) {
        if (!onlyEmptyFields || inlineFieldInitiator.value.length === 0) {
          await this.fillFieldAndAnimate(inlineFieldInitiator, credential.username);
          filledSomething = true;
        }
      } else {
        for (const usernameField of usernames) {
          if (customInputs.has(usernameField) || (onlyEmptyFields && usernameField.value.length > 0)) continue;

          await this.fillFieldAndAnimate(usernameField, credential.username);
          filledSomething = true;

          if (!fillMultiple) {
            break;
          }
        }
      }
    }

    if (credential.password.length > 0) {
      if (inlineFieldInitiator !== null && inlineFieldInitiatorIsPassword && !initiatorIsCustomField) {
        if (!onlyEmptyFields || inlineFieldInitiator.value.length === 0) {
          await this.fillFieldAndAnimate(inlineFieldInitiator, credential.password);
          filledSomething = true;
        }
      } else {
        for (const passwordField of passwords) {
          if (customInputs.has(passwordField) || (onlyEmptyFields && passwordField.value.length > 0)) continue;

          await this.fillFieldAndAnimate(passwordField, credential.password);
          filledSomething = true;

          if (!fillMultiple) {
            break;
          }
        }
      }
    }

    if (inlineFieldInitiator === null && usernames.length === 0 && passwords.length === 0) {
      const oneTimeCodeFields = (await PageAnalyser.getAllOneTimeCodeInputs()).filter(field => !customInputs.has(field));
      const currentTotp = AutoFillCredential.getCurrentTotpCode(credential, false);

      if (currentTotp) {
        const segmentedFields = oneTimeCodeFields[0]
          ? PageAnalyser.getSegmentedOneTimeCodeInputs(oneTimeCodeFields[0])
          : [];
        const candidateTargets = segmentedFields.length > 0 ? segmentedFields : oneTimeCodeFields.length === 1 ? oneTimeCodeFields : [];
        const targets = onlyEmptyFields && candidateTargets.some(field => field.value.length > 0) ? [] : candidateTargets;

        if (targets.length > 0) {
          filledSomething = (await this.doItOneTimeCode(currentTotp, targets)) || filledSomething;
        }
      }
    }

    for (const target of customFieldTargets) {
      const customField = AutoFillCredential.getCustomField(credential, target.mapping.customFieldKey);
      if (!customField || (onlyEmptyFields && target.input.value.length > 0)) continue;

      await this.fillFieldAndAnimate(target.input, customField.value);
      filledSomething = true;
    }

    return filledSomething;
  }

  async doItSingleField(text: string, inlineFieldInitiator: HTMLInputElement, appendValue = false): Promise<void> {
    await this.fillFieldAndAnimate(inlineFieldInitiator, text, appendValue);
  }

  async doItOneTimeCode(text: string, fields: HTMLInputElement[]): Promise<boolean> {
    const normalizedCode = text.replace(/[\s-]/g, '');
    if (fields.length === 0 || normalizedCode.length < fields.length) {
      return false;
    }

    if (fields.length === 1) {
      await this.fillFieldAndAnimate(fields[0], normalizedCode);
      return true;
    }

    for (let index = 0; index < fields.length; index += 1) {
      await this.fillFieldAndAnimate(fields[index], normalizedCode[index]);
    }

    return true;
  }

  private async fillFieldAndAnimate(field: HTMLInputElement, value: string, appendValue = false) {
    await this.fillField(field, value, appendValue);

    field.classList.add('com-phoebecode-strongbox-autofill-animated');

    setTimeout(function () {
      if (field) {
        field.classList.remove('com-phoebecode-strongbox-autofill-animated');
      }
    }, 500);
  }

  private getKeyboardEvent(field: HTMLInputElement, eventName: string, key: string) {
    const KeyboardEventConstructor = field.ownerDocument.defaultView?.KeyboardEvent ?? KeyboardEvent;
    return new KeyboardEventConstructor(eventName, {
      bubbles: true,
      cancelable: false,
      key,
    });
  }

  private async fillField(field: HTMLInputElement, value: string, appendValue = false) {
    const fieldWindow = field.ownerDocument.defaultView ?? window;
    const MouseEventConstructor = fieldWindow.MouseEvent;
    const FocusEventConstructor = fieldWindow.FocusEvent;
    const InputEventConstructor = fieldWindow.InputEvent;
    const EventConstructor = fieldWindow.Event;
    const clickEvent = new MouseEventConstructor('click', {
      bubbles: true,
      cancelable: true,
      view: fieldWindow,
    });

    clickEvent.stopPropagation();

    field.dispatchEvent(clickEvent);
    field.focus();

    // Let React-style focus handlers settle before changing a controlled input.
    // This event order follows the compatibility work in KeePassXC-Browser's fill.js.
    await Promise.resolve();

    field.dispatchEvent(new FocusEventConstructor('focus', { bubbles: false, cancelable: false }));
    field.dispatchEvent(new FocusEventConstructor('focusin', { bubbles: true, cancelable: false }));

    const nextValue = appendValue ? field.value + value : value;
    field.dispatchEvent(this.getKeyboardEvent(field, 'keydown', nextValue));
    field.dispatchEvent(new InputEventConstructor('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: nextValue }));
    field.dispatchEvent(this.getKeyboardEvent(field, 'keypress', nextValue));

    const inputPrototype = fieldWindow.HTMLInputElement.prototype;
    const nativeValueSetter = Object.getOwnPropertyDescriptor(inputPrototype, 'value')?.set;
    if (nativeValueSetter) {
      nativeValueSetter.call(field, nextValue);
    } else {
      field.value = nextValue;
    }

    field.dispatchEvent(new InputEventConstructor('input', { bubbles: true, cancelable: false, inputType: 'insertText', data: nextValue }));
    field.dispatchEvent(this.getKeyboardEvent(field, 'keyup', nextValue));
    field.dispatchEvent(new EventConstructor('change', { bubbles: true, cancelable: false }));
  }
}
