// 获取DOM元素
const addCurrentPageBtn = document.getElementById('addCurrentPage');
const addAllTabsBtn = document.getElementById('addAllTabs');
const removeDuplicatesBtn = document.getElementById('removeDuplicates');
const listContainer = document.getElementById('listContainer');
const searchInput = document.getElementById('searchInput');
const exportDataBtn = document.getElementById('exportData');
const importDataBtn = document.getElementById('importData');
const closeOtherTabsBtn = document.getElementById('closeOtherTabs');

// 添加搜索功能事件监听
searchInput.addEventListener('input', () => {
  loadUrls(searchInput.value.toLowerCase());
});

// 导出数据到本地文件
exportDataBtn.addEventListener('click', async () => {
  try {
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};

    // 将数据转换为JSON字符串
    const jsonData = JSON.stringify(urlsByDate, null, 2);

    // 创建Blob对象
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    // 以当前日期作为文件名
    const today = new Date().toISOString().split('T')[0];
    a.download = `待浏览列表备份_${today}.json`;
    document.body.appendChild(a);
    a.click();

    // 清理
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    showNotification('数据已成功导出到本地文件');
  } catch (error) {
    console.error('导出数据失败:', error);
    showNotification('导出数据失败，请重试');
  }
});

// 关闭除当前页面外的其他所有标签页
closeOtherTabsBtn.addEventListener('click', async () => {
  try {
    // 获取当前窗口的所有标签页
    const tabs = await browser.tabs.query({ currentWindow: true });
    // 获取当前活动标签页
    const activeTab = await browser.tabs.query({ active: true, currentWindow: true });

    if (tabs.length <= 1) {
      showNotification('没有其他标签页可关闭');
      return;
    }

    // 显示确认对话框
    if (confirm(`确定要关闭除当前页外的 ${tabs.length - 1} 个标签页吗？`)) {
      // 收集所有非活动标签页的ID
      const tabsToClose = tabs.filter(tab => tab.id !== activeTab[0].id).map(tab => tab.id);

      // 关闭这些标签页
      await browser.tabs.remove(tabsToClose);
      showNotification(`已关闭 ${tabsToClose.length} 个标签页`);
    }
  } catch (error) {
    console.error('关闭其他标签页失败:', error);
    showNotification('关闭其他标签页失败，请重试');
  }
});

// 导入数据从本地文件
importDataBtn.addEventListener('click', () => {
  // 显示确认对话框，警告用户导入会覆盖现有数据
  if (confirm('导入数据将会覆盖现有列表，确定要继续吗？')) {
    // 在Firefox中，直接打开background页面让用户点击按钮导入数据
    browser.runtime.sendMessage({ action: 'openFileDialog' });

    // 提示用户在background页面上点击导入按钮
    showNotification('请在弹出的background页面中点击"导入JSON文件"按钮');
  }
});


// 监听来自background页面的消息
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'importSuccess') {
    showNotification(message.message);
    loadUrls(); // 重新加载列表
  } else if (message.action === 'importError') {
    showNotification(message.message);
  }
});

// 初始化页面时加载待浏览列表
loadUrls();

// 添加当前页面到待浏览列表
addCurrentPageBtn.addEventListener('click', async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs.length > 0) {
      const currentTab = tabs[0];
      await addUrlToList(currentTab.url, currentTab.title);
      showNotification('当前页面已添加到待浏览列表');
    }
  } catch (error) {
    console.error('添加当前页面失败:', error);
  }
});

// 添加所有标签页到待浏览列表
addAllTabsBtn.addEventListener('click', async () => {
  try {
    const tabs = await browser.tabs.query({ currentWindow: true });
    if (tabs && tabs.length > 0) {
      const urlsAdded = [];
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('about:')) {
          await addUrlToList(tab.url, tab.title);
          urlsAdded.push(tab.url);
        }
      }
      showNotification(`已添加 ${urlsAdded.length} 个标签页到待浏览列表`);
    }
  } catch (error) {
    console.error('添加所有标签页失败:', error);
  }
});

// 去重功能
removeDuplicatesBtn.addEventListener('click', async () => {
  try {
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};

    // 收集所有URL并检测重复
    const allUrls = new Map(); // key: url, value: {date, title}
    const duplicateUrls = new Set();

    for (const [date, urls] of Object.entries(urlsByDate)) {
      for (const urlInfo of urls) {
        if (allUrls.has(urlInfo.url)) {
          duplicateUrls.add(urlInfo.url);
        } else {
          allUrls.set(urlInfo.url, { date, title: urlInfo.title });
        }
      }
    }

    if (duplicateUrls.size === 0) {
      showNotification('没有找到重复的URL');
      return;
    }

    // 显示确认对话框
    const confirmMessage = `找到 ${duplicateUrls.size} 个重复的URL，确定要删除重复项吗？`;
    if (confirm(confirmMessage)) {
      // 创建新的去重后的URL数据结构
      const newUrlsByDate = {};

      // 遍历去重后的URL集合
      for (const [url, info] of allUrls.entries()) {
        if (!newUrlsByDate[info.date]) {
          newUrlsByDate[info.date] = [];
        }
        newUrlsByDate[info.date].push({ url, title: info.title });
      }

      // 保存去重后的数据
      await browser.storage.local.set({ urlsByDate: newUrlsByDate });
      showNotification(`已删除 ${duplicateUrls.size} 个重复的URL`);
      loadUrls(); // 重新加载列表
    }
  } catch (error) {
    console.error('去重失败:', error);
  }
});

