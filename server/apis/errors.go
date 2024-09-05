package apis

type HttpError interface {
	error
	ErrorCode() int
}

type HttpErrorWithData interface {
	HttpError
	Data() any
}

type httpError struct {
	msg  string
	code int
}

type httpErrorData struct {
	httpError
	data any
}

func (e *httpError) Error() string {
	return e.msg
}

func (e *httpError) ErrorCode() int {
	return e.code
}

func (e *httpErrorData) Data() any {
	return e.data
}

func NewError(msg string, code int) HttpError {
	return &httpError{msg, code}
}

func NewErrorWithData(msg string, code int, data any) HttpErrorWithData {
	return &httpErrorData{httpError{msg, code}, data}
}

type wrappedHttpError struct {
	err  error
	code int
}

func (e *wrappedHttpError) Error() string {
	return e.err.Error()
}

func (e *wrappedHttpError) Unwrap() error {
	return e.err
}

func (e *wrappedHttpError) ErrorCode() int {
	return e.code
}

func WrapError(err error, code int) HttpError {
	return &wrappedHttpError{err, code}
}

type wrappedHttpErrorWithData struct {
	wrappedHttpError
	data any
}

func (e *wrappedHttpErrorWithData) Data() any {
	return e.data
}

func WrapErrorWithData(err error, code int, data any) HttpErrorWithData {
	return &wrappedHttpErrorWithData{
		wrappedHttpError{err, code},
		data,
	}
}
