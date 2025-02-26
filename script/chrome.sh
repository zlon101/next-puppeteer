#!/bin/sh

scriptPath=$(cd "$(dirname "$0")";pwd)

dir=$(dirname "$scriptPath")

chromeUserDir=$dir/chrome-user

# 远程调试端口，用于 browserWSEndpoint
port=9231

downFileDir=/Users/admins/Downloads/down-music/aa

# 命令行参数 https://peter.sh/experiments/chromium-command-line-switches/
chromeExe="/Applications/Google\ Chrome\ Dev.app/Contents/MacOS/Google\ Chrome\ Dev --auto-open-devtools-for-tabs --incognito --remote-debugging-port=$port --user-data-dir=\"$chromeUserDir\" --disable-web-security --disable-dev-shm-usage"


# 执行
echo port: $port
eval $chromeExe


# 修改权限
# chmod +x xxx.sh

exit 0



# 参数
# --incognito 无痕模式
# --download-default-directory 默认下载路径，无效
# --disable-download-notification  保存文件时不弹窗询问用户，无效
