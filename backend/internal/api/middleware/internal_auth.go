package middleware

import (
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/hotlog-org/hotlog/backend/internal/api/response"
)

func RequireInternalToken(next http.Handler, token string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if token == "" {
			next.ServeHTTP(w, r)
			return
		}

		providedToken := strings.TrimSpace(r.Header.Get("X-Internal-Token"))
		if subtle.ConstantTimeCompare([]byte(providedToken), []byte(token)) != 1 {
			response.WriteError(
				w,
				http.StatusForbidden,
				response.ErrorCodeForbidden,
				"Forbidden",
				nil,
			)
			return
		}

		next.ServeHTTP(w, r)
	})
}
