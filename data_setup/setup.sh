#!/bin/bash
cat input.sql | sqlite3 store.db
sqlite3 -csv store.db "SELECT * FROM zip_coordinates;" > data.csv
rm store.db
