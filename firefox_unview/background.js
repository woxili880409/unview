
// 监听来自popup页面的消息
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openFileDialog') {
    // 触发文件选择对话框
    sendMessageToPopup({ action: 'openFileDialog', windowWidth: message.windowWidth, windowTop: message.windowTop });
    
    let createData = {
      type: "detached_panel",
      url: "file_open.html",
      width: 365,
      height: 365,
      incognito: false,
      focused: true
    };
    //创建窗口并居中
    browser.windows.create(createData).then((window) => {
      // 窗口创建成功后，将窗口居中
      browser.windows.update(window.id, {
        left: message.windowWidth-365-58, //窗口左边距为窗口宽度减去窗口宽度
        top: message.windowTop+58*2 //firefox 80px的标题栏高度
      });
    });
    // 监听窗口关闭事件
    browser.windows.onRemoved.addListener((windowId) => {
      if (windowId === window.id) {
        // 窗口关闭时，向popup页面发送消息
        sendMessageToPopup({ action: 'fileOpenWindowClosed' });
      }
    });
  }
});

// 发送消息到popup页面
function sendMessageToPopup(message) {
  browser.runtime.sendMessage(message);
}