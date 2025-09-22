# 待浏览列表 - Firefox 插件

这是一个适用于 Firefox 浏览器的待浏览列表插件，基于 Chrome 插件版本进行适配。

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

1. 在 `background.html` 中放置一个隐藏的 input 元素
2. 在 `background.js` 中监听其 change 事件，读取导入的文件内容
3. 将读取的内容存储到 browser.storage.local 中
4. popup 窗口每次打开时，从 storage 中加载内容

## 使用说明

1. 点击浏览器工具栏中的插件图标打开待浏览列表
2. 使用相应按钮执行所需操作
3. 对于导入功能，点击"导入数据"按钮后会弹出文件选择对话框

## 注意事项

- 临时安装的插件会在 Firefox 重启后消失
- 要永久安装，需要将插件打包并提交到 Firefox Add-ons 网站