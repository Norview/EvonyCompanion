#!/bin/bash

# Download the dependencies
JQUERY=jquery-3.6.0.min.js
if [ ! -d "./lib" -o ! -f "./lib/$JQUERY" ]; then
  mkdir -p ./lib
  wget "https://code.jquery.com/$JQUERY" -P ./lib
fi

JQUERYUI_VERSION=1.13.2
JQUERYUI_SCRIPT_URI="https://code.jquery.com/ui/$JQUERYUI_VERSION/jquery-ui.min.js"
JQUERYUI_SCRIPT=jquery-ui-$JQUERYUI_VERSION.min.js
JQUERYUI_THEME_URI="https://code.jquery.com/ui/$JQUERYUI_VERSION/themes/base/jquery-ui.css"
JQUERYUI_THEME=jquery-ui-$JQUERYUI_VERSION.css
if [ ! -f "./lib/$JQUERYUI_SCRIPT" -o ! -f "./styles/$JQUERYUI_THEME" ]; then
  wget $JQUERYUI_SCRIPT_URI -P ./lib/JQUERYUI_SCRIPT
  wget $JQUERYUI_THEME_URI -P ./styles/JQUERYUI_THEME
fi

I18N_VER=21.6.16
I18N=i18next-$I18N_VER.min.js
if [ ! -f "./lib/$I18N" ]; then
  wget "https://unpkg.com/i18next@$I18N_VER/dist/umd/i18next.min.js" -O ./lib/$I18N
fi

sudo systemctl stop nginx
sudo systemctl start nginx
sudo systemctl enable nginx

