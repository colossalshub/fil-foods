import assert from 'node:assert/strict';
import test from 'node:test';
import { colors, font, touch } from './theme.js';

function luminance(hex: string) {
  const channels = hex.match(/[0-9a-f]{2}/gi);
  assert.ok(channels);
  const rgb = channels.map((channel) => Number.parseInt(channel, 16) / 255);
  const linear = rgb.map((value) => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('shared theme uses the USR-48 palette', () => {
  assert.equal(colors.primary, '#174D3A');
  assert.equal(colors.soft, '#E9F0E6');
  assert.equal(colors.background, '#FFF8E9');
  assert.equal(colors.accent, '#E9A23B');
  assert.equal(colors.text, '#343A35');
  assert.equal(colors.white, '#FFFFFF');
});

test('primary controls and body text meet WCAG AA contrast on app surfaces', () => {
  for (const background of [colors.background, colors.soft, colors.white]) {
    assert.ok(contrastRatio(colors.primary, background) >= 4.5);
    assert.ok(contrastRatio(colors.text, background) >= 4.5);
  }
});

test('default body text and interactive target sizes meet accessibility minimums', () => {
  assert.ok(font.body >= 16);
  assert.ok(touch.min >= 48);
  assert.notEqual(colors.success, colors.danger);
  assert.notEqual(colors.warning, colors.danger);
});
