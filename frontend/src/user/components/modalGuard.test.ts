import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import {
  NESTED_MODAL_MESSAGE,
  __resetModalGuard,
  noteModalClosed,
  noteModalOpened,
  openModalCount,
} from './modalGuard.js';

test('modal guard reports a second modal opened while one is open', () => {
  const reports: string[] = [];
  __resetModalGuard((message) => reports.push(message));
  assert.equal(noteModalOpened(), true);
  assert.deepEqual(reports, []);
  assert.equal(noteModalOpened(), false, 'a second open modal is refused');
  assert.deepEqual(reports, [NESTED_MODAL_MESSAGE]);
  noteModalClosed();
  noteModalClosed();
  assert.equal(openModalCount(), 0);
  assert.equal(noteModalOpened(), true, 'one at a time is fine again');
  __resetModalGuard();
});

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return tsxFiles(path);
    return path.endsWith('.tsx') ? [path] : [];
  });
}

test('no screen renders a modal inside an AppModal (native cannot stack modals)', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const offenders: string[] = [];
  for (const file of tsxFiles(root)) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes('<AppModal')) continue;
    let depth = 0;
    // Components that render their own AppModal count as modals too.
    const tokens = source.matchAll(/<\/AppModal>|<(AppModal|InfoModal|TermsModal|PrivacyModal|HelpModal|FilterModal|PlanPicker)\b/g);
    for (const match of tokens) {
      if (match[0] === '</AppModal>') { depth -= 1; continue; }
      if (depth > 0) offenders.push(`${file}: <${match[1]}> inside an open <AppModal>`);
      if (match[1] === 'AppModal') depth += 1;
    }
  }
  assert.deepEqual(offenders, []);
});

test('Account sub-pages share one AppModal; editors and confirmations are in-tree layers', () => {
  const source = readFileSync(new URL('../screens/ProfileScreen.tsx', import.meta.url), 'utf8');
  assert.equal(source.match(/<AppModal\b/g)?.length, 1);
  assert.ok(source.includes('<InlineDialog visible={deleteOpen}>'));
  assert.ok(source.includes('<SlideLayer visible={healthOverviewOpen}'));
});
