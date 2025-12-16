// ==UserScript==
// @name         Apilo: Status Bar Extender & Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Dodaje górna belkę z wybranymi statusami z listy zamówień / dodaje poświetlenie statusów na liście zamówień
// @author       Pa-Jong
// @match        https://elektrone.apilo.com/*
// @require      https://pa-jong.github.io/ApiloStatusBar/ApiloStatusBar.user.js
// @updateURL    https://pa-jong.github.io/ApiloStatusBar/update.json
// @downloadURL  https://pa-jong.github.io/ApiloStatusBar/ApiloStatusBar.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==


(function () {
  'use strict';

  /* ================= CONFIG ================= */

  const CONFIG = {
    highlightColor: '#fff7c0',
    containerId: 'apilo-center-container',
    styleId: 'apilo-status-style',
    highlightClass: 'apilo-status-highlight',
    statusPanelSelector: '.order-status-list-sticky',

    statuses: {
      highlight: ['46', '34'],
      buttons: [
        { id: 'create', text: 'Nowe', cls: 'primary', enabled: false },
        { id: '46', text: 'Odbiór osobisty', cls: 'warning', enabled: false },
        { id: '34', text: 'Wystawić dowód', cls: 'success', enabled: false },
        { id: '64', text: 'Do spakowania', cls: 'success', enabled: true },
        { id: '70', text: 'Do spakowania (dowód)', cls: 'success', enabled: true }
      ]
    }
  };

  /* ================= CSS ================= */

  function injectCSS() {
    if (document.getElementById(CONFIG.styleId)) return;

    const style = document.createElement('style');
    style.id = CONFIG.styleId;
    style.textContent = `
      #${CONFIG.containerId}{
        position:absolute;
        left:50%;
        top:50%;
        transform:translate(-50%,-50%);
        display:flex;
        gap:8px;
        z-index:100;
        white-space:nowrap;
      }

      #${CONFIG.containerId} a{
        display:inline-flex;
        align-items:center;
        padding:6px 10px;
        border-radius:4px;
        font-size:13px;
        text-decoration:none;
        border:1px solid rgba(0,0,0,.1);
        background:#fff;
        color:#222;
      }

      #${CONFIG.containerId} a.primary{
        background:#5867dd;
        color:#fff;
      }

      #${CONFIG.containerId} a.warning{
        background:#ffb822;
        color:#222;
      }

      #${CONFIG.containerId} a.success{
        background:#34bfa3;
        color:#fff;
      }

      .${CONFIG.highlightClass}{
        background:${CONFIG.highlightColor} !important;
      }

      .${CONFIG.highlightClass} .text-truncate{
        font-weight:600;
      }

      @media (max-width:900px){
        #${CONFIG.containerId}{
          transform:translate(-50%,-50%) scale(.95);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ================= BUTTONS ================= */

  function buildHref(id) {
    return id === 'create'
      ? '/order/order/create/'
      : `/order/order/status/${id}/`;
  }

  function ensureButtons() {
    const header = document.getElementById('kt_header') || document.querySelector('.kt-header');
    if (!header) return;

    if (getComputedStyle(header).position === 'static') {
      header.style.position = 'relative';
    }

    let container = document.getElementById(CONFIG.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = CONFIG.containerId;
      header.appendChild(container);
    }

    if (container.children.length) return;

    CONFIG.statuses.buttons
      .filter(b => b.enabled)
      .forEach(btn => {
        const a = document.createElement('a');
        a.href = buildHref(btn.id);
        a.textContent = btn.text;
        a.className = btn.cls || '';
        a.dataset.apiloButtonId = btn.id;
        container.appendChild(a);
      });
  }

  /* ================= HIGHLIGHT ================= */

  function highlightStatuses() {
    const panel = document.querySelector(CONFIG.statusPanelSelector);
    if (!panel) return;

    panel
      .querySelectorAll('.' + CONFIG.highlightClass)
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

    let t = null;
    const observer = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(highlightStatuses, 150);
    });

    observer.observe(panel, { childList: true, subtree: true });
    highlightStatuses();
  }

  /* ================= INIT ================= */

  function init() {
    injectCSS();
    ensureButtons();
    highlightStatuses();
    observePanel();

    let tries = 0;
    const iv = setInterval(() => {
      ensureButtons();
      highlightStatuses();
      if (++tries > 10) clearInterval(iv);
    }, 400);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();

})();
