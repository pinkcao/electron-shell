# electron-client

本项目基于https://github.com/samuelmaddock/electron-browser-shell修改而来，隐藏了地址栏
this project is based on https://github.com/samuelmaddock/electron-browser-shell hided url related things.

electron多tab页面桌面客户端，修改为基于configs目录下的pages.json读取首页地址，当你使用时，将它修改为你想指向的地址，例如"startPage": "http://172.16.6.246:8090/"，根据你nginx或是其他http服务器部署的网页，那么你打开这个应用时就会是一个打开了http://172.16.6.246:8090/ 的壳，同理，指向github也一样


this project is a multi tab client, it reads the address in /config/pages.json. When using it, rewrite the url in pages.json like "startPage": "http://172.16.6.246:8090/". The url is the url you deployed in nginx or other https servers. When you open this application, it will be direct to the url.

可运行的配置如下：
runnable config as listed.
1. node: 16.13.2   https://nodejs.org/dist/v16.13.2/  
2. electron: ^25.0.1
3. electron-builder：~2.1.1
4. electron-devtools-installer: ^23.6.0
5. npm: 9.6.6
6. 构建应用时，使用electron_mirror: http://npm.taobao.org/mirrors/electron/
具体为在 c盘下user/.npmrc中加入：
```
strict-ssl=false
registry=https://registry.npm.taobao.org/
ELECTRON_MIRROR = http://npm.taobao.org/mirrors/electron/
```
(if you can access github easily, pass this tip)

7. 在build时记得开代理，是会从github上下载内容的  简易代理：https://github.com/dotnetcore/FastGithub
如果自己有科学上网工具自行开启
(if you can access github easily, pass this tip)


8. 控制打包完的软件图标设置一张256*256的.ico文件替换./build/icon.ico文件，保持同名
you can replace the icon of the app by replacing a .icon file in /build/icon.icon. keep the file name unchanged.

9.  当前electron版本为25.0.1，chromium版本为114，理论支持webGPU
now the electron version is 25.0.1, chromium version is 114, should support webGPU

10. 当前注释了chrome-context-menu插件，代替的将是网页中自定义的context-menu
this project commented plugin "chrome-context-menu", if you want the context-menu, you can uncomment the related code.

11. 此版本更新了依赖版本修复了electron升级至25.0.1导致的问题
this version fixed the problem occured when upgrade electron to 25.0.1

### 安装依赖  install dependencies
```
npm install
```

### 本地运行 run in local
```
npm run start
```

### 打包 package to a app
```
npm run build
```

当你执行完打包后，在根目录下应该会生成一个dist_electron文件夹。setup文件是用于安装的，win-unpacked是安装完的内容。你可以直接运行win-unpacked目录下的vimp-pro.exe。

when you finished package process, there will be a dist_electron directory under root. the setup file meant for installation, the win-unpacked meant for the files after installation.
you can run the app easily by clicking /dist_electron/win-unpacked/vimp-pro.exe(or any other file name)