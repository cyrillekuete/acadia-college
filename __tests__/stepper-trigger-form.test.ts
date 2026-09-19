import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  Stepper,
  StepperItem,
  StepperTrigger,
} from '@/components/ui/stepper';

function renderTrigger(type?: 'button' | 'submit') {
  return renderToStaticMarkup(
    createElement(
      'form',
      null,
      createElement(
        Stepper,
        { value: 1 },
        createElement(
          StepperItem,
          { step: 1 },
          createElement(
            StepperTrigger,
            type ? { type } : null,
            'Personal information',
          ),
        ),
      ),
    ),
  );
}

function firstButtonTag(html: string): string {
  const match = html.match(/<button\b[^>]*>/);
  if (!match) {
    throw new Error(`Expected a <button> in markup, got: ${html}`);
  }
  return match[0];
}

describe('StepperTrigger', () => {
  it('does not submit a wrapping form', () => {
    const button = firstButtonTag(renderTrigger());
    expect(button).toContain('type="button"');
  });

  it('stays a non-submit control even if type=submit is passed', () => {
    const button = firstButtonTag(renderTrigger('submit'));
    expect(button).toContain('type="button"');
    expect(button).not.toContain('type="submit"');
  });
});
