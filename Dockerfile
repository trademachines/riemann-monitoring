FROM mhart/alpine-node:6.5

COPY . /usr/share/app
WORKDIR /usr/share/app

RUN rm -rf node_modules && npm install --production

CMD ["echo", "You need to specify which tool you want to run."]
