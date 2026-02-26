package config

import (
	"errors"
	"os"
)

type Config struct {
	ListenAddr    string
	DatabaseURL   string
	InternalToken string
}

func Load() (Config, error) {
	cfg := Config{
		ListenAddr:    getEnv("GO_API_ADDR", ":8080"),
		DatabaseURL:   getEnv("GO_DATABASE_URL", os.Getenv("DATABASE_URL")),
		InternalToken: getEnv("GO_API_INTERNAL_TOKEN", "dev-internal-token"),
	}

	if cfg.DatabaseURL == "" {
		return cfg, errors.New("GO_DATABASE_URL or DATABASE_URL is required")
	}

	if cfg.InternalToken == "" {
		return cfg, errors.New("GO_API_INTERNAL_TOKEN is required")
	}

	return cfg, nil
}

func getEnv(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}
