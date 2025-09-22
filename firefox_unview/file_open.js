// 文件导入功能主模块
(function() {
    // 获取DOM元素
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileName');
    const openFileButton = document.getElementById('openFileButton');
    const statusMessage = document.getElementById('statusMessage');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // 初始化
    function init() {
        setupEventListeners();
    }

    // 设置事件监听器
    function setupEventListeners() {
        // 监听文件选择变化
        fileInput.addEventListener('change', handleFileSelection);
        
        // 监听打开文件按钮点击事件
        openFileButton.addEventListener('click', () => {
            resetUI();
            fileInput.click(); // 模拟点击文件输入框
        });
    }

    // 处理文件选择
    async function handleFileSelection(e) {
        try {
            const file = e.target.files[0];
            if (!file) return;

            // 显示文件名
            fileNameDisplay.textContent = file.name;
            
            // 检查文件类型
            if (!file.name.endsWith('.json')) {
                showStatus('请选择JSON格式的文件', 'error');
                resetFileInput();
                return;
            }

            // 显示加载状态
            showLoading(true);
            disableButton(true);

            // 读取和处理文件
            await processFile(file);
        } catch (error) {
            console.error('导入数据过程中发生错误:', error);
            showStatus('导入数据失败，请重试', 'error');
        } finally {
            showLoading(false);
            disableButton(false);
            
            // 延迟重置和关闭窗口，让用户有时间看到状态消息
            setTimeout(() => {
                resetFileInput();
                closeWindow();
            }, 1500);
        }
    }

    // 处理文件内容
    async function processFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const jsonData = event.target.result;
                    const urlsByDate = JSON.parse(jsonData);
                    
                    // 验证导入的数据结构
                    if (!validateImportedData(urlsByDate)) {
                        throw new Error('数据结构不正确');
                    }
                    
                    console.log('导入的数据:', urlsByDate);
                    
                    // 保存导入的数据
                    await browser.storage.local.set({ urlsByDate });
                    
                    // 显示成功消息
                    showStatus('数据已成功导入', 'success');
                    
                    // 向popup页面发送成功消息
                    sendMessageToPopup({ 
                        action: 'importSuccess', 
                        message: '数据已成功导入',
                        data: urlsByDate
                    });
                    
                    resolve();
                } catch (parseError) {
                    console.error('解析文件失败:', parseError);
                    showStatus('文件格式错误，无法导入数据', 'error');
                    sendMessageToPopup({ 
                        action: 'importError', 
                        message: '文件格式错误，无法导入数据'
                    });
                    reject(parseError);
                }
            };

            reader.onerror = (error) => {
                console.error('读取文件失败:', error);
                showStatus('读取文件失败，请重试', 'error');
                sendMessageToPopup({ 
                    action: 'importError', 
                    message: '读取文件失败，请重试'
                });
                reject(error);
            };

            reader.readAsText(file);
        });
    }

    // 验证导入的数据结构
    function validateImportedData(data) {
        // 基本验证：确保数据是对象
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // 可以根据实际需求添加更详细的数据结构验证
        return true;
    }

    // 显示状态消息
    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message';
        
        if (type === 'success') {
            statusMessage.classList.add('status-success');
        } else if (type === 'error') {
            statusMessage.classList.add('status-error');
        }
        
        statusMessage.style.display = 'block';
    }

    // 显示/隐藏加载指示器
    function showLoading(show) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }

    // 启用/禁用按钮
    function disableButton(disable) {
        openFileButton.disabled = disable;
    }

    // 重置文件输入
    function resetFileInput() {
        fileInput.value = '';
        fileNameDisplay.textContent = '(未选择文件)';
    }

    // 重置UI
    function resetUI() {
        resetFileInput();
        statusMessage.style.display = 'none';
    }

    // 关闭当前窗口
    function closeWindow() {
        browser.windows.getCurrent().then((window) => {
            if (window && window.id) {
                browser.windows.remove(window.id);
            }
        }).catch(error => {
            console.error('关闭窗口失败:', error);
        });
    }

    // 向popup页面发送消息
    function sendMessageToPopup(message) {
        browser.runtime.sendMessage(message).catch(error => {
            console.warn('发送消息到popup页面失败:', error);
            // 即使消息发送失败也继续执行，不中断流程
        });
    }

    // 初始化应用
    document.addEventListener('DOMContentLoaded', init);
})();