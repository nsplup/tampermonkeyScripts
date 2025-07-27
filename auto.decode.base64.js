// ==UserScript==
// @name         auto.decode.base64
// @namespace    http://tampermonkey.net/
// @version      0.0.12
// @description  BASE64 解码辅助
// @author       Luke Pan
// @match        */*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    let timer
    const URLRegEXP = /^(https?:\/\/(([a-zA-Z0-9]+-*)+[a-zA-Z0-9]+\.)+[a-zA-Z]+)(:\d+)?(\/.*)?(\?.*)?(#.*)?$/
    const BASE64RegEXP = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/
    const styleSheet = document.createElement('style')

    /** 使用 ID 选择器提升样式权重 */
    const seed = Date.now().toString(32)
    const wrpID = `adb-wrp-${seed}`
    const btnID = `adb-btn-${seed}`
    const msgID = `adb-msg-${seed}`

    const activeStyle = 'z-index: 999; bottom: 20px; transform: scale(1); opacity: 1;'
    styleSheet.innerHTML = `
      #${wrpID} {
        z-index: -1;
        max-width: 650px;
        padding: 15px;
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        margin: 0 auto;
        background: #fff !important;
        border-radius: 8px;
        box-sizing: content-box !important;
        text-align: left !important;
        box-shadow: 0 0 15px rgba(0, 0, 0, 0.2);

        opacity: 0;
        transform: scale(0.7);
        transition: all .15s;
      }

      #${btnID} {
        position: absolute;
        right: 15px;
        bottom: 0;
        top: 0;
        width: 60px;
        height: 30px;
        padding: 6px 0;
        margin: auto 0;
        border: none !important;
        border-radius: 6px;
        color: #fff !important;
        font-family: "微软雅黑" !important;
        font-size: 14px !important;
        font-weight: bold;
        line-height: 1 !important;
        background: #0b60e6 !important;
        cursor: pointer !important;
      }

      #${btnID}:hover {
        background: #0652ca !important;
      }

      #${btnID}:active {
        background: #0746aa !important;
      }

      #${msgID} {
        width: 570px;
        padding: 6px;
        box-sizing: border-box;
        border: none !important;
        border-radius: 4px;
        font-family: "微软雅黑" !important;
        font-size: 14px !important;
        color: #242424 !important;
        box-shadow: unset !important;
        background: unset !important;
        line-height: 1 !important;
      }

      #${msgID}:focus {
        background: #f0f0f0 !important;
        outline: #0b60e6 solid 2px !important;
      }
    `

    const contentElement = document.createElement('div')

    contentElement.id = wrpID

    document.body.appendChild(contentElement)
    document.body.appendChild(styleSheet)

    function autoDecode (e) {
      clearTimeout(timer)

      const { target } = e
      if (target.id.startsWith('adb-')) { return }

      let selection = (['TEXTAREA', 'INPUT'].includes(target.tagName.toUpperCase()) ?
        target.value.substring(target.selectionStart, target.selectionEnd) :
        window.getSelection().toString()).trim()

      if ((selection.length > 4 || selection.endsWith('=')) && BASE64RegEXP.test(selection)) {
        try {
          const decoded = decodeURIComponent(atob(selection)).trim()
          const isURL = URLRegEXP.test(decoded)
          contentElement.innerHTML = `<input id="${msgID}" value="${decoded}"/><button id="${btnID}"></button>`
          contentElement.style = activeStyle

          const btn = document.getElementById(btnID)
          if (isURL) {
            btn.innerText = 'Visit'
            btn.onclick = visit.bind(null, decoded)
          } else {
            btn.innerText = 'Copy'
            btn.onclick = copy.bind(null, decoded)
          }
        } catch (e) { console.log(e) }
      } else {
        contentElement.style = ''
        timer = setTimeout(() => { contentElement.innerText = '' }, 350)
      }
    }

    function copy (string) {
      navigator.clipboard.writeText(string)
    }

    function visit (string) {
      const link = document.createElement('a')

      link.href = string
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => document.body.removeChild(link))
    }

    document.body.addEventListener('mouseup', autoDecode)
})();