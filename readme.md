## How to Test
Make sure you have setup mongodb and configure MONGO_URL and MONGO_DATABASE environment variables with correct value.
You can use dockerized mongodb like this one:
```sh
# this mongodb does not associated with any volume
# data will be destroyed when the container is removed
docker run mongo:latest --rm -p "27017:27017"
```

Then run the test command:
```sh
npm test
```
