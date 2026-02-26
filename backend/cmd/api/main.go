package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/hotlog-org/hotlog/backend/internal/api/handlers"
	"github.com/hotlog-org/hotlog/backend/internal/api/middleware"
	"github.com/hotlog-org/hotlog/backend/internal/config"
	"github.com/hotlog-org/hotlog/backend/internal/db"
	"github.com/hotlog-org/hotlog/backend/internal/events"
)

func main() {
	ctx, cancel := signal.NotifyContext(
		context.Background(),
		syscall.SIGINT,
		syscall.SIGTERM,
	)
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	pool, err := db.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to initialize db pool: %v", err)
	}
	defer pool.Close()

	repository := events.NewPostgresRepository(pool)
	eventsHandler := handlers.NewEventsHandler(repository)

	apiMux := http.NewServeMux()
	eventsHandler.Register(apiMux)

	rootMux := http.NewServeMux()
	rootMux.Handle("/", middleware.RequireInternalToken(apiMux, cfg.InternalToken))
	rootMux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	server := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           rootMux,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		<-ctx.Done()
		shutdownCtx, shutdownCancel := context.WithTimeout(
			context.Background(),
			10*time.Second,
		)
		defer shutdownCancel()

		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("failed to shutdown server cleanly: %v", err)
		}
	}()

	log.Printf("Go API listening on %s", cfg.ListenAddr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("server error: %v", err)
	}
}
