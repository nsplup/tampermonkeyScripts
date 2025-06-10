// ==UserScript==
// @name         Imgur Uploader & History
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Upload images to Imgur and manage upload history.
// @author       Luke Pan
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @noframes
// ==/UserScript==

(async function() {
    'use strict';

    // Imgur API 密钥的存储键
    const CLIENT_ID_KEY = 'imgur_client_id';
    // 上传历史的存储键
    const UPLOAD_HISTORY_KEY = 'imgur_upload_history';
    // Imgur API 上传 URL
    const IMGUR_UPLOAD_URL = 'https://api.imgur.com/3/image';

    // 最大历史记录数量（占GM存储的90%的估算，实际可能需要根据GM存储限制调整）
    // Imgur免费API限制为50张图片每小时，因此我们设定一个相对合理的历史记录数量，
    // 假设每张图片链接加日期等信息约1KB，500KB的GM存储空间，可以存储几百条记录。
    // 这里我们先设定一个初始值，实际使用中可以根据用户反馈和GM存储限制进行调整。
    const MAX_HISTORY_ITEMS = 100; // 假设每条历史记录约为1KB，100条约100KB，远低于GM存储限制。

    let clientId = ''; // Imgur API 密钥
    let uploadHistory = []; // 上传历史列表

    // --------------------------------------------------------------------------------
    // 1. 全局接口暴露与API密钥管理
    // --------------------------------------------------------------------------------

    /**
     * 设置 Imgur API 密钥。
     * @param {string} key Imgur 应用程序的 Client ID。
     */
    window.setImgurClientId = function(key) {
        if (typeof key === 'string' && key.trim() !== '') {
            clientId = key.trim();
            GM_setValue(CLIENT_ID_KEY, clientId);
            console.log('Imgur Client ID set successfully.');
        } else {
            console.error('Invalid Imgur Client ID. Please provide a non-empty string.');
        }
    };

    /**
     * 获取当前设置的 Imgur API 密钥。
     * @returns {string} Imgur API 密钥。
     */
    window.getImgurClientId = function() {
        return clientId;
    };

    // 启动时加载 API 密钥
    clientId = await GM_getValue(CLIENT_ID_KEY)

    // --------------------------------------------------------------------------------
    // 2. Imgur 图片上传函数
    // --------------------------------------------------------------------------------

    /**
     * 上传图片到 Imgur。
     * @param {File | Blob} file 图片文件对象或 Blob 对象。
     * @returns {Promise<string>} 成功返回图片链接，失败返回错误信息。
     */
    async function uploadImageToImgur(file) {
        if (!clientId) {
            alert('Imgur Client ID is not set. Please set it using window.setImgurClientId("YOUR_CLIENT_ID") in the console.');
            throw new Error('Imgur Client ID not set.');
        }

        if (!(file instanceof File) && !(file instanceof Blob)) {
            throw new Error('Invalid file type. Please provide a File or Blob object.');
        }

        const formData = new FormData();
        formData.append('image', file);

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "POST",
                url: IMGUR_UPLOAD_URL,
                headers: {
                    "Authorization": `Client-ID ${clientId}`
                },
                data: formData,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.success) {
                            const imageUrl = data.data.link;
                            const fileName = file.name || 'unknown_file'; // 获取文件名
                            console.log('Image uploaded to Imgur:', imageUrl);
                            addToUploadHistory(imageUrl, fileName); // 传递文件名
                            resolve(imageUrl);
                        } else {
                            console.error('Imgur upload failed:', data.data.error);
                            reject(new Error(data.data.error || 'Unknown Imgur upload error.'));
                        }
                    } catch (e) {
                        console.error('Error parsing Imgur response:', e);
                        reject(new Error('Failed to parse Imgur API response.'));
                    }
                },
                onerror: function(error) {
                    console.error('GM_xmlhttpRequest error:', error);
                    reject(new Error('Network error during upload or CSP blocked.'));
                },
            });
        });
    }

    // 暴露上传函数到全局
    window.imgurUploader = {
        upload: uploadImageToImgur,
        setClientId: window.setImgurClientId,
        getClientId: window.getImgurClientId,
        getHistory: () => uploadHistory, // 暴露获取历史记录的接口
        clearHistory: clearUploadHistory // 暴露清空历史记录的接口
    };

    // --------------------------------------------------------------------------------
    // 3. 上传历史列表管理
    // --------------------------------------------------------------------------------

    /**
     * 从存储中加载上传历史。
     */
    async function loadUploadHistory() {
        const history = await GM_getValue(UPLOAD_HISTORY_KEY);
        if (history) {
            // 确保旧的记录也有 fileName 字段，如果没有则默认为 'unknown_file'
            uploadHistory = history.map(item => ({
                url: item.url,
                uploadDate: item.uploadDate,
                fileName: item.fileName || 'unknown_file'
            })).sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
            console.log('Loaded upload history from storage.');
            renderUploadHistory();
        }
    }

    /**
     * 添加图片链接到上传历史。
     * @param {string} imageUrl 上传成功的图片链接。
     */
    function addToUploadHistory(imageUrl, fileName) {
        const newItem = {
            url: imageUrl,
            uploadDate: new Date().toISOString(),
            fileName: fileName
        };

        uploadHistory.unshift(newItem);

        if (uploadHistory.length > MAX_HISTORY_ITEMS) {
            uploadHistory = uploadHistory.slice(0, MAX_HISTORY_ITEMS);
        }

        GM_setValue(UPLOAD_HISTORY_KEY, uploadHistory);
        renderUploadHistory();
    }

    /**
     * 清空上传历史。
     */
    function clearUploadHistory() {
        uploadHistory = [];
        GM_deleteValue(UPLOAD_HISTORY_KEY);
        renderUploadHistory();
        console.log('Upload history cleared.');
    }

    // 启动时加载上传历史
    loadUploadHistory();

    // --------------------------------------------------------------------------------
    // 4. 用户界面与拖拽功能
    // --------------------------------------------------------------------------------

    // 注入 CSS 样式
    GM_addStyle(`
        #imgur-toggle-button {
            position: fixed;
            bottom: 40px;
            right: 40px;
            width: 40px;
            height: 40px;
            background-color: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 1.5em;
            text-align: center;
            line-height: 40px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            z-index: 9999;
            font-family: Arial, sans-serif;
            transition: transform 0.2s ease-in-out;
        }
        #imgur-uploader-panel {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 300px;
            background-color: #fff;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            padding: 15px;
            z-index: 9998;
            color: #333 !important;
            font-size: 1em !important;
            font-family: Arial, sans-serif;
            display: none;
            transition: all 0.3s ease-in-out;
        }
        #imgur-uploader-panel.visible {
            display: block;
        }
        #imgur-uploader-panel h3 {
            margin-top: 0;
            margin-bottom: 10px;
            font-size: 1.2em !important;
        }
        #imgur-uploader-panel button {
            background-color: #007bff;
            color: white;
            padding: 8px 15px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
            font-size: 0.9em;
        }
        #imgur-uploader-panel button:hover {
            background-color: #0056b3;
        }
        #imgur-history-list {
            max-height: 250px;
            overflow-y: auto;
            border: 1px solid #eee;
            border-radius: 5px;
            padding: 5px;
            background-color: #f9f9f9;
        }
        #imgur-history-list .history-item { /* 新增的样式类 */
            display: flex; /* 使用 flexbox 布局 */
            align-items: center; /* 垂直居中 */
            margin-bottom: 8px;
            padding: 5px;
            border-bottom: 1px dashed #eee; /* 分隔线 */
            cursor: pointer; /* 表示可点击 */
            transition: background-color 0.1s ease-in-out;
        }
        #imgur-history-list .history-item:hover {
            background-color: #eef;
        }
        #imgur-history-list .history-item:last-child {
            border-bottom: none;
        }
        #imgur-history-list img {
            width: 60px; /* 缩小预览图 */
            height: 60px;
            object-fit: cover;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-right: 10px; /* 图片和文本之间的间距 */
            flex-shrink: 0; /* 防止图片缩小 */
        }
        #imgur-history-list .item-info {
            flex-grow: 1; /* 占据剩余空间 */
        }
        #imgur-history-list .item-info span {
            display: block; /* 文件名和日期各自一行 */
            font-size: 0.9em;
            color: #333;
            word-break: break-all; /* 防止长文件名溢出 */
        }
        #imgur-history-list .item-info small {
            font-size: 0.75em;
            color: #777;
        }
        #imgur-history-list p.no-history {
            font-size: 0.8em;
            color: #666;
            text-align: center;
            margin-top: 10px;
        }
        #imgur-uploader-status {
            margin: 10px 0;
            font-size: 0.8em;
            color: #949494;
        }
    `);

    // 创建 UI 切换按钮和面板
    function createUIPanel() {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'imgur-toggle-button';
        toggleButton.innerHTML = '↗️';
        document.body.appendChild(toggleButton);

        const panel = document.createElement('div');
        panel.id = 'imgur-uploader-panel';
        panel.innerHTML = `
            <h3>Imgur Uploader</h3>
            <input type="file" id="imgur-file-input" accept="image/*">
            <button id="imgur-upload-btn">Upload Image</button>
            <div id="imgur-uploader-status"></div>
            <h3>Upload History</h4>
            <div id="imgur-history-list">
                <p class="no-history">No history yet.</p>
            </div>
            <button id="imgur-clear-history-btn">Clear History</button>
        `;
        document.body.appendChild(panel);

        const fileInput = document.getElementById('imgur-file-input');
        const uploadBtn = document.getElementById('imgur-upload-btn');
        const statusDiv = document.getElementById('imgur-uploader-status');
        const historyListDiv = document.getElementById('imgur-history-list');
        const clearHistoryBtn = document.getElementById('imgur-clear-history-btn');

        toggleButton.addEventListener('click', () => {
            panel.classList.toggle('visible');
        });

        uploadBtn.addEventListener('click', async () => {
            const file = fileInput.files[0];
            if (file) {
                statusDiv.textContent = 'Uploading...';
                try {
                    const link = await uploadImageToImgur(file);
                    statusDiv.innerHTML = `Upload successful! <a href="${link}" target="_blank">${link}</a>`;
                    fileInput.value = '';
                } catch (error) {
                    statusDiv.textContent = `Upload failed: ${error.message}`;
                }
            } else {
                statusDiv.textContent = 'Please select a file to upload.';
            }
        });

        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all upload history?')) {
                clearUploadHistory();
            }
        });

        // 绑定拖拽事件到历史列表容器
        historyListDiv.addEventListener('dragstart', (e) => {
            // 确保拖拽的是我们添加的图片或其父容器
            const targetItem = e.target.closest('.history-item');
            if (targetItem && targetItem.dataset.url) {
                e.dataTransfer.setData('text/plain', targetItem.dataset.url);
                e.dataTransfer.effectAllowed = 'copy';
            }
        });


        document.addEventListener('dragover', (e) => {
            if (e.target.tagName === 'INPUT' && e.dataTransfer.types.includes('text/plain')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.target.tagName === 'INPUT' && e.dataTransfer.types.includes('text/plain')) {
                const imageUrl = e.dataTransfer.getData('text/plain');
                if (imageUrl) {
                    e.preventDefault();
                    if (e.target.value) {
                        e.target.value += (e.target.value.endsWith(' ') ? '' : ' ') + imageUrl;
                    } else {
                        e.target.value = imageUrl;
                    }
                }
            }
        });

        renderUploadHistory();
    }

    /**
     * 渲染上传历史列表。
     */
    function renderUploadHistory() {
        const historyListDiv = document.getElementById('imgur-history-list');
        if (!historyListDiv) return;

        historyListDiv.innerHTML = '';

        if (uploadHistory.length === 0) {
            historyListDiv.innerHTML = '<p class="no-history">No history yet.</p>';
            return;
        }

        uploadHistory.forEach(item => {
            const historyItemDiv = document.createElement('div');
            historyItemDiv.className = 'history-item';
            historyItemDiv.dataset.url = item.url; // 将 URL 存储在容器上，以便拖拽
            historyItemDiv.draggable = true; // 使容器可拖拽

            const img = document.createElement('img');
            img.src = item.url;
            img.alt = `Uploaded on ${new Date(item.uploadDate).toLocaleString()}`;
            img.title = `Click to copy URL: ${item.url}\nUploaded: ${new Date(item.uploadDate).toLocaleString()}\nFile: ${item.fileName}`;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'item-info';

            const fileNameSpan = document.createElement('span');
            fileNameSpan.textContent = item.fileName;
            fileNameSpan.title = `File: ${item.fileName}`;

            const dateSmall = document.createElement('small');
            dateSmall.textContent = new Date(item.uploadDate).toLocaleString();

            // 图片加载失败时（CSP问题或其他）
            img.onerror = function() {
                this.style.display = 'none'; // 隐藏图片
                // 在文件名旁边显示一个警告图标或文字
                fileNameSpan.textContent = `🚫 ${item.fileName}`;
                fileNameSpan.style.color = 'red';
                fileNameSpan.title = `Image blocked by CSP or failed to load. URL: ${item.url}`;
            };

            infoDiv.appendChild(fileNameSpan);
            infoDiv.appendChild(dateSmall);

            historyItemDiv.appendChild(img);
            historyItemDiv.appendChild(infoDiv);

            // 点击整个历史项复制链接
            historyItemDiv.addEventListener('click', () => {
                navigator.clipboard.writeText(item.url).then(() => {
                    alert('Image URL copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy text:', err);
                    alert('Failed to copy URL. Please try manually.');
                });
            });

            historyListDiv.appendChild(historyItemDiv);
        });
    }

    createUIPanel()

    // 油猴菜单命令，方便用户设置 API 密钥
    GM_registerMenuCommand("Set Imgur Client ID", () => {
        const newClientId = prompt("Please enter your Imgur Client ID:");
        if (newClientId) {
            window.setImgurClientId(newClientId);
        }
    });

    // 油猴菜单命令，方便用户清空历史记录
    GM_registerMenuCommand("Clear Imgur Upload History", () => {
        if (confirm('Are you sure you want to clear all Imgur upload history?')) {
            clearUploadHistory();
        }
    });
})();