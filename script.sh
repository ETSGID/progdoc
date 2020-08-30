#!/bin/bash
echo "Hi, I'm sleeping until the database is up..."
sleep 12
echo "Executing migrations..."
npm run migrations
echo "Executing seeders..."
npm run seeders
npm start 
echo "all Done."
exit 0

