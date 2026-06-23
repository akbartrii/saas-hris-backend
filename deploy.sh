#!/bin/bash
set -e
cd /home/development/saas-hris-backend
git pull origin master
npm install --legacy-peer-deps
npx prisma generate
npm run build
pm2 restart saas-hris-backend
echo "Deploy selesai!"
