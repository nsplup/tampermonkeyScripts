// ==UserScript==
// @name         drive.code.free.enhance
// @namespace    http://tampermonkey.net/
// @version      0.0.5
// @description  drive.code.free 增强
// @author       Luke Pan
// @match        */*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// ==/UserScript==

(function() {
  'use strict';
  const $$ = (selectors, parent = document) => Array.from(parent.querySelectorAll(selectors))

  const DEBUG_MODE = false

  const styleString = 'position: absolute; opacity: 0; z-index: -1;'

  const HIFINI = 'hifini\\.com\\/thread\\-\\d+\\.htm'
  const ACGJC = 'acgjc\\.com\\/storage\\-download\\/\\?code\\='
  const SCRIPTS = {
    iframe: () => {
      const iExtractCode = (iframe, id) => {
        const parent = iframe.parentNode
        const iframeDocument = iframe.contentDocument || iframe.contentWindow.document
        const iframeBody = iframeDocument.body
        let content = []
    
        Array.from(iframeBody.children)
          .forEach(child => {
            const computedStyle = window.getComputedStyle(child)
            const isHidden = computedStyle.display === 'none' || computedStyle.visibility === 'hidden'
            !isHidden && content.push(child.innerText)
          })
    
        let codeEl = $$(`#${ id }`, parent)
    
        if (codeEl.length > 0) {
          codeEl = codeEl[0]
        } else {
          codeEl = document.createElement('div')
          codeEl.id = id
          codeEl.style = styleString
          parent.insertBefore(codeEl, iframe)
        }
    
        content = content.filter(w => w.trim().length > 0).join('')
        codeEl.innerText = content
        DEBUG_MODE && console.log(`[DCFE] extracted: [${ content }]`)
      }

      const els = $$('iframe').map(iframe => {
        const id = `dcfe-i${ Math.floor(Math.random() * (10 ** 10)).toString(36).toUpperCase() }`
        iframe.addEventListener('load', iExtractCode.bind(null, iframe, id))

        return iframe
      })

      const trigger = () => { els.forEach(el => el.dispatchEvent(new Event('load'))) }
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === 'visible') {
          trigger()
        }
      }, { once: true })
      setTimeout(trigger, 500)
    },
    ACGJC: () => {
      const el = document.createElement('p')
      const content = []

      $$('fieldset').forEach(parent => {
        let pwd = $$('[id$="download-pwd"]', parent)[0]
        let link = $$('a', parent)[0]

        if (pwd && link) {
          pwd = pwd.getAttribute('value')
          link = link.getAttribute('href')
          const line = `${ link } 提取码: ${ pwd }`
          content.push(line)
          DEBUG_MODE && console.log(`[DCFE] extracted: [${ line }]`)
        }
      })
      el.innerText = content.join('\n')
      el.style = styleString
      document.body.appendChild(el)
    },
  }
  const PATTERN = {
    [HIFINI]: SCRIPTS['iframe'],
    [ACGJC]: SCRIPTS['ACGJC'],
  }

  const PATTERN_ENTRIES = Object.entries(PATTERN)
  for (let i = 0, len = PATTERN_ENTRIES.length; i < len; i++) {
    const [current, fn] = PATTERN_ENTRIES[i]
    if (new RegExp(current).test(location.href)) {
      fn()
      break
    }
  }
})();