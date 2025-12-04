// ==UserScript==
// @name         auto.redirector
// @namespace    http://tampermonkey.net/
// @version      0.0.4
// @description  自动重定向
// @author       Luke Pan
// @match        */*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @noframes
// ==/UserScript==

(function() {
  'use strict';

  const PATTERN = [
    [
      '*javdb.com/',
      'https://javdb.com/uncensored?vft=1&vst=1',
    ],
    [
      '*pornet.org/',
      'https://pornet.org/category/newhalf/'
    ],
    [
      '*javbooks.com/',
      'https://javbooks.com/serchinfo_uncensored/nouse/topicsall_1.htm'
    ],
    [
      '*jav.guru/',
      'https://jav.guru/category/jav-uncensored/?orderby=rdate&order=DESC'
    ]
  ]

  for (let i = 0, len = PATTERN.length; i < len; i++) {
    const [match, target] = PATTERN[i]
    if (isMatchingUrl(match)) {
      window.location.href = target
      break
    }
  }

  function isMatchingUrl(inputString) {
    // 获取当前页面地址
    const currentUrl = window.location.href

    // 将传入的字符串转换为正则表达式
    const regexString = inputString
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*') // 将通配符 * 转换为正则表达式中的 .*

    const regex = new RegExp(`^${ regexString }$`)

    // 使用 match() 方法进行匹配
    return currentUrl.match(regex) !== null
  }
})();
