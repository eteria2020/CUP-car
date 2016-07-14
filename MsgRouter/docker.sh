#!/bin/bash

REPO_PREFIX=""

function start() {
  # create networks
  for network in sharengo-front-tier sharengo-back-tier
  do
    count=$(docker network ls -f name=$network|wc -l)
    if [ $count -eq 1 ]
    then
      docker network create --driver bridge $network
    fi
  done

  if [ $(container_exists sharengo-postgres) -eq 0 ]
  then
    # container does not exist, create it
    docker run --name sharengo-postgres \
      -e "POSTGRES_USER=sharengo" \
      -e "POSTGRES_DB=sharengo" \
      -e "POSTGRES_PASSWORD: qazwsx100." \
      --net="sharengo-back-tier" \
      -p 5432:5432 \
      -d \
      ${REPO_PREFIX}sharengo-postgres
  
  else
    if [ $(container_running sharengo-postgres) -eq 0 ]
    then
      # container is not running
      docker start sharengo-postgres
    fi
  fi

  if [ $(container_exists sharengo-redis) -eq 0 ]
  then
    # container does not exist, create it
    docker run --name sharengo-redis \
      --net="sharengo-back-tier" \
      -p 6379:6379 \
      -d \
      redis:3.0-alpine
  
  else
    if [ $(container_running sharengo-redis) -eq 0 ]
    then
      # container is not running
      docker start sharengo-redis
    fi
  fi
  
  docker-compose up -d >/dev/null
}

function stop() {
  docker-compose stop
  docker stop sharengo-postgres
  docker stop sharengo-redis
}

function container_running() {
  count=$(docker ps -f name=$1|wc -l)
  if [ $count -eq 1 ]
  then
    echo 0
  else
    echo 1
  fi
}

function container_exists() {
  count=$(docker ps -a -f name=$1|wc -l)
  if [ $count -eq 1 ]
  then
    echo 0
  else
    echo 1
  fi
}

case "$1" in
  start)
    start
  ;;
  stop)
    stop
  ;;
  logs)
    docker-compose logs -f
  ;;
  *)
    echo "Usage: $0 start|stop|logs"
  ;;
esac
