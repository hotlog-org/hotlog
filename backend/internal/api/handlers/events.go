package handlers

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/hotlog-org/hotlog/backend/internal/api/response"
	"github.com/hotlog-org/hotlog/backend/internal/events"
	"github.com/jackc/pgx/v5/pgconn"
)

type EventsHandler struct {
	repository events.Repository
}

func NewEventsHandler(repository events.Repository) *EventsHandler {
	return &EventsHandler{repository: repository}
}

func (handler *EventsHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/events", handler.handleEvents)
	mux.HandleFunc("/events/schemas", handler.handleSchemas)
}

func (handler *EventsHandler) handleEvents(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
	if userID == "" {
		response.WriteError(
			w,
			http.StatusUnauthorized,
			response.ErrorCodeUnauthorized,
			"Unauthorized",
			nil,
		)
		return
	}

	switch r.Method {
	case http.MethodGet:
		handler.listEvents(w, r, userID)
	case http.MethodPost:
		handler.createEvent(w, r, userID)
	default:
		response.WriteMethodNotAllowed(w)
	}
}

func (handler *EventsHandler) handleSchemas(
	w http.ResponseWriter,
	r *http.Request,
) {
	userID := strings.TrimSpace(r.Header.Get("X-User-Id"))
	if userID == "" {
		response.WriteError(
			w,
			http.StatusUnauthorized,
			response.ErrorCodeUnauthorized,
			"Unauthorized",
			nil,
		)
		return
	}

	switch r.Method {
	case http.MethodGet:
		handler.listSchemas(w, r, userID)
	case http.MethodPost:
		handler.createSchema(w, r, userID)
	default:
		response.WriteMethodNotAllowed(w)
	}
}

func (handler *EventsHandler) listEvents(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
) {
	query, details := events.ParseEventListQuery(r.URL.Query())
	if details.HasErrors() {
		response.WriteError(
			w,
			http.StatusBadRequest,
			response.ErrorCodeValidation,
			"Invalid query parameters",
			details,
		)
		return
	}

	result, err := handler.repository.ListEventsForUser(r.Context(), userID, query)
	if err != nil {
		handleRepositoryError(w, err, "Failed to load events")
		return
	}

	response.WriteSuccess(w, http.StatusOK, result)
}

func (handler *EventsHandler) createEvent(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
) {
	payload, decodeErr := decodeJSONBody[events.EventCreatePayload](r.Body)
	if decodeErr != nil {
		response.WriteError(
			w,
			http.StatusBadRequest,
			response.ErrorCodeValidation,
			"Invalid request body",
			map[string][]string{"body": {decodeErr.Error()}},
		)
		return
	}

	events.ApplyDefaultsToEventCreatePayload(&payload)
	validation := events.ValidateEventCreatePayload(payload)
	if validation.HasErrors() {
		response.WriteError(
			w,
			http.StatusBadRequest,
			response.ErrorCodeValidation,
			"Invalid event payload",
			validation,
		)
		return
	}

	result, err := handler.repository.CreateEventRecord(r.Context(), userID, payload)
	if err != nil {
		if errors.Is(err, events.ErrSchemaNotFound) {
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Event schema not found",
				nil,
			)
			return
		}

		handleRepositoryError(w, err, "Failed to create event")
		return
	}

	response.WriteSuccess(w, http.StatusCreated, result)
}

func (handler *EventsHandler) listSchemas(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
) {
	items, err := handler.repository.ListEventSchemas(r.Context(), userID)
	if err != nil {
		handleRepositoryError(w, err, "Failed to load schemas")
		return
	}

	response.WriteSuccess(w, http.StatusOK, events.EventSchemasResult{Items: items})
}

func (handler *EventsHandler) createSchema(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
) {
	payload, decodeErr := decodeJSONBody[events.EventSchemaCreatePayload](r.Body)
	if decodeErr != nil {
		response.WriteError(
			w,
			http.StatusBadRequest,
			response.ErrorCodeValidation,
			"Invalid request body",
			map[string][]string{"body": {decodeErr.Error()}},
		)
		return
	}

	events.NormalizeEventSchemaPayload(&payload)
	validation := events.ValidateEventSchemaCreatePayload(payload)
	if validation.HasErrors() {
		response.WriteError(
			w,
			http.StatusBadRequest,
			response.ErrorCodeValidation,
			"Invalid schema payload",
			validation,
		)
		return
	}

	result, err := handler.repository.CreateEventSchema(r.Context(), userID, payload)
	if err != nil {
		if errors.Is(err, events.ErrSchemaAlreadyExist) || isPGErrorCode(err, "23505") {
			response.WriteError(
				w,
				http.StatusConflict,
				response.ErrorCodeConflict,
				"Schema id already exists",
				nil,
			)
			return
		}

		handleRepositoryError(w, err, "Failed to create schema")
		return
	}

	response.WriteSuccess(w, http.StatusCreated, map[string]events.EventSchema{
		"item": result,
	})
}

func handleRepositoryError(w http.ResponseWriter, err error, fallbackMessage string) {
	if isPGErrorCode(err, "42P01") {
		response.WriteError(
			w,
			http.StatusNotFound,
			response.ErrorCodeNotFound,
			"Events tables are not initialized",
			nil,
		)
		return
	}

	response.WriteError(
		w,
		http.StatusInternalServerError,
		response.ErrorCodeInternal,
		fallbackMessage,
		nil,
	)
}

func isPGErrorCode(err error, code string) bool {
	var pgError *pgconn.PgError
	if !errors.As(err, &pgError) {
		return false
	}

	return pgError.Code == code
}

func decodeJSONBody[T any](reader io.Reader) (T, error) {
	var payload T

	decoder := json.NewDecoder(reader)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(&payload); err != nil {
		return payload, err
	}

	var extra interface{}
	extraDecodeErr := decoder.Decode(&extra)
	if extraDecodeErr == nil {
		return payload, errors.New("body must contain a single JSON object")
	}

	if !errors.Is(extraDecodeErr, io.EOF) {
		return payload, errors.New("invalid JSON body")
	}

	return payload, nil
}
