'use client';

import { Languages } from 'lucide-react';
import { LanguageSelect } from 'fumadocs-ui/layouts/shared/slots/language-select';
import { ThemeSwitch } from 'fumadocs-ui/layouts/shared/slots/theme-switch';

const iconButton =
  'inline-flex size-8 items-center justify-center rounded-md text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground';

export function DocsSidebarLanguageButton() {
  return (
    <div className="flex justify-end pe-1">
      <LanguageSelect className={iconButton} variant="ghost">
        <Languages className="size-4.5" />
      </LanguageSelect>
    </div>
  );
}

export function DocsSidebarFooter() {
  return (
    <div className="dbx-docs-sidebar-footer">
      <div className="dbx-docs-sidebar-tools justify-end">
        <ThemeSwitch mode="light-dark" className="dbx-docs-theme-switch" />
      </div>
    </div>
  );
}
