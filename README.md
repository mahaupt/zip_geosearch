# PLZ GeoSearch
A zipcode search engine in nodejs.  

## Installation
A input csv file that contains your data source.  
It needs zip_code, lat and lon columns to work.  
Latitude and Longitude need to be in decimal format.  

## Functionality
The app precalculates distances to each zipcodes in the dataset and saves all to a mongodb database.  

## Environment Variables
You can pass settings as environment variables:  
- DB_URL "mongodb://localhost:27017/"
- DB_DB "plzlocate"
- INPUT_DATA "data_setup/data.csv";
- MAX_DIST_KM 200
- FORCE_RECREATE false


## Credits
Special thanks to https://gist.github.com/iteufel/af379872bbc3bf5261e2fd09b681ff7e  for his zipcode dataset