// 添加URL到列表
async function addUrlToList(url, title) {
  try {
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};

    // 获取当前日期（YYYY-MM-DD格式）
    const today = new Date().toISOString().split('T')[0];

    // 初始化今天的数组（如果不存在）
    if (!urlsByDate[today]) {
      urlsByDate[today] = [];
    }

    // 检查URL是否已存在（在当前日期下）
    const urlExists = urlsByDate[today].some(urlInfo => urlInfo.url === url);
    if (!urlExists) {
      urlsByDate[today].push({ url, title: title || url });
      await browser.storage.local.set({ urlsByDate });
      loadUrls(); // 重新加载列表
    }
  } catch (error) {
    console.error('添加URL失败:', error);
  }
}

// 加载并显示待浏览列表
async function loadUrls(searchTerm = '') {
  try {
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};

    // 清空列表容器
    listContainer.innerHTML = '';

    // 如果没有URL，显示空消息
    if (Object.keys(urlsByDate).length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = '待浏览列表为空，点击上方按钮添加URL';
      listContainer.appendChild(emptyMessage);
      return;
    }

    // 获取所有日期并按降序排序
    const dates = Object.keys(urlsByDate).sort((a, b) => new Date(b) - new Date(a));

    let hasVisibleUrls = false;

    // 为每个日期创建分组
    for (const date of dates) {
      const urls = urlsByDate[date];

      // 创建日期分组容器
      const dateGroup = document.createElement('div');
      dateGroup.className = 'date-group';

      // 创建日期标题容器
      const dateHeader = document.createElement('div');
      dateHeader.className = 'date-header';

      // 创建折叠/展开按钮
      const toggleBtn = document.createElement('span');
      toggleBtn.className = 'toggle-btn';
      toggleBtn.textContent = '▼'; // 默认展开
      dateHeader.appendChild(toggleBtn);

      // 创建日期文本
      const dateText = document.createElement('span');
      dateText.className = 'date-text';
      dateText.textContent = formatDate(date);
      dateHeader.appendChild(dateText);

      dateGroup.appendChild(dateHeader);

      // 创建URL列表容器
      const urlsContainer = document.createElement('div');
      urlsContainer.className = 'urls-container';
      dateGroup.appendChild(urlsContainer);

      // 添加折叠/展开功能
      dateHeader.addEventListener('click', () => {
        const isExpanded = toggleBtn.textContent === '▼';
        toggleBtn.textContent = isExpanded ? '▶' : '▼';
        urlsContainer.style.display = isExpanded ? 'none' : 'block';
      });

      let hasVisibleUrlsInDate = false;

      // 为每个URL创建条目
      urls.forEach((urlInfo, index) => {
        // 根据搜索词过滤URL
        if (searchTerm && !urlInfo.title.toLowerCase().includes(searchTerm) && !urlInfo.url.toLowerCase().includes(searchTerm)) {
          return;
        }

        hasVisibleUrls = true;
        hasVisibleUrlsInDate = true;

        const urlItem = document.createElement('div');
        urlItem.className = 'url-item';

        // 创建URL链接
        const urlLink = document.createElement('a');
        urlLink.href = urlInfo.url;
        urlLink.target = '_blank';
        urlLink.textContent = urlInfo.title || urlInfo.url;
        urlItem.appendChild(urlLink);

        // 创建删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', (e) => {
          e.preventDefault(); // 阻止链接跳转
          deleteUrl(date, index);
        });
        urlItem.appendChild(deleteBtn);

        urlsContainer.appendChild(urlItem); // 将URL项添加到URL容器中
      });

      // 只有当该日期有可见的URL时，才添加到列表容器
      if (hasVisibleUrlsInDate) {
        listContainer.appendChild(dateGroup);
      }
    }

    // 如果搜索后没有匹配的URL，显示提示信息
    if (!hasVisibleUrls) {
      const noResultsMessage = document.createElement('div');
      noResultsMessage.className = 'empty-message';
      noResultsMessage.textContent = '没有找到匹配的URL';
      listContainer.appendChild(noResultsMessage);
    }
  } catch (error) {
    console.error('加载URL列表失败:', error);
  }
}

// 删除指定的URL
async function deleteUrl(date, index) {
  try {
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};

    if (urlsByDate[date] && urlsByDate[date][index]) {
      // 从数组中删除指定索引的URL
      urlsByDate[date].splice(index, 1);

      // 如果该日期的数组为空，则删除该日期
      if (urlsByDate[date].length === 0) {
        delete urlsByDate[date];
      }

      // 保存更新后的数据
      await browser.storage.local.set({ urlsByDate });
      loadUrls(); // 重新加载列表
    }
  } catch (error) {
    console.error('删除URL失败:', error);
  }
}

// 格式化日期显示
function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  // 获取今天、昨天和明天的日期进行比较
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];

  if (dateString === today) {
    return `今天 ${year}-${month}-${day}`;
  } else if (dateString === yesterdayString) {
    return `昨天 ${year}-${month}-${day}`;
  } else if (dateString === tomorrowString) {
    return `明天 ${year}-${month}-${day}`;
  } else {
    return `${year}-${month}-${day}`;
  }
}

// 显示通知
function showNotification(message) {
  // 创建一个简单的通知元素
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '10px';
  notification.style.right = '10px';
  notification.style.padding = '10px 15px';
  notification.style.backgroundColor = '#4285f4';
  notification.style.color = 'white';
  notification.style.borderRadius = '4px';
  notification.style.zIndex = '1000';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  notification.textContent = message;

  document.body.appendChild(notification);

  // 3秒后移除通知
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}