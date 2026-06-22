import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppUI } from './AppUI';

export function initUI() {
    const rootEl = document.getElementById('ui-root');
    if (rootEl) {
        const root = createRoot(rootEl);
        root.render(<AppUI />);
        console.log('[xianxia-td] React UI layer initialized.');
    }
}
