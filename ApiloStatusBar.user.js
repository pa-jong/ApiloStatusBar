// ==UserScript==
// @name         Apilo: Status Bar Extender & Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Dodaje górna belkę z wybranymi statusami z listy zamówień / dodaje poświetlenie statusów na liście zamówień
// @author       Pa-Jong
// @match        https://elektrone.apilo.com/*

// @updateURL    https://pa-jong.github.io/ApiloStatusBar/update.json
// @downloadURL  https://pa-jong.github.io/ApiloStatusBar/ApiloStatusBar.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  /* ================= CONFIG ================= */

  const CONFIG = {
    containerId: 'apilo-status-buttons',
    styleId: 'apilo-status-style',
    highlightClass: 'apilo-status-highlight',
    highlightColor: '#fff7c0',
    statusPanelSelector: '.order-status-list-sticky',

    statuses: {
      highlight: ['46', '34'],
      buttons: [
        { id: 'create', text: 'Nowe', cls: 'primary', enabled: true },
        { id: '46', text: 'Odbiór osobisty', cls: 'warning', enabled: true },
        { id: '34', text: 'Wystawić dowód', cls: 'success', enabled: true },
        { id: '64', text: 'Do spakowania', cls: 'success', enabled: true },
        { id: '70', text: 'Do spakowania (dowód)', cls: 'success', enabled: true }
      ]
    }
  };

  /* ================= CSS ================= */

  function injectCSS() {
    if (document.getElementById(CONFIG.styleId)) return;

    const s = document.createElement('style');
    s.id = CONFIG.styleId;
    s.textContent = `
      /* kontener w normalnym layoucie */
      #${CONFIG.containerId}{
        display:flex;
        gap:6px;
        align-items:center;
        margin-left:12px;
        flex-wrap:wrap;
      }

      #${CONFIG.containerId} a{
        display:inline-flex;
        align-items:center;
        padding:5px 9px;
        border-radius:4px;
        font-size:13px;
        text-decoration:none;
        border:1px solid rgba(0,0,0,.12);
        background:#fff;
        color:#222;
        white-space:nowrap;
      }

      #${CONFIG.containerId} a.primary{background:#5867dd;color:#fff}
      #${CONFIG.containerId} a.warning{background:#ffb822;color:#222}
      #${CONFIG.containerId} a.success{background:#34bfa3;color:#fff}

      .${CONFIG.highlightClass}{
        background:${CONFIG.highlightColor} !important;
      }
      .${CONFIG.highlightClass} .text-truncate{
        font-weight:600;
      }

      @media (max-width:1200px){
        #${CONFIG.containerId}{
          margin-top:6px;
        }
      }
    `;
    document.head.appendChild(s);
  }

  /* ================= BUTTONS ================= */

  function buildHref(id) {
    return id === 'create'
      ? '/order/order/create/'
      : `/order/order/status/${id}/`;
  }

  function ensureButtons() {
    if (document.getElementById(CONFIG.containerId)) return;

    const menu = document.querySelector('#kt_header_menu');
    if (!menu) return;

    const container = document.createElement('div');
    container.id = CONFIG.containerId;

    CONFIG.statuses.buttons
      .filter(b => b.enabled)
      .forEach(btn => {
        const a = document.createElement('a');
        a.href = buildHref(btn.id);
        a.textContent = btn.text;
        a.className = btn.cls || '';
        container.appendChild(a);
      });

    // wpinamy ZA breadcrumbs
    const breadcrumbs = menu.querySelector('#breadcrumbs');
    if (breadcrumbs && breadcrumbs.parentNode) {
      breadcrumbs.parentNode.insertBefore(container, breadcrumbs.nextSibling);
    } else {
      menu.appendChild(container);
    }
  }

  /* ================= HIGHLIGHT ================= */

  function highlightStatuses() {
    const panel = document.querySelector(CONFIG.statusPanelSelector);
    if (!panel) return;

    panel.querySelectorAll('.' + CONFIG.highlightClass)
      .forEach(el => el.classList.remove(CONFIG.highlightClass));

    CONFIG.statuses.highlight.forEach(id => {
      const el =
        panel.querySelector(`[data-order-status-id="${id}"]`)?.closest('.order-status-list-element') ||
        panel.querySelector(`a[href*="/order/order/status/${id}/"]`)?.querySelector('.order-status-list-element');

      if (el) el.classList.add(CONFIG.highlightClass);
    });
  }

  /* ================= OBSERVER ================= */

  function observePanel() {
    const panel = document.querySelector(CONFIG.statusPanelSelector);
    if (!panel) return;

    let t;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(highlightStatuses, 150);
    });

    mo.observe(panel, { childList: true, subtree: true });
    highlightStatuses();
  }

  /* ================= INIT ================= */

  function init() {
    injectCSS();
    ensureButtons();
    highlightStatuses();
    observePanel();
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();

