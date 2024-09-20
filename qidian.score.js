// ==UserScript==
// @name         qidian.score
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  起点推荐指数计算
// @author       Luke Pan
// @match        https://www.qidian.com/book/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=qidian.com
// ==/UserScript==

(function() {
  'use strict'

  const $ = document.querySelector.bind(document)
  const $$ = (selectors, parent = document) => Array.from(parent.querySelectorAll(selectors))
  
  const target = $('.count')
  const innerHTML = target.innerHTML
  let count, ref;
  
  [count, ref] = $$('em', target)

  count = count.innerHTML
  ref = ref.innerHTML

  const c10K = count.at(-1) === '万'
  const r10k = ref.at(-1) === '万'

  count = parseFloat(count.slice(0, -1))
  if (c10K) { count *= 10000 }
  ref = parseFloat(ref.slice(0, -1))
  if (r10k) { ref *= 10000 }

  let index = 1000000 / count * ref / 10000

  if (isNaN(index)) { index = 0 }

  target.innerHTML = innerHTML + ' ' +
  `<em>${ index.toFixed(2) }</em><cite>推荐指数</cite>`
})()