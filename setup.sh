#!/bin/bash

# Download the dependencies
JQUERY=jquery-3.6.0.min.js
if [ ! -d "./lib" -o ! -f "./lib/$JQUERY" ]; then
  mkdir -p ./lib
  wget "https://code.jquery.com/$JQUERY" -P ./lib
fi

I18N_VER=21.6.16
I18N=i18next-$I18N_VER.min.js
if [ ! -f "./lib/$I18N" ]; then
  wget "https://unpkg.com/i18next@$I18N_VER/dist/umd/i18next.min.js" -O ./lib/$I18N
fi

sudo systemctl stop nginx
sudo systemctl start nginx
sudo systemctl enable nginx

