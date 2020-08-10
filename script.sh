#!/bin/bash
echo "Hi, I'm sleeping until the database is up..."
sleep 12
echo "Hi, I´m sleeping until the migrations are executed..."
npm run migrations
sleep 10
echo "Hi, I´m sleeping until the seeders are executed..."
npm run seeders
sleep 3
npm start 
echo "all Done."
exit 0

