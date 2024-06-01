#!/bin/sh

scriptPath=$(cd "$(dirname "$0")";pwd)

dir=$(dirname "$scriptPath")

chromeUserDir=$dir/chrome-user
port=9231
chromeExe="/Applications/Google\ Chrome\ Dev.app/Contents/MacOS/Google\ Chrome\ Dev --remote-debugging-port=$port --disable-dev-shm-usage --user-data-dir=\"$chromeUserDir\" --disable-web-security"
# 执行
echo port: $port
eval $chromeExe

# 修改权限
# chmod +x xxx.sh

exit 0
