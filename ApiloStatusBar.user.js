// ==UserScript==
// @name         Apilo: Status Bar Extender & Highlighter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Dodaje górna belkę z wybranymi statusami z listy zamówień / dodaje poświetlenie statusów na liście zamówień
// @author       Pa-Jong
// @match        https://elektrone.apilo.com/*
// @require      https://pa-jong.github.io/ApiloStatusBar/ApiloStatusBar.user.js
// @updateURL    https://pa-jong.github.io/ApiloStatusBar/update.json
// @downloadURL  https://pa-jong.github.io/ApiloStatusBar/ApiloStatusBar.user.js
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function(){
  'use strict';

  /* --- KONFIGURACJA --- */
  const HIGHLIGHT_COLOR = '#fff7c0';
  const STATUS_IDS = ['46','34']; // które statusy podświetlać (możesz dodać inne)
  const BUTTONS = [
    { href: '/order/order/create/', text: 'Nowe', cls: 'apilo-btn--primary' },
    { href: '/order/order/status/46/', text: 'Odbiór osobisty', cls: 'apilo-btn--warning' },
    { href: '/order/order/status/34/', text: 'Wystawić dowód', cls: 'apilo-btn--success' },
  //  { href: '/order/order/status/64/', text: 'Do spakowania', cls: 'apilo-btn--success' },
  //  { href: '/order/order/status/70/', text: 'Do spakowania (dowód)', cls: 'apilo-btn--success' },
  ];
  /* --------------------- */

  // Unikalne id/klasy aby nic nie nadpisywać
  const STYLE_ID = 'apilo-combined-style-v2';
  const CONTAINER_ID = 'apilo-center-container';
  const HIGHLIGHT_CLASS = 'apilo-order-pickup-highlight';
  const STATUS_PANEL_SELECTOR = '.order-status-list-sticky';

  // Wstrzyknięcie CSS (jednokrotnie)
  function injectCSS(){
    if(document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      /* center container in header */
      #${CONTAINER_ID}{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;display:flex;gap:8px;align-items:center;white-space:nowrap}
      #${CONTAINER_ID} .apilo-btn{display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:4px;border:1px solid rgba(0,0,0,0.08);background:#fff;text-decoration:none;font-size:13px;color:#222}
      #${CONTAINER_ID} .apilo-btn--primary{background:#5867dd;color:#fff}
      #${CONTAINER_ID} .apilo-btn--warning{background:#ffb822;color:#222}
      #${CONTAINER_ID} .apilo-btn--success{background:#34bfa3;color:#fff}
      .${HIGHLIGHT_CLASS}{background:${HIGHLIGHT_COLOR} !important}
      .${HIGHLIGHT_CLASS} .text-truncate { font-weight:600; }
      @media (max-width:900px){#${CONTAINER_ID}{transform:translate(-50%,-50%) scale(0.92);gap:6px}#${CONTAINER_ID} .apilo-btn{padding:5px 8px;font-size:12px}}
    `;
    document.head.appendChild(s);
  }

  // Utworzenie kontenera i przycisków (bez efektów ubocznych)
  function ensureCenterButtons(){
    const header = document.getElementById('kt_header') || document.querySelector('.kt-header');
    if(!header) return false;
    if(getComputedStyle(header).position === 'static') header.style.position = 'relative';
    let container = document.getElementById(CONTAINER_ID);
    if(!container){
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      header.appendChild(container);
    }
    // dodaj przyciski tylko jeśli nie ma
    if(container.querySelector('.apilo-btn')) return true;
    for(const b of BUTTONS){
      const a = document.createElement('a');
      a.href = b.href;
      a.className = 'apilo-btn ' + (b.cls || '');
      a.textContent = b.text;
      container.appendChild(a);
    }
    return true;
  }

  // Znajdź i podświetl elementy statusu w panelu statusów
  function highlightStatusPanelOnce(root = document){
    const panel = (root.querySelector(STATUS_PANEL_SELECTOR) || document.querySelector(STATUS_PANEL_SELECTOR));
    if(!panel) return false;
    // najpierw usuń stare (ale tylko te z naszej klasy)
    panel.querySelectorAll('.' + HIGHLIGHT_CLASS).forEach(el => el.classList.remove(HIGHLIGHT_CLASS));
    // dla każdego data-order-status-id w STATUS_IDS zaznacz kontener nadrzędny .order-status-list-element (lub link)
    let any = false;
    for(const id of STATUS_IDS){
      const badge = panel.querySelector(`[data-order-status-id="${id}"]`);
      if(badge){
        const el = badge.closest('.order-status-list-element') || badge.closest('a') || badge.closest('div');
        if(el){
          el.classList.add(HIGHLIGHT_CLASS);
          any = true;
        }
      } else {
        // fallback: link href
        const link = panel.querySelector(`a[href*="/order/order/status/${id}/"]`);
        if(link){
          const el = link.querySelector('.order-status-list-element') || link;
          if(el){
            el.classList.add(HIGHLIGHT_CLASS);
            any = true;
          }
        } else {
          // jeszcze fallback: wyszukaj tekst w panelu
          const textMatch = Array.from(panel.querySelectorAll('.order-status-list-element, .order-status-list-element *')).find(n=>{
            const t=(n.textContent||'').toLowerCase();
            return t.includes('oczekuje na odbiór') && id==='46' || (id==='34' && t.includes('wystawić dowód'));
          });
          if(textMatch){
            const el = textMatch.closest('.order-status-list-element') || textMatch;
            el.classList.add(HIGHLIGHT_CLASS);
            any = true;
          }
        }
      }
    }
    return any;
  }

  // Observer ograniczony tylko do panelu statusów — debounced
  function observeStatusPanel(){
    const panel = document.querySelector(STATUS_PANEL_SELECTOR);
    if(!panel){
      // spróbuj ponownie krótko jeśli panel ładuje się dynamicznie
      let tries = 0;
      const iv = setInterval(()=>{
        tries++;
        const p = document.querySelector(STATUS_PANEL_SELECTOR);
        if(p){ clearInterval(iv); attachObserver(p); }
        if(tries>12) clearInterval(iv);
      }, 500);
      return;
    }
    attachObserver(panel);
  }

  function attachObserver(panel){
    // jednorazowe uruchomienie
    highlightStatusPanelOnce(panel);
    // lekki debounced observer
    const deb = (function(){
      let t=null;
      return ()=>{
        if(t) clearTimeout(t);
        t = setTimeout(()=>{ t=null; highlightStatusPanelOnce(panel); }, 200);
      };
    })();
    try{
      const mo = new MutationObserver(()=> deb());
      mo.observe(panel, { childList:true, subtree:true });
      // opcjonalnie rozłącz po 60s — można usunąć timeout jeśli chcesz long-run obserwatora
      setTimeout(()=>{ try{ mo.disconnect(); }catch(e){} }, 60000);
    }catch(e){
      // jeśli observer nie może być ustawiony, wykonujemy pojedyncze podświetlenie
      highlightStatusPanelOnce(panel);
    }
  }

  // Inicjalizacja: wstrzyknięcie CSS, przyciski, statusy — uruchamiane kilka razy krótko aby złapać asynchroniczne ładowanie
  function init(){
    injectCSS();
    ensureCenterButtons();
    highlightStatusPanelOnce();
    observeStatusPanel();

    // Kilka krótkich prób (żeby złapać moment gdy header lub panel dopiero się renderuje)
    let attempts = 0;
    const max = 10;
    const iv = setInterval(()=>{
      attempts++;
      ensureCenterButtons();
      highlightStatusPanelOnce();
      if(attempts>=max) clearInterval(iv);
    }, 500);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
