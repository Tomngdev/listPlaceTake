echo "starting app installation.."

docker build -t list-place-take-app .
docker run -p 8080:8080 -d list-place-take-app $(which docker):/usr/bin/docker

echo "installation done"