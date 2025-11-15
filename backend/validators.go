package main

import (
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/go-playground/validator/v10"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

// ValidateStruct валидирует структуру
func ValidateStruct(s interface{}) error {
	if err := validate.Struct(s); err != nil {
		validationErrors := err.(validator.ValidationErrors)
		details := make(map[string]interface{})
		for _, fieldError := range validationErrors {
			details[fieldError.Field()] = fmt.Sprintf("Поле %s: %s", fieldError.Field(), getValidationMessage(fieldError))
		}
		return NewValidationError("Ошибка валидации", details)
	}
	return nil
}

// getValidationMessage возвращает сообщение об ошибке валидации
func getValidationMessage(fieldError validator.FieldError) string {
	switch fieldError.Tag() {
	case "required":
		return "обязательное поле"
	case "min":
		return fmt.Sprintf("минимальная длина: %s", fieldError.Param())
	case "max":
		return fmt.Sprintf("максимальная длина: %s", fieldError.Param())
	case "email":
		return "неверный формат email"
	case "oneof":
		return fmt.Sprintf("должно быть одним из: %s", fieldError.Param())
	case "gt":
		return fmt.Sprintf("должно быть больше %s", fieldError.Param())
	case "gte":
		return fmt.Sprintf("должно быть больше или равно %s", fieldError.Param())
	case "lt":
		return fmt.Sprintf("должно быть меньше %s", fieldError.Param())
	case "lte":
		return fmt.Sprintf("должно быть меньше или равно %s", fieldError.Param())
	default:
		return fieldError.Error()
	}
}

// ValidateFileSize проверяет размер файла
func ValidateFileSize(fileHeader *multipart.FileHeader, maxSize int64) error {
	if fileHeader.Size > maxSize {
		maxSizeMB := float64(maxSize) / (1024 * 1024)
		return NewFileTooLargeError(fmt.Sprintf("%.0fMB", maxSizeMB))
	}
	return nil
}

// ValidateImageFile проверяет, что файл является изображением
func ValidateImageFile(fileHeader *multipart.FileHeader) error {
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := []string{".jpg", ".jpeg", ".png", ".webp"}

	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			return nil
		}
	}

	return NewUnsupportedMediaError("Разрешенные форматы изображений: JPEG, PNG, WebP")
}

// ValidateVideoFile проверяет, что файл является видео
func ValidateVideoFile(fileHeader *multipart.FileHeader) error {
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := []string{".mp4", ".webm"}

	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			return nil
		}
	}

	return NewUnsupportedMediaError("Разрешенные форматы видео: MP4, WebM")
}

// ValidateMediaFile проверяет, что файл является медиа (изображение или видео)
func ValidateMediaFile(fileHeader *multipart.FileHeader) error {
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := []string{".jpg", ".jpeg", ".png", ".webp", ".mp4", ".webm"}

	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			return nil
		}
	}

	return NewUnsupportedMediaError("Разрешенные форматы медиа: JPEG, PNG, WebP, MP4, WebM")
}

// ValidateDocumentFile проверяет, что файл является документом
func ValidateDocumentFile(fileHeader *multipart.FileHeader) error {
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	allowedExts := []string{".pdf", ".jpg", ".jpeg", ".png"}

	for _, allowedExt := range allowedExts {
		if ext == allowedExt {
			return nil
		}
	}

	return NewUnsupportedMediaError("Разрешенные форматы документов: PDF, JPEG, PNG")
}

// ValidateContentType проверяет Content-Type файла
func ValidateContentType(fileHeader *multipart.FileHeader, allowedTypes []string) error {
	contentType := fileHeader.Header.Get("Content-Type")
	for _, allowedType := range allowedTypes {
		if strings.HasPrefix(contentType, allowedType) {
			return nil
		}
	}
	return NewUnsupportedMediaError(fmt.Sprintf("Разрешенные типы: %s", strings.Join(allowedTypes, ", ")))
}

// ParseMultipartForm парсит multipart form с ограничением размера
func ParseMultipartForm(r *http.Request, maxMemory int64) error {
	if err := r.ParseMultipartForm(maxMemory); err != nil {
		return NewValidationError("Ошибка парсинга формы", map[string]interface{}{
			"error": err.Error(),
		})
	}
	return nil
}

// GetFileFromForm получает файл из формы
func GetFileFromForm(r *http.Request, fieldName string) (multipart.File, *multipart.FileHeader, error) {
	file, header, err := r.FormFile(fieldName)
	if err != nil {
		return nil, nil, NewValidationError("Файл не найден", map[string]interface{}{
			"field": fieldName,
		})
	}
	return file, header, nil
}

// ValidatePhoneNumber базовая валидация номера телефона
func ValidatePhoneNumber(phone string) error {
	phone = FormatPhone(phone)
	if len(phone) < 10 || len(phone) > 20 {
		return NewValidationError("Неверный формат телефона", map[string]interface{}{
			"field": "phone",
		})
	}
	return nil
}
