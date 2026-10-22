fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'BCarplay'
description 'In-vehicle music player (YouTube links) - no API keys'
version '1.0.0'

ui_page 'web/index.html'

shared_script 'config.lua'
client_script 'client/main.lua'
server_script 'server/main.lua'

files {
    'web/index.html',
    'web/style.css',
    'web/audio.js',
    'web/app.js',
}
