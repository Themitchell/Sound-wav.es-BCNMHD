FROM node:20.5-alpine

ARG UID=1001
ARG GROUP=app
ARG USER=app
ARG HOME=/home/$USER
ARG APPDIR=$HOME/app

RUN apk add --no-cache --virtual .build-deps build-base && \
    apk add --no-cache \
    git \
    bash \
    make \
    shadow

RUN groupadd -g $UID -o $GROUP && \
    useradd -m -u $UID -g $UID -o -s /bin/false $USER && \
    mkdir -p $APPDIR && \
    chown -R $USER:$GROUP $HOME

USER $USER
WORKDIR $APPDIR

COPY --chown=$USER:$GROUP package.json package-lock.json $APPDIR/
RUN npm install \
    && npm cache clean --force

COPY --chown=$USER:$GROUP . $APPDIR

USER root
RUN apk del .build-deps
USER $USER

EXPOSE 3000

CMD [ "npm", "start" ]
