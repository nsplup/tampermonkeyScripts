// ==UserScript==
// @name         nyaa.si.enhance
// @namespace    http://tampermonkey.net/
// @version      0.3.3
// @description  nyaa.si 功能增强
// @author       Luke Pan
// @match        https://*.nyaa.si/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=nyaa.si
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
  'use strict';
  const $ = document.querySelector.bind(document)
  const $$ = (selectors, parent = document) => Array.from(parent.querySelectorAll(selectors))

  /** 用户配置 */
  const DEBUG_MODE = false

  const tEls = []
  const tData = []

  /** 磁力链多重选择复制 */
  if (true /** 限定作用域 */) {
    let results = []
    const dataMap = []
    let state = false

    /** 插入表单头 */
    const tr = document.querySelector('thead tr')
    const newTh = document.createElement('th')

    newTh.innerHTML = '<span>Select</span>'
    newTh.style = 'width: 60px; cursor: pointer; user-select: none'
    newTh.title = 'Select / Unselect All'

    /** 注入全选／全不选事件 */
    newTh.addEventListener('click', () => {
      const els = $$('.nse-input')

      if (!state) {
        results = els.map((el, i) => {
          el.checked = true
          return i
        })
      } else {
        els.forEach((el => { el.checked = false }))
        results = []
      }

      state = !state
      updateButton()
    })

    tr.appendChild(newTh)

    /** 注入新样式 */
    const newStyle = document.createElement('style')

    newStyle.innerHTML = `
    .torrent-list > tbody > tr > td {
      max-width: 543px !important;
    }
    .nse-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
    }
    .nse-label {
      margin: 0;
      cursor: pointer;
    }
    .nse-rb {
      right: 180px;
    }

    .nse-rb b {
      text-decoration: underline;
    }

    td:nth-child(5) {
      cursor: pointer !important;
    }
    .nse-marked {
      background: #d9f4ff !important;
    }
    .nse-marked:hover {
      background: #c6edfd !important;
    }
    td:hover .nse-container {
      display: flex;
    }
    .nse-container {
      display: none;
      justify-content: center;
      align-items: center;
      position: absolute;
      top: 0;
      height: 100%;
    }
    `
    document.head.appendChild(newStyle)

    const rows = $$('tbody tr')

    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i]

      /** 注入选择框 */
      const newTd = document.createElement('td')
      const newSelect = document.createElement('input')

      newSelect.type = 'checkbox'
      newSelect.className = 'nse-input'
      newTd.appendChild(newSelect)

      /** 建立 dataMap */
      let [ignore, name, link, size, date] = $$('td', row)

      tEls.push(date)
      name = $$('a:last-child', name)[0]

      let page = name.href
      let magnet = $$('a:last-child', link)[0].href
      name = name.getAttribute('title')
      size = size.innerText
      date = new Date(date.innerText).getTime()

      dataMap.push([page, magnet])
      tData.push({ name, size, date, ctime: Date.now() })

      newSelect.addEventListener('change', (e) => {
        if (e.target.checked) {
          results.push(i)
        } else {
          results = results.filter(n => n != i)
        }
        results.sort((a, b) => a - b)
        updateButton()

        /** 重置状态 */
        state = results.length === dataMap.length
      })

      newTd.className = 'text-center'
      row.appendChild(newTd)
    }

    /** 注入复制按钮 */
    const newButton = document.createElement('button')
    const newLabel = document.createElement('label')

    newLabel.className = 'nse-label'
    newLabel.innerHTML = 'Copy 0 Selected'
    newButton.appendChild(newLabel)
    newButton.className = 'btn btn-primary nse-button'
    newButton.style = 'visibility: hidden;'
    newButton.addEventListener('click', () => {
      const current_url = window.location.href
      const links = results.map(n => dataMap[n])

      /** 访问剪切板 */
      navigator.clipboard.writeText(links.map(([page, magnet]) => magnet).join('\n'))

      /** 标记已访问 */
      addVisited(
        links.map(([page]) => page),
        current_url
      )
    })

    /** 注入区间选择按钮 */
    const rangeButton = document.createElement('button')

    rangeButton.className = 'btn btn-primary nse-button nse-rb'
    rangeButton.innerHTML = `
    <span>Select Range Between <b>#01</b> and <b>#75</b></span>
    `
    rangeButton.style = 'visibility: hidden;'
    rangeButton.addEventListener('click', rangeSelect)

    document.body.appendChild(newButton)
    document.body.appendChild(rangeButton)

    function rangeSelect () {
      const els = $$('.nse-input')
      const { length } = results
      const start = results[0]
      const end = results[length - 1] + 1

      results = els.slice(start, end)
        .map((el, i) => {
          el.checked = true
          return i + start
        })

      updateButton()
    }

    /** 按钮状态更新函数 */
    function updateButton () {
      const { length } = results

      /** 主按钮部分 */
      const label = document.querySelector('.nse-label')
      label.innerHTML = `Copy ${length} Selected`

      const button = document.querySelector('.nse-button')
      if (length === 0) {
        button.style = 'visibility: hidden;'
      } else {
        button.style = ''
      }

      /** 区间选择按钮部分 */
      const rangeButton = document.querySelector('.nse-rb')
      if (length < 2 || (length === dataMap.length)) {
        rangeButton.style = 'visibility: hidden;'
      } else {
        rangeButton.style = ''
      }
      const start = results[0]
      const end = results[length - 1]
      const titles = $$('[colspan="2"] a')
        .filter(el => el.className !== 'comments')
        .map(el => el.title)
      const startTitle = typeof start === 'number'
        ? titles[start]
        : ''
      const endTitle = typeof end === 'number'
        ? titles[end]
        : ''
      const startNumber = autofillNumber(start + 1)
      const endNumber = autofillNumber(end + 1)

      rangeButton.innerHTML = `
      <span>Select Range Between <b title="${startTitle}">#${startNumber}</b> and <b title="${endTitle}">#${endNumber}</b></span>
      `
    }
  }

  /** 向 magnet 按钮添加钩子：标记已访问 */
  if (true /** 限定作用域 */) {
    const magnets = $$('a[href*="magnet"]')
    const current_url = window.location.href
    const handleClick = e => {
      let parent = e.target.parentNode
      while (parent.parentNode && (parent.tagName.toUpperCase() !== 'TD')) {
        parent = parent.parentNode
      }
      const root = parent.parentNode
      const title = $$('a[href*="/view/"]', root)
      const href = title[0].href
      addVisited([href], current_url)
    }
    magnets.forEach(el => el.addEventListener('click', handleClick))
  }

  /** 搜索结果进度保存 */
  const NSE_MARKS = 'NSE_MARKS'
  const EXP_TIME = 365 * 24 * 60 * 60 * 1000 /** 过期时间为一年后 */
  const LSearch = parse(location.search.slice(1))
  const { q } = LSearch /** 获取搜索关键词 */
  if (requiredStr(q)) {
    let marks = JSON.parse(GM_getValue(NSE_MARKS) || '{}')
    updateMarkedStyle()

    $('tbody').addEventListener('click', e => {
      const index = tEls.indexOf(e.target) /** 限定触发目标为 Date 元素 */
      if (index !== -1) {
        const parent = e.target.parentNode
        if (parent.classList.contains('nse-marked')) {
          /** 移除记录 */
          marks = Object.entries(marks).reduce((prev, current) => {
            const [key, value] = current
            if (key !== q) { prev[key] = value }
            return prev
          }, {})
        } else {
          marks[q] = Object.assign({}, tData[index])
        }
        handleUpdate()
      }
    })
    function handleUpdate () {
      updateMarkedStyle()
      updateMarks()
    }
    /** 筛除过期数据并保存 */
    function updateMarks () {
      const now = Date.now()

      marks = Object.entries(marks).reduce((prev, current) => {
        const [key, value] = current
        const { ctime } = value
        if ((ctime + EXP_TIME) > now) {
          prev[key] = value
        }
        return prev
      }, {})
      GM_setValue(NSE_MARKS, JSON.stringify(marks))
      DEBUG_MODE && console.log('[NSE] Marks: Update marks data', marks)
    }
    /** 更新标记行样式 */
    function updateMarkedStyle () {
      let index = -1
      let target = null, rCtime = null
      const ref = marks[q]
      if (ref) {
        const { name: rName, size: rSize, date: rDate, ctime } = ref
        for (let i = 0, len = tData.length; i < len; i++) {
          const current = tData[i]
          const { name: cName, size: cSize, date: cDate } = current
          if ((rName === cName) && (rSize === cSize) && (rDate === cDate)) {
            index = i
            DEBUG_MODE && console.log('[NSE] Marks: Update style from', current)
            break
          }
        }
        if (index !== -1) {
          target = tEls[index].parentNode
          rCtime = ctime
        }
      }
      tEls.forEach(el => {
        const parent = el.parentNode
        if (parent === target) {
          parent.title = formatTime(rCtime, 'Marked on YYYY/MM/DD at hh:mm')
          parent.classList.add('nse-marked')
        } else {
          parent.removeAttribute('title')
          parent.classList.remove('nse-marked')
        }
      })
    }
  }
  /** 添加便捷按钮 */
  if (true /** 限定作用域 */) {
    const REGEXPS = [
      /^\[\d+\](\[[^\]]+\]){2}([^\[]+)/g,
      /^(.+)\s*(raw)?\s*第[\d\-]+巻/g,
      /^\[[^\]]+\]\s*(.+)/g,
      /^([^\[\(]+)/g,
    ]
    $$('tbody tr').forEach((parent, index) => {
      const { name } = tData[index]
      const [ignore, title] = $$('td', parent)
      const container = document.createElement('div')
      const copyEl = document.createElement('span')
      const googleEl = document.createElement('a')
      const search = document.createElement('a') /** 搜索关键词 */
      const searchWithCP = document.createElement('a') /** 搜索关键词并带上当前关键词 */
      const param = REGEXPS.reduce((prev, current, i) => {
        let ign, ign2
        let p
        const matched = Array.from(name.matchAll(current))[0]
        if (Array.isArray(matched)) {
          switch (i) {
            case 0:
              [ign, ign2, p] = matched
              prev.push(cleanParam(p))
              break
            case 1:
              [ign, p] = matched
              prev.push(cleanParam2(p))
              break
            case 2:
            case 3:
              [ign, p] = matched
              prev.push(cleanParam3(p))
              break
          }
        }
        return prev
      }, [])[0]

      container.className = 'nse-container'
      if (requiredStr(param)) {
        [
          {
            el: copyEl,
            html: 'COPY',
          },
          {
            el: googleEl,
            html: 'GOOGLE',
            href: googleLink(param),
          },
          {
            el: search,
            html: '<i class="fa fa-search fa-fw"></i>',
            href: searchKW(param, false),
          },
          {
            el: searchWithCP,
            html: '<i class="fa fa-search fa-fw"></i>PLUS',
            href: searchKW(param, true),
          }, 
        ].forEach(({ el, html, href }) => {
          el.className = 'comments'
          el.style = 'font-weight: bold; cursor: pointer; margin-right: 5px; text-decoration: none; color: #383838 !important;'
          el.innerHTML = html
          href && (el.href = href)
          el.setAttribute('target', '_blank')
          if (el !== searchWithCP || requiredStr(q)) {
            container.appendChild(el)
          }
        })
        copyEl.addEventListener('click', () => {
          navigator.clipboard.writeText(param)
        })
        title.style = 'position: relative;'
        title.appendChild(container)
      }
    })
  }
  function addVisited (urls, ref) {
    urls.forEach(url => history.pushState({}, "", url))
    setTimeout(() => history.replaceState({}, "", ref))
  }
  function autofillNumber (number) {
    return number > 9 ? number : '0' + number
  }
  function parse (input, sep = '&', eq = '=', decodeURIC = decodeURIComponent) {
    return input.split(sep)
      .filter(n => n.length > 0)
      .reduce((prev, current) => {
        const [key, val] = current.split(eq)
        const decodedKey = decodeURIC(key)
        const decodedVal = decodeURIC(val)
        const prevVal = prev[decodedKey]
        switch (typeof prevVal) {
          case 'undefined':
            prev[decodedKey] = decodedVal
            break
          case 'string':
            prev[decodedKey] = [prevVal, decodedVal]
            break
          case 'object':
            if (Array.isArray(prevVal)) { prevVal.push(decodedVal) }
        }
        return prev
      }, {})
  }
  function requiredStr (str) {
    return typeof str === 'string' && str.length > 0
  }
  function cleanParam (keyword) {
    const REGEXPS = [
      /\@COMIC\s第\d+巻/,
      /THE\sCOMIC\s\d+巻/,
      /[（\()][０-９\d]+[\)）]/,
      /([０-９]|\d)+巻?$/,
    ]

    return REGEXPS.reduce((prev, current) => prev.replace(current, ''), keyword.trim()).trim()
  }
  function cleanParam2 (keyword) {
    return keyword.trim().replace(/raw$/, '').trim()
  }
  function cleanParam3 (keyword) {
    keyword = keyword.replace(/[\_\.]/g, ' ')
    const i = ['(', '[', '-', '/']
    const regexp = new RegExp([
      's\\d+', 'ep?\\d+', 'v\\d+', 'v?\\d+\\-\\d+', 'Volume\\s\\d+', 'Vol\\.?\\d+', '\#\\d+',
      'VOSTFR', 'BluRay',
      '1080p', '720p', 'web', 'x264', 'aac',
      'HD720', 'HD1080', 'x265', 'h264',
    ].join('|') + '$', 'gi')
    let end = 0
    while (end < keyword.length) {
      let char = keyword.charAt(++end)
      if (i.includes(char)) {
        if ( char !== '-' || keyword.charAt(end + 1) === ' ' ) { break }
      }
    }
    keyword = keyword.slice(0, end)
    const extra = Array.from(keyword.matchAll(regexp))
    if (extra.length > 0) {
      const index = extra[0].index
      keyword = keyword.slice(0, index)
    }
    return keyword.replace(/[\[\]]/g, '').trim()
  }
  function googleLink (keyword) {
    return 'https://www.google.com/search?q=' + encodeURIComponent(keyword)
  }
  function searchKW (keyword, cp) {
    const { q: _q } = LSearch
    let _search = Object.entries(Object.assign({}, LSearch, {
      q: cp && _q ? [_q, keyword].join(' ') : keyword
    })).reduce((prev, current) => {
      const [key, val] = current
      prev.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
      return prev
    }, []).join('&')
    return `${ location.origin }/?${_search}`
  }
  /**
   * @description YYYY => Year;
   * @description MM => Month;
   * @description DD => Date;
   * @description dd => Day;
   * @description hh => Hours;
   * @description mm => Minutes;
   * @description ss => Seconds
   */
  function formatTime (
    time,
    format = 'YYYY-MM-DD hh:mm',
    dayStr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  ) {
    const date = new Date(time)
    const YYYY = date.getFullYear()
    const MM = date.getMonth() + 1
    const DD = date.getDate()
    const dd = dayStr[date.getDay()]
    const hh = date.getHours()
    const mm = date.getMinutes()
    const ss = date.getSeconds()

    const DateMap = [YYYY, MM, DD, dd, hh, mm, ss].map(n => n < 10 ? '0' + n : n)
    const replaceMap = { 'YYYY': 0, 'MM': 1, 'DD': 2, 'dd': 3, 'hh': 4, 'mm': 5, 'ss': 6 }

    return format.replace(/YYYY|MM|DD|dd|hh|mm|ss/g, fragment => DateMap[replaceMap[fragment]])
  }
})();