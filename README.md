# electron-client

electron多tab页面桌面客户端，修改为基于configs目录下的pages.json读取首页地址与空白页地址

可运行的配置如下：
1. node版本: 16.13.2   https://nodejs.org/dist/v16.13.2/  理论上可能需要更高版本
2. electron版本: ^24.2.0
3. electron-builder版本：~2.1.1
4. electron-devtools-installer版本: ^23.6.0
5. npm版本: 9.6.6（应该不影响，只是记录）
6. 构建应用时，使用electron_mirror: http://npm.taobao.org/mirrors/electron/
具体为在 c盘下user/.npmrc中加入：
```
strict-ssl=false
registry=https://registry.npm.taobao.org/
ELECTRON_MIRROR = http://npm.taobao.org/mirrors/electron/
```
7. 在build时记得开代理，是会从github上下载内容的  简易代理：https://github.com/dotnetcore/FastGithub
如果自己有科学上网工具自行开启

8. 控制打包完的软件图标设置一张256*256的.ico文件替换./build/icon.ico文件，保持同名
9. electron 24.2 对应chromium版本112， electron 25 对应chromium版本114，在5月30日electron将做一次版本更新

10. 当前注释了chorme-context-menu插件，代替的将是网页中自定义的context-menu

### 安装依赖
```
npm install
```

### 本地运行 
```
npm run start
```

### 打包
```
npm run build
```