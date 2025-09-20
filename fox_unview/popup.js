// 获取DOM元素
const searchInput = document.getElementById('searchInput');
const addCurrentPageBtn = document.getElementById('addCurrentPage');
const addAllTabsBtn = document.getElementById('addAllTabs');
const removeDuplicatesBtn = document.getElementById('removeDuplicates');
const closeOtherTabsBtn = document.getElementById('closeOtherTabs');
const exportDataBtn = document.getElementById('exportData');
const importDataBtn = document.getElementById('importData');
const fileInput = document.getElementById('fileInput');
const listContainer = document.getElementById('listContainer');

// 添加事件监听器
searchInput.addEventListener('input', (e) => {
  loadUrls(e.target.value.toLowerCase());
});

addCurrentPageBtn.addEventListener('click', addCurrentPage);
addAllTabsBtn.addEventListener('click', addAllTabs);
removeDuplicatesBtn.addEventListener('click', removeDuplicates);
closeOtherTabsBtn.addEventListener('click', closeOtherTabs);
exportDataBtn.addEventListener('click', exportData);
importDataBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', importData);

// 页面加载时加载URL列表
document.addEventListener('DOMContentLoaded', () => {
  loadUrls();
});

// 导出数据
async function exportData() {
  try {
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};
    
    // 将数据转换为JSON字符串
    const dataStr = JSON.stringify(urlsByDate, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    // 创建下载链接
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `待浏览列表_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出数据失败:', error);
  }
}

// 关闭其他标签页
async function closeOtherTabs() {
  try {
    // 确认对话框
    if (!confirm('确定要关闭所有其他标签页吗？')) {
      return;
    }
    
    // 获取当前窗口的所有标签页
    const tabs = await browser.tabs.query({ currentWindow: true });
    
    // 获取当前标签页ID
    const currentTab = await browser.tabs.getCurrent();
    
    // 关闭除当前标签页外的所有标签页
    const tabsToClose = tabs.filter(tab => tab.id !== currentTab.id);
    
    if (tabsToClose.length > 0) {
      await browser.tabs.remove(tabsToClose.map(tab => tab.id));
      showNotification(`已关闭 ${tabsToClose.length} 个标签页`);
    }
  } catch (error) {
    console.error('关闭标签页失败:', error);
  }
}

// 导入数据
async function importData(e) {
  try {
    const file = e.target.files[0];
    if (!file) {
      return;
    }
    
    // 读取文件内容
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        
        // 合并数据
        const currentData = await browser.storage.local.get('urlsByDate');
        const urlsByDate = currentData.urlsByDate || {};
        
        // 遍历导入的数据并合并
        for (const date in importedData) {
          if (!urlsByDate[date]) {
            urlsByDate[date] = [];
          }
          
          // 添加新URL（避免重复）
          const existingUrls = new Set(urlsByDate[date].map(urlInfo => urlInfo.url));
          const newUrls = importedData[date].filter(urlInfo => !existingUrls.has(urlInfo.url));
          
          urlsByDate[date] = [...urlsByDate[date], ...newUrls];
        }
        
        // 保存合并后的数据
        await browser.storage.local.set({ urlsByDate });
        showNotification('数据导入成功');
        loadUrls(); // 重新加载列表
        
        // 重置文件输入
        fileInput.value = '';
      } catch (error) {
        console.error('解析导入数据失败:', error);
        alert('导入数据失败，请检查文件格式是否正确');
      }
    };
    
    reader.readAsText(file);
  } catch (error) {
    console.error('导入数据失败:', error);
  }
}

// 添加当前页面
async function addCurrentPage() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    await addUrlToList(currentTab.url, currentTab.title);
    showNotification('当前页面已添加到待浏览列表');
  } catch (error) {
    console.error('添加当前页面失败:', error);
  }
}

// 添加所有标签页
async function addAllTabs() {
  try {
    const tabs = await browser.tabs.query({ currentWindow: true });
    
    // 确认对话框
    if (!confirm(`确定要添加当前窗口的 ${tabs.length} 个标签页到待浏览列表吗？`)) {
      return;
    }
    
    // 获取现有URL列表
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};
    
    // 获取当前日期
    const today = new Date().toISOString().split('T')[0];
    
    // 初始化今天的数组（如果不存在）
    if (!urlsByDate[today]) {
      urlsByDate[today] = [];
    }
    
    // 获取今天已存在的URL
    const existingUrlsToday = new Set(urlsByDate[today].map(urlInfo => urlInfo.url));
    
    // 添加不存在的URL
    let addedCount = 0;
    for (const tab of tabs) {
      if (!existingUrlsToday.has(tab.url)) {
        urlsByDate[today].push({ url: tab.url, title: tab.title || tab.url });
        addedCount++;
      }
    }
    
    // 保存更新后的数据
    await browser.storage.local.set({ urlsByDate });
    showNotification(`已添加 ${addedCount} 个新标签页到待浏览列表`);
    loadUrls(); // 重新加载列表
  } catch (error) {
    console.error('添加所有标签页失败:', error);
  }
}

// 移除重复的URL
async function removeDuplicates() {
  try {
    const data = await browser.storage.local.get('urlsByDate');
    const urlsByDate = data.urlsByDate || {};
    
    // 创建新的去重后的数据结构
    const newUrlsByDate = {};
    const allUrls = new Set();
    const duplicateUrls = new Set();
    
    // 按日期降序处理
    const dates = Object.keys(urlsByDate).sort((a, b) => new Date(b) - new Date(a));
    
    // 去重处理
    for (const date of dates) {
      const urls = urlsByDate[date];
      
      if (!newUrlsByDate[date]) {
        newUrlsByDate[date] = [];
      }
      
      // 检查URL是否已存在于其他日期
      for (const urlInfo of urls) {
        if (allUrls.has(urlInfo.url)) {
          duplicateUrls.add(urlInfo.url);
        } else {
          allUrls.add(urlInfo.url);
          newUrlsByDate[date].push({ url: urlInfo.url, title: urlInfo.title });
        }
      }
      
      // 如果该日期没有URL，删除该日期
      if (newUrlsByDate[date].length === 0) {
        delete newUrlsByDate[date];
      }
    }
    
    // 保存去重后的数据
    await browser.storage.local.set({ urlsByDate: newUrlsByDate });
    showNotification(`已删除 ${duplicateUrls.size} 个重复的URL`);
    loadUrls(); // 重新加载列表
  } catch (error) {
    console.error('去重失败:', error);
  }
}

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
  notification.style.backgroundColor = '#0078d7';
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