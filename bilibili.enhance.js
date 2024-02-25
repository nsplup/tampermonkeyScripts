// ==UserScript==
// @name         bilibili.enhance
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  bilibili 功能增强
// @author       Luke Pan
// @match        https://*.bilibili.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// ==/UserScript==

(function() {
  'use strict'

  /** 隐藏交互弹幕 */
  if (location.pathname.startsWith('/video')) {
    const style = document.createElement('style')
    const CSSText = `
      .bili-guide,
      .bili-vote,
      .bili-score {
        display: none !important;
        visibility: hidden !important;
        z-index: -1 !important;
        position: absolute !important;
        left: -100% !important;
        top: -100% !important;
      }
    `
    style.innerHTML = CSSText
    document.head.appendChild(style)
  }
})()