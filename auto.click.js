// ==UserScript==
// @name         auto.click
// @namespace    http://tampermonkey.net/
// @version      0.0.1
// @description  自动点击
// @author       Luke Pan
// @match        */*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// ==/UserScript==

(function() {
  'use strict';
  const $ = document.querySelector.bind(document)

  const DEBUG_MODE = false
  const PATTERN = {
    'dlsite.com': [
      {
        query: '.lang_select_item a', /** 语言选择：日语 */
        pre: () => !location.search.includes('locale') /** 防止循环点击 */
      },
      {
        query: '.btn_yes a', /** 成人确认 */
      },
    ],
    'javdb.com': [
      {
        query: '[href*="/over18"]', /** 成人确认 */
      }
    ]
  }

  const PATTERN_ENTRIES = Object.entries(PATTERN)
  for (let i = 0, len = PATTERN_ENTRIES.length; i < len; i++) {
    let [site, rules] = PATTERN_ENTRIES[i]
    if (location.origin.includes(site)) {
      rules = rules.reduce((prev, current) => {
        const { query } = current
        const el = $(query)

        current.el = el ? el : null
        prev.push(current)

        return prev
      }, [])
      let task = Promise.resolve()

      const step = rule => new Promise((res, rej) => {
        const { query, el, pre } = rule
        const preVal = typeof pre === 'function' ? pre() : null
        if (pre === undefined || pre === null || preVal) {
          el && el.click && el.click()
        }
        DEBUG_MODE && console.table({
          query,
          hasEl: !!el,
          'callable': el && typeof el.click === 'function',
          preVal
        })
        setTimeout(res, 300)
      })
      rules.forEach(rule => {
        task = task.then(step.bind(null, rule))
      })
      break
    }
  }
})();