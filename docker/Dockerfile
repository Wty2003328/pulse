# Stage 1: Build frontend
FROM node:20-slim AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build Rust backend
FROM rust:1.80-slim AS backend
WORKDIR /app
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY Cargo.toml Cargo.lock* ./
COPY src/ ./src/
COPY --from=frontend /app/web/dist ./web/dist
RUN cargo build --release

# Stage 3: Runtime
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/target/release/pulse ./pulse
COPY config/ ./config/
RUN mkdir -p data

EXPOSE 8080
ENV RUST_LOG=pulse=info
CMD ["./pulse"]
