package response

import (
	"encoding/json"
	"net/http"
)

type ErrorCode string

const (
	ErrorCodeValidation   ErrorCode = "VALIDATION_ERROR"
	ErrorCodeUnauthorized ErrorCode = "UNAUTHORIZED"
	ErrorCodeForbidden    ErrorCode = "FORBIDDEN"
	ErrorCodeNotFound     ErrorCode = "NOT_FOUND"
	ErrorCodeConflict     ErrorCode = "CONFLICT"
	ErrorCodeInternal     ErrorCode = "INTERNAL_ERROR"
)

type ErrorPayload struct {
	Code    ErrorCode   `json:"code"`
	Message string      `json:"message,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

type SuccessBody struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
}

type ErrorBody struct {
	Success bool         `json:"success"`
	Error   ErrorPayload `json:"error"`
}

func WriteSuccess(w http.ResponseWriter, status int, data interface{}) {
	writeJSON(w, status, SuccessBody{
		Success: true,
		Data:    data,
	})
}

func WriteError(
	w http.ResponseWriter,
	status int,
	code ErrorCode,
	message string,
	details interface{},
) {
	writeJSON(w, status, ErrorBody{
		Success: false,
		Error: ErrorPayload{
			Code:    code,
			Message: message,
			Details: details,
		},
	})
}

func WriteMethodNotAllowed(w http.ResponseWriter) {
	WriteError(
		w,
		http.StatusMethodNotAllowed,
		ErrorCodeValidation,
		"Method not allowed",
		nil,
	)
}

func writeJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(payload); err != nil {
		http.Error(
			w,
			`{"success":false,"error":{"code":"INTERNAL_ERROR","message":"Failed to encode response"}}`,
			http.StatusInternalServerError,
		)
	}
}
