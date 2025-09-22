# 待浏览列表 - Firefox 插件

这是一个适用于 Firefox 浏览器的待浏览列表插件，基于 Chrome 插件版本进行适配。
由于firefox的popup窗口在失去焦点后会自动隐藏，导致文件选择后的 "change" 事件无法触发，因此导入文件功能做了以下特殊处理：

- 在 `background.html` 中创建一个扩展页面:`file_open.html`和`file_open.js`，用于文件选择。
- 在 `file_open.js` 中监听 `file_open.html` 的 change 事件，读取导入的文件内容。
- 将读取的内容存储到 browser.storage.local 中
- popup 窗口每次打开时，从 storage 中加载内容
- 也尝试过在background.html中放置一个隐藏的 input 元素，并监听其 change 事件，但是除了browser.browserAction事件能够调用input.click()方法外，其他事件都无法调用input.click()方法，因此放弃了这种方法。究其原因，依然是firefox的扩展安全机制限制input.click()方法的调用。
- 在`manifest.json`的`persistent`属性中增加了`tabs`和`history`权限，`tabs`权限如果不加，则无法获取其他标签的链接，`history`权限如果不加，则无法清除browser.windows.create()方法创建新标签页的历史记录。而在chrome的插件中，在没有显示的加入`tabs`权限的情况下， popup 窗口可以正常工作。
- 总结一下，firefox的安全机制使chrome插件的迁移变得复杂，需要考虑更多安全和兼容性问题。同时也能感觉到现有AI助手对firefox的特殊性了解不足，而且firefox的扩展开发docs让人非常难以发现其与chrome不兼容的地方，我用两周末的2天时间才找出了解决问题的方法。这和我对firefox的扩展开发不很熟悉有关，但也侧面证明了firefox的扩展开发环境相对chrome来说更加复杂、学习曲线陡峭。

## 功能特点

- 添加当前页面到待浏览列表
- 添加所有标签页到待浏览列表
- 按日期分组显示待浏览链接
- 搜索功能
- 去重功能
- 关闭其他标签页
- 导出数据到本地文件
- 从本地文件导入数据

## 安装说明

1. 确保已将 Chrome 插件中的图标文件复制到 `images` 文件夹：
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`

2. 在 Firefox 浏览器中打开 `about:debugging#/runtime/this-firefox` 页面

3. 点击"临时载入附加组件..."

4. 选择此目录下的 `manifest.json` 文件

5. 插件将会临时安装到 Firefox 中

## Firefox 特有适配

由于 Firefox 的 popup 窗口在失去焦点后会自动隐藏，导致文件选择后的 "change" 事件无法触发，因此导入文件功能做了以下特殊处理：

1. 增加`file_open.html`和`file_open.js`文件，用于文件选择。
2. 在`file_open.js`中监听`file_open.html`的change事件，读取导入的文件内容。
3. 将读取的内容存储到 browser.storage.local 中
4. popup 窗口每次打开时，从 storage 中加载内容
5. 清除浏览器找开文件选择窗口记录。
6. 加入`tabs`和`history`权限。

## 使用说明

1. 点击浏览器工具栏中的插件图标打开待浏览列表
2. 使用相应按钮执行所需操作
3. 对于导入功能，点击"导入数据"按钮后会弹出文件选择对话框

## 注意事项

- 临时安装的插件会在 Firefox 重启后消失
- 要永久安装，需要将插件打包并提交到 Firefox Add-ons 网站