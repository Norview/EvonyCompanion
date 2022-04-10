#!/bin/bash
mkdir -p ./lib
wget https://code.jquery.com/jquery-3.6.0.min.js -P ./lib
sudo systemctl start nginx
sudo systemctl enable nginx

