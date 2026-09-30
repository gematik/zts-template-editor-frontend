FROM nginx:1.31.6-alpine3.24-slim@sha256:f761b94f2cb9e8e05e2943d5f773609596113ef69b54e2433a996d109a8f78b7

ARG USERID=10000
ARG GROUPID=10000
ARG COMMIT_HASH
ARG VERSION

USER 0

RUN rm -rf /etc/nginx/conf.d/* \
 && mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
 && chown -R ${USERID}:${GROUPID} /tmp \
 && chown -R ${USERID}:${GROUPID} /var/cache/nginx \
 && chown -R ${USERID}:${GROUPID} /var/log/nginx \
 && chown -R ${USERID}:${GROUPID} /etc/nginx

COPY --chown=$USERID:$GROUPID dist/ /usr/share/nginx/html/
COPY --chown=$USERID:$GROUPID config/docker/etc/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --chown=$USERID:$GROUPID config/docker/docker-entrypoint.d/ /docker-entrypoint.d/
COPY --chown=$USERID:$GROUPID docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh /docker-entrypoint.d/*.sh \
 && chown -R ${USERID}:${GROUPID} /usr/share/nginx/html

USER $USERID:$GROUPID

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-c", "/tmp/nginx.conf", "-g", "daemon off;"]

###########################
# Labels
###########################
LABEL de.gematik.vendor="gematik GmbH" \
      maintainer="zts@gematik.de" \
      de.gematik.app="ZTS Template Editor Frontend" \
      de.gematik.git-repo-name="https://gitlab.prod.ccs.gematik.solutions/zts/frontend/template-editor-frontend" \
      de.gematik.commit-sha=$COMMIT_HASH \
      de.gematik.version=$VERSION
