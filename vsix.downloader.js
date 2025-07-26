// ==UserScript==
// @name         vsix.downloader
// @namespace    http://tampermonkey.net/
// @version      0.0.3
// @description  微软扩展市场 vsix 下载器
// @author       Luke Pan
// @match        https://marketplace.visualstudio.com/items?itemName=*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=visualstudio.com
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  const $ = document.querySelector.bind(document)
  const $$ = (selectors, parent = document) => Array.from(parent.querySelectorAll(selectors))

  const observer = new MutationObserver(() => {
    try {
      const isVSCodeMarket = $('.bread-crumb-container .member').innerText === 'Visual Studio Code'
    
      if (!isVSCodeMarket) { return }
      const info = getInfo()

      injectButton(info)
      let historyBtn = $('#Pivot3-Tab1') || $('#versionHistory')
      historyBtn.addEventListener('click', () => {
        setTimeout(() => {
          injectHistoryButton(info)
        })
      })
      observer.disconnect()
    } catch (e) {
      // console.log(e)
    }
  })

  observer.observe(document.body, { subtree: true, childList: true })

  function getInfo () {
    let uiEl = $('#unique-identifier + td') || $('#Unique_Identifier + td')
    const uniqueIdentifier = uiEl.innerText
    let verEl = $('#version + td') || $('#Version + td')
    const version = verEl.innerText
    const [publisher, name] = uniqueIdentifier.split('.')
    return {
      version,
      publisher,
      name
    }
  }
  function generateLink ({ version, publisher, name }) {
    // return `/_apis/public/gallery/publisher/${ publisher }/extension/${ name }/${ version }/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage`
    return `/_apis/public/gallery/publishers/${ publisher }/vsextensions/${ name }/${ version }/vspackage`
  }
  function generateName ({ version, publisher, name }) {
    return `${ publisher }.${ name }-${ version }.vsix`
  }
  function injectButton (info) {
    // const main = document.createElement('span')
    const main = document.createElement('a')

    main.className = 'ux-oneclick-install-button-container'
    main.style = 'margin-left: 10px'
    main.innerHTML = $('.ux-oneclick-install-button-container')
      .innerHTML
      .replace('id__0', 'id__99')
      .replace('Install', 'Download')
    // main.addEventListener('click', handleDownload.bind(null, info))
    main.href = generateLink(info)

    const mParent = $('.ux-oneclick-install-button-container').parentNode
    const installHelpInfo = $('.installHelpInfo')

    mParent.insertBefore(main, installHelpInfo)
  }
  function injectHistoryButton (info) {
    const history = $$('.version-history-container-row').slice(1)

    if ($$('.version-history-container-column:nth-child(2) a', history[0]).length > 0) { return }

    for (let row of history) {
      const columns = $$('.version-history-container-column', row)
      const version = columns[0].innerText
      const newInfo = Object.assign({}, info, { version })
      
      const button = document.createElement('a')
      button.innerText = 'Download'
      // button.addEventListener('click', handleDownload.bind(null, newInfo))
      button.href = generateLink(newInfo)
      columns[1].appendChild(button)
    }
  }
  async function handleDownload (info) {
    const mask = document.createElement('div')
    const tip = document.createElement('p')
    tip.innerText = 'Fetching, Please Wait'
    mask.appendChild(tip)
    mask.style = 'width: 100%; height: 100%; position: fixed; top: 0; left: 0; background: rgba(0, 0, 0, 0.5); z-index: 999; display: inline-flex; color: white; font-size: 50px; font-weight: bold; align-items: center; justify-content: center; flex-direction: column;'
    document.body.appendChild(mask)
    disablescroll()

    try {
      const res = await fetch(generateLink(info));
      if (!res.ok) {
        alert('Network Error')
      };
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = generateName(info);
      a.innerHTML = '<button type="button" class="ms-Button ux-button install ms-Button--default root-39" data-is-focusable="true"><div class="ms-Button-flexContainer flexContainer-40"><div class="ms-Button-textContainer textContainer-41"><div class="ms-Button-label label-43" id="id__99">Save</div></div></div></button>'

      tip.innerText = 'Fetched'
      mask.appendChild(a);
      
      a.addEventListener('click', () => {
        document.body.removeChild(mask)
        enablescroll()
      })
    } catch (e) {
      console.error(e);
      alert('Download Failed');
    }
  }
  function enablescroll () {
    document.documentElement.style.overflowY = 'scroll' 
  }
  function disablescroll () {
    document.documentElement.style.overflowY = 'hidden' 
  }
})();