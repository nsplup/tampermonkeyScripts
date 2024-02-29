// ==UserScript==
// @name         V2EX.enhance
// @namespace    http://tampermonkey.net/
// @version      0.7.13
// @description  V2EX 功能增强
// @author       Luke Pan
// @match        https://*.v2ex.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=v2ex.com
// ==/UserScript==

(function() {
  'use strict'
  const DEBUG_MODE = false

  /** 用户配置 */
  const AUTO_DAILY_BONUS = true /** 自动签到开关 */
  const MAX_DEPTH = 4 /** 回复预览最大深度 */
  const MAX_HEIGHT = 200 /** 超过最大高度时折叠 */
  const COLLAPSE_TOLERANCE = 20 /** 最大高度宽容度 */
  const COLLAPSE_DEFAULT = true /** 当值为 true 时，默认折叠 */

  const $ = document.querySelector.bind(document)
  const $$ = (selectors, parent = document) => Array.from(parent.querySelectorAll(selectors))

  /** 屏蔽增强 */
  if (location.pathname.startsWith('/member/')) {
    const button = $('[value="Block"]') || $('[value="Unblock"]')

    if (button) {
      button.removeAttribute('onclick')
      button.addEventListener('click', () => {
        button.setAttribute('disabled', true)
        button.style = 'cursor: wait'

        handleBlock(location.href, button.getAttribute('value') === 'Unblock')
          .then(() => { location.reload() })
          .catch(() => console.error('[V2EXE] Error: Could not find API.'))
      }, { once: true })
    }
  }

  function handleBlock (url, unblock = false) {
    return fetch(url)
    .then(res => res.text())
    .then(data => {
      const API = data.match(
        unblock ?
          /\/unblock\/\d+\?once=\d+/ :
          /\/block\/\d+\?once=\d+/
      )

      if (API) {
        return fetch(location.origin + API)
      } else {
        return Promise.reject()
      }
    })
  }

  /** 一键签到 */
  if (location.pathname === '/') {
    const DAILY = '/mission/daily'
    const button = $(`[href="${DAILY}"]`)

    if (button) {
      button.removeAttribute('href')
      button.style = 'color: var(--link-color); cursor: pointer;'

      const handle = () => {
        button.innerText = '正在领取今日登录奖励⋯⋯'
        button.style = 'color: var(--link-color); cursor: wait'

        fetch(location.origin + DAILY)
          .then(res => res.text())
          .then(data => {
            const API = data.match(/\/mission\/daily\/redeem\?once=\d+/)

            if (API) {
              return fetch(location.origin + API)
            } else {
              return Promise.reject()
            }
          })
          .then(res => res.text())
          .then(data => {
            const result = data.match(/<div.+<li.+\/li>(.+)<\/div>/)[1]

            button.innerText = result.split(/\s/)[1]
            if (!result.includes('成功')) {
              button.addEventListener('click', handle, { once: true })
              button.style = 'color: var(--link-color); cursor: pointer;'
            } else {
              button.style = 'color: var(--link-color)'
            }
          })
          .catch(() => console.error('[V2EXE] Error: Could not find API.'))
      }
      button.addEventListener('click', handle, { once: true })

      /** 自动签到 */
      if (AUTO_DAILY_BONUS) { setTimeout(() => button.click(), 500) }
    }
  }

  /** 主题优化 */
  if (location.pathname.startsWith('/t/')) {
    const contentClassName = '.reply_content'
    const topicClassName = '.topic_content'
    const getThread = parent => parent.querySelector('.no').innerText
    const replyRegExp = [
      /\@<a\shref="\/member\/(\S+)">\1<\/a>((\s#\d+)|(\s\d+#))?/g,
      /(\s|^)\@([^\s\<]+)((\s#\d+)|(\s\d+#))?/g,
    ]
    /** 样式注入 */
    const style = document.createElement('style')
    const containerName = 'v2exe_review_container'
    const contentName = 'v2exe_review_content'
    const threadName = 'v2exe_review_thread'
    const timeName = 'v2exe_review_time'
    const buttonName = 'v2exe_review_button'
    const blockContainerName = 'v2exe_block_container'
    const blockMainName = 'v2exe_block_main'
    const CSSText = `
      .${ containerName } {
        position: relative;
        padding: 10px 10px 10px 1em;
        background-color: rgb(240, 240, 240);
        color: rgb(80, 80, 80);
        border-radius: 10px;
      }
      .${ containerName } .${ containerName }::before {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
        background-color: rgb(215, 215, 215);
        border-radius: 10px;
        content: '';
      }
      .${ threadName } {
        position: absolute;
        right: 10px;
        top: 0;
        font-weight: bold;
        color: rgba(80, 80, 80, .2) !important;
        text-decoration: unset !important;
        font-size: 15px;
      }
      .${ timeName } {
        font-size: 11px;
        color: rgba(80, 80, 80, .25);
        margin-left: 23px
      }
      .${ buttonName } {
        display: none;
        margin-left: 23px;
        padding: 1px 15px;
        font-size: 12.5px;
        background: rgb(215, 215, 215);
        border-radius: 1em;
        cursor: pointer;
      }
      [collapsed] > .${ buttonName } {
        display: inline-block;
      }
      [collapsed=true] > .${ buttonName } > [toggle="open"],
      [collapsed=false] > .${ buttonName } > [toggle="close"] {
        display: inline-block;
      }
      [collapsed=false] > .${ buttonName } > [toggle="open"],
      [collapsed=true] > .${ buttonName } > [toggle="close"],
      [collapsed=true] > .${ contentName } {
        display: none;
      }
      .${ blockMainName } {
        position: absolute;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(255, 255, 255, .7);
        cursor: pointer;
        visibility: hidden;
      }
      .${ blockMainName }::before,
      .${ blockMainName }::after {
        display: block;
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
        content: '';
      }
      .${ blockMainName }::before {
        width: 50%;
        height: 50%;
        border: 3.5px solid #ff3131;
        border-radius: 50%;
      }
      .${ blockMainName }::after {
        width: 3.5px;
        height: 50%;
        background-color: #ff3131;
        transform: rotate(45deg) scaleY(1.1);
      }
      .${ blockContainerName } {
        position: relative;
      }
      .${ blockContainerName }:hover .${ blockMainName },
      .${ blockContainerName } [blocked="true"] {
        visibility: visible;
      }
      [blocked="pending"] {
        cursor: wait;
      }
      .no {
        font-size: 15px !important;
        border-radius: 10px !important;
        background-color: unset !important;
        color: rgba(80, 80, 80, .2) !important;
        padding: unset !important;
        font-weight: bold !important;
      }
      ${ contentClassName } img,
      ${ topicClassName } img {
        max-width: 100% !important;
        max-height: 80vh  !important;
      }
      div + br,
      div + br + br,
      .${ containerName } .embedded_video_wrapper {
        display: none;
      }
    `
    style.innerHTML = CSSText
    document.head.appendChild(style)

    const searchP = getSearchP()
    const contents = {}
    const extractData = (fragment, page = 1) => {
      /** 整理回复数据 */
      $$(contentClassName, fragment).forEach(content => {
        let parent = content.parentNode
        const thread = getThread(parent)
        const time = parent.querySelector('.ago').innerText
        const strong = parent.querySelector('strong')
        const userName = strong.innerText
        let id = null

        while (parent) {
          id = parent.getAttribute('id')
          parent = parent.parentNode
          if (typeof id === 'string' && id.startsWith('r_')) {
            break
          } else {
            id = null
          }
        }

        contents[thread] = {
          id,
          page,
          thread,
          userName,
          userNameNode: strong.innerHTML,
          time,
          content: content.innerHTML
        }
      })
    }
    const handleReplace = (cThread, depth = 1) => {
      const { content: innerHTML, userName: cUserName } = contents[cThread]
      const matched = replyRegExp.reduce((prev, current) => prev.concat(Array.from(innerHTML.matchAll(current))), [])
      return matched.reduce((prev, current) => {
        let target, name, replyNumber, ignore, ignore2
        if (current[1].trim().length === 0) { /** 判断是哪个正则的匹配值 */
          [target, ignore, name, ignore2, replyNumber] = current
        } else {
          [target, name, ignore, replyNumber] = current
        }
        const cThreadNum = parseInt(cThread)
        const rThreadNum = parseReplyNumber(replyNumber)
        DEBUG_MODE && console.table({
          cThread, target, name, replyNumber
        })
        let replyData = null
        let contentsEntries = Object.entries(contents)
          .filter(([key, val]) => (val.userName === name) && (parseInt(val.thread) < cThreadNum))

        const less = [], more = []
        /** 当楼层号存在时查找楼层号 */
        if (requiredStr(replyNumber) && (rThreadNum < cThreadNum)) {
          const newData = contents[rThreadNum]

          if (newData && (newData.userName === name) && (newData.thread !== cThread)) {
            replyData = newData
          } else {
            contentsEntries.forEach(content => {
              const [key, val] = content
              if (parseInt(val.thread) <= rThreadNum) {
                less.push(content)
              } else {
                more.push(content) /** 防止用户之间 Block 数量差距过大导致的筛选错位 */
              }
            })
            if (less.length > 0) { contentsEntries = less }
          }
        }

        /** 未命中时查找双向 AT 回复 */
        const cLen = contentsEntries.length
        if (!replyData) {
          const cUNRegExp = new RegExp(`(@<a href="/member/${ cUserName }">${ cUserName }</a>)|(@${ cUserName })`)
          for (let i = cLen - 1; i >= 0; i--) {
            const [key, val] = contentsEntries[i]
            if (cUNRegExp.test(val.content)) {
              replyData = val
              break
            }
          }
        }

        /** 未命中时赋值最近回复 */
        if (!replyData) {
          const lLen = less.length, mLen = more.length
          switch (true) {
            case lLen > 0:
              replyData = less[lLen - 1][1]
              break
            case mLen > 0:
              replyData = more[0][1]
              break
            case cLen > 0:
              replyData = contentsEntries[cLen - 1][1]
          }
        }

        let review
        if (replyData) {
          const { thread, time, content, id, page } = replyData
          const isMaxDepth = depth > MAX_DEPTH
          const newContent = replaceIMGLink(
            !isMaxDepth ?
              handleReplace(thread, depth + 1) :
              content
          ).replace(/<img\s*[^>]*\/?>/g, '[图片]')
          const anchor = searchP !== null ?
            `?p=${ page }#${ id }` :
            `#${ id }`
          const handleClick = `(function (t) { const p = t.parentNode, v = p.getAttribute('collapsed'); p.setAttribute('collapsed', v === 'true' ? 'false' : 'true') })(this)`
          review = `
          <div style="width: 100%; height: 5px"></div>
          <div class="${ containerName }">
            <strong>${ replyData.userNameNode }</strong>
            <span class="${ timeName }">${ time }</span>
            <a class="${ threadName }" href="${ anchor }">${ thread }</a>
            ${
              isMaxDepth ?
              '' :
              `
              <span class="${ buttonName }" onclick="${ handleClick }">
                <span toggle="open">展开</span><span toggle="close">收起</span>
              </span>
              <div class="${ contentName }">${ newContent }</div>
              `
            }
          </div>
          <div style="width: 100%; height: 5px"></div>
          `
        } else { /** 均未命中时处理 */
          review = `
          <div style="width: 100%; height: 5px"></div>
          <div class="${ containerName }" exceed="true">
            <strong><a href="/member/${ name }" style="color: rgb(128, 128, 128); text-decoration: none">${ name }</a></strong>
            <span style="font-weight: bold; color: rgba(80, 80, 80, 0.2); font-size: 25px; position: absolute; right: 10px; top: 0; bottom: 0; margin: auto 0; user-select: none">EXCEED</span>
          </div>
          <div style="width: 100%; height: 5px"></div>
          `
        }
        return prev.replace(target, review)
      }, innerHTML)
    }

    /** 回复预览 */
    new Promise((res, rej) => {
      if (searchP !== null && searchP > 1) {
        /** 获取完整回复列表 */
        Promise
          .all(Array.from({ length: searchP })
          .slice(0, -1)
          .map((val, i) => fetch(location.origin + location.pathname + `?p=${ i + 1 }`, {
            cache: 'no-cache',
          })))
          .then(values => Promise.all(values.map(response => response.text())))
          .then(values => {
            values.forEach((value, index) => {
              const fragment = document.createDocumentFragment()
              const body = document.createElement('body')

              body.innerHTML = value.match(/<\s*body[^>]*>([\s\S]*)<\s*\/\s*body\s*>/)
              fragment.appendChild(body)
              extractData(fragment, index + 1)
            })
            extractData(document, searchP) /** 追加当前页面数据 */
            res()
          })
          .catch(err => rej(err))
      } else {
        extractData(document)
        res()
      }
    }).then(() => {
      DEBUG_MODE && console.log(contents)
      $$(contentClassName)
        .forEach(content => {
          content.innerHTML = replaceIMGLink(handleReplace(getThread(content.parentNode)))
        })
      /** 当超出最大限高时折叠回复预览 */
      $$(`.${ contentName }`)
        .reverse() /** 计算高度时先里后外 */
        .forEach(el => {
          if (el.offsetHeight >= (MAX_HEIGHT + COLLAPSE_TOLERANCE)) {
            el.parentNode.setAttribute('collapsed', COLLAPSE_DEFAULT)
          }
        })
      /** 当合计高超过阈值时强制折叠所有回复预览 */
      $$(contentClassName)
        .forEach(content => {
          const rootContainers = $$(`${ contentClassName } > .${ containerName }`, content)
            .filter(root => !root.hasAttribute('exceed'))
          const totalHeight = rootContainers.reduce((prev, root) => {
            const rContent = $$(`.${ contentName }`, root)[0]
            return prev + rContent.offsetHeight
          }, 0)
          if (totalHeight > (MAX_HEIGHT + (20 * rootContainers.length))) {
            rootContainers.forEach(root => root.setAttribute('collapsed', true))
          }
        })
      /** 为主题页添加屏蔽入口 */
      $$('.avatar')
        .slice(2)
        .forEach(el => {
          const name = el.getAttribute('alt')
          const avatar = el.outerHTML
          const parent = el.parentNode
          const container = document.createElement('div')
          const block = document.createElement('div')
          parent.innerHTML = ''
          container.innerHTML = avatar
          container.className = blockContainerName
          container.appendChild(block)
          block.className = blockMainName
          block.title = '屏蔽该用户'
          block.setAttribute('name', name)
          const handleClick = e => {
            const elements = $$(`.${ blockMainName }[name="${ name }"]`)
            const blocked = e.target.getAttribute('blocked')

            if (blocked === null) {
              elements.forEach(el => el.setAttribute('blocked', 'pending'))
              handleBlock(location.origin + `/member/${ name }`)
                .then(() => {
                  elements.forEach(el => {
                    el.title = '已屏蔽'
                    el.setAttribute('blocked', true)
                  })
                })
                .catch(() => elements.forEach(el => el.removeAttribute('blocked')))
            }
          }
          block.addEventListener('click', handleClick)
          parent.appendChild(container)
        })
    })
    .catch(err => console.error('[V2EXE] Error: \n', err))

    /** 回复优化 */
    $$('a[onclick*="replyOne"]')
      .forEach(el => {
        const attribute = el.getAttribute('onclick')
        const thread = getThread(el.parentNode)

        el.setAttribute('onclick', `${ attribute.slice(0, -3) } #${ thread }');`)
      })

    /** 主题内容优化 */
    $$(topicClassName)
      .forEach(el => { el.innerHTML = replaceIMGLink(el.innerHTML) })
  }
  /** 替换链接为图片 */
  function replaceIMGLink (innerHTML) {
    const REGEXP = /(<a[^>]*>)(.*?)<\/a>/ig
    const REGEXP_MARKDOWN = /!\[(.*?)\]\((.*?)\)/g
    const REGEXP_IMG_LINK = /^https?.*\.(?:jpg|jpeg|jpe|bmp|png|gif|webp|avif)/i
    const REGEXP_IMGUR = /^https?:\/\/imgur\.com\/([a-zA-Z0-9]{2,})/i
    const handleError = `this.parentNode.innerHTML='[图片加载失败]'`
    return innerHTML
      .replace(REGEXP_MARKDOWN, (fragment, description, link) => link) /** 去除无效的 Markdown 图片语法 */
      .replace(REGEXP, (fragment, tag, link) => {
        const matchedImgur = link.match(REGEXP_IMGUR)
        let src = null

        if (matchedImgur) {
          const [ignore, surl] = matchedImgur
          src = `https://i.imgur.com/${ surl }.jpg`
        } else if (REGEXP_IMG_LINK.test(link)) {
          src = link
        }

        return src ?
          `${ tag }<img src="${ src }" onerror="${ handleError }"/></a>` :
          fragment
      })
  }
  function requiredStr (str) {
    return typeof str === 'string' && str.length > 0
  }
  function parseReplyNumber (str) {
    return requiredStr(str) ? parseInt(str.match(/\d+/)[0]) : NaN
  }
  function getSearchP () {
    let p = location.search.match(/p=(\d+)/)

    p = p === null ? NaN : parseInt(p[1])

    return isNaN(p) ? null : p
  }
})()