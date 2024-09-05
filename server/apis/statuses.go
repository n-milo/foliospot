package apis

import "net/http"

type HttpStatusError int

const (
	StatusBadRequest                    HttpStatusError = 400 // RFC 9110, 15.5.1
	StatusUnauthorized                  HttpStatusError = 401 // RFC 9110, 15.5.2
	StatusPaymentRequired               HttpStatusError = 402 // RFC 9110, 15.5.3
	StatusForbidden                     HttpStatusError = 403 // RFC 9110, 15.5.4
	StatusNotFound                      HttpStatusError = 404 // RFC 9110, 15.5.5
	StatusMethodNotAllowed              HttpStatusError = 405 // RFC 9110, 15.5.6
	StatusNotAcceptable                 HttpStatusError = 406 // RFC 9110, 15.5.7
	StatusProxyAuthRequired             HttpStatusError = 407 // RFC 9110, 15.5.8
	StatusRequestTimeout                HttpStatusError = 408 // RFC 9110, 15.5.9
	StatusConflict                      HttpStatusError = 409 // RFC 9110, 15.5.10
	StatusGone                          HttpStatusError = 410 // RFC 9110, 15.5.11
	StatusLengthRequired                HttpStatusError = 411 // RFC 9110, 15.5.12
	StatusPreconditionFailed            HttpStatusError = 412 // RFC 9110, 15.5.13
	StatusRequestEntityTooLarge         HttpStatusError = 413 // RFC 9110, 15.5.14
	StatusRequestURITooLong             HttpStatusError = 414 // RFC 9110, 15.5.15
	StatusUnsupportedMediaType          HttpStatusError = 415 // RFC 9110, 15.5.16
	StatusRequestedRangeNotSatisfiable  HttpStatusError = 416 // RFC 9110, 15.5.17
	StatusExpectationFailed             HttpStatusError = 417 // RFC 9110, 15.5.18
	StatusTeapot                        HttpStatusError = 418 // RFC 9110, 15.5.19 (Unused)
	StatusMisdirectedRequest            HttpStatusError = 421 // RFC 9110, 15.5.20
	StatusUnprocessableEntity           HttpStatusError = 422 // RFC 9110, 15.5.21
	StatusLocked                        HttpStatusError = 423 // RFC 4918, 11.3
	StatusFailedDependency              HttpStatusError = 424 // RFC 4918, 11.4
	StatusTooEarly                      HttpStatusError = 425 // RFC 8470, 5.2.
	StatusUpgradeRequired               HttpStatusError = 426 // RFC 9110, 15.5.22
	StatusPreconditionRequired          HttpStatusError = 428 // RFC 6585, 3
	StatusTooManyRequests               HttpStatusError = 429 // RFC 6585, 4
	StatusRequestHeaderFieldsTooLarge   HttpStatusError = 431 // RFC 6585, 5
	StatusUnavailableForLegalReasons    HttpStatusError = 451 // RFC 7725, 3
	StatusInternalServerError           HttpStatusError = 500 // RFC 9110, 15.6.1
	StatusNotImplemented                HttpStatusError = 501 // RFC 9110, 15.6.2
	StatusBadGateway                    HttpStatusError = 502 // RFC 9110, 15.6.3
	StatusServiceUnavailable            HttpStatusError = 503 // RFC 9110, 15.6.4
	StatusGatewayTimeout                HttpStatusError = 504 // RFC 9110, 15.6.5
	StatusHTTPVersionNotSupported       HttpStatusError = 505 // RFC 9110, 15.6.6
	StatusVariantAlsoNegotiates         HttpStatusError = 506 // RFC 2295, 8.1
	StatusInsufficientStorage           HttpStatusError = 507 // RFC 4918, 11.5
	StatusLoopDetected                  HttpStatusError = 508 // RFC 5842, 7.2
	StatusNotExtended                   HttpStatusError = 510 // RFC 2774, 7
	StatusNetworkAuthenticationRequired HttpStatusError = 511 // RFC 6585, 6
)

func (e HttpStatusError) Error() string {
	return http.StatusText(int(e))
}

func (e HttpStatusError) ErrorCode() int {
	return int(e)
}
