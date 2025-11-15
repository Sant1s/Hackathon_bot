package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
)

// Error codes
const (
	ErrCodeValidation      = "VALIDATION_ERROR"
	ErrCodeUnauthorized    = "UNAUTHORIZED"
	ErrCodeForbidden       = "FORBIDDEN"
	ErrCodeNotFound        = "NOT_FOUND"
	ErrCodeConflict         = "CONFLICT"
	ErrCodeTooLarge         = "FILE_TOO_LARGE"
	ErrCodeUnsupportedMedia = "UNSUPPORTED_MEDIA_TYPE"
	ErrCodeUnprocessable    = "UNPROCESSABLE_ENTITY"
	ErrCodeInternal         = "INTERNAL_ERROR"
)

// AppError кастомная ошибка приложения
type AppError struct {
	Code    string
	Message string
	Details map[string]interface{}
	Status  int
}

func (e *AppError) Error() string {
	return e.Message
}

// NewValidationError создает ошибку валидации
func NewValidationError(message string, details map[string]interface{}) *AppError {
	return &AppError{
		Code:    ErrCodeValidation,
		Message: message,
		Details: details,
		Status:  http.StatusBadRequest,
	}
}

// NewUnauthorizedError создает ошибку неавторизованного доступа
func NewUnauthorizedError(message string) *AppError {
	if message == "" {
		message = "Не авторизован"
	}
	return &AppError{
		Code:    ErrCodeUnauthorized,
		Message: message,
		Status:  http.StatusUnauthorized,
	}
}

// NewForbiddenError создает ошибку запрещенного доступа
func NewForbiddenError(message string) *AppError {
	if message == "" {
		message = "Доступ запрещен"
	}
	return &AppError{
		Code:    ErrCodeForbidden,
		Message: message,
		Status:  http.StatusForbidden,
	}
}

// NewNotFoundError создает ошибку "не найдено"
func NewNotFoundError(resource string) *AppError {
	return &AppError{
		Code:    ErrCodeNotFound,
		Message: fmt.Sprintf("%s не найден", resource),
		Status:  http.StatusNotFound,
	}
}

// NewConflictError создает ошибку конфликта
func NewConflictError(message string) *AppError {
	return &AppError{
		Code:    ErrCodeConflict,
		Message: message,
		Status:  http.StatusConflict,
	}
}

// NewFileTooLargeError создает ошибку слишком большого файла
func NewFileTooLargeError(maxSize string) *AppError {
	return &AppError{
		Code:    ErrCodeTooLarge,
		Message: fmt.Sprintf("Файл слишком большой. Максимальный размер: %s", maxSize),
		Status:  http.StatusRequestEntityTooLarge,
	}
}

// NewUnsupportedMediaError создает ошибку неподдерживаемого типа медиа
func NewUnsupportedMediaError(message string) *AppError {
	return &AppError{
		Code:    ErrCodeUnsupportedMedia,
		Message: message,
		Status:  http.StatusUnsupportedMediaType,
	}
}

// NewUnprocessableError создает ошибку необрабатываемой сущности
func NewUnprocessableError(message string) *AppError {
	return &AppError{
		Code:    ErrCodeUnprocessable,
		Message: message,
		Status:  http.StatusUnprocessableEntity,
	}
}

// NewInternalError создает внутреннюю ошибку
func NewInternalError(message string) *AppError {
	return &AppError{
		Code:    ErrCodeInternal,
		Message: message,
		Status:  http.StatusInternalServerError,
	}
}

// WriteError записывает ошибку в ответ
func WriteError(w http.ResponseWriter, err error) {
	var appErr *AppError

	switch e := err.(type) {
	case *AppError:
		appErr = e
	case error:
		// Проверяем стандартные ошибки БД
		if e == sql.ErrNoRows {
			appErr = NewNotFoundError("Ресурс")
		} else {
			appErr = NewInternalError("Внутренняя ошибка сервера")
		}
	default:
		appErr = NewInternalError("Внутренняя ошибка сервера")
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(appErr.Status)

	errorResponse := ErrorResponse{
		Error: ErrorDetail{
			Code:    appErr.Code,
			Message: appErr.Message,
			Details: appErr.Details,
		},
	}

	json.NewEncoder(w).Encode(errorResponse)
}

// WriteJSON записывает JSON ответ
func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// WriteSuccess записывает успешный ответ
func WriteSuccess(w http.ResponseWriter, status int, message string) {
	WriteJSON(w, status, map[string]string{"message": message})
}

