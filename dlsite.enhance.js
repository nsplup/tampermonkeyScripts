// ==UserScript==
// @name         dlsite.enhance
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  dlsite 功能增强
// @author       Luke Pan
// @match        https://*.dlsite.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dlsite.com
// @noframes
// ==/UserScript==

(function() {
  'use strict'

  const style = document.createElement('style')
  const CSSText = `
    #work_name {
      user-select: unset !important;
    }
  `
  style.innerHTML = CSSText
  document.head.appendChild(style)
})()