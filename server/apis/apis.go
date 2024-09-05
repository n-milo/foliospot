// Package apis defines a simple API server that handles errors and returns JSON.
package apis

import (
	"encoding/json"
	"errors"
	"net/http"
)

const sendErrorDetails = true

// Handler is the main interface for an API server and stores a muxer.
type Handler struct {
	frontEndpoint string
	mux           *http.ServeMux
}

// NewHandler creates a new Handler.
func NewHandler(frontEndpoint string) Handler {
	return Handler{
		frontEndpoint: frontEndpoint,
		mux:           http.NewServeMux(),
	}
}

type sentError struct {
	ErrorMessage string `json:"errorMessage"`
	ErrorCode    int    `json:"errorCode"`
	ErrorData    any    `json:"errorData,omitempty"`
}

// HandleFunc adds a new handler function to the Handler's muxer.
// pattern is passed to [http.ServeMux.HandleFunc]
func (h *Handler) HandleFunc(pattern string, method string, handler func(r *http.Request) (any, error)) {
	h.mux.HandleFunc(pattern, func(w http.ResponseWriter, r *http.Request) {
		var displayedError HttpError
		defer func() {
			if displayedError != nil {
				code := displayedError.ErrorCode()

				var message string
				if sendErrorDetails {
					message = displayedError.Error()
				} else {
					message = http.StatusText(code)
				}

				send := sentError{
					ErrorMessage: message,
					ErrorCode:    code,
				}

				if v, ok := displayedError.(HttpErrorWithData); ok {
					send.ErrorData = v.Data()
				}

				data, err := json.Marshal(send)
				if err != nil {
					panic(err)
				}

				w.WriteHeader(code)
				w.Write(data)
			}
		}()

		w.Header().Set("Access-Control-Allow-Origin", h.frontEndpoint)
		w.Header().Set("Access-Control-Allow-Methods", method+", OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		} else if r.Method != method {
			displayedError = StatusMethodNotAllowed
			return
		}

		w.Header().Set("Content-Type", "application/json")

		result, err := handler(r)
		if err != nil {
			if !errors.As(err, &displayedError) {
				displayedError = WrapError(err, 500)
			}
			return
		}

		if result == nil {
			w.WriteHeader(http.StatusOK)
			return
		} else if v, ok := result.(http.Handler); ok {
			v.ServeHTTP(w, r)
		} else {
			marshaled, err := json.Marshal(result)
			if err != nil {
				displayedError = WrapError(err, 500)
				return
			}

			_, _ = w.Write(marshaled)
		}
	})
}

func (h *Handler) Muxer() http.Handler {
	return h.mux
}

type redirector struct {
	url  string
	code int
}

func (re *redirector) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, re.url, re.code)
}

func Redirect(url string, code int) http.Handler {
	return &redirector{url, code}
}
