// ==UserScript==
// @name         hifini.one.click.post
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @description  hifini 一键回复
// @author       Luke Pan
// @match        https://*.hifini.com/thread-*
// @match        http://*.hifini.com/thread-*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hifini.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function post () {
      toBottom()
      document.querySelector('#message').value = '感谢'
      setTimeout(() => {
        document.querySelector('#submit').click()
        document.querySelector('#hocp-button').style = 'display: none'
      })
    }

    function toBottom () {
      /** 滚动至底部 */
      document.querySelector('.card-body').scrollIntoView({ block: "end", inline: "nearest", behavior: 'smooth' })
    }

    /** 状态检测 */
    const button = document.createElement('a')
    const span = document.createElement('span')
    const icon = document.createElement('i')
    button.id = 'hocp-button'
    if (Array.from(document.querySelectorAll('.alert-warning')).length > 0) {
      span.style = 'font-size: 16px;'
      button.title = '一键回复'
      icon.className = 'icon-mail-forward'
      button.addEventListener('click', post, { once: true })
    } else {
      span.style = 'font-size: 20px;'
      button.title = '前往正文底部'
      icon.className = 'icon-angle-double-up'
      icon.style = 'display: inline-block; transform: rotate(180deg)'
      button.addEventListener('click', toBottom)
    }
    span.appendChild(icon)
    button.className = 'mui-rightlist'
    button.appendChild(span)
    button.style = 'user-select: none; cursor: pointer;'
    document.querySelector('#scroll_to_list').insertBefore(button, document.querySelector('#scroll_to_top'))
})();