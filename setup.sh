#!/bin/bash

# Download the dependencies
JQUERY=jquery-3.6.0.min.js
if [ ! -d "./lib" -o ! -f "./lib/$JQUERY" ]; then
  mkdir -p ./lib
  wget "https://code.jquery.com/$JQUERY" -P ./lib
fi

sudo systemctl stop nginx
sudo systemctl start nginx
sudo systemctl enable nginx

