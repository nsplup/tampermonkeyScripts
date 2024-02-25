// ==UserScript==
// @name         drive.code.free
// @namespace    http://tampermonkey.net/
// @version      0.5.4
// @description  网盘提取码自填充
// @author       Luke Pan
// @match        */*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
  'use strict';
  const $ = document.querySelector.bind(document)

  const DEBUG_MODE = false
  const DCF_DB = 'DCF_DB'
  const __LAST_CLEAN_DATE__ = '__LAST_CLEAN_DATE__'
  const TIME_LIMIT = 24 * 60 * 60 * 1000

  const GENERAL_REGEXP = '([a-zA-Z0-9\\-\\_]+)'
  const CODE_REGEXP = /((提取)|(访问)|密)码[：:]?[\s\n]*([a-zA-Z0-9]{4})/
  const BAIDU = 'pan\\.baidu\\.com' /** 百度云 */
  const LANZOU = 'lanzou[a-z]\\.com' /** 蓝奏云 */
  const TIANYI = 'cloud\\.189\\.cn' /** 天翼云 */
  const ALIYUN = 'aliyundrive\\.com' /** 阿里云 */
  const PATTERN = {
    [BAIDU]: {
      regExp: [
        new RegExp(BAIDU + '\\/share\\/init\\?surl=' + GENERAL_REGEXP),
        new RegExp(BAIDU + '\\/s\\/1' + GENERAL_REGEXP),
      ],
      input: '#accessCode',
      button: '#submitBtn',
      prefix: 'baidu',
      alt: false,
    },
    [LANZOU]: {
      regExp: [
        new RegExp(LANZOU + '\\/' + GENERAL_REGEXP)
      ],
      input: '#pwd',
      button: '.passwddiv-btn',
      prefix: 'lanzou',
      alt: false,
    },
    [TIANYI]: {
      regExp: [
        new RegExp(TIANYI + '\\/t\\/' + GENERAL_REGEXP),
        new RegExp(TIANYI + '\\/web\\/share\\?code\\=' + GENERAL_REGEXP),
      ],
      input: '#code_txt',
      button: '.access-code-item .visit',
      prefix: 'tianyi',
      alt: false,
    },
    [ALIYUN]: {
      regExp: [
        new RegExp(ALIYUN + '\\/s\\/' + GENERAL_REGEXP),
      ],
      input: 'form input',
      button: 'form button',
      prefix: 'aliyun',
      alt: true,
    }
  }

  let hostname, bundle, observer
  const PATTERN_KEYS = Object.keys(PATTERN)

  for (let i = 0, len = PATTERN_KEYS.length; i < len; i++) {
    const current = PATTERN_KEYS[i]
    if (new RegExp(current).test(location.hostname)) {
      hostname = current
      break
    }
  }

  const CONFIG = { subtree: true, childList: true }
  const delay = 650

  bundle = typeof hostname === 'string' ?
    debounce(autofill, delay) :
    debounce(extract, delay)
  
  /** 初次调用 */
  bundle()

  /** 创建观察器 */
  observer = new MutationObserver(bundle)

  /** 注册观察器 */
  observer.observe(document.body, CONFIG)

  /** 匹配 SURL 与提取码 */
  function extract () {
    const content = document.body.innerText

    Object.values(PATTERN).forEach(config => {
      const matched = config.regExp.reduce((prev, current) => {
        return prev.concat(Array.from(content.matchAll(new RegExp(current, 'g'))))
      }, [])

      matched.forEach(item => {
        const [link, surl] = item
        const { index } = item
        const code = content.slice(index).match(CODE_REGEXP)

        if (Array.isArray(code) && code.length > 1) {
          setValue(config, link, surl, code[code.length - 1])
        }
      })
    })
  }

  /** 自填充提取码 */
  function autofill () {
    const target = PATTERN[hostname]
    const input = $(target.input)
    const code = getValue(target)

    if (input && typeof code === 'string') {
      if (target.alt === true) { /** 无法自动填充时的兜底方案 */
        const label = document.createElement('span')
        const description = `自动填充失败；提取码：${ code }`

        label.innerText = description
        label.style = 'position: absolute; left: 0px; font-size: 13px; padding: 5px 8px; background: white; border-radius: 5px; box-shadow: 0 0 5px #0000003d; z-index: 999; transform: translate3d(0, -125%, 0); user-select: none;'

        input.addEventListener('focus', () => {
          navigator.clipboard.writeText(code)
            .then(() => {
              label.innerText = `已复制提取码至剪切板`
            })
        })
        input.addEventListener('blur', () => { label.innerText = description })
        input.parentNode.insertBefore(label, input)
      } else {
        input.value = code
        /** 处理依靠事件更新值的情况 */
        const tracker = input._valueTracker
        if (tracker) {
          tracker.setValue(code)
        }
        input.dispatchEvent(new Event('input', { bubbles: true }))
        setTimeout(() => $(target.button).click(), 350)
      }
      /** 取消观察器 */
      observer && observer.disconnect()
    }
  }

  function removeEXPValue (DB) {
    const lastCleanDate = DB[__LAST_CLEAN_DATE__] || 0
    const now = Date.now()

    if (lastCleanDate + TIME_LIMIT < now) {
      return Object.assign(
        {},
        Object.entries(DB).reduce((prev, current) => {
          const [key, value] = current
          if (typeof value === 'object') {
            prev[key] = Object.entries(value).reduce((_prev, _current) => {
              const [_key, _value] = _current
              const { date } = _value
    
              if (date + TIME_LIMIT > now) {
                _prev[_key] = _value
              }
    
              return _prev
            }, {})
          }
          return prev
        }, {}),
        { [__LAST_CLEAN_DATE__]: now },
      )
    } else {
      return DB
    }
  }

  function setValue (target, link, surl, code) {
    const DB = JSON.parse(GM_getValue(DCF_DB) || '{}')

    if (!DB.hasOwnProperty(target.prefix)) {
      DB[target.prefix] = {}
    }

    DB[target.prefix][surl] = { code, date: Date.now() }

    GM_setValue(DCF_DB, JSON.stringify(removeEXPValue(DB)))
    DEBUG_MODE && console.log(`[DCF] Extract: Matched [${surl}], Code [${code}], Full string [${link}]`)
  }

  function getValue (target) {
    const surl = getSURL(target, location.href)
    const DB = JSON.parse(GM_getValue(DCF_DB) || '{}')
    const { code } = DB[target.prefix][surl]

    DEBUG_MODE && console.log(`[DCF] AutoFill: Matched [${surl}], ${code ? `Code [${code}]` : `Can't found Code`}`)
    return code
  }

  function getSURL (target, link) {
    return target.regExp.reduce((prev, current) => {
      const surl = link.match(current)

      if (Array.isArray(surl) && surl.length > 1) {
        prev.push(surl[1])
      }

      return prev
    }, [])[0]
  }

  function debounce (fn, delay) {
    let timer = null
    return function(...props) {
      clearTimeout(timer)
      timer = setTimeout(() => fn.apply(null, props), delay)
    }
  }
})();