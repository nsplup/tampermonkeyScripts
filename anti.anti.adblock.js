// ==UserScript==
// @name         anti.anti.adblock
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  反【反广告屏蔽】
// @author       Luke Pan
// @match        */*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @noframes
// ==/UserScript==

(function() {
  'use strict';

  const ROOTS = [
    'body',
  ]
  const TARGET_CLASSNAME = [
    'protection',
  ]
  const MASKS = [
    '#protection'
  ]

  /** 移除与反反广告屏蔽相关的 className */
  ROOTS.forEach(selectors => {
    const root = document.querySelector(selectors)

    if (root) {
      root.classList.remove(...TARGET_CLASSNAME)
    }
  })

  /** 移除与反反广告屏蔽相关的遮罩层 */
  MASKS.forEach(selectors => {
    const mask = document.querySelector(selectors)

    if (mask) {
      const parent = mask.parentNode
  
      parent.removeChild(mask)
    }
  })
})();