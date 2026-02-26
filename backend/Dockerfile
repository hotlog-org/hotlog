FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o /tmp/hotlog-events-api ./cmd/api

FROM alpine:3.20

WORKDIR /app
COPY --from=builder /tmp/hotlog-events-api /usr/local/bin/hotlog-events-api

EXPOSE 8080

CMD ["hotlog-events-api"]
