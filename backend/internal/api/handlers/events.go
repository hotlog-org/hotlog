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
	mux.HandleFunc("/events/", handler.handleEventByID)
	mux.HandleFunc("/events/schemas", handler.handleSchemas)
	mux.HandleFunc("/events/schemas/", handler.handleSchemaByID)
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

func (handler *EventsHandler) handleSchemaByID(
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

	schemaID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/events/schemas/"))
	if schemaID == "" || strings.Contains(schemaID, "/") {
		response.WriteError(
			w,
			http.StatusNotFound,
			response.ErrorCodeNotFound,
			"Schema not found",
			nil,
		)
		return
	}

	switch r.Method {
	case http.MethodGet:
		handler.getSchema(w, r, userID, schemaID)
	case http.MethodPatch:
		handler.updateSchema(w, r, userID, schemaID)
	case http.MethodDelete:
		handler.deleteSchema(w, r, userID, schemaID)
	default:
		response.WriteMethodNotAllowed(w)
	}
}

func (handler *EventsHandler) handleEventByID(
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

	eventID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, "/events/"))
	if eventID == "" || strings.Contains(eventID, "/") {
		response.WriteError(
			w,
			http.StatusNotFound,
			response.ErrorCodeNotFound,
			"Event not found",
			nil,
		)
		return
	}

	switch r.Method {
	case http.MethodGet:
		handler.getEvent(w, r, userID, eventID)
	case http.MethodPatch:
		handler.updateEvent(w, r, userID, eventID)
	case http.MethodDelete:
		handler.deleteEvent(w, r, userID, eventID)
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

func (handler *EventsHandler) getEvent(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	eventID string,
) {
	result, err := handler.repository.GetEventByID(r.Context(), userID, eventID)
	if err != nil {
		if errors.Is(err, events.ErrEventNotFound) {
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Event not found",
				nil,
			)
			return
		}

		if errors.Is(err, events.ErrEventForbidden) {
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		}

		handleRepositoryError(w, err, "Failed to load event")
		return
	}

	response.WriteSuccess(w, http.StatusOK, map[string]events.EventRecord{
		"item": result,
	})
}

func (handler *EventsHandler) updateEvent(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	eventID string,
) {
	payload, decodeErr := decodeJSONBody[events.EventUpdatePayload](r.Body)
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

	events.ApplyDefaultsToEventUpdatePayload(&payload)
	validation := events.ValidateEventUpdatePayload(payload)
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

	result, err := handler.repository.UpdateEventRecord(
		r.Context(),
		userID,
		eventID,
		payload,
	)
	if err != nil {
		switch {
		case errors.Is(err, events.ErrEventNotFound):
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Event not found",
				nil,
			)
			return
		case errors.Is(err, events.ErrEventForbidden):
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		case errors.Is(err, events.ErrSchemaNotFound):
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Event schema not found",
				nil,
			)
			return
		case errors.Is(err, events.ErrSchemaForbidden):
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		default:
			handleRepositoryError(w, err, "Failed to update event")
			return
		}
	}

	response.WriteSuccess(w, http.StatusOK, map[string]events.EventRecord{
		"item": result,
	})
}

func (handler *EventsHandler) deleteEvent(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	eventID string,
) {
	err := handler.repository.DeleteEventRecord(r.Context(), userID, eventID)
	if err != nil {
		if errors.Is(err, events.ErrEventNotFound) {
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Event not found",
				nil,
			)
			return
		}

		if errors.Is(err, events.ErrEventForbidden) {
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		}

		handleRepositoryError(w, err, "Failed to delete event")
		return
	}

	response.WriteSuccess(w, http.StatusOK, map[string]bool{"deleted": true})
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

func (handler *EventsHandler) getSchema(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	schemaID string,
) {
	result, err := handler.repository.GetEventSchemaByID(r.Context(), userID, schemaID)
	if err != nil {
		if errors.Is(err, events.ErrSchemaNotFound) {
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Schema not found",
				nil,
			)
			return
		}

		if errors.Is(err, events.ErrSchemaForbidden) {
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		}

		handleRepositoryError(w, err, "Failed to load schema")
		return
	}

	response.WriteSuccess(w, http.StatusOK, map[string]events.EventSchema{
		"item": result,
	})
}

func (handler *EventsHandler) updateSchema(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	schemaID string,
) {
	payload, decodeErr := decodeJSONBody[events.EventSchemaUpdatePayload](r.Body)
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

	events.NormalizeEventSchemaUpdatePayload(&payload)
	validation := events.ValidateEventSchemaUpdatePayload(payload)
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

	result, err := handler.repository.UpdateEventSchema(
		r.Context(),
		userID,
		schemaID,
		payload,
	)
	if err != nil {
		if errors.Is(err, events.ErrSchemaNotFound) {
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Schema not found",
				nil,
			)
			return
		}

		if errors.Is(err, events.ErrSchemaForbidden) {
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		}

		handleRepositoryError(w, err, "Failed to update schema")
		return
	}

	response.WriteSuccess(w, http.StatusOK, map[string]events.EventSchema{
		"item": result,
	})
}

func (handler *EventsHandler) deleteSchema(
	w http.ResponseWriter,
	r *http.Request,
	userID string,
	schemaID string,
) {
	err := handler.repository.DeleteEventSchema(r.Context(), userID, schemaID)
	if err != nil {
		if errors.Is(err, events.ErrSchemaNotFound) {
			response.WriteError(
				w,
				http.StatusNotFound,
				response.ErrorCodeNotFound,
				"Schema not found",
				nil,
			)
			return
		}

		if errors.Is(err, events.ErrSchemaForbidden) {
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		}

		handleRepositoryError(w, err, "Failed to delete schema")
		return
	}

	response.WriteSuccess(w, http.StatusOK, map[string]bool{"deleted": true})
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
